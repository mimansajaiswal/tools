/**
 * GhostInk Flashcards - Storage Module
 * IndexedDB and localStorage management for decks, cards, settings, and sessions.
 */

const resolveStorageScope = () => {
    try {
        const rawPath = location?.pathname || '';
        const trimmed = rawPath.replace(/\/index\.html$/i, '').replace(/\/$/, '');
        const parts = trimmed.split('/').filter(Boolean);
        const last = parts[parts.length - 1] || 'ghostink-flashcards';
        const normalized = last.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
        return normalized || 'ghostink-flashcards';
    } catch (_) {
        return 'ghostink-flashcards';
    }
};

const STORAGE_SCOPE = resolveStorageScope();
const SETTINGS_KEY = `${STORAGE_SCOPE}_settings_v1`;
const DB_NAME = `GhostInkDB_${STORAGE_SCOPE}`;
const SETTINGS_VERSION = 1;
const DEFAULT_SETTINGS = Object.freeze({
    settingsVersion: SETTINGS_VERSION,
    workerUrl: '',
    proxyToken: '',
    authToken: '',
    deckSource: '',
    cardSource: '',
    aiProvider: '',
    aiModel: '',
    aiKey: '',
    dyUseJudgeAi: false,
    dyProvider: '',
    dyModel: '',
    dyKey: '',
    dyVerified: false,
    sttProvider: '',
    sttModel: '',
    sttKey: '',
    sttPrompt: '',
    sttVerified: false,
    sttPermissionWarmed: false,
    themeMode: 'system',
    fontMode: 'mono',
    fabEnabled: true,
    fabPos: null,
    workerVerified: false,
    authVerified: false,
    sourcesVerified: false,
    aiVerified: false,
    sourcesCache: { deckOptions: [], cardOptions: [] },
    sourcesSaved: false
});

const normalizeSettings = (raw = {}) => {
    const candidate = (raw && typeof raw === 'object') ? raw : {};
    const merged = {
        ...DEFAULT_SETTINGS,
        ...candidate,
        settingsVersion: SETTINGS_VERSION
    };
    const cache = candidate.sourcesCache && typeof candidate.sourcesCache === 'object' ? candidate.sourcesCache : {};
    merged.sourcesCache = {
        deckOptions: Array.isArray(cache.deckOptions) ? cache.deckOptions : [],
        cardOptions: Array.isArray(cache.cardOptions) ? cache.cardOptions : []
    };
    merged.dyUseJudgeAi = merged.dyUseJudgeAi === true;
    merged.fabEnabled = merged.fabEnabled !== false;
    merged.workerVerified = merged.workerVerified === true;
    merged.authVerified = merged.authVerified === true;
    merged.sourcesVerified = merged.sourcesVerified === true;
    merged.aiVerified = merged.aiVerified === true;
    merged.dyVerified = merged.dyVerified === true;
    merged.sttVerified = merged.sttVerified === true;
    merged.sttPermissionWarmed = merged.sttPermissionWarmed === true;
    if (candidate.sourcesSaved === undefined) {
        merged.sourcesSaved = !!(merged.deckSource && merged.cardSource && merged.sourcesVerified);
    } else {
        merged.sourcesSaved = merged.sourcesSaved === true;
    }
    if (merged.fabPos && typeof merged.fabPos !== 'object') merged.fabPos = null;
    return merged;
};

export const Storage = {
    db: null,
    dbName: DB_NAME,
    scope: STORAGE_SCOPE,
    settingsKey: SETTINGS_KEY,
    sqlReady: null,
    _initPromise: null,
    _isInitialized: false,

    async init() {
        if (this._initPromise) return this._initPromise;
        if (this._isInitialized && this.db) return Promise.resolve();

        this._initPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(this.dbName, 5);

            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                const tx = e.target.transaction;

                if (!db.objectStoreNames.contains('decks')) {
                    db.createObjectStore('decks', { keyPath: 'id' });
                }

                let cardStore;
                if (!db.objectStoreNames.contains('cards')) {
                    cardStore = db.createObjectStore('cards', { keyPath: 'id' });
                } else {
                    cardStore = tx.objectStore('cards');
                }

                if (!cardStore.indexNames.contains('deckId')) {
                    cardStore.createIndex('deckId', 'deckId', { unique: false });
                }
                if (!cardStore.indexNames.contains('dueDate_fsrs')) {
                    cardStore.createIndex('dueDate_fsrs', 'fsrs.dueDate', { unique: false });
                }
                if (!cardStore.indexNames.contains('dueDate_sm2')) {
                    cardStore.createIndex('dueDate_sm2', 'sm2.dueDate', { unique: false });
                }
                if (!cardStore.indexNames.contains('parentCard')) {
                    cardStore.createIndex('parentCard', 'parentCard', { unique: false });
                }
                if (!cardStore.indexNames.contains('notionId')) {
                    cardStore.createIndex('notionId', 'notionId', { unique: false });
                }

                if (!db.objectStoreNames.contains('meta')) {
                    db.createObjectStore('meta', { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains('session')) {
                    db.createObjectStore('session', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('syncQueue')) {
                    db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                }
            };

            req.onsuccess = (e) => {
                this.db = e.target.result;
                this._isInitialized = true;
                this.db.onversionchange = () => {
                    this.db.close();
                    this.db = null;
                    this._isInitialized = false;
                    this._initPromise = null;
                    location.reload();
                };
                resolve();
            };
            req.onerror = () => {
                this._initPromise = null;
                reject(new Error(`Failed to open database: ${req.error?.message || 'Unknown error'}`));
            };
        });

        return this._initPromise;
    },

    isReady() {
        return this._isInitialized && this.db !== null;
    },

    async ensureReady() {
        if (this.isReady()) return;
        await this.init();
    },

    tx(store, mode = 'readonly') {
        if (!this.db) throw new Error('Database not initialized');
        return this.db.transaction(store, mode).objectStore(store);
    },

    async withTransaction(storeNames, mode, callback) {
        if (!this.db) throw new Error('Database not initialized');
        const stores = Array.isArray(storeNames) ? storeNames : [storeNames];

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(stores, mode);
            const storeMap = {};
            stores.forEach(name => {
                storeMap[name] = tx.objectStore(name);
            });

            try {
                callback(storeMap, tx);
            } catch (e) {
                try { tx.abort(); } catch (_) { }
                reject(e);
                return;
            }

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(new Error(`Transaction failed: ${tx.error?.message || 'Unknown error'}`));
            tx.onabort = () => reject(new Error('Transaction aborted'));
        });
    },

    _validateCard(card) {
        if (!card || typeof card !== 'object') return { valid: false, error: 'Card must be an object' };
        if (typeof card.id !== 'string' || !card.id) return { valid: false, error: 'Card must have a valid id' };
        if (typeof card.deckId !== 'string' || !card.deckId) return { valid: false, error: 'Card must have a valid deckId' };
        if (typeof card.name !== 'string') return { valid: false, error: 'Card must have a name' };
        if (!Array.isArray(card.reviewHistory)) return { valid: false, error: 'Card reviewHistory must be an array' };
        return { valid: true };
    },

    _validateDeck(deck) {
        if (!deck || typeof deck !== 'object') return { valid: false, error: 'Deck must be an object' };
        if (typeof deck.id !== 'string' || !deck.id) return { valid: false, error: 'Deck must have a valid id' };
        if (typeof deck.name !== 'string' || !deck.name) return { valid: false, error: 'Deck must have a name' };
        return { valid: true };
    },

    async getAll(store) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(store, 'readonly');
            const req = tx.objectStore(store).getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(new Error(`Failed to read from ${store}: ${req.error?.message || 'Unknown error'}`));
            tx.onerror = () => reject(new Error(`Transaction failed for ${store}: ${tx.error?.message || 'Unknown error'}`));
            tx.onabort = () => reject(new Error(`Transaction aborted for ${store}`));
        });
    },

    async getCardsByDeck(deckId) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('cards', 'readonly');
            const store = tx.objectStore('cards');
            const index = store.index('deckId');
            const req = index.getAll(deckId);
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(new Error(`Failed to get cards by deck: ${req.error?.message || 'Unknown error'}`));
        });
    },

    async getSubItems(parentId) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('cards', 'readonly');
            const index = tx.objectStore('cards').index('parentCard');
            const req = index.getAll(parentId);
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(new Error('Failed to get sub-items'));
        });
    },

    async deleteCardsByDeck(deckId) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('cards', 'readwrite');
            const store = tx.objectStore('cards');
            const index = store.index('deckId');
            const req = index.getAllKeys(deckId);

            req.onsuccess = () => {
                const keys = req.result || [];
                if (keys.length === 0) {
                    resolve([]);
                    return;
                }
                let completed = 0;
                let errors = 0;
                const failedKeys = [];
                keys.forEach(key => {
                    const delReq = store.delete(key);
                    delReq.onsuccess = () => {
                        completed++;
                        if (completed + errors === keys.length) resolve(keys);
                    };
                    delReq.onerror = () => {
                        errors++;
                        failedKeys.push(key);
                        if (completed + errors === keys.length) {
                            reject(new Error(`Failed to delete ${failedKeys.length} card(s) for deck ${deckId}`));
                        }
                    };
                });
            };
            req.onerror = () => reject(new Error('Failed to delete cards by deck'));
            tx.onerror = () => reject(new Error('Transaction failed'));
        });
    },

    async getMeta(key) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('meta', 'readonly');
            const req = tx.objectStore('meta').get(key);
            req.onsuccess = () => resolve(req.result ? req.result.value : null);
            req.onerror = () => reject(new Error(`Failed to get meta ${key}: ${req.error?.message || 'Unknown error'}`));
            tx.onerror = () => reject(new Error(`Transaction failed for meta: ${tx.error?.message || 'Unknown error'}`));
            tx.onabort = () => reject(new Error(`Transaction aborted for meta`));
        });
    },

    async setMeta(key, value) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('meta', 'readwrite');
            const req = tx.objectStore('meta').put({ key, value });
            req.onsuccess = resolve;
            req.onerror = () => reject(new Error(`Failed to set meta ${key}: ${req.error?.message || 'Unknown error'}`));
            tx.onerror = () => reject(new Error(`Transaction failed for meta: ${tx.error?.message || 'Unknown error'}`));
            tx.onabort = () => reject(new Error(`Transaction aborted for meta`));
        });
    },

    async put(store, value) {
        await this.ensureReady();
        if (store === 'cards') {
            const validation = this._validateCard(value);
            if (!validation.valid) {
                console.error('Invalid card data:', validation.error, value);
                throw new Error(`Invalid card data: ${validation.error}`);
            }
        } else if (store === 'decks') {
            const validation = this._validateDeck(value);
            if (!validation.valid) {
                console.error('Invalid deck data:', validation.error, value);
                throw new Error(`Invalid deck data: ${validation.error}`);
            }
        }

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).put(value);
            req.onsuccess = resolve;
            req.onerror = () => reject(new Error(`Failed to put in ${store}: ${req.error?.message || 'Unknown error'}`));
            tx.onerror = () => reject(new Error(`Transaction failed for ${store}: ${tx.error?.message || 'Unknown error'}`));
            tx.onabort = () => reject(new Error(`Transaction aborted for ${store}`));
        });
    },

    async putMany(store, values) {
        await this.ensureReady();
        if (!values || values.length === 0) return;

        if (store === 'cards') {
            for (const value of values) {
                const validation = this._validateCard(value);
                if (!validation.valid) {
                    console.error('Invalid card data in batch:', validation.error, value);
                    throw new Error(`Invalid card data in batch: ${validation.error}`);
                }
            }
        } else if (store === 'decks') {
            for (const value of values) {
                const validation = this._validateDeck(value);
                if (!validation.valid) {
                    console.error('Invalid deck data in batch:', validation.error, value);
                    throw new Error(`Invalid deck data in batch: ${validation.error}`);
                }
            }
        }

        const BATCH_SIZE = 100;

        for (let i = 0; i < values.length; i += BATCH_SIZE) {
            const batch = values.slice(i, i + BATCH_SIZE);

            await new Promise((resolve, reject) => {
                const tx = this.db.transaction(store, 'readwrite');
                const objectStore = tx.objectStore(store);

                const promises = batch.map(value => {
                    return new Promise((res, rej) => {
                        const req = objectStore.put(value);
                        req.onsuccess = () => res();
                        req.onerror = () => rej(new Error(`Failed to put item in ${store}: ${req.error?.message}`));
                    });
                });

                Promise.all(promises)
                    .catch(err => {
                        console.error('Batch put error:', err);
                    });

                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(new Error(`Transaction failed for ${store}: ${tx.error?.message || 'Unknown error'}`));
                tx.onabort = () => reject(new Error(`Transaction aborted for ${store}`));
            });

            if (i + BATCH_SIZE < values.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
    },

    async replaceIds(store, changes) {
        await this.ensureReady();
        if (!changes || changes.length === 0) return;
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(store, 'readwrite');
            const objectStore = tx.objectStore(store);
            for (const change of changes) {
                const oldId = change?.oldId;
                const value = change?.value;
                if (!value || typeof value !== 'object') continue;
                const newId = value.id;
                if (oldId && newId && oldId !== newId) {
                    objectStore.delete(oldId);
                }
                objectStore.put(value);
            }
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(new Error(`Transaction failed for ${store}: ${tx.error?.message || 'Unknown error'}`));
            tx.onabort = () => reject(new Error(`Transaction aborted for ${store}`));
        });
    },

    async delete(store, key) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(new Error(`Transaction failed for ${store}: ${tx.error?.message || 'Unknown error'}`));
            tx.onabort = () => reject(new Error(`Transaction aborted for ${store}`));
        });
    },

    async wipeStore(store) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(new Error(`Transaction failed for ${store}: ${tx.error?.message || 'Unknown error'}`));
            tx.onabort = () => reject(new Error(`Transaction aborted for ${store}`));
        });
    },

    async getSyncQueue() {
        await this.ensureReady();
        if (!this.db.objectStoreNames.contains('syncQueue')) {
            return [];
        }
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('syncQueue', 'readonly');
            const req = tx.objectStore('syncQueue').getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => {
                console.warn('Failed to get sync queue:', req.error);
                resolve([]);
            };
        });
    },

    async addToSyncQueue(item) {
        await this.ensureReady();
        if (!this.db.objectStoreNames.contains('syncQueue')) {
            console.warn('syncQueue store not available');
            return;
        }
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('syncQueue', 'readwrite');
            const req = tx.objectStore('syncQueue').add({
                ...item,
                queuedAt: Date.now()
            });
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(new Error(`Failed to add to sync queue: ${req.error?.message || 'Unknown error'}`));
        });
    },

    async removeFromSyncQueue(id) {
        await this.ensureReady();
        if (!this.db.objectStoreNames.contains('syncQueue')) return;
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('syncQueue', 'readwrite');
            const req = tx.objectStore('syncQueue').delete(id);
            req.onsuccess = resolve;
            req.onerror = () => reject(new Error(`Failed to remove from sync queue: ${req.error?.message || 'Unknown error'}`));
        });
    },

    async clearSyncQueue() {
        await this.ensureReady();
        if (!this.db.objectStoreNames.contains('syncQueue')) return;
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('syncQueue', 'readwrite');
            const req = tx.objectStore('syncQueue').clear();
            req.onsuccess = resolve;
            req.onerror = () => reject(new Error(`Failed to clear sync queue: ${req.error?.message || 'Unknown error'}`));
        });
    },

    getSettings() {
        const raw = localStorage.getItem(this.settingsKey);
        if (!raw) return normalizeSettings();
        try {
            return normalizeSettings(JSON.parse(raw));
        } catch (e) {
            console.error('Failed to parse settings, resetting to defaults:', e);
            return normalizeSettings();
        }
    },

    setSettings(newSettings) {
        localStorage.setItem(this.settingsKey, JSON.stringify(normalizeSettings(newSettings)));
    },

    _validateSession(session) {
        if (!session || typeof session !== 'object') return null;
        if (!Array.isArray(session.cardQueue)) return null;
        if (typeof session.currentIndex !== 'number' || !Number.isFinite(session.currentIndex)) return null;
        if (session.currentIndex < 0) return null;
        if (!Array.isArray(session.deckIds)) return null;
        if (!Array.isArray(session.completed)) session.completed = [];
        if (!Array.isArray(session.skipped)) session.skipped = [];
        if (session.cardQueue.some(item => {
            if (!item || typeof item !== 'object') return true;
            if (typeof item.cardId !== 'string' || !item.cardId) return true;
            return false;
        })) return null;
        if (session.startTime !== undefined && typeof session.startTime !== 'number') {
            session.startTime = Date.now();
        }
        if (session.ratingCounts !== undefined && typeof session.ratingCounts !== 'object') {
            session.ratingCounts = {};
        }
        return session;
    },

    async getSession() {
        await this.ensureReady();
        if (!this.db || !this.db.objectStoreNames.contains('session')) {
            return null;
        }

        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction('session', 'readonly');
                const req = tx.objectStore('session').get('current');
                req.onsuccess = () => {
                    const result = req.result;
                    if (!result || !result.data) {
                        resolve(null);
                        return;
                    }
                    resolve(this._validateSession(result.data));
                };
                req.onerror = () => {
                    console.warn('Failed to get session from IndexedDB');
                    resolve(null);
                };
            } catch (e) {
                console.warn('Error accessing session store:', e);
                resolve(null);
            }
        });
    },

    getSessionSync() {
        return this._cachedSession;
    },

    async setSession(session) {
        this._cachedSession = session;

        if (!session) {
            if (this.db && this.db.objectStoreNames.contains('session')) {
                try {
                    await new Promise((resolve, reject) => {
                        const tx = this.db.transaction('session', 'readwrite');
                        const req = tx.objectStore('session').delete('current');
                        req.onsuccess = resolve;
                        req.onerror = () => reject(req.error);
                    });
                } catch (e) {
                    console.warn('Failed to clear session from IndexedDB:', e);
                }
            }
            return;
        }

        if (this.db && this.db.objectStoreNames.contains('session')) {
            try {
                await new Promise((resolve, reject) => {
                    const tx = this.db.transaction('session', 'readwrite');
                    const req = tx.objectStore('session').put({ id: 'current', data: session });
                    req.onsuccess = resolve;
                    req.onerror = () => reject(req.error);
                });
                return;
            } catch (e) {
                console.warn('Failed to save session to IndexedDB:', e);
            }
        }
    },

    async ensureSQL() {
        if (this.sqlReady && !this._sqlError) return this.sqlReady;

        if (this._sqlError) {
            this.sqlReady = null;
            this._sqlError = false;
        }

        if (typeof window.initSqlJs === 'undefined') {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/sql.js@1.13.0/dist/sql-wasm.js';
                script.onload = resolve;
                script.onerror = () => reject(new Error('Failed to load sql.js'));
                document.head.appendChild(script);
            });
        }

        this.sqlReady = window.initSqlJs({
            locateFile: (file) => `https://unpkg.com/sql.js@1.13.0/dist/${file}`
        }).catch(err => {
            this._sqlError = true;
            throw err;
        });

        return this.sqlReady;
    }
};
