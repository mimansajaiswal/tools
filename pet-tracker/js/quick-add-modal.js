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
            scaleLevels: []
        },

        open: async function (defaultTab) {
            await QuickAddModal._loadOptions();
            QuickAddModal._applyAiState();
            QuickAddModal.selectTab(defaultTab || 'quick');
            QuickAddModal._mountQuickAdd();
            PetTracker.UI.openModal('quickAddModal');
        },

        close: function () {
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

            var petOptions = pets.map(function (p) {
                return { value: p.name, label: p.name, color: p.color || '#8b7b8e' };
            });

            var typeOptions = eventTypes.map(function (t) {
                return { value: t.name, label: t.name };
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
                placeholder: firstPetPrefix + petName + ' ' + firstTypePrefix + typeName + ' ' + firstDatePrefix + 'today ' + firstTimePrefix + '08:00 notes:Morning walk',
                hintText: 'Prefixes: ' + [firstPetPrefix, firstTypePrefix, firstDatePrefix, firstTimePrefix, pf('status')[0] || 'status:', pf('severity')[0] || 'sev:', pf('value')[0] || 'val:', pf('unit')[0] || 'unit:', pf('tags')[0] || '#', pf('notes')[0] || 'notes:'].join(' ') + ' — ";;" ends multi-word values. New line = new entry.',
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
                                { value: 'Scheduled', color: '#d4c8b8' },
                                { value: 'Cancelled', color: '#c9a9a6' }
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

                    var status = QuickAddModal._fieldValue(fields.status) || 'Completed';
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

                    await Events.create({
                        title: eventType.name,
                        petIds: [pet.id],
                        eventTypeId: eventType.id,
                        startDate: startDate,
                        status: status,
                        severityLevelId: severityLevelId,
                        value: valueNum,
                        unit: unit,
                        notes: notes,
                        tags: tags,
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
                        errors.push('Unknown severity "' + sevInput + '" — valid: ' + levelNames);
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
