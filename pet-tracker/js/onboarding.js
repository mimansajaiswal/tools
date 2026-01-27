/**
 * Pet Tracker - Onboarding Module
 * Multi-step setup wizard with sample data creation
 */

const Onboarding = {
    currentStep: 1,
    totalSteps: 4,

    /**
     * Initialize onboarding
     */
    init: () => {
        Onboarding.currentStep = 1;
        Onboarding.updateUI();
        
        // Restore step if possible (e.g. after refresh)
        // But for safety, start at 1 or where we left off if clearly marked
    },

    /**
     * Go to next step
     */
    nextStep: async () => {
        // Validate current step
        if (!await Onboarding.validateStep(Onboarding.currentStep)) {
            return;
        }

        // Save step data
        await Onboarding.saveStepData(Onboarding.currentStep);

        if (Onboarding.currentStep < Onboarding.totalSteps) {
            Onboarding.currentStep++;
            Onboarding.updateUI();
            
            // Auto-trigger actions on step entry
            if (Onboarding.currentStep === 3) {
                // Restore previous session logic if needed
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
        // Data is progressively saved to Settings during verification steps
        // This is just a final checkpoint
        const s = PetTracker.Settings.get();
        
        switch (step) {
            case 2:
                const workerUrl = document.getElementById('onboardingWorkerUrl')?.value;
                const proxyToken = document.getElementById('onboardingProxyToken')?.value;
                PetTracker.Settings.set({ workerUrl, proxyToken });
                break;
                
            // Step 3 data (token, db mapping) is saved during the interactive process
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
            
            // Save temporarily
            PetTracker.Settings.set({ workerUrl, proxyToken });

            // Ping endpoint - we use a simple fetch to the worker root or a known endpoint
            // Since we might not have a Notion token yet, we can't fully test the proxy to Notion
            // But we can test if the worker responds to a health check or just exists.
            // A simple fetch to the worker URL should return 400 (Missing url) or 200 depending on implementation.
            // Our worker returns 400 'Missing url parameter' if working but no params.
            
            const res = await fetch(workerUrl);
            const text = await res.text();
            
            // If we get a response (even 400/404/500), the worker is reachable.
            // The specific worker code returns "Missing url parameter" (400) or "Unauthorized" (401)
            
            if (res.status === 401 && proxyToken === '') {
                 throw new Error('Worker requires Proxy Token');
            }

            PetTracker.UI.hideLoading();
            
            // Mark verified
            document.getElementById('onboardingWorkerVerified').value = 'true';
            if (statusDiv) {
                statusDiv.classList.remove('hidden');
                statusDiv.className = 'mt-2 p-2 bg-dull-purple/20 border border-dull-purple text-xs text-charcoal';
                statusDiv.innerHTML = '<i data-lucide="check" class="w-3 h-3 inline mr-1"></i>Worker Verified';
            }
            PetTracker.UI.toast('Worker Verified', 'success');
            Onboarding.updateUI(); // Enable Next button

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
    startOAuth: async () => {
        try {
            const token = await PetTracker.API.startOAuth();
            if (token) {
                document.getElementById('onboardingNotionToken').value = token;
                PetTracker.Settings.set({ notionToken: token });
                PetTracker.UI.toast('Authenticated with Notion', 'success');
                // Auto-trigger database search
                setTimeout(() => Onboarding.findDatabases(), 500);
            }
        } catch (e) {
            PetTracker.UI.toast('Auth failed: ' + e.message, 'error');
        }
    },

    /**
     * Search and Map Databases
     */
    findDatabases: async () => {
        const token = document.getElementById('onboardingNotionToken')?.value;
        if (!token) {
            PetTracker.UI.toast('Token required', 'error');
            return;
        }

        // Save token to settings so API calls work
        PetTracker.Settings.set({ notionToken: token });

        const container = document.getElementById('onboardingDbList');
        const verifyBtn = document.getElementById('onboardingDbVerifyBtn');
        
        try {
            PetTracker.UI.showLoading('Scanning Notion data sources...');
            
            // 1. Search for all data sources
            // API requires 'data_source' instead of 'database' for this version
            const searchRes = await PetTracker.API.search('', { property: 'object', value: 'data_source' });
            const dataSources = searchRes.results || [];
            
            if (dataSources.length === 0) {
                throw new Error('No data sources found. Please ensure you have created the databases and shared them with your integration.');
            }

            // 2. Define required sources
            const required = ['Pets', 'Events', 'Event Types', 'Scales', 'Scale Levels', 'Care Items', 'Care Plans', 'Contacts'];
            const mapping = {};
            const dbOptions = dataSources.map(ds => ({
                id: ds.id,
                // Handle potential title/name variations
                name: ds.title?.[0]?.plain_text || ds.name || 'Untitled'
            }));

            // 3. Try auto-mapping by name
            required.forEach(reqName => {
                const match = dbOptions.find(db => db.name.toLowerCase().includes(reqName.toLowerCase()));
                if (match) mapping[reqName] = match.id;
            });

            // 4. Render UI for mapping
            let html = '<div class="space-y-3 bg-oatmeal/20 p-3 border border-oatmeal">';
            html += '<p class="text-xs text-earth-metal mb-2">Match found databases to required data sources:</p>';
            
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
            
            Onboarding.checkDbMapping(); // Initial check

        } catch (e) {
            PetTracker.UI.hideLoading();
            PetTracker.UI.toast('Scan error: ' + e.message, 'error');
            container.innerHTML = `<p class="text-xs text-muted-pink p-2">${e.message}</p>`;
            container.classList.remove('hidden');
        }
    },

    /**
     * Check if all databases are mapped and verify logic
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
            // Map the friendly names back to store keys
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

            // Save to settings
            PetTracker.Settings.set({ dataSources, databaseId: dataSources.pets }); // Use pets DB ID as main ID for ref
            
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

            // Create sample data if checked
            const createSample = document.getElementById('onboardingCreateSample')?.checked;
            if (createSample) {
                await Onboarding.createSampleData();
            }

            // Create first pet
            const petName = document.getElementById('onboardingPetName')?.value?.trim();
            const petSpecies = document.getElementById('onboardingPetSpecies')?.value;
            const petColor = document.getElementById('onboardingPetColor')?.value;

            if (petName) {
                await Pets.save({
                    name: petName,
                    species: petSpecies || 'Dog',
                    color: petColor || '#8b7b8e',
                    status: 'Active',
                    isPrimary: true
                });
            }

            // Mark onboarding complete
            PetTracker.Settings.setOnboardingDone(true);

            PetTracker.UI.hideLoading();
            PetTracker.UI.toast('Setup complete!', 'success');
            PetTracker.UI.closeModal('onboardingModal');

            // Reload data and show dashboard
            await App.loadData();
            App.showView('dashboard');

        } catch (e) {
            console.error('[Onboarding] Error:', e);
            PetTracker.UI.hideLoading();
            PetTracker.UI.toast('Setup error: ' + e.message, 'error');
        }
    },

    /**
     * Create sample data (event types, scales, care items)
     */
    createSampleData: async () => {
        // Create default event types
        await Care.createDefaultEventTypes();

        // Create default scales
        await Care.createDefaultScales();

        // Create sample care items
        const sampleCareItems = [
            { name: 'Heartworm Prevention', type: 'Medication', defaultDose: '1 tablet', active: true },
            { name: 'Flea & Tick', type: 'Medication', defaultDose: '1 application', active: true },
            { name: 'Rabies Vaccine', type: 'Vaccine', active: true },
            { name: 'DHPP Vaccine', type: 'Vaccine', active: true },
            { name: 'Annual Checkup', type: 'Procedure', active: true },
            { name: 'Dental Cleaning', type: 'Procedure', active: true }
        ];

        for (const item of sampleCareItems) {
            await PetTracker.DB.put(PetTracker.STORES.CARE_ITEMS, {
                id: PetTracker.UI.generateId(),
                ...item,
                createdAt: new Date().toISOString(),
                clientUpdatedAt: new Date().toISOString()
            });
        }

        console.log('[Onboarding] Sample data created');
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.Onboarding = Onboarding;
window.Onboarding = Onboarding;