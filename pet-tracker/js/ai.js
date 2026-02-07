/**
 * Pet Tracker - AI Auto-Entry Module
 * BYOK (Bring Your Own Key) provider-agnostic AI extraction
 */

const AI = {
    state: {
        isEnabled: false,
        isProcessing: false,
        inputText: '',
        entries: [],
        editedEntries: new Set(),
        deletedEntries: new Set(),
        parseTimer: null,
        queueCount: 0,
        processingQueueId: null
    },

    /**
     * Check if AI is configured
     */
    isConfigured: () => {
        const settings = PetTracker.Settings.get();
        return !!(settings.aiProvider && settings.aiApiKey);
    },

    /**
     * Build dynamic prompt with user's configuration
     */
    buildPrompt: async () => {
        const pets = await PetTracker.DB.getAll(PetTracker.STORES.PETS);
        const eventTypes = await PetTracker.DB.getAll(PetTracker.STORES.EVENT_TYPES);
        const scales = await PetTracker.DB.getAll(PetTracker.STORES.SCALES);
        const scaleLevels = await PetTracker.DB.getAll(PetTracker.STORES.SCALE_LEVELS);

        const now = new Date();
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const primaryPet = pets.find(p => p.isPrimary) || pets[0];

        // Event types that are recurring (for scheduling context)
        const recurringTypes = eventTypes.filter(t => t.isRecurring);

        return `You are a pet health tracking assistant. Parse the user's natural language input into structured event entries.

Current date: ${now.toISOString().slice(0, 10)}
Current time: ${now.toTimeString().slice(0, 5)}
Timezone: ${timezone}

## Available Pets
${pets.map(p => `- "${p.name}" (ID: ${p.id}, Species: ${p.species || 'Unknown'})`).join('\n') || '- No pets configured'}

Primary pet for ambiguous entries: ${primaryPet ? `"${primaryPet.name}"` : 'None set'}

## Event Types
${eventTypes.map(t => `- "${t.name}" (Category: ${t.category}, Mode: ${t.trackingMode}${t.usesSeverity ? ', Uses Severity' : ''}${t.isRecurring ? ', Recurring' : ''})`).join('\n') || '- No event types configured'}

## Recurring Event Types (Medications, Vaccines, Scheduled Care)
${recurringTypes.map(t => `- "${t.name}" (Every ${t.intervalValue || 1} ${t.intervalUnit || 'days'})`).join('\n') || '- No recurring event types configured'}

## Severity Scales
${scales.map(s => {
            const levels = scaleLevels.filter(l => l.scaleId === s.id).sort((a, b) => a.order - b.order);
            return `- "${s.name}": ${levels.map(l => l.name).join(', ')}`;
        }).join('\n') || '- No scales configured'}

## Instructions
1. Parse the input into one or more event entries
2. If multiple pets are mentioned (e.g., "Luna and Max"), create SEPARATE entries for each pet
3. If pet name is ambiguous or not mentioned, use the primary pet
4. Match event types by name (case-insensitive)
5. For dates, interpret relative terms (today, yesterday, this morning, etc.)
6. For severity, match to configured scale levels
7. Include confidence score (0.0-1.0) based on clarity of input

## Output Format (JSON only, no markdown)
{
  "entries": [
    {
      "title": "Event title",
      "petName": "Pet name as typed",
      "eventType": "Event type name",
      "date": "YYYY-MM-DD",
      "time": "HH:mm or null",
      "status": "Completed",
      "severityLabel": "Severity level name or null",
      "value": null,
      "unit": null,
      "durationMinutes": null,
      "notes": "Any additional context",
      "tags": [],
      "confidence": 0.95
    }
  ],
  "missing": ["List of unrecognized pet names or event types"],
  "warnings": ["List of validation warnings"]
}

Parse the following input:`;
    },

    /**
     * Call AI provider for extraction
     */
    callProvider: async (input) => {
        const settings = PetTracker.Settings.get();
        const { aiProvider, aiApiKey, aiModel, aiEndpoint } = settings;

        const prompt = await AI.buildPrompt();
        const fullPrompt = `${prompt}\n\n"${input}"`;

        let response;

        switch (aiProvider) {
            case 'openai':
                response = await AI.callOpenAI(aiApiKey, aiModel || 'gpt-4o-mini', fullPrompt);
                break;
            case 'anthropic':
                response = await AI.callAnthropic(aiApiKey, aiModel || 'claude-3-haiku-20240307', fullPrompt);
                break;
            case 'google':
                response = await AI.callGoogle(aiApiKey, aiModel || 'gemini-1.5-flash', fullPrompt);
                break;
            case 'custom':
                response = await AI.callCustom(aiEndpoint, aiApiKey, aiModel, fullPrompt);
                break;
            default:
                throw new Error(`Unknown AI provider: ${aiProvider}`);
        }

        return AI.parseResponse(response);
    },

    /**
     * Call OpenAI API
     */
    callOpenAI: async (apiKey, model, prompt) => {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                response_format: { type: 'json_object' }
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `OpenAI API error: ${res.status}`);
        }

        const data = await res.json();
        return data.choices[0]?.message?.content || '';
    },

    /**
     * Call Anthropic API
     */
    callAnthropic: async (apiKey, model, prompt) => {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model,
                max_tokens: 2048,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `Anthropic API error: ${res.status}`);
        }

        const data = await res.json();
        return data.content[0]?.text || '';
    },

    /**
     * Call Google Gemini API
     */
    callGoogle: async (apiKey, model, prompt) => {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3 }
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `Google API error: ${res.status}`);
        }

        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    },

    /**
     * Call custom OpenAI-compatible endpoint
     */
    callCustom: async (endpoint, apiKey, model, prompt) => {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'default',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3
            })
        });

        if (!res.ok) {
            throw new Error(`Custom API error: ${res.status}`);
        }

        const data = await res.json();
        return data.choices?.[0]?.message?.content || '';
    },

    /**
     * Parse AI response into structured data
     */
    parseResponse: (text) => {
        try {
            // Try to extract JSON from response
            let json = text;

            // Handle markdown code blocks
            const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (codeMatch) {
                json = codeMatch[1];
            }

            const parsed = JSON.parse(json.trim());

            return {
                entries: parsed.entries || [],
                missing: parsed.missing || [],
                warnings: parsed.warnings || []
            };
        } catch (e) {
            console.error('[AI] Failed to parse response:', text);
            return {
                entries: [],
                missing: [],
                warnings: [`Failed to parse AI response: ${e.message}`]
            };
        }
    },

    /**
     * Handle input change with debounced parsing
     */
    onInputChange: (text) => {
        AI.state.inputText = text;

        // Clear existing timer
        if (AI.state.parseTimer) {
            clearTimeout(AI.state.parseTimer);
        }

        // Set new timer (5 seconds after typing stops)
        AI.state.parseTimer = setTimeout(() => {
            if (AI.state.inputText.trim().length > 10) {
                AI.parse();
            }
        }, 5000);
    },

    /**
     * Parse current input
     */
    parse: async () => {
        if (AI.state.isProcessing || !AI.state.inputText.trim()) {
            return;
        }

        AI.state.isProcessing = true;
        AI.renderEntries();

        try {
            const result = await AI.callProvider(AI.state.inputText);

            // Merge with existing entries, preserving edited ones
            result.entries.forEach((entry, index) => {
                entry._id = `ai_${Date.now()}_${index}`;
                entry._isNew = true;

                // Check if we already have a similar entry that was edited
                const existingIndex = AI.state.entries.findIndex(e =>
                    !AI.state.editedEntries.has(e._id) &&
                    e.petName === entry.petName &&
                    e.eventType === entry.eventType &&
                    e.date === entry.date
                );

                if (existingIndex >= 0) {
                    // Replace unedited matching entry
                    AI.state.entries[existingIndex] = entry;
                } else {
                    // Add new entry
                    AI.state.entries.push(entry);
                }
            });

            if (result.warnings.length > 0) {
                result.warnings.forEach(w => PetTracker.UI.toast(w, 'warning'));
            }

            if (result.missing.length > 0) {
                PetTracker.UI.toast(`Unknown: ${result.missing.join(', ')}`, 'warning');
            }

        } catch (e) {
            console.error('[AI] Parse error:', e);
            var isNetworkError = !navigator.onLine ||
                (e instanceof TypeError && /fetch|network/i.test(e.message)) ||
                /network|offline|ECONNREFUSED|Failed to fetch/i.test(e.message);
            if (isNetworkError || !navigator.onLine) {
                try {
                    var queued = await PetTracker.AIQueue.add(AI.state.inputText);
                    if (queued) {
                        await AI.updateQueueCount();
                        AI.renderQueueIndicator();
                        PetTracker.UI.toast('Offline — queued for later processing', 'warning');
                    } else {
                        PetTracker.UI.toast('Already queued for processing', 'info');
                    }
                } catch (qErr) {
                    console.error('[AI] Auto-queue error:', qErr);
                    PetTracker.UI.toast(`AI error: ${e.message}`, 'error');
                }
            } else {
                PetTracker.UI.toast(`AI error: ${e.message}`, 'error');
            }
        } finally {
            AI.state.isProcessing = false;
            AI.renderEntries();
        }
    },

    /**
     * Mark entry as edited (frozen from re-parsing)
     */
    markEdited: (entryId) => {
        AI.state.editedEntries.add(entryId);
        AI.renderEntries();
    },

    /**
     * Mark entry as deleted
     */
    markDeleted: (entryId) => {
        AI.state.deletedEntries.add(entryId);
        AI.renderEntries();
    },

    /**
     * Save all non-deleted entries
     */
    saveAll: async () => {
        const pets = await PetTracker.DB.getAll(PetTracker.STORES.PETS);
        const eventTypes = await PetTracker.DB.getAll(PetTracker.STORES.EVENT_TYPES);

        const toSave = AI.state.entries.filter(e => !AI.state.deletedEntries.has(e._id));
        let saved = 0;

        for (const entry of toSave) {
            try {
                // Resolve pet
                const pet = pets.find(p =>
                    p.name.toLowerCase() === entry.petName?.toLowerCase()
                );
                if (!pet) {
                    console.warn(`[AI] Pet not found: ${entry.petName}`);
                    continue;
                }

                // Resolve event type
                const eventType = eventTypes.find(t =>
                    t.name.toLowerCase() === entry.eventType?.toLowerCase()
                );

                // Build start date
                let startDate = entry.date;
                if (entry.time) {
                    startDate = `${entry.date}T${entry.time}:00`;
                }

                await Events.create({
                    title: entry.title || eventType?.name || 'Event',
                    petIds: [pet.id],
                    eventTypeId: eventType?.id || null,
                    startDate,
                    status: entry.status || 'Completed',
                    notes: entry.notes || '',
                    value: entry.value,
                    unit: entry.unit,
                    duration: entry.durationMinutes,
                    tags: entry.tags || [],
                    source: 'AI'
                });

                saved++;
            } catch (e) {
                console.error(`[AI] Error saving entry:`, e);
            }
        }

        PetTracker.UI.toast(`Saved ${saved} entries`, 'success');
        AI.reset();
        if (PetTracker.QuickAddModal) {
            PetTracker.QuickAddModal.close();
        } else {
            PetTracker.UI.closeModal('quickAddModal');
        }
        App.renderDashboard();
    },

    /**
     * Reset AI state
     */
    reset: () => {
        AI.state.inputText = '';
        AI.state.entries = [];
        AI.state.editedEntries.clear();
        AI.state.deletedEntries.clear();
        AI.state.isProcessing = false;
        if (AI.state.parseTimer) {
            clearTimeout(AI.state.parseTimer);
            AI.state.parseTimer = null;
        }
    },

    /**
     * Resume parsing (after editing)
     */
    resumeParsing: () => {
        // Enable input and trigger parse if text has changed
        AI.parse();
    },

    /**
     * Render entries list
     */
    renderEntries: () => {
        const container = document.getElementById('aiEntriesList');
        if (!container) return;

        if (AI.state.isProcessing) {
            container.innerHTML = `
                <div class="flex items-center justify-center py-8">
                    <div class="loader mr-3"></div>
                    <span class="font-mono text-xs uppercase text-earth-metal">Processing...</span>
                </div>
            `;
            return;
        }

        if (AI.state.entries.length === 0) {
            container.innerHTML = `
                <p class="text-earth-metal text-sm py-4">
                    Type or dictate entries above. AI will parse them after 5 seconds of inactivity.
                </p>
            `;
            return;
        }

        container.innerHTML = AI.state.entries.map(entry => {
            const isDeleted = AI.state.deletedEntries.has(entry._id);
            const isEdited = AI.state.editedEntries.has(entry._id);

            return `
                <div class="card p-3 ${isDeleted ? 'opacity-50 border-muted-pink' : ''} ${isEdited ? 'border-dull-purple' : ''}"
                     data-entry-id="${entry._id}">
                    <div class="entry-content">
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="font-serif text-sm text-charcoal">${PetTracker.UI.escapeHtml(entry.title || entry.eventType || 'Event')}</span>
                                    ${isEdited ? '<span class="badge badge-accent text-[8px]">EDITED</span>' : ''}
                                    ${isDeleted ? '<span class="badge badge-pink text-[8px]">REMOVED</span>' : ''}
                                </div>
                                <p class="meta-row text-[10px]">
                                    <span class="meta-value">${PetTracker.UI.escapeHtml(entry.petName || 'Unknown')}</span>
                                    <span class="meta-separator">//</span>
                                    <span>${entry.date || 'No date'}</span>
                                    ${entry.time ? `<span class="meta-separator">//</span><span>${entry.time}</span>` : ''}
                                </p>
                                ${entry.notes ? `<p class="text-xs text-earth-metal mt-1 truncate">${PetTracker.UI.escapeHtml(entry.notes)}</p>` : ''}
                            </div>
                            <div class="flex items-center gap-1 flex-shrink-0">
                                <span class="text-[10px] text-earth-metal">${Math.round((entry.confidence || 0) * 100)}%</span>
                                ${!isDeleted ? `
                                    <button onclick="AI.showEntryEdit('${entry._id}')" class="p-1 text-earth-metal hover:text-dull-purple">
                                        <i data-lucide="pencil" class="w-3 h-3"></i>
                                    </button>
                                    <button onclick="AI.markDeleted('${entry._id}')" class="p-1 text-earth-metal hover:text-muted-pink">
                                        <i data-lucide="x" class="w-3 h-3"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();
    },

    /**
     * Show entry edit form - allows inline editing of parsed entries
     */
    showEntryEdit: (entryId) => {
        const entry = AI.state.entries.find(e => e._id === entryId);
        if (!entry) return;

        const entryEl = document.querySelector(`[data-entry-id="${entryId}"]`);
        if (!entryEl) return;

        // Create inline edit form
        const editForm = document.createElement('div');
        editForm.className = 'space-y-2 p-2 bg-oatmeal border border-earth-metal';
        editForm.innerHTML = `
            <div>
                <label class="font-mono text-xs uppercase text-earth-metal block mb-1">Title</label>
                <input type="text" class="input-field text-sm" id="aiEditTitle_${entryId}" value="${PetTracker.UI.escapeHtml(entry.title || '')}">
            </div>
            <div>
                <label class="font-mono text-xs uppercase text-earth-metal block mb-1">Notes</label>
                <textarea class="input-field text-sm" rows="2" id="aiEditNotes_${entryId}">${PetTracker.UI.escapeHtml(entry.notes || '')}</textarea>
            </div>
            <div class="flex gap-2 justify-end">
                <button type="button" onclick="AI.cancelEdit('${entryId}')" class="text-xs text-earth-metal hover:text-charcoal">Cancel</button>
                <button type="button" onclick="AI.saveEdit('${entryId}')" class="text-xs text-dull-purple font-medium">Save</button>
            </div>
        `;

        // Replace entry content with edit form
        const contentEl = entryEl.querySelector('.entry-content');
        if (contentEl) {
            contentEl.dataset.originalHtml = contentEl.innerHTML;
            contentEl.innerHTML = '';
            contentEl.appendChild(editForm);
        }

    },

    /**
     * Cancel inline edit
     */
    cancelEdit: (entryId) => {
        const entryEl = document.querySelector(`[data-entry-id="${entryId}"]`);
        if (!entryEl) return;

        const contentEl = entryEl.querySelector('.entry-content');
        if (contentEl && contentEl.dataset.originalHtml) {
            contentEl.innerHTML = contentEl.dataset.originalHtml;
            delete contentEl.dataset.originalHtml;
        }
    },

    /**
     * Save inline edit
     */
    saveEdit: (entryId) => {
        const entry = AI.state.entries.find(e => e._id === entryId);
        if (!entry) return;

        const titleEl = document.getElementById(`aiEditTitle_${entryId}`);
        const notesEl = document.getElementById(`aiEditNotes_${entryId}`);

        if (titleEl) entry.title = titleEl.value.trim();
        if (notesEl) entry.notes = notesEl.value.trim();

        AI.markEdited(entryId);
        AI.renderEntries();
    },

    /**
     * Open AI entry modal
     */
    openModal: async () => {
        AI.reset();
        await AI.updateQueueCount();
        AI.renderEntries();
        AI.renderQueueIndicator();
        if (PetTracker.QuickAddModal) {
            PetTracker.QuickAddModal.open('ai');
        } else {
            PetTracker.UI.openModal('quickAddModal');
        }
    },

    /**
     * Queue text for later processing (works offline)
     */
    queueForLater: async () => {
        const text = AI.state.inputText.trim();
        if (!text) {
            PetTracker.UI.toast('Enter some text to queue', 'error');
            return;
        }

        try {
            await PetTracker.AIQueue.add(text);
            await AI.updateQueueCount();
            AI.state.inputText = '';
            const input = document.getElementById('aiInputText');
            if (input) input.value = '';
            AI.renderQueueIndicator();
            PetTracker.UI.toast('Added to queue for later processing', 'success');
        } catch (e) {
            console.error('[AI] Queue error:', e);
            PetTracker.UI.toast('Failed to queue: ' + e.message, 'error');
        }
    },

    /**
     * Update queue count
     */
    updateQueueCount: async () => {
        AI.state.queueCount = await PetTracker.AIQueue.getPendingCount();
    },

    /**
     * Render queue indicator badge
     */
    renderQueueIndicator: () => {
        const badge = document.getElementById('aiQueueBadge');
        if (badge) {
            if (AI.state.queueCount > 0) {
                badge.textContent = AI.state.queueCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    },

    /**
     * Process all pending queue items
     */
    processQueue: async () => {
        if (!AI.isConfigured()) {
            PetTracker.UI.toast('Configure AI provider in Settings first', 'error');
            return;
        }

        if (!navigator.onLine) {
            PetTracker.UI.toast('Cannot process queue while offline', 'warning');
            return;
        }

        const pending = await PetTracker.AIQueue.getPending();
        if (pending.length === 0) {
            PetTracker.UI.toast('No items in queue', 'info');
            return;
        }

        AI.state.isProcessing = true;
        AI.renderEntries();

        let processed = 0;
        let failed = 0;

        for (const item of pending) {
            try {
                AI.state.processingQueueId = item.id;
                await PetTracker.AIQueue.updateStatus(item.id, 'processing');
                const result = await AI.callProvider(item.text);

                result.entries.forEach((entry, index) => {
                    entry._id = `ai_${Date.now()}_${index}`;
                    entry._isNew = true;
                    entry._fromQueue = item.id;
                    AI.state.entries.push(entry);
                });

                await PetTracker.AIQueue.updateStatus(item.id, 'completed');
                processed++;

                if (result.warnings.length > 0) {
                    result.warnings.forEach(w => PetTracker.UI.toast(w, 'warning'));
                }
                if (result.missing.length > 0) {
                    PetTracker.UI.toast(`Unknown: ${result.missing.join(', ')}`, 'warning');
                }
            } catch (e) {
                console.error('[AI] Queue item error:', e);
                await PetTracker.AIQueue.updateStatus(item.id, 'failed', e.message);
                failed++;
            }
        }

        AI.state.isProcessing = false;
        AI.state.processingQueueId = null;
        await AI.updateQueueCount();
        AI.renderEntries();
        AI.renderQueueIndicator();

        if (processed > 0) {
            PetTracker.UI.toast(`Processed ${processed} queued items`, 'success');
        }
        if (failed > 0) {
            PetTracker.UI.toast(`${failed} items failed`, 'error');
        }
    },

    /**
     * View and manage queue
     */
    showQueueModal: async () => {
        const items = await PetTracker.AIQueue.getAll();
        const container = document.getElementById('aiQueueList');
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = '<p class="text-earth-metal text-sm py-4">No items in queue.</p>';
        } else {
            container.innerHTML = items.map(item => {
                const statusColor = item.status === 'pending' ? 'bg-oatmeal' :
                    item.status === 'completed' ? 'bg-dull-purple/20' : 'bg-muted-pink/30';
                const statusLabel = item.status.toUpperCase();
                return `
                    <div class="card p-3 ${statusColor}" data-queue-id="${item.id}">
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex-1 min-w-0">
                                <p class="text-sm text-charcoal line-clamp-2">${PetTracker.UI.escapeHtml(item.text)}</p>
                                <p class="meta-row text-[10px] mt-1">
                                    <span class="badge text-[8px] ${item.status === 'failed' ? 'badge-pink' : ''}">${statusLabel}</span>
                                    <span class="meta-separator">//</span>
                                    <span>${new Date(item.createdAt).toLocaleString()}</span>
                                </p>
                                ${item.error ? `<p class="text-xs text-muted-pink mt-1">${PetTracker.UI.escapeHtml(item.error)}</p>` : ''}
                            </div>
                            <button onclick="AI.deleteQueueItem('${item.id}')" class="p-1 text-earth-metal hover:text-muted-pink flex-shrink-0">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        if (window.lucide) lucide.createIcons();
        PetTracker.UI.openModal('aiQueueModal');
    },

    /**
     * Delete a queue item
     */
    deleteQueueItem: async (id) => {
        await PetTracker.AIQueue.delete(id);
        await AI.updateQueueCount();
        AI.renderQueueIndicator();
        AI.showQueueModal();
    },

    /**
     * Retry failed queue items
     */
    retryFailed: async () => {
        const failed = await PetTracker.AIQueue.getAll();
        for (const item of failed.filter(i => i.status === 'failed')) {
            await PetTracker.AIQueue.updateStatus(item.id, 'pending', null);
        }
        await AI.updateQueueCount();
        AI.renderQueueIndicator();
        AI.showQueueModal();
        PetTracker.UI.toast('Failed items reset to pending', 'success');
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.AI = AI;
window.AI = AI;
