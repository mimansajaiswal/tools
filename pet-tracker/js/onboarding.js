/**
 * Pet Tracker - Onboarding Module
 * Multi-step setup wizard with customizable tracking options
 */

const Onboarding = {
    currentStep: 1,
    totalSteps: 5,

    // Default options with icons for selection
    defaultEventTypes: [
        { id: 'medication', name: 'Medication Given', category: 'Medication', icon: 'pill', color: 'blue', description: 'Track when medications are administered' },
        { id: 'symptom', name: 'Symptom', category: 'Symptom', icon: 'alert-circle', color: 'red', description: 'Log symptoms and health concerns' },
        { id: 'vet-visit', name: 'Vet Visit', category: 'Vet Visit', icon: 'stethoscope', color: 'purple', description: 'Record veterinary appointments' },
        { id: 'walk', name: 'Walk', category: 'Activity', icon: 'footprints', color: 'green', description: 'Track daily walks and exercise' },
        { id: 'weight', name: 'Weight', category: 'Weight', icon: 'scale', color: 'orange', description: 'Monitor weight changes' },
        { id: 'vaccine', name: 'Vaccine', category: 'Vaccine', icon: 'syringe', color: 'teal', description: 'Track vaccinations' },
        { id: 'feeding', name: 'Feeding', category: 'Nutrition', icon: 'utensils', color: 'amber', description: 'Log meals and food intake' },
        { id: 'grooming', name: 'Grooming', category: 'Grooming', icon: 'scissors', color: 'pink', description: 'Track grooming sessions' },
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

    defaultCareItems: [
        { id: 'heartworm', name: 'Heartworm Prevention', type: 'Medication', icon: 'heart', description: 'Monthly heartworm medication', defaultDose: '1 tablet' },
        { id: 'flea-tick', name: 'Flea & Tick Prevention', type: 'Medication', icon: 'bug', description: 'Flea and tick treatment', defaultDose: '1 application' },
        { id: 'rabies', name: 'Rabies Vaccine', type: 'Vaccine', icon: 'shield', description: 'Required rabies vaccination' },
        { id: 'dhpp', name: 'DHPP/FVRCP Vaccine', type: 'Vaccine', icon: 'shield-check', description: 'Core combination vaccine' },
        { id: 'bordetella', name: 'Bordetella Vaccine', type: 'Vaccine', icon: 'shield-plus', description: 'Kennel cough prevention' },
        { id: 'annual-checkup', name: 'Annual Checkup', type: 'Procedure', icon: 'clipboard-check', description: 'Yearly wellness exam' },
        { id: 'dental-cleaning', name: 'Dental Cleaning', type: 'Procedure', icon: 'sparkles', description: 'Professional dental care' },
        { id: 'bloodwork', name: 'Bloodwork', type: 'Procedure', icon: 'test-tube', description: 'Blood tests and panels' },
        { id: 'nail-trim', name: 'Nail Trim', type: 'Grooming', icon: 'scissors', description: 'Regular nail maintenance' },
        { id: 'bath', name: 'Bath', type: 'Grooming', icon: 'bath', description: 'Bathing and cleaning' },
        { id: 'deworming', name: 'Deworming', type: 'Medication', icon: 'pill', description: 'Intestinal parasite prevention' },
        { id: 'supplements', name: 'Supplements', type: 'Medication', icon: 'capsule', description: 'Vitamins and supplements' }
    ],

    // Selected items storage
    selections: {
        eventTypes: [],
        scales: [],
        careItems: []
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

        // Pre-select recommended items
        Onboarding.selections.eventTypes = ['medication', 'symptom', 'vet-visit', 'walk', 'weight', 'vaccine'];
        Onboarding.selections.scales = ['symptom-severity', 'activity-level'];
        Onboarding.selections.careItems = ['heartworm', 'flea-tick', 'rabies', 'annual-checkup'];

        Onboarding.updateUI();
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
        Onboarding.populateDropdown('careItems', Onboarding.defaultCareItems);

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
    },

    /**
     * Toggle all items in a dropdown
     */
    toggleAll: (type, checked) => {
        const items = type === 'eventTypes' ? Onboarding.defaultEventTypes :
            type === 'scales' ? Onboarding.defaultScales :
                Onboarding.defaultCareItems;

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
    },

    /**
     * Update select all checkbox state
     */
    updateSelectAllState: (type) => {
        const items = type === 'eventTypes' ? Onboarding.defaultEventTypes :
            type === 'scales' ? Onboarding.defaultScales :
                Onboarding.defaultCareItems;

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
            label.innerHTML = `Select ${type === 'eventTypes' ? 'event types' : type}...`;
            label.className = 'multiselect-label text-sm text-earth-metal';
        } else {
            const items = type === 'eventTypes' ? Onboarding.defaultEventTypes :
                type === 'scales' ? Onboarding.defaultScales :
                    Onboarding.defaultCareItems;

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

                if (!notionToken) {
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

            const res = await fetch(workerUrl);

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
     * Start OAuth Flow
     */
    startOAuth: () => {
        const workerUrl = document.getElementById('onboardingWorkerUrl')?.value?.trim();
        const proxyToken = document.getElementById('onboardingProxyToken')?.value?.trim();

        if (workerUrl) {
            PetTracker.Settings.set({ workerUrl, proxyToken: proxyToken || '' });
        }

        const settings = PetTracker.Settings.get();
        const redirectUri = encodeURIComponent(settings.workerUrl + '/oauth/callback');
        const clientId = '1662a458-d0a4-803f-bd66-fb0a5a0a1cc7';

        PetTracker.Settings.set({
            onboardingInProgress: true,
            onboardingStep: 3
        });

        const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&owner=user`;
        window.location.href = authUrl;
    },

    /**
     * Find and list Notion databases
     */
    findDatabases: async () => {
        const token = document.getElementById('onboardingNotionToken')?.value?.trim();
        const container = document.getElementById('onboardingDbList');
        const verifyBtn = document.getElementById('onboardingDbVerifyBtn');

        if (!token) {
            PetTracker.UI.toast('Enter a Notion token', 'error');
            return;
        }

        PetTracker.Settings.set({ notionToken: token });

        try {
            PetTracker.UI.showLoading('Scanning Notion...');

            const dataSources = await PetTracker.API.listDatabases();

            const dbOptions = dataSources.map(db => ({
                id: db.id,
                name: db.title?.[0]?.plain_text || db.name || 'Untitled'
            }));

            const required = ['Pets', 'Events', 'Event Types', 'Scales', 'Scale Levels', 'Care Items', 'Care Plans', 'Contacts'];
            const mapping = {};

            let html = '<div class="space-y-2 mt-4">';
            html += '<p class="text-xs text-earth-metal mb-2">Map your databases:</p>';

            required.forEach(reqName => {
                const selectedId = mapping[reqName] || '';
                const options = dbOptions.map(db =>
                    `<option value="${db.id}" ${db.id === selectedId ? 'selected' : ''}>${PetTracker.UI.escapeHtml(db.name)}</option>`
                ).join('');

                html += `
                    <div class="grid grid-cols-3 gap-2 items-center">
                        <label class="text-[10px] font-mono uppercase text-earth-metal text-right">${reqName}</label>
                        <select class="col-span-2 select-field text-xs py-1" data-source="${reqName}" onchange="Onboarding.checkDbMapping()">
                            <option value="">-- Select --</option>
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

        selects.forEach(sel => {
            if (!sel.value) allSet = false;
            mapping[sel.dataset.source] = sel.value;
        });

        if (allSet) {
            const storeMapping = {
                'Pets': 'pets',
                'Events': 'events',
                'Event Types': 'eventTypes',
                'Scales': 'scales',
                'Scale Levels': 'scaleLevels',
                'Care Items': 'careItems',
                'Care Plans': 'carePlans',
                'Contacts': 'contacts'
            };

            const dataSources = {};
            Object.keys(mapping).forEach(key => {
                if (storeMapping[key]) {
                    dataSources[storeMapping[key]] = mapping[key];
                }
            });

            PetTracker.Settings.set({ dataSources });
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
        // Create selected event types
        for (const id of Onboarding.selections.eventTypes) {
            const template = Onboarding.defaultEventTypes.find(t => t.id === id);
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
                    trackingMode: template.category === 'Activity' ? 'Timed' : 'Stamp',
                    defaultIcon: template.icon,
                    defaultColor: template.color,
                    usesSeverity: template.category === 'Symptom',
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

        // Create selected scales
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
            }
        }

        // Create selected care items
        for (const id of Onboarding.selections.careItems) {
            const template = Onboarding.defaultCareItems.find(c => c.id === id);
            if (!template) continue;

            const existing = await PetTracker.DB.query(
                PetTracker.STORES.CARE_ITEMS,
                c => c.name === template.name
            );

            if (existing.length === 0) {
                const careItem = {
                    id: PetTracker.generateId(),
                    name: template.name,
                    type: template.type,
                    defaultDose: template.defaultDose || '',
                    active: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    synced: false
                };

                await PetTracker.DB.put(PetTracker.STORES.CARE_ITEMS, careItem);
                await PetTracker.SyncQueue.add({
                    type: 'create',
                    store: 'careItems',
                    recordId: careItem.id,
                    data: careItem
                });
            }
        }

        if (PetTracker.Sync?.updatePendingCount) {
            PetTracker.Sync.updatePendingCount();
        }
    },

    /**
     * Create sample events for the pet
     */
    createSampleEvents: async (petId) => {
        const eventTypes = await PetTracker.DB.getAll(PetTracker.STORES.EVENT_TYPES);
        const walkType = eventTypes.find(et => et.name === 'Walk');
        const weightType = eventTypes.find(et => et.name === 'Weight');
        const vetType = eventTypes.find(et => et.name === 'Vet Visit');

        const now = new Date();
        const sampleEvents = [];

        if (walkType) {
            sampleEvents.push({
                title: 'Morning walk',
                petIds: [petId],
                eventTypeId: walkType.id,
                startDate: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
                status: 'Completed',
                duration: 30,
                notes: 'Great walk around the neighborhood!'
            });
        }

        if (weightType) {
            sampleEvents.push({
                title: 'Weight check',
                petIds: [petId],
                eventTypeId: weightType.id,
                startDate: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
                status: 'Completed',
                value: 25,
                unit: 'lb'
            });
        }

        if (vetType) {
            sampleEvents.push({
                title: 'Annual checkup',
                petIds: [petId],
                eventTypeId: vetType.id,
                startDate: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'Completed',
                notes: 'All vaccinations up to date. Healthy!'
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
