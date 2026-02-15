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
        attachmentList: 'qa-attachment-list',
        attachmentItem: 'qa-attachment-item',
        attachmentOpen: 'qa-attachment-open',
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
        output: 'qa-output',
        dropdown: 'qa-dropdown',
        dropdownOpen: 'qa-dropdown-open',
        dropdownSearch: 'qa-dropdown-search',
        dropdownList: 'qa-dropdown-list',
        dropdownOption: 'qa-dropdown-option',
        dropdownAdd: 'qa-dropdown-add',
        dropdownColor: 'qa-dropdown-color',
        dropdownMeta: 'qa-dropdown-meta',
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
        blockedInfo: 'qa-blocked-info',
        blockedInfoAnchored: 'qa-blocked-info-anchored',
        blockedInfoAnchorBelowStart: 'qa-blocked-info-anchor-below-start',
        blockedInfoAnchorBelowEnd: 'qa-blocked-info-anchor-below-end',
        blockedInfoAnchorAboveStart: 'qa-blocked-info-anchor-above-start',
        blockedInfoAnchorAboveEnd: 'qa-blocked-info-anchor-above-end',
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
        buildPrompt: null,
        parseResponse: null,
        inlinePillHarness: null,
        mockResponse: null,
        mockLatencyMs: 0,
        experimental: {}
    };

    const DEFAULT_AI_EXPERIMENTAL_CONFIG = {
        inlinePills: false
    };

    const DEFAULT_CONFIG = {
        mount: null,
        mode: 'deterministic', // deterministic | ai
        debounceMs: 300,
        allowMultipleEntries: true,
        entrySeparator: '\n',
        fieldTerminator: ';;',
        fieldTerminatorMode: 'strict', // strict | or-next-prefix | or-end
        escapeChar: '\\',
        fallbackField: 'title',
        showJsonOutput: true,
        showInlinePills: true,
        showEntryCards: true,
        showEntryHeader: true,
        showEntryPills: true,
        inputHeightMode: 'grow',
        inputMaxHeight: null,
        allowEntryAttachments: false,
        allowMultipleAttachments: true,
        allowedAttachmentTypes: [],
        attachmentSources: null,
        autoDetectOptionsWithoutPrefix: false,
        reduceInferredOptions: true,
        inferredMatchMode: 'exact', // exact | fuzzy
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
                // Keep fallback href.
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
        merged.ai.experimental = Object.assign({}, DEFAULT_AI_EXPERIMENTAL_CONFIG, merged.ai.experimental || {});
        merged.classNames = Object.assign({}, DEFAULT_CLASSNAMES, merged.classNames || {});
        if (typeof merged.allowedAttachmentTypes === 'string') {
            merged.allowedAttachmentTypes = merged.allowedAttachmentTypes
                .split(',')
                .map((part) => part.trim())
                .filter(Boolean);
        } else if (!Array.isArray(merged.allowedAttachmentTypes)) {
            merged.allowedAttachmentTypes = [];
        }
        merged.attachmentSources = normalizeAttachmentSources(merged.attachmentSources);
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
                dependsOn: option.dependsOn !== undefined ? option.dependsOn : option.dependencies,
                constraints: option.constraints !== undefined ? option.constraints : option.constraint
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
            type: 'string', // string | number | options | date | datetime | boolean
            enum: [],
            options: [],
            required: false,
            multiple: false,
            naturalDate: false,
            allowDateOnly: true,
            autoToday: false,
            defaultTime: DEFAULT_DATETIME_TIME,
            timeFormat: '24h',
            color: null,
            autoDetectWithoutPrefix: false,
            reduceInferredOptions: undefined,
            allowCustom: undefined,
            exhaustive: undefined,
            dependsOn: undefined,
            constraints: undefined
        }, field || {});

        if (normalized.type === 'enum') {
            normalized.type = 'options';
        }

        if (typeof normalized.exhaustive === 'boolean' && typeof normalized.allowCustom !== 'boolean') {
            normalized.allowCustom = !normalized.exhaustive;
        }

        if (typeof normalized.allowCustom !== 'boolean') {
            normalized.allowCustom = false;
        }

        if (typeof normalized.allowDateOnly !== 'boolean') {
            normalized.allowDateOnly = true;
        }

        if (typeof normalized.autoToday !== 'boolean') {
            normalized.autoToday = false;
        }

        normalized.defaultTime = normalizeTime24(normalized.defaultTime, DEFAULT_DATETIME_TIME);
        normalized.timeFormat = String(normalized.timeFormat || '24h').toLowerCase() === 'ampm' ? 'ampm' : '24h';

        return normalized;
    }

    function getFieldOptions(field) {
        const source = Array.isArray(field.options) && field.options.length > 0
            ? field.options
            : (Array.isArray(field.enum) ? field.enum : []);
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
            // If impossible as day/month, flip to month/day. If both are valid, prefer day/month.
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

        // Preserve explicit YYYY-MM-DD values exactly; avoid timezone shifts from natural parsers.
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

    function parseByType(field, rawValue) {
        const value = String(rawValue).trim();

        if (field.type === 'string') {
            return { ok: true, value };
        }

        if (field.type === 'number') {
            const parsed = Number(value);
            if (Number.isNaN(parsed)) {
                return { ok: false, error: `Invalid number for ${field.key}` };
            }
            return { ok: true, value: parsed };
        }

        if (field.type === 'options') {
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

        return { ok: true, value };
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
        const fieldRule = field.dependsOn !== undefined ? field.dependsOn : field.dependencies;
        const fieldRuleResult = evaluateRuleSet(fieldRule, fields, context);
        if (!fieldRuleResult.ok) {
            return fieldRuleResult;
        }
        const selfConstraints = field.constraints !== undefined ? field.constraints : field.constraint;
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
            const optionConstraints = option && option.constraints !== undefined ? option.constraints : (option ? option.constraint : null);
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

    function applyDependencyConstraints(entry, normalizedSchema) {
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
            const parsed = parseByType(field, token.value);
            if (!parsed.ok) {
                return;
            }
            const allowed = evaluateFieldDependency(field, parsed.value, entry.fields);
            if (allowed.ok) {
                return;
            }
            removeFieldValueFromFields(entry.fields, field, token.key, parsed.value);
            entry.blocked.push({
                id: `blk_${entry.index}_${blockedCount++}`,
                fieldKey: token.key,
                value: parsed.value,
                source: 'explicit',
                tokenId: token.id,
                reason: allowed.reason,
                globalStart: token.globalStart,
                globalEnd: token.globalEnd
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

        // For single-value fields, keep the latest valid explicit token.
        // If the last explicit token was blocked, this restores the previous valid one.
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
                const parsed = parseByType(field, token.value);
                if (!parsed.ok) {
                    continue;
                }
                const trialFields = Object.assign({}, entry.fields, { [fieldKey]: parsed.value });
                const allowed = evaluateFieldDependency(field, parsed.value, trialFields);
                if (!allowed.ok) {
                    continue;
                }
                entry.fields[fieldKey] = parsed.value;
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
            fields[key].push(value);
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

            const parsed = parseByType(field, cleanValue);
            if (!parsed.ok) {
                errors.push(parsed.error);
                continue;
            }

            appendFieldValue(fields, field, fieldKey, parsed.value);
            if (!explicitValues[fieldKey]) {
                explicitValues[fieldKey] = [];
            }
            explicitValues[fieldKey].push(parsed.value);
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
                    const parsed = parseByType(field, candidate.value);
                    if (!parsed.ok) {
                        return;
                    }
                    appendFieldValue(fields, field, field.key, parsed.value);
                    inferred.push({
                        id: `inf|${entryIndex}|${field.key}|${normValue(parsed.value)}`,
                        fieldKey: field.key,
                        value: parsed.value,
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

            // Single-value fields: reduced => last mention, not reduced => first mention.
            const chosen = reduceInferred ? candidates[candidates.length - 1] : candidates[0];
            const parsed = parseByType(field, chosen.value);
            if (!parsed.ok) {
                return;
            }
            appendFieldValue(fields, field, field.key, parsed.value);
            inferred.push({
                id: `inf|${entryIndex}|${field.key}|${normValue(parsed.value)}`,
                fieldKey: field.key,
                value: parsed.value,
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
            if (!field.autoToday) {
                return;
            }
            if (fields[field.key] !== undefined) {
                return;
            }
            if (field.type !== 'date' && field.type !== 'datetime') {
                return;
            }

            const now = new Date();
            let val = '';
            if (field.type === 'date') {
                val = toYMD(now);
            } else {
                val = `${toYMD(now)}T${normalizeTime24(field.defaultTime, DEFAULT_DATETIME_TIME)}`;
            }

            appendFieldValue(fields, field, field.key, val);
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

        applyDependencyConstraints(entry, normalizedSchema);
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
                fieldTerminatorMode: config.fieldTerminatorMode
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

    function resolveMount(mount) {
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
            entries: [],
            editedEntries: new Set(),
            deletedEntries: new Set(),
            editingEntryId: '',
            warnings: [],
            missing: [],
            error: '',
            providerRawResponse: ''
        };
        this.aiQueueMemory = [];
        this.lastResult = this.config.mode === 'ai'
            ? this.buildAIResult()
            : parseInput('', this.config);
        this.tokenMap = {};
        this.dismissedSelections = new Set();
        this.attachmentsByEntry = new Map();
        this.attachmentCounter = 0;
        this.dropdownState = null;
        this.datePickerState = null;
        this.datePickerSuppressUntil = 0;
        this.datePickerInternalClickUntil = 0;
        this.blockedInfoState = null;
        this.blockedAnchorEl = null;
        this.anchorSupportChecked = false;
        this.anchorSupported = false;
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
        this.parseAndRender();
    }

    QuickAddComponent.prototype.defaultHintText = function defaultHintText() {
        if (this.isAiMode()) {
            const autoParse = this.config.ai.autoParse !== false;
            return autoParse
                ? 'AI mode: type natural language and pause to extract structured entries.'
                : 'AI mode: auto-parse off. Click Parse Now to run extraction.';
        }
        const separator = this.config.entrySeparator === '\n' ? 'newline' : this.config.entrySeparator;
        return `Field terminator: "${this.config.fieldTerminator}" | Entry separator: "${separator}"`;
    };

    QuickAddComponent.prototype.isAiMode = function isAiMode() {
        return this.config.mode === 'ai' && !!(this.config.ai && this.config.ai.enabled);
    };

    QuickAddComponent.prototype.isAIInlinePillsEnabled = function isAIInlinePillsEnabled() {
        if (!this.isAiMode()) {
            return false;
        }
        return this.config.showInlinePills !== false
            && !!(this.config.ai
                && (
                    this.config.ai.inlinePills
                    || (this.config.ai.experimental && this.config.ai.experimental.inlinePills)
                ));
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
        return [
            String(ai.provider || ''),
            String(ai.apiKey || ''),
            String(ai.model || ''),
            String(ai.endpoint || ''),
            ai.mockResponse === null ? 'live' : 'mock'
        ].join('|');
    };

    QuickAddComponent.prototype.verifyAiRuntime = async function verifyAiRuntime() {
        if (!this.isAiMode()) {
            return { ok: false, message: 'AI mode is not enabled.' };
        }
        const input = String(this.inputText || this.readInputText() || '').trim();
        if (!input) {
            this.aiVerificationState = { status: 'error', message: 'Enter text before verifying.', signature: '' };
            this.parseAndRender({ source: this.inputText, preserveSelection: true });
            return { ok: false, message: 'Enter text before verifying.' };
        }
        const minInputLength = Math.max(0, Number(this.config.ai.minInputLength || 0));
        if (input.length < minInputLength) {
            const message = `Add at least ${minInputLength} characters to verify.`;
            this.aiVerificationState = { status: 'error', message, signature: '' };
            this.parseAndRender({ source: this.inputText, preserveSelection: true });
            return { ok: false, message };
        }

        this.aiVerificationState = { status: 'verifying', message: 'Verifying AI connection…', signature: '' };
        this.parseAndRender({ source: this.inputText, preserveSelection: true });
        try {
            await this.extractAIFromInput(input);
            this.aiVerificationState = {
                status: 'verified',
                message: 'Verified. AI connection is working.',
                signature: this.buildAiRuntimeSignature()
            };
            this.parseAndRender({ source: this.inputText, preserveSelection: true });
            return { ok: true, message: 'Verified.' };
        } catch (err) {
            const message = err && err.message ? err.message : 'Verification failed.';
            this.aiVerificationState = { status: 'error', message, signature: '' };
            this.parseAndRender({ source: this.inputText, preserveSelection: true });
            return { ok: false, message };
        }
    };

    QuickAddComponent.prototype.normalizeAIAttachmentRefs = function normalizeAIAttachmentRefs(raw) {
        if (raw === undefined || raw === null || raw === '') return [];
        if (Array.isArray(raw)) {
            return raw.map((item) => String(item || '').trim()).filter(Boolean);
        }
        return String(raw).split(/[,\n]+/).map((item) => item.trim()).filter(Boolean);
    };

    QuickAddComponent.prototype.makeAIEntryId = function makeAIEntryId(seed) {
        const chunk = String(seed || Date.now());
        return `ai_${Date.now()}_${chunk}_${Math.random().toString(36).slice(2, 8)}`;
    };

    QuickAddComponent.prototype.normalizeAIEntry = function normalizeAIEntry(entry, idx, keepId) {
        const source = entry && typeof entry === 'object' ? entry : {};
        const normalized = Object.assign({}, source);
        normalized._id = keepId || source._id || this.makeAIEntryId(idx);

        if (source.status !== undefined) {
            normalized.status = this.normalizeAIStatus(source.status);
        }
        if (source.attachments !== undefined || source.attachmentRefs !== undefined) {
            normalized.attachments = this.normalizeAIAttachmentRefs(source.attachments || source.attachmentRefs);
        }
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
                // Try next candidate.
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
        return (
            data.choices?.[0]?.message?.content
            || data.content?.[0]?.text
            || data.candidates?.[0]?.content?.parts?.[0]?.text
            || data.output_text
            || ''
        );
    };

    QuickAddComponent.prototype.buildAIPrompt = async function buildAIPrompt(input) {
        if (typeof this.config.ai.buildPrompt === 'function') {
            return this.config.ai.buildPrompt(input, this.config, this);
        }
        const fields = (this.normalizedSchema && Array.isArray(this.normalizedSchema.fields))
            ? this.normalizedSchema.fields
            : [];
        const schemaKeys = fields
            .map((field) => field && field.key)
            .filter(Boolean);
        const schemaHint = schemaKeys.join(', ');
        const system = this.config.ai.systemPrompt
            ? `${this.config.ai.systemPrompt}\n\n`
            : '';
        const now = new Date();
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        const separatorHint = this.isAISeparatorAwareEnabled()
            ? `\nInput may be one segment split by entrySeparator from a larger note. Parse only this segment independently.`
            : '';
        const spanHint = this.isAIInlinePillsEnabled() && schemaKeys.length
            ? `\nIf possible include \`spans\` per entry (0-based offsets relative to this input segment): [{"field":"${schemaKeys[0]}","value":"example","start":3,"end":7}].`
            : '';
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
            `- Put ambiguity/assumptions in "warnings"${separatorHint}${spanHint}\n` +
            `Input:\n${String(input || '')}`;
    };

    QuickAddComponent.prototype.callOpenAI = async function callOpenAI(apiKey, model, prompt) {
        const forceJson = this.config.ai.forceJson !== false;
        const payload = {
            model: model || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'Return only valid JSON object output.' },
                { role: 'user', content: prompt }
            ],
            temperature: Number(this.config.ai.temperature || 0.3)
        };
        if (forceJson) {
            payload.response_format = { type: 'json_object' };
        }
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `OpenAI API error: ${res.status}`);
        }
        const data = await res.json();
        return this.getAIResponseText(data);
    };

    QuickAddComponent.prototype.callAnthropic = async function callAnthropic(apiKey, model, prompt) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'claude-3-haiku-20240307',
                max_tokens: 2048,
                system: 'Return one valid JSON object only. No markdown.',
                messages: [{ role: 'user', content: prompt }]
            })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `Anthropic API error: ${res.status}`);
        }
        const data = await res.json();
        return this.getAIResponseText(data);
    };

    QuickAddComponent.prototype.callGoogle = async function callGoogle(apiKey, model, prompt) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || 'gemini-1.5-flash')}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const forceJson = this.config.ai.forceJson !== false;
        const generationConfig = { temperature: Number(this.config.ai.temperature || 0.3) };
        if (forceJson) {
            generationConfig.responseMimeType = 'application/json';
        }
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig
            })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `Google API error: ${res.status}`);
        }
        const data = await res.json();
        return this.getAIResponseText(data);
    };

    QuickAddComponent.prototype.callCustom = async function callCustom(endpoint, apiKey, model, prompt) {
        const forceJson = this.config.ai.forceJson !== false;
        const payload = {
            model: model || 'default',
            messages: [
                { role: 'system', content: 'Return only valid JSON object output.' },
                { role: 'user', content: prompt }
            ],
            temperature: Number(this.config.ai.temperature || 0.3)
        };
        if (forceJson) {
            payload.response_format = { type: 'json_object' };
        }
        const res = await fetch(endpoint, {
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
        return this.getAIResponseText(data);
    };

    QuickAddComponent.prototype.callAIProvider = async function callAIProvider(input) {
        const ai = this.config.ai || {};
        const text = String(input || '').trim();
        if (!text) {
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
            if (typeof customResponse === 'string' || (customResponse && typeof customResponse === 'object')) {
                return this.parseAIResponse(customResponse);
            }
            return this.normalizeAIResponse(customResponse);
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

        let responseText = '';
        if (provider === 'openai') {
            responseText = await this.callOpenAI(apiKey, model, prompt);
        } else if (provider === 'anthropic') {
            responseText = await this.callAnthropic(apiKey, model, prompt);
        } else if (provider === 'google') {
            responseText = await this.callGoogle(apiKey, model, prompt);
        } else if (provider === 'custom') {
            responseText = await this.callCustom(endpoint, apiKey, model, prompt);
        } else {
            throw new Error(`Unknown AI provider: ${provider}`);
        }

        this.aiState.providerRawResponse = String(responseText || '');
        return this.parseAIResponse(responseText);
    };

    QuickAddComponent.prototype.getAIQueueStorageKey = function getAIQueueStorageKey() {
        const custom = String((this.config.ai && this.config.ai.queueStorageKey) || '').trim();
        if (custom) {
            return custom;
        }
        const mountId = this.mountEl && this.mountEl.id ? this.mountEl.id : 'quickadd';
        return `quickadd_ai_queue_${mountId}`;
    };

    QuickAddComponent.prototype.readAIQueue = function readAIQueue() {
        const key = this.getAIQueueStorageKey();
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const raw = window.localStorage.getItem(key);
                if (!raw) return [];
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            }
        } catch (err) {
            // Fallback to in-memory queue.
        }
        return Array.isArray(this.aiQueueMemory) ? this.aiQueueMemory.slice() : [];
    };

    QuickAddComponent.prototype.writeAIQueue = function writeAIQueue(items) {
        const normalized = Array.isArray(items) ? items : [];
        const key = this.getAIQueueStorageKey();
        this.aiQueueMemory = normalized.slice();
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(key, JSON.stringify(normalized));
            }
        } catch (err) {
            // Keep in-memory value only.
        }
    };

    QuickAddComponent.prototype.getAIPendingQueueCount = function getAIPendingQueueCount() {
        return this.readAIQueue().filter((item) => item && item.status === 'pending').length;
    };

    QuickAddComponent.prototype.enqueueAIInput = function enqueueAIInput(text) {
        const value = String(text || '').trim();
        if (!value) {
            return false;
        }
        const queue = this.readAIQueue();
        const exists = queue.some((item) => item && item.status === 'pending' && String(item.text || '').trim() === value);
        if (exists) {
            return false;
        }
        queue.push({
            id: this.makeAIEntryId('queue'),
            text: value,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        this.writeAIQueue(queue);
        return true;
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
        return /network|offline|failed to fetch|econnrefused/i.test(msg);
    };

    QuickAddComponent.prototype.applyAIParseResult = function applyAIParseResult(result) {
        const normalized = this.normalizeAIResponse(result);
        this.aiState.warnings = normalized.warnings;
        this.aiState.missing = normalized.missing;
        this.aiState.error = '';
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
        const currentInput = String(this.inputText || this.readInputText() || '').trim();
        const opts = options || {};
        const input = currentInput;
        const minInputLength = Math.max(0, Number(this.config.ai.minInputLength || 0));
        if (!input || (!opts.force && input.length < minInputLength)) {
            return;
        }

        const requestId = ++this.aiState.requestSeq;
        this.aiState.activeRequestSeq = requestId;
        this.aiState.isProcessing = true;
        this.aiState.error = '';
        this.parseAndRender({ source: this.inputText, preserveSelection: true });

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
            if (this.isLikelyNetworkError(err)) {
                this.enqueueAIInput(input);
            }
        } finally {
            if (requestId === this.aiState.requestSeq) {
                this.aiState.isProcessing = false;
            }
            this.parseAndRender({ source: this.inputText, preserveSelection: true });
        }
    };

    QuickAddComponent.prototype.queueCurrentInputForAI = function queueCurrentInputForAI() {
        if (!this.isAiMode()) {
            return false;
        }
        const queued = this.enqueueAIInput(this.inputText || this.readInputText());
        this.parseAndRender({ source: this.inputText, preserveSelection: true });
        return queued;
    };

    QuickAddComponent.prototype.processAIQueue = async function processAIQueue() {
        if (!this.isAiMode()) {
            return { processed: 0, failed: 0 };
        }
        const queue = this.readAIQueue();
        const pending = queue.filter((item) => item && item.status === 'pending');
        if (!pending.length) {
            return { processed: 0, failed: 0 };
        }
        if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
            this.aiState.error = 'Cannot process queue while offline.';
            this.parseAndRender({ source: this.inputText, preserveSelection: true });
            return { processed: 0, failed: pending.length };
        }

        this.aiState.isProcessing = true;
        this.aiState.error = '';
        this.parseAndRender({ source: this.inputText, preserveSelection: true });

        let processed = 0;
        let failed = 0;
        const nextQueue = queue.slice();

        for (let i = 0; i < nextQueue.length; i++) {
            const item = nextQueue[i];
            if (!item || item.status !== 'pending') {
                continue;
            }
            try {
                const result = await this.extractAIFromInput(item.text || '');
                this.applyAIParseResult(result);
                processed += 1;
                nextQueue[i] = Object.assign({}, item, { status: 'completed', processedAt: new Date().toISOString() });
            } catch (err) {
                failed += 1;
                nextQueue[i] = Object.assign({}, item, {
                    status: 'pending',
                    error: err && err.message ? err.message : String(err || 'Queue item failed')
                });
                if (this.isLikelyNetworkError(err)) {
                    break;
                }
            }
        }

        this.writeAIQueue(nextQueue.filter((item) => item && item.status === 'pending'));
        this.aiState.isProcessing = false;
        this.parseAndRender({ source: this.inputText, preserveSelection: true });
        return { processed, failed };
    };

    QuickAddComponent.prototype.clearAIEntries = function clearAIEntries() {
        this.aiState.entries = [];
        this.aiState.editedEntries.clear();
        this.aiState.deletedEntries.clear();
        this.aiState.editingEntryId = '';
        this.aiState.warnings = [];
        this.aiState.missing = [];
        this.aiState.error = '';
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
        const entries = (this.aiState.entries || []).map((entry, idx) => {
            const deleted = this.aiState.deletedEntries.has(entry._id);
            return {
                index: idx,
                raw: this.inputText || '',
                fields: Object.assign({}, entry),
                explicitValues: {},
                inferred: [],
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
            input: this.inputText || '',
            entries,
            entryCount: entries.length,
            validCount,
            invalidCount: Math.max(0, entries.length - validCount),
            warnings: this.aiState.warnings.slice(),
            missing: this.aiState.missing.slice(),
            error: this.aiState.error || '',
            isProcessing: !!this.aiState.isProcessing,
            queueCount: this.getAIPendingQueueCount(),
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
            ? `<pre class="${c.output}" data-role="output"></pre>`
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
                    <div class="${c.dropdownList}" data-role="dropdownList"></div>
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
        this.datePickerEl = this.mountEl.querySelector('[data-role="datePicker"]');
        this.datePickerTitleEl = this.mountEl.querySelector('[data-role="datePickerTitle"]');
        this.datePickerWeekdaysEl = this.mountEl.querySelector('[data-role="datePickerWeekdays"]');
        this.datePickerGridEl = this.mountEl.querySelector('[data-role="datePickerGrid"]');
        this.datePickerQuickEl = this.mountEl.querySelector('[data-role="datePickerQuick"]');
        this.datePickerTimeEl = this.mountEl.querySelector('[data-role="datePickerTime"]');
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
        const parsed = parseFieldDateValue(field, token.value || '');
        if (parsed.ok && parsed.dateValue) {
            const parsedDate = fromYMD(parsed.dateValue);
            if (parsedDate) {
                return parsedDate;
            }
        }
        return new Date();
    };

    QuickAddComponent.prototype.openDatePicker = function openDatePicker(options) {
        if (!options || !options.token || !options.field) {
            return;
        }
        this.closeBlockedInfo();
        this.closeDropdown();
        const defaultTime = normalizeTime24(options.field.defaultTime, DEFAULT_DATETIME_TIME);
        const parsed = parseFieldDateValue(options.field, options.token.value || '');
        const selectedValue = parsed.ok ? parsed.value : '';
        const selectedDateValue = parsed.ok && parsed.dateValue ? parsed.dateValue : '';
        const selectedTimeValue = parsed.ok && parsed.timeValue ? parsed.timeValue : defaultTime;
        this.datePickerState = {
            fieldKey: options.field.key,
            tokenId: options.token.id,
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
        const isValidRect = (rect) => rect && (rect.right - rect.left) > 120 && (rect.bottom - rect.top) > 120;
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

        return isValidRect(bounds) ? bounds : viewport;
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

        const token = this.tokenMap[this.datePickerState.tokenId];
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
        this.datePickerSuppressUntil = Date.now() + 150;
        this.closeDatePicker();
        this.parseAndRender({ source: updated, caretOffset: caret, focusInput: true });
    };

    QuickAddComponent.prototype.bindEvents = function bindEvents() {
        this.onInput = () => {
            if (this.isRenderingInput) {
                return;
            }
            this.closeDropdown();
            this.closeBlockedInfo();
            this.closeDatePicker();
            if (this.timer) {
                clearTimeout(this.timer);
            }
            if (this.isAiMode()) {
                this.inputText = this.readInputText();
                this.lastResult = this.buildAIResult();
                if (typeof this.config.onParse === 'function') {
                    this.config.onParse(this.lastResult);
                }
                const autoParse = this.config.ai.autoParse !== false;
                const threshold = Math.max(0, Number(this.config.ai.minInputLength || 0));
                if (!autoParse) {
                    return;
                }
                const latest = String(this.inputText || this.readInputText() || '').trim();
                if (!latest || latest.length < threshold) {
                    return;
                }
                const waitMs = Math.max(50, Number(this.config.ai.debounceMs || 1000));
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
            if (event.key === 'Enter') {
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
            if (this.isAiMode()) {
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
            this.handlePillClick(pill);
        };

        this.onPreviewClick = (event) => {
            const removeBtn = event.target.closest('[data-entry-attachment-remove="1"]');
            if (removeBtn) {
                event.preventDefault();
                event.stopPropagation();
                const entryId = removeBtn.getAttribute('data-entry-id');
                const entryIndex = Number(removeBtn.getAttribute('data-entry-index'));
                const attachmentId = removeBtn.getAttribute('data-attachment-id') || '';
                const key = entryId || entryIndex;
                if ((entryId || !Number.isNaN(entryIndex)) && attachmentId) {
                    this.removeEntryAttachment(key, attachmentId);
                }
                return;
            }

            const openBtn = event.target.closest('[data-entry-attachment-open="1"]');
            if (openBtn) {
                event.preventDefault();
                event.stopPropagation();
                const entryId = openBtn.getAttribute('data-entry-id');
                const entryIndex = Number(openBtn.getAttribute('data-entry-index'));
                const attachmentId = openBtn.getAttribute('data-attachment-id') || '';
                const key = entryId || entryIndex;
                if ((entryId || !Number.isNaN(entryIndex)) && attachmentId) {
                    this.openEntryAttachment(key, attachmentId);
                }
                return;
            }

            if (this.isAiMode()) {
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
                if (action === 'queue-input') {
                    this.queueCurrentInputForAI();
                    return;
                }
                if (action === 'process-queue') {
                    this.processAIQueue();
                    return;
                }
                if (action === 'clear-entries') {
                    this.clearAIEntries();
                    this.parseAndRender({ source: this.inputText, preserveSelection: true });
                    return;
                }
                if (action === 'edit-entry') {
                    this.aiState.editingEntryId = entryId;
                    this.parseAndRender({ source: this.inputText, preserveSelection: true });
                    return;
                }
                if (action === 'cancel-edit') {
                    this.aiState.editingEntryId = '';
                    this.parseAndRender({ source: this.inputText, preserveSelection: true });
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
                            if (field.key === 'attachments') {
                                targetEntry[field.key] = this.normalizeAIAttachmentRefs(raw);
                                return;
                            }
                            if (field.key === 'status') {
                                targetEntry[field.key] = this.normalizeAIStatus(raw);
                                return;
                            }
                            if (field.type === 'number') {
                                const num = Number(raw);
                                targetEntry[field.key] = Number.isFinite(num) ? num : null;
                                return;
                            }
                            if (field.multiple) {
                                targetEntry[field.key] = raw
                                    ? raw.split(/[,\n]+/).map((item) => item.trim()).filter(Boolean)
                                    : [];
                                return;
                            }
                            targetEntry[field.key] = raw;
                        });
                        this.aiState.editedEntries.add(entryId);
                    }
                    this.aiState.editingEntryId = '';
                    this.parseAndRender({ source: this.inputText, preserveSelection: true });
                    return;
                }
                if (action === 'delete-entry') {
                    this.markAIEntryDeleted(entryId, true);
                    this.aiState.editingEntryId = '';
                    this.parseAndRender({ source: this.inputText, preserveSelection: true });
                    return;
                }
                if (action === 'restore-entry') {
                    this.markAIEntryDeleted(entryId, false);
                    this.parseAndRender({ source: this.inputText, preserveSelection: true });
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

        this.onPreviewChange = (event) => {
            const input = event.target.closest('[data-entry-attachment-input="1"]');
            if (!input || !input.files) {
                return;
            }
            const entryIndex = Number(input.getAttribute('data-entry-index'));
            if (Number.isNaN(entryIndex)) {
                input.value = '';
                return;
            }
            this.addEntryAttachments(entryIndex, Array.from(input.files));
            input.value = '';
        };

        this.onDropdownInput = () => {
            this.renderDropdownList();
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
            if (this.datePickerEl && !this.datePickerEl.hidden) {
                if (Date.now() < this.datePickerInternalClickUntil) {
                    return;
                }
                if (!this.datePickerEl.contains(targetEl) && !targetEl.closest('[data-qa-date-pill="1"]')) {
                    this.closeDatePicker();
                }
            }
        };

        this.onDocumentClick = (event) => {
            const targetEl = eventTargetElement(event);
            if (!targetEl) {
                return;
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
            if (event.key === 'Escape' && this.dropdownState) {
                this.closeDropdown();
            }
            if (event.key === 'Escape' && this.blockedInfoState) {
                this.closeBlockedInfo();
            }
            if (event.key === 'Escape' && this.datePickerState) {
                event.preventDefault();
                this.closeDatePicker();
            }
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
        this.dropdownListEl.addEventListener('click', this.onDropdownListClick);
        this.datePickerEl.addEventListener('click', this.onDatePickerClick);
        this.datePickerEl.addEventListener('change', this.onDatePickerChange);
        this.datePickerEl.addEventListener('keydown', this.onDatePickerKeyDown);
        document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
        document.addEventListener('click', this.onDocumentClick);
        document.addEventListener('keydown', this.onDocumentKeyDown);
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
        if (this.dropdownListEl && this.onDropdownListClick) {
            this.dropdownListEl.removeEventListener('click', this.onDropdownListClick);
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
        document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
        document.removeEventListener('click', this.onDocumentClick);
        document.removeEventListener('keydown', this.onDocumentKeyDown);
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
            const selections = this.collectEntrySelections(entry);
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
                this.removeFieldValue(entry, selection.fieldKey, selection.value);
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

        const preserveCaret = !opts.skipCaretPreserve && document.activeElement === this.inputEl;
        const caretOffset = typeof opts.caretOffset === 'number'
            ? opts.caretOffset
            : (preserveCaret ? this.getCaretOffset() : null);

        if (!raw) {
            this.isRenderingInput = true;
            this.inputEl.innerHTML = '';
            this.isRenderingInput = false;
            if (typeof caretOffset === 'number') {
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

        if (typeof caretOffset === 'number') {
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

    QuickAddComponent.prototype.buildAIInlineMarks = function buildAIInlineMarks() {
        const marks = [];
        const raw = String(this.inputText || '');
        if (!raw) {
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
                return custom
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
                        return {
                            start,
                            end,
                            label: String(mark.label || raw.slice(start, end)),
                            inferred: mark.inferred !== false,
                            fieldKey: mark.fieldKey || mark.field || '',
                            value: mark.value
                        };
                    })
                    .filter(Boolean)
                    .sort((a, b) => a.start - b.start || a.end - b.end);
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

            if (Array.isArray(entry.spans) && entry.spans.length) {
                entry.spans.forEach((span) => {
                    const start = Number(span && span.start);
                    const end = Number(span && span.end);
                    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
                        return;
                    }
                    if (start < 0 || end > raw.length) {
                        return;
                    }
                    const overlaps = usedRanges.some((range) => start < range.end && end > range.start);
                    if (overlaps) {
                        return;
                    }
                    usedRanges.push({ start, end });
                    marks.push({
                        start,
                        end,
                        label: `${span.field || 'field'}: ${span.value || raw.slice(start, end)}`,
                        inferred: true,
                        fieldKey: span.field || '',
                        value: span.value
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
                            fieldKey: '',
                            value: ''
                        });
                    }
                }
            }
        });

        marks.sort((a, b) => a.start - b.start || a.end - b.end);
        return marks;
    };

    QuickAddComponent.prototype.renderAIInlineLayer = function renderAIInlineLayer(options) {
        const c = this.config.classNames;
        const opts = options || {};
        const raw = String(this.inputText || '');

        const preserveCaret = !opts.skipCaretPreserve && document.activeElement === this.inputEl;
        const caretOffset = typeof opts.caretOffset === 'number'
            ? opts.caretOffset
            : (preserveCaret ? this.getCaretOffset() : null);

        if (!raw) {
            this.isRenderingInput = true;
            this.inputEl.innerHTML = '';
            this.isRenderingInput = false;
            if (typeof caretOffset === 'number') {
                this.setCaretOffset(0, !!opts.focusInput);
            }
            return;
        }

        const isSnapshotMatch = String(this.aiState.lastParsedInput || '') === raw;
        if (!this.isAIInlinePillsEnabled() || !isSnapshotMatch) {
            this.isRenderingInput = true;
            this.inputEl.innerHTML = `<span class="${c.inlineText}">${escHtml(raw)}</span>`;
            this.isRenderingInput = false;
            if (typeof caretOffset === 'number') {
                this.setCaretOffset(Math.min(caretOffset, raw.length), !!opts.focusInput);
            }
            return;
        }

        const marks = this.buildAIInlineMarks();
        if (!marks.length) {
            this.isRenderingInput = true;
            this.inputEl.innerHTML = `<span class="${c.inlineText}">${escHtml(raw)}</span>`;
            this.isRenderingInput = false;
            if (typeof caretOffset === 'number') {
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
            const classes = [c.inlineMark, c.inlineMarkInferred].filter(Boolean).join(' ');
            const title = escHtml(mark.label || 'AI highlight');
            const field = mark.fieldKey ? this.getFieldDefinition(mark.fieldKey) : null;
            const rawValue = Array.isArray(mark.value) ? mark.value[0] : mark.value;
            const color = this.resolvePillColor(field, rawValue || chunk);
            const styleAttr = color ? ` style="--qa-inline-accent:${escHtml(color)}"` : '';
            parts.push(`<span class="${classes}"${styleAttr} title="${title}"><span class="${c.inlineMarkLabel}">${escHtml(chunk)}</span></span>`);
            cursor = mark.end;
        });
        if (cursor < raw.length) {
            parts.push(escHtml(raw.slice(cursor)));
        }

        this.isRenderingInput = true;
        this.inputEl.innerHTML = `<span class="${c.inlineText}">${parts.join('')}<span class="${c.inputTail}" data-qa-tail="1" data-qa-ignore="1" contenteditable="false" aria-hidden="true"></span></span>`;
        this.isRenderingInput = false;
        if (typeof caretOffset === 'number') {
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
        this.closeBlockedInfo();

        const input = this.inputText || '';
        if (this.isAiMode()) {
            this.lastResult = this.buildAIResult();
            this.rebuildTokenMap({ entries: [] });
            this.renderAIInlineLayer(opts);
            this.renderResult(this.lastResult);
            this.closeDropdown();
            this.closeDatePicker();
        } else {
            this.lastResult = parseInput(input, this.config);
            this.lastResult = this.applyDismissedSelections(this.lastResult);
            this.lastResult = this.syncEntryAttachmentMeta(this.lastResult);
            this.rebuildTokenMap(this.lastResult);
            this.renderInlineLayer(this.lastResult, opts);
            this.renderResult(this.lastResult);

            const caretOffset = typeof opts.caretOffset === 'number'
                ? opts.caretOffset
                : this.getCaretOffset();
            this.syncTypingDropdown(caretOffset);
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

    QuickAddComponent.prototype.isInteractivePill = function isInteractivePill(field) {
        if (!field) {
            return false;
        }
        if (isDateFieldType(field.type)) {
            return true;
        }
        return field.type === 'options' && !field.multiple && getFieldOptions(field).length > 0;
    };

    QuickAddComponent.prototype.buildPillHtml = function buildPillHtml(data) {
        const c = this.config.classNames;
        const field = this.getFieldDefinition(data.fieldKey);
        const color = this.resolvePillColor(field, data.value);
        const inferred = !!data.inferred;
        const auto = !!data.auto;
        const blocked = !!data.blocked;
        const interactive = !blocked && this.isInteractivePill(field) && !!data.tokenId;
        const styleAttr = (!blocked && color) ? ` style="--qa-pill-accent:${escHtml(color)}"` : '';
        const classes = [
            c.pill,
            interactive ? c.pillInteractive : '',
            inferred ? c.pillInferred : '',
            blocked ? c.pillBlocked : '',
            auto ? 'qa-pill-auto' : ''
        ].filter(Boolean).join(' ');

        const interactionAttrs = interactive
            ? ` data-qa-pill="1" data-qa-date-pill="${field && isDateFieldType(field.type) ? '1' : '0'}" data-pill-field="${escHtml(data.fieldKey)}" data-pill-token="${escHtml(data.tokenId)}" data-pill-entry="${data.entryIndex}"`
            : '';
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

        return `<span class="${classes}"${attrs}${styleAttr}>${blockedIcon}${autoIcon}${inferredIcon}<span class="${c.pillLabel}">${escHtml(data.label)}</span>${dismiss}</span>`;
    };

    QuickAddComponent.prototype.buildInlineMarkHtml = function buildInlineMarkHtml(token, rawChunk) {
        const c = this.config.classNames;
        const field = this.getFieldDefinition(token.key);
        const color = this.resolvePillColor(field, token.value);
        const interactive = this.isInteractivePill(field);
        const styleAttr = (!token.blocked && color) ? ` style="--qa-inline-accent:${escHtml(color)}"` : '';
        const classes = [
            c.inlineMark,
            interactive ? c.inlineMarkInteractive : '',
            token.inferred ? c.inlineMarkInferred : '',
            token.blocked ? c.inlineMarkBlocked : ''
        ].filter(Boolean).join(' ');
        const attrs = (interactive && !token.blocked)
            ? ` data-qa-pill="1" data-qa-date-pill="${field && isDateFieldType(field.type) ? '1' : '0'}" data-pill-field="${escHtml(token.key)}" data-pill-token="${escHtml(token.id)}" data-pill-entry="${token.entryIndex}"`
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
        return `<span class="${classes}"${attrs}${blockedAttrs}${styleAttr}${titleAttr}>${blockedIcon}${inferredIcon}<span class="${c.inlineMarkLabel}">${escHtml(rawChunk)}</span>${dismiss}</span>`;
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

    QuickAddComponent.prototype.findTokenIdForFieldValue = function findTokenIdForFieldValue(entry, fieldKey, value, usedTokenIds) {
        const target = normValue(value);
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
            const values = Array.isArray(value) ? value : [value];
            values.forEach((item) => {
                const tokenId = this.findTokenIdForFieldValue(entry, fieldKey, item, usedTokens);
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

    QuickAddComponent.prototype.supportsEntryAttachments = function supportsEntryAttachments() {
        return this.config.showEntryCards !== false && this.config.allowEntryAttachments === true;
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
        if (sources.includes('camera')) {
            return 'environment';
        }
        return '';
    };

    QuickAddComponent.prototype.shouldUseMobileAttachmentPicker = function shouldUseMobileAttachmentPicker() {
        if (!isMobileDevice()) {
            return false;
        }
        const sources = this.getAttachmentSources();
        return sources.length > 0;
    };

    QuickAddComponent.prototype.buildMobileAttachmentPicker = function buildMobileAttachmentPicker(entryKey, dataAttrs, acceptAttr, multipleAttr) {
        const sources = this.getAttachmentSources();
        const allowCamera = sources.includes('camera');
        const allowGallery = sources.includes('gallery');
        const allowFiles = sources.includes('files');

        const captureAttr = allowCamera ? ' capture="environment"' : '';
        const cameraInputId = `qa_att_camera_${String(entryKey).replace(/[^a-zA-Z0-9]/g, '_')}`;
        const galleryInputId = `qa_att_gallery_${String(entryKey).replace(/[^a-zA-Z0-9]/g, '_')}`;
        const inputId = `qa_att_input_${String(entryKey).replace(/[^a-zA-Z0-9]/g, '_')}`;

        const buttons = [];
        if (allowCamera) {
            buttons.push(`
                <label class="${this.config.classNames.attachmentPick}" for="${escHtml(cameraInputId)}" data-qa-attachment-source="camera">
                    Camera
                </label>
            `);
        }
        if (allowGallery) {
            buttons.push(`
                <label class="${this.config.classNames.attachmentPick}" for="${escHtml(galleryInputId)}" data-qa-attachment-source="gallery">
                    Gallery
                </label>
            `);
        }
        if (allowFiles) {
            buttons.push(`
                <label class="${this.config.classNames.attachmentPick}" for="${escHtml(inputId)}" data-qa-attachment-source="files">
                    Files
                </label>
            `);
        }

        const inputs = [];
        if (allowCamera) {
            inputs.push(`
                <input
                    type="file"
                    class="${this.config.classNames.attachmentInput}"
                    id="${escHtml(cameraInputId)}"
                    data-entry-attachment-input="1"
                    data-attachment-source="camera"
                    ${dataAttrs}
                    ${acceptAttr}${multipleAttr}${captureAttr}
                />
            `);
        }
        if (allowGallery) {
            inputs.push(`
                <input
                    type="file"
                    class="${this.config.classNames.attachmentInput}"
                    id="${escHtml(galleryInputId)}"
                    data-entry-attachment-input="1"
                    data-attachment-source="gallery"
                    ${dataAttrs}
                    ${acceptAttr}${multipleAttr}
                />
            `);
        }
        if (allowFiles) {
            inputs.push(`
                <input
                    type="file"
                    class="${this.config.classNames.attachmentInput}"
                    id="${escHtml(inputId)}"
                    data-entry-attachment-input="1"
                    data-attachment-source="files"
                    ${dataAttrs}
                    ${acceptAttr}${multipleAttr}
                />
            `);
        }

        return `
            <div class="${this.config.classNames.attachmentControls}">
                ${buttons.join('')}
                ${inputs.join('')}
                <span class="${this.config.classNames.attachmentHint}">
                    ${this.config.allowMultipleAttachments !== false ? 'Multiple files allowed' : 'Single file only'}
                </span>
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
            if (!rule) {
                return false;
            }
            if (rule.startsWith('.')) {
                return name.endsWith(rule);
            }
            if (rule.endsWith('/*')) {
                const prefix = rule.slice(0, -1);
                return type.startsWith(prefix);
            }
            return type === rule;
        });
    };

    QuickAddComponent.prototype.pruneAttachmentsForResult = function pruneAttachmentsForResult(result) {
        if (!this.attachmentsByEntry || this.attachmentsByEntry.size === 0) {
            return;
        }
        const active = new Set(result.entries.map((entry) => (entry._id ? entry._id : entry.index)));
        Array.from(this.attachmentsByEntry.keys()).forEach((key) => {
            if (!active.has(key)) {
                this.attachmentsByEntry.delete(key);
            }
        });
    };

    QuickAddComponent.prototype.getEntryAttachmentMeta = function getEntryAttachmentMeta(entryKey) {
        const list = this.attachmentsByEntry.get(entryKey) || [];
        return list.map((item) => ({
            id: item.id,
            name: item.name,
            size: item.size,
            type: item.type,
            lastModified: item.lastModified
        }));
    };

    QuickAddComponent.prototype.syncEntryAttachmentMeta = function syncEntryAttachmentMeta(result) {
        if (!result || !Array.isArray(result.entries)) {
            return result;
        }
        if (!this.supportsEntryAttachments()) {
            result.entries.forEach((entry) => {
                if (result.mode === 'ai') {
                    delete entry.fileAttachments;
                } else {
                    delete entry.attachments;
                }
            });
            return result;
        }
        this.pruneAttachmentsForResult(result);
        result.entries.forEach((entry) => {
            const key = entry._id || entry.index;
            const attachments = this.getEntryAttachmentMeta(key);
            if (attachments.length > 0) {
                if (result.mode === 'ai') {
                    entry.fileAttachments = attachments;
                } else {
                    entry.attachments = attachments;
                }
            } else {
                if (result.mode === 'ai') {
                    delete entry.fileAttachments;
                } else {
                    delete entry.attachments;
                }
            }
        });
        return result;
    };

    QuickAddComponent.prototype.formatAttachmentSize = function formatAttachmentSize(bytes) {
        const num = Number(bytes || 0);
        if (num < 1024) {
            return `${num} B`;
        }
        if (num < 1024 * 1024) {
            return `${(num / 1024).toFixed(1)} KB`;
        }
        return `${(num / (1024 * 1024)).toFixed(1)} MB`;
    };

    QuickAddComponent.prototype.addEntryAttachments = function addEntryAttachments(entryKey, files) {
        if (!this.supportsEntryAttachments()) {
            return;
        }
        const selected = Array.isArray(files) ? files.filter(Boolean) : [];
        if (!selected.length) {
            return;
        }

        const allowed = selected.filter((file) => this.isAttachmentAllowed(file));
        if (!allowed.length) {
            return;
        }

        const existingRefs = new Set(
            (Array.isArray(this.lastResult?.entries)
                ? this.lastResult.entries
                    .filter((entry) => (entry._id || entry.index) === entryKey)
                    .flatMap((entry) => entry.attachments || [])
                : []
            ).map((item) => String(item || '').trim()).filter(Boolean)
        );

        const current = this.attachmentsByEntry.get(entryKey) || [];
        const canMultiple = this.config.allowMultipleAttachments !== false;
        let next = canMultiple ? current.slice() : [];

        allowed.forEach((file) => {
            const fingerprint = `${file.name}|${file.size}|${file.lastModified}|${file.type}`;
            const exists = next.some((item) => item.fingerprint === fingerprint);
            if (exists) {
                return;
            }
            const isImage = file.type && file.type.startsWith('image/');
            next.push({
                id: `att_${String(entryKey).replace(/[^a-zA-Z0-9]/g, '_')}_${++this.attachmentCounter}`,
                fingerprint,
                file,
                name: file.name || 'attachment',
                size: Number(file.size || 0),
                type: file.type || '',
                lastModified: Number(file.lastModified || 0),
                previewUrl: isImage ? URL.createObjectURL(file) : null
            });

            if (this.isAiMode()) {
                const refName = file.name || 'attachment';
                if (!existingRefs.has(refName)) {
                    existingRefs.add(refName);
                    const entry = (this.aiState.entries || []).find((item) => item._id === entryKey);
                    if (entry) {
                        const currentRefs = Array.isArray(entry.attachments) ? entry.attachments.slice() : [];
                        currentRefs.push(refName);
                        entry.attachments = currentRefs;
                    }
                }
            }
        });

        if (!canMultiple && next.length > 1) {
            next = [next[next.length - 1]];
        }

        this.attachmentsByEntry.set(entryKey, next);
        this.syncEntryAttachmentMeta(this.lastResult);
        this.renderResult(this.lastResult);
        if (typeof this.config.onParse === 'function') {
            this.config.onParse(this.lastResult);
        }
    };

    QuickAddComponent.prototype.removeEntryAttachment = function removeEntryAttachment(entryKey, attachmentId) {
        const current = this.attachmentsByEntry.get(entryKey) || [];
        if (!current.length) {
            return;
        }
        const removedItem = current.find((item) => item.id === attachmentId) || null;
        const next = [];
        let removed = false;
        current.forEach((item) => {
            if (item.id === attachmentId) {
                if (item.previewUrl) {
                    URL.revokeObjectURL(item.previewUrl);
                }
                removed = true;
            } else {
                next.push(item);
            }
        });

        if (!removed) {
            return;
        }

        if (removedItem && this.isAiMode()) {
            const entry = (this.aiState.entries || []).find((item) => item._id === entryKey);
            if (entry) {
                const currentRefs = Array.isArray(entry.attachments) ? entry.attachments.slice() : [];
                const nextRefs = currentRefs.filter((ref) => String(ref || '').trim() !== removedItem.name);
                entry.attachments = nextRefs;
            }
        }

        if (next.length > 0) {
            this.attachmentsByEntry.set(entryKey, next);
        } else {
            this.attachmentsByEntry.delete(entryKey);
        }
        this.syncEntryAttachmentMeta(this.lastResult);
        this.renderResult(this.lastResult);
        if (typeof this.config.onParse === 'function') {
            this.config.onParse(this.lastResult);
        }
    };

    QuickAddComponent.prototype.openEntryAttachment = function openEntryAttachment(entryKey, attachmentId) {
        const list = this.attachmentsByEntry.get(entryKey) || [];
        const item = list.find((entry) => entry.id === attachmentId);
        if (!item || !item.file) {
            return;
        }
        const url = item.previewUrl || URL.createObjectURL(item.file);
        if (!item.previewUrl) {
            item.previewUrl = url;
        }
        window.open(url, '_blank', 'noopener');
    };

    QuickAddComponent.prototype.renderEntryAttachments = function renderEntryAttachments(entry) {
        if (!this.supportsEntryAttachments()) {
            return '';
        }
        const c = this.config.classNames;
        const entryKey = entry._id || entry.index;
        const attachments = this.attachmentsByEntry.get(entryKey) || [];
        const accept = this.getAttachmentAcceptValue();
        const acceptAttr = accept ? ` accept="${escHtml(accept)}"` : '';
        const multipleAttr = this.config.allowMultipleAttachments !== false ? ' multiple' : '';
        const captureValue = this.getAttachmentCaptureValue();
        const captureAttr = captureValue ? ` capture="${escHtml(captureValue)}"` : '';
        const inputId = `qa_att_input_${String(entryKey).replace(/[^a-zA-Z0-9]/g, '_')}`;

        const dataAttrs = entry._id
            ? `data-entry-id="${escHtml(entry._id)}"`
            : `data-entry-index="${entry.index}"`;

        // Icons
        const iconPdf = `<svg class="qa-attachment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
        const iconFile = `<svg class="qa-attachment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;

        const listHtml = attachments.length
            ? `
                <div class="${c.attachmentList}">
                    ${attachments.map((item) => {
                const isImage = !!item.previewUrl;
                const isPdf = item.type === 'application/pdf';
                let content = '';
                let itemClass = c.attachmentItem;

                if (isImage) {
                    itemClass += ' qa-is-image';
                    content = `<img src="${escHtml(item.previewUrl)}" class="${c.attachmentPreview || 'qa-attachment-preview-img'}" alt="${escHtml(item.name)}" />`;
                } else {
                    content = `
                                ${isPdf ? iconPdf : iconFile}
                                <span class="${c.attachmentName}" title="${escHtml(item.name)}">${escHtml(item.name)}</span>
                            `;
                }

                return `
                        <div class="${itemClass}">
                            <button
                                type="button"
                                class="${c.attachmentOpen}"
                                data-entry-attachment-open="1"
                                ${dataAttrs}
                                data-attachment-id="${escHtml(item.id)}"
                                aria-label="Open attachment"
                            >
                                ${content}
                            </button>
                            <button
                                type="button"
                                class="${c.attachmentRemove}"
                                data-entry-attachment-remove="1"
                                ${dataAttrs}
                                data-attachment-id="${escHtml(item.id)}"
                                aria-label="Remove attachment"
                            >✕</button>
                        </div>
                        `;
            }).join('')}
                </div>
            `
            : '';

        return `
            <div class="${c.attachmentSection}">
                ${this.shouldUseMobileAttachmentPicker()
                ? this.buildMobileAttachmentPicker(entryKey, dataAttrs, acceptAttr, multipleAttr)
                : `
                    <div class="${c.attachmentControls}">
                        <label class="${c.attachmentPick}" for="${escHtml(inputId)}">
                            + Add attachment
                        </label>
                        <input
                            type="file"
                            class="${c.attachmentInput}"
                            id="${escHtml(inputId)}"
                            data-entry-attachment-input="1"
                            ${dataAttrs}
                            ${acceptAttr}${multipleAttr}${captureAttr}
                        />
                        <span class="${c.attachmentHint}">
                            ${this.config.allowMultipleAttachments !== false ? 'Multiple files allowed' : 'Single file only'}
                        </span>
                    </div>
                `}
                ${listHtml}
            </div>
        `;
    };

    QuickAddComponent.prototype.renderEntryPills = function renderEntryPills(entry) {
        const c = this.config.classNames;
        const selections = this.collectEntrySelections(entry);
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
            const value = Array.isArray(rawValue) ? rawValue.join(', ') : (rawValue ?? '');
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
        metaFields.forEach((field) => {
            const key = field.key;
            const rawValue = entry[key];
            const values = Array.isArray(rawValue) ? rawValue : [rawValue];
            values.forEach((value) => {
                if (value === undefined || value === null || value === '') {
                    return;
                }
                const label = field.label || key;
                const text = Array.isArray(value) ? value.join(', ') : value;
                pills.push(this.buildPillHtml({
                    fieldKey: key,
                    entryIndex: Number(entry._segmentIndex) || 0,
                    value,
                    label: `${label}: ${text}`,
                    inferred: false,
                    auto: false,
                    blocked: false,
                    dismissKey: null,
                    tokenId: null
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
                ${Array.isArray(entry.attachments) && entry.attachments.length
                ? `<div class="${c.issues}"><div class="${c.issue}">extracted refs: ${escHtml(entry.attachments.join(', '))}</div></div>`
                : ''}
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
        const queueCount = Number(result.queueCount || 0);
        const activeCount = (this.aiState.entries || []).filter((entry) => !this.aiState.deletedEntries.has(entry._id)).length;
        const statusParts = [];
        if (result.isProcessing) {
            statusParts.push('AI processing...');
        } else {
            statusParts.push(`${activeCount} active entries`);
        }
        statusParts.push(`${queueCount} queued`);
        if (result.error) {
            statusParts.push(`error: ${result.error}`);
        }
        this.statusEl.textContent = statusParts.join(' | ');

        const controls = this.config.ai && this.config.ai.controls ? this.config.ai.controls : {};
        const showParse = controls.parse !== false;
        const showQueue = controls.queue !== false;
        const showProcess = controls.process !== false;
        const showClear = controls.clear !== false;
        const actionsHtml = `
            <div class="${c.aiActions}">
                ${showParse ? `<button type="button" class="${c.aiActionBtn} ${c.aiActionBtnPrimary}" data-ai-action="parse-now">Parse Now</button>` : ''}
                ${showQueue ? `<button type="button" class="${c.aiActionBtn}" data-ai-action="queue-input">Queue Input</button>` : ''}
                ${showProcess ? `<button type="button" class="${c.aiActionBtn}" data-ai-action="process-queue">Process Queue</button>` : ''}
                ${showClear ? `<button type="button" class="${c.aiActionBtn} ${c.aiActionBtnGhost}" data-ai-action="clear-entries">Clear Entries</button>` : ''}
            </div>
        `;
        const warningRows = []
            .concat((result.warnings || []).map((item) => `<div class="${c.issue}">Warning: ${escHtml(item)}</div>`))
            .concat((result.missing || []).map((item) => `<div class="${c.issue}">Unknown: ${escHtml(item)}</div>`));
        const warningsHtml = warningRows.length
            ? `<div class="${c.issues}">${warningRows.join('')}</div>`
            : '';

        if (this.aiState.entries.length === 0) {
            const autoParseActive = this.config.ai.autoParse !== false;
            const autoParseHint = autoParseActive
                ? 'Type text and pause to trigger extraction.'
                : 'Auto-parse is off. Click Parse Now to run extraction.';
            this.previewEl.innerHTML = `
                ${actionsHtml}
                ${warningsHtml}
                <article class="${c.entry} ${c.entryEmpty}">No AI entries yet. ${autoParseHint} Or click Parse Now.</article>
            `;
        } else {
            this.previewEl.innerHTML = `
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
                    // Map file attachments from the result if they match IDs
                    const match = result.entries.find((r) => r._id === entry._id);
                    if (match && match.fileAttachments) {
                        mapped.fileAttachments = match.fileAttachments;
                    }
                    return mapped;
                }),
                editedEntryIds: Array.from(this.aiState.editedEntries),
                deletedEntryIds: Array.from(this.aiState.deletedEntries),
                warnings: result.warnings || [],
                missing: result.missing || [],
                queueCount
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
        const showEntryPills = this.config.showEntryPills !== false;
        this.statusEl.textContent = `${result.entryCount} entries | ${result.validCount} valid | ${result.invalidCount} issues`;

        if (!showEntryCards) {
            this.previewEl.innerHTML = '';
            if (this.outputEl) {
                this.outputEl.textContent = JSON.stringify(result, null, 2);
            }
            return;
        }

        if (result.entries.length === 0) {
            this.previewEl.innerHTML = `<div class="${c.entry}">No parsed entries yet.</div>`;
        } else {
            this.previewEl.innerHTML = result.entries.map((entry) => {
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
                const pillsHtml = showEntryPills ? this.renderEntryPills(entry) : '';
                const attachmentsHtml = this.renderEntryAttachments(entry);

                return `
                    <article class="${c.entry}">
                        ${headerHtml}
                        ${pillsHtml}
                        ${attachmentsHtml}
                        ${(entry.pending.length || entry.errors.length) ? `
                            <div class="${c.issues}">
                                ${pendingRows}
                                ${errorRows}
                            </div>
                        ` : ''}
                    </article>
                `;
            }).join('');
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
                if (!field || field.type !== 'options') {
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
        if (!field || field.type !== 'options') {
            if (this.dropdownState && this.dropdownState.source === 'typing') {
                this.closeDropdown();
            }
            return;
        }

        const options = getFieldOptions(field);
        if (options.length === 0) {
            if (this.dropdownState && this.dropdownState.source === 'typing') {
                this.closeDropdown();
            }
            return;
        }

        this.dropdownState = {
            fieldKey: token.key,
            tokenId: token.id,
            entryIndex: typeof token.entryIndex === 'number' ? token.entryIndex : 0,
            currentValue: token.value || '',
            allowCustom: !!field.allowCustom,
            options,
            source: 'typing'
        };

        this.dropdownSearchEl.hidden = true;
        this.dropdownSearchEl.value = token.value || '';
        this.renderDropdownList();
        this.positionDropdownAtRect(this.getCaretClientRect());
        this.dropdownEl.hidden = false;
        this.dropdownEl.classList.add(this.config.classNames.dropdownOpen);
    };

    QuickAddComponent.prototype.handlePillClick = function handlePillClick(pillEl) {
        this.closeBlockedInfo();
        const fieldKey = pillEl.getAttribute('data-pill-field');
        const tokenId = pillEl.getAttribute('data-pill-token');
        const entryIndex = Number(pillEl.getAttribute('data-pill-entry'));

        if (!fieldKey || !tokenId || Number.isNaN(entryIndex)) {
            return;
        }

        const field = this.getFieldDefinition(fieldKey);
        if (!field) {
            return;
        }

        const token = this.tokenMap[tokenId];
        if (!token) {
            return;
        }

        if (isDateFieldType(field.type)) {
            if (Date.now() < this.datePickerSuppressUntil) {
                return;
            }
            if (this.datePickerState && this.datePickerState.tokenId === tokenId) {
                this.closeDatePicker();
                return;
            }
            pillEl.setAttribute('data-qa-date-pill', '1');
            this.openDatePicker({
                field,
                token,
                entryIndex,
                anchorEl: pillEl
            });
            return;
        }

        if (field.type !== 'options') {
            return;
        }

        const options = getFieldOptions(field);
        if (options.length === 0) {
            return;
        }

        this.dropdownState = {
            fieldKey,
            tokenId,
            entryIndex,
            currentValue: token.value,
            allowCustom: !!field.allowCustom,
            options,
            anchorEl: pillEl,
            source: 'click'
        };

        this.dropdownSearchEl.hidden = false;
        this.dropdownSearchEl.value = '';
        this.renderDropdownList();
        this.positionDropdown(pillEl);
        this.dropdownEl.hidden = false;
        this.dropdownEl.classList.add(this.config.classNames.dropdownOpen);
        this.dropdownSearchEl.focus();
        this.dropdownSearchEl.select();
    };

    QuickAddComponent.prototype.placeCaretNearPill = function placeCaretNearPill(pillEl, clickEvent) {
        if (!pillEl) {
            return;
        }
        const tokenId = pillEl.getAttribute('data-pill-token');
        if (!tokenId) {
            return;
        }
        const token = this.tokenMap[tokenId];
        if (!token) {
            return;
        }

        const rect = pillEl.getBoundingClientRect();
        const clickX = clickEvent && typeof clickEvent.clientX === 'number'
            ? clickEvent.clientX
            : rect.right;
        const midpoint = rect.left + (rect.width / 2);
        const caretOffset = clickX >= midpoint ? token.globalEnd : token.globalStart;

        this.closeDropdown();
        this.setCaretOffset(caretOffset, true);
    };

    QuickAddComponent.prototype.positionDropdownAtRect = function positionDropdownAtRect(rect, anchorEl) {
        const bounds = this.getFloatingBounds(anchorEl || this.inputEl);
        const pad = window.innerWidth <= 480 ? 8 : 10;
        const viewportWidth = Math.max(0, (bounds.right - bounds.left) - (pad * 2));
        const preferredWidth = Math.max(200, (rect.width || 0) + 40);
        const width = Math.min(360, viewportWidth, preferredWidth);
        const minLeft = bounds.left + pad;
        const maxLeft = bounds.right - width - pad;
        const left = Math.max(minLeft, Math.min(rect.left || minLeft, maxLeft));

        const belowTop = (rect.bottom || rect.top || 0) + 8;
        const approxHeight = 280;
        const minTop = bounds.top + pad;
        const maxBottom = bounds.bottom - pad;
        let top = belowTop;
        if (belowTop + approxHeight > maxBottom) {
            top = Math.max(minTop, (rect.top || 0) - approxHeight - 8);
        }
        if (top + approxHeight > maxBottom) {
            top = Math.max(minTop, maxBottom - approxHeight);
        }

        this.dropdownEl.style.position = 'fixed';
        this.dropdownEl.style.left = `${left}px`;
        this.dropdownEl.style.top = `${top}px`;
        this.dropdownEl.style.width = `${width}px`;
        this.dropdownEl.style.maxWidth = `${Math.max(0, bounds.right - bounds.left - (pad * 2))}px`;
        this.dropdownEl.style.zIndex = '9999';
    };

    QuickAddComponent.prototype.positionDropdown = function positionDropdown(anchorEl) {
        this.positionDropdownAtRect(anchorEl.getBoundingClientRect(), anchorEl);
    };

    QuickAddComponent.prototype.supportsCssAnchorPositioning = function supportsCssAnchorPositioning() {
        if (this.anchorSupportChecked) {
            return this.anchorSupported;
        }
        this.anchorSupportChecked = true;
        this.anchorSupported = false;
        if (!window.CSS || typeof window.CSS.supports !== 'function') {
            return this.anchorSupported;
        }
        const hasAnchorName = window.CSS.supports('anchor-name: --qa-anchor-test');
        const hasPositionAnchor = window.CSS.supports('position-anchor: --qa-anchor-test');
        const hasAnchorFn = window.CSS.supports('top: anchor(bottom)');
        this.anchorSupported = hasAnchorName && hasPositionAnchor && hasAnchorFn;
        return this.anchorSupported;
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
        const c = this.config.classNames;
        const safeReason = escHtml(reason || 'Blocked by constraints');
        this.blockedInfoEl.innerHTML = `
            <span class="${c.blockedInfoIcon}" aria-hidden="true">!</span>
            <span class="${c.blockedInfoText}">${safeReason}</span>
        `;
        this.blockedInfoState = { reason: reason || '' };
        const useAnchor = !!anchorEl && this.supportsCssAnchorPositioning();
        this.blockedInfoEl.classList.toggle(c.blockedInfoAnchored, useAnchor);
        this.blockedInfoEl.classList.remove(
            c.blockedInfoAnchorBelowStart,
            c.blockedInfoAnchorBelowEnd,
            c.blockedInfoAnchorAboveStart,
            c.blockedInfoAnchorAboveEnd
        );

        if (useAnchor) {
            this.blockedAnchorEl = anchorEl;
            this.blockedAnchorEl.style.anchorName = '--qa-blocked-anchor';
            const rect = anchorEl.getBoundingClientRect();
            const pad = window.innerWidth <= 480 ? 8 : 10;
            const minWidth = 170;
            const maxViewportWidth = Math.max(minWidth, window.innerWidth - (pad * 2));
            const preferredWidth = Math.max(220, (rect.width || 0) + 90);
            const spaceRight = Math.max(0, window.innerWidth - (rect.left || 0) - pad);
            const spaceLeft = Math.max(0, (rect.right || 0) - pad);
            const useStart = spaceRight >= spaceLeft;
            const chosenSpace = Math.max(minWidth, useStart ? spaceRight : spaceLeft);
            const width = Math.min(420, maxViewportWidth, chosenSpace, preferredWidth);

            const spaceBelow = Math.max(0, window.innerHeight - (rect.bottom || 0) - pad);
            const spaceAbove = Math.max(0, (rect.top || 0) - pad);
            const useBelow = spaceBelow >= spaceAbove;
            const maxHeight = Math.max(56, Math.min(220, (useBelow ? spaceBelow : spaceAbove) - 8));

            this.blockedInfoEl.style.position = 'fixed';
            this.blockedInfoEl.style.width = `${Math.floor(width)}px`;
            this.blockedInfoEl.style.maxWidth = `${Math.floor(width)}px`;
            this.blockedInfoEl.style.maxHeight = `${Math.floor(maxHeight)}px`;
            this.blockedInfoEl.style.zIndex = '10000';
            this.blockedInfoEl.style.overflow = 'auto';
            this.blockedInfoEl.style.setProperty('position-anchor', '--qa-blocked-anchor');
            this.blockedInfoEl.style.removeProperty('left');
            this.blockedInfoEl.style.removeProperty('top');
            this.blockedInfoEl.style.removeProperty('marginTop');
            this.blockedInfoEl.style.removeProperty('position-try-fallbacks');
            if (useBelow && useStart) {
                this.blockedInfoEl.classList.add(c.blockedInfoAnchorBelowStart);
            } else if (useBelow && !useStart) {
                this.blockedInfoEl.classList.add(c.blockedInfoAnchorBelowEnd);
            } else if (!useBelow && useStart) {
                this.blockedInfoEl.classList.add(c.blockedInfoAnchorAboveStart);
            } else {
                this.blockedInfoEl.classList.add(c.blockedInfoAnchorAboveEnd);
            }
        } else {
            const rect = anchorEl && anchorEl.getBoundingClientRect
                ? anchorEl.getBoundingClientRect()
                : this.inputEl.getBoundingClientRect();

            const pad = window.innerWidth <= 480 ? 8 : 10;
            const viewportWidth = Math.max(0, window.innerWidth - (pad * 2));
            const width = Math.min(420, viewportWidth, Math.max(180, (rect.width || 0) + 90));
            const left = Math.max(pad, Math.min(rect.left || 0, window.innerWidth - width - pad));
            const belowTop = (rect.bottom || rect.top || 0) + 8;
            const approxHeight = 56;
            let top = belowTop;
            if (belowTop + approxHeight > window.innerHeight) {
                top = Math.max(pad, (rect.top || 0) - approxHeight - 8);
            }
            if (top + approxHeight > window.innerHeight - pad) {
                top = Math.max(pad, window.innerHeight - approxHeight - pad);
            }
            this.blockedInfoEl.style.position = 'fixed';
            this.blockedInfoEl.style.left = `${left}px`;
            this.blockedInfoEl.style.top = `${top}px`;
            this.blockedInfoEl.style.marginTop = '0';
            this.blockedInfoEl.style.width = `${width}px`;
            this.blockedInfoEl.style.maxWidth = `${viewportWidth}px`;
            this.blockedInfoEl.style.zIndex = '10000';
            this.blockedInfoEl.style.removeProperty('position-anchor');
            this.blockedInfoEl.style.removeProperty('position-try-fallbacks');
        }
        this.blockedInfoEl.hidden = false;
    };

    QuickAddComponent.prototype.closeBlockedInfo = function closeBlockedInfo() {
        this.blockedInfoState = null;
        if (this.blockedAnchorEl) {
            this.blockedAnchorEl.style.anchorName = '';
            this.blockedAnchorEl = null;
        }
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
            return;
        }

        const c = this.config.classNames;
        const queryRaw = this.dropdownSearchEl.value || '';
        const query = queryRaw.trim().toLowerCase();

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
            const selected = normValue(option.value) === normValue(this.dropdownState.currentValue);
            return `
                <button type="button" class="${c.dropdownOption}" data-option-value="${escHtml(option.value)}">
                    <span class="${c.dropdownColor}"${colorStyle}></span>
                    <span>${escHtml(option.label)}</span>
                    ${selected ? `<span class="${c.dropdownMeta}">current</span>` : ''}
                </button>
            `;
        });

        const exactMatch = dependencyFiltered.some((option) =>
            option.value.toLowerCase() === query || option.label.toLowerCase() === query
        );

        const customAllowedByDependency = this.isFieldValueDependencyAllowed(
            this.dropdownState.fieldKey,
            queryRaw.trim(),
            this.dropdownState.entryIndex
        ).ok;

        if (this.dropdownState.allowCustom && query && !exactMatch && customAllowedByDependency) {
            items.push(`
                <button type="button" class="${c.dropdownOption} ${c.dropdownAdd}" data-option-value="${escHtml(queryRaw.trim())}">
                    <span class="${c.dropdownColor}"></span>
                    <span>Add "${escHtml(queryRaw.trim())}"</span>
                    <span class="${c.dropdownMeta}">custom</span>
                </button>
            `);
        }

        if (items.length === 0) {
            const dependencyBlocked = dependencyFiltered.length === 0;
            const msg = dependencyBlocked ? 'No options (constraints active)' : 'No options';
            this.dropdownListEl.innerHTML = `<div class="${c.dropdownMeta}" style="padding:8px 10px;">${escHtml(msg)}</div>`;
            return;
        }

        this.dropdownListEl.innerHTML = items.join('');
    };

    QuickAddComponent.prototype.replaceRange = function replaceRange(text, start, end, replacement) {
        return text.slice(0, start) + replacement + text.slice(end);
    };

    QuickAddComponent.prototype.applyDropdownSelection = function applyDropdownSelection(nextValue) {
        if (!this.dropdownState) {
            return;
        }
        const allowed = this.isFieldValueDependencyAllowed(
            this.dropdownState.fieldKey,
            nextValue,
            this.dropdownState.entryIndex
        );
        if (!allowed.ok) {
            return;
        }

        const token = this.tokenMap[this.dropdownState.tokenId];
        if (!token) {
            this.closeDropdown();
            return;
        }

        const source = this.inputText || this.readInputText();
        let updated = this.replaceRange(source, token.globalValueStart, token.globalValueEnd, nextValue);
        let caret = token.globalValueStart + String(nextValue).length;
        const terminator = String(this.config.fieldTerminator || '');
        const fromTyping = this.dropdownState && this.dropdownState.source === 'typing';

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

        this.closeDropdown();
        this.parseAndRender({ source: updated, caretOffset: caret, focusInput: true });
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
        this.attachmentsByEntry.clear();
        this.closeDropdown();
        this.closeBlockedInfo();
        this.parseAndRender({ source: this.inputText, caretOffset: this.inputText.length, focusInput: false });
    };

    QuickAddComponent.prototype.getResult = function getResult() {
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
        this.closeBlockedInfo();
        this.closeDatePicker();
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
        this.unbindEvents();
        this.closeBlockedInfo();
        this.closeDatePicker();
        this.closeDropdown();

        this.mountEl.innerHTML = '';
    };

    global.QuickAdd = {
        create: function create(config) {
            return new QuickAddComponent(config);
        },
        parse: parseInput
    };
})(window);
