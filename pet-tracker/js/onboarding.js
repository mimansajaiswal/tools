/**
 * Pet Tracker - Onboarding Module
 * Multi-step setup wizard with customizable tracking options
 */

const ONBOARDING_OAUTH_DEV_PASSWORD_KEY = 'oauth_dev_password';
const ONBOARDING_OAUTH_BASE = 'https://notion-oauth-handler.mimansa-jaiswal.workers.dev';

const Onboarding = {
    currentStep: 1,
    totalSteps: 5,

    // Default event types for ad-hoc logging (not scheduled/recurring)
    defaultEventTypes: [
        { id: 'medication', name: 'Medication Given', category: 'Medication', icon: 'pill', color: 'blue', description: 'Log when any medication is given' },
        { id: 'symptom', name: 'Symptom', category: 'Symptom', icon: 'alert-circle', color: 'red', description: 'Log symptoms and health concerns' },
        { id: 'vet-visit', name: 'Vet Visit', category: 'Vet Visit', icon: 'stethoscope', color: 'purple', description: 'Log any vet appointment (ad-hoc)' },
        { id: 'walk', name: 'Walk', category: 'Activity', icon: 'footprints', color: 'green', description: 'Track daily walks and exercise' },
        { id: 'weight', name: 'Weight', category: 'Weight', icon: 'scale', color: 'orange', description: 'Record weight measurements' },
        { id: 'vaccine', name: 'Vaccine Given', category: 'Vaccine', icon: 'syringe', color: 'teal', description: 'Log any vaccine given (ad-hoc)' },
        { id: 'feeding', name: 'Feeding', category: 'Nutrition', icon: 'utensils', color: 'amber', description: 'Log meals and food intake' },
        { id: 'grooming', name: 'Grooming', category: 'Grooming', icon: 'scissors', color: 'pink', description: 'Log grooming sessions (ad-hoc)' },
        { id: 'bathroom', name: 'Bathroom', category: 'Health', icon: 'droplet', color: 'cyan', description: 'Monitor bathroom habits' },
        { id: 'sleep', name: 'Sleep', category: 'Wellness', icon: 'moon', color: 'indigo', description: 'Track sleep patterns' },
        { id: 'training', name: 'Training', category: 'Activity', icon: 'award', color: 'yellow', description: 'Log training sessions' },
        { id: 'playtime', name: 'Playtime', category: 'Activity', icon: 'gamepad-2', color: 'lime', description: 'Record play activities' }
    ],

    defaultScales: [
        { id: 'symptom-severity', name: 'Symptom Severity', icon: 'thermometer', description: 'Rate symptom intensity (Mild → Severe)', levels: ['Mild', 'Moderate', 'Severe'] },
        { id: 'activity-level', name: 'Activity Level', icon: 'zap', description: 'Track energy and activity (Low → High)', levels: ['Low', 'Medium', 'High'] },
        { id: 'mood', name: 'Mood', icon: 'smile', description: 'Monitor emotional state', levels: ['Anxious', 'Calm', 'Happy', 'Excited'] },
        { id: 'appetite', name: 'Appetite', icon: 'cookie', description: 'Track eating habits', levels: ['Poor', 'Normal', 'Good', 'Excellent'] },
        { id: 'pain-level', name: 'Pain Level', icon: 'heart-crack', description: 'Assess pain or discomfort', levels: ['None', 'Mild', 'Moderate', 'Severe'] },
        { id: 'hydration', name: 'Hydration', icon: 'glass-water', description: 'Monitor water intake', levels: ['Low', 'Normal', 'High'] }
    ],

    // Recurring/scheduled event types - these have automatic reminders
    recurringEventTypes: [
        { id: 'heartworm', name: 'Heartworm Prevention', category: 'Medication', icon: 'heart', color: 'blue', description: 'Scheduled monthly (auto-reminders)', isRecurring: true, intervalValue: 1, intervalUnit: 'Months', defaultDose: '1 tablet' },
        { id: 'flea-tick', name: 'Flea & Tick Prevention', category: 'Medication', icon: 'bug', color: 'green', description: 'Scheduled monthly (auto-reminders)', isRecurring: true, intervalValue: 1, intervalUnit: 'Months', defaultDose: '1 application' },
        { id: 'rabies', name: 'Rabies Vaccine', category: 'Vaccine', icon: 'shield', color: 'teal', description: 'Scheduled yearly (auto-reminders)', isRecurring: true, intervalValue: 1, intervalUnit: 'Years' },
        { id: 'dhpp', name: 'DHPP/FVRCP Vaccine', category: 'Vaccine', icon: 'shield-check', color: 'teal', description: 'Scheduled yearly (auto-reminders)', isRecurring: true, intervalValue: 1, intervalUnit: 'Years' },
        { id: 'bordetella', name: 'Bordetella Vaccine', category: 'Vaccine', icon: 'shield-plus', color: 'teal', description: 'Scheduled yearly (auto-reminders)', isRecurring: true, intervalValue: 1, intervalUnit: 'Years' },
        { id: 'annual-checkup', name: 'Annual Checkup', category: 'Vet Visit', icon: 'clipboard-check', color: 'purple', description: 'Scheduled yearly (auto-reminders)', isRecurring: true, intervalValue: 1, intervalUnit: 'Years' },
        { id: 'dental-cleaning', name: 'Dental Cleaning', category: 'Vet Visit', icon: 'sparkles', color: 'purple', description: 'Scheduled yearly (auto-reminders)', isRecurring: true, intervalValue: 1, intervalUnit: 'Years' },
        { id: 'bloodwork', name: 'Bloodwork', category: 'Vet Visit', icon: 'test-tube', color: 'purple', description: 'Scheduled yearly (auto-reminders)', isRecurring: true, intervalValue: 1, intervalUnit: 'Years' },
        { id: 'nail-trim', name: 'Nail Trim', category: 'Grooming', icon: 'scissors', color: 'pink', description: 'Scheduled every 2 weeks (auto-reminders)', isRecurring: true, intervalValue: 2, intervalUnit: 'Weeks' },
        { id: 'bath', name: 'Bath', category: 'Grooming', icon: 'bath', color: 'pink', description: 'Scheduled monthly (auto-reminders)', isRecurring: true, intervalValue: 1, intervalUnit: 'Months' },
        { id: 'deworming', name: 'Deworming', category: 'Medication', icon: 'pill', color: 'blue', description: 'Scheduled every 3 months (auto-reminders)', isRecurring: true, intervalValue: 3, intervalUnit: 'Months' }
    ],

    // Selected items storage
    selections: {
        eventTypes: [],
        scales: [],
        recurringTypes: []
    },

    defaultSelections: {
        eventTypes: ['medication', 'symptom', 'vet-visit', 'walk', 'weight', 'vaccine'],
        scales: ['symptom-severity', 'activity-level'],
        recurringTypes: ['heartworm', 'flea-tick', 'rabies', 'annual-checkup']
    },

    /**
     * Initialize onboarding
     */
    init: () => {
        const settings = PetTracker.Settings.get();
        if (settings.onboardingInProgress && settings.onboardingStep) {
            Onboarding.currentStep = settings.onboardingStep;
        } else {
            Onboarding.currentStep = 1;
        }

        const savedSelections = settings.onboardingSelections || {};
        Onboarding.selections.eventTypes = Array.isArray(savedSelections.eventTypes)
            ? savedSelections.eventTypes
            : [...Onboarding.defaultSelections.eventTypes];
        Onboarding.selections.scales = Array.isArray(savedSelections.scales)
            ? savedSelections.scales
            : [...Onboarding.defaultSelections.scales];
        Onboarding.selections.recurringTypes = Array.isArray(savedSelections.recurringTypes)
            ? savedSelections.recurringTypes
            : [...Onboarding.defaultSelections.recurringTypes];

        Onboarding.updateUI();
    },

    persistSelections: () => {
        PetTracker.Settings.set({
            onboardingSelections: {
                eventTypes: [...Onboarding.selections.eventTypes],
                scales: [...Onboarding.selections.scales],
                recurringTypes: [...Onboarding.selections.recurringTypes]
            }
        });
    },

    /**
     * Go to next step
     */
    nextStep: async () => {
        if (!await Onboarding.validateStep(Onboarding.currentStep)) {
            return;
        }

        await Onboarding.saveStepData(Onboarding.currentStep);

        if (Onboarding.currentStep < Onboarding.totalSteps) {
            Onboarding.currentStep++;
            Onboarding.updateUI();

            // Initialize multi-select dropdowns when entering step 4
            if (Onboarding.currentStep === 4) {
                setTimeout(() => Onboarding.initMultiSelects(), 100);
            }
        } else {
            await Onboarding.complete();
        }
    },

    /**
     * Go to previous step
     */
    prevStep: () => {
        if (Onboarding.currentStep > 1) {
            Onboarding.currentStep--;
            Onboarding.updateUI();

            if (Onboarding.currentStep === 4) {
                setTimeout(() => Onboarding.initMultiSelects(), 100);
            }
        }
    },

    /**
     * Update UI to reflect current step
     */
    updateUI: () => {
        PetTracker.Settings.set({
            onboardingInProgress: true,
            onboardingStep: Onboarding.currentStep
        });

        // Update step indicators
        document.querySelectorAll('#onboardingSteps [data-step]').forEach(el => {
            const step = parseInt(el.dataset.step);
            el.classList.toggle('bg-dull-purple', step <= Onboarding.currentStep);
            el.classList.toggle('bg-oatmeal', step > Onboarding.currentStep);
        });

        // Show/hide step content
        for (let i = 1; i <= Onboarding.totalSteps; i++) {
            const stepEl = document.getElementById(`onboardingStep${i}`);
            if (stepEl) {
                stepEl.classList.toggle('hidden', i !== Onboarding.currentStep);
            }
        }

        // Show/hide back button
        const backBtn = document.getElementById('onboardingBack');
        if (backBtn) {
            backBtn.classList.toggle('hidden', Onboarding.currentStep === 1);
        }

        // Update next button text
        const nextBtn = document.getElementById('onboardingNext');
        if (nextBtn) {
            if (Onboarding.currentStep === Onboarding.totalSteps) {
                nextBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4 inline mr-1"></i>Complete';
            } else {
                nextBtn.innerHTML = 'Next<i data-lucide="arrow-right" class="w-4 h-4 inline ml-1"></i>';
            }

            // Disable next button on step 2 and 3 until verified
            if (Onboarding.currentStep === 2) {
                const verified = document.getElementById('onboardingWorkerVerified')?.value === 'true';
                nextBtn.disabled = !verified;
                nextBtn.classList.toggle('opacity-50', !verified);
            } else if (Onboarding.currentStep === 3) {
                const verified = document.getElementById('onboardingDatabasesVerified')?.value === 'true';
                nextBtn.disabled = !verified;
                nextBtn.classList.toggle('opacity-50', !verified);
            } else {
                nextBtn.disabled = false;
                nextBtn.classList.remove('opacity-50');
            }
        }

        if (window.lucide) lucide.createIcons();
    },

    /**
     * Initialize multi-select dropdowns for step 4
     */
    initMultiSelects: () => {
        Onboarding.populateDropdown('eventTypes', Onboarding.defaultEventTypes);
        Onboarding.populateDropdown('scales', Onboarding.defaultScales);
        Onboarding.populateDropdown('recurringTypes', Onboarding.recurringEventTypes);

        // Close dropdowns when clicking outside
        document.addEventListener('click', Onboarding.handleOutsideClick);

        if (window.lucide) lucide.createIcons();
    },

    /**
     * Populate a multi-select dropdown
     */
    populateDropdown: (type, items) => {
        const dropdown = document.querySelector(`[data-multiselect="${type}"]`);
        if (!dropdown) return;

        const optionsContainer = dropdown.querySelector('.multiselect-options');
        if (!optionsContainer) return;

        let html = '';
        items.forEach(item => {
            const isSelected = Onboarding.selections[type].includes(item.id);
            html += `
                <label class="multiselect-option" data-value="${item.id}">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} 
                        onchange="Onboarding.toggleSelection('${type}', '${item.id}', this.checked)">
                    <span class="multiselect-option-icon">
                        <i data-lucide="${item.icon}" class="w-3 h-3"></i>
                    </span>
                    <div class="multiselect-option-text">
                        <span>${PetTracker.UI.escapeHtml(item.name)}</span>
                        ${item.description ? `<p class="multiselect-option-desc">${PetTracker.UI.escapeHtml(item.description)}</p>` : ''}
                    </div>
                </label>
            `;
        });

        optionsContainer.innerHTML = html;

        // Update select all checkbox
        const selectAllCheckbox = dropdown.querySelector('.multiselect-all');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = Onboarding.selections[type].length === items.length;
        }

        Onboarding.updateDropdownLabel(type);

        if (window.lucide) lucide.createIcons();
    },

    /**
     * Toggle dropdown visibility
     */
    toggleDropdown: (type) => {
        const dropdown = document.querySelector(`[data-multiselect="${type}"]`);
        if (!dropdown) return;

        const menu = dropdown.querySelector('.multiselect-menu');
        const trigger = dropdown.querySelector('.multiselect-trigger');
        const isOpen = !menu.classList.contains('hidden');

        // Close all other dropdowns first
        document.querySelectorAll('.multiselect-menu').forEach(m => {
            m.classList.add('hidden');
            m.closest('.multiselect-dropdown')?.querySelector('.multiselect-trigger')?.setAttribute('aria-expanded', 'false');
        });

        if (!isOpen) {
            menu.classList.remove('hidden');
            trigger?.setAttribute('aria-expanded', 'true');

            // Auto-scroll to make dropdown visible within the modal
            setTimeout(() => {
                // Find the scrollable form container (has overflow-y-auto)
                const scrollableContainer = dropdown.closest('form') || dropdown.closest('.modal-content');

                if (scrollableContainer) {
                    const menuRect = menu.getBoundingClientRect();
                    const containerRect = scrollableContainer.getBoundingClientRect();

                    if (menuRect.bottom > containerRect.bottom) {
                        // Scroll to show the dropdown menu
                        const scrollAmount = menuRect.bottom - containerRect.bottom + 20;
                        scrollableContainer.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                    }
                } else {
                    dropdown.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 50);
        }
    },

    /**
     * Handle clicks outside dropdowns
     */
    handleOutsideClick: (e) => {
        if (!e.target.closest('.multiselect-dropdown')) {
            document.querySelectorAll('.multiselect-menu').forEach(menu => {
                menu.classList.add('hidden');
                menu.closest('.multiselect-dropdown')?.querySelector('.multiselect-trigger')?.setAttribute('aria-expanded', 'false');
            });
        }
    },

    /**
     * Toggle selection of an item
     */
    toggleSelection: (type, id, checked) => {
        if (checked) {
            if (!Onboarding.selections[type].includes(id)) {
                Onboarding.selections[type].push(id);
            }
        } else {
            Onboarding.selections[type] = Onboarding.selections[type].filter(i => i !== id);
        }

        Onboarding.updateDropdownLabel(type);
        Onboarding.updateSelectAllState(type);
        Onboarding.persistSelections();
    },

    /**
     * Toggle all items in a dropdown
     */
    toggleAll: (type, checked) => {
        const items = type === 'eventTypes' ? Onboarding.defaultEventTypes :
            type === 'scales' ? Onboarding.defaultScales :
                Onboarding.recurringEventTypes;

        if (checked) {
            Onboarding.selections[type] = items.map(i => i.id);
        } else {
            Onboarding.selections[type] = [];
        }

        // Update all checkboxes
        const dropdown = document.querySelector(`[data-multiselect="${type}"]`);
        if (dropdown) {
            dropdown.querySelectorAll('.multiselect-option input[type="checkbox"]').forEach(cb => {
                cb.checked = checked;
            });
        }

        Onboarding.updateDropdownLabel(type);
        Onboarding.persistSelections();
    },

    /**
     * Update select all checkbox state
     */
    updateSelectAllState: (type) => {
        const items = type === 'eventTypes' ? Onboarding.defaultEventTypes :
            type === 'scales' ? Onboarding.defaultScales :
                Onboarding.recurringEventTypes;

        const dropdown = document.querySelector(`[data-multiselect="${type}"]`);
        const selectAllCheckbox = dropdown?.querySelector('.multiselect-all');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = Onboarding.selections[type].length === items.length;
        }
    },

    /**
     * Update the label showing selected count
     */
    updateDropdownLabel: (type) => {
        const dropdown = document.querySelector(`[data-multiselect="${type}"]`);
        if (!dropdown) return;

        const label = dropdown.querySelector('.multiselect-label');
        const count = Onboarding.selections[type].length;

        if (count === 0) {
            const labelText = type === 'eventTypes' ? 'event types' :
                type === 'scales' ? 'scales' : 'recurring items';
            label.innerHTML = `Select ${labelText}...`;
            label.className = 'multiselect-label text-sm text-earth-metal';
        } else {
            const items = type === 'eventTypes' ? Onboarding.defaultEventTypes :
                type === 'scales' ? Onboarding.defaultScales :
                    Onboarding.recurringEventTypes;

            const selectedNames = Onboarding.selections[type]
                .map(id => items.find(i => i.id === id)?.name)
                .filter(Boolean)
                .slice(0, 2);

            let text = selectedNames.join(', ');
            if (count > 2) {
                text += ` <span class="multiselect-selected-count">+${count - 2}</span>`;
            }

            label.innerHTML = text;
            label.className = 'multiselect-label text-sm text-charcoal';
        }
    },

    /**
     * Validate current step
     */
    validateStep: async (step) => {
        switch (step) {
            case 2:
                const workerUrl = document.getElementById('onboardingWorkerUrl')?.value;
                const verified = document.getElementById('onboardingWorkerVerified')?.value === 'true';

                if (!workerUrl) {
                    PetTracker.UI.toast('Worker URL is required', 'error');
                    return false;
                }
                if (!verified) {
                    PetTracker.UI.toast('Please verify Worker first', 'warning');
                    return false;
                }
                return true;

            case 3:
                const notionToken = document.getElementById('onboardingNotionToken')?.value;
                const dbVerified = document.getElementById('onboardingDatabasesVerified')?.value === 'true';
                const hasEffectiveToken = !!PetTracker.API.getEffectiveToken();

                if (!notionToken && !hasEffectiveToken) {
                    PetTracker.UI.toast('Notion connection required', 'error');
                    return false;
                }
                if (!dbVerified) {
                    PetTracker.UI.toast('Please select required databases', 'warning');
                    return false;
                }
                return true;

            case 4:
                // At least one event type should be selected
                if (Onboarding.selections.eventTypes.length === 0) {
                    PetTracker.UI.toast('Select at least one event type', 'warning');
                    return false;
                }
                return true;

            case 5:
                const petName = document.getElementById('onboardingPetName')?.value?.trim();
                if (!petName) {
                    PetTracker.UI.toast('Pet name is required', 'error');
                    return false;
                }
                return true;

            default:
                return true;
        }
    },

    /**
     * Save step data
     */
    saveStepData: async (step) => {
        switch (step) {
            case 2:
                const workerUrl = document.getElementById('onboardingWorkerUrl')?.value;
                const proxyToken = document.getElementById('onboardingProxyToken')?.value;
                PetTracker.Settings.set({ workerUrl, proxyToken });
                break;
        }
    },

    /**
     * Verify Worker connection
     */
    verifyWorker: async () => {
        const workerUrl = document.getElementById('onboardingWorkerUrl')?.value?.trim();
        const proxyToken = document.getElementById('onboardingProxyToken')?.value?.trim();
        const btn = document.getElementById('onboardingVerifyWorkerBtn');
        const statusDiv = document.getElementById('onboardingWorkerStatus');

        if (!workerUrl) {
            PetTracker.UI.toast('Enter Worker URL', 'error');
            return;
        }

        try {
            if (btn) btn.disabled = true;
            PetTracker.UI.showLoading('Verifying Worker...');

            PetTracker.Settings.set({ workerUrl, proxyToken });

            const url = new URL(workerUrl.replace(/\/$/, ''));
            url.searchParams.append('url', 'https://api.notion.com/v1/users/me');
            const headers = {};
            if (proxyToken) headers['X-Proxy-Token'] = proxyToken;
            const res = await fetch(url.toString(), { headers });

            if (res.status === 401 && proxyToken === '') {
                throw new Error('Worker requires Proxy Token');
            }

            PetTracker.UI.hideLoading();

            document.getElementById('onboardingWorkerVerified').value = 'true';
            if (statusDiv) {
                statusDiv.classList.remove('hidden');
                statusDiv.className = 'mt-2 p-2 bg-dull-purple/20 border border-dull-purple text-xs text-charcoal';
                statusDiv.innerHTML = '<i data-lucide="check" class="w-3 h-3 inline mr-1"></i>Worker Verified';
            }
            PetTracker.UI.toast('Worker Verified', 'success');
            Onboarding.updateUI();

        } catch (e) {
            PetTracker.UI.hideLoading();
            PetTracker.UI.toast('Verification failed: ' + e.message, 'error');
            if (statusDiv) {
                statusDiv.classList.remove('hidden');
                statusDiv.className = 'mt-2 p-2 bg-muted-pink/20 border border-muted-pink text-xs text-charcoal';
                statusDiv.innerHTML = '<i data-lucide="x" class="w-3 h-3 inline mr-1"></i>' + e.message;
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    },

    /**
     * Start OAuth Flow using centralized OAuth handler (matches ghostink approach)
     */
    startOAuth: async () => {
        const workerUrl = document.getElementById('onboardingWorkerUrl')?.value?.trim();
        const proxyToken = document.getElementById('onboardingProxyToken')?.value?.trim();

        if (workerUrl) {
            PetTracker.Settings.set({ workerUrl, proxyToken: proxyToken || '' });
        }

        PetTracker.Settings.set({
            onboardingInProgress: true,
            onboardingStep: 3
        });

        PetTracker.UI.showLoading('Starting Notion sign-in...');

        // Build return URL so OAuth handler knows where to redirect after auth
        const returnUrl = encodeURIComponent(window.location.href);
        const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

        try {
            if (isLocal) {
                const devPassword = (localStorage.getItem(ONBOARDING_OAUTH_DEV_PASSWORD_KEY) || '').trim();
                if (!devPassword) {
                    PetTracker.UI.hideLoading();
                    PetTracker.UI.toast(`Set localStorage.${ONBOARDING_OAUTH_DEV_PASSWORD_KEY} first`, 'warning');
                    return;
                }

                const unlockRes = await fetch(`${ONBOARDING_OAUTH_BASE}/auth/dev-unlock`, {
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

                window.location.href = `${ONBOARDING_OAUTH_BASE}/auth/login?from=${returnUrl}&dev_unlock=${encodeURIComponent(unlockToken)}`;
                return;
            }

            window.location.href = `${ONBOARDING_OAUTH_BASE}/auth/login?from=${returnUrl}`;
        } catch (e) {
            PetTracker.UI.hideLoading();
            PetTracker.UI.toast(`OAuth start failed: ${e?.message || 'unknown error'}`, 'error');
        }
    },

    // Required properties for each database type - ALL must be present
    requiredProperties: {
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
        'Event Types': [
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
        'Scale Levels': ['Name', 'Scale', 'Order', 'Color', 'Numeric Value', 'Description'],
        'Contacts': ['Name', 'Role', 'Phone', 'Email', 'Address', 'Notes', 'Related Pets']
    },

    /**
     * Find and list Notion databases with smart matching
     */
    findDatabases: async () => {
        const token = document.getElementById('onboardingNotionToken')?.value?.trim();
        const container = document.getElementById('onboardingDbList');
        const verifyBtn = document.getElementById('onboardingDbVerifyBtn');

        if (token) {
            PetTracker.Settings.set({
                notionToken: token,
                authMode: 'token',
                notionOAuthData: null
            });
        }

        const effectiveToken = PetTracker.API.getEffectiveToken();
        if (!effectiveToken) {
            PetTracker.UI.toast('Enter a Notion token or connect via OAuth', 'error');
            return;
        }

        try {
            PetTracker.UI.showLoading('Scanning Notion...');

            const dataSources = await PetTracker.API.listDatabases();

            // Extract database info with properties
            const dbOptions = dataSources.map(db => {
                const propNames = Object.keys(db.properties || {});
                return {
                    id: db.id,
                    name: db.title?.[0]?.plain_text || db.name || 'Untitled',
                    properties: propNames
                };
            });

            // Required databases (simplified - no Care Items/Plans)
            const required = ['Pets', 'Events', 'Event Types', 'Scales', 'Scale Levels', 'Contacts'];

            // Find matching databases for each type - ALL required properties must be present
            const matchedDbs = {};
            required.forEach(reqName => {
                const requiredProps = Onboarding.requiredProperties[reqName] || [];
                matchedDbs[reqName] = dbOptions.filter(db => {
                    // Check if database has ALL required properties
                    return requiredProps.every(prop =>
                        db.properties.some(p => p.toLowerCase() === prop.toLowerCase())
                    );
                });
            });

            let html = '<div class="space-y-2 mt-4">';
            html += '<p class="text-xs text-earth-metal mb-2">Map your databases:</p>';

            required.forEach(reqName => {
                const matchingDbs = matchedDbs[reqName];
                const autoSelect = matchingDbs.length === 1 ? matchingDbs[0].id : '';

                // Only show matching databases in dropdown
                const options = matchingDbs.map(db =>
                    `<option value="${db.id}" ${db.id === autoSelect ? 'selected' : ''}>${PetTracker.UI.escapeHtml(db.name)}</option>`
                ).join('');

                const hasMatches = matchingDbs.length > 0;
                const statusIcon = autoSelect ? '✓' : (hasMatches ? '' : '⚠');
                const statusClass = autoSelect ? 'text-dull-purple' : (hasMatches ? '' : 'text-muted-pink');

                html += `
                    <div class="grid grid-cols-3 gap-2 items-center">
                        <label class="text-[10px] font-mono uppercase text-earth-metal text-right ${statusClass}">${statusIcon} ${reqName}</label>
                        <select class="col-span-2 select-field text-xs py-1" data-source="${reqName}" onchange="Onboarding.checkDbMapping()">
                            <option value="">${hasMatches ? '-- Select --' : '-- No matches found --'}</option>
                            ${options}
                        </select>
                    </div>
                `;
            });
            html += '</div>';

            container.innerHTML = html;
            container.classList.remove('hidden');

            if (verifyBtn) verifyBtn.classList.remove('hidden');

            PetTracker.UI.hideLoading();
            PetTracker.UI.toast(`Found ${dataSources.length} data sources`, 'success');

            Onboarding.checkDbMapping();

        } catch (e) {
            PetTracker.UI.hideLoading();
            PetTracker.UI.toast('Scan error: ' + e.message, 'error');
            container.innerHTML = `<p class="text-xs text-muted-pink p-2">${e.message}</p>`;
            container.classList.remove('hidden');
        }
    },

    /**
     * Check if all databases are mapped
     */
    checkDbMapping: () => {
        const selects = document.querySelectorAll('#onboardingDbList select[data-source]');
        let allSet = true;
        const mapping = {};
        const storeMapping = {
            'Pets': 'pets',
            'Events': 'events',
            'Event Types': 'eventTypes',
            'Scales': 'scales',
            'Scale Levels': 'scaleLevels',
            'Contacts': 'contacts'
        };
        const dataSources = {
            pets: '',
            events: '',
            eventTypes: '',
            scales: '',
            scaleLevels: '',
            contacts: ''
        };
        const dataSourceNames = {
            pets: '',
            events: '',
            eventTypes: '',
            scales: '',
            scaleLevels: '',
            contacts: ''
        };

        selects.forEach(sel => {
            const label = sel.closest('.grid')?.querySelector('label');
            if (!sel.value) {
                allSet = false;
                // Update label to show warning
                if (label) {
                    label.classList.remove('text-dull-purple');
                    label.classList.add('text-muted-pink');
                    const text = label.textContent.replace(/^[✓⚠]\s*/, '');
                    label.textContent = `⚠ ${text}`;
                }
            } else {
                // Update label to show checkmark
                if (label) {
                    label.classList.remove('text-muted-pink');
                    label.classList.add('text-dull-purple');
                    const text = label.textContent.replace(/^[✓⚠]\s*/, '');
                    label.textContent = `✓ ${text}`;
                }
            }
            mapping[sel.dataset.source] = sel.value;
            const storeKey = storeMapping[sel.dataset.source];
            if (storeKey) {
                dataSources[storeKey] = sel.value || '';
                if (sel.value && sel.selectedIndex >= 0) {
                    dataSourceNames[storeKey] = sel.options[sel.selectedIndex].text;
                } else {
                    dataSourceNames[storeKey] = '';
                }
            }
        });

        PetTracker.Settings.set({ dataSources, dataSourceNames });

        if (allSet) {
            document.getElementById('onboardingDatabasesVerified').value = 'true';
            PetTracker.UI.toast('Mapping complete', 'success');
        } else {
            document.getElementById('onboardingDatabasesVerified').value = 'false';
        }

        Onboarding.updateUI();
    },

    /**
     * Complete onboarding
     */
    complete: async () => {
        try {
            PetTracker.UI.showLoading('Setting up...');

            // Create selected event types, scales, and care items
            await Onboarding.createSelectedData();

            // Create first pet
            const petName = document.getElementById('onboardingPetName')?.value?.trim();
            const petSpecies = document.getElementById('onboardingPetSpecies')?.value;
            const petColor = document.getElementById('onboardingPetColor')?.value;

            let pet = null;
            if (petName) {
                pet = await Pets.save({
                    name: petName,
                    species: petSpecies || 'Dog',
                    color: petColor || '#8b7b8e',
                    status: 'Active',
                    isPrimary: true
                });
            }

            // Create sample events if checked
            const createSampleEvents = document.getElementById('onboardingCreateSampleEvents')?.checked;
            if (createSampleEvents && pet) {
                await Onboarding.createSampleEvents(pet.id);
            }

            // Mark onboarding complete
            PetTracker.Settings.setOnboardingDone(true);
            PetTracker.Settings.set({
                onboardingInProgress: false,
                onboardingStep: null,
                onboardingSelections: null
            });

            // Clean up event listener
            document.removeEventListener('click', Onboarding.handleOutsideClick);

            PetTracker.UI.hideLoading();
            PetTracker.UI.toast('Setup complete!', 'success');
            PetTracker.UI.closeModal('onboardingModal');

            await App.loadData();
            App.showView('dashboard');

            if (PetTracker.Sync?.run) {
                setTimeout(() => PetTracker.Sync.run(true), 500);
            }

        } catch (e) {
            console.error('[Onboarding] Error:', e);
            PetTracker.UI.hideLoading();
            PetTracker.UI.toast('Setup error: ' + e.message, 'error');
        }
    },

    /**
     * Create selected data based on user choices
     */
    createSelectedData: async () => {
        // First, create selected scales so we can reference them from event types
        const createdScales = {};

        for (const id of Onboarding.selections.scales) {
            const template = Onboarding.defaultScales.find(s => s.id === id);
            if (!template) continue;

            const existing = await PetTracker.DB.query(
                PetTracker.STORES.SCALES,
                s => s.name === template.name
            );

            if (existing.length === 0) {
                const scale = {
                    id: PetTracker.generateId(),
                    name: template.name,
                    valueType: 'Labels',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    synced: false
                };

                await PetTracker.DB.put(PetTracker.STORES.SCALES, scale);
                await PetTracker.SyncQueue.add({
                    type: 'create',
                    store: 'scales',
                    recordId: scale.id,
                    data: scale
                });

                createdScales[id] = scale.id;

                // Create scale levels
                const colors = ['yellow', 'orange', 'red', 'purple'];
                for (let i = 0; i < template.levels.length; i++) {
                    const level = {
                        id: PetTracker.generateId(),
                        scaleId: scale.id,
                        name: template.levels[i],
                        order: i + 1,
                        color: colors[i % colors.length],
                        numericValue: i + 1,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        synced: false
                    };

                    await PetTracker.DB.put(PetTracker.STORES.SCALE_LEVELS, level);
                    await PetTracker.SyncQueue.add({
                        type: 'create',
                        store: 'scaleLevels',
                        recordId: level.id,
                        data: level
                    });
                }
            } else {
                // Scale already exists, store its ID for reference
                createdScales[id] = existing[0].id;
            }
        }

        // Create selected event types (now scales exist, so we can reference them)
        for (const id of Onboarding.selections.eventTypes) {
            const template = Onboarding.defaultEventTypes.find(t => t.id === id);
            if (!template) continue;

            const existing = await PetTracker.DB.query(
                PetTracker.STORES.EVENT_TYPES,
                e => e.name === template.name
            );

            if (existing.length === 0) {
                // Determine which scale to use for this event type
                let defaultScaleId = null;
                if (template.category === 'Symptom' && createdScales['symptom-severity']) {
                    defaultScaleId = createdScales['symptom-severity'];
                } else if (template.category === 'Activity' && createdScales['activity-level']) {
                    defaultScaleId = createdScales['activity-level'];
                }

                const eventType = {
                    id: PetTracker.generateId(),
                    name: template.name,
                    category: template.category,
                    trackingMode: template.category === 'Activity' ? 'Timed' : 'Stamp',
                    defaultIcon: template.icon,
                    defaultColor: template.color,
                    usesSeverity: template.category === 'Symptom',
                    defaultScaleId: defaultScaleId,
                    allowAttachments: template.category === 'Vet Visit',
                    defaultValueKind: template.name === 'Walk' ? 'Duration' : template.name === 'Weight' ? 'Weight' : null,
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

        // Create selected recurring event types (merged from care items)
        for (const id of Onboarding.selections.recurringTypes) {
            const template = Onboarding.recurringEventTypes.find(c => c.id === id);
            if (!template) continue;

            const existing = await PetTracker.DB.query(
                PetTracker.STORES.EVENT_TYPES,
                e => e.name === template.name
            );

            if (existing.length === 0) {
                const eventType = {
                    id: PetTracker.generateId(),
                    name: template.name,
                    category: template.category,
                    trackingMode: 'Stamp',
                    defaultIcon: template.icon,
                    defaultColor: template.color,
                    isRecurring: true,
                    scheduleType: 'Fixed',
                    intervalValue: template.intervalValue,
                    intervalUnit: template.intervalUnit,
                    anchorDate: PetTracker.UI.localDateYYYYMMDD(),
                    defaultDose: template.defaultDose || '',
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
     * Create sample events for the pet - only for selected event types
     */
    createSampleEvents: async (petId) => {
        const eventTypes = await PetTracker.DB.getAll(PetTracker.STORES.EVENT_TYPES);
        const selectedTypeNames = Onboarding.selections.eventTypes
            .map(id => Onboarding.defaultEventTypes.find(t => t.id === id)?.name)
            .filter(Boolean);

        const now = new Date();
        const sampleEvents = [];

        // Sample event configs mapped by event type name
        const sampleConfigs = {
            'Walk': {
                title: 'Morning walk',
                startDate: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
                status: 'Completed',
                duration: 30,
                notes: 'Great walk around the neighborhood!'
            },
            'Weight': {
                title: 'Weight check',
                startDate: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
                status: 'Completed',
                value: 25,
                unit: 'lb'
            },
            'Vet Visit': {
                title: 'Annual checkup',
                startDate: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'Completed',
                notes: 'All vaccinations up to date. Healthy!'
            },
            'Medication Given': {
                title: 'Morning medication',
                startDate: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
                status: 'Completed',
                notes: 'Gave daily medication'
            },
            'Feeding': {
                title: 'Breakfast',
                startDate: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
                status: 'Completed',
                notes: '1 cup of kibble'
            }
        };

        // Only create sample events for event types the user selected
        for (const eventType of eventTypes) {
            if (!selectedTypeNames.includes(eventType.name)) continue;

            const config = sampleConfigs[eventType.name];
            if (!config) continue;

            sampleEvents.push({
                ...config,
                petIds: [petId],
                eventTypeId: eventType.id
            });
        }

        for (const eventData of sampleEvents) {
            const event = {
                id: PetTracker.generateId(),
                ...eventData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                synced: false
            };

            await PetTracker.DB.put(PetTracker.STORES.EVENTS, event);
            await PetTracker.SyncQueue.add({
                type: 'create',
                store: 'events',
                recordId: event.id,
                data: event
            });
        }
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.Onboarding = Onboarding;
window.Onboarding = Onboarding;
