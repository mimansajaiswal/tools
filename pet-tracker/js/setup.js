/**
 * Pet Tracker - Setup Module
 * Manage Event Types, Scales, Scale Levels, Care Items, Care Plans
 */

const Setup = {
    currentTab: 'eventTypes',
    editingId: null,

    // Common Lucide icons for pet tracking (expanded set)
    availableIcons: [
        // Health & Medical
        'pill', 'syringe', 'stethoscope', 'thermometer', 'heart', 'heart-pulse', 'activity',
        'bandage', 'cross', 'plus-circle', 'alert-circle', 'alert-triangle', 'circle-alert',
        'hospital', 'ambulance', 'baby', 'accessibility', 'heart-off', 'heart-handshake',
        // Symptoms & Body
        'droplet', 'droplets', 'wind', 'cloud', 'flame', 'snowflake', 'zap', 'tornado',
        'eye', 'eye-off', 'ear', 'ear-off', 'hand', 'bone', 'brain', 'scan', 'skull',
        'waypoints', 'spline', 'orbit',
        // Animals & Pets
        'paw-print', 'dog', 'cat', 'bird', 'fish', 'rabbit', 'turtle', 'rat', 'squirrel',
        'bug', 'snail', 'worm', 'shell', 'feather', 'egg',
        // Activities & Exercise
        'footprints', 'dumbbell', 'timer', 'clock', 'alarm-clock', 'hourglass',
        'sun', 'moon', 'sunrise', 'sunset', 'cloud-sun', 'cloud-moon',
        'mountain', 'trees', 'tree-pine', 'tent', 'compass', 'route', 'map',
        'bike', 'waves', 'sailboat', 'anchor',
        // Food & Nutrition
        'utensils', 'cookie', 'apple', 'carrot', 'beef', 'milk', 'cup-soda',
        'glass-water', 'coffee', 'pizza', 'salad', 'soup', 'sandwich', 'popcorn',
        'cherry', 'grape', 'citrus', 'banana', 'cake', 'candy', 'ice-cream-cone',
        'wheat', 'croissant', 'drumstick', 'fish-symbol',
        // Grooming & Care
        'scissors', 'sparkles', 'spray-can', 'bath', 'shower-head', 'brush',
        'shirt', 'glasses', 'watch', 'crown', 'gem', 'palette', 'paintbrush',
        'eraser', 'pipette', 'hand-metal',
        // Emotions & Behavior
        'smile', 'frown', 'meh', 'angry', 'laugh', 'heart-crack', 'annoyed',
        'circle-user', 'ghost', 'skull', 'party-popper',
        // Tracking & Measurement
        'scale', 'ruler', 'gauge', 'chart-line', 'chart-bar', 'trending-up', 'trending-down',
        'target', 'crosshair', 'radar', 'signal', 'bar-chart', 'pie-chart', 'line-chart',
        // Scheduling & Time
        'calendar', 'calendar-check', 'calendar-days', 'calendar-clock', 'calendar-plus',
        'calendar-x', 'calendar-heart', 'calendar-range', 'clock-1', 'clock-12',
        'repeat', 'repeat-1', 'repeat-2', 'refresh-cw', 'refresh-ccw', 'rotate-cw',
        // Documents & Notes
        'clipboard', 'clipboard-check', 'clipboard-list', 'clipboard-plus',
        'file-text', 'file-check', 'file-heart', 'file-warning',
        'notebook', 'book', 'book-open', 'bookmark', 'tag', 'tags',
        // Media & Communication
        'camera', 'image', 'video', 'mic', 'phone', 'mail', 'message-circle',
        'bell', 'bell-ring', 'bell-off', 'megaphone', 'radio', 'tv', 'monitor',
        // Location & Travel
        'home', 'map-pin', 'map-pinned', 'navigation', 'car', 'plane', 'train',
        'bus', 'truck', 'building', 'building-2', 'hotel', 'store', 'warehouse',
        'globe', 'globe-2', 'earth',
        // Safety & Security
        'shield', 'shield-check', 'shield-plus', 'shield-alert', 'shield-off',
        'lock', 'unlock', 'key', 'key-round', 'fingerprint', 'scan-face',
        // Achievement & Rewards
        'star', 'award', 'trophy', 'medal', 'crown', 'gift', 'badge', 'badge-check',
        'thumbs-up', 'thumbs-down', 'hand-heart', 'sparkle',
        // Status & Actions
        'check', 'check-circle', 'check-check', 'circle-check', 'circle-x',
        'x', 'x-circle', 'info', 'help-circle', 'circle-help', 'circle-dot',
        'circle-pause', 'circle-play', 'circle-stop',
        'undo', 'redo', 'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
        // Science & Lab
        'test-tube', 'test-tubes', 'microscope', 'dna', 'atom', 'flask-conical',
        'beaker', 'leaf', 'flower', 'flower-2', 'clover', 'sprout',
        // Toys & Play
        'gamepad-2', 'puzzle', 'toy-brick', 'blocks', 'dice-1', 'dice-5',
        'volleyball',
        // Household
        'bed', 'lamp', 'sofa', 'armchair', 'door-open', 'door-closed',
        'fence', 'trash', 'trash-2', 'recycle', 'box', 'package',
        // Weather
        'cloud-rain', 'cloud-snow', 'cloud-lightning', 'rainbow', 'umbrella',
        'thermometer-sun', 'thermometer-snowflake',
        // Misc
        'circle', 'square', 'triangle', 'hexagon', 'octagon', 'pentagon',
        'hash', 'at-sign', 'asterisk', 'infinity', 'percent', 'dollar-sign',
        'lightbulb', 'lamp-desk', 'flashlight', 'wand', 'wand-2'
    ],

    // Color options
    availableColors: [
        { name: 'Red', value: 'red', hex: '#ef4444' },
        { name: 'Orange', value: 'orange', hex: '#f97316' },
        { name: 'Amber', value: 'amber', hex: '#f59e0b' },
        { name: 'Yellow', value: 'yellow', hex: '#eab308' },
        { name: 'Lime', value: 'lime', hex: '#84cc16' },
        { name: 'Green', value: 'green', hex: '#22c55e' },
        { name: 'Teal', value: 'teal', hex: '#14b8a6' },
        { name: 'Cyan', value: 'cyan', hex: '#06b6d4' },
        { name: 'Blue', value: 'blue', hex: '#3b82f6' },
        { name: 'Indigo', value: 'indigo', hex: '#6366f1' },
        { name: 'Purple', value: 'purple', hex: '#8b5cf6' },
        { name: 'Pink', value: 'pink', hex: '#ec4899' }
    ],

    // Event type categories
    eventCategories: [
        'Symptom', 'Medication', 'Vaccine', 'Vet Visit', 'Activity',
        'Weight', 'Nutrition', 'Grooming', 'Wellness', 'Health', 'Other'
    ],

    /**
     * Render the Setup view
     */
    render: () => {
        const container = document.querySelector('[data-view="setup"]');
        if (!container) return;

        container.innerHTML = `
            <div class="p-4 md:p-6 max-w-5xl mx-auto">
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <h2 class="font-serif text-2xl text-charcoal">Setup</h2>
                        <p class="text-sm text-earth-metal mt-1">Configure event types and scales</p>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="border-b border-oatmeal flex overflow-x-auto mb-6">
                    <button data-setup-tab="eventTypes" class="tab-nav ${Setup.currentTab === 'eventTypes' ? 'active' : ''}" onclick="Setup.switchTab('eventTypes')">
                        <i data-lucide="activity" class="w-4 h-4 inline mr-1"></i>Event Types
                    </button>
                    <button data-setup-tab="scales" class="tab-nav ${Setup.currentTab === 'scales' ? 'active' : ''}" onclick="Setup.switchTab('scales')">
                        <i data-lucide="gauge" class="w-4 h-4 inline mr-1"></i>Scales
                    </button>
                </div>

                <!-- Tab Content -->
                <div id="setupTabContent"></div>
            </div>
        `;

        Setup.renderTabContent();
        if (window.lucide) lucide.createIcons();
    },

    /**
     * Switch tabs
     */
    switchTab: (tab) => {
        Setup.currentTab = tab;

        // Update tab buttons
        document.querySelectorAll('[data-setup-tab]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.setupTab === tab);
        });

        Setup.renderTabContent();
    },

    /**
     * Render current tab content
     */
    renderTabContent: async () => {
        const container = document.getElementById('setupTabContent');
        if (!container) return;

        switch (Setup.currentTab) {
            case 'eventTypes':
                await Setup.renderEventTypes(container);
                break;
            case 'scales':
                await Setup.renderScales(container);
                break;
        }

        if (window.lucide) lucide.createIcons();
    },

    // ============ EVENT TYPES ============

    renderEventTypes: async (container) => {
        const eventTypes = await PetTracker.DB.getAll(PetTracker.STORES.EVENT_TYPES);
        const scales = await PetTracker.DB.getAll(PetTracker.STORES.SCALES);
        const scalesById = Object.fromEntries(scales.map(s => [s.id, s]));

        eventTypes.sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name));

        // Group by category
        const grouped = {};
        eventTypes.forEach(et => {
            const cat = et.category || 'Other';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(et);
        });

        let html = `
            <div class="flex items-center justify-between mb-4">
                <p class="text-sm text-earth-metal">
                    ${eventTypes.length} event type${eventTypes.length !== 1 ? 's' : ''} configured
                </p>
                <button onclick="Setup.showEventTypeModal()" class="btn-primary px-4 py-2 font-mono text-xs uppercase">
                    <i data-lucide="plus" class="w-4 h-4 inline mr-1"></i>Add Event Type
                </button>
            </div>
            <p class="text-xs text-earth-metal mb-4">
                Event types are templates for tracking (e.g., "Vomiting", "Wheezing" under Symptom category). 
                Each gets its own icon and can be selected when logging events.
            </p>
        `;

        if (eventTypes.length === 0) {
            html += `<div class="border border-oatmeal p-8 text-center">
                <i data-lucide="activity" class="w-12 h-12 text-oatmeal mx-auto mb-4"></i>
                <p class="text-earth-metal">No event types configured yet</p>
                <button onclick="Setup.showEventTypeModal()" class="btn-secondary px-4 py-2 font-mono text-xs uppercase mt-4">
                    Create Your First Event Type
                </button>
            </div>`;
        } else {
            for (const category of Object.keys(grouped).sort()) {
                html += `
                    <div class="mb-6">
                        <h3 class="font-mono text-xs uppercase text-earth-metal mb-2">${category}</h3>
                        <div class="grid gap-2">
                `;

                for (const et of grouped[category]) {
                    const colorObj = Setup.availableColors.find(c => c.value === et.defaultColor) || { hex: '#6b6357' };
                    const scaleName = et.defaultScaleId && scalesById[et.defaultScaleId] ? scalesById[et.defaultScaleId].name : null;
                    const severityText = et.usesSeverity ? (scaleName ? `Uses ${scaleName}` : 'Uses Severity (no scale set)') : '';

                    html += `
                        <div class="flex items-center gap-3 p-3 border border-oatmeal hover:border-dull-purple transition-fast cursor-pointer" onclick="Setup.showEventTypeModal('${et.id}')">
                            <div class="w-10 h-10 flex items-center justify-center" style="background: ${colorObj.hex}20; color: ${colorObj.hex}">
                                <i data-lucide="${et.defaultIcon || 'circle'}" class="w-5 h-5"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm text-charcoal font-medium truncate">${PetTracker.UI.escapeHtml(et.name)}</p>
                                <p class="text-xs text-earth-metal">${et.trackingMode || 'Stamp'}${severityText ? ' • ' + severityText : ''}</p>
                            </div>
                            <button onclick="event.stopPropagation(); Setup.deleteEventType('${et.id}')" class="p-2 text-earth-metal hover:text-muted-pink">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    `;
                }
                html += `</div></div>`;
            }
        }

        container.innerHTML = html;
    },

    showEventTypeModal: async (id = null) => {
        Setup.editingId = id;
        let data = {
            name: '',
            category: 'Symptom',
            trackingMode: 'Stamp',
            defaultIcon: 'circle',
            defaultColor: 'purple',
            usesSeverity: false,
            allowAttachments: false,
            defaultValueKind: null,
            isRecurring: false,
            scheduleType: 'Fixed',
            intervalValue: 1,
            intervalUnit: 'Months',
            anchorDate: PetTracker.UI.localDateYYYYMMDD(),
            endDate: '',
            dueTime: '',
            defaultDose: '',
            windowBefore: 0,
            windowAfter: 0,
            relatedPetIds: []
        };

        if (id) {
            const existing = await PetTracker.DB.get(PetTracker.STORES.EVENT_TYPES, id);
            if (existing) data = { ...data, ...existing };
        }

        const modal = document.getElementById('eventTypeModal');
        if (!modal) return;

        // Populate form - basic fields
        document.getElementById('eventTypeName').value = data.name;
        document.getElementById('eventTypeCategory').value = data.category;
        Setup.initCategoryCombobox(data.category);
        document.getElementById('eventTypeTrackingMode').value = data.trackingMode;
        document.getElementById('eventTypeUsesSeverity').checked = data.usesSeverity;
        document.getElementById('eventTypeAllowAttachments').checked = data.allowAttachments;
        document.getElementById('eventTypeValueKind').value = data.defaultValueKind || '';

        // Populate and show scale selector
        await Setup.populateScaleDropdown(data.defaultScaleId || null);
        Setup.toggleScaleSelector();

        // Set icon and color
        Setup.selectedIcon = data.defaultIcon || 'circle';
        Setup.selectedColor = data.defaultColor || 'purple';
        Setup.renderIconPicker('eventTypeIconPicker', Setup.selectedIcon);
        Setup.renderColorPicker('eventTypeColorPicker', Setup.selectedColor);

        // Populate recurring fields
        document.getElementById('eventTypeIsRecurring').checked = data.isRecurring || false;
        document.getElementById('eventTypeScheduleType').value = data.scheduleType || 'Fixed';
        document.getElementById('eventTypeIntervalValue').value = data.intervalValue || 1;
        document.getElementById('eventTypeIntervalUnit').value = data.intervalUnit || 'Months';
        document.getElementById('eventTypeAnchorDate').value = data.anchorDate || PetTracker.UI.localDateYYYYMMDD();
        document.getElementById('eventTypeEndDate').value = data.endDate || '';
        document.getElementById('eventTypeDueTime').value = data.dueTime || '';
        document.getElementById('eventTypeDefaultDose').value = data.defaultDose || '';
        document.getElementById('eventTypeWindowBefore').value = data.windowBefore || 0;
        document.getElementById('eventTypeWindowAfter').value = data.windowAfter || 0;

        // Populate Todoist fields
        const todoistSyncEl = document.getElementById('eventTypeTodoistSync');
        if (todoistSyncEl) todoistSyncEl.checked = data.todoistSync || false;
        const todoistProjectEl = document.getElementById('eventTypeTodoistProject');
        if (todoistProjectEl) todoistProjectEl.value = data.todoistProject || '';
        const todoistLabelsEl = document.getElementById('eventTypeTodoistLabels');
        if (todoistLabelsEl) todoistLabelsEl.value = data.todoistLabels || '';
        const todoistLeadTimeEl = document.getElementById('eventTypeTodoistLeadTime');
        if (todoistLeadTimeEl) todoistLeadTimeEl.value = data.todoistLeadTime || 1;

        // Toggle recurring fields visibility
        Setup.toggleRecurringFields();

        // Populate pet checkboxes
        await Setup.populatePetCheckboxes(data.relatedPetIds || []);

        // Update modal title
        document.getElementById('eventTypeModalTitle').textContent = id ? 'Edit Event Type' : 'Add Event Type';

        PetTracker.UI.openModal('eventTypeModal');
    },

    toggleRecurringFields: () => {
        const isRecurring = document.getElementById('eventTypeIsRecurring').checked;
        const fields = document.getElementById('eventTypeRecurringFields');
        if (fields) {
            fields.classList.toggle('hidden', !isRecurring);
        }
        if (window.lucide) lucide.createIcons();
    },

    toggleScaleSelector: () => {
        const usesSeverity = document.getElementById('eventTypeUsesSeverity').checked;
        const container = document.getElementById('eventTypeScaleSelector');
        if (container) {
            container.classList.toggle('hidden', !usesSeverity);
        }
    },

    populateScaleDropdown: async (selectedScaleId = null) => {
        const select = document.getElementById('eventTypeDefaultScale');
        if (!select) return;

        const scales = await PetTracker.DB.getAll(PetTracker.STORES.SCALES);

        let html = '<option value="">-- Select Scale --</option>';
        for (const scale of scales) {
            const selected = scale.id === selectedScaleId ? 'selected' : '';
            html += `<option value="${scale.id}" ${selected}>${PetTracker.UI.escapeHtml(scale.name)}</option>`;
        }

        select.innerHTML = html;
    },

    toggleScaleValueTypeHelp: () => {
        const valueType = document.getElementById('scaleValueType').value;
        const labelsHelp = document.getElementById('scaleLabelsHelp');
        const numericHelp = document.getElementById('scaleNumericHelp');

        if (labelsHelp && numericHelp) {
            labelsHelp.classList.toggle('hidden', valueType !== 'Labels');
            numericHelp.classList.toggle('hidden', valueType !== 'Numeric');
        }
    },

    populatePetCheckboxes: async (selectedPetIds = []) => {
        const container = document.getElementById('eventTypePetCheckboxes');
        if (!container) return;

        const pets = await PetTracker.DB.getAll(PetTracker.STORES.PETS);

        if (pets.length === 0) {
            container.innerHTML = '<p class="text-xs text-earth-metal">No pets added yet</p>';
            return;
        }

        container.innerHTML = pets.map(p => `
            <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="eventTypePets" value="${p.id}" 
                    ${selectedPetIds.includes(p.id) ? 'checked' : ''} class="w-4 h-4">
                <span class="text-sm">${PetTracker.UI.escapeHtml(p.name)}</span>
            </label>
        `).join('');
    },

    saveEventType: async () => {
        const name = document.getElementById('eventTypeName').value.trim();
        const category = document.getElementById('eventTypeCategory').value.trim() || 'Other';
        const trackingMode = document.getElementById('eventTypeTrackingMode').value;
        const usesSeverity = document.getElementById('eventTypeUsesSeverity').checked;
        const defaultScaleId = usesSeverity ? (document.getElementById('eventTypeDefaultScale').value || null) : null;
        const allowAttachments = document.getElementById('eventTypeAllowAttachments').checked;
        const defaultValueKind = document.getElementById('eventTypeValueKind').value || null;

        if (!name) {
            PetTracker.UI.toast('Name is required', 'error');
            return;
        }

        // Recurring schedule fields
        const isRecurring = document.getElementById('eventTypeIsRecurring')?.checked || false;
        const scheduleType = document.getElementById('eventTypeScheduleType')?.value || 'Fixed';
        const intervalValue = parseInt(document.getElementById('eventTypeIntervalValue')?.value) || 1;
        const intervalUnit = document.getElementById('eventTypeIntervalUnit')?.value || 'Months';
        const anchorDate = document.getElementById('eventTypeAnchorDate')?.value || null;
        const endDate = document.getElementById('eventTypeEndDate')?.value || null;
        const dueTime = document.getElementById('eventTypeDueTime')?.value || null;
        const defaultDose = document.getElementById('eventTypeDefaultDose')?.value?.trim() || null;
        const windowBefore = parseInt(document.getElementById('eventTypeWindowBefore')?.value) || 0;
        const windowAfter = parseInt(document.getElementById('eventTypeWindowAfter')?.value) || 0;

        // Pet assignments
        const petCheckboxes = document.querySelectorAll('input[name="eventTypePets"]:checked');
        const relatedPetIds = Array.from(petCheckboxes).map(cb => cb.value);

        // Todoist integration fields (if present in modal)
        const todoistSync = document.getElementById('eventTypeTodoistSync')?.checked || false;
        const todoistProject = document.getElementById('eventTypeTodoistProject')?.value?.trim() || null;
        const todoistLabels = document.getElementById('eventTypeTodoistLabels')?.value?.trim() || null;
        const todoistLeadTime = parseInt(document.getElementById('eventTypeTodoistLeadTime')?.value) || 1;

        // Preserve existing fields when editing
        let existingData = {};
        if (Setup.editingId) {
            existingData = await PetTracker.DB.get(PetTracker.STORES.EVENT_TYPES, Setup.editingId) || {};
        }

        const now = new Date().toISOString();
        const data = {
            ...existingData, // Preserve fields not in UI
            id: Setup.editingId || PetTracker.generateId(),
            name,
            category,
            trackingMode,
            defaultIcon: Setup.selectedIcon || existingData.defaultIcon || 'circle',
            defaultColor: Setup.selectedColor || existingData.defaultColor || 'purple',
            usesSeverity,
            defaultScaleId,
            allowAttachments,
            defaultValueKind,
            // Recurring schedule fields
            isRecurring,
            scheduleType: isRecurring ? scheduleType : null,
            intervalValue: isRecurring ? intervalValue : null,
            intervalUnit: isRecurring ? intervalUnit : null,
            anchorDate: isRecurring ? anchorDate : null,
            endDate: isRecurring ? endDate : null,
            dueTime: isRecurring ? dueTime : null,
            defaultDose,
            windowBefore: isRecurring ? windowBefore : null,
            windowAfter: isRecurring ? windowAfter : null,
            relatedPetIds,
            // Todoist fields
            todoistSync: isRecurring ? todoistSync : false,
            todoistProject: isRecurring && todoistSync ? todoistProject : null,
            todoistLabels: isRecurring && todoistSync ? todoistLabels : null,
            todoistLeadTime: isRecurring && todoistSync ? todoistLeadTime : null,
            updatedAt: now,
            synced: false
        };

        // Calculate nextDue if recurring and has anchor date
        if (isRecurring && anchorDate) {
            data.nextDue = Setup.calculateNextDue(data);
        }

        if (!Setup.editingId) {
            data.createdAt = now;
        }

        await PetTracker.DB.put(PetTracker.STORES.EVENT_TYPES, data);
        await PetTracker.SyncQueue.add({
            type: Setup.editingId ? 'update' : 'create',
            store: 'eventTypes',
            recordId: data.id,
            data
        });

        if (PetTracker.Sync?.updatePendingCount) PetTracker.Sync.updatePendingCount();

        PetTracker.UI.closeModal('eventTypeModal');
        PetTracker.UI.toast(Setup.editingId ? 'Event type updated' : 'Event type created', 'success');

        // Refresh app state
        App.state.eventTypes = await PetTracker.DB.getAll(PetTracker.STORES.EVENT_TYPES);
        Setup.renderTabContent();
    },

    deleteEventType: async (id) => {
        if (!confirm('Delete this event type? Events using it will lose their type reference.')) return;

        // Get notionId before deleting locally so remote archive can work
        const record = await PetTracker.DB.get(PetTracker.STORES.EVENT_TYPES, id);
        const notionId = record?.notionId;

        // Queue delete with notionId before local delete
        await PetTracker.SyncQueue.add({
            type: 'delete',
            store: 'eventTypes',
            recordId: id,
            data: { notionId }
        });

        await PetTracker.DB.delete(PetTracker.STORES.EVENT_TYPES, id);

        if (PetTracker.Sync?.updatePendingCount) PetTracker.Sync.updatePendingCount();
        PetTracker.UI.toast('Event type deleted', 'info');

        App.state.eventTypes = await PetTracker.DB.getAll(PetTracker.STORES.EVENT_TYPES);
        Setup.renderTabContent();
    },

    // ============ CATEGORY COMBOBOX ============

    initCategoryCombobox: (initialValue = '') => {
        const input = document.getElementById('eventTypeCategory');
        const dropdown = document.getElementById('eventTypeCategoryDropdown');
        if (!input || !dropdown) return;

        input.value = initialValue;

        const showDropdown = () => {
            Setup.renderCategoryOptions(input.value);
            dropdown.classList.add('open');
        };

        const hideDropdown = () => {
            dropdown.classList.remove('open');
        };

        input.addEventListener('focus', showDropdown);
        input.addEventListener('input', () => Setup.renderCategoryOptions(input.value));

        input.addEventListener('blur', (e) => {
            setTimeout(() => hideDropdown(), 150);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hideDropdown();
                input.blur();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const highlighted = dropdown.querySelector('.highlighted');
                if (highlighted) highlighted.click();
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const options = dropdown.querySelectorAll('.combobox-option');
                if (options.length === 0) return;

                const current = dropdown.querySelector('.highlighted');
                let idx = Array.from(options).indexOf(current);

                if (e.key === 'ArrowDown') {
                    idx = idx < options.length - 1 ? idx + 1 : 0;
                } else {
                    idx = idx > 0 ? idx - 1 : options.length - 1;
                }

                options.forEach(o => o.classList.remove('highlighted'));
                options[idx].classList.add('highlighted');
                options[idx].scrollIntoView({ block: 'nearest' });
            }
        });

        Setup.renderCategoryOptions(initialValue);
    },

    renderCategoryOptions: (filter = '') => {
        const dropdown = document.getElementById('eventTypeCategoryDropdown');
        if (!dropdown) return;

        const filterLower = filter.toLowerCase().trim();
        const filtered = Setup.eventCategories.filter(c =>
            c.toLowerCase().includes(filterLower)
        );

        let html = '';

        filtered.forEach((cat, idx) => {
            html += `<div class="combobox-option${idx === 0 ? ' highlighted' : ''}" data-value="${cat}">${cat}</div>`;
        });

        const exactMatch = Setup.eventCategories.some(c => c.toLowerCase() === filterLower);
        if (filterLower && !exactMatch) {
            html += `<div class="combobox-option add-new" data-value="${filter.trim()}" data-add="true">Add "${filter.trim()}"</div>`;
        }

        dropdown.innerHTML = html;

        dropdown.querySelectorAll('.combobox-option').forEach(opt => {
            opt.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const value = opt.dataset.value;
                document.getElementById('eventTypeCategory').value = value;

                if (opt.dataset.add === 'true' && !Setup.eventCategories.includes(value)) {
                    Setup.eventCategories.push(value);
                }

                dropdown.classList.remove('open');
            });
        });
    },

    // ============ SCALES ============

    renderScales: async (container) => {
        const scales = await PetTracker.DB.getAll(PetTracker.STORES.SCALES);
        const scaleLevels = await PetTracker.DB.getAll(PetTracker.STORES.SCALE_LEVELS);

        // Group levels by scale
        const levelsByScale = {};
        scaleLevels.forEach(l => {
            if (!levelsByScale[l.scaleId]) levelsByScale[l.scaleId] = [];
            levelsByScale[l.scaleId].push(l);
        });

        // Sort levels by order
        Object.keys(levelsByScale).forEach(k => {
            levelsByScale[k].sort((a, b) => (a.order || 0) - (b.order || 0));
        });

        let html = `
            <div class="flex items-center justify-between mb-4">
                <p class="text-sm text-earth-metal">${scales.length} scale${scales.length !== 1 ? 's' : ''} configured</p>
                <button onclick="Setup.showScaleModal()" class="btn-primary px-4 py-2 font-mono text-xs uppercase">
                    <i data-lucide="plus" class="w-4 h-4 inline mr-1"></i>Add Scale
                </button>
            </div>
            <p class="text-xs text-earth-metal mb-4">
                Scales let you rate things like symptom severity, mood, or appetite with predefined levels.
            </p>
        `;

        if (scales.length === 0) {
            html += `<div class="border border-oatmeal p-8 text-center">
                <i data-lucide="gauge" class="w-12 h-12 text-oatmeal mx-auto mb-4"></i>
                <p class="text-earth-metal">No scales configured yet</p>
                <button onclick="Setup.showScaleModal()" class="btn-secondary px-4 py-2 font-mono text-xs uppercase mt-4">
                    Create Your First Scale
                </button>
            </div>`;
        } else {
            html += '<div class="space-y-4">';
            for (const scale of scales) {
                const levels = levelsByScale[scale.id] || [];
                html += `
                    <div class="border border-oatmeal p-4">
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-3">
                                <i data-lucide="gauge" class="w-5 h-5 text-dull-purple"></i>
                                <div>
                                    <p class="text-sm text-charcoal font-medium">${PetTracker.UI.escapeHtml(scale.name)}</p>
                                    <p class="text-xs text-earth-metal">${scale.valueType || 'Labels'} • ${levels.length} levels</p>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="Setup.showScaleModal('${scale.id}')" class="p-2 text-earth-metal hover:text-dull-purple">
                                    <i data-lucide="edit" class="w-4 h-4"></i>
                                </button>
                                <button onclick="Setup.deleteScale('${scale.id}')" class="p-2 text-earth-metal hover:text-muted-pink">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            ${levels.map(l => {
                    const colorObj = Setup.availableColors.find(c => c.value === l.color) || { hex: '#6b6357' };
                    return `<span class="px-2 py-1 text-xs font-mono" style="background: ${colorObj.hex}20; color: ${colorObj.hex}">${PetTracker.UI.escapeHtml(l.name)}</span>`;
                }).join('')}
                            <button onclick="Setup.showScaleLevelModal('${scale.id}')" class="px-2 py-1 text-xs font-mono text-dull-purple border border-dull-purple hover:bg-dull-purple/10">
                                + Add Level
                            </button>
                        </div>
                    </div>
                `;
            }
            html += '</div>';
        }

        container.innerHTML = html;
    },

    showScaleModal: async (id = null) => {
        Setup.editingId = id;
        let data = { name: '', valueType: 'Labels' };

        if (id) {
            const existing = await PetTracker.DB.get(PetTracker.STORES.SCALES, id);
            if (existing) data = { ...data, ...existing };
        }

        const modal = document.getElementById('scaleModal');
        if (!modal) return;

        document.getElementById('scaleName').value = data.name;
        document.getElementById('scaleValueType').value = data.valueType;
        document.getElementById('scaleModalTitle').textContent = id ? 'Edit Scale' : 'Add Scale';

        PetTracker.UI.openModal('scaleModal');
    },

    saveScale: async () => {
        const name = document.getElementById('scaleName').value.trim();
        const valueType = document.getElementById('scaleValueType').value;
        const unit = document.getElementById('scaleUnit')?.value?.trim() || null;
        const notes = document.getElementById('scaleNotes')?.value?.trim() || null;

        if (!name) {
            PetTracker.UI.toast('Name is required', 'error');
            return;
        }

        // Preserve existing fields when editing
        let existingData = {};
        if (Setup.editingId) {
            existingData = await PetTracker.DB.get(PetTracker.STORES.SCALES, Setup.editingId) || {};
        }

        const now = new Date().toISOString();
        const data = {
            ...existingData, // Preserve fields not in UI
            id: Setup.editingId || PetTracker.generateId(),
            name,
            valueType,
            unit,
            notes,
            updatedAt: now,
            synced: false
        };

        if (!Setup.editingId) data.createdAt = now;

        await PetTracker.DB.put(PetTracker.STORES.SCALES, data);
        await PetTracker.SyncQueue.add({
            type: Setup.editingId ? 'update' : 'create',
            store: 'scales',
            recordId: data.id,
            data
        });

        if (PetTracker.Sync?.updatePendingCount) PetTracker.Sync.updatePendingCount();

        PetTracker.UI.closeModal('scaleModal');
        PetTracker.UI.toast(Setup.editingId ? 'Scale updated' : 'Scale created', 'success');
        Setup.renderTabContent();
    },

    deleteScale: async (id) => {
        if (!confirm('Delete this scale and all its levels?')) return;

        // Delete levels first - queue with notionId before local delete
        const levels = await PetTracker.DB.query(PetTracker.STORES.SCALE_LEVELS, l => l.scaleId === id);
        for (const level of levels) {
            await PetTracker.SyncQueue.add({
                type: 'delete',
                store: 'scaleLevels',
                recordId: level.id,
                data: { notionId: level.notionId }
            });
            await PetTracker.DB.delete(PetTracker.STORES.SCALE_LEVELS, level.id);
        }

        // Get notionId before deleting locally
        const scale = await PetTracker.DB.get(PetTracker.STORES.SCALES, id);
        await PetTracker.SyncQueue.add({
            type: 'delete',
            store: 'scales',
            recordId: id,
            data: { notionId: scale?.notionId }
        });
        await PetTracker.DB.delete(PetTracker.STORES.SCALES, id);

        if (PetTracker.Sync?.updatePendingCount) PetTracker.Sync.updatePendingCount();
        PetTracker.UI.toast('Scale deleted', 'info');
        Setup.renderTabContent();
    },

    showScaleLevelModal: async (scaleId, levelId = null) => {
        Setup.editingScaleId = scaleId;
        Setup.editingId = levelId;

        let data = { name: '', color: 'yellow', numericValue: 1 };

        if (levelId) {
            const existing = await PetTracker.DB.get(PetTracker.STORES.SCALE_LEVELS, levelId);
            if (existing) data = { ...data, ...existing };
        } else {
            // Get next order
            const levels = await PetTracker.DB.query(PetTracker.STORES.SCALE_LEVELS, l => l.scaleId === scaleId);
            data.order = levels.length + 1;
            data.numericValue = levels.length + 1;
        }

        const modal = document.getElementById('scaleLevelModal');
        if (!modal) return;

        document.getElementById('scaleLevelName').value = data.name;
        document.getElementById('scaleLevelNumericValue').value = data.numericValue;
        Setup.selectedColor = data.color || 'yellow';
        Setup.renderColorPicker('scaleLevelColorPicker', Setup.selectedColor);
        document.getElementById('scaleLevelModalTitle').textContent = levelId ? 'Edit Level' : 'Add Level';

        PetTracker.UI.openModal('scaleLevelModal');
    },

    saveScaleLevel: async () => {
        const name = document.getElementById('scaleLevelName').value.trim();
        const numericValue = parseInt(document.getElementById('scaleLevelNumericValue').value) || 1;

        if (!name) {
            PetTracker.UI.toast('Name is required', 'error');
            return;
        }

        const now = new Date().toISOString();

        let order = 1;
        if (!Setup.editingId) {
            const levels = await PetTracker.DB.query(PetTracker.STORES.SCALE_LEVELS, l => l.scaleId === Setup.editingScaleId);
            order = levels.length + 1;
        } else {
            const existing = await PetTracker.DB.get(PetTracker.STORES.SCALE_LEVELS, Setup.editingId);
            order = existing?.order || 1;
        }

        const data = {
            id: Setup.editingId || PetTracker.generateId(),
            scaleId: Setup.editingScaleId,
            name,
            color: Setup.selectedColor || 'yellow',
            numericValue,
            order,
            updatedAt: now,
            synced: false
        };

        if (!Setup.editingId) data.createdAt = now;

        await PetTracker.DB.put(PetTracker.STORES.SCALE_LEVELS, data);
        await PetTracker.SyncQueue.add({
            type: Setup.editingId ? 'update' : 'create',
            store: 'scaleLevels',
            recordId: data.id,
            data
        });

        if (PetTracker.Sync?.updatePendingCount) PetTracker.Sync.updatePendingCount();

        PetTracker.UI.closeModal('scaleLevelModal');
        PetTracker.UI.toast(Setup.editingId ? 'Level updated' : 'Level added', 'success');
        Setup.renderTabContent();
    },

    // ============ ICON & COLOR PICKERS ============
    // Note: Care Items and Care Plans have been removed.
    // Scheduling is now handled via Event Types with isRecurring=true and related schedule fields.

    selectedIcon: 'circle',
    selectedColor: 'purple',

    renderIconPicker: (containerId, selectedIcon) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        let html = `
            <div class="mb-2">
                <label class="font-mono text-xs uppercase text-earth-metal block mb-1">Icon</label>
                <button type="button" class="input-field flex items-center gap-2" onclick="Setup.toggleIconGrid('${containerId}')">
                    <i data-lucide="${selectedIcon || 'circle'}" class="w-5 h-5"></i>
                    <span class="text-sm">${selectedIcon || 'circle'}</span>
                    <i data-lucide="chevron-down" class="w-4 h-4 ml-auto"></i>
                </button>
            </div>
            <div id="${containerId}Grid" class="hidden border border-oatmeal p-2 max-h-48 overflow-y-auto mb-4">
                <input type="text" class="input-field text-xs mb-2" placeholder="Search icons..." 
                    oninput="Setup.filterIcons('${containerId}', this.value)">
                <div class="grid grid-cols-8 gap-1" id="${containerId}Icons">
                    ${Setup.availableIcons.map(icon => `
                        <button type="button" class="p-2 hover:bg-oatmeal/50 ${icon === selectedIcon ? 'bg-dull-purple/20' : ''}" 
                            onclick="Setup.selectIcon('${containerId}', '${icon}')" title="${icon}">
                            <i data-lucide="${icon}" class="w-4 h-4"></i>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    toggleIconGrid: (containerId) => {
        const grid = document.getElementById(`${containerId}Grid`);
        if (grid) grid.classList.toggle('hidden');
    },

    filterIcons: (containerId, query) => {
        const container = document.getElementById(`${containerId}Icons`);
        if (!container) return;

        const q = query.toLowerCase();
        container.querySelectorAll('button').forEach(btn => {
            const icon = btn.getAttribute('title');
            btn.style.display = icon.includes(q) ? '' : 'none';
        });
    },

    selectIcon: (containerId, icon) => {
        Setup.selectedIcon = icon;
        Setup.renderIconPicker(containerId, icon);
        document.getElementById(`${containerId}Grid`)?.classList.add('hidden');
    },

    renderColorPicker: (containerId, selectedColor) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        const html = `
            <label class="font-mono text-xs uppercase text-earth-metal block mb-1">Color</label>
            <div class="flex flex-wrap gap-2">
                ${Setup.availableColors.map(c => `
                    <button type="button" class="w-8 h-8 border-2 ${c.value === selectedColor ? 'border-charcoal' : 'border-transparent'}" 
                        style="background: ${c.hex}" 
                        onclick="Setup.selectColor('${containerId}', '${c.value}')"
                        title="${c.name}"></button>
                `).join('')}
            </div>
        `;

        container.innerHTML = html;
    },

    selectColor: (containerId, color) => {
        Setup.selectedColor = color;
        Setup.renderColorPicker(containerId, color);
    },

    /**
     * Calculate next due date for a recurring event type
     */
    calculateNextDue: (eventType) => {
        if (!eventType.isRecurring || !eventType.anchorDate) return null;

        const now = new Date();
        const anchor = new Date(eventType.anchorDate);
        const interval = eventType.intervalValue || 1;
        const unit = eventType.intervalUnit || 'Months';

        // For Fixed schedule: find next occurrence from anchor
        // For Rolling schedule: nextDue is calculated based on last completion (handled elsewhere)
        if (eventType.scheduleType === 'One-off') {
            return eventType.anchorDate;
        }

        let nextDue = new Date(anchor);

        // Find the next occurrence that is in the future
        while (nextDue <= now) {
            switch (unit) {
                case 'Days':
                    nextDue.setDate(nextDue.getDate() + interval);
                    break;
                case 'Weeks':
                    nextDue.setDate(nextDue.getDate() + (interval * 7));
                    break;
                case 'Months':
                    nextDue.setMonth(nextDue.getMonth() + interval);
                    break;
                case 'Years':
                    nextDue.setFullYear(nextDue.getFullYear() + interval);
                    break;
            }
        }

        // Check if past end date
        if (eventType.endDate && nextDue > new Date(eventType.endDate)) {
            return null;
        }

        // FIX #10: Use local date to avoid UTC timezone shift
        return PetTracker.UI.localDateYYYYMMDD(nextDue);
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.Setup = Setup;
window.Setup = Setup;
