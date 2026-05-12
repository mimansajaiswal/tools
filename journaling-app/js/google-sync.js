import { normalizeSyncState, nowIso } from './schema.js';

const initialState = () => normalizeSyncState({
    status: 'disabled',
    provider: 'google-drive',
    lastError: null,
    rootFolderId: '',
    folderMap: {},
    remoteFingerprints: {},
    pendingDocumentIds: [],
    pendingAssetIds: []
});

const createStateMachine = (seed = {}) => {
    const state = normalizeSyncState({ ...initialState(), ...seed });
    const listeners = new Set();
    const emit = () => {
        const snapshot = { ...state, folderMap: { ...state.folderMap }, remoteFingerprints: { ...state.remoteFingerprints }, pendingDocumentIds: [...state.pendingDocumentIds], pendingAssetIds: [...state.pendingAssetIds] };
        for (const listener of listeners) listener(snapshot);
    };
    const mutate = (patch = {}) => {
        Object.assign(state, normalizeSyncState({ ...state, ...patch }));
        emit();
        return state;
    };

    return {
        getState() {
            return { ...state, folderMap: { ...state.folderMap }, remoteFingerprints: { ...state.remoteFingerprints }, pendingDocumentIds: [...state.pendingDocumentIds], pendingAssetIds: [...state.pendingAssetIds] };
        },
        setState(patch) {
            return mutate(patch);
        },
        subscribe(listener) {
            listeners.add(listener);
            listener(this.getState());
            return () => listeners.delete(listener);
        },
        markDisabled(reason = 'Google Drive not configured') {
            return mutate({ status: 'disabled', lastError: reason, lastSyncAt: null });
        },
        markConnecting() {
            return mutate({ status: 'connecting', lastError: null });
        },
        markReady(rootFolderId = '') {
            return mutate({ status: 'ready', rootFolderId, lastError: null, lastConnectedAt: nowIso() });
        },
        markSyncing() {
            return mutate({ status: 'syncing', lastError: null });
        },
        markSynced(extra = {}) {
            return mutate({
                status: 'ready',
                lastSyncAt: nowIso(),
                lastPushAt: extra.lastPushAt || state.lastPushAt,
                lastPullAt: extra.lastPullAt || state.lastPullAt,
                lastError: null
            });
        },
        markError(error) {
            return mutate({ status: 'error', lastError: String(error || 'Google Drive sync failed') });
        },
        setPending(documentIds = [], assetIds = []) {
            return mutate({
                pendingDocumentIds: Array.isArray(documentIds) ? documentIds.slice() : [],
                pendingAssetIds: Array.isArray(assetIds) ? assetIds.slice() : []
            });
        },
        mergeFolderMap(folderMap = {}) {
            return mutate({ folderMap: { ...state.folderMap, ...(folderMap && typeof folderMap === 'object' ? folderMap : {}) } });
        },
        mergeRemoteFingerprints(remoteFingerprints = {}) {
            return mutate({ remoteFingerprints: { ...state.remoteFingerprints, ...(remoteFingerprints && typeof remoteFingerprints === 'object' ? remoteFingerprints : {}) } });
        }
    };
};

const driveStub = {
    async initialize() {
        return { ok: false, reason: 'google-drive-not-configured' };
    },
    async connect() {
        return { ok: false, reason: 'google-drive-not-configured' };
    },
    async ensureRootFolder() {
        return { ok: false, reason: 'google-drive-not-configured' };
    },
    async push() {
        return { ok: false, reason: 'google-drive-not-configured' };
    },
    async pull() {
        return { ok: false, reason: 'google-drive-not-configured' };
    },
    async queueDocument() {
        return { ok: false, reason: 'google-drive-not-configured' };
    },
    async queueAsset() {
        return { ok: false, reason: 'google-drive-not-configured' };
    },
    async disconnect() {
        return { ok: true };
    }
};

export const createGoogleSync = (options = {}) => {
    const stateMachine = createStateMachine(options.initialState || {});
    const config = {
        rootFolderName: options.rootFolderName || 'Journaling',
        ...options
    };

    return {
        config,
        state: stateMachine,
        drive: driveStub,
        isConfigured() {
            return false;
        },
        getStatus() {
            return stateMachine.getState().status;
        },
        getSnapshot() {
            return {
                config: { ...config },
                state: stateMachine.getState(),
                configured: false
            };
        },
        async initialize() {
            stateMachine.markDisabled('Google Drive sync adapter stub is not configured yet');
            return { ok: false, reason: 'google-drive-not-configured' };
        },
        async connect() {
            stateMachine.markDisabled('Google Drive sync adapter stub is not configured yet');
            return { ok: false, reason: 'google-drive-not-configured' };
        },
        async disconnect() {
            stateMachine.markDisabled('Google Drive sync disabled');
            return { ok: true };
        },
        async enqueueDocument(document, meta = {}) {
            const id = document?.id || meta.documentId || '';
            const pendingDocumentIds = new Set(stateMachine.getState().pendingDocumentIds);
            if (id) pendingDocumentIds.add(id);
            stateMachine.setPending([...pendingDocumentIds], stateMachine.getState().pendingAssetIds);
            return { ok: false, queued: true, targetId: id, reason: 'google-drive-not-configured' };
        },
        async enqueueAsset(asset, meta = {}) {
            const id = asset?.id || meta.assetId || '';
            const pendingAssetIds = new Set(stateMachine.getState().pendingAssetIds);
            if (id) pendingAssetIds.add(id);
            stateMachine.setPending(stateMachine.getState().pendingDocumentIds, [...pendingAssetIds]);
            return { ok: false, queued: true, targetId: id, reason: 'google-drive-not-configured' };
        },
        async syncNow() {
            stateMachine.markSyncing();
            stateMachine.markDisabled('Google Drive sync adapter stub is not configured yet');
            return { ok: false, reason: 'google-drive-not-configured' };
        },
        async applyRemoteSnapshot() {
            return { ok: false, reason: 'google-drive-not-configured' };
        },
        async setRootFolderId(rootFolderId = '') {
            stateMachine.markReady(rootFolderId);
            return stateMachine.getState();
        },
        async saveState() {
            return stateMachine.getState();
        },
        async loadState() {
            return stateMachine.getState();
        },
        async fakePull() {
            return { ok: false, reason: 'google-drive-not-configured' };
        }
    };
};

export const GoogleSync = createGoogleSync();
