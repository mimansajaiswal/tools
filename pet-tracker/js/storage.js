/**
 * Pet Tracker - Storage Layer
 * Handles IndexedDB for data/media and LocalStorage for settings
 * All keys prefixed with pettracker_ / PetTracker_ for isolation
 */

const DB_NAME = 'PetTracker_DB';
const DB_VERSION = 4;
const LS_PREFIX = 'pettracker_';

// IndexedDB Store Names
const STORES = {
    PETS: 'pets',
    EVENTS: 'events',
    EVENT_TYPES: 'eventTypes',
    SCALES: 'scales',
    SCALE_LEVELS: 'scaleLevels',
    CONTACTS: 'contacts',
    SYNC_QUEUE: 'syncQueue',
    MEDIA: 'media',
    MEDIA_META: 'mediaMeta',
    AI_QUEUE: 'aiQueue'
};

// Media cache limit (~200MB)
const MEDIA_CACHE_LIMIT = 200 * 1024 * 1024;

/**
 * IndexedDB Database Manager
 */
const DB = {
    _db: null,

    open: () => {
        if (DB._db) return Promise.resolve(DB._db);

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                DB._db = request.result;
                resolve(DB._db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Data stores with notionId index
                // Note: CARE_ITEMS and CARE_PLANS have been removed - scheduling now handled via event types with isRecurring=true
                const dataStores = [
                    STORES.PETS, STORES.EVENTS, STORES.EVENT_TYPES,
                    STORES.SCALES, STORES.SCALE_LEVELS, STORES.CONTACTS
                ];

                dataStores.forEach(storeName => {
                    let store;
                    if (!db.objectStoreNames.contains(storeName)) {
                        store = db.createObjectStore(storeName, { keyPath: 'id' });
                    } else {
                        store = event.target.transaction.objectStore(storeName);
                    }
                    if (!store.indexNames.contains('notionId')) {
                        store.createIndex('notionId', 'notionId', { unique: false });
                    }
                    if (!store.indexNames.contains('updatedAt')) {
                        store.createIndex('updatedAt', 'updatedAt', { unique: false });
                    }
                    if (storeName === STORES.EVENTS && !store.indexNames.contains('startDate')) {
                        store.createIndex('startDate', 'startDate', { unique: false });
                    }
                });

                // Sync queue store - uses explicit UUID keys (id provided by SyncQueue.add)
                if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                    const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
                    syncStore.createIndex('status', 'status', { unique: false });
                    syncStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Media blob store
                if (!db.objectStoreNames.contains(STORES.MEDIA)) {
                    db.createObjectStore(STORES.MEDIA);
                }

                // Media metadata store (for LRU eviction)
                if (!db.objectStoreNames.contains(STORES.MEDIA_META)) {
                    const metaStore = db.createObjectStore(STORES.MEDIA_META, { keyPath: 'id' });
                    metaStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
                    metaStore.createIndex('size', 'size', { unique: false });
                }

                // AI Queue store (for offline/later processing)
                if (!db.objectStoreNames.contains(STORES.AI_QUEUE)) {
                    const aiStore = db.createObjectStore(STORES.AI_QUEUE, { keyPath: 'id' });
                    aiStore.createIndex('status', 'status', { unique: false });
                    aiStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    },

    get: async (storeName, id) => {
        const db = await DB.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    },

    getByNotionId: async (storeName, notionId) => {
        const db = await DB.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const index = store.index('notionId');
            const request = index.get(notionId);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    },

    getAll: async (storeName) => {
        const db = await DB.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    put: async (storeName, record) => {
        const db = await DB.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            record.updatedAt = record.updatedAt || new Date().toISOString();
            const request = store.put(record);
            request.onsuccess = () => resolve(record);
            request.onerror = () => reject(request.error);
        });
    },

    delete: async (storeName, id) => {
        const db = await DB.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    clear: async (storeName) => {
        const db = await DB.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    query: async (storeName, filterFn) => {
        const all = await DB.getAll(storeName);
        return all.filter(filterFn);
    },

    getByIndexRange: async (storeName, indexName, range) => {
        const db = await DB.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            if (!store.indexNames.contains(indexName)) {
                resolve(null);
                return;
            }
            const index = store.index(indexName);
            const request = index.getAll(range);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    getRecentByIndex: async (storeName, indexName, limit = 10) => {
        const db = await DB.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            if (!store.indexNames.contains(indexName)) {
                resolve(null);
                return;
            }
            const index = store.index(indexName);
            const results = [];
            const request = index.openCursor(null, 'prev');
            request.onsuccess = () => {
                const cursor = request.result;
                if (!cursor || results.length >= limit) {
                    resolve(results);
                    return;
                }
                results.push(cursor.value);
                cursor.continue();
            };
            request.onerror = () => reject(request.error);
        });
    },

    // Delete entire database (for reset)
    deleteDatabase: () => {
        return new Promise((resolve, reject) => {
            DB._db?.close();
            DB._db = null;
            const request = indexedDB.deleteDatabase(DB_NAME);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
            request.onblocked = () => {
                console.warn('[DB] Database deletion blocked');
                resolve(true);
            };
        });
    }
};

/**
 * Sync Queue Manager
 */
const SyncQueue = {
    getActiveForRecord: async (store, recordId) => {
        return DB.query(
            STORES.SYNC_QUEUE,
            item => item.store === store &&
                item.recordId === recordId &&
                (item.status === 'pending' || item.status === 'failed')
        );
    },

    removeMany: async (items = []) => {
        for (const item of items) {
            await DB.delete(STORES.SYNC_QUEUE, item.id);
        }
    },

    add: async (operation) => {
        const existing = await SyncQueue.getActiveForRecord(operation.store, operation.recordId);
        const now = new Date().toISOString();

        const existingCreate = existing.find(item => item.type === 'create');
        const existingUpdate = existing.find(item => item.type === 'update');
        const existingDelete = existing.find(item => item.type === 'delete');

        // Queue compaction: collapse conflicting operations for same record.
        if (operation.type === 'update') {
            if (existingDelete) {
                return existingDelete;
            }

            if (existingCreate) {
                existingCreate.data = { ...(existingCreate.data || {}), ...(operation.data || {}) };
                existingCreate.status = 'pending';
                existingCreate.error = null;
                existingCreate.retryCount = existingCreate.retryCount || 0;
                existingCreate.lastAttempt = now;
                return DB.put(STORES.SYNC_QUEUE, existingCreate);
            }

            if (existingUpdate) {
                existingUpdate.data = { ...(existingUpdate.data || {}), ...(operation.data || {}) };
                existingUpdate.status = 'pending';
                existingUpdate.error = null;
                existingUpdate.lastAttempt = now;
                return DB.put(STORES.SYNC_QUEUE, existingUpdate);
            }
        }

        if (operation.type === 'create') {
            if (existingDelete) {
                await DB.delete(STORES.SYNC_QUEUE, existingDelete.id);
            }

            if (existingCreate) {
                existingCreate.data = { ...(existingCreate.data || {}), ...(operation.data || {}) };
                existingCreate.status = 'pending';
                existingCreate.error = null;
                existingCreate.lastAttempt = now;
                return DB.put(STORES.SYNC_QUEUE, existingCreate);
            }
        }

        if (operation.type === 'delete') {
            const hasPendingCreateOrUpdate = existing.some(
                item => item.type === 'create' || item.type === 'update'
            );
            await SyncQueue.removeMany(existing.filter(
                item => item.type === 'create' || item.type === 'update'
            ));

            // Created-and-deleted before first sync: remove queue noise and skip remote delete.
            if (hasPendingCreateOrUpdate && !operation.data?.notionId) {
                if (existingDelete) {
                    await DB.delete(STORES.SYNC_QUEUE, existingDelete.id);
                }
                return null;
            }

            if (existingDelete) {
                existingDelete.data = {
                    ...(existingDelete.data || {}),
                    ...(operation.data || {}),
                    notionId: operation.data?.notionId || existingDelete.data?.notionId || null
                };
                existingDelete.status = 'pending';
                existingDelete.error = null;
                existingDelete.lastAttempt = now;
                return DB.put(STORES.SYNC_QUEUE, existingDelete);
            }

            // No known remote ID and no pending create/update to cancel -> skip.
            if (!operation.data?.notionId) {
                return null;
            }
        }

        const queueItem = {
            ...operation,
            id: generateId(),
            status: 'pending',
            createdAt: now,
            retryCount: 0
        };
        return DB.put(STORES.SYNC_QUEUE, queueItem);
    },

    getPending: async () => {
        return DB.query(STORES.SYNC_QUEUE, item => item.status === 'pending');
    },

    complete: async (id) => {
        return DB.delete(STORES.SYNC_QUEUE, id);
    },

    fail: async (id, error) => {
        const item = await DB.get(STORES.SYNC_QUEUE, id);
        if (item) {
            item.status = 'failed';
            item.error = error;
            item.retryCount = (item.retryCount || 0) + 1;
            item.lastAttempt = new Date().toISOString();
            return DB.put(STORES.SYNC_QUEUE, item);
        }
    },

    resetFailed: async () => {
        const failed = await DB.query(STORES.SYNC_QUEUE, item => item.status === 'failed');
        for (const item of failed) {
            item.status = 'pending';
            await DB.put(STORES.SYNC_QUEUE, item);
        }
    }
};

/**
 * AI Queue Manager (for offline/later processing)
 */
const AIQueue = {
    add: async (text) => {
        var normalized = text.trim().toLowerCase();
        var pending = await AIQueue.getPending();
        var isDupe = pending.some(function (item) {
            return item.text.trim().toLowerCase() === normalized;
        });
        if (isDupe) return null;

        const queueItem = {
            id: generateId(),
            text: text.trim(),
            status: 'pending',
            createdAt: new Date().toISOString(),
            error: null
        };
        return DB.put(STORES.AI_QUEUE, queueItem);
    },

    getPending: async () => {
        var items = await DB.query(STORES.AI_QUEUE, item => item.status === 'pending');
        items.sort(function (a, b) {
            return (a.createdAt || '').localeCompare(b.createdAt || '');
        });
        return items;
    },

    getAll: async () => {
        return DB.getAll(STORES.AI_QUEUE);
    },

    get: async (id) => {
        return DB.get(STORES.AI_QUEUE, id);
    },

    updateStatus: async (id, status, error = null) => {
        const item = await DB.get(STORES.AI_QUEUE, id);
        if (item) {
            item.status = status;
            item.error = error;
            item.processedAt = status !== 'pending' ? new Date().toISOString() : null;
            return DB.put(STORES.AI_QUEUE, item);
        }
    },

    delete: async (id) => {
        return DB.delete(STORES.AI_QUEUE, id);
    },

    clearCompleted: async () => {
        const completed = await DB.query(STORES.AI_QUEUE, item => item.status === 'completed');
        for (const item of completed) {
            await DB.delete(STORES.AI_QUEUE, item.id);
        }
    },

    getPendingCount: async () => {
        const pending = await AIQueue.getPending();
        return pending.length;
    },

    resetStaleProcessing: async () => {
        var stale = await DB.query(STORES.AI_QUEUE, function (item) {
            return item.status === 'processing';
        });
        for (var i = 0; i < stale.length; i++) {
            stale[i].status = 'pending';
            stale[i].error = null;
            await DB.put(STORES.AI_QUEUE, stale[i]);
        }
        return stale.length;
    }
};

/**
 * Media Storage Manager with LRU Eviction
 */
const MediaStore = {
    set: async (id, blob) => {
        const db = await DB.open();
        await MediaStore.evictIfNeeded(blob.size);

        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORES.MEDIA, STORES.MEDIA_META], 'readwrite');
            const mediaStore = tx.objectStore(STORES.MEDIA);
            const metaStore = tx.objectStore(STORES.MEDIA_META);

            mediaStore.put(blob, id);
            metaStore.put({
                id,
                size: blob.size,
                type: blob.type,
                lastAccessed: Date.now(),
                createdAt: Date.now()
            });

            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => {
                const err = tx.error;
                if (err?.name === 'QuotaExceededError') err.isQuotaExceeded = true;
                reject(err);
            };
        });
    },

    get: async (id) => {
        const db = await DB.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORES.MEDIA, STORES.MEDIA_META], 'readwrite');
            const mediaStore = tx.objectStore(STORES.MEDIA);
            const metaStore = tx.objectStore(STORES.MEDIA_META);

            const blobReq = mediaStore.get(id);
            blobReq.onsuccess = () => {
                const blob = blobReq.result;
                if (blob) {
                    const metaReq = metaStore.get(id);
                    metaReq.onsuccess = () => {
                        if (metaReq.result) {
                            metaReq.result.lastAccessed = Date.now();
                            metaStore.put(metaReq.result);
                        }
                    };
                }
                resolve(blob || null);
            };
            blobReq.onerror = () => reject(blobReq.error);
        });
    },

    delete: async (id) => {
        const db = await DB.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORES.MEDIA, STORES.MEDIA_META], 'readwrite');
            tx.objectStore(STORES.MEDIA).delete(id);
            tx.objectStore(STORES.MEDIA_META).delete(id);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    },

    getTotalSize: async () => {
        const allMeta = await DB.getAll(STORES.MEDIA_META);
        return allMeta.reduce((sum, item) => sum + (item.size || 0), 0);
    },

    evictIfNeeded: async (incomingSize) => {
        const currentSize = await MediaStore.getTotalSize();
        let targetSize = currentSize + incomingSize;

        if (targetSize <= MEDIA_CACHE_LIMIT) return;

        const allMeta = await DB.getAll(STORES.MEDIA_META);
        allMeta.sort((a, b) => a.lastAccessed - b.lastAccessed);

        for (const meta of allMeta) {
            if (targetSize <= MEDIA_CACHE_LIMIT * 0.8) break;
            await MediaStore.delete(meta.id);
            targetSize -= meta.size;
            console.log(`[MediaStore] Evicted ${meta.id} (${Math.round(meta.size / 1024)}KB)`);
        }
    }
};

/**
 * LocalStorage Settings Manager (all keys prefixed with pettracker_)
 */
const Settings = {
    REQUIRED_DATA_SOURCE_KEYS: ['pets', 'events', 'eventTypes', 'scales', 'scaleLevels', 'contacts'],

    KEYS: {
        SETTINGS: LS_PREFIX + 'settings',
        LAST_SYNC: LS_PREFIX + 'last_sync',
        ACTIVE_PET: LS_PREFIX + 'active_pet',
        ONBOARDING_DONE: LS_PREFIX + 'onboarding_done',
        UI_STATE: LS_PREFIX + 'ui_state'
    },

    defaults: {
        workerUrl: '',
        proxyToken: '',
        authMode: 'token',
        notionToken: '',
        notionOAuthData: null,
        dataSources: {
            pets: '', events: '', eventTypes: '', scales: '',
            scaleLevels: '', contacts: ''
        },
        dataSourceNames: {
            pets: '', events: '', eventTypes: '', scales: '',
            scaleLevels: '', contacts: ''
        },
        aiProvider: 'openai',
        aiModel: 'gpt-4o-mini',
        aiApiKey: '',
        aiEndpoint: '',
        todoistEnabled: false,
        todoistToken: '',
        gcalEnabled: false,
        gcalAccessToken: '',
        gcalCalendarId: '',
        gcalUserEmail: '',
        syncCursors: {},
        uploadCapMb: 5,
        defaultPetId: null,
        calendarView: 'month',
        theme: 'light',
        quickAddPrefixes: {
            pet: ['pet:', 'p:'],
            type: ['type:', 't:'],
            date: ['on:', 'date:', 'd:'],
            time: ['at:', 'time:'],
            status: ['status:', 'st:'],
            severity: ['sev:', 'severity:'],
            value: ['val:', 'value:'],
            unit: ['unit:', 'u:'],
            tags: ['#', 'tag:'],
            notes: ['notes:', 'note:']
        }
    },

    get: () => {
        try {
            const raw = localStorage.getItem(Settings.KEYS.SETTINGS);
            if (!raw) return { ...Settings.defaults };
            const parsed = JSON.parse(raw);
            return {
                ...Settings.defaults,
                ...parsed,
                quickAddPrefixes: { ...(Settings.defaults.quickAddPrefixes || {}), ...(parsed.quickAddPrefixes || {}) }
            };
        } catch (e) {
            console.error('[Settings] Error reading:', e);
            return { ...Settings.defaults };
        }
    },

    set: (updates) => {
        const current = Settings.get();
        const hasDataSources = Object.prototype.hasOwnProperty.call(updates, 'dataSources');
        const hasDataSourceNames = Object.prototype.hasOwnProperty.call(updates, 'dataSourceNames');
        const hasSyncCursors = Object.prototype.hasOwnProperty.call(updates, 'syncCursors');
        const hasQaPrefixes = Object.prototype.hasOwnProperty.call(updates, 'quickAddPrefixes');

        const merged = {
            ...current,
            ...updates,
            dataSources: hasDataSources
                ? { ...(Settings.defaults.dataSources || {}), ...(updates.dataSources || {}) }
                : { ...(current.dataSources || {}) },
            dataSourceNames: hasDataSourceNames
                ? { ...(Settings.defaults.dataSourceNames || {}), ...(updates.dataSourceNames || {}) }
                : { ...(current.dataSourceNames || {}) },
            syncCursors: hasSyncCursors
                ? { ...(current.syncCursors || {}), ...(updates.syncCursors || {}) }
                : { ...(current.syncCursors || {}) },
            quickAddPrefixes: hasQaPrefixes
                ? { ...(Settings.defaults.quickAddPrefixes || {}), ...(updates.quickAddPrefixes || {}) }
                : { ...(current.quickAddPrefixes || Settings.defaults.quickAddPrefixes || {}) }
        };
        localStorage.setItem(Settings.KEYS.SETTINGS, JSON.stringify(merged));
        return merged;
    },

    isConnected: () => {
        const s = Settings.get();
        const hasDataSources = Settings.REQUIRED_DATA_SOURCE_KEYS.every(
            key => !!s.dataSources?.[key]
        );
        const hasToken = !!(s.notionToken || s.notionOAuthData?.access_token);
        return !!(s.workerUrl && hasToken && hasDataSources);
    },

    isOnboardingDone: () => localStorage.getItem(Settings.KEYS.ONBOARDING_DONE) === 'true',
    setOnboardingDone: (done) => done ? localStorage.setItem(Settings.KEYS.ONBOARDING_DONE, 'true') : localStorage.removeItem(Settings.KEYS.ONBOARDING_DONE),
    completeOnboarding: () => localStorage.setItem(Settings.KEYS.ONBOARDING_DONE, 'true'),
    getLastSync: () => localStorage.getItem(Settings.KEYS.LAST_SYNC),
    setLastSync: (ts = new Date().toISOString()) => localStorage.setItem(Settings.KEYS.LAST_SYNC, ts),
    getActivePet: () => localStorage.getItem(Settings.KEYS.ACTIVE_PET),
    setActivePet: (id) => id ? localStorage.setItem(Settings.KEYS.ACTIVE_PET, id) : localStorage.removeItem(Settings.KEYS.ACTIVE_PET),

    // UI State persistence
    getUIState: () => {
        try {
            const raw = localStorage.getItem(Settings.KEYS.UI_STATE);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    },
    setUIState: (updates) => {
        const current = Settings.getUIState();
        const merged = { ...current, ...updates };
        localStorage.setItem(Settings.KEYS.UI_STATE, JSON.stringify(merged));
        return merged;
    },
    clearUIState: () => {
        localStorage.removeItem(Settings.KEYS.UI_STATE);
    },

    // Clear only pettracker_ prefixed keys
    clear: () => {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(LS_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }
};

/**
 * Full app reset - clears all pettracker data
 */
async function resetApp() {
    console.log('[Reset] Clearing all Pet Tracker data...');
    Settings.clear();
    await DB.deleteDatabase();
    console.log('[Reset] Complete. Reloading...');
    window.location.reload();
}

/**
 * Generate UUID v4 using crypto.randomUUID() for better randomness
 */
function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Export
window.PetTracker = window.PetTracker || {};
Object.assign(window.PetTracker, {
    DB, STORES, SyncQueue, AIQueue, MediaStore, Settings, generateId, resetApp,
    DB_NAME, LS_PREFIX
});
