/**
 * Pet Tracker - Analytics Module
 * Correlation views, trends, and dashboards
 */

const Analytics = {
    state: {
        selectedPetId: null,
        correlationWindow: '24h', // 6h, 12h, 24h, 48h, 7d, custom
        customWindowHours: 24,
        primaryEventType: null,
        secondaryEventType: null
    },

    TIME_WINDOWS: {
        '6h': 6,
        '12h': 12,
        '24h': 24,
        '48h': 48,
        '7d': 168
    },

    /**
     * Render the analytics view
     */
    render: async () => {
        const container = document.querySelector('[data-view="analytics"]');
        if (!container) return;

        const pets = App.state.pets;
        const events = await PetTracker.DB.getAll(PetTracker.STORES.EVENTS);
        const eventTypes = App.state.eventTypes;

        container.innerHTML = `
            <div class="p-4 space-y-6">
                <!-- Filters -->
                <div class="flex flex-wrap items-center gap-4">
                    <div>
                        <label class="font-mono text-xs uppercase text-earth-metal block mb-1">Pet</label>
                        <select id="analyticsPetFilter" class="select-field text-sm" onchange="Analytics.updateFilters()">
                            <option value="">All Pets</option>
                            ${pets.map(p => `
                                <option value="${p.id}" ${p.id === Analytics.state.selectedPetId ? 'selected' : ''}>
                                    ${PetTracker.UI.escapeHtml(p.name)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <!-- Weight Trends -->
                <div class="card p-4">
                    ${PetTracker.UI.sectionHeader(1, 'Weight Trends')}
                    <div id="weightTrendContainer" class="mt-4">
                        <canvas id="weightChart" height="200"></canvas>
                    </div>
                    <div id="weightStats" class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4"></div>
                </div>

                <!-- Correlation View -->
                <div class="card p-4">
                    ${PetTracker.UI.sectionHeader(2, 'Event Correlation')}
                    <div class="mt-4 space-y-4">
                        <div class="flex flex-wrap items-end gap-4">
                            <div>
                                <label class="font-mono text-xs uppercase text-earth-metal block mb-1">Primary Event</label>
                                <select id="correlationPrimary" class="select-field text-sm" onchange="Analytics.updateCorrelation()">
                                    <option value="">Select event type...</option>
                                    ${eventTypes.map(t => `
                                        <option value="${t.id}" ${t.id === Analytics.state.primaryEventType ? 'selected' : ''}>
                                            ${PetTracker.UI.escapeHtml(t.name)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="font-mono text-xs uppercase text-earth-metal block mb-1">Secondary Event</label>
                                <select id="correlationSecondary" class="select-field text-sm" onchange="Analytics.updateCorrelation()">
                                    <option value="">Select event type...</option>
                                    ${eventTypes.map(t => `
                                        <option value="${t.id}" ${t.id === Analytics.state.secondaryEventType ? 'selected' : ''}>
                                            ${PetTracker.UI.escapeHtml(t.name)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="font-mono text-xs uppercase text-earth-metal block mb-1">Time Window</label>
                                <select id="correlationWindow" class="select-field text-sm" onchange="Analytics.updateCorrelation()">
                                    <option value="6h" ${Analytics.state.correlationWindow === '6h' ? 'selected' : ''}>6 hours</option>
                                    <option value="12h" ${Analytics.state.correlationWindow === '12h' ? 'selected' : ''}>12 hours</option>
                                    <option value="24h" ${Analytics.state.correlationWindow === '24h' ? 'selected' : ''}>24 hours</option>
                                    <option value="48h" ${Analytics.state.correlationWindow === '48h' ? 'selected' : ''}>48 hours</option>
                                    <option value="7d" ${Analytics.state.correlationWindow === '7d' ? 'selected' : ''}>7 days</option>
                                </select>
                            </div>
                        </div>
                        <div id="correlationResults" class="border border-oatmeal p-4 bg-oatmeal/10">
                            <p class="text-earth-metal text-sm">Select two event types to see correlations</p>
                        </div>
                    </div>
                </div>

                <!-- Adherence -->
                <div class="card p-4">
                    ${PetTracker.UI.sectionHeader(3, 'Care Adherence')}
                    <div id="adherenceStats" class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4"></div>
                </div>


            </div>
        `;

        if (window.lucide) lucide.createIcons();

        // Render charts after DOM is ready
        await Analytics.renderWeightChart(events);
        await Analytics.renderAdherenceStats();
    },

    /**
     * Update filters and re-render
     */
    updateFilters: () => {
        Analytics.state.selectedPetId = document.getElementById('analyticsPetFilter')?.value || null;
        Analytics.render();
    },

    /**
     * Render weight trend chart
     */
    renderWeightChart: async (allEvents) => {
        const canvas = document.getElementById('weightChart');
        const statsContainer = document.getElementById('weightStats');
        if (!canvas || !statsContainer) return;

        // Get weight event type
        const weightType = App.state.eventTypes.find(t =>
            t.name.toLowerCase().includes('weight') || t.category === 'Weight'
        );

        if (!weightType) {
            statsContainer.innerHTML = '<p class="text-earth-metal text-sm col-span-full">No weight event type configured</p>';
            return;
        }

        // Filter weight events
        let weightEvents = allEvents.filter(e => e.eventTypeId === weightType.id && e.value !== null);

        // Apply pet filter
        if (Analytics.state.selectedPetId) {
            weightEvents = weightEvents.filter(e => e.petIds?.includes(Analytics.state.selectedPetId));
        }

        // Sort by date
        weightEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        if (weightEvents.length === 0) {
            statsContainer.innerHTML = '<p class="text-earth-metal text-sm col-span-full">No weight data recorded</p>';
            return;
        }

        // Calculate stats
        const weights = weightEvents.map(e => e.value);
        const latest = weights[weights.length - 1];
        const oldest = weights[0];
        const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
        const change = latest - oldest;
        const changePercent = ((change / oldest) * 100).toFixed(1);

        // Get target from pet
        let targetMin = null, targetMax = null, unit = 'lb';
        if (Analytics.state.selectedPetId) {
            const pet = App.state.pets.find(p => p.id === Analytics.state.selectedPetId);
            if (pet) {
                targetMin = pet.targetWeightMin;
                targetMax = pet.targetWeightMax;
                unit = pet.weightUnit || 'lb';
            }
        }

        // Render stats
        statsContainer.innerHTML = `
            <div class="text-center">
                <span class="font-mono text-xs uppercase text-earth-metal">Current</span>
                <p class="font-serif text-2xl text-charcoal">${latest.toFixed(1)} <span class="text-sm">${unit}</span></p>
            </div>
            <div class="text-center">
                <span class="font-mono text-xs uppercase text-earth-metal">Average</span>
                <p class="font-serif text-2xl text-charcoal">${avg.toFixed(1)} <span class="text-sm">${unit}</span></p>
            </div>
            <div class="text-center">
                <span class="font-mono text-xs uppercase text-earth-metal">Change</span>
                <p class="font-serif text-2xl ${change > 0 ? 'text-muted-pink' : change < 0 ? 'text-dull-purple' : 'text-charcoal'}">
                    ${change > 0 ? '+' : ''}${change.toFixed(1)} <span class="text-sm">(${changePercent}%)</span>
                </p>
            </div>
            <div class="text-center">
                <span class="font-mono text-xs uppercase text-earth-metal">Entries</span>
                <p class="font-serif text-2xl text-charcoal">${weightEvents.length}</p>
            </div>
        `;

        // Render chart
        const ctx = canvas.getContext('2d');
        const labels = weightEvents.map(e => PetTracker.UI.formatDate(e.startDate));
        const data = weightEvents.map(e => e.value);

        // Calculate 7-day moving average
        const movingAvg = data.map((_, i) => {
            const start = Math.max(0, i - 6);
            const slice = data.slice(start, i + 1);
            return slice.reduce((a, b) => a + b, 0) / slice.length;
        });

        // Destroy existing chart if any
        if (window.weightChartInstance) {
            window.weightChartInstance.destroy();
        }

        window.weightChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Weight',
                        data,
                        borderColor: '#8b7b8e',
                        backgroundColor: 'rgba(139, 123, 142, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 3,
                        pointBackgroundColor: '#8b7b8e'
                    },
                    {
                        label: '7-Day Avg',
                        data: movingAvg,
                        borderColor: '#c9a9a6',
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.3,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: { family: '"JetBrains Mono"', size: 10 },
                            color: '#6b6357'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            font: { family: '"JetBrains Mono"', size: 10 },
                            color: '#6b6357',
                            maxRotation: 45
                        },
                        grid: { color: 'rgba(212, 200, 184, 0.5)' }
                    },
                    y: {
                        ticks: {
                            font: { family: '"JetBrains Mono"', size: 10 },
                            color: '#6b6357'
                        },
                        grid: { color: 'rgba(212, 200, 184, 0.5)' }
                    }
                }
            }
        });
    },

    /**
     * Update correlation analysis
     */
    updateCorrelation: async () => {
        const primaryId = document.getElementById('correlationPrimary')?.value;
        const secondaryId = document.getElementById('correlationSecondary')?.value;
        const windowKey = document.getElementById('correlationWindow')?.value || '24h';

        Analytics.state.primaryEventType = primaryId;
        Analytics.state.secondaryEventType = secondaryId;
        Analytics.state.correlationWindow = windowKey;

        const resultsContainer = document.getElementById('correlationResults');
        if (!resultsContainer) return;

        if (!primaryId || !secondaryId) {
            resultsContainer.innerHTML = '<p class="text-earth-metal text-sm">Select two event types to see correlations</p>';
            return;
        }

        const windowHours = Analytics.TIME_WINDOWS[windowKey] || 24;
        const events = await PetTracker.DB.getAll(PetTracker.STORES.EVENTS);

        // Filter by pet if selected
        let filteredEvents = events;
        if (Analytics.state.selectedPetId) {
            filteredEvents = events.filter(e => e.petIds?.includes(Analytics.state.selectedPetId));
        }

        // Get primary and secondary events
        const primaryEvents = filteredEvents.filter(e => e.eventTypeId === primaryId).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        const secondaryEvents = filteredEvents.filter(e => e.eventTypeId === secondaryId);

        const primaryType = App.state.eventTypes.find(t => t.id === primaryId);
        const secondaryType = App.state.eventTypes.find(t => t.id === secondaryId);

        // Find correlations
        let correlations = 0;
        let totalPrimary = primaryEvents.length;
        const windowMs = windowHours * 60 * 60 * 1000;

        primaryEvents.forEach(primary => {
            const primaryTime = new Date(primary.startDate).getTime();
            const hasCorrelation = secondaryEvents.some(secondary => {
                const secondaryTime = new Date(secondary.startDate).getTime();
                return secondaryTime > primaryTime && secondaryTime <= primaryTime + windowMs;
            });
            if (hasCorrelation) correlations++;
        });

        const correlationRate = totalPrimary > 0 ? ((correlations / totalPrimary) * 100).toFixed(1) : 0;

        resultsContainer.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <span class="font-mono text-xs uppercase text-earth-metal">Correlation Rate</span>
                    <span class="font-serif text-xl text-charcoal">${correlationRate}%</span>
                </div>
                <p class="text-sm text-earth-metal">
                    <strong>${correlations}</strong> out of <strong>${totalPrimary}</strong> 
                    "${primaryType?.name || 'primary'}" events were followed by 
                    "${secondaryType?.name || 'secondary'}" within <strong>${windowHours} hours</strong>.
                </p>
                ${correlationRate > 50 ? `
                    <div class="bg-muted-pink/20 border border-muted-pink p-2">
                        <p class="text-xs text-charcoal">
                            <i data-lucide="alert-triangle" class="w-3 h-3 inline mr-1"></i>
                            High correlation detected - these events appear to be related.
                        </p>
                    </div>
                ` : ''}
            </div>
        `;

        if (window.lucide) lucide.createIcons();
    },

    /**
     * Render adherence statistics based on recurring event types
     */
    renderAdherenceStats: async () => {
        const container = document.getElementById('adherenceStats');
        if (!container) return;

        const eventTypes = await PetTracker.DB.getAll(PetTracker.STORES.EVENT_TYPES);
        const events = await PetTracker.DB.getAll(PetTracker.STORES.EVENTS);

        // Filter to recurring event types only
        const recurringTypes = eventTypes.filter(et => et.isRecurring);

        if (recurringTypes.length === 0) {
            container.innerHTML = '<p class="text-earth-metal text-sm col-span-full">No recurring event types configured</p>';
            return;
        }

        // Filter by pet if selected
        let filteredTypes = recurringTypes;
        if (Analytics.state.selectedPetId) {
            filteredTypes = recurringTypes.filter(et =>
                et.relatedPetIds?.includes(Analytics.state.selectedPetId)
            );
        }

        // Calculate adherence for last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const stats = filteredTypes.map(eventType => {
            // Get events of this type in the time window
            let typeEvents = events.filter(e =>
                e.eventTypeId === eventType.id &&
                new Date(e.startDate) >= thirtyDaysAgo
            );

            // If pet filter is active, also filter events by pet
            if (Analytics.state.selectedPetId) {
                typeEvents = typeEvents.filter(e =>
                    e.petIds?.includes(Analytics.state.selectedPetId)
                );
            }

            // Calculate expected occurrences based on interval
            const intervalDays = eventType.intervalUnit === 'Days' ? (eventType.intervalValue || 1) :
                eventType.intervalUnit === 'Weeks' ? (eventType.intervalValue || 1) * 7 :
                    eventType.intervalUnit === 'Months' ? (eventType.intervalValue || 1) * 30 : (eventType.intervalValue || 1);

            const expectedCount = Math.max(1, Math.floor(30 / intervalDays));
            const actualCount = typeEvents.filter(e => e.status === 'Completed').length;
            const adherence = expectedCount > 0 ? Math.min(100, (actualCount / expectedCount) * 100) : 100;

            return {
                name: eventType.name,
                adherence: adherence.toFixed(0),
                actual: actualCount,
                expected: expectedCount
            };
        });

        if (stats.length === 0) {
            container.innerHTML = '<p class="text-earth-metal text-sm col-span-full">No recurring event types for selected pet</p>';
            return;
        }

        container.innerHTML = stats.map(stat => `
            <div class="text-center border border-oatmeal p-3">
                <span class="font-mono text-xs uppercase text-earth-metal block mb-1">${PetTracker.UI.escapeHtml(stat.name)}</span>
                <p class="font-serif text-2xl ${stat.adherence >= 80 ? 'text-dull-purple' : stat.adherence >= 50 ? 'text-earth-metal' : 'text-muted-pink'}">
                    ${stat.adherence}%
                </p>
                <p class="text-xs text-earth-metal mt-1">${stat.actual}/${stat.expected} in 30 days</p>
            </div>
        `).join('');
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.Analytics = Analytics;
window.Analytics = Analytics;
