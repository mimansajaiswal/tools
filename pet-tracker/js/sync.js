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
        'careItems': 'CARE_ITEMS',
        'carePlans': 'CARE_PLANS',
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
        if (!settings.workerUrl || !settings.notionToken || !settings.databaseId) {
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

    /**
     * Push local changes to Notion
     */
    pushLocalChanges: async () => {
        const pending = await PetTracker.SyncQueue.getPending();
        console.log(`[Sync] ${pending.length} pending operations`);

        let successCount = 0;
        let failCount = 0;
        let lastError = null;

        for (const op of pending) {
            try {
                await Sync.waitForRateLimit();
                await Sync.processOperation(op);
                await PetTracker.SyncQueue.complete(op.id);
                successCount++;
            } catch (e) {
                console.error(`[Sync] Operation ${op.id} failed:`, e);
                lastError = e;
                failCount++;

                if (e.isRateLimit) {
                    // Wait and retry later
                    await new Promise(r => setTimeout(r, (e.retryAfter || 1) * 1000));
                }

                await PetTracker.SyncQueue.fail(op.id, e.message);
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
                
                const properties = Sync.toNotionProperties(store, data);
                const result = await PetTracker.API.createPage(dataSourceId, properties);

                // Update local record with Notion ID
                const record = await PetTracker.DB.get(storeConstant, recordId);
                if (record) {
                    record.notionId = result.id;
                    record.synced = true;
                    await PetTracker.DB.put(storeConstant, record);
                }
                break;
            }

            case 'update': {
                const storeConstant = Sync.getStoreConstant(store);
                if (!storeConstant) throw new Error(`Unknown store: ${store}`);
                
                const record = await PetTracker.DB.get(storeConstant, recordId);
                if (!record?.notionId) {
                    throw new Error('No Notion ID for update');
                }
                const properties = Sync.toNotionProperties(store, data);
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
            { store: 'careItems', storeKey: 'CARE_ITEMS' },
            { store: 'carePlans', storeKey: 'CARE_PLANS' },
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
                [{ property: 'Last edited time', direction: 'descending' }],
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

        // Check if we have this record locally
        const local = await PetTracker.DB.getByNotionId(storeName, notionId);

        // Convert from Notion format
        const remote = Sync.fromNotionPage(store, page);
        remote.notionId = notionId;
        remote.synced = true;

        if (page.archived) {
            // Remote was deleted
            if (local) {
                await PetTracker.DB.delete(storeName, local.id);
            }
            return;
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
     * Convert local record to Notion properties
     */
    toNotionProperties: (store, data) => {
        const P = PetTracker.NotionProps;

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
                    'Pet(s)': P.relation(data.petIds),
                    'Event Type': P.relation(data.eventTypeId ? [data.eventTypeId] : []),
                    'Care Item': P.relation(data.careItemId ? [data.careItemId] : []),
                    'Start Date': P.date(data.startDate, data.endDate),
                    'Status': P.select(data.status),
                    'Severity Level': P.relation(data.severityLevelId ? [data.severityLevelId] : []),
                    'Value': P.number(data.value),
                    'Unit': P.select(data.unit),
                    'Duration': P.number(data.duration),
                    'Notes': P.richText(data.notes),
                    'Tags': P.multiSelect(data.tags),
                    'Source': P.select(data.source),
                    'Provider': P.relation(data.providerId ? [data.providerId] : []),
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
                    'Default Scale': P.relation(data.defaultScaleId ? [data.defaultScaleId] : []),
                    'Default Color': P.select(data.defaultColor),
                    'Default Icon': P.richText(data.defaultIcon),
                    'Default Tags': P.multiSelect(data.defaultTags),
                    'Allow Attachments': P.checkbox(data.allowAttachments),
                    'Default Value Kind': P.select(data.defaultValueKind),
                    'Default Unit': P.select(data.defaultUnit),
                    'Correlation Group': P.select(data.correlationGroup)
                };

            case 'carePlans':
                return {
                    'Name': P.title(data.name),
                    'Pet(s)': P.relation(data.petIds),
                    'Care Item': P.relation(data.careItemId ? [data.careItemId] : []),
                    'Event Type': P.relation(data.eventTypeId ? [data.eventTypeId] : []),
                    'Schedule Type': P.select(data.scheduleType),
                    'Interval Value': P.number(data.intervalValue),
                    'Interval Unit': P.select(data.intervalUnit),
                    'Anchor Date': P.date(data.anchorDate),
                    'Due Time': P.richText(data.dueTime),
                    'Time of Day Preference': P.select(data.timeOfDayPreference),
                    'Window Before': P.number(data.windowBefore),
                    'Window After': P.number(data.windowAfter),
                    'End Date': P.date(data.endDate),
                    'Timezone': P.richText(data.timezone),
                    'Next Due': P.date(data.nextDue),
                    'Upcoming Category': P.select(data.upcomingCategory),
                    'Todoist Sync': P.checkbox(data.todoistSync),
                    'Todoist Project': P.richText(data.todoistProject),
                    'Todoist Labels': P.richText(data.todoistLabels),
                    'Todoist Lead Time': P.number(data.todoistLeadTime),
                    'Notes': P.richText(data.notes)
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
                    careItemId: E.relation(props['Care Item'])?.[0] || null,
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
                    updatedAt: page.last_edited_time
                };

            case 'carePlans':
                return {
                    name: E.title(props['Name']),
                    petIds: E.relation(props['Pet(s)']),
                    careItemId: E.relation(props['Care Item'])?.[0] || null,
                    eventTypeId: E.relation(props['Event Type'])?.[0] || null,
                    scheduleType: E.select(props['Schedule Type']),
                    intervalValue: E.number(props['Interval Value']),
                    intervalUnit: E.select(props['Interval Unit']),
                    anchorDate: E.date(props['Anchor Date']),
                    dueTime: E.richText(props['Due Time']),
                    timeOfDayPreference: E.select(props['Time of Day Preference']),
                    windowBefore: E.number(props['Window Before']),
                    windowAfter: E.number(props['Window After']),
                    endDate: E.date(props['End Date']),
                    timezone: E.richText(props['Timezone']),
                    nextDue: E.date(props['Next Due']),
                    upcomingCategory: E.select(props['Upcoming Category']),
                    todoistSync: E.checkbox(props['Todoist Sync']),
                    todoistProject: E.richText(props['Todoist Project']),
                    todoistLabels: E.richText(props['Todoist Labels']),
                    todoistLeadTime: E.number(props['Todoist Lead Time']),
                    notes: E.richText(props['Notes']),
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

            case 'careItems':
                return {
                    name: E.title(props['Name']),
                    type: E.select(props['Type']),
                    defaultDose: E.richText(props['Default Dose']),
                    defaultUnit: E.select(props['Default Unit']),
                    defaultRoute: E.select(props['Default Route']),
                    linkedEventTypeId: E.relation(props['Linked Event Type'])?.[0] || null,
                    relatedPetIds: E.relation(props['Related Pets']),
                    activeStart: E.date(props['Active Start']),
                    activeEnd: E.date(props['Active End']),
                    notes: E.richText(props['Notes']),
                    files: E.files(props['Files']),
                    active: E.checkbox(props['Active']),
                    updatedAt: page.last_edited_time
                };

            default:
                console.warn(`[Sync] No extraction mapping for store: ${store}`);
                return { updatedAt: page.last_edited_time };
        }
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.Sync = Sync;
