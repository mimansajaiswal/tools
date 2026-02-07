/**
 * Pet Tracker - Analytics Module
 * Correlation views, trends, and dashboards
 */

const Analytics = {
    state: {
        selectedPetId: null,
        correlationWindow: '24h', // 6h, 12h, 24h, 48h, 7d, custom
        customWindowHours: 24,
        primaryEventType: null,
        secondaryEventType: null,
        heatmapRangeDays: 365,
        heatmapRangeKey: '365',
        heatmapEventTypeIds: [],
        heatmapInitialized: false,
        heatmapTypesSearch: '',
        heatmapControlsInitialized: false
    },

    TIME_WINDOWS: {
        '6h': 6,
        '12h': 12,
        '24h': 24,
        '48h': 48,
        '7d': 168
    },

    HEATMAP_RANGES: {
        '30': 30,
        '90': 90,
        '180': 180,
        '365': 365,
        '730': 730
    },

    HEATMAP_RANGE_OPTIONS: [
        { key: '30', label: 'Last 30 days' },
        { key: '90', label: 'Last 90 days' },
        { key: '180', label: 'Last 180 days' },
        { key: '365', label: 'Last 12 months' },
        { key: '730', label: 'Last 24 months' }
    ],

    /**
     * Render the analytics view
     */
    render: async () => {
        const container = document.querySelector('[data-view="analytics"]');
        if (!container) return;

        const pets = App.state.pets;
        const events = await PetTracker.DB.getAll(PetTracker.STORES.EVENTS);
        const eventTypes = App.state.eventTypes;
        Analytics.syncHeatmapEventTypeState(eventTypes);

        container.innerHTML = `
            <div class="p-4 space-y-6">
                <!-- Filters -->
                <div class="flex flex-wrap items-center gap-4">
                    <div>
                        <label class="font-mono text-xs uppercase text-earth-metal block mb-1">Pet</label>
                        <select id="analyticsPetFilter" class="select-field text-sm" onchange="Analytics.updateFilters()">
                            <option value="">All Pets</option>
                            ${pets.map(p => `
                                <option value="${p.id}" ${p.id === Analytics.state.selectedPetId ? 'selected' : ''}>
                                    ${PetTracker.UI.escapeHtml(p.name)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <!-- Weight Trends -->
                <div class="card p-4">
                    ${PetTracker.UI.sectionHeader(1, 'Weight Trends')}
                    <div id="weightTrendContainer" class="mt-4">
                        <canvas id="weightChart" height="200"></canvas>
                    </div>
                    <div id="weightStats" class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4"></div>
                </div>

                <!-- Activity Overview -->
                <div class="card p-4">
                    ${PetTracker.UI.sectionHeader(2, 'Event Activity Overview')}
                    <div class="mt-4 space-y-4">
                        <div class="flex flex-wrap items-end gap-4">
                            <div>
                                <label class="font-mono text-xs uppercase text-earth-metal block mb-1">Time Range</label>
                                <div class="combobox-container">
                                    <input type="text" id="activityHeatmapRangeInput" class="input-field combobox-input text-sm cursor-pointer" readonly
                                        onclick="Analytics.toggleHeatmapRangeDropdown()">
                                    <div id="activityHeatmapRangeDropdown" class="combobox-dropdown"></div>
                                </div>
                            </div>
                            <div class="min-w-[260px] ml-auto">
                                <label class="font-mono text-xs uppercase text-earth-metal block mb-1">Event Types</label>
                                <div class="multiselect-dropdown" id="activityHeatmapTypesDropdown">
                                    <button type="button" class="multiselect-trigger input-field flex items-center justify-between"
                                        onclick="Analytics.toggleHeatmapTypesMenu()" aria-expanded="false">
                                        <span id="activityHeatmapTypesLabel" class="multiselect-label text-sm text-earth-metal">Select event types...</span>
                                        <i data-lucide="chevron-down" class="w-4 h-4 text-earth-metal transition-transform"></i>
                                    </button>
                                    <div id="activityHeatmapTypesMenu"
                                        class="multiselect-menu hidden absolute z-20 mt-1 w-full bg-white-linen border border-oatmeal shadow-lg max-h-72 overflow-y-auto p-2 space-y-2">
                                        <input type="text" id="activityHeatmapTypesSearch" class="input-field"
                                            placeholder="Search event types..." oninput="Analytics.handleHeatmapTypeSearch(this.value)">
                                        <div id="activityHeatmapTypeFilters" class="space-y-1"></div>
                                        <div class="pt-2 border-t border-oatmeal flex gap-2">
                                            <button type="button" onclick="Analytics.toggleHeatmapEventTypes('all')" class="btn-secondary px-2 py-1 font-mono text-[10px] uppercase">All</button>
                                            <button type="button" onclick="Analytics.toggleHeatmapEventTypes('none')" class="btn-secondary px-2 py-1 font-mono text-[10px] uppercase">None</button>
                                        </div>
                                    </div>
                                    <div id="activityHeatmapTypesChips" class="multiselect-tags mt-2 hidden"></div>
                                </div>
                            </div>
                        </div>

                        <div id="activityHeatmapSummary" class="grid grid-cols-1 md:grid-cols-3 gap-3"></div>
                        <div id="activityHeatmapContainer" class="overflow-x-auto"></div>
                        <div id="activityHeatmapLegend" class="text-xs text-earth-metal"></div>
                    </div>
                </div>

                <!-- Correlation View -->
                <div class="card p-4">
                    ${PetTracker.UI.sectionHeader(3, 'Event Correlation')}
                    <div class="mt-4 space-y-4">
                        <div class="flex flex-wrap items-end gap-4">
                            <div>
                                <label class="font-mono text-xs uppercase text-earth-metal block mb-1">Primary Event</label>
                                <select id="correlationPrimary" class="select-field text-sm" onchange="Analytics.updateCorrelation()">
                                    <option value="">Select event type...</option>
                                    ${eventTypes.map(t => `
                                        <option value="${t.id}" ${t.id === Analytics.state.primaryEventType ? 'selected' : ''}>
                                            ${PetTracker.UI.escapeHtml(t.name)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="font-mono text-xs uppercase text-earth-metal block mb-1">Secondary Event</label>
                                <select id="correlationSecondary" class="select-field text-sm" onchange="Analytics.updateCorrelation()">
                                    <option value="">Select event type...</option>
                                    ${eventTypes.map(t => `
                                        <option value="${t.id}" ${t.id === Analytics.state.secondaryEventType ? 'selected' : ''}>
                                            ${PetTracker.UI.escapeHtml(t.name)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="font-mono text-xs uppercase text-earth-metal block mb-1">Time Window</label>
                                <select id="correlationWindow" class="select-field text-sm" onchange="Analytics.updateCorrelation()">
                                    <option value="6h" ${Analytics.state.correlationWindow === '6h' ? 'selected' : ''}>6 hours</option>
                                    <option value="12h" ${Analytics.state.correlationWindow === '12h' ? 'selected' : ''}>12 hours</option>
                                    <option value="24h" ${Analytics.state.correlationWindow === '24h' ? 'selected' : ''}>24 hours</option>
                                    <option value="48h" ${Analytics.state.correlationWindow === '48h' ? 'selected' : ''}>48 hours</option>
                                    <option value="7d" ${Analytics.state.correlationWindow === '7d' ? 'selected' : ''}>7 days</option>
                                </select>
                            </div>
                        </div>
                        <div id="correlationResults" class="border border-oatmeal p-4 bg-oatmeal/10">
                            <p class="text-earth-metal text-sm">Select two event types to see correlations</p>
                        </div>
                    </div>
                </div>

                <!-- Adherence -->
                <div class="card p-4">
                    ${PetTracker.UI.sectionHeader(4, 'Care Adherence')}
                    <div id="adherenceStats" class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4"></div>
                </div>


            </div>
        `;

        if (window.lucide) lucide.createIcons();
        Analytics.initHeatmapControls(eventTypes);

        // Render charts after DOM is ready
        await Analytics.renderEventHeatmap(events, eventTypes);
        await Analytics.renderWeightChart(events);
        await Analytics.renderAdherenceStats();
        await Analytics.updateCorrelation();
    },

    /**
     * Update filters and re-render
     */
    updateFilters: () => {
        Analytics.state.selectedPetId = document.getElementById('analyticsPetFilter')?.value || null;
        Analytics.render();
    },

    /**
     * Keep heatmap event-type selection stable across renders.
     */
    syncHeatmapEventTypeState: (eventTypes) => {
        const validIds = new Set((eventTypes || []).map(t => t.id));
        if (!Analytics.state.heatmapInitialized) {
            Analytics.state.heatmapEventTypeIds = Array.from(validIds);
            Analytics.state.heatmapInitialized = true;
        } else {
            Analytics.state.heatmapEventTypeIds = (Analytics.state.heatmapEventTypeIds || [])
                .filter(id => validIds.has(id));
        }

        const rangeKey = Object.keys(Analytics.HEATMAP_RANGES)
            .find(key => Analytics.HEATMAP_RANGES[key] === Analytics.state.heatmapRangeDays) || '365';
        Analytics.state.heatmapRangeKey = Analytics.HEATMAP_RANGES[Analytics.state.heatmapRangeKey]
            ? Analytics.state.heatmapRangeKey
            : rangeKey;
        Analytics.state.heatmapRangeDays = Analytics.HEATMAP_RANGES[Analytics.state.heatmapRangeKey] || 365;
    },

    initHeatmapControls: (eventTypes) => {
        Analytics.renderHeatmapRangeOptions();
        Analytics.updateHeatmapRangeInputLabel();
        Analytics.renderHeatmapTypeOptions(eventTypes);
        Analytics.updateHeatmapTypeLabel(eventTypes);

        const searchInput = document.getElementById('activityHeatmapTypesSearch');
        if (searchInput) {
            searchInput.value = Analytics.state.heatmapTypesSearch || '';
        }

        if (!Analytics.state.heatmapControlsInitialized) {
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#activityHeatmapRangeInput') && !e.target.closest('#activityHeatmapRangeDropdown')) {
                    Analytics.closeHeatmapRangeDropdown();
                }
                if (!e.target.closest('#activityHeatmapTypesDropdown')) {
                    Analytics.closeHeatmapTypesMenu();
                }
            });
            Analytics.state.heatmapControlsInitialized = true;
        }
    },

    renderHeatmapRangeOptions: () => {
        const dropdown = document.getElementById('activityHeatmapRangeDropdown');
        if (!dropdown) return;

        dropdown.innerHTML = Analytics.HEATMAP_RANGE_OPTIONS.map((option, idx) => `
            <div class="combobox-option ${option.key === Analytics.state.heatmapRangeKey || (!Analytics.state.heatmapRangeKey && idx === 0) ? 'highlighted' : ''}" data-value="${option.key}">
                ${option.label}
            </div>
        `).join('');

        dropdown.querySelectorAll('.combobox-option[data-value]').forEach(opt => {
            opt.addEventListener('mousedown', (e) => {
                e.preventDefault();
                Analytics.selectHeatmapRange(opt.dataset.value);
            });
        });
    },

    updateHeatmapRangeInputLabel: () => {
        const input = document.getElementById('activityHeatmapRangeInput');
        if (!input) return;
        const selected = Analytics.HEATMAP_RANGE_OPTIONS.find(option => option.key === Analytics.state.heatmapRangeKey);
        input.value = selected?.label || 'Last 12 months';
    },

    openHeatmapRangeDropdown: () => {
        const dropdown = document.getElementById('activityHeatmapRangeDropdown');
        if (dropdown) dropdown.classList.add('open');
    },

    closeHeatmapRangeDropdown: () => {
        const dropdown = document.getElementById('activityHeatmapRangeDropdown');
        if (dropdown) dropdown.classList.remove('open');
    },

    toggleHeatmapRangeDropdown: () => {
        const dropdown = document.getElementById('activityHeatmapRangeDropdown');
        if (!dropdown) return;
        const willOpen = !dropdown.classList.contains('open');
        if (willOpen) {
            Analytics.renderHeatmapRangeOptions();
            Analytics.openHeatmapRangeDropdown();
        } else {
            Analytics.closeHeatmapRangeDropdown();
        }
    },

    selectHeatmapRange: async (rangeKey) => {
        if (!Analytics.HEATMAP_RANGES[rangeKey]) return;
        Analytics.state.heatmapRangeKey = rangeKey;
        Analytics.state.heatmapRangeDays = Analytics.HEATMAP_RANGES[rangeKey];
        Analytics.updateHeatmapRangeInputLabel();
        Analytics.closeHeatmapRangeDropdown();
        await Analytics.updateHeatmapFilters();
    },

    toggleHeatmapTypesMenu: () => {
        const menu = document.getElementById('activityHeatmapTypesMenu');
        const trigger = document.querySelector('#activityHeatmapTypesDropdown .multiselect-trigger');
        if (!menu || !trigger) return;

        const shouldOpen = menu.classList.contains('hidden');
        if (shouldOpen) {
            menu.classList.remove('hidden');
            trigger.setAttribute('aria-expanded', 'true');
            const search = document.getElementById('activityHeatmapTypesSearch');
            if (search) {
                search.focus();
                search.select();
            }
            Analytics.renderHeatmapTypeOptions(App.state.eventTypes || []);
        } else {
            Analytics.closeHeatmapTypesMenu();
        }
    },

    closeHeatmapTypesMenu: () => {
        const menu = document.getElementById('activityHeatmapTypesMenu');
        const trigger = document.querySelector('#activityHeatmapTypesDropdown .multiselect-trigger');
        if (menu) menu.classList.add('hidden');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
    },

    handleHeatmapTypeSearch: (value = '') => {
        Analytics.state.heatmapTypesSearch = value;
        Analytics.renderHeatmapTypeOptions(App.state.eventTypes || []);
    },

    toggleHeatmapTypeSelection: async (eventTypeId) => {
        const selected = new Set(Analytics.state.heatmapEventTypeIds || []);
        if (selected.has(eventTypeId)) selected.delete(eventTypeId);
        else selected.add(eventTypeId);
        Analytics.state.heatmapEventTypeIds = Array.from(selected);

        Analytics.renderHeatmapTypeOptions(App.state.eventTypes || []);
        Analytics.updateHeatmapTypeLabel(App.state.eventTypes || []);
        await Analytics.updateHeatmapFilters();
    },

    renderHeatmapTypeOptions: (eventTypes) => {
        const container = document.getElementById('activityHeatmapTypeFilters');
        if (!container) return;

        const search = (Analytics.state.heatmapTypesSearch || '').trim().toLowerCase();
        const selected = new Set(Analytics.state.heatmapEventTypeIds || []);
        const sortedTypes = [...(eventTypes || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        const filtered = sortedTypes.filter(t => !search || (t.name || '').toLowerCase().includes(search));

        if (filtered.length === 0) {
            container.innerHTML = '<div class="text-xs text-earth-metal px-2 py-1">No matching event types</div>';
            return;
        }

        container.innerHTML = filtered.map(t => `
            <label class="multiselect-option">
                <input type="checkbox" ${selected.has(t.id) ? 'checked' : ''} onchange="Analytics.toggleHeatmapTypeSelection('${t.id}')">
                <span class="inline-block w-2.5 h-2.5 rounded-full" style="background:${Analytics.getEventTypeColorHex(t)}"></span>
                <span>${PetTracker.UI.escapeHtml(t.name || 'Untitled')}</span>
            </label>
        `).join('');
    },

    updateHeatmapTypeLabel: (eventTypes) => {
        const label = document.getElementById('activityHeatmapTypesLabel');
        const chips = document.getElementById('activityHeatmapTypesChips');
        if (!label || !chips) return;

        const selectedSet = new Set(Analytics.state.heatmapEventTypeIds || []);
        const selectedTypes = (eventTypes || [])
            .filter(t => selectedSet.has(t.id))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        if (selectedTypes.length === 0) {
            label.textContent = 'No event types selected';
            label.className = 'multiselect-label text-sm text-earth-metal';
            chips.innerHTML = '';
            chips.classList.add('hidden');
            return;
        }

        const preview = selectedTypes.slice(0, 2).map(t => t.name || 'Untitled').join(', ');
        label.innerHTML = selectedTypes.length > 2
            ? `${PetTracker.UI.escapeHtml(preview)} <span class="multiselect-selected-count">+${selectedTypes.length - 2}</span>`
            : PetTracker.UI.escapeHtml(preview);
        label.className = 'multiselect-label text-sm text-charcoal';

        chips.classList.remove('hidden');
        chips.innerHTML = selectedTypes.slice(0, 5).map(t => `
            <span class="multiselect-tag">
                ${PetTracker.UI.escapeHtml(t.name || 'Untitled')}
                <button type="button" aria-label="Remove ${PetTracker.UI.escapeHtml(t.name || 'type')}" onclick="Analytics.toggleHeatmapTypeSelection('${t.id}')">×</button>
            </span>
        `).join('') + (selectedTypes.length > 5 ? `<span class="text-xs text-earth-metal">+${selectedTypes.length - 5} more</span>` : '');
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

    /**
     * Update heatmap controls without re-rendering all analytics cards.
     */
    updateHeatmapFilters: async () => {
        Analytics.updateHeatmapRangeInputLabel();
        Analytics.updateHeatmapTypeLabel(App.state.eventTypes || []);
        const events = await PetTracker.DB.getAll(PetTracker.STORES.EVENTS);
        await Analytics.renderEventHeatmap(events, App.state.eventTypes || []);
    },

    toggleHeatmapEventTypes: async (mode) => {
        const eventTypes = App.state.eventTypes || [];
        if (mode === 'all') {
            Analytics.state.heatmapEventTypeIds = eventTypes.map(t => t.id);
        } else if (mode === 'none') {
            Analytics.state.heatmapEventTypeIds = [];
        }

        Analytics.renderHeatmapTypeOptions(eventTypes);
        Analytics.updateHeatmapTypeLabel(eventTypes);
        await Analytics.updateHeatmapFilters();
    },

    /**
     * Render month-by-month day-square activity overview.
     */
    renderEventHeatmap: async (allEvents, eventTypes) => {
        const heatmapContainer = document.getElementById('activityHeatmapContainer');
        const summaryContainer = document.getElementById('activityHeatmapSummary');
        const legendContainer = document.getElementById('activityHeatmapLegend');
        if (!heatmapContainer || !summaryContainer || !legendContainer) return;

        const sortedTypes = [...(eventTypes || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        const selectedTypeIds = new Set(Analytics.state.heatmapEventTypeIds || []);

        const now = new Date();
        now.setHours(23, 59, 59, 999);
        const days = Analytics.state.heatmapRangeDays || 365;
        const from = new Date(now);
        from.setHours(0, 0, 0, 0);
        from.setDate(from.getDate() - (days - 1));

        let events = (allEvents || []).filter(e => e.startDate && e.eventTypeId);
        if (Analytics.state.selectedPetId) {
            events = events.filter(e => e.petIds?.includes(Analytics.state.selectedPetId));
        }
        if (selectedTypeIds.size > 0) {
            events = events.filter(e => selectedTypeIds.has(e.eventTypeId));
        } else {
            events = [];
        }
        events = events.filter(e => {
            const d = new Date(e.startDate);
            return !Number.isNaN(d.getTime()) && d >= from && d <= now;
        });

        const dayMap = new Map();
        for (const event of events) {
            const d = new Date(event.startDate);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!dayMap.has(key)) dayMap.set(key, { count: 0, typeCounts: new Map() });
            const entry = dayMap.get(key);
            entry.count++;
            entry.typeCounts.set(event.eventTypeId, (entry.typeCounts.get(event.eventTypeId) || 0) + 1);
        }

        const maxDailyCount = Math.max(0, ...Array.from(dayMap.values()).map(v => v.count));
        const activeDays = dayMap.size;
        const totalEvents = events.length;

        summaryContainer.innerHTML = `
            <div class="border border-oatmeal p-3 text-center">
                <span class="font-mono text-[10px] uppercase text-earth-metal">Days With Activity</span>
                <p class="font-serif text-2xl text-charcoal">${activeDays}</p>
            </div>
            <div class="border border-oatmeal p-3 text-center">
                <span class="font-mono text-[10px] uppercase text-earth-metal">Total Events</span>
                <p class="font-serif text-2xl text-charcoal">${totalEvents}</p>
            </div>
            <div class="border border-oatmeal p-3 text-center">
                <span class="font-mono text-[10px] uppercase text-earth-metal">Max / Day</span>
                <p class="font-serif text-2xl text-charcoal">${maxDailyCount}</p>
            </div>
        `;

        if (selectedTypeIds.size === 0) {
            heatmapContainer.innerHTML = '<p class="text-earth-metal text-sm p-3 border border-oatmeal">Select at least one event type to render activity overview.</p>';
            legendContainer.innerHTML = '';
            return;
        }

        if (events.length === 0) {
            heatmapContainer.innerHTML = '<p class="text-earth-metal text-sm p-3 border border-oatmeal">No activity found in the selected range.</p>';
            const selectedTypes = sortedTypes.filter(t => selectedTypeIds.has(t.id));
            legendContainer.innerHTML = selectedTypes.length > 0
                ? `<p class="pt-1">Selected ${selectedTypes.length} event type${selectedTypes.length === 1 ? '' : 's'}.</p>`
                : '';
            return;
        }

        const typeById = new Map(sortedTypes.map(t => [t.id, t]));
        const firstEventDate = events.reduce((earliest, event) => {
            const date = new Date(event.startDate);
            if (Number.isNaN(date.getTime())) return earliest;
            if (!earliest || date < earliest) return date;
            return earliest;
        }, null);

        const rangeStartMonth = new Date(from.getFullYear(), from.getMonth(), 1);
        const firstActiveMonth = firstEventDate
            ? new Date(firstEventDate.getFullYear(), firstEventDate.getMonth(), 1)
            : rangeStartMonth;
        const monthCursor = firstActiveMonth > rangeStartMonth
            ? new Date(firstActiveMonth)
            : new Date(rangeStartMonth);
        const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthRows = [];

        while (monthCursor <= endMonth) {
            const year = monthCursor.getFullYear();
            const month = monthCursor.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const monthName = monthCursor.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

            const cells = [];
            for (let day = 1; day <= 31; day++) {
                if (day > daysInMonth) {
                    cells.push('<div class="w-4 h-4"></div>');
                    continue;
                }

                const date = new Date(year, month, day);
                const inRange = date >= from && date <= now;
                if (!inRange) {
                    cells.push('<div class="w-4 h-4 border border-transparent"></div>');
                    continue;
                }

                const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const entry = dayMap.get(key);
                const count = entry?.count || 0;
                const ratio = maxDailyCount > 0 ? (count / maxDailyCount) : 0;
                const alpha = count === 0 ? 0.05 : (0.15 + (ratio * 0.75));
                const bg = count === 0 ? `rgba(212,200,184,${alpha.toFixed(2)})` : `rgba(139,123,142,${alpha.toFixed(2)})`;

                let markerHtml = '';
                if (entry && entry.typeCounts.size > 0) {
                    const sortedTypeCounts = [...entry.typeCounts.entries()].sort((a, b) => b[1] - a[1]);
                    const dotLimit = selectedTypeIds.size > 6 ? 2 : 3;
                    const visible = sortedTypeCounts.slice(0, dotLimit);
                    const extra = sortedTypeCounts.length - visible.length;
                    markerHtml = `
                        <div class="absolute bottom-0.5 left-0.5 right-0.5 flex items-center gap-[1px]">
                            ${visible.map(([typeId]) => {
                        const t = typeById.get(typeId);
                        const color = Analytics.getEventTypeColorHex(t, typeId);
                        return `<span class="w-[3px] h-[3px] rounded-full" style="background:${color}"></span>`;
                    }).join('')}
                            ${extra > 0 ? `<span class="text-[7px] leading-none text-earth-metal">+${extra}</span>` : ''}
                        </div>
                    `;
                }

                const title = `${key}: ${count} event${count === 1 ? '' : 's'}`;
                cells.push(`
                    <div class="relative w-4 h-4 border border-white-linen/80" style="background:${bg}" title="${title}">
                        ${count > 0 ? `<span class="absolute inset-0 flex items-center justify-center text-[8px] leading-none font-mono text-charcoal">${count > 9 ? '9+' : count}</span>` : ''}
                        ${markerHtml}
                    </div>
                `);
            }

            monthRows.push(`
                <div class="grid grid-cols-[72px_repeat(31,minmax(0,1fr))] gap-1 items-center">
                    <div class="text-[10px] font-mono uppercase text-earth-metal">${monthName}</div>
                    ${cells.join('')}
                </div>
            `);

            monthCursor.setMonth(monthCursor.getMonth() + 1);
        }

        const dayHeader = Array.from({ length: 31 }, (_, i) => `<div class="text-[9px] text-earth-metal text-center">${i + 1}</div>`).join('');
        heatmapContainer.innerHTML = `
            <div class="min-w-[760px] space-y-1">
                <div class="grid grid-cols-[72px_repeat(31,minmax(0,1fr))] gap-1 items-center sticky top-0 bg-white-linen/95 py-1">
                    <div></div>
                    ${dayHeader}
                </div>
                ${monthRows.join('')}
            </div>
        `;

        const selectedTypes = sortedTypes.filter(t => selectedTypeIds.has(t.id));
        legendContainer.innerHTML = `
            <div class="flex flex-wrap items-center gap-3 pt-2">
                <span class="font-mono text-[10px] uppercase">Legend</span>
                ${selectedTypes.slice(0, 8).map(t => `
                    <span class="inline-flex items-center gap-1">
                        <span class="w-2.5 h-2.5 rounded-full" style="background:${Analytics.getEventTypeColorHex(t)}"></span>
                        <span>${PetTracker.UI.escapeHtml(t.name || 'Untitled')}</span>
                    </span>
                `).join('')}
                ${selectedTypes.length > 8 ? `<span>+${selectedTypes.length - 8} more</span>` : ''}
            </div>
            <p class="pt-1">Square shade = daily volume. Dots = top event types that day.</p>
        `;
    },

    /**
     * Render weight trend chart
     */
    renderWeightChart: async (allEvents) => {
        const canvas = document.getElementById('weightChart');
        const statsContainer = document.getElementById('weightStats');
        if (!canvas || !statsContainer) return;

        // Get weight event type
        const weightType = App.state.eventTypes.find(t =>
            t.name.toLowerCase().includes('weight') || t.category === 'Weight'
        );

        if (!weightType) {
            statsContainer.innerHTML = '<p class="text-earth-metal text-sm col-span-full">No weight event type configured</p>';
            return;
        }

        // Filter weight events
        let weightEvents = allEvents.filter(e => e.eventTypeId === weightType.id && e.value !== null);

        // Apply pet filter
        if (Analytics.state.selectedPetId) {
            weightEvents = weightEvents.filter(e => e.petIds?.includes(Analytics.state.selectedPetId));
        }

        // Sort by date
        weightEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        if (weightEvents.length === 0) {
            statsContainer.innerHTML = '<p class="text-earth-metal text-sm col-span-full">No weight data recorded</p>';
            return;
        }

        // Calculate stats
        const weights = weightEvents.map(e => e.value);
        const latest = weights[weights.length - 1];
        const oldest = weights[0];
        const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
        const change = latest - oldest;
        const changePercent = ((change / oldest) * 100).toFixed(1);

        // Get target from pet
        let targetMin = null, targetMax = null, unit = 'lb';
        if (Analytics.state.selectedPetId) {
            const pet = App.state.pets.find(p => p.id === Analytics.state.selectedPetId);
            if (pet) {
                targetMin = pet.targetWeightMin;
                targetMax = pet.targetWeightMax;
                unit = pet.weightUnit || 'lb';
            }
        }

        // Render stats
        statsContainer.innerHTML = `
            <div class="text-center">
                <span class="font-mono text-xs uppercase text-earth-metal">Current</span>
                <p class="font-serif text-2xl text-charcoal">${latest.toFixed(1)} <span class="text-sm">${unit}</span></p>
            </div>
            <div class="text-center">
                <span class="font-mono text-xs uppercase text-earth-metal">Average</span>
                <p class="font-serif text-2xl text-charcoal">${avg.toFixed(1)} <span class="text-sm">${unit}</span></p>
            </div>
            <div class="text-center">
                <span class="font-mono text-xs uppercase text-earth-metal">Change</span>
                <p class="font-serif text-2xl ${change > 0 ? 'text-muted-pink' : change < 0 ? 'text-dull-purple' : 'text-charcoal'}">
                    ${change > 0 ? '+' : ''}${change.toFixed(1)} <span class="text-sm">(${changePercent}%)</span>
                </p>
            </div>
            <div class="text-center">
                <span class="font-mono text-xs uppercase text-earth-metal">Entries</span>
                <p class="font-serif text-2xl text-charcoal">${weightEvents.length}</p>
            </div>
        `;

        // Render chart
        const ctx = canvas.getContext('2d');
        const labels = weightEvents.map(e => PetTracker.UI.formatDate(e.startDate));
        const data = weightEvents.map(e => e.value);

        // Calculate 7-day moving average
        const movingAvg = data.map((_, i) => {
            const start = Math.max(0, i - 6);
            const slice = data.slice(start, i + 1);
            return slice.reduce((a, b) => a + b, 0) / slice.length;
        });

        // Destroy existing chart if any
        if (window.weightChartInstance) {
            window.weightChartInstance.destroy();
        }

        window.weightChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Weight',
                        data,
                        borderColor: '#8b7b8e',
                        backgroundColor: 'rgba(139, 123, 142, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 3,
                        pointBackgroundColor: '#8b7b8e'
                    },
                    {
                        label: '7-Day Avg',
                        data: movingAvg,
                        borderColor: '#c9a9a6',
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.3,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: { family: '"JetBrains Mono"', size: 10 },
                            color: '#6b6357'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            font: { family: '"JetBrains Mono"', size: 10 },
                            color: '#6b6357',
                            maxRotation: 45
                        },
                        grid: { color: 'rgba(212, 200, 184, 0.5)' }
                    },
                    y: {
                        ticks: {
                            font: { family: '"JetBrains Mono"', size: 10 },
                            color: '#6b6357'
                        },
                        grid: { color: 'rgba(212, 200, 184, 0.5)' }
                    }
                }
            }
        });
    },

    /**
     * Update correlation analysis
     */
    updateCorrelation: async () => {
        const primaryId = document.getElementById('correlationPrimary')?.value;
        const secondaryId = document.getElementById('correlationSecondary')?.value;
        const windowKey = document.getElementById('correlationWindow')?.value || '24h';

        Analytics.state.primaryEventType = primaryId;
        Analytics.state.secondaryEventType = secondaryId;
        Analytics.state.correlationWindow = windowKey;

        const resultsContainer = document.getElementById('correlationResults');
        if (!resultsContainer) return;

        if (!primaryId || !secondaryId) {
            resultsContainer.innerHTML = '<p class="text-earth-metal text-sm">Select two event types to see correlations</p>';
            return;
        }

        const windowHours = Analytics.TIME_WINDOWS[windowKey] || 24;
        const events = await PetTracker.DB.getAll(PetTracker.STORES.EVENTS);

        // Filter by pet if selected
        let filteredEvents = events;
        if (Analytics.state.selectedPetId) {
            filteredEvents = events.filter(e => e.petIds?.includes(Analytics.state.selectedPetId));
        }

        // Get primary and secondary events
        const primaryEvents = filteredEvents.filter(e => e.eventTypeId === primaryId).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        const secondaryEvents = filteredEvents.filter(e => e.eventTypeId === secondaryId);

        const primaryType = App.state.eventTypes.find(t => t.id === primaryId);
        const secondaryType = App.state.eventTypes.find(t => t.id === secondaryId);

        // Find correlations
        let correlations = 0;
        let totalPrimary = primaryEvents.length;
        const windowMs = windowHours * 60 * 60 * 1000;

        primaryEvents.forEach(primary => {
            const primaryTime = new Date(primary.startDate).getTime();
            const hasCorrelation = secondaryEvents.some(secondary => {
                const secondaryTime = new Date(secondary.startDate).getTime();
                return secondaryTime > primaryTime && secondaryTime <= primaryTime + windowMs;
            });
            if (hasCorrelation) correlations++;
        });

        const correlationRate = totalPrimary > 0 ? ((correlations / totalPrimary) * 100).toFixed(1) : 0;

        resultsContainer.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <span class="font-mono text-xs uppercase text-earth-metal">Correlation Rate</span>
                    <span class="font-serif text-xl text-charcoal">${correlationRate}%</span>
                </div>
                <p class="text-sm text-earth-metal">
                    <strong>${correlations}</strong> out of <strong>${totalPrimary}</strong> 
                    "${primaryType?.name || 'primary'}" events were followed by 
                    "${secondaryType?.name || 'secondary'}" within <strong>${windowHours} hours</strong>.
                </p>
                ${correlationRate > 50 ? `
                    <div class="bg-muted-pink/20 border border-muted-pink p-2">
                        <p class="text-xs text-charcoal">
                            <i data-lucide="alert-triangle" class="w-3 h-3 inline mr-1"></i>
                            High correlation detected - these events appear to be related.
                        </p>
                    </div>
                ` : ''}
            </div>
        `;

        if (window.lucide) lucide.createIcons();
    },

    /**
     * Render adherence statistics based on recurring event types
     */
    renderAdherenceStats: async () => {
        const container = document.getElementById('adherenceStats');
        if (!container) return;

        const eventTypes = await PetTracker.DB.getAll(PetTracker.STORES.EVENT_TYPES);
        const events = await PetTracker.DB.getAll(PetTracker.STORES.EVENTS);

        // Filter to recurring event types only
        const recurringTypes = eventTypes.filter(et => et.isRecurring);

        if (recurringTypes.length === 0) {
            container.innerHTML = '<p class="text-earth-metal text-sm col-span-full">No recurring event types configured</p>';
            return;
        }

        // Filter by pet if selected
        let filteredTypes = recurringTypes;
        if (Analytics.state.selectedPetId) {
            filteredTypes = recurringTypes.filter(et =>
                et.relatedPetIds?.includes(Analytics.state.selectedPetId)
            );
        }

        // Calculate adherence for last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const stats = filteredTypes.map(eventType => {
            // Get events of this type in the time window
            let typeEvents = events.filter(e =>
                e.eventTypeId === eventType.id &&
                new Date(e.startDate) >= thirtyDaysAgo
            );

            // If pet filter is active, also filter events by pet
            if (Analytics.state.selectedPetId) {
                typeEvents = typeEvents.filter(e =>
                    e.petIds?.includes(Analytics.state.selectedPetId)
                );
            }

            // Calculate expected occurrences based on interval
            let intervalDays;
            const intervalValue = eventType.intervalValue || 1;

            switch (eventType.intervalUnit) {
                case 'Days':
                    intervalDays = intervalValue;
                    break;
                case 'Weeks':
                    intervalDays = intervalValue * 7;
                    break;
                case 'Months':
                    intervalDays = intervalValue * 30;
                    break;
                case 'Years':
                    intervalDays = intervalValue * 365;
                    break;
                default:
                    intervalDays = intervalValue;
            }

            // For yearly events, expected count in 30 days is likely 0, but we should still show them
            const expectedCount = intervalDays >= 30 ? (30 / intervalDays) : Math.max(1, Math.floor(30 / intervalDays));
            const actualCount = typeEvents.filter(e => e.status === 'Completed').length;
            const adherence = expectedCount > 0 ? Math.min(100, (actualCount / expectedCount) * 100) : 100;

            return {
                name: eventType.name,
                adherence: adherence.toFixed(0),
                actual: actualCount,
                expected: expectedCount
            };
        });

        if (stats.length === 0) {
            container.innerHTML = '<p class="text-earth-metal text-sm col-span-full">No recurring event types for selected pet</p>';
            return;
        }

        container.innerHTML = stats.map(stat => `
            <div class="text-center border border-oatmeal p-3">
                <span class="font-mono text-xs uppercase text-earth-metal block mb-1">${PetTracker.UI.escapeHtml(stat.name)}</span>
                <p class="font-serif text-2xl ${stat.adherence >= 80 ? 'text-dull-purple' : stat.adherence >= 50 ? 'text-earth-metal' : 'text-muted-pink'}">
                    ${stat.adherence}%
                </p>
                <p class="text-xs text-earth-metal mt-1">${stat.actual}/${stat.expected} in 30 days</p>
            </div>
        `).join('');
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.Analytics = Analytics;
window.Analytics = Analytics;
