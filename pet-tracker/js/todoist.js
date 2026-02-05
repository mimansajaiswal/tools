/**
 * Pet Tracker - Todoist Integration
 * Two-way sync for care plan tasks
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
                // Calculate if task should be created
                const nextDue = eventType.nextDue ? new Date(eventType.nextDue) : null;
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
                const task = await Todoist.request('GET', `/tasks/${event.todoistTaskId}`).catch(() => null);

                if (!task) {
                    // Task was deleted or completed in Todoist
                    // Mark event as completed
                    await Events.update(event.id, {
                        status: 'Completed',
                        updatedAt: new Date().toISOString()
                    });

                    console.log(`[Todoist] Marked ${event.title} as completed`);
                }
            } catch (e) {
                // Task not found means it was completed
                if (e.message?.includes('404')) {
                    await Events.update(event.id, {
                        status: 'Completed',
                        updatedAt: new Date().toISOString()
                    });
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
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.Todoist = Todoist;
window.Todoist = Todoist;
