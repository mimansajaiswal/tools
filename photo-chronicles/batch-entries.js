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
        for (const item of added) {
            if (this.session !== session) break;
            if (!session.items.includes(item)) continue;
            try {
                const createdAt = await PhotoMetadata.createdAt(item.file);
                const image = await this.decode(item.file);
                const canvas = this.canvas(image, 350 * 350, 350);
                const preview = await UTILS.canvasToBlob(canvas, 0.65);
                canvas.width = canvas.height = 1;
                if (this.session !== session || !session.items.includes(item)) continue;
                item.dated = !!createdAt;
                if (createdAt) item.date = UTILS.toLocalISO(new Date(createdAt));
                item.preview = preview;
                item.url = URL.createObjectURL(preview);
                item.ready = true;
            } catch (error) {
                item.error = error.message || 'Could not read this photo.';
            }
            if (this.session === session) this.updateRow(item);
        }
        if (this.session !== session) return;
        session.reading = false;
        this.updateControls();
    },
    rowHTML(item) {
        const escape = UTILS.escapeHTML;
        const session = this.session;
        const status = item.error || (!item.ready ? 'Reading photo' : item.dateEdited ? 'Date set by you' : item.dated ? 'Photo creation date' : 'No photo date found. Using today; you can change it.');
        return `
            ${item.url ? `<img src="${item.url}" alt="" class="w-16 h-20 sm:w-20 sm:h-24 object-contain bg-oatmeal rounded shrink-0">` : '<div class="w-16 h-20 sm:w-20 sm:h-24 bg-oatmeal rounded shrink-0 flex items-center justify-center"><i data-lucide="image" class="w-5 h-5 text-earth-metal/40" aria-hidden="true"></i></div>'}
            <div class="flex-1 min-w-0">
                <p class="text-xs font-display font-medium text-charcoal truncate mb-2" title="${escape(item.file.name)}">${escape(item.file.name)}</p>
                <label for="batchDate-${item.id}" class="sr-only">Date for ${escape(item.file.name)}</label>
                <input id="batchDate-${item.id}" type="datetime-local" value="${escape(item.date)}" ${!item.ready || session.saving ? 'disabled' : ''}
                    oninput="BatchEntries.setDate('${item.id}', this.value)" class="w-full text-xs bg-oatmeal/60 border border-oatmeal-dark p-2 text-charcoal disabled:opacity-50">
                <p id="batchHint-${item.id}" title="${escape(status)}" class="text-[11px] mt-1.5 flex items-start gap-1 ${item.error || (!item.dated && !item.dateEdited && item.ready) ? 'text-amber-800' : 'text-earth-metal/60'}">
                    <i data-lucide="${item.error ? 'circle-alert' : !item.ready ? 'loader-circle' : item.dateEdited ? 'pencil' : item.dated ? 'calendar-check' : 'calendar-clock'}" class="w-3.5 h-3.5 shrink-0 ${!item.ready && !item.error ? 'animate-spin' : ''}" aria-hidden="true"></i>
                    <span>${item.ready || item.error ? escape(item.error || (item.dateEdited ? 'Your date' : item.dated ? 'Photo date' : 'No date · using today')) : 'Reading…'}</span>
                </p>
            </div>
            <button onclick="BatchEntries.remove('${item.id}')" ${session.saving ? 'disabled' : ''} aria-label="Remove ${escape(item.file.name)}" class="p-2 hover:bg-oatmeal text-earth-metal/60 disabled:opacity-30 self-start"><i data-lucide="x" class="w-4 h-4" aria-hidden="true"></i></button>`;
    },
    render() {
        const list = document.getElementById('batchPhotoList');
        list.innerHTML = this.session.items.map(item => `<div id="batchRow-${item.id}" class="flex gap-3 p-3 border border-oatmeal-dark rounded">${this.rowHTML(item)}</div>`).join('');
        lucide.createIcons();
        this.updateControls();
    },
    updateRow(item) {
        const row = document.getElementById(`batchRow-${item.id}`);
        if (row) row.innerHTML = this.rowHTML(item);
        lucide.createIcons();
        this.updateControls();
    },
    updateControls() {
        const session = this.session;
        if (!session) return;
        const ready = session.items.filter(item => item.ready && Number.isFinite(Date.parse(item.date))).length;
        document.getElementById('batchChooseBtn').disabled = session.reading || session.saving;
        document.getElementById('batchCloseBtn').disabled = session.saving;
        document.getElementById('batchStopBtn').classList.toggle('hidden', !session.saving);
        document.getElementById('batchStopBtn').disabled = !!session.stopRequested;
        document.getElementById('batchSaveBtn').disabled = session.reading || session.saving || !ready || session.items.some(item => item.ready && !Number.isFinite(Date.parse(item.date)));
        document.getElementById('batchSaveLabel').textContent = session.saving ? 'Saving…' : `Add ${ready || ''} ${ready === 1 ? 'entry' : 'entries'}`;
        document.getElementById('batchEmptyHint').classList.toggle('hidden', session.items.length > 0);
        document.getElementById('batchProgress').textContent = session.saving ? session.stopRequested ? 'Stopping after this photo…' : session.progress : session.reading ? `Reading ${session.items.filter(item => item.ready || item.error).length} / ${session.items.length}` : session.items.length ? `${ready} ready${session.items.some(item => !item.ready) ? ' · remove unreadable photos' : ''}` : 'No photos selected';
    },
    setDate(id, value) {
        const item = this.session?.items.find(item => item.id === id);
        if (!item || this.session.saving) return;
        item.date = value;
        item.dateEdited = true;
        if (!item.error) {
            const hint = document.getElementById(`batchHint-${id}`);
            hint.title = 'Date set by you';
            hint.className = 'text-[11px] mt-1.5 flex items-start gap-1 text-earth-metal/60';
            hint.innerHTML = '<i data-lucide="pencil" class="w-3.5 h-3.5 shrink-0" aria-hidden="true"></i><span>Your date</span>';
            lucide.createIcons();
        }
        // Keep the field mounted while editing, including temporary incomplete values.
        this.updateControls();
    },
    remove(id) {
        const session = this.session;
        if (!session || session.saving) return;
        const item = session.items.find(item => item.id === id);
        if (item?.url) URL.revokeObjectURL(item.url);
        session.items = session.items.filter(item => item.id !== id);
        document.getElementById(`batchRow-${id}`)?.remove();
        this.updateControls();
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
        const items = session.items.filter(item => item.ready);
        if (!items.length || items.some(item => !Number.isFinite(Date.parse(item.date)))) return;
        if (!ImageStore.isAvailable()) return App.showToast('Photo storage is unavailable in this browser.', 'error');
        const diary = Storage.getData().find(diary => diary.id === session.diaryId);
        if (!diary) return App.showToast('This diary is no longer available.', 'error');
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
        document.getElementById('batchFileInput').value = '';
        if (App.state.isEntryModalOpen) {
            App.startDrawLoop();
            if (!document.getElementById('segmentEditOverlay').classList.contains('hidden')) App.startSegEditPreview();
        }
    }
};
