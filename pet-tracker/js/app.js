/**
 * Pet Tracker - Main App Controller
 * Initialization, routing, and state management
 */

const App = {
    state: {
        currentView: 'dashboard',
        activePetId: null,
        pets: [],
        eventTypes: [],
        isOnline: navigator.onLine,
        pendingAttachments: [],
        attachmentPreviews: [],
        deferredPrompt: null
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

            // Create default scales and event types if none exist
            if (App.state.eventTypes.length === 0) {
                // Create scales first so event types can reference them
                await Care.createDefaultScales();
                await Care.createDefaultEventTypes();
                App.state.eventTypes = await PetTracker.DB.getAll(PetTracker.STORES.EVENT_TYPES);
            }

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
    openAddModal: (prefill = {}) => {
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
        }

        // Populate event type dropdown
        const typeSelect = document.getElementById('addEventType');
        if (typeSelect) {
            typeSelect.innerHTML = '<option value="">Select type...</option>' +
                App.state.eventTypes.map(t =>
                    `<option value="${t.id}" ${t.id === prefill.type ? 'selected' : ''}>${t.name}</option>`
                ).join('');

            // Add event listener for event type change to update severity selector
            typeSelect.onchange = () => App.updateSeveritySelector(typeSelect.value);

            // Trigger initial update if prefill.type is set
            if (prefill.type) {
                App.updateSeveritySelector(prefill.type, prefill.severityLevelId);
            } else {
                App.updateSeveritySelector(null);
            }
        }

        // Set defaults
        const dateInput = document.getElementById('addEventDate');
        if (dateInput) dateInput.value = prefill.date || PetTracker.UI.localDateYYYYMMDD();

        const timeInput = document.getElementById('addEventTime');
        if (timeInput) timeInput.value = prefill.time || new Date().toTimeString().slice(0, 5);

        // Clear other fields
        const valueInput = document.getElementById('addEventValue');
        if (valueInput) valueInput.value = prefill.value || '';

        const notesInput = document.getElementById('addEventNotes');
        if (notesInput) notesInput.value = prefill.notes || '';

        PetTracker.UI.openModal('addEventModal');
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
        const eventData = {
            title: eventType?.name || 'Event',
            petIds: [petId],
            eventTypeId: eventTypeId || null,
            startDate: time ? `${date}T${time}:00` : date,
            notes: notes || '',
            value: value ? parseFloat(value) : null,
            severityLevelId: severityLevelId || null,
            media: []
        };

        try {
            // Process pending attachments
            if (App.state.pendingAttachments.length > 0) {
                PetTracker.UI.showLoading('Processing attachments...');
                const processedMedia = await Media.processAndStoreMedia(App.state.pendingAttachments);

                // Store media info for the event
                eventData.media = processedMedia
                    .filter(m => !m.error)
                    .map(m => ({
                        id: m.id,
                        type: m.type,
                        name: m.originalName,
                        size: m.uploadSize || m.originalSize
                    }));

                PetTracker.UI.hideLoading();
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
                    type: file.type.startsWith('video/') ? 'video' : 'image'
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
                type: file.type.startsWith('video/') ? 'video' : 'image'
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
        const events = await PetTracker.DB.getAll(PetTracker.STORES.EVENTS);
        // Sort events by date descending for "Recent Activity"
        events.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        const recentEvents = events.slice(0, 10);

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
                            <p class="text-sm text-charcoal">Care plan adherence percentage</p>
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
    startNotionOAuth: () => {
        // Save any current settings before redirect
        const workerUrl = document.getElementById('settingsWorkerUrl')?.value?.trim();
        const proxyToken = document.getElementById('settingsProxyToken')?.value?.trim();
        if (workerUrl) {
            PetTracker.Settings.set({ workerUrl, proxyToken });
        }

        PetTracker.UI.showLoading('Starting Notion sign-in...');

        // Build return URL with full path so OAuth handler knows where to redirect
        const returnUrl = encodeURIComponent(window.location.href);

        // Redirect to centralized OAuth handler with return URL
        window.location.href = `https://notion-oauth-handler.mimansa-jaiswal.workers.dev/auth/login?from=${returnUrl}`;
    },

    /**
     * Handle OAuth return - check for accessToken or gcalAccessToken in URL params or hash
     */
    handleOAuthReturn: () => {
        const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
        const searchParams = new URLSearchParams(window.location.search);
        const notionToken = hashParams.get('token') || searchParams.get('token') || searchParams.get('accessToken');
        const gcalToken = hashParams.get('gcalAccessToken') || searchParams.get('gcalAccessToken');
        const gcalEmail = hashParams.get('gcalEmail') || searchParams.get('gcalEmail');

        let handled = false;

        if (notionToken) {
            PetTracker.Settings.set({ notionToken });
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
                window.history.replaceState({}, document.title, window.location.pathname);
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
        const dataSources = {};
        const dataSourceNames = {};
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
            if (el?.value) {
                const storeKey = storeKeyMap[key];
                dataSources[storeKey] = el.value;
                // Save the selected option's text (database name)
                if (el.selectedIndex >= 0) {
                    dataSourceNames[storeKey] = el.options[el.selectedIndex].text;
                }
            }
        });

        const settings = {
            workerUrl: document.getElementById('settingsWorkerUrl')?.value?.trim() || '',
            proxyToken: document.getElementById('settingsProxyToken')?.value?.trim() || '',
            notionToken: document.getElementById('settingsNotionToken')?.value?.trim() || '',
            dataSources,
            dataSourceNames,
            aiProvider: document.getElementById('settingsAiProvider')?.value || 'openai',
            aiModel: document.getElementById('settingsAiModel')?.value?.trim() || '',
            aiApiKey: document.getElementById('settingsAiApiKey')?.value?.trim() || '',
            aiEndpoint: document.getElementById('settingsAiEndpoint')?.value?.trim() || '',
            todoistEnabled: document.getElementById('settingsTodoistEnabled')?.checked || false,
            todoistToken: document.getElementById('settingsTodoistToken')?.value?.trim() || '',
            gcalEnabled: document.getElementById('settingsGcalEnabled')?.checked || false,
            gcalCalendarId: document.getElementById('settingsGcalCalendarId')?.value || ''
        };

        PetTracker.Settings.set(settings);
        PetTracker.UI.toast('Settings saved', 'success');
        PetTracker.UI.closeModal('settingsModal');
    },

    /**
     * Test Notion connection
     */
    testConnection: async () => {
        // Save current inputs first
        const workerUrl = document.getElementById('settingsWorkerUrl')?.value?.trim();
        const notionToken = document.getElementById('settingsNotionToken')?.value?.trim();
        const proxyToken = document.getElementById('settingsProxyToken')?.value?.trim();

        if (!workerUrl) {
            PetTracker.UI.toast('Please enter Worker URL', 'error');
            return;
        }

        if (!notionToken) {
            PetTracker.UI.toast('Please enter Notion token', 'error');
            return;
        }

        // Save temporarily for API call
        PetTracker.Settings.set({ workerUrl, notionToken, proxyToken });

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
        if (!settings.workerUrl || !settings.notionToken) {
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

            // Required properties - ALL must be present
            const requiredProps = {
                'Pets': [
                    'Name', 'Species', 'Breed', 'Sex', 'Birth Date', 'Adoption Date', 'Status',
                    'Microchip ID', 'Photo', 'Tags', 'Notes', 'Primary Vet', 'Related Contacts',
                    'Target Weight Min', 'Target Weight Max', 'Weight Unit', 'Color', 'Icon', 'Is Primary'
                ],
                'Events': [
                    'Title', 'Pet(s)', 'Event Type', 'Start Date', 'End Date', 'Status',
                    'Severity Level', 'Value', 'Unit', 'Duration', 'Notes', 'Media', 'Tags',
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
