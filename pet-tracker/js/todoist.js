/**
 * Pet Tracker - Todoist Integration
 * Two-way sync for recurring event-type tasks
 */

const Todoist = {
    API_REST_BASE: 'https://api.todoist.com/rest/v2',
    API_SYNC_BASE: 'https://api.todoist.com/sync/v9',

    /**
     * Resolve Todoist token from settings.
     * Supports manual token and OAuth token.
     */
    getToken: () => {
        const settings = PetTracker.Settings.get();
        if (settings.todoistAuthMode === 'oauth') {
            return settings.todoistOAuthData?.access_token || settings.todoistToken || '';
        }
        return settings.todoistToken || settings.todoistOAuthData?.access_token || '';
    },

    /**
     * Check if Todoist is configured
     */
    isConfigured: () => {
        const settings = PetTracker.Settings.get();
        return !!(settings.todoistEnabled && settings.workerUrl && Todoist.getToken());
    },

    /**
     * Make API request to Todoist
     */
    request: async (method, endpoint, body = null, options = {}) => {
        const settings = PetTracker.Settings.get();
        const token = Todoist.getToken();

        if (!settings.workerUrl) {
            throw new Error('Worker URL not configured');
        }

        if (!token) {
            throw new Error('Todoist token not configured');
        }

        const { api = 'rest', query = {}, headers: extraHeaders = {} } = options || {};
        const base = api === 'sync' ? Todoist.API_SYNC_BASE : Todoist.API_REST_BASE;
        const target = new URL(`${base}${endpoint}`);
        Object.entries(query || {}).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
                target.searchParams.append(k, String(v));
            }
        });
        const proxyUrl = new URL(settings.workerUrl.trim().replace(/\/$/, ''));
        proxyUrl.searchParams.append('url', target.toString());

        const headers = {
            'Authorization': `Bearer ${token}`
        };
        if (settings.proxyToken) headers['X-Proxy-Token'] = settings.proxyToken;
        Object.assign(headers, extraHeaders || {});

        const fetchOptions = { method, headers };
        if (body !== null && body !== undefined) {
            headers['Content-Type'] = 'application/json';
            fetchOptions.body = JSON.stringify(body);
        }

        const res = await fetch(proxyUrl.toString(), fetchOptions);

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const message = err.message || err.error || `Todoist API error: ${res.status}`;
            const error = new Error(message);
            error.status = res.status;
            throw error;
        }

        // DELETE returns 204 No Content
        if (res.status === 204) {
            return null;
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            return null;
        }
        return res.json().catch(() => null);
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
        return Todoist.request('GET', '/tasks', null, {
            query: { project_id: projectId }
        });
    },

    /**
     * Get sections for a Todoist project
     */
    getSections: async (projectId) => {
        return Todoist.request('GET', '/sections', null, {
            query: { project_id: projectId }
        });
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

                if (eventType.todoistSection) {
                    taskOptions.section_id = eventType.todoistSection;
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
     * Fetch completed Todoist task IDs since a timestamp.
     */
    getCompletedTaskIdsSince: async (sinceIso) => {
        const payload = await Todoist.request(
            'GET',
            '/completed/get_all',
            null,
            {
                api: 'sync',
                query: { since: sinceIso }
            }
        );
        const items = payload?.items || payload?.completed_items || [];
        const ids = new Set();
        for (const item of items) {
            const id = item?.task_id || item?.id || item?.item_id;
            if (id !== undefined && id !== null && id !== '') {
                ids.add(String(id));
            }
        }
        return ids;
    },

    /**
     * Pull completed tasks from Todoist.
     * Uses completed history endpoint to avoid false positives from missing/deleted tasks.
     */
    pullCompletedTasks: async () => {
        if (!Todoist.isConfigured()) return;

        const settings = PetTracker.Settings.get();
        // Get all planned events with Todoist task IDs
        const plannedEvents = await PetTracker.DB.query(
            PetTracker.STORES.EVENTS,
            e => e.todoistTaskId && e.status === 'Planned'
        );
        if (plannedEvents.length === 0) return;

        const nowIso = new Date().toISOString();
        const oldestPlannedTs = plannedEvents.reduce((minTs, e) => {
            const ts = new Date(e.startDate || e.updatedAt || Date.now()).getTime();
            if (Number.isNaN(ts)) return minTs;
            return Math.min(minTs, ts);
        }, Date.now());
        const fallbackSince = new Date(Math.max(0, oldestPlannedTs - (90 * 24 * 60 * 60 * 1000))).toISOString();
        const sinceIso = settings.todoistLastCompletedSyncAt || fallbackSince;
        const completedTaskIds = await Todoist.getCompletedTaskIdsSince(sinceIso);

        for (const event of plannedEvents) {
            if (completedTaskIds.has(String(event.todoistTaskId))) {
                await Events.update(event.id, {
                    status: 'Completed',
                    updatedAt: new Date().toISOString()
                });
                console.log(`[Todoist] Marked ${event.title} as completed`);
            }
        }

        PetTracker.Settings.set({ todoistLastCompletedSyncAt: nowIso });
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
        const maxOccurrences = Number(eventType.endAfterOccurrences) || null;

        if (eventType.scheduleType === 'One-off') {
            // For one-off, return anchor date only if it's in the future
            return anchor > now ? eventType.anchorDate : null;
        }

        let nextDue = new Date(anchor);
        let occurrenceIndex = 1;

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
            occurrenceIndex += 1;
            if (maxOccurrences && occurrenceIndex > maxOccurrences) {
                return null;
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
