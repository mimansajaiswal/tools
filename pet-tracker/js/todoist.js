/**
 * Pet Tracker - Todoist Integration
 * Two-way sync for recurring event-type tasks
 */

const Todoist = {
    API_BASE: 'https://api.todoist.com/rest/v2',

    /**
     * Check if Todoist is configured
     */
    isConfigured: () => {
        const settings = PetTracker.Settings.get();
        return !!(settings.todoistEnabled && settings.todoistToken);
    },

    /**
     * Make API request to Todoist
     */
    request: async (method, endpoint, body = null) => {
        const settings = PetTracker.Settings.get();

        if (!settings.todoistToken) {
            throw new Error('Todoist token not configured');
        }

        const headers = {
            'Authorization': `Bearer ${settings.todoistToken}`,
            'Content-Type': 'application/json'
        };

        const options = { method, headers };
        if (body) {
            options.body = JSON.stringify(body);
        }

        const res = await fetch(`${Todoist.API_BASE}${endpoint}`, options);

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `Todoist API error: ${res.status}`);
        }

        // DELETE returns 204 No Content
        if (res.status === 204) {
            return null;
        }

        return res.json();
    },

    /**
     * Get all projects
     */
    getProjects: async () => {
        return Todoist.request('GET', '/projects');
    },

    /**
     * Get tasks from a project
     */
    getTasks: async (projectId) => {
        return Todoist.request('GET', `/tasks?project_id=${projectId}`);
    },

    /**
     * Create a task
     */
    createTask: async (content, options = {}) => {
        return Todoist.request('POST', '/tasks', {
            content,
            ...options
        });
    },

    /**
     * Complete a task
     */
    completeTask: async (taskId) => {
        return Todoist.request('POST', `/tasks/${taskId}/close`);
    },

    /**
     * Reopen a task
     */
    reopenTask: async (taskId) => {
        return Todoist.request('POST', `/tasks/${taskId}/reopen`);
    },

    /**
     * Delete a task
     */
    deleteTask: async (taskId) => {
        return Todoist.request('DELETE', `/tasks/${taskId}`);
    },

    /**
     * Sync recurring event types to Todoist
     * Uses event types with isRecurring=true and todoistSync=true
     */
    syncRecurringEventTypes: async () => {
        if (!Todoist.isConfigured()) {
            console.log('[Todoist] Not configured, skipping sync');
            return;
        }

        const eventTypes = await PetTracker.DB.getAll(PetTracker.STORES.EVENT_TYPES);
        const pets = await PetTracker.DB.getAll(PetTracker.STORES.PETS);
        const now = new Date();

        // Filter to recurring event types with Todoist sync enabled
        const recurringTypes = eventTypes.filter(et => et.isRecurring && et.todoistSync);

        for (const eventType of recurringTypes) {
            try {
                // Calculate nextDue if not set (reuse Setup.calculateNextDue logic)
                let nextDue = eventType.nextDue ? new Date(eventType.nextDue) : null;

                // If nextDue is missing or stale, recalculate it
                if (!nextDue || nextDue < now) {
                    const calculatedDue = eventType.scheduleType === 'Rolling' && typeof Care !== 'undefined'
                        ? await Care.computeNextDueForEventType(eventType)
                        : Todoist.calculateNextDue(eventType);
                    if (calculatedDue) {
                        nextDue = new Date(calculatedDue);
                        // Update the event type with the new nextDue
                        eventType.nextDue = calculatedDue;
                        eventType.updatedAt = new Date().toISOString();
                        eventType.synced = false;
                        await PetTracker.DB.put(PetTracker.STORES.EVENT_TYPES, eventType);
                    }
                }

                if (!nextDue) continue;

                const leadDays = eventType.todoistLeadTime || 1;
                const createDate = new Date(nextDue);
                createDate.setDate(createDate.getDate() - leadDays);

                if (now < createDate) {
                    // Not yet time to create task
                    continue;
                }

                // Check if task already exists for this event type
                const events = await PetTracker.DB.query(
                    PetTracker.STORES.EVENTS,
                    e => e.todoistTaskId &&
                        e.eventTypeId === eventType.id &&
                        e.status === 'Planned'
                );

                if (events.length > 0) {
                    // Task already created
                    continue;
                }

                // Build task content - use related pets if configured
                const petNames = (eventType.relatedPetIds || [])
                    .map(id => pets.find(p => p.id === id)?.name)
                    .filter(Boolean);
                const petPrefix = petNames.length > 0 ? `[${petNames.join(', ')}] ` : '';
                const content = `${petPrefix}${eventType.name}`;

                // Create task
                const taskOptions = {
                    due_date: eventType.nextDue
                };

                if (eventType.todoistProject) {
                    taskOptions.project_id = eventType.todoistProject;
                }

                if (eventType.todoistLabels) {
                    taskOptions.labels = eventType.todoistLabels.split(',').map(l => l.trim());
                }

                const task = await Todoist.createTask(content, taskOptions);

                // Create planned event with Todoist task ID
                await Events.create({
                    title: eventType.name,
                    petIds: eventType.relatedPetIds || [],
                    eventTypeId: eventType.id,
                    startDate: eventType.nextDue,
                    status: 'Planned',
                    source: 'Scheduled',
                    todoistTaskId: task.id
                });

                console.log(`[Todoist] Created task for ${eventType.name}`);

            } catch (e) {
                console.error(`[Todoist] Error syncing event type ${eventType.name}:`, e);
            }
        }
    },

    /**
     * Pull completed tasks from Todoist
     */
    pullCompletedTasks: async () => {
        if (!Todoist.isConfigured()) return;

        // Get all planned events with Todoist task IDs
        const plannedEvents = await PetTracker.DB.query(
            PetTracker.STORES.EVENTS,
            e => e.todoistTaskId && e.status === 'Planned'
        );

        for (const event of plannedEvents) {
            try {
                // Check task status in Todoist
                const task = await Todoist.request('GET', `/tasks/${event.todoistTaskId}`);

                // Task exists and is not completed - nothing to do
                if (task && !task.is_completed) {
                    continue;
                }

                // Task is explicitly marked as completed
                if (task && task.is_completed) {
                    await Events.update(event.id, {
                        status: 'Completed',
                        updatedAt: new Date().toISOString()
                    });
                    console.log(`[Todoist] Marked ${event.title} as completed (task completed)`);
                }
            } catch (e) {
                // Only treat 404 as "task gone/completed"
                // Retry or skip on network/5xx errors
                if (e.message?.includes('404') || e.status === 404) {
                    await Events.update(event.id, {
                        status: 'Completed',
                        updatedAt: new Date().toISOString()
                    });
                    console.log(`[Todoist] Marked ${event.title} as completed (task deleted)`);
                } else {
                    // Network error or 5xx - skip this task, don't mark as completed
                    console.warn(`[Todoist] Skipping ${event.title} due to API error:`, e.message);
                }
            }
        }
    },

    /**
     * Run full two-way sync
     */
    sync: async () => {
        if (!Todoist.isConfigured()) {
            console.log('[Todoist] Not configured');
            return;
        }

        console.log('[Todoist] Starting sync...');

        try {
            // Push: Create tasks for upcoming recurring event types
            await Todoist.syncRecurringEventTypes();

            // Pull: Check for completed tasks
            await Todoist.pullCompletedTasks();

            console.log('[Todoist] Sync complete');
            PetTracker.UI.toast('Todoist synced', 'success', 2000);
        } catch (e) {
            console.error('[Todoist] Sync error:', e);
            PetTracker.UI.toast(`Todoist sync failed: ${e.message}`, 'error');
        }
    },

    /**
     * Test connection
     */
    testConnection: async () => {
        if (!Todoist.isConfigured()) {
            throw new Error('Todoist not configured');
        }

        const projects = await Todoist.getProjects();
        return {
            success: true,
            projectCount: projects.length
        };
    },

    /**
     * Calculate next due date for a recurring event type
     * This mirrors Setup.calculateNextDue but is available in Todoist context
     */
    calculateNextDue: (eventType) => {
        if (!eventType.isRecurring || !eventType.anchorDate) return null;

        const now = new Date();
        const anchor = new Date(eventType.anchorDate);
        const interval = eventType.intervalValue || 1;
        const unit = eventType.intervalUnit || 'Months';

        if (eventType.scheduleType === 'One-off') {
            // For one-off, return anchor date only if it's in the future
            return anchor > now ? eventType.anchorDate : null;
        }

        let nextDue = new Date(anchor);

        // Find the next occurrence that is in the future
        while (nextDue <= now) {
            switch (unit) {
                case 'Days':
                    nextDue.setDate(nextDue.getDate() + interval);
                    break;
                case 'Weeks':
                    nextDue.setDate(nextDue.getDate() + (interval * 7));
                    break;
                case 'Months':
                    nextDue.setMonth(nextDue.getMonth() + interval);
                    break;
                case 'Years':
                    nextDue.setFullYear(nextDue.getFullYear() + interval);
                    break;
            }
        }

        // Check if past end date
        if (eventType.endDate && nextDue > new Date(eventType.endDate)) {
            return null;
        }

        // FIX #10: Use local date to avoid UTC timezone shift
        return PetTracker.UI.localDateYYYYMMDD(nextDue);
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.Todoist = Todoist;
window.Todoist = Todoist;
