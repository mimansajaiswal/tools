/**
 * Pet Tracker - Care Module
 * Recurring event types, Scales, and Upcoming view
 * (Simplified: scheduling is now on Event Types, not separate Care Plans)
 */

const Care = {
    /**
     * Calculate next due date for a recurring event type
     */
    calculateNextDue: (eventType) => {
        if (!eventType.isRecurring) return null;

        const now = new Date();

        if (eventType.scheduleType === 'One-off') {
            return eventType.anchorDate;
        }

        if (eventType.scheduleType === 'Rolling') {
            return eventType.anchorDate;
        }

        // Fixed schedule
        if (!eventType.anchorDate) return null;

        const anchor = new Date(eventType.anchorDate);
        let nextDue = new Date(anchor);

        while (nextDue <= now) {
            switch (eventType.intervalUnit) {
                case 'Days':
                    nextDue.setDate(nextDue.getDate() + (eventType.intervalValue || 1));
                    break;
                case 'Weeks':
                    nextDue.setDate(nextDue.getDate() + ((eventType.intervalValue || 1) * 7));
                    break;
                case 'Months':
                    nextDue.setMonth(nextDue.getMonth() + (eventType.intervalValue || 1));
                    break;
                case 'Years':
                    nextDue.setFullYear(nextDue.getFullYear() + (eventType.intervalValue || 1));
                    break;
                default:
                    nextDue.setDate(nextDue.getDate() + 1);
            }
        }

        return PetTracker.UI.localDateYYYYMMDD(nextDue);
    },

    /**
     * Calculate next due for rolling schedule (needs last event)
     * FIX #11: Accepts optional petId to find last event per pet
     */
    calculateRollingNextDue: async (eventType, petId = null) => {
        if (eventType.scheduleType !== 'Rolling') {
            return Care.calculateNextDue(eventType);
        }

        // Find last completed event for this event type, optionally filtered by pet
        const events = await PetTracker.DB.query(
            PetTracker.STORES.EVENTS,
            e => e.eventTypeId === eventType.id && e.status === 'Completed' &&
                (!petId || (e.petIds && e.petIds.includes(petId)))
        );

        if (events.length === 0) {
            return eventType.anchorDate;
        }

        // Sort by date descending
        events.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        const lastEvent = events[0];
        const lastDate = new Date(lastEvent.startDate);

        // Add interval
        switch (eventType.intervalUnit) {
            case 'Days':
                lastDate.setDate(lastDate.getDate() + (eventType.intervalValue || 1));
                break;
            case 'Weeks':
                lastDate.setDate(lastDate.getDate() + ((eventType.intervalValue || 1) * 7));
                break;
            case 'Months':
                lastDate.setMonth(lastDate.getMonth() + (eventType.intervalValue || 1));
                break;
            case 'Years':
                lastDate.setFullYear(lastDate.getFullYear() + (eventType.intervalValue || 1));
                break;
        }

        return PetTracker.UI.localDateYYYYMMDD(lastDate);
    },

    /**
     * Get upcoming items from recurring event types
     */
    getUpcoming: async (options = {}) => {
        const {
            horizon = 30,
            petIds = [],
            categories = []
        } = options;

        const eventTypes = await PetTracker.DB.getAll(PetTracker.STORES.EVENT_TYPES);
        const recurringTypes = eventTypes.filter(et => et.isRecurring && et.active !== false);

        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + horizon);

        const upcoming = [];

        for (const eventType of recurringTypes) {
            // Filter by category if specified
            if (categories.length > 0 && !categories.includes(eventType.category)) {
                continue;
            }

            // Check if schedule has ended
            if (eventType.endDate && new Date(eventType.endDate) < now) {
                continue;
            }

            // FIX #11: Generate per-pet entries when event type has multiple related pets
            const relatedPets = eventType.relatedPetIds?.length > 0
                ? eventType.relatedPetIds
                : [null]; // null = no specific pet

            for (const petId of relatedPets) {
                // Filter by pet if specified
                if (petIds.length > 0 && petId && !petIds.includes(petId)) {
                    continue;
                }

                // Calculate next due (per-pet for rolling schedules)
                let nextDue;
                if (eventType.scheduleType === 'Rolling') {
                    nextDue = await Care.calculateRollingNextDue(eventType, petId);
                } else {
                    nextDue = Care.calculateNextDue(eventType);
                }

                if (!nextDue) continue;

                const dueDate = new Date(nextDue);

                // Check if within horizon
                if (dueDate <= endDate) {
                    upcoming.push({
                        eventTypeId: eventType.id,
                        eventTypeName: eventType.name,
                        petIds: petId ? [petId] : (eventType.relatedPetIds || []),
                        category: eventType.category,
                        dueDate: nextDue,
                        dueTime: eventType.dueTime,
                        windowBefore: eventType.windowBefore,
                        windowAfter: eventType.windowAfter,
                        isOverdue: dueDate < now,
                        icon: eventType.defaultIcon,
                        color: eventType.defaultColor
                    });
                }
            }
        }

        // Sort by due date
        upcoming.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        return upcoming;
    },

    // State for upcoming view filters
    upcomingFilters: {
        horizon: 30,
        petIds: [],
        categories: []
    },

    /**
     * Render upcoming care view
     */
    renderUpcoming: async () => {
        const container = document.querySelector('[data-view="upcoming"]');
        if (!container) return;

        const upcoming = await Care.getUpcoming(Care.upcomingFilters);
        const pets = await PetTracker.DB.getAll(PetTracker.STORES.PETS);
        const petsById = Object.fromEntries(pets.map(p => [p.id, p]));

        let html = `
            <div class="p-4 md:p-6 max-w-4xl mx-auto">
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <h2 class="font-serif text-2xl text-charcoal">Upcoming Care</h2>
                        <p class="text-sm text-earth-metal mt-1">Scheduled events from recurring event types</p>
                    </div>
                </div>

                <!-- Filters -->
                <div class="flex flex-wrap gap-3 mb-6">
                    <select onchange="Care.upcomingFilters.horizon = parseInt(this.value); Care.renderUpcoming();" 
                            class="select-field text-sm">
                        <option value="7" ${Care.upcomingFilters.horizon === 7 ? 'selected' : ''}>Next 7 days</option>
                        <option value="14" ${Care.upcomingFilters.horizon === 14 ? 'selected' : ''}>Next 14 days</option>
                        <option value="30" ${Care.upcomingFilters.horizon === 30 ? 'selected' : ''}>Next 30 days</option>
                        <option value="90" ${Care.upcomingFilters.horizon === 90 ? 'selected' : ''}>Next 90 days</option>
                    </select>
                </div>
        `;

        if (upcoming.length === 0) {
            html += `
                <div class="border border-oatmeal p-8 text-center">
                    <i data-lucide="calendar-check" class="w-12 h-12 text-oatmeal mx-auto mb-4"></i>
                    <p class="text-earth-metal">No upcoming scheduled items</p>
                    <p class="text-xs text-earth-metal mt-2">Add recurring schedules to event types in Setup → Event Types</p>
                </div>
            `;
        } else {
            // Group by date
            const byDate = {};
            for (const item of upcoming) {
                const key = item.dueDate;
                if (!byDate[key]) byDate[key] = [];
                byDate[key].push(item);
            }

            for (const [date, items] of Object.entries(byDate)) {
                const dateObj = new Date(date);
                const isToday = date === PetTracker.UI.localDateYYYYMMDD();
                const isTomorrow = date === PetTracker.UI.localDateYYYYMMDD(new Date(Date.now() + 86400000));

                let dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                if (isToday) dateLabel = 'Today';
                if (isTomorrow) dateLabel = 'Tomorrow';

                html += `
                    <div class="mb-6">
                        <h3 class="font-mono text-xs uppercase text-earth-metal mb-2 ${items[0].isOverdue ? 'text-muted-pink' : ''}">${dateLabel}</h3>
                        <div class="space-y-2">
                `;

                for (const item of items) {
                    const petNames = (item.petIds || []).map(id => petsById[id]?.name || '').filter(Boolean).join(', ');
                    const colorHex = Setup?.availableColors?.find(c => c.value === item.color)?.hex || '#6b6357';

                    html += `
                        <div class="flex items-center gap-3 p-4 border border-oatmeal ${item.isOverdue ? 'border-muted-pink bg-muted-pink/5' : ''} hover:border-dull-purple transition-fast">
                            <div class="w-10 h-10 flex items-center justify-center" style="background: ${colorHex}20; color: ${colorHex}">
                                <i data-lucide="${item.icon || 'calendar'}" class="w-5 h-5"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm text-charcoal font-medium truncate">${PetTracker.UI.escapeHtml(item.eventTypeName)}</p>
                                <p class="text-xs text-earth-metal">
                                    ${item.category || 'Other'}${petNames ? ` • ${petNames}` : ''}
                                    ${item.dueTime ? ` • ${item.dueTime}` : ''}
                                </p>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="Care.markComplete('${item.eventTypeId}')" 
                                        class="btn-primary px-3 py-1 font-mono text-[10px] uppercase">
                                    Done
                                </button>
                                <button onclick="Care.skipOnce('${item.eventTypeId}')" 
                                        class="btn-secondary px-3 py-1 font-mono text-[10px] uppercase">
                                    Skip
                                </button>
                            </div>
                        </div>
                    `;
                }

                html += `</div></div>`;
            }
        }

        html += `</div>`;
        container.innerHTML = html;

        if (window.lucide) lucide.createIcons();
    },

    /**
     * Mark a recurring event type item as complete (create event)
     */
    markComplete: async (eventTypeId) => {
        const eventType = await PetTracker.DB.get(PetTracker.STORES.EVENT_TYPES, eventTypeId);
        if (!eventType) return;

        // Create completed event
        await Events.create({
            title: eventType.name,
            petIds: eventType.relatedPetIds || [],
            eventTypeId: eventType.id,
            startDate: new Date().toISOString(),
            status: 'Completed',
            source: 'Scheduled'
        });

        // Update event type's next due and queue for sync
        const nextDue = await Care.calculateRollingNextDue(eventType);
        const updatedEventType = {
            ...eventType,
            nextDue,
            updatedAt: new Date().toISOString(),
            synced: false
        };
        await PetTracker.DB.put(PetTracker.STORES.EVENT_TYPES, updatedEventType);

        await PetTracker.SyncQueue.add({
            type: 'update',
            store: 'eventTypes',
            recordId: eventType.id,
            data: updatedEventType
        });

        if (PetTracker.Sync?.updatePendingCount) {
            PetTracker.Sync.updatePendingCount();
        }

        PetTracker.UI.toast('Marked complete', 'success');
        Care.renderUpcoming();
    },

    /**
     * Skip once (advance to next occurrence)
     */
    skipOnce: async (eventTypeId) => {
        const eventType = await PetTracker.DB.get(PetTracker.STORES.EVENT_TYPES, eventTypeId);
        if (!eventType) return;

        // Create a missed event
        await Events.create({
            title: eventType.name,
            petIds: eventType.relatedPetIds || [],
            eventTypeId: eventType.id,
            startDate: eventType.nextDue || PetTracker.UI.localDateYYYYMMDD(),
            status: 'Missed',
            source: 'Scheduled'
        });

        // Advance next due by one interval
        const current = new Date(eventType.nextDue || new Date());
        switch (eventType.intervalUnit) {
            case 'Days':
                current.setDate(current.getDate() + (eventType.intervalValue || 1));
                break;
            case 'Weeks':
                current.setDate(current.getDate() + ((eventType.intervalValue || 1) * 7));
                break;
            case 'Months':
                current.setMonth(current.getMonth() + (eventType.intervalValue || 1));
                break;
            case 'Years':
                current.setFullYear(current.getFullYear() + (eventType.intervalValue || 1));
                break;
        }

        const updatedEventType = {
            ...eventType,
            nextDue: PetTracker.UI.localDateYYYYMMDD(current),
            updatedAt: new Date().toISOString(),
            synced: false
        };
        await PetTracker.DB.put(PetTracker.STORES.EVENT_TYPES, updatedEventType);

        await PetTracker.SyncQueue.add({
            type: 'update',
            store: 'eventTypes',
            recordId: eventType.id,
            data: updatedEventType
        });

        if (PetTracker.Sync?.updatePendingCount) {
            PetTracker.Sync.updatePendingCount();
        }

        PetTracker.UI.toast('Skipped', 'info');
        Care.renderUpcoming();
    },

    /**
     * Create default event types (for first-run)
     * Note: Call createDefaultScales() first so scales exist to reference
     */
    createDefaultEventTypes: async () => {
        // Find the Symptom Severity scale if it exists
        const symptomScales = await PetTracker.DB.query(
            PetTracker.STORES.SCALES,
            s => s.name === 'Symptom Severity'
        );
        const symptomScaleId = symptomScales.length > 0 ? symptomScales[0].id : null;

        const defaults = [
            { name: 'Medication Given', category: 'Medication', trackingMode: 'Stamp', defaultIcon: 'pill', defaultColor: 'blue' },
            { name: 'Symptom', category: 'Symptom', trackingMode: 'Stamp', usesSeverity: true, defaultScaleId: symptomScaleId, defaultIcon: 'alert-circle', defaultColor: 'red' },
            { name: 'Vet Visit', category: 'Vet Visit', trackingMode: 'Timed', allowAttachments: true, defaultIcon: 'stethoscope', defaultColor: 'purple' },
            { name: 'Walk', category: 'Activity', trackingMode: 'Timed', defaultValueKind: 'Duration', defaultIcon: 'footprints', defaultColor: 'green' },
            { name: 'Weight', category: 'Weight', trackingMode: 'Stamp', defaultValueKind: 'Weight', defaultIcon: 'scale', defaultColor: 'orange' },
            { name: 'Vaccine', category: 'Vaccine', trackingMode: 'Stamp', defaultIcon: 'syringe', defaultColor: 'teal' }
        ];

        for (const et of defaults) {
            const existing = await PetTracker.DB.query(
                PetTracker.STORES.EVENT_TYPES,
                e => e.name === et.name
            );

            if (existing.length === 0) {
                const eventType = {
                    id: PetTracker.generateId(),
                    ...et,
                    active: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    synced: false
                };

                await PetTracker.DB.put(PetTracker.STORES.EVENT_TYPES, eventType);

                await PetTracker.SyncQueue.add({
                    type: 'create',
                    store: 'eventTypes',
                    recordId: eventType.id,
                    data: eventType
                });
            }
        }

        if (PetTracker.Sync?.updatePendingCount) {
            PetTracker.Sync.updatePendingCount();
        }
    },

    /**
     * Create default scales (for first-run)
     */
    createDefaultScales: async () => {
        const scales = [
            {
                name: 'Symptom Severity',
                valueType: 'Labels',
                levels: [
                    { name: 'Mild', order: 1, color: 'yellow', numericValue: 1 },
                    { name: 'Moderate', order: 2, color: 'orange', numericValue: 2 },
                    { name: 'Severe', order: 3, color: 'red', numericValue: 3 }
                ]
            },
            {
                name: 'Activity Level',
                valueType: 'Labels',
                levels: [
                    { name: 'Low', order: 1, color: 'blue', numericValue: 1 },
                    { name: 'Medium', order: 2, color: 'green', numericValue: 2 },
                    { name: 'High', order: 3, color: 'purple', numericValue: 3 }
                ]
            }
        ];

        for (const scale of scales) {
            const existing = await PetTracker.DB.query(
                PetTracker.STORES.SCALES,
                s => s.name === scale.name
            );

            if (existing.length === 0) {
                const scaleRecord = {
                    id: PetTracker.generateId(),
                    name: scale.name,
                    valueType: scale.valueType,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    synced: false
                };

                await PetTracker.DB.put(PetTracker.STORES.SCALES, scaleRecord);

                await PetTracker.SyncQueue.add({
                    type: 'create',
                    store: 'scales',
                    recordId: scaleRecord.id,
                    data: scaleRecord
                });

                // Create scale levels
                for (const level of scale.levels) {
                    const levelRecord = {
                        id: PetTracker.generateId(),
                        scaleId: scaleRecord.id,
                        ...level,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        synced: false
                    };

                    await PetTracker.DB.put(PetTracker.STORES.SCALE_LEVELS, levelRecord);

                    await PetTracker.SyncQueue.add({
                        type: 'create',
                        store: 'scaleLevels',
                        recordId: levelRecord.id,
                        data: levelRecord
                    });
                }
            }
        }

        if (PetTracker.Sync?.updatePendingCount) {
            PetTracker.Sync.updatePendingCount();
        }
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.Care = Care;
window.Care = Care;
