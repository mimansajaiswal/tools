/**
 * Pet Tracker - Pets Module
 * Pet CRUD operations and profile management
 */

const Pets = {
    /**
     * Save a new pet
     */
    save: async (petData) => {
        const pet = {
            id: PetTracker.generateId(),
            name: petData.name,
            species: petData.species || null,
            breed: petData.breed || '',
            sex: petData.sex || null,
            birthDate: petData.birthDate || null,
            adoptionDate: petData.adoptionDate || null,
            status: petData.status || 'Active',
            microchipId: petData.microchipId || '',
            tags: petData.tags || [],
            notes: petData.notes || '',
            targetWeightMin: petData.targetWeightMin || null,
            targetWeightMax: petData.targetWeightMax || null,
            weightUnit: petData.weightUnit || 'lb',
            color: petData.color || '#8b7b8e',
            isPrimary: petData.isPrimary || false,
            photo: petData.photo || [],
            icon: petData.icon || null,
            primaryVetId: petData.primaryVetId || null,
            relatedContactIds: petData.relatedContactIds || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            synced: false
        };

        await PetTracker.DB.put(PetTracker.STORES.PETS, pet);
        await PetTracker.SyncQueue.add({
            type: 'create',
            store: 'pets',
            recordId: pet.id,
            data: pet
        });

        // Update sync UI
        if (PetTracker.Sync?.updatePendingCount) {
            PetTracker.Sync.updatePendingCount();
        }

        return pet;
    },

    /**
     * Update an existing pet
     */
    update: async (id, updates) => {
        const pet = await PetTracker.DB.get(PetTracker.STORES.PETS, id);
        if (!pet) throw new Error('Pet not found');

        const updated = {
            ...pet,
            ...updates,
            updatedAt: new Date().toISOString(),
            synced: false
        };

        await PetTracker.DB.put(PetTracker.STORES.PETS, updated);
        await PetTracker.SyncQueue.add({
            type: 'update',
            store: 'pets',
            recordId: id,
            data: updated
        });

        // Update sync UI
        if (PetTracker.Sync?.updatePendingCount) {
            PetTracker.Sync.updatePendingCount();
        }

        return updated;
    },

    /**
     * Delete a pet
     */
    delete: async (id) => {
        const pet = await PetTracker.DB.get(PetTracker.STORES.PETS, id);
        if (!pet) return;

        const events = await PetTracker.DB.query(
            PetTracker.STORES.EVENTS,
            e => e.petIds?.includes(id)
        );

        for (const event of events) {
            await PetTracker.SyncQueue.add({
                type: 'delete',
                store: 'events',
                recordId: event.id,
                data: { notionId: event.notionId }
            });
            await PetTracker.DB.delete(PetTracker.STORES.EVENTS, event.id);
        }

        await PetTracker.SyncQueue.add({
            type: 'delete',
            store: 'pets',
            recordId: id,
            data: { notionId: pet.notionId }
        });

        await PetTracker.DB.delete(PetTracker.STORES.PETS, id);

        // Update sync UI
        if (PetTracker.Sync?.updatePendingCount) {
            PetTracker.Sync.updatePendingCount();
        }
    },

    /**
     * Get all pets
     */
    getAll: async () => {
        return PetTracker.DB.getAll(PetTracker.STORES.PETS);
    },

    /**
     * Get pet by ID
     */
    get: async (id) => {
        return PetTracker.DB.get(PetTracker.STORES.PETS, id);
    },

    /**
     * Get active pets
     */
    getActive: async () => {
        const all = await Pets.getAll();
        return all.filter(p => p.status === 'Active');
    },

    /**
     * Calculate pet's age
     */
    calculateAge: (birthDate) => {
        if (!birthDate) return null;
        const birth = new Date(birthDate);
        const now = new Date();
        let years = now.getFullYear() - birth.getFullYear();
        const monthDiff = now.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
            years--;
        }
        return years;
    },

    /**
     * Get weight event type ID
     */
    getWeightEventTypeId: () => {
        const eventTypes = App.state.eventTypes || [];
        const weightType = eventTypes.find(t =>
            t.name?.toLowerCase().includes('weight') || t.category === 'Weight'
        );
        return weightType?.id || null;
    },

    /**
     * Get weight history for a pet (sorted newest first)
     */
    getWeightHistory: async (petId, limit = 10) => {
        const weightTypeId = Pets.getWeightEventTypeId();
        if (!weightTypeId) return [];

        const events = await PetTracker.DB.query(
            PetTracker.STORES.EVENTS,
            e => e.petIds?.includes(petId) && e.eventTypeId === weightTypeId && e.value !== null
        );

        events.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        return events.slice(0, limit);
    },

    /**
     * Get latest weight for a pet
     */
    getLatestWeight: async (petId) => {
        const history = await Pets.getWeightHistory(petId, 1);
        return history[0] || null;
    },

    /**
     * Generate SVG sparkline for weight data
     */
    generateWeightSparkline: (weights, width = 80, height = 20) => {
        if (!weights || weights.length < 2) return '';

        const values = weights.slice().reverse().map(w => w.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        const points = values.map((v, i) => {
            const x = (i / (values.length - 1)) * width;
            const y = height - ((v - min) / range) * (height - 4) - 2;
            return `${x},${y}`;
        }).join(' ');

        return `<svg width="${width}" height="${height}" class="inline-block align-middle">
            <polyline fill="none" stroke="#8b7b8e" stroke-width="1.5" points="${points}"/>
        </svg>`;
    },

    /**
     * Render pet card
     */
    renderCard: (pet, options = {}) => {
        const { showActions = false, onClick = null } = options;
        const age = Pets.calculateAge(pet.birthDate);
        const ageStr = age !== null ? `${age}y` : '';

        // Determine what to show in the avatar area: photo > icon > species default
        const speciesIcon = PetTracker.UI.getSpeciesIcon(pet.species);
        let avatarContent;
        if (pet.photo?.[0]?.url) {
            avatarContent = `<img src="${pet.photo[0].url}" alt="${PetTracker.UI.escapeHtml(pet.name)}" class="w-full h-full object-cover">`;
        } else if (pet.icon) {
            avatarContent = PetTracker.UI.renderIcon(pet.icon, speciesIcon, 'w-7 h-7');
        } else {
            avatarContent = `<i data-lucide="${speciesIcon}" class="w-7 h-7 text-earth-metal"></i>`;
        }

        return `
            <div class="card card-hover p-4 ${onClick ? 'cursor-pointer' : ''}" 
                 ${onClick ? `onclick="${onClick}('${pet.id}')"` : ''}>
                <div class="flex items-center gap-3">
                    <div class="w-14 h-14 bg-oatmeal flex items-center justify-center flex-shrink-0 overflow-hidden">
                        ${avatarContent}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <h3 class="font-serif text-lg text-charcoal truncate">${PetTracker.UI.escapeHtml(pet.name)}</h3>
                            ${pet.isPrimary ? '<span class="badge badge-accent text-[9px]">PRIMARY</span>' : ''}
                        </div>
                        <p class="meta-row text-xs mt-1">
                            <span class="meta-value">${pet.species || 'Pet'}</span>
                            ${pet.breed ? `<span class="meta-separator">//</span><span>${PetTracker.UI.escapeHtml(pet.breed)}</span>` : ''}
                            ${ageStr ? `<span class="meta-separator">//</span><span>${ageStr}</span>` : ''}
                        </p>
                        ${pet.status !== 'Active' ? `<span class="badge badge-light text-[9px] mt-1">${pet.status}</span>` : ''}
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="pet-dot" style="background-color: ${pet.color || '#8b7b8e'}"></div>
                        ${showActions ? `
                            <button onclick="event.stopPropagation(); Pets.showEditModal('${pet.id}')" 
                                    class="p-1 text-earth-metal hover:text-dull-purple">
                                <i data-lucide="pencil" class="w-4 h-4"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render pets list view
     */
    renderList: async () => {
        const container = document.querySelector('[data-view="pets"]');
        if (!container) return;

        // Clear pet detail state when going back to list
        PetTracker.Settings.setUIState({ viewingPetId: null });

        const pets = await Pets.getAll();

        container.innerHTML = `
            <div class="p-4 space-y-6">
                <div class="flex items-center justify-between">
                    ${PetTracker.UI.sectionHeader(1, 'Manage Pets')}
                    <button onclick="Pets.showAddModal()" class="btn-primary px-4 py-2 font-mono text-xs uppercase">
                        <i data-lucide="plus" class="w-4 h-4 inline mr-2"></i>Add Pet
                    </button>
                </div>

                ${pets.length === 0 ? `
                    ${PetTracker.UI.emptyState('paw-print', 'No pets yet', 'Add your first pet to get started')}
                ` : `
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${pets.map(pet => Pets.renderCard(pet, {
            showActions: true,
            onClick: 'Pets.showDetail'
        })).join('')}
                    </div>
                `}
            </div>
        `;

        if (window.lucide) lucide.createIcons();
    },

    /**
     * Show add pet modal
     */
    showAddModal: () => {
        const form = document.getElementById('addPetForm');
        if (form) form.reset();

        document.getElementById('addPetColor').value = '#8b7b8e';
        document.getElementById('addPetForm').dataset.editId = '';

        // Reset icon
        const iconInput = document.getElementById('addPetIcon');
        const iconPreview = document.getElementById('addPetIconPreview');
        if (iconInput) iconInput.value = '';
        if (iconPreview) iconPreview.innerHTML = `<i data-lucide="image-plus" class="w-6 h-6 text-earth-metal"></i>`;

        const header = document.querySelector('#addPetModal .section-header');
        if (header) header.textContent = 'Add Pet';

        PetTracker.UI.openModal('addPetModal');
        if (window.lucide) lucide.createIcons();
    },

    /**
     * Show edit pet modal
     */
    showEditModal: async (id) => {
        const pet = await Pets.get(id);
        if (!pet) return;

        document.getElementById('addPetName').value = pet.name || '';
        document.getElementById('addPetSpecies').value = pet.species || '';
        document.getElementById('addPetSex').value = pet.sex || '';
        document.getElementById('addPetBreed').value = pet.breed || '';
        document.getElementById('addPetBirthDate').value = pet.birthDate || '';
        document.getElementById('addPetColor').value = pet.color || '#8b7b8e';
        document.getElementById('addPetNotes').value = pet.notes || '';
        document.getElementById('addPetForm').dataset.editId = id;

        // Populate icon field
        const iconInput = document.getElementById('addPetIcon');
        const iconPreview = document.getElementById('addPetIconPreview');
        if (pet.icon && iconInput && iconPreview) {
            iconInput.value = JSON.stringify(pet.icon);
            iconPreview.innerHTML = PetTracker.UI.renderIcon(pet.icon, 'image-plus', 'w-6 h-6');
        } else if (iconInput && iconPreview) {
            iconInput.value = '';
            iconPreview.innerHTML = `<i data-lucide="image-plus" class="w-6 h-6 text-earth-metal"></i>`;
        }

        const header = document.querySelector('#addPetModal .section-header');
        if (header) header.textContent = 'Edit Pet';

        PetTracker.UI.openModal('addPetModal');
        if (window.lucide) lucide.createIcons();
    },

    /**
     * Save pet from modal form
     */
    saveFromModal: async () => {
        const form = document.getElementById('addPetForm');
        const editId = form?.dataset.editId;

        // Parse icon from hidden input
        let icon = null;
        const iconValue = document.getElementById('addPetIcon')?.value;
        if (iconValue) {
            try {
                icon = JSON.parse(iconValue);
            } catch (e) {
                console.warn('[Pets] Error parsing icon:', e);
            }
        }

        const data = {
            name: document.getElementById('addPetName')?.value?.trim(),
            species: document.getElementById('addPetSpecies')?.value || null,
            sex: document.getElementById('addPetSex')?.value || null,
            breed: document.getElementById('addPetBreed')?.value?.trim() || '',
            birthDate: document.getElementById('addPetBirthDate')?.value || null,
            color: document.getElementById('addPetColor')?.value || '#8b7b8e',
            notes: document.getElementById('addPetNotes')?.value?.trim() || '',
            icon
        };

        if (!data.name) {
            PetTracker.UI.toast('Pet name is required', 'error');
            return;
        }

        try {
            if (editId) {
                await Pets.update(editId, data);
                PetTracker.UI.toast('Pet updated', 'success');
            } else {
                await Pets.save(data);
                PetTracker.UI.toast('Pet added', 'success');
            }

            PetTracker.UI.closeModal('addPetModal');

            // Refresh
            await App.loadData();
            Pets.renderList();
            App.renderDashboard();
        } catch (e) {
            console.error('[Pets] Error saving:', e);
            PetTracker.UI.toast(`Error: ${e.message}`, 'error');
        }
    },

    /**
     * Show pet detail view
     */
    showDetail: async (id) => {
        const pet = await Pets.get(id);
        if (!pet) return;

        PetTracker.Settings.setActivePet(id);
        App.state.activePetId = id;

        // Save UI state - viewing pet detail
        PetTracker.Settings.setUIState({ viewingPetId: id });

        // Get pet's events
        const events = await PetTracker.DB.query(
            PetTracker.STORES.EVENTS,
            e => e.petIds?.includes(id)
        );
        events.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        const recentEvents = events.slice(0, 10);

        // Get weight history using proper weight type
        const weightEvents = await Pets.getWeightHistory(id, 10);
        const latestWeight = weightEvents[0]?.value || null;

        // Check if weight is out of target range
        let weightAlert = '';
        if (latestWeight !== null && (pet.targetWeightMin || pet.targetWeightMax)) {
            const isBelow = pet.targetWeightMin && latestWeight < pet.targetWeightMin;
            const isAbove = pet.targetWeightMax && latestWeight > pet.targetWeightMax;
            if (isBelow || isAbove) {
                const msg = isBelow
                    ? `Weight is below target minimum (${pet.targetWeightMin} ${pet.weightUnit || 'lb'})`
                    : `Weight is above target maximum (${pet.targetWeightMax} ${pet.weightUnit || 'lb'})`;
                weightAlert = `
                    <div class="mt-3 bg-muted-pink/20 border border-muted-pink p-3 flex items-center gap-2">
                        <i data-lucide="alert-triangle" class="w-4 h-4 text-muted-pink flex-shrink-0"></i>
                        <p class="text-xs text-charcoal">${msg}</p>
                    </div>`;
            }
        }

        // Generate sparkline
        const sparkline = Pets.generateWeightSparkline(weightEvents.slice(0, 7));

        const age = Pets.calculateAge(pet.birthDate);
        const ageStr = age !== null ? `${age} years old` : '';

        const container = document.querySelector('[data-view="pets"]');
        container.innerHTML = `
            <div class="p-4 space-y-6">
                <!-- Back button -->
                <button onclick="Pets.renderList()" class="flex items-center gap-2 text-earth-metal hover:text-dull-purple text-sm">
                    <i data-lucide="arrow-left" class="w-4 h-4"></i>
                    <span class="font-mono uppercase text-xs">Back to Pets</span>
                </button>

                <!-- Pet Header -->
                <div class="card p-6">
                    <div class="flex flex-col md:flex-row gap-6">
                        <div class="w-32 h-32 bg-oatmeal flex items-center justify-center flex-shrink-0 overflow-hidden">
                            ${(() => {
                                const speciesIcon = PetTracker.UI.getSpeciesIcon(pet.species);
                                if (pet.photo?.[0]?.url) {
                                    return `<img src="${pet.photo[0].url}" alt="${PetTracker.UI.escapeHtml(pet.name)}" class="w-full h-full object-cover">`;
                                } else if (pet.icon) {
                                    return PetTracker.UI.renderIcon(pet.icon, speciesIcon, 'w-16 h-16');
                                } else {
                                    return `<i data-lucide="${speciesIcon}" class="w-16 h-16 text-earth-metal"></i>`;
                                }
                            })()}
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center gap-3 mb-2">
                                <h2 class="font-serif text-3xl text-charcoal">${PetTracker.UI.escapeHtml(pet.name)}</h2>
                                <div class="pet-dot w-4 h-4" style="background-color: ${pet.color || '#8b7b8e'}"></div>
                                ${pet.isPrimary ? '<span class="badge badge-accent">PRIMARY</span>' : ''}
                            </div>
                            <div class="meta-row text-sm space-x-3">
                                <span class="meta-label">SPECIES:</span>
                                <span class="meta-value">${pet.species || 'Unknown'}</span>
                                ${pet.breed ? `<span class="meta-separator">//</span><span class="meta-label">BREED:</span><span class="meta-value">${PetTracker.UI.escapeHtml(pet.breed)}</span>` : ''}
                                ${pet.sex ? `<span class="meta-separator">//</span><span class="meta-label">SEX:</span><span class="meta-value">${pet.sex}</span>` : ''}
                            </div>
                            ${ageStr ? `<p class="text-sm text-earth-metal mt-1">${ageStr}</p>` : ''}
                            ${pet.notes ? `<p class="text-sm text-charcoal mt-3">${PetTracker.UI.escapeHtml(pet.notes)}</p>` : ''}
                            
                            <div class="flex flex-wrap gap-3 mt-4">
                                <button onclick="Pets.showEditModal('${pet.id}')" class="btn-secondary px-3 py-2 font-mono text-xs uppercase">
                                    <i data-lucide="pencil" class="w-3 h-3 inline mr-1"></i>Edit
                                </button>
                                <button onclick="App.openAddModal({pet: '${pet.id}'})" class="btn-primary px-3 py-2 font-mono text-xs uppercase">
                                    <i data-lucide="plus" class="w-3 h-3 inline mr-1"></i>Log Event
                                </button>
                                <button onclick="Pets.quickWeighIn('${pet.id}')" class="btn-secondary px-3 py-2 font-mono text-xs uppercase">
                                    <i data-lucide="scale" class="w-3 h-3 inline mr-1"></i>Quick Weigh-In
                                </button>
                                <button onclick="Pets.confirmDelete('${pet.id}')" class="btn-secondary px-3 py-2 font-mono text-xs uppercase text-muted-pink">
                                    <i data-lucide="trash-2" class="w-3 h-3 inline mr-1"></i>Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Weight Summary -->
                <div>
                    ${PetTracker.UI.sectionHeader(2, 'Weight')}
                    <div class="card p-4 mt-3">
                        <div class="flex items-center justify-between gap-4">
                            <div class="flex-1">
                                ${weightEvents.length > 0 ? `
                                    <div class="flex items-center gap-3">
                                        <p class="font-serif text-2xl text-charcoal">${weightEvents[0].value} ${pet.weightUnit || 'lb'}</p>
                                        ${sparkline}
                                    </div>
                                    <p class="text-xs text-earth-metal mt-1">Last recorded ${PetTracker.UI.formatRelative(weightEvents[0].startDate)}</p>
                                ` : `
                                    <p class="text-earth-metal text-sm">No weight recorded</p>
                                `}
                            </div>
                            ${(pet.targetWeightMin || pet.targetWeightMax) ? `
                                <div class="text-right">
                                    <p class="font-mono text-xs uppercase text-earth-metal">Target</p>
                                    <p class="text-sm text-charcoal">${pet.targetWeightMin || '?'} - ${pet.targetWeightMax || '?'} ${pet.weightUnit || 'lb'}</p>
                                </div>
                            ` : ''}
                        </div>
                        ${weightAlert}
                    </div>
                </div>

                <!-- Recent Events -->
                <div>
                    ${PetTracker.UI.sectionHeader(3, 'Recent Events')}
                    <div class="mt-3 space-y-2">
                        ${recentEvents.length === 0 ? `
                            <p class="text-earth-metal text-sm py-4">No events recorded</p>
                        ` : recentEvents.map(event => {
                            const eventType = App.state.eventTypes.find(t => t.id === event.eventTypeId);
                            const defaultIcon = eventType?.defaultIcon || 'activity';
                            let iconHtml;
                            if (event.icon) {
                                iconHtml = PetTracker.UI.renderIcon(event.icon, defaultIcon, 'w-4 h-4');
                            } else if (eventType?.icon) {
                                iconHtml = PetTracker.UI.renderIcon(eventType.icon, defaultIcon, 'w-4 h-4');
                            } else {
                                iconHtml = `<i data-lucide="${defaultIcon}" class="w-4 h-4 text-earth-metal"></i>`;
                            }
                            return `
                            <div class="card card-hover p-3 flex items-center gap-3 cursor-pointer" onclick="Calendar.showEventDetail('${event.id}')">
                                <div class="w-8 h-8 bg-oatmeal flex items-center justify-center">
                                    ${iconHtml}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm text-charcoal truncate">${PetTracker.UI.escapeHtml(event.title || 'Event')}</p>
                                    <p class="meta-row text-xs">${PetTracker.UI.formatRelative(event.startDate)}</p>
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
     * Quick Weigh-In: Opens add modal prefilled for weight event
     */
    quickWeighIn: (petId) => {
        const weightTypeId = Pets.getWeightEventTypeId();
        if (!weightTypeId) {
            PetTracker.UI.toast('No weight event type found', 'error');
            return;
        }
        App.openAddModal({ pet: petId, type: weightTypeId });
    },

    /**
     * Confirm delete pet
     */
    confirmDelete: (id) => {
        PetTracker.UI.confirm(
            'Delete this pet? This will also remove all associated events locally. Synced data in Notion will be archived.',
            async () => {
                try {
                    await Pets.delete(id);
                    PetTracker.UI.toast('Pet deleted', 'success');
                    await App.loadData();
                    Pets.renderList();
                } catch (e) {
                    PetTracker.UI.toast(`Error: ${e.message}`, 'error');
                }
            }
        );
    }
};

// Setup form submit handler
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addPetForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            Pets.saveFromModal();
        });
    }
});

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.Pets = Pets;
window.Pets = Pets;
