/**
 * Pet Tracker - Calendar Export Module
 * ICS export & Google Calendar integration
 */

const CalendarExport = {
    /**
     * Generate ICS content for events
     * @param {Array} events - Array of event objects
     * @param {Object} options - Export options
     * @returns {string} ICS file content
     */
    generateICS: (events, options = {}) => {
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Pet Tracker//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:Pet Tracker Events'
        ];

        events.forEach(event => {
            const icsEvent = CalendarExport.eventToICS(event, options);
            if (icsEvent) {
                lines.push(...icsEvent);
            }
        });

        lines.push('END:VCALENDAR');
        return lines.join('\r\n');
    },

    /**
     * Convert single event to ICS VEVENT lines
     * @param {Object} event - Event object
     * @param {Object} options - Export options
     * @returns {Array} Array of ICS lines
     */
    eventToICS: (event, options = {}) => {
        if (!event.startDate) return null;

        const pet = App.state.pets.find(p => p.id === event.petIds?.[0]);
        const eventType = App.state.eventTypes.find(t => t.id === event.eventTypeId);

        const summary = pet
            ? `[${pet.name}] ${event.title || eventType?.name || 'Event'}`
            : event.title || eventType?.name || 'Event';

        const uid = `${event.id}@pettracker`;
        const now = CalendarExport.formatICSDate(new Date());

        // Parse start date
        const hasTime = event.startDate.includes('T');
        const startDate = new Date(event.startDate);

        // Build description
        const descParts = [];
        if (pet) descParts.push(`Pet: ${pet.name}`);
        if (eventType) descParts.push(`Type: ${eventType.name}`);
        if (event.status) descParts.push(`Status: ${event.status}`);
        if (event.value !== null && event.value !== undefined) {
            descParts.push(`Value: ${event.value}${event.unit ? ' ' + event.unit : ''}`);
        }
        if (event.notes) descParts.push(`Notes: ${event.notes}`);
        const description = descParts.join('\\n');

        // Categories
        const categories = [];
        if (eventType?.category) categories.push(eventType.category);
        if (event.tags) categories.push(...event.tags);

        const lines = [
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${now}`
        ];

        if (hasTime) {
            lines.push(`DTSTART:${CalendarExport.formatICSDate(startDate)}`);
            if (event.endDate) {
                lines.push(`DTEND:${CalendarExport.formatICSDate(new Date(event.endDate))}`);
            } else if (event.duration || event.durationMinutes) {
                // Use duration (in minutes) if available
                const durationMins = event.duration || event.durationMinutes;
                const endDate = new Date(startDate.getTime() + durationMins * 60000);
                lines.push(`DTEND:${CalendarExport.formatICSDate(endDate)}`);
            } else {
                // Default 1 hour duration
                const endDate = new Date(startDate.getTime() + 3600000);
                lines.push(`DTEND:${CalendarExport.formatICSDate(endDate)}`);
            }
        } else {
            // All-day event
            lines.push(`DTSTART;VALUE=DATE:${CalendarExport.formatICSDateOnly(startDate)}`);
            if (event.endDate) {
                const endDate = new Date(event.endDate);
                endDate.setDate(endDate.getDate() + 1); // ICS end date is exclusive
                lines.push(`DTEND;VALUE=DATE:${CalendarExport.formatICSDateOnly(endDate)}`);
            } else {
                const nextDay = new Date(startDate);
                nextDay.setDate(nextDay.getDate() + 1);
                lines.push(`DTEND;VALUE=DATE:${CalendarExport.formatICSDateOnly(nextDay)}`);
            }
        }

        lines.push(`SUMMARY:${CalendarExport.escapeICS(summary)}`);

        if (description) {
            lines.push(`DESCRIPTION:${CalendarExport.escapeICS(description)}`);
        }

        if (categories.length > 0) {
            lines.push(`CATEGORIES:${categories.map(c => CalendarExport.escapeICS(c)).join(',')}`);
        }

        lines.push('END:VEVENT');
        return lines;
    },

    /**
     * Format date for ICS (YYYYMMDDTHHMMSSZ)
     */
    formatICSDate: (date) => {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    },

    /**
     * Format date-only for ICS (YYYYMMDD)
     */
    formatICSDateOnly: (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    },

    /**
     * Escape special characters for ICS
     */
    escapeICS: (str) => {
        if (!str) return '';
        return str
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '');
    },

    /**
     * Download ICS file
     * @param {string} content - ICS content
     * @param {string} filename - Filename
     */
    downloadICS: (content, filename = 'pet-tracker-events.ics') => {
        const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Export single event
     */
    exportSingleEvent: async (eventId) => {
        const event = await PetTracker.DB.get(PetTracker.STORES.EVENTS, eventId);
        if (!event) {
            PetTracker.UI.toast('Event not found', 'error');
            return;
        }

        const pet = App.state.pets.find(p => p.id === event.petIds?.[0]);
        const ics = CalendarExport.generateICS([event]);
        const filename = `${pet?.name || 'pet'}-${event.title || 'event'}-${event.startDate?.slice(0, 10) || 'date'}.ics`;
        CalendarExport.downloadICS(ics, filename.replace(/[^a-zA-Z0-9-_.]/g, '-'));
        PetTracker.UI.toast('Event exported', 'success');
    },

    /**
     * Export events for date range
     * @param {string} startDate - ISO date string
     * @param {string} endDate - ISO date string
     * @param {Object} filters - Optional filters { petIds, eventTypeIds, categories }
     */
    exportDateRange: async (startDate, endDate, filters = {}) => {
        let events = await PetTracker.DB.getAll(PetTracker.STORES.EVENTS);

        // Filter by date range
        events = events.filter(e => {
            if (!e.startDate) return false;
            const eventDate = e.startDate.slice(0, 10);
            return eventDate >= startDate && eventDate <= endDate;
        });

        // Apply filters
        if (filters.petIds?.length > 0) {
            events = events.filter(e =>
                e.petIds?.some(id => filters.petIds.includes(id))
            );
        }

        if (filters.eventTypeIds?.length > 0) {
            events = events.filter(e =>
                filters.eventTypeIds.includes(e.eventTypeId)
            );
        }

        if (filters.categories?.length > 0) {
            events = events.filter(e => {
                const eventType = App.state.eventTypes.find(t => t.id === e.eventTypeId);
                return eventType && filters.categories.includes(eventType.category);
            });
        }

        if (events.length === 0) {
            PetTracker.UI.toast('No events found in range', 'info');
            return;
        }

        const ics = CalendarExport.generateICS(events);
        const filename = `pet-tracker-${startDate}-to-${endDate}.ics`;
        CalendarExport.downloadICS(ics, filename);
        PetTracker.UI.toast(`Exported ${events.length} events`, 'success');
    },

    /**
     * Export all events
     */
    exportAll: async (filters = {}) => {
        let events = await PetTracker.DB.getAll(PetTracker.STORES.EVENTS);

        if (filters.petIds?.length > 0) {
            events = events.filter(e =>
                e.petIds?.some(id => filters.petIds.includes(id))
            );
        }

        if (events.length === 0) {
            PetTracker.UI.toast('No events to export', 'info');
            return;
        }

        const ics = CalendarExport.generateICS(events);
        const today = new Date().toISOString().slice(0, 10);
        CalendarExport.downloadICS(ics, `pet-tracker-all-${today}.ics`);
        PetTracker.UI.toast(`Exported ${events.length} events`, 'success');
    },

    /**
     * Generate Google Calendar URL for single event
     * @param {Object} event - Event object
     * @returns {string} Google Calendar URL
     */
    generateGoogleCalendarURL: (event) => {
        if (!event.startDate) return null;

        const pet = App.state.pets.find(p => p.id === event.petIds?.[0]);
        const eventType = App.state.eventTypes.find(t => t.id === event.eventTypeId);

        const title = pet
            ? `[${pet.name}] ${event.title || eventType?.name || 'Event'}`
            : event.title || eventType?.name || 'Event';

        const hasTime = event.startDate.includes('T');
        const startDate = new Date(event.startDate);

        let endDate;
        if (event.endDate) {
            endDate = new Date(event.endDate);
        } else if (event.durationMinutes) {
            endDate = new Date(startDate.getTime() + event.durationMinutes * 60000);
        } else {
            endDate = new Date(startDate.getTime() + 3600000); // 1 hour default
        }

        // Build description
        const descParts = [];
        if (pet) descParts.push(`Pet: ${pet.name}`);
        if (eventType) descParts.push(`Type: ${eventType.name}`);
        if (event.status) descParts.push(`Status: ${event.status}`);
        if (event.value !== null && event.value !== undefined) {
            descParts.push(`Value: ${event.value}${event.unit ? ' ' + event.unit : ''}`);
        }
        if (event.notes) descParts.push(`Notes: ${event.notes}`);

        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: title,
            details: descParts.join('\n')
        });

        if (hasTime) {
            params.set('dates', `${CalendarExport.formatGoogleDate(startDate)}/${CalendarExport.formatGoogleDate(endDate)}`);
        } else {
            // All-day event
            const nextDay = new Date(startDate);
            nextDay.setDate(nextDay.getDate() + 1);
            params.set('dates', `${CalendarExport.formatGoogleDateOnly(startDate)}/${CalendarExport.formatGoogleDateOnly(nextDay)}`);
        }

        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    },

    /**
     * Format date for Google Calendar (YYYYMMDDTHHMMSSZ)
     */
    formatGoogleDate: (date) => {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    },

    /**
     * Format date-only for Google Calendar (YYYYMMDD)
     */
    formatGoogleDateOnly: (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    },

    /**
     * Open Google Calendar with event
     */
    openGoogleCalendar: async (eventId) => {
        const event = await PetTracker.DB.get(PetTracker.STORES.EVENTS, eventId);
        if (!event) {
            PetTracker.UI.toast('Event not found', 'error');
            return;
        }

        const url = CalendarExport.generateGoogleCalendarURL(event);
        if (url) {
            window.open(url, '_blank');
        } else {
            PetTracker.UI.toast('Could not generate calendar link', 'error');
        }
    },

    /**
     * Show export modal
     */
    showExportModal: () => {
        const today = new Date().toISOString().slice(0, 10);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        const modal = document.createElement('div');
        modal.id = 'calendarExportModal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="absolute inset-0 modal-overlay" onclick="CalendarExport.closeExportModal()"></div>
            <div class="relative bg-white-linen border border-oatmeal w-full max-w-md z-10">
                <div class="border-b border-oatmeal p-4 flex items-center justify-between">
                    <span class="section-header">Export Events</span>
                    <button onclick="CalendarExport.closeExportModal()" class="p-1 text-earth-metal hover:text-charcoal">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="p-4 space-y-4">
                    <div>
                        <label class="font-mono text-xs uppercase text-earth-metal block mb-1">Export Type</label>
                        <select id="exportType" class="select-field" onchange="CalendarExport.toggleDateRange()">
                            <option value="all">All Events</option>
                            <option value="range">Date Range</option>
                        </select>
                    </div>
                    
                    <div id="exportDateRangeFields" class="hidden grid grid-cols-2 gap-4">
                        <div>
                            <label class="font-mono text-xs uppercase text-earth-metal block mb-1">Start Date</label>
                            <input type="date" id="exportStartDate" class="input-field" value="${thirtyDaysAgo}">
                        </div>
                        <div>
                            <label class="font-mono text-xs uppercase text-earth-metal block mb-1">End Date</label>
                            <input type="date" id="exportEndDate" class="input-field" value="${today}">
                        </div>
                    </div>

                    <div>
                        <label class="font-mono text-xs uppercase text-earth-metal block mb-1">Filter by Pet</label>
                        <select id="exportPetFilter" class="select-field">
                            <option value="">All Pets</option>
                            ${App.state.pets.map(p => `
                                <option value="${p.id}">${PetTracker.UI.escapeHtml(p.name)}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="border-t border-oatmeal p-4 flex justify-end gap-3">
                    <button onclick="CalendarExport.closeExportModal()" class="btn-secondary px-4 py-2 font-mono text-xs uppercase">
                        Cancel
                    </button>
                    <button onclick="CalendarExport.executeExport()" class="btn-primary px-4 py-2 font-mono text-xs uppercase">
                        <i data-lucide="download" class="w-4 h-4 inline mr-1"></i>Export ICS
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();
    },

    /**
     * Toggle date range fields visibility
     */
    toggleDateRange: () => {
        const exportType = document.getElementById('exportType')?.value;
        const fields = document.getElementById('exportDateRangeFields');
        if (fields) {
            fields.classList.toggle('hidden', exportType !== 'range');
        }
    },

    /**
     * Execute export from modal
     */
    executeExport: async () => {
        const exportType = document.getElementById('exportType')?.value;
        const petFilter = document.getElementById('exportPetFilter')?.value;

        const filters = {};
        if (petFilter) {
            filters.petIds = [petFilter];
        }

        if (exportType === 'range') {
            const startDate = document.getElementById('exportStartDate')?.value;
            const endDate = document.getElementById('exportEndDate')?.value;

            if (!startDate || !endDate) {
                PetTracker.UI.toast('Please select date range', 'error');
                return;
            }

            await CalendarExport.exportDateRange(startDate, endDate, filters);
        } else {
            await CalendarExport.exportAll(filters);
        }

        CalendarExport.closeExportModal();
    },

    /**
     * Close export modal
     */
    closeExportModal: () => {
        const modal = document.getElementById('calendarExportModal');
        if (modal) modal.remove();
    }
};

/**
 * Google Calendar API Integration
 * Handles one-way push sync to Google Calendar
 */
const GoogleCalendar = {
    /**
     * Push a single event to Google Calendar
     * @param {Object} event - Pet Tracker event object
     * @returns {Promise<string|null>} Google Calendar event ID or null on failure
     */
    pushEvent: async (event) => {
        const settings = PetTracker.Settings.get();
        if (!settings.gcalEnabled || !settings.gcalAccessToken || !settings.gcalCalendarId) {
            return null;
        }

        const gcalEvent = GoogleCalendar.convertToGcalEvent(event);
        if (!gcalEvent) return null;

        try {
            const calendarId = encodeURIComponent(settings.gcalCalendarId);
            const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

            // Check if event already has a Google Calendar ID (update vs create)
            const method = event.googleCalendarEventId ? 'PUT' : 'POST';
            const apiUrl = event.googleCalendarEventId
                ? `${url}/${encodeURIComponent(event.googleCalendarEventId)}`
                : url;

            const proxyUrl = new URL(settings.workerUrl);
            proxyUrl.searchParams.append('url', apiUrl);
            const headers = {
                'Authorization': `Bearer ${settings.gcalAccessToken}`,
                'Content-Type': 'application/json'
            };
            if (settings.proxyToken) headers['X-Proxy-Token'] = settings.proxyToken;

            const response = await fetch(proxyUrl.toString(), {
                method,
                headers,
                body: JSON.stringify(gcalEvent)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error('[GoogleCalendar] Push failed:', errData);
                return null;
            }

            const data = await response.json();
            return data.id;
        } catch (e) {
            console.error('[GoogleCalendar] Push error:', e);
            return null;
        }
    },

    /**
     * Delete an event from Google Calendar
     * @param {string} googleEventId - Google Calendar event ID
     */
    deleteEvent: async (googleEventId) => {
        const settings = PetTracker.Settings.get();
        if (!settings.gcalEnabled || !settings.gcalAccessToken || !settings.gcalCalendarId || !googleEventId) {
            return false;
        }

        try {
            const calendarId = encodeURIComponent(settings.gcalCalendarId);
            const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(googleEventId)}`;

            const proxyUrl = new URL(settings.workerUrl);
            proxyUrl.searchParams.append('url', url);
            const headers = { 'Authorization': `Bearer ${settings.gcalAccessToken}` };
            if (settings.proxyToken) headers['X-Proxy-Token'] = settings.proxyToken;

            const response = await fetch(proxyUrl.toString(), {
                method: 'DELETE',
                headers
            });

            return response.ok || response.status === 404;
        } catch (e) {
            console.error('[GoogleCalendar] Delete error:', e);
            return false;
        }
    },

    /**
     * Convert Pet Tracker event to Google Calendar event format
     */
    convertToGcalEvent: (event) => {
        if (!event.startDate) return null;

        const pet = App.state.pets.find(p => p.id === event.petIds?.[0]);
        const eventType = App.state.eventTypes.find(t => t.id === event.eventTypeId);

        const summary = pet
            ? `[${pet.name}] ${event.title || eventType?.name || 'Event'}`
            : event.title || eventType?.name || 'Event';

        const descParts = [];
        if (pet) descParts.push(`Pet: ${pet.name}`);
        if (eventType) descParts.push(`Type: ${eventType.name}`);
        if (event.status) descParts.push(`Status: ${event.status}`);
        if (event.value !== null && event.value !== undefined) {
            descParts.push(`Value: ${event.value}${event.unit ? ' ' + event.unit : ''}`);
        }
        if (event.notes) descParts.push(`Notes: ${event.notes}`);

        const hasTime = event.startDate.includes('T');
        const gcalEvent = {
            summary,
            description: descParts.join('\n'),
            source: { title: 'Pet Tracker', url: window.location.origin }
        };

        if (hasTime) {
            gcalEvent.start = { dateTime: event.startDate };
            if (event.endDate) {
                gcalEvent.end = { dateTime: event.endDate };
            } else if (event.duration || event.durationMinutes) {
                // Use duration (in minutes) if available
                const durationMins = event.duration || event.durationMinutes;
                const endDate = new Date(new Date(event.startDate).getTime() + durationMins * 60000);
                gcalEvent.end = { dateTime: endDate.toISOString() };
            } else {
                const endDate = new Date(new Date(event.startDate).getTime() + 3600000);
                gcalEvent.end = { dateTime: endDate.toISOString() };
            }
        } else {
            const startDate = event.startDate.slice(0, 10);
            gcalEvent.start = { date: startDate };
            if (event.endDate) {
                const endDate = new Date(event.endDate);
                endDate.setDate(endDate.getDate() + 1);
                gcalEvent.end = { date: endDate.toISOString().slice(0, 10) };
            } else {
                const nextDay = new Date(event.startDate);
                nextDay.setDate(nextDay.getDate() + 1);
                gcalEvent.end = { date: nextDay.toISOString().slice(0, 10) };
            }
        }

        return gcalEvent;
    },

    /**
     * Sync event to Google Calendar and store the Google event ID
     */
    syncEvent: async (event) => {
        const googleEventId = await GoogleCalendar.pushEvent(event);
        if (googleEventId && googleEventId !== event.googleCalendarEventId) {
            event.googleCalendarEventId = googleEventId;
            await PetTracker.DB.put(PetTracker.STORES.EVENTS, event);
        }
        return googleEventId;
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.CalendarExport = CalendarExport;
window.PetTracker.GoogleCalendar = GoogleCalendar;
window.CalendarExport = CalendarExport;
window.GoogleCalendar = GoogleCalendar;
