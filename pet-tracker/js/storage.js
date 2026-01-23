/**
 * Pet Tracker - Storage Layer
 * Handles IndexedDB for data/media and LocalStorage for settings
 * All keys prefixed with pettracker_ / PetTracker_ for isolation
 */

const DB_NAME = 'PetTracker_DB';
const DB_VERSION = 1;
const LS_PREFIX = 'pettracker_';

// IndexedDB Store Names
const STORES = {
    PETS: 'pets',
    EVENTS: 'events',
    EVENT_TYPES: 'eventTypes',
    SCALES: 'scales',
    SCALE_LEVELS: 'scaleLevels',
    CARE_ITEMS: 'careItems',
    CARE_PLANS: 'carePlans',
    CONTACTS: 'contacts',
    SYNC_QUEUE: 'syncQueue',
    MEDIA: 'media',
    MEDIA_META: 'mediaMeta'
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
                const dataStores = [
                    STORES.PETS, STORES.EVENTS, STORES.EVENT_TYPES,
                    STORES.SCALES, STORES.SCALE_LEVELS, STORES.CARE_ITEMS,
                    STORES.CARE_PLANS, STORES.CONTACTS
                ];

                dataStores.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, { keyPath: 'id' });
                        store.createIndex('notionId', 'notionId', { unique: false });
                        store.createIndex('updatedAt', 'updatedAt', { unique: false });
                    }
                });

                // Sync queue store
                if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                    const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
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
    add: async (operation) => {
        const queueItem = {
            ...operation,
            id: generateId(),
            status: 'pending',
            createdAt: new Date().toISOString(),
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
    KEYS: {
        SETTINGS: LS_PREFIX + 'settings',
        LAST_SYNC: LS_PREFIX + 'last_sync',
        ACTIVE_PET: LS_PREFIX + 'active_pet',
        ONBOARDING_DONE: LS_PREFIX + 'onboarding_done'
    },

    defaults: {
        workerUrl: '',
        proxyToken: '',
        authMode: 'token',
        notionToken: '',
        notionOAuthData: null,
        databaseId: '',
        dataSources: {
            pets: '', events: '', eventTypes: '', scales: '',
            scaleLevels: '', careItems: '', carePlans: '', contacts: ''
        },
        aiProvider: 'openai',
        aiModel: 'gpt-4o-mini',
        aiApiKey: '',
        aiEndpoint: '',
        todoistEnabled: false,
        todoistToken: '',
        uploadCapMb: 5,
        defaultPetId: null,
        calendarView: 'month',
        theme: 'light'
    },

    get: () => {
        try {
            const raw = localStorage.getItem(Settings.KEYS.SETTINGS);
            return raw ? { ...Settings.defaults, ...JSON.parse(raw) } : { ...Settings.defaults };
        } catch (e) {
            console.error('[Settings] Error reading:', e);
            return { ...Settings.defaults };
        }
    },

    set: (updates) => {
        const current = Settings.get();
        const merged = { ...current, ...updates };
        localStorage.setItem(Settings.KEYS.SETTINGS, JSON.stringify(merged));
        return merged;
    },

    isConnected: () => {
        const s = Settings.get();
        return !!(s.workerUrl && (s.notionToken || s.notionOAuthData) && s.databaseId);
    },

    isOnboardingDone: () => localStorage.getItem(Settings.KEYS.ONBOARDING_DONE) === 'true',
    completeOnboarding: () => localStorage.setItem(Settings.KEYS.ONBOARDING_DONE, 'true'),
    getLastSync: () => localStorage.getItem(Settings.KEYS.LAST_SYNC),
    setLastSync: (ts = new Date().toISOString()) => localStorage.setItem(Settings.KEYS.LAST_SYNC, ts),
    getActivePet: () => localStorage.getItem(Settings.KEYS.ACTIVE_PET),
    setActivePet: (id) => id ? localStorage.setItem(Settings.KEYS.ACTIVE_PET, id) : localStorage.removeItem(Settings.KEYS.ACTIVE_PET),

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
 * Generate UUID v4
 */
function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Export
window.PetTracker = window.PetTracker || {};
Object.assign(window.PetTracker, {
    DB, STORES, SyncQueue, MediaStore, Settings, generateId, resetApp,
    DB_NAME, LS_PREFIX
});
