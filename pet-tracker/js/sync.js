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
            } else if (!navigator.onLine) {
                indicator.innerHTML = '<i data-lucide="cloud-off" class="w-4 h-4"></i>';
                indicator.title = 'Offline';
            } else if (Sync.failedCount > 0) {
                indicator.innerHTML = '<i data-lucide="alert-triangle" class="w-4 h-4 text-muted-pink"></i>';
                indicator.title = `${Sync.failedCount} failed syncs`;
            } else if (Sync.pendingCount > 0) {
                indicator.innerHTML = '<i data-lucide="cloud" class="w-4 h-4 text-muted-pink"></i>';
                indicator.title = `${Sync.pendingCount} pending changes`;
            } else {
                indicator.innerHTML = '<i data-lucide="cloud" class="w-4 h-4 text-dull-purple"></i>';
                indicator.title = 'Synced';
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
        const hasDataSources = settings.dataSources && Object.values(settings.dataSources).some(v => v);
        if (!settings.workerUrl || !settings.notionToken || !hasDataSources) {
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
     * Update pending queue items to replace local IDs with Notion IDs
     * Called after a successful create to propagate the new notionId
     */
    propagateNotionId: async (store, localId, notionId) => {
        const pending = await PetTracker.SyncQueue.getPending();

        // Map store to the relation field names that reference it
        const relationFields = {
            pets: ['petIds', 'relatedPetIds'],
            scales: ['scaleId', 'defaultScaleId'],
            eventTypes: ['eventTypeId', 'linkedEventTypeId'],
            scaleLevels: ['severityLevelId'],
            contacts: ['providerId', 'primaryVetId', 'relatedContactIds']
        };

        const fieldsToCheck = relationFields[store] || [];
        if (fieldsToCheck.length === 0) return;

        for (const op of pending) {
            if (!op.data) continue;
            let modified = false;

            for (const field of fieldsToCheck) {
                if (Array.isArray(op.data[field])) {
                    const idx = op.data[field].indexOf(localId);
                    if (idx !== -1) {
                        // Don't replace in queue - the resolveRelationIds will look up from DB
                        // But we need to ensure the local record has the notionId
                        modified = true;
                    }
                } else if (op.data[field] === localId) {
                    modified = true;
                }
            }


        }
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

                if (e.isRetryable && (op.retryCount || 0) < 3) {
                    // Retryable error - keep in queue for next sync cycle
                    op.retryCount = (op.retryCount || 0) + 1;
                    await PetTracker.DB.put(PetTracker.STORES.SYNC_QUEUE, op);
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

                const properties = await Sync.toNotionProperties(store, data);
                const result = await PetTracker.API.createPage(dataSourceId, properties);

                // Update local record with Notion ID
                const record = await PetTracker.DB.get(storeConstant, recordId);
                if (record) {
                    record.notionId = result.id;
                    record.synced = true;
                    await PetTracker.DB.put(storeConstant, record);
                }
                // Return notionId so caller can propagate to dependent queue items
                return { notionId: result.id };
            }

            case 'update': {
                const storeConstant = Sync.getStoreConstant(store);
                if (!storeConstant) throw new Error(`Unknown store: ${store}`);

                const record = await PetTracker.DB.get(storeConstant, recordId);
                if (!record?.notionId) {
                    throw new Error('No Notion ID for update');
                }
                const properties = await Sync.toNotionProperties(store, data);
                await PetTracker.API.updatePage(record.notionId, properties);

                record.synced = true;
                await PetTracker.DB.put(storeConstant, record);
                break;
            }

            case 'delete': {
                const storeConstant = Sync.getStoreConstant(store);
                if (!storeConstant) throw new Error(`Unknown store: ${store}`);

                const record = await PetTracker.DB.get(storeConstant, recordId);
                if (record?.notionId) {
                    await PetTracker.API.archivePage(record.notionId);
                }
                await PetTracker.DB.delete(storeConstant, recordId);
                break;
            }
        }
    },

    /**
     * Pull remote updates from Notion
     */
    pullRemoteUpdates: async () => {
        const settings = PetTracker.Settings.get();

        // Pull each data source
        const sources = [
            { store: 'pets', storeKey: 'PETS' },
            { store: 'events', storeKey: 'EVENTS' },
            { store: 'eventTypes', storeKey: 'EVENT_TYPES' },
            { store: 'scales', storeKey: 'SCALES' },
            { store: 'scaleLevels', storeKey: 'SCALE_LEVELS' },
            { store: 'contacts', storeKey: 'CONTACTS' }
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
    },

    /**
     * Pull a single data source
     */
    pullDataSource: async (store, storeKey, dataSourceId) => {
        let cursor = null;
        let hasMore = true;

        while (hasMore) {
            await Sync.waitForRateLimit();

            const result = await PetTracker.API.queryDatabase(
                dataSourceId,
                null,
                [{ timestamp: 'last_edited_time', direction: 'descending' }],
                cursor
            );

            for (const page of result.results) {
                await Sync.reconcileRecord(store, storeKey, page);
            }

            hasMore = result.has_more;
            cursor = result.next_cursor;
        }
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

        // If no local match by notionId, try to find by name (prevent duplicates)
        // This handles the case where a record was created locally but not synced yet
        if (!local && remote.name) {
            const allRecords = await PetTracker.DB.getAll(storeName);
            const matchByName = allRecords.find(r =>
                r.name === remote.name && !r.notionId
            );
            if (matchByName) {
                // Found a local record with same name that hasn't synced yet
                // Link it to the Notion record instead of creating a duplicate
                local = matchByName;
                console.log(`[Sync] Matched ${store} by name: "${remote.name}"`);
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
     * Get data source ID for a store
     */
    getDataSourceId: (store, settings) => {
        return settings.dataSources?.[store] || null;
    },

    /**
     * Resolve local IDs to Notion page IDs for relations
     * Returns array of notionIds (filters out any that don't have a notionId yet)
     * Throws an error if any required relation can't be resolved (so it can be retried)
     */
    resolveRelationIds: async (storeName, localIds, throwOnMissing = false) => {
        if (!localIds || !Array.isArray(localIds) || localIds.length === 0) return [];

        const notionIds = [];
        const missingIds = [];

        for (const localId of localIds) {
            if (!localId) continue;
            const record = await PetTracker.DB.get(storeName, localId);
            if (record?.notionId) {
                notionIds.push(record.notionId);
            } else if (record) {
                missingIds.push(localId);
            }
        }

        // If we have unresolved relations that exist locally but haven't synced,
        // this is a dependency ordering issue that can be retried
        if (throwOnMissing && missingIds.length > 0) {
            const error = new Error(`Dependency not synced yet: ${storeName}:${missingIds.join(',')}`);
            error.isRetryable = true;
            throw error;
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
            case 'pets':
                return {
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

            case 'events':
                return {
                    'Title': P.title(data.title || 'Event'),
                    'Pet(s)': P.relation(await resolve(PetTracker.STORES.PETS, data.petIds)),
                    'Event Type': P.relation(await resolve(PetTracker.STORES.EVENT_TYPES, data.eventTypeId ? [data.eventTypeId] : [])),
                    'Start Date': P.date(data.startDate, data.endDate),
                    'Status': P.select(data.status),
                    'Severity Level': P.relation(await resolve(PetTracker.STORES.SCALE_LEVELS, data.severityLevelId ? [data.severityLevelId] : [])),
                    'Value': P.number(data.value),
                    'Unit': P.select(data.unit),
                    'Duration': P.number(data.duration),
                    'Notes': P.richText(data.notes),
                    'Tags': P.multiSelect(data.tags),
                    'Source': P.select(data.source),
                    'Provider': P.relation(await resolve(PetTracker.STORES.CONTACTS, data.providerId ? [data.providerId] : [])),
                    'Cost': P.number(data.cost),
                    'Cost Category': P.select(data.costCategory),
                    'Cost Currency': P.select(data.costCurrency),
                    'Todoist Task ID': P.richText(data.todoistTaskId),
                    'Client Updated At': P.date(data.updatedAt)
                };

            case 'eventTypes':
                return {
                    'Name': P.title(data.name),
                    'Category': P.select(data.category),
                    'Tracking Mode': P.select(data.trackingMode),
                    'Uses Severity': P.checkbox(data.usesSeverity),
                    'Default Scale': P.relation(await resolve(PetTracker.STORES.SCALES, data.defaultScaleId ? [data.defaultScaleId] : [])),
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
                    'Todoist Labels': P.richText(data.todoistLabels),
                    'Todoist Lead Time': P.number(data.todoistLeadTime),
                    'Default Dose': P.richText(data.defaultDose),
                    'Default Route': P.select(data.defaultRoute),
                    'Active': P.checkbox(data.active),
                    'Active Start': P.date(data.activeStart),
                    'Active End': P.date(data.activeEnd),
                    'Related Pets': P.relation(await resolve(PetTracker.STORES.PETS, data.relatedPetIds || []))
                };

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
                    'Scale': P.relation(await resolve(PetTracker.STORES.SCALES, data.scaleId ? [data.scaleId] : [])),
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
                    'Related Pets': P.relation(await resolve(PetTracker.STORES.PETS, data.relatedPetIds || []))
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
                    e.synced && !e.googleCalendarEventId &&
                    new Date(e.updatedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                );

                for (const event of recentEvents.slice(0, 10)) {
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
        if (settings.todoistEnabled && settings.todoistToken) {
            try {
                if (typeof Todoist !== 'undefined') {
                    await Todoist.sync();
                }
            } catch (e) {
                console.warn('[Sync] Todoist sync error:', e);
            }
        }
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.Sync = Sync;
