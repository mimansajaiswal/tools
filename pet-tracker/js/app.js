/**
 * Pet Tracker - Main App Controller
 * Initialization, routing, and state management
 */

const APP_OAUTH_DEV_PASSWORD_KEY = 'oauth_dev_password';
const APP_OAUTH_BASE = 'https://notion-oauth-handler.mimansa-jaiswal.workers.dev';

const App = {
    state: {
        currentView: 'dashboard',
        activePetId: null,
        pets: [],
        eventTypes: [],
        isOnline: navigator.onLine,
        pendingAttachments: [],
        attachmentPreviews: [],
        deferredPrompt: null,
        addEventTypeOptions: [],
        addEventSelectedTypeId: null,
        addEventAvailableTags: [],
        addEventSelectedTags: []
    },

    /**
     * Initialize the app
     */
    init: async () => {
        console.log('[App] Initializing Pet Tracker...');

        // Register service worker
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('./service-worker.js');
                console.log('[App] Service worker registered');
            } catch (e) {
                console.warn('[App] Service worker registration failed:', e);
            }
        }

        // Initialize database
        try {
            await PetTracker.DB.open();
            console.log('[App] Database ready');
        } catch (e) {
            console.error('[App] Database error:', e);
        }

        // Setup UI handlers
        PetTracker.UI.setupModalOverlays();
        PetTracker.UI.setupTabs();
        App.setupEventListeners();

        // Initialize Lucide icons
        if (window.lucide) lucide.createIcons();

        // Handle OAuth return (check for accessToken in URL)
        const oauthReturned = App.handleOAuthReturn();

        // Check onboarding status
        if (!PetTracker.Settings.isOnboardingDone() || !PetTracker.Settings.isConnected()) {
            App.showOnboarding();
        } else {
            await App.loadData();
            // Restore UI state from localStorage
            await App.restoreUIState();
        }

        // Online/offline handling
        window.addEventListener('online', () => {
            App.state.isOnline = true;
            App.updateSyncStatus();
            PetTracker.UI.toast('Back online', 'success');
            // Sync.run() is called by Sync.init() listener
        });

        window.addEventListener('offline', () => {
            App.state.isOnline = false;
            App.updateSyncStatus();
            PetTracker.UI.toast('You are offline - changes will sync when back online', 'warning');
        });

        // Initialize background sync engine
        if (PetTracker.Sync) {
            PetTracker.Sync.init();
        }

        // Handle share target
        if (window.location.search.includes('share=true')) {
            navigator.serviceWorker?.addEventListener('message', (event) => {
                if (event.data.type === 'SHARE_TARGET') {
                    App.handleShareTarget(event.data.files);
                }
            });

            // Also drain any pending shares from IndexedDB (fallback if postMessage missed)
            App.drainPendingShares();
        }

        // PWA install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            App.state.deferredPrompt = e;
            const installBtn = document.getElementById('installPwaBtn');
            if (installBtn) installBtn.classList.remove('hidden');
            console.log('[App] PWA install prompt available');
        });

        window.addEventListener('appinstalled', () => {
            App.state.deferredPrompt = null;
            const installBtn = document.getElementById('installPwaBtn');
            if (installBtn) installBtn.classList.add('hidden');
            PetTracker.UI.toast('App installed successfully!', 'success');
            console.log('[App] PWA installed');
        });

        console.log('[App] Initialization complete');
    },

    /**
     * Setup global event listeners
     */
    setupEventListeners: () => {
        // Global keyboard shortcuts (Escape handled by UI.handleModalKeydown)
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + N opens add modal
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                App.openAddModal();
            }
        });

        // Navigation clicks
        document.querySelectorAll('[data-nav]').forEach(btn => {
            btn.addEventListener('click', () => {
                App.showView(btn.dataset.nav);
                // Close mobile menu after navigation
                App.closeMobileMenu();
            });
        });

        // Handle browser back/forward navigation
        window.addEventListener('popstate', (e) => {
            if (e.state?.view) {
                App.showView(e.state.view, false);
            } else {
                // Check URL for view param
                const url = new URL(window.location.href);
                const view = url.searchParams.get('view') || 'dashboard';
                App.showView(view, false);
            }
        });

        // Close custom dropdowns when clicking outside.
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#addEventTypeInput') && !e.target.closest('#addEventTypeDropdown')) {
                App.closeAddEventTypeDropdown();
            }
            if (!e.target.closest('#addEventTagsDropdown')) {
                App.closeEventTagsMenu();
            }
        });
    },

    /**
     * Show a view
     */
    showView: (viewName, pushHistory = true) => {
        App.state.currentView = viewName;

        // Save UI state
        PetTracker.Settings.setUIState({ currentView: viewName });

        // Update nav active states
        document.querySelectorAll('[data-nav]').forEach(btn => {
            btn.classList.toggle('text-dull-purple', btn.dataset.nav === viewName);
            btn.classList.toggle('text-earth-metal', btn.dataset.nav !== viewName);
        });

        // Hide all views, show selected
        document.querySelectorAll('[data-view]').forEach(view => {
            view.classList.toggle('hidden', view.dataset.view !== viewName);
        });

        // Update header title
        const titles = {
            dashboard: 'Dashboard',
            calendar: 'Calendar',
            upcoming: 'Upcoming',
            analytics: 'Analytics',
            pets: 'Pets',
            contacts: 'Contacts',
            setup: 'Setup',
            settings: 'Settings'
        };
        const headerTitle = document.getElementById('headerTitle');
        if (headerTitle) headerTitle.textContent = titles[viewName] || viewName;

        // Push to browser history for back/forward navigation
        if (pushHistory) {
            const url = new URL(window.location.href);
            url.searchParams.set('view', viewName);
            window.history.pushState({ view: viewName }, '', url.toString());
        }

        // Refresh icons
        if (window.lucide) lucide.createIcons();

        // View-specific initialization
        switch (viewName) {
            case 'dashboard':
                App.renderDashboard();
                break;
            case 'calendar':
                // Initialize calendar if not already done (restores view preference)
                if (typeof Calendar !== 'undefined' && !Calendar._initialized) {
                    Calendar.init();
                    Calendar._initialized = true;
                }
                Calendar.render();
                break;
            case 'upcoming':
                Care.renderUpcoming();
                break;
            case 'pets':
                Pets.renderList();
                break;
            case 'analytics':
                Analytics.render();
                break;
            case 'contacts':
                Contacts.renderList();
                break;
            case 'setup':
                Setup.render();
                break;
        }
    },

    /**
     * Load data from IndexedDB
     */
    loadData: async () => {
        try {
            App.state.pets = await PetTracker.DB.getAll(PetTracker.STORES.PETS);
            App.state.eventTypes = await PetTracker.DB.getAll(PetTracker.STORES.EVENT_TYPES);
            App.state.activePetId = PetTracker.Settings.getActivePet();

            // Populate pet filter dropdowns
            App.populatePetFilters();

            console.log(`[App] Loaded ${App.state.pets.length} pets, ${App.state.eventTypes.length} event types`);
        } catch (e) {
            console.error('[App] Error loading data:', e);
        }
    },

    /**
     * Populate pet filter dropdowns in sidebar
     */
    populatePetFilters: () => {
        const desktopFilter = document.getElementById('petFilterDesktop');
        if (desktopFilter) {
            const activePet = App.state.activePetId || '';
            desktopFilter.innerHTML = '<option value="">All Pets</option>' +
                App.state.pets.map(p =>
                    `<option value="${p.id}" ${p.id === activePet ? 'selected' : ''}>${PetTracker.UI.escapeHtml(p.name)}</option>`
                ).join('');
        }
    },

    /**
     * Restore UI state from localStorage
     */
    restoreUIState: async () => {
        const uiState = PetTracker.Settings.getUIState();
        const currentView = uiState.currentView || 'dashboard';

        // Restore pet filter if saved
        if (uiState.filterPetId) {
            App.state.activePetId = uiState.filterPetId;
            const desktopFilter = document.getElementById('petFilterDesktop');
            if (desktopFilter) desktopFilter.value = uiState.filterPetId;
        }

        // Show the saved view (don't push to history on restore)
        App.showView(currentView, false);

        // If we were viewing a specific pet, restore that
        if (currentView === 'pets' && uiState.viewingPetId) {
            const pet = await Pets.get(uiState.viewingPetId);
            if (pet) {
                // Small delay to let the view render first
                setTimeout(() => Pets.showDetail(uiState.viewingPetId), 50);
            }
        }

        console.log('[App] Restored UI state:', { currentView, viewingPetId: uiState.viewingPetId, filterPetId: uiState.filterPetId });
    },

    /**
     * Show onboarding wizard
     */
    showOnboarding: () => {
        Onboarding.init();
        PetTracker.UI.openModal('onboardingModal');
    },

    /**
     * Open Add Event modal
     */
    openAddModal: async (prefill = {}) => {
        const form = document.getElementById('addEventForm');
        if (form) {
            form.reset();
            form.dataset.editId = '';
        }

        if (!prefill.keepAttachments) {
            App.clearAttachments();
        }

        // Update header
        const header = document.querySelector('#addEventModal .section-header');
        if (header) header.textContent = 'Add Event';

        // Populate pet dropdown
        const petSelect = document.getElementById('addEventPet');
        if (petSelect) {
            const activePet = prefill.pet || App.state.activePetId;
            petSelect.innerHTML = App.state.pets.map(p =>
                `<option value="${p.id}" ${p.id === activePet ? 'selected' : ''}>${p.name}</option>`
            ).join('');
            if (App.state.pets.length === 0) {
                petSelect.innerHTML = '<option value="">No pets - add one first</option>';
            }
            petSelect.onchange = async () => {
                await App.updateAddEventTypeOptions(petSelect.value, null, true);
            };
        }

        await App.initEventTagsDropdown(Array.isArray(prefill.tags) ? prefill.tags : []);

        const activePetId = petSelect?.value || prefill.pet || null;
        await App.updateAddEventTypeOptions(
            activePetId,
            prefill.type || null,
            true,
            prefill.severityLevelId || null
        );

        // Set defaults
        const dateInput = document.getElementById('addEventDate');
        if (dateInput) dateInput.value = prefill.date || PetTracker.UI.localDateYYYYMMDD();

        const timeInput = document.getElementById('addEventTime');
        if (timeInput) timeInput.value = prefill.time || new Date().toTimeString().slice(0, 5);

        // Clear other fields
        const valueInput = document.getElementById('addEventValue');
        if (valueInput) valueInput.value = prefill.value || '';
        const unitInput = document.getElementById('addEventUnit');
        if (unitInput) unitInput.value = prefill.unit || '';

        const notesInput = document.getElementById('addEventNotes');
        if (notesInput) notesInput.value = prefill.notes || '';

        // FIX #8: Clear and populate advanced fields
        const endDateInput = document.getElementById('addEventEndDate');
        if (endDateInput) endDateInput.value = prefill.endDate || '';
        const durationInput = document.getElementById('addEventDuration');
        if (durationInput) durationInput.value = prefill.duration ?? '';
        const costInput = document.getElementById('addEventCost');
        if (costInput) costInput.value = prefill.cost ?? '';
        const costCatInput = document.getElementById('addEventCostCategory');
        if (costCatInput) costCatInput.value = prefill.costCategory || '';
        const costCurrInput = document.getElementById('addEventCostCurrency');
        if (costCurrInput) costCurrInput.value = prefill.costCurrency || '';

        // Populate provider dropdown from contacts
        const providerSelect = document.getElementById('addEventProvider');
        if (providerSelect) {
            const contacts = await PetTracker.DB.getAll(PetTracker.STORES.CONTACTS);
            providerSelect.innerHTML = '<option value="">None</option>' +
                contacts.map(c => `<option value="${c.id}">${PetTracker.UI.escapeHtml(c.name)} (${c.role || 'Contact'})</option>`).join('');
            if (prefill.providerId) {
                providerSelect.value = prefill.providerId;
            }
        }

        PetTracker.UI.openModal('addEventModal');
        if (window.lucide) lucide.createIcons();
    },

    getAllowedEventTypesForPet: (petId) => {
        const allTypes = App.state.eventTypes || [];
        if (!petId) return allTypes;

        // Backward compatibility: before mappings are configured, keep all types visible.
        const hasAnyScopedType = allTypes.some(t => Array.isArray(t.relatedPetIds) && t.relatedPetIds.filter(Boolean).length > 0);
        if (!hasAnyScopedType) return allTypes;

        // Once mappings exist, only show event types explicitly assigned to this pet.
        return allTypes.filter(t => {
            const related = Array.isArray(t.relatedPetIds) ? t.relatedPetIds.filter(Boolean) : [];
            return related.includes(petId);
        });
    },

    closeAddEventTypeDropdown: () => {
        const dropdown = document.getElementById('addEventTypeDropdown');
        if (dropdown) dropdown.classList.remove('open');
    },

    openAddEventTypeDropdown: () => {
        const dropdown = document.getElementById('addEventTypeDropdown');
        if (dropdown) dropdown.classList.add('open');
    },

    setAddEventTypeSelection: async (typeId, forceDefaults = false, severityLevelId = null) => {
        const input = document.getElementById('addEventTypeInput');
        const hidden = document.getElementById('addEventType');
        const selected = App.state.addEventTypeOptions.find(t => t.id === typeId) || null;

        App.state.addEventSelectedTypeId = selected?.id || null;

        if (input) {
            input.value = selected ? selected.name : '';
        }
        if (hidden) {
            hidden.value = selected?.id || '';
        }

        await App.updateSeveritySelector(selected?.id || null, severityLevelId);
        if (selected?.id) {
            App.applyEventTypeDefaults(selected.id, forceDefaults);
            App.applyEventTypeDefaultTags(selected.id, forceDefaults);
        }
    },

    renderAddEventTypeOptions: (filter = '') => {
        const dropdown = document.getElementById('addEventTypeDropdown');
        if (!dropdown) return;

        const term = (filter || '').trim().toLowerCase();
        const options = App.state.addEventTypeOptions
            .filter(t => !term || (t.name || '').toLowerCase().includes(term))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        if (options.length === 0) {
            dropdown.innerHTML = '<div class="combobox-option text-earth-metal">No matching event types</div>';
            return;
        }

        dropdown.innerHTML = options.map((t, idx) => `
            <div class="combobox-option ${idx === 0 ? 'highlighted' : ''}" data-value="${t.id}">
                ${PetTracker.UI.escapeHtml(t.name)}
            </div>
        `).join('');

        dropdown.querySelectorAll('.combobox-option[data-value]').forEach(opt => {
            opt.addEventListener('mousedown', async (e) => {
                e.preventDefault();
                await App.setAddEventTypeSelection(opt.dataset.value, true);
                App.closeAddEventTypeDropdown();
            });
        });
    },

    updateAddEventTypeOptions: async (petId, preferredTypeId = null, forceDefaults = false, severityLevelId = null) => {
        const input = document.getElementById('addEventTypeInput');
        const hidden = document.getElementById('addEventType');
        const dropdown = document.getElementById('addEventTypeDropdown');
        if (!input || !hidden || !dropdown) return;

        let allowedOptions = App.getAllowedEventTypesForPet(petId);
        if (preferredTypeId && !allowedOptions.some(t => t.id === preferredTypeId)) {
            const preferred = (App.state.eventTypes || []).find(t => t.id === preferredTypeId);
            if (preferred) {
                allowedOptions = [preferred, ...allowedOptions];
            }
        }
        App.state.addEventTypeOptions = allowedOptions;

        const current = preferredTypeId || App.state.addEventSelectedTypeId;
        const isCurrentAllowed = App.state.addEventTypeOptions.some(t => t.id === current);
        const selectedId = isCurrentAllowed ? current : null;

        if (App.state.addEventTypeOptions.length === 0) {
            input.value = '';
            hidden.value = '';
            App.state.addEventSelectedTypeId = null;
        }

        App.renderAddEventTypeOptions(input.value);
        await App.setAddEventTypeSelection(selectedId, forceDefaults, severityLevelId);

        input.onfocus = () => {
            App.renderAddEventTypeOptions(input.value);
            App.openAddEventTypeDropdown();
        };
        input.onclick = () => {
            App.renderAddEventTypeOptions(input.value);
            App.openAddEventTypeDropdown();
        };
        input.oninput = () => {
            const typed = (input.value || '').trim().toLowerCase();
            const exact = App.state.addEventTypeOptions.find(t => (t.name || '').toLowerCase() === typed);
            if (exact) {
                hidden.value = exact.id;
                App.state.addEventSelectedTypeId = exact.id;
            } else {
                hidden.value = '';
                App.state.addEventSelectedTypeId = null;
            }
            App.renderAddEventTypeOptions(input.value);
            App.openAddEventTypeDropdown();
        };
        input.onkeydown = (e) => {
            if (e.key === 'Escape') {
                App.closeAddEventTypeDropdown();
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                const first = dropdown.querySelector('.combobox-option[data-value]');
                if (first) first.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            }
        };
    },

    applyEventTypeDefaultTags: (eventTypeId, force = false) => {
        const eventType = (App.state.eventTypes || []).find(t => t.id === eventTypeId);
        if (!eventType) return;

        const defaultTags = Array.isArray(eventType.defaultTags)
            ? eventType.defaultTags.map(tag => (tag || '').trim()).filter(Boolean)
            : [];
        if (defaultTags.length === 0) return;

        const available = new Set(App.state.addEventAvailableTags || []);
        defaultTags.forEach(tag => available.add(tag));
        App.state.addEventAvailableTags = [...available].sort((a, b) => a.localeCompare(b));

        if (force && (App.state.addEventSelectedTags || []).length === 0) {
            App.state.addEventSelectedTags = [...new Set(defaultTags)].sort((a, b) => a.localeCompare(b));
            App.updateEventTagsLabel();
        }

        App.renderEventTagOptions();
    },

    collectExistingEventTags: async () => {
        const [events, eventTypes] = await Promise.all([
            PetTracker.DB.getAll(PetTracker.STORES.EVENTS),
            PetTracker.DB.getAll(PetTracker.STORES.EVENT_TYPES)
        ]);
        const tags = new Set();

        for (const e of events || []) {
            (e.tags || []).forEach(tag => {
                const normalized = (tag || '').trim();
                if (normalized) tags.add(normalized);
            });
        }
        for (const t of eventTypes || []) {
            (t.defaultTags || []).forEach(tag => {
                const normalized = (tag || '').trim();
                if (normalized) tags.add(normalized);
            });
        }

        return [...tags].sort((a, b) => a.localeCompare(b));
    },

    closeEventTagsMenu: () => {
        const menu = document.getElementById('addEventTagsMenu');
        const trigger = document.querySelector('#addEventTagsDropdown .multiselect-trigger');
        if (menu) menu.classList.add('hidden');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
    },

    toggleEventTagsMenu: () => {
        const menu = document.getElementById('addEventTagsMenu');
        const trigger = document.querySelector('#addEventTagsDropdown .multiselect-trigger');
        if (!menu || !trigger) return;

        const open = menu.classList.contains('hidden');
        if (open) {
            menu.classList.remove('hidden');
            trigger.setAttribute('aria-expanded', 'true');
            const search = document.getElementById('addEventTagsSearch');
            if (search) {
                search.focus();
                search.select();
            }
            App.renderEventTagOptions();
        } else {
            App.closeEventTagsMenu();
        }
    },

    updateEventTagsLabel: () => {
        const label = document.getElementById('addEventTagsLabel');
        const chips = document.getElementById('addEventTagsChips');
        if (!label || !chips) return;

        const tags = App.state.addEventSelectedTags || [];
        if (tags.length === 0) {
            label.innerHTML = 'Select or add tags...';
            label.className = 'multiselect-label text-sm text-earth-metal';
            chips.innerHTML = '';
            chips.classList.add('hidden');
            return;
        }

        const preview = tags.slice(0, 2).join(', ');
        label.innerHTML = tags.length > 2 ? `${PetTracker.UI.escapeHtml(preview)} <span class="multiselect-selected-count">+${tags.length - 2}</span>` : PetTracker.UI.escapeHtml(preview);
        label.className = 'multiselect-label text-sm text-charcoal';

        chips.classList.remove('hidden');
        chips.innerHTML = tags.map(tag => `
            <span class="multiselect-tag">
                ${PetTracker.UI.escapeHtml(tag)}
                <button type="button" aria-label="Remove ${PetTracker.UI.escapeHtml(tag)}" onclick="App.removeEventTag('${encodeURIComponent(tag)}')">×</button>
            </span>
        `).join('');
    },

    removeEventTag: (encodedTag) => {
        const decoded = decodeURIComponent(encodedTag || '');
        App.state.addEventSelectedTags = (App.state.addEventSelectedTags || []).filter(t => t !== decoded);
        App.updateEventTagsLabel();
        App.renderEventTagOptions();
    },

    toggleEventTagSelection: (tag) => {
        const value = (tag || '').trim();
        if (!value) return;

        if (!(App.state.addEventAvailableTags || []).includes(value)) {
            App.state.addEventAvailableTags = [...(App.state.addEventAvailableTags || []), value]
                .sort((a, b) => a.localeCompare(b));
        }

        const selected = new Set(App.state.addEventSelectedTags || []);
        if (selected.has(value)) selected.delete(value);
        else selected.add(value);

        App.state.addEventSelectedTags = [...selected].sort((a, b) => a.localeCompare(b));
        App.updateEventTagsLabel();
        App.renderEventTagOptions();
    },

    renderEventTagOptions: () => {
        const search = document.getElementById('addEventTagsSearch');
        const options = document.getElementById('addEventTagsOptions');
        if (!options) return;

        const term = (search?.value || '').trim();
        const termLower = term.toLowerCase();
        const selected = new Set(App.state.addEventSelectedTags || []);
        const all = App.state.addEventAvailableTags || [];
        const filtered = all.filter(tag => tag.toLowerCase().includes(termLower));

        let html = filtered.map(tag => `
            <label class="multiselect-option">
                <input type="checkbox" ${selected.has(tag) ? 'checked' : ''} onchange="App.toggleEventTagSelection(decodeURIComponent('${encodeURIComponent(tag)}'))">
                <span>${PetTracker.UI.escapeHtml(tag)}</span>
            </label>
        `).join('');

        const hasExact = all.some(tag => tag.toLowerCase() === termLower);
        if (term && !hasExact) {
            html += `
                <button type="button" class="multiselect-option w-full text-left" onclick="App.toggleEventTagSelection(decodeURIComponent('${encodeURIComponent(term)}'))">
                    + Add "${PetTracker.UI.escapeHtml(term)}"
                </button>
            `;
        }

        if (!html) {
            html = '<div class="text-xs text-earth-metal px-2 py-1">No tags yet</div>';
        }

        options.innerHTML = html;
    },

    initEventTagsDropdown: async (prefillTags = []) => {
        App.state.addEventAvailableTags = await App.collectExistingEventTags();
        App.state.addEventSelectedTags = [...new Set((prefillTags || []).map(t => (t || '').trim()).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b));

        const search = document.getElementById('addEventTagsSearch');
        if (search) {
            search.value = '';
            search.onkeydown = (e) => {
                if (e.key === 'Escape') {
                    App.closeEventTagsMenu();
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = search.value.trim();
                    if (value) App.toggleEventTagSelection(value);
                    search.value = '';
                    App.renderEventTagOptions();
                }
            };
        }

        App.updateEventTagsLabel();
        App.renderEventTagOptions();
        App.closeEventTagsMenu();
    },

    /**
     * Update severity selector based on event type
     */
    updateSeveritySelector: async (eventTypeId, selectedLevelId = null) => {
        const container = document.getElementById('addEventSeverityContainer');
        const select = document.getElementById('addEventSeverity');

        if (!container || !select) return;

        // Hide by default
        container.classList.add('hidden');
        select.innerHTML = '<option value="">-- Select Level --</option>';

        if (!eventTypeId) return;

        const eventType = App.state.eventTypes.find(t => t.id === eventTypeId);
        if (!eventType || !eventType.usesSeverity || !eventType.defaultScaleId) return;

        // Get scale levels for this scale
        const levels = await PetTracker.DB.query(
            PetTracker.STORES.SCALE_LEVELS,
            l => l.scaleId === eventType.defaultScaleId
        );

        if (levels.length === 0) return;

        // Sort by order
        levels.sort((a, b) => (a.order || 0) - (b.order || 0));

        // Populate dropdown
        select.innerHTML = '<option value="">-- Select Level --</option>' +
            levels.map(l => `<option value="${l.id}" ${l.id === selectedLevelId ? 'selected' : ''}>${PetTracker.UI.escapeHtml(l.name)}</option>`).join('');

        // Show container
        container.classList.remove('hidden');
    },

    /**
     * Apply defaults from selected event type to add-event fields
     */
    applyEventTypeDefaults: (eventTypeId, force = false) => {
        if (!eventTypeId) return;
        const eventType = App.state.eventTypes.find(t => t.id === eventTypeId);
        if (!eventType) return;

        const unitInput = document.getElementById('addEventUnit');
        if (unitInput && (force || !unitInput.value)) {
            unitInput.value = eventType.defaultUnit || '';
        }
    },

    /**
     * Save event from Add modal
     */
    saveEvent: async () => {
        const form = document.getElementById('addEventForm');
        if (!form) return;

        const editId = form.dataset.editId;
        const petId = document.getElementById('addEventPet')?.value;
        const eventTypeId = document.getElementById('addEventType')?.value;
        const date = document.getElementById('addEventDate')?.value;
        const time = document.getElementById('addEventTime')?.value;
        const notes = document.getElementById('addEventNotes')?.value;
        const value = document.getElementById('addEventValue')?.value;
        const unit = document.getElementById('addEventUnit')?.value?.trim() || null;
        const severityLevelId = document.getElementById('addEventSeverity')?.value || null;

        if (!petId || !date) {
            PetTracker.UI.toast('Please fill required fields', 'error');
            return;
        }

        if (!eventTypeId) {
            PetTracker.UI.toast('Please select an event type', 'error');
            return;
        }

        const eventType = App.state.eventTypes.find(t => t.id === eventTypeId);

        // Get existing media if editing an existing event
        let existingMedia = [];
        if (editId) {
            const existingEvent = await PetTracker.DB.get(PetTracker.STORES.EVENTS, editId);
            existingMedia = existingEvent?.media || [];
        }

        // FIX #8: Read advanced fields
        const endDate = document.getElementById('addEventEndDate')?.value || null;
        const duration = document.getElementById('addEventDuration')?.value;
        const cost = document.getElementById('addEventCost')?.value;
        const costCategory = document.getElementById('addEventCostCategory')?.value || null;
        const costCurrency = document.getElementById('addEventCostCurrency')?.value || null;
        const providerId = document.getElementById('addEventProvider')?.value || null;
        const tags = [...new Set(
            (App.state.addEventSelectedTags || [])
                .map(t => (t || '').trim())
                .filter(Boolean)
        )];

        const eventData = {
            title: eventType?.name || 'Event',
            petIds: [petId],
            eventTypeId: eventTypeId || null,
            startDate: time ? `${date}T${time}:00` : date,
            endDate: endDate || null,
            notes: notes || '',
            value: value ? parseFloat(value) : null,
            unit,
            severityLevelId: severityLevelId || null,
            duration: duration ? parseFloat(duration) : null,
            cost: cost ? parseFloat(cost) : null,
            costCategory,
            costCurrency,
            providerId,
            tags,
            media: existingMedia // Preserve existing media by default
        };

        try {
            // Process pending attachments (new files to add)
            if (App.state.pendingAttachments.length > 0) {
                PetTracker.UI.showLoading('Processing attachments...');
                const processedMedia = await Media.processAndStoreMedia(App.state.pendingAttachments);
                const warnings = processedMedia.map(m => m.warning).filter(Boolean);

                // Add new media to existing media
                const newMedia = processedMedia
                    .filter(m => !m.error)
                    .map(m => ({
                        id: m.id,
                        type: m.type,
                        name: m.originalName,
                        size: m.uploadSize || m.originalSize
                    }));

                // Combine existing and new media
                eventData.media = [...existingMedia, ...newMedia];

                PetTracker.UI.hideLoading();
                if (warnings.length > 0) {
                    PetTracker.UI.toast(warnings[0], 'warning');
                }
            }

            if (editId) {
                await Events.update(editId, eventData);
                PetTracker.UI.toast('Event updated', 'success');
            } else {
                await Events.create({
                    ...eventData,
                    status: 'Completed',
                    source: 'Manual'
                });
                PetTracker.UI.toast('Event saved', 'success');
            }

            App.clearAttachments();
            PetTracker.UI.closeModal('addEventModal');
            form.dataset.editId = '';

            // Refresh views
            App.renderDashboard();
            if (typeof Calendar !== 'undefined') Calendar.render?.();
        } catch (e) {
            console.error('[App] Error saving event:', e);
            PetTracker.UI.toast('Error saving event', 'error');
        }
    },

    /**
     * Classify attachment type for preview labels.
     */
    getAttachmentType: (file) => {
        const mime = file?.type || '';
        if (mime.startsWith('image/')) return 'image';
        if (mime.startsWith('video/')) return 'video';
        return 'file';
    },

    /**
     * Handle share target files
     */
    handleShareTarget: async (files) => {
        if (!files || files.length === 0) return;

        App.state.pendingAttachments = Array.from(files);
        App.state.attachmentPreviews = [];

        App.openAddModal({ keepAttachments: true });

        PetTracker.UI.toast(`Processing ${files.length} file(s)...`, 'info');

        try {
            for (const file of files) {
                const previewUrl = await Media.createThumbnailPreview(file);
                App.state.attachmentPreviews.push({
                    file,
                    previewUrl,
                    name: file.name,
                    type: App.getAttachmentType(file)
                });
            }
            App.renderAttachmentPreviews();
            PetTracker.UI.toast(`${files.length} file(s) ready to attach`, 'success');
        } catch (e) {
            console.error('[App] Error processing shared files:', e);
            PetTracker.UI.toast('Error processing files', 'error');
        }
    },

    /**
     * Drain pending shares from IndexedDB (fallback for postMessage timing issues)
     * FIX #4: Reconstruct File objects from stored ArrayBuffer data
     */
    drainPendingShares: async () => {
        const DB_NAME = 'PetTracker_ShareDB';
        const STORE_NAME = 'pendingShares';

        try {
            const db = await new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, 2);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (db.objectStoreNames.contains(STORE_NAME)) {
                        db.deleteObjectStore(STORE_NAME);
                    }
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                };
            });

            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            const allShares = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            if (allShares.length > 0) {
                // FIX #4: Each share is {id, name, type, data: ArrayBuffer, timestamp}
                // Reconstruct File objects from the stored ArrayBuffer data
                const files = allShares
                    .filter(share => share.data)
                    .map(share => new File([share.data], share.name || 'shared-file', { type: share.type || 'application/octet-stream' }));

                if (files.length > 0) {
                    console.log(`[App] Draining ${files.length} pending share files`);
                    await App.handleShareTarget(files);
                }

                // Clear the store
                await new Promise((resolve, reject) => {
                    const clearRequest = store.clear();
                    clearRequest.onsuccess = () => resolve();
                    clearRequest.onerror = () => reject(clearRequest.error);
                });
            }

            db.close();
        } catch (e) {
            console.warn('[App] Error draining pending shares:', e);
        }
    },

    /**
     * Render attachment previews in the add modal
     */
    renderAttachmentPreviews: () => {
        const container = document.getElementById('attachmentPreviewContainer');
        if (!container) return;

        const previews = App.state.attachmentPreviews;
        if (previews.length === 0) {
            container.innerHTML = '';
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        container.innerHTML = previews.map((p, idx) => `
            <div class="relative group">
                ${p.previewUrl
                ? `<img src="${p.previewUrl}" alt="${PetTracker.UI.escapeHtml(p.name)}" class="w-16 h-16 object-cover border border-oatmeal">`
                : `<div class="w-16 h-16 bg-oatmeal flex items-center justify-center border border-earth-metal">
                       <i data-lucide="file" class="w-6 h-6 text-earth-metal"></i>
                       </div>`
            }
                ${p.type === 'video' ? '<span class="absolute bottom-1 left-1 bg-charcoal text-white-linen text-[8px] px-1 font-mono">VIDEO</span>' : ''}
                ${p.type === 'file' ? '<span class="absolute bottom-1 left-1 bg-earth-metal text-white-linen text-[8px] px-1 font-mono">FILE</span>' : ''}
                <button type="button" onclick="App.removeAttachment(${idx})" class="absolute -top-1 -right-1 w-5 h-5 bg-muted-pink text-charcoal flex items-center justify-center text-xs hover:bg-opacity-80">×</button>
            </div>
        `).join('');

        if (window.lucide) lucide.createIcons();
    },

    /**
     * Remove an attachment by index
     */
    removeAttachment: (index) => {
        const preview = App.state.attachmentPreviews[index];
        if (preview?.previewUrl) {
            Media.revokePreviewUrls([preview.previewUrl]);
        }
        App.state.pendingAttachments.splice(index, 1);
        App.state.attachmentPreviews.splice(index, 1);
        App.renderAttachmentPreviews();
    },

    /**
     * Clear all pending attachments
     */
    clearAttachments: () => {
        const urls = App.state.attachmentPreviews.map(p => p.previewUrl).filter(Boolean);
        Media.revokePreviewUrls(urls);
        App.state.pendingAttachments = [];
        App.state.attachmentPreviews = [];
        App.renderAttachmentPreviews();
    },

    /**
     * Check if there are unsaved attachments and confirm discard
     */
    confirmCloseAddModal: () => {
        if (App.state.pendingAttachments.length > 0) {
            PetTracker.UI.confirm(
                `You have ${App.state.pendingAttachments.length} unsaved attachment(s). Discard them?`,
                () => {
                    App.clearAttachments();
                    PetTracker.UI.closeModal('addEventModal');
                }
            );
        } else {
            PetTracker.UI.closeModal('addEventModal');
        }
    },

    /**
     * Handle file input change for attachments
     */
    handleFileInputChange: async (input) => {
        const files = Array.from(input.files || []);
        if (files.length === 0) return;

        PetTracker.UI.toast(`Processing ${files.length} file(s)...`, 'info');

        for (const file of files) {
            const previewUrl = await Media.createThumbnailPreview(file);
            App.state.pendingAttachments.push(file);
            App.state.attachmentPreviews.push({
                file,
                previewUrl,
                name: file.name,
                type: App.getAttachmentType(file)
            });
        }

        App.renderAttachmentPreviews();
        input.value = '';
    },

    /**
     * Update sync status indicator
     */
    updateSyncStatus: () => {
        const statusEl = document.getElementById('syncStatus');
        if (!statusEl) return;

        const isOnline = App.state.isOnline;
        const lastSync = PetTracker.Settings.getLastSync();

        statusEl.innerHTML = `
            <span class="w-2 h-2 rounded-full ${isOnline ? 'bg-dull-purple' : 'bg-muted-pink'}"></span>
            <span>${isOnline ? 'Online' : 'Offline'}</span>
        `;
        statusEl.classList.remove('hidden');
    },

    /**
     * Open settings modal
     */
    openSettings: () => {
        const settings = PetTracker.Settings.get();

        // Populate connection tab
        const workerUrl = document.getElementById('settingsWorkerUrl');
        if (workerUrl) workerUrl.value = settings.workerUrl || '';

        const proxyToken = document.getElementById('settingsProxyToken');
        if (proxyToken) proxyToken.value = settings.proxyToken || '';

        const notionToken = document.getElementById('settingsNotionToken');
        if (notionToken) notionToken.value = settings.notionToken || '';

        // Show OAuth connection status
        const connectionStatus = document.getElementById('notionConnectionStatus');
        const connectionText = document.getElementById('notionConnectionStatusText');
        const connectBtn = document.getElementById('notionConnectBtn');

        if (connectionStatus && connectionText) {
            if (settings.notionOAuthData || settings.authMode === 'oauth') {
                connectionStatus.classList.remove('hidden');
                connectionText.textContent = 'Connected via OAuth';
                if (connectBtn) connectBtn.textContent = 'Reconnect with Notion';
            } else if (settings.notionToken) {
                connectionStatus.classList.remove('hidden');
                connectionText.textContent = 'Connected via Integration Token';
                connectionStatus.className = 'p-2 bg-oatmeal/50 border border-oatmeal text-sm text-charcoal';
            } else {
                connectionStatus.classList.add('hidden');
            }
        }

        // Populate AI tab
        const aiProvider = document.getElementById('settingsAiProvider');
        if (aiProvider) aiProvider.value = settings.aiProvider || 'openai';

        const aiModel = document.getElementById('settingsAiModel');
        if (aiModel) aiModel.value = settings.aiModel || '';

        const aiApiKey = document.getElementById('settingsAiApiKey');
        if (aiApiKey) aiApiKey.value = settings.aiApiKey || '';

        const aiEndpoint = document.getElementById('settingsAiEndpoint');
        if (aiEndpoint) aiEndpoint.value = settings.aiEndpoint || '';

        App.toggleAiEndpoint();

        // Populate Todoist tab
        const todoistEnabled = document.getElementById('settingsTodoistEnabled');
        if (todoistEnabled) todoistEnabled.checked = settings.todoistEnabled || false;

        const todoistToken = document.getElementById('settingsTodoistToken');
        if (todoistToken) todoistToken.value = settings.todoistToken || '';

        // Populate GCal tab
        const gcalEnabled = document.getElementById('settingsGcalEnabled');
        if (gcalEnabled) gcalEnabled.checked = settings.gcalEnabled || false;

        const gcalCalendarId = document.getElementById('settingsGcalCalendarId');
        if (gcalCalendarId) gcalCalendarId.value = settings.gcalCalendarId || '';

        App.updateGcalUI();

        // Show data source mappings and populate with saved values
        const hasDataSources = settings.dataSources && Object.values(settings.dataSources).some(v => v);
        const dataSourceNames = settings.dataSourceNames || {};

        const storeMap = {
            'Pets': 'pets',
            'Events': 'events',
            'EventTypes': 'eventTypes',
            'Contacts': 'contacts',
            'Scales': 'scales',
            'ScaleLevels': 'scaleLevels'
        };

        // Always populate dropdowns with saved values (showing names)
        Object.entries(storeMap).forEach(([key, store]) => {
            const el = document.getElementById(`dsMap${key}`);
            if (!el) return;

            const savedId = settings.dataSources?.[store];
            const savedName = dataSourceNames[store];

            // Clear existing options
            el.innerHTML = '<option value="">Select...</option>';

            if (savedId) {
                const opt = document.createElement('option');
                opt.value = savedId;
                opt.text = savedName || `Database (${savedId.slice(0, 8)}...)`;
                opt.selected = true;
                el.appendChild(opt);
            }
        });

        PetTracker.UI.openModal('settingsModal');
        if (window.lucide) lucide.createIcons();
    },

    /**
     * Render dashboard view
     */
    renderDashboard: async () => {
        const container = document.querySelector('[data-view="dashboard"]');
        if (!container) return;

        const pets = App.state.pets;
        const recentEvents = await Events.getRecent(10);

        if (pets.length === 0) {
            container.innerHTML = PetTracker.UI.emptyState(
                'paw-print',
                'No pets yet',
                'Add your first pet to get started'
            );
            if (window.lucide) lucide.createIcons();
            return;
        }

        container.innerHTML = `
            <div class="p-4 space-y-6">
                <!-- Pet Cards -->
                <div>
                    ${PetTracker.UI.sectionHeader(1, 'Your Pets')}
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                        ${pets.map(pet => {
            // Determine pet avatar: photo > icon > species default
            const speciesIcon = PetTracker.UI.getSpeciesIcon(pet.species);
            let petAvatarHtml;
            if (pet.photo?.[0]?.url) {
                petAvatarHtml = `<img src="${pet.photo[0].url}" alt="${PetTracker.UI.escapeHtml(pet.name)}" class="w-full h-full object-cover">`;
            } else if (pet.icon) {
                petAvatarHtml = PetTracker.UI.renderIcon(pet.icon, speciesIcon, 'w-6 h-6');
            } else {
                petAvatarHtml = `<i data-lucide="${speciesIcon}" class="w-6 h-6 text-earth-metal"></i>`;
            }
            return `
                            <div class="card card-hover p-4 cursor-pointer" onclick="App.showPetDetail('${pet.id}')">
                                <div class="flex items-center gap-3">
                                    <div class="w-12 h-12 bg-oatmeal flex items-center justify-center overflow-hidden">
                                        ${petAvatarHtml}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <h3 class="font-serif text-lg text-charcoal truncate">${PetTracker.UI.escapeHtml(pet.name)}</h3>
                                        <p class="meta-row text-xs">
                                            <span class="meta-value">${pet.species || 'Pet'}</span>
                                            ${pet.breed ? `<span class="meta-separator">//</span><span>${pet.breed}</span>` : ''}
                                        </p>
                                    </div>
                                    <div class="pet-dot" style="background-color: ${pet.color || '#8b7b8e'}"></div>
                                </div>
                            </div>
                        `}).join('')}
                    </div>
                </div>

                <!-- Recent Activity -->
                <div>
                    ${PetTracker.UI.sectionHeader(2, 'Recent Activity')}
                    <div class="mt-3 space-y-2">
                        ${recentEvents.length === 0 ? `
                            <p class="text-earth-metal text-sm py-4">No recent activity</p>
                        ` : recentEvents.map(event => {
                const pet = pets.find(p => event.petIds?.includes(p.id));
                const eventType = App.state.eventTypes?.find(t => t.id === event.eventTypeId);
                // Determine event icon: event.icon > eventType.icon > lucide fallback
                const defaultIcon = eventType?.defaultIcon || 'activity';
                let eventIconHtml;
                if (event.icon) {
                    eventIconHtml = PetTracker.UI.renderIcon(event.icon, defaultIcon, 'w-4 h-4');
                } else if (eventType?.icon) {
                    eventIconHtml = PetTracker.UI.renderIcon(eventType.icon, defaultIcon, 'w-4 h-4');
                } else {
                    eventIconHtml = `<i data-lucide="${defaultIcon}" class="w-4 h-4 text-earth-metal"></i>`;
                }
                return `
                            <div class="card card-hover p-3 flex items-center gap-3 cursor-pointer" onclick="Calendar.showEventDetail('${event.id}')">
                                <div class="w-10 h-10 bg-oatmeal flex items-center justify-center flex-shrink-0" style="${pet?.color ? `border-left: 3px solid ${pet.color}` : ''}">
                                    ${eventIconHtml}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm text-charcoal truncate">${PetTracker.UI.escapeHtml(event.title || 'Event')}</p>
                                    <p class="meta-row text-xs">
                                        ${pet ? `<span class="meta-value">${PetTracker.UI.escapeHtml(pet.name)}</span><span class="meta-separator">·</span>` : ''}
                                        <span>${PetTracker.UI.formatRelative(event.startDate)}</span>
                                    </p>
                                </div>
                                <span class="badge ${event.status === 'Completed' ? 'badge-accent' : 'badge-light'}">${event.status}</span>
                            </div>
                        `}).join('')}
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
    },

    /**
     * Render analytics view (placeholder)
     */
    renderAnalytics: () => {
        const container = document.querySelector('[data-view="analytics"]');
        if (!container) return;

        container.innerHTML = `
            <div class="p-4">
                ${PetTracker.UI.sectionHeader(1, 'Analytics')}
                <div class="mt-4 space-y-6">
                    <p class="text-earth-metal">Correlation view and trend dashboards coming soon...</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="card p-4">
                            <h3 class="font-mono text-xs uppercase text-earth-metal mb-2">Weight Trends</h3>
                            <p class="text-sm text-charcoal">Weight tracking with moving averages</p>
                        </div>
                        <div class="card p-4">
                            <h3 class="font-mono text-xs uppercase text-earth-metal mb-2">Correlations</h3>
                            <p class="text-sm text-charcoal">Event correlations with configurable time windows</p>
                        </div>
                        <div class="card p-4">
                            <h3 class="font-mono text-xs uppercase text-earth-metal mb-2">Adherence</h3>
                            <p class="text-sm text-charcoal">Recurring schedule adherence percentage</p>
                        </div>
                        <div class="card p-4">
                            <h3 class="font-mono text-xs uppercase text-earth-metal mb-2">Activity Heatmap</h3>
                            <p class="text-sm text-charcoal">Time-of-day activity patterns</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    },

    /**
     * Show pet detail
     */
    showPetDetail: (petId) => {
        const pet = App.state.pets.find(p => p.id === petId);
        if (!pet) return;

        PetTracker.Settings.setActivePet(petId);
        App.state.activePetId = petId;

        // Navigate to pets view and show the pet detail
        App.showView('pets');
        Pets.showDetail(petId);
    },

    /**
     * Filter by pet (sidebar filter)
     */
    filterByPet: (petId) => {
        App.state.activePetId = petId || null;
        PetTracker.Settings.setActivePet(petId || null);

        // Save to UI state
        PetTracker.Settings.setUIState({ filterPetId: petId || null });

        // Update filter dropdowns to match
        const desktopFilter = document.getElementById('petFilterDesktop');
        const mobileFilter = document.getElementById('petFilterMobile');
        if (desktopFilter) desktopFilter.value = petId || '';
        if (mobileFilter) mobileFilter.value = petId || '';

        // Re-render current view
        if (App.state.currentView === 'dashboard') {
            App.renderDashboard();
        } else if (App.state.currentView === 'calendar') {
            Calendar.state.filters.petIds = petId ? [petId] : [];
            Calendar.render();
        }
    },

    /**
     * Toggle mobile menu
     */
    toggleMobileMenu: () => {
        const sidebar = document.querySelector('aside');
        if (!sidebar) return;

        // Create overlay if doesn't exist
        let overlay = document.getElementById('mobileMenuOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'mobileMenuOverlay';
            overlay.className = 'mobile-menu-overlay hidden';
            overlay.onclick = () => App.toggleMobileMenu();
            document.body.appendChild(overlay);
        }

        const isOpen = sidebar.classList.contains('mobile-menu-open');

        if (isOpen) {
            // Close menu
            sidebar.classList.remove('mobile-menu-open');
            overlay.classList.add('hidden');
            document.body.style.overflow = '';
        } else {
            // Open menu
            sidebar.classList.add('mobile-menu-open');
            overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    },

    /**
     * Close mobile menu (helper for navigation clicks)
     */
    closeMobileMenu: () => {
        const sidebar = document.querySelector('aside');
        const overlay = document.getElementById('mobileMenuOverlay');
        if (sidebar) sidebar.classList.remove('mobile-menu-open');
        if (overlay) overlay.classList.add('hidden');
        document.body.style.overflow = '';
    },

    /**
     * Open add pet modal
     */
    openAddPetModal: () => {
        PetTracker.UI.openModal('addPetModal');
    },

    /**
     * Reset app with confirmation
     */
    confirmReset: () => {
        PetTracker.UI.confirm(
            'This will delete all local data including pets, events, and settings. Data synced to Notion will not be affected. Continue?',
            async () => {
                PetTracker.UI.showLoading('Resetting app...');
                await PetTracker.resetApp();
            }
        );
    },

    /**
     * Prompt PWA installation
     */
    promptInstall: async () => {
        if (!App.state.deferredPrompt) {
            PetTracker.UI.toast('Install not available', 'info');
            return;
        }

        try {
            App.state.deferredPrompt.prompt();
            const { outcome } = await App.state.deferredPrompt.userChoice;
            console.log('[App] PWA install outcome:', outcome);
            App.state.deferredPrompt = null;

            const installBtn = document.getElementById('installPwaBtn');
            if (installBtn) installBtn.classList.add('hidden');
        } catch (e) {
            console.error('[App] PWA install error:', e);
        }
    },

    /**
     * Start Notion OAuth flow using centralized OAuth handler
     * Uses redirect-based flow with return URL for multi-app support on same domain
     * Matches the approach used in ghostink-flashcards
     */
    startNotionOAuth: async () => {
        // Save any current settings before redirect
        const workerUrl = document.getElementById('settingsWorkerUrl')?.value?.trim();
        const proxyToken = document.getElementById('settingsProxyToken')?.value?.trim();
        if (workerUrl) {
            PetTracker.Settings.set({ workerUrl, proxyToken });
        }

        PetTracker.UI.showLoading('Starting Notion sign-in...');

        // Build return URL with full path so OAuth handler knows where to redirect
        const returnUrl = encodeURIComponent(window.location.href);
        const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

        try {
            if (isLocal) {
                const devPassword = (localStorage.getItem(APP_OAUTH_DEV_PASSWORD_KEY) || '').trim();
                if (!devPassword) {
                    PetTracker.UI.hideLoading();
                    PetTracker.UI.toast(`Set localStorage.${APP_OAUTH_DEV_PASSWORD_KEY} first`, 'warning');
                    return;
                }

                const unlockRes = await fetch(`${APP_OAUTH_BASE}/auth/dev-unlock`, {
                    method: 'POST',
                    headers: { 'X-OAuth-Dev-Password': devPassword }
                });
                if (!unlockRes.ok) {
                    const msg = await unlockRes.text().catch(() => '');
                    throw new Error(msg || `Dev unlock failed (${unlockRes.status})`);
                }

                const data = await unlockRes.json();
                const unlockToken = (data?.unlockToken || '').trim();
                if (!unlockToken) throw new Error('Dev unlock token missing');

                window.location.href = `${APP_OAUTH_BASE}/auth/login?from=${returnUrl}&dev_unlock=${encodeURIComponent(unlockToken)}`;
                return;
            }

            window.location.href = `${APP_OAUTH_BASE}/auth/login?from=${returnUrl}`;
        } catch (e) {
            PetTracker.UI.hideLoading();
            PetTracker.UI.toast(`OAuth start failed: ${e?.message || 'unknown error'}`, 'error');
        }
    },

    /**
     * Handle OAuth return - check for accessToken or gcalAccessToken in URL params or hash
     */
    handleOAuthReturn: () => {
        const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
        const searchParams = new URLSearchParams(window.location.search);
        const notionToken = hashParams.get('token') || hashParams.get('accessToken') ||
            searchParams.get('token') || searchParams.get('accessToken');
        const gcalToken = hashParams.get('gcalAccessToken') || searchParams.get('gcalAccessToken');
        const gcalEmail = hashParams.get('gcalEmail') || searchParams.get('gcalEmail');

        let handled = false;

        if (notionToken) {
            PetTracker.Settings.set({
                notionToken,
                authMode: 'oauth',
                notionOAuthData: {
                    access_token: notionToken,
                    acquiredAt: new Date().toISOString()
                }
            });
            PetTracker.UI.toast('Connected to Notion!', 'success');

            const settings = PetTracker.Settings.get();

            // If we were in onboarding, populate the token field and trigger database scan
            if (settings.onboardingInProgress) {
                setTimeout(() => {
                    // Populate the token field in onboarding
                    const tokenField = document.getElementById('onboardingNotionToken');
                    if (tokenField) tokenField.value = notionToken;

                    // Clear the flag but keep the step
                    PetTracker.Settings.set({ onboardingInProgress: false });

                    // Trigger database scan
                    if (typeof Onboarding !== 'undefined' && Onboarding.findDatabases) {
                        Onboarding.findDatabases();
                    }
                }, 300);
            } else if (settings.workerUrl) {
                setTimeout(() => App.scanDataSources(), 500);
            }
            handled = true;
        }

        if (gcalToken) {
            const gcalSettings = { gcalAccessToken: gcalToken, gcalEnabled: true };
            if (gcalEmail) gcalSettings.gcalUserEmail = gcalEmail;
            PetTracker.Settings.set(gcalSettings);
            PetTracker.UI.toast('Connected to Google Calendar!', 'success');

            setTimeout(() => {
                if (typeof App.updateGcalUI === 'function') App.updateGcalUI();
            }, 100);
            handled = true;
        }

        if (handled) {
            try {
                const cleanUrl = new URL(window.location.href);
                cleanUrl.searchParams.delete('token');
                cleanUrl.searchParams.delete('accessToken');
                cleanUrl.searchParams.delete('botId');
                cleanUrl.searchParams.delete('workspaceName');
                cleanUrl.searchParams.delete('workspaceIcon');
                cleanUrl.searchParams.delete('gcalAccessToken');
                cleanUrl.searchParams.delete('gcalEmail');
                cleanUrl.hash = '';
                window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search);
            } catch (e) {
                console.warn('History replaceState failed:', e);
            }
        }

        return handled;
    },

    /**
     * Save settings from settings modal
     */
    saveSettings: () => {
        // Collect data source mappings (6 databases after simplification)
        const dataSources = {
            pets: '',
            events: '',
            eventTypes: '',
            contacts: '',
            scales: '',
            scaleLevels: ''
        };
        const dataSourceNames = {
            pets: '',
            events: '',
            eventTypes: '',
            contacts: '',
            scales: '',
            scaleLevels: ''
        };
        const storeKeyMap = {
            'Pets': 'pets',
            'Events': 'events',
            'EventTypes': 'eventTypes',
            'Contacts': 'contacts',
            'Scales': 'scales',
            'ScaleLevels': 'scaleLevels'
        };

        ['Pets', 'Events', 'EventTypes', 'Contacts', 'Scales', 'ScaleLevels'].forEach(key => {
            const el = document.getElementById(`dsMap${key}`);
            const storeKey = storeKeyMap[key];
            if (!storeKey) return;

            dataSources[storeKey] = el?.value || '';
            if (el?.value && el.selectedIndex >= 0) {
                dataSourceNames[storeKey] = el.options[el.selectedIndex].text;
            } else {
                dataSourceNames[storeKey] = '';
            }
        });

        const notionToken = document.getElementById('settingsNotionToken')?.value?.trim() || '';
        const gcalEnabled = document.getElementById('settingsGcalEnabled')?.checked || false;
        const existing = PetTracker.Settings.get();
        const existingOAuthToken = existing.notionOAuthData?.access_token || '';
        const usingOAuthToken = !!existingOAuthToken && notionToken === existingOAuthToken;

        const settings = {
            workerUrl: document.getElementById('settingsWorkerUrl')?.value?.trim() || '',
            proxyToken: document.getElementById('settingsProxyToken')?.value?.trim() || '',
            notionToken,
            authMode: usingOAuthToken ? 'oauth' : (notionToken ? 'token' : (existing.authMode || 'token')),
            notionOAuthData: usingOAuthToken ? existing.notionOAuthData : (notionToken ? null : existing.notionOAuthData),
            dataSources,
            dataSourceNames,
            aiProvider: document.getElementById('settingsAiProvider')?.value || 'openai',
            aiModel: document.getElementById('settingsAiModel')?.value?.trim() || '',
            aiApiKey: document.getElementById('settingsAiApiKey')?.value?.trim() || '',
            aiEndpoint: document.getElementById('settingsAiEndpoint')?.value?.trim() || '',
            todoistEnabled: document.getElementById('settingsTodoistEnabled')?.checked || false,
            todoistToken: document.getElementById('settingsTodoistToken')?.value?.trim() || '',
            gcalEnabled,
            gcalCalendarId: document.getElementById('settingsGcalCalendarId')?.value || '',
            gcalAccessToken: gcalEnabled ? (existing.gcalAccessToken || '') : '',
            gcalUserEmail: gcalEnabled ? (existing.gcalUserEmail || '') : ''
        };

        PetTracker.Settings.set(settings);
        PetTracker.UI.toast('Settings saved', 'success');
        PetTracker.UI.closeModal('settingsModal');
    },

    /**
     * Test Notion connection
     * FIX #14: Use centralized token resolution
     */
    testConnection: async () => {
        const workerUrl = document.getElementById('settingsWorkerUrl')?.value?.trim();
        const notionToken = document.getElementById('settingsNotionToken')?.value?.trim();
        const proxyToken = document.getElementById('settingsProxyToken')?.value?.trim();
        const existing = PetTracker.Settings.get();
        const existingOAuthToken = existing.notionOAuthData?.access_token || '';
        const usingOAuthToken = !!existingOAuthToken && notionToken === existingOAuthToken;

        if (!workerUrl) {
            PetTracker.UI.toast('Please enter Worker URL', 'error');
            return;
        }

        // Save temporarily for API call
        PetTracker.Settings.set({
            workerUrl,
            notionToken,
            proxyToken,
            authMode: usingOAuthToken ? 'oauth' : (notionToken ? 'token' : existing.authMode),
            notionOAuthData: usingOAuthToken ? existing.notionOAuthData : (notionToken ? null : existing.notionOAuthData)
        });

        // FIX #14: Use centralized token helper (supports both direct token and OAuth)
        const effectiveToken = PetTracker.API.getEffectiveToken();
        if (!effectiveToken) {
            PetTracker.UI.toast('Please enter Notion token or connect via OAuth', 'error');
            return;
        }

        try {
            PetTracker.UI.showLoading('Testing connection...');
            const user = await PetTracker.API.verifyConnection();
            PetTracker.UI.hideLoading();
            PetTracker.UI.toast(`Connected as ${user?.name || 'User'}`, 'success');
        } catch (e) {
            PetTracker.UI.hideLoading();
            PetTracker.UI.toast('Connection failed: ' + e.message, 'error');
        }
    },

    /**
     * Scan for data sources (databases) in Notion
     */
    scanDataSources: async () => {
        const settings = PetTracker.Settings.get();
        // FIX #14: Use centralized token resolution
        const effectiveToken = PetTracker.API.getEffectiveToken();
        if (!settings.workerUrl || !effectiveToken) {
            PetTracker.UI.toast('Configure connection first', 'error');
            return;
        }

        try {
            PetTracker.UI.showLoading('Scanning data sources...');

            // List all data sources using paginated search (like ghostink)
            const dataSources = await PetTracker.API.listDatabases();

            if (dataSources.length === 0) {
                PetTracker.UI.hideLoading();
                PetTracker.UI.toast('No databases found. Share databases with your integration.', 'warning');
                return;
            }

            // Build database options with property info for smart matching
            const dbOptions = dataSources.map(ds => ({
                id: ds.id,
                name: ds.title?.[0]?.plain_text || ds.name || 'Untitled',
                properties: Object.keys(ds.properties || {})
            }));

            // Required properties aligned to actual write contract
            // Optional relation/media fields are supported when present, but not required for mapping.
            // End Date is represented via Start Date date-range end.
            const requiredProps = {
                'Pets': [
                    'Name', 'Species', 'Breed', 'Sex', 'Birth Date', 'Adoption Date', 'Status',
                    'Microchip ID', 'Tags', 'Notes',
                    'Target Weight Min', 'Target Weight Max', 'Weight Unit', 'Color', 'Is Primary',
                    'Photo'
                ],
                'Events': [
                    'Title', 'Pet(s)', 'Event Type', 'Start Date', 'Status',
                    'Severity Level', 'Value', 'Unit', 'Duration', 'Notes', 'Tags',
                    'Media',
                    'Source', 'Provider', 'Cost', 'Cost Category', 'Cost Currency',
                    'Todoist Task ID', 'Client Updated At'
                ],
                'EventTypes': [
                    'Name', 'Category', 'Tracking Mode', 'Uses Severity', 'Default Scale',
                    'Default Color', 'Default Icon', 'Default Tags', 'Allow Attachments',
                    'Default Value Kind', 'Default Unit', 'Correlation Group', 'Is Recurring',
                    'Schedule Type', 'Interval Value', 'Interval Unit', 'Anchor Date', 'Due Time',
                    'Time of Day Preference', 'Window Before', 'Window After', 'End Date',
                    'End After Occurrences', 'Next Due', 'Todoist Sync', 'Todoist Project',
                    'Todoist Labels', 'Todoist Lead Time', 'Default Dose', 'Default Route',
                    'Active', 'Active Start', 'Active End', 'Related Pets'
                ],
                'Scales': ['Name', 'Value Type', 'Unit', 'Notes'],
                'ScaleLevels': ['Name', 'Scale', 'Order', 'Color', 'Numeric Value', 'Description'],
                'Contacts': ['Name', 'Role', 'Phone', 'Email', 'Address', 'Notes', 'Related Pets']
            };

            const storeKeyMap = {
                'Pets': 'pets',
                'Events': 'events',
                'EventTypes': 'eventTypes',
                'Contacts': 'contacts',
                'Scales': 'scales',
                'ScaleLevels': 'scaleLevels'
            };

            // Populate mapping dropdowns
            const dsContainer = document.getElementById('dataSourceMapping');
            if (dsContainer) {
                dsContainer.classList.remove('hidden');

                ['Pets', 'Events', 'EventTypes', 'Contacts', 'Scales', 'ScaleLevels'].forEach(key => {
                    const el = document.getElementById(`dsMap${key}`);
                    if (!el) return;

                    const storeKey = storeKeyMap[key];
                    const savedId = settings.dataSources?.[storeKey];
                    const props = requiredProps[key] || [];

                    // Filter to matching databases - ALL required props must be present
                    const matchingDbs = dbOptions.filter(db => {
                        return props.every(prop =>
                            db.properties.some(p => p.toLowerCase() === prop.toLowerCase())
                        );
                    });

                    // Build options HTML
                    let optionsHtml = '<option value="">Select...</option>';

                    // Add matching databases
                    matchingDbs.forEach(db => {
                        const selected = db.id === savedId ? 'selected' : '';
                        optionsHtml += `<option value="${db.id}" ${selected}>${PetTracker.UI.escapeHtml(db.name)}</option>`;
                    });

                    // If saved DB not in matching list, add it separately
                    if (savedId && !matchingDbs.some(db => db.id === savedId)) {
                        const savedDb = dbOptions.find(db => db.id === savedId);
                        const savedName = savedDb?.name || settings.dataSourceNames?.[storeKey] || `(Saved: ${savedId.slice(0, 8)}...)`;
                        optionsHtml += `<option value="${savedId}" selected>${PetTracker.UI.escapeHtml(savedName)}</option>`;
                    }

                    el.innerHTML = optionsHtml;
                });
            }

            PetTracker.UI.hideLoading();
            PetTracker.UI.toast(`Found ${dataSources.length} databases`, 'success');

        } catch (e) {
            PetTracker.UI.hideLoading();
            PetTracker.UI.toast('Scan failed: ' + e.message, 'error');
        }
    },

    // FIX #12: Sync queue management
    showSyncQueue: async () => {
        const container = document.getElementById('syncQueueContent');
        if (!container) return;

        const pending = await PetTracker.SyncQueue.getPending();
        const failed = await PetTracker.DB.query(PetTracker.STORES.SYNC_QUEUE, i => i.status === 'failed');
        const allItems = [...pending, ...failed];

        if (allItems.length === 0) {
            container.innerHTML = '<p class="text-earth-metal text-sm text-center py-4">Queue is empty</p>';
        } else {
            container.innerHTML = allItems.map(item => `
                <div class="flex items-center gap-3 p-3 border border-oatmeal mb-2 ${item.status === 'failed' ? 'border-muted-pink bg-muted-pink/5' : ''}">
                    <div class="flex-1 min-w-0">
                        <p class="text-sm text-charcoal font-medium truncate">${item.type} ${item.store}</p>
                        <p class="text-xs text-earth-metal truncate">${item.status} • ${item.retryCount || 0} retries</p>
                        ${item.error ? `<p class="text-xs text-muted-pink truncate mt-1">${PetTracker.UI.escapeHtml(item.error)}</p>` : ''}
                    </div>
                    ${item.status === 'failed' ? `
                        <button onclick="App.retryQueueItem('${item.id}')" class="p-1 text-earth-metal hover:text-dull-purple" title="Retry">
                            <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                        </button>
                        <button onclick="App.dropQueueItem('${item.id}')" class="p-1 text-earth-metal hover:text-muted-pink" title="Drop">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    ` : ''}
                </div>
            `).join('');
        }

        PetTracker.UI.openModal('syncQueueModal');
        if (window.lucide) lucide.createIcons();
    },

    retryQueueItem: async (id) => {
        const item = await PetTracker.DB.get(PetTracker.STORES.SYNC_QUEUE, id);
        if (item) {
            item.status = 'pending';
            item.retryCount = 0;
            await PetTracker.DB.put(PetTracker.STORES.SYNC_QUEUE, item);
            PetTracker.UI.toast('Queued for retry', 'success');
            App.showSyncQueue();
            PetTracker.Sync?.updatePendingCount();
        }
    },

    dropQueueItem: async (id) => {
        await PetTracker.DB.delete(PetTracker.STORES.SYNC_QUEUE, id);
        PetTracker.UI.toast('Dropped', 'info');
        App.showSyncQueue();
        PetTracker.Sync?.updatePendingCount();
    },

    retryAllFailed: async () => {
        await PetTracker.SyncQueue.resetFailed();
        PetTracker.UI.toast('All failed items queued for retry', 'success');
        App.showSyncQueue();
        PetTracker.Sync?.updatePendingCount();
    },

    dropAllFailed: async () => {
        const failed = await PetTracker.DB.query(PetTracker.STORES.SYNC_QUEUE, i => i.status === 'failed');
        for (const item of failed) {
            await PetTracker.DB.delete(PetTracker.STORES.SYNC_QUEUE, item.id);
        }
        PetTracker.UI.toast('All failed items dropped', 'info');
        App.showSyncQueue();
        PetTracker.Sync?.updatePendingCount();
    },

    /**
     * Toggle AI endpoint field visibility
     */
    toggleAiEndpoint: () => {
        const provider = document.getElementById('settingsAiProvider')?.value;
        const endpointField = document.getElementById('aiEndpointField');
        if (endpointField) {
            endpointField.classList.toggle('hidden', provider !== 'custom');
        }
    },

    /**
     * Start Google Calendar OAuth
     */
    startGoogleOAuth: () => {
        const workerUrl = PetTracker.Settings.get().workerUrl;
        if (!workerUrl) {
            PetTracker.UI.toast('Configure Worker URL first', 'error');
            return;
        }

        const returnUrl = encodeURIComponent(new URL('index.html', window.location.href).toString());
        window.location.href = `https://notion-oauth-handler.mimansa-jaiswal.workers.dev/gcal/auth?from=${returnUrl}`;
    },

    /**
     * Update Google Calendar UI state
     */
    updateGcalUI: () => {
        const settings = PetTracker.Settings.get();
        const statusEl = document.getElementById('gcalConnectionStatus');
        const selectSection = document.getElementById('gcalCalendarSelect');
        const disconnectSection = document.getElementById('gcalDisconnectSection');

        if (settings.gcalAccessToken) {
            if (statusEl) {
                statusEl.textContent = settings.gcalUserEmail
                    ? `Connected as ${settings.gcalUserEmail}`
                    : 'Connected';
                statusEl.classList.add('text-dull-purple');
            }
            if (selectSection) selectSection.classList.remove('hidden');
            if (disconnectSection) disconnectSection.classList.remove('hidden');
        } else {
            if (statusEl) {
                statusEl.textContent = 'Not connected';
                statusEl.classList.remove('text-dull-purple');
            }
            if (selectSection) selectSection.classList.add('hidden');
            if (disconnectSection) disconnectSection.classList.add('hidden');
        }
    },

    /**
     * Disconnect Google Calendar
     */
    disconnectGoogleCalendar: () => {
        PetTracker.UI.confirm(
            'Disconnect Google Calendar? Events will no longer sync.',
            () => {
                PetTracker.Settings.set({
                    gcalEnabled: false,
                    gcalAccessToken: '',
                    gcalCalendarId: '',
                    gcalUserEmail: ''
                });
                App.updateGcalUI();
                PetTracker.UI.toast('Google Calendar disconnected', 'success');
            }
        );
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', App.init);

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.App = App;
