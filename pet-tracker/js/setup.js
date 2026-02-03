/**
 * Pet Tracker - Setup Module
 * Manage Event Types, Scales, Scale Levels, Care Items, Care Plans
 */

const Setup = {
    currentTab: 'eventTypes',
    editingId: null,

    // Common Lucide icons for pet tracking (subset for icon picker)
    availableIcons: [
        // Health & Medical
        'pill', 'syringe', 'stethoscope', 'thermometer', 'heart', 'heart-pulse', 'activity',
        'bandage', 'cross', 'plus-circle', 'alert-circle', 'alert-triangle',
        // Symptoms
        'droplet', 'droplets', 'wind', 'cloud', 'flame', 'snowflake', 'zap',
        // Body & Wellness  
        'eye', 'ear', 'hand', 'bone', 'brain', 'lungs',
        // Activities
        'footprints', 'paw-print', 'dog', 'cat', 'bird', 'fish', 'rabbit',
        'dumbbell', 'timer', 'clock', 'sun', 'moon', 'sunrise', 'sunset',
        // Food & Nutrition
        'utensils', 'cookie', 'apple', 'carrot', 'beef', 'egg', 'milk', 'cup-soda',
        'glass-water', 'coffee',
        // Grooming & Care
        'scissors', 'sparkles', 'spray-can', 'bath', 'shower-head', 'brush',
        // Emotions & Behavior
        'smile', 'frown', 'meh', 'angry', 'laugh', 'heart-crack', 'heart-handshake',
        // Tracking & Measurement
        'scale', 'ruler', 'gauge', 'chart-line', 'chart-bar', 'trending-up', 'trending-down',
        // General
        'calendar', 'calendar-check', 'clipboard', 'clipboard-check', 'file-text', 'notebook',
        'camera', 'image', 'video', 'mic', 'phone', 'mail',
        'home', 'map-pin', 'navigation', 'car', 'plane',
        'shield', 'shield-check', 'shield-plus', 'lock', 'key',
        'star', 'award', 'trophy', 'medal', 'crown', 'gift',
        'check', 'check-circle', 'x', 'x-circle', 'info', 'help-circle',
        'refresh-cw', 'repeat', 'undo', 'redo',
        'test-tube', 'microscope', 'dna', 'bug', 'leaf', 'flower',
        'gamepad-2', 'puzzle', 'toy-brick', 'blocks'
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

    // Care item types
    careItemTypes: ['Medication', 'Vaccine', 'Procedure', 'Grooming', 'Supplement', 'Other'],

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
            case 'careItems':
                await Setup.renderCareItems(container);
                break;
            case 'carePlans':
                await Setup.renderCarePlans(container);
                break;
        }

        if (window.lucide) lucide.createIcons();
    },

    // ============ EVENT TYPES ============

    renderEventTypes: async (container) => {
        const eventTypes = await PetTracker.DB.getAll(PetTracker.STORES.EVENT_TYPES);
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
                    html += `
                        <div class="flex items-center gap-3 p-3 border border-oatmeal hover:border-dull-purple transition-fast cursor-pointer" onclick="Setup.showEventTypeModal('${et.id}')">
                            <div class="w-10 h-10 flex items-center justify-center" style="background: ${colorObj.hex}20; color: ${colorObj.hex}">
                                <i data-lucide="${et.defaultIcon || 'circle'}" class="w-5 h-5"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm text-charcoal font-medium truncate">${PetTracker.UI.escapeHtml(et.name)}</p>
                                <p class="text-xs text-earth-metal">${et.trackingMode || 'Stamp'}${et.usesSeverity ? ' • Uses Severity' : ''}</p>
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
            defaultValueKind: null
        };

        if (id) {
            const existing = await PetTracker.DB.get(PetTracker.STORES.EVENT_TYPES, id);
            if (existing) data = { ...data, ...existing };
        }

        const modal = document.getElementById('eventTypeModal');
        if (!modal) return;

        // Populate form
        document.getElementById('eventTypeName').value = data.name;
        document.getElementById('eventTypeCategory').value = data.category;
        document.getElementById('eventTypeTrackingMode').value = data.trackingMode;
        document.getElementById('eventTypeUsesSeverity').checked = data.usesSeverity;
        document.getElementById('eventTypeAllowAttachments').checked = data.allowAttachments;
        document.getElementById('eventTypeValueKind').value = data.defaultValueKind || '';

        // Set icon and color
        Setup.selectedIcon = data.defaultIcon || 'circle';
        Setup.selectedColor = data.defaultColor || 'purple';
        Setup.renderIconPicker('eventTypeIconPicker', Setup.selectedIcon);
        Setup.renderColorPicker('eventTypeColorPicker', Setup.selectedColor);

        // Update modal title
        document.getElementById('eventTypeModalTitle').textContent = id ? 'Edit Event Type' : 'Add Event Type';

        PetTracker.UI.openModal('eventTypeModal');
    },

    saveEventType: async () => {
        const name = document.getElementById('eventTypeName').value.trim();
        const category = document.getElementById('eventTypeCategory').value;
        const trackingMode = document.getElementById('eventTypeTrackingMode').value;
        const usesSeverity = document.getElementById('eventTypeUsesSeverity').checked;
        const allowAttachments = document.getElementById('eventTypeAllowAttachments').checked;
        const defaultValueKind = document.getElementById('eventTypeValueKind').value || null;

        if (!name) {
            PetTracker.UI.toast('Name is required', 'error');
            return;
        }

        const now = new Date().toISOString();
        const data = {
            id: Setup.editingId || PetTracker.generateId(),
            name,
            category,
            trackingMode,
            defaultIcon: Setup.selectedIcon || 'circle',
            defaultColor: Setup.selectedColor || 'purple',
            usesSeverity,
            allowAttachments,
            defaultValueKind,
            updatedAt: now,
            synced: false
        };

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

        await PetTracker.DB.delete(PetTracker.STORES.EVENT_TYPES, id);
        await PetTracker.SyncQueue.add({
            type: 'delete',
            store: 'eventTypes',
            recordId: id
        });

        if (PetTracker.Sync?.updatePendingCount) PetTracker.Sync.updatePendingCount();
        PetTracker.UI.toast('Event type deleted', 'info');

        App.state.eventTypes = await PetTracker.DB.getAll(PetTracker.STORES.EVENT_TYPES);
        Setup.renderTabContent();
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

        if (!name) {
            PetTracker.UI.toast('Name is required', 'error');
            return;
        }

        const now = new Date().toISOString();
        const data = {
            id: Setup.editingId || PetTracker.generateId(),
            name,
            valueType,
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

        // Delete levels first
        const levels = await PetTracker.DB.query(PetTracker.STORES.SCALE_LEVELS, l => l.scaleId === id);
        for (const level of levels) {
            await PetTracker.DB.delete(PetTracker.STORES.SCALE_LEVELS, level.id);
            await PetTracker.SyncQueue.add({ type: 'delete', store: 'scaleLevels', recordId: level.id });
        }

        await PetTracker.DB.delete(PetTracker.STORES.SCALES, id);
        await PetTracker.SyncQueue.add({ type: 'delete', store: 'scales', recordId: id });

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

    // ============ CARE ITEMS ============

    renderCareItems: async (container) => {
        const careItems = await PetTracker.DB.getAll(PetTracker.STORES.CARE_ITEMS);
        careItems.sort((a, b) => (a.type || '').localeCompare(b.type || '') || a.name.localeCompare(b.name));

        // Group by type
        const grouped = {};
        careItems.forEach(ci => {
            const t = ci.type || 'Other';
            if (!grouped[t]) grouped[t] = [];
            grouped[t].push(ci);
        });

        let html = `
            <div class="flex items-center justify-between mb-4">
                <p class="text-sm text-earth-metal">${careItems.length} care item${careItems.length !== 1 ? 's' : ''} configured</p>
                <button onclick="Setup.showCareItemModal()" class="btn-primary px-4 py-2 font-mono text-xs uppercase">
                    <i data-lucide="plus" class="w-4 h-4 inline mr-1"></i>Add Care Item
                </button>
            </div>
            <p class="text-xs text-earth-metal mb-4">
                Care items are medications, vaccines, and procedures that can be scheduled in care plans.
            </p>
        `;

        if (careItems.length === 0) {
            html += `<div class="border border-oatmeal p-8 text-center">
                <i data-lucide="heart-handshake" class="w-12 h-12 text-oatmeal mx-auto mb-4"></i>
                <p class="text-earth-metal">No care items configured yet</p>
                <button onclick="Setup.showCareItemModal()" class="btn-secondary px-4 py-2 font-mono text-xs uppercase mt-4">
                    Create Your First Care Item
                </button>
            </div>`;
        } else {
            for (const type of Object.keys(grouped).sort()) {
                html += `
                    <div class="mb-6">
                        <h3 class="font-mono text-xs uppercase text-earth-metal mb-2">${type}</h3>
                        <div class="grid gap-2">
                `;

                for (const ci of grouped[type]) {
                    html += `
                        <div class="flex items-center gap-3 p-3 border border-oatmeal hover:border-dull-purple transition-fast cursor-pointer" onclick="Setup.showCareItemModal('${ci.id}')">
                            <div class="w-10 h-10 flex items-center justify-center bg-dull-purple/10 text-dull-purple">
                                <i data-lucide="${ci.type === 'Medication' ? 'pill' : ci.type === 'Vaccine' ? 'syringe' : 'clipboard-check'}" class="w-5 h-5"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm text-charcoal font-medium truncate">${PetTracker.UI.escapeHtml(ci.name)}</p>
                                <p class="text-xs text-earth-metal">${ci.defaultDose || 'No default dose'}${ci.active === false ? ' • Inactive' : ''}</p>
                            </div>
                            <button onclick="event.stopPropagation(); Setup.deleteCareItem('${ci.id}')" class="p-2 text-earth-metal hover:text-muted-pink">
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

    showCareItemModal: async (id = null) => {
        Setup.editingId = id;
        let data = { name: '', type: 'Medication', defaultDose: '', active: true, notes: '' };

        if (id) {
            const existing = await PetTracker.DB.get(PetTracker.STORES.CARE_ITEMS, id);
            if (existing) data = { ...data, ...existing };
        }

        const modal = document.getElementById('careItemModal');
        if (!modal) return;

        document.getElementById('careItemName').value = data.name;
        document.getElementById('careItemType').value = data.type;
        document.getElementById('careItemDefaultDose').value = data.defaultDose || '';
        document.getElementById('careItemActive').checked = data.active !== false;
        document.getElementById('careItemNotes').value = data.notes || '';
        document.getElementById('careItemModalTitle').textContent = id ? 'Edit Care Item' : 'Add Care Item';

        PetTracker.UI.openModal('careItemModal');
    },

    saveCareItem: async () => {
        const name = document.getElementById('careItemName').value.trim();
        const type = document.getElementById('careItemType').value;
        const defaultDose = document.getElementById('careItemDefaultDose').value.trim();
        const active = document.getElementById('careItemActive').checked;
        const notes = document.getElementById('careItemNotes').value.trim();

        if (!name) {
            PetTracker.UI.toast('Name is required', 'error');
            return;
        }

        const now = new Date().toISOString();
        const data = {
            id: Setup.editingId || PetTracker.generateId(),
            name,
            type,
            defaultDose,
            active,
            notes,
            updatedAt: now,
            synced: false
        };

        if (!Setup.editingId) data.createdAt = now;

        await PetTracker.DB.put(PetTracker.STORES.CARE_ITEMS, data);
        await PetTracker.SyncQueue.add({
            type: Setup.editingId ? 'update' : 'create',
            store: 'careItems',
            recordId: data.id,
            data
        });

        if (PetTracker.Sync?.updatePendingCount) PetTracker.Sync.updatePendingCount();

        PetTracker.UI.closeModal('careItemModal');
        PetTracker.UI.toast(Setup.editingId ? 'Care item updated' : 'Care item created', 'success');
        Setup.renderTabContent();
    },

    deleteCareItem: async (id) => {
        if (!confirm('Delete this care item?')) return;

        await PetTracker.DB.delete(PetTracker.STORES.CARE_ITEMS, id);
        await PetTracker.SyncQueue.add({ type: 'delete', store: 'careItems', recordId: id });

        if (PetTracker.Sync?.updatePendingCount) PetTracker.Sync.updatePendingCount();
        PetTracker.UI.toast('Care item deleted', 'info');
        Setup.renderTabContent();
    },

    // ============ CARE PLANS ============

    renderCarePlans: async (container) => {
        const carePlans = await PetTracker.DB.getAll(PetTracker.STORES.CARE_PLANS);
        const pets = await PetTracker.DB.getAll(PetTracker.STORES.PETS);
        const careItems = await PetTracker.DB.getAll(PetTracker.STORES.CARE_ITEMS);

        const petsById = {};
        pets.forEach(p => petsById[p.id] = p);
        const careItemsById = {};
        careItems.forEach(ci => careItemsById[ci.id] = ci);

        let html = `
            <div class="flex items-center justify-between mb-4">
                <p class="text-sm text-earth-metal">${carePlans.length} care plan${carePlans.length !== 1 ? 's' : ''} configured</p>
                <button onclick="Setup.showCarePlanModal()" class="btn-primary px-4 py-2 font-mono text-xs uppercase">
                    <i data-lucide="plus" class="w-4 h-4 inline mr-1"></i>Add Care Plan
                </button>
            </div>
            <p class="text-xs text-earth-metal mb-4">
                Care plans schedule recurring care items (e.g., monthly heartworm medication).
            </p>
        `;

        if (carePlans.length === 0) {
            html += `<div class="border border-oatmeal p-8 text-center">
                <i data-lucide="calendar-check" class="w-12 h-12 text-oatmeal mx-auto mb-4"></i>
                <p class="text-earth-metal">No care plans configured yet</p>
                <button onclick="Setup.showCarePlanModal()" class="btn-secondary px-4 py-2 font-mono text-xs uppercase mt-4">
                    Create Your First Care Plan
                </button>
            </div>`;
        } else {
            html += '<div class="space-y-3">';
            for (const plan of carePlans) {
                const petNames = (plan.petIds || []).map(id => petsById[id]?.name || 'Unknown').join(', ');
                const careItem = careItemsById[plan.careItemId];
                html += `
                    <div class="flex items-center gap-3 p-4 border border-oatmeal hover:border-dull-purple transition-fast cursor-pointer" onclick="Setup.showCarePlanModal('${plan.id}')">
                        <div class="w-10 h-10 flex items-center justify-center bg-dull-purple/10 text-dull-purple">
                            <i data-lucide="calendar-check" class="w-5 h-5"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm text-charcoal font-medium truncate">${PetTracker.UI.escapeHtml(plan.name)}</p>
                            <p class="text-xs text-earth-metal">
                                ${careItem ? careItem.name : 'No care item'} • 
                                Every ${plan.intervalValue} ${plan.intervalUnit?.toLowerCase() || 'days'} • 
                                ${petNames || 'No pets'}
                            </p>
                            ${plan.nextDue ? `<p class="text-xs text-dull-purple">Next: ${plan.nextDue}</p>` : ''}
                        </div>
                        <button onclick="event.stopPropagation(); Setup.deleteCarePlan('${plan.id}')" class="p-2 text-earth-metal hover:text-muted-pink">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                `;
            }
            html += '</div>';
        }

        container.innerHTML = html;
    },

    showCarePlanModal: async (id = null) => {
        Setup.editingId = id;

        // Load pets and care items for dropdowns
        const pets = await PetTracker.DB.getAll(PetTracker.STORES.PETS);
        const careItems = await PetTracker.DB.getAll(PetTracker.STORES.CARE_ITEMS);

        let data = {
            name: '',
            petIds: [],
            careItemId: '',
            scheduleType: 'Fixed',
            intervalValue: 1,
            intervalUnit: 'Months',
            anchorDate: PetTracker.UI.localDateYYYYMMDD(),
            notes: ''
        };

        if (id) {
            const existing = await PetTracker.DB.get(PetTracker.STORES.CARE_PLANS, id);
            if (existing) data = { ...data, ...existing };
        }

        const modal = document.getElementById('carePlanModal');
        if (!modal) return;

        document.getElementById('carePlanName').value = data.name;
        document.getElementById('carePlanScheduleType').value = data.scheduleType;
        document.getElementById('carePlanIntervalValue').value = data.intervalValue;
        document.getElementById('carePlanIntervalUnit').value = data.intervalUnit;
        document.getElementById('carePlanAnchorDate').value = data.anchorDate;
        document.getElementById('carePlanNotes').value = data.notes || '';
        document.getElementById('carePlanModalTitle').textContent = id ? 'Edit Care Plan' : 'Add Care Plan';

        // Populate care item dropdown
        const careItemSelect = document.getElementById('carePlanCareItem');
        careItemSelect.innerHTML = '<option value="">-- Select Care Item --</option>' +
            careItems.map(ci => `<option value="${ci.id}" ${ci.id === data.careItemId ? 'selected' : ''}>${PetTracker.UI.escapeHtml(ci.name)}</option>`).join('');

        // Populate pet checkboxes
        const petCheckboxes = document.getElementById('carePlanPetCheckboxes');
        petCheckboxes.innerHTML = pets.map(p => `
            <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="carePlanPets" value="${p.id}" ${data.petIds?.includes(p.id) ? 'checked' : ''} class="w-4 h-4">
                <span class="text-sm">${PetTracker.UI.escapeHtml(p.name)}</span>
            </label>
        `).join('');

        PetTracker.UI.openModal('carePlanModal');
    },

    saveCarePlan: async () => {
        const name = document.getElementById('carePlanName').value.trim();
        const careItemId = document.getElementById('carePlanCareItem').value;
        const scheduleType = document.getElementById('carePlanScheduleType').value;
        const intervalValue = parseInt(document.getElementById('carePlanIntervalValue').value) || 1;
        const intervalUnit = document.getElementById('carePlanIntervalUnit').value;
        const anchorDate = document.getElementById('carePlanAnchorDate').value;
        const notes = document.getElementById('carePlanNotes').value.trim();

        const petIds = Array.from(document.querySelectorAll('input[name="carePlanPets"]:checked')).map(cb => cb.value);

        if (!name) {
            PetTracker.UI.toast('Name is required', 'error');
            return;
        }

        const now = new Date().toISOString();
        const data = {
            id: Setup.editingId || PetTracker.generateId(),
            name,
            petIds,
            careItemId: careItemId || null,
            scheduleType,
            intervalValue,
            intervalUnit,
            anchorDate,
            notes,
            updatedAt: now,
            synced: false
        };

        // Calculate next due
        data.nextDue = Care.calculateNextDue(data);

        if (!Setup.editingId) data.createdAt = now;

        await PetTracker.DB.put(PetTracker.STORES.CARE_PLANS, data);
        await PetTracker.SyncQueue.add({
            type: Setup.editingId ? 'update' : 'create',
            store: 'carePlans',
            recordId: data.id,
            data
        });

        if (PetTracker.Sync?.updatePendingCount) PetTracker.Sync.updatePendingCount();

        PetTracker.UI.closeModal('carePlanModal');
        PetTracker.UI.toast(Setup.editingId ? 'Care plan updated' : 'Care plan created', 'success');
        Setup.renderTabContent();
    },

    deleteCarePlan: async (id) => {
        if (!confirm('Delete this care plan?')) return;

        await PetTracker.DB.delete(PetTracker.STORES.CARE_PLANS, id);
        await PetTracker.SyncQueue.add({ type: 'delete', store: 'carePlans', recordId: id });

        if (PetTracker.Sync?.updatePendingCount) PetTracker.Sync.updatePendingCount();
        PetTracker.UI.toast('Care plan deleted', 'info');
        Setup.renderTabContent();
    },

    // ============ ICON & COLOR PICKERS ============

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
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.Setup = Setup;
window.Setup = Setup;
