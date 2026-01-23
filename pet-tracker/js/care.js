/**
 * Pet Tracker - Care Module
 * Care Items, Care Plans, Scales, and Upcoming view
 */

const Care = {
    /**
     * Create a care item
     */
    createItem: async (data) => {
        const item = {
            id: PetTracker.generateId(),
            name: data.name,
            type: data.type || 'Medication',
            defaultDose: data.defaultDose || '',
            defaultUnit: data.defaultUnit || null,
            defaultRoute: data.defaultRoute || null,
            linkedEventTypeId: data.linkedEventTypeId || null,
            relatedPetIds: data.relatedPetIds || [],
            activeStart: data.activeStart || null,
            activeEnd: data.activeEnd || null,
            notes: data.notes || '',
            files: data.files || [],
            active: data.active !== false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            synced: false
        };

        await PetTracker.DB.put(PetTracker.STORES.CARE_ITEMS, item);
        await PetTracker.SyncQueue.add({
            type: 'create',
            store: 'careItems',
            recordId: item.id,
            data: item
        });

        return item;
    },

    /**
     * Create a care plan
     */
    createPlan: async (data) => {
        const plan = {
            id: PetTracker.generateId(),
            name: data.name,
            petIds: data.petIds || [],
            careItemId: data.careItemId || null,
            eventTypeId: data.eventTypeId || null,
            scheduleType: data.scheduleType || 'Fixed',
            intervalValue: data.intervalValue || 1,
            intervalUnit: data.intervalUnit || 'Days',
            anchorDate: data.anchorDate || new Date().toISOString().slice(0, 10),
            dueTime: data.dueTime || null,
            timeOfDayPreference: data.timeOfDayPreference || 'Any',
            windowBefore: data.windowBefore || 0,
            windowAfter: data.windowAfter || 0,
            endDate: data.endDate || null,
            endAfterOccurrences: data.endAfterOccurrences || null,
            timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            nextDue: data.nextDue || null,
            upcomingCategory: data.upcomingCategory || 'Other',
            todoistSync: data.todoistSync || false,
            todoistProject: data.todoistProject || '',
            todoistLabels: data.todoistLabels || '',
            todoistLeadTime: data.todoistLeadTime || 1,
            notes: data.notes || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            synced: false
        };

        // Calculate next due
        plan.nextDue = Care.calculateNextDue(plan);

        await PetTracker.DB.put(PetTracker.STORES.CARE_PLANS, plan);
        await PetTracker.SyncQueue.add({
            type: 'create',
            store: 'carePlans',
            recordId: plan.id,
            data: plan
        });

        return plan;
    },

    /**
     * Calculate next due date for a care plan
     */
    calculateNextDue: (plan) => {
        const now = new Date();

        if (plan.scheduleType === 'One-off') {
            return plan.anchorDate;
        }

        if (plan.scheduleType === 'Rolling') {
            // For rolling, we need to find the last completed event
            // This is async, so for now return anchor date
            return plan.anchorDate;
        }

        // Fixed schedule
        const anchor = new Date(plan.anchorDate);
        let nextDue = new Date(anchor);

        while (nextDue <= now) {
            switch (plan.intervalUnit) {
                case 'Days':
                    nextDue.setDate(nextDue.getDate() + plan.intervalValue);
                    break;
                case 'Weeks':
                    nextDue.setDate(nextDue.getDate() + (plan.intervalValue * 7));
                    break;
                case 'Months':
                    nextDue.setMonth(nextDue.getMonth() + plan.intervalValue);
                    break;
                case 'Years':
                    nextDue.setFullYear(nextDue.getFullYear() + plan.intervalValue);
                    break;
            }
        }

        return nextDue.toISOString().slice(0, 10);
    },

    /**
     * Calculate next due for rolling schedule (needs last event)
     */
    calculateRollingNextDue: async (plan) => {
        if (plan.scheduleType !== 'Rolling') {
            return Care.calculateNextDue(plan);
        }

        // Find last completed event for this care plan
        const events = await PetTracker.DB.query(
            PetTracker.STORES.EVENTS,
            e => e.careItemId === plan.careItemId &&
                e.status === 'Completed' &&
                plan.petIds.some(id => e.petIds?.includes(id))
        );

        if (events.length === 0) {
            return plan.anchorDate;
        }

        // Sort by date descending
        events.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        const lastEvent = events[0];
        const lastDate = new Date(lastEvent.startDate);

        // Add interval
        switch (plan.intervalUnit) {
            case 'Days':
                lastDate.setDate(lastDate.getDate() + plan.intervalValue);
                break;
            case 'Weeks':
                lastDate.setDate(lastDate.getDate() + (plan.intervalValue * 7));
                break;
            case 'Months':
                lastDate.setMonth(lastDate.getMonth() + plan.intervalValue);
                break;
            case 'Years':
                lastDate.setFullYear(lastDate.getFullYear() + plan.intervalValue);
                break;
        }

        return lastDate.toISOString().slice(0, 10);
    },

    /**
     * Get upcoming items from care plans
     */
    getUpcoming: async (options = {}) => {
        const {
            horizon = 30, // days
            petIds = [],
            categories = []
        } = options;

        const plans = await PetTracker.DB.getAll(PetTracker.STORES.CARE_PLANS);
        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + horizon);

        const upcoming = [];

        for (const plan of plans) {
            // Filter by pet if specified
            if (petIds.length > 0 && !plan.petIds.some(id => petIds.includes(id))) {
                continue;
            }

            // Filter by category if specified
            if (categories.length > 0 && !categories.includes(plan.upcomingCategory)) {
                continue;
            }

            // Calculate next due
            let nextDue;
            if (plan.scheduleType === 'Rolling') {
                nextDue = await Care.calculateRollingNextDue(plan);
            } else {
                nextDue = Care.calculateNextDue(plan);
            }

            const dueDate = new Date(nextDue);

            // Check if within horizon
            if (dueDate <= endDate) {
                // Check if plan has ended
                if (plan.endDate && new Date(plan.endDate) < now) {
                    continue;
                }

                upcoming.push({
                    planId: plan.id,
                    planName: plan.name,
                    petIds: plan.petIds,
                    careItemId: plan.careItemId,
                    eventTypeId: plan.eventTypeId,
                    category: plan.upcomingCategory,
                    dueDate: nextDue,
                    dueTime: plan.dueTime,
                    windowBefore: plan.windowBefore,
                    windowAfter: plan.windowAfter,
                    isOverdue: dueDate < now
                });
            }
        }

        // Sort by due date
        upcoming.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        return upcoming;
    },

    /**
     * Render upcoming view
     */
    renderUpcoming: async () => {
        const container = document.querySelector('[data-view="upcoming"]');
        if (!container) return;

        const upcoming = await Care.getUpcoming({ horizon: 60 });

        // Group by category
        const byCategory = {};
        upcoming.forEach(item => {
            const cat = item.category || 'Other';
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(item);
        });

        const categories = ['Medication', 'Vaccine', 'Vet Visit', 'Habit', 'Other'];

        container.innerHTML = `
            <div class="p-4 space-y-6">
                <div class="flex items-center justify-between">
                    ${PetTracker.UI.sectionHeader(1, 'Upcoming')}
                    <div class="flex gap-2">
                        <select id="upcomingPetFilter" onchange="Care.renderUpcoming()" class="select-field text-xs py-1 px-2">
                            <option value="">All Pets</option>
                            ${App.state.pets.map(p => `
                                <option value="${p.id}">${PetTracker.UI.escapeHtml(p.name)}</option>
                            `).join('')}
                        </select>
                        <select id="upcomingHorizon" onchange="Care.renderUpcoming()" class="select-field text-xs py-1 px-2">
                            <option value="7">7 days</option>
                            <option value="14">14 days</option>
                            <option value="30" selected>30 days</option>
                            <option value="60">60 days</option>
                        </select>
                    </div>
                </div>

                <!-- Category filters -->
                <div class="flex flex-wrap gap-2">
                    ${categories.map(cat => `
                        <button onclick="Care.toggleCategoryFilter('${cat}')" 
                                class="badge ${byCategory[cat]?.length ? 'badge-accent' : 'badge-light'} cursor-pointer">
                            ${cat} (${byCategory[cat]?.length || 0})
                        </button>
                    `).join('')}
                </div>

                <!-- Upcoming list -->
                ${upcoming.length === 0 ? `
                    ${PetTracker.UI.emptyState('calendar-check', 'All caught up!', 'No upcoming items in this time range')}
                ` : `
                    <div class="space-y-3">
                        ${upcoming.map(item => {
            const pets = item.petIds.map(id => App.state.pets.find(p => p.id === id)).filter(Boolean);
            const dueDate = new Date(item.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const diffDays = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
            let dueLabel = '';
            if (diffDays < 0) {
                dueLabel = `${Math.abs(diffDays)} days overdue`;
            } else if (diffDays === 0) {
                dueLabel = 'Due today';
            } else if (diffDays === 1) {
                dueLabel = 'Due tomorrow';
            } else {
                dueLabel = `Due in ${diffDays} days`;
            }

            const categoryIcon = {
                'Medication': 'pill',
                'Vaccine': 'syringe',
                'Vet Visit': 'stethoscope',
                'Habit': 'repeat',
                'Other': 'calendar'
            }[item.category] || 'calendar';

            return `
                                <div class="card p-4 ${item.isOverdue ? 'border-muted-pink' : ''}">
                                    <div class="flex items-start gap-4">
                                        <div class="w-10 h-10 bg-oatmeal flex items-center justify-center flex-shrink-0">
                                            <i data-lucide="${categoryIcon}" class="w-5 h-5 text-earth-metal"></i>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <div class="flex items-center gap-2 mb-1">
                                                <h4 class="font-serif text-lg text-charcoal truncate">${PetTracker.UI.escapeHtml(item.planName)}</h4>
                                                <span class="badge badge-light text-[9px]">${item.category}</span>
                                            </div>
                                            <p class="meta-row text-xs">
                                                ${pets.map(p => `<span class="meta-value">${PetTracker.UI.escapeHtml(p.name)}</span>`).join('<span class="meta-separator">,</span> ')}
                                            </p>
                                            <p class="text-sm ${item.isOverdue ? 'text-muted-pink font-medium' : 'text-earth-metal'} mt-1">
                                                ${dueLabel}
                                                ${item.dueTime ? ` at ${item.dueTime}` : ''}
                                            </p>
                                        </div>
                                        <div class="flex flex-col gap-2">
                                            <button onclick="Care.markComplete('${item.planId}')" 
                                                    class="btn-primary px-3 py-1 font-mono text-xs uppercase">
                                                <i data-lucide="check" class="w-3 h-3 inline mr-1"></i>Done
                                            </button>
                                            <button onclick="Care.skipOnce('${item.planId}')" 
                                                    class="btn-secondary px-3 py-1 font-mono text-xs uppercase">
                                                Skip
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
        }).join('')}
                    </div>
                `}

                <!-- Add Care Plan button -->
                <div class="pt-4 border-t border-oatmeal">
                    <button onclick="Care.showAddPlanModal()" class="btn-secondary px-4 py-2 font-mono text-xs uppercase">
                        <i data-lucide="plus" class="w-4 h-4 inline mr-2"></i>Add Care Plan
                    </button>
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
    },

    /**
     * Mark a care plan item as complete
     */
    markComplete: async (planId) => {
        const plan = await PetTracker.DB.get(PetTracker.STORES.CARE_PLANS, planId);
        if (!plan) return;

        // Create completed event
        const careItem = plan.careItemId
            ? await PetTracker.DB.get(PetTracker.STORES.CARE_ITEMS, plan.careItemId)
            : null;

        await Events.create({
            title: careItem?.name || plan.name,
            petIds: plan.petIds,
            eventTypeId: plan.eventTypeId,
            careItemId: plan.careItemId,
            startDate: new Date().toISOString(),
            status: 'Completed',
            source: 'Scheduled'
        });

        // Update plan's next due
        const nextDue = await Care.calculateRollingNextDue(plan);
        await PetTracker.DB.put(PetTracker.STORES.CARE_PLANS, {
            ...plan,
            nextDue,
            updatedAt: new Date().toISOString()
        });

        PetTracker.UI.toast('Marked complete', 'success');
        Care.renderUpcoming();
    },

    /**
     * Skip once (advance to next occurrence)
     */
    skipOnce: async (planId) => {
        const plan = await PetTracker.DB.get(PetTracker.STORES.CARE_PLANS, planId);
        if (!plan) return;

        // Create a missed event
        await Events.create({
            title: plan.name,
            petIds: plan.petIds,
            eventTypeId: plan.eventTypeId,
            careItemId: plan.careItemId,
            startDate: plan.nextDue || new Date().toISOString().slice(0, 10),
            status: 'Missed',
            source: 'Scheduled'
        });

        // Advance next due by one interval
        const current = new Date(plan.nextDue || new Date());
        switch (plan.intervalUnit) {
            case 'Days':
                current.setDate(current.getDate() + plan.intervalValue);
                break;
            case 'Weeks':
                current.setDate(current.getDate() + (plan.intervalValue * 7));
                break;
            case 'Months':
                current.setMonth(current.getMonth() + plan.intervalValue);
                break;
            case 'Years':
                current.setFullYear(current.getFullYear() + plan.intervalValue);
                break;
        }

        await PetTracker.DB.put(PetTracker.STORES.CARE_PLANS, {
            ...plan,
            nextDue: current.toISOString().slice(0, 10),
            updatedAt: new Date().toISOString()
        });

        PetTracker.UI.toast('Skipped', 'info');
        Care.renderUpcoming();
    },

    /**
     * Show add care plan modal
     */
    showAddPlanModal: () => {
        // For now, show a simple prompt - full modal to be added later
        PetTracker.UI.toast('Care Plan modal coming soon', 'info');
    },

    /**
     * Create default event types (for first-run)
     */
    createDefaultEventTypes: async () => {
        const defaults = [
            { name: 'Medication Given', category: 'Medication', trackingMode: 'Stamp', defaultIcon: 'pill', defaultColor: 'blue' },
            { name: 'Symptom', category: 'Symptom', trackingMode: 'Stamp', usesSeverity: true, defaultIcon: 'alert-circle', defaultColor: 'red' },
            { name: 'Vet Visit', category: 'Vet Visit', trackingMode: 'Timed', allowAttachments: true, defaultIcon: 'stethoscope', defaultColor: 'purple' },
            { name: 'Walk', category: 'Activity', trackingMode: 'Timed', defaultValueKind: 'Duration', defaultIcon: 'footprints', defaultColor: 'green' },
            { name: 'Weight', category: 'Weight', trackingMode: 'Stamp', defaultValueKind: 'Weight', defaultIcon: 'scale', defaultColor: 'orange' },
            { name: 'Vaccine', category: 'Vaccine', trackingMode: 'Stamp', defaultIcon: 'syringe', defaultColor: 'teal' }
        ];

        for (const et of defaults) {
            const existing = await PetTracker.DB.query(
                PetTracker.STORES.EVENT_TYPES,
                e => e.name === et.name
            );

            if (existing.length === 0) {
                const eventType = {
                    id: PetTracker.generateId(),
                    ...et,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    synced: false
                };

                await PetTracker.DB.put(PetTracker.STORES.EVENT_TYPES, eventType);
            }
        }
    },

    /**
     * Create default scales (for first-run)
     */
    createDefaultScales: async () => {
        const scales = [
            {
                name: 'Symptom Severity',
                valueType: 'Labels',
                levels: [
                    { name: 'Mild', order: 1, color: 'yellow', numericValue: 1 },
                    { name: 'Moderate', order: 2, color: 'orange', numericValue: 2 },
                    { name: 'Severe', order: 3, color: 'red', numericValue: 3 }
                ]
            },
            {
                name: 'Activity Level',
                valueType: 'Labels',
                levels: [
                    { name: 'Low', order: 1, color: 'blue', numericValue: 1 },
                    { name: 'Medium', order: 2, color: 'green', numericValue: 2 },
                    { name: 'High', order: 3, color: 'purple', numericValue: 3 }
                ]
            }
        ];

        for (const scale of scales) {
            const existing = await PetTracker.DB.query(
                PetTracker.STORES.SCALES,
                s => s.name === scale.name
            );

            if (existing.length === 0) {
                const scaleRecord = {
                    id: PetTracker.generateId(),
                    name: scale.name,
                    valueType: scale.valueType,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    synced: false
                };

                await PetTracker.DB.put(PetTracker.STORES.SCALES, scaleRecord);

                // Create scale levels
                for (const level of scale.levels) {
                    const levelRecord = {
                        id: PetTracker.generateId(),
                        scaleId: scaleRecord.id,
                        ...level,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        synced: false
                    };

                    await PetTracker.DB.put(PetTracker.STORES.SCALE_LEVELS, levelRecord);
                }
            }
        }
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.Care = Care;
window.Care = Care;
