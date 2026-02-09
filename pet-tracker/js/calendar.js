/**
 * Pet Tracker - Calendar Module
 * Month, Week, and Day views
 */

const Calendar = {
    state: {
        view: 'month', // month, week, day
        currentDate: new Date(),
        selectedDate: null,
        openFilterMenu: null,
        filterControlsBound: false,
        availableFilterOptions: {
            petIds: [],
            eventTypeIds: [],
            tags: [],
            severityLevelIds: []
        },
        detailObjectUrls: [],
        scaleLevelsById: {},
        scaleLevelsByScaleId: {},
        filters: {
            petIds: [],
            eventTypeIds: [],
            tags: [],
            severityLevelIds: []
        }
    },

    /**
     * Initialize calendar
     */
    init: () => {
        const uiState = PetTracker.Settings.getUIState();
        Calendar.state.view = uiState.calendarView || PetTracker.Settings.get().calendarView || 'month';
        if (Calendar.state.view === 'agenda') {
            Calendar.state.view = 'day';
        }

        // Restore calendar date if saved
        if (uiState.calendarDate) {
            Calendar.state.currentDate = new Date(uiState.calendarDate);
        } else {
            Calendar.state.currentDate = new Date();
        }

        // Restore calendar filters
        if (Array.isArray(uiState.calendarFilterPetIds)) {
            Calendar.state.filters.petIds = uiState.calendarFilterPetIds.filter(Boolean);
        } else if (uiState.calendarFilterPetId) {
            // Backward compatibility with old single-select state.
            Calendar.state.filters.petIds = [uiState.calendarFilterPetId];
        }
        if (Array.isArray(uiState.calendarFilterEventTypeIds)) {
            Calendar.state.filters.eventTypeIds = uiState.calendarFilterEventTypeIds.filter(Boolean);
        }
        if (Array.isArray(uiState.calendarFilterTags)) {
            Calendar.state.filters.tags = uiState.calendarFilterTags.filter(Boolean);
        }
        if (Array.isArray(uiState.calendarFilterSeverityIds)) {
            Calendar.state.filters.severityLevelIds = uiState.calendarFilterSeverityIds.filter(Boolean);
        }
    },

    /**
     * Render calendar view
     */
    render: async () => {
        const container = document.querySelector('[data-view="calendar"]');
        if (!container) return;

        const rangeEvents = await Calendar.getRangeEvents();
        const events = Calendar.applyFilters(rangeEvents);
        const tagSet = new Set();
        for (const e of rangeEvents) {
            for (const tag of (e.tags || [])) {
                if (tag) tagSet.add(tag);
            }
        }
        const allTags = Array.from(tagSet).sort((a, b) => a.localeCompare(b));

        const levels = await PetTracker.DB.getAll(PetTracker.STORES.SCALE_LEVELS);
        const scales = await PetTracker.DB.getAll(PetTracker.STORES.SCALES);
        const scaleById = Object.fromEntries((scales || []).map(s => [s.id, s]));
        Calendar.state.scaleLevelsById = Object.fromEntries(levels.map(l => [l.id, l]));
        Calendar.state.scaleLevelsByScaleId = levels.reduce((acc, l) => {
            const key = l.scaleId || '__none__';
            if (!acc[key]) acc[key] = [];
            acc[key].push(l);
            return acc;
        }, {});
        Object.values(Calendar.state.scaleLevelsByScaleId).forEach(arr => {
            arr.sort((a, b) => (a.order || 0) - (b.order || 0));
        });
        const petOptions = [...(App.state.pets || [])]
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .map(p => ({ value: p.id, label: p.name || 'Unnamed Pet', color: p.color || '#8b7b8e' }));
        const eventTypeOptions = [...(App.state.eventTypes || [])]
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .map(t => ({ value: t.id, label: t.name || 'Untitled', color: Calendar.getEventTypeColorHex(t) }));
        const tagOptions = allTags.map(tag => ({ value: tag, label: tag }));
        const selectedEventTypeIds = new Set(Calendar.state.filters.eventTypeIds || []);
        const scopedEventTypes = selectedEventTypeIds.size > 0
            ? (App.state.eventTypes || []).filter(t => selectedEventTypeIds.has(t.id))
            : (App.state.eventTypes || []);
        const scopedScaleIds = new Set(
            scopedEventTypes
                .filter(t => t?.usesSeverity && t?.defaultScaleId)
                .map(t => t.defaultScaleId)
        );
        const severityLevels = scopedScaleIds.size > 0
            ? levels.filter(level => level?.scaleId && scopedScaleIds.has(level.scaleId))
            : [];
        const severityOptions = [...severityLevels]
            .sort((a, b) => {
                const scaleA = (scaleById[a.scaleId]?.name || '').toLowerCase();
                const scaleB = (scaleById[b.scaleId]?.name || '').toLowerCase();
                if (scaleA !== scaleB) return scaleA.localeCompare(scaleB);
                return (a.order || 0) - (b.order || 0);
            })
            .map(level => ({
                value: level.id,
                label: level.name || 'Severity',
                summaryLabel: `${level.name || 'Severity'} (${scaleById[level.scaleId]?.name || 'Unknown Scale'})`,
                groupLabel: scaleById[level.scaleId]?.name || 'Unknown Scale',
                color: Setup?.availableColors?.find(c => c.value === level.color)?.hex || '#8b7b8e'
            }));

        Calendar.state.availableFilterOptions = {
            petIds: petOptions.map(o => o.value),
            eventTypeIds: eventTypeOptions.map(o => o.value),
            tags: tagOptions.map(o => o.value),
            severityLevelIds: severityOptions.map(o => o.value)
        };
        Calendar.state.filters.petIds = (Calendar.state.filters.petIds || []).filter(id => Calendar.state.availableFilterOptions.petIds.includes(id));
        Calendar.state.filters.eventTypeIds = (Calendar.state.filters.eventTypeIds || []).filter(id => Calendar.state.availableFilterOptions.eventTypeIds.includes(id));
        Calendar.state.filters.tags = (Calendar.state.filters.tags || []).filter(tag => Calendar.state.availableFilterOptions.tags.includes(tag));
        Calendar.state.filters.severityLevelIds = (Calendar.state.filters.severityLevelIds || []).filter(id => Calendar.state.availableFilterOptions.severityLevelIds.includes(id));

        container.innerHTML = `
            <div class="calendar-shell md:h-full md:flex md:flex-col">
                <!-- Calendar Header -->
                <div class="p-4 border-b border-oatmeal md:flex-shrink-0">
                    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
                        <div class="flex items-center gap-2 flex-wrap md:flex-nowrap w-full md:w-auto">
                            <button onclick="Calendar.prev()" class="p-2 text-earth-metal hover:text-dull-purple">
                                <i data-lucide="chevron-left" class="w-5 h-5"></i>
                            </button>
                            <h3 class="font-serif text-xl text-charcoal flex-1 min-w-[140px] md:min-w-[180px] text-center">
                                ${Calendar.getHeaderTitle()}
                            </h3>
                            <button onclick="Calendar.next()" class="p-2 text-earth-metal hover:text-dull-purple">
                                <i data-lucide="chevron-right" class="w-5 h-5"></i>
                            </button>
                            <button onclick="Calendar.goToToday()" class="btn-secondary px-3 py-1 font-mono text-xs uppercase">
                                Today
                            </button>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <button onclick="CalendarExport.showExportModal()" class="btn-secondary px-3 py-1 font-mono text-xs uppercase" title="Export Events">
                                <i data-lucide="download" class="w-4 h-4"></i>
                            </button>
                            <div class="flex border border-oatmeal">
                                <button onclick="Calendar.setView('month')" 
                                        class="px-3 py-1 font-mono text-xs uppercase ${Calendar.state.view === 'month' ? 'bg-charcoal text-white-linen' : 'text-earth-metal hover:bg-oatmeal/30'}">
                                    Month
                                </button>
                                <button onclick="Calendar.setView('week')" 
                                        class="px-3 py-1 font-mono text-xs uppercase border-l border-oatmeal ${Calendar.state.view === 'week' ? 'bg-charcoal text-white-linen' : 'text-earth-metal hover:bg-oatmeal/30'}">
                                    Week
                                </button>
                                <button onclick="Calendar.setView('day')" 
                                        class="px-3 py-1 font-mono text-xs uppercase border-l border-oatmeal ${Calendar.state.view === 'day' ? 'bg-charcoal text-white-linen' : 'text-earth-metal hover:bg-oatmeal/30'}">
                                    Day
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                        ${Calendar.renderFilterDropdown('pets', 'Pets', 'petIds', petOptions, 'pets')}
                        ${Calendar.renderFilterDropdown('eventTypes', 'Event Types', 'eventTypeIds', eventTypeOptions, 'event types')}
                        ${Calendar.renderFilterDropdown('tags', 'Tags', 'tags', tagOptions, 'tags')}
                        ${Calendar.renderFilterDropdown('severity', 'Severity', 'severityLevelIds', severityOptions, 'levels')}
                    </div>
                </div>

                <!-- Calendar Body -->
                <div class="p-4 md:flex-1 md:overflow-auto">
                    ${Calendar.renderView(events)}
                </div>
            </div>
        `;

        Calendar.bindFilterOutsideClick();
        Calendar.persistFilters();
        if (window.lucide) lucide.createIcons();
    },

    /**
     * Render current view
     */
    renderView: (events) => {
        switch (Calendar.state.view) {
            case 'month':
                return Calendar.renderMonthView(events);
            case 'week':
                return Calendar.renderWeekView(events);
            case 'day':
                return Calendar.renderDayView(events);
            default:
                return Calendar.renderMonthView(events);
        }
    },

    renderFilterDropdown: (kind, label, filterKey, options = [], allLabel = 'items') => {
        const selectedSet = new Set(Calendar.state.filters[filterKey] || []);
        const selectedOptions = options.filter(opt => selectedSet.has(opt.value));
        const summary = selectedOptions.length === 0
            ? `All ${allLabel}`
            : (selectedOptions.length <= 2
                ? selectedOptions.map(opt => opt.summaryLabel || opt.label).join(', ')
                : `${selectedOptions.slice(0, 2).map(opt => opt.summaryLabel || opt.label).join(', ')} +${selectedOptions.length - 2}`);
        const isOpen = Calendar.state.openFilterMenu === kind;

        let optionsHtml = '<div class="text-xs text-earth-metal px-2 py-1">No options</div>';
        if (options.length > 0) {
            const grouped = [];
            const groupedIdx = {};
            options.forEach(opt => {
                const groupKey = opt.groupLabel || '';
                if (groupedIdx[groupKey] === undefined) {
                    groupedIdx[groupKey] = grouped.length;
                    grouped.push({ groupLabel: groupKey, options: [] });
                }
                grouped[groupedIdx[groupKey]].options.push(opt);
            });
            optionsHtml = grouped.map(group => {
                const groupHeader = group.groupLabel
                    ? `<div class="multiselect-group-label">${PetTracker.UI.escapeHtml(group.groupLabel)}</div>`
                    : '';
                const groupOptions = group.options.map(opt => {
                    const encodedValue = encodeURIComponent(String(opt.value));
                    return `
                        <label class="multiselect-option">
                            <input type="checkbox" ${selectedSet.has(opt.value) ? 'checked' : ''} onchange="event.stopPropagation(); Calendar.toggleFilterValue('${filterKey}', '${encodedValue}')">
                            ${opt.color ? `<span class="inline-block w-2.5 h-2.5 rounded-full" style="background:${opt.color}"></span>` : ''}
                            <span class="multiselect-option-text">${PetTracker.UI.escapeHtml(opt.label || String(opt.value))}</span>
                        </label>
                    `;
                }).join('');
                return `
                    <div class="multiselect-group">
                        ${groupHeader}
                        <div class="space-y-1">${groupOptions}</div>
                    </div>
                `;
            }).join('');
        }

        return `
            <div class="calendar-filter-dropdown">
                <label class="font-mono text-[10px] uppercase text-earth-metal block mb-1">${label}</label>
                <div class="multiselect-dropdown">
                    <button type="button" class="multiselect-trigger input-field flex items-center justify-between" onclick="event.stopPropagation(); Calendar.toggleFilterMenu('${kind}')" aria-expanded="${isOpen ? 'true' : 'false'}">
                        <span class="multiselect-label text-sm ${selectedOptions.length > 0 ? 'text-charcoal' : 'text-earth-metal'}">${PetTracker.UI.escapeHtml(summary)}</span>
                        <i data-lucide="chevron-down" class="w-4 h-4 text-earth-metal transition-transform"></i>
                    </button>
                    <div class="multiselect-menu ${isOpen ? '' : 'hidden'} absolute z-20 mt-1 w-full bg-white-linen border border-oatmeal shadow-lg max-h-72 overflow-y-auto p-2 space-y-2" onclick="event.stopPropagation()">
                        <div class="space-y-1">${optionsHtml}</div>
                        <div class="pt-2 border-t border-oatmeal flex gap-2">
                            <button type="button" onclick="event.stopPropagation(); Calendar.setFilterMode('${filterKey}', 'all')" class="btn-secondary px-2 py-1 font-mono text-[10px] uppercase">All</button>
                            <button type="button" onclick="event.stopPropagation(); Calendar.setFilterMode('${filterKey}', 'none')" class="btn-secondary px-2 py-1 font-mono text-[10px] uppercase">None</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    bindFilterOutsideClick: () => {
        if (Calendar.state.filterControlsBound) return;
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.calendar-filter-dropdown') && Calendar.state.openFilterMenu) {
                Calendar.closeFilterMenus();
            }
        });
        Calendar.state.filterControlsBound = true;
    },

    toggleFilterMenu: (kind) => {
        Calendar.state.openFilterMenu = Calendar.state.openFilterMenu === kind ? null : kind;
        Calendar.render();
    },

    closeFilterMenus: () => {
        if (!Calendar.state.openFilterMenu) return;
        Calendar.state.openFilterMenu = null;
        Calendar.render();
    },

    toggleFilterValue: (filterKey, encodedValue) => {
        let value = '';
        try {
            value = decodeURIComponent(encodedValue || '');
        } catch (_) {
            value = encodedValue || '';
        }
        if (!value) return;
        const current = new Set(Calendar.state.filters[filterKey] || []);
        if (current.has(value)) current.delete(value);
        else current.add(value);
        Calendar.state.filters[filterKey] = Array.from(current);
        Calendar.persistFilters();
        Calendar.render();
    },

    setFilterMode: (filterKey, mode) => {
        const values = Calendar.state.availableFilterOptions?.[filterKey] || [];
        Calendar.state.filters[filterKey] = mode === 'all' ? [...values] : [];
        Calendar.persistFilters();
        Calendar.render();
    },

    hexToRgb: (hex) => {
        if (!hex || typeof hex !== 'string') return null;
        const clean = hex.replace('#', '').trim();
        const full = clean.length === 3
            ? clean.split('').map(c => c + c).join('')
            : clean;
        if (full.length !== 6) return null;
        const n = parseInt(full, 16);
        if (Number.isNaN(n)) return null;
        return {
            r: (n >> 16) & 255,
            g: (n >> 8) & 255,
            b: n & 255
        };
    },

    rgbToHex: (rgb) => {
        if (!rgb) return '#8b7b8e';
        const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
        return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
    },

    mixHex: (a, b, weight = 0.5) => {
        const ar = Calendar.hexToRgb(a);
        const br = Calendar.hexToRgb(b);
        if (!ar || !br) return a || b || '#8b7b8e';
        const w = Math.max(0, Math.min(1, weight));
        return Calendar.rgbToHex({
            r: ar.r + ((br.r - ar.r) * w),
            g: ar.g + ((br.g - ar.g) * w),
            b: ar.b + ((br.b - ar.b) * w)
        });
    },

    getSeverityAdjustedColor: (event, baseColor) => {
        if (!event?.severityLevelId) return baseColor;
        const level = Calendar.state.scaleLevelsById?.[event.severityLevelId];
        if (!level) return baseColor;
        const levels = Calendar.state.scaleLevelsByScaleId?.[level.scaleId || '__none__'] || [];
        if (levels.length === 0) return baseColor;

        const idx = Math.max(0, levels.findIndex(l => l.id === level.id));
        const ratio = levels.length <= 1 ? 1 : ((idx + 1) / levels.length);
        // Higher severity -> darker accent.
        const darkMix = 0.12 + (ratio * 0.48);
        return Calendar.mixHex(baseColor, '#2d2926', darkMix);
    },

    getEventColor: (event) => {
        const pet = App.state.pets.find(p => p.id === event.petIds?.[0]);
        const baseColor = pet?.color || '#8b7b8e';
        return Calendar.getSeverityAdjustedColor(event, baseColor);
    },

    getEventTypeForEvent: (event) => {
        return (App.state.eventTypes || []).find(t => t.id === event.eventTypeId) || null;
    },

    getEventIconName: (event) => {
        const eventType = Calendar.getEventTypeForEvent(event);
        return event.icon || eventType?.defaultIcon || eventType?.icon || 'calendar';
    },

    renderEventChip: (event, options = {}) => {
        const {
            compact = false,
            showPetName = false,
            count = 1
        } = options;

        const pet = App.state.pets.find(p => p.id === event.petIds?.[0]);
        const eventType = Calendar.getEventTypeForEvent(event);
        const color = Calendar.getEventColor(event);
        const typeColor = Calendar.getEventTypeColorHex(eventType, event.eventTypeId || '');
        const icon = Calendar.getEventIconName(event);
        const hasTime = typeof event.startDate === 'string' && event.startDate.includes('T');
        const timeLabel = hasTime ? PetTracker.UI.formatTime(event.startDate) : '';
        const chipClasses = compact
            ? 'calendar-event-chip calendar-event-chip-compact'
            : 'calendar-event-chip';

        return `
            <button type="button" class="${chipClasses}" onclick="event.stopPropagation(); Calendar.showEventDetail('${event.id}')"
                style="border-left-color:${color};">
                <span class="calendar-event-chip-inner">
                    <span class="calendar-event-pet-dot" style="background:${pet?.color || '#8b7b8e'}"></span>
                    <span class="calendar-event-type-icon" style="color:${typeColor}">
                        <i data-lucide="${icon}" class="w-3.5 h-3.5"></i>
                    </span>
                    <span class="calendar-event-main">
                        <span class="calendar-event-title">${PetTracker.UI.escapeHtml(event.title || eventType?.name || 'Event')}</span>
                        ${compact ? '' : `
                            <span class="calendar-event-meta">
                                ${showPetName && pet ? `<span>${PetTracker.UI.escapeHtml(pet.name || '')}</span>` : ''}
                                ${showPetName && pet && timeLabel ? '<span class="meta-separator">//</span>' : ''}
                                ${timeLabel ? `<span>${timeLabel}</span>` : ''}
                            </span>
                        `}
                    </span>
                    ${compact && count > 1 ? `<span class="calendar-event-count">x${count}</span>` : ''}
                </span>
            </button>
        `;
    },

    /**
     * Collapse repeated month events by pet/type/title to reduce dense rows.
     */
    getMonthCompactEventGroups: (dayEvents = []) => {
        const sorted = [...dayEvents].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        const grouped = new Map();

        for (const event of sorted) {
            const petId = event?.petIds?.[0] || '';
            const eventTypeId = event?.eventTypeId || '';
            const titleKey = (event?.title || '').trim().toLowerCase();
            const key = `${petId}::${eventTypeId}::${titleKey}`;

            if (!grouped.has(key)) {
                grouped.set(key, { event, count: 1 });
            } else {
                grouped.get(key).count += 1;
            }
        }

        return Array.from(grouped.values());
    },

    /**
     * Render month view
     */
    renderMonthView: (events) => {
        const { currentDate } = Calendar.state;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const isMobile = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startOffset = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        const today = new Date();
        const todayStr = PetTracker.UI.localDateYYYYMMDD(today);

        // Group events by date
        const eventsByDate = {};
        events.forEach(event => {
            const dateStr = event.startDate?.slice(0, 10);
            if (dateStr) {
                if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
                eventsByDate[dateStr].push(event);
            }
        });

        // Build calendar grid
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const compactDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        const dayLabels = isMobile ? compactDays : days;
        const maxEventsPerDay = isMobile ? 2 : 3;
        const weeks = [];
        let currentWeek = [];

        // Previous month padding
        for (let i = 0; i < startOffset; i++) {
            currentWeek.push(null);
        }

        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
            currentWeek.push(day);
            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }

        // Next month padding
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push(null);
            }
            weeks.push(currentWeek);
        }

        return `
            <div class="calendar-month">
                <!-- Day headers -->
                <div class="grid grid-cols-7 gap-1 mb-2">
                    ${dayLabels.map(d => `
                        <div class="font-mono text-xs uppercase text-earth-metal text-center py-2">${d}</div>
                    `).join('')}
                </div>

                <!-- Weeks -->
                <div class="grid grid-cols-7 gap-1">
                    ${weeks.map(week => week.map(day => {
            if (day === null) {
                return `<div class="calendar-day calendar-day-empty"></div>`;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const dayEvents = eventsByDate[dateStr] || [];
            const compactGroups = Calendar.getMonthCompactEventGroups(dayEvents);

            return `
                            <div class="calendar-day ${isToday ? 'calendar-day-today' : ''}" 
                                 onclick="Calendar.selectDate('${dateStr}')">
                                <div class="calendar-day-number ${isToday ? 'bg-dull-purple text-white-linen' : ''}">${day}</div>
                                <div class="calendar-day-events">
                                    ${compactGroups.slice(0, maxEventsPerDay).map(group => {
                return Calendar.renderEventChip(group.event, { compact: true, count: group.count });
            }).join('')}
                                    ${compactGroups.length > maxEventsPerDay ? `
                                        <div class="text-xs text-earth-metal">+${compactGroups.length - maxEventsPerDay} more</div>
                                    ` : ''}
                                </div>
                            </div>
                        `;
        }).join('')).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Render week view
     */
    renderWeekView: (events) => {
        const { currentDate } = Calendar.state;
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());

        const today = new Date();
        const todayStr = PetTracker.UI.localDateYYYYMMDD(today);

        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            days.push(date);
        }

        // Group events by date
        const eventsByDate = {};
        events.forEach(event => {
            const dateStr = event.startDate?.slice(0, 10);
            if (dateStr) {
                if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
                eventsByDate[dateStr].push(event);
            }
        });

        return `
            <div class="calendar-week">
                <div class="grid grid-cols-1 md:grid-cols-7 gap-2">
                    ${days.map(date => {
            const dateStr = PetTracker.UI.localDateYYYYMMDD(date);
            const isToday = dateStr === todayStr;
            const dayEvents = eventsByDate[dateStr] || [];

            return `
                            <div class="calendar-week-day ${isToday ? 'border-dull-purple' : 'border-oatmeal'} border p-3">
                                <div class="flex items-center justify-between mb-3">
                                    <span class="font-mono text-xs uppercase text-earth-metal">
                                        ${date.toLocaleDateString('en-US', { weekday: 'short' })}
                                    </span>
                                    <span class="font-serif text-lg ${isToday ? 'text-dull-purple' : 'text-charcoal'}">
                                        ${date.getDate()}
                                    </span>
                                </div>
                                <div class="space-y-2">
                                    ${dayEvents.length === 0 ? `
                                        <p class="text-xs text-earth-metal">No events</p>
                                    ` : dayEvents.map(event => {
                return Calendar.renderEventChip(event, { compact: false, showPetName: true });
            }).join('')}
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Render day view
     */
    renderDayView: (events) => {
        const currentDay = PetTracker.UI.localDateYYYYMMDD(Calendar.state.currentDate);
        const today = PetTracker.UI.localDateYYYYMMDD();
        const dayEvents = (events || [])
            .filter(e => (e.startDate || '').slice(0, 10) === currentDay)
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        const date = new Date(`${currentDay}T00:00:00`);
        const isToday = currentDay === today;

        return `
            <div class="space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-oatmeal p-3">
                    <div>
                        <p class="font-mono text-xs uppercase text-earth-metal">${date.toLocaleDateString('en-US', { weekday: 'long' })}</p>
                        <p class="font-serif text-xl text-charcoal">${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <div class="flex items-center gap-2 self-start sm:self-auto">
                        ${isToday ? '<span class="badge badge-accent text-[9px]">TODAY</span>' : ''}
                        <button onclick="App.openAddModal({ date: '${currentDay}' })" class="btn-secondary px-3 py-1.5 font-mono text-xs uppercase w-full sm:w-auto">
                            <i data-lucide="plus" class="w-3.5 h-3.5 inline mr-1"></i>Add Event
                        </button>
                    </div>
                </div>
                ${dayEvents.length === 0
                ? '<div class="border border-oatmeal p-8 text-center text-earth-metal">No events for this day</div>'
                : `<div class="space-y-2">
                        ${dayEvents.map(event => Calendar.renderEventChip(event, { compact: false, showPetName: true })).join('')}
                    </div>`
            }
            </div>
        `;
    },

    /**
     * Get header title based on view
     */
    getHeaderTitle: () => {
        const { currentDate, view } = Calendar.state;
        const options = { year: 'numeric', month: 'long' };

        if (view === 'day') {
            return currentDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }

        if (view === 'week') {
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - currentDate.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            if (weekStart.getMonth() === weekEnd.getMonth()) {
                return `${weekStart.toLocaleDateString('en-US', { month: 'long' })} ${weekStart.getDate()}-${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
            } else {
                return `${weekStart.toLocaleDateString('en-US', { month: 'short' })} ${weekStart.getDate()} - ${weekEnd.toLocaleDateString('en-US', { month: 'short' })} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
            }
        }

        return currentDate.toLocaleDateString('en-US', options);
    },

    /**
     * Get events for the currently visible date range (before filters).
     */
    getRangeEvents: async () => {
        let events;
        const { currentDate, view } = Calendar.state;

        if (view === 'week') {
            const start = new Date(currentDate);
            start.setDate(currentDate.getDate() - currentDate.getDay());
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            events = await Events.getForDateRange(start, end);
        } else if (view === 'day') {
            const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
            const end = new Date(start);
            events = await Events.getForDateRange(start, end);
        } else {
            const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            events = await Events.getForDateRange(start, end);
        }

        return events;
    },

    /**
     * Apply active filters to a set of events.
     */
    applyFilters: (events = []) => {
        let filtered = [...events];
        const { petIds, eventTypeIds, tags, severityLevelIds } = Calendar.state.filters;

        if (petIds.length > 0) {
            filtered = filtered.filter(e =>
                e.petIds?.some(id => petIds.includes(id))
            );
        }

        if (eventTypeIds.length > 0) {
            filtered = filtered.filter(e => eventTypeIds.includes(e.eventTypeId));
        }

        if (tags.length > 0) {
            filtered = filtered.filter(e =>
                e.tags?.some(t => tags.includes(t))
            );
        }

        if (severityLevelIds.length > 0) {
            filtered = filtered.filter(e =>
                e.severityLevelId && severityLevelIds.includes(e.severityLevelId)
            );
        }

        return filtered;
    },

    /**
     * Get filtered events.
     */
    getFilteredEvents: async () => {
        const events = await Calendar.getRangeEvents();
        return Calendar.applyFilters(events);
    },

    /**
     * Navigate to previous period
     */
    prev: () => {
        const { currentDate, view } = Calendar.state;
        if (view === 'month') {
            currentDate.setMonth(currentDate.getMonth() - 1);
        } else if (view === 'week') {
            currentDate.setDate(currentDate.getDate() - 7);
        } else if (view === 'day') {
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            currentDate.setMonth(currentDate.getMonth() - 1);
        }
        Calendar.saveState();
        Calendar.render();
    },

    /**
     * Navigate to next period
     */
    next: () => {
        const { currentDate, view } = Calendar.state;
        if (view === 'month') {
            currentDate.setMonth(currentDate.getMonth() + 1);
        } else if (view === 'week') {
            currentDate.setDate(currentDate.getDate() + 7);
        } else if (view === 'day') {
            currentDate.setDate(currentDate.getDate() + 1);
        } else {
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        Calendar.saveState();
        Calendar.render();
    },

    /**
     * Go to today
     */
    goToToday: () => {
        Calendar.state.currentDate = new Date();
        Calendar.saveState();
        Calendar.render();
    },

    /**
     * Save calendar state to localStorage
     */
    saveState: () => {
        PetTracker.Settings.setUIState({
            calendarView: Calendar.state.view,
            calendarDate: Calendar.state.currentDate.toISOString()
        });
    },

    /**
     * Set view type
     */
    setView: (view) => {
        const normalizedView = view === 'agenda' ? 'day' : view;
        Calendar.state.view = normalizedView;
        PetTracker.Settings.set({ calendarView: normalizedView });
        // Save to UI state as well
        PetTracker.Settings.setUIState({
            calendarView: normalizedView,
            calendarDate: Calendar.state.currentDate.toISOString()
        });
        Calendar.render();
    },

    /**
     * Select a date
     */
    selectDate: (dateStr) => {
        Calendar.state.selectedDate = dateStr;
        Calendar.state.currentDate = new Date(`${dateStr}T00:00:00`);
        Calendar.state.view = 'day';
        Calendar.saveState();
        Calendar.render();
    },

    /**
     * Update filters
     */
    updateFilters: () => {
        Calendar.persistFilters();
        Calendar.render();
    },

    persistFilters: () => {
        const firstPet = Calendar.state.filters.petIds[0] || null;
        PetTracker.Settings.setUIState({
            calendarFilterPetId: firstPet,
            calendarFilterPetIds: Calendar.state.filters.petIds,
            calendarFilterEventTypeIds: Calendar.state.filters.eventTypeIds,
            calendarFilterTags: Calendar.state.filters.tags,
            calendarFilterSeverityIds: Calendar.state.filters.severityLevelIds
        });
    },

    getEventTypeColorHex: (eventType, fallbackSeed = '') => {
        const palette = {
            red: '#ef4444',
            orange: '#f97316',
            amber: '#f59e0b',
            yellow: '#eab308',
            lime: '#84cc16',
            green: '#22c55e',
            teal: '#14b8a6',
            cyan: '#06b6d4',
            blue: '#3b82f6',
            indigo: '#6366f1',
            purple: '#8b5cf6',
            pink: '#ec4899'
        };
        const key = (eventType?.defaultColor || '').toLowerCase().trim();
        if (palette[key]) return palette[key];

        const seed = fallbackSeed || eventType?.id || eventType?.name || 'pet-tracker';
        let hash = 0;
        for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 62%, 52%)`;
    },

    cleanupDetailObjectUrls: () => {
        const urls = Calendar.state.detailObjectUrls || [];
        for (const url of urls) {
            if (typeof url === 'string' && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        }
        Calendar.state.detailObjectUrls = [];
    },

    buildAttachmentEntries: async (mediaItems = []) => {
        const entries = [];
        for (let i = 0; i < mediaItems.length; i++) {
            const media = mediaItems[i] || {};
            const mediaId = media.localId || media.id || '';
            const remoteUrl = (typeof media.url === 'string' && /^https?:\/\//i.test(media.url)) ? media.url : '';
            let previewUrl = '';
            let showPlaceholder = false;

            if (mediaId) {
                const blob = await PetTracker.MediaStore.get(`${mediaId}_preview`) ||
                    await PetTracker.MediaStore.get(`${mediaId}_poster`) ||
                    null;
                if (blob) {
                    previewUrl = URL.createObjectURL(blob);
                    Calendar.state.detailObjectUrls.push(previewUrl);
                } else if (remoteUrl) {
                    // Local preview was likely evicted; show placeholder and allow retrieval.
                    previewUrl = (typeof Media !== 'undefined' && Media.createPlaceholder)
                        ? Media.createPlaceholder()
                        : '';
                    showPlaceholder = true;
                }
            } else if (remoteUrl) {
                // Remote-only attachment from Notion: use direct preview URL.
                previewUrl = remoteUrl;
            }

            entries.push({
                name: media.name || `Attachment ${i + 1}`,
                previewUrl,
                retrieveUrl: remoteUrl,
                showPlaceholder
            });
        }
        return entries;
    },

    renderAttachmentSection: (entries = []) => {
        if (entries.length === 0) return '';
        return `
            <div>
                <div class="meta-row text-sm mb-2">
                    <span class="meta-label">ATTACHMENTS:</span>
                    <span class="meta-value">${entries.length}</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    ${entries.map(entry => `
                        <div class="border border-oatmeal p-2 space-y-2">
                            ${entry.previewUrl
                ? `<img src="${entry.previewUrl}" alt="${PetTracker.UI.escapeHtml(entry.name)}" class="w-full h-20 object-cover border border-oatmeal">`
                : `<div class="w-full h-20 bg-oatmeal flex items-center justify-center border border-oatmeal">
                                       <i data-lucide="file" class="w-5 h-5 text-earth-metal"></i>
                                   </div>`
            }
                            <p class="text-[10px] text-earth-metal truncate">${PetTracker.UI.escapeHtml(entry.name)}</p>
                            ${entry.retrieveUrl
                ? `<a href="${entry.retrieveUrl}" target="_blank" rel="noopener" class="btn-secondary w-full px-2 py-1 font-mono text-[10px] uppercase inline-flex items-center justify-center gap-1">
                                       <i data-lucide="${entry.showPlaceholder ? 'download-cloud' : 'external-link'}" class="w-3 h-3"></i>
                                       ${entry.showPlaceholder ? 'Retrieve from Notion' : 'Open'}
                                   </a>`
                : ''
            }
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Show event detail (drawer)
     */
    showEventDetail: async (eventId) => {
        Calendar.closeEventDetail();

        const event = await PetTracker.DB.get(PetTracker.STORES.EVENTS, eventId);
        if (!event) return;

        const pet = App.state.pets.find(p => p.id === event.petIds?.[0]);
        const eventType = App.state.eventTypes.find(t => t.id === event.eventTypeId);
        const provider = event.providerId
            ? await PetTracker.DB.get(PetTracker.STORES.CONTACTS, event.providerId)
            : null;
        const attachments = await Calendar.buildAttachmentEntries(event.media || []);

        // Determine icon to show
        const defaultIcon = eventType?.defaultIcon || 'activity';
        let iconHtml;
        if (event.icon) {
            iconHtml = PetTracker.UI.renderIcon(event.icon, defaultIcon, 'w-6 h-6');
        } else if (eventType?.icon) {
            iconHtml = PetTracker.UI.renderIcon(eventType.icon, defaultIcon, 'w-6 h-6');
        } else {
            iconHtml = `<i data-lucide="${defaultIcon}" class="w-6 h-6 text-earth-metal"></i>`;
        }

        // Create a simple drawer/modal for event detail
        const drawer = document.createElement('div');
        drawer.id = 'eventDetailDrawer';
        drawer.className = 'fixed inset-0 z-50 flex items-end md:items-center justify-center';
        drawer.innerHTML = `
            <div class="absolute inset-0 modal-overlay" onclick="Calendar.closeEventDetail()"></div>
            <div class="relative bg-white-linen border border-oatmeal w-full md:max-w-md max-h-[80vh] overflow-y-auto z-10 animate-slide-up">
                <div class="sticky top-0 bg-white-linen border-b border-oatmeal p-4 flex items-center justify-between">
                    <span class="section-header">Event Detail</span>
                    <button onclick="Calendar.closeEventDetail()" class="p-1 text-earth-metal hover:text-charcoal">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="p-4 space-y-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-oatmeal flex items-center justify-center flex-shrink-0">
                            ${iconHtml}
                        </div>
                        <h3 class="font-serif text-xl text-charcoal">${PetTracker.UI.escapeHtml(event.title || 'Event')}</h3>
                    </div>
                    
                    <div class="meta-row text-sm">
                        ${pet ? `
                            <span class="meta-label">PET:</span>
                            <span class="meta-value">${PetTracker.UI.escapeHtml(pet.name)}</span>
                        ` : ''}
                        ${eventType ? `
                            <span class="meta-separator">//</span>
                            <span class="meta-label">TYPE:</span>
                            <span class="meta-value">${PetTracker.UI.escapeHtml(eventType.name)}</span>
                        ` : ''}
                    </div>

                    <div class="meta-row text-sm">
                        <span class="meta-label">DATE:</span>
                        <span class="meta-value">${PetTracker.UI.formatDate(event.startDate)}</span>
                        ${event.startDate.includes('T') ? `
                            <span class="meta-separator">//</span>
                            <span class="meta-label">TIME:</span>
                            <span class="meta-value">${PetTracker.UI.formatTime(event.startDate)}</span>
                        ` : ''}
                    </div>

                    <div class="flex items-center gap-2">
                        <span class="badge ${event.status === 'Completed' ? 'badge-accent' : event.status === 'Missed' ? 'badge-pink' : 'badge-light'}">
                            ${event.status}
                        </span>
                        ${event.source ? `<span class="badge badge-light">${event.source}</span>` : ''}
                    </div>

                    ${event.value !== null && event.value !== undefined ? `
                        <div class="meta-row text-sm">
                            <span class="meta-label">VALUE:</span>
                            <span class="meta-value">${event.value} ${event.unit || ''}</span>
                        </div>
                    ` : ''}

                    ${event.endDate ? `
                        <div class="meta-row text-sm">
                            <span class="meta-label">END:</span>
                            <span class="meta-value">${PetTracker.UI.formatDate(event.endDate)}</span>
                            ${event.endDate.includes('T') ? `
                                <span class="meta-separator">//</span>
                                <span class="meta-label">TIME:</span>
                                <span class="meta-value">${PetTracker.UI.formatTime(event.endDate)}</span>
                            ` : ''}
                        </div>
                    ` : ''}

                    ${event.duration !== null && event.duration !== undefined ? `
                        <div class="meta-row text-sm">
                            <span class="meta-label">DURATION:</span>
                            <span class="meta-value">${event.duration} min</span>
                        </div>
                    ` : ''}

                    ${(event.cost !== null && event.cost !== undefined) ? `
                        <div class="meta-row text-sm">
                            <span class="meta-label">COST:</span>
                            <span class="meta-value">${event.cost} ${event.costCurrency || ''}</span>
                            ${event.costCategory ? `
                                <span class="meta-separator">//</span>
                                <span class="meta-value">${PetTracker.UI.escapeHtml(event.costCategory)}</span>
                            ` : ''}
                        </div>
                    ` : ''}

                    ${provider ? `
                        <div class="meta-row text-sm">
                            <span class="meta-label">PROVIDER:</span>
                            <span class="meta-value">${PetTracker.UI.escapeHtml(provider.name)}</span>
                        </div>
                    ` : ''}

                    ${Calendar.renderAttachmentSection(attachments)}

                    ${event.notes ? `
                        <div>
                            <span class="font-mono text-xs uppercase text-earth-metal">Notes</span>
                            <p class="text-sm text-charcoal mt-1">${PetTracker.UI.escapeHtml(event.notes)}</p>
                        </div>
                    ` : ''}

                    ${event.tags?.length > 0 ? `
                        <div class="flex flex-wrap gap-1">
                            ${event.tags.map(t => `<span class="badge badge-light">${t}</span>`).join('')}
                        </div>
                    ` : ''}

                    <!-- Add to Calendar -->
                    <div class="pt-4 border-t border-oatmeal">
                        <span class="font-mono text-xs uppercase text-earth-metal block mb-2">Add to Calendar</span>
                        <div class="flex gap-2 flex-wrap">
                            <button onclick="CalendarExport.exportSingleEvent('${event.id}')" class="btn-secondary px-3 py-1.5 font-mono text-xs uppercase">
                                <i data-lucide="download" class="w-3 h-3 inline mr-1"></i>ICS
                            </button>
                            <button onclick="CalendarExport.openGoogleCalendar('${event.id}')" class="btn-secondary px-3 py-1.5 font-mono text-xs uppercase">
                                <i data-lucide="calendar" class="w-3 h-3 inline mr-1"></i>Google
                            </button>
                        </div>
                    </div>

                    <div class="flex gap-3 pt-4 border-t border-oatmeal">
                        <button onclick="Events.showEditModal('${event.id}')" class="btn-secondary px-4 py-2 font-mono text-xs uppercase">
                            <i data-lucide="pencil" class="w-3 h-3 inline mr-1"></i>Edit
                        </button>
                        <button onclick="Events.confirmDelete('${event.id}')" class="btn-secondary px-4 py-2 font-mono text-xs uppercase text-muted-pink">
                            <i data-lucide="trash-2" class="w-3 h-3 inline mr-1"></i>Delete
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(drawer);
        if (window.lucide) lucide.createIcons();
    },

    /**
     * Close event detail drawer
     */
    closeEventDetail: () => {
        const drawer = document.getElementById('eventDetailDrawer');
        if (drawer) drawer.remove();
        Calendar.cleanupDetailObjectUrls();
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.Calendar = Calendar;
window.Calendar = Calendar;
