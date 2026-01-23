/**
 * Pet Tracker - Contacts Module
 * Contact CRUD operations and management
 */

const Contacts = {
    ROLES: ['Vet', 'Groomer', 'Sitter', 'Breeder', 'Emergency', 'Other'],

    /**
     * Save contact (called from form submit)
     */
    save: async () => {
        const editId = document.getElementById('contactEditId')?.value;

        const petCheckboxes = document.querySelectorAll('#contactPetCheckboxes input:checked');
        const relatedPetIds = Array.from(petCheckboxes).map(cb => cb.value);

        const data = {
            name: document.getElementById('contactName')?.value?.trim(),
            role: document.getElementById('contactRole')?.value || null,
            phone: document.getElementById('contactPhone')?.value?.trim() || '',
            email: document.getElementById('contactEmail')?.value?.trim() || '',
            address: document.getElementById('contactAddress')?.value?.trim() || '',
            notes: document.getElementById('contactNotes')?.value?.trim() || '',
            relatedPetIds
        };

        if (!data.name) {
            PetTracker.UI.toast('Contact name is required', 'error');
            return;
        }

        try {
            if (editId) {
                await Contacts.update(editId, data);
                PetTracker.UI.toast('Contact updated', 'success');
            } else {
                await Contacts.create(data);
                PetTracker.UI.toast('Contact added', 'success');
            }

            PetTracker.UI.closeModal('contactModal');
            Contacts.renderList();
        } catch (e) {
            console.error('[Contacts] Error saving:', e);
            PetTracker.UI.toast(`Error: ${e.message}`, 'error');
        }
    },

    /**
     * Create a new contact
     */
    create: async (contactData) => {
        const contact = {
            id: PetTracker.generateId(),
            name: contactData.name,
            role: contactData.role || null,
            phone: contactData.phone || '',
            email: contactData.email || '',
            address: contactData.address || '',
            notes: contactData.notes || '',
            relatedPetIds: contactData.relatedPetIds || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            synced: false
        };

        await PetTracker.DB.put(PetTracker.STORES.CONTACTS, contact);
        await PetTracker.SyncQueue.add({
            type: 'create',
            store: 'contacts',
            recordId: contact.id,
            data: contact
        });

        return contact;
    },

    /**
     * Update an existing contact
     */
    update: async (id, updates) => {
        const contact = await PetTracker.DB.get(PetTracker.STORES.CONTACTS, id);
        if (!contact) throw new Error('Contact not found');

        const updated = {
            ...contact,
            ...updates,
            updatedAt: new Date().toISOString(),
            synced: false
        };

        await PetTracker.DB.put(PetTracker.STORES.CONTACTS, updated);
        await PetTracker.SyncQueue.add({
            type: 'update',
            store: 'contacts',
            recordId: id,
            data: updated
        });

        return updated;
    },

    /**
     * Delete a contact
     */
    delete: async (id) => {
        const contact = await PetTracker.DB.get(PetTracker.STORES.CONTACTS, id);
        if (!contact) return;

        await PetTracker.SyncQueue.add({
            type: 'delete',
            store: 'contacts',
            recordId: id,
            data: { notionId: contact.notionId }
        });

        await PetTracker.DB.delete(PetTracker.STORES.CONTACTS, id);
    },

    /**
     * Get all contacts
     */
    getAll: async () => {
        return PetTracker.DB.getAll(PetTracker.STORES.CONTACTS);
    },

    /**
     * Get contact by ID
     */
    get: async (id) => {
        return PetTracker.DB.get(PetTracker.STORES.CONTACTS, id);
    },

    /**
     * Get contacts by role
     */
    getByRole: async (role) => {
        const all = await Contacts.getAll();
        return all.filter(c => c.role === role);
    },

    /**
     * Get contacts for a pet
     */
    getForPet: async (petId) => {
        const all = await Contacts.getAll();
        return all.filter(c => c.relatedPetIds?.includes(petId));
    },

    /**
     * Get role icon
     */
    getRoleIcon: (role) => {
        const icons = {
            'Vet': 'stethoscope',
            'Groomer': 'scissors',
            'Sitter': 'home',
            'Breeder': 'heart',
            'Emergency': 'alert-circle',
            'Other': 'user'
        };
        return icons[role] || 'user';
    },

    /**
     * Render contact card
     */
    renderCard: (contact, options = {}) => {
        const { showActions = false, onClick = null } = options;
        const icon = Contacts.getRoleIcon(contact.role);

        return `
            <div class="card card-hover p-4 ${onClick ? 'cursor-pointer' : ''}" 
                 ${onClick ? `onclick="${onClick}('${contact.id}')"` : ''}>
                <div class="flex items-start gap-3">
                    <div class="w-12 h-12 bg-oatmeal flex items-center justify-center flex-shrink-0">
                        <i data-lucide="${icon}" class="w-6 h-6 text-earth-metal"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <h3 class="font-serif text-lg text-charcoal truncate">${PetTracker.UI.escapeHtml(contact.name)}</h3>
                            ${contact.role ? `<span class="badge badge-light text-[9px]">${contact.role.toUpperCase()}</span>` : ''}
                        </div>
                        <div class="meta-row text-xs mt-1 space-x-2">
                            ${contact.phone ? `<span class="meta-value">${PetTracker.UI.escapeHtml(contact.phone)}</span>` : ''}
                            ${contact.phone && contact.email ? '<span class="meta-separator">//</span>' : ''}
                            ${contact.email ? `<span class="meta-value">${PetTracker.UI.escapeHtml(contact.email)}</span>` : ''}
                        </div>
                        ${contact.address ? `<p class="text-xs text-earth-metal mt-1 truncate">${PetTracker.UI.escapeHtml(contact.address)}</p>` : ''}
                    </div>
                    ${showActions ? `
                        <div class="flex items-center gap-2">
                            <button onclick="event.stopPropagation(); Contacts.showEditModal('${contact.id}')" 
                                    class="p-1 text-earth-metal hover:text-dull-purple">
                                <i data-lucide="pencil" class="w-4 h-4"></i>
                            </button>
                            <button onclick="event.stopPropagation(); Contacts.confirmDelete('${contact.id}')" 
                                    class="p-1 text-earth-metal hover:text-muted-pink">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Render contacts list view
     */
    renderList: async () => {
        const container = document.querySelector('[data-view="contacts"]');
        if (!container) return;

        const contacts = await Contacts.getAll();
        const pets = await PetTracker.DB.getAll(PetTracker.STORES.PETS);

        const byRole = {};
        contacts.forEach(c => {
            const role = c.role || 'Other';
            if (!byRole[role]) byRole[role] = [];
            byRole[role].push(c);
        });

        container.innerHTML = `
            <div class="p-4 space-y-6">
                <div class="flex items-center justify-between">
                    ${PetTracker.UI.sectionHeader(5, 'Contacts')}
                    <button onclick="Contacts.showAddModal()" class="btn-primary px-4 py-2 font-mono text-xs uppercase">
                        <i data-lucide="plus" class="w-4 h-4 inline mr-2"></i>Add Contact
                    </button>
                </div>

                ${contacts.length === 0 ? `
                    ${PetTracker.UI.emptyState('users', 'No contacts yet', 'Add vets, groomers, sitters, and other contacts')}
                ` : `
                    <div class="space-y-6">
                        ${Contacts.ROLES.filter(role => byRole[role]?.length > 0).map(role => `
                            <div>
                                <h3 class="font-mono text-xs uppercase text-earth-metal mb-3 flex items-center gap-2">
                                    <i data-lucide="${Contacts.getRoleIcon(role)}" class="w-4 h-4"></i>
                                    ${role}s
                                    <span class="text-dull-purple">(${byRole[role].length})</span>
                                </h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    ${byRole[role].map(contact => Contacts.renderCard(contact, {
            showActions: true
        })).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;

        if (window.lucide) lucide.createIcons();
    },

    /**
     * Show add contact modal
     */
    showAddModal: async () => {
        const form = document.getElementById('contactForm');
        if (form) form.reset();

        document.getElementById('contactEditId').value = '';

        const header = document.getElementById('contactModalTitle');
        if (header) header.textContent = 'Add Contact';

        await Contacts.populatePetCheckboxes([]);

        PetTracker.UI.openModal('contactModal');
        if (window.lucide) lucide.createIcons();
    },

    /**
     * Show edit contact modal
     */
    showEditModal: async (id) => {
        const contact = await Contacts.get(id);
        if (!contact) return;

        document.getElementById('contactName').value = contact.name || '';
        document.getElementById('contactRole').value = contact.role || '';
        document.getElementById('contactPhone').value = contact.phone || '';
        document.getElementById('contactEmail').value = contact.email || '';
        document.getElementById('contactAddress').value = contact.address || '';
        document.getElementById('contactNotes').value = contact.notes || '';
        document.getElementById('contactEditId').value = id;

        const header = document.getElementById('contactModalTitle');
        if (header) header.textContent = 'Edit Contact';

        await Contacts.populatePetCheckboxes(contact.relatedPetIds || []);

        PetTracker.UI.openModal('contactModal');
        if (window.lucide) lucide.createIcons();
    },

    /**
     * Populate pet checkboxes in modal
     */
    populatePetCheckboxes: async (selectedIds) => {
        const container = document.getElementById('contactPetCheckboxes');
        if (!container) return;

        const pets = await PetTracker.DB.getAll(PetTracker.STORES.PETS);

        if (pets.length === 0) {
            container.innerHTML = '<p class="text-xs text-earth-metal">No pets added yet</p>';
            return;
        }

        container.innerHTML = pets.map(pet => `
            <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" 
                       value="${pet.id}" 
                       ${selectedIds.includes(pet.id) ? 'checked' : ''}
                       class="w-4 h-4 border-earth-metal">
                <span class="text-sm text-charcoal">${PetTracker.UI.escapeHtml(pet.name)}</span>
            </label>
        `).join('');
    },

    /**
     * Confirm delete contact
     */
    confirmDelete: (id) => {
        PetTracker.UI.confirm(
            'Delete this contact? This action cannot be undone.',
            async () => {
                try {
                    await Contacts.delete(id);
                    PetTracker.UI.toast('Contact deleted', 'success');
                    Contacts.renderList();
                } catch (e) {
                    PetTracker.UI.toast(`Error: ${e.message}`, 'error');
                }
            }
        );
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.Contacts = Contacts;
window.Contacts = Contacts;
