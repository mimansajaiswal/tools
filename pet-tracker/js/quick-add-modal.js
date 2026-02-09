/**
 * Pet Tracker - Quick Add Modal
 * Combined deterministic quick-add + AI-powered entry modal
 */
(function () {
    'use strict';

    const QuickAddModal = {
        state: {
            tab: 'quick',
            qaInstance: null,
            lastParse: null,
            pets: [],
            eventTypes: [],
            scales: [],
            scaleLevels: [],
            contacts: [],
            stagedAttachments: [],
            processedAttachmentPool: null
        },

        open: async function (defaultTab) {
            await QuickAddModal._loadOptions();
            QuickAddModal._applyAiState();
            QuickAddModal.clearAttachments();
            QuickAddModal.selectTab(defaultTab || 'quick');
            QuickAddModal._mountQuickAdd();
            PetTracker.UI.openModal('quickAddModal');
        },

        close: function () {
            QuickAddModal.clearAttachments();
            PetTracker.UI.closeModal('quickAddModal');
        },

        selectTab: function (tab) {
            QuickAddModal.state.tab = tab;

            var quickBtn = document.getElementById('qaTabQuick');
            var aiBtn = document.getElementById('qaTabAI');
            var quickPanel = document.getElementById('qaPanelQuick');
            var aiPanel = document.getElementById('qaPanelAI');

            if (!quickBtn || !aiBtn || !quickPanel || !aiPanel) return;

            if (tab === 'ai' && !AI.isConfigured()) {
                tab = 'quick';
                QuickAddModal.state.tab = 'quick';
            }

            var isQuick = tab === 'quick';

            quickBtn.classList.toggle('border-dull-purple', isQuick);
            quickBtn.classList.toggle('text-dull-purple', isQuick);
            quickBtn.classList.toggle('bg-dull-purple/10', isQuick);
            quickBtn.classList.toggle('border-transparent', !isQuick);
            quickBtn.classList.toggle('text-earth-metal', !isQuick);
            quickBtn.classList.toggle('bg-transparent', !isQuick);

            aiBtn.classList.toggle('border-dull-purple', !isQuick);
            aiBtn.classList.toggle('text-dull-purple', !isQuick);
            aiBtn.classList.toggle('bg-dull-purple/10', !isQuick);
            aiBtn.classList.toggle('border-transparent', isQuick);
            aiBtn.classList.toggle('text-earth-metal', isQuick);
            aiBtn.classList.toggle('bg-transparent', isQuick);

            quickPanel.classList.toggle('hidden', !isQuick);
            aiPanel.classList.toggle('hidden', isQuick);

            if (!isQuick) {
                QuickAddModal._mountAiContent();
            }
        },

        _loadOptions: async function () {
            QuickAddModal.state.pets = await PetTracker.DB.getAll(PetTracker.STORES.PETS);
            QuickAddModal.state.eventTypes = await PetTracker.DB.getAll(PetTracker.STORES.EVENT_TYPES);
            QuickAddModal.state.scales = await PetTracker.DB.getAll(PetTracker.STORES.SCALES);
            QuickAddModal.state.scaleLevels = await PetTracker.DB.getAll(PetTracker.STORES.SCALE_LEVELS);
            QuickAddModal.state.contacts = await PetTracker.DB.getAll(PetTracker.STORES.CONTACTS);
        },

        _applyAiState: function () {
            var aiBtn = document.getElementById('qaTabAI');
            var aiHint = document.getElementById('qaAiDisabledHint');
            if (!aiBtn) return;

            var configured = AI.isConfigured();
            aiBtn.disabled = !configured;
            aiBtn.classList.toggle('opacity-40', !configured);
            aiBtn.classList.toggle('cursor-not-allowed', !configured);
            if (aiHint) aiHint.classList.toggle('hidden', configured);
        },

        _buildConfig: function () {
            var pets = QuickAddModal.state.pets;
            var eventTypes = QuickAddModal.state.eventTypes;
            var contacts = QuickAddModal.state.contacts || [];

            var petOptions = pets.map(function (p) {
                return { value: p.name, label: p.name, color: p.color || '#8b7b8e' };
            });

            var typeOptions = eventTypes.map(function (t) {
                return { value: t.name, label: t.name };
            });

            var providerOptions = contacts.map(function (c) {
                var role = c.role ? ' (' + c.role + ')' : '';
                return { value: c.name, label: c.name + role };
            });

            var s = PetTracker.Settings.get();
            var pm = (s && s.quickAddPrefixes) ? s.quickAddPrefixes : {};
            var dflt = PetTracker.Settings.defaults.quickAddPrefixes || {};
            function pf(key) {
                var v = pm[key];
                return (Array.isArray(v) && v.length) ? v : (dflt[key] || []);
            }

            var petPrefixes = pf('pet');
            var firstPetPrefix = petPrefixes[0] || 'pet:';
            var typePrefixes = pf('type');
            var firstTypePrefix = typePrefixes[0] || 'type:';
            var datePrefixes = pf('date');
            var firstDatePrefix = datePrefixes[0] || 'on:';
            var timePrefixes = pf('time');
            var firstTimePrefix = timePrefixes[0] || 'at:';

            var petName = pets.length > 0 ? pets[0].name : 'Luna';
            var typeName = eventTypes.length > 0 ? eventTypes[0].name : 'Walk';

            return {
                mount: '#qaMount',
                allowMultipleEntries: true,
                entrySeparator: '\n',
                fieldTerminator: ';;',
                fieldTerminatorMode: 'or-next-prefix',
                escapeChar: '\\',
                fallbackField: 'notes',
                showJsonOutput: false,
                showInlinePills: true,
                showEntryCards: true,
                showEntryHeader: true,
                showEntryPills: true,
                autoDetectOptionsWithoutPrefix: true,
                reduceInferredOptions: true,
                placeholder: firstPetPrefix + petName + ' ' + firstTypePrefix + typeName + ' ' + firstDatePrefix + 'today ' + firstTimePrefix + '08:00 ' + pf('notes')[0] + 'Morning walk',
                hintText: 'Prefixes: ' + [firstPetPrefix, firstTypePrefix, firstDatePrefix, firstTimePrefix, pf('status')[0], pf('severity')[0], pf('value')[0], pf('unit')[0], pf('tags')[0], pf('notes')[0], pf('attachments')[0], pf('endDate')[0], pf('duration')[0], pf('provider')[0], pf('cost')[0], pf('costCategory')[0], pf('costCurrency')[0], pf('todoistTaskId')[0]].filter(Boolean).join(' ') + ' — ";;" ends multi-word values. New line = new entry.',
                schema: {
                    fields: [
                        {
                            key: 'pet',
                            label: 'Pet',
                            type: 'options',
                            required: true,
                            prefixes: petPrefixes,
                            exhaustive: true,
                            autoDetectWithoutPrefix: true,
                            reduceInferredOptions: true,
                            options: petOptions
                        },
                        {
                            key: 'type',
                            label: 'Event Type',
                            type: 'options',
                            required: true,
                            prefixes: typePrefixes,
                            exhaustive: true,
                            autoDetectWithoutPrefix: true,
                            reduceInferredOptions: true,
                            options: typeOptions
                        },
                        {
                            key: 'date',
                            label: 'Date',
                            type: 'date',
                            naturalDate: true,
                            required: false,
                            prefixes: datePrefixes
                        },
                        {
                            key: 'time',
                            label: 'Time',
                            type: 'string',
                            required: false,
                            prefixes: timePrefixes
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            type: 'options',
                            required: false,
                            prefixes: pf('status'),
                            exhaustive: true,
                            options: [
                                { value: 'Completed', color: '#8b7b8e' },
                                { value: 'Planned', color: '#d4c8b8' },
                                { value: 'Missed', color: '#c9a9a6' }
                            ]
                        },
                        {
                            key: 'severity',
                            label: 'Severity',
                            type: 'string',
                            required: false,
                            prefixes: pf('severity')
                        },
                        {
                            key: 'value',
                            label: 'Value',
                            type: 'number',
                            required: false,
                            prefixes: pf('value')
                        },
                        {
                            key: 'unit',
                            label: 'Unit',
                            type: 'string',
                            required: false,
                            prefixes: pf('unit')
                        },
                        {
                            key: 'tags',
                            label: 'Tags',
                            type: 'string',
                            multiple: true,
                            required: false,
                            prefixes: pf('tags')
                        },
                        {
                            key: 'notes',
                            label: 'Notes',
                            type: 'string',
                            required: false,
                            prefixes: pf('notes')
                        },
                        {
                            key: 'attachments',
                            label: 'Attachments',
                            type: 'string',
                            multiple: true,
                            required: false,
                            prefixes: pf('attachments')
                        },
                        {
                            key: 'endDate',
                            label: 'End Date',
                            type: 'date',
                            naturalDate: true,
                            required: false,
                            prefixes: pf('endDate')
                        },
                        {
                            key: 'duration',
                            label: 'Duration',
                            type: 'number',
                            required: false,
                            prefixes: pf('duration')
                        },
                        {
                            key: 'provider',
                            label: 'Provider',
                            type: 'options',
                            required: false,
                            exhaustive: false,
                            options: providerOptions,
                            prefixes: pf('provider')
                        },
                        {
                            key: 'cost',
                            label: 'Cost',
                            type: 'number',
                            required: false,
                            prefixes: pf('cost')
                        },
                        {
                            key: 'costCategory',
                            label: 'Cost Category',
                            type: 'string',
                            required: false,
                            prefixes: pf('costCategory')
                        },
                        {
                            key: 'costCurrency',
                            label: 'Currency',
                            type: 'string',
                            required: false,
                            prefixes: pf('costCurrency')
                        },
                        {
                            key: 'todoistTaskId',
                            label: 'Todoist Task',
                            type: 'string',
                            required: false,
                            prefixes: pf('todoistTaskId')
                        }
                    ]
                },
                tokens: {
                    '--qa-bg': '#f8f6f3',
                    '--qa-fg': '#2d2926',
                    '--qa-muted': '#6b6357',
                    '--qa-border': '#d4c8b8',
                    '--qa-accent': '#8b7b8e',
                    '--qa-accent-soft': 'rgba(139,123,142,0.15)',
                    '--qa-input-bg': '#ffffff',
                    '--qa-card-bg': '#ffffff',
                    '--qa-pill-bg': 'transparent',
                    '--qa-pill-border': '#d4c8b8',
                    '--qa-radius': '2px'
                },
                onParse: function (result) {
                    QuickAddModal.state.lastParse = result;
                    var saveBtn = document.getElementById('qaSaveBtn');
                    if (saveBtn) {
                        var count = result.validCount || 0;
                        saveBtn.textContent = count > 0
                            ? 'Save ' + count + ' event' + (count > 1 ? 's' : '')
                            : 'Save Events';
                        saveBtn.disabled = count === 0;
                    }
                }
            };
        },

        _mountQuickAdd: function () {
            var mountEl = document.getElementById('qaMount');
            if (!mountEl) return;

            mountEl.innerHTML = '';
            QuickAddModal.state.lastParse = null;

            if (typeof QuickAdd === 'undefined' || !QuickAdd.create) {
                mountEl.innerHTML = '<p class="text-earth-metal text-sm py-4">Quick Add component not loaded.</p>';
                return;
            }

            var config = QuickAddModal._buildConfig();
            QuickAddModal.state.qaInstance = QuickAdd.create(config);

            var saveBtn = document.getElementById('qaSaveBtn');
            if (saveBtn) {
                saveBtn.textContent = 'Save Events';
                saveBtn.disabled = true;
            }
        },

        _mountAiContent: function () {
        },

        handleAttachmentInputChange: async function (input) {
            var files = Array.from(input && input.files ? input.files : []);
            if (!files.length) return;

            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                var previewUrl = '';
                try {
                    previewUrl = await Media.createThumbnailPreview(file);
                } catch (_) {
                    previewUrl = '';
                }
                QuickAddModal.state.stagedAttachments.push({
                    file: file,
                    name: file.name || ('attachment-' + (QuickAddModal.state.stagedAttachments.length + 1)),
                    type: App.getAttachmentType(file),
                    previewUrl: previewUrl
                });
            }

            if (input) input.value = '';
            QuickAddModal.state.processedAttachmentPool = null;
            QuickAddModal.renderAttachmentPreviews();
            if (QuickAddModal.state.stagedAttachments.length > 0) {
                PetTracker.UI.toast(QuickAddModal.state.stagedAttachments.length + ' attachment(s) staged', 'success', 1800);
            }
        },

        removeAttachment: function (index) {
            var i = Number(index);
            if (!Number.isFinite(i) || i < 0 || i >= QuickAddModal.state.stagedAttachments.length) return;
            var item = QuickAddModal.state.stagedAttachments[i];
            if (item && item.previewUrl && item.previewUrl.indexOf('blob:') === 0) {
                URL.revokeObjectURL(item.previewUrl);
            }
            QuickAddModal.state.stagedAttachments.splice(i, 1);
            QuickAddModal.state.processedAttachmentPool = null;
            QuickAddModal.renderAttachmentPreviews();
        },

        clearAttachments: function () {
            var list = QuickAddModal.state.stagedAttachments || [];
            for (var i = 0; i < list.length; i++) {
                var url = list[i] && list[i].previewUrl;
                if (url && url.indexOf('blob:') === 0) {
                    URL.revokeObjectURL(url);
                }
            }
            QuickAddModal.state.stagedAttachments = [];
            QuickAddModal.state.processedAttachmentPool = null;
            QuickAddModal.renderAttachmentPreviews();
            var input = document.getElementById('qaAttachmentInput');
            if (input) input.value = '';
        },

        renderAttachmentPreviews: function () {
            var container = document.getElementById('qaAttachmentPreviewList');
            if (!container) return;
            var attachments = QuickAddModal.state.stagedAttachments || [];

            if (attachments.length === 0) {
                container.innerHTML = '<p class="text-xs text-earth-metal">No attachments added.</p>';
                return;
            }

            container.innerHTML = attachments.map(function (item, index) {
                var thumb = '';
                if (item.previewUrl) {
                    thumb = '<img src="' + item.previewUrl + '" alt="' + PetTracker.UI.escapeHtml(item.name) + '" class="w-10 h-10 object-cover border border-oatmeal">';
                } else {
                    thumb = '<div class="w-10 h-10 border border-oatmeal flex items-center justify-center bg-oatmeal/40"><i data-lucide="file" class="w-4 h-4 text-earth-metal"></i></div>';
                }

                return (
                    '<div class="border border-oatmeal p-2 flex items-center gap-2">' +
                    thumb +
                    '<div class="min-w-0 flex-1">' +
                    '<p class="text-xs text-charcoal truncate"><span class="font-mono mr-1">#' + (index + 1) + '</span>' + PetTracker.UI.escapeHtml(item.name) + '</p>' +
                    '<p class="text-[10px] text-earth-metal uppercase">' + PetTracker.UI.escapeHtml(item.type || 'file') + '</p>' +
                    '</div>' +
                    '<button type="button" onclick="PetTracker.QuickAddModal.removeAttachment(' + index + ')" class="p-1 text-earth-metal hover:text-muted-pink">' +
                    '<i data-lucide="x" class="w-3 h-3"></i></button>' +
                    '</div>'
                );
            }).join('');

            if (window.lucide) lucide.createIcons();
        },

        getAttachmentCatalog: function () {
            return (QuickAddModal.state.stagedAttachments || []).map(function (item, i) {
                return { index: i + 1, name: item.name || ('Attachment ' + (i + 1)), type: item.type || 'file' };
            });
        },

        normalizeAttachmentRefs: function (raw) {
            if (raw === undefined || raw === null || raw === '') return [];
            if (Array.isArray(raw)) {
                return raw
                    .map(function (v) { return String(v || '').trim(); })
                    .filter(Boolean);
            }
            return String(raw)
                .split(/[,\n]+/)
                .map(function (v) { return v.trim(); })
                .filter(Boolean);
        },

        resolveAttachmentRefs: function (raw) {
            var refs = QuickAddModal.normalizeAttachmentRefs(raw);
            var attachments = QuickAddModal.state.stagedAttachments || [];
            var total = attachments.length;
            var picked = new Set();
            var unknown = [];

            for (var i = 0; i < refs.length; i++) {
                var tokenRaw = refs[i];
                var token = tokenRaw.toLowerCase();
                if (!token) continue;

                if (token === 'all' || token === '*' || token === 'any') {
                    for (var n = 0; n < total; n++) picked.add(n);
                    continue;
                }

                var range = token.match(/^(\d+)\s*-\s*(\d+)$/);
                if (range) {
                    var start = parseInt(range[1], 10);
                    var end = parseInt(range[2], 10);
                    var min = Math.min(start, end);
                    var max = Math.max(start, end);
                    for (var r = min; r <= max; r++) {
                        var idx = r - 1;
                        if (idx >= 0 && idx < total) {
                            picked.add(idx);
                        }
                    }
                    continue;
                }

                if (/^\d+$/.test(token)) {
                    var parsed = parseInt(token, 10) - 1;
                    if (parsed >= 0 && parsed < total) {
                        picked.add(parsed);
                    } else {
                        unknown.push(tokenRaw);
                    }
                    continue;
                }

                var matchedNameIndex = attachments.findIndex(function (a) {
                    return (a.name || '').toLowerCase().indexOf(token) >= 0;
                });
                if (matchedNameIndex >= 0) {
                    picked.add(matchedNameIndex);
                } else {
                    unknown.push(tokenRaw);
                }
            }

            return {
                indices: Array.from(picked).sort(function (a, b) { return a - b; }),
                unknown: unknown
            };
        },

        ensureProcessedAttachmentPool: async function () {
            if (Array.isArray(QuickAddModal.state.processedAttachmentPool)) {
                return QuickAddModal.state.processedAttachmentPool;
            }
            var attachments = QuickAddModal.state.stagedAttachments || [];
            if (attachments.length === 0) {
                QuickAddModal.state.processedAttachmentPool = [];
                return [];
            }

            var files = attachments.map(function (a) { return a.file; }).filter(Boolean);
            var processed = await Media.processAndStoreMedia(files);
            var failed = processed.filter(function (m) { return m && m.error; });
            if (failed.length > 0) {
                throw new Error('Attachment processing failed: ' + failed[0].error);
            }

            var normalized = processed
                .filter(function (m) { return m && m.id; })
                .map(function (m) {
                    return {
                        id: m.id,
                        localId: m.id,
                        name: m.name || 'attachment',
                        type: m.type || 'file',
                        url: m.url || '',
                        fileUploadId: m.fileUploadId || null
                    };
                });

            if (normalized.length !== files.length) {
                throw new Error('Some attachments could not be processed. Please retry.');
            }

            QuickAddModal.state.processedAttachmentPool = normalized;
            return normalized;
        },

        mapAttachmentRefsToMedia: async function (raw) {
            var resolved = QuickAddModal.resolveAttachmentRefs(raw);
            if (!resolved.indices.length) return [];

            if (resolved.unknown.length > 0) {
                throw new Error('Unknown attachment reference(s): ' + resolved.unknown.join(', '));
            }

            var pool = await QuickAddModal.ensureProcessedAttachmentPool();
            return resolved.indices
                .map(function (idx) { return pool[idx]; })
                .filter(Boolean)
                .map(function (m) { return Object.assign({}, m); });
        },

        normalizeStatus: function (rawStatus) {
            var status = String(rawStatus || '').trim().toLowerCase();
            if (!status) return 'Completed';
            if (status === 'completed' || status === 'done' || status === 'complete') return 'Completed';
            if (status === 'planned' || status === 'plan' || status === 'scheduled' || status === 'schedule') return 'Planned';
            if (status === 'missed' || status === 'skip' || status === 'skipped' || status === 'cancelled' || status === 'canceled') return 'Missed';
            return 'Completed';
        },

        resolveProviderId: function (rawProvider) {
            var input = String(rawProvider || '').trim();
            if (!input) return null;

            var contacts = QuickAddModal.state.contacts || [];
            var byId = contacts.find(function (c) { return c.id === input; });
            if (byId) return byId.id;

            var lower = input.toLowerCase();
            var exact = contacts.find(function (c) { return (c.name || '').toLowerCase() === lower; });
            if (exact) return exact.id;

            var fuzzy = contacts.find(function (c) { return (c.name || '').toLowerCase().indexOf(lower) >= 0; });
            return fuzzy ? fuzzy.id : null;
        },

        save: async function () {
            var result = QuickAddModal.state.lastParse;
            if (!result || !result.entries || result.entries.length === 0) {
                PetTracker.UI.toast('No entries to save', 'warning');
                return;
            }

            var validEntries = result.entries.filter(function (e) { return e.isValid; });
            if (validEntries.length === 0) {
                PetTracker.UI.toast('No valid entries — fill required fields (pet, type)', 'error');
                return;
            }

            var pets = QuickAddModal.state.pets;
            var eventTypes = QuickAddModal.state.eventTypes;
            var scaleLevels = QuickAddModal.state.scaleLevels;
            var saved = 0;
            var errors = [];

            for (var i = 0; i < validEntries.length; i++) {
                var entry = validEntries[i];
                var fields = entry.fields || {};

                try {
                    var petName = QuickAddModal._fieldValue(fields.pet);
                    var typeName = QuickAddModal._fieldValue(fields.type);

                    var pet = pets.find(function (p) {
                        return p.name.toLowerCase() === (petName || '').toLowerCase();
                    });
                    var eventType = eventTypes.find(function (t) {
                        return t.name.toLowerCase() === (typeName || '').toLowerCase();
                    });

                    if (!pet) {
                        errors.push('Pet "' + petName + '" not found');
                        continue;
                    }
                    if (!eventType) {
                        errors.push('Event type "' + typeName + '" not found');
                        continue;
                    }

                    var validationErrors = QuickAddModal._validateEntry(fields, pet, eventType);
                    if (validationErrors.length > 0) {
                        validationErrors.forEach(function (ve) { errors.push(ve); });
                        continue;
                    }

                    var dateVal = QuickAddModal._fieldValue(fields.date) || PetTracker.UI.localDateYYYYMMDD();
                    var timeVal = QuickAddModal._fieldValue(fields.time);
                    var startDate = timeVal ? dateVal + 'T' + timeVal + ':00' : dateVal;

                    var status = QuickAddModal.normalizeStatus(QuickAddModal._fieldValue(fields.status));
                    var notes = QuickAddModal._fieldValue(fields.notes) || '';
                    var valueNum = fields.value !== undefined ? parseFloat(QuickAddModal._fieldValue(fields.value)) : null;
                    if (valueNum !== null && isNaN(valueNum)) valueNum = null;
                    var unit = QuickAddModal._fieldValue(fields.unit) || eventType.defaultUnit || null;

                    var tags = Array.isArray(fields.tags) ? fields.tags : [];
                    tags = tags.map(function (t) { return String(t).trim(); }).filter(Boolean);

                    var severityLevelId = null;
                    var sevInput = QuickAddModal._fieldValue(fields.severity);
                    if (sevInput && eventType.usesSeverity && eventType.defaultScaleId) {
                        var matchedLevel = scaleLevels.find(function (l) {
                            return l.scaleId === eventType.defaultScaleId &&
                                l.name.toLowerCase() === sevInput.toLowerCase();
                        });
                        if (!matchedLevel) {
                            matchedLevel = scaleLevels.find(function (l) {
                                return l.scaleId === eventType.defaultScaleId &&
                                    l.name.toLowerCase().includes(sevInput.toLowerCase());
                            });
                        }
                        if (matchedLevel) {
                            severityLevelId = matchedLevel.id;
                        }
                    }

                    var endDateVal = QuickAddModal._fieldValue(fields.endDate) || null;
                    var durationVal = fields.duration !== undefined ? parseFloat(QuickAddModal._fieldValue(fields.duration)) : null;
                    if (durationVal !== null && isNaN(durationVal)) durationVal = null;
                    var providerInput = QuickAddModal._fieldValue(fields.provider) || null;
                    var providerVal = QuickAddModal.resolveProviderId(providerInput);
                    var costVal = fields.cost !== undefined ? parseFloat(QuickAddModal._fieldValue(fields.cost)) : null;
                    if (costVal !== null && isNaN(costVal)) costVal = null;
                    var costCatVal = QuickAddModal._fieldValue(fields.costCategory) || null;
                    var costCurVal = QuickAddModal._fieldValue(fields.costCurrency) || null;
                    var todoistVal = QuickAddModal._fieldValue(fields.todoistTaskId) || null;
                    var mediaVal = await QuickAddModal.mapAttachmentRefsToMedia(fields.attachments);

                    await Events.create({
                        title: eventType.name,
                        petIds: [pet.id],
                        eventTypeId: eventType.id,
                        startDate: startDate,
                        endDate: endDateVal,
                        status: status,
                        severityLevelId: severityLevelId,
                        value: valueNum,
                        unit: unit,
                        duration: durationVal,
                        notes: notes,
                        media: mediaVal,
                        tags: tags,
                        providerId: providerVal,
                        cost: costVal,
                        costCategory: costCatVal,
                        costCurrency: costCurVal,
                        todoistTaskId: todoistVal,
                        source: 'QuickAdd'
                    });

                    saved++;
                } catch (e) {
                    console.error('[QuickAdd] Error saving entry:', e);
                    errors.push(e.message);
                }
            }

            if (saved > 0) {
                PetTracker.UI.toast('Saved ' + saved + ' event' + (saved > 1 ? 's' : ''), 'success');
                QuickAddModal.close();
                App.renderDashboard();
                if (typeof Calendar !== 'undefined') Calendar.render?.();
            }

            if (errors.length > 0) {
                PetTracker.UI.toast(errors[0], 'error');
            }
        },

        _validateEntry: function (fields, pet, eventType) {
            var errors = [];

            if (eventType.relatedPetIds && eventType.relatedPetIds.length > 0) {
                if (!eventType.relatedPetIds.includes(pet.id)) {
                    errors.push('"' + eventType.name + '" is not available for ' + pet.name);
                }
            }

            var timeVal = QuickAddModal._fieldValue(fields.time);
            if (timeVal && !/^\d{1,2}:\d{2}$/.test(timeVal)) {
                errors.push('Invalid time format "' + timeVal + '" — expected HH:mm');
            } else if (timeVal) {
                var parts = timeVal.split(':');
                var h = parseInt(parts[0], 10);
                var m = parseInt(parts[1], 10);
                if (h < 0 || h > 23 || m < 0 || m > 59) {
                    errors.push('Time out of range "' + timeVal + '" — hours 0-23, minutes 0-59');
                }
            }

            var sevInput = QuickAddModal._fieldValue(fields.severity);
            if (eventType.usesSeverity && eventType.defaultScaleId) {
                var scales = QuickAddModal.state.scales;
                var scale = scales.find(function (s) { return s.id === eventType.defaultScaleId; });
                if (!scale) {
                    errors.push('Scale for "' + eventType.name + '" not found');
                } else {
                    var scaleLevels = QuickAddModal.state.scaleLevels;
                    var validLevels = scaleLevels.filter(function (l) {
                        return l.scaleId === eventType.defaultScaleId;
                    });
                    if (sevInput) {
                        var matched = validLevels.some(function (l) {
                            return l.name.toLowerCase() === sevInput.toLowerCase() ||
                                l.name.toLowerCase().includes(sevInput.toLowerCase());
                        });
                        if (!matched) {
                            var levelNames = validLevels.map(function (l) { return l.name; }).join(', ');
                            errors.push('Unknown severity "' + sevInput + '" for scale "' + scale.name + '" — valid: ' + levelNames);
                        }
                    }
                }
            } else if (sevInput && !eventType.usesSeverity) {
                errors.push('Event type "' + eventType.name + '" does not use severity');
            }

            var valStr = QuickAddModal._fieldValue(fields.value);
            if (valStr) {
                var num = parseFloat(valStr);
                if (isNaN(num)) {
                    errors.push('Value "' + valStr + '" is not a valid number');
                }
            }

            var statusInput = QuickAddModal._fieldValue(fields.status);
            if (statusInput) {
                var st = String(statusInput).trim().toLowerCase();
                var validStatusTokens = ['completed', 'done', 'complete', 'planned', 'plan', 'scheduled', 'schedule', 'missed', 'skip', 'skipped', 'cancelled', 'canceled'];
                if (!validStatusTokens.includes(st)) {
                    errors.push('Unknown status "' + statusInput + '" — use completed/planned/missed');
                }
            }

            var attachmentResolution = QuickAddModal.resolveAttachmentRefs(fields.attachments);
            if (attachmentResolution.unknown.length > 0) {
                errors.push('Unknown attachment reference(s): ' + attachmentResolution.unknown.join(', '));
            }

            var providerInput = QuickAddModal._fieldValue(fields.provider);
            if (providerInput && !QuickAddModal.resolveProviderId(providerInput)) {
                errors.push('Provider "' + providerInput + '" not found');
            }

            return errors;
        },

        _fieldValue: function (val) {
            if (val === undefined || val === null) return '';
            if (Array.isArray(val)) return val[0] !== undefined ? String(val[0]) : '';
            return String(val);
        }
    };

    window.PetTracker = window.PetTracker || {};
    window.PetTracker.QuickAddModal = QuickAddModal;
    window.QuickAddModal = QuickAddModal;
})();
