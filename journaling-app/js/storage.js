import {
    DB_NAME,
    DB_VERSION,
    FIELD_INDEXES,
    STORE_NAMES,
    STORAGE_KEYS,
    buildAssetRecord,
    buildDocumentRecord,
    buildHealthLogRecord,
    buildSyncJobRecord,
    buildViewRecord,
    createId,
    normalizeSettings,
    normalizeSyncState,
    nowIso
} from './schema.js';

const resolveScope = () => {
    try {
        const rawPath = globalThis.location?.pathname || '';
        const trimmed = rawPath.replace(/\/index\.html$/i, '').replace(/\/$/, '');
        const parts = trimmed.split('/').filter(Boolean);
        const last = parts[parts.length - 1] || 'journaling-app';
        return last.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'journaling-app';
    } catch (_) {
        return 'journaling-app';
    }
};

const scope = resolveScope();
const scopedDbName = `${DB_NAME}_${scope}`;

const openRequest = (store, method, ...args) => new Promise((resolve, reject) => {
    let req;
    try {
        req = store[method](...args);
    } catch (error) {
        reject(error);
        return;
    }
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB request failed'));
});

const clone = (value) => {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
};

const ensureArray = (value) => Array.isArray(value) ? value.slice() : [];

const createStoreIndexes = (store, names) => {
    for (const name of names) {
        const keyPath = FIELD_INDEXES[store.name]?.includes(name) ? name : name;
        if (!store.indexNames.contains(name)) {
            store.createIndex(name, keyPath, { unique: false });
        }
    }
};

export const Storage = {
    scope,
    dbName: scopedDbName,
    db: null,
    _initPromise: null,
    _ready: false,

    async init() {
        if (this._ready && this.db) return this.db;
        if (this._initPromise) return this._initPromise;

        this._initPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(this.dbName, DB_VERSION);

            req.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(STORE_NAMES.documents)) {
                    db.createObjectStore(STORE_NAMES.documents, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORE_NAMES.healthLogs)) {
                    db.createObjectStore(STORE_NAMES.healthLogs, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORE_NAMES.assets)) {
                    db.createObjectStore(STORE_NAMES.assets, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORE_NAMES.views)) {
                    db.createObjectStore(STORE_NAMES.views, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORE_NAMES.settings)) {
                    db.createObjectStore(STORE_NAMES.settings, { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains(STORE_NAMES.syncQueue)) {
                    db.createObjectStore(STORE_NAMES.syncQueue, { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(STORE_NAMES.meta)) {
                    db.createObjectStore(STORE_NAMES.meta, { keyPath: 'key' });
                }

                const documentStore = event.target.transaction.objectStore(STORE_NAMES.documents);
                const healthStore = event.target.transaction.objectStore(STORE_NAMES.healthLogs);
                const assetStore = event.target.transaction.objectStore(STORE_NAMES.assets);
                const viewStore = event.target.transaction.objectStore(STORE_NAMES.views);
                const queueStore = event.target.transaction.objectStore(STORE_NAMES.syncQueue);

                createStoreIndexes(documentStore, ['date', 'updatedAt', 'type', 'archived']);
                createStoreIndexes(healthStore, ['kind', 'recordedAt', 'updatedAt', 'linkedDocumentId']);
                createStoreIndexes(assetStore, ['documentId', 'kind', 'remoteStatus', 'localStatus', 'updatedAt']);
                createStoreIndexes(viewStore, ['type', 'updatedAt']);
                createStoreIndexes(queueStore, ['status', 'type', 'targetId', 'updatedAt']);
            };

            req.onsuccess = () => {
                this.db = req.result;
                this._ready = true;
                this.db.onversionchange = () => {
                    this.db.close();
                    this.db = null;
                    this._ready = false;
                    this._initPromise = null;
                };
                resolve(this.db);
            };

            req.onerror = () => {
                this._initPromise = null;
                reject(req.error || new Error('Failed to open IndexedDB'));
            };
        });

        return this._initPromise;
    },

    async ensureReady() {
        return this.init();
    },

    _store(name, mode = 'readonly') {
        if (!this.db) throw new Error('IndexedDB is not initialized');
        return this.db.transaction(name, mode).objectStore(name);
    },

    async withTransaction(storeNames, mode, fn) {
        await this.ensureReady();
        const names = Array.isArray(storeNames) ? storeNames : [storeNames];
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(names, mode);
            const stores = {};
            for (const name of names) stores[name] = tx.objectStore(name);
            try {
                fn(stores, tx);
            } catch (error) {
                try { tx.abort(); } catch (_) {}
                reject(error);
                return;
            }
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error('Transaction failed'));
            tx.onabort = () => reject(new Error('Transaction aborted'));
        });
    },

    async getSettings() {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.settings);
        const raw = await openRequest(store, 'get', 'current');
        return normalizeSettings(raw?.value || raw || {});
    },

    async saveSettings(settings) {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.settings, 'readwrite');
        const record = { key: 'current', value: normalizeSettings(settings) };
        await openRequest(store, 'put', record);
        return record.value;
    },

    async getSyncState() {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.meta);
        const raw = await openRequest(store, 'get', STORAGE_KEYS.syncState);
        return normalizeSyncState(raw?.value || raw || {});
    },

    async saveSyncState(syncState) {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.meta, 'readwrite');
        const value = normalizeSyncState(syncState);
        await openRequest(store, 'put', { key: STORAGE_KEYS.syncState, value });
        return value;
    },

    async getMeta(key) {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.meta);
        const raw = await openRequest(store, 'get', key);
        return raw?.value || null;
    },

    async saveMeta(key, value) {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.meta, 'readwrite');
        await openRequest(store, 'put', { key, value });
        return value;
    },

    async getDocument(id) {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.documents);
        const raw = await openRequest(store, 'get', id);
        return raw ? buildDocumentRecord(raw) : null;
    },

    async listDocuments() {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.documents);
        return (await openRequest(store, 'getAll')).map(buildDocumentRecord);
    },

    async saveDocument(doc) {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.documents, 'readwrite');
        const record = buildDocumentRecord(doc);
        record.updatedAt = nowIso();
        if (!record.createdAt) record.createdAt = record.updatedAt;
        await openRequest(store, 'put', record);
        return record;
    },

    async deleteDocument(id) {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.documents, 'readwrite');
        await openRequest(store, 'delete', id);
    },

    async getHealthLog(id) {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.healthLogs);
        const raw = await openRequest(store, 'get', id);
        return raw ? buildHealthLogRecord(raw) : null;
    },

    async listHealthLogs() {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.healthLogs);
        return (await openRequest(store, 'getAll')).map(buildHealthLogRecord);
    },

    async saveHealthLog(log) {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.healthLogs, 'readwrite');
        const record = buildHealthLogRecord(log);
        record.updatedAt = nowIso();
        await openRequest(store, 'put', record);
        return record;
    },

    async deleteHealthLog(id) {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.healthLogs, 'readwrite');
        await openRequest(store, 'delete', id);
    },

    async getAsset(id) {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.assets);
        const raw = await openRequest(store, 'get', id);
        return raw ? buildAssetRecord(raw) : null;
    },

    async listAssets() {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.assets);
        return (await openRequest(store, 'getAll')).map(buildAssetRecord);
    },

    async saveAsset(asset) {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.assets, 'readwrite');
        const record = buildAssetRecord(asset);
        record.updatedAt = nowIso();
        await openRequest(store, 'put', record);
        return record;
    },

    async deleteAsset(id) {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.assets, 'readwrite');
        await openRequest(store, 'delete', id);
    },

    async getView(id) {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.views);
        const raw = await openRequest(store, 'get', id);
        return raw ? buildViewRecord(raw) : null;
    },

    async listViews() {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.views);
        return (await openRequest(store, 'getAll')).map(buildViewRecord);
    },

    async saveView(view) {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.views, 'readwrite');
        const record = buildViewRecord(view);
        record.updatedAt = nowIso();
        await openRequest(store, 'put', record);
        return record;
    },

    async deleteView(id) {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.views, 'readwrite');
        await openRequest(store, 'delete', id);
    },

    async enqueueSyncJob(job) {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.syncQueue, 'readwrite');
        const record = buildSyncJobRecord(job);
        record.updatedAt = nowIso();
        const payload = { ...record };
        if (payload.id === undefined) delete payload.id;
        const id = await openRequest(store, 'add', payload);
        return { ...record, id };
    },

    async updateSyncJob(job) {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.syncQueue, 'readwrite');
        const record = buildSyncJobRecord(job);
        record.updatedAt = nowIso();
        await openRequest(store, 'put', record);
        return record;
    },

    async listSyncJobs() {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.syncQueue);
        return (await openRequest(store, 'getAll')).map(buildSyncJobRecord);
    },

    async clearSyncJobs() {
        await this.ensureReady();
        const store = this._store(STORE_NAMES.syncQueue, 'readwrite');
        await openRequest(store, 'clear');
    },

    async replaceLibrary(snapshot = {}) {
        const documents = (snapshot.documents || []).map(buildDocumentRecord);
        const healthLogs = (snapshot.healthLogs || []).map(buildHealthLogRecord);
        const assets = (snapshot.assets || []).map(buildAssetRecord);
        const views = (snapshot.views || []).map(buildViewRecord);
        await this.withTransaction([
            STORE_NAMES.documents,
            STORE_NAMES.healthLogs,
            STORE_NAMES.assets,
            STORE_NAMES.views,
            STORE_NAMES.syncQueue
        ], 'readwrite', (stores) => {
            stores.documents.clear();
            stores.healthLogs.clear();
            stores.assets.clear();
            stores.views.clear();
            stores.syncQueue.clear();
            documents.forEach((record) => stores.documents.put(record));
            healthLogs.forEach((record) => stores.healthLogs.put(record));
            assets.forEach((record) => stores.assets.put(record));
            views.forEach((record) => stores.views.put(record));
        });
    },

    async replaceWorkspace(snapshot = {}) {
        const documents = snapshot.documents.map(buildDocumentRecord);
        const healthLogs = snapshot.healthLogs.map(buildHealthLogRecord);
        const assets = snapshot.assets.map(buildAssetRecord);
        const views = snapshot.views.map(buildViewRecord);
        const settings = normalizeSettings(snapshot.settings);
        const syncQueue = snapshot.syncQueue.map(buildSyncJobRecord);
        const syncState = normalizeSyncState(snapshot.syncState);
        await this.withTransaction([
            STORE_NAMES.documents,
            STORE_NAMES.healthLogs,
            STORE_NAMES.assets,
            STORE_NAMES.views,
            STORE_NAMES.syncQueue,
            STORE_NAMES.settings,
            STORE_NAMES.meta
        ], 'readwrite', (stores) => {
            Object.values(stores).forEach((store) => store.clear());
            documents.forEach((record) => stores.documents.put(record));
            healthLogs.forEach((record) => stores.healthLogs.put(record));
            assets.forEach((record) => stores.assets.put(record));
            views.forEach((record) => stores.views.put(record));
            syncQueue.forEach((record) => {
                const payload = { ...record };
                if (payload.id === null || payload.id === undefined) {
                    delete payload.id;
                    stores.syncQueue.add(payload);
                } else {
                    stores.syncQueue.put(payload);
                }
            });
            stores.settings.put({ key: 'current', value: settings });
            stores.meta.put({ key: STORAGE_KEYS.syncState, value: syncState });
        });
    },

    async getAllData() {
        await this.ensureReady();
        const [documents, healthLogs, assets, views, settings, syncQueue, syncState] = await Promise.all([
            this.listDocuments(),
            this.listHealthLogs(),
            this.listAssets(),
            this.listViews(),
            this.getSettings(),
            this.listSyncJobs(),
            this.getSyncState()
        ]);
        return {
            documents,
            healthLogs,
            assets,
            views,
            settings,
            syncQueue,
            syncState
        };
    },

    async seedDefaults() {
        await this.ensureReady();
        const [settings, syncState] = await Promise.all([this.getSettings(), this.getSyncState()]);
        if (!settings.version) await this.saveSettings(settings);
        if (!syncState.version) await this.saveSyncState(syncState);
        return true;
    },

    async clearAll() {
        await this.ensureReady();
        await this.withTransaction([
            STORE_NAMES.documents,
            STORE_NAMES.healthLogs,
            STORE_NAMES.assets,
            STORE_NAMES.views,
            STORE_NAMES.syncQueue,
            STORE_NAMES.settings,
            STORE_NAMES.meta
        ], 'readwrite', (stores) => {
            stores.documents.clear();
            stores.healthLogs.clear();
            stores.assets.clear();
            stores.views.clear();
            stores.syncQueue.clear();
            stores.settings.clear();
            stores.meta.clear();
        });
    },

    createId(prefix) {
        return createId(prefix);
    },

    clone(value) {
        return clone(value);
    },

    ensureArray(value) {
        return ensureArray(value);
    }
};

export const createJournalDocument = (partial = {}) => buildDocumentRecord({
    type: 'entry',
    content: '',
    tags: [],
    people: [],
    attachments: [],
    blocks: [],
    metadata: {},
    ...partial
});

export const createHealthEntry = (partial = {}) => buildHealthLogRecord(partial);

export const createAssetEntry = (partial = {}) => buildAssetRecord(partial);

export const createViewEntry = (partial = {}) => buildViewRecord(partial);
