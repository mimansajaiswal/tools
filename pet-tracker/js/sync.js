/**
 * Pet Tracker - Sync Engine
 * Handles bidirectional sync with Notion
 * Push local changes, pull remote updates, resolve conflicts
 */

const Sync = {
    isRunning: false,
    lastError: null,
    intervalId: null,
    pendingCount: 0,

    // Rate limiting: ~3 requests/second
    rateLimitMs: 350,
    lastRequestTime: 0,

    // Background sync interval (2 minutes)
    syncIntervalMs: 2 * 60 * 1000,

    requiredDataSourceKeys: ['pets', 'events', 'eventTypes', 'scales', 'scaleLevels', 'contacts'],

    // Store name mapping (camelCase store names to UPPER_CASE STORES constants)
    storeNameMap: {
        'pets': 'PETS',
        'events': 'EVENTS',
        'eventTypes': 'EVENT_TYPES',
        'contacts': 'CONTACTS',
        'scales': 'SCALES',
        'scaleLevels': 'SCALE_LEVELS'
    },

    // Helper to get store constant from camelCase name
    getStoreConstant: (store) => {
        const key = Sync.storeNameMap[store];
        return key ? PetTracker.STORES[key] : null;
    },

    /**
     * Initialize background sync
     */
    init: () => {
        // Start periodic sync
        Sync.startPeriodicSync();

        // Sync on visibility change (resume when app becomes visible)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && navigator.onLine) {
                console.log('[Sync] App visible, triggering sync');
                Sync.run();
            }
        });

        // Sync when coming back online
        window.addEventListener('online', () => {
            console.log('[Sync] Back online, triggering sync');
            Sync.run();
        });

        // Initial sync if online
        if (navigator.onLine && PetTracker.Settings.isConnected()) {
            setTimeout(() => Sync.run(), 1000);
        }

        // Update pending count on init
        Sync.updatePendingCount();
    },

    /**
     * Start periodic background sync
     */
    startPeriodicSync: () => {
        if (Sync.intervalId) {
            clearInterval(Sync.intervalId);
        }

        Sync.intervalId = setInterval(() => {
            if (navigator.onLine && document.visibilityState === 'visible' && PetTracker.Settings.isConnected()) {
                console.log('[Sync] Periodic sync triggered');
                Sync.run();
            }
        }, Sync.syncIntervalMs);

        console.log('[Sync] Periodic sync started (every 2 min)');
    },

    /**
     * Stop periodic sync
     */
    stopPeriodicSync: () => {
        if (Sync.intervalId) {
            clearInterval(Sync.intervalId);
            Sync.intervalId = null;
            console.log('[Sync] Periodic sync stopped');
        }
    },

    /**
     * Update pending count and UI
     */
    updatePendingCount: async () => {
        const pending = await PetTracker.SyncQueue.getPending();
        const failed = await PetTracker.DB.query(PetTracker.STORES.SYNC_QUEUE, i => i.status === 'failed');

        Sync.pendingCount = pending.length;
        Sync.failedCount = failed.length;
        Sync.updateSyncUI();
    },

    /**
     * Update sync status UI
     */
    updateSyncUI: () => {
        const indicator = document.getElementById('syncStatusIndicator');
        const badge = document.getElementById('syncPendingBadge');
        const lastSyncEl = document.getElementById('lastSyncTime');
        const syncBtn = document.getElementById('manualSyncBtn');

        if (badge) {
            if (Sync.pendingCount > 0) {
                badge.textContent = Sync.pendingCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        if (indicator) {
            if (Sync.isRunning) {
                indicator.innerHTML = '<i data-lucide="refresh-cw" class="w-4 h-4 animate-spin"></i>';
                indicator.title = 'Syncing...';
                indicator.onclick = null;
            } else if (!navigator.onLine) {
                indicator.innerHTML = '<i data-lucide="cloud-off" class="w-4 h-4"></i>';
                indicator.title = 'Offline';
                indicator.onclick = null;
            } else if (Sync.failedCount > 0) {
                // FIX #12: Make failed indicator clickable to show sync queue
                indicator.innerHTML = '<i data-lucide="alert-triangle" class="w-4 h-4 text-muted-pink cursor-pointer"></i>';
                indicator.title = `${Sync.failedCount} failed syncs - click to manage`;
                indicator.onclick = () => App.showSyncQueue?.();
            } else if (Sync.pendingCount > 0) {
                indicator.innerHTML = '<i data-lucide="cloud" class="w-4 h-4 text-muted-pink"></i>';
                indicator.title = `${Sync.pendingCount} pending changes`;
                indicator.onclick = null;
            } else {
                indicator.innerHTML = '<i data-lucide="cloud" class="w-4 h-4 text-dull-purple"></i>';
                indicator.title = 'Synced';
                indicator.onclick = null;
            }
            if (window.lucide) lucide.createIcons();
        }

        if (lastSyncEl) {
            const lastSync = PetTracker.Settings.getLastSync();
            if (lastSync) {
                lastSyncEl.textContent = `Last sync: ${PetTracker.UI.formatRelative(lastSync)}`;
            } else {
                lastSyncEl.textContent = 'Never synced';
            }
        }

        if (syncBtn) {
            syncBtn.disabled = Sync.isRunning || !navigator.onLine;
        }
    },

    /**
     * Wait for rate limit
     */
    waitForRateLimit: async () => {
        const now = Date.now();
        const elapsed = now - Sync.lastRequestTime;
        if (elapsed < Sync.rateLimitMs) {
            await new Promise(r => setTimeout(r, Sync.rateLimitMs - elapsed));
        }
        Sync.lastRequestTime = Date.now();
    },

    /**
     * Run full sync cycle
     */
    run: async (showToast = false) => {
        if (Sync.isRunning) {
            console.log('[Sync] Already running, skipping');
            return;
        }

        if (!navigator.onLine) {
            console.log('[Sync] Offline, skipping');
            return;
        }

        const settings = PetTracker.Settings.get();
        const hasDataSources = Sync.requiredDataSourceKeys.every(
            key => !!settings.dataSources?.[key]
        );
        const hasToken = settings.notionToken || settings.notionOAuthData?.access_token;
        if (!settings.workerUrl || !hasToken || !hasDataSources) {
            console.log('[Sync] Not configured, skipping');
            return;
        }

        Sync.isRunning = true;
        Sync.lastError = null;
        Sync.updateSyncUI();

        try {
            console.log('[Sync] Starting sync cycle...');

            // 1. Push local changes
            const { successCount, failCount, lastError } = await Sync.pushLocalChanges();

            // 2. Pull remote updates
            await Sync.pullRemoteUpdates();

            // 3. Update last sync time
            PetTracker.Settings.setLastSync();

            console.log('[Sync] Sync complete');

            // Trigger Google Calendar and Todoist sync after main sync
            await Sync.syncIntegrations();

            // Only show toast for manual sync
            if (showToast) {
                if (failCount > 0) {
                    PetTracker.UI.toast(`Sync finished with ${failCount} errors. See console.`, 'error');
                    console.warn('[Sync] Last error:', lastError);
                } else {
                    PetTracker.UI.toast('Synced', 'success', 2000);
                }
            }
        } catch (e) {
            console.error('[Sync] Error:', e);
            Sync.lastError = e;
            if (showToast) {
                PetTracker.UI.toast(`Sync failed: ${e.message}`, 'error');
            }
        } finally {
            Sync.isRunning = false;
            await Sync.updatePendingCount();
        }
    },

    /**
     * Manual sync (triggered by user)
     */
    manualSync: async () => {
        await Sync.run(true);
    },

    // Store processing order - entities must be synced in dependency order
    // Parents must sync before children that reference them via relations
    storeOrder: [
        'pets',        // Base entity - no dependencies
        'scales',      // Base entity - no dependencies  
        'eventTypes',  // May reference scales (defaultScaleId)
        'scaleLevels', // References scales
        'contacts',    // References pets
        'events'       // References pets, eventTypes, scaleLevels, contacts
    ],

    /**
     * Sort pending operations by dependency order
     */
    sortByDependencyOrder: (pending) => {
        const orderMap = {};
        Sync.storeOrder.forEach((store, idx) => {
            orderMap[store] = idx;
        });

        return [...pending].sort((a, b) => {
            const orderA = orderMap[a.store] ?? 999;
            const orderB = orderMap[b.store] ?? 999;
            if (orderA !== orderB) return orderA - orderB;
            // Within same store, process creates before updates before deletes
            const typeOrder = { create: 0, update: 1, delete: 2 };
            const typeA = typeOrder[a.type] ?? 1;
            const typeB = typeOrder[b.type] ?? 1;
            if (typeA !== typeB) return typeA - typeB;
            // Finally by creation time
            return new Date(a.createdAt) - new Date(b.createdAt);
        });
    },

    /**
     * Merge event media arrays, preserving upload metadata from local record when queue data is stale.
     */
    mergeEventMediaMetadata: (queueMedia = [], recordMedia = []) => {
        const toKey = (m, i, prefix) => {
            const localKey = m?.localId || m?.id;
            if (localKey) return `local:${localKey}`;
            if (m?.fileUploadId) return `upload:${m.fileUploadId}`;
            if (typeof m?.url === 'string' && /^https?:\/\//i.test(m.url)) return `url:${m.url}`;
            return `${prefix}:${i}:${m?.name || 'unknown'}:${m?.type || 'file'}`;
        };

        const mergedByKey = new Map();

        for (const [i, m] of (recordMedia || []).entries()) {
            const key = toKey(m, i, 'record');
            mergedByKey.set(key, { ...(m || {}) });
        }

        for (const [i, m] of (queueMedia || []).entries()) {
            const key = toKey(m, i, 'queue');
            const existing = mergedByKey.get(key) || {};
            mergedByKey.set(key, {
                ...existing,
                ...(m || {}),
                url: m?.url || existing.url || '',
                fileUploadId: m?.fileUploadId || existing.fileUploadId || null
            });
        }

        return Array.from(mergedByKey.values());
    },

    isRemoteMediaUrl: (url) => typeof url === 'string' && /^https?:\/\//i.test(url),

    getMediaLocalId: (media) => media?.localId || media?.id || null,

    hasUploadedMediaReference: (media) => {
        return !!(media?.fileUploadId || Sync.isRemoteMediaUrl(media?.url));
    },

    cleanupUploadedLocalBlobsForRecord: async (store, record) => {
        if (!record || !PetTracker.MediaStore?.delete) return;

        const cleanup = async (items) => {
            for (const item of (items || [])) {
                const mediaId = Sync.getMediaLocalId(item);
                if (!mediaId || !Sync.hasUploadedMediaReference(item)) continue;
                try {
                    await PetTracker.MediaStore.delete(`${mediaId}_upload`);
                } catch (e) {
                    console.warn(`[Sync] Failed to clean local upload blob for ${mediaId}:`, e.message);
                }
            }
        };

        if (store === 'events') {
            await cleanup(record.media);
        } else if (store === 'pets') {
            await cleanup(record.photo);
        }
    },

    /**
     * Update local record with Notion ID after successful create
     * The resolveRelationIds function will look up notionIds from DB,
     * so we don't need to modify queue items directly
     * This function is kept for potential future queue manipulation needs
     */
    propagateNotionId: async (store, localId, notionId) => {
        // The local record is already updated in processOperation after create.
        // Queue dependent updates where relations are optional and may have been omitted earlier.
        if (store === 'contacts') {
            const pets = await PetTracker.DB.query(
                PetTracker.STORES.PETS,
                p => p.primaryVetId === localId || p.relatedContactIds?.includes(localId)
            );
            for (const pet of pets) {
                const updated = {
                    ...pet,
                    synced: false,
                    updatedAt: new Date().toISOString()
                };
                await PetTracker.DB.put(PetTracker.STORES.PETS, updated);
                await PetTracker.SyncQueue.add({
                    type: 'update',
                    store: 'pets',
                    recordId: pet.id,
                    data: updated
                });
            }
        }

        console.log(`[Sync] Propagated notionId for ${store}:${localId} -> ${notionId}`);
    },

    /**
     * Push local changes to Notion
     */
    pushLocalChanges: async () => {
        const pending = await PetTracker.SyncQueue.getPending();

        // Sort by dependency order
        const sorted = Sync.sortByDependencyOrder(pending);

        let successCount = 0;
        let failCount = 0;
        let lastError = null;

        for (const op of sorted) {
            try {
                await Sync.waitForRateLimit();
                const result = await Sync.processOperation(op);
                await PetTracker.SyncQueue.complete(op.id);
                successCount++;

                // If this was a create, propagate the new notionId to dependent queue items
                if (op.type === 'create' && result?.notionId) {
                    await Sync.propagateNotionId(op.store, op.recordId, result.notionId);
                }
            } catch (e) {
                console.error(`[Sync] Operation failed:`, e.message);
                lastError = e;
                failCount++;

                if (e.isRateLimit) {
                    // Wait and retry later
                    await new Promise(r => setTimeout(r, (e.retryAfter || 1) * 1000));
                }

                if (e.isRetryable) {
                    // Dependency retries should not be hard-capped.
                    if (e.isDependency) {
                        op.status = 'pending';
                        op.error = null;
                        op.lastAttempt = new Date().toISOString();
                        await PetTracker.DB.put(PetTracker.STORES.SYNC_QUEUE, op);
                    } else if ((op.retryCount || 0) < 3) {
                        // Retryable error - keep in queue for next sync cycle
                        op.retryCount = (op.retryCount || 0) + 1;
                        op.lastAttempt = new Date().toISOString();
                        await PetTracker.DB.put(PetTracker.STORES.SYNC_QUEUE, op);
                    } else {
                        await PetTracker.SyncQueue.fail(op.id, e.message);
                    }
                } else {
                    await PetTracker.SyncQueue.fail(op.id, e.message);
                }
            }
        }

        return { successCount, failCount, lastError };
    },

    /**
     * Process a single sync operation
     */
    processOperation: async (op) => {
        const { type, store, recordId, data } = op;
        const settings = PetTracker.Settings.get();
        const dataSourceId = Sync.getDataSourceId(store, settings);

        if (!dataSourceId) {
            throw new Error(`No data source configured for ${store}`);
        }

        switch (type) {
            case 'create': {
                const storeConstant = Sync.getStoreConstant(store);
                if (!storeConstant) throw new Error(`Unknown store: ${store}`);

                const record = await PetTracker.DB.get(storeConstant, recordId);
                if (!record) {
                    console.log(`[Sync] Skipping create for deleted local record: ${store}:${recordId}`);
                    return { skipped: true };
                }
                if (record.notionId) {
                    console.log(`[Sync] Skipping create for already-synced local record: ${store}:${recordId}`);
                    return { notionId: record.notionId, skipped: true };
                }
                const payload = store === 'events'
                    ? {
                        ...data,
                        media: Sync.mergeEventMediaMetadata(data?.media, record?.media)
                    }
                    : data;

                const properties = await Sync.toNotionProperties(store, payload);
                const result = await PetTracker.API.createPage(dataSourceId, properties);

                // Update local record with Notion ID
                if (record) {
                    record.notionId = result.id;
                    record.synced = true;
                    if (Array.isArray(payload?.media)) record.media = payload.media;
                    if (Array.isArray(payload?.photo)) record.photo = payload.photo;
                    await PetTracker.DB.put(storeConstant, record);
                    await Sync.cleanupUploadedLocalBlobsForRecord(store, record);
                }
                // Return notionId so caller can propagate to dependent queue items
                return { notionId: result.id };
            }

            case 'update': {
                const storeConstant = Sync.getStoreConstant(store);
                if (!storeConstant) throw new Error(`Unknown store: ${store}`);

                const record = await PetTracker.DB.get(storeConstant, recordId);
                if (!record?.notionId) {
                    // FIX #3: Check if there's a pending create for this record
                    const pending = await PetTracker.SyncQueue.getPending();
                    const hasPendingCreate = pending.some(p =>
                        p.type === 'create' && p.store === store && p.recordId === recordId
                    );
                    if (hasPendingCreate) {
                        // Mark as retryable - the create will complete first due to sorting
                        const error = new Error(`Waiting for create to complete: ${store}:${recordId}`);
                        error.isRetryable = true;
                        error.isDependency = true;
                        throw error;
                    }
                    throw new Error('No Notion ID for update');
                }
                const payload = store === 'events'
                    ? {
                        ...data,
                        media: Sync.mergeEventMediaMetadata(data?.media, record?.media)
                    }
                    : data;
                const properties = await Sync.toNotionProperties(store, payload);
                await PetTracker.API.updatePage(record.notionId, properties);

                record.synced = true;
                if (Array.isArray(payload?.media)) record.media = payload.media;
                if (Array.isArray(payload?.photo)) record.photo = payload.photo;
                await PetTracker.DB.put(storeConstant, record);
                await Sync.cleanupUploadedLocalBlobsForRecord(store, record);
                break;
            }

            case 'delete': {
                const storeConstant = Sync.getStoreConstant(store);
                if (!storeConstant) throw new Error(`Unknown store: ${store}`);

                const record = await PetTracker.DB.get(storeConstant, recordId);
                // Use notionId from record if available, otherwise use from queued operation data
                const notionId = record?.notionId || data?.notionId;
                if (notionId) {
                    await PetTracker.API.archivePage(notionId);
                }

                // Propagate event deletion to Google Calendar when linked.
                if (store === 'events' && data?.googleCalendarEventId && typeof GoogleCalendar !== 'undefined') {
                    try {
                        await GoogleCalendar.deleteEvent(data.googleCalendarEventId);
                    } catch (e) {
                        console.warn('[Sync] Google Calendar delete failed:', e);
                    }
                }
                // Only delete if record still exists locally
                if (record) {
                    await PetTracker.DB.delete(storeConstant, recordId);
                }
                break;
            }
        }
    },

    /**
     * Pull remote updates from Notion
     * FIX #1: Pull in dependency order to prevent relation normalization issues
     */
    pullRemoteUpdates: async () => {
        const settings = PetTracker.Settings.get();

        // Pull in dependency order: base entities first, then dependents
        // pets -> scales -> scaleLevels -> eventTypes -> contacts -> events
        const sources = [
            { store: 'pets', storeKey: 'PETS' },
            { store: 'scales', storeKey: 'SCALES' },
            { store: 'scaleLevels', storeKey: 'SCALE_LEVELS' },
            { store: 'eventTypes', storeKey: 'EVENT_TYPES' },
            { store: 'contacts', storeKey: 'CONTACTS' },
            { store: 'events', storeKey: 'EVENTS' }
        ];

        for (const { store, storeKey } of sources) {
            const dataSourceId = settings.dataSources?.[store];
            if (!dataSourceId) continue;

            try {
                await Sync.waitForRateLimit();
                await Sync.pullDataSource(store, storeKey, dataSourceId);
            } catch (e) {
                console.error(`[Sync] Error pulling ${store}:`, e);
            }
        }

        // FIX #1: Second pass - repair any relations that couldn't be resolved on first pull
        await Sync.repairBrokenRelations();
    },

    /**
     * Pull a single data source
     * Uses per-store incremental cursors with overlap to avoid missed edits
     */
    pullDataSource: async (store, storeKey, dataSourceId) => {
        let cursor = null;
        let hasMore = true;

        const settings = PetTracker.Settings.get();
        const storeCursor = settings.syncCursors?.[store] || null;
        const syncStartedAt = new Date().toISOString();
        let newestEditedSeen = null;

        // Use overlap window to avoid edge misses around cursor boundaries
        let filter = null;
        if (storeCursor) {
            const parsed = new Date(storeCursor).getTime();
            if (!Number.isNaN(parsed)) {
                const overlapMs = 5 * 60 * 1000;
                const from = new Date(Math.max(0, parsed - overlapMs)).toISOString();
                filter = {
                    timestamp: 'last_edited_time',
                    last_edited_time: { on_or_after: from }
                };
            }
        }

        while (hasMore) {
            await Sync.waitForRateLimit();

            const result = await PetTracker.API.queryDatabase(
                dataSourceId,
                filter,
                [{ timestamp: 'last_edited_time', direction: 'descending' }],
                cursor
            );

            for (const page of result.results) {
                if (!newestEditedSeen || new Date(page.last_edited_time) > new Date(newestEditedSeen)) {
                    newestEditedSeen = page.last_edited_time;
                }
                await Sync.reconcileRecord(store, storeKey, page);
            }

            hasMore = result.has_more;
            cursor = result.next_cursor;
        }

        // Advance only this store's cursor. Use max(sync-start, newest seen) to be conservative.
        const nextCursor = newestEditedSeen && new Date(newestEditedSeen) > new Date(syncStartedAt)
            ? newestEditedSeen
            : syncStartedAt;
        PetTracker.Settings.set({
            syncCursors: {
                [store]: nextCursor
            }
        });
    },

    /**
     * Reconcile a remote record with local
     */
    reconcileRecord: async (store, storeKey, page) => {
        const notionId = page.id;
        const storeName = PetTracker.STORES[storeKey];

        // Check if we have this record locally by notionId
        let local = await PetTracker.DB.getByNotionId(storeName, notionId);

        // Convert from Notion format
        const remote = Sync.fromNotionPage(store, page);
        remote.notionId = notionId;
        remote.synced = true;
        // Extract page icon if available
        const icon = PetTracker.NotionExtract.icon(page);
        if (icon) {
            remote.icon = icon;
        }

        if (page.archived) {
            // Remote was deleted
            if (local) {
                await PetTracker.DB.delete(storeName, local.id);
            }
            return;
        }

        // Normalize relation fields: convert Notion IDs to local IDs
        await Sync.normalizeRelationFields(store, remote);

        // Local-only dedupe heuristic for unsynced rows without requiring a Notion-side client ID.
        if (!local) {
            const allRecords = await PetTracker.DB.getAll(storeName);
            local = Sync.findHeuristicLocalMatch(store, allRecords, remote);
            if (local) {
                console.log(`[Sync] Matched ${store} by heuristic: ${local.id}`);
            }
        }

        if (!local) {
            // New remote record
            remote.id = PetTracker.generateId();
            await PetTracker.DB.put(storeName, remote);
        } else {
            // Existing record - last write wins
            const localTime = new Date(local.updatedAt || 0).getTime();
            const remoteTime = new Date(page.last_edited_time).getTime();

            if (remoteTime > localTime) {
                remote.id = local.id;
                // Preserve local-only fields that may not exist in remote schema.
                if (store === 'eventTypes' && !remote.todoistSection && local.todoistSection) {
                    remote.todoistSection = local.todoistSection;
                }
                if (store === 'events') {
                    if (!remote.googleCalendarEventId && local.googleCalendarEventId) {
                        remote.googleCalendarEventId = local.googleCalendarEventId;
                    }
                    if (remote.googleCalendarDirty === undefined && local.googleCalendarDirty !== undefined) {
                        remote.googleCalendarDirty = local.googleCalendarDirty;
                    }
                }
                await PetTracker.DB.put(storeName, remote);
            } else if (!local.notionId) {
                // Local is newer but has no notionId - just add the notionId
                local.notionId = notionId;
                local.synced = true;
                await PetTracker.DB.put(storeName, local);
            }
        }
    },

    /**
     * Find an unsynced local row that likely corresponds to a pulled remote row.
     * This avoids duplicate creation retries without storing local IDs in Notion.
     */
    findHeuristicLocalMatch: (store, allRecords, remote) => {
        const normalize = (v) => (v || '').toString().trim().toLowerCase();
        const sameDay = (a, b) => {
            if (!a || !b) return false;
            const da = new Date(a);
            const db = new Date(b);
            if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
            return da.getFullYear() === db.getFullYear() &&
                da.getMonth() === db.getMonth() &&
                da.getDate() === db.getDate();
        };
        const nearTimestamp = (a, b, toleranceMinutes = 10) => {
            if (!a || !b) return false;
            const ta = new Date(a).getTime();
            const tb = new Date(b).getTime();
            if (Number.isNaN(ta) || Number.isNaN(tb)) return false;
            return Math.abs(ta - tb) <= (toleranceMinutes * 60 * 1000);
        };
        const sameSet = (a = [], b = []) => {
            const aa = [...new Set((a || []).filter(Boolean))].sort();
            const bb = [...new Set((b || []).filter(Boolean))].sort();
            return JSON.stringify(aa) === JSON.stringify(bb);
        };

        const candidates = (allRecords || []).filter(r => !r.notionId);
        if (candidates.length === 0) return null;

        switch (store) {
            case 'pets':
                return candidates.find(r =>
                    normalize(r.name) === normalize(remote.name) &&
                    normalize(r.species) === normalize(remote.species) &&
                    ((r.birthDate && remote.birthDate) ? sameDay(r.birthDate, remote.birthDate) : true)
                ) || null;

            case 'events':
                return candidates.find(r =>
                    normalize(r.eventTypeId) === normalize(remote.eventTypeId) &&
                    sameSet(r.petIds || [], remote.petIds || []) &&
                    (nearTimestamp(r.startDate, remote.startDate) || sameDay(r.startDate, remote.startDate)) &&
                    (normalize(r.title) === normalize(remote.title))
                ) || null;

            case 'eventTypes':
                return candidates.find(r =>
                    normalize(r.name) === normalize(remote.name) &&
                    normalize(r.category) === normalize(remote.category)
                ) || null;

            case 'scales':
                return candidates.find(r => normalize(r.name) === normalize(remote.name)) || null;

            case 'scaleLevels':
                return candidates.find(r =>
                    normalize(r.name) === normalize(remote.name) &&
                    Number(r.order ?? -1) === Number(remote.order ?? -2)
                ) || null;

            case 'contacts':
                return candidates.find(r =>
                    normalize(r.name) === normalize(remote.name) &&
                    normalize(r.role) === normalize(remote.role)
                ) || null;

            default:
                return null;
        }
    },

    /**
     * Normalize relation fields in a record from Notion IDs to local IDs
     */
    normalizeRelationFields: async (store, record) => {
        const n2l = Sync.notionIdsToLocalIds;

        switch (store) {
            case 'pets':
                if (record.primaryVetId) {
                    const localIds = await n2l(PetTracker.STORES.CONTACTS, [record.primaryVetId]);
                    record.primaryVetId = localIds[0] || null;
                }
                if (record.relatedContactIds?.length) {
                    record.relatedContactIds = await n2l(PetTracker.STORES.CONTACTS, record.relatedContactIds);
                }
                break;

            case 'events':
                if (record.petIds?.length) {
                    record.petIds = await n2l(PetTracker.STORES.PETS, record.petIds);
                }
                if (record.eventTypeId) {
                    const localIds = await n2l(PetTracker.STORES.EVENT_TYPES, [record.eventTypeId]);
                    record.eventTypeId = localIds[0] || null;
                }
                if (record.severityLevelId) {
                    const localIds = await n2l(PetTracker.STORES.SCALE_LEVELS, [record.severityLevelId]);
                    record.severityLevelId = localIds[0] || null;
                }
                if (record.providerId) {
                    const localIds = await n2l(PetTracker.STORES.CONTACTS, [record.providerId]);
                    record.providerId = localIds[0] || null;
                }
                break;

            case 'eventTypes':
                if (record.defaultScaleId) {
                    const localIds = await n2l(PetTracker.STORES.SCALES, [record.defaultScaleId]);
                    record.defaultScaleId = localIds[0] || null;
                }
                if (record.relatedPetIds?.length) {
                    record.relatedPetIds = await n2l(PetTracker.STORES.PETS, record.relatedPetIds);
                }
                break;

            case 'scaleLevels':
                if (record.scaleId) {
                    const localIds = await n2l(PetTracker.STORES.SCALES, [record.scaleId]);
                    record.scaleId = localIds[0] || null;
                }
                break;

            case 'contacts':
                if (record.relatedPetIds?.length) {
                    record.relatedPetIds = await n2l(PetTracker.STORES.PETS, record.relatedPetIds);
                }
                break;
        }
    },

    /**
     * Get data source ID for a store
     */
    getDataSourceId: (store, settings) => {
        return settings.dataSources?.[store] || null;
    },

    /**
     * Convert Notion page IDs to local IDs for relations (used during pull)
     * Returns array of local IDs, filtering out any that can't be resolved
     */
    notionIdsToLocalIds: async (storeName, notionIds) => {
        if (!notionIds || !Array.isArray(notionIds) || notionIds.length === 0) return [];

        const localIds = [];
        const allRecords = await PetTracker.DB.getAll(storeName);
        const notionIdToLocalId = new Map();

        // Build a map of notionId -> localId for quick lookup
        for (const record of allRecords) {
            if (record.notionId) {
                notionIdToLocalId.set(record.notionId, record.id);
            }
        }

        for (const notionId of notionIds) {
            if (!notionId) continue;

            // First try direct lookup as notionId
            const localId = notionIdToLocalId.get(notionId);
            if (localId) {
                localIds.push(localId);
            } else {
                // Check if this is already a local ID (for records created locally)
                const record = allRecords.find(r => r.id === notionId);
                if (record) {
                    localIds.push(notionId);
                }
                // If neither, the relation points to an unknown record - skip it
                // This can happen if the related record hasn't been pulled yet
            }
        }

        return localIds;
    },

    /**
     * Resolve local IDs to Notion page IDs for relations
     * Returns array of notionIds (filters out any that don't have a notionId yet)
     * Options:
     * - throwOnMissing: throw if any relation ID cannot be resolved
     * - retryOnUnsyncedOnly: throw only when the local relation exists but lacks notionId
     */
    resolveRelationIds: async (storeName, localIds, throwOnMissing = false, retryOnUnsyncedOnly = false) => {
        if (!localIds || !Array.isArray(localIds) || localIds.length === 0) return [];

        const notionIds = [];
        const missingNotionIds = []; // Record exists but no notionId
        const missingRecords = [];   // Record doesn't exist at all

        for (const localId of localIds) {
            if (!localId) continue;
            const record = await PetTracker.DB.get(storeName, localId);
            if (record?.notionId) {
                notionIds.push(record.notionId);
            } else if (record) {
                // Record exists but hasn't synced yet
                missingNotionIds.push(localId);
            } else {
                // Record doesn't exist at all - could be a pending create
                missingRecords.push(localId);
            }
        }

        const markDependencyError = (message) => {
            const error = new Error(message);
            error.isRetryable = true;
            error.isDependency = true;
            return error;
        };

        if (throwOnMissing && (missingNotionIds.length > 0 || missingRecords.length > 0)) {
            const allMissing = [...missingNotionIds, ...missingRecords];
            throw markDependencyError(`Dependency not synced yet: ${storeName}:${allMissing.join(',')}`);
        }

        if (!throwOnMissing && retryOnUnsyncedOnly && missingNotionIds.length > 0) {
            throw markDependencyError(`Dependency missing Notion ID: ${storeName}:${missingNotionIds.join(',')}`);
        }

        return notionIds;
    },

    /**
     * Convert local record to Notion properties
     */
    toNotionProperties: async (store, data) => {
        const P = PetTracker.NotionProps;
        const resolve = Sync.resolveRelationIds;

        switch (store) {
            case 'pets': {
                const petProps = {
                    'Name': P.title(data.name),
                    'Species': P.select(data.species),
                    'Breed': P.richText(data.breed),
                    'Sex': P.select(data.sex),
                    'Birth Date': P.date(data.birthDate),
                    'Adoption Date': P.date(data.adoptionDate),
                    'Status': P.select(data.status || 'Active'),
                    'Microchip ID': P.richText(data.microchipId),
                    'Tags': P.multiSelect(data.tags),
                    'Notes': P.richText(data.notes),
                    'Target Weight Min': P.number(data.targetWeightMin),
                    'Target Weight Max': P.number(data.targetWeightMax),
                    'Weight Unit': P.select(data.weightUnit),
                    'Color': P.richText(data.color),
                    'Is Primary': P.checkbox(data.isPrimary)
                };

                // Handle pet photo uploads from local cache in the same way as event media.
                const uploadedPhotos = [];
                const normalizedPhotos = [];
                const photos = Array.isArray(data.photo) ? data.photo : [];
                for (const p of photos) {
                    const remoteUrl = Sync.isRemoteMediaUrl(p?.url) ? p.url : '';
                    if (p?.fileUploadId || remoteUrl) {
                        const normalized = {
                            ...p,
                            name: p.name || 'pet-photo',
                            url: remoteUrl || '',
                            fileUploadId: p.fileUploadId || null
                        };
                        uploadedPhotos.push(normalized);
                        normalizedPhotos.push(normalized);
                        continue;
                    }

                    const mediaId = p?.localId || p?.id;
                    if (!mediaId || typeof Media === 'undefined') {
                        throw new Error('Pet photo is missing local media metadata. Please reattach and sync again.');
                    }

                    const blob = await PetTracker.MediaStore.get(`${mediaId}_upload`);
                    if (!blob) {
                        throw new Error(`Pet photo data is no longer in local storage (${mediaId}). Reattach photo to sync.`);
                    }
                    const uploaded = await Media.uploadToNotion(blob, p.name || 'pet-photo.webp');
                    const normalized = {
                        ...p,
                        id: mediaId,
                        localId: mediaId,
                        name: p.name || 'pet-photo',
                        url: uploaded.url || '',
                        fileUploadId: uploaded.id || null
                    };
                    uploadedPhotos.push(normalized);
                    normalizedPhotos.push(normalized);
                }

                // Keep Photo property explicit so clear/remove operations sync as well.
                petProps['Photo'] = P.files(uploadedPhotos);
                data.photo = normalizedPhotos;

                if (data.primaryVetId) {
                    petProps['Primary Vet'] = P.relation(await resolve(PetTracker.STORES.CONTACTS, [data.primaryVetId]));
                }
                if (data.relatedContactIds?.length > 0) {
                    petProps['Related Contacts'] = P.relation(await resolve(PetTracker.STORES.CONTACTS, data.relatedContactIds));
                }
                return petProps;
            }

            case 'events': {
                // For events, Pet(s) and Event Type are required relations - throw on missing
                const eventProps = {
                    'Title': P.title(data.title || 'Event'),
                    'Pet(s)': P.relation(await resolve(PetTracker.STORES.PETS, data.petIds, data.petIds?.length > 0)),
                    'Event Type': P.relation(await resolve(PetTracker.STORES.EVENT_TYPES, data.eventTypeId ? [data.eventTypeId] : [], !!data.eventTypeId)),
                    'Start Date': P.date(data.startDate, data.endDate),
                    'Status': P.select(data.status),
                    'Severity Level': P.relation(await resolve(
                        PetTracker.STORES.SCALE_LEVELS,
                        data.severityLevelId ? [data.severityLevelId] : [],
                        false,
                        true
                    )),
                    'Value': P.number(data.value),
                    'Unit': P.select(data.unit),
                    'Duration': P.number(data.duration),
                    'Notes': P.richText(data.notes),
                    'Tags': P.multiSelect(data.tags),
                    'Source': P.select(data.source),
                    'Provider': P.relation(await resolve(
                        PetTracker.STORES.CONTACTS,
                        data.providerId ? [data.providerId] : [],
                        false,
                        true
                    )),
                    'Cost': P.number(data.cost),
                    'Cost Category': P.select(data.costCategory),
                    'Cost Currency': P.select(data.costCurrency),
                    'Todoist Task ID': P.richText(data.todoistTaskId),
                    'Client Updated At': P.date(data.updatedAt)
                };

                // Include Media property and upload local blobs when needed.
                if (Array.isArray(data.media)) {
                    const uploadedMedia = [];
                    const normalizedMedia = [];
                    for (const m of data.media) {
                        const remoteUrl = Sync.isRemoteMediaUrl(m?.url) ? m.url : '';
                        if (remoteUrl || m.fileUploadId) {
                            const normalized = {
                                ...m,
                                url: remoteUrl || '',
                                fileUploadId: m.fileUploadId || null
                            };
                            uploadedMedia.push(normalized);
                            normalizedMedia.push(normalized);
                        } else {
                            // Local media - try to upload. Uses localId or id field
                            const mediaId = m.localId || m.id;
                            if (!mediaId || typeof Media === 'undefined') {
                                throw new Error('Attachment is missing local media metadata. Please reattach and sync again.');
                            }
                            const blob = await PetTracker.MediaStore.get(`${mediaId}_upload`);
                            if (!blob) {
                                throw new Error(`Attachment data is no longer in local storage (${mediaId}). Reattach file to sync.`);
                            }
                            const uploaded = await Media.uploadToNotion(blob, m.name || 'media.webp');
                            const normalized = {
                                ...m,
                                id: mediaId,
                                localId: mediaId,
                                name: m.name || 'media',
                                url: uploaded.url || '',
                                fileUploadId: uploaded.id || null
                            };
                            uploadedMedia.push(normalized);
                            normalizedMedia.push(normalized);
                        }
                    }
                    eventProps['Media'] = P.files(uploadedMedia);
                    // Persist normalized metadata to avoid re-uploading unchanged local media
                    data.media = normalizedMedia;
                }

                return eventProps;
            }

            case 'eventTypes': {
                return {
                    'Name': P.title(data.name),
                    'Category': P.select(data.category),
                    'Tracking Mode': P.select(data.trackingMode),
                    'Uses Severity': P.checkbox(data.usesSeverity),
                    'Default Scale': P.relation(await resolve(
                        PetTracker.STORES.SCALES,
                        data.defaultScaleId ? [data.defaultScaleId] : [],
                        !!(data.usesSeverity && data.defaultScaleId)
                    )),
                    'Default Color': P.select(data.defaultColor),
                    'Default Icon': P.richText(data.defaultIcon),
                    'Default Tags': P.multiSelect(data.defaultTags),
                    'Allow Attachments': P.checkbox(data.allowAttachments),
                    'Default Value Kind': P.select(data.defaultValueKind),
                    'Default Unit': P.select(data.defaultUnit),
                    'Correlation Group': P.select(data.correlationGroup),
                    'Is Recurring': P.checkbox(data.isRecurring),
                    'Schedule Type': P.select(data.scheduleType),
                    'Interval Value': P.number(data.intervalValue),
                    'Interval Unit': P.select(data.intervalUnit),
                    'Anchor Date': P.date(data.anchorDate),
                    'Due Time': P.richText(data.dueTime),
                    'Time of Day Preference': P.select(data.timeOfDayPreference),
                    'Window Before': P.number(data.windowBefore),
                    'Window After': P.number(data.windowAfter),
                    'End Date': P.date(data.endDate),
                    'End After Occurrences': P.number(data.endAfterOccurrences),
                    'Next Due': P.date(data.nextDue),
                    'Todoist Sync': P.checkbox(data.todoistSync),
                    'Todoist Project': P.richText(data.todoistProject),
                    'Todoist Section': P.richText(data.todoistSection),
                    'Todoist Labels': P.richText(data.todoistLabels),
                    'Todoist Lead Time': P.number(data.todoistLeadTime),
                    'Default Dose': P.richText(data.defaultDose),
                    'Default Route': P.select(data.defaultRoute),
                    'Active': P.checkbox(data.active),
                    'Active Start': P.date(data.activeStart),
                    'Active End': P.date(data.activeEnd),
                    'Related Pets': P.relation(await resolve(
                        PetTracker.STORES.PETS,
                        data.relatedPetIds || [],
                        false,
                        true
                    ))
                };
            }

            case 'scales':
                return {
                    'Name': P.title(data.name),
                    'Value Type': P.select(data.valueType),
                    'Unit': P.richText(data.unit),
                    'Notes': P.richText(data.notes)
                };

            case 'scaleLevels':
                return {
                    'Name': P.title(data.name),
                    'Scale': P.relation(await resolve(PetTracker.STORES.SCALES, data.scaleId ? [data.scaleId] : [], !!data.scaleId)),
                    'Order': P.number(data.order),
                    'Color': P.select(data.color),
                    'Numeric Value': P.number(data.numericValue),
                    'Description': P.richText(data.description)
                };

            case 'contacts':
                return {
                    'Name': P.title(data.name),
                    'Role': P.select(data.role),
                    'Phone': P.richText(data.phone),
                    'Email': P.richText(data.email),
                    'Address': P.richText(data.address),
                    'Notes': P.richText(data.notes),
                    'Related Pets': P.relation(await resolve(
                        PetTracker.STORES.PETS,
                        data.relatedPetIds || [],
                        false,
                        true
                    ))
                };

            default:
                console.warn(`[Sync] No property mapping for store: ${store}`);
                return {};
        }
    },

    /**
     * Convert Notion page to local record
     */
    fromNotionPage: (store, page) => {
        const E = PetTracker.NotionExtract;
        const props = page.properties;

        switch (store) {
            case 'pets':
                return {
                    name: E.title(props['Name']),
                    species: E.select(props['Species']),
                    breed: E.richText(props['Breed']),
                    sex: E.select(props['Sex']),
                    birthDate: E.date(props['Birth Date']),
                    adoptionDate: E.date(props['Adoption Date']),
                    status: E.select(props['Status']) || 'Active',
                    microchipId: E.richText(props['Microchip ID']),
                    tags: E.multiSelect(props['Tags']),
                    notes: E.richText(props['Notes']),
                    targetWeightMin: E.number(props['Target Weight Min']),
                    targetWeightMax: E.number(props['Target Weight Max']),
                    weightUnit: E.select(props['Weight Unit']),
                    color: E.richText(props['Color']),
                    isPrimary: E.checkbox(props['Is Primary']),
                    photo: E.files(props['Photo']),
                    primaryVetId: E.relation(props['Primary Vet'])?.[0] || null,
                    relatedContactIds: E.relation(props['Related Contacts']),
                    updatedAt: page.last_edited_time
                };

            case 'events':
                return {
                    title: E.title(props['Title']),
                    petIds: E.relation(props['Pet(s)']),
                    eventTypeId: E.relation(props['Event Type'])?.[0] || null,
                    startDate: E.date(props['Start Date']),
                    endDate: E.dateEnd(props['Start Date']),
                    status: E.select(props['Status']),
                    severityLevelId: E.relation(props['Severity Level'])?.[0] || null,
                    value: E.number(props['Value']),
                    unit: E.select(props['Unit']),
                    duration: E.number(props['Duration']),
                    notes: E.richText(props['Notes']),
                    media: E.files(props['Media']),
                    tags: E.multiSelect(props['Tags']),
                    source: E.select(props['Source']),
                    providerId: E.relation(props['Provider'])?.[0] || null,
                    cost: E.number(props['Cost']),
                    costCategory: E.select(props['Cost Category']),
                    costCurrency: E.select(props['Cost Currency']),
                    todoistTaskId: E.richText(props['Todoist Task ID']),
                    googleCalendarEventId: E.richText(props['Google Calendar Event ID']) || null,
                    googleCalendarDirty: false,
                    updatedAt: page.last_edited_time
                };

            case 'eventTypes':
                return {
                    name: E.title(props['Name']),
                    category: E.select(props['Category']),
                    trackingMode: E.select(props['Tracking Mode']),
                    usesSeverity: E.checkbox(props['Uses Severity']),
                    defaultScaleId: E.relation(props['Default Scale'])?.[0] || null,
                    defaultColor: E.select(props['Default Color']),
                    defaultIcon: E.richText(props['Default Icon']),
                    defaultTags: E.multiSelect(props['Default Tags']),
                    allowAttachments: E.checkbox(props['Allow Attachments']),
                    defaultValueKind: E.select(props['Default Value Kind']),
                    defaultUnit: E.select(props['Default Unit']),
                    correlationGroup: E.select(props['Correlation Group']),
                    isRecurring: E.checkbox(props['Is Recurring']),
                    scheduleType: E.select(props['Schedule Type']),
                    intervalValue: E.number(props['Interval Value']),
                    intervalUnit: E.select(props['Interval Unit']),
                    anchorDate: E.date(props['Anchor Date']),
                    dueTime: E.richText(props['Due Time']),
                    timeOfDayPreference: E.select(props['Time of Day Preference']),
                    windowBefore: E.number(props['Window Before']),
                    windowAfter: E.number(props['Window After']),
                    endDate: E.date(props['End Date']),
                    endAfterOccurrences: E.number(props['End After Occurrences']),
                    nextDue: E.date(props['Next Due']),
                    todoistSync: E.checkbox(props['Todoist Sync']),
                    todoistProject: E.richText(props['Todoist Project']),
                    todoistSection: E.richText(props['Todoist Section']),
                    todoistLabels: E.richText(props['Todoist Labels']),
                    todoistLeadTime: E.number(props['Todoist Lead Time']),
                    defaultDose: E.richText(props['Default Dose']),
                    defaultRoute: E.select(props['Default Route']),
                    active: E.checkbox(props['Active']),
                    activeStart: E.date(props['Active Start']),
                    activeEnd: E.date(props['Active End']),
                    relatedPetIds: E.relation(props['Related Pets']),
                    updatedAt: page.last_edited_time
                };

            case 'contacts':
                return {
                    name: E.title(props['Name']),
                    role: E.select(props['Role']),
                    phone: E.richText(props['Phone']),
                    email: E.richText(props['Email']),
                    address: E.richText(props['Address']),
                    notes: E.richText(props['Notes']),
                    relatedPetIds: E.relation(props['Related Pets']),
                    updatedAt: page.last_edited_time
                };

            case 'scales':
                return {
                    name: E.title(props['Name']),
                    valueType: E.select(props['Value Type']),
                    unit: E.richText(props['Unit']),
                    notes: E.richText(props['Notes']),
                    updatedAt: page.last_edited_time
                };

            case 'scaleLevels':
                return {
                    name: E.title(props['Name']),
                    scaleId: E.relation(props['Scale'])?.[0] || null,
                    order: E.number(props['Order']),
                    color: E.select(props['Color']),
                    numericValue: E.number(props['Numeric Value']),
                    description: E.richText(props['Description']),
                    updatedAt: page.last_edited_time
                };

            default:
                console.warn(`[Sync] No extraction mapping for store: ${store}`);
                return { updatedAt: page.last_edited_time };
        }
    },

    /**
     * Repair relation fields that may not have resolved on pull.
     */
    repairBrokenRelations: async () => {
        const settings = PetTracker.Settings.get();
        const relationFieldsByStore = {
            pets: ['primaryVetId', 'relatedContactIds'],
            events: ['petIds', 'eventTypeId', 'severityLevelId', 'providerId'],
            eventTypes: ['defaultScaleId', 'relatedPetIds'],
            scaleLevels: ['scaleId'],
            contacts: ['relatedPetIds']
        };
        const sources = [
            { store: 'pets', storeName: PetTracker.STORES.PETS },
            { store: 'events', storeName: PetTracker.STORES.EVENTS },
            { store: 'eventTypes', storeName: PetTracker.STORES.EVENT_TYPES },
            { store: 'scaleLevels', storeName: PetTracker.STORES.SCALE_LEVELS },
            { store: 'contacts', storeName: PetTracker.STORES.CONTACTS }
        ];

        const normArray = (v) => Array.isArray(v) ? v.filter(Boolean) : [];
        const asNullable = (v) => (v === undefined || v === '') ? null : v;
        let repaired = 0;

        for (const { store, storeName } of sources) {
            if (!settings.dataSources?.[store]) continue;
            const relationFields = relationFieldsByStore[store] || [];
            if (relationFields.length === 0) continue;

            const records = await PetTracker.DB.getAll(storeName);
            for (const record of records) {
                if (!record?.notionId) continue;

                const looksBroken = relationFields.some(field => {
                    const value = record[field];
                    return Array.isArray(value)
                        ? value.length === 0 || value.some(v => !v)
                        : value === null || value === undefined || value === '';
                });
                if (!looksBroken) continue;

                try {
                    const page = await PetTracker.API.getPage(record.notionId);
                    if (!page || page.archived) continue;

                    const refreshed = Sync.fromNotionPage(store, page);
                    await Sync.normalizeRelationFields(store, refreshed);

                    let changed = false;
                    for (const field of relationFields) {
                        const currentValue = record[field];
                        const refreshedValue = refreshed[field];

                        if (Array.isArray(refreshedValue) || Array.isArray(currentValue)) {
                            const curr = normArray(currentValue);
                            const next = normArray(refreshedValue);
                            if (JSON.stringify(curr) !== JSON.stringify(next)) {
                                record[field] = next;
                                changed = true;
                            }
                        } else {
                            const curr = asNullable(currentValue);
                            const next = asNullable(refreshedValue);
                            if (curr !== next) {
                                record[field] = next;
                                changed = true;
                            }
                        }
                    }

                    if (changed) {
                        await PetTracker.DB.put(storeName, record);
                        repaired++;
                    }
                } catch (e) {
                    console.warn(`[Sync] Could not repair ${store} ${record.id}:`, e.message);
                }
            }
        }

        if (repaired > 0) {
            console.log(`[Sync] Repaired ${repaired} broken relation(s)`);
        }
    },

    /**
     * Sync integrations (Google Calendar, Todoist)
     * Called automatically after main sync completes
     */
    syncIntegrations: async () => {
        const settings = PetTracker.Settings.get();

        // Sync to Google Calendar if enabled
        if (settings.gcalEnabled && settings.gcalAccessToken && settings.gcalCalendarId) {
            try {
                // Get recently created/updated events that need to be synced to GCal
                const events = await PetTracker.DB.getAll(PetTracker.STORES.EVENTS);
                const recentEvents = events.filter(e =>
                    e.synced && (
                        e.googleCalendarDirty === true ||
                        (!e.googleCalendarEventId && new Date(e.updatedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000))
                    )
                );

                for (const event of recentEvents.slice(0, 25)) {
                    if (typeof GoogleCalendar !== 'undefined') {
                        await GoogleCalendar.syncEvent(event);
                    }
                }
                console.log(`[Sync] Synced ${recentEvents.length} events to Google Calendar`);
            } catch (e) {
                console.warn('[Sync] Google Calendar sync error:', e);
            }
        }

        // Sync Todoist if enabled
        if (settings.todoistEnabled && typeof Todoist !== 'undefined' && Todoist.isConfigured()) {
            try {
                await Todoist.sync();
            } catch (e) {
                console.warn('[Sync] Todoist sync error:', e);
            }
        }
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.Sync = Sync;
