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

        // Check onboarding status
        if (!PetTracker.Settings.isOnboardingDone() || !PetTracker.Settings.isConnected()) {
            App.showOnboarding();
        } else {
            await App.loadData();
            App.showView('dashboard');
        }

        // Online/offline handling
        window.addEventListener('online', () => {
            App.state.isOnline = true;
            App.updateSyncStatus();
            PetTracker.UI.toast('Back online', 'success');
        });

        window.addEventListener('offline', () => {
            App.state.isOnline = false;
            App.updateSyncStatus();
            PetTracker.UI.toast('You are offline', 'warning');
        });

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
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape closes modals
            if (e.key === 'Escape') {
                const openModal = document.querySelector('[id$="Modal"]:not(.hidden)');
                if (openModal) {
                    if (openModal.id === 'addEventModal') {
                        App.confirmCloseAddModal();
                    } else {
                        PetTracker.UI.closeModal(openModal.id);
                    }
                }
            }
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
            });
        });
    },

    /**
     * Show a view
     */
    showView: (viewName) => {
        App.state.currentView = viewName;

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
            settings: 'Settings'
        };
        const headerTitle = document.getElementById('headerTitle');
        if (headerTitle) headerTitle.textContent = titles[viewName] || viewName;

        // Refresh icons
        if (window.lucide) lucide.createIcons();

        // View-specific initialization
        switch (viewName) {
            case 'dashboard':
                App.renderDashboard();
                break;
            case 'calendar':
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
            
            // Create default event types if none exist
            if (App.state.eventTypes.length === 0) {
                await Care.createDefaultEventTypes();
                await Care.createDefaultScales();
                App.state.eventTypes = await PetTracker.DB.getAll(PetTracker.STORES.EVENT_TYPES);
            }
            
            console.log(`[App] Loaded ${App.state.pets.length} pets, ${App.state.eventTypes.length} event types`);
        } catch (e) {
            console.error('[App] Error loading data:', e);
        }
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
        }

        // Set defaults
        const dateInput = document.getElementById('addEventDate');
        if (dateInput) dateInput.value = prefill.date || new Date().toISOString().slice(0, 10);

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

        if (!petId || !date) {
            PetTracker.UI.toast('Please fill required fields', 'error');
            return;
        }

        const eventType = App.state.eventTypes.find(t => t.id === eventTypeId);
        const eventData = {
            title: eventType?.name || 'Event',
            petIds: [petId],
            eventTypeId: eventTypeId || null,
            startDate: time ? `${date}T${time}:00` : date,
            notes: notes || '',
            value: value ? parseFloat(value) : null
        };

        try {
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
        PetTracker.UI.openModal('settingsModal');
    },

    /**
     * Render dashboard view
     */
    renderDashboard: async () => {
        const container = document.querySelector('[data-view="dashboard"]');
        if (!container) return;

        const pets = App.state.pets;
        const events = await PetTracker.DB.getAll(PetTracker.STORES.EVENTS);
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
                        ${pets.map(pet => `
                            <div class="card card-hover p-4 cursor-pointer" onclick="App.showPetDetail('${pet.id}')">
                                <div class="flex items-center gap-3">
                                    <div class="w-12 h-12 bg-oatmeal flex items-center justify-center">
                                        <i data-lucide="paw-print" class="w-6 h-6 text-earth-metal"></i>
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
                        `).join('')}
                    </div>
                </div>

                <!-- Recent Activity -->
                <div>
                    ${PetTracker.UI.sectionHeader(2, 'Recent Activity')}
                    <div class="mt-3 space-y-2">
                        ${recentEvents.length === 0 ? `
                            <p class="text-earth-metal text-sm py-4">No recent activity</p>
                        ` : recentEvents.map(event => `
                            <div class="card p-3 flex items-center gap-3">
                                <div class="w-8 h-8 bg-oatmeal flex items-center justify-center">
                                    <i data-lucide="activity" class="w-4 h-4 text-earth-metal"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm text-charcoal truncate">${PetTracker.UI.escapeHtml(event.title || 'Event')}</p>
                                    <p class="meta-row text-xs">${PetTracker.UI.formatRelative(event.startDate)}</p>
                                </div>
                                <span class="badge ${event.status === 'Completed' ? 'badge-accent' : 'badge-light'}">${event.status}</span>
                            </div>
                        `).join('')}
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
        
        // For now, just show a toast
        PetTracker.UI.toast(`Viewing ${pet.name}`, 'info');
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
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', App.init);

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.App = App;
