/**
 * Pet Tracker - Care Module
 * Recurring event types, Scales, and Upcoming view
 * (Simplified: scheduling is now on Event Types, not separate Care Plans)
 */

const Care = {
    advanceDateByInterval: (date, eventType) => {
        const d = new Date(date);
        switch (eventType.intervalUnit) {
            case 'Days':
                d.setDate(d.getDate() + (eventType.intervalValue || 1));
                break;
            case 'Weeks':
                d.setDate(d.getDate() + ((eventType.intervalValue || 1) * 7));
                break;
            case 'Months':
                d.setMonth(d.getMonth() + (eventType.intervalValue || 1));
                break;
            case 'Years':
                d.setFullYear(d.getFullYear() + (eventType.intervalValue || 1));
                break;
            default:
                d.setDate(d.getDate() + 1);
        }
        return d;
    },

    getFixedOccurrenceIndex: (dateValue, eventType) => {
        if (!eventType?.anchorDate) return null;
        const anchor = new Date(eventType.anchorDate);
        const target = new Date(dateValue);
        if (Number.isNaN(anchor.getTime()) || Number.isNaN(target.getTime()) || target < anchor) return null;
        let idx = 1;
        let cursor = new Date(anchor);
        while (cursor < target && idx <= 2000) {
            cursor = Care.advanceDateByInterval(cursor, eventType);
            idx += 1;
        }
        return cursor > target ? null : idx;
    },

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

        let occurrenceIndex = 1;
        const maxOccurrences = Number(eventType.endAfterOccurrences) || null;

        while (nextDue <= now) {
            nextDue = Care.advanceDateByInterval(nextDue, eventType);
            occurrenceIndex += 1;
            if (maxOccurrences && occurrenceIndex > maxOccurrences) {
                return null;
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

        const endDateLimit = eventType.endDate ? new Date(eventType.endDate) : null;

        // Find last completed event for this event type, optionally filtered by pet
        const events = await PetTracker.DB.query(
            PetTracker.STORES.EVENTS,
            e => e.eventTypeId === eventType.id && (e.status === 'Completed' || e.status === 'Missed') &&
                (!petId || (e.petIds && e.petIds.includes(petId)))
        );

        if (events.length === 0) {
            if (!eventType.anchorDate) return null;
            const anchorDate = new Date(eventType.anchorDate);
            if (endDateLimit && !Number.isNaN(endDateLimit.getTime()) && anchorDate > endDateLimit) {
                return null;
            }
            return eventType.anchorDate;
        }

        const maxOccurrences = Number(eventType.endAfterOccurrences) || null;
        if (maxOccurrences && events.length >= maxOccurrences) {
            return null;
        }

        // Sort by date descending
        events.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        const lastEvent = events[0];
        const lastDate = new Date(lastEvent.startDate);

        // Add interval
        const nextDate = Care.advanceDateByInterval(lastDate, eventType);
        if (endDateLimit && !Number.isNaN(endDateLimit.getTime()) && nextDate > endDateLimit) {
            return null;
        }

        return PetTracker.UI.localDateYYYYMMDD(nextDate);
    },

    /**
     * Compute next due for an event type, honoring per-pet rolling schedules
     */
    computeNextDueForEventType: async (eventType) => {
        if (!eventType?.isRecurring) return null;

        if (eventType.scheduleType !== 'Rolling') {
            return Care.calculateNextDue(eventType);
        }

        const relatedPets = eventType.relatedPetIds?.length > 0
            ? eventType.relatedPetIds
            : [null];
        const dueDates = [];
        for (const petId of relatedPets) {
            const due = await Care.calculateRollingNextDue(eventType, petId);
            if (due) dueDates.push(due);
        }
        if (dueDates.length === 0) return null;
        dueDates.sort((a, b) => new Date(a) - new Date(b));
        return dueDates[0];
    },

    /**
     * Advance a YYYY-MM-DD date by the configured interval
     */
    advanceDueByInterval: (baseDate, eventType) => {
        if (!baseDate) return null;
        const d = Care.advanceDateByInterval(new Date(baseDate), eventType);
        const maxOccurrences = Number(eventType.endAfterOccurrences) || null;
        if (maxOccurrences) {
            const occurrenceIndex = Care.getFixedOccurrenceIndex(d, eventType);
            if (!occurrenceIndex || occurrenceIndex > maxOccurrences) {
                return null;
            }
        }
        return PetTracker.UI.localDateYYYYMMDD(d);
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
                : (petIds.length > 0 ? [...petIds] : [null]); // null = no specific pet

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
                        petIds: petId
                            ? [petId]
                            : (petIds.length > 0 ? [...petIds] : (eventType.relatedPetIds || [])),
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
    upcomingHorizonOptions: [
        { value: 7, label: 'Next 7 days' },
        { value: 14, label: 'Next 14 days' },
        { value: 30, label: 'Next 30 days' },
        { value: 90, label: 'Next 90 days' }
    ],
    upcomingFilterUI: {
        openMenu: null,
        controlsBound: false,
        availableOptions: {
            horizon: [],
            petIds: [],
            categories: []
        }
    },

    updateUpcomingFilters: () => {
        Care.renderUpcoming();
    },

    clearUpcomingFilters: () => {
        Care.upcomingFilters = {
            horizon: 30,
            petIds: [],
            categories: []
        };
        Care.upcomingFilterUI.openMenu = null;
        Care.renderUpcoming();
    },

    renderUpcomingFilterDropdown: (kind, label, filterKey, options = [], allLabel = 'items') => {
        const selectedSet = new Set(Care.upcomingFilters[filterKey] || []);
        const selectedOptions = options.filter(opt => selectedSet.has(opt.value));
        const summary = selectedOptions.length === 0
            ? `All ${allLabel}`
            : (selectedOptions.length <= 2
                ? selectedOptions.map(opt => opt.label).join(', ')
                : `${selectedOptions.slice(0, 2).map(opt => opt.label).join(', ')} +${selectedOptions.length - 2}`);
        const isOpen = Care.upcomingFilterUI.openMenu === kind;

        const optionsHtml = options.length > 0
            ? options.map(opt => {
                const encodedValue = encodeURIComponent(String(opt.value));
                return `
                    <label class="multiselect-option">
                        <input type="checkbox" ${selectedSet.has(opt.value) ? 'checked' : ''} onchange="event.stopPropagation(); Care.toggleUpcomingFilterValue('${filterKey}', '${encodedValue}')">
                        ${opt.color ? `<span class="inline-block w-2.5 h-2.5 rounded-full" style="background:${opt.color}"></span>` : ''}
                        <span class="multiselect-option-text">${PetTracker.UI.escapeHtml(opt.label || String(opt.value))}</span>
                    </label>
                `;
            }).join('')
            : '<div class="text-xs text-earth-metal px-2 py-1">No options</div>';

        return `
            <div class="upcoming-filter-dropdown">
                <label class="font-mono text-[10px] uppercase text-earth-metal block mb-1">${label}</label>
                <div class="multiselect-dropdown">
                    <button type="button" class="multiselect-trigger input-field flex items-center justify-between" onclick="event.stopPropagation(); Care.toggleUpcomingFilterMenu('${kind}')" aria-expanded="${isOpen ? 'true' : 'false'}">
                        <span class="multiselect-label text-sm ${selectedOptions.length > 0 ? 'text-charcoal' : 'text-earth-metal'}">${PetTracker.UI.escapeHtml(summary)}</span>
                        <i data-lucide="chevron-down" class="w-4 h-4 text-earth-metal transition-transform"></i>
                    </button>
                    <div class="multiselect-menu ${isOpen ? '' : 'hidden'} absolute z-20 mt-1 w-full bg-white-linen border border-oatmeal shadow-lg max-h-72 overflow-y-auto p-2 space-y-2" onclick="event.stopPropagation()">
                        <div class="space-y-1">${optionsHtml}</div>
                        <div class="pt-2 border-t border-oatmeal flex gap-2">
                            <button type="button" onclick="event.stopPropagation(); Care.setUpcomingFilterMode('${filterKey}', 'all')" class="btn-secondary px-2 py-1 font-mono text-[10px] uppercase">All</button>
                            <button type="button" onclick="event.stopPropagation(); Care.setUpcomingFilterMode('${filterKey}', 'none')" class="btn-secondary px-2 py-1 font-mono text-[10px] uppercase">None</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderUpcomingSingleSelectDropdown: (kind, label, selectedValue, options = []) => {
        const isOpen = Care.upcomingFilterUI.openMenu === kind;
        const selected = options.find(opt => Number(opt.value) === Number(selectedValue)) || null;
        const summary = selected?.label || options[0]?.label || '';
        const optionsHtml = options.length > 0
            ? options.map(opt => {
                const isActive = Number(opt.value) === Number(selectedValue);
                return `
                    <button type="button" class="multiselect-option multiselect-option-single ${isActive ? 'is-selected' : ''}" onclick="event.stopPropagation(); Care.setUpcomingHorizon(${Number(opt.value)})">
                        <span class="multiselect-option-text">${PetTracker.UI.escapeHtml(opt.label || String(opt.value))}</span>
                        ${isActive ? '<i data-lucide="check" class="w-3.5 h-3.5 text-dull-purple"></i>' : ''}
                    </button>
                `;
            }).join('')
            : '<div class="text-xs text-earth-metal px-2 py-1">No options</div>';

        return `
            <div class="upcoming-filter-dropdown">
                <label class="font-mono text-[10px] uppercase text-earth-metal block mb-1">${label}</label>
                <div class="multiselect-dropdown">
                    <button type="button" class="multiselect-trigger input-field flex items-center justify-between" onclick="event.stopPropagation(); Care.toggleUpcomingFilterMenu('${kind}')" aria-expanded="${isOpen ? 'true' : 'false'}">
                        <span class="multiselect-label text-sm text-charcoal">${PetTracker.UI.escapeHtml(summary)}</span>
                        <i data-lucide="chevron-down" class="w-4 h-4 text-earth-metal transition-transform"></i>
                    </button>
                    <div class="multiselect-menu ${isOpen ? '' : 'hidden'} absolute z-20 mt-1 w-full bg-white-linen border border-oatmeal shadow-lg max-h-72 overflow-y-auto p-2 space-y-1" onclick="event.stopPropagation()">
                        ${optionsHtml}
                    </div>
                </div>
            </div>
        `;
    },

    bindUpcomingFilterOutsideClick: () => {
        if (Care.upcomingFilterUI.controlsBound) return;
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.upcoming-filter-dropdown') && Care.upcomingFilterUI.openMenu) {
                Care.closeUpcomingFilterMenus();
            }
        });
        Care.upcomingFilterUI.controlsBound = true;
    },

    toggleUpcomingFilterMenu: (kind) => {
        Care.upcomingFilterUI.openMenu = Care.upcomingFilterUI.openMenu === kind ? null : kind;
        Care.renderUpcoming();
    },

    closeUpcomingFilterMenus: () => {
        if (!Care.upcomingFilterUI.openMenu) return;
        Care.upcomingFilterUI.openMenu = null;
        Care.renderUpcoming();
    },

    toggleUpcomingFilterValue: (filterKey, encodedValue) => {
        let value = '';
        try {
            value = decodeURIComponent(encodedValue || '');
        } catch (_) {
            value = encodedValue || '';
        }
        if (!value) return;
        const current = new Set(Care.upcomingFilters[filterKey] || []);
        if (current.has(value)) current.delete(value);
        else current.add(value);
        Care.upcomingFilters[filterKey] = Array.from(current);
        Care.renderUpcoming();
    },

    setUpcomingFilterMode: (filterKey, mode) => {
        const values = Care.upcomingFilterUI.availableOptions?.[filterKey] || [];
        Care.upcomingFilters[filterKey] = mode === 'all' ? [...values] : [];
        Care.renderUpcoming();
    },

    setUpcomingHorizon: (value) => {
        const parsed = parseInt(String(value || ''), 10);
        Care.upcomingFilters.horizon = Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
        Care.renderUpcoming();
    },

    normalizePetIdsArg: (petIdsArg) => {
        if (!petIdsArg) return [];
        if (Array.isArray(petIdsArg)) {
            return [...new Set(petIdsArg.filter(Boolean))];
        }
        return [...new Set(String(petIdsArg).split(',').map(v => v.trim()).filter(Boolean))];
    },

    resolveEventPetIds: async (eventType, petIdsArg) => {
        const explicit = Care.normalizePetIdsArg(petIdsArg);
        if (explicit.length > 0) return explicit;

        if (Array.isArray(eventType.relatedPetIds) && eventType.relatedPetIds.length > 0) {
            return [...new Set(eventType.relatedPetIds.filter(Boolean))];
        }

        if (Array.isArray(Care.upcomingFilters.petIds) && Care.upcomingFilters.petIds.length > 0) {
            return [...new Set(Care.upcomingFilters.petIds.filter(Boolean))];
        }

        const pets = await PetTracker.DB.getAll(PetTracker.STORES.PETS);
        return pets.map(p => p.id).filter(Boolean);
    },

    /**
     * Render upcoming care view
     */
    renderUpcoming: async () => {
        const container = document.querySelector('[data-view="upcoming"]');
        if (!container) return;

        const eventTypes = await PetTracker.DB.getAll(PetTracker.STORES.EVENT_TYPES);
        const recurringTypes = eventTypes.filter(et => et.isRecurring && et.active !== false);
        const categories = [...new Set(recurringTypes.map(et => et.category).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b));
        const pets = await PetTracker.DB.getAll(PetTracker.STORES.PETS);
        const petOptions = [...pets]
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .map(p => ({ value: p.id, label: p.name || 'Unnamed Pet', color: p.color || '#8b7b8e' }));
        const categoryOptions = categories.map(c => ({ value: c, label: c }));
        const horizonOptions = Care.upcomingHorizonOptions;
        Care.upcomingFilterUI.availableOptions = {
            horizon: horizonOptions.map(o => o.value),
            petIds: petOptions.map(o => o.value),
            categories: categoryOptions.map(o => o.value)
        };
        if (!Care.upcomingFilterUI.availableOptions.horizon.includes(Care.upcomingFilters.horizon)) {
            Care.upcomingFilters.horizon = 30;
        }
        Care.upcomingFilters.petIds = (Care.upcomingFilters.petIds || []).filter(id => Care.upcomingFilterUI.availableOptions.petIds.includes(id));
        Care.upcomingFilters.categories = (Care.upcomingFilters.categories || []).filter(c => Care.upcomingFilterUI.availableOptions.categories.includes(c));
        const petsById = Object.fromEntries(pets.map(p => [p.id, p]));
        const upcoming = await Care.getUpcoming(Care.upcomingFilters);

        let html = `
            <div class="p-4 md:p-6 max-w-4xl mx-auto">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div>
                        <h2 class="font-serif text-2xl text-charcoal">Upcoming Care</h2>
                        <p class="text-sm text-earth-metal mt-1">Scheduled events from recurring event types</p>
                    </div>
                </div>

                <!-- Filters -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                        ${Care.renderUpcomingSingleSelectDropdown('horizon', 'Horizon', Care.upcomingFilters.horizon, horizonOptions)}
                        ${Care.renderUpcomingFilterDropdown('pets', 'Pets', 'petIds', petOptions, 'pets')}
                        ${Care.renderUpcomingFilterDropdown('categories', 'Categories', 'categories', categoryOptions, 'categories')}
                    <div class="flex items-end">
                        <button onclick="Care.clearUpcomingFilters()" class="btn-secondary px-3 py-2 font-mono text-xs uppercase w-full sm:w-auto">
                            Clear Filters
                        </button>
                    </div>
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
                    const petNames = (item.petIds || []).map(id => petsById[id]?.name || '').filter(Boolean);
                    const petScope = petNames.length > 0 ? `For ${petNames.join(', ')}` : 'For all pets';
                    const colorHex = Setup?.availableColors?.find(c => c.value === item.color)?.hex || '#6b6357';

                    html += `
                        <div class="flex items-center gap-3 p-4 border border-oatmeal ${item.isOverdue ? 'border-muted-pink bg-muted-pink/5' : ''} hover:border-dull-purple transition-fast">
                            <div class="w-10 h-10 flex items-center justify-center" style="background: ${colorHex}20; color: ${colorHex}">
                                <i data-lucide="${item.icon || 'calendar'}" class="w-5 h-5"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm text-charcoal font-medium truncate">${PetTracker.UI.escapeHtml(item.eventTypeName)}</p>
                                <p class="text-xs text-earth-metal">
                                    ${item.category || 'Other'} • ${PetTracker.UI.escapeHtml(petScope)}
                                    ${item.dueTime ? ` • ${item.dueTime}` : ''}
                                </p>
                            </div>
                            <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <button onclick="Care.markComplete('${item.eventTypeId}', '${(item.petIds || []).join(',')}')" 
                                        class="btn-primary px-3 py-1 font-mono text-[10px] uppercase w-full sm:w-auto">
                                    Done
                                </button>
                                <button onclick="Care.skipOnce('${item.eventTypeId}', '${(item.petIds || []).join(',')}')" 
                                        class="btn-secondary px-3 py-1 font-mono text-[10px] uppercase w-full sm:w-auto">
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

        Care.bindUpcomingFilterOutsideClick();
        if (window.lucide) lucide.createIcons();
    },

    /**
     * Mark a recurring event type item as complete (create event)
     */
    markComplete: async (eventTypeId, petIdsArg = null) => {
        const eventType = await PetTracker.DB.get(PetTracker.STORES.EVENT_TYPES, eventTypeId);
        if (!eventType) return;
        const targetPetIds = await Care.resolveEventPetIds(eventType, petIdsArg);

        // Create completed event
        await Events.create({
            title: eventType.name,
            petIds: targetPetIds,
            eventTypeId: eventType.id,
            startDate: new Date().toISOString(),
            status: 'Completed',
            source: 'Scheduled'
        });

        // Update event type's next due and queue for sync
        let nextDue;
        if (eventType.scheduleType === 'Rolling') {
            nextDue = await Care.computeNextDueForEventType(eventType);
        } else if (eventType.scheduleType === 'One-off') {
            nextDue = null;
        } else {
            nextDue = Care.advanceDueByInterval(
                eventType.nextDue || PetTracker.UI.localDateYYYYMMDD(),
                eventType
            );
        }
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
    skipOnce: async (eventTypeId, petIdsArg = null) => {
        const eventType = await PetTracker.DB.get(PetTracker.STORES.EVENT_TYPES, eventTypeId);
        if (!eventType) return;
        const targetPetIds = await Care.resolveEventPetIds(eventType, petIdsArg);

        // Create a missed event
        await Events.create({
            title: eventType.name,
            petIds: targetPetIds,
            eventTypeId: eventType.id,
            startDate: eventType.nextDue || PetTracker.UI.localDateYYYYMMDD(),
            status: 'Missed',
            source: 'Scheduled'
        });

        let nextDue;
        if (eventType.scheduleType === 'Rolling') {
            nextDue = await Care.computeNextDueForEventType(eventType);
        } else if (eventType.scheduleType === 'One-off') {
            nextDue = null;
        } else {
            nextDue = Care.advanceDueByInterval(
                eventType.nextDue || PetTracker.UI.localDateYYYYMMDD(),
                eventType
            );
        }

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
