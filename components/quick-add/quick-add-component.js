/* QuickAdd Component
 * Deterministic quick-add parser with configurable prefixes, field terminator,
 * bulk entry separation, validation, inline pill rendering, and style hooks.
 */
(function initQuickAdd(global) {
    'use strict';
    const DEFAULT_CLASSNAMES = {
        root: 'qa-root',
        inputWrap: 'qa-input-wrap',
        inputSurface: 'qa-input-surface',
        inlineLayer: 'qa-inline-layer',
        inlineText: 'qa-inline-text',
        inlineMark: 'qa-inline-mark',
        inlineMarkInteractive: 'qa-inline-mark-interactive',
        inlineMarkInferred: 'qa-inline-mark-inferred',
        inlineMarkIcon: 'qa-inline-mark-icon',
        inlineMarkBlocked: 'qa-inline-mark-blocked',
        inlineMarkBlockedIcon: 'qa-inline-mark-blocked-icon',
        inlineMarkDismiss: 'qa-inline-mark-dismiss',
        inlineMarkLabel: 'qa-inline-mark-label',
        inputTail: 'qa-input-tail',
        input: 'qa-input',
        hint: 'qa-hint',
        status: 'qa-status',
        preview: 'qa-preview',
        entry: 'qa-entry',
        entryHeader: 'qa-entry-header',
        entryTitle: 'qa-entry-title',
        entryEmpty: 'qa-entry-empty',
        badges: 'qa-badges',
        badge: 'qa-badge',
        attachmentSection: 'qa-attachment-section',
        attachmentControls: 'qa-attachment-controls',
        attachmentPick: 'qa-attachment-pick',
        attachmentInput: 'qa-attachment-input',
        attachmentHint: 'qa-attachment-hint',
        attachmentSourceMenu: 'qa-attachment-source-menu',
        attachmentSourceOption: 'qa-attachment-source-option',
        attachmentGlobalSection: 'qa-attachment-global-section',
        attachmentPoolScroll: 'qa-attachment-pool-scroll',
        attachmentFieldRows: 'qa-attachment-field-rows',
        attachmentFieldRow: 'qa-attachment-field-row',
        attachmentFieldHeader: 'qa-attachment-field-header',
        attachmentFieldList: 'qa-attachment-field-list',
        attachmentLinkBtn: 'qa-attachment-link-btn',
        attachmentUsedFlag: 'qa-attachment-used-flag',
        conflictModalOverlay: 'qa-conflict-modal-overlay',
        conflictModal: 'qa-conflict-modal',
        conflictModalActions: 'qa-conflict-modal-actions',
        conflictModalBtn: 'qa-conflict-modal-btn',
        attachmentList: 'qa-attachment-list',
        attachmentItem: 'qa-attachment-item',
        attachmentOpen: 'qa-attachment-open',
        attachmentPreview: 'qa-attachment-preview-img',
        attachmentName: 'qa-attachment-name',
        attachmentMeta: 'qa-attachment-meta',
        attachmentRemove: 'qa-attachment-remove',
        pillRow: 'qa-pill-row',
        pill: 'qa-pill',
        pillInteractive: 'qa-pill-interactive',
        pillInferred: 'qa-pill-inferred',
        pillInferredIcon: 'qa-pill-inferred-icon',
        pillLabel: 'qa-pill-label',
        pillDismiss: 'qa-pill-dismiss',
        issues: 'qa-issues',
        issue: 'qa-issue',
        outputPanel: 'qa-output-panel',
        outputSummary: 'qa-output-summary',
        output: 'qa-output',
        dropdown: 'qa-dropdown',
        dropdownOpen: 'qa-dropdown-open',
        dropdownSearch: 'qa-dropdown-search',
        dropdownListWrap: 'qa-dropdown-list-wrap',
        dropdownList: 'qa-dropdown-list',
        dropdownFadeTop: 'qa-dropdown-fade-top',
        dropdownFadeBottom: 'qa-dropdown-fade-bottom',
        dropdownOption: 'qa-dropdown-option',
        dropdownOptionActive: 'qa-dropdown-option-active',
        dropdownAdd: 'qa-dropdown-add',
        dropdownColor: 'qa-dropdown-color',
        dropdownMeta: 'qa-dropdown-meta',
        dropdownUsedMeta: 'qa-dropdown-used-meta',
        dropdownCountMeta: 'qa-dropdown-count-meta',
        dropdownUsedIcon: 'qa-dropdown-used-icon',
        dropdownUsedDot: 'qa-dropdown-used-dot',
        dropdownAttachmentPreview: 'qa-dropdown-attachment-preview',
        dropdownAttachmentIcon: 'qa-dropdown-attachment-icon',
        datePicker: 'qa-date-picker',
        datePickerHeader: 'qa-date-picker-header',
        datePickerTitle: 'qa-date-picker-title',
        datePickerTitleControl: 'qa-date-picker-title-control',
        datePickerTitleSelect: 'qa-date-picker-title-select',
        datePickerTitleChevron: 'qa-date-picker-title-chevron',
        datePickerTitleMenu: 'qa-date-picker-title-menu',
        datePickerTitleMenuOpen: 'qa-date-picker-title-menu-open',
        datePickerTitleOption: 'qa-date-picker-title-option',
        datePickerTitleOptionCurrent: 'qa-date-picker-title-option-current',
        datePickerNav: 'qa-date-picker-nav',
        datePickerNavBtn: 'qa-date-picker-nav-btn',
        datePickerWeekdays: 'qa-date-picker-weekdays',
        datePickerGrid: 'qa-date-picker-grid',
        datePickerDay: 'qa-date-picker-day',
        datePickerDayMuted: 'qa-date-picker-day-muted',
        datePickerDaySelected: 'qa-date-picker-day-selected',
        datePickerDayToday: 'qa-date-picker-day-today',
        datePickerFooter: 'qa-date-picker-footer',
        datePickerQuick: 'qa-date-picker-quick',
        datePickerQuickList: 'qa-date-picker-quick-list',
        datePickerQuickBtnBreak: 'qa-date-picker-quick-btn-break',
        datePickerQuickBtn: 'qa-date-picker-quick-btn',
        datePickerTime: 'qa-date-picker-time',
        datePickerTimeLabel: 'qa-date-picker-time-label',
        datePickerTimeInput: 'qa-date-picker-time-input',
        datePickerTimeHint: 'qa-date-picker-time-hint',
        datePickerWithTime: 'qa-date-picker-with-time',
        numberPicker: 'qa-number-picker',
        numberPickerControls: 'qa-number-picker-controls',
        numberPickerBtn: 'qa-number-picker-btn',
        numberPickerValue: 'qa-number-picker-value',
        numberPickerStepWrap: 'qa-number-picker-step-wrap',
        numberPickerStepLabel: 'qa-number-picker-step-label',
        numberPickerStepInput: 'qa-number-picker-step-input',
        numberPill: 'qa-number-pill',
        numberPillStepper: 'qa-number-pill-stepper',
        numberPillStepBtn: 'qa-number-pill-step-btn',
        blockedInfo: 'qa-blocked-info',
        blockedInfoIcon: 'qa-blocked-info-icon',
        blockedInfoText: 'qa-blocked-info-text',
        pillBlocked: 'qa-pill-blocked',
        pillBlockedIcon: 'qa-pill-blocked-icon',
        aiMetaRow: 'qa-ai-meta-row',
        aiMetaItem: 'qa-ai-meta-item',
        aiActions: 'qa-ai-actions',
        aiActionBtn: 'qa-ai-action-btn',
        aiActionBtnPrimary: 'qa-ai-action-btn-primary',
        aiActionBtnDanger: 'qa-ai-action-btn-danger',
        aiActionBtnGhost: 'qa-ai-action-btn-ghost',
        aiEditor: 'qa-ai-editor',
        aiEditorLabel: 'qa-ai-editor-label',
        aiEditorInput: 'qa-ai-editor-input'
    };

    const DEFAULT_AI_CONFIG = {
        enabled: false,
        autoParse: true,
        debounceMs: 1200,
        timeoutMs: 20000,
        minInputLength: 10,
        preserveEditedEntries: true,
        separatorAware: false,
        inlinePills: false,
        forceJson: true,
        provider: 'openai',
        apiKey: '',
        model: '',
        endpoint: '',
        temperature: 0.3,
        systemPrompt: '',
        request: null,
        splitInput: null,
        promptMode: 'default',
        promptTemplate: '',
        parseResponse: null,
        inlinePillHarness: null,
        mockResponse: null,
        mockLatencyMs: 0,
        outputType: '',
        outputSchema: null,
        webSearch: false,
        tools: null
    };

    const DEFAULT_CONFIG = {
        mount: null,
        mode: 'deterministic',
        debounceMs: 300,
        allowMultipleEntries: true,
        entrySeparator: '\n',
        fieldTerminator: ';;',
        fieldTerminatorMode: 'strict',
        multiSelectSeparator: ',',
        multiSelectDisplaySeparator: ', ',
        allowNumberMath: false,
        enableNumberPillStepper: false,
        numberPillStep: 1,
        escapeChar: '\\',
        fallbackField: 'title',
        showJsonOutput: true,
        showDropdownOnTyping: true,
        showAttachmentDropdownPreview: true,
        showInlinePills: true,
        showEntryCards: true,
        showEntryHeader: true,
        inputHeightMode: 'grow',
        inputMaxHeight: null,
        allowMultipleAttachments: true,
        allowAttachmentReuse: true,
        allowedAttachmentTypes: [],
        attachmentSources: null,
        autoDetectOptionsWithoutPrefix: false,
        reduceInferredOptions: true,
        inferredMatchMode: 'exact',
        inferredMatchThreshold: 0.78,
        placeholder: 'Type entries with prefixes and terminators...',
        hintText: '',
        schema: {
            fields: []
        },
        ai: {},
        classNames: {},
        tokens: {},
        onParse: null
    };
    const DEFAULT_DATETIME_TIME = '08:00';

    function ensureQuickAddStyles() {
        if (typeof document === 'undefined') {
            return;
        }
        if (document.querySelector('link[data-qa-style="1"], style[data-qa-style="1"]')) {
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.setAttribute('data-qa-style', '1');

        let href = './quick-add/quick-add-component.css';
        const script = document.currentScript;
        if (script && script.src) {
            try {
                const url = new URL(script.src, document.baseURI);
                if (url.pathname.endsWith('.js')) {
                    url.pathname = url.pathname.slice(0, -3) + '.css';
                    href = url.toString();
                }
            } catch (err) {
                href = './quick-add/quick-add-component.css';
            }
        }

        link.href = href;
        document.head.appendChild(link);
    }

    function mergeConfig(userConfig) {
        const merged = Object.assign({}, DEFAULT_CONFIG, userConfig || {});
        merged.schema = Object.assign({}, DEFAULT_CONFIG.schema, merged.schema || {});
        merged.schema.fields = Array.isArray(merged.schema.fields) ? merged.schema.fields.slice() : [];
        merged.ai = Object.assign({}, DEFAULT_AI_CONFIG, merged.ai || {});
        merged.classNames = Object.assign({}, DEFAULT_CLASSNAMES, merged.classNames || {});
        merged.ai.webSearch = merged.ai.webSearch === true;
        merged.ai.tools = normalizeAiToolsConfig(merged.ai.tools);
        const aiDebounceMs = Number(merged.ai.debounceMs);
        merged.ai.debounceMs = Number.isFinite(aiDebounceMs) && aiDebounceMs >= 0
            ? aiDebounceMs
            : DEFAULT_AI_CONFIG.debounceMs;
        if (typeof merged.allowedAttachmentTypes === 'string') {
            merged.allowedAttachmentTypes = merged.allowedAttachmentTypes
                .split(',')
                .map((part) => part.trim())
                .filter(Boolean);
        } else if (!Array.isArray(merged.allowedAttachmentTypes)) {
            merged.allowedAttachmentTypes = [];
        }
        merged.attachmentSources = normalizeAttachmentSources(merged.attachmentSources);
        merged.multiSelectSeparator = String(merged.multiSelectSeparator === undefined ? ',' : merged.multiSelectSeparator);
        merged.multiSelectDisplaySeparator = String(
            merged.multiSelectDisplaySeparator === undefined || merged.multiSelectDisplaySeparator === null
                ? `${merged.multiSelectSeparator} `
                : merged.multiSelectDisplaySeparator
        );
        merged.showDropdownOnTyping = merged.showDropdownOnTyping !== false;
        merged.showAttachmentDropdownPreview = merged.showAttachmentDropdownPreview !== false;
        merged.allowNumberMath = merged.allowNumberMath === true;
        merged.enableNumberPillStepper = merged.enableNumberPillStepper === true;
        const rawNumberStep = Number(merged.numberPillStep);
        merged.numberPillStep = Number.isFinite(rawNumberStep) && rawNumberStep > 0 ? rawNumberStep : 1;
        if (!merged.multiSelectSeparator) {
            throw new Error('QuickAdd: multiSelectSeparator must be a non-empty string');
        }
        if (
            merged.multiSelectSeparator === merged.fieldTerminator
            || merged.multiSelectSeparator === merged.entrySeparator
            || merged.multiSelectDisplaySeparator === merged.fieldTerminator
            || merged.multiSelectDisplaySeparator === merged.entrySeparator
        ) {
            throw new Error('QuickAdd: multiSelectSeparator and multiSelectDisplaySeparator must differ from fieldTerminator and entrySeparator');
        }
        const promptMode = String(merged.ai.promptMode || 'default').toLowerCase();
        merged.ai.promptMode = promptMode === 'custom' ? 'custom' : 'default';
        merged.ai.promptTemplate = typeof merged.ai.promptTemplate === 'string' ? merged.ai.promptTemplate : '';
        const mode = String(merged.mode || '').toLowerCase();
        if (mode === 'ai' || merged.ai.enabled === true) {
            merged.mode = 'ai';
            merged.ai.enabled = true;
        } else {
            merged.mode = 'deterministic';
            merged.ai.enabled = false;
        }
        return merged;
    }

    function normalizeOption(option) {
        if (option && typeof option === 'object' && !Array.isArray(option)) {
            const value = option.value !== undefined ? option.value : option.label;
            return {
                value: String(value),
                label: String(option.label !== undefined ? option.label : value),
                color: typeof option.color === 'string' ? option.color : null,
                dependsOn: option.dependsOn || null,
                constraints: option.constraints || null
            };
        }
        return {
            value: String(option),
            label: String(option),
            color: null,
            dependsOn: null,
            constraints: null
        };
    }

    function normalizeField(field) {
        const normalized = Object.assign({
            key: '',
            label: '',
            prefixes: [],
            type: 'string',
            options: [],
            required: false,
            multiple: false,
            naturalDate: false,
            allowDateOnly: true,
            defaultValue: undefined,
            defaultTime: DEFAULT_DATETIME_TIME,
            timeFormat: '24h',
            color: null,
            autoDetectWithoutPrefix: false,
            reduceInferredOptions: undefined,
            allowCustom: undefined,
            dependsOn: undefined,
            constraints: undefined,
            allowMathExpression: undefined,
            showNumberStepper: undefined,
            numberStep: undefined
        }, field || {});

        if (typeof normalized.allowCustom !== 'boolean') {
            normalized.allowCustom = false;
        }

        if (typeof normalized.allowDateOnly !== 'boolean') {
            normalized.allowDateOnly = true;
        }

        normalized.defaultTime = normalizeTime24(normalized.defaultTime, DEFAULT_DATETIME_TIME);
        normalized.timeFormat = String(normalized.timeFormat || '24h').toLowerCase() === 'ampm' ? 'ampm' : '24h';

        return normalized;
    }

    function getFieldOptions(field) {
        const source = Array.isArray(field.options) ? field.options : [];
        return source.map(normalizeOption);
    }

    function normalizeSchema(schema, fallbackField) {
        const fields = (schema.fields || []).map(normalizeField).filter((field) => field.key);
        const byKey = {};

        fields.forEach((field) => {
            byKey[field.key] = field;
        });

        if (!byKey[fallbackField]) {
            const fallback = normalizeField({
                key: fallbackField,
                label: fallbackField,
                type: 'string',
                required: false,
                prefixes: []
            });
            byKey[fallbackField] = fallback;
            fields.push(fallback);
        }

        return { fields, byKey };
    }

    function sortPrefixMatchers(schemaFields) {
        const matchers = [];
        schemaFields.forEach((field) => {
            (field.prefixes || []).forEach((prefix) => {
                if (typeof prefix === 'string' && prefix.length > 0) {
                    matchers.push({ prefix, fieldKey: field.key });
                }
            });
        });
        matchers.sort((a, b) => b.prefix.length - a.prefix.length);
        return matchers;
    }

    function isBoundary(text, index) {
        if (index <= 0) {
            return true;
        }
        return /\s/.test(text.charAt(index - 1));
    }

    function matchPrefixAt(text, index, prefixMatchers) {
        if (!isBoundary(text, index)) {
            return null;
        }
        for (let i = 0; i < prefixMatchers.length; i++) {
            const candidate = prefixMatchers[i];
            if (text.startsWith(candidate.prefix, index)) {
                return candidate;
            }
        }
        return null;
    }

    function findNextPrefixIndex(text, fromIndex, prefixMatchers) {
        for (let i = fromIndex; i < text.length; i++) {
            if (matchPrefixAt(text, i, prefixMatchers)) {
                return i;
            }
        }
        return -1;
    }

    function splitEntriesWithPositions(input, separator, escapeChar) {
        const entries = [];

        if (!separator) {
            entries.push({ raw: input, start: 0, end: input.length });
            return entries;
        }

        if (separator === '\n') {
            let start = 0;
            let i = 0;
            while (i < input.length) {
                if (input.charAt(i) === '\n') {
                    entries.push({ raw: input.slice(start, i), start, end: i });
                    i += 1;
                    start = i;
                    continue;
                }
                if (input.charAt(i) === '\r' && input.charAt(i + 1) === '\n') {
                    entries.push({ raw: input.slice(start, i), start, end: i });
                    i += 2;
                    start = i;
                    continue;
                }
                i += 1;
            }
            entries.push({ raw: input.slice(start), start, end: input.length });
            return entries;
        }

        let start = 0;
        let i = 0;
        while (i < input.length) {
            if (escapeChar && input.startsWith(escapeChar + separator, i)) {
                i += escapeChar.length + separator.length;
                continue;
            }
            if (input.startsWith(separator, i)) {
                entries.push({ raw: input.slice(start, i), start, end: i });
                i += separator.length;
                start = i;
                continue;
            }
            i += 1;
        }
        entries.push({ raw: input.slice(start), start, end: input.length });
        return entries;
    }

    function parseBoolean(rawValue) {
        const value = String(rawValue).trim().toLowerCase();
        if (['true', 'yes', '1', 'on'].includes(value)) {
            return { ok: true, value: true };
        }
        if (['false', 'no', '0', 'off'].includes(value)) {
            return { ok: true, value: false };
        }
        return { ok: false, error: 'Invalid boolean value' };
    }

    function toYMD(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function isDateFieldType(type) {
        return type === 'date' || type === 'datetime';
    }

    function isFileFieldType(type) {
        return String(type || '').toLowerCase() === 'file';
    }

    function normalizeTime24(rawValue, fallbackValue) {
        const fallback = String(fallbackValue || DEFAULT_DATETIME_TIME);
        const raw = String(rawValue || '').trim().toLowerCase();
        if (!raw) {
            return fallback;
        }
        const match = raw.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/i);
        if (!match) {
            return fallback;
        }
        let hour = Number(match[1]);
        const minute = match[2] === undefined ? 0 : Number(match[2]);
        const period = match[3] ? match[3].toLowerCase() : '';
        if (Number.isNaN(hour) || Number.isNaN(minute) || minute < 0 || minute > 59) {
            return fallback;
        }
        if (period) {
            if (hour < 1 || hour > 12) {
                return fallback;
            }
            if (period === 'pm' && hour < 12) {
                hour += 12;
            } else if (period === 'am' && hour === 12) {
                hour = 0;
            }
        }
        if (!period && (hour < 0 || hour > 23)) {
            return fallback;
        }
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }

    function formatDateForAria(date) {
        try {
            return date.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (err) {
            return toYMD(date);
        }
    }

    function isRelativeDatePhrase(rawValue) {
        const value = String(rawValue || '').trim().toLowerCase();
        if (!value) {
            return false;
        }
        if (
            value === 'today'
            || value === 'yesterday'
            || value === 'tomorrow'
            || value === 'tonight'
        ) {
            return true;
        }
        if (/^in\s+\d+\s+(day|days|week|weeks|month|months|year|years)$/.test(value)) {
            return true;
        }
        return /\b(next|last|this)\s+(day|week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(value);
    }

    function looksLikeExplicitDateInput(rawValue) {
        const raw = String(rawValue || '').trim();
        if (!raw) {
            return false;
        }
        if (/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(raw)) {
            return true;
        }
        if (/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(raw)) {
            return true;
        }
        if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i.test(raw)) {
            return true;
        }
        if (/\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i.test(raw)) {
            return true;
        }
        return false;
    }

    function hasExplicitTimeToken(rawValue) {
        const raw = String(rawValue || '').trim();
        if (!raw) {
            return false;
        }
        if (/\b\d{1,2}:\d{2}\s*(am|pm)?\b/i.test(raw)) {
            return true;
        }
        return /\b(?:at\s+)?\d{1,2}\s*(am|pm)\b/i.test(raw);
    }

    function normalizeYearNumber(rawYear) {
        const year = Number(rawYear);
        if (Number.isNaN(year)) {
            return null;
        }
        if (String(rawYear).length >= 4) {
            return year;
        }
        if (year >= 0 && year <= 69) {
            return 2000 + year;
        }
        return 1900 + year;
    }

    function parseTimeToken(rawValue) {
        const raw = String(rawValue || '').trim().toLowerCase();
        if (!raw) {
            return { ok: true, value: null };
        }
        const compact = raw.replace(/\s+/g, '');
        const match = compact.match(/^(\d{1,2})(?::(\d{1,2}))?(am|pm)?$/i);
        if (!match) {
            return { ok: false, error: 'Invalid time value' };
        }
        const minute = match[2] === undefined ? '00' : match[2];
        const normalized = normalizeTime24(`${match[1]}:${minute}${match[3] || ''}`, '');
        if (!normalized) {
            return { ok: false, error: 'Invalid time value' };
        }
        return { ok: true, value: normalized };
    }

    function buildExplicitDate(yearRaw, monthRaw, dayRaw) {
        const year = normalizeYearNumber(yearRaw);
        const month = Number(monthRaw);
        const day = Number(dayRaw);
        if (!year || Number.isNaN(month) || Number.isNaN(day)) {
            return null;
        }
        const date = new Date(year, month - 1, day);
        if (
            Number.isNaN(date.getTime())
            || date.getFullYear() !== year
            || date.getMonth() !== month - 1
            || date.getDate() !== day
        ) {
            return null;
        }
        return toYMD(date);
    }

    function parseExplicitDateTimeLiteral(rawValue) {
        const raw = String(rawValue || '').trim();
        if (!raw) {
            return null;
        }
        const monthMap = {
            jan: 1,
            feb: 2,
            mar: 3,
            apr: 4,
            may: 5,
            jun: 6,
            jul: 7,
            aug: 8,
            sep: 9,
            sept: 9,
            oct: 10,
            nov: 11,
            dec: 12
        };

        const dayMonthYear = raw.match(/^(\d{1,2})\s+([a-z]{3,9})\.?,?\s+(\d{2,4})(?:\s+(?:at\s+)?(.+))?$/i);
        if (dayMonthYear) {
            const monthToken = dayMonthYear[2].slice(0, 4).toLowerCase();
            const month = monthMap[monthToken] || monthMap[monthToken.slice(0, 3)];
            if (!month) {
                return null;
            }
            const dateValue = buildExplicitDate(dayMonthYear[3], month, dayMonthYear[1]);
            if (!dateValue) {
                return null;
            }
            const parsedTime = parseTimeToken(dayMonthYear[4] || '');
            if (!parsedTime.ok) {
                return null;
            }
            return { dateValue, timeValue: parsedTime.value, hasTime: !!parsedTime.value };
        }

        const monthDayYear = raw.match(/^([a-z]{3,9})\.?,?\s+(\d{1,2}),?\s+(\d{2,4})(?:\s+(?:at\s+)?(.+))?$/i);
        if (monthDayYear) {
            const monthToken = monthDayYear[1].slice(0, 4).toLowerCase();
            const month = monthMap[monthToken] || monthMap[monthToken.slice(0, 3)];
            if (!month) {
                return null;
            }
            const dateValue = buildExplicitDate(monthDayYear[3], month, monthDayYear[2]);
            if (!dateValue) {
                return null;
            }
            const parsedTime = parseTimeToken(monthDayYear[4] || '');
            if (!parsedTime.ok) {
                return null;
            }
            return { dateValue, timeValue: parsedTime.value, hasTime: !!parsedTime.value };
        }

        const yearFirst = raw.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})(?:\s+(?:at\s+)?(.+))?$/i);
        if (yearFirst) {
            const dateValue = buildExplicitDate(yearFirst[1], yearFirst[2], yearFirst[3]);
            if (!dateValue) {
                return null;
            }
            const parsedTime = parseTimeToken(yearFirst[4] || '');
            if (!parsedTime.ok) {
                return null;
            }
            return { dateValue, timeValue: parsedTime.value, hasTime: !!parsedTime.value };
        }

        const dayOrMonthFirst = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:\s+(?:at\s+)?(.+))?$/i);
        if (dayOrMonthFirst) {
            const first = Number(dayOrMonthFirst[1]);
            const second = Number(dayOrMonthFirst[2]);
            if (Number.isNaN(first) || Number.isNaN(second)) {
                return null;
            }
            let day = first;
            let month = second;
            if (day <= 12 && month > 12) {
                day = second;
                month = first;
            }
            const dateValue = buildExplicitDate(dayOrMonthFirst[3], month, day);
            if (!dateValue) {
                return null;
            }
            const parsedTime = parseTimeToken(dayOrMonthFirst[4] || '');
            if (!parsedTime.ok) {
                return null;
            }
            return { dateValue, timeValue: parsedTime.value, hasTime: !!parsedTime.value };
        }

        return null;
    }

    function parseDate(rawValue, naturalDate) {
        const raw = String(rawValue).trim();
        const value = raw.toLowerCase();
        if (!value) {
            return { ok: false, error: 'Missing date value' };
        }

        const strict = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (strict) {
            return { ok: true, value: `${strict[1]}-${strict[2]}-${strict[3]}` };
        }

        const explicitDate = parseExplicitDateTimeLiteral(raw);
        if (explicitDate && explicitDate.dateValue) {
            return { ok: true, value: explicitDate.dateValue };
        }

        const allowLooseDate = naturalDate || looksLikeExplicitDateInput(raw);
        if (allowLooseDate) {
            const now = new Date();
            const isRelative = isRelativeDatePhrase(raw);

            const chrono = (typeof globalThis !== 'undefined' && globalThis.chrono && typeof globalThis.chrono.parseDate === 'function')
                ? globalThis.chrono
                : null;
            if (chrono) {
                const chronoDate = chrono.parseDate(raw, now, { forwardDate: true });
                if (chronoDate && !Number.isNaN(chronoDate.getTime())) {
                    if (naturalDate || !isRelative) {
                        return { ok: true, value: toYMD(chronoDate) };
                    }
                }
            }

            const parsedNatural = new Date(raw);
            if (!Number.isNaN(parsedNatural.getTime()) && (naturalDate || !isRelative)) {
                return { ok: true, value: toYMD(parsedNatural) };
            }
        }

        if (naturalDate) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (value === 'today') {
                return { ok: true, value: toYMD(today) };
            }
            if (value === 'yesterday') {
                const d = new Date(today);
                d.setDate(d.getDate() - 1);
                return { ok: true, value: toYMD(d) };
            }
            if (value === 'tomorrow') {
                const d = new Date(today);
                d.setDate(d.getDate() + 1);
                return { ok: true, value: toYMD(d) };
            }

            const inDays = value.match(/^in\s+(\d+)\s+days?$/);
            if (inDays) {
                const d = new Date(today);
                d.setDate(d.getDate() + parseInt(inDays[1], 10));
                return { ok: true, value: toYMD(d) };
            }

            const inWeeks = value.match(/^in\s+(\d+)\s+weeks?$/);
            if (inWeeks) {
                const d = new Date(today);
                d.setDate(d.getDate() + parseInt(inWeeks[1], 10) * 7);
                return { ok: true, value: toYMD(d) };
            }

            if (value === 'next week') {
                const d = new Date(today);
                d.setDate(d.getDate() + 7);
                return { ok: true, value: toYMD(d) };
            }
            if (value === 'next month') {
                const d = new Date(today);
                d.setMonth(d.getMonth() + 1);
                return { ok: true, value: toYMD(d) };
            }
            if (value === 'next year') {
                const d = new Date(today);
                d.setFullYear(d.getFullYear() + 1);
                return { ok: true, value: toYMD(d) };
            }
        }

        return { ok: false, error: 'Date must be a valid date (for example YYYY-MM-DD or 23 Feb 2026)' };
    }

    function parseDateTime(rawValue, naturalDate, options) {
        const opts = options || {};
        const allowDateOnly = opts.allowDateOnly !== false;
        const defaultTime = normalizeTime24(opts.defaultTime, DEFAULT_DATETIME_TIME);
        const raw = String(rawValue || '').trim();
        if (!raw) {
            return { ok: false, error: 'Missing datetime value' };
        }

        const strictDateTime = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::\d{2})?$/);
        if (strictDateTime) {
            const dateValue = `${strictDateTime[1]}-${strictDateTime[2]}-${strictDateTime[3]}`;
            const timeValue = normalizeTime24(`${strictDateTime[4]}:${strictDateTime[5]}`, defaultTime);
            if (!fromYMD(dateValue)) {
                return { ok: false, error: 'Invalid date value' };
            }
            return {
                ok: true,
                value: `${dateValue}T${timeValue}`,
                dateValue,
                timeValue
            };
        }

        const strictDateTimeAmPm = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{1,2})(?::(\d{1,2}))?\s*(am|pm)$/i);
        if (strictDateTimeAmPm) {
            const dateValue = `${strictDateTimeAmPm[1]}-${strictDateTimeAmPm[2]}-${strictDateTimeAmPm[3]}`;
            const minuteRaw = strictDateTimeAmPm[5] !== undefined ? strictDateTimeAmPm[5] : '00';
            const timeValue = normalizeTime24(`${strictDateTimeAmPm[4]}:${minuteRaw}${strictDateTimeAmPm[6]}`, defaultTime);
            if (!fromYMD(dateValue)) {
                return { ok: false, error: 'Invalid date value' };
            }
            return {
                ok: true,
                value: `${dateValue}T${timeValue}`,
                dateValue,
                timeValue
            };
        }

        const strictDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (strictDate) {
            if (!allowDateOnly) {
                return { ok: false, error: 'Datetime must include time (YYYY-MM-DDTHH:mm)' };
            }
            const dateValue = `${strictDate[1]}-${strictDate[2]}-${strictDate[3]}`;
            if (!fromYMD(dateValue)) {
                return { ok: false, error: 'Invalid date value' };
            }
            return {
                ok: true,
                value: `${dateValue}T${defaultTime}`,
                dateValue,
                timeValue: defaultTime,
                impliedTime: true
            };
        }

        const explicitDateTime = parseExplicitDateTimeLiteral(raw);
        if (explicitDateTime && explicitDateTime.dateValue) {
            if (!allowDateOnly && !explicitDateTime.hasTime) {
                return { ok: false, error: 'Datetime must include time' };
            }
            const timeValue = explicitDateTime.hasTime ? explicitDateTime.timeValue : defaultTime;
            return {
                ok: true,
                value: `${explicitDateTime.dateValue}T${timeValue}`,
                dateValue: explicitDateTime.dateValue,
                timeValue,
                impliedTime: !explicitDateTime.hasTime
            };
        }

        if (naturalDate) {
            const withTimeSuffix = raw.match(/^(.+?)\s+(?:at\s+)?(\d{1,2}(?::\d{1,2})?\s*(?:am|pm))$/i);
            if (withTimeSuffix) {
                const parsedDate = parseDate(withTimeSuffix[1], true);
                const parsedTime = parseTimeToken(withTimeSuffix[2]);
                if (parsedDate.ok && parsedTime.ok && parsedTime.value) {
                    return {
                        ok: true,
                        value: `${parsedDate.value}T${parsedTime.value}`,
                        dateValue: parsedDate.value,
                        timeValue: parsedTime.value,
                        impliedTime: false
                    };
                }
            }
        }

        const allowLooseDateTime = naturalDate || looksLikeExplicitDateInput(raw) || hasExplicitTimeToken(raw);
        if (allowLooseDateTime) {
            const now = new Date();
            const isRelative = isRelativeDatePhrase(raw);
            const chrono = (typeof globalThis !== 'undefined' && globalThis.chrono)
                ? globalThis.chrono
                : null;
            if (chrono && typeof chrono.parse === 'function') {
                const parsed = chrono.parse(raw, now, { forwardDate: true });
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].start && typeof parsed[0].start.date === 'function') {
                    const ref = parsed[0];
                    const date = ref.start.date();
                    const hasHour = typeof ref.start.isCertain === 'function' ? ref.start.isCertain('hour') : false;
                    const hasMinute = typeof ref.start.isCertain === 'function' ? ref.start.isCertain('minute') : false;
                    if (!naturalDate && isRelative) {
                        return { ok: false, error: 'Datetime must use an explicit date when naturalDate is disabled' };
                    }
                    if (!allowDateOnly && !(hasHour || hasMinute)) {
                        return { ok: false, error: 'Datetime must include time' };
                    }
                    const timeValue = (hasHour || hasMinute)
                        ? normalizeTime24(`${date.getHours()}:${date.getMinutes()}`, defaultTime)
                        : defaultTime;
                    const dateValue = toYMD(date);
                    return {
                        ok: true,
                        value: `${dateValue}T${timeValue}`,
                        dateValue,
                        timeValue,
                        impliedTime: !(hasHour || hasMinute)
                    };
                }
            }

            const parsedNative = new Date(raw);
            if (!Number.isNaN(parsedNative.getTime())) {
                if (!naturalDate && isRelative) {
                    return { ok: false, error: 'Datetime must use an explicit date when naturalDate is disabled' };
                }
                const hasExplicitTime = hasExplicitTimeToken(raw);
                if (!allowDateOnly && !hasExplicitTime) {
                    return { ok: false, error: 'Datetime must include time' };
                }
                const dateValue = toYMD(parsedNative);
                const timeValue = hasExplicitTime
                    ? normalizeTime24(`${parsedNative.getHours()}:${parsedNative.getMinutes()}`, defaultTime)
                    : defaultTime;
                return {
                    ok: true,
                    value: `${dateValue}T${timeValue}`,
                    dateValue,
                    timeValue,
                    impliedTime: !hasExplicitTime
                };
            }

            const parsedDate = parseDate(raw, naturalDate || looksLikeExplicitDateInput(raw));
            if (parsedDate.ok && allowDateOnly) {
                return {
                    ok: true,
                    value: `${parsedDate.value}T${defaultTime}`,
                    dateValue: parsedDate.value,
                    timeValue: defaultTime,
                    impliedTime: true
                };
            }
        }

        return { ok: false, error: 'Datetime must be valid (for example YYYY-MM-DDTHH:mm or 23 Feb 2026 at 3pm)' };
    }

    function parseFieldDateValue(field, rawValue) {
        if (!field || !isDateFieldType(field.type)) {
            return { ok: false, error: 'Not a date field' };
        }
        if (field.type === 'datetime') {
            return parseDateTime(rawValue, !!field.naturalDate, field);
        }
        const parsed = parseDate(rawValue, !!field.naturalDate);
        if (!parsed.ok) {
            return parsed;
        }
        return {
            ok: true,
            value: parsed.value,
            dateValue: parsed.value
        };
    }

    function fromYMD(value) {
        const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) {
            return null;
        }
        const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        if (Number.isNaN(date.getTime())) {
            return null;
        }
        return date;
    }

    function daysInMonth(year, monthIndex) {
        return new Date(year, monthIndex + 1, 0).getDate();
    }

    function parseOption(field, rawValue) {
        const value = String(rawValue).trim();
        const options = getFieldOptions(field);
        const matched = options.find((option) =>
            option.value.toLowerCase() === value.toLowerCase() ||
            option.label.toLowerCase() === value.toLowerCase()
        );

        if (matched) {
            return { ok: true, value: matched.value };
        }

        if (field.allowCustom) {
            return { ok: true, value };
        }

        return { ok: false, error: `Invalid option for ${field.key}` };
    }

    function dedupeMultiValues(values) {
        const seen = new Set();
        const output = [];
        (Array.isArray(values) ? values : []).forEach((item) => {
            const text = String(item === undefined || item === null ? '' : item).trim();
            if (!text) {
                return;
            }
            const key = normValue(text);
            if (seen.has(key)) {
                return;
            }
            seen.add(key);
            output.push(text);
        });
        return output;
    }

    function normalizeMultiValues(rawValue, separator) {
        if (Array.isArray(rawValue)) {
            return dedupeMultiValues(rawValue);
        }
        const text = String(rawValue || '');
        if (!separator) {
            return dedupeMultiValues(text.split(','));
        }
        return dedupeMultiValues(text.split(String(separator)));
    }

    function splitByMultiSeparator(rawValue, separator) {
        return normalizeMultiValues(rawValue, separator);
    }

    function evaluateMathExpression(rawValue) {
        const source = String(rawValue || '').trim();
        if (!source) {
            return { ok: false, error: 'Empty math expression' };
        }
        const tokens = [];
        let i = 0;
        while (i < source.length) {
            const ch = source.charAt(i);
            if (/\s/.test(ch)) {
                i += 1;
                continue;
            }
            if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '(' || ch === ')') {
                tokens.push(ch);
                i += 1;
                continue;
            }
            if (/\d|\./.test(ch)) {
                const start = i;
                let dotCount = ch === '.' ? 1 : 0;
                i += 1;
                while (i < source.length) {
                    const next = source.charAt(i);
                    if (next === '.') {
                        dotCount += 1;
                        if (dotCount > 1) {
                            return { ok: false, error: 'Invalid decimal expression' };
                        }
                        i += 1;
                        continue;
                    }
                    if (/\d/.test(next)) {
                        i += 1;
                        continue;
                    }
                    break;
                }
                const rawNumber = source.slice(start, i);
                if (rawNumber === '.' || rawNumber === '+.' || rawNumber === '-.') {
                    return { ok: false, error: 'Invalid number in expression' };
                }
                const parsedNumber = Number(rawNumber);
                if (!Number.isFinite(parsedNumber)) {
                    return { ok: false, error: 'Invalid number in expression' };
                }
                tokens.push(parsedNumber);
                continue;
            }
            return { ok: false, error: 'Expression contains unsupported characters' };
        }

        let cursor = 0;
        const peek = () => tokens[cursor];
        const consume = () => {
            const token = tokens[cursor];
            cursor += 1;
            return token;
        };

        const parsePrimary = () => {
            const token = peek();
            if (typeof token === 'number') {
                consume();
                return { ok: true, value: token };
            }
            if (token === '(') {
                consume();
                const nested = parseExpression();
                if (!nested.ok) {
                    return nested;
                }
                if (peek() !== ')') {
                    return { ok: false, error: 'Mismatched parentheses in expression' };
                }
                consume();
                return nested;
            }
            return { ok: false, error: 'Invalid expression' };
        };

        const parseUnary = () => {
            const token = peek();
            if (token === '+') {
                consume();
                return parseUnary();
            }
            if (token === '-') {
                consume();
                const next = parseUnary();
                if (!next.ok) {
                    return next;
                }
                return { ok: true, value: -next.value };
            }
            return parsePrimary();
        };

        const parseTerm = () => {
            let left = parseUnary();
            if (!left.ok) {
                return left;
            }
            while (peek() === '*' || peek() === '/') {
                const op = consume();
                const right = parseUnary();
                if (!right.ok) {
                    return right;
                }
                if (op === '*') {
                    left = { ok: true, value: left.value * right.value };
                } else {
                    if (right.value === 0) {
                        return { ok: false, error: 'Division by zero is not allowed' };
                    }
                    left = { ok: true, value: left.value / right.value };
                }
            }
            return left;
        };

        function parseExpression() {
            let left = parseTerm();
            if (!left.ok) {
                return left;
            }
            while (peek() === '+' || peek() === '-') {
                const op = consume();
                const right = parseTerm();
                if (!right.ok) {
                    return right;
                }
                left = {
                    ok: true,
                    value: op === '+'
                        ? left.value + right.value
                        : left.value - right.value
                };
            }
            return left;
        }

        const resolved = parseExpression();
        if (!resolved.ok) {
            return resolved;
        }
        if (cursor !== tokens.length) {
            return { ok: false, error: 'Invalid trailing expression' };
        }
        if (!Number.isFinite(resolved.value)) {
            return { ok: false, error: 'Expression did not resolve to a finite number' };
        }
        return { ok: true, value: resolved.value };
    }

    function parseByType(field, rawValue, config) {
        const value = String(rawValue).trim();
        const multiSelectSeparator = String((config && config.multiSelectSeparator) || ',');

        if (field.type === 'string') {
            return { ok: true, value };
        }

        if (field.type === 'number') {
            const allowMath = !!(
                (field && field.allowMathExpression === true)
                || (config && config.allowNumberMath === true)
            );
            if (allowMath) {
                const evaluated = evaluateMathExpression(value);
                if (evaluated.ok) {
                    return { ok: true, value: evaluated.value };
                }
            }
            const parsed = Number(value);
            if (Number.isNaN(parsed)) {
                return { ok: false, error: `Invalid number for ${field.key}` };
            }
            return { ok: true, value: parsed };
        }

        if (field.type === 'options') {
            if (field.multiple) {
                const segments = normalizeMultiValues(rawValue, multiSelectSeparator);
                if (segments.length === 0) {
                    return { ok: false, error: `Invalid option for ${field.key}` };
                }
                const parsedValues = [];
                for (let i = 0; i < segments.length; i++) {
                    const parsedOption = parseOption(field, segments[i]);
                    if (!parsedOption.ok) {
                        return parsedOption;
                    }
                    if (!parsedValues.some((item) => normValue(item) === normValue(parsedOption.value))) {
                        parsedValues.push(parsedOption.value);
                    }
                }
                return { ok: true, value: parsedValues };
            }
            return parseOption(field, value);
        }

        if (field.type === 'date') {
            return parseDate(value, !!field.naturalDate);
        }

        if (field.type === 'datetime') {
            return parseDateTime(value, !!field.naturalDate, field);
        }

        if (field.type === 'boolean') {
            return parseBoolean(value);
        }

        if (isFileFieldType(field.type)) {
            if (field.multiple) {
                return { ok: true, value: normalizeMultiValues(rawValue, multiSelectSeparator) };
            }
            return { ok: true, value };
        }

        return { ok: true, value };
    }

    function parseDefaultValueByType(field, config) {
        if (!field || field.defaultValue === undefined || field.defaultValue === null || field.defaultValue === '') {
            return { ok: false };
        }
        if (field.multiple) {
            const rawValues = Array.isArray(field.defaultValue)
                ? field.defaultValue
                : splitByMultiSeparator(field.defaultValue, String((config && config.multiSelectSeparator) || ','));
            const parsed = [];
            for (let i = 0; i < rawValues.length; i++) {
                const next = parseByType(Object.assign({}, field, { multiple: false }), rawValues[i], config);
                if (!next.ok) {
                    return { ok: false, error: next.error };
                }
                if (!parsed.some((item) => normValue(item) === normValue(next.value))) {
                    parsed.push(next.value);
                }
            }
            return parsed.length ? { ok: true, value: parsed } : { ok: false };
        }
        return parseByType(field, field.defaultValue, config);
    }

    function toValueArray(raw) {
        if (Array.isArray(raw)) {
            return raw.filter((item) => item !== undefined && item !== null);
        }
        if (raw === undefined || raw === null) {
            return [];
        }
        return [raw];
    }

    function primitiveForCompare(value) {
        if (value === undefined || value === null) {
            return null;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return value;
        }
        const str = String(value).trim();
        if (!str) {
            return '';
        }
        const lower = str.toLowerCase();
        if (lower === 'true') {
            return true;
        }
        if (lower === 'false') {
            return false;
        }
        const num = Number(str);
        if (!Number.isNaN(num) && str.match(/^-?\d+(\.\d+)?$/)) {
            return num;
        }
        const t = Date.parse(str);
        if (!Number.isNaN(t) && str.match(/^\d{4}-\d{2}-\d{2}/)) {
            return t;
        }
        return lower;
    }

    function valuesForField(fields, fieldKey) {
        if (!fields || !fieldKey) {
            return [];
        }
        return toValueArray(fields[fieldKey]).map((value) => primitiveForCompare(value));
    }

    function compareWithOp(actualValues, opRaw, expectedRaw) {
        const op = (opRaw || 'eq').toLowerCase();
        const expected = primitiveForCompare(expectedRaw);
        const expectedList = toValueArray(expectedRaw).map((value) => primitiveForCompare(value));

        if (op === 'exists') {
            return actualValues.length > 0;
        }

        if (op === 'notexists') {
            return actualValues.length === 0;
        }

        if (actualValues.length === 0) {
            return false;
        }

        if (op === 'eq') {
            return actualValues.some((actual) => actual === expected);
        }
        if (op === 'neq') {
            return actualValues.every((actual) => actual !== expected);
        }
        if (op === 'in') {
            return actualValues.some((actual) => expectedList.includes(actual));
        }
        if (op === 'notin') {
            return actualValues.every((actual) => !expectedList.includes(actual));
        }
        if (op === 'includes') {
            return actualValues.some((actual) => String(actual || '').includes(String(expected || '')));
        }
        if (op === 'gt') {
            return actualValues.some((actual) => Number(actual) > Number(expected));
        }
        if (op === 'gte') {
            return actualValues.some((actual) => Number(actual) >= Number(expected));
        }
        if (op === 'lt') {
            return actualValues.some((actual) => Number(actual) < Number(expected));
        }
        if (op === 'lte') {
            return actualValues.some((actual) => Number(actual) <= Number(expected));
        }
        return actualValues.some((actual) => actual === expected);
    }

    function normalizeRuleList(raw) {
        if (raw === undefined || raw === null) {
            return [];
        }
        return Array.isArray(raw) ? raw : [raw];
    }

    function normalizeRuleField(ruleField, selfFieldKey) {
        if (!ruleField || ruleField === '$self' || ruleField === 'self') {
            return selfFieldKey;
        }
        return ruleField;
    }

    function getRuleActualValues(rule, fields, context) {
        const ref = normalizeRuleField(rule.field, context.selfFieldKey);
        if (ref === context.selfFieldKey && context.selfValue !== undefined) {
            return [primitiveForCompare(context.selfValue)];
        }
        return valuesForField(fields, ref);
    }

    function dependencyRuleMatches(rule, fields, context) {
        const ctx = context || { selfFieldKey: '', selfValue: undefined };
        if (!rule) {
            return true;
        }

        if (Array.isArray(rule)) {
            return rule.every((item) => dependencyRuleMatches(item, fields, ctx));
        }

        if (typeof rule !== 'object') {
            return !!rule;
        }

        if (Array.isArray(rule.and)) {
            return rule.and.every((item) => dependencyRuleMatches(item, fields, ctx));
        }
        if (Array.isArray(rule.or)) {
            return rule.or.some((item) => dependencyRuleMatches(item, fields, ctx));
        }
        if (rule.not !== undefined) {
            return !dependencyRuleMatches(rule.not, fields, ctx);
        }

        if (!rule.field && !rule.op) {
            return true;
        }

        const actualValues = getRuleActualValues(rule, fields, ctx);
        return compareWithOp(actualValues, rule.op, rule.value);
    }

    function humanOp(opRaw) {
        const op = (opRaw || 'eq').toLowerCase();
        if (op === 'eq') return 'is';
        if (op === 'neq') return 'is not';
        if (op === 'in') return 'is one of';
        if (op === 'notin') return 'is not one of';
        if (op === 'includes') return 'contains';
        if (op === 'gt') return 'is greater than';
        if (op === 'gte') return 'is on or after / at least';
        if (op === 'lt') return 'is less than';
        if (op === 'lte') return 'is on or before / at most';
        if (op === 'exists') return 'is set';
        if (op === 'notexists') return 'is not set';
        return op;
    }

    function humanValue(value) {
        if (Array.isArray(value)) {
            return value.join(', ');
        }
        return String(value);
    }

    function formatRuleTemplate(template, vars) {
        return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
            if (Object.prototype.hasOwnProperty.call(vars, key)) {
                return String(vars[key]);
            }
            return '';
        });
    }

    function pickNonEmptyText() {
        for (let i = 0; i < arguments.length; i++) {
            const val = arguments[i];
            if (typeof val !== 'string') {
                continue;
            }
            const trimmed = val.trim();
            if (trimmed) {
                return trimmed;
            }
        }
        return '';
    }

    function dependencyReason(rule, context) {
        const ctx = context || { selfFieldKey: '' };
        if (!rule) {
            return 'constraint not met';
        }
        if (Array.isArray(rule)) {
            return rule.map((item) => dependencyReason(item, ctx)).join(' and ');
        }
        if (typeof rule !== 'object') {
            return 'constraint not met';
        }
        if (Array.isArray(rule.and)) {
            return rule.and.map((item) => dependencyReason(item, ctx)).join(' and ');
        }
        if (Array.isArray(rule.or)) {
            return `(${rule.or.map((item) => dependencyReason(item, ctx)).join(' or ')})`;
        }
        if (rule.not !== undefined) {
            return `not (${dependencyReason(rule.not, ctx)})`;
        }

        const fieldRef = normalizeRuleField(rule.field, ctx.selfFieldKey);
        const fieldLabel = fieldRef === ctx.selfFieldKey ? 'this field' : fieldRef;
        const op = (rule.op || 'eq').toLowerCase();
        if (op === 'exists' || op === 'notexists') {
            return `${fieldLabel} ${humanOp(op)}`;
        }
        return `${fieldLabel} ${humanOp(op)} ${humanValue(rule.value)}`;
    }

    function evaluateRuleSet(rulesRaw, fields, context) {
        const ctx = context || { selfFieldKey: '', selfValue: undefined };
        const rules = normalizeRuleList(rulesRaw);
        for (let i = 0; i < rules.length; i++) {
            const rawRule = rules[i];
            if (!rawRule || typeof rawRule !== 'object') {
                continue;
            }

            const whenRule = rawRule.when;
            if (whenRule && !dependencyRuleMatches(whenRule, fields, ctx)) {
                continue;
            }

            const targetRule = rawRule.then && typeof rawRule.then === 'object'
                ? rawRule.then
                : rawRule;

            const ok = dependencyRuleMatches(targetRule, fields, ctx);
            if (ok) {
                continue;
            }

            const messageVars = {
                field: normalizeRuleField(targetRule.field, ctx.selfFieldKey) || ctx.selfFieldKey,
                op: humanOp(targetRule.op),
                value: humanValue(targetRule.value),
                self_field: ctx.selfFieldKey
            };
            const customMessage = pickNonEmptyText(
                rawRule.message,
                rawRule.reason,
                targetRule.message,
                targetRule.reason
            );
            if (customMessage) {
                return { ok: false, reason: formatRuleTemplate(customMessage, messageVars) };
            }

            const prefix = rules.length > 1 ? `Constraint ${i + 1}: ` : '';
            if (whenRule) {
                return {
                    ok: false,
                    reason: `${prefix}When ${dependencyReason(whenRule, ctx)}, ${dependencyReason(targetRule, ctx)}`
                };
            }
            return { ok: false, reason: `${prefix}${dependencyReason(targetRule, ctx)}` };
        }
        return { ok: true, reason: '' };
    }

    function findOptionByParsedValue(field, parsedValue) {
        const options = getFieldOptions(field);
        const target = String(parsedValue).toLowerCase();
        return options.find((option) => option.value.toLowerCase() === target) || null;
    }

    function evaluateFieldDependency(field, parsedValue, fields) {
        if (!field) {
            return { ok: true, reason: '' };
        }
        const context = { selfFieldKey: field.key, selfValue: parsedValue };
        const fieldRule = field.dependsOn;
        const fieldRuleResult = evaluateRuleSet(fieldRule, fields, context);
        if (!fieldRuleResult.ok) {
            return fieldRuleResult;
        }
        const selfConstraints = field.constraints;
        const selfRuleResult = evaluateRuleSet(selfConstraints, fields, context);
        if (!selfRuleResult.ok) {
            return selfRuleResult;
        }

        if (field.type === 'options') {
            const option = findOptionByParsedValue(field, parsedValue);
            const optionRule = option && option.dependsOn ? option.dependsOn : null;
            const optionRuleResult = evaluateRuleSet(optionRule, fields, context);
            if (!optionRuleResult.ok) {
                return optionRuleResult;
            }
            const optionConstraints = option ? option.constraints : null;
            const optionConstraintResult = evaluateRuleSet(optionConstraints, fields, context);
            if (!optionConstraintResult.ok) {
                return optionConstraintResult;
            }
        }

        return { ok: true, reason: '' };
    }

    function removeFieldValueFromFields(fields, field, key, value) {
        const current = fields[key];
        if (current === undefined) {
            return;
        }
        if (field && field.multiple) {
            if (!Array.isArray(current)) {
                return;
            }
            const idx = current.findIndex((item) => String(item).toLowerCase() === String(value).toLowerCase());
            if (idx >= 0) {
                current.splice(idx, 1);
            }
            if (current.length === 0) {
                delete fields[key];
            }
            return;
        }

        if (String(current).toLowerCase() === String(value).toLowerCase()) {
            delete fields[key];
        }
    }

    function applyDependencyConstraints(entry, normalizedSchema, config) {
        entry.blocked = [];
        const blockedInferredIds = new Set();
        let blockedCount = 0;

        entry.tokens.forEach((token) => {
            if (token.kind !== 'field' || !token.committed || !token.value) {
                return;
            }
            const field = normalizedSchema.byKey[token.key];
            if (!field) {
                return;
            }
            const parsed = parseByType(field, token.value, config);
            if (!parsed.ok) {
                return;
            }
            const values = field.multiple && Array.isArray(parsed.value) ? parsed.value : [parsed.value];
            values.forEach((nextParsedValue) => {
                const allowed = evaluateFieldDependency(field, nextParsedValue, entry.fields);
                if (allowed.ok) {
                    return;
                }
                removeFieldValueFromFields(entry.fields, field, token.key, nextParsedValue);
                entry.blocked.push({
                    id: `blk_${entry.index}_${blockedCount++}`,
                    fieldKey: token.key,
                    value: nextParsedValue,
                    source: 'explicit',
                    tokenId: token.id,
                    reason: allowed.reason,
                    globalStart: token.globalStart,
                    globalEnd: token.globalEnd
                });
            });
        });

        (entry.inferred || []).forEach((inf) => {
            const field = normalizedSchema.byKey[inf.fieldKey];
            if (!field) {
                return;
            }
            const allowed = evaluateFieldDependency(field, inf.value, entry.fields);
            if (allowed.ok) {
                return;
            }
            removeFieldValueFromFields(entry.fields, field, inf.fieldKey, inf.value);
            blockedInferredIds.add(inf.id);
            entry.blocked.push({
                id: `blk_${entry.index}_${blockedCount++}`,
                fieldKey: inf.fieldKey,
                value: inf.value,
                source: 'inferred',
                reason: allowed.reason,
                globalStart: inf.globalStart,
                globalEnd: inf.globalEnd
            });
        });

        entry.inferred = (entry.inferred || []).filter((inf) => !blockedInferredIds.has(inf.id));

        Object.keys(normalizedSchema.byKey).forEach((fieldKey) => {
            const field = normalizedSchema.byKey[fieldKey];
            if (!field || field.multiple) {
                return;
            }
            if (entry.fields[fieldKey] !== undefined) {
                return;
            }

            for (let i = entry.tokens.length - 1; i >= 0; i--) {
                const token = entry.tokens[i];
                if (token.kind !== 'field' || !token.committed || token.key !== fieldKey || !token.value) {
                    continue;
                }
                const parsed = parseByType(field, token.value, config);
                if (!parsed.ok) {
                    continue;
                }
                const nextParsedValue = Array.isArray(parsed.value) ? parsed.value[0] : parsed.value;
                const trialFields = Object.assign({}, entry.fields, { [fieldKey]: nextParsedValue });
                const allowed = evaluateFieldDependency(field, nextParsedValue, trialFields);
                if (!allowed.ok) {
                    continue;
                }
                entry.fields[fieldKey] = nextParsedValue;
                break;
            }
        });

        return entry;
    }

    function appendFieldValue(fields, field, key, value) {
        if (!field) {
            return;
        }

        if (field.multiple) {
            if (!Array.isArray(fields[key])) {
                fields[key] = [];
            }
            const exists = fields[key].some((item) => normValue(item) === normValue(value));
            if (!exists) {
                fields[key].push(value);
            }
            return;
        }

        fields[key] = value;
    }

    function isWordChar(ch) {
        return /[A-Za-z0-9]/.test(ch || '');
    }

    function normalizeMatchThreshold(value, fallback) {
        if (typeof value !== 'number' || Number.isNaN(value)) {
            return fallback;
        }
        const normalized = value > 1 ? value / 100 : value;
        if (!Number.isFinite(normalized)) {
            return fallback;
        }
        return Math.min(1, Math.max(0, normalized));
    }

    function findBoundaryMatches(text, phrase) {
        const out = [];
        if (!phrase) {
            return out;
        }
        const hay = String(text || '');
        const needle = String(phrase || '').trim();
        if (!needle) {
            return out;
        }

        const hayLower = hay.toLowerCase();
        const needleLower = needle.toLowerCase();
        let from = 0;

        while (from < hayLower.length) {
            const at = hayLower.indexOf(needleLower, from);
            if (at === -1) {
                break;
            }
            const end = at + needle.length;
            const before = at > 0 ? hay.charAt(at - 1) : '';
            const after = end < hay.length ? hay.charAt(end) : '';
            const goodLeft = at === 0 || !isWordChar(before);
            const goodRight = end === hay.length || !isWordChar(after);
            if (goodLeft && goodRight) {
                out.push({ start: at, end });
            }
            from = at + 1;
        }

        return out;
    }

    function tokenizeWordSpans(text) {
        const out = [];
        const regex = /[A-Za-z0-9]+/g;
        const hay = String(text || '');
        let match;
        while ((match = regex.exec(hay))) {
            out.push({
                value: match[0],
                start: match.index,
                end: match.index + match[0].length
            });
        }
        return out;
    }

    function levenshteinDistance(a, b) {
        const left = String(a || '');
        const right = String(b || '');
        const leftLen = left.length;
        const rightLen = right.length;
        if (!leftLen) {
            return rightLen;
        }
        if (!rightLen) {
            return leftLen;
        }

        const prev = new Array(rightLen + 1);
        for (let j = 0; j <= rightLen; j++) {
            prev[j] = j;
        }

        for (let i = 1; i <= leftLen; i++) {
            let next = i;
            let prevDiag = i - 1;
            for (let j = 1; j <= rightLen; j++) {
                const prevValue = prev[j];
                const cost = left.charAt(i - 1) === right.charAt(j - 1) ? 0 : 1;
                const insert = next + 1;
                const remove = prevValue + 1;
                const replace = prevDiag + cost;
                next = Math.min(insert, remove, replace);
                prevDiag = prevValue;
                prev[j] = next;
            }
        }

        return prev[rightLen];
    }

    function similarityScore(a, b) {
        const left = String(a || '');
        const right = String(b || '');
        const maxLen = Math.max(left.length, right.length);
        if (!maxLen) {
            return 1;
        }
        const distance = levenshteinDistance(left, right);
        return Math.max(0, 1 - distance / maxLen);
    }

    function findFuzzyMatches(text, phrase, threshold) {
        const out = [];
        const needle = String(phrase || '').trim();
        if (!needle) {
            return out;
        }
        const needleTokens = tokenizeWordSpans(needle);
        if (!needleTokens.length) {
            return out;
        }
        const hayTokens = tokenizeWordSpans(text);
        if (!hayTokens.length) {
            return out;
        }

        const needlePhrase = needleTokens.map((token) => token.value.toLowerCase()).join(' ');
        const needleCount = needleTokens.length;

        if (needleCount === 1) {
            hayTokens.forEach((token) => {
                const score = similarityScore(token.value.toLowerCase(), needlePhrase);
                if (score >= threshold) {
                    out.push({ start: token.start, end: token.end, score });
                }
            });
            return out;
        }

        for (let i = 0; i <= hayTokens.length - needleCount; i++) {
            const slice = hayTokens.slice(i, i + needleCount);
            const candidate = slice.map((token) => token.value.toLowerCase()).join(' ');
            const score = similarityScore(candidate, needlePhrase);
            if (score >= threshold) {
                out.push({ start: slice[0].start, end: slice[slice.length - 1].end, score });
            }
        }

        return out;
    }

    function applyRequiredValidation(entry, normalizedSchema) {
        const nextErrors = entry.errors.filter((error) => !error.startsWith('Missing required field: '));

        normalizedSchema.fields.forEach((field) => {
            if (!field.required) {
                return;
            }

            const value = entry.fields[field.key];
            const hasValue = Array.isArray(value)
                ? value.length > 0
                : value !== undefined && value !== null && String(value).trim() !== '';

            if (!hasValue) {
                nextErrors.push(`Missing required field: ${field.key}`);
            }
        });

        entry.errors = nextErrors;
        entry.isValid = entry.errors.length === 0 && entry.pending.length === 0;
        return entry;
    }

    function parseEntry(rawEntry, config, normalizedSchema, prefixMatchers, entryIndex, globalStart) {
        const fieldTerminator = config.fieldTerminator || '';
        const terminatorMode = config.fieldTerminatorMode || 'strict';
        const escapeChar = config.escapeChar || '\\';
        const fallbackField = config.fallbackField;

        const fields = {};
        const pending = [];
        const errors = [];
        const tokens = [];
        const fallbackChunks = [];
        const explicitValues = {};
        const explicitMentions = new Set();

        let i = 0;
        let tokenCount = 0;

        while (i < rawEntry.length) {
            while (i < rawEntry.length && /\s/.test(rawEntry.charAt(i))) {
                i += 1;
            }
            if (i >= rawEntry.length) {
                break;
            }

            const match = matchPrefixAt(rawEntry, i, prefixMatchers);
            if (!match) {
                const nextPrefixIndex = findNextPrefixIndex(rawEntry, i, prefixMatchers);
                const end = nextPrefixIndex === -1 ? rawEntry.length : nextPrefixIndex;
                const chunk = rawEntry.slice(i, end);
                if (chunk.trim()) {
                    fallbackChunks.push(chunk.trim());
                }
                i = end;
                continue;
            }

            const tokenStartLocal = i;
            const fieldKey = match.fieldKey;
            const field = normalizedSchema.byKey[fieldKey];
            i += match.prefix.length;

            while (i < rawEntry.length && /\s/.test(rawEntry.charAt(i))) {
                i += 1;
            }

            const valueStartLocal = i;
            let valueEndLocal = i;
            let tokenEndLocal = i;
            let value = '';
            let committed = false;

            while (i < rawEntry.length) {
                if (escapeChar && rawEntry.charAt(i) === escapeChar && i + 1 < rawEntry.length) {
                    value += rawEntry.charAt(i + 1);
                    i += 2;
                    valueEndLocal = i;
                    tokenEndLocal = i;
                    continue;
                }

                if (fieldTerminator && rawEntry.startsWith(fieldTerminator, i)) {
                    committed = true;
                    tokenEndLocal = i + fieldTerminator.length;
                    i += fieldTerminator.length;
                    break;
                }

                if (terminatorMode === 'or-next-prefix' && isBoundary(rawEntry, i)) {
                    const nextMatch = matchPrefixAt(rawEntry, i, prefixMatchers);
                    if (nextMatch) {
                        committed = true;
                        tokenEndLocal = i;
                        break;
                    }
                }

                value += rawEntry.charAt(i);
                i += 1;
                valueEndLocal = i;
                tokenEndLocal = i;
            }

            if (i >= rawEntry.length && tokenEndLocal < i) {
                tokenEndLocal = i;
            }

            if (terminatorMode === 'or-end' && !committed) {
                committed = true;
                tokenEndLocal = i;
            }

            const cleanValue = value.trim();
            const token = {
                id: `e${entryIndex}_t${tokenCount++}`,
                kind: 'field',
                entryIndex,
                key: fieldKey,
                prefix: match.prefix,
                value: cleanValue,
                committed,
                localStart: tokenStartLocal,
                localEnd: tokenEndLocal,
                localValueStart: valueStartLocal,
                localValueEnd: valueEndLocal,
                globalStart: globalStart + tokenStartLocal,
                globalEnd: globalStart + tokenEndLocal,
                globalValueStart: globalStart + valueStartLocal,
                globalValueEnd: globalStart + valueEndLocal
            };
            tokens.push(token);
            explicitMentions.add(fieldKey);

            if (!cleanValue) {
                if (committed) {
                    errors.push(`Empty value for ${fieldKey}`);
                } else {
                    pending.push(`${fieldKey} is pending`);
                }
                continue;
            }

            if (!committed) {
                pending.push(`${fieldKey} is pending`);
                continue;
            }

            const parsed = parseByType(field, cleanValue, config);
            if (!parsed.ok) {
                errors.push(parsed.error);
                continue;
            }

            if (field.multiple && Array.isArray(parsed.value)) {
                parsed.value.forEach((item) => {
                    appendFieldValue(fields, field, fieldKey, item);
                });
            } else {
                appendFieldValue(fields, field, fieldKey, parsed.value);
            }
            if (!explicitValues[fieldKey]) {
                explicitValues[fieldKey] = [];
            }
            if (Array.isArray(parsed.value)) {
                parsed.value.forEach((item) => explicitValues[fieldKey].push(item));
            } else {
                explicitValues[fieldKey].push(parsed.value);
            }
        }

        const fallbackText = fallbackChunks.join(' ').trim();
        if (fallbackText) {
            appendFieldValue(fields, normalizedSchema.byKey[fallbackField], fallbackField, fallbackText);
        }

        const inferred = [];
        const autoDetectGlobal = !!config.autoDetectOptionsWithoutPrefix;
        const matchMode = (config.inferredMatchMode || 'exact').toLowerCase();
        const matchThreshold = normalizeMatchThreshold(config.inferredMatchThreshold, DEFAULT_CONFIG.inferredMatchThreshold);
        normalizedSchema.fields.forEach((field) => {
            if (field.type !== 'options') {
                return;
            }
            if (explicitMentions.has(field.key)) {
                return;
            }
            const fieldAutoDetect = field.autoDetectWithoutPrefix === true || (autoDetectGlobal && field.autoDetectWithoutPrefix !== false);
            if (!fieldAutoDetect) {
                return;
            }

            const options = getFieldOptions(field);
            if (options.length === 0) {
                return;
            }

            const candidates = [];
            options.forEach((option) => {
                const labels = [option.label, option.value].filter(Boolean);
                labels.forEach((label) => {
                    const matches = matchMode === 'fuzzy'
                        ? findFuzzyMatches(rawEntry, label, matchThreshold)
                        : findBoundaryMatches(rawEntry, label);
                    matches.forEach((match) => {
                        candidates.push({
                            fieldKey: field.key,
                            value: option.value,
                            label: option.label || option.value,
                            start: match.start,
                            end: match.end,
                            score: match.score || 1
                        });
                    });
                });
            });

            if (candidates.length === 0) {
                return;
            }

            candidates.sort((a, b) => a.start - b.start || a.end - b.end);
            const reduceInferred = typeof field.reduceInferredOptions === 'boolean'
                ? field.reduceInferredOptions
                : !!config.reduceInferredOptions;

            if (field.multiple) {
                const selected = reduceInferred
                    ? Array.from(candidates.reduce((acc, candidate) => {
                        acc.set(normValue(candidate.value), candidate);
                        return acc;
                    }, new Map()).values()).sort((a, b) => a.start - b.start || a.end - b.end)
                    : candidates;

                selected.forEach((candidate) => {
                    const parsed = parseByType(field, candidate.value, config);
                    if (!parsed.ok) {
                        return;
                    }
                    const parsedValue = Array.isArray(parsed.value) ? parsed.value[0] : parsed.value;
                    appendFieldValue(fields, field, field.key, parsedValue);
                    inferred.push({
                        id: `inf|${entryIndex}|${field.key}|${normValue(parsedValue)}`,
                        fieldKey: field.key,
                        value: parsedValue,
                        label: candidate.label,
                        localStart: candidate.start,
                        localEnd: candidate.end,
                        globalStart: globalStart + candidate.start,
                        globalEnd: globalStart + candidate.end,
                        matchScore: candidate.score,
                        inferred: true
                    });
                });
                return;
            }

            const chosen = reduceInferred ? candidates[candidates.length - 1] : candidates[0];
            const parsed = parseByType(field, chosen.value, config);
            if (!parsed.ok) {
                return;
            }
            const parsedValue = Array.isArray(parsed.value) ? parsed.value[0] : parsed.value;
            appendFieldValue(fields, field, field.key, parsedValue);
            inferred.push({
                id: `inf|${entryIndex}|${field.key}|${normValue(parsedValue)}`,
                fieldKey: field.key,
                value: parsedValue,
                label: chosen.label,
                localStart: chosen.start,
                localEnd: chosen.end,
                globalStart: globalStart + chosen.start,
                globalEnd: globalStart + chosen.end,
                matchScore: chosen.score,
                inferred: true
            });
        });

        const autoFields = new Set();
        normalizedSchema.fields.forEach((field) => {
            if (fields[field.key] !== undefined) {
                return;
            }
            const parsedDefault = parseDefaultValueByType(field, config);
            if (!parsedDefault.ok) {
                return;
            }
            if (field.multiple && Array.isArray(parsedDefault.value)) {
                parsedDefault.value.forEach((item) => appendFieldValue(fields, field, field.key, item));
            } else {
                appendFieldValue(fields, field, field.key, parsedDefault.value);
            }
            autoFields.add(field.key);
        });

        const entry = {
            index: entryIndex,
            raw: rawEntry,
            globalStart,
            globalEnd: globalStart + rawEntry.length,
            fields,
            explicitValues,
            inferred,
            autoFields,
            pending,
            errors,
            tokens,
            blocked: [],
            isValid: true
        };

        applyDependencyConstraints(entry, normalizedSchema, config);
        return applyRequiredValidation(entry, normalizedSchema);
    }

    function parseInput(input, userConfig) {
        const config = mergeConfig(userConfig);
        const normalizedSchema = normalizeSchema(config.schema, config.fallbackField);
        const prefixMatchers = sortPrefixMatchers(normalizedSchema.fields);

        const rawEntries = config.allowMultipleEntries === false
            ? [{ raw: input || '', start: 0, end: (input || '').length }]
            : splitEntriesWithPositions(input || '', config.entrySeparator, config.escapeChar);
        const parsedEntries = [];

        rawEntries.forEach((entryChunk) => {
            if (!entryChunk.raw || entryChunk.raw.trim().length === 0) {
                return;
            }

            const parsed = parseEntry(
                entryChunk.raw,
                config,
                normalizedSchema,
                prefixMatchers,
                parsedEntries.length,
                entryChunk.start
            );
            parsedEntries.push(parsed);
        });

        const validCount = parsedEntries.filter((entry) => entry.isValid).length;

        return {
            input: input || '',
            entries: parsedEntries,
            entryCount: parsedEntries.length,
            validCount,
            invalidCount: parsedEntries.length - validCount,
            config: {
                entrySeparator: config.entrySeparator,
                fieldTerminator: config.fieldTerminator,
                fieldTerminatorMode: config.fieldTerminatorMode,
                multiSelectSeparator: config.multiSelectSeparator,
                multiSelectDisplaySeparator: config.multiSelectDisplaySeparator
            }
        };
    }

    function escHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function eventTargetElement(event) {
        const target = event && event.target ? event.target : null;
        if (target && typeof target.closest === 'function') {
            return target;
        }
        if (target && target.parentElement && typeof target.parentElement.closest === 'function') {
            return target.parentElement;
        }
        return null;
    }

    function normValue(value) {
        return String(value).toLowerCase().trim();
    }

    function isMobileDevice() {
        if (typeof navigator === 'undefined') {
            return false;
        }
        const ua = String(navigator.userAgent || '').toLowerCase();
        const isMobileUa = /android|iphone|ipad|ipod|iemobile|opera mini/.test(ua);
        const hasTouch = typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0;
        const smallScreen = typeof window !== 'undefined' && window.innerWidth <= 900;
        return isMobileUa || (hasTouch && smallScreen);
    }

    function normalizeAttachmentSources(raw) {
        if (raw === null || raw === undefined) {
            return null;
        }
        if (typeof raw === 'string') {
            return raw
                .split(',')
                .map((part) => part.trim())
                .filter(Boolean);
        }
        if (Array.isArray(raw)) {
            return raw.map((item) => String(item || '').trim()).filter(Boolean);
        }
        return null;
    }

    function normalizeAiToolsConfig(raw) {
        if (raw === undefined || raw === null) {
            return null;
        }
        if (Array.isArray(raw)) {
            return raw.slice();
        }
        if (raw && typeof raw === 'object') {
            return [Object.assign({}, raw)];
        }
        return null;
    }

    function resolveMount(mount) {
        if (typeof document === 'undefined' || typeof HTMLElement === 'undefined') {
            throw new Error('QuickAdd: create() requires a browser DOM');
        }
        if (!mount) {
            throw new Error('QuickAdd: mount is required');
        }
        if (typeof mount === 'string') {
            const el = document.querySelector(mount);
            if (!el) {
                throw new Error(`QuickAdd: mount target not found: ${mount}`);
            }
            return el;
        }
        if (mount instanceof HTMLElement) {
            return mount;
        }
        throw new Error('QuickAdd: mount must be a selector or HTMLElement');
    }

    function QuickAddComponent(userConfig) {
        this.config = mergeConfig(userConfig);
        this.normalizedSchema = normalizeSchema(this.config.schema, this.config.fallbackField);
        this.mountEl = resolveMount(this.config.mount);
        this.timer = null;
        this.isRenderingInput = false;
        this.inputText = '';
        this.aiState = {
            isProcessing: false,
            requestSeq: 0,
            activeRequestSeq: 0,
            lastParsedInput: '',
            lastAttemptedInput: '',
            entries: [],
            editedEntries: new Set(),
            deletedEntries: new Set(),
            editingEntryId: '',
            warnings: [],
            missing: [],
            error: '',
            errorKind: '',
            callerRequest: null,
            providerRawResponse: ''
        };
        this.aiInlineMarkIndex = {};
        this.lastResult = this.config.mode === 'ai'
            ? this.buildAIResult()
            : parseInput('', this.config);
        this.tokenMap = {};
        this.dismissedSelections = new Set();
        this.attachmentPool = [];
        this.attachmentCounter = 0;
        this.attachmentSourceMenuState = null;
        this.conflictModalState = null;
        this.overlayDismissClickUntil = 0;
        this.dropdownState = null;
        this.datePickerState = null;
        this.numberPickerState = null;
        this.viewportRepositionFrame = 0;
        this.datePickerSuppressUntil = 0;
        this.datePickerInternalClickUntil = 0;
        this.blockedInfoState = null;
        this.aiVerificationState = {
            status: 'idle',
            message: '',
            signature: ''
        };

        ensureQuickAddStyles();

        this.renderShell();
        this.applyTokens();
        this.applyInputSizing();
        this.bindEvents();
        this.parseAndRender({ skipTypingSync: true });
    }

    QuickAddComponent.prototype.defaultHintText = function defaultHintText() {
        if (this.isAiMode()) {
            const autoParse = this.config.ai.autoParse !== false;
            return autoParse
                ? 'AI mode: type natural language and pause to extract structured entries.'
                : 'AI mode: auto-parse off. Click Parse Now to run extraction.';
        }
        const escapeForHint = (value) => String(value === undefined || value === null ? '' : value)
            .replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
        return `Field terminator: "${escapeForHint(this.config.fieldTerminator)}" | Entry separator: "${escapeForHint(this.config.entrySeparator)}"`;
    };

    QuickAddComponent.prototype.isAiMode = function isAiMode() {
        return this.config.mode === 'ai' && !!(this.config.ai && this.config.ai.enabled);
    };

    QuickAddComponent.prototype.isAIInlinePillsEnabled = function isAIInlinePillsEnabled() {
        if (!this.isAiMode()) {
            return false;
        }
        return this.config.showInlinePills !== false
            && !!(this.config.ai && this.config.ai.inlinePills);
    };

    QuickAddComponent.prototype.isAISeparatorAwareEnabled = function isAISeparatorAwareEnabled() {
        if (!this.isAiMode()) {
            return false;
        }
        if (!this.config.ai || !this.config.ai.separatorAware) {
            return false;
        }
        if (this.config.allowMultipleEntries === false) {
            return false;
        }
        return typeof this.config.entrySeparator === 'string' && this.config.entrySeparator.length > 0;
    };

    QuickAddComponent.prototype.isAIWebSearchEnabled = function isAIWebSearchEnabled() {
        if (!this.isAiMode()) {
            return false;
        }
        return !!(this.config.ai && this.config.ai.webSearch);
    };

    QuickAddComponent.prototype.normalizeAIToolsForProvider = function normalizeAIToolsForProvider(rawTools) {
        return normalizeAiToolsConfig(rawTools);
    };

    QuickAddComponent.prototype.resolveAIProviderTools = function resolveAIProviderTools(providerRaw) {
        const provider = String(providerRaw || '').toLowerCase();
        const ai = this.config.ai || {};
        const hasExplicitTools = ai.tools !== undefined && ai.tools !== null;
        const configuredTools = this.normalizeAIToolsForProvider(ai.tools);
        if (hasExplicitTools) {
            return configuredTools || [];
        }
        if (!this.isAIWebSearchEnabled()) {
            return null;
        }
        if (provider === 'openai') {
            return [{ type: 'web_search' }];
        }
        if (provider === 'google') {
            return [{ google_search: {} }];
        }
        if (provider === 'anthropic') {
            return [{ type: 'web_search_20250305', name: 'web_search' }];
        }
        return null;
    };

    QuickAddComponent.prototype.hasOpenAIWebSearchTool = function hasOpenAIWebSearchTool(tools) {
        if (!Array.isArray(tools)) {
            return false;
        }
        return tools.some((tool) => {
            const type = String(tool && tool.type ? tool.type : '').trim().toLowerCase();
            return type === 'web_search'
                || type === 'web_search_preview'
                || type === 'web_search_2025_08_01';
        });
    };

    QuickAddComponent.prototype.serializeAIProviderRawResponse = function serializeAIProviderRawResponse(raw) {
        if (raw === undefined || raw === null) {
            return '';
        }
        if (typeof raw === 'string') {
            return raw;
        }
        try {
            return JSON.stringify(raw);
        } catch (err) {
            return String(raw || '');
        }
    };

    QuickAddComponent.prototype.normalizeAIStatus = function normalizeAIStatus(rawStatus) {
        const status = String(rawStatus || '').trim().toLowerCase();
        if (!status) return 'Completed';
        if (['completed', 'done', 'complete'].includes(status)) return 'Completed';
        if (['planned', 'plan', 'scheduled', 'schedule'].includes(status)) return 'Planned';
        if (['missed', 'skip', 'skipped', 'cancelled', 'canceled'].includes(status)) return 'Missed';
        return 'Completed';
    };

    QuickAddComponent.prototype.resetAiVerification = function resetAiVerification(reason) {
        if (!this.isAiMode()) {
            return;
        }
        this.aiVerificationState = {
            status: 'idle',
            message: reason ? String(reason) : '',
            signature: ''
        };
    };

    QuickAddComponent.prototype.buildAiRuntimeSignature = function buildAiRuntimeSignature() {
        if (!this.isAiMode()) {
            return '';
        }
        const ai = this.config.ai || {};
        const tools = this.normalizeAIToolsForProvider(ai.tools);
        const toolsSignature = this.serializeAIProviderRawResponse(tools);
        return [
            String(ai.provider || ''),
            String(ai.apiKey || ''),
            String(ai.model || ''),
            String(ai.endpoint || ''),
            ai.mockResponse === null ? 'live' : 'mock',
            ai.webSearch === true ? 'web-search-on' : 'web-search-off',
            toolsSignature
        ].join('|');
    };

    QuickAddComponent.prototype.verifyAiRuntime = async function verifyAiRuntime() {
        if (!this.isAiMode()) {
            return { ok: false, message: 'AI mode is not enabled.' };
        }
        const input = String(this.inputText || this.readInputText() || '').trim();
        if (!input) {
            this.aiVerificationState = { status: 'error', message: 'Enter text before verifying.', signature: '' };
            this.parseAndRender({ source: this.inputText });
            return { ok: false, message: 'Enter text before verifying.' };
        }
        const minInputLength = Math.max(0, Number(this.config.ai.minInputLength || 0));
        if (input.length < minInputLength) {
            const message = `Add at least ${minInputLength} characters to verify.`;
            this.aiVerificationState = { status: 'error', message, signature: '' };
            this.parseAndRender({ source: this.inputText });
            return { ok: false, message };
        }

        this.aiVerificationState = { status: 'verifying', message: 'Verifying AI connection…', signature: '' };
        this.parseAndRender({ source: this.inputText, skipTypingSync: true });
        try {
            await this.extractAIFromInput(input);
            this.aiVerificationState = {
                status: 'verified',
                message: 'Verified. AI connection is working.',
                signature: this.buildAiRuntimeSignature()
            };
            this.parseAndRender({ source: this.inputText });
            return { ok: true, message: 'Verified.' };
        } catch (err) {
            const message = err && err.message ? err.message : 'Verification failed.';
            this.aiVerificationState = { status: 'error', message, signature: '' };
            this.parseAndRender({ source: this.inputText });
            return { ok: false, message };
        }
    };

    QuickAddComponent.prototype.normalizeAIAttachmentRefs = function normalizeAIAttachmentRefs(raw) {
        if (raw === undefined || raw === null || raw === '') {
            return [];
        }
        const separator = String(this.config.multiSelectSeparator || ',');
        const primary = normalizeMultiValues(raw, separator);
        if (primary.length > 1 || String(raw).includes(separator)) {
            return primary;
        }
        return dedupeMultiValues(String(raw).split(/[,\n]+/));
    };

    QuickAddComponent.prototype.makeAIEntryId = function makeAIEntryId(seed) {
        const chunk = String(seed || Date.now());
        return `ai_${Date.now()}_${chunk}_${Math.random().toString(36).slice(2, 8)}`;
    };

    QuickAddComponent.prototype.normalizeAIEntry = function normalizeAIEntry(entry, idx, keepId) {
        const source = entry && typeof entry === 'object' ? entry : {};
        const normalized = Object.assign({}, source);
        normalized._id = keepId || source._id || this.makeAIEntryId(idx);
        const fileFields = this.getFileFields();

        if (source.status !== undefined) {
            normalized.status = this.normalizeAIStatus(source.status);
        }
        fileFields.forEach((field) => {
            const raw = source[field.key];
            if (raw === undefined || raw === null || raw === '') {
                return;
            }
            if (field.multiple) {
                normalized[field.key] = this.normalizeAIAttachmentRefs(raw);
            } else {
                normalized[field.key] = String(raw).trim();
            }
        });
        if ((source.attachments !== undefined || source.attachmentRefs !== undefined) && fileFields.length > 0) {
            const fallbackField = fileFields[0];
            const refs = this.normalizeAIAttachmentRefs(source.attachments || source.attachmentRefs);
            normalized[fallbackField.key] = fallbackField.multiple ? refs : (refs[0] || '');
        }
        delete normalized.attachments;
        delete normalized.attachmentRefs;
        if (source.confidence !== undefined) {
            normalized.confidence = Number.isFinite(Number(source.confidence)) ? Number(source.confidence) : 0;
        }
        return normalized;
    };

    QuickAddComponent.prototype.aiEntrySignature = function aiEntrySignature(entry) {
        const schemaFields = (this.normalizedSchema && Array.isArray(this.normalizedSchema.fields))
            ? this.normalizedSchema.fields
            : [];
        const keys = schemaFields.length
            ? schemaFields.map((field) => field.key)
            : Object.keys(entry || {}).filter((key) => !String(key).startsWith('_'));
        const parts = keys.map((key) => {
            const value = entry && entry[key];
            if (Array.isArray(value)) {
                return value.map((item) => String(item || '').toLowerCase().trim()).join(',');
            }
            return String(value || '').toLowerCase().trim();
        });
        return parts.join('|');
    };

    QuickAddComponent.prototype.mergeAIEntries = function mergeAIEntries(incomingEntries) {
        const nextEntries = Array.isArray(this.aiState.entries) ? this.aiState.entries.slice() : [];
        const preserveEdited = this.config.ai.preserveEditedEntries !== false;

        incomingEntries.forEach((entry, idx) => {
            const normalized = this.normalizeAIEntry(entry, idx, null);
            const signature = this.aiEntrySignature(normalized);
            const existingIndex = nextEntries.findIndex((item) => {
                if (preserveEdited && this.aiState.editedEntries.has(item._id)) {
                    return false;
                }
                return this.aiEntrySignature(item) === signature;
            });
            if (existingIndex >= 0) {
                normalized._id = nextEntries[existingIndex]._id;
                nextEntries[existingIndex] = normalized;
                return;
            }
            nextEntries.push(normalized);
        });

        this.aiState.entries = nextEntries;
    };

    QuickAddComponent.prototype.extractJsonFromText = function extractJsonFromText(text) {
        const raw = String(text || '').trim();
        if (!raw) {
            return '';
        }
        const codeMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (codeMatch && codeMatch[1]) {
            return codeMatch[1].trim();
        }
        return raw;
    };

    QuickAddComponent.prototype.normalizeAIResponse = function normalizeAIResponse(response) {
        const data = (response && typeof response === 'object') ? response : {};
        return {
            entries: Array.isArray(data.entries) ? data.entries : [],
            missing: Array.isArray(data.missing) ? data.missing.map((item) => String(item)) : [],
            warnings: Array.isArray(data.warnings) ? data.warnings.map((item) => String(item)) : []
        };
    };

    QuickAddComponent.prototype.parseAIResponse = function parseAIResponse(responseText) {
        if (typeof this.config.ai.parseResponse === 'function') {
            const custom = this.config.ai.parseResponse(responseText, this);
            return this.normalizeAIResponse(custom);
        }
        if (responseText && typeof responseText === 'object') {
            return this.normalizeAIResponse(responseText);
        }
        const raw = String(responseText || '').trim();
        if (!raw) {
            return this.normalizeAIResponse({ entries: [], missing: [], warnings: ['Empty AI response'] });
        }

        const attempts = [];
        const primary = this.extractJsonFromText(raw);
        attempts.push(primary);
        const firstBrace = raw.indexOf('{');
        const lastBrace = raw.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            attempts.push(raw.slice(firstBrace, lastBrace + 1));
        }

        for (let i = 0; i < attempts.length; i++) {
            const candidate = String(attempts[i] || '').trim();
            if (!candidate) {
                continue;
            }
            try {
                const parsed = JSON.parse(candidate);
                return this.normalizeAIResponse(parsed);
            } catch (err) {
                continue;
            }
        }

        return this.normalizeAIResponse({
            entries: [],
            missing: [],
            warnings: ['Failed to parse AI JSON response']
        });
    };

    QuickAddComponent.prototype.getAIResponseText = function getAIResponseText(data) {
        if (!data || typeof data !== 'object') {
            return String(data || '');
        }
        const responseMessage = Array.isArray(data.output)
            ? data.output.find((item) => item && item.type === 'message')
            : null;
        const responseOutputText = responseMessage
            && Array.isArray(responseMessage.content)
            ? responseMessage.content.find((part) => part && part.type === 'output_text')?.text
            : '';
        return (
            data.choices?.[0]?.message?.content
            || data.content?.[0]?.text
            || data.candidates?.[0]?.content?.parts?.[0]?.text
            || data.output_text
            || responseOutputText
            || ''
        );
    };

    QuickAddComponent.prototype.packAIProviderResponse = function packAIProviderResponse(rawData) {
        return {
            text: this.getAIResponseText(rawData),
            raw: rawData
        };
    };

    QuickAddComponent.prototype.getAIFetchTimeoutMs = function getAIFetchTimeoutMs() {
        const raw = Number(this.config.ai && this.config.ai.timeoutMs);
        if (!Number.isFinite(raw) || raw <= 0) {
            return 20000;
        }
        return Math.max(250, raw);
    };

    QuickAddComponent.prototype.fetchAI = async function fetchAI(url, options) {
        if (typeof fetch !== 'function') {
            throw new Error('Fetch API unavailable in this runtime');
        }
        const timeoutMs = this.getAIFetchTimeoutMs();
        if (typeof AbortController === 'undefined' || timeoutMs <= 0) {
            return fetch(url, options);
        }
        const controller = new AbortController();
        const nextOptions = Object.assign({}, options || {}, { signal: controller.signal });
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fetch(url, nextOptions);
        } catch (err) {
            if (err && err.name === 'AbortError') {
                throw new Error(`AI request timed out after ${timeoutMs}ms`);
            }
            throw err;
        } finally {
            clearTimeout(timer);
        }
    };

    QuickAddComponent.prototype.buildAIPrompt = async function buildAIPrompt(input) {
        const ai = this.config.ai || {};
        const fields = (this.normalizedSchema && Array.isArray(this.normalizedSchema.fields))
            ? this.normalizedSchema.fields
            : [];
        const schemaKeys = fields
            .map((field) => field && field.key)
            .filter(Boolean);
        const fileFields = fields.filter((field) => field && isFileFieldType(field.type));
        const attachmentRefs = (this.attachmentPool || []).map((item) => item.ref).filter(Boolean);
        const schemaHint = schemaKeys.join(', ');
        const system = ai.systemPrompt
            ? `${ai.systemPrompt}\n\n`
            : '';
        const now = new Date();
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        if (ai.promptMode === 'custom') {
            const template = String(ai.promptTemplate || '');
            if (!template.trim()) {
                return String(input || '');
            }
            return template
                .replace(/\{\{\s*input\s*\}\}/g, String(input || ''))
                .replace(/\{\{\s*schemaKeys\s*\}\}/g, schemaHint)
                .replace(/\{\{\s*currentDate\s*\}\}/g, now.toISOString().slice(0, 10))
                .replace(/\{\{\s*timezone\s*\}\}/g, timezone);
        }
        const separatorHint = this.isAISeparatorAwareEnabled()
            ? `\nInput may be one segment split by entrySeparator from a larger note. Parse only this segment independently.`
            : '';
        const spanHint = this.isAIInlinePillsEnabled() && schemaKeys.length
            ? `\nIf possible include \`spans\` per entry (0-based offsets relative to this input segment): [{"field":"${schemaKeys[0]}","value":"example","start":3,"end":7}].`
            : '';
        const fileHint = fileFields.length
            ? `\nFile fields:\n${fileFields.map((field) => `- ${field.key}: ${field.multiple ? 'multiple refs allowed' : 'single ref only'}`).join('\n')}`
            : '';
        const attachmentHint = attachmentRefs.length
            ? `\nAvailable attachment refs: ${attachmentRefs.join(', ')}`
            : '\nAvailable attachment refs: none';
        return `${system}You are an information extraction engine.\n` +
            `Output must be one valid JSON object only. No markdown. No prose. No code fences.\n` +
            `Current date: ${now.toISOString().slice(0, 10)}\n` +
            `Timezone: ${timezone}\n` +
            `Return exactly this top-level shape:\n` +
            `{"entries":[...],"missing":[],"warnings":[]}\n` +
            `For each entry use keys: ${schemaHint || '[no fields specified]'}\n` +
            `Rules:\n` +
            `- Use only the keys defined above\n` +
            `- Keep unknown optional fields as null or empty string/array\n` +
            `- If multiple pets/events are present, create separate entries\n` +
            `- Put unresolved entities in "missing"\n` +
            `- Put ambiguity/assumptions in "warnings"${separatorHint}${spanHint}${fileHint}${attachmentHint}\n` +
            `Input:\n${String(input || '')}`;
    };

    QuickAddComponent.prototype.callOpenAI = async function callOpenAI(apiKey, model, prompt) {
        const forceJson = this.config.ai.forceJson !== false;
        const outputType = String(this.config.ai.outputType || '').trim().toLowerCase();
        const outputSchema = this.config.ai.outputSchema && typeof this.config.ai.outputSchema === 'object'
            ? this.config.ai.outputSchema
            : null;
        const tools = this.resolveAIProviderTools('openai');
        const useResponsesApi = this.hasOpenAIWebSearchTool(tools);
        let res = null;

        if (useResponsesApi) {
            const payload = {
                model: model || 'gpt-4o-mini',
                input: prompt
            };
            if (tools && tools.length) {
                payload.tools = tools;
            }
            if (forceJson && outputType === 'json_schema' && outputSchema) {
                payload.text = {
                    format: {
                        type: 'json_schema',
                        name: 'quickadd_schema',
                        schema: outputSchema
                    }
                };
            }
            res = await this.fetchAI('https://api.openai.com/v1/responses', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        } else {
            const payload = {
                model: model || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'Return only valid JSON object output.' },
                    { role: 'user', content: prompt }
                ],
                temperature: Number(this.config.ai.temperature || 0.3)
            };
            if (tools && tools.length) {
                payload.tools = tools;
            }
            if (forceJson) {
                payload.response_format = { type: outputType || 'json_object' };
                if (outputSchema && payload.response_format.type === 'json_schema') {
                    payload.response_format.json_schema = outputSchema;
                }
            }
            res = await this.fetchAI('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `OpenAI API error: ${res.status}`);
        }
        const data = await res.json();
        return this.packAIProviderResponse(data);
    };

    QuickAddComponent.prototype.callAnthropic = async function callAnthropic(apiKey, model, prompt) {
        const payload = {
            model: model || 'claude-3-haiku-20240307',
            max_tokens: 2048,
            system: 'Return one valid JSON object only. No markdown.',
            messages: [{ role: 'user', content: prompt }]
        };
        const tools = this.resolveAIProviderTools('anthropic');
        if (tools && tools.length) {
            payload.tools = tools;
        }
        const headers = {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        };
        const hasWebSearchTool = Array.isArray(tools) && tools.some((tool) => {
            const type = String(tool && tool.type ? tool.type : '').trim().toLowerCase();
            return type === 'web_search_20250305';
        });
        if (hasWebSearchTool) {
            headers['anthropic-beta'] = 'web-search-2025-03-05';
        }
        const res = await this.fetchAI('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `Anthropic API error: ${res.status}`);
        }
        const data = await res.json();
        return this.packAIProviderResponse(data);
    };

    QuickAddComponent.prototype.callGoogle = async function callGoogle(apiKey, model, prompt) {
        const defaultModel = this.isAIWebSearchEnabled() ? 'gemini-2.5-flash' : 'gemini-1.5-flash';
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || defaultModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const forceJson = this.config.ai.forceJson !== false;
        const generationConfig = { temperature: Number(this.config.ai.temperature || 0.3) };
        const outputSchema = this.config.ai.outputSchema && typeof this.config.ai.outputSchema === 'object'
            ? this.config.ai.outputSchema
            : null;
        if (forceJson) {
            generationConfig.responseMimeType = 'application/json';
            if (outputSchema) {
                generationConfig.responseSchema = outputSchema;
            }
        }
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig
        };
        const tools = this.resolveAIProviderTools('google');
        if (tools && tools.length) {
            payload.tools = tools;
        }
        const res = await this.fetchAI(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `Google API error: ${res.status}`);
        }
        const data = await res.json();
        return this.packAIProviderResponse(data);
    };

    QuickAddComponent.prototype.callCustom = async function callCustom(endpoint, apiKey, model, prompt) {
        const forceJson = this.config.ai.forceJson !== false;
        const outputType = String(this.config.ai.outputType || '').trim().toLowerCase();
        const outputSchema = this.config.ai.outputSchema && typeof this.config.ai.outputSchema === 'object'
            ? this.config.ai.outputSchema
            : null;
        const payload = {
            model: model || 'default',
            messages: [
                { role: 'system', content: 'Return only valid JSON object output.' },
                { role: 'user', content: prompt }
            ],
            temperature: Number(this.config.ai.temperature || 0.3)
        };
        const tools = this.resolveAIProviderTools('custom');
        if (tools && tools.length) {
            payload.tools = tools;
        }
        if (forceJson) {
            payload.response_format = { type: outputType || 'json_object' };
            if (outputSchema && payload.response_format.type === 'json_schema') {
                payload.response_format.json_schema = outputSchema;
            }
        }
        const res = await this.fetchAI(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `Custom API error: ${res.status}`);
        }
        const data = await res.json();
        return this.packAIProviderResponse(data);
    };

    QuickAddComponent.prototype.callAIProvider = async function callAIProvider(input) {
        const ai = this.config.ai || {};
        const text = String(input || '').trim();
        if (!text) {
            this.aiState.providerRawResponse = '';
            return this.normalizeAIResponse({ entries: [], missing: [], warnings: [] });
        }
        if (ai.mockResponse !== null && ai.mockResponse !== undefined) {
            const latency = Math.max(0, Number(ai.mockLatencyMs || 0));
            if (latency > 0) {
                await new Promise((resolve) => setTimeout(resolve, latency));
            }
            const mock = (typeof ai.mockResponse === 'function')
                ? await ai.mockResponse(text, this.config, this)
                : ai.mockResponse;
            this.aiState.providerRawResponse = this.serializeAIProviderRawResponse(mock);
            if (typeof mock === 'string' || (mock && typeof mock === 'object')) {
                return this.parseAIResponse(mock);
            }
            return this.normalizeAIResponse(mock);
        }

        if (typeof ai.request === 'function') {
            const customResponse = await ai.request({
                input: text,
                prompt: await this.buildAIPrompt(text),
                config: this.config,
                component: this
            });
            this.aiState.providerRawResponse = this.serializeAIProviderRawResponse(customResponse);
            if (typeof customResponse === 'string' || (customResponse && typeof customResponse === 'object')) {
                return this.parseAIResponse(customResponse);
            }
            return this.normalizeAIResponse(customResponse);
        }
        if (this.isAIOffline()) {
            throw new Error('Offline: AI provider request skipped');
        }

        const provider = String(ai.provider || '').toLowerCase();
        const apiKey = ai.apiKey || '';
        const model = ai.model || '';
        const endpoint = ai.endpoint || '';
        if (!apiKey && provider !== 'custom') {
            throw new Error('Missing ai.apiKey');
        }
        if (provider === 'custom' && !endpoint) {
            throw new Error('Missing ai.endpoint for custom provider');
        }
        const prompt = await this.buildAIPrompt(text);

        let providerResponse = null;
        if (provider === 'openai') {
            providerResponse = await this.callOpenAI(apiKey, model, prompt);
        } else if (provider === 'anthropic') {
            providerResponse = await this.callAnthropic(apiKey, model, prompt);
        } else if (provider === 'google') {
            providerResponse = await this.callGoogle(apiKey, model, prompt);
        } else if (provider === 'custom') {
            providerResponse = await this.callCustom(endpoint, apiKey, model, prompt);
        } else {
            throw new Error(`Unknown AI provider: ${provider}`);
        }

        const responseText = providerResponse && typeof providerResponse === 'object' && Object.prototype.hasOwnProperty.call(providerResponse, 'text')
            ? providerResponse.text
            : providerResponse;
        const responseRaw = providerResponse && typeof providerResponse === 'object' && Object.prototype.hasOwnProperty.call(providerResponse, 'raw')
            ? providerResponse.raw
            : providerResponse;
        this.aiState.providerRawResponse = this.serializeAIProviderRawResponse(responseRaw);
        return this.parseAIResponse(responseText);
    };

    QuickAddComponent.prototype.buildAICallerRequest = function buildAICallerRequest(input) {
        const rawInput = String(input || '');
        const ai = this.config.ai || {};
        const chunks = this.resolveAIInputChunks(rawInput).map((chunk) => ({
            index: Number.isFinite(Number(chunk.index)) ? Number(chunk.index) : 0,
            start: Number.isFinite(Number(chunk.start)) ? Number(chunk.start) : 0,
            end: Number.isFinite(Number(chunk.end)) ? Number(chunk.end) : 0,
            input: String(chunk.raw || '')
        }));
        return {
            mode: 'ai',
            input: rawInput,
            chunks,
            provider: String(ai.provider || ''),
            model: String(ai.model || ''),
            endpoint: String(ai.endpoint || ''),
            temperature: Number(ai.temperature || 0.3),
            forceJson: ai.forceJson !== false,
            webSearch: ai.webSearch === true,
            tools: this.normalizeAIToolsForProvider(ai.tools),
            hasCustomRequest: typeof ai.request === 'function',
            promptMode: String(ai.promptMode || 'default'),
            hasCustomResponseParser: typeof ai.parseResponse === 'function'
        };
    };

    QuickAddComponent.prototype.buildAIParseState = function buildAIParseState(rawInput) {
        const input = String(rawInput || '');
        const trimmed = input.trim();
        const minInputLength = Math.max(0, Number(this.config.ai.minInputLength || 0));
        const hasInput = trimmed.length > 0;
        const offline = this.isAIOffline();
        const belowMinLength = hasInput && trimmed.length < minInputLength;
        const snapshotMatch = String(this.aiState.lastParsedInput || '') === input;
        const attemptedForCurrentInput = String(this.aiState.lastAttemptedInput || '') === input;
        const hasCurrentError = attemptedForCurrentInput && !!this.aiState.error;

        let status = 'stale';
        if (!hasInput) {
            status = 'idle';
        } else if (belowMinLength) {
            status = 'below-min-length';
        } else if (this.aiState.isProcessing) {
            status = 'processing';
        } else if (hasCurrentError) {
            status = this.aiState.errorKind === 'offline' ? 'offline' : 'error';
        } else if (offline && !snapshotMatch) {
            status = 'offline';
        } else if (snapshotMatch) {
            status = 'ready';
        }

        const shouldParse = (
            status === 'stale'
            || status === 'error'
        );

        return {
            status,
            isReady: status === 'ready',
            isProcessing: status === 'processing',
            isStale: status === 'stale',
            isOffline: status === 'offline',
            shouldParse,
            hasInput,
            belowMinLength,
            minInputLength,
            currentInput: input,
            lastParsedInput: String(this.aiState.lastParsedInput || ''),
            error: hasCurrentError ? String(this.aiState.error || '') : '',
            errorKind: hasCurrentError ? String(this.aiState.errorKind || 'error') : ''
        };
    };

    QuickAddComponent.prototype.isLikelyNetworkError = function isLikelyNetworkError(error) {
        if (!error) {
            return false;
        }
        if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
            return true;
        }
        if (error instanceof TypeError) {
            return true;
        }
        const msg = String(error.message || error);
        return /network|offline|failed to fetch|econnrefused|timed out|abort/i.test(msg);
    };

    QuickAddComponent.prototype.isAIOffline = function isAIOffline() {
        return typeof navigator !== 'undefined' && navigator && navigator.onLine === false;
    };

    QuickAddComponent.prototype.applyAIParseResult = function applyAIParseResult(result) {
        const normalized = this.normalizeAIResponse(result);
        this.aiState.warnings = normalized.warnings;
        this.aiState.missing = normalized.missing;
        this.aiState.error = '';
        this.aiState.errorKind = '';
        this.aiState.callerRequest = null;
        this.mergeAIEntries(normalized.entries || []);
    };

    QuickAddComponent.prototype.annotateAIEntriesWithSource = function annotateAIEntriesWithSource(entries, sourceStart, sourceEnd, segmentIndex) {
        const list = Array.isArray(entries) ? entries : [];
        return list.map((entry) => {
            const next = Object.assign({}, entry, {
                _sourceStart: Number.isFinite(Number(sourceStart)) ? Number(sourceStart) : 0,
                _sourceEnd: Number.isFinite(Number(sourceEnd)) ? Number(sourceEnd) : 0,
                _segmentIndex: Number.isFinite(Number(segmentIndex)) ? Number(segmentIndex) : 0
            });
            if (!Array.isArray(next.spans)) {
                return next;
            }
            next.spans = next.spans
                .map((span) => {
                    const item = span && typeof span === 'object' ? span : {};
                    const start = Number(item.start);
                    const end = Number(item.end);
                    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
                        return null;
                    }
                    return Object.assign({}, item, {
                        start: start + next._sourceStart,
                        end: end + next._sourceStart
                    });
                })
                .filter(Boolean);
            return next;
        });
    };

    QuickAddComponent.prototype.resolveAIInputChunks = function resolveAIInputChunks(input) {
        const text = String(input || '');
        if (!this.isAISeparatorAwareEnabled()) {
            return [{ raw: text, start: 0, end: text.length, index: 0 }];
        }

        const ai = this.config.ai || {};
        if (typeof ai.splitInput === 'function') {
            const custom = ai.splitInput(text, this.config, this);
            if (Array.isArray(custom) && custom.length > 0) {
                return custom
                    .map((item, idx) => {
                        if (item && typeof item === 'object') {
                            const raw = String(item.raw || '');
                            const start = Number.isFinite(Number(item.start)) ? Number(item.start) : 0;
                            const end = Number.isFinite(Number(item.end)) ? Number(item.end) : (start + raw.length);
                            return { raw, start, end, index: idx };
                        }
                        const raw = String(item || '');
                        return { raw, start: 0, end: raw.length, index: idx };
                    })
                    .filter((item) => String(item.raw || '').trim().length > 0);
            }
        }

        return splitEntriesWithPositions(text, this.config.entrySeparator, this.config.escapeChar)
            .filter((chunk) => chunk && String(chunk.raw || '').trim().length > 0)
            .map((chunk, idx) => ({
                raw: chunk.raw,
                start: chunk.start,
                end: chunk.end,
                index: idx
            }));
    };

    QuickAddComponent.prototype.extractAIFromInput = async function extractAIFromInput(input) {
        const text = String(input || '');
        const chunks = this.resolveAIInputChunks(text);
        if (!chunks.length) {
            return { entries: [], missing: [], warnings: [] };
        }

        if (chunks.length === 1) {
            const single = await this.callAIProvider(chunks[0].raw);
            const normalizedSingle = this.normalizeAIResponse(single);
            normalizedSingle.entries = this.annotateAIEntriesWithSource(
                normalizedSingle.entries,
                chunks[0].start,
                chunks[0].end,
                chunks[0].index
            );
            return normalizedSingle;
        }

        const merged = { entries: [], missing: [], warnings: [] };
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const item = await this.callAIProvider(chunk.raw);
            const normalizedItem = this.normalizeAIResponse(item);
            merged.entries = merged.entries.concat(
                this.annotateAIEntriesWithSource(
                    normalizedItem.entries,
                    chunk.start,
                    chunk.end,
                    chunk.index
                )
            );
            if (normalizedItem.missing && normalizedItem.missing.length) {
                merged.missing = merged.missing.concat(normalizedItem.missing.map((missing) => `entry ${i + 1}: ${missing}`));
            }
            if (normalizedItem.warnings && normalizedItem.warnings.length) {
                merged.warnings = merged.warnings.concat(normalizedItem.warnings.map((warning) => `entry ${i + 1}: ${warning}`));
            }
        }
        return merged;
    };

    QuickAddComponent.prototype.parseAI = async function parseAI(options) {
        if (!this.isAiMode()) {
            return;
        }
        const currentInput = String(this.inputText || this.readInputText() || '');
        const opts = options || {};
        const input = currentInput;
        if (!opts.force && this.isAIOffline()) {
            return;
        }
        const minInputLength = Math.max(0, Number(this.config.ai.minInputLength || 0));
        const trimmedInput = input.trim();
        if (!trimmedInput || (!opts.force && trimmedInput.length < minInputLength)) {
            return;
        }

        const requestId = ++this.aiState.requestSeq;
        this.aiState.activeRequestSeq = requestId;
        this.aiState.isProcessing = true;
        this.aiState.lastAttemptedInput = input;
        this.aiState.error = '';
        this.aiState.errorKind = '';
        this.aiState.callerRequest = this.buildAICallerRequest(input);
        this.parseAndRender({ source: this.inputText, skipTypingSync: true });

        try {
            const result = await this.extractAIFromInput(input);
            if (requestId !== this.aiState.requestSeq) {
                return;
            }
            this.applyAIParseResult(result);
            this.aiState.lastParsedInput = input;
        } catch (err) {
            if (requestId !== this.aiState.requestSeq) {
                return;
            }
            this.aiState.error = err && err.message ? err.message : String(err || 'AI parse failed');
            this.aiState.errorKind = this.isLikelyNetworkError(err) ? 'offline' : 'error';
        } finally {
            if (requestId === this.aiState.requestSeq) {
                this.aiState.isProcessing = false;
            }
            this.parseAndRender({ source: this.inputText });
        }
    };

    QuickAddComponent.prototype.clearAIEntries = function clearAIEntries() {
        this.aiState.entries = [];
        this.aiState.editedEntries.clear();
        this.aiState.deletedEntries.clear();
        this.aiState.editingEntryId = '';
        this.aiState.warnings = [];
        this.aiState.missing = [];
        this.aiState.error = '';
        this.aiState.errorKind = '';
        this.aiState.callerRequest = null;
        this.aiState.providerRawResponse = '';
    };

    QuickAddComponent.prototype.markAIEntryDeleted = function markAIEntryDeleted(entryId, deleted) {
        if (!entryId) {
            return;
        }
        if (deleted) {
            this.aiState.deletedEntries.add(entryId);
        } else {
            this.aiState.deletedEntries.delete(entryId);
        }
    };

    QuickAddComponent.prototype.buildAIResult = function buildAIResult() {
        const input = String(this.inputText || '');
        const parseState = this.buildAIParseState(input);
        const callerRequest = parseState.hasInput
            ? (this.aiState.callerRequest && this.aiState.callerRequest.input === input
                ? Object.assign({}, this.aiState.callerRequest)
                : this.buildAICallerRequest(input))
            : null;
        const schemaFields = (this.normalizedSchema && Array.isArray(this.normalizedSchema.fields))
            ? this.normalizedSchema.fields
            : [];
        const entries = (this.aiState.entries || []).map((entry, idx) => {
            const deleted = this.aiState.deletedEntries.has(entry._id);
            const entryFields = Object.assign({}, entry);
            const autoFields = new Set();
            schemaFields.forEach((field) => {
                if (!field || !field.key) {
                    return;
                }
                const current = entryFields[field.key];
                const isEmpty = Array.isArray(current)
                    ? current.length === 0
                    : (current === undefined || current === null || current === '');
                if (!isEmpty) {
                    return;
                }
                const parsedDefault = parseDefaultValueByType(field, this.config);
                if (!parsedDefault.ok) {
                    return;
                }
                entryFields[field.key] = parsedDefault.value;
                autoFields.add(field.key);
            });
            return {
                index: idx,
                raw: input,
                fields: entryFields,
                explicitValues: {},
                inferred: [],
                autoFields,
                pending: [],
                errors: [],
                tokens: [],
                blocked: [],
                isValid: !deleted,
                aiMeta: {
                    id: entry._id,
                    deleted,
                    edited: this.aiState.editedEntries.has(entry._id)
                }
            };
        });
        const validCount = entries.filter((entry) => entry.isValid).length;
        return {
            mode: 'ai',
            input,
            entries,
            entryCount: entries.length,
            validCount,
            invalidCount: Math.max(0, entries.length - validCount),
            warnings: this.aiState.warnings.slice(),
            missing: this.aiState.missing.slice(),
            error: parseState.error || '',
            isProcessing: !!this.aiState.isProcessing,
            providerRawResponse: String(this.aiState.providerRawResponse || ''),
            parseState,
            callerRequest,
            verification: Object.assign({}, this.aiVerificationState)
        };
    };

    QuickAddComponent.prototype.getAIEditInputId = function getAIEditInputId(entryId, field) {
        const safeEntryId = String(entryId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
        const safeField = String(field || '').replace(/[^a-zA-Z0-9_-]/g, '_');
        return `qa_ai_edit_${safeEntryId}_${safeField}`;
    };

    QuickAddComponent.prototype.renderShell = function renderShell() {
        const c = this.config.classNames;
        const hint = this.config.hintText || this.defaultHintText();
        const outputBlock = this.config.showJsonOutput
            ? `
                <details class="${c.outputPanel}" data-role="outputPanel">
                    <summary class="${c.outputSummary}">Parsed JSON</summary>
                    <pre class="${c.output}" data-role="output"></pre>
                </details>
            `
            : '';

        this.mountEl.innerHTML = `
            <div class="${c.root}" data-role="root">
                <div class="${c.inputWrap}">
                    <div class="${c.inputSurface}" data-role="inputSurface">
                        <div
                            class="${c.input}"
                            data-role="input"
                            contenteditable="true"
                            role="textbox"
                            aria-multiline="true"
                            spellcheck="false"
                            data-placeholder="${escHtml(this.config.placeholder)}"
                        ></div>
                    </div>
                    <div class="${c.hint}">${escHtml(hint)}</div>
                </div>
                <div class="${c.status}" data-role="status"></div>
                <div class="${c.preview}" data-role="preview"></div>
                ${outputBlock}
                <div class="${c.dropdown}" data-role="dropdown" hidden>
                    <input class="${c.dropdownSearch}" data-role="dropdownSearch" type="text" placeholder="Filter options..." />
                    <div class="${c.dropdownListWrap}">
                        <div class="${c.dropdownList}" data-role="dropdownList"></div>
                        <div class="${c.dropdownFadeTop}" data-role="dropdownFadeTop" aria-hidden="true" hidden></div>
                        <div class="${c.dropdownFadeBottom}" data-role="dropdownFadeBottom" aria-hidden="true" hidden></div>
                    </div>
                </div>
                <div class="${c.attachmentSourceMenu}" data-role="attachmentSourceMenu" role="menu" aria-label="Attachment source" hidden></div>
                <div class="${c.conflictModalOverlay}" data-role="conflictModalOverlay" hidden>
                    <div class="${c.conflictModal}" data-role="conflictModal" role="dialog" aria-modal="true" aria-label="Attachment conflict"></div>
                </div>
                <div class="${c.datePicker}" data-role="datePicker" role="dialog" aria-modal="false" aria-label="Choose date" tabindex="-1" hidden>
                    <div class="${c.datePickerHeader}">
                        <div class="${c.datePickerTitle}" data-role="datePickerTitle"></div>
                        <div class="${c.datePickerNav}">
                            <button type="button" class="${c.datePickerNavBtn}" data-date-nav="prev" aria-label="Previous month">‹</button>
                            <button type="button" class="${c.datePickerNavBtn}" data-date-nav="next" aria-label="Next month">›</button>
                        </div>
                    </div>
                    <div class="${c.datePickerWeekdays}" data-role="datePickerWeekdays" aria-hidden="true"></div>
                    <div class="${c.datePickerGrid}" data-role="datePickerGrid" role="grid" aria-label="Calendar dates"></div>
                    <div class="${c.datePickerFooter}" data-role="datePickerFooter">
                        <div class="${c.datePickerQuick}" data-role="datePickerQuick"></div>
                        <div class="${c.datePickerTime}" data-role="datePickerTime" hidden></div>
                    </div>
                </div>
                <div class="${c.numberPicker}" data-role="numberPicker" role="dialog" aria-modal="false" aria-label="Adjust number" hidden></div>
            </div>
        `;

        this.rootEl = this.mountEl.querySelector('[data-role="root"]');
        this.inputSurfaceEl = this.mountEl.querySelector('[data-role="inputSurface"]');
        this.inputEl = this.mountEl.querySelector('[data-role="input"]');
        this.statusEl = this.mountEl.querySelector('[data-role="status"]');
        this.previewEl = this.mountEl.querySelector('[data-role="preview"]');
        this.outputEl = this.mountEl.querySelector('[data-role="output"]');
        this.dropdownEl = this.mountEl.querySelector('[data-role="dropdown"]');
        this.dropdownSearchEl = this.mountEl.querySelector('[data-role="dropdownSearch"]');
        this.dropdownListEl = this.mountEl.querySelector('[data-role="dropdownList"]');
        this.dropdownFadeTopEl = this.mountEl.querySelector('[data-role="dropdownFadeTop"]');
        this.dropdownFadeBottomEl = this.mountEl.querySelector('[data-role="dropdownFadeBottom"]');
        this.attachmentSourceMenuEl = this.mountEl.querySelector('[data-role="attachmentSourceMenu"]');
        this.conflictModalOverlayEl = this.mountEl.querySelector('[data-role="conflictModalOverlay"]');
        this.conflictModalEl = this.mountEl.querySelector('[data-role="conflictModal"]');
        this.datePickerEl = this.mountEl.querySelector('[data-role="datePicker"]');
        this.datePickerTitleEl = this.mountEl.querySelector('[data-role="datePickerTitle"]');
        this.datePickerWeekdaysEl = this.mountEl.querySelector('[data-role="datePickerWeekdays"]');
        this.datePickerGridEl = this.mountEl.querySelector('[data-role="datePickerGrid"]');
        this.datePickerQuickEl = this.mountEl.querySelector('[data-role="datePickerQuick"]');
        this.datePickerTimeEl = this.mountEl.querySelector('[data-role="datePickerTime"]');
        this.numberPickerEl = this.mountEl.querySelector('[data-role="numberPicker"]');
        this.blockedInfoEl = null;
    };

    QuickAddComponent.prototype.applyTokens = function applyTokens() {
        const tokens = this.config.tokens || {};
        Object.keys(tokens).forEach((name) => {
            if (name.startsWith('--')) {
                this.rootEl.style.setProperty(name, String(tokens[name]));
            }
        });
    };

    QuickAddComponent.prototype.applyInputSizing = function applyInputSizing() {
        if (!this.inputEl || !this.inputSurfaceEl) {
            return;
        }
        const mode = String(this.config.inputHeightMode || 'grow').toLowerCase();
        const maxValue = this.config.inputMaxHeight;
        let maxHeight = '';
        if (maxValue !== undefined && maxValue !== null && maxValue !== '') {
            if (typeof maxValue === 'number' && Number.isFinite(maxValue)) {
                maxHeight = `${maxValue}px`;
            } else {
                maxHeight = String(maxValue);
            }
        }

        if (mode === 'scroll') {
            this.inputEl.style.maxHeight = maxHeight || '';
            this.inputSurfaceEl.style.maxHeight = maxHeight || '';
            this.inputEl.style.overflowY = 'auto';
        } else {
            this.inputEl.style.maxHeight = '';
            this.inputSurfaceEl.style.maxHeight = '';
            this.inputEl.style.overflowY = '';
        }
    };

    QuickAddComponent.prototype.getDatePickerInitialDate = function getDatePickerInitialDate(token, field) {
        const tokenValue = token && token.value !== undefined ? token.value : '';
        const parsed = parseFieldDateValue(field, tokenValue || '');
        if (parsed.ok && parsed.dateValue) {
            const parsedDate = fromYMD(parsed.dateValue);
            if (parsedDate) {
                return parsedDate;
            }
        }
        return new Date();
    };

    QuickAddComponent.prototype.openDatePicker = function openDatePicker(options) {
        if (!options || !options.field) {
            return;
        }
        this.closeBlockedInfo();
        this.closeDropdown();
        this.closeNumberPicker();
        this.closeAttachmentSourceMenu();
        const defaultTime = normalizeTime24(options.field.defaultTime, DEFAULT_DATETIME_TIME);
        const rawValue = options.token
            ? options.token.value
            : (options.value !== undefined
                ? options.value
                : (options.aiContext && options.aiContext.currentValue !== undefined
                    ? options.aiContext.currentValue
                    : ''));
        const parsed = parseFieldDateValue(options.field, rawValue || '');
        const selectedValue = parsed.ok ? parsed.value : '';
        const selectedDateValue = parsed.ok && parsed.dateValue ? parsed.dateValue : '';
        const selectedTimeValue = parsed.ok && parsed.timeValue ? parsed.timeValue : defaultTime;
        this.datePickerState = {
            fieldKey: options.field.key,
            tokenId: options.token && options.token.id ? options.token.id : '',
            entryIndex: options.entryIndex,
            anchorEl: options.anchorEl || null,
            fieldType: options.field.type,
            naturalDate: !!options.field.naturalDate,
            allowDateOnly: options.field.allowDateOnly !== false,
            defaultTime,
            timeFormat: options.field.timeFormat === 'ampm' ? 'ampm' : '24h',
            activeDate: options.activeDate || this.getDatePickerInitialDate(options.token, options.field),
            selectedValue,
            selectedDateValue,
            selectedTimeValue,
            aiContext: options.aiContext || null,
            sourceRegion: options.sourceRegion || 'inline',
            titleMenu: ''
        };
        this.renderDatePicker();
        this.positionDatePicker(options.anchorEl || this.inputEl);
        this.datePickerEl.style.removeProperty('display');
        this.datePickerEl.hidden = false;
        const focusValue = this.datePickerState.selectedDateValue || toYMD(this.datePickerState.activeDate || new Date());
        window.requestAnimationFrame(() => {
            if (!this.focusDatePickerDate(focusValue) && this.datePickerEl) {
                this.datePickerEl.focus();
            }
        });
    };

    QuickAddComponent.prototype.closeDatePicker = function closeDatePicker() {
        this.datePickerState = null;
        if (!this.datePickerEl) {
            return;
        }
        this.datePickerEl.hidden = true;
        this.datePickerEl.style.setProperty('display', 'none', 'important');
        this.datePickerEl.classList.remove(this.config.classNames.datePickerWithTime);
        this.datePickerGridEl.innerHTML = '';
        this.datePickerQuickEl.innerHTML = '';
        if (this.datePickerTimeEl) {
            this.datePickerTimeEl.innerHTML = '';
            this.datePickerTimeEl.hidden = true;
        }
    };

    QuickAddComponent.prototype.isNumberStepperEnabledForField = function isNumberStepperEnabledForField(field) {
        if (!field || field.type !== 'number') {
            return false;
        }
        if (field.showNumberStepper === true) {
            return true;
        }
        if (field.showNumberStepper === false) {
            return false;
        }
        return this.config.enableNumberPillStepper === true;
    };

    QuickAddComponent.prototype.resolveNumberStep = function resolveNumberStep(field, explicitStep) {
        const direct = Number(explicitStep);
        if (Number.isFinite(direct) && direct > 0) {
            return direct;
        }
        const fieldStep = Number(field && field.numberStep);
        if (Number.isFinite(fieldStep) && fieldStep > 0) {
            return fieldStep;
        }
        const configStep = Number(this.config.numberPillStep);
        if (Number.isFinite(configStep) && configStep > 0) {
            return configStep;
        }
        return 1;
    };

    QuickAddComponent.prototype.openNumberPicker = function openNumberPicker(options) {
        if (!options || !options.field || !this.isNumberStepperEnabledForField(options.field) || !this.numberPickerEl) {
            return;
        }
        this.closeBlockedInfo();
        this.closeDropdown();
        this.closeDatePicker();
        this.closeAttachmentSourceMenu();
        const rawCurrent = options.token
            ? options.token.value
            : (options.value !== undefined && options.value !== null ? options.value : 0);
        const parsedCurrent = Number(rawCurrent);
        const currentValue = Number.isFinite(parsedCurrent) ? parsedCurrent : 0;
        this.numberPickerState = {
            fieldKey: options.field.key,
            tokenId: options.token && options.token.id ? options.token.id : '',
            entryIndex: Number.isFinite(Number(options.entryIndex)) ? Number(options.entryIndex) : 0,
            entryKey: options.entryKey,
            currentValue,
            step: this.resolveNumberStep(options.field, options.step),
            min: Number.isFinite(Number(options.field.min)) ? Number(options.field.min) : null,
            max: Number.isFinite(Number(options.field.max)) ? Number(options.field.max) : null,
            anchorEl: options.anchorEl || null,
            anchorRect: options.anchorEl && options.anchorEl.getBoundingClientRect
                ? options.anchorEl.getBoundingClientRect()
                : (options.anchorRect || null),
            sourceRegion: options.sourceRegion || 'inline',
            aiContext: options.aiContext || null
        };
        this.renderNumberPicker();
        this.positionNumberPicker(this.numberPickerState.anchorEl);
        this.numberPickerEl.hidden = false;
    };

    QuickAddComponent.prototype.closeNumberPicker = function closeNumberPicker() {
        this.numberPickerState = null;
        if (!this.numberPickerEl) {
            return;
        }
        this.numberPickerEl.hidden = true;
        this.numberPickerEl.innerHTML = '';
        this.numberPickerEl.style.removeProperty('position');
        this.numberPickerEl.style.removeProperty('left');
        this.numberPickerEl.style.removeProperty('top');
        this.numberPickerEl.style.removeProperty('width');
        this.numberPickerEl.style.removeProperty('max-width');
        this.numberPickerEl.style.removeProperty('z-index');
    };

    QuickAddComponent.prototype.renderNumberPicker = function renderNumberPicker() {
        if (!this.numberPickerEl || !this.numberPickerState) {
            return;
        }
        const c = this.config.classNames;
        const state = this.numberPickerState;
        this.numberPickerEl.innerHTML = `
            <div class="${c.numberPickerControls}">
                <button type="button" class="${c.numberPickerBtn}" data-number-action="decrement" aria-label="Decrement value">−</button>
                <div class="${c.numberPickerValue}" data-role="numberPickerValue">${escHtml(String(state.currentValue))}</div>
                <button type="button" class="${c.numberPickerBtn}" data-number-action="increment" aria-label="Increment value">+</button>
            </div>
            <div class="${c.numberPickerStepWrap}">
                <label class="${c.numberPickerStepLabel}">
                    Step
                    <input type="number" class="${c.numberPickerStepInput}" data-role="numberPickerStepInput" min="0.0000001" step="any" value="${escHtml(String(state.step))}" />
                </label>
            </div>
        `;
    };

    QuickAddComponent.prototype.positionNumberPicker = function positionNumberPicker(anchorEl) {
        if (!this.numberPickerEl || !this.numberPickerState) {
            return;
        }
        const rect = anchorEl && anchorEl.getBoundingClientRect
            ? anchorEl.getBoundingClientRect()
            : (this.numberPickerState.anchorRect || this.getCaretClientRect());
        const bounds = this.getFloatingBounds(anchorEl || this.inputEl);
        const pad = window.innerWidth <= 480 ? 8 : 10;
        const viewportWidth = Math.max(0, (bounds.right - bounds.left) - (pad * 2));
        const preferredWidth = Math.max(188, Math.min(224, viewportWidth));
        const width = Math.min(preferredWidth, viewportWidth);
        const minLeft = bounds.left + pad;
        const maxLeft = bounds.right - width - pad;
        const left = Math.max(minLeft, Math.min(rect.left || minLeft, maxLeft));

        const prevHidden = this.numberPickerEl.hidden;
        const prevVisibility = this.numberPickerEl.style.visibility;
        this.numberPickerEl.hidden = false;
        this.numberPickerEl.style.visibility = 'hidden';
        this.numberPickerEl.style.width = `${width}px`;
        const measuredHeight = Math.ceil(this.numberPickerEl.getBoundingClientRect().height || this.numberPickerEl.scrollHeight || 0);
        if (prevHidden) {
            this.numberPickerEl.hidden = true;
        }
        this.numberPickerEl.style.visibility = prevVisibility;

        const gap = 2;
        const anchorTop = rect.top || 0;
        const anchorBottom = rect.bottom || rect.top || 0;
        const minTop = bounds.top + pad;
        const maxBottom = bounds.bottom - pad;
        const availableBelow = Math.max(0, maxBottom - (anchorBottom + gap));
        const availableAbove = Math.max(0, (anchorTop - gap) - minTop);
        const panelHeight = Math.max(0, Math.min(measuredHeight || 108, Math.max(availableBelow, availableAbove)));
        const placeBelow = availableBelow >= availableAbove;
        const top = placeBelow
            ? (anchorBottom + gap)
            : Math.max(minTop, (anchorTop - gap) - panelHeight);

        this.numberPickerEl.style.position = 'fixed';
        this.numberPickerEl.style.left = `${left}px`;
        this.numberPickerEl.style.top = `${top}px`;
        this.numberPickerEl.style.width = `${width}px`;
        this.numberPickerEl.style.maxWidth = `${Math.max(0, viewportWidth)}px`;
        this.numberPickerEl.style.zIndex = '9999';
    };

    QuickAddComponent.prototype.applyNumberStep = function applyNumberStep(direction) {
        if (!this.numberPickerState) {
            return;
        }
        const dir = direction < 0 ? -1 : 1;
        const step = this.resolveNumberStep(this.getFieldDefinition(this.numberPickerState.fieldKey), this.numberPickerState.step);
        const current = Number(this.numberPickerState.currentValue);
        const base = Number.isFinite(current) ? current : 0;
        let nextValue = base + (dir * step);
        if (Number.isFinite(Number(this.numberPickerState.min))) {
            nextValue = Math.max(Number(this.numberPickerState.min), nextValue);
        }
        if (Number.isFinite(Number(this.numberPickerState.max))) {
            nextValue = Math.min(Number(this.numberPickerState.max), nextValue);
        }
        this.applyNumberValue(nextValue);
    };

    QuickAddComponent.prototype.applyNumberValue = function applyNumberValue(nextValue) {
        if (!this.numberPickerState) {
            return;
        }
        const state = Object.assign({}, this.numberPickerState);
        const field = this.getFieldDefinition(state.fieldKey);
        const numericValue = Number(nextValue);
        if (!field || field.type !== 'number' || !Number.isFinite(numericValue)) {
            return;
        }

        if (state.aiContext) {
            const context = Object.assign({}, state.aiContext);
            this.applyAIFieldSelection({
                entryId: context.entryId,
                fieldKey: context.fieldKey,
                currentValue: context.currentValue,
                occurrence: context.occurrence,
                mappingKey: context.mappingKey,
                entryIndex: state.entryIndex,
                nextValue: numericValue,
                sourceRegion: state.sourceRegion,
                anchorEl: state.anchorEl,
                anchorRect: state.anchorRect
            });
            this.numberPickerState = Object.assign({}, state, { currentValue: numericValue });
            this.renderNumberPicker();
            this.positionNumberPicker(state.anchorEl);
            this.numberPickerEl.hidden = false;
            return;
        }

        let token = this.tokenMap[state.tokenId];
        if (!token && state.sourceRegion === 'card') {
            token = this.materializeEntryFieldToken(state.entryIndex, state.fieldKey, state.currentValue, state.sourceRegion);
        }
        if (!token) {
            this.closeNumberPicker();
            return;
        }
        const source = this.inputText || this.readInputText();
        const replacement = String(numericValue);
        const updated = this.replaceRange(source, token.globalValueStart, token.globalValueEnd, replacement);
        const caretOffset = token.globalValueStart + replacement.length;
        this.parseAndRender({
            source: updated,
            caretOffset,
            focusInput: state.sourceRegion !== 'card',
            skipTypingSync: state.sourceRegion === 'card'
        });
        const nextEntry = (this.lastResult.entries || []).find((entry) => entry.index === state.entryIndex);
        const nextToken = nextEntry
            ? (nextEntry.tokens || []).find((item) => item.kind === 'field' && item.key === state.fieldKey && normValue(item.value) === normValue(replacement))
            : null;
        this.numberPickerState = Object.assign({}, state, {
            tokenId: nextToken ? nextToken.id : state.tokenId,
            currentValue: numericValue
        });
        this.renderNumberPicker();
        this.positionNumberPicker(state.anchorEl);
        this.numberPickerEl.hidden = false;
    };

    QuickAddComponent.prototype.adjustNumberPillValue = function adjustNumberPillValue(pillEl, direction) {
        if (!pillEl || !direction) {
            return false;
        }
        const fieldKey = pillEl.getAttribute('data-pill-ai') === '1'
            ? (pillEl.getAttribute('data-pill-ai-field') || '')
            : (pillEl.getAttribute('data-pill-field') || '');
        const field = this.getFieldDefinition(fieldKey);
        if (!field || field.type !== 'number' || !this.isNumberStepperEnabledForField(field)) {
            return false;
        }
        const dir = direction < 0 ? -1 : 1;
        const step = this.resolveNumberStep(field);
        const min = Number.isFinite(Number(field.min)) ? Number(field.min) : null;
        const max = Number.isFinite(Number(field.max)) ? Number(field.max) : null;
        const sourceRegion = pillEl.closest('[data-role="preview"]') ? 'card' : 'inline';

        this.closeNumberPicker();

        if (pillEl.getAttribute('data-pill-ai') === '1' && this.isAiMode()) {
            const entryId = pillEl.getAttribute('data-pill-ai-entry-id') || '';
            if (!entryId) {
                return false;
            }
            const occurrenceRaw = Number(pillEl.getAttribute('data-pill-ai-occurrence'));
            const occurrence = Number.isFinite(occurrenceRaw) ? Math.max(0, occurrenceRaw) : 0;
            const mappingKey = pillEl.getAttribute('data-pill-ai-map') || '';
            const currentRaw = pillEl.getAttribute('data-pill-ai-value') || '';
            let baseValue = Number(currentRaw);
            if (!Number.isFinite(baseValue)) {
                const entry = (this.aiState.entries || []).find((item) => item && item._id === entryId);
                if (entry) {
                    const rawEntryValue = entry[fieldKey];
                    baseValue = Number(Array.isArray(rawEntryValue) ? rawEntryValue[0] : rawEntryValue);
                }
            }
            if (!Number.isFinite(baseValue)) {
                baseValue = 0;
            }
            let nextValue = baseValue + (dir * step);
            if (Number.isFinite(min)) {
                nextValue = Math.max(min, nextValue);
            }
            if (Number.isFinite(max)) {
                nextValue = Math.min(max, nextValue);
            }
            const entryIndexRaw = Number(pillEl.getAttribute('data-pill-entry'));
            const entryIndex = Number.isFinite(entryIndexRaw) ? entryIndexRaw : 0;
            this.applyAIFieldSelection({
                entryId,
                fieldKey,
                currentValue: baseValue,
                occurrence,
                mappingKey,
                entryIndex,
                nextValue,
                sourceRegion,
                anchorEl: pillEl,
                anchorRect: pillEl.getBoundingClientRect()
            });
            return true;
        }

        const entryIndex = Number(pillEl.getAttribute('data-pill-entry'));
        if (!Number.isFinite(entryIndex)) {
            return false;
        }
        const tokenId = pillEl.getAttribute('data-pill-token') || '';
        const rawValue = pillEl.getAttribute('data-pill-value') || '';
        let token = tokenId ? this.tokenMap[tokenId] : null;
        if (!token && rawValue !== '') {
            token = this.materializeEntryFieldToken(entryIndex, fieldKey, rawValue, sourceRegion);
        }
        if (!token) {
            return false;
        }
        let baseValue = Number(token.value);
        if (!Number.isFinite(baseValue)) {
            baseValue = Number(rawValue);
        }
        if (!Number.isFinite(baseValue)) {
            baseValue = 0;
        }
        let nextValue = baseValue + (dir * step);
        if (Number.isFinite(min)) {
            nextValue = Math.max(min, nextValue);
        }
        if (Number.isFinite(max)) {
            nextValue = Math.min(max, nextValue);
        }

        const source = this.inputText || this.readInputText();
        const replacement = String(nextValue);
        const updated = this.replaceRange(source, token.globalValueStart, token.globalValueEnd, replacement);
        const caretOffset = token.globalValueStart + replacement.length;
        this.parseAndRender({
            source: updated,
            caretOffset,
            focusInput: sourceRegion !== 'card',
            skipTypingSync: sourceRegion === 'card'
        });
        return true;
    };

    QuickAddComponent.prototype.renderDatePicker = function renderDatePicker() {
        if (!this.datePickerState) {
            return;
        }
        const c = this.config.classNames;
        const active = this.datePickerState.activeDate;
        const year = active.getFullYear();
        const month = active.getMonth();
        const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' });
        this.datePickerGridEl.setAttribute('aria-label', `${monthName} ${year} calendar`);
        const monthOptions = Array.from({ length: 12 }, (_, idx) => {
            const label = new Date(2000, idx, 1).toLocaleString('default', { month: 'long' });
            const selected = idx === month;
            return `
                <button
                    type="button"
                    class="${c.dropdownOption} ${c.datePickerTitleOption}${selected ? ` ${c.datePickerTitleOptionCurrent}` : ''}"
                    data-date-month-option="${idx}"
                    role="option"
                    aria-selected="${selected ? 'true' : 'false'}"
                >${escHtml(label)}</button>
            `;
        }).join('');
        const yearOptions = Array.from({ length: 31 }, (_, idx) => {
            const y = year - 15 + idx;
            const selected = y === year;
            return `
                <button
                    type="button"
                    class="${c.dropdownOption} ${c.datePickerTitleOption}${selected ? ` ${c.datePickerTitleOptionCurrent}` : ''}"
                    data-date-year-option="${y}"
                    role="option"
                    aria-selected="${selected ? 'true' : 'false'}"
                >${y}</button>
            `;
        }).join('');
        const monthMenuOpen = this.datePickerState.titleMenu === 'month';
        const yearMenuOpen = this.datePickerState.titleMenu === 'year';
        this.datePickerTitleEl.innerHTML = `
            <span class="${c.datePickerTitleControl}${monthMenuOpen ? ` ${c.datePickerTitleMenuOpen}` : ''}">
                <button
                    type="button"
                    class="${c.datePickerTitleSelect}"
                    data-date-title-toggle="month"
                    aria-label="Choose month"
                    aria-haspopup="listbox"
                    aria-expanded="${monthMenuOpen ? 'true' : 'false'}"
                >${escHtml(monthName)}</button>
                <span class="${c.datePickerTitleChevron}" aria-hidden="true"></span>
                <div
                    class="${c.datePickerTitleMenu}${monthMenuOpen ? ` ${c.datePickerTitleMenuOpen}` : ''}"
                    data-date-title-menu="month"
                    role="listbox"
                    aria-label="Month options"
                    ${monthMenuOpen ? '' : 'hidden'}
                >${monthOptions}</div>
            </span>
            <span class="${c.datePickerTitleControl}${yearMenuOpen ? ` ${c.datePickerTitleMenuOpen}` : ''}">
                <button
                    type="button"
                    class="${c.datePickerTitleSelect}"
                    data-date-title-toggle="year"
                    aria-label="Choose year"
                    aria-haspopup="listbox"
                    aria-expanded="${yearMenuOpen ? 'true' : 'false'}"
                >${year}</button>
                <span class="${c.datePickerTitleChevron}" aria-hidden="true"></span>
                <div
                    class="${c.datePickerTitleMenu}${yearMenuOpen ? ` ${c.datePickerTitleMenuOpen}` : ''}"
                    data-date-title-menu="year"
                    role="listbox"
                    aria-label="Year options"
                    ${yearMenuOpen ? '' : 'hidden'}
                >${yearOptions}</div>
            </span>
        `;

        if (!this.datePickerWeekdaysEl.dataset.ready) {
            const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            this.datePickerWeekdaysEl.innerHTML = weekdays.map((day) => `<span>${day}</span>`).join('');
            this.datePickerWeekdaysEl.dataset.ready = '1';
        }

        const firstDay = new Date(year, month, 1);
        const startOffset = (firstDay.getDay() + 6) % 7;
        const daysCurrent = daysInMonth(year, month);
        const daysPrev = daysInMonth(year, month - 1);
        const totalCells = 42;
        const cells = [];
        const selected = this.datePickerState.selectedDateValue;
        const todayValue = toYMD(new Date());
        const focusValue = selected || toYMD(active);

        for (let i = 0; i < totalCells; i++) {
            const cellIndex = i - startOffset + 1;
            let day = cellIndex;
            let cellMonth = month;
            let cellYear = year;
            let muted = false;
            if (cellIndex < 1) {
                day = daysPrev + cellIndex;
                cellMonth = month - 1;
                muted = true;
            } else if (cellIndex > daysCurrent) {
                day = cellIndex - daysCurrent;
                cellMonth = month + 1;
                muted = true;
            }
            const cellDate = new Date(cellYear, cellMonth, day);
            const ymd = toYMD(cellDate);
            const classes = [c.datePickerDay];
            if (muted) {
                classes.push(c.datePickerDayMuted);
            }
            if (selected && ymd === selected) {
                classes.push(c.datePickerDaySelected);
            }
            if (ymd === todayValue) {
                classes.push(c.datePickerDayToday);
            }
            const isSelected = !!selected && ymd === selected;
            const isToday = ymd === todayValue;
            const tabIndex = ymd === focusValue ? '0' : '-1';
            const currentAttr = isToday ? ' aria-current="date"' : '';
            cells.push(`<button type="button" class="${classes.join(' ')}" data-date-day="1" data-date-value="${ymd}" aria-label="${escHtml(formatDateForAria(cellDate))}" aria-selected="${isSelected ? 'true' : 'false'}"${currentAttr} tabindex="${tabIndex}">${day}</button>`);
        }

        this.datePickerGridEl.innerHTML = cells.join('');
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const inDays = (days) => toYMD(new Date(today.getFullYear(), today.getMonth(), today.getDate() + days));
        const quicks = [
            { label: 'Yesterday', value: inDays(-1) },
            { label: 'Today', value: toYMD(today) },
            { label: 'Tomorrow', value: inDays(1) },
            { label: 'Next Week', value: inDays(7) }
        ];
        this.datePickerQuickEl.innerHTML = `<div class="${c.datePickerQuickList}">${quicks.map((item) => {
            const breakClass = item.breakBefore ? ` ${c.datePickerQuickBtnBreak}` : '';
            return `<button type="button" class="${c.datePickerQuickBtn}${breakClass}" data-date-value="${item.value}">${item.label}</button>`;
        }).join('')}</div>`;

        const hasTime = this.datePickerState.fieldType === 'datetime';
        this.datePickerEl.classList.toggle(c.datePickerWithTime, hasTime);
        if (!this.datePickerTimeEl) {
            return;
        }
        if (!hasTime) {
            this.datePickerTimeEl.hidden = true;
            this.datePickerTimeEl.innerHTML = '';
            return;
        }
        const timeValue = normalizeTime24(this.datePickerState.selectedTimeValue, this.datePickerState.defaultTime);
        this.datePickerState.selectedTimeValue = timeValue;
        this.datePickerTimeEl.hidden = false;
        this.datePickerTimeEl.innerHTML = `
            <label class="${c.datePickerTimeLabel}">
                Time
                <input type="time" class="${c.datePickerTimeInput}" data-date-time-input aria-label="Choose time" step="300" value="${escHtml(timeValue)}" />
            </label>
        `;
    };

    QuickAddComponent.prototype.focusDatePickerDate = function focusDatePickerDate(value) {
        if (!this.datePickerEl || this.datePickerEl.hidden || !value) {
            return false;
        }
        const btn = this.datePickerEl.querySelector(`[data-date-day="1"][data-date-value="${value}"]`);
        if (btn && typeof btn.focus === 'function') {
            btn.focus();
            return true;
        }
        return false;
    };

    QuickAddComponent.prototype.getFloatingBounds = function getFloatingBounds(anchorEl) {
        const viewport = {
            left: 0,
            top: 0,
            right: window.innerWidth,
            bottom: window.innerHeight
        };
        const isValidRect = (rect) => rect && (rect.right - rect.left) > 24 && (rect.bottom - rect.top) > 24;
        const getClipAxes = (style) => {
            const overflowX = String(style.overflowX || style.overflow || '').toLowerCase();
            const overflowY = String(style.overflowY || style.overflow || '').toLowerCase();
            const clips = (value) => value === 'auto' || value === 'scroll' || value === 'hidden' || value === 'clip';
            return {
                x: clips(overflowX),
                y: clips(overflowY)
            };
        };

        let bounds = viewport;
        const visited = new Set();
        const applyAncestors = (startEl) => {
            let el = startEl;
            while (el && el !== document.body && el !== document.documentElement) {
                if (visited.has(el)) {
                    el = el.parentElement;
                    continue;
                }
                visited.add(el);
                const style = window.getComputedStyle(el);
                const clipAxes = getClipAxes(style);
                if (clipAxes.x || clipAxes.y) {
                    const rect = el.getBoundingClientRect();
                    if (clipAxes.x) {
                        bounds.left = Math.max(bounds.left, rect.left);
                        bounds.right = Math.min(bounds.right, rect.right);
                    }
                    if (clipAxes.y) {
                        bounds.top = Math.max(bounds.top, rect.top);
                        bounds.bottom = Math.min(bounds.bottom, rect.bottom);
                    }
                }
                if (style.position === 'fixed') {
                    break;
                }
                el = el.parentElement;
            }
        };

        if (anchorEl && anchorEl.parentElement) {
            applyAncestors(anchorEl.parentElement);
        }
        if (this.mountEl && this.mountEl.parentElement) {
            applyAncestors(this.mountEl.parentElement);
        }

        return isValidRect(bounds) ? Object.assign({}, bounds) : viewport;
    };

    QuickAddComponent.prototype.positionDatePicker = function positionDatePicker(anchorEl) {
        if (!this.datePickerEl) {
            return;
        }
        const rect = anchorEl && anchorEl.getBoundingClientRect
            ? anchorEl.getBoundingClientRect()
            : this.inputEl.getBoundingClientRect();
        const bounds = this.getFloatingBounds(anchorEl || this.inputEl);
        const hasTime = !!(this.datePickerState && this.datePickerState.fieldType === 'datetime');
        const pad = window.innerWidth <= 480 ? 8 : 10;
        const viewportWidth = Math.max(0, (bounds.right - bounds.left) - (pad * 2));
        const compactMax = window.innerWidth <= 480
            ? (hasTime ? 328 : 304)
            : (hasTime ? 356 : 324);
        const compactMin = window.innerWidth <= 480
            ? (hasTime ? 278 : 252)
            : (hasTime ? 308 : 286);
        const preferredWidth = Math.max(compactMin, (rect.width || 0) + 28);
        const width = Math.min(compactMax, viewportWidth, preferredWidth);
        const minLeft = bounds.left + pad;
        const maxLeft = bounds.right - width - pad;
        const left = Math.max(minLeft, Math.min(rect.left || minLeft, maxLeft));
        const prevHidden = this.datePickerEl.hidden;
        const prevVisibility = this.datePickerEl.style.visibility;
        const prevDisplay = this.datePickerEl.style.display;
        this.datePickerEl.hidden = false;
        this.datePickerEl.style.visibility = 'hidden';
        this.datePickerEl.style.removeProperty('display');
        this.datePickerEl.style.width = `${width}px`;
        const measuredHeight = Math.ceil(this.datePickerEl.getBoundingClientRect().height || this.datePickerEl.scrollHeight || 0);
        if (prevHidden) {
            this.datePickerEl.hidden = true;
        }
        this.datePickerEl.style.visibility = prevVisibility;
        if (prevDisplay) {
            this.datePickerEl.style.display = prevDisplay;
        } else {
            this.datePickerEl.style.removeProperty('display');
        }
        const fallbackHeight = window.innerWidth <= 480
            ? (hasTime ? 410 : 290)
            : (hasTime ? 360 : 280);
        const approxHeight = measuredHeight || fallbackHeight;
        const belowTop = (rect.bottom || rect.top || 0) + 8;
        const minTop = bounds.top + pad;
        const maxBottom = bounds.bottom - pad;
        let top = belowTop;
        if (belowTop + approxHeight > maxBottom) {
            top = Math.max(minTop, (rect.top || 0) - approxHeight - 8);
        }
        if (top + approxHeight > maxBottom) {
            top = Math.max(minTop, maxBottom - approxHeight);
        }
        this.datePickerEl.style.position = 'fixed';
        this.datePickerEl.style.left = `${left}px`;
        this.datePickerEl.style.top = `${top}px`;
        this.datePickerEl.style.width = `${width}px`;
        this.datePickerEl.style.maxWidth = `${Math.max(0, bounds.right - bounds.left - (pad * 2))}px`;
        this.datePickerEl.style.zIndex = '9999';
    };

    QuickAddComponent.prototype.materializeEntryFieldToken = function materializeEntryFieldToken(entryIndex, fieldKey, value, sourceRegion) {
        if (this.isAiMode()) {
            return null;
        }
        const origin = sourceRegion === 'card' ? 'card' : 'inline';
        const entry = (this.lastResult.entries || []).find((item) => item.index === entryIndex);
        const field = this.getFieldDefinition(fieldKey);
        if (!entry || !field) {
            return null;
        }
        const token = (entry.tokens || []).find((item) => item.kind === 'field' && item.key === fieldKey && normValue(item.value) === normValue(value));
        if (token) {
            return token;
        }
        const source = this.inputText || this.readInputText();
        const prefix = (field.prefixes && field.prefixes[0]) ? field.prefixes[0] : `${field.key}:`;
        const separator = String(this.config.fieldTerminator || '');
        const insertAt = Math.max(0, Number(entry.globalEnd) || 0);
        const beforeChar = source.charAt(Math.max(0, insertAt - 1));
        const needsSpace = !!beforeChar && !/\s/.test(beforeChar);
        const snippet = `${needsSpace ? ' ' : ''}${prefix}${value}${separator}`;
        const updated = this.replaceRange(source, insertAt, insertAt, snippet);
        this.parseAndRender({
            source: updated,
            focusInput: origin !== 'card',
            skipTypingSync: true
        });
        const nextEntry = (this.lastResult.entries || []).find((item) => item.index === entryIndex);
        if (!nextEntry) {
            return null;
        }
        return (nextEntry.tokens || []).filter((item) => item.kind === 'field' && item.key === fieldKey && item.committed).slice(-1)[0] || null;
    };

    QuickAddComponent.prototype.applyDateSelection = function applyDateSelection(nextValue) {
        if (!this.datePickerState) {
            return;
        }
        const nextDateValue = String(nextValue || '').trim();
        if (!fromYMD(nextDateValue)) {
            return;
        }
        this.datePickerState.selectedDateValue = nextDateValue;

        let commitValue = nextDateValue;
        if (this.datePickerState.fieldType === 'datetime') {
            const timeValue = normalizeTime24(this.datePickerState.selectedTimeValue, this.datePickerState.defaultTime);
            this.datePickerState.selectedTimeValue = timeValue;
            commitValue = `${nextDateValue}T${timeValue}`;
        }
        this.datePickerState.selectedValue = commitValue;

        if (this.datePickerState.aiContext) {
            const context = Object.assign({}, this.datePickerState.aiContext);
            this.datePickerSuppressUntil = Date.now() + 150;
            this.closeDatePicker();
            this.applyAIFieldSelection({
                entryId: context.entryId,
                fieldKey: context.fieldKey,
                currentValue: context.currentValue,
                occurrence: context.occurrence,
                mappingKey: context.mappingKey,
                nextValue: commitValue,
                sourceRegion: context.sourceRegion || this.datePickerState.sourceRegion
            });
            return;
        }

        let token = this.tokenMap[this.datePickerState.tokenId];
        if (!token && this.datePickerState.sourceRegion === 'card') {
            token = this.materializeEntryFieldToken(
                this.datePickerState.entryIndex,
                this.datePickerState.fieldKey,
                this.datePickerState.selectedValue || commitValue,
                this.datePickerState.sourceRegion
            );
        }
        if (!token) {
            this.closeDatePicker();
            return;
        }
        const source = this.inputText || this.readInputText();
        let updated = this.replaceRange(source, token.globalValueStart, token.globalValueEnd, commitValue);
        let caret = token.globalValueStart + String(commitValue).length;
        const terminator = String(this.config.fieldTerminator || '');
        if (!token.committed && terminator) {
            const tokenTail = updated.slice(caret, caret + terminator.length);
            if (tokenTail !== terminator) {
                updated = this.replaceRange(updated, caret, caret, terminator);
                caret += terminator.length;
            }
        }
        const sourceRegion = this.datePickerState && this.datePickerState.sourceRegion ? this.datePickerState.sourceRegion : 'inline';
        this.datePickerSuppressUntil = Date.now() + 150;
        this.closeDatePicker();
        this.parseAndRender({
            source: updated,
            caretOffset: caret,
            focusInput: sourceRegion !== 'card',
            skipTypingSync: sourceRegion === 'card'
        });
    };

    QuickAddComponent.prototype.bindEvents = function bindEvents() {
        this.onInput = () => {
            if (this.isRenderingInput) {
                return;
            }
            this.closeDropdown();
            this.closeAttachmentSourceMenu();
            this.closeBlockedInfo();
            this.closeDatePicker();
            this.closeNumberPicker();
            if (this.timer) {
                clearTimeout(this.timer);
            }
            if (this.isAiMode()) {
                this.inputText = this.readInputText();
                this.lastResult = this.syncEntryAttachmentMeta(this.buildAIResult());
                if (typeof this.config.onParse === 'function') {
                    this.config.onParse(this.lastResult);
                }
                const autoParse = this.config.ai.autoParse !== false;
                const threshold = Math.max(0, Number(this.config.ai.minInputLength || 0));
                if (!autoParse) {
                    return;
                }
                if (this.isAIOffline()) {
                    return;
                }
                const latest = String(this.inputText || this.readInputText() || '').trim();
                if (!latest || latest.length < threshold) {
                    return;
                }
                const rawWaitMs = Number(this.config.ai.debounceMs);
                const waitMs = Number.isFinite(rawWaitMs) && rawWaitMs >= 0 ? Math.max(50, Math.round(rawWaitMs)) : 1000;
                this.timer = setTimeout(() => {
                    this.parseAI();
                }, waitMs);
                return;
            }
            this.timer = setTimeout(() => {
                this.parseAndRender();
            }, this.config.debounceMs);
        };

        this.onBeforeInput = (event) => {
            if (this.isRenderingInput) {
                return;
            }
            const inputType = String(event.inputType || '');
            if (inputType === 'insertParagraph' || inputType === 'insertLineBreak') {
                event.preventDefault();
                this.insertTextAtSelection('\n', { preferTokenBoundary: true });
                return;
            }

            if (inputType === 'insertFromPaste') {
                const pasted = this.getPlainTextFromEvent(event);
                if (pasted === null) {
                    return;
                }
                event.preventDefault();
                this.insertTextAtSelection(pasted);
                return;
            }
        };

        this.onInputKeyDown = (event) => {
            const isTypingDropdown = !!(this.dropdownState && this.dropdownState.source === 'typing' && !this.dropdownEl.hidden);
            if (isTypingDropdown && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
                event.preventDefault();
                this.moveDropdownActiveOption(event.key === 'ArrowDown' ? 1 : -1);
                return;
            }
            if (event.key === 'Enter') {
                if (isTypingDropdown) {
                    const active = this.dropdownState.activeOptionValue;
                    if (active !== undefined && active !== null && active !== '') {
                        event.preventDefault();
                        this.applyDropdownSelection(active);
                        return;
                    }
                }
                event.preventDefault();
                this.insertTextAtSelection('\n', { preferTokenBoundary: true });
            }
        };

        this.onInputPaste = (event) => {
            if (event.defaultPrevented) {
                return;
            }
            const pasted = this.getPlainTextFromEvent(event);
            if (pasted === null) {
                return;
            }
            event.preventDefault();
            this.insertTextAtSelection(pasted);
        };

        this.onInputCopy = (event) => {
            if (!event.clipboardData) {
                return;
            }
            const offsets = this.getSelectionOffsets();
            if (!offsets || offsets.start === offsets.end) {
                return;
            }
            const source = this.inputText || this.readInputText();
            event.preventDefault();
            event.clipboardData.setData('text/plain', source.slice(offsets.start, offsets.end));
        };

        this.onInputCut = (event) => {
            if (!event.clipboardData) {
                return;
            }
            const offsets = this.getSelectionOffsets();
            if (!offsets || offsets.start === offsets.end) {
                return;
            }
            const source = this.inputText || this.readInputText();
            event.preventDefault();
            event.clipboardData.setData('text/plain', source.slice(offsets.start, offsets.end));
            this.replaceTextInInput(offsets.start, offsets.end, '');
        };

        this.onInputBlur = () => {
            this.inputText = this.readInputText();
        };

        this.onInputClick = (event) => {
            const numberStepBtn = event.target.closest('[data-number-step]');
            if (numberStepBtn) {
                event.preventDefault();
                event.stopPropagation();
                const direction = Number(numberStepBtn.getAttribute('data-number-step'));
                if (direction === -1 || direction === 1) {
                    this.adjustNumberPillValue(numberStepBtn.closest('[data-qa-pill="1"]'), direction);
                }
                return;
            }
            if (this.isAiMode()) {
                const tailAi = event.target.closest('[data-qa-tail="1"]');
                if (tailAi) {
                    event.preventDefault();
                    event.stopPropagation();
                    const sourceAi = this.inputText || this.readInputText();
                    this.closeDropdown();
                    this.setCaretOffset(sourceAi.length, true);
                    return;
                }
                const aiPill = event.target.closest('[data-qa-pill="1"]');
                if (aiPill) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.placeCaretNearPill(aiPill, event);
                    this.handlePillClick(aiPill);
                }
                return;
            }
            const blocked = event.target.closest('[data-qa-blocked="1"]');
            if (blocked) {
                event.preventDefault();
                event.stopPropagation();
                this.showBlockedInfoFromElement(blocked);
                return;
            }
            const dismissBtn = event.target.closest('[data-dismiss-key]');
            if (dismissBtn) {
                event.preventDefault();
                event.stopPropagation();
                const dismissKey = dismissBtn.getAttribute('data-dismiss-key');
                if (dismissKey) {
                    this.dismissSelection(dismissKey);
                }
                return;
            }
            const tail = event.target.closest('[data-qa-tail="1"]');
            if (tail) {
                event.preventDefault();
                event.stopPropagation();
                const source = this.inputText || this.readInputText();
                this.closeDropdown();
                this.setCaretOffset(source.length, true);
                return;
            }
            const pill = event.target.closest('[data-qa-pill="1"]');
            if (!pill) {
                return;
            }
            event.preventDefault();
            this.placeCaretNearPill(pill, event);
            this.handlePillClick(pill);
        };

        this.onPreviewClick = (event) => {
            const numberStepBtn = event.target.closest('[data-number-step]');
            if (numberStepBtn) {
                event.preventDefault();
                event.stopPropagation();
                const direction = Number(numberStepBtn.getAttribute('data-number-step'));
                if (direction === -1 || direction === 1) {
                    this.adjustNumberPillValue(numberStepBtn.closest('[data-qa-pill="1"]'), direction);
                }
                return;
            }
            const removeBtn = event.target.closest('[data-global-attachment-remove="1"]');
            if (removeBtn) {
                event.preventDefault();
                event.stopPropagation();
                const attachmentId = removeBtn.getAttribute('data-attachment-id') || '';
                if (attachmentId) {
                    this.removeGlobalAttachment(attachmentId, false, 'card');
                }
                return;
            }

            const fieldRemoveBtn = event.target.closest('[data-field-attachment-remove="1"]');
            if (fieldRemoveBtn) {
                event.preventDefault();
                event.stopPropagation();
                const entryKeyRaw = fieldRemoveBtn.getAttribute('data-entry-key');
                const entryKeyNum = Number(entryKeyRaw);
                const entryKey = Number.isNaN(entryKeyNum) ? entryKeyRaw : entryKeyNum;
                const fieldKey = fieldRemoveBtn.getAttribute('data-file-field-key') || '';
                const ref = fieldRemoveBtn.getAttribute('data-attachment-ref') || '';
                if (fieldKey && ref !== '') {
                    this.removeAttachmentFromEntryField(entryKey, fieldKey, ref, 'card');
                }
                return;
            }

            const openBtn = event.target.closest('[data-attachment-open="1"]');
            if (openBtn) {
                event.preventDefault();
                event.stopPropagation();
                const attachmentId = openBtn.getAttribute('data-attachment-id') || '';
                if (attachmentId) {
                    this.openAttachment(attachmentId);
                }
                return;
            }

            const entryLinkBtn = event.target.closest('[data-entry-file-link="1"]');
            if (entryLinkBtn) {
                event.preventDefault();
                event.stopPropagation();
                const fieldKey = entryLinkBtn.getAttribute('data-file-field-key') || '';
                const field = this.getFieldDefinition(fieldKey);
                if (!field || !isFileFieldType(field.type)) {
                    return;
                }
                const entryId = entryLinkBtn.getAttribute('data-entry-id');
                const entryIndex = Number(entryLinkBtn.getAttribute('data-entry-index'));
                const entryKey = entryId || (Number.isNaN(entryIndex) ? '' : entryIndex);
                if (entryKey === '') {
                    return;
                }
                const options = this.getDropdownOptionsForField(field, entryKey, fieldKey);
                if (!options.length) {
                    return;
                }
                const currentEntry = this.isAiMode()
                    ? (this.aiState.entries || []).find((item) => item && item._id === entryKey)
                    : (this.lastResult.entries || []).find((item) => this.getEntryKey(item) === entryKey);
                const currentRefs = currentEntry ? this.resolveEntryFieldValues(currentEntry, fieldKey) : [];
                this.dropdownState = {
                    fieldKey,
                    fieldType: field.type,
                    tokenId: '',
                    entryIndex: Number.isFinite(Number(entryIndex)) ? Number(entryIndex) : 0,
                    entryKey,
                    currentValue: field.multiple ? currentRefs : (currentRefs[0] || ''),
                    allowCustom: false,
                    options,
                    sourceRegion: 'card',
                    anchorRect: entryLinkBtn.getBoundingClientRect(),
                    anchorEl: entryLinkBtn,
                    source: 'click',
                    activeOptionValue: null,
                    filteredOptions: [],
                    activateFirstOnOpen: true,
                    keepActiveWhenFiltering: false
                };
                if (this.timer) {
                    clearTimeout(this.timer);
                    this.timer = null;
                }
                this.dropdownSearchEl.hidden = false;
                this.dropdownSearchEl.value = '';
                this.renderDropdownList();
                this.positionDropdown(entryLinkBtn);
                this.dropdownEl.hidden = false;
                this.dropdownEl.classList.add(this.config.classNames.dropdownOpen);
                this.scrollDropdownActiveOptionIntoView();
                this.dropdownSearchEl.focus();
                return;
            }

            const pickerToggle = event.target.closest('[data-entry-attachment-picker-toggle="1"]');
            if (pickerToggle) {
                event.preventDefault();
                event.stopPropagation();
                const sources = normalizeAttachmentSources(pickerToggle.getAttribute('data-attachment-sources')) || [];
                if (!sources.length) {
                    return;
                }
                const labelBySource = {
                    camera: 'Camera',
                    gallery: 'Gallery',
                    files: 'Files'
                };
                const items = sources.map((source) => {
                    const inputId = pickerToggle.getAttribute(`data-attachment-${source}-input`) || '';
                    return {
                        source,
                        inputId,
                        label: labelBySource[source] || source
                    };
                }).filter((item) => item.inputId);
                if (!items.length) {
                    return;
                }
                if (
                    this.attachmentSourceMenuState
                    && this.attachmentSourceMenuState.anchorEl === pickerToggle
                    && this.attachmentSourceMenuEl
                    && !this.attachmentSourceMenuEl.hidden
                ) {
                    this.closeAttachmentSourceMenu();
                    return;
                }
                this.openAttachmentSourceMenu(pickerToggle, items);
                return;
            }

            if (this.isAiMode()) {
                const aiPill = event.target.closest('[data-qa-pill="1"]');
                if (aiPill) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.handlePillClick(aiPill);
                    return;
                }
                const actionEl = event.target.closest('[data-ai-action]');
                if (!actionEl) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                const action = actionEl.getAttribute('data-ai-action') || '';
                const entryId = actionEl.getAttribute('data-ai-entry-id') || '';
                if (action === 'parse-now') {
                    this.parseAI({ force: true });
                    return;
                }
                if (action === 'clear-entries') {
                    this.clearAIEntries();
                    this.parseAndRender({ source: this.inputText });
                    return;
                }
                if (action === 'edit-entry') {
                    this.aiState.editingEntryId = entryId;
                    this.parseAndRender({ source: this.inputText });
                    return;
                }
                if (action === 'cancel-edit') {
                    this.aiState.editingEntryId = '';
                    this.parseAndRender({ source: this.inputText });
                    return;
                }
                if (action === 'save-edit') {
                    const targetEntry = this.aiState.entries.find((item) => item._id === entryId);
                    if (targetEntry) {
                        const fields = (this.normalizedSchema && Array.isArray(this.normalizedSchema.fields))
                            ? this.normalizedSchema.fields
                            : [];
                        fields.forEach((field) => {
                            if (!field || !field.key) {
                                return;
                            }
                            const inputId = this.getAIEditInputId(entryId, field.key);
                            const node = document.getElementById(inputId);
                            if (!node) {
                                return;
                            }
                            const raw = String(node.value || '').trim();
                            if (field.key === 'status') {
                                targetEntry[field.key] = this.normalizeAIStatus(raw);
                                return;
                            }
                            if (isFileFieldType(field.type)) {
                                if (field.multiple) {
                                    targetEntry[field.key] = this.normalizeAIAttachmentRefs(raw);
                                } else {
                                    targetEntry[field.key] = raw;
                                }
                                return;
                            }
                            if (field.type === 'number') {
                                const num = Number(raw);
                                targetEntry[field.key] = Number.isFinite(num) ? num : null;
                                return;
                            }
                            if (field.multiple) {
                                const parsedMulti = raw
                                    ? splitByMultiSeparator(raw, String(this.config.multiSelectSeparator || ','))
                                    : [];
                                targetEntry[field.key] = parsedMulti;
                                return;
                            }
                            targetEntry[field.key] = raw;
                        });
                        this.aiState.editedEntries.add(entryId);
                    }
                    this.aiState.editingEntryId = '';
                    this.parseAndRender({ source: this.inputText });
                    return;
                }
                if (action === 'delete-entry') {
                    this.markAIEntryDeleted(entryId, true);
                    this.aiState.editingEntryId = '';
                    this.parseAndRender({ source: this.inputText });
                    return;
                }
                if (action === 'restore-entry') {
                    this.markAIEntryDeleted(entryId, false);
                    this.parseAndRender({ source: this.inputText });
                }
                return;
            }

            const deterministicAction = event.target.closest('[data-det-action]');
            if (deterministicAction) {
                event.preventDefault();
                event.stopPropagation();
                const action = deterministicAction.getAttribute('data-det-action') || '';
                if (action === 'remove-entry') {
                    const entryIndex = Number(deterministicAction.getAttribute('data-entry-index'));
                    if (Number.isFinite(entryIndex)) {
                        this.removeDeterministicEntry(entryIndex, 'card');
                    }
                }
                return;
            }

            const blocked = event.target.closest('[data-qa-blocked="1"]');
            if (blocked) {
                event.preventDefault();
                event.stopPropagation();
                this.showBlockedInfoFromElement(blocked);
                return;
            }
            const dismissBtn = event.target.closest('[data-dismiss-key]');
            if (dismissBtn) {
                event.preventDefault();
                event.stopPropagation();
                const dismissKey = dismissBtn.getAttribute('data-dismiss-key');
                if (dismissKey) {
                    this.dismissSelection(dismissKey);
                }
                return;
            }
            const pill = event.target.closest('[data-qa-pill="1"]');
            if (!pill) {
                return;
            }
            this.handlePillClick(pill);
        };

        this.onDatePickerClick = (event) => {
            const targetEl = eventTargetElement(event);
            if (!targetEl) {
                return;
            }
            const titleToggle = targetEl.closest('[data-date-title-toggle]');
            if (titleToggle && this.datePickerState) {
                event.preventDefault();
                const menu = titleToggle.getAttribute('data-date-title-toggle') || '';
                this.datePickerState.titleMenu = this.datePickerState.titleMenu === menu ? '' : menu;
                this.datePickerInternalClickUntil = Date.now() + 160;
                this.renderDatePicker();
                return;
            }
            const monthOption = targetEl.closest('[data-date-month-option]');
            if (monthOption && this.datePickerState) {
                event.preventDefault();
                const monthValue = Number(monthOption.getAttribute('data-date-month-option'));
                if (!Number.isNaN(monthValue) && monthValue >= 0 && monthValue <= 11) {
                    const active = this.datePickerState.activeDate || new Date();
                    this.datePickerState.activeDate = new Date(active.getFullYear(), monthValue, 1);
                    this.datePickerState.titleMenu = '';
                    this.datePickerInternalClickUntil = Date.now() + 160;
                    this.renderDatePicker();
                }
                return;
            }
            const yearOption = targetEl.closest('[data-date-year-option]');
            if (yearOption && this.datePickerState) {
                event.preventDefault();
                const yearValue = Number(yearOption.getAttribute('data-date-year-option'));
                if (!Number.isNaN(yearValue) && yearValue >= 1 && yearValue <= 9999) {
                    const active = this.datePickerState.activeDate || new Date();
                    this.datePickerState.activeDate = new Date(yearValue, active.getMonth(), 1);
                    this.datePickerState.titleMenu = '';
                    this.datePickerInternalClickUntil = Date.now() + 160;
                    this.renderDatePicker();
                }
                return;
            }
            const navBtn = targetEl.closest('[data-date-nav]');
            if (navBtn) {
                event.preventDefault();
                const direction = navBtn.getAttribute('data-date-nav');
                if (this.datePickerState) {
                    const active = this.datePickerState.activeDate;
                    const offset = direction === 'prev' ? -1 : 1;
                    this.datePickerState.activeDate = new Date(active.getFullYear(), active.getMonth() + offset, 1);
                    this.datePickerState.titleMenu = '';
                    this.datePickerInternalClickUntil = Date.now() + 160;
                    this.renderDatePicker();
                }
                return;
            }
            const dayBtn = targetEl.closest('[data-date-value]');
            if (dayBtn) {
                event.preventDefault();
                const value = dayBtn.getAttribute('data-date-value');
                if (value) {
                    if (this.datePickerState) {
                        this.datePickerState.titleMenu = '';
                    }
                    this.applyDateSelection(value);
                }
            }
        };

        this.onDatePickerChange = (event) => {
            const targetEl = eventTargetElement(event);
            if (!targetEl || !this.datePickerState) {
                return;
            }
            if (targetEl.hasAttribute('data-date-time-input')) {
                const nextTime = normalizeTime24(targetEl.value, this.datePickerState.defaultTime);
                this.datePickerState.selectedTimeValue = nextTime;
                targetEl.value = nextTime;
                return;
            }
        };

        this.onDatePickerKeyDown = (event) => {
            if (!this.datePickerState) {
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                if (this.datePickerState.titleMenu) {
                    this.datePickerState.titleMenu = '';
                    this.renderDatePicker();
                    return;
                }
                this.closeDatePicker();
                return;
            }
            const targetEl = eventTargetElement(event);
            if (!targetEl) {
                return;
            }
            if (targetEl.hasAttribute('data-date-time-input')) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    const nextTime = normalizeTime24(targetEl.value, this.datePickerState.defaultTime);
                    this.datePickerState.selectedTimeValue = nextTime;
                    targetEl.value = nextTime;
                    this.applyDateSelection(this.datePickerState.selectedDateValue || toYMD(this.datePickerState.activeDate || new Date()));
                }
                return;
            }
            const dayBtn = targetEl.closest('[data-date-day="1"]');
            if (!dayBtn) {
                return;
            }
            const currentValue = dayBtn.getAttribute('data-date-value') || '';
            const currentDate = fromYMD(currentValue);
            if (!currentDate) {
                return;
            }
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.applyDateSelection(currentValue);
                return;
            }
            let nextDate = null;
            if (event.key === 'ArrowLeft') {
                nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1);
            } else if (event.key === 'ArrowRight') {
                nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
            } else if (event.key === 'ArrowUp') {
                nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7);
            } else if (event.key === 'ArrowDown') {
                nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7);
            } else if (event.key === 'PageUp') {
                nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate());
            } else if (event.key === 'PageDown') {
                nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
            } else if (event.key === 'Home') {
                const weekday = (currentDate.getDay() + 6) % 7;
                nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - weekday);
            } else if (event.key === 'End') {
                const weekday = (currentDate.getDay() + 6) % 7;
                nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + (6 - weekday));
            }
            if (!nextDate) {
                return;
            }
            event.preventDefault();
            this.datePickerState.activeDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
            this.renderDatePicker();
            if (!this.focusDatePickerDate(toYMD(nextDate)) && this.datePickerEl) {
                this.datePickerEl.focus();
            }
        };

        this.onNumberPickerClick = (event) => {
            const targetEl = eventTargetElement(event);
            if (!targetEl || !this.numberPickerState) {
                return;
            }
            const actionBtn = targetEl.closest('[data-number-action]');
            if (!actionBtn) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            const action = actionBtn.getAttribute('data-number-action');
            this.applyNumberStep(action === 'decrement' ? -1 : 1);
        };

        this.onNumberPickerInput = (event) => {
            const targetEl = eventTargetElement(event);
            if (!targetEl || !this.numberPickerState || targetEl.getAttribute('data-role') !== 'numberPickerStepInput') {
                return;
            }
            const next = Number(targetEl.value);
            if (Number.isFinite(next) && next > 0) {
                this.numberPickerState = Object.assign({}, this.numberPickerState, { step: next });
            }
        };

        this.onNumberPickerChange = (event) => {
            const targetEl = eventTargetElement(event);
            if (!targetEl || !this.numberPickerState || targetEl.getAttribute('data-role') !== 'numberPickerStepInput') {
                return;
            }
            const field = this.getFieldDefinition(this.numberPickerState.fieldKey);
            const nextStep = this.resolveNumberStep(field, targetEl.value);
            this.numberPickerState = Object.assign({}, this.numberPickerState, { step: nextStep });
            targetEl.value = String(nextStep);
        };

        this.onNumberPickerKeyDown = (event) => {
            if (!this.numberPickerState) {
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                this.closeNumberPicker();
                return;
            }
            if (event.key === 'Enter') {
                event.stopPropagation();
            }
        };

        this.onPreviewChange = (event) => {
            const input = event.target.closest('[data-global-attachment-input="1"]');
            if (!input || !input.files) {
                return;
            }
            this.closeAttachmentSourceMenu();
            this.addGlobalAttachments(Array.from(input.files));
            input.value = '';
        };

        this.onAttachmentSourceMenuClick = (event) => {
            const optionBtn = event.target.closest('[data-entry-attachment-source-option="1"]');
            if (!optionBtn) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            const inputId = optionBtn.getAttribute('data-attachment-input-id') || '';
            const input = inputId ? document.getElementById(inputId) : null;
            this.closeAttachmentSourceMenu();
            if (input && typeof input.click === 'function') {
                input.click();
            }
        };

        this.onConflictModalClick = (event) => {
            const targetEl = eventTargetElement(event);
            if (!targetEl || !this.conflictModalState) {
                return;
            }
            const actionBtn = targetEl.closest('[data-conflict-action]');
            if (!actionBtn) {
                if (this.conflictModalEl && !this.conflictModalEl.contains(targetEl)) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.handleConflictModalAction('cancel');
                }
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            this.handleConflictModalAction(actionBtn.getAttribute('data-conflict-action') || 'cancel');
        };

        this.onDropdownInput = () => {
            if (this.dropdownState) {
                this.dropdownState.activeOptionValue = null;
                this.dropdownState.keepActiveWhenFiltering = false;
            }
            this.renderDropdownList();
        };

        this.onDropdownListScroll = () => {
            this.updateDropdownScrollIndicators();
        };

        this.onDropdownSearchKeyDown = (event) => {
            if (!this.dropdownState) {
                return;
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                this.moveDropdownActiveOption(event.key === 'ArrowDown' ? 1 : -1);
                return;
            }
            if (event.key === 'Enter') {
                const active = this.dropdownState.activeOptionValue;
                if (active !== undefined && active !== null && active !== '') {
                    event.preventDefault();
                    this.applyDropdownSelection(active);
                }
            }
        };

        this.onDropdownListClick = (event) => {
            const optionBtn = event.target.closest('[data-option-value]');
            if (!optionBtn) {
                return;
            }
            const value = optionBtn.getAttribute('data-option-value') || '';
            this.applyDropdownSelection(value);
        };

        this.onDocumentPointerDown = (event) => {
            const targetEl = eventTargetElement(event);
            if (!targetEl) {
                return;
            }
            if (this.conflictModalState && this.conflictModalOverlayEl && !this.conflictModalOverlayEl.hidden) {
                const insideConflict = this.conflictModalEl && this.conflictModalEl.contains(targetEl);
                if (!insideConflict) {
                    this.handleConflictModalAction('cancel');
                    event.stopPropagation();
                    event.preventDefault();
                    return;
                }
                event.stopPropagation();
                return;
            }
            if (this.attachmentSourceMenuEl && !this.attachmentSourceMenuEl.hidden) {
                const insideMenu = this.attachmentSourceMenuEl.contains(targetEl);
                const onToggle = !!targetEl.closest('[data-entry-attachment-picker-toggle="1"]');
                if (!insideMenu && !onToggle) {
                    this.closeAttachmentSourceMenu();
                    event.stopPropagation();
                    event.preventDefault();
                    return;
                }
            }
            if (this.datePickerEl && !this.datePickerEl.hidden) {
                if (Date.now() < this.datePickerInternalClickUntil) {
                    return;
                }
                if (!this.datePickerEl.contains(targetEl) && !targetEl.closest('[data-qa-date-pill="1"]')) {
                    this.closeDatePicker();
                    event.stopPropagation();
                    event.preventDefault();
                    return;
                }
            }
            if (this.numberPickerEl && !this.numberPickerEl.hidden) {
                if (!this.numberPickerEl.contains(targetEl) && !targetEl.closest('[data-qa-number-pill="1"]')) {
                    this.closeNumberPicker();
                    event.stopPropagation();
                    event.preventDefault();
                    return;
                }
            }
            if (this.dropdownEl && !this.dropdownEl.hidden) {
                if (!this.dropdownEl.contains(targetEl) && !targetEl.closest('[data-qa-pill="1"]')) {
                    this.closeDropdown();
                    event.stopPropagation();
                    event.preventDefault();
                    return;
                }
            }
            if (this.blockedInfoEl && !this.blockedInfoEl.hidden) {
                if (!this.blockedInfoEl.contains(targetEl) && !targetEl.closest('[data-qa-blocked="1"]')) {
                    this.closeBlockedInfo();
                    event.stopPropagation();
                    event.preventDefault();
                }
            }
        };

        this.onDocumentClick = (event) => {
            const targetEl = eventTargetElement(event);
            if (!targetEl) {
                return;
            }
            if (this.conflictModalState && this.conflictModalOverlayEl && !this.conflictModalOverlayEl.hidden) {
                if (this.conflictModalEl && this.conflictModalEl.contains(targetEl)) {
                    return;
                }
                event.stopPropagation();
                event.preventDefault();
                return;
            }
            if (this.attachmentSourceMenuEl && !this.attachmentSourceMenuEl.hidden) {
                if (
                    !this.attachmentSourceMenuEl.contains(targetEl)
                    && !targetEl.closest('[data-entry-attachment-picker-toggle="1"]')
                ) {
                    this.closeAttachmentSourceMenu();
                    event.stopPropagation();
                    event.preventDefault();
                    return;
                }
            }
            if (this.blockedInfoEl && !this.blockedInfoEl.hidden) {
                if (!this.blockedInfoEl.contains(targetEl) && !targetEl.closest('[data-qa-blocked="1"]')) {
                    this.closeBlockedInfo();
                }
            }
            if (this.datePickerEl && !this.datePickerEl.hidden) {
                if (Date.now() < this.datePickerInternalClickUntil) {
                    return;
                }
                if (!this.datePickerEl.contains(targetEl) && !targetEl.closest('[data-qa-date-pill="1"]')) {
                    this.closeDatePicker();
                }
            }
            if (this.numberPickerEl && !this.numberPickerEl.hidden) {
                if (!this.numberPickerEl.contains(targetEl) && !targetEl.closest('[data-qa-number-pill="1"]')) {
                    this.closeNumberPicker();
                }
            }
            if (this.dropdownEl && !this.dropdownEl.hidden) {
                if (this.dropdownEl.contains(targetEl)) {
                    return;
                }
                if (targetEl.closest('[data-qa-pill="1"]')) {
                    return;
                }
                this.closeDropdown();
            }
        };

        this.onDocumentKeyDown = (event) => {
            if (event.key === 'Escape') {
                if (this.conflictModalState) {
                    this.handleConflictModalAction('cancel');
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                if (this.attachmentSourceMenuState) {
                    this.closeAttachmentSourceMenu();
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                if (this.dropdownState) {
                    this.closeDropdown();
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                if (this.numberPickerState) {
                    this.closeNumberPicker();
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                if (this.blockedInfoState) {
                    this.closeBlockedInfo();
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                if (this.datePickerState) {
                    this.closeDatePicker();
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
            }
            if (event.key === 'Escape' && this.dropdownState) {
                this.closeDropdown();
            }
            if (event.key === 'Escape' && this.numberPickerState) {
                event.preventDefault();
                this.closeNumberPicker();
            }
            if (event.key === 'Escape' && this.blockedInfoState) {
                this.closeBlockedInfo();
            }
            if (event.key === 'Escape' && this.datePickerState) {
                event.preventDefault();
                this.closeDatePicker();
            }
            if (
                event.key === 'Enter'
                && (
                    this.dropdownState
                    || this.numberPickerState
                    || this.datePickerState
                    || this.attachmentSourceMenuState
                    || this.blockedInfoState
                )
            ) {
                event.stopPropagation();
            }
        };

        this.onViewportChange = (event) => {
            const targetEl = eventTargetElement(event);
            if (targetEl && this.dropdownEl && this.dropdownEl.contains(targetEl)) {
                return;
            }
            if (this.viewportRepositionFrame) {
                return;
            }
            this.viewportRepositionFrame = window.requestAnimationFrame(() => {
                this.viewportRepositionFrame = 0;
                if (this.dropdownState && this.dropdownEl && !this.dropdownEl.hidden) {
                    this.positionDropdown(this.dropdownState.anchorEl || null);
                }
                if (this.datePickerState && this.datePickerEl && !this.datePickerEl.hidden) {
                    this.positionDatePicker(this.datePickerState.anchorEl || null);
                }
                if (this.numberPickerState && this.numberPickerEl && !this.numberPickerEl.hidden) {
                    this.positionNumberPicker(this.numberPickerState.anchorEl || null);
                }
            });
        };

        this.inputEl.addEventListener('input', this.onInput);
        this.inputEl.addEventListener('beforeinput', this.onBeforeInput);
        this.inputEl.addEventListener('keydown', this.onInputKeyDown);
        this.inputEl.addEventListener('paste', this.onInputPaste);
        this.inputEl.addEventListener('copy', this.onInputCopy);
        this.inputEl.addEventListener('cut', this.onInputCut);
        this.inputEl.addEventListener('blur', this.onInputBlur);
        this.inputEl.addEventListener('click', this.onInputClick);
        this.previewEl.addEventListener('click', this.onPreviewClick);
        this.previewEl.addEventListener('change', this.onPreviewChange);
        this.dropdownSearchEl.addEventListener('input', this.onDropdownInput);
        this.dropdownSearchEl.addEventListener('keydown', this.onDropdownSearchKeyDown);
        this.dropdownListEl.addEventListener('click', this.onDropdownListClick);
        this.dropdownListEl.addEventListener('scroll', this.onDropdownListScroll, { passive: true });
        this.attachmentSourceMenuEl.addEventListener('click', this.onAttachmentSourceMenuClick);
        if (this.conflictModalOverlayEl) {
            this.conflictModalOverlayEl.addEventListener('click', this.onConflictModalClick);
        }
        this.datePickerEl.addEventListener('click', this.onDatePickerClick);
        this.datePickerEl.addEventListener('change', this.onDatePickerChange);
        this.datePickerEl.addEventListener('keydown', this.onDatePickerKeyDown);
        this.numberPickerEl.addEventListener('click', this.onNumberPickerClick);
        this.numberPickerEl.addEventListener('input', this.onNumberPickerInput);
        this.numberPickerEl.addEventListener('change', this.onNumberPickerChange);
        this.numberPickerEl.addEventListener('keydown', this.onNumberPickerKeyDown);
        document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
        document.addEventListener('click', this.onDocumentClick, true);
        document.addEventListener('keydown', this.onDocumentKeyDown, true);
        window.addEventListener('scroll', this.onViewportChange, true);
        window.addEventListener('resize', this.onViewportChange, true);
    };

    QuickAddComponent.prototype.unbindEvents = function unbindEvents() {
        if (this.inputEl && this.onInput) {
            this.inputEl.removeEventListener('input', this.onInput);
        }
        if (this.inputEl && this.onBeforeInput) {
            this.inputEl.removeEventListener('beforeinput', this.onBeforeInput);
        }
        if (this.inputEl && this.onInputKeyDown) {
            this.inputEl.removeEventListener('keydown', this.onInputKeyDown);
        }
        if (this.inputEl && this.onInputPaste) {
            this.inputEl.removeEventListener('paste', this.onInputPaste);
        }
        if (this.inputEl && this.onInputCopy) {
            this.inputEl.removeEventListener('copy', this.onInputCopy);
        }
        if (this.inputEl && this.onInputCut) {
            this.inputEl.removeEventListener('cut', this.onInputCut);
        }
        if (this.inputEl && this.onInputBlur) {
            this.inputEl.removeEventListener('blur', this.onInputBlur);
        }
        if (this.inputEl && this.onInputClick) {
            this.inputEl.removeEventListener('click', this.onInputClick);
        }
        if (this.previewEl && this.onPreviewClick) {
            this.previewEl.removeEventListener('click', this.onPreviewClick);
        }
        if (this.previewEl && this.onPreviewChange) {
            this.previewEl.removeEventListener('change', this.onPreviewChange);
        }
        if (this.dropdownSearchEl && this.onDropdownInput) {
            this.dropdownSearchEl.removeEventListener('input', this.onDropdownInput);
        }
        if (this.dropdownSearchEl && this.onDropdownSearchKeyDown) {
            this.dropdownSearchEl.removeEventListener('keydown', this.onDropdownSearchKeyDown);
        }
        if (this.dropdownListEl && this.onDropdownListClick) {
            this.dropdownListEl.removeEventListener('click', this.onDropdownListClick);
        }
        if (this.dropdownListEl && this.onDropdownListScroll) {
            this.dropdownListEl.removeEventListener('scroll', this.onDropdownListScroll);
        }
        if (this.attachmentSourceMenuEl && this.onAttachmentSourceMenuClick) {
            this.attachmentSourceMenuEl.removeEventListener('click', this.onAttachmentSourceMenuClick);
        }
        if (this.conflictModalOverlayEl && this.onConflictModalClick) {
            this.conflictModalOverlayEl.removeEventListener('click', this.onConflictModalClick);
        }
        if (this.datePickerEl && this.onDatePickerClick) {
            this.datePickerEl.removeEventListener('click', this.onDatePickerClick);
        }
        if (this.datePickerEl && this.onDatePickerChange) {
            this.datePickerEl.removeEventListener('change', this.onDatePickerChange);
        }
        if (this.datePickerEl && this.onDatePickerKeyDown) {
            this.datePickerEl.removeEventListener('keydown', this.onDatePickerKeyDown);
        }
        if (this.numberPickerEl && this.onNumberPickerClick) {
            this.numberPickerEl.removeEventListener('click', this.onNumberPickerClick);
        }
        if (this.numberPickerEl && this.onNumberPickerInput) {
            this.numberPickerEl.removeEventListener('input', this.onNumberPickerInput);
        }
        if (this.numberPickerEl && this.onNumberPickerChange) {
            this.numberPickerEl.removeEventListener('change', this.onNumberPickerChange);
        }
        if (this.numberPickerEl && this.onNumberPickerKeyDown) {
            this.numberPickerEl.removeEventListener('keydown', this.onNumberPickerKeyDown);
        }
        document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
        document.removeEventListener('click', this.onDocumentClick, true);
        document.removeEventListener('keydown', this.onDocumentKeyDown, true);
        window.removeEventListener('scroll', this.onViewportChange, true);
        window.removeEventListener('resize', this.onViewportChange, true);
        if (this.viewportRepositionFrame) {
            window.cancelAnimationFrame(this.viewportRepositionFrame);
            this.viewportRepositionFrame = 0;
        }
    };

    QuickAddComponent.prototype.rebuildTokenMap = function rebuildTokenMap(result) {
        const map = {};
        result.entries.forEach((entry) => {
            entry.tokens.forEach((token) => {
                map[token.id] = token;
            });
            (entry.inferred || []).forEach((inf) => {
                map[inf.id] = {
                    id: inf.id,
                    kind: 'field',
                    key: inf.fieldKey,
                    prefix: '',
                    value: inf.value,
                    committed: true,
                    globalStart: inf.globalStart,
                    globalEnd: inf.globalEnd,
                    globalValueStart: inf.globalStart,
                    globalValueEnd: inf.globalEnd
                };
            });
        });
        this.tokenMap = map;
    };

    QuickAddComponent.prototype.buildDismissKey = function buildDismissKey(parts) {
        return JSON.stringify([
            parts.entryIndex,
            parts.fieldKey,
            normValue(parts.value),
            parts.sourceKind,
            normValue(parts.rawChunk || ''),
            parts.occurrence
        ]);
    };

    QuickAddComponent.prototype.removeFieldValue = function removeFieldValue(entry, fieldKey, value) {
        const current = entry.fields[fieldKey];
        if (current === undefined) {
            return false;
        }

        if (Array.isArray(value)) {
            let changed = false;
            value.forEach((item) => {
                if (this.removeFieldValue(entry, fieldKey, item)) {
                    changed = true;
                }
            });
            return changed;
        }

        if (Array.isArray(current)) {
            const idx = current.findIndex((v) => normValue(v) === normValue(value));
            if (idx < 0) {
                return false;
            }
            current.splice(idx, 1);
            if (current.length === 0) {
                delete entry.fields[fieldKey];
            }
            return true;
        }

        if (normValue(current) !== normValue(value)) {
            return false;
        }
        delete entry.fields[fieldKey];
        return true;
    };

    QuickAddComponent.prototype.pruneDismissedSelections = function pruneDismissedSelections(activeKeys) {
        if (!this.dismissedSelections || this.dismissedSelections.size === 0) {
            return;
        }
        const next = new Set();
        this.dismissedSelections.forEach((key) => {
            if (activeKeys.has(key)) {
                next.add(key);
            }
        });
        this.dismissedSelections = next;
    };

    QuickAddComponent.prototype.applyDismissedSelections = function applyDismissedSelections(result) {
        const hasDismissed = this.dismissedSelections && this.dismissedSelections.size > 0;
        const activeKeys = new Set();

        result.entries.forEach((entry) => {
            const rawSelections = this.collectEntrySelections(entry);
            const selections = this.collapseSelectionsForCards(entry, rawSelections);
            selections.forEach((selection) => {
                if (selection.dismissKey) {
                    activeKeys.add(selection.dismissKey);
                }
                if (!hasDismissed || !selection.dismissKey) {
                    return;
                }
                if (!this.dismissedSelections.has(selection.dismissKey)) {
                    return;
                }
                const targetValue = Array.isArray(selection.values) ? selection.values : selection.value;
                this.removeFieldValue(entry, selection.fieldKey, targetValue);
            });
            applyRequiredValidation(entry, this.normalizedSchema);
        });

        this.pruneDismissedSelections(activeKeys);

        result.validCount = result.entries.filter((entry) => entry.isValid).length;
        result.invalidCount = result.entryCount - result.validCount;
        return result;
    };

    QuickAddComponent.prototype.readInputText = function readInputText() {
        const root = this.inputEl;
        if (!root) {
            return '';
        }
        if (!root.childNodes || root.childNodes.length === 0) {
            return '';
        }

        return this.extractEditableText(root, root)
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
    };

    QuickAddComponent.prototype.extractEditableText = function extractEditableText(node, root) {
        if (!node) {
            return '';
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            const ignored = node.getAttribute && node.getAttribute('data-qa-ignore') === '1';
            const nonEditable = node.getAttribute && node.getAttribute('contenteditable') === 'false';
            if (node !== root && (ignored || nonEditable)) {
                return '';
            }
            if (node.nodeName === 'BR') {
                return '\n';
            }
        }
        if (node.nodeType === Node.TEXT_NODE) {
            return node.nodeValue || '';
        }

        let out = '';
        const children = node.childNodes || [];
        for (let i = 0; i < children.length; i++) {
            out += this.extractEditableText(children[i], root);
        }

        const isBlock = node.nodeName === 'DIV' || node.nodeName === 'P';
        if (isBlock && node !== root && node.nextSibling) {
            out += '\n';
        }
        return out;
    };

    QuickAddComponent.prototype.getOffsetFromBoundary = function getOffsetFromBoundary(container, offset) {
        if (!container || !this.inputEl || !this.inputEl.contains(container)) {
            return null;
        }
        const pre = document.createRange();
        pre.selectNodeContents(this.inputEl);
        try {
            pre.setEnd(container, offset);
        } catch (err) {
            return null;
        }
        const fragment = pre.cloneContents();
        const text = this.extractEditableText(fragment, fragment)
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
        return text.length;
    };

    QuickAddComponent.prototype.getSelectionOffsets = function getSelectionOffsets() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
            return null;
        }
        const range = sel.getRangeAt(0);
        if (!this.inputEl.contains(range.startContainer) || !this.inputEl.contains(range.endContainer)) {
            return null;
        }
        const start = this.getOffsetFromBoundary(range.startContainer, range.startOffset);
        const end = this.getOffsetFromBoundary(range.endContainer, range.endOffset);
        if (start === null || end === null) {
            return null;
        }
        return start <= end
            ? { start, end, isCollapsed: range.collapsed }
            : { start: end, end: start, isCollapsed: range.collapsed };
    };

    QuickAddComponent.prototype.normalizeInsertedText = function normalizeInsertedText(text) {
        return String(text || '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
    };

    QuickAddComponent.prototype.getPlainTextFromEvent = function getPlainTextFromEvent(event) {
        const clipboard = event.clipboardData || event.dataTransfer || null;
        if (!clipboard || typeof clipboard.getData !== 'function') {
            return null;
        }
        return this.normalizeInsertedText(clipboard.getData('text/plain') || '');
    };

    QuickAddComponent.prototype.replaceTextInInput = function replaceTextInInput(start, end, replacement, options) {
        const source = this.inputText || this.readInputText();
        const len = source.length;
        const safeStart = Math.max(0, Math.min(Number(start) || 0, len));
        const safeEnd = Math.max(safeStart, Math.min(Number(end) || 0, len));
        const inserted = this.normalizeInsertedText(replacement);
        const updated = this.replaceRange(source, safeStart, safeEnd, inserted);
        const caret = safeStart + inserted.length;

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.closeDropdown();
        this.closeBlockedInfo();
        this.parseAndRender({
            source: updated,
            caretOffset: caret,
            focusInput: !options || options.focusInput !== false,
            skipCaretPreserve: true
        });
    };

    QuickAddComponent.prototype.findFieldTokenAtOffset = function findFieldTokenAtOffset(offset) {
        if (typeof offset !== 'number') {
            return null;
        }
        let best = null;
        this.lastResult.entries.forEach((entry) => {
            entry.tokens.forEach((token) => {
                if (token.kind !== 'field') {
                    return;
                }
                if (offset <= token.globalStart || offset >= token.globalEnd) {
                    return;
                }
                if (!best || token.globalStart >= best.globalStart) {
                    best = token;
                }
            });
        });
        return best;
    };

    QuickAddComponent.prototype.insertTextAtSelection = function insertTextAtSelection(text, options) {
        const offsets = this.getSelectionOffsets();
        if (!offsets) {
            const source = this.inputText || this.readInputText();
            this.replaceTextInInput(source.length, source.length, text);
            return;
        }

        let start = offsets.start;
        let end = offsets.end;
        const opts = options || {};
        if (offsets.isCollapsed && opts.preferTokenBoundary) {
            const token = this.findFieldTokenAtOffset(start);
            if (token && start > token.globalStart && start < token.globalEnd) {
                start = token.globalEnd;
                end = token.globalEnd;
            }
        }
        this.replaceTextInInput(start, end, text);
    };

    QuickAddComponent.prototype.getCaretOffset = function getCaretOffset() {
        const offsets = this.getSelectionOffsets();
        return offsets ? offsets.start : null;
    };

    QuickAddComponent.prototype.isIgnoredTextNode = function isIgnoredTextNode(node) {
        let current = node ? node.parentNode : null;
        while (current && current !== this.inputEl) {
            if (current.nodeType === Node.ELEMENT_NODE) {
                if (
                    (current.getAttribute && current.getAttribute('data-qa-ignore') === '1') ||
                    (current.getAttribute && current.getAttribute('contenteditable') === 'false')
                ) {
                    return true;
                }
            }
            current = current.parentNode;
        }
        return false;
    };

    QuickAddComponent.prototype.setCaretOffset = function setCaretOffset(offset, focusInput) {
        if (focusInput) {
            this.inputEl.focus();
        }
        if (!focusInput && document.activeElement !== this.inputEl) {
            return;
        }
        const selection = window.getSelection();
        if (!selection) {
            return;
        }

        const range = document.createRange();
        const walker = document.createTreeWalker(
            this.inputEl,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (!node || !(node.nodeValue || '').length) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (this.isIgnoredTextNode(node)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );
        let remaining = Math.max(0, offset || 0);
        let node = walker.nextNode();

        while (node) {
            const len = (node.nodeValue || '').length;
            if (remaining <= len) {
                range.setStart(node, remaining);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                return;
            }
            remaining -= len;
            node = walker.nextNode();
        }

        range.selectNodeContents(this.inputEl);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    };

    QuickAddComponent.prototype.renderInlineLayer = function renderInlineLayer(result, options) {
        const c = this.config.classNames;
        const opts = options || {};
        const raw = this.inputText || '';
        const suppressCaretSelection = opts.suppressCaretSelection === true
            || (opts.focusInput === false && opts.skipTypingSync === true);

        const preserveCaret = !suppressCaretSelection && !opts.skipCaretPreserve && document.activeElement === this.inputEl;
        const caretOffset = typeof opts.caretOffset === 'number'
            ? opts.caretOffset
            : (preserveCaret ? this.getCaretOffset() : null);

        if (!raw) {
            this.aiInlineMarkIndex = {};
            this.isRenderingInput = true;
            this.inputEl.innerHTML = '';
            this.isRenderingInput = false;
            if (!suppressCaretSelection && typeof caretOffset === 'number') {
                this.setCaretOffset(0, !!opts.focusInput);
            }
            return;
        }

        let html = '';
        if (!this.config.showInlinePills) {
            html = `<span class="${c.inlineText}">${escHtml(raw)}</span>`;
        } else {
            const fieldTokens = [];
            result.entries.forEach((entry) => {
                this.getRenderableFieldTokens(entry).forEach((token) => {
                    fieldTokens.push(Object.assign({ entryIndex: entry.index }, token));
                });
            });
            fieldTokens.sort((a, b) => a.globalStart - b.globalStart);

            let cursor = 0;
            const parts = [];
            fieldTokens.forEach((token) => {
                if (token.globalStart < cursor) {
                    return;
                }
                if (token.globalStart > cursor) {
                    parts.push(escHtml(raw.slice(cursor, token.globalStart)));
                }

                const rawTokenChunk = raw.slice(token.globalStart, token.globalEnd);
                parts.push(this.buildInlineMarkHtml(token, rawTokenChunk));
                cursor = token.globalEnd;
            });
            if (cursor < raw.length) {
                parts.push(escHtml(raw.slice(cursor)));
            }
            html = `<span class="${c.inlineText}">${parts.join('')}<span class="${c.inputTail}" data-qa-tail="1" data-qa-ignore="1" contenteditable="false" aria-hidden="true"></span></span>`;
        }

        this.isRenderingInput = true;
        this.inputEl.innerHTML = html;
        this.isRenderingInput = false;

        if (!suppressCaretSelection && typeof caretOffset === 'number') {
            this.setCaretOffset(Math.min(caretOffset, raw.length), !!opts.focusInput);
        }
    };

    QuickAddComponent.prototype.findInlineRangeCaseInsensitive = function findInlineRangeCaseInsensitive(raw, needle, minStart, maxEnd, usedRanges) {
        const source = String(raw || '');
        const target = String(needle || '').trim();
        if (!target || target.length < 2) {
            return null;
        }
        const lowerSource = source.toLowerCase();
        const lowerTarget = target.toLowerCase();
        const startAt = Math.max(0, Number(minStart || 0));
        const endAt = Number.isFinite(Number(maxEnd)) ? Math.min(source.length, Number(maxEnd)) : source.length;
        if (endAt <= startAt) {
            return null;
        }
        let idx = lowerSource.indexOf(lowerTarget, startAt);
        while (idx >= 0) {
            const end = idx + target.length;
            if (idx >= endAt || end > endAt) {
                return null;
            }
            const overlaps = (usedRanges || []).some((range) => idx < range.end && end > range.start);
            if (!overlaps) {
                return { start: idx, end };
            }
            idx = lowerSource.indexOf(lowerTarget, idx + 1);
        }
        return null;
    };

    QuickAddComponent.prototype.buildAIInlineMappingBaseKey = function buildAIInlineMappingBaseKey(entryId, fieldKey, value) {
        const normalized = Array.isArray(value) ? value.join('|') : normValue(value);
        return `${String(entryId || '')}|${String(fieldKey || '')}|${normalized}`;
    };

    QuickAddComponent.prototype.buildAIInlineMappingKey = function buildAIInlineMappingKey(entryId, fieldKey, value, occurrence) {
        const base = this.buildAIInlineMappingBaseKey(entryId, fieldKey, value);
        const count = Math.max(0, Number.isFinite(Number(occurrence)) ? Number(occurrence) : 0);
        return `${base}|${count}`;
    };

    QuickAddComponent.prototype.indexAIInlineMarks = function indexAIInlineMarks(marks) {
        const index = {};
        const occurrenceMap = {};
        (Array.isArray(marks) ? marks : []).forEach((mark) => {
            if (!mark || !mark.explicit || !mark.entryId || !mark.fieldKey) {
                return;
            }
            const base = this.buildAIInlineMappingBaseKey(mark.entryId, mark.fieldKey, mark.value);
            const occurrence = occurrenceMap[base] || 0;
            occurrenceMap[base] = occurrence + 1;
            const key = `${base}|${occurrence}`;
            mark.occurrence = occurrence;
            mark.mappingKey = key;
            index[key] = {
                entryId: String(mark.entryId || ''),
                fieldKey: String(mark.fieldKey || ''),
                value: mark.value,
                occurrence,
                start: Number(mark.start),
                end: Number(mark.end)
            };
        });
        this.aiInlineMarkIndex = index;
        return index;
    };

    QuickAddComponent.prototype.buildAIInlineMarks = function buildAIInlineMarks() {
        const marks = [];
        const raw = String(this.inputText || '');
        if (!raw) {
            this.aiInlineMarkIndex = {};
            return marks;
        }

        const ai = this.config.ai || {};
        if (typeof ai.inlinePillHarness === 'function') {
            const custom = ai.inlinePillHarness({
                input: raw,
                entries: (this.aiState.entries || []).slice(),
                config: this.config,
                component: this
            });
            if (Array.isArray(custom)) {
                const customMarks = custom
                    .map((item) => {
                        const mark = item && typeof item === 'object' ? item : {};
                        const start = Number(mark.start);
                        const end = Number(mark.end);
                        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
                            return null;
                        }
                        if (start < 0 || end > raw.length) {
                            return null;
                        }
                        const fieldKey = mark.fieldKey || mark.field || '';
                        const entryId = mark.entryId || mark.entry || '';
                        let entryIndex = Number(mark.entryIndex);
                        if (!Number.isFinite(entryIndex) && entryId) {
                            const lookupIndex = (this.aiState.entries || []).findIndex((item) => item && item._id === entryId);
                            if (lookupIndex >= 0) {
                                entryIndex = lookupIndex;
                            }
                        }
                        const explicit = mark.explicit === true || (!!entryId && !!fieldKey);
                        return {
                            start,
                            end,
                            label: String(mark.label || raw.slice(start, end)),
                            inferred: mark.inferred !== false,
                            explicit,
                            entryId: entryId ? String(entryId) : '',
                            entryIndex: Number.isFinite(entryIndex) ? entryIndex : 0,
                            fieldKey: String(fieldKey || ''),
                            value: mark.value
                        };
                    })
                    .filter(Boolean)
                    .sort((a, b) => a.start - b.start || a.end - b.end);
                this.indexAIInlineMarks(customMarks);
                return customMarks;
            }
        }

        const usedRanges = [];
        const entries = Array.isArray(this.aiState.entries) ? this.aiState.entries : [];
        const schemaFields = (this.normalizedSchema && Array.isArray(this.normalizedSchema.fields))
            ? this.normalizedSchema.fields
            : [];
        const candidateFields = schemaFields.filter((field) => field && field.key && !String(field.key).startsWith('_'));

        entries.forEach((entry, idx) => {
            const sourceStart = Number.isFinite(Number(entry._sourceStart)) ? Number(entry._sourceStart) : 0;
            const sourceEnd = Number.isFinite(Number(entry._sourceEnd)) ? Number(entry._sourceEnd) : raw.length;
            const entryId = String(entry._id || '');

            if (Array.isArray(entry.spans) && entry.spans.length) {
                entry.spans.forEach((span) => {
                    const fieldKey = String((span && span.field) || '');
                    const spanValue = span && span.value !== undefined ? span.value : '';
                    let start = Number(span && span.start);
                    let end = Number(span && span.end);
                    let hasRange = Number.isFinite(start) && Number.isFinite(end) && end > start && start >= 0 && end <= raw.length;
                    let range = null;
                    if (hasRange) {
                        const overlaps = usedRanges.some((item) => start < item.end && end > item.start);
                        if (!overlaps) {
                            range = { start, end };
                        }
                    }
                    if (!range && spanValue !== '') {
                        range = this.findInlineRangeCaseInsensitive(raw, spanValue, sourceStart, sourceEnd, usedRanges);
                    }
                    if (!range) {
                        return;
                    }
                    usedRanges.push({ start: range.start, end: range.end });
                    marks.push({
                        start: range.start,
                        end: range.end,
                        label: `${fieldKey || 'field'}: ${spanValue || raw.slice(range.start, range.end)}`,
                        inferred: true,
                        explicit: !!entryId && !!fieldKey,
                        entryId,
                        entryIndex: idx,
                        fieldKey,
                        value: spanValue
                    });
                });
                return;
            }

            const candidates = candidateFields.map((field) => ({
                key: field.key,
                value: entry[field.key]
            }));

            candidates.forEach((candidate) => {
                const range = this.findInlineRangeCaseInsensitive(
                    raw,
                    candidate.value,
                    sourceStart,
                    sourceEnd,
                    usedRanges
                );
                if (!range) {
                    return;
                }
                usedRanges.push(range);
                marks.push({
                    start: range.start,
                    end: range.end,
                    label: `${candidate.key}: ${candidate.value}`,
                    inferred: true,
                    explicit: false,
                    entryId,
                    entryIndex: idx,
                    fieldKey: candidate.key,
                    value: candidate.value
                });
            });

            if (this.isAISeparatorAwareEnabled()) {
                const fallbackValue = entry.title || entry.note || entry[candidateFields[0]?.key] || `entry ${idx + 1}`;
                const fallbackRange = this.findInlineRangeCaseInsensitive(
                    raw,
                    fallbackValue,
                    sourceStart,
                    sourceEnd,
                    usedRanges
                );
                if (!fallbackRange && sourceEnd > sourceStart) {
                    const segmentStart = Math.max(0, sourceStart);
                    const segmentEnd = Math.min(raw.length, sourceEnd);
                    const overlaps = usedRanges.some((range) => segmentStart < range.end && segmentEnd > range.start);
                    if (!overlaps && segmentEnd - segmentStart <= 48) {
                        usedRanges.push({ start: segmentStart, end: segmentEnd });
                        marks.push({
                            start: segmentStart,
                            end: segmentEnd,
                            label: `entry ${idx + 1}`,
                            inferred: true,
                            explicit: false,
                            entryId,
                            entryIndex: idx,
                            fieldKey: '',
                            value: ''
                        });
                    }
                }
            }
        });

        marks.sort((a, b) => a.start - b.start || a.end - b.end);
        this.indexAIInlineMarks(marks);
        return marks;
    };

    QuickAddComponent.prototype.renderAIInlineLayer = function renderAIInlineLayer(options) {
        const c = this.config.classNames;
        const opts = options || {};
        const raw = String(this.inputText || '');
        const suppressCaretSelection = opts.suppressCaretSelection === true
            || (opts.focusInput === false && opts.skipTypingSync === true);

        const preserveCaret = !suppressCaretSelection && !opts.skipCaretPreserve && document.activeElement === this.inputEl;
        const caretOffset = typeof opts.caretOffset === 'number'
            ? opts.caretOffset
            : (preserveCaret ? this.getCaretOffset() : null);

        if (!raw) {
            this.isRenderingInput = true;
            this.inputEl.innerHTML = '';
            this.isRenderingInput = false;
            if (!suppressCaretSelection && typeof caretOffset === 'number') {
                this.setCaretOffset(0, !!opts.focusInput);
            }
            return;
        }

        const isSnapshotMatch = String(this.aiState.lastParsedInput || '') === raw;
        if (!this.isAIInlinePillsEnabled() || !isSnapshotMatch) {
            this.aiInlineMarkIndex = {};
            this.isRenderingInput = true;
            this.inputEl.innerHTML = `<span class="${c.inlineText}">${escHtml(raw)}</span>`;
            this.isRenderingInput = false;
            if (!suppressCaretSelection && typeof caretOffset === 'number') {
                this.setCaretOffset(Math.min(caretOffset, raw.length), !!opts.focusInput);
            }
            return;
        }

        const marks = this.buildAIInlineMarks();
        if (!marks.length) {
            this.aiInlineMarkIndex = {};
            this.isRenderingInput = true;
            this.inputEl.innerHTML = `<span class="${c.inlineText}">${escHtml(raw)}</span>`;
            this.isRenderingInput = false;
            if (!suppressCaretSelection && typeof caretOffset === 'number') {
                this.setCaretOffset(Math.min(caretOffset, raw.length), !!opts.focusInput);
            }
            return;
        }

        let cursor = 0;
        const parts = [];
        marks.forEach((mark) => {
            if (mark.start < cursor) {
                return;
            }
            if (mark.start > cursor) {
                parts.push(escHtml(raw.slice(cursor, mark.start)));
            }
            const chunk = raw.slice(mark.start, mark.end);
            const field = mark.fieldKey ? this.getFieldDefinition(mark.fieldKey) : null;
            const interactive = !!(mark.explicit && mark.entryId && mark.fieldKey && this.isInteractivePill(field));
            const classes = [
                c.inlineMark,
                interactive ? c.inlineMarkInteractive : '',
                mark.inferred ? c.inlineMarkInferred : ''
            ].filter(Boolean).join(' ');
            const title = escHtml(mark.label || 'AI highlight');
            const rawValue = Array.isArray(mark.value) ? mark.value[0] : mark.value;
            const color = this.resolvePillColor(field, rawValue || chunk);
            const styleAttr = color ? ` style="--qa-inline-accent:${escHtml(color)}"` : '';
            const aiValue = rawValue !== undefined && rawValue !== null ? rawValue : chunk;
            const aiEntryIndex = Number.isFinite(Number(mark.entryIndex))
                ? Number(mark.entryIndex)
                : 0;
            const isNumberField = !!(field && field.type === 'number' && this.isNumberStepperEnabledForField(field));
            const aiAttrs = interactive
                ? ` data-qa-pill="1" data-pill-ai="1" data-pill-entry="${aiEntryIndex}" data-qa-date-pill="${field && isDateFieldType(field.type) ? '1' : '0'}" data-qa-number-pill="${isNumberField ? '1' : '0'}" data-pill-ai-entry-id="${escHtml(String(mark.entryId || ''))}" data-pill-ai-field="${escHtml(String(mark.fieldKey || ''))}" data-pill-ai-value="${escHtml(String(aiValue))}" data-pill-ai-occurrence="${Number.isFinite(Number(mark.occurrence)) ? Number(mark.occurrence) : 0}" data-pill-ai-map="${escHtml(String(mark.mappingKey || ''))}"`
                : '';
            parts.push(`<span class="${classes}"${aiAttrs}${styleAttr} title="${title}"><span class="${c.inlineMarkLabel}">${escHtml(chunk)}</span></span>`);
            cursor = mark.end;
        });
        if (cursor < raw.length) {
            parts.push(escHtml(raw.slice(cursor)));
        }

        this.isRenderingInput = true;
        this.inputEl.innerHTML = `<span class="${c.inlineText}">${parts.join('')}<span class="${c.inputTail}" data-qa-tail="1" data-qa-ignore="1" contenteditable="false" aria-hidden="true"></span></span>`;
        this.isRenderingInput = false;
        if (!suppressCaretSelection && typeof caretOffset === 'number') {
            this.setCaretOffset(Math.min(caretOffset, raw.length), !!opts.focusInput);
        }
    };

    QuickAddComponent.prototype.parseAndRender = function parseAndRender(options) {
        const opts = options || {};
        if (typeof opts.source === 'string') {
            this.inputText = opts.source;
        } else {
            this.inputText = this.readInputText();
        }
        this.closeAttachmentSourceMenu();
        this.closeBlockedInfo();

        const input = this.inputText || '';
        if (this.isAiMode()) {
            this.lastResult = this.syncEntryAttachmentMeta(this.buildAIResult());
            this.rebuildTokenMap({ entries: [] });
            this.renderAIInlineLayer(opts);
            this.renderResult(this.lastResult);
            this.closeDropdown();
            this.closeDatePicker();
            this.closeNumberPicker();
        } else {
            this.aiInlineMarkIndex = {};
            this.lastResult = parseInput(input, this.config);
            this.lastResult = this.applyDismissedSelections(this.lastResult);
            this.lastResult = this.syncEntryAttachmentMeta(this.lastResult);
            this.rebuildTokenMap(this.lastResult);
            this.renderInlineLayer(this.lastResult, opts);
            this.renderResult(this.lastResult);

            const caretOffset = typeof opts.caretOffset === 'number'
                ? opts.caretOffset
                : this.getCaretOffset();
            if (!opts.skipTypingSync) {
                this.syncTypingDropdown(caretOffset);
            }
        }

        if (typeof this.config.onParse === 'function') {
            this.config.onParse(this.lastResult);
        }
    };

    QuickAddComponent.prototype.getFieldDefinition = function getFieldDefinition(fieldKey) {
        return this.normalizedSchema.byKey[fieldKey] || null;
    };

    QuickAddComponent.prototype.getEntryFieldsForDependency = function getEntryFieldsForDependency(entryIndex) {
        const entry = (this.lastResult.entries || []).find((item) => item.index === entryIndex);
        return entry && entry.fields ? entry.fields : {};
    };

    QuickAddComponent.prototype.isFieldValueDependencyAllowed = function isFieldValueDependencyAllowed(fieldKey, value, entryIndex) {
        const field = this.getFieldDefinition(fieldKey);
        if (!field) {
            return { ok: true, reason: '' };
        }
        const fields = this.getEntryFieldsForDependency(entryIndex);
        return evaluateFieldDependency(field, value, fields);
    };

    QuickAddComponent.prototype.resolvePillColor = function resolvePillColor(field, value) {
        if (!field) {
            return null;
        }

        const options = getFieldOptions(field);
        if (options.length > 0) {
            const match = options.find((option) =>
                option.value.toLowerCase() === String(value).toLowerCase() ||
                option.label.toLowerCase() === String(value).toLowerCase()
            );
            if (match && match.color) {
                return match.color;
            }
        }

        return field.color || null;
    };

    QuickAddComponent.prototype.buildAIEntryMetaStyle = function buildAIEntryMetaStyle(fieldKey, value) {
        const field = this.getFieldDefinition(fieldKey);
        const color = this.resolvePillColor(field, value);
        if (!color) {
            return '';
        }
        return `--qa-pill-accent:${escHtml(color)}`;
    };

    QuickAddComponent.prototype.getDropdownOptionsForField = function getDropdownOptionsForField(field, entryKey, fieldKey) {
        if (!field) {
            return [];
        }
        if (isFileFieldType(field.type)) {
            const usage = this.getAttachmentUsage(this.lastResult);
            return (this.attachmentPool || []).map((item) => ({
                value: item.ref,
                label: item.name,
                attachmentId: item.id,
                previewUrl: item.previewUrl || null,
                usedCount: (usage.get(item.id) || []).filter((link) => link.entryKey !== entryKey || link.fieldKey !== fieldKey).length
            }));
        }
        return getFieldOptions(field);
    };

    QuickAddComponent.prototype.fieldSupportsDropdown = function fieldSupportsDropdown(field, entryKey, fieldKey) {
        if (!field) {
            return false;
        }
        if (field.type === 'options') {
            return this.getDropdownOptionsForField(field, entryKey, fieldKey).length > 0;
        }
        return isFileFieldType(field.type) && this.getDropdownOptionsForField(field, entryKey, fieldKey).length > 0;
    };

    QuickAddComponent.prototype.isInteractivePill = function isInteractivePill(field) {
        if (!field) {
            return false;
        }
        if (isDateFieldType(field.type)) {
            return true;
        }
        if (field.type === 'number' && this.isNumberStepperEnabledForField(field)) {
            return true;
        }
        return this.fieldSupportsDropdown(field);
    };

    QuickAddComponent.prototype.buildPillHtml = function buildPillHtml(data) {
        const c = this.config.classNames;
        const field = this.getFieldDefinition(data.fieldKey);
        const color = this.resolvePillColor(field, data.value);
        const inferred = !!data.inferred;
        const auto = !!data.auto;
        const blocked = !!data.blocked;
        const aiMeta = data.aiMeta && typeof data.aiMeta === 'object' ? data.aiMeta : null;
        const numberInteractive = !!(field && field.type === 'number' && this.isNumberStepperEnabledForField(field));
        const deterministicInteractive = !blocked && this.isInteractivePill(field) && (!!data.tokenId || auto);
        const aiInteractive = !blocked
            && !!aiMeta
            && this.isAiMode()
            && this.isAIInlinePillsEnabled()
            && this.isInteractivePill(field);
        const interactive = deterministicInteractive || aiInteractive;
        const styleAttr = (!blocked && color) ? ` style="--qa-pill-accent:${escHtml(color)}"` : '';
        const classes = [
            c.pill,
            interactive ? c.pillInteractive : '',
            numberInteractive ? c.numberPill : '',
            inferred ? c.pillInferred : '',
            blocked ? c.pillBlocked : '',
            auto ? 'qa-pill-auto' : ''
        ].filter(Boolean).join(' ');

        const interactionAttrs = deterministicInteractive
            ? ` data-qa-pill="1" data-qa-date-pill="${field && isDateFieldType(field.type) ? '1' : '0'}" data-qa-number-pill="${numberInteractive ? '1' : '0'}" data-pill-field="${escHtml(data.fieldKey)}" data-pill-token="${escHtml(data.tokenId || '')}" data-pill-entry="${data.entryIndex}" data-pill-value="${escHtml(String(data.value !== undefined && data.value !== null ? data.value : ''))}"`
            : (aiInteractive
                ? ` data-qa-pill="1" data-pill-ai="1" data-qa-date-pill="${field && isDateFieldType(field.type) ? '1' : '0'}" data-qa-number-pill="${numberInteractive ? '1' : '0'}" data-pill-entry="${data.entryIndex}" data-pill-ai-entry-id="${escHtml(String(aiMeta.entryId || ''))}" data-pill-ai-field="${escHtml(String(aiMeta.fieldKey || data.fieldKey || ''))}" data-pill-ai-value="${escHtml(String(aiMeta.value !== undefined && aiMeta.value !== null ? aiMeta.value : (data.value !== undefined && data.value !== null ? data.value : '')))}" data-pill-ai-occurrence="${Math.max(0, Number.isFinite(Number(aiMeta.occurrence)) ? Number(aiMeta.occurrence) : 0)}" data-pill-ai-map="${escHtml(String(aiMeta.mappingKey || ''))}"`
                : '');
        const blockedAttrs = blocked
            ? ` data-qa-blocked="1" data-blocked-reason="${escHtml(data.reason || 'Blocked by constraints')}"`
            : '';
        const attrs = `${interactionAttrs}${blockedAttrs}`;
        const inferredIcon = inferred
            ? `<span class="${c.pillInferredIcon}" aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12" focusable="false"><path d="M8 1.5l1.4 2.9 3.1.5-2.2 2.2.5 3.2L8 8.9l-2.8 1.4.5-3.2L3.5 4.9l3.1-.5L8 1.5z" fill="currentColor"/></svg></span>`
            : '';
        const autoIcon = auto
            ? `<span class="${c.pillAutoIcon || 'qa-pill-auto-icon'}" aria-hidden="true" title="Auto-filled">⚡</span>`
            : '';
        const blockedIcon = blocked
            ? `<span class="${c.pillBlockedIcon}" aria-hidden="true">!</span>`
            : '';
        const dismiss = (!blocked && data.dismissKey)
            ? `<button type="button" class="${c.pillDismiss}" data-dismiss-key="${escHtml(data.dismissKey)}" aria-label="Dismiss value">x</button>`
            : '';
        const numberControls = (!blocked && numberInteractive)
            ? `
                <span class="${c.numberPillStepper}">
                    <button type="button" class="${c.numberPillStepBtn}" data-number-step="-1" aria-label="Decrease value">−</button>
                    <span class="${c.pillLabel}">${escHtml(data.label)}</span>
                    <button type="button" class="${c.numberPillStepBtn}" data-number-step="1" aria-label="Increase value">+</button>
                </span>
            `
            : `<span class="${c.pillLabel}">${escHtml(data.label)}</span>`;

        return `<span class="${classes}"${attrs}${styleAttr}>${blockedIcon}${autoIcon}${inferredIcon}${numberControls}${dismiss}</span>`;
    };

    QuickAddComponent.prototype.buildInlineMarkHtml = function buildInlineMarkHtml(token, rawChunk) {
        const c = this.config.classNames;
        const field = this.getFieldDefinition(token.key);
        const color = this.resolvePillColor(field, token.value);
        const interactive = this.isInteractivePill(field);
        const numberInteractive = !!(field && field.type === 'number' && this.isNumberStepperEnabledForField(field));
        const styleAttr = (!token.blocked && color) ? ` style="--qa-inline-accent:${escHtml(color)}"` : '';
        const classes = [
            c.inlineMark,
            interactive ? c.inlineMarkInteractive : '',
            token.inferred ? c.inlineMarkInferred : '',
            token.blocked ? c.inlineMarkBlocked : ''
        ].filter(Boolean).join(' ');
        const attrs = (interactive && !token.blocked)
            ? ` data-qa-pill="1" data-qa-date-pill="${field && isDateFieldType(field.type) ? '1' : '0'}" data-qa-number-pill="${numberInteractive ? '1' : '0'}" data-pill-field="${escHtml(token.key)}" data-pill-token="${escHtml(token.id)}" data-pill-entry="${token.entryIndex}"`
            : '';
        const blockedAttrs = token.blocked
            ? ` data-qa-blocked="1" data-blocked-reason="${escHtml(token.reason || 'Blocked by constraints')}"`
            : '';
        const inferredIcon = token.inferred
            ? `<span class="${c.inlineMarkIcon}" data-qa-ignore="1" contenteditable="false" aria-hidden="true"><svg viewBox="0 0 16 16" width="10" height="10" focusable="false"><path d="M8 1.5l1.4 2.9 3.1.5-2.2 2.2.5 3.2L8 8.9l-2.8 1.4.5-3.2L3.5 4.9l3.1-.5L8 1.5z" fill="currentColor"/></svg></span>`
            : '';
        const blockedIcon = token.blocked
            ? `<span class="${c.inlineMarkBlockedIcon}" data-qa-ignore="1" contenteditable="false" aria-hidden="true">!</span>`
            : '';
        const dismiss = token.dismissKey
            ? `<button type="button" class="${c.inlineMarkDismiss}" data-qa-ignore="1" contenteditable="false" data-dismiss-key="${escHtml(token.dismissKey)}" aria-label="Dismiss value">x</button>`
            : '';
        const titleAttr = token.blocked && token.reason ? ` title="${escHtml(`Blocked by constraints: ${token.reason}`)}"` : '';
        const numberControls = (numberInteractive && !token.blocked)
            ? `
                <span class="${c.numberPillStepper}" data-qa-ignore="1" contenteditable="false">
                    <button type="button" class="${c.numberPillStepBtn}" data-qa-ignore="1" contenteditable="false" data-number-step="-1" aria-label="Decrease value">−</button>
                    <span class="${c.inlineMarkLabel}" data-qa-ignore="1" contenteditable="false">${escHtml(rawChunk)}</span>
                    <button type="button" class="${c.numberPillStepBtn}" data-qa-ignore="1" contenteditable="false" data-number-step="1" aria-label="Increase value">+</button>
                </span>
            `
            : `<span class="${c.inlineMarkLabel}">${escHtml(rawChunk)}</span>`;
        return `<span class="${classes}"${attrs}${blockedAttrs}${styleAttr}${titleAttr}>${blockedIcon}${inferredIcon}${numberControls}${dismiss}</span>`;
    };

    QuickAddComponent.prototype.getRenderableFieldTokens = function getRenderableFieldTokens(entry) {
        const selections = this.collectEntrySelections(entry);
        const output = [];

        selections.forEach((selection) => {
            if (selection.token) {
                output.push(Object.assign({}, selection.token, {
                    entryIndex: entry.index,
                    inferred: false,
                    dismissKey: selection.dismissKey
                }));
                return;
            }
            if (!selection.inferredItem) {
                return;
            }
            output.push({
                id: selection.inferredItem.id,
                kind: 'field',
                key: selection.inferredItem.fieldKey,
                prefix: '',
                value: selection.inferredItem.value,
                committed: true,
                globalStart: selection.inferredItem.globalStart,
                globalEnd: selection.inferredItem.globalEnd,
                globalValueStart: selection.inferredItem.globalStart,
                globalValueEnd: selection.inferredItem.globalEnd,
                entryIndex: entry.index,
                inferred: true,
                dismissKey: selection.dismissKey
            });
        });

        (entry.blocked || []).forEach((blocked) => {
            output.push({
                id: blocked.id,
                kind: 'field',
                key: blocked.fieldKey,
                prefix: '',
                value: blocked.value,
                committed: true,
                globalStart: blocked.globalStart,
                globalEnd: blocked.globalEnd,
                globalValueStart: blocked.globalStart,
                globalValueEnd: blocked.globalEnd,
                entryIndex: entry.index,
                blocked: true,
                reason: blocked.reason,
                inferred: blocked.source === 'inferred',
                dismissKey: null
            });
        });

        output.sort((a, b) => a.globalStart - b.globalStart);
        return output;
    };

    QuickAddComponent.prototype.findTokenIdForFieldValue = function findTokenIdForFieldValue(entry, field, fieldKey, value, usedTokenIds) {
        const target = normValue(value);
        const isMultiField = !!(field && field.multiple);
        if (isMultiField) {
            for (let i = entry.tokens.length - 1; i >= 0; i--) {
                const token = entry.tokens[i];
                if (token.kind !== 'field' || !token.committed || token.key !== fieldKey) {
                    continue;
                }
                const tokenValues = splitByMultiSeparator(token.value || '', String(this.config.multiSelectSeparator || ','));
                if (tokenValues.some((item) => normValue(item) === target)) {
                    return token.id;
                }
            }
            return null;
        }
        const blockedExplicitTokenIds = new Set(
            (entry.blocked || [])
                .filter((item) => item.source === 'explicit' && item.tokenId)
                .map((item) => item.tokenId)
        );
        for (let i = entry.tokens.length - 1; i >= 0; i--) {
            const token = entry.tokens[i];
            if (token.kind !== 'field' || !token.committed) {
                continue;
            }
            if (blockedExplicitTokenIds.has(token.id)) {
                continue;
            }
            if (token.key !== fieldKey) {
                continue;
            }
            if (usedTokenIds.has(token.id)) {
                continue;
            }
            if (normValue(token.value) === target) {
                usedTokenIds.add(token.id);
                return token.id;
            }
        }

        for (let i = entry.tokens.length - 1; i >= 0; i--) {
            const token = entry.tokens[i];
            if (token.kind !== 'field' || !token.committed) {
                continue;
            }
            if (blockedExplicitTokenIds.has(token.id)) {
                continue;
            }
            if (token.key !== fieldKey) {
                continue;
            }
            if (usedTokenIds.has(token.id)) {
                continue;
            }
            usedTokenIds.add(token.id);
            return token.id;
        }

        return null;
    };

    QuickAddComponent.prototype.findAIInlineFallbackRange = function findAIInlineFallbackRange(entry, fieldKey, occurrence, currentValue, source) {
        const text = String(source || '');
        if (!entry || !fieldKey || !text) {
            return null;
        }

        const spans = Array.isArray(entry.spans)
            ? entry.spans
                .filter((span) => span && String(span.field || '') === fieldKey)
                .map((span) => {
                    const start = Number(span.start);
                    const end = Number(span.end);
                    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
                        return null;
                    }
                    if (start < 0 || end > text.length) {
                        return null;
                    }
                    return {
                        start,
                        end,
                        value: span.value,
                        fromSpan: true
                    };
                })
                .filter(Boolean)
                .sort((a, b) => a.start - b.start)
            : [];

        if (spans.length) {
            const idx = Math.max(0, Math.min(spans.length - 1, Number.isFinite(Number(occurrence)) ? Number(occurrence) : 0));
            const spanRange = spans[idx];
            const chunk = text.slice(spanRange.start, spanRange.end);
            const currentText = String(currentValue === undefined || currentValue === null ? '' : currentValue);
            const spanValue = String(spanRange.value === undefined || spanRange.value === null ? '' : spanRange.value);
            if (!currentText || normValue(chunk) === normValue(currentText) || (spanValue && normValue(chunk) === normValue(spanValue))) {
                return spanRange;
            }
        }

        const needle = String(currentValue === undefined || currentValue === null ? '' : currentValue).trim();
        if (!needle) {
            return null;
        }
        const startBound = Number.isFinite(Number(entry._sourceStart)) ? Math.max(0, Number(entry._sourceStart)) : 0;
        const endBound = Number.isFinite(Number(entry._sourceEnd)) ? Math.min(text.length, Number(entry._sourceEnd)) : text.length;
        if (endBound <= startBound) {
            return null;
        }
        const segment = text.slice(startBound, endBound);
        const lowerSegment = segment.toLowerCase();
        const lowerNeedle = needle.toLowerCase();
        const field = this.getFieldDefinition(fieldKey);
        const rawPrefixes = field && Array.isArray(field.prefixes) && field.prefixes.length
            ? field.prefixes
            : [`${fieldKey}:`];
        const prefixes = rawPrefixes
            .map((prefix) => String(prefix || '').toLowerCase().trim())
            .filter(Boolean);
        const contextualMatches = [];
        if (prefixes.length) {
            let idx = lowerSegment.indexOf(lowerNeedle);
            while (idx !== -1) {
                const hasPrefix = prefixes.some((prefix) => {
                    const prefixIdx = lowerSegment.lastIndexOf(prefix, idx);
                    if (prefixIdx === -1) {
                        return false;
                    }
                    const between = lowerSegment.slice(prefixIdx + prefix.length, idx);
                    return between.trim() === '';
                });
                if (hasPrefix) {
                    contextualMatches.push(idx);
                }
                idx = lowerSegment.indexOf(lowerNeedle, idx + lowerNeedle.length);
            }
        }
        if (contextualMatches.length) {
            const idx = Math.max(0, Math.min(contextualMatches.length - 1, Number.isFinite(Number(occurrence)) ? Number(occurrence) : 0));
            const matchedStart = contextualMatches[idx];
            return {
                start: startBound + matchedStart,
                end: startBound + matchedStart + needle.length,
                value: needle,
                fromSpan: false
            };
        }

        const first = lowerSegment.indexOf(lowerNeedle);
        if (first === -1) {
            return null;
        }
        const second = lowerSegment.indexOf(lowerNeedle, first + lowerNeedle.length);
        if (second !== -1) {
            return null;
        }
        return {
            start: startBound + first,
            end: startBound + first + needle.length,
            value: needle,
            fromSpan: false
        };
    };

    QuickAddComponent.prototype.findInferredForFieldValue = function findInferredForFieldValue(entry, fieldKey, value, usedInferredIds) {
        const inferred = entry.inferred || [];
        for (let i = inferred.length - 1; i >= 0; i--) {
            const item = inferred[i];
            if (item.fieldKey !== fieldKey) {
                continue;
            }
            if (usedInferredIds.has(item.id)) {
                continue;
            }
            if (normValue(item.value) === normValue(value)) {
                usedInferredIds.add(item.id);
                return item;
            }
        }
        return null;
    };

    QuickAddComponent.prototype.findTokenById = function findTokenById(entry, tokenId) {
        if (!tokenId) {
            return null;
        }
        for (let i = 0; i < entry.tokens.length; i++) {
            if (entry.tokens[i].id === tokenId) {
                return entry.tokens[i];
            }
        }
        return null;
    };

    QuickAddComponent.prototype.collectEntrySelections = function collectEntrySelections(entry) {
        const source = this.inputText || '';
        const usedTokens = new Set();
        const usedInferred = new Set();
        const occurrenceByFingerprint = new Map();
        const selections = [];

        Object.keys(entry.fields).forEach((fieldKey) => {
            const value = entry.fields[fieldKey];
            const field = this.getFieldDefinition(fieldKey);
            const values = Array.isArray(value) ? value : [value];
            values.forEach((item) => {
                const tokenId = this.findTokenIdForFieldValue(entry, field, fieldKey, item, usedTokens);
                const inferredItem = this.findInferredForFieldValue(entry, fieldKey, item, usedInferred);
                const token = this.findTokenById(entry, tokenId);

                let sourceKind = 'fallback';
                let rawChunk = '';
                if (token) {
                    sourceKind = 'explicit';
                    rawChunk = source.slice(token.globalStart, token.globalEnd);
                } else if (inferredItem) {
                    sourceKind = 'inferred';
                    rawChunk = source.slice(inferredItem.globalStart, inferredItem.globalEnd);
                } else if (entry.autoFields && entry.autoFields.has(fieldKey)) {
                    sourceKind = 'auto';
                }

                const fingerprint = [
                    entry.index,
                    fieldKey,
                    normValue(item),
                    sourceKind,
                    normValue(rawChunk)
                ].join('|');
                const occurrence = occurrenceByFingerprint.get(fingerprint) || 0;
                occurrenceByFingerprint.set(fingerprint, occurrence + 1);

                const dismissKey = (sourceKind === 'explicit' || sourceKind === 'inferred')
                    ? this.buildDismissKey({
                        entryIndex: entry.index,
                        fieldKey,
                        value: item,
                        sourceKind,
                        rawChunk,
                        occurrence
                    })
                    : null;

                selections.push({
                    fieldKey,
                    value: item,
                    label: `${fieldKey}: ${item}`,
                    entryIndex: entry.index,
                    tokenId: token ? token.id : (inferredItem ? inferredItem.id : null),
                    token: token || null,
                    inferredItem: inferredItem || null,
                    inferred: !!inferredItem && !token,
                    auto: sourceKind === 'auto',
                    dismissKey
                });
            });
        });

        return selections;
    };

    QuickAddComponent.prototype.getMultiSelectDisplaySeparator = function getMultiSelectDisplaySeparator() {
        const raw = this.config.multiSelectDisplaySeparator;
        if (raw === undefined || raw === null) {
            return `${String(this.config.multiSelectSeparator || ',')} `;
        }
        return String(raw);
    };

    QuickAddComponent.prototype.buildGroupedCardSelection = function buildGroupedCardSelection(entry, field, fieldKey, values, sourceSelections) {
        const deduped = dedupeMultiValues(values);
        const labelPrefix = field && field.label ? field.label : fieldKey;
        const source = this.inputText || '';
        const explicitTokens = (entry.tokens || []).filter((token) => token.kind === 'field' && token.committed && token.key === fieldKey);
        const inferredTokens = (entry.inferred || []).filter((item) => item.fieldKey === fieldKey);
        const explicitRaw = explicitTokens.map((token) => source.slice(token.globalStart, token.globalEnd)).join('|');
        const inferredRaw = inferredTokens.map((item) => source.slice(item.globalStart, item.globalEnd)).join('|');
        const tokenId = explicitTokens.length
            ? explicitTokens[explicitTokens.length - 1].id
            : (inferredTokens.length ? inferredTokens[inferredTokens.length - 1].id : '');
        const sourceKind = explicitRaw
            ? 'explicit'
            : (inferredRaw ? 'inferred' : (entry.autoFields && entry.autoFields.has(fieldKey) ? 'auto' : 'fallback'));
        const rawChunk = explicitRaw || inferredRaw;
        const rawValue = deduped.join(`${String(this.config.multiSelectSeparator || ',')} `);
        const dismissKey = (sourceKind === 'explicit' || sourceKind === 'inferred')
            ? this.buildDismissKey({
                entryIndex: entry.index,
                fieldKey,
                value: rawValue,
                sourceKind,
                rawChunk,
                occurrence: 0
            })
            : null;
        const displayValue = deduped.join(this.getMultiSelectDisplaySeparator());
        return {
            fieldKey,
            value: rawValue,
            values: deduped,
            label: `${labelPrefix}: ${displayValue}`,
            entryIndex: entry.index,
            tokenId,
            token: tokenId ? (this.tokenMap[tokenId] || null) : null,
            inferredItem: null,
            inferred: sourceKind === 'inferred',
            auto: sourceKind === 'auto',
            dismissKey,
            grouped: true,
            sourceSelections: Array.isArray(sourceSelections) ? sourceSelections.slice() : []
        };
    };

    QuickAddComponent.prototype.collapseSelectionsForCards = function collapseSelectionsForCards(entry, selections) {
        const sourceSelections = Array.isArray(selections) ? selections : [];
        const groupedByField = new Map();
        sourceSelections.forEach((selection) => {
            if (!selection || !selection.fieldKey) {
                return;
            }
            if (!groupedByField.has(selection.fieldKey)) {
                groupedByField.set(selection.fieldKey, []);
            }
            groupedByField.get(selection.fieldKey).push(selection);
        });

        const output = [];
        const seenFieldKeys = new Set();
        Object.keys(entry.fields || {}).forEach((fieldKey) => {
            seenFieldKeys.add(fieldKey);
            const field = this.getFieldDefinition(fieldKey);
            const fieldSelections = groupedByField.get(fieldKey) || [];
            if (field && field.multiple) {
                const rawValues = this.resolveEntryFieldValues(entry, fieldKey);
                if (!rawValues.length) {
                    return;
                }
                output.push(this.buildGroupedCardSelection(entry, field, fieldKey, rawValues, fieldSelections));
                return;
            }
            fieldSelections.forEach((selection) => output.push(selection));
        });

        groupedByField.forEach((fieldSelections, fieldKey) => {
            if (seenFieldKeys.has(fieldKey)) {
                return;
            }
            fieldSelections.forEach((selection) => output.push(selection));
        });

        return output;
    };

    QuickAddComponent.prototype.getFileFields = function getFileFields() {
        const fields = (this.normalizedSchema && Array.isArray(this.normalizedSchema.fields))
            ? this.normalizedSchema.fields
            : [];
        return fields.filter((field) => field && field.key && isFileFieldType(field.type));
    };

    QuickAddComponent.prototype.supportsAttachments = function supportsAttachments() {
        return this.getFileFields().length > 0;
    };

    QuickAddComponent.prototype.getAttachmentSources = function getAttachmentSources() {
        const sources = normalizeAttachmentSources(this.config.attachmentSources);
        if (sources && sources.length) {
            return sources;
        }
        return ['files'];
    };

    QuickAddComponent.prototype.getAttachmentCaptureValue = function getAttachmentCaptureValue() {
        if (!isMobileDevice()) {
            return '';
        }
        const sources = this.getAttachmentSources();
        return sources.includes('camera') ? 'environment' : '';
    };

    QuickAddComponent.prototype.shouldUseMobileAttachmentPicker = function shouldUseMobileAttachmentPicker() {
        if (!isMobileDevice()) {
            return false;
        }
        return this.getAttachmentSources().length > 0;
    };

    QuickAddComponent.prototype.positionAttachmentSourceMenu = function positionAttachmentSourceMenu(anchorEl) {
        if (!this.attachmentSourceMenuEl) {
            return;
        }
        const anchorRect = (anchorEl && typeof anchorEl.getBoundingClientRect === 'function')
            ? anchorEl.getBoundingClientRect()
            : (
                this.attachmentSourceMenuState && this.attachmentSourceMenuState.anchorRect
                    ? this.attachmentSourceMenuState.anchorRect
                    : null
            );
        if (!anchorRect) {
            return;
        }
        const bounds = this.getFloatingBounds(anchorEl || this.inputEl);
        const pad = window.innerWidth <= 480 ? 8 : 10;
        const viewportWidth = Math.max(0, (bounds.right - bounds.left) - (pad * 2));
        const preferredWidth = Math.max(180, Math.min(240, viewportWidth));
        const width = Math.min(preferredWidth, viewportWidth);
        const minLeft = bounds.left + pad;
        const maxLeft = bounds.right - width - pad;
        const left = Math.max(minLeft, Math.min(anchorRect.left || minLeft, maxLeft));

        this.attachmentSourceMenuEl.style.removeProperty('max-height');
        const measuredHeight = Math.ceil(this.attachmentSourceMenuEl.getBoundingClientRect().height || this.attachmentSourceMenuEl.scrollHeight || 0);
        const gap = 2;
        const anchorTop = anchorRect.top || 0;
        const anchorBottom = anchorRect.bottom || anchorRect.top || 0;
        const minTop = bounds.top + pad;
        const maxBottom = bounds.bottom - pad;
        const availableBelow = Math.max(0, maxBottom - (anchorBottom + gap));
        const availableAbove = Math.max(0, (anchorTop - gap) - minTop);
        let placeBelow = availableBelow >= availableAbove;
        if (availableBelow >= measuredHeight) {
            placeBelow = true;
        } else if (availableAbove >= measuredHeight) {
            placeBelow = false;
        }
        const availableHeight = Math.max(0, placeBelow ? availableBelow : availableAbove);
        let top = placeBelow
            ? (anchorBottom + gap)
            : Math.max(minTop, (anchorTop - gap) - Math.min(availableHeight, measuredHeight));
        if (placeBelow && top + availableHeight > maxBottom) {
            top = Math.max(minTop, maxBottom - availableHeight);
        }

        this.attachmentSourceMenuEl.style.position = 'fixed';
        this.attachmentSourceMenuEl.style.left = `${left}px`;
        this.attachmentSourceMenuEl.style.top = `${top}px`;
        this.attachmentSourceMenuEl.style.width = `${width}px`;
        this.attachmentSourceMenuEl.style.maxWidth = `${Math.max(0, viewportWidth)}px`;
        this.attachmentSourceMenuEl.style.maxHeight = `${Math.floor(availableHeight)}px`;
        this.attachmentSourceMenuEl.style.zIndex = '10000';
    };

    QuickAddComponent.prototype.openAttachmentSourceMenu = function openAttachmentSourceMenu(anchorEl, sourceItems) {
        if (!this.attachmentSourceMenuEl) {
            return;
        }
        const items = Array.isArray(sourceItems) ? sourceItems.filter((item) => item && item.inputId) : [];
        if (!items.length) {
            return;
        }
        const c = this.config.classNames;
        this.attachmentSourceMenuState = {
            anchorEl: anchorEl || null,
            anchorRect: anchorEl && typeof anchorEl.getBoundingClientRect === 'function'
                ? anchorEl.getBoundingClientRect()
                : null
        };
        this.attachmentSourceMenuEl.innerHTML = items.map((item) => `
            <button
                type="button"
                class="${c.attachmentSourceOption}"
                data-entry-attachment-source-option="1"
                data-attachment-input-id="${escHtml(item.inputId)}"
                role="menuitem"
            >${escHtml(item.label || item.source || 'Select')}</button>
        `).join('');
        this.attachmentSourceMenuEl.hidden = false;
        this.positionAttachmentSourceMenu(this.attachmentSourceMenuState.anchorEl || anchorEl);
    };

    QuickAddComponent.prototype.closeAttachmentSourceMenu = function closeAttachmentSourceMenu() {
        this.attachmentSourceMenuState = null;
        if (!this.attachmentSourceMenuEl) {
            return;
        }
        this.attachmentSourceMenuEl.hidden = true;
        this.attachmentSourceMenuEl.innerHTML = '';
        this.attachmentSourceMenuEl.style.removeProperty('position');
        this.attachmentSourceMenuEl.style.removeProperty('left');
        this.attachmentSourceMenuEl.style.removeProperty('top');
        this.attachmentSourceMenuEl.style.removeProperty('width');
        this.attachmentSourceMenuEl.style.removeProperty('max-width');
        this.attachmentSourceMenuEl.style.removeProperty('max-height');
        this.attachmentSourceMenuEl.style.removeProperty('z-index');
    };

    QuickAddComponent.prototype.buildMobileAttachmentPicker = function buildMobileAttachmentPicker(scopeId, acceptAttr, multipleAttr, markerAttr) {
        const sources = this.getAttachmentSources();
        const allowCamera = sources.includes('camera');
        const allowGallery = sources.includes('gallery');
        const allowFiles = sources.includes('files');
        const marker = markerAttr || 'data-global-attachment-input="1"';
        const captureAttr = allowCamera ? ' capture="environment"' : '';
        const token = String(scopeId || 'global').replace(/[^a-zA-Z0-9]/g, '_');
        const cameraInputId = `qa_att_camera_${token}`;
        const galleryInputId = `qa_att_gallery_${token}`;
        const inputId = `qa_att_input_${token}`;
        const sourceOrder = [];
        const sourceAttrs = [];
        if (allowCamera) {
            sourceOrder.push('camera');
            sourceAttrs.push(`data-attachment-camera-input="${escHtml(cameraInputId)}"`);
        }
        if (allowGallery) {
            sourceOrder.push('gallery');
            sourceAttrs.push(`data-attachment-gallery-input="${escHtml(galleryInputId)}"`);
        }
        if (allowFiles) {
            sourceOrder.push('files');
            sourceAttrs.push(`data-attachment-files-input="${escHtml(inputId)}"`);
        }
        const sourceAttrText = sourceAttrs.length ? ` ${sourceAttrs.join(' ')}` : '';
        const c = this.config.classNames;

        const inputs = [];
        if (allowCamera) {
            inputs.push(`
                <input type="file" class="${c.attachmentInput}" id="${escHtml(cameraInputId)}" ${marker} data-attachment-source="camera" ${acceptAttr}${multipleAttr}${captureAttr} />
            `);
        }
        if (allowGallery) {
            inputs.push(`
                <input type="file" class="${c.attachmentInput}" id="${escHtml(galleryInputId)}" ${marker} data-attachment-source="gallery" ${acceptAttr}${multipleAttr} />
            `);
        }
        if (allowFiles) {
            inputs.push(`
                <input type="file" class="${c.attachmentInput}" id="${escHtml(inputId)}" ${marker} data-attachment-source="files" ${acceptAttr}${multipleAttr} />
            `);
        }
        return `
            <div class="${c.attachmentControls}">
                <button type="button" class="${c.attachmentPick}" data-entry-attachment-picker-toggle="1" data-attachment-sources="${escHtml(sourceOrder.join(','))}"${sourceAttrText}>
                    + Add attachment
                </button>
                ${inputs.join('')}
                <span class="${c.attachmentHint}">${this.config.allowMultipleAttachments !== false ? 'Multiple files allowed' : 'Single file only'}</span>
            </div>
        `;
    };

    QuickAddComponent.prototype.getAttachmentAcceptValue = function getAttachmentAcceptValue() {
        const parts = (this.config.allowedAttachmentTypes || [])
            .map((item) => String(item || '').trim())
            .filter(Boolean);
        return parts.join(',');
    };

    QuickAddComponent.prototype.isAttachmentAllowed = function isAttachmentAllowed(file) {
        const allowed = this.config.allowedAttachmentTypes || [];
        if (!allowed.length) {
            return true;
        }
        const name = String(file.name || '').toLowerCase();
        const type = String(file.type || '').toLowerCase();
        return allowed.some((ruleRaw) => {
            const rule = String(ruleRaw || '').trim().toLowerCase();
            if (!rule) return false;
            if (rule.startsWith('.')) return name.endsWith(rule);
            if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
            return type === rule;
        });
    };

    QuickAddComponent.prototype.getAttachmentById = function getAttachmentById(attachmentId) {
        return (this.attachmentPool || []).find((item) => item.id === attachmentId) || null;
    };

    QuickAddComponent.prototype.findAttachmentByRef = function findAttachmentByRef(ref) {
        const needle = normValue(ref);
        if (!needle) {
            return null;
        }
        return (this.attachmentPool || []).find((item) => normValue(item.ref) === needle || normValue(item.name) === needle) || null;
    };

    QuickAddComponent.prototype.createAttachmentRecord = function createAttachmentRecord(file) {
        const isImage = !!(file && file.type && file.type.startsWith('image/'));
        return {
            id: `att_global_${++this.attachmentCounter}`,
            fingerprint: `${file.name}|${file.size}|${file.lastModified}|${file.type}`,
            file,
            ref: file.name || `attachment-${this.attachmentCounter}`,
            name: file.name || `attachment-${this.attachmentCounter}`,
            size: Number(file.size || 0),
            type: file.type || '',
            lastModified: Number(file.lastModified || 0),
            previewUrl: isImage ? URL.createObjectURL(file) : null
        };
    };

    QuickAddComponent.prototype.addGlobalAttachments = function addGlobalAttachments(files) {
        if (!this.supportsAttachments()) {
            return;
        }
        const selected = Array.isArray(files) ? files.filter(Boolean) : [];
        if (!selected.length) {
            return;
        }
        const existing = new Set((this.attachmentPool || []).map((item) => item.fingerprint));
        selected.forEach((file) => {
            if (!this.isAttachmentAllowed(file)) {
                return;
            }
            const record = this.createAttachmentRecord(file);
            if (existing.has(record.fingerprint)) {
                return;
            }
            existing.add(record.fingerprint);
            this.attachmentPool.push(record);
        });
        this.parseAndRender({ source: this.inputText, skipTypingSync: true });
    };

    QuickAddComponent.prototype.resolveEntryFieldValues = function resolveEntryFieldValues(entry, fieldKey) {
        if (!entry || !fieldKey) {
            return [];
        }
        const raw = (entry.fields && entry.fields[fieldKey] !== undefined)
            ? entry.fields[fieldKey]
            : entry[fieldKey];
        const field = this.getFieldDefinition(fieldKey);
        if (Array.isArray(raw)) {
            return dedupeMultiValues(raw);
        }
        if (raw === undefined || raw === null || raw === '') {
            return [];
        }
        if (field && field.multiple) {
            return normalizeMultiValues(raw, String(this.config.multiSelectSeparator || ','));
        }
        return dedupeMultiValues([raw]);
    };

    QuickAddComponent.prototype.getEntryKey = function getEntryKey(entry) {
        return entry && entry._id ? entry._id : (entry ? entry.index : '');
    };

    QuickAddComponent.prototype.getAttachmentUsage = function getAttachmentUsage(result) {
        const usage = new Map();
        const entries = result && Array.isArray(result.entries) ? result.entries : [];
        const fileFields = this.getFileFields();
        entries.forEach((entry) => {
            const entryKey = this.getEntryKey(entry);
            fileFields.forEach((field) => {
                this.resolveEntryFieldValues(entry, field.key).forEach((ref) => {
                    const attachment = this.findAttachmentByRef(ref);
                    if (!attachment) {
                        return;
                    }
                    if (!usage.has(attachment.id)) {
                        usage.set(attachment.id, []);
                    }
                    usage.get(attachment.id).push({
                        entryKey,
                        fieldKey: field.key,
                        ref
                    });
                });
            });
        });
        return usage;
    };

    QuickAddComponent.prototype.syncEntryAttachmentMeta = function syncEntryAttachmentMeta(result) {
        if (!result || !Array.isArray(result.entries)) {
            return result;
        }
        if (!this.supportsAttachments()) {
            result.entries.forEach((entry) => { delete entry.attachments; });
            return result;
        }
        const fileFields = this.getFileFields();
        result.entries.forEach((entry) => {
            const linked = [];
            const seen = new Set();
            fileFields.forEach((field) => {
                this.resolveEntryFieldValues(entry, field.key).forEach((ref) => {
                    const attachment = this.findAttachmentByRef(ref);
                    if (!attachment) {
                        return;
                    }
                    const linkKey = `${field.key}|${attachment.id}`;
                    if (seen.has(linkKey)) {
                        return;
                    }
                    seen.add(linkKey);
                    linked.push({
                        id: attachment.id,
                        fieldKey: field.key,
                        ref: attachment.ref,
                        fingerprint: attachment.fingerprint,
                        file: attachment.file || null,
                        name: attachment.name,
                        size: attachment.size,
                        type: attachment.type,
                        lastModified: attachment.lastModified,
                        previewUrl: attachment.previewUrl || null
                    });
                });
            });
            entry.attachments = linked;
        });
        return result;
    };

    QuickAddComponent.prototype.formatAttachmentSize = function formatAttachmentSize(bytes) {
        const num = Number(bytes || 0);
        if (num < 1024) return `${num} B`;
        if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
        return `${(num / (1024 * 1024)).toFixed(1)} MB`;
    };

    QuickAddComponent.prototype.middleEllipsis = function middleEllipsis(text, maxLength) {
        const value = String(text || '');
        const max = Math.max(8, Number(maxLength || 24));
        if (value.length <= max) {
            return value;
        }
        const keep = max - 1;
        const head = Math.ceil(keep / 2);
        const tail = Math.floor(keep / 2);
        return `${value.slice(0, head)}…${value.slice(value.length - tail)}`;
    };

    QuickAddComponent.prototype.openAttachment = function openAttachment(attachmentId) {
        const item = this.getAttachmentById(attachmentId);
        if (!item || !item.file) {
            return;
        }
        const url = item.previewUrl || URL.createObjectURL(item.file);
        if (!item.previewUrl) {
            item.previewUrl = url;
        }
        window.open(url, '_blank', 'noopener');
    };

    QuickAddComponent.prototype.removeRefsFromAIEntries = function removeRefsFromAIEntries(ref, entryKey, fieldKey) {
        const needle = normValue(ref);
        if (!needle) return;
        const fileFields = this.getFileFields();
        (this.aiState.entries || []).forEach((entry) => {
            if (entryKey !== undefined && entryKey !== null && entry._id !== entryKey) {
                return;
            }
            fileFields.forEach((field) => {
                if (fieldKey && field.key !== fieldKey) {
                    return;
                }
                const values = this.resolveEntryFieldValues(entry, field.key).filter((item) => normValue(item) !== needle);
                if (field.multiple) {
                    entry[field.key] = values;
                } else if (values.length > 0) {
                    entry[field.key] = values[0];
                } else {
                    delete entry[field.key];
                }
            });
        });
    };

    QuickAddComponent.prototype.removeRefsFromDeterministicInput = function removeRefsFromDeterministicInput(ref, entryKey, fieldKey, options) {
        const needle = normValue(ref);
        if (!needle || this.isAiMode()) {
            return;
        }
        const sourceRegion = options && options.sourceRegion === 'card' ? 'card' : 'inline';
        const ranges = [];
        const multiSeparator = String(this.config.multiSelectSeparator || ',');
        (this.lastResult.entries || []).forEach((entry) => {
            const key = this.getEntryKey(entry);
            if (entryKey !== undefined && entryKey !== null && key !== entryKey) {
                return;
            }
            (entry.tokens || []).forEach((token) => {
                if (token.kind !== 'field' || !token.committed) {
                    return;
                }
                if (fieldKey && token.key !== fieldKey) {
                    return;
                }
                const field = this.getFieldDefinition(token.key);
                if (!field || !isFileFieldType(field.type)) {
                    return;
                }
                if (!field.multiple && normValue(token.value) !== needle) {
                    return;
                }
                if (!field.multiple) {
                    ranges.push({ start: token.globalStart, end: token.globalEnd, replacement: '' });
                    return;
                }
                const values = normalizeMultiValues(token.value || '', multiSeparator);
                const nextValues = values.filter((item) => normValue(item) !== needle);
                if (nextValues.length === values.length) {
                    return;
                }
                if (nextValues.length === 0) {
                    ranges.push({ start: token.globalStart, end: token.globalEnd, replacement: '' });
                    return;
                }
                ranges.push({
                    start: token.globalValueStart,
                    end: token.globalValueEnd,
                    replacement: nextValues.join(`${multiSeparator} `)
                });
            });
        });
        if (!ranges.length) {
            return;
        }
        let source = this.inputText || this.readInputText();
        ranges.sort((a, b) => b.start - a.start).forEach((range) => {
            source = this.replaceRange(source, range.start, range.end, range.replacement || '');
        });
        this.parseAndRender({
            source,
            focusInput: sourceRegion !== 'card',
            skipTypingSync: sourceRegion === 'card'
        });
    };

    QuickAddComponent.prototype.openConflictModal = function openConflictModal(state) {
        this.conflictModalState = state || null;
        this.renderConflictModal();
    };

    QuickAddComponent.prototype.closeConflictModal = function closeConflictModal() {
        this.conflictModalState = null;
        this.renderConflictModal();
    };

    QuickAddComponent.prototype.renderConflictModal = function renderConflictModal() {
        if (!this.conflictModalOverlayEl || !this.conflictModalEl) {
            return;
        }
        const c = this.config.classNames;
        const state = this.conflictModalState;
        if (!state) {
            this.conflictModalOverlayEl.hidden = true;
            this.conflictModalEl.innerHTML = '';
            return;
        }
        this.conflictModalEl.innerHTML = `
            <div>${escHtml(state.message || 'Attachment conflict')}</div>
            <div class="${c.conflictModalActions}">
                <button type="button" class="${c.conflictModalBtn}" data-conflict-action="confirm">${escHtml(state.confirmLabel || 'Confirm')}</button>
                <button type="button" class="${c.conflictModalBtn}" data-conflict-action="cancel">Cancel</button>
            </div>
        `;
        this.conflictModalOverlayEl.hidden = false;
    };

    QuickAddComponent.prototype.handleConflictModalAction = function handleConflictModalAction(action) {
        const state = this.conflictModalState;
        if (!state) {
            return;
        }
        if (action === 'confirm' && typeof state.onConfirm === 'function') {
            state.onConfirm();
        }
        this.closeConflictModal();
    };

    QuickAddComponent.prototype.removeGlobalAttachment = function removeGlobalAttachment(attachmentId, force, sourceRegion) {
        const attachment = this.getAttachmentById(attachmentId);
        if (!attachment) {
            return;
        }
        const origin = sourceRegion === 'card' ? 'card' : 'inline';
        const usage = this.getAttachmentUsage(this.lastResult).get(attachmentId) || [];
        if (usage.length > 0 && !force) {
            this.openConflictModal({
                message: `“${attachment.name}” is linked in entries. Unlink and delete it?`,
                confirmLabel: 'Unlink and delete',
                onConfirm: () => this.removeGlobalAttachment(attachmentId, true, origin)
            });
            return;
        }
        if (usage.length > 0) {
            if (this.isAiMode()) {
                this.removeRefsFromAIEntries(attachment.ref);
            } else {
                this.removeRefsFromDeterministicInput(attachment.ref, undefined, undefined, { sourceRegion: origin });
            }
        }
        if (attachment.previewUrl) {
            URL.revokeObjectURL(attachment.previewUrl);
        }
        this.attachmentPool = (this.attachmentPool || []).filter((item) => item.id !== attachmentId);
        this.parseAndRender({
            source: this.inputText,
            focusInput: origin !== 'card',
            skipTypingSync: origin === 'card'
        });
    };

    QuickAddComponent.prototype.linkAttachmentToEntryField = function linkAttachmentToEntryField(entryKey, fieldKey, attachmentId, force, tokenId, sourceRegion) {
        const attachment = this.getAttachmentById(attachmentId);
        const field = this.getFieldDefinition(fieldKey);
        if (!attachment || !field || !isFileFieldType(field.type)) {
            return;
        }
        const focusInput = sourceRegion !== 'card';
        const skipTypingSync = sourceRegion === 'card';
        const multiSeparator = String(this.config.multiSelectSeparator || ',');
        const usage = this.getAttachmentUsage(this.lastResult).get(attachmentId) || [];
        const hasConflict = this.config.allowAttachmentReuse !== true
            && usage.some((item) => item.entryKey !== entryKey || item.fieldKey !== fieldKey);
        if (hasConflict && !force) {
            this.openConflictModal({
                message: `“${attachment.name}” is already linked elsewhere. Unlink and attach here?`,
                confirmLabel: 'Unlink and attach here',
                onConfirm: () => this.linkAttachmentToEntryField(entryKey, fieldKey, attachmentId, true, tokenId, sourceRegion)
            });
            return;
        }
        if (hasConflict) {
            usage.forEach((item) => {
                if (this.isAiMode()) {
                    this.removeRefsFromAIEntries(attachment.ref, item.entryKey, item.fieldKey);
                } else {
                    this.removeRefsFromDeterministicInput(
                        attachment.ref,
                        item.entryKey,
                        item.fieldKey,
                        { sourceRegion: sourceRegion || 'inline' }
                    );
                }
            });
        }
        if (this.isAiMode()) {
            const entry = (this.aiState.entries || []).find((item) => item._id === entryKey);
            if (!entry) return;
            const current = this.resolveEntryFieldValues(entry, fieldKey);
            const hasRef = current.some((item) => normValue(item) === normValue(attachment.ref));
            if (field.multiple) {
                if (!hasRef) current.push(attachment.ref);
                entry[fieldKey] = dedupeMultiValues(current);
            } else {
                entry[fieldKey] = attachment.ref;
            }
            this.parseAndRender({
                source: this.inputText,
                focusInput,
                skipTypingSync
            });
            return;
        }
        const source = this.inputText || this.readInputText();
        const entry = (this.lastResult.entries || []).find((item) => this.getEntryKey(item) === entryKey);
        if (!entry) {
            return;
        }
        const entryExistingRefs = this.resolveEntryFieldValues(entry, fieldKey);
        if (field.multiple && entryExistingRefs.some((item) => normValue(item) === normValue(attachment.ref))) {
            return;
        }
        if (tokenId && this.tokenMap[tokenId]) {
            const token = this.tokenMap[tokenId];
            if (field.multiple) {
                const existing = normalizeMultiValues(token.value || '', multiSeparator);
                existing.push(attachment.ref);
                const replacement = existing.join(`${multiSeparator} `);
                const updated = this.replaceRange(source, token.globalValueStart, token.globalValueEnd, replacement);
                const caret = token.globalValueStart + replacement.length;
                this.parseAndRender({ source: updated, caretOffset: caret, focusInput, skipTypingSync });
                return;
            }
            const updated = this.replaceRange(source, token.globalValueStart, token.globalValueEnd, attachment.ref);
            const caret = token.globalValueStart + String(attachment.ref).length;
            this.parseAndRender({ source: updated, caretOffset: caret, focusInput, skipTypingSync });
            return;
        }
        const tokens = (entry.tokens || []).filter((token) => token.kind === 'field' && token.committed && token.key === fieldKey);
        if (field.multiple && tokens.length > 0) {
            const token = tokens[tokens.length - 1];
            const existing = normalizeMultiValues(token.value || '', multiSeparator);
            if (existing.some((item) => normValue(item) === normValue(attachment.ref))) {
                return;
            }
            existing.push(attachment.ref);
            const replacement = existing.join(`${multiSeparator} `);
            const updated = this.replaceRange(source, token.globalValueStart, token.globalValueEnd, replacement);
            const caret = token.globalValueStart + replacement.length;
            this.parseAndRender({ source: updated, caretOffset: caret, focusInput, skipTypingSync });
            return;
        }
        if (!field.multiple && tokens.length > 0) {
            const token = tokens[tokens.length - 1];
            const updated = this.replaceRange(source, token.globalValueStart, token.globalValueEnd, attachment.ref);
            const caret = token.globalValueStart + String(attachment.ref).length;
            this.parseAndRender({ source: updated, caretOffset: caret, focusInput, skipTypingSync });
            return;
        }
        const prefix = (field.prefixes && field.prefixes[0]) ? field.prefixes[0] : `${field.key}:`;
        const separator = String(this.config.fieldTerminator || '');
        const needsSpace = source.charAt(Math.max(0, entry.globalEnd - 1)) && !/\s/.test(source.charAt(entry.globalEnd - 1));
        const snippet = `${needsSpace ? ' ' : ''}${prefix}${attachment.ref}${separator}`;
        const updated = this.replaceRange(source, entry.globalEnd, entry.globalEnd, snippet);
        const caret = entry.globalEnd + snippet.length;
        this.parseAndRender({ source: updated, caretOffset: caret, focusInput, skipTypingSync });
    };

    QuickAddComponent.prototype.removeAttachmentFromEntryField = function removeAttachmentFromEntryField(entryKey, fieldKey, ref, sourceRegion) {
        const origin = sourceRegion === 'card' ? 'card' : 'inline';
        if (this.isAiMode()) {
            this.removeRefsFromAIEntries(ref, entryKey, fieldKey);
            this.parseAndRender({
                source: this.inputText,
                focusInput: origin !== 'card',
                skipTypingSync: origin === 'card'
            });
            return;
        }
        this.removeRefsFromDeterministicInput(ref, entryKey, fieldKey, { sourceRegion: origin });
    };

    QuickAddComponent.prototype.removeDeterministicEntry = function removeDeterministicEntry(entryIndex, sourceRegion) {
        if (this.isAiMode()) {
            return;
        }
        const targetIndex = Number(entryIndex);
        if (!Number.isFinite(targetIndex)) {
            return;
        }
        const entry = (this.lastResult.entries || []).find((item) => item && item.index === targetIndex);
        if (!entry) {
            return;
        }
        const start = Number(entry.globalStart);
        const end = Number(entry.globalEnd);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
            return;
        }
        const origin = sourceRegion === 'card' ? 'card' : 'inline';
        const separator = String(this.config.entrySeparator || '\n');
        let source = this.inputText || this.readInputText();
        let removeStart = start;
        let removeEnd = end;
        if (separator && source.slice(removeEnd, removeEnd + separator.length) === separator) {
            removeEnd += separator.length;
        } else if (separator && removeStart >= separator.length && source.slice(removeStart - separator.length, removeStart) === separator) {
            removeStart -= separator.length;
        }
        source = this.replaceRange(source, removeStart, removeEnd, '');
        this.parseAndRender({
            source,
            focusInput: origin !== 'card',
            skipTypingSync: origin === 'card'
        });
    };

    QuickAddComponent.prototype.renderAttachmentTile = function renderAttachmentTile(item, options) {
        const opts = options || {};
        const c = this.config.classNames;
        const isImage = !!item.previewUrl;
        const shortName = this.middleEllipsis(item.name, 24);
        const mediaHtml = isImage
            ? `<img src="${escHtml(item.previewUrl)}" class="${c.attachmentPreview || 'qa-attachment-preview-img'}" alt="${escHtml(item.name)}" />`
            : `<svg class="qa-attachment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
        const usedCount = Number(opts.usedCount || 0);
        const usedText = usedCount > 0
            ? `<span class="${c.attachmentUsedFlag}" title="Linked ${usedCount} time${usedCount === 1 ? '' : 's'}">(${usedCount})</span>`
            : '';
        return `
            <div class="${c.attachmentItem}${isImage ? ' qa-is-image' : ''}">
                <button type="button" class="${c.attachmentOpen}" data-attachment-open="1" data-attachment-id="${escHtml(item.id)}" aria-label="Open attachment">
                    ${mediaHtml}
                </button>
                ${opts.removeAttr ? `<button type="button" class="${c.attachmentRemove}" ${opts.removeAttr} aria-label="Remove attachment">✕</button>` : ''}
                ${usedText}
                <div class="${c.attachmentName}" title="${escHtml(item.name)}">${escHtml(shortName)}</div>
            </div>
        `;
    };

    QuickAddComponent.prototype.renderGlobalAttachmentSection = function renderGlobalAttachmentSection(result) {
        if (!this.supportsAttachments()) {
            return '';
        }
        const c = this.config.classNames;
        const accept = this.getAttachmentAcceptValue();
        const acceptAttr = accept ? ` accept="${escHtml(accept)}"` : '';
        const multipleAttr = this.config.allowMultipleAttachments !== false ? ' multiple' : '';
        const captureValue = this.getAttachmentCaptureValue();
        const captureAttr = captureValue ? ` capture="${escHtml(captureValue)}"` : '';
        const inputId = 'qa_att_global_input';
        const usage = this.getAttachmentUsage(result || this.lastResult);
        const listHtml = (this.attachmentPool || []).map((item) => this.renderAttachmentTile(item, {
            removeAttr: `data-global-attachment-remove="1" data-attachment-id="${escHtml(item.id)}"`,
            usedCount: (usage.get(item.id) || []).length
        })).join('');
        const controlsHtml = this.shouldUseMobileAttachmentPicker()
            ? this.buildMobileAttachmentPicker('global', acceptAttr, multipleAttr, 'data-global-attachment-input="1"')
            : `
                <div class="${c.attachmentControls}">
                    <label class="${c.attachmentPick}" for="${inputId}">+ Add attachment</label>
                    <input type="file" class="${c.attachmentInput}" id="${inputId}" data-global-attachment-input="1" ${acceptAttr}${multipleAttr}${captureAttr} />
                    <span class="${c.attachmentHint}">${this.config.allowMultipleAttachments !== false ? 'Multiple files allowed' : 'Single file only'}</span>
                </div>
            `;
        return `
            <div class="${c.attachmentSection} ${c.attachmentGlobalSection}">
                ${controlsHtml}
                <div class="${c.attachmentPoolScroll}">
                    <div class="${c.attachmentList}">
                        ${listHtml || `<div class="${c.attachmentHint}">No global attachments yet.</div>`}
                    </div>
                </div>
            </div>
        `;
    };

    QuickAddComponent.prototype.renderEntryAttachments = function renderEntryAttachments(entry) {
        if (!this.supportsAttachments()) {
            return '';
        }
        const c = this.config.classNames;
        const entryKey = this.getEntryKey(entry);
        const fileFields = this.getFileFields();
        const rows = fileFields.map((field) => {
            const refs = this.resolveEntryFieldValues(entry, field.key);
            const linked = refs.map((ref) => {
                const item = this.findAttachmentByRef(ref);
                return item ? this.renderAttachmentTile(item, {
                    removeAttr: `data-field-attachment-remove="1" data-entry-key="${escHtml(String(entryKey))}" data-file-field-key="${escHtml(field.key)}" data-attachment-ref="${escHtml(ref)}"`
                }) : '';
            }).filter(Boolean);
            const entryAttr = entry._id
                ? `data-entry-id="${escHtml(entry._id)}"`
                : `data-entry-index="${entry.index}"`;
            return `
                <div class="${c.attachmentFieldRow}">
                    <div class="${c.attachmentFieldHeader}">
                        <span>${escHtml(field.label || field.key)}</span>
                        <button type="button" class="${c.attachmentLinkBtn}" data-entry-file-link="1" ${entryAttr} data-file-field-key="${escHtml(field.key)}">Link</button>
                    </div>
                    <div class="${c.attachmentFieldList}">
                        <div class="${c.attachmentList}">
                            ${linked.join('') || `<div class="${c.attachmentHint}">No linked files</div>`}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        return `<div class="${c.attachmentFieldRows}">${rows}</div>`;
    };

    QuickAddComponent.prototype.renderEntryPills = function renderEntryPills(entry) {
        const c = this.config.classNames;
        const selections = this.collapseSelectionsForCards(entry, this.collectEntrySelections(entry));
        const pills = selections.map((selection) => this.buildPillHtml(selection));
        (entry.blocked || []).forEach((item) => {
            pills.push(this.buildPillHtml({
                fieldKey: item.fieldKey,
                entryIndex: entry.index,
                value: item.value,
                label: `${item.fieldKey}: ${item.value}`,
                inferred: item.source === 'inferred',
                blocked: true,
                reason: item.reason
            }));
        });

        if (pills.length === 0) {
            return `<div class="${c.pillRow}"><span class="${c.pill}">No extracted fields</span></div>`;
        }

        return `<div class="${c.pillRow}">${pills.join('')}</div>`;
    };

    QuickAddComponent.prototype.renderAIEntryEditor = function renderAIEntryEditor(entry) {
        const c = this.config.classNames;
        const fields = (this.normalizedSchema && Array.isArray(this.normalizedSchema.fields))
            ? this.normalizedSchema.fields
            : [];
        const editorFields = fields.filter((field) => field && field.key && !String(field.key).startsWith('_'));
        const buildInput = (field) => {
            const key = field.key;
            const label = field.label || key;
            const rawValue = entry[key];
            const value = Array.isArray(rawValue)
                ? rawValue.join(`${String(this.config.multiSelectSeparator || ',')} `)
                : (rawValue ?? '');
            const inputId = escHtml(this.getAIEditInputId(entry._id, key));
            const type = field.type === 'number' ? 'number' : 'text';
            const isLong = field.type === 'string' && String(value || '').length > 80;
            if (isLong) {
                return `
                    <label class="${c.aiEditorLabel}">${escHtml(label)}
                        <textarea class="${c.aiEditorInput}" id="${inputId}" data-ai-edit-field="${escHtml(key)}" rows="2">${escHtml(value)}</textarea>
                    </label>
                `;
            }
            return `
                <label class="${c.aiEditorLabel}">${escHtml(label)}
                    <input class="${c.aiEditorInput}" id="${inputId}" type="${type}" data-ai-edit-field="${escHtml(key)}" value="${escHtml(value)}" />
                </label>
            `;
        };
        const editorInputs = editorFields.map(buildInput).join('');
        return `
            <div class="${c.aiEditor}">
                ${editorInputs}
                <div class="${c.aiActions}">
                    <button type="button" class="${c.aiActionBtn} ${c.aiActionBtnGhost}" data-ai-action="cancel-edit" data-ai-entry-id="${escHtml(entry._id)}">Cancel</button>
                    <button type="button" class="${c.aiActionBtn} ${c.aiActionBtnPrimary}" data-ai-action="save-edit" data-ai-entry-id="${escHtml(entry._id)}">Save</button>
                </div>
            </div>
        `;
    };

    QuickAddComponent.prototype.renderAIEntryCard = function renderAIEntryCard(entry) {
        const c = this.config.classNames;
        const deleted = this.aiState.deletedEntries.has(entry._id);
        const edited = this.aiState.editedEntries.has(entry._id);
        const editing = this.aiState.editingEntryId === entry._id;
        const schemaFields = (this.normalizedSchema && Array.isArray(this.normalizedSchema.fields))
            ? this.normalizedSchema.fields
            : [];
        const metaFields = schemaFields.filter((field) => field && field.key && !String(field.key).startsWith('_'));
        const titleKey = schemaFields.find((field) => field && field.key === 'title')
            ? 'title'
            : (metaFields[0] ? metaFields[0].key : 'title');
        const cardClasses = [
            c.entry,
            deleted ? c.pillBlocked : ''
        ].filter(Boolean).join(' ');
        const confidence = Number.isFinite(Number(entry.confidence))
            ? `${Math.round(Math.max(0, Math.min(1, Number(entry.confidence))) * 100)}%`
            : '-';
        const headerBadges = [
            edited ? 'edited' : '',
            deleted ? 'removed' : ''
        ].filter(Boolean);
        const badges = headerBadges.length
            ? headerBadges.map((item) => `<span class="${c.badge}">${escHtml(item)}</span>`).join('')
            : `<span class="${c.badge}">parsed</span>`;
        const actionRow = deleted
            ? `<button type="button" class="${c.aiActionBtn} ${c.aiActionBtnGhost}" data-ai-action="restore-entry" data-ai-entry-id="${escHtml(entry._id)}">Restore</button>`
            : `
                <button type="button" class="${c.aiActionBtn} ${c.aiActionBtnGhost}" data-ai-action="edit-entry" data-ai-entry-id="${escHtml(entry._id)}">Edit</button>
                <button type="button" class="${c.aiActionBtn} ${c.aiActionBtnDanger}" data-ai-action="delete-entry" data-ai-entry-id="${escHtml(entry._id)}">Remove</button>
            `;

        const attachmentsHtml = this.renderEntryAttachments(entry);

        if (editing) {
            return `
                <article class="${cardClasses}" data-ai-entry-id="${escHtml(entry._id)}">
                    <div class="${c.entryHeader}">
                        <div class="${c.entryTitle}">AI Entry</div>
                        <div class="${c.badges}">${badges}</div>
                    </div>
                    ${this.renderAIEntryEditor(entry)}
                </article>
            `;
        }

        const titleValue = entry[titleKey];
        const pills = [];
        const entryIndex = (this.aiState.entries || []).findIndex((item) => item && item._id === entry._id);
        const occurrenceMap = {};
        const multiDisplaySeparator = this.getMultiSelectDisplaySeparator();
        metaFields.forEach((field) => {
            const key = field.key;
            let rawValue = entry[key];
            let autoFromDefault = false;
            const isMissing = Array.isArray(rawValue)
                ? rawValue.length === 0
                : (rawValue === undefined || rawValue === null || rawValue === '');
            if (isMissing) {
                const parsedDefault = parseDefaultValueByType(field, this.config);
                if (parsedDefault.ok) {
                    rawValue = parsedDefault.value;
                    autoFromDefault = true;
                }
            }
            const values = Array.isArray(rawValue) ? dedupeMultiValues(rawValue) : [rawValue];
            if (field.multiple) {
                const groupedValues = dedupeMultiValues(values);
                if (!groupedValues.length) {
                    return;
                }
                const label = field.label || key;
                const groupedText = groupedValues.join(multiDisplaySeparator);
                const groupedRaw = groupedValues.join(`${String(this.config.multiSelectSeparator || ',')} `);
                pills.push(this.buildPillHtml({
                    fieldKey: key,
                    entryIndex: Math.max(0, entryIndex),
                    value: groupedText,
                    label: `${label}: ${groupedText}`,
                    inferred: false,
                    auto: autoFromDefault,
                    blocked: false,
                    dismissKey: null,
                    tokenId: null,
                    aiMeta: {
                        entryId: entry._id,
                        fieldKey: key,
                        value: groupedRaw,
                        occurrence: 0,
                        mappingKey: ''
                    }
                }));
                return;
            }
            values.forEach((value) => {
                if (value === undefined || value === null || value === '') {
                    return;
                }
                const label = field.label || key;
                const text = Array.isArray(value) ? value.join(', ') : value;
                const base = this.buildAIInlineMappingBaseKey(entry._id, key, value);
                const occurrence = occurrenceMap[base] || 0;
                occurrenceMap[base] = occurrence + 1;
                const mappingKey = this.buildAIInlineMappingKey(entry._id, key, value, occurrence);
                const aiMeta = {
                    entryId: entry._id,
                    fieldKey: key,
                    value,
                    occurrence,
                    mappingKey: this.aiInlineMarkIndex[mappingKey] ? mappingKey : ''
                };
                pills.push(this.buildPillHtml({
                    fieldKey: key,
                    entryIndex: Math.max(0, entryIndex),
                    value,
                    label: `${label}: ${text}`,
                    inferred: false,
                    auto: autoFromDefault,
                    blocked: false,
                    dismissKey: null,
                    tokenId: null,
                    aiMeta
                }));
            });
        });
        if (Number.isFinite(Number(entry.confidence))) {
            pills.push(`<span class="${c.pill}">confidence: ${escHtml(confidence)}</span>`);
        }
        const pillsHtml = pills.length
            ? `<div class="${c.pillRow}">${pills.join('')}</div>`
            : `<div class="${c.pillRow}"><span class="${c.pill}">No extracted fields</span></div>`;
        const notesValue = entry.notes || entry.note || '';
        return `
            <article class="${cardClasses}" data-ai-entry-id="${escHtml(entry._id)}">
                <div class="${c.entryHeader}">
                    <div class="${c.entryTitle}">${escHtml(titleValue || 'Entry')}</div>
                    <div class="${c.badges}">${badges}</div>
                </div>
                ${pillsHtml}
                ${notesValue ? `<div class="${c.issues}"><div class="${c.issue}">${escHtml(notesValue)}</div></div>` : ''}
                ${attachmentsHtml}
                <div class="${c.aiActions}">
                    ${actionRow}
                </div>
            </article>
        `;
    };

    QuickAddComponent.prototype.renderAIResult = function renderAIResult(result) {
        this.syncEntryAttachmentMeta(result);
        const c = this.config.classNames;
        const parseState = result.parseState || {};
        const activeCount = (this.aiState.entries || []).filter((entry) => !this.aiState.deletedEntries.has(entry._id)).length;
        const statusParts = [];
        if (result.isProcessing) {
            statusParts.push('AI processing...');
        } else {
            statusParts.push(`${activeCount} active entries`);
        }
        if (parseState && parseState.status) {
            statusParts.push(`parse: ${parseState.status}`);
        }
        if (result.error) {
            statusParts.push(`error: ${result.error}`);
        }
        this.statusEl.textContent = statusParts.join(' | ');

        const controls = this.config.ai && this.config.ai.controls ? this.config.ai.controls : {};
        const showParse = controls.parse !== false;
        const showClear = controls.clear !== false;
        const actionsHtml = `
            <div class="${c.aiActions}">
                ${showParse ? `<button type="button" class="${c.aiActionBtn} ${c.aiActionBtnPrimary}" data-ai-action="parse-now">Parse Now</button>` : ''}
                ${showClear ? `<button type="button" class="${c.aiActionBtn} ${c.aiActionBtnGhost}" data-ai-action="clear-entries">Clear Entries</button>` : ''}
            </div>
        `;
        const warningRows = []
            .concat((result.warnings || []).map((item) => `<div class="${c.issue}">Warning: ${escHtml(item)}</div>`))
            .concat((result.missing || []).map((item) => `<div class="${c.issue}">Unknown: ${escHtml(item)}</div>`));
        const warningsHtml = warningRows.length
            ? `<div class="${c.issues}">${warningRows.join('')}</div>`
            : '';
        const globalAttachmentsHtml = this.renderGlobalAttachmentSection(result);

        if (this.aiState.entries.length === 0) {
            const autoParseActive = this.config.ai.autoParse !== false;
            const autoParseHint = autoParseActive
                ? 'Type text and pause to trigger extraction.'
                : 'Auto-parse is off. Click Parse Now to run extraction.';
            this.previewEl.innerHTML = `
                ${globalAttachmentsHtml}
                ${actionsHtml}
                ${warningsHtml}
                <article class="${c.entry} ${c.entryEmpty}">No AI entries yet. ${autoParseHint} Or click Parse Now.</article>
            `;
        } else {
            this.previewEl.innerHTML = `
                ${globalAttachmentsHtml}
                ${actionsHtml}
                ${warningsHtml}
                ${this.aiState.entries.map((entry) => this.renderAIEntryCard(entry)).join('')}
            `;
        }

        if (this.outputEl) {
            this.outputEl.textContent = JSON.stringify({
                mode: 'ai',
                input: this.inputText,
                entries: this.aiState.entries.map((entry) => {
                    const mapped = Object.assign({}, entry);
                    const entryId = String(
                        entry._id
                        || (entry.aiMeta && entry.aiMeta.id)
                        || (entry.fields && entry.fields._id)
                        || ''
                    );
                    const match = Array.isArray(result.entries)
                        ? result.entries.find((item) => String(
                            item._id
                            || (item.aiMeta && item.aiMeta.id)
                            || (item.fields && item.fields._id)
                            || ''
                        ) === entryId)
                        : null;
                    if (match && Array.isArray(match.attachments)) {
                        mapped.attachments = match.attachments.slice();
                    }
                    return mapped;
                }),
                editedEntryIds: Array.from(this.aiState.editedEntries),
                deletedEntryIds: Array.from(this.aiState.deletedEntries),
                warnings: result.warnings || [],
                missing: result.missing || [],
                parseState: result.parseState || null,
                callerRequest: result.callerRequest || null
            }, null, 2);
        }
    };

    QuickAddComponent.prototype.renderResult = function renderResult(result) {
        if (this.isAiMode()) {
            this.renderAIResult(result || this.buildAIResult());
            return;
        }
        const c = this.config.classNames;
        const showEntryCards = this.config.showEntryCards !== false;
        const showEntryHeader = this.config.showEntryHeader !== false;
        this.statusEl.textContent = `${result.entryCount} entries | ${result.validCount} valid | ${result.invalidCount} issues`;
        const globalAttachmentsHtml = this.renderGlobalAttachmentSection(result);

        if (!showEntryCards) {
            this.previewEl.innerHTML = globalAttachmentsHtml;
            if (this.outputEl) {
                this.outputEl.textContent = JSON.stringify(result, null, 2);
            }
            return;
        }

        if (result.entries.length === 0) {
            this.previewEl.innerHTML = `${globalAttachmentsHtml}<div class="${c.entry}">No parsed entries yet.</div>`;
        } else {
            this.previewEl.innerHTML = `${globalAttachmentsHtml}${result.entries.map((entry) => {
                const pendingRows = entry.pending.map((pending) =>
                    `<div class="${c.issue}">Pending: ${escHtml(pending)}</div>`
                ).join('');
                const errorRows = entry.errors.map((error) =>
                    `<div class="${c.issue}">${escHtml(error)}</div>`
                ).join('');
                const badgeText = entry.isValid ? 'valid' : 'needs attention';
                const headerHtml = showEntryHeader
                    ? `
                        <div class="${c.entryHeader}">
                            <div class="${c.entryTitle}">Entry ${entry.index + 1}</div>
                            <div class="${c.badges}">
                                <span class="${c.badge}">${badgeText}</span>
                            </div>
                        </div>
                    `
                    : '';
                const pillsHtml = this.renderEntryPills(entry);
                const attachmentsHtml = this.renderEntryAttachments(entry);
                const actionRow = Number.isFinite(Number(entry.globalStart)) && Number.isFinite(Number(entry.globalEnd))
                    ? `
                        <div class="${c.aiActions}">
                            <button type="button" class="${c.aiActionBtn} ${c.aiActionBtnDanger}" data-det-action="remove-entry" data-entry-index="${entry.index}">Remove</button>
                        </div>
                    `
                    : '';

                return `
                    <article class="${c.entry}">
                        ${headerHtml}
                        ${pillsHtml}
                        ${attachmentsHtml}
                        ${actionRow}
                        ${(entry.pending.length || entry.errors.length) ? `
                            <div class="${c.issues}">
                                ${pendingRows}
                                ${errorRows}
                            </div>
                        ` : ''}
                    </article>
                `;
            }).join('')}`;
        }

        if (this.outputEl) {
            this.outputEl.textContent = JSON.stringify(result, null, 2);
        }
    };

    QuickAddComponent.prototype.getCaretClientRect = function getCaretClientRect() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
            return this.inputEl.getBoundingClientRect();
        }
        const range = sel.getRangeAt(0).cloneRange();
        range.collapse(true);
        const rect = range.getBoundingClientRect();
        if (rect && rect.width + rect.height > 0) {
            return rect;
        }
        return this.inputEl.getBoundingClientRect();
    };

    QuickAddComponent.prototype.findOptionTokenAtCaret = function findOptionTokenAtCaret(caretOffset) {
        if (typeof caretOffset !== 'number') {
            return null;
        }

        let best = null;
        this.lastResult.entries.forEach((entry) => {
            entry.tokens.forEach((token) => {
                if (token.kind !== 'field') {
                    return;
                }
                const field = this.getFieldDefinition(token.key);
                if (!field || !this.fieldSupportsDropdown(field, token.entryIndex, token.key)) {
                    return;
                }

                const inRange = caretOffset >= token.globalStart && caretOffset <= token.globalEnd;
                if (!inRange) {
                    return;
                }
                if (!best || token.globalStart >= best.globalStart) {
                    best = token;
                }
            });
        });

        return best;
    };

    QuickAddComponent.prototype.syncTypingDropdown = function syncTypingDropdown(caretOffset) {
        this.closeAttachmentSourceMenu();
        if (this.config.showDropdownOnTyping === false) {
            if (this.dropdownState && this.dropdownState.source === 'typing') {
                this.closeDropdown();
            }
            return;
        }
        if (document.activeElement !== this.inputEl) {
            if (this.dropdownState && this.dropdownState.source === 'typing') {
                this.closeDropdown();
            }
            return;
        }

        const token = this.findOptionTokenAtCaret(caretOffset);
        if (!token) {
            if (this.dropdownState && this.dropdownState.source === 'typing') {
                this.closeDropdown();
            }
            return;
        }

        const field = this.getFieldDefinition(token.key);
        if (!field || !this.fieldSupportsDropdown(field, token.entryIndex, token.key)) {
            if (this.dropdownState && this.dropdownState.source === 'typing') {
                this.closeDropdown();
            }
            return;
        }

        const options = this.getDropdownOptionsForField(field, token.entryIndex, token.key);
        if (options.length === 0) {
            if (this.dropdownState && this.dropdownState.source === 'typing') {
                this.closeDropdown();
            }
            return;
        }

        this.dropdownState = {
            fieldKey: token.key,
            fieldType: field.type,
            tokenId: token.id,
            entryIndex: typeof token.entryIndex === 'number' ? token.entryIndex : 0,
            entryKey: typeof token.entryIndex === 'number' ? token.entryIndex : 0,
            currentValue: token.value || '',
            allowCustom: !!field.allowCustom,
            options,
            sourceRegion: 'inline',
            anchorRect: null,
            source: 'typing',
            activeOptionValue: null,
            filteredOptions: [],
            activateFirstOnOpen: false,
            keepActiveWhenFiltering: false
        };

        this.dropdownSearchEl.hidden = true;
        this.dropdownSearchEl.value = token.value || '';
        this.renderDropdownList();
        this.positionDropdownAtRect(this.getCaretClientRect());
        this.dropdownEl.hidden = false;
        this.dropdownEl.classList.add(this.config.classNames.dropdownOpen);
    };

    QuickAddComponent.prototype.handlePillClick = function handlePillClick(pillEl) {
        this.closeAttachmentSourceMenu();
        this.closeBlockedInfo();
        const sourceRegion = pillEl.closest('[data-role="preview"]') ? 'card' : 'inline';
        const entryIndex = Number(pillEl.getAttribute('data-pill-entry'));
        const isAiPill = pillEl.getAttribute('data-pill-ai') === '1';

        if (isAiPill && this.isAiMode()) {
            const fieldKey = pillEl.getAttribute('data-pill-ai-field') || '';
            const entryId = pillEl.getAttribute('data-pill-ai-entry-id') || '';
            const currentValue = pillEl.getAttribute('data-pill-ai-value') || '';
            const mappingKey = pillEl.getAttribute('data-pill-ai-map') || '';
            const occurrenceRaw = Number(pillEl.getAttribute('data-pill-ai-occurrence'));
            const occurrence = Number.isFinite(occurrenceRaw) ? Math.max(0, occurrenceRaw) : 0;
            let resolvedEntryIndex = Number.isFinite(entryIndex) ? entryIndex : NaN;
            if (!Number.isFinite(resolvedEntryIndex) && entryId) {
                const mappedIndex = (this.aiState.entries || []).findIndex((item) => item && item._id === entryId);
                if (mappedIndex >= 0) {
                    resolvedEntryIndex = mappedIndex;
                }
            }
            if (!Number.isFinite(resolvedEntryIndex)) {
                resolvedEntryIndex = 0;
            }
            const field = this.getFieldDefinition(fieldKey);
            if (!field || !entryId) {
                return;
            }
            if (isDateFieldType(field.type)) {
                if (Date.now() < this.datePickerSuppressUntil) {
                    return;
                }
                this.openDatePicker({
                    field,
                    value: currentValue,
                    entryIndex: resolvedEntryIndex,
                    anchorEl: pillEl,
                    sourceRegion,
                    aiContext: {
                        entryId,
                        fieldKey,
                        currentValue,
                        occurrence,
                        mappingKey,
                        sourceRegion
                    }
                });
                return;
            }
            if (field.type === 'number' && this.isNumberStepperEnabledForField(field)) {
                return;
            }
            if (!this.fieldSupportsDropdown(field, entryId, fieldKey)) {
                return;
            }
            const options = this.getDropdownOptionsForField(field, entryId, fieldKey);
            if (options.length === 0) {
                return;
            }
            this.dropdownState = {
                fieldKey,
                fieldType: field.type,
                tokenId: '',
                entryIndex: resolvedEntryIndex,
                entryKey: entryId,
                currentValue,
                allowCustom: !!field.allowCustom,
                options,
                sourceRegion,
                anchorRect: pillEl.getBoundingClientRect(),
                anchorEl: pillEl,
                source: 'click',
                activeOptionValue: null,
                filteredOptions: [],
                activateFirstOnOpen: true,
                keepActiveWhenFiltering: false,
                aiContext: {
                    entryId,
                    fieldKey,
                    currentValue,
                    occurrence,
                    mappingKey,
                    sourceRegion
                }
            };
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
            this.dropdownSearchEl.hidden = false;
            this.dropdownSearchEl.value = '';
            this.renderDropdownList();
            this.positionDropdown(pillEl);
            this.dropdownEl.hidden = false;
            this.dropdownEl.classList.add(this.config.classNames.dropdownOpen);
            this.scrollDropdownActiveOptionIntoView();
            this.dropdownSearchEl.focus();
            this.dropdownSearchEl.select();
            return;
        }

        const fieldKey = pillEl.getAttribute('data-pill-field');
        const tokenId = pillEl.getAttribute('data-pill-token');
        const pillValue = pillEl.getAttribute('data-pill-value') || '';
        if (!fieldKey || Number.isNaN(entryIndex)) {
            return;
        }

        const field = this.getFieldDefinition(fieldKey);
        if (!field) {
            return;
        }

        let token = tokenId ? this.tokenMap[tokenId] : null;
        if (!token && pillValue) {
            token = this.materializeEntryFieldToken(entryIndex, fieldKey, pillValue, sourceRegion);
        }

        if (isDateFieldType(field.type)) {
            if (Date.now() < this.datePickerSuppressUntil) {
                return;
            }
            if (token && this.datePickerState && this.datePickerState.tokenId === token.id) {
                this.closeDatePicker();
                return;
            }
            pillEl.setAttribute('data-qa-date-pill', '1');
            this.openDatePicker({
                field,
                token,
                entryIndex,
                anchorEl: pillEl,
                sourceRegion
            });
            return;
        }
        if (field.type === 'number' && this.isNumberStepperEnabledForField(field)) {
            return;
        }

        if (!this.fieldSupportsDropdown(field, entryIndex, fieldKey)) {
            return;
        }

        const options = this.getDropdownOptionsForField(field, entryIndex, fieldKey);
        if (options.length === 0) {
            return;
        }

        this.dropdownState = {
            fieldKey,
            fieldType: field.type,
            tokenId: token ? token.id : '',
            entryIndex,
            entryKey: entryIndex,
            currentValue: (field.multiple && field.type === 'options')
                ? pillValue
                : (token ? token.value : pillValue),
            allowCustom: !!field.allowCustom,
            options,
            sourceRegion,
            anchorRect: pillEl.getBoundingClientRect(),
            anchorEl: pillEl,
            source: 'click',
            activeOptionValue: null,
            filteredOptions: [],
            activateFirstOnOpen: true,
            keepActiveWhenFiltering: false
        };
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        this.dropdownSearchEl.hidden = false;
        this.dropdownSearchEl.value = '';
        this.renderDropdownList();
        this.positionDropdown(pillEl);
        this.dropdownEl.hidden = false;
        this.dropdownEl.classList.add(this.config.classNames.dropdownOpen);
        this.scrollDropdownActiveOptionIntoView();
        this.dropdownSearchEl.focus();
        this.dropdownSearchEl.select();
    };

    QuickAddComponent.prototype.placeCaretNearPill = function placeCaretNearPill(pillEl, clickEvent) {
        if (!pillEl) {
            return;
        }
        const tokenId = pillEl.getAttribute('data-pill-token');
        const rect = pillEl.getBoundingClientRect();
        const clickX = clickEvent && typeof clickEvent.clientX === 'number'
            ? clickEvent.clientX
            : rect.right;
        const midpoint = rect.left + (rect.width / 2);
        let caretOffset = null;
        if (tokenId) {
            const token = this.tokenMap[tokenId];
            if (token) {
                caretOffset = clickX >= midpoint ? token.globalEnd : token.globalStart;
            }
        } else if (this.isAiMode()) {
            const mappingKey = pillEl.getAttribute('data-pill-ai-map') || '';
            const mapping = mappingKey ? this.aiInlineMarkIndex[mappingKey] : null;
            if (
                mapping
                && Number.isFinite(Number(mapping.start))
                && Number.isFinite(Number(mapping.end))
            ) {
                caretOffset = clickX >= midpoint ? Number(mapping.end) : Number(mapping.start);
            }
        }

        if (!Number.isFinite(Number(caretOffset))) {
            const source = this.inputText || this.readInputText();
            caretOffset = source.length;
        }
        this.closeDropdown();
        this.setCaretOffset(Number(caretOffset), true);
    };

    QuickAddComponent.prototype.positionDropdownAtRect = function positionDropdownAtRect(rect, anchorEl) {
        const viewportBounds = {
            left: 0,
            top: 0,
            right: window.innerWidth,
            bottom: window.innerHeight
        };
        const dropdownState = this.dropdownState || {};
        const preferViewportBounds = dropdownState.sourceRegion === 'card' && dropdownState.source === 'click';
        const pad = window.innerWidth <= 480 ? 8 : 10;
        const maxPanelHeight = window.innerWidth <= 480 ? 288 : 348;
        const minPreferredPanelHeight = window.innerWidth <= 480 ? 180 : 250;
        const gap = 0;
        const anchorTop = rect.top || 0;
        const anchorBottom = rect.bottom || rect.top || 0;
        const evaluateLayout = (candidateBounds) => {
            const viewportWidth = Math.max(0, (candidateBounds.right - candidateBounds.left) - (pad * 2));
            const preferredWidth = Math.max(260, Math.min(320, viewportWidth));
            const width = Math.min(preferredWidth, viewportWidth);
            const minLeft = candidateBounds.left + pad;
            const maxLeft = candidateBounds.right - width - pad;
            const left = Math.max(minLeft, Math.min(rect.left || minLeft, maxLeft));
            const minTop = candidateBounds.top + pad;
            const maxBottom = candidateBounds.bottom - pad;
            const availableBelow = Math.max(0, maxBottom - (anchorBottom + gap));
            const availableAbove = Math.max(0, (anchorTop - gap) - minTop);
            const desiredHeight = Math.min(Math.max(1, measuredHeight || 1), maxPanelHeight);
            let placeBelow = availableBelow >= availableAbove;
            if (availableBelow >= desiredHeight) {
                placeBelow = true;
            } else if (availableAbove >= desiredHeight) {
                placeBelow = false;
            }
            const panelHeight = Math.max(0, Math.min(placeBelow ? availableBelow : availableAbove, maxPanelHeight));
            let top = placeBelow
                ? (anchorBottom + gap)
                : Math.max(minTop, (anchorTop - gap) - panelHeight);
            if (placeBelow && top + panelHeight > maxBottom) {
                top = Math.max(minTop, maxBottom - panelHeight);
            }
            return {
                bounds: candidateBounds,
                viewportWidth,
                width,
                left,
                top,
                panelHeight,
                availableBelow,
                availableAbove
            };
        };

        const prevHidden = this.dropdownEl.hidden;
        const prevVisibility = this.dropdownEl.style.visibility;
        const prevDisplay = this.dropdownEl.style.display;
        let measureBounds = preferViewportBounds
            ? viewportBounds
            : this.getFloatingBounds(anchorEl || this.inputEl);
        const measureBoundedHeight = Math.max(0, (measureBounds.bottom - measureBounds.top) - (pad * 2));
        if (measureBoundedHeight < 120) {
            measureBounds = viewportBounds;
        }
        const measureViewportWidth = Math.max(0, (measureBounds.right - measureBounds.left) - (pad * 2));
        const measurePreferredWidth = Math.max(260, Math.min(320, measureViewportWidth));
        const measureWidth = Math.min(measurePreferredWidth, measureViewportWidth);
        this.dropdownEl.hidden = false;
        this.dropdownEl.style.visibility = 'hidden';
        this.dropdownEl.style.removeProperty('display');
        this.dropdownEl.style.width = `${measureWidth}px`;
        this.dropdownEl.style.removeProperty('maxHeight');
        const measuredHeight = Math.ceil(this.dropdownEl.getBoundingClientRect().height || this.dropdownEl.scrollHeight || 0);
        if (prevHidden) {
            this.dropdownEl.hidden = true;
        }
        this.dropdownEl.style.visibility = prevVisibility;
        if (prevDisplay) {
            this.dropdownEl.style.display = prevDisplay;
        } else {
            this.dropdownEl.style.removeProperty('display');
        }

        let bounds = preferViewportBounds
            ? viewportBounds
            : this.getFloatingBounds(anchorEl || this.inputEl);
        const boundedHeight = Math.max(0, (bounds.bottom - bounds.top) - (pad * 2));
        if (boundedHeight < 120) {
            bounds = viewportBounds;
        }

        let layout = evaluateLayout(bounds);
        const boundedMaxAvailable = Math.max(layout.availableBelow, layout.availableAbove);
        if (boundedMaxAvailable < minPreferredPanelHeight) {
            const viewportLayout = evaluateLayout(viewportBounds);
            const viewportMaxAvailable = Math.max(viewportLayout.availableBelow, viewportLayout.availableAbove);
            if (viewportMaxAvailable > boundedMaxAvailable) {
                layout = viewportLayout;
            }
        }

        this.dropdownEl.style.position = 'fixed';
        this.dropdownEl.style.left = `${layout.left}px`;
        this.dropdownEl.style.top = `${layout.top}px`;
        this.dropdownEl.style.width = `${layout.width}px`;
        this.dropdownEl.style.maxWidth = `${Math.max(0, layout.viewportWidth)}px`;
        this.dropdownEl.style.maxHeight = `${Math.floor(layout.panelHeight)}px`;
        this.dropdownEl.style.zIndex = '9999';
        const searchHeight = (this.dropdownSearchEl && !this.dropdownSearchEl.hidden)
            ? Math.ceil(this.dropdownSearchEl.getBoundingClientRect().height || 0)
            : 0;
        const listMaxHeight = Math.max(0, layout.panelHeight - searchHeight - 1);
        this.dropdownListEl.style.maxHeight = `${Math.floor(listMaxHeight)}px`;
        this.updateDropdownScrollIndicators();
    };

    QuickAddComponent.prototype.positionDropdown = function positionDropdown(anchorEl) {
        const state = this.dropdownState || {};
        const anchorConnected = !!(anchorEl && anchorEl.isConnected && typeof anchorEl.getBoundingClientRect === 'function');
        const rect = anchorConnected
            ? anchorEl.getBoundingClientRect()
            : (state.anchorRect || this.getCaretClientRect());
        const fallbackAnchor = state.sourceRegion === 'card'
            ? (this.previewEl || this.mountEl || this.inputEl)
            : this.inputEl;
        this.positionDropdownAtRect(rect, anchorConnected ? anchorEl : fallbackAnchor);
    };

    QuickAddComponent.prototype.showBlockedInfoFromElement = function showBlockedInfoFromElement(element) {
        if (!element) {
            return;
        }
        const reason = element.getAttribute('data-blocked-reason') || 'Blocked by constraints';
        this.showBlockedInfo(reason, element);
    };

    QuickAddComponent.prototype.showBlockedInfo = function showBlockedInfo(reason, anchorEl) {
        if (!this.blockedInfoEl) {
            if (!this.rootEl) {
                return;
            }
            const el = document.createElement('div');
            el.className = this.config.classNames.blockedInfo;
            el.setAttribute('data-role', 'blockedInfo');
            el.hidden = true;
            this.rootEl.appendChild(el);
            this.blockedInfoEl = el;
        }
        this.closeDropdown();
        this.closeNumberPicker();
        const c = this.config.classNames;
        const safeReason = escHtml(reason || 'Blocked by constraints');
        this.blockedInfoEl.innerHTML = `
            <span class="${c.blockedInfoIcon}" aria-hidden="true">!</span>
            <span class="${c.blockedInfoText}">${safeReason}</span>
        `;
        this.blockedInfoState = { reason: reason || '' };
        const rect = anchorEl && anchorEl.getBoundingClientRect
            ? anchorEl.getBoundingClientRect()
            : this.inputEl.getBoundingClientRect();
        const bounds = this.getFloatingBounds(anchorEl || this.inputEl);
        const pad = window.innerWidth <= 480 ? 8 : 10;
        const viewportWidth = Math.max(0, (bounds.right - bounds.left) - (pad * 2));
        const width = Math.min(420, viewportWidth, Math.max(180, (rect.width || 0) + 90));
        const left = Math.max(bounds.left + pad, Math.min(rect.left || bounds.left, bounds.right - width - pad));
        const minTop = bounds.top + pad;
        const maxBottom = bounds.bottom - pad;
        const belowTop = (rect.bottom || rect.top || 0) + 8;
        const aboveBottom = (rect.top || 0) - 8;
        const availableBelow = Math.max(0, maxBottom - belowTop);
        const availableAbove = Math.max(0, aboveBottom - minTop);
        const placeBelow = availableBelow >= availableAbove;
        const maxHeight = Math.max(0, Math.min(220, placeBelow ? availableBelow : availableAbove));
        const top = placeBelow
            ? belowTop
            : Math.max(minTop, aboveBottom - maxHeight);
        this.blockedInfoEl.style.position = 'fixed';
        this.blockedInfoEl.style.left = `${left}px`;
        this.blockedInfoEl.style.top = `${top}px`;
        this.blockedInfoEl.style.marginTop = '0';
        this.blockedInfoEl.style.width = `${width}px`;
        this.blockedInfoEl.style.maxWidth = `${viewportWidth}px`;
        this.blockedInfoEl.style.maxHeight = `${Math.floor(maxHeight)}px`;
        this.blockedInfoEl.style.overflow = 'auto';
        this.blockedInfoEl.style.zIndex = '10000';
        this.blockedInfoEl.style.removeProperty('position-anchor');
        this.blockedInfoEl.style.removeProperty('position-try-fallbacks');
        this.blockedInfoEl.hidden = false;
    };

    QuickAddComponent.prototype.closeBlockedInfo = function closeBlockedInfo() {
        this.blockedInfoState = null;
        if (!this.blockedInfoEl) {
            return;
        }
        if (this.blockedInfoEl.parentNode) {
            this.blockedInfoEl.parentNode.removeChild(this.blockedInfoEl);
        }
        this.blockedInfoEl = null;
    };

    QuickAddComponent.prototype.renderDropdownList = function renderDropdownList() {
        if (!this.dropdownState) {
            this.dropdownListEl.innerHTML = '';
            this.updateDropdownScrollIndicators();
            return;
        }

        const c = this.config.classNames;
        const field = this.getFieldDefinition(this.dropdownState.fieldKey);
        const isMultiSelectOptions = !!(field && field.type === 'options' && field.multiple);
        const isMultiValueDropdown = !!(field && field.multiple && (field.type === 'options' || isFileFieldType(field.type)));
        const queryRaw = String(this.dropdownSearchEl.value || '');
        const separator = String(this.config.multiSelectSeparator || ',');
        let filterRaw = queryRaw;
        let selectedTokens = [];
        if (isMultiSelectOptions) {
            const parts = separator
                ? queryRaw.split(separator)
                : [queryRaw];
            if (parts.length > 1) {
                filterRaw = parts[parts.length - 1];
                selectedTokens = dedupeMultiValues(parts.slice(0, -1));
            }
        }
        const query = filterRaw.trim().toLowerCase();
        const selectedNorm = new Set(selectedTokens.map((item) => normValue(item)));
        const currentRawValues = this.dropdownState.currentValue;
        const currentValues = Array.isArray(currentRawValues)
            ? currentRawValues
            : (currentRawValues === undefined || currentRawValues === null || currentRawValues === ''
                ? []
                : splitByMultiSeparator(currentRawValues, separator));
        if (isMultiValueDropdown) {
            currentValues.forEach((item) => selectedNorm.add(normValue(item)));
        }

        const dependencyFiltered = this.dropdownState.options.filter((option) =>
            this.isFieldValueDependencyAllowed(this.dropdownState.fieldKey, option.value, this.dropdownState.entryIndex).ok
        );
        let filtered = dependencyFiltered;
        if (query) {
            filtered = filtered.filter((option) =>
                option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query)
            );
        }

        const items = filtered.map((option) => {
            const colorStyle = option.color ? ` style="background:${escHtml(option.color)}"` : '';
            const selected = isMultiValueDropdown
                ? selectedNorm.has(normValue(option.value))
                : normValue(option.value) === normValue(this.dropdownState.currentValue);
            const active = this.dropdownState.activeOptionValue !== null
                && this.dropdownState.activeOptionValue !== undefined
                && normValue(option.value) === normValue(this.dropdownState.activeOptionValue);
            const usedCount = Number(option.usedCount || 0);
            const selectedCheckIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" focusable="false"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m7 17l-5-5m5 0l5 5L22 7m-10 5l5-5"/></svg>';
            let usedMeta = '';
            if (usedCount > 0) {
                const usedTitle = `Linked ${usedCount} time${usedCount === 1 ? '' : 's'}`;
                if (isFileFieldType(this.dropdownState.fieldType)) {
                    usedMeta = `
                        <span class="${c.dropdownMeta} ${c.dropdownUsedMeta}" title="${escHtml(usedTitle)}">
                            <span class="${c.dropdownUsedDot}" aria-hidden="true"></span>
                        </span>
                    `;
                } else {
                    usedMeta = `<span class="${c.dropdownMeta} ${c.dropdownCountMeta}" title="${escHtml(usedTitle)}">(${usedCount})</span>`;
                }
            }
            const showAttachmentPreview = this.config.showAttachmentDropdownPreview !== false;
            const leadingVisual = isFileFieldType(this.dropdownState.fieldType) && showAttachmentPreview
                ? (option.previewUrl
                    ? `<img class="${c.dropdownAttachmentPreview}" src="${escHtml(option.previewUrl)}" alt="" loading="lazy" aria-hidden="true" />`
                    : `<span class="${c.dropdownAttachmentIcon}" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="13 2 13 9 20 9"/></svg></span>`)
                : `<span class="${c.dropdownColor}"${colorStyle}></span>`;
            return `
                <button type="button" class="${c.dropdownOption}${active ? ` ${c.dropdownOptionActive}` : ''}" data-option-value="${escHtml(option.value)}">
                    ${leadingVisual}
                    <span class="qa-dropdown-label">${escHtml(option.label)}</span>
                    ${selected
                        ? `<span class="${c.dropdownMeta} qa-dropdown-selected-meta" aria-hidden="true">${selectedCheckIcon}</span>`
                        : usedMeta}
                </button>
            `;
        });

        const exactMatch = dependencyFiltered.some((option) =>
            option.value.toLowerCase() === query || option.label.toLowerCase() === query
        );

        const customAllowedByDependency = this.isFieldValueDependencyAllowed(
            this.dropdownState.fieldKey,
            filterRaw.trim(),
            this.dropdownState.entryIndex
        ).ok;

        if (this.dropdownState.allowCustom && !isFileFieldType(this.dropdownState.fieldType) && query && !exactMatch && customAllowedByDependency) {
            items.push(`
                <button type="button" class="${c.dropdownOption} ${c.dropdownAdd}" data-option-value="${escHtml(filterRaw.trim())}">
                    <span class="${c.dropdownColor}"></span>
                    <span class="qa-dropdown-label">Add "${escHtml(filterRaw.trim())}"</span>
                    <span class="${c.dropdownMeta}">custom</span>
                </button>
            `);
        }

        if (items.length === 0) {
            const dependencyBlocked = dependencyFiltered.length === 0;
            const msg = dependencyBlocked ? 'No options (constraints active)' : 'No options';
            this.dropdownListEl.innerHTML = `<div class="${c.dropdownMeta}" style="padding:8px 10px;">${escHtml(msg)}</div>`;
            this.dropdownState.filteredOptions = [];
            this.dropdownState.activeOptionValue = null;
            this.updateDropdownScrollIndicators();
            return;
        }

        this.dropdownState.filteredOptions = filtered.slice();
        const hasActive = this.dropdownState.activeOptionValue !== null
            && this.dropdownState.activeOptionValue !== undefined
            && filtered.some((option) => normValue(option.value) === normValue(this.dropdownState.activeOptionValue));
        if (!hasActive && this.dropdownState.activateFirstOnOpen) {
            const firstSelected = filtered.find((option) => selectedNorm.has(normValue(option.value)));
            this.dropdownState.activeOptionValue = (firstSelected || filtered[0] || {}).value || null;
            this.dropdownState.activateFirstOnOpen = false;
            return this.renderDropdownList();
        }
        if (!hasActive && !this.dropdownState.keepActiveWhenFiltering) {
            this.dropdownState.activeOptionValue = null;
        }
        this.dropdownState.keepActiveWhenFiltering = false;
        this.dropdownListEl.innerHTML = items.join('');
        this.updateDropdownScrollIndicators();
    };

    QuickAddComponent.prototype.updateDropdownScrollIndicators = function updateDropdownScrollIndicators() {
        if (!this.dropdownListEl) {
            return;
        }
        const listEl = this.dropdownListEl;
        const canScroll = listEl.scrollHeight > listEl.clientHeight + 1;
        const canScrollUp = canScroll && listEl.scrollTop > 1;
        const canScrollDown = canScroll && (listEl.scrollTop + listEl.clientHeight) < (listEl.scrollHeight - 1);
        if (this.dropdownFadeTopEl) {
            this.dropdownFadeTopEl.hidden = !canScrollUp;
        }
        if (this.dropdownFadeBottomEl) {
            this.dropdownFadeBottomEl.hidden = !canScrollDown;
        }
    };

    QuickAddComponent.prototype.scrollDropdownActiveOptionIntoView = function scrollDropdownActiveOptionIntoView() {
        if (!this.dropdownState || !this.dropdownListEl) {
            return;
        }
        const activeValue = this.dropdownState.activeOptionValue;
        if (activeValue === undefined || activeValue === null) {
            return;
        }
        const buttons = Array.from(this.dropdownListEl.querySelectorAll('[data-option-value]'));
        const match = buttons.find((btn) => normValue(btn.getAttribute('data-option-value')) === normValue(activeValue));
        if (match && typeof match.scrollIntoView === 'function') {
            match.scrollIntoView({ block: 'nearest' });
        }
    };

    QuickAddComponent.prototype.moveDropdownActiveOption = function moveDropdownActiveOption(direction) {
        if (!this.dropdownState) {
            return;
        }
        const filtered = Array.isArray(this.dropdownState.filteredOptions) ? this.dropdownState.filteredOptions : [];
        if (!filtered.length) {
            this.dropdownState.activeOptionValue = null;
            this.renderDropdownList();
            return;
        }
        const currentValue = this.dropdownState.activeOptionValue;
        let index = filtered.findIndex((option) => normValue(option.value) === normValue(currentValue));
        if (index === -1) {
            index = direction > 0 ? 0 : filtered.length - 1;
        } else {
            index = (index + direction + filtered.length) % filtered.length;
        }
        this.dropdownState.activeOptionValue = filtered[index].value;
        this.dropdownState.keepActiveWhenFiltering = true;
        this.renderDropdownList();
        this.scrollDropdownActiveOptionIntoView();
    };

    QuickAddComponent.prototype.replaceRange = function replaceRange(text, start, end, replacement) {
        return text.slice(0, start) + replacement + text.slice(end);
    };

    QuickAddComponent.prototype.applyDropdownSelection = function applyDropdownSelection(nextValue) {
        if (!this.dropdownState) {
            return;
        }
        const state = Object.assign({}, this.dropdownState);
        const field = this.getFieldDefinition(state.fieldKey);
        const isMultiSelectOptions = !!(field && field.type === 'options' && field.multiple);
        const selectedOption = (state.options || []).find((option) => normValue(option.value) === normValue(nextValue)) || null;
        const allowed = this.isFieldValueDependencyAllowed(
            state.fieldKey,
            nextValue,
            state.entryIndex
        );
        if (!allowed.ok) {
            return;
        }

        if (isFileFieldType(state.fieldType) && selectedOption && selectedOption.attachmentId) {
            const targetEntryKey = state.aiContext
                ? state.aiContext.entryId
                : state.entryKey;
            this.closeDropdown();
            this.linkAttachmentToEntryField(
                targetEntryKey,
                state.fieldKey,
                selectedOption.attachmentId,
                false,
                state.tokenId || '',
                state.sourceRegion || 'inline'
            );
            return;
        }

        if (state.aiContext) {
            const context = Object.assign({}, state.aiContext);
            if (!isMultiSelectOptions) {
                this.closeDropdown();
            }
            this.applyAIFieldSelection({
                entryId: context.entryId,
                fieldKey: context.fieldKey,
                currentValue: context.currentValue,
                occurrence: context.occurrence,
                mappingKey: context.mappingKey,
                entryIndex: state.entryIndex,
                nextValue,
                toggleSelection: isMultiSelectOptions,
                keepDropdownOpen: isMultiSelectOptions,
                sourceRegion: state.sourceRegion,
                anchorEl: state.anchorEl,
                anchorRect: state.anchorRect
            });
            return;
        }

        let token = this.tokenMap[state.tokenId];
        if (!token && state.sourceRegion === 'card') {
            const seedValue = String(
                state.currentValue !== undefined && state.currentValue !== null && state.currentValue !== ''
                    ? state.currentValue
                    : nextValue
            );
            token = this.materializeEntryFieldToken(state.entryIndex, state.fieldKey, seedValue, state.sourceRegion);
        }
        if (!token) {
            this.closeDropdown();
            return;
        }

        const source = this.inputText || this.readInputText();
        const separator = String(this.config.multiSelectSeparator || ',');
        const fromTyping = state.source === 'typing';
        let replacement = String(nextValue);
        let updated = source;
        let caret = token.globalValueStart + replacement.length;
        let keepOpen = false;

        if (isMultiSelectOptions) {
            keepOpen = true;
            let values;
            if (fromTyping) {
                const parts = separator ? String(token.value || '').split(separator) : [String(token.value || '')];
                values = parts.length > 1
                    ? parts.slice(0, -1).map((item) => item.trim()).filter(Boolean)
                    : splitByMultiSeparator(token.value || '', separator);
            } else {
                values = splitByMultiSeparator(state.currentValue || token.value || '', separator);
            }
            const selectedNorm = normValue(nextValue);
            const existingIndex = values.findIndex((item) => normValue(item) === selectedNorm);
            const didAdd = existingIndex === -1;
            if (didAdd) {
                values.push(String(nextValue));
            } else {
                values.splice(existingIndex, 1);
            }
            replacement = values.join(`${separator} `);
            if (fromTyping && didAdd && values.length > 0) {
                replacement = `${replacement}${separator} `;
            }
            caret = token.globalValueStart + replacement.length;
            updated = this.replaceRange(source, token.globalValueStart, token.globalValueEnd, replacement);
        } else {
            updated = this.replaceRange(source, token.globalValueStart, token.globalValueEnd, replacement);
        }

        const terminator = String(this.config.fieldTerminator || '');

        if (!token.committed && terminator) {
            const tokenTail = updated.slice(caret, caret + terminator.length);
            const shouldAppendTerminator = (
                tokenTail !== terminator
                && (fromTyping || this.config.fieldTerminatorMode === 'strict')
            );
            if (shouldAppendTerminator) {
                updated = this.replaceRange(updated, caret, caret, terminator);
                caret += terminator.length;
            }
            if (fromTyping) {
                const nextChar = updated.charAt(caret);
                if (nextChar !== '\n' && !/\s/.test(nextChar || '')) {
                    updated = this.replaceRange(updated, caret, caret, ' ');
                    caret += 1;
                }
            }
        }

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        const focusInput = state.sourceRegion !== 'card';
        if (!keepOpen) {
            this.closeDropdown();
        }
        this.parseAndRender({
            source: updated,
            caretOffset: caret,
            focusInput,
            skipTypingSync: state.sourceRegion === 'card'
        });

        if (keepOpen && state.sourceRegion === 'card') {
            const entry = (this.lastResult.entries || []).find((item) => item.index === state.entryIndex);
            const nextToken = entry
                ? (entry.tokens || []).filter((item) => item.kind === 'field' && item.key === state.fieldKey && item.committed).slice(-1)[0]
                : null;
            this.dropdownState = {
                fieldKey: state.fieldKey,
                fieldType: state.fieldType,
                tokenId: nextToken ? nextToken.id : state.tokenId,
                entryIndex: state.entryIndex,
                entryKey: state.entryKey,
                currentValue: replacement,
                allowCustom: !!state.allowCustom,
                options: Array.isArray(state.options) ? state.options.slice() : [],
                sourceRegion: 'card',
                anchorRect: state.anchorRect || (state.anchorEl && state.anchorEl.getBoundingClientRect ? state.anchorEl.getBoundingClientRect() : null),
                anchorEl: state.anchorEl || null,
                source: state.source,
                activeOptionValue: nextValue,
                filteredOptions: [],
                activateFirstOnOpen: false,
                keepActiveWhenFiltering: false
            };
            this.dropdownSearchEl.hidden = false;
            this.dropdownSearchEl.value = '';
            this.renderDropdownList();
            this.positionDropdown(state.anchorEl);
            this.dropdownEl.hidden = false;
            this.dropdownEl.classList.add(this.config.classNames.dropdownOpen);
            this.scrollDropdownActiveOptionIntoView();
            this.dropdownSearchEl.focus();
        }
    };

    QuickAddComponent.prototype.applyAIFieldSelection = function applyAIFieldSelection(options) {
        if (!this.isAiMode() || !options) {
            return;
        }
        const entryId = String(options.entryId || '');
        const fieldKey = String(options.fieldKey || '');
        if (!entryId || !fieldKey) {
            return;
        }
        const entry = (this.aiState.entries || []).find((item) => item && item._id === entryId);
        const field = this.getFieldDefinition(fieldKey);
        if (!entry || !field) {
            return;
        }

        const nextRaw = options.nextValue;
        const normalizedNextValue = field.type === 'number'
            ? Number(nextRaw)
            : String(nextRaw === undefined || nextRaw === null ? '' : nextRaw);
        if (field.type === 'number' && !Number.isFinite(normalizedNextValue)) {
            return;
        }

        const occurrence = Math.max(0, Number.isFinite(Number(options.occurrence)) ? Number(options.occurrence) : 0);
        const currentValue = options.currentValue;
        const mappingKey = String(
            options.mappingKey
            || this.buildAIInlineMappingKey(entryId, fieldKey, currentValue, occurrence)
        );
        const mapping = this.aiInlineMarkIndex[mappingKey] || null;
        const sourceRegion = options.sourceRegion === 'card' ? 'card' : 'inline';
        const keepDropdownOpen = options.keepDropdownOpen === true;
        const toggleSelection = options.toggleSelection === true;
        const separator = String(this.config.multiSelectSeparator || ',');

        if (field.multiple) {
            const sourceValues = Array.isArray(entry[fieldKey])
                ? entry[fieldKey].slice()
                : (entry[fieldKey] === undefined || entry[fieldKey] === null || entry[fieldKey] === ''
                    ? []
                    : [entry[fieldKey]]);
            if (toggleSelection && field.type === 'options') {
                const idx = sourceValues.findIndex((item) => normValue(item) === normValue(normalizedNextValue));
                if (idx === -1) {
                    sourceValues.push(normalizedNextValue);
                } else {
                    sourceValues.splice(idx, 1);
                }
            } else {
                if (sourceValues.length <= occurrence) {
                    while (sourceValues.length < occurrence) {
                        sourceValues.push('');
                    }
                    sourceValues.push(normalizedNextValue);
                } else {
                    sourceValues[occurrence] = normalizedNextValue;
                }
            }
            entry[fieldKey] = sourceValues.filter((item) => item !== undefined && item !== null && item !== '');
        } else {
            entry[fieldKey] = normalizedNextValue;
        }

        this.aiState.editedEntries.add(entryId);
        this.aiState.error = '';
        this.aiState.errorKind = '';

        const source = this.inputText || this.readInputText();
        const fallbackRange = (!mapping && sourceRegion === 'card')
            ? this.findAIInlineFallbackRange(entry, fieldKey, occurrence, currentValue, source)
            : null;
        let nextSource = source;
        let caretOffset = null;
        const mappingStart = mapping ? Number(mapping.start) : NaN;
        const mappingEnd = mapping ? Number(mapping.end) : NaN;
        const fallbackStart = fallbackRange ? Number(fallbackRange.start) : NaN;
        const fallbackEnd = fallbackRange ? Number(fallbackRange.end) : NaN;
        const hasMappingRange = Number.isFinite(mappingStart)
            && Number.isFinite(mappingEnd)
            && mappingEnd > mappingStart;
        const hasFallbackRange = Number.isFinite(fallbackStart)
            && Number.isFinite(fallbackEnd)
            && fallbackEnd > fallbackStart;
        const syncStart = hasMappingRange ? mappingStart : fallbackStart;
        const syncEnd = hasMappingRange ? mappingEnd : fallbackEnd;
        const hasSyncRange = Number.isFinite(syncStart)
            && Number.isFinite(syncEnd)
            && syncEnd > syncStart;
        const currentChunk = hasSyncRange ? source.slice(syncStart, syncEnd) : '';
        const currentValueText = currentValue === undefined || currentValue === null ? '' : String(currentValue);
        const mappingValueText = mapping && mapping.value !== undefined && mapping.value !== null
            ? (Array.isArray(mapping.value) ? mapping.value.join(`${separator} `) : String(mapping.value))
            : (
                fallbackRange && fallbackRange.value !== undefined && fallbackRange.value !== null
                    ? String(fallbackRange.value)
                    : ''
            );
        const canSyncCardDirectMatch = sourceRegion === 'card'
            && hasSyncRange
            && (
                normValue(currentChunk) === normValue(currentValueText)
                || normValue(currentChunk) === normValue(mappingValueText)
            );
        const shouldSyncInlineSource = hasSyncRange
            && (sourceRegion !== 'card' || canSyncCardDirectMatch);
        if (shouldSyncInlineSource) {
            const replacementText = String(normalizedNextValue);
            nextSource = this.replaceRange(source, syncStart, syncEnd, replacementText);
            if (sourceRegion !== 'card') {
                caretOffset = syncStart + replacementText.length;
            }
            if (Array.isArray(entry.spans) && (hasMappingRange || (hasFallbackRange && fallbackRange && fallbackRange.fromSpan === true))) {
                const delta = replacementText.length - (syncEnd - syncStart);
                const expectedOccurrence = Math.max(0, Number.isFinite(Number(occurrence)) ? Number(occurrence) : 0);
                let fieldOccurrence = 0;
                let updatedCurrent = false;
                entry.spans = entry.spans.map((span) => {
                    const start = Number(span && span.start);
                    const end = Number(span && span.end);
                    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
                        return span;
                    }
                    const spanField = String(span.field || '');
                    const isTargetField = spanField === fieldKey;
                    let nextSpan = span;
                    const isDirectMatch = isTargetField && start === syncStart && end === syncEnd;
                    const isOccurrenceMatch = isTargetField && !updatedCurrent && fieldOccurrence === expectedOccurrence && (start <= syncStart && end >= syncEnd);
                    if (!updatedCurrent && (isDirectMatch || isOccurrenceMatch)) {
                        updatedCurrent = true;
                        nextSpan = Object.assign({}, span, {
                            start,
                            end: start + replacementText.length,
                            value: normalizedNextValue
                        });
                    } else if (start >= syncEnd && delta !== 0) {
                        nextSpan = Object.assign({}, span, { start: start + delta, end: end + delta });
                    }
                    if (isTargetField) {
                        fieldOccurrence += 1;
                    }
                    return nextSpan;
                });
                if (Number.isFinite(Number(entry._sourceEnd))) {
                    entry._sourceEnd = Number(entry._sourceEnd) + delta;
                }
            }
            this.aiState.lastParsedInput = nextSource;
            this.aiState.lastAttemptedInput = nextSource;
        }

        const renderOptions = {
            source: nextSource,
            skipTypingSync: sourceRegion === 'card'
        };
        if (sourceRegion === 'card') {
            renderOptions.focusInput = false;
        }
        if (typeof caretOffset === 'number') {
            renderOptions.caretOffset = caretOffset;
            renderOptions.focusInput = sourceRegion !== 'card';
        }
        this.parseAndRender(renderOptions);

        if (keepDropdownOpen && sourceRegion === 'card' && field.type === 'options') {
            this.dropdownState = {
                fieldKey,
                fieldType: field.type,
                tokenId: '',
                entryIndex: Number.isFinite(Number(options.entryIndex)) ? Number(options.entryIndex) : 0,
                entryKey: entryId,
                currentValue: Array.isArray(entry[fieldKey])
                    ? entry[fieldKey].join(`${separator} `)
                    : String(entry[fieldKey] || ''),
                allowCustom: !!field.allowCustom,
                options: this.getDropdownOptionsForField(field, entryId, fieldKey),
                sourceRegion: 'card',
                anchorRect: options.anchorRect || (options.anchorEl && options.anchorEl.getBoundingClientRect ? options.anchorEl.getBoundingClientRect() : null),
                anchorEl: options.anchorEl || null,
                source: 'click',
                aiContext: {
                    entryId,
                    fieldKey,
                    currentValue: options.currentValue,
                    occurrence,
                    mappingKey,
                    sourceRegion: 'card'
                },
                activeOptionValue: normalizedNextValue,
                filteredOptions: [],
                activateFirstOnOpen: false,
                keepActiveWhenFiltering: false
            };
            this.dropdownSearchEl.hidden = false;
            this.dropdownSearchEl.value = '';
            this.renderDropdownList();
            this.positionDropdown(options.anchorEl);
            this.dropdownEl.hidden = false;
            this.dropdownEl.classList.add(this.config.classNames.dropdownOpen);
            this.scrollDropdownActiveOptionIntoView();
            this.dropdownSearchEl.focus();
        }
    };

    QuickAddComponent.prototype.closeDropdown = function closeDropdown() {
        this.dropdownState = null;
        if (!this.dropdownEl) {
            return;
        }
        this.dropdownEl.hidden = true;
        this.dropdownEl.classList.remove(this.config.classNames.dropdownOpen);
        this.dropdownListEl.innerHTML = '';
        this.dropdownSearchEl.hidden = false;
        this.dropdownSearchEl.value = '';
        this.dropdownEl.style.removeProperty('maxHeight');
        this.dropdownListEl.style.removeProperty('maxHeight');
        this.dropdownListEl.style.removeProperty('minHeight');
        if (this.dropdownFadeTopEl) {
            this.dropdownFadeTopEl.hidden = true;
        }
        if (this.dropdownFadeBottomEl) {
            this.dropdownFadeBottomEl.hidden = true;
        }
        this.dropdownListEl.scrollTop = 0;
    };

    QuickAddComponent.prototype.dismissSelection = function dismissSelection(dismissKey) {
        if (!dismissKey) {
            return;
        }
        this.dismissedSelections.add(dismissKey);
        this.closeDropdown();
        this.parseAndRender({ skipCaretPreserve: true });
    };

    QuickAddComponent.prototype.setInput = function setInput(text) {
        this.inputText = text || '';
        this.dismissedSelections.clear();
        this.closeAttachmentSourceMenu();
        this.closeConflictModal();
        this.closeDropdown();
        this.closeNumberPicker();
        this.closeBlockedInfo();
        this.parseAndRender({
            source: this.inputText,
            caretOffset: this.inputText.length,
            focusInput: false,
            skipTypingSync: true
        });
    };

    QuickAddComponent.prototype.getResult = function getResult() {
        if (this.isAiMode()) {
            this.inputText = this.readInputText();
            this.lastResult = this.syncEntryAttachmentMeta(this.buildAIResult());
            const parseState = this.lastResult && this.lastResult.parseState
                ? this.lastResult.parseState
                : null;
            if (parseState && parseState.shouldParse && !parseState.isOffline && !this.aiState.isProcessing) {
                this.parseAI();
                this.lastResult = this.syncEntryAttachmentMeta(this.buildAIResult());
            }
        }
        return this.lastResult;
    };

    QuickAddComponent.prototype.updateConfig = function updateConfig(nextConfig) {
        const wasAiMode = this.isAiMode();
        const previousVerification = Object.assign({}, this.aiVerificationState);
        this.config = mergeConfig(Object.assign({}, this.config, nextConfig || {}));
        if (this.isAiMode()) {
            const nextSignature = this.buildAiRuntimeSignature();
            const keepVerified = previousVerification.status === 'verified'
                && previousVerification.signature
                && previousVerification.signature === nextSignature;
            if (!keepVerified) {
                this.resetAiVerification('AI settings updated.');
            } else {
                this.aiVerificationState = Object.assign({}, previousVerification);
            }
        }
        this.normalizedSchema = normalizeSchema(this.config.schema, this.config.fallbackField);
        const isAiModeNow = this.isAiMode();

        if (!isAiModeNow) {
            this.clearAIEntries();
        } else if (!wasAiMode && isAiModeNow) {
            this.clearAIEntries();
        }

        this.closeDropdown();
        this.closeAttachmentSourceMenu();
        this.closeConflictModal();
        this.closeBlockedInfo();
        this.closeDatePicker();
        this.closeNumberPicker();
        this.unbindEvents();
        this.renderShell();
        this.applyTokens();
        this.applyInputSizing();
        this.bindEvents();
        this.parseAndRender();
    };

    QuickAddComponent.prototype.destroy = function destroy() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.timer = null;
        (this.attachmentPool || []).forEach((item) => {
            if (item && item.previewUrl) {
                URL.revokeObjectURL(item.previewUrl);
            }
        });
        this.attachmentPool = [];
        this.unbindEvents();
        this.closeBlockedInfo();
        this.closeDatePicker();
        this.closeNumberPicker();
        this.closeDropdown();
        this.closeAttachmentSourceMenu();
        this.closeConflictModal();

        this.mountEl.innerHTML = '';
    };

    const quickAddApi = {
        create: function create(config) {
            return new QuickAddComponent(config);
        },
        parse: parseInput
    };
    global.QuickAdd = quickAddApi;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = quickAddApi;
        module.exports.default = quickAddApi;
    }
    if (typeof define === 'function' && define.amd) {
        define(function defineQuickAdd() {
            return quickAddApi;
        });
    }
})(typeof globalThis !== 'undefined'
    ? globalThis
    : (typeof self !== 'undefined'
        ? self
        : (typeof window !== 'undefined' ? window : this)));
