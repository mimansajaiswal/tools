/**
 * Pet Tracker - Sync Engine
 * Handles bidirectional sync with Notion
 * Push local changes, pull remote updates, resolve conflicts
 */

const Sync = {
    isRunning: false,
    lastError: null,

    // Rate limiting: ~3 requests/second
    rateLimitMs: 350,
    lastRequestTime: 0,

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
    run: async () => {
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

        try {
            console.log('[Sync] Starting sync cycle...');
            
            // 1. Push local changes
            await Sync.pushLocalChanges();

            // 2. Pull remote updates
            await Sync.pullRemoteUpdates();

            // 3. Update last sync time
            PetTracker.Settings.setLastSync();
            
            console.log('[Sync] Sync complete');
            PetTracker.UI.toast('Synced', 'success', 2000);
            
            // Refresh UI
            if (PetTracker.App) {
                await PetTracker.App.loadData();
                PetTracker.App.renderDashboard();
            }
        } catch (e) {
            console.error('[Sync] Error:', e);
            Sync.lastError = e;
            PetTracker.UI.toast(`Sync failed: ${e.message}`, 'error');
        } finally {
            Sync.isRunning = false;
        }
    },

    /**
     * Push local changes to Notion
     */
    pushLocalChanges: async () => {
        const pending = await PetTracker.SyncQueue.getPending();
        console.log(`[Sync] ${pending.length} pending operations`);

        for (const op of pending) {
            try {
                await Sync.waitForRateLimit();
                await Sync.processOperation(op);
                await PetTracker.SyncQueue.complete(op.id);
            } catch (e) {
                console.error(`[Sync] Operation ${op.id} failed:`, e);
                
                if (e.isRateLimit) {
                    // Wait and retry later
                    await new Promise(r => setTimeout(r, (e.retryAfter || 1) * 1000));
                }
                
                await PetTracker.SyncQueue.fail(op.id, e.message);
            }
        }
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
                const properties = Sync.toNotionProperties(store, data);
                const result = await PetTracker.API.createPage(dataSourceId, properties);
                
                // Update local record with Notion ID
                const record = await PetTracker.DB.get(PetTracker.STORES[store.toUpperCase()], recordId);
                if (record) {
                    record.notionId = result.id;
                    record.synced = true;
                    await PetTracker.DB.put(PetTracker.STORES[store.toUpperCase()], record);
                }
                break;
            }

            case 'update': {
                const record = await PetTracker.DB.get(PetTracker.STORES[store.toUpperCase()], recordId);
                if (!record?.notionId) {
                    throw new Error('No Notion ID for update');
                }
                const properties = Sync.toNotionProperties(store, data);
                await PetTracker.API.updatePage(record.notionId, properties);
                
                record.synced = true;
                await PetTracker.DB.put(PetTracker.STORES[store.toUpperCase()], record);
                break;
            }

            case 'delete': {
                const record = await PetTracker.DB.get(PetTracker.STORES[store.toUpperCase()], recordId);
                if (record?.notionId) {
                    await PetTracker.API.archivePage(record.notionId);
                }
                await PetTracker.DB.delete(PetTracker.STORES[store.toUpperCase()], recordId);
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
