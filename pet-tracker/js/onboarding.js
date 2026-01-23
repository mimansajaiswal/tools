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
    },

    /**
     * Go to next step
     */
    nextStep: async () => {
        // Validate current step
        if (!Onboarding.validateStep(Onboarding.currentStep)) {
            return;
        }

        // Save step data
        await Onboarding.saveStepData(Onboarding.currentStep);

        if (Onboarding.currentStep < Onboarding.totalSteps) {
            Onboarding.currentStep++;
            Onboarding.updateUI();
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
     * Skip onboarding entirely
     */
    skip: () => {
        PetTracker.Settings.setOnboardingDone(true);
        PetTracker.UI.closeModal('onboardingModal');
        App.loadData().then(() => App.showView('dashboard'));
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
        }

        if (window.lucide) lucide.createIcons();
    },

    /**
     * Validate current step
     */
    validateStep: (step) => {
        switch (step) {
            case 2:
                const workerUrl = document.getElementById('onboardingWorkerUrl')?.value;
                if (!workerUrl) {
                    PetTracker.UI.toast('Worker URL is required', 'error');
                    return false;
                }
                try {
                    new URL(workerUrl);
                } catch {
                    PetTracker.UI.toast('Invalid Worker URL', 'error');
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
        switch (step) {
            case 2:
                const workerUrl = document.getElementById('onboardingWorkerUrl')?.value;
                const proxyToken = document.getElementById('onboardingProxyToken')?.value;
                PetTracker.Settings.set({ workerUrl, proxyToken });
                break;

            case 3:
                const notionToken = document.getElementById('onboardingNotionToken')?.value;
                const databaseId = document.getElementById('onboardingDatabaseId')?.value;
                PetTracker.Settings.set({ notionToken, databaseId });
                break;
        }
    },

    /**
     * Complete onboarding
     */
    complete: async () => {
        try {
            PetTracker.UI.showLoading('Setting up...');

            // Save final settings
            const notionToken = document.getElementById('onboardingNotionToken')?.value;
            const databaseId = document.getElementById('onboardingDatabaseId')?.value;
            PetTracker.Settings.set({ notionToken, databaseId });

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
                await Pets.create({
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
     * Test Notion connection
     */
    testConnection: async () => {
        const workerUrl = document.getElementById('onboardingWorkerUrl')?.value;
        const notionToken = document.getElementById('onboardingNotionToken')?.value;
        const statusEl = document.getElementById('onboardingConnectionStatus');

        if (!workerUrl || !notionToken) {
            PetTracker.UI.toast('Enter worker URL and token first', 'error');
            return;
        }

        // Temporarily save settings for test
        PetTracker.Settings.set({ workerUrl, notionToken });

        statusEl.classList.remove('hidden');
        statusEl.innerHTML = '<p class="text-earth-metal text-sm">Testing connection...</p>';

        try {
            const user = await PetTracker.API.verifyConnection();
            statusEl.innerHTML = `
                <div class="bg-dull-purple/20 border border-dull-purple p-2">
                    <p class="text-sm text-charcoal">
                        <i data-lucide="check-circle" class="w-4 h-4 inline mr-1 text-dull-purple"></i>
                        Connected as ${user.name || user.id}
                    </p>
                </div>
            `;
        } catch (e) {
            statusEl.innerHTML = `
                <div class="bg-muted-pink/20 border border-muted-pink p-2">
                    <p class="text-sm text-charcoal">
                        <i data-lucide="x-circle" class="w-4 h-4 inline mr-1 text-muted-pink"></i>
                        Connection failed: ${e.message}
                    </p>
                </div>
            `;
        }

        if (window.lucide) lucide.createIcons();
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
