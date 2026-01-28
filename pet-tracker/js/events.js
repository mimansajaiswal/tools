/**
 * Pet Tracker - Events Module
 * Event logging, editing, and stamp tracking
 */

const Events = {
    /**
     * Create a new event
     */
    create: async (eventData) => {
        const event = {
            id: PetTracker.generateId(),
            title: eventData.title || 'Event',
            petIds: Array.isArray(eventData.petIds) ? eventData.petIds : [eventData.petIds].filter(Boolean),
            eventTypeId: eventData.eventTypeId || null,
            careItemId: eventData.careItemId || null,
            startDate: eventData.startDate,
            endDate: eventData.endDate || null,
            status: eventData.status || 'Completed',
            severityLevelId: eventData.severityLevelId || null,
            value: eventData.value !== undefined ? eventData.value : null,
            unit: eventData.unit || null,
            duration: eventData.duration || null,
            notes: eventData.notes || '',
            media: eventData.media || [],
            tags: eventData.tags || [],
            source: eventData.source || 'Manual',
            providerId: eventData.providerId || null,
            cost: eventData.cost || null,
            costCategory: eventData.costCategory || null,
            costCurrency: eventData.costCurrency || null,
            todoistTaskId: eventData.todoistTaskId || null,
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

        // Update sync UI
        if (PetTracker.Sync?.updatePendingCount) {
            PetTracker.Sync.updatePendingCount();
        }

        return event;
    },

    /**
     * Update an existing event
     */
    update: async (id, updates) => {
        const event = await PetTracker.DB.get(PetTracker.STORES.EVENTS, id);
        if (!event) throw new Error('Event not found');

        const updated = {
            ...event,
            ...updates,
            updatedAt: new Date().toISOString(),
            synced: false
        };

        await PetTracker.DB.put(PetTracker.STORES.EVENTS, updated);
        await PetTracker.SyncQueue.add({
            type: 'update',
            store: 'events',
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
     * Delete an event
     */
    delete: async (id) => {
        const event = await PetTracker.DB.get(PetTracker.STORES.EVENTS, id);
        if (!event) return;

        await PetTracker.SyncQueue.add({
            type: 'delete',
            store: 'events',
            recordId: id,
            data: { notionId: event.notionId }
        });

        await PetTracker.DB.delete(PetTracker.STORES.EVENTS, id);

        // Update sync UI
        if (PetTracker.Sync?.updatePendingCount) {
            PetTracker.Sync.updatePendingCount();
        }
    },

    /**
     * Get all events
     */
    getAll: async () => {
        return PetTracker.DB.getAll(PetTracker.STORES.EVENTS);
    },

    /**
     * Get event by ID
     */
    get: async (id) => {
        return PetTracker.DB.get(PetTracker.STORES.EVENTS, id);
    },

    /**
     * Get events for a pet
     */
    getForPet: async (petId) => {
        return PetTracker.DB.query(
            PetTracker.STORES.EVENTS,
            e => e.petIds?.includes(petId)
        );
    },

    /**
     * Get events for a date range
     * Note: endDate is treated as end-of-day to include same-day timed events
     */
    getForDateRange: async (startDate, endDate) => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const startTime = start.getTime();

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of day to include same-day events
        const endTime = end.getTime();

        return PetTracker.DB.query(
            PetTracker.STORES.EVENTS,
            e => {
                const eventDate = new Date(e.startDate).getTime();
                return eventDate >= startTime && eventDate <= endTime;
            }
        );
    },

    /**
     * Get recent events
     */
    getRecent: async (limit = 10) => {
        const all = await Events.getAll();
        all.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        return all.slice(0, limit);
    },

    /**
     * Stamp tracking - toggle event for a date
     * Returns true if created, false if removed
     */
    toggleStamp: async (petId, eventTypeId, date) => {
        const dateStr = date.slice(0, 10);

        // Find existing stamp for this pet/type/date
        const existing = await PetTracker.DB.query(
            PetTracker.STORES.EVENTS,
            e => e.petIds?.includes(petId) &&
                e.eventTypeId === eventTypeId &&
                e.startDate?.slice(0, 10) === dateStr
        );

        if (existing.length > 0) {
            // Remove existing stamp
            await Events.delete(existing[0].id);
            return false;
        } else {
            // Create new stamp
            const eventType = await PetTracker.DB.get(PetTracker.STORES.EVENT_TYPES, eventTypeId);
            await Events.create({
                title: eventType?.name || 'Event',
                petIds: [petId],
                eventTypeId,
                startDate: dateStr,
                status: 'Completed',
                source: 'Manual'
            });
            return true;
        }
    },

    /**
     * Get stamps for a pet/type in a date range
     */
    getStamps: async (petId, eventTypeId, startDate, endDate) => {
        const events = await Events.getForDateRange(startDate, endDate);
        return events.filter(e =>
            e.petIds?.includes(petId) && e.eventTypeId === eventTypeId
        );
    },

    /**
     * Show edit event modal
     */
    showEditModal: async (id) => {
        const event = await Events.get(id);
        if (!event) return;

        // Close any existing drawer
        Calendar.closeEventDetail?.();

        // Populate the add modal with event data
        const form = document.getElementById('addEventForm');
        if (form) form.dataset.editId = id;

        // Set pet
        const petSelect = document.getElementById('addEventPet');
        if (petSelect && event.petIds?.[0]) {
            petSelect.value = event.petIds[0];
        }

        // Set event type
        const typeSelect = document.getElementById('addEventType');
        if (typeSelect && event.eventTypeId) {
            typeSelect.value = event.eventTypeId;
        }

        // Set date/time
        if (event.startDate) {
            const dateInput = document.getElementById('addEventDate');
            const timeInput = document.getElementById('addEventTime');

            if (event.startDate.includes('T')) {
                dateInput.value = event.startDate.slice(0, 10);
                timeInput.value = event.startDate.slice(11, 16);
            } else {
                dateInput.value = event.startDate;
                timeInput.value = '';
            }
        }

        // Set value
        const valueInput = document.getElementById('addEventValue');
        if (valueInput) valueInput.value = event.value ?? '';

        // Set notes
        const notesInput = document.getElementById('addEventNotes');
        if (notesInput) notesInput.value = event.notes || '';

        // Update header
        const header = document.querySelector('#addEventModal .section-header');
        if (header) header.textContent = 'Edit Event';

        PetTracker.UI.openModal('addEventModal');
    },

    /**
     * Confirm delete event
     */
    confirmDelete: (id) => {
        PetTracker.UI.confirm(
            'Delete this event? Synced data in Notion will be archived.',
            async () => {
                try {
                    await Events.delete(id);
                    Calendar.closeEventDetail?.();
                    PetTracker.UI.toast('Event deleted', 'success');
                    Calendar.render?.();
                    App.renderDashboard?.();
                } catch (e) {
                    PetTracker.UI.toast(`Error: ${e.message}`, 'error');
                }
            }
        );
    },

    /**
     * Render stamp tracking card for a pet profile
     */
    renderStampCard: (pet, eventType, stamps = []) => {
        const today = new Date();
        const days = [];

        // Last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            days.push(date);
        }

        const stampDates = new Set(stamps.map(s => s.startDate?.slice(0, 10)));

        return `
            <div class="card p-4">
                <div class="flex items-center justify-between mb-3">
                    <span class="font-mono text-xs uppercase text-earth-metal">${PetTracker.UI.escapeHtml(eventType.name)}</span>
                    <i data-lucide="${eventType.defaultIcon || 'check-circle'}" class="w-4 h-4 text-earth-metal"></i>
                </div>
                <div class="flex gap-2">
                    ${days.map(date => {
            const dateStr = date.toISOString().slice(0, 10);
            const isStamped = stampDates.has(dateStr);
            const isToday = dateStr === today.toISOString().slice(0, 10);

            return `
                            <button class="stamp-day ${isStamped ? 'stamp-day-active' : ''} ${isToday ? 'stamp-day-today' : ''}"
                                    onclick="Events.handleStampClick('${pet.id}', '${eventType.id}', '${dateStr}')"
                                    data-long-press="Events.showStampNotes"
                                    data-stamp-date="${dateStr}"
                                    data-pet-id="${pet.id}"
                                    data-event-type-id="${eventType.id}"
                                    title="${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}">
                                ${date.getDate()}
                            </button>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Handle stamp click with debounce
     */
    _stampDebounce: {},
    handleStampClick: async (petId, eventTypeId, dateStr) => {
        const key = `${petId}-${eventTypeId}-${dateStr}`;

        // Debounce rapid clicks
        if (Events._stampDebounce[key]) {
            clearTimeout(Events._stampDebounce[key]);
        }

        Events._stampDebounce[key] = setTimeout(async () => {
            delete Events._stampDebounce[key];

            const created = await Events.toggleStamp(petId, eventTypeId, dateStr);
            PetTracker.UI.toast(created ? 'Stamped' : 'Removed', 'success', 1500);

            // Refresh the stamp card if visible
            if (typeof Pets !== 'undefined') {
                Pets.showDetail?.(petId);
            }
        }, 100);
    },

    /**
     * Show notes modal for stamp (long press)
     */
    showStampNotes: async (petId, eventTypeId, dateStr) => {
        // Find existing event for this stamp
        const existing = await PetTracker.DB.query(
            PetTracker.STORES.EVENTS,
            e => e.petIds?.includes(petId) &&
                e.eventTypeId === eventTypeId &&
                e.startDate?.slice(0, 10) === dateStr
        );

        if (existing.length > 0) {
            // Edit existing
            Events.showEditModal(existing[0].id);
        } else {
            // Create new with notes
            const eventType = await PetTracker.DB.get(PetTracker.STORES.EVENT_TYPES, eventTypeId);
            App.openAddModal({
                pet: petId,
                type: eventTypeId,
                date: dateStr
            });
        }
    },

    /**
     * Setup long press handlers for stamp buttons
     */
    setupLongPress: () => {
        let pressTimer = null;
        let isLongPress = false;

        document.addEventListener('pointerdown', (e) => {
            const btn = e.target.closest('[data-long-press]');
            if (!btn) return;

            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                const petId = btn.dataset.petId;
                const eventTypeId = btn.dataset.eventTypeId;
                const dateStr = btn.dataset.stampDate;
                Events.showStampNotes(petId, eventTypeId, dateStr);
            }, 500);
        });

        document.addEventListener('pointerup', (e) => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        });

        document.addEventListener('pointerleave', (e) => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        });
    }
};

// Setup long press on load
document.addEventListener('DOMContentLoaded', () => {
    Events.setupLongPress();
});

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.Events = Events;
window.Events = Events;
