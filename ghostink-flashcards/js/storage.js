/**
 * GhostInk Flashcards - Storage Module
 * IndexedDB and localStorage management for decks, cards, settings, and sessions.
 */

export const Storage = {
    db: null,
    settingsKey: 'ghostink_settings_v1',
    sqlReady: null,
    _initPromise: null,
    _isInitialized: false,

    async init() {
        // Bug 1 fix: Prevent multiple init calls and ensure single initialization
        if (this._initPromise) return this._initPromise;
        if (this._isInitialized && this.db) return Promise.resolve();

        this._initPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open('GhostInkDB', 4); // Bumped version for indexes and sync queue store

            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                const oldVersion = e.oldVersion;

                // Create base stores if they don't exist
                if (!db.objectStoreNames.contains('decks')) {
                    db.createObjectStore('decks', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('cards')) {
                    const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
                    // Fix: Add indexes for common queries
                    cardStore.createIndex('deckId', 'deckId', { unique: false });
                    cardStore.createIndex('dueDate_fsrs', 'fsrs.dueDate', { unique: false });
                    cardStore.createIndex('dueDate_sm2', 'sm2.dueDate', { unique: false });
                } else if (oldVersion < 4) {
                    // Add indexes to existing cards store
                    const tx = e.target.transaction;
                    const cardStore = tx.objectStore('cards');
                    if (!cardStore.indexNames.contains('deckId')) {
                        cardStore.createIndex('deckId', 'deckId', { unique: false });
                    }
                    if (!cardStore.indexNames.contains('dueDate_fsrs')) {
                        cardStore.createIndex('dueDate_fsrs', 'fsrs.dueDate', { unique: false });
                    }
                    if (!cardStore.indexNames.contains('dueDate_sm2')) {
                        cardStore.createIndex('dueDate_sm2', 'sm2.dueDate', { unique: false });
                    }
                }
                if (!db.objectStoreNames.contains('meta')) {
                    db.createObjectStore('meta', { keyPath: 'key' });
                }
                // Add session store (v3+)
                if (!db.objectStoreNames.contains('session')) {
                    db.createObjectStore('session', { keyPath: 'id' });
                }
                // Bug 6 fix: Add sync queue store for persistence
                if (!db.objectStoreNames.contains('syncQueue')) {
                    db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                }
            };

            req.onsuccess = (e) => {
                this.db = e.target.result;
                this._isInitialized = true;
                // Listen for version change (another tab is resetting/upgrading)
                this.db.onversionchange = () => {
                    this.db.close();
                    this.db = null;
                    this._isInitialized = false;
                    this._initPromise = null;
                    location.reload();
                };
                // Migrate session from localStorage to IndexedDB if exists
                this.migrateSessionFromLocalStorage();
                resolve();
            };
            req.onerror = (e) => {
                this._initPromise = null;
                reject(new Error(`Failed to open database: ${req.error?.message || 'Unknown error'}`));
            };
        });

        return this._initPromise;
    },

    // Bug 1 fix: Check if storage is ready
    isReady() {
        return this._isInitialized && this.db !== null;
    },

    // Bug 1 fix: Wait for storage to be ready
    async ensureReady() {
        if (this.isReady()) return;
        await this.init();
    },

    tx(store, mode = 'readonly') {
        if (!this.db) throw new Error('Database not initialized');
        return this.db.transaction(store, mode).objectStore(store);
    },

    // Transaction support for critical operations (Fix)
    async withTransaction(storeNames, mode, callback) {
        if (!this.db) throw new Error('Database not initialized');
        const stores = Array.isArray(storeNames) ? storeNames : [storeNames];

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(stores, mode);
            const storeMap = {};
            stores.forEach(name => {
                storeMap[name] = tx.objectStore(name);
            });

            let result;
            try {
                result = callback(storeMap, tx);
            } catch (e) {
                reject(e);
                return;
            }

            tx.oncomplete = () => resolve(result);
            tx.onerror = () => reject(new Error(`Transaction failed: ${tx.error?.message || 'Unknown error'}`));
            tx.onabort = () => reject(new Error('Transaction aborted'));
        });
    },

    // Data validation helper (Fix)
    _validateCard(card) {
        if (!card || typeof card !== 'object') return { valid: false, error: 'Card must be an object' };
        if (typeof card.id !== 'string' || !card.id) return { valid: false, error: 'Card must have a valid id' };
        if (typeof card.deckId !== 'string' || !card.deckId) return { valid: false, error: 'Card must have a valid deckId' };
        if (typeof card.name !== 'string') return { valid: false, error: 'Card must have a name' };
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
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(new Error(`Failed to read from ${store}: ${req.error?.message || 'Unknown error'}`));
            tx.onerror = () => reject(new Error(`Transaction failed for ${store}: ${tx.error?.message || 'Unknown error'}`));
            tx.onabort = () => reject(new Error(`Transaction aborted for ${store}`));
        });
    },

    // Get cards by deck ID using index (Fix: common query optimization)
    async getCardsByDeck(deckId) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('cards', 'readonly');
            const store = tx.objectStore('cards');
            const index = store.index('deckId');
            const req = index.getAll(deckId);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(new Error(`Failed to get cards by deck: ${req.error?.message || 'Unknown error'}`));
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
        // Data validation for cards and decks
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

    // Bug 3 fix: Batch put with yielding to prevent jank
    async putMany(store, values) {
        await this.ensureReady();
        if (!values || values.length === 0) return;

        // Validate all items first if applicable
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

        const BATCH_SIZE = 100; // Process in batches to prevent blocking

        for (let i = 0; i < values.length; i += BATCH_SIZE) {
            const batch = values.slice(i, i + BATCH_SIZE);

            await new Promise((resolve, reject) => {
                const tx = this.db.transaction(store, 'readwrite');
                const objectStore = tx.objectStore(store);

                batch.forEach(value => {
                    const req = objectStore.put(value);
                    req.onerror = () => console.warn(`Failed to put item in ${store}:`, req.error);
                });

                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(new Error(`Transaction failed for ${store}: ${tx.error?.message || 'Unknown error'}`));
                tx.onabort = () => reject(new Error(`Transaction aborted for ${store}`));
            });

            // Yield to main thread between batches for large datasets
            if (i + BATCH_SIZE < values.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
    },

    // Replace primary IDs in a store by deleting old keys and writing new records.
    // Each change: { oldId, value } where value.id is the new key.
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
            req.onsuccess = resolve;
            req.onerror = () => reject(new Error(`Failed to delete from ${store}: ${req.error?.message || 'Unknown error'}`));
            tx.onerror = () => reject(new Error(`Transaction failed for ${store}: ${tx.error?.message || 'Unknown error'}`));
            tx.onabort = () => reject(new Error(`Transaction aborted for ${store}`));
        });
    },

    async wipeStore(store) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).clear();
            req.onsuccess = resolve;
            req.onerror = () => reject(new Error(`Failed to wipe ${store}: ${req.error?.message || 'Unknown error'}`));
            tx.onerror = () => reject(new Error(`Transaction failed for ${store}: ${tx.error?.message || 'Unknown error'}`));
            tx.onabort = () => reject(new Error(`Transaction aborted for ${store}`));
        });
    },

    // Bug 6 fix: Sync queue persistence methods
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
        if (!raw) {
            return {
                workerUrl: '',
                proxyToken: '',
                authToken: '',
                deckSource: '',
                cardSource: '',
                aiProvider: '',
                aiModel: '',
                aiKey: '',
                sttProvider: '',
                sttModel: '',
                sttKey: '',
                sttPrompt: '',
                sttVerified: false,
                sttPermissionWarmed: false,
                themeMode: 'system',
                fontMode: 'mono',
                fabEnabled: true,
                fabPosition: null,
                workerVerified: false,
                authVerified: false,
                sourcesVerified: false,
                aiVerified: false,
                sourcesCache: { deckOptions: [], cardOptions: [] }
            };
        }
        try {
            const parsed = JSON.parse(raw);
            // Default to mono font for legacy settings or missing values.
            if (!parsed.fontMode || parsed.fontMode === 'serif') {
                parsed.fontMode = 'mono';
                localStorage.setItem(this.settingsKey, JSON.stringify(parsed));
            }
            return parsed;
        } catch (e) {
            console.error('Failed to parse settings, resetting to defaults:', e);
            return {
                workerUrl: '',
                proxyToken: '',
                authToken: '',
                deckSource: '',
                cardSource: '',
                aiProvider: '',
                aiModel: '',
                aiKey: '',
                sttProvider: '',
                sttModel: '',
                sttKey: '',
                sttPrompt: '',
                sttVerified: false,
                sttPermissionWarmed: false,
                themeMode: 'system',
                fontMode: 'mono',
                fabEnabled: true,
                fabPosition: null,
                workerVerified: false,
                authVerified: false,
                sourcesVerified: false,
                aiVerified: false,
                sourcesCache: { deckOptions: [], cardOptions: [] }
            };
        }
    },

    setSettings(newSettings) {
        localStorage.setItem(this.settingsKey, JSON.stringify(newSettings));
    },

    // Migrate session from localStorage to IndexedDB (one-time migration)
    async migrateSessionFromLocalStorage() {
        const legacyKey = 'ghostink_session_v1';
        const raw = localStorage.getItem(legacyKey);
        if (!raw) return;

        try {
            const session = JSON.parse(raw);
            if (session && typeof session === 'object' && Array.isArray(session.cardQueue)) {
                await this.setSession(session);
                localStorage.removeItem(legacyKey);
                console.log('Migrated session from localStorage to IndexedDB');
            }
        } catch (e) {
            console.warn('Failed to migrate session from localStorage:', e);
            localStorage.removeItem(legacyKey);
        }
    },

    // Session validation helper - ensures session data integrity
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
            return this._getSessionFromLocalStorage();
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
                    console.warn('Failed to get session from IndexedDB, falling back to localStorage');
                    resolve(this._getSessionFromLocalStorage());
                };
            } catch (e) {
                console.warn('Error accessing session store:', e);
                resolve(this._getSessionFromLocalStorage());
            }
        });
    },

    getSessionSync() {
        if (this._cachedSession !== undefined) {
            return this._cachedSession;
        }
        return this._getSessionFromLocalStorage();
    },

    _getSessionFromLocalStorage() {
        const raw = localStorage.getItem('ghostink_session_v1');
        if (!raw) return null;
        try {
            const session = JSON.parse(raw);
            return this._validateSession(session);
        } catch (_) {
            localStorage.removeItem('ghostink_session_v1');
            return null;
        }
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
            localStorage.removeItem('ghostink_session_v1');
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
                localStorage.removeItem('ghostink_session_v1');
                return;
            } catch (e) {
                console.warn('Failed to save session to IndexedDB, falling back to localStorage:', e);
            }
        }

        try {
            const json = JSON.stringify(session);
            if (json.length > 1000000) {
                console.warn(`Session size is ${(json.length / 1024 / 1024).toFixed(2)}MB - consider reducing queue size`);
            }
            localStorage.setItem('ghostink_session_v1', json);
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.error('LocalStorage quota exceeded for session. Try clearing some browser data.');
                const minimalSession = {
                    deckIds: session.deckIds,
                    currentIndex: 0, // Reset index since we sliced the queue
                    cardQueue: session.cardQueue.slice(session.currentIndex, session.currentIndex + 50),
                    completed: session.completed || [],
                    skipped: session.skipped || [],
                    startTime: session.startTime,
                    ratingCounts: session.ratingCounts
                };
                try {
                    localStorage.setItem('ghostink_session_v1', JSON.stringify(minimalSession));
                    console.warn('Saved minimal session due to quota limits');
                } catch (e2) {
                    console.error('Could not save even minimal session:', e2);
                }
            } else {
                throw e;
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
