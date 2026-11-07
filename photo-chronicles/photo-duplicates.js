/* Local content fingerprints. No Notion requests are made by duplicate checks. */
const PhotoDuplicates = {
    async fingerprint(file, preview = null) {
        const digest = async blob => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())), byte => byte.toString(16).padStart(2, '0')).join('');
        return {
            version: 1,
            fileHash: await digest(file),
            previewHash: preview ? await digest(preview) : null
        };
    },
    match(a, b) {
        if (!a || !b || a.version !== 1 || b.version !== 1) return null;
        if (a.fileHash && a.fileHash === b.fileHash) return 'exact';
        // Older batch imports retain the deterministic preview, not the original file.
        if (a.previewHash && (a.previewHash === b.previewHash || a.previewHash === b.fileHash)) return 'preview';
        if (b.previewHash && b.previewHash === a.fileHash) return 'preview';
        return null;
    },
    remember(diary) {
        diary.photoIndex ||= {};
        for (const entry of diary.entries || []) {
            if (entry.deletedLocally) delete diary.photoIndex[entry.id];
            else if (entry.photoFingerprints?.length) diary.photoIndex[entry.id] = {
                fingerprints: entry.photoFingerprints, title: entry.title, date: entry.date, notionId: entry.notionId
            };
        }
    },
    async fingerprintEntry(entry) {
        if (entry.photoFingerprints?.length || entry.deletedLocally) return;
        // Only use photos already cached on this device. Never fetch a remote URL.
        const fingerprints = [];
        for (const [key, data] of [[entry.photoKey, entry.photoDataURL], [entry.uploadKey, entry.uploadDataURL]]) {
            let blob = key && ImageStore.isAvailable() ? await ImageStore.get(key) : null;
            if (!blob && data?.startsWith('data:')) blob = UTILS.dataURLtoBlob(data);
            if (blob) fingerprints.push(await this.fingerprint(blob));
        }
        if (fingerprints.length) entry.photoFingerprints = fingerprints;
    },
    async prepare(diaryId) {
        const diary = Storage.getData().find(diary => diary.id === diaryId);
        if (!diary) return;
        const updates = [];
        for (const entry of diary.entries || []) {
            if (entry.deletedLocally || entry.photoFingerprints?.length || diary.photoIndex?.[entry.id]) continue;
            try {
                await this.fingerprintEntry(entry);
                if (entry.photoFingerprints?.length) updates.push(entry);
            } catch (error) {
                console.warn('Could not index a cached photo', error);
            }
        }
        // Re-read after async work so a sync/save in progress is not overwritten.
        const data = Storage.getData();
        const current = data.find(diary => diary.id === diaryId);
        if (!current) return;
        for (const update of updates) {
            const entry = current.entries.find(entry => entry.id === update.id);
            if (entry && !entry.deletedLocally && !entry.photoFingerprints?.length) entry.photoFingerprints = update.photoFingerprints;
        }
        this.remember(current);
        Storage.setData(data);
    },
    find(fingerprint, diaryId, pending = []) {
        const diary = Storage.getData().find(diary => diary.id === diaryId);
        const candidates = [
            ...Object.values(diary?.photoIndex || {}).map(entry => ({ ...entry, location: 'this diary' })),
            ...pending.filter(item => item.fingerprint).map(item => ({ fingerprints: [item.fingerprint], title: item.name, location: 'this selection' }))
        ];
        let previewMatch = null;
        for (const entry of candidates) {
            for (const other of entry.fingerprints) {
                const kind = this.match(fingerprint, other);
                const match = kind && { kind, title: entry.title || 'Untitled entry', location: entry.location };
                if (kind === 'exact') return match;
                previewMatch ||= match;
            }
        }
        return previewMatch;
    },
    describe(match) {
        return `${match.kind === 'exact' ? 'Duplicate' : 'Matching saved preview'} of “${match.title}” in ${match.location}.`;
    }
};
