/**
 * Pet Tracker - Calendar Module
 * Month, Week, and Agenda views
 */

const Calendar = {
    state: {
        view: 'month', // month, week, agenda
        currentDate: new Date(),
        selectedDate: null,
        filters: {
            petIds: [],
            eventTypeIds: [],
            tags: []
        }
    },

    /**
     * Initialize calendar
     */
    init: () => {
        const uiState = PetTracker.Settings.getUIState();
        Calendar.state.view = uiState.calendarView || PetTracker.Settings.get().calendarView || 'month';
        
        // Restore calendar date if saved
        if (uiState.calendarDate) {
            Calendar.state.currentDate = new Date(uiState.calendarDate);
        } else {
            Calendar.state.currentDate = new Date();
        }
        
        // Restore calendar pet filter if saved
        if (uiState.calendarFilterPetId) {
            Calendar.state.filters.petIds = [uiState.calendarFilterPetId];
        }
    },

    /**
     * Render calendar view
     */
    render: async () => {
        const container = document.querySelector('[data-view="calendar"]');
        if (!container) return;

        const events = await Calendar.getFilteredEvents();

        container.innerHTML = `
            <div class="h-full flex flex-col">
                <!-- Calendar Header -->
                <div class="p-4 border-b border-oatmeal flex-shrink-0">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-3">
                            <button onclick="Calendar.prev()" class="p-2 text-earth-metal hover:text-dull-purple">
                                <i data-lucide="chevron-left" class="w-5 h-5"></i>
                            </button>
                            <h3 class="font-serif text-xl text-charcoal min-w-[180px] text-center">
                                ${Calendar.getHeaderTitle()}
                            </h3>
                            <button onclick="Calendar.next()" class="p-2 text-earth-metal hover:text-dull-purple">
                                <i data-lucide="chevron-right" class="w-5 h-5"></i>
                            </button>
                            <button onclick="Calendar.goToToday()" class="btn-secondary px-3 py-1 font-mono text-xs uppercase">
                                Today
                            </button>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="CalendarExport.showExportModal()" class="btn-secondary px-3 py-1 font-mono text-xs uppercase" title="Export Events">
                                <i data-lucide="download" class="w-4 h-4"></i>
                            </button>
                            <div class="flex border border-oatmeal">
                                <button onclick="Calendar.setView('month')" 
                                        class="px-3 py-1 font-mono text-xs uppercase ${Calendar.state.view === 'month' ? 'bg-charcoal text-white-linen' : 'text-earth-metal hover:bg-oatmeal/30'}">
                                    Month
                                </button>
                                <button onclick="Calendar.setView('week')" 
                                        class="px-3 py-1 font-mono text-xs uppercase border-l border-oatmeal ${Calendar.state.view === 'week' ? 'bg-charcoal text-white-linen' : 'text-earth-metal hover:bg-oatmeal/30'}">
                                    Week
                                </button>
                                <button onclick="Calendar.setView('agenda')" 
                                        class="px-3 py-1 font-mono text-xs uppercase border-l border-oatmeal ${Calendar.state.view === 'agenda' ? 'bg-charcoal text-white-linen' : 'text-earth-metal hover:bg-oatmeal/30'}">
                                    Agenda
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="flex items-center gap-3 flex-wrap">
                        <select id="calendarPetFilter" onchange="Calendar.updateFilters()" class="select-field text-xs py-1 px-2 min-w-[120px]">
                            <option value="">All Pets</option>
                            ${App.state.pets.map(p => `
                                <option value="${p.id}" ${Calendar.state.filters.petIds.includes(p.id) ? 'selected' : ''}>
                                    ${PetTracker.UI.escapeHtml(p.name)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <!-- Calendar Body -->
                <div class="flex-1 overflow-auto p-4">
                    ${Calendar.renderView(events)}
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
    },

    /**
     * Render current view
     */
    renderView: (events) => {
        switch (Calendar.state.view) {
            case 'month':
                return Calendar.renderMonthView(events);
            case 'week':
                return Calendar.renderWeekView(events);
            case 'agenda':
                return Calendar.renderAgendaView(events);
            default:
                return Calendar.renderMonthView(events);
        }
    },

    /**
     * Render month view
     */
    renderMonthView: (events) => {
        const { currentDate } = Calendar.state;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startOffset = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        const today = new Date();
        const todayStr = PetTracker.UI.localDateYYYYMMDD(today);

        // Group events by date
        const eventsByDate = {};
        events.forEach(event => {
            const dateStr = event.startDate?.slice(0, 10);
            if (dateStr) {
                if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
                eventsByDate[dateStr].push(event);
            }
        });

        // Build calendar grid
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeks = [];
        let currentWeek = [];

        // Previous month padding
        for (let i = 0; i < startOffset; i++) {
            currentWeek.push(null);
        }

        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
            currentWeek.push(day);
            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }

        // Next month padding
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push(null);
            }
            weeks.push(currentWeek);
        }

        return `
            <div class="calendar-month">
                <!-- Day headers -->
                <div class="grid grid-cols-7 gap-1 mb-2">
                    ${days.map(d => `
                        <div class="font-mono text-xs uppercase text-earth-metal text-center py-2">${d}</div>
                    `).join('')}
                </div>

                <!-- Weeks -->
                <div class="grid grid-cols-7 gap-1">
                    ${weeks.map(week => week.map(day => {
            if (day === null) {
                return `<div class="calendar-day calendar-day-empty"></div>`;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const dayEvents = eventsByDate[dateStr] || [];

            return `
                            <div class="calendar-day ${isToday ? 'calendar-day-today' : ''}" 
                                 onclick="Calendar.selectDate('${dateStr}')">
                                <div class="calendar-day-number ${isToday ? 'bg-dull-purple text-white-linen' : ''}">${day}</div>
                                <div class="calendar-day-events">
                                    ${dayEvents.slice(0, 3).map(event => {
                const pet = App.state.pets.find(p => p.id === event.petIds?.[0]);
                const color = pet?.color || '#8b7b8e';
                return `
                                            <div class="calendar-event" style="background-color: ${color}20; border-left: 3px solid ${color};">
                                                ${PetTracker.UI.escapeHtml(event.title || 'Event')}
                                            </div>
                                        `;
            }).join('')}
                                    ${dayEvents.length > 3 ? `
                                        <div class="text-xs text-earth-metal">+${dayEvents.length - 3} more</div>
                                    ` : ''}
                                </div>
                            </div>
                        `;
        }).join('')).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Render week view
     */
    renderWeekView: (events) => {
        const { currentDate } = Calendar.state;
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());

        const today = new Date();
        const todayStr = PetTracker.UI.localDateYYYYMMDD(today);

        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            days.push(date);
        }

        // Group events by date
        const eventsByDate = {};
        events.forEach(event => {
            const dateStr = event.startDate?.slice(0, 10);
            if (dateStr) {
                if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
                eventsByDate[dateStr].push(event);
            }
        });

        return `
            <div class="calendar-week">
                <div class="grid grid-cols-7 gap-2">
                    ${days.map(date => {
            const dateStr = PetTracker.UI.localDateYYYYMMDD(date);
            const isToday = dateStr === todayStr;
            const dayEvents = eventsByDate[dateStr] || [];

            return `
                            <div class="calendar-week-day ${isToday ? 'border-dull-purple' : 'border-oatmeal'} border p-3">
                                <div class="flex items-center justify-between mb-3">
                                    <span class="font-mono text-xs uppercase text-earth-metal">
                                        ${date.toLocaleDateString('en-US', { weekday: 'short' })}
                                    </span>
                                    <span class="font-serif text-lg ${isToday ? 'text-dull-purple' : 'text-charcoal'}">
                                        ${date.getDate()}
                                    </span>
                                </div>
                                <div class="space-y-2">
                                    ${dayEvents.length === 0 ? `
                                        <p class="text-xs text-earth-metal">No events</p>
                                    ` : dayEvents.map(event => {
                const pet = App.state.pets.find(p => p.id === event.petIds?.[0]);
                const color = pet?.color || '#8b7b8e';
                return `
                                            <div class="calendar-event-week p-2 cursor-pointer" 
                                                 style="border-left: 3px solid ${color};"
                                                 onclick="Calendar.showEventDetail('${event.id}')">
                                                <p class="text-xs text-charcoal font-medium truncate">
                                                    ${PetTracker.UI.escapeHtml(event.title || 'Event')}
                                                </p>
                                                ${event.startDate.includes('T') ? `
                                                    <p class="text-[10px] text-earth-metal mt-1">
                                                        ${PetTracker.UI.formatTime(event.startDate)}
                                                    </p>
                                                ` : ''}
                                            </div>
                                        `;
            }).join('')}
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Render agenda view
     */
    renderAgendaView: (events) => {
        // Sort events by date
        const sorted = [...events].sort((a, b) =>
            new Date(a.startDate) - new Date(b.startDate)
        );

        // Group by date
        const grouped = {};
        sorted.forEach(event => {
            const dateStr = event.startDate?.slice(0, 10);
            if (dateStr) {
                if (!grouped[dateStr]) grouped[dateStr] = [];
                grouped[dateStr].push(event);
            }
        });

        const dates = Object.keys(grouped).sort();
        const today = PetTracker.UI.localDateYYYYMMDD();

        if (dates.length === 0) {
            return PetTracker.UI.emptyState('calendar', 'No events', 'Events will appear here');
        }

        return `
            <div class="calendar-agenda space-y-4">
                ${dates.map(dateStr => {
            const isToday = dateStr === today;
            const date = new Date(dateStr + 'T00:00:00');

            return `
                        <div class="agenda-day">
                            <div class="flex items-center gap-3 mb-3">
                                <span class="font-serif text-xl ${isToday ? 'text-dull-purple' : 'text-charcoal'}">
                                    ${date.getDate()}
                                </span>
                                <div>
                                    <span class="font-mono text-xs uppercase text-earth-metal">
                                        ${date.toLocaleDateString('en-US', { weekday: 'long' })}
                                    </span>
                                    <span class="font-mono text-xs text-earth-metal ml-2">
                                        ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </span>
                                    ${isToday ? '<span class="badge badge-accent ml-2 text-[9px]">TODAY</span>' : ''}
                                </div>
                            </div>
                            <div class="space-y-2 ml-8">
                                ${grouped[dateStr].map(event => {
                const pet = App.state.pets.find(p => p.id === event.petIds?.[0]);
                const color = pet?.color || '#8b7b8e';

                return `
                                        <div class="card p-3 flex items-center gap-3 cursor-pointer hover:border-dull-purple"
                                             onclick="Calendar.showEventDetail('${event.id}')"
                                             style="border-left: 3px solid ${color};">
                                            <div class="flex-1 min-w-0">
                                                <p class="text-sm text-charcoal truncate font-medium">
                                                    ${PetTracker.UI.escapeHtml(event.title || 'Event')}
                                                </p>
                                                <p class="meta-row text-xs mt-1">
                                                    ${pet ? `<span class="meta-value">${PetTracker.UI.escapeHtml(pet.name)}</span>` : ''}
                                                    ${event.startDate.includes('T') ? `
                                                        <span class="meta-separator">//</span>
                                                        <span>${PetTracker.UI.formatTime(event.startDate)}</span>
                                                    ` : ''}
                                                </p>
                                            </div>
                                            <span class="badge ${event.status === 'Completed' ? 'badge-accent' : event.status === 'Missed' ? 'badge-pink' : 'badge-light'}">
                                                ${event.status}
                                            </span>
                                        </div>
                                    `;
            }).join('')}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    /**
     * Get header title based on view
     */
    getHeaderTitle: () => {
        const { currentDate, view } = Calendar.state;
        const options = { year: 'numeric', month: 'long' };

        if (view === 'week') {
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - currentDate.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            if (weekStart.getMonth() === weekEnd.getMonth()) {
                return `${weekStart.toLocaleDateString('en-US', { month: 'long' })} ${weekStart.getDate()}-${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
            } else {
                return `${weekStart.toLocaleDateString('en-US', { month: 'short' })} ${weekStart.getDate()} - ${weekEnd.toLocaleDateString('en-US', { month: 'short' })} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
            }
        }

        return currentDate.toLocaleDateString('en-US', options);
    },

    /**
     * Get filtered events
     */
    getFilteredEvents: async () => {
        let events = await PetTracker.DB.getAll(PetTracker.STORES.EVENTS);
        const { petIds, eventTypeIds, tags } = Calendar.state.filters;

        if (petIds.length > 0) {
            events = events.filter(e =>
                e.petIds?.some(id => petIds.includes(id))
            );
        }

        if (eventTypeIds.length > 0) {
            events = events.filter(e => eventTypeIds.includes(e.eventTypeId));
        }

        if (tags.length > 0) {
            events = events.filter(e =>
                e.tags?.some(t => tags.includes(t))
            );
        }

        return events;
    },

    /**
     * Navigate to previous period
     */
    prev: () => {
        const { currentDate, view } = Calendar.state;
        if (view === 'month') {
            currentDate.setMonth(currentDate.getMonth() - 1);
        } else if (view === 'week') {
            currentDate.setDate(currentDate.getDate() - 7);
        } else {
            currentDate.setMonth(currentDate.getMonth() - 1);
        }
        Calendar.saveState();
        Calendar.render();
    },

    /**
     * Navigate to next period
     */
    next: () => {
        const { currentDate, view } = Calendar.state;
        if (view === 'month') {
            currentDate.setMonth(currentDate.getMonth() + 1);
        } else if (view === 'week') {
            currentDate.setDate(currentDate.getDate() + 7);
        } else {
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        Calendar.saveState();
        Calendar.render();
    },

    /**
     * Go to today
     */
    goToToday: () => {
        Calendar.state.currentDate = new Date();
        Calendar.saveState();
        Calendar.render();
    },

    /**
     * Save calendar state to localStorage
     */
    saveState: () => {
        PetTracker.Settings.setUIState({
            calendarView: Calendar.state.view,
            calendarDate: Calendar.state.currentDate.toISOString()
        });
    },

    /**
     * Set view type
     */
    setView: (view) => {
        Calendar.state.view = view;
        PetTracker.Settings.set({ calendarView: view });
        // Save to UI state as well
        PetTracker.Settings.setUIState({ 
            calendarView: view,
            calendarDate: Calendar.state.currentDate.toISOString()
        });
        Calendar.render();
    },

    /**
     * Select a date
     */
    selectDate: (dateStr) => {
        Calendar.state.selectedDate = dateStr;
        // Open add modal for that date
        App.openAddModal({ date: dateStr });
    },

    /**
     * Update filters
     */
    updateFilters: () => {
        const petFilter = document.getElementById('calendarPetFilter');
        if (petFilter?.value) {
            Calendar.state.filters.petIds = [petFilter.value];
        } else {
            Calendar.state.filters.petIds = [];
        }
        // Save filter state
        PetTracker.Settings.setUIState({ calendarFilterPetId: petFilter?.value || null });
        Calendar.render();
    },

    /**
     * Show event detail (drawer)
     */
    showEventDetail: async (eventId) => {
        const event = await PetTracker.DB.get(PetTracker.STORES.EVENTS, eventId);
        if (!event) return;

        const pet = App.state.pets.find(p => p.id === event.petIds?.[0]);
        const eventType = App.state.eventTypes.find(t => t.id === event.eventTypeId);

        // Determine icon to show
        const defaultIcon = eventType?.defaultIcon || 'activity';
        let iconHtml;
        if (event.icon) {
            iconHtml = PetTracker.UI.renderIcon(event.icon, defaultIcon, 'w-6 h-6');
        } else if (eventType?.icon) {
            iconHtml = PetTracker.UI.renderIcon(eventType.icon, defaultIcon, 'w-6 h-6');
        } else {
            iconHtml = `<i data-lucide="${defaultIcon}" class="w-6 h-6 text-earth-metal"></i>`;
        }

        // Create a simple drawer/modal for event detail
        const drawer = document.createElement('div');
        drawer.id = 'eventDetailDrawer';
        drawer.className = 'fixed inset-0 z-50 flex items-end md:items-center justify-center';
        drawer.innerHTML = `
            <div class="absolute inset-0 modal-overlay" onclick="Calendar.closeEventDetail()"></div>
            <div class="relative bg-white-linen border border-oatmeal w-full md:max-w-md max-h-[80vh] overflow-y-auto z-10 animate-slide-up">
                <div class="sticky top-0 bg-white-linen border-b border-oatmeal p-4 flex items-center justify-between">
                    <span class="section-header">Event Detail</span>
                    <button onclick="Calendar.closeEventDetail()" class="p-1 text-earth-metal hover:text-charcoal">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="p-4 space-y-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-oatmeal flex items-center justify-center flex-shrink-0">
                            ${iconHtml}
                        </div>
                        <h3 class="font-serif text-xl text-charcoal">${PetTracker.UI.escapeHtml(event.title || 'Event')}</h3>
                    </div>
                    
                    <div class="meta-row text-sm">
                        ${pet ? `
                            <span class="meta-label">PET:</span>
                            <span class="meta-value">${PetTracker.UI.escapeHtml(pet.name)}</span>
                        ` : ''}
                        ${eventType ? `
                            <span class="meta-separator">//</span>
                            <span class="meta-label">TYPE:</span>
                            <span class="meta-value">${PetTracker.UI.escapeHtml(eventType.name)}</span>
                        ` : ''}
                    </div>

                    <div class="meta-row text-sm">
                        <span class="meta-label">DATE:</span>
                        <span class="meta-value">${PetTracker.UI.formatDate(event.startDate)}</span>
                        ${event.startDate.includes('T') ? `
                            <span class="meta-separator">//</span>
                            <span class="meta-label">TIME:</span>
                            <span class="meta-value">${PetTracker.UI.formatTime(event.startDate)}</span>
                        ` : ''}
                    </div>

                    <div class="flex items-center gap-2">
                        <span class="badge ${event.status === 'Completed' ? 'badge-accent' : event.status === 'Missed' ? 'badge-pink' : 'badge-light'}">
                            ${event.status}
                        </span>
                        ${event.source ? `<span class="badge badge-light">${event.source}</span>` : ''}
                    </div>

                    ${event.value !== null && event.value !== undefined ? `
                        <div class="meta-row text-sm">
                            <span class="meta-label">VALUE:</span>
                            <span class="meta-value">${event.value} ${event.unit || ''}</span>
                        </div>
                    ` : ''}

                    ${event.notes ? `
                        <div>
                            <span class="font-mono text-xs uppercase text-earth-metal">Notes</span>
                            <p class="text-sm text-charcoal mt-1">${PetTracker.UI.escapeHtml(event.notes)}</p>
                        </div>
                    ` : ''}

                    ${event.tags?.length > 0 ? `
                        <div class="flex flex-wrap gap-1">
                            ${event.tags.map(t => `<span class="badge badge-light">${t}</span>`).join('')}
                        </div>
                    ` : ''}

                    <!-- Add to Calendar -->
                    <div class="pt-4 border-t border-oatmeal">
                        <span class="font-mono text-xs uppercase text-earth-metal block mb-2">Add to Calendar</span>
                        <div class="flex gap-2 flex-wrap">
                            <button onclick="CalendarExport.exportSingleEvent('${event.id}')" class="btn-secondary px-3 py-1.5 font-mono text-xs uppercase">
                                <i data-lucide="download" class="w-3 h-3 inline mr-1"></i>ICS
                            </button>
                            <button onclick="CalendarExport.openGoogleCalendar('${event.id}')" class="btn-secondary px-3 py-1.5 font-mono text-xs uppercase">
                                <i data-lucide="calendar" class="w-3 h-3 inline mr-1"></i>Google
                            </button>
                        </div>
                    </div>

                    <div class="flex gap-3 pt-4 border-t border-oatmeal">
                        <button onclick="Events.showEditModal('${event.id}')" class="btn-secondary px-4 py-2 font-mono text-xs uppercase">
                            <i data-lucide="pencil" class="w-3 h-3 inline mr-1"></i>Edit
                        </button>
                        <button onclick="Events.confirmDelete('${event.id}')" class="btn-secondary px-4 py-2 font-mono text-xs uppercase text-muted-pink">
                            <i data-lucide="trash-2" class="w-3 h-3 inline mr-1"></i>Delete
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(drawer);
        if (window.lucide) lucide.createIcons();
    },

    /**
     * Close event detail drawer
     */
    closeEventDetail: () => {
        const drawer = document.getElementById('eventDetailDrawer');
        if (drawer) drawer.remove();
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.Calendar = Calendar;
window.Calendar = Calendar;
