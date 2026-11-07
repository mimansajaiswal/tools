/* Separate photo entries, processed one at a time to bound decoded image memory. */
const BatchEntries = {
    session: null,
    open() {
        if (App.state.entryLoading || App.state.restoringDraft || this.session) return;
        this.session = { diaryId: App.state.activeDiaryId, items: [], reading: false, saving: false };
        App.stopDrawLoop();
        App.stopSegEditPreview();
        App.openModal('batchModal');
        this.render();
    },
    async decode(file) {
        const url = URL.createObjectURL(file);
        try {
            return await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = () => reject(new Error('Cannot open this photo. Choose a JPEG, PNG or WebP copy.'));
                image.src = url;
            });
        } finally {
            URL.revokeObjectURL(url);
        }
    },
    canvas(image, maxPixels, maxSide = Infinity) {
        const scale = Math.min(1, Math.sqrt(maxPixels / (image.naturalWidth * image.naturalHeight)), maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas;
    },
    async select(event) {
        const files = Array.from(event.target.files || []);
        event.target.value = '';
        const session = this.session;
        if (!files.length || !session || session.reading || session.saving) return;
        session.reading = true;
        const added = files.map(file => ({ id: UTILS.id(), file, date: UTILS.toLocalISO(new Date()), ready: false, error: '', preview: null, url: null, dated: false }));
        session.items.push(...added);
        this.render();
        try {
            await PhotoDuplicates.prepare(session.diaryId);
        } catch (error) {
            added.forEach(item => { item.error = 'Could not check duplicates. Please choose these photos again.'; });
            session.reading = false;
            if (this.session === session) this.render();
            return;
        }
        for (const item of added) {
            if (this.session !== session) break;
            if (!session.items.includes(item)) continue;
            try {
                const createdAt = await PhotoMetadata.createdAt(item.file);
                const image = await this.decode(item.file);
                const canvas = this.canvas(image, 350 * 350, 350);
                const preview = await UTILS.canvasToBlob(canvas, 0.65);
                const fingerprint = await PhotoDuplicates.fingerprint(item.file, preview);
                canvas.width = canvas.height = 1;
                if (this.session !== session || !session.items.includes(item)) continue;
                item.dated = !!createdAt;
                if (createdAt) item.date = UTILS.toLocalISO(new Date(createdAt));
                item.preview = preview;
                item.fingerprint = fingerprint;
                item.url = URL.createObjectURL(preview);
                item.ready = true;
            } catch (error) {
                item.error = error.message || 'Could not read this photo.';
            }
            if (this.session === session) this.render();
        }
        if (this.session !== session) return;
        session.reading = false;
        this.render();
    },
    refreshMatches() {
        const session = this.session;
        if (!session || session.saving) return;
        const pending = [];
        for (const item of session.items) {
            if (!item.ready) continue;
            item.duplicate = PhotoDuplicates.find(item.fingerprint, session.diaryId, pending);
            if (!item.duplicate) item.decision = null;
            if (!item.duplicate || item.decision === 'add') pending.push({ fingerprint: item.fingerprint, name: item.file.name });
        }
    },
    chooseDuplicate(id, decision) {
        const item = this.session?.items.find(item => item.id === id);
        if (!item || this.session.saving) return;
        item.decision = decision;
        this.render();
        document.getElementById(`batchDecision-${id}`)?.focus();
    },
    dateLabel(item) {
        if (!Number.isFinite(Date.parse(item.date))) return 'Set date';
        const date = new Date(item.date);
        if (!item.dated && !item.dateEdited && date.toDateString() === new Date().toDateString()) return 'Today · no photo date';
        return date.toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {})
        });
    },
    rowHTML(item) {
        const escape = UTILS.escapeHTML;
        const session = this.session;
        const disabled = session.reading || session.saving;
        const include = !item.duplicate || item.decision === 'add';
        const status = item.error || (!item.ready ? 'Reading photo…' : item.dateEdited ? 'Date set by you' : item.dated ? 'Photo creation date' : 'No photo date found. Using today; you can change it.');
        const match = item.duplicate && `${item.duplicate.location === 'this diary' ? 'Already in' : 'Also selected as'} “${item.duplicate.title}”`;
        return `
            ${item.duplicate ? `<label class="batch-include" for="batchDecision-${item.id}" title="Add this photo again">
                <input id="batchDecision-${item.id}" type="checkbox" aria-label="Add ${escape(item.file.name)} again"
                    onchange="BatchEntries.chooseDuplicate('${item.id}', this.checked ? 'add' : 'skip')" ${item.decision === 'add' ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
            </label>` : ''}
            ${item.url ? `<img src="${item.url}" alt="" class="batch-thumbnail">` : '<div class="batch-thumbnail flex items-center justify-center"><i data-lucide="image" class="w-4 h-4 text-earth-metal/40" aria-hidden="true"></i></div>'}
            <div class="batch-photo-info">
                ${item.duplicate ? `<label for="batchDecision-${item.id}" class="batch-filename cursor-pointer" title="${escape(item.file.name)}">${escape(item.file.name)}</label>` : `<p class="batch-filename" title="${escape(item.file.name)}">${escape(item.file.name)}</p>`}
                ${match ? `<p class="batch-match" title="${escape(PhotoDuplicates.describe(item.duplicate))}">${escape(match)}</p>` : ''}
                ${include && item.ready ? `<button id="batchDateButton-${item.id}" type="button" onclick="BatchEntries.editDate('${item.id}')" ${disabled ? 'disabled' : ''}
                    aria-label="Edit date for ${escape(item.file.name)}" title="${escape(status)}" class="batch-date-button">
                    <span id="batchDateLabel-${item.id}">${escape(this.dateLabel(item))}</span><i data-lucide="pencil" class="w-3 h-3 shrink-0" aria-hidden="true"></i>
                </button>` : ''}
                ${include || item.error || !item.ready ? `<p id="batchHint-${item.id}" class="${item.error || !item.ready ? 'text-[11px] text-amber-800' : 'sr-only'}">${escape(status)}</p>` : ''}
            </div>
            <button onclick="BatchEntries.remove('${item.id}')" ${session.saving ? 'disabled' : ''} aria-label="Remove ${escape(item.file.name)}" class="batch-remove"><i data-lucide="x" class="w-4 h-4" aria-hidden="true"></i></button>
            ${include && item.editingDate ? `<div class="batch-date-editor">
                <label for="batchDate-${item.id}" class="sr-only">Date for ${escape(item.file.name)}</label>
                <input id="batchDate-${item.id}" type="datetime-local" value="${escape(item.date)}" ${disabled ? 'disabled' : ''}
                    oninput="BatchEntries.setDate('${item.id}', this.value)" class="min-w-0 flex-1 text-xs bg-oatmeal/60 border border-oatmeal-dark p-2 text-charcoal">
                <button type="button" onclick="BatchEntries.finishDate('${item.id}')" class="px-3 py-2 text-xs font-display hover:bg-oatmeal">Done</button>
            </div>` : ''}`;
    },
    rowClasses(item) {
        return `batch-photo-row${item.duplicate ? ' is-duplicate' : ''}${item.duplicate && item.decision === 'add' ? ' is-selected' : ''}`;
    },
    render() {
        this.refreshMatches();
        const duplicates = this.session.items.filter(item => item.duplicate);
        const row = item => `<div id="batchRow-${item.id}" class="${this.rowClasses(item)}">${this.rowHTML(item)}</div>`;
        document.getElementById('batchPhotoList').innerHTML = this.session.items.filter(item => !item.duplicate).map(row).join('');
        document.getElementById('batchDuplicateList').innerHTML = duplicates.map(row).join('');
        document.getElementById('batchDuplicates').classList.toggle('hidden', !duplicates.length);
        document.getElementById('batchDuplicateCount').textContent = `Duplicates (${duplicates.length})`;
        lucide.createIcons();
        this.updateControls();
    },
    updateRow(item) {
        const row = document.getElementById(`batchRow-${item.id}`);
        if (row) {
            row.className = this.rowClasses(item);
            row.innerHTML = this.rowHTML(item);
        }
        lucide.createIcons();
        this.updateControls();
    },
    editDate(id) {
        const item = this.session?.items.find(item => item.id === id);
        if (!item || this.session.reading || this.session.saving) return;
        item.editingDate = true;
        this.updateRow(item);
        document.getElementById(`batchDate-${id}`)?.focus();
    },
    finishDate(id) {
        const item = this.session?.items.find(item => item.id === id);
        if (!item || this.session.saving) return;
        if (!Number.isFinite(Date.parse(item.date))) {
            App.showToast('Choose a valid date before continuing.', 'error');
            return document.getElementById(`batchDate-${id}`)?.focus();
        }
        item.editingDate = false;
        this.updateRow(item);
        document.getElementById(`batchDateButton-${id}`)?.focus();
    },
    updateControls() {
        const session = this.session;
        if (!session) return;
        const selected = session.items.filter(item => item.ready && (!item.duplicate || item.decision === 'add'));
        const ready = selected.filter(item => Number.isFinite(Date.parse(item.date))).length;
        const skipped = session.items.filter(item => item.ready && item.duplicate && item.decision !== 'add').length;
        document.getElementById('batchChooseBtn').disabled = session.reading || session.saving;
        document.getElementById('batchCloseBtn').disabled = session.saving;
        document.getElementById('batchStopBtn').classList.toggle('hidden', !session.saving);
        document.getElementById('batchStopBtn').disabled = !!session.stopRequested;
        document.getElementById('batchSaveBtn').disabled = session.reading || session.saving || !(ready + skipped) || selected.some(item => !Number.isFinite(Date.parse(item.date)));
        document.getElementById('batchSaveLabel').textContent = session.saving ? 'Saving…' : !ready && skipped ? 'Skip duplicates' : `Add ${ready || ''} ${ready === 1 ? 'entry' : 'entries'}`;
        document.getElementById('batchEmptyHint').classList.toggle('hidden', session.items.length > 0);
        document.getElementById('batchProgress').textContent = session.saving ? session.stopRequested ? 'Stopping after this photo…' : session.progress : session.reading ? `Reading ${session.items.filter(item => item.ready || item.error).length} / ${session.items.length}` : session.items.length ? `${ready} to add${skipped ? ` · ${skipped} skipped` : ''}${session.items.some(item => !item.ready) ? ' · remove unreadable photos' : ''}` : 'No photos selected';
    },
    setDate(id, value) {
        const item = this.session?.items.find(item => item.id === id);
        if (!item || this.session.saving) return;
        item.date = value;
        item.dateEdited = true;
        const hint = document.getElementById(`batchHint-${id}`);
        if (hint && !item.error) hint.textContent = 'Date set by you';
        const label = document.getElementById(`batchDateLabel-${id}`);
        if (label) label.textContent = this.dateLabel(item);
        // Keep the field mounted while editing, including temporary incomplete values.
        this.updateControls();
    },
    remove(id) {
        const session = this.session;
        if (!session || session.saving) return;
        const item = session.items.find(item => item.id === id);
        if (item?.url) URL.revokeObjectURL(item.url);
        session.items = session.items.filter(item => item.id !== id);
        this.render();
        document.getElementById('batchChooseBtn').focus();
    },
    stop() {
        if (!this.session?.saving) return;
        this.session.stopRequested = true;
        this.updateControls();
    },
    async save() {
        const session = this.session;
        if (!session || session.reading || session.saving) return;
        const reviewedDuplicates = new Set(session.items.filter(item => item.duplicate));
        this.refreshMatches();
        if (session.items.some(item => item.duplicate && !reviewedDuplicates.has(item))) {
            this.render();
            return App.showToast('New duplicates found. Review your choices before saving.', 'info');
        }
        const items = session.items.filter(item => item.ready && (!item.duplicate || item.decision === 'add'));
        const skipped = session.items.filter(item => item.ready && item.duplicate && item.decision !== 'add');
        if (!(items.length + skipped.length) || items.some(item => !Number.isFinite(Date.parse(item.date)))) return;
        if (items.length && !ImageStore.isAvailable()) return App.showToast('Photo storage is unavailable in this browser.', 'error');
        const diary = Storage.getData().find(diary => diary.id === session.diaryId);
        if (!diary) return App.showToast('This diary is no longer available.', 'error');
        skipped.forEach(item => { if (item.url) URL.revokeObjectURL(item.url); });
        session.items = session.items.filter(item => !skipped.includes(item));
        session.saving = true;
        session.stopRequested = false;
        session.progress = `Saving 0 / ${items.length}`;
        this.render();
        let saved = 0;
        for (const item of items) {
            if (session.stopRequested) break;
            const photoKey = `entry_${item.id}_preview`;
            const uploadKey = `entry_${item.id}_upload`;
            try {
                const image = await this.decode(item.file);
                const canvas = this.canvas(image, App.getMaxUploadPixels());
                const upload = await UTILS.compressToLimit(canvas, { maxBytes: App.getUploadCapBytes(), returnBlob: true });
                canvas.width = canvas.height = 1;
                await ImageStore.set(photoKey, item.preview);
                await ImageStore.set(uploadKey, upload);
                const date = UTILS.localToUTC(item.date);
                const entry = {
                    id: item.id, clientEntryId: crypto.randomUUID(), date,
                    title: new Date(date).toLocaleString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                    notes: '', tags: [], diaryTitle: diary.title, photoKey, uploadKey,
                    photoFingerprints: [item.fingerprint],
                    photoDataURL: null, uploadDataURL: null, uploadPending: false,
                    synced: false, syncStatus: 'local', syncError: null, notionId: null, deletedLocally: false
                };
                if (!Storage.saveEntry(session.diaryId, entry, { queue: true })) throw new Error('This diary is no longer available.');
                saved++;
                URL.revokeObjectURL(item.url);
                session.items = session.items.filter(current => current !== item);
                document.getElementById(`batchRow-${item.id}`)?.remove();
            } catch (error) {
                await Promise.all([ImageStore.del(photoKey).catch(() => { }), ImageStore.del(uploadKey).catch(() => { })]);
                item.error = error?.name === 'QuotaExceededError' || error?.isQuotaExceeded ? 'Storage full. Free space before trying again.' : error.message || 'Could not save this photo.';
                this.updateRow(item);
            }
            session.progress = `Saving ${items.indexOf(item) + 1} / ${items.length}`;
            this.updateControls();
        }
        session.saving = false;
        App.state.diaries = Storage.getData();
        App.renderSidebar();
        App.renderDiaryView();
        this.render();
        if (saved) {
            App.showToast(`${saved} ${saved === 1 ? 'entry' : 'entries'} added`, 'success');
            SyncManager.syncCurrentDiary();
        } else if (skipped.length) {
            App.showToast(`${skipped.length} ${skipped.length === 1 ? 'duplicate' : 'duplicates'} skipped`, 'info');
        }
        if (!session.items.length) {
            App.closeModal('batchModal', { force: true });
            // An existing single-entry draft stays open and untouched.
            if (!App.hasUnsavedEntry()) App.closeModal('entryModal', { force: true });
        }
    },
    close() {
        if (!this.session) return;
        this.session.items.forEach(item => { if (item.url) URL.revokeObjectURL(item.url); });
        this.session = null;
        document.getElementById('batchPhotoList').replaceChildren();
        document.getElementById('batchDuplicateList').replaceChildren();
        document.getElementById('batchFileInput').value = '';
        if (App.state.isEntryModalOpen) {
            App.startDrawLoop();
            if (!document.getElementById('segmentEditOverlay').classList.contains('hidden')) App.startSegEditPreview();
        }
    }
};
