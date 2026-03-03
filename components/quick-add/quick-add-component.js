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
        entryMarkers: 'qa-entry-markers',
        entryMarker: 'qa-entry-marker',
        entryMarkerActive: 'qa-entry-marker-active',
        entryActive: 'qa-entry-active',
        inputClearBtn: 'qa-input-clear-btn',
        fieldActionBar: 'qa-field-action-bar',
        fieldActionBarButtons: 'qa-field-action-bar-buttons',
        fieldActionBtn: 'qa-field-action-btn',
        fieldActionBtnExpanded: 'qa-field-action-btn-expanded',
        fieldActionBtnWithMeta: 'qa-field-action-btn-with-meta',
        fieldActionBtnIcon: 'qa-field-action-btn-icon',
        fieldActionBtnLabel: 'qa-field-action-btn-label',
        fieldActionBtnValue: 'qa-field-action-btn-value',
        fieldActionBtnMeta: 'qa-field-action-btn-meta',
        fieldActionBtnMetaBadge: 'qa-field-action-btn-meta-badge',
        fieldActionBtnMetaBadgeRequired: 'qa-field-action-btn-meta-badge-required',
        fieldActionBtnMetaBadgeAuto: 'qa-field-action-btn-meta-badge-auto',
        fieldActionApplyAll: 'qa-field-action-apply-all',
        fieldActionApplyAllCheckbox: 'qa-field-action-apply-all-checkbox',
        fieldActionApplyAllLabel: 'qa-field-action-apply-all-label',
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
        dropdownSearchMultiline: 'qa-dropdown-search-multiline',
        dropdownListWrap: 'qa-dropdown-list-wrap',
        dropdownList: 'qa-dropdown-list',
        dropdownOption: 'qa-dropdown-option',
        dropdownOptionActive: 'qa-dropdown-option-active',
        dropdownAdd: 'qa-dropdown-add',
        dropdownColor: 'qa-dropdown-color',
        dropdownMeta: 'qa-dropdown-meta',
        dropdownMetaType: 'qa-dropdown-meta-type',
        dropdownMetaBadges: 'qa-dropdown-meta-badges',
        dropdownMetaBadgeRequired: 'qa-dropdown-meta-badge-required',
        dropdownMetaBadgeAuto: 'qa-dropdown-meta-badge-auto',
        dropdownFieldGlyph: 'qa-dropdown-field-glyph',
        dropdownFieldGlyphTonePlain: 'qa-dropdown-field-glyph-tone-plain',
        dropdownFieldGlyphToneRequired: 'qa-dropdown-field-glyph-tone-required',
        dropdownFieldGlyphToneAuto: 'qa-dropdown-field-glyph-tone-auto',
        dropdownFieldGlyphToneDefault: 'qa-dropdown-field-glyph-tone-default',
        dropdownFieldGlyphToneLimited: 'qa-dropdown-field-glyph-tone-limited',
        dropdownFieldGlyphToneMulti: 'qa-dropdown-field-glyph-tone-multi',
        dropdownFieldGlyphToneMeta: 'qa-dropdown-field-glyph-tone-meta',
        dropdownFieldPrefix: 'qa-dropdown-field-prefix',
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
        splitInput: null,
        promptMode: 'default',
        promptTemplate: '',
        parseResponse: null,
        inlinePillHarness: null,
        outputType: '',
        outputSchema: null,
        webSearch: false,
        tools: null
    };
    const DEFAULT_A11Y_CONFIG = {
        inputAriaLabel: 'Quick add input'
    };
    const DEFAULT_WARNINGS_CONFIG = {
        unlinkedAttachments: {
            enabled: true,
            onCheck: null
        }
    };
    const DEFAULT_VALIDATION_CONFIG = {
        beforeCommitField: null,
        beforeSaveEntry: null
    };
    const DEFAULT_OPTIONS_CONFIG = {
        onCreateOption: null,
        onOptionsCatalogChange: null
    };
    const DEFAULT_HISTORY_CONFIG = {
        enabled: true,
        maxDepth: 100
    };

    const DEFAULT_CONFIG = {
        mount: null,
        mode: 'deterministic',
        debounceMs: 300,
        allowMultipleEntries: true,
        entrySeparator: '\n',
        fieldTerminator: ';;',
        fieldTerminatorMode: 'strict',
        hideFieldTerminatorInPills: false,
        autoCloseFieldOnSpace: false,
        autoCloseFieldOnSpaceConfidenceThreshold: 0.9,
        multiSelectSeparator: ',',
        multiSelectDisplaySeparator: ', ',
        sortSelectedMultiOptionsToBottom: true,
        enableNumberPillStepper: false,
        numberPillStep: 1,
        pillColorStyle: 'background',
        escapeChar: '\\',
        fallbackField: 'title',
        showJsonOutput: true,
        showDropdownOnTyping: true,
        showFieldMenuOnTyping: true,
        fieldMenuTrigger: '/',
        fieldMenuShowUsedFields: false,
        fieldMenuShowRequiredMeta: true,
        fieldMenuShowAutoDetectMeta: true,
        showFieldActionBar: false,
        fieldActionBarExpandOnValue: true,
        fieldActionBarShowMetaIndicators: true,
        fieldActionBarApplyToAllToggle: false,
        fieldActionBarApplyToAllDefault: false,
        fieldActionBarApplyToAllLabel: 'Apply to all',
        fieldActionBarButtons: [],
        showAttachmentDropdownPreview: true,
        showInlinePills: true,
        showEntryCards: true,
        showEntryHeader: true,
        inputHeightMode: 'grow',
        inputMaxHeight: null,
        fontFamily: '',
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
        a11y: {},
        warnings: {},
        validation: {},
        options: {},
        history: {},
        classNames: {},
        tokens: {},
        onParse: null
    };
    const DEFAULT_DATETIME_TIME = '08:00';
    const ACTION_META_REQUIRED_ICON = '<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M8 1.75l1.9 3.15 3.55.64-2.5 2.45.6 3.51L8 9.9l-3.55 1.6.6-3.51L2.55 5.54l3.55-.64z"/></svg>';
    const ACTION_META_AUTO_ICON = '<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><path fill="currentColor" d="M8.98 1.15 3.72 8.04c-.13.17-.01.41.2.41h2.52l-.78 6.34c-.04.34.4.52.61.24l5.12-6.83c.13-.17.01-.41-.2-.41H8.65l.95-6.36c.05-.34-.39-.54-.62-.28Z"/></svg>';

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
        merged.a11y = Object.assign({}, DEFAULT_A11Y_CONFIG, merged.a11y || {});
        merged.validation = Object.assign({}, DEFAULT_VALIDATION_CONFIG, merged.validation || {});
        merged.options = Object.assign({}, DEFAULT_OPTIONS_CONFIG, merged.options || {});
        merged.history = Object.assign({}, DEFAULT_HISTORY_CONFIG, merged.history || {});
        merged.warnings = Object.assign({}, DEFAULT_WARNINGS_CONFIG, merged.warnings || {});
        merged.warnings.unlinkedAttachments = Object.assign(
            {},
            DEFAULT_WARNINGS_CONFIG.unlinkedAttachments,
            merged.warnings.unlinkedAttachments || {}
        );
        merged.classNames = Object.assign({}, DEFAULT_CLASSNAMES, merged.classNames || {});
        merged.ai.webSearch = merged.ai.webSearch === true;
        merged.ai.tools = normalizeAiToolsConfig(merged.ai.tools);
        const aiDebounceMs = Number(merged.ai.debounceMs);
        merged.ai.debounceMs = Number.isFinite(aiDebounceMs) && aiDebounceMs >= 0
            ? aiDebounceMs
            : DEFAULT_AI_CONFIG.debounceMs;
        if (!Array.isArray(merged.allowedAttachmentTypes)) {
            throw new Error('QuickAdd: allowedAttachmentTypes must be an array');
        }
        merged.allowedAttachmentTypes = merged.allowedAttachmentTypes
            .map((item) => String(item || '').trim())
            .filter(Boolean);
        merged.attachmentSources = normalizeAttachmentSources(merged.attachmentSources);
        merged.showFieldActionBar = merged.showFieldActionBar === true;
        merged.fieldActionBarButtons = normalizeFieldActionButtons(merged.fieldActionBarButtons);
        merged.fieldActionBarExpandOnValue = merged.fieldActionBarExpandOnValue !== false;
        merged.fieldActionBarShowMetaIndicators = merged.fieldActionBarShowMetaIndicators !== false;
        merged.fieldActionBarApplyToAllToggle = merged.fieldActionBarApplyToAllToggle === true;
        merged.fieldActionBarApplyToAllDefault = merged.fieldActionBarApplyToAllDefault === true;
        merged.fieldActionBarApplyToAllLabel = typeof merged.fieldActionBarApplyToAllLabel === 'string'
            ? merged.fieldActionBarApplyToAllLabel.trim()
            : DEFAULT_CONFIG.fieldActionBarApplyToAllLabel;
        if (!merged.fieldActionBarApplyToAllLabel) {
            merged.fieldActionBarApplyToAllLabel = DEFAULT_CONFIG.fieldActionBarApplyToAllLabel;
        }
        if (!merged.fieldActionBarApplyToAllToggle) {
            merged.fieldActionBarApplyToAllDefault = false;
        }
        merged.fontFamily = typeof merged.fontFamily === 'string' ? merged.fontFamily.trim() : '';
        merged.multiSelectSeparator = String(merged.multiSelectSeparator === undefined ? ',' : merged.multiSelectSeparator);
        merged.multiSelectDisplaySeparator = String(
            merged.multiSelectDisplaySeparator === undefined || merged.multiSelectDisplaySeparator === null
                ? `${merged.multiSelectSeparator} `
                : merged.multiSelectDisplaySeparator
        );
        merged.hideFieldTerminatorInPills = merged.hideFieldTerminatorInPills === true;
        merged.autoCloseFieldOnSpace = merged.autoCloseFieldOnSpace === true;
        const rawAutoCloseThreshold = Number(merged.autoCloseFieldOnSpaceConfidenceThreshold);
        merged.autoCloseFieldOnSpaceConfidenceThreshold = Number.isFinite(rawAutoCloseThreshold)
            ? Math.max(0, Math.min(1, rawAutoCloseThreshold))
            : 0.9;
        merged.sortSelectedMultiOptionsToBottom = merged.sortSelectedMultiOptionsToBottom !== false;
        merged.showDropdownOnTyping = merged.showDropdownOnTyping !== false;
        merged.showFieldMenuOnTyping = merged.showFieldMenuOnTyping !== false;
        merged.fieldMenuTrigger = String(
            merged.fieldMenuTrigger === undefined || merged.fieldMenuTrigger === null
                ? DEFAULT_CONFIG.fieldMenuTrigger
                : merged.fieldMenuTrigger
        );
        merged.fieldMenuShowUsedFields = merged.fieldMenuShowUsedFields !== false;
        merged.fieldMenuShowRequiredMeta = merged.fieldMenuShowRequiredMeta !== false;
        merged.fieldMenuShowAutoDetectMeta = merged.fieldMenuShowAutoDetectMeta !== false;
        merged.showAttachmentDropdownPreview = merged.showAttachmentDropdownPreview !== false;
        merged.enableNumberPillStepper = merged.enableNumberPillStepper === true;
        const rawNumberStep = Number(merged.numberPillStep);
        merged.numberPillStep = Number.isFinite(rawNumberStep) && rawNumberStep > 0 ? rawNumberStep : 1;
        const pillColorStyle = String(merged.pillColorStyle || 'background').trim().toLowerCase();
        merged.pillColorStyle = pillColorStyle === 'border' ? 'border' : 'background';
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
        merged.a11y.inputAriaLabel = String(merged.a11y.inputAriaLabel || DEFAULT_A11Y_CONFIG.inputAriaLabel);
        merged.warnings.unlinkedAttachments.enabled = merged.warnings.unlinkedAttachments.enabled !== false;
        if (typeof merged.warnings.unlinkedAttachments.onCheck !== 'function') {
            merged.warnings.unlinkedAttachments.onCheck = null;
        }
        if (typeof merged.validation.beforeCommitField !== 'function') {
            merged.validation.beforeCommitField = null;
        }
        if (typeof merged.validation.beforeSaveEntry !== 'function') {
            merged.validation.beforeSaveEntry = null;
        }
        if (typeof merged.options.onCreateOption !== 'function') {
            merged.options.onCreateOption = null;
        }
        if (typeof merged.options.onOptionsCatalogChange !== 'function') {
            merged.options.onOptionsCatalogChange = null;
        }
        merged.history.enabled = merged.history.enabled !== false;
        const maxDepth = Number(merged.history.maxDepth);
        merged.history.maxDepth = Number.isFinite(maxDepth) && maxDepth > 0
            ? Math.round(maxDepth)
            : DEFAULT_HISTORY_CONFIG.maxDepth;
        const mode = String(merged.mode || '').toLowerCase();
        if (mode !== 'ai' && mode !== 'deterministic') {
            throw new Error('QuickAdd: mode must be "deterministic" or "ai"');
        }
        merged.mode = mode;
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
            inferMissingYear: true,
            missingYearPastWindowDays: 14,
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

        normalized.allowMathExpression = normalized.allowMathExpression === true;

        if (typeof normalized.inferMissingYear !== 'boolean') {
            normalized.inferMissingYear = true;
        }

        normalized.missingYearPastWindowDays = normalizeMissingYearPastWindowDays(
            normalized.missingYearPastWindowDays
        );

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

    function normalizeMissingYearPastWindowDays(rawValue) {
        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed) || parsed < 0) {
            return 14;
        }
        return Math.floor(parsed);
    }

    function isValidCalendarDate(year, month, day) {
        const date = new Date(year, month - 1, day);
        return !(
            Number.isNaN(date.getTime())
            || date.getFullYear() !== year
            || date.getMonth() !== month - 1
            || date.getDate() !== day
        );
    }

    function findFirstValidYear(startYear, month, day, maxYearsAhead) {
        const limit = startYear + Math.max(0, Number(maxYearsAhead) || 0);
        for (let year = startYear; year <= limit; year += 1) {
            if (isValidCalendarDate(year, month, day)) {
                return year;
            }
        }
        return null;
    }

    function inferYearForMonthDay(month, day, options) {
        const opts = options || {};
        const monthNum = Number(month);
        const dayNum = Number(day);
        if (
            Number.isNaN(monthNum)
            || Number.isNaN(dayNum)
            || monthNum < 1
            || monthNum > 12
            || dayNum < 1
            || dayNum > 31
        ) {
            return null;
        }
        if (opts.inferMissingYear === false) {
            return null;
        }
        const referenceDate = opts.referenceDate instanceof Date && !Number.isNaN(opts.referenceDate.getTime())
            ? opts.referenceDate
            : new Date();
        const currentYear = referenceDate.getFullYear();
        const windowDays = normalizeMissingYearPastWindowDays(opts.missingYearPastWindowDays);

        const baseYear = findFirstValidYear(currentYear, monthNum, dayNum, 8);
        if (!baseYear) {
            return null;
        }
        if (baseYear !== currentYear) {
            return baseYear;
        }

        const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
        const candidate = new Date(baseYear, monthNum - 1, dayNum);
        const diffDays = Math.floor((candidate.getTime() - today.getTime()) / 86400000);
        if (diffDays < -windowDays) {
            return findFirstValidYear(currentYear + 1, monthNum, dayNum, 8) || baseYear;
        }
        return baseYear;
    }

    function parseDayNumber(rawDay) {
        const normalized = String(rawDay || '')
            .trim()
            .toLowerCase()
            .replace(/,$/, '');
        const numericToken = normalized.replace(/(st|nd|rd|th)$/i, '');
        const day = Number(numericToken);
        if (!Number.isNaN(day) && day >= 1 && day <= 31) {
            return day;
        }

        const simpleWordMap = {
            one: 1, first: 1,
            two: 2, second: 2,
            three: 3, third: 3,
            four: 4, fourth: 4,
            five: 5, fifth: 5,
            six: 6, sixth: 6,
            seven: 7, seventh: 7,
            eight: 8, eighth: 8,
            nine: 9, ninth: 9,
            ten: 10, tenth: 10,
            eleven: 11, eleventh: 11,
            twelve: 12, twelfth: 12,
            thirteen: 13, thirteenth: 13,
            fourteen: 14, fourteenth: 14,
            fifteen: 15, fifteenth: 15,
            sixteen: 16, sixteenth: 16,
            seventeen: 17, seventeenth: 17,
            eighteen: 18, eighteenth: 18,
            nineteen: 19, nineteenth: 19,
            twenty: 20, twentieth: 20,
            thirty: 30, thirtieth: 30
        };
        const unitWordMap = {
            one: 1, first: 1,
            two: 2, second: 2,
            three: 3, third: 3,
            four: 4, fourth: 4,
            five: 5, fifth: 5,
            six: 6, sixth: 6,
            seven: 7, seventh: 7,
            eight: 8, eighth: 8,
            nine: 9, ninth: 9
        };
        const tensWordMap = {
            twenty: 20,
            thirty: 30
        };

        const wordToken = normalized.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
        if (!wordToken) {
            return null;
        }
        if (Object.prototype.hasOwnProperty.call(simpleWordMap, wordToken)) {
            return simpleWordMap[wordToken];
        }
        const parts = wordToken.split(' ');
        if (parts.length === 2 && Object.prototype.hasOwnProperty.call(tensWordMap, parts[0])) {
            const tens = tensWordMap[parts[0]];
            const unit = unitWordMap[parts[1]];
            if (Number.isFinite(unit)) {
                const combined = tens + unit;
                if (combined >= 1 && combined <= 31) {
                    return combined;
                }
            }
        }
        return null;
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

    function parseExplicitDateTimeLiteral(rawValue, options) {
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

        const dayMonthYear = raw.match(/^([a-z-]+|\d{1,2}(?:st|nd|rd|th)?)\s+([a-z]{3,9})\.?,?\s+(\d{2,4})(?:\s+(?:at\s+)?(.+))?$/i);
        if (dayMonthYear) {
            const monthToken = dayMonthYear[2].slice(0, 4).toLowerCase();
            const month = monthMap[monthToken] || monthMap[monthToken.slice(0, 3)];
            const day = parseDayNumber(dayMonthYear[1]);
            if (!month) {
                return null;
            }
            const dateValue = buildExplicitDate(dayMonthYear[3], month, day);
            if (!dateValue) {
                return null;
            }
            const parsedTime = parseTimeToken(dayMonthYear[4] || '');
            if (!parsedTime.ok) {
                return null;
            }
            return { dateValue, timeValue: parsedTime.value, hasTime: !!parsedTime.value };
        }

        const monthDayYear = raw.match(/^([a-z]{3,9})\.?,?\s+([a-z-]+|\d{1,2}(?:st|nd|rd|th)?),?\s+(\d{2,4})(?:\s+(?:at\s+)?(.+))?$/i);
        if (monthDayYear) {
            const monthToken = monthDayYear[1].slice(0, 4).toLowerCase();
            const month = monthMap[monthToken] || monthMap[monthToken.slice(0, 3)];
            const day = parseDayNumber(monthDayYear[2]);
            if (!month) {
                return null;
            }
            const dateValue = buildExplicitDate(monthDayYear[3], month, day);
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

        const dayMonthNoYear = raw.match(/^([a-z-]+|\d{1,2}(?:st|nd|rd|th)?)\s+([a-z]{3,9})\.?,?(?:\s+(?:at\s+)?(.+))?$/i);
        if (dayMonthNoYear) {
            const monthToken = dayMonthNoYear[2].slice(0, 4).toLowerCase();
            const month = monthMap[monthToken] || monthMap[monthToken.slice(0, 3)];
            const day = parseDayNumber(dayMonthNoYear[1]);
            if (!month || !day) {
                return null;
            }
            const year = inferYearForMonthDay(month, day, options);
            if (!year) {
                return null;
            }
            const dateValue = buildExplicitDate(year, month, day);
            if (!dateValue) {
                return null;
            }
            const parsedTime = parseTimeToken(dayMonthNoYear[3] || '');
            if (!parsedTime.ok) {
                return null;
            }
            return { dateValue, timeValue: parsedTime.value, hasTime: !!parsedTime.value };
        }

        const monthDayNoYear = raw.match(/^([a-z]{3,9})\.?,?\s+([a-z-]+|\d{1,2}(?:st|nd|rd|th)?)(?:\s+(?:at\s+)?(.+))?$/i);
        if (monthDayNoYear) {
            const monthToken = monthDayNoYear[1].slice(0, 4).toLowerCase();
            const month = monthMap[monthToken] || monthMap[monthToken.slice(0, 3)];
            const day = parseDayNumber(monthDayNoYear[2]);
            if (!month || !day) {
                return null;
            }
            const year = inferYearForMonthDay(month, day, options);
            if (!year) {
                return null;
            }
            const dateValue = buildExplicitDate(year, month, day);
            if (!dateValue) {
                return null;
            }
            const parsedTime = parseTimeToken(monthDayNoYear[3] || '');
            if (!parsedTime.ok) {
                return null;
            }
            return { dateValue, timeValue: parsedTime.value, hasTime: !!parsedTime.value };
        }

        const dayOrMonthNoYear = raw.match(/^(\d{1,2})[\/.-](\d{1,2})(?:\s+(?:at\s+)?(.+))?$/i);
        if (dayOrMonthNoYear) {
            const first = Number(dayOrMonthNoYear[1]);
            const second = Number(dayOrMonthNoYear[2]);
            if (Number.isNaN(first) || Number.isNaN(second)) {
                return null;
            }
            let day = first;
            let month = second;
            if (day <= 12 && month > 12) {
                day = second;
                month = first;
            }
            const year = inferYearForMonthDay(month, day, options);
            if (!year) {
                return null;
            }
            const dateValue = buildExplicitDate(year, month, day);
            if (!dateValue) {
                return null;
            }
            const parsedTime = parseTimeToken(dayOrMonthNoYear[3] || '');
            if (!parsedTime.ok) {
                return null;
            }
            return { dateValue, timeValue: parsedTime.value, hasTime: !!parsedTime.value };
        }

        return null;
    }

    function parseDate(rawValue, naturalDate, options) {
        const raw = String(rawValue).trim();
        const value = raw.toLowerCase();
        const opts = options || {};
        if (!value) {
            return { ok: false, error: 'Missing date value' };
        }

        const strict = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (strict) {
            const strictValue = `${strict[1]}-${strict[2]}-${strict[3]}`;
            if (!fromYMD(strictValue)) {
                return { ok: false, error: 'Invalid date value' };
            }
            return { ok: true, value: strictValue };
        }

        const explicitDate = parseExplicitDateTimeLiteral(raw, opts);
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

        const explicitDateTime = parseExplicitDateTimeLiteral(raw, opts);
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
                const parsedDate = parseDate(withTimeSuffix[1], true, opts);
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

            const parsedDate = parseDate(raw, naturalDate || looksLikeExplicitDateInput(raw), opts);
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
        const parsed = parseDate(rawValue, !!field.naturalDate, field);
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
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        if (
            Number.isNaN(year)
            || Number.isNaN(month)
            || Number.isNaN(day)
            || month < 1
            || month > 12
            || day < 1
            || day > 31
        ) {
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

        const MAX_CHARS = 160;
        const MAX_TOKENS = 120;
        const MAX_NESTING = 24;
        const MAX_ABS = 1000000000000;
        if (source.length > MAX_CHARS) {
            return { ok: false, error: `Expression is too long (max ${MAX_CHARS} chars)` };
        }

        const normalized = source
            .replace(/\[/g, '(')
            .replace(/\]/g, ')')
            .replace(/\{/g, '(')
            .replace(/\}/g, ')');
        const tokens = [];
        let i = 0;
        let depth = 0;
        while (i < normalized.length) {
            const ch = normalized.charAt(i);
            if (/\s/.test(ch)) {
                i += 1;
                continue;
            }
            if (ch === '(') {
                depth += 1;
                if (depth > MAX_NESTING) {
                    return { ok: false, error: `Expression nesting exceeds ${MAX_NESTING}` };
                }
                tokens.push(ch);
                i += 1;
                continue;
            }
            if (ch === ')') {
                depth -= 1;
                if (depth < 0) {
                    return { ok: false, error: 'Mismatched parentheses in expression' };
                }
                tokens.push(ch);
                i += 1;
                continue;
            }
            if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^' || ch === '%') {
                tokens.push(ch);
                i += 1;
                continue;
            }
            if (/\d|\./.test(ch)) {
                const start = i;
                let dotCount = ch === '.' ? 1 : 0;
                i += 1;
                while (i < normalized.length) {
                    const next = normalized.charAt(i);
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
                const rawNumber = normalized.slice(start, i);
                if (rawNumber === '.') {
                    return { ok: false, error: 'Invalid number in expression' };
                }
                const parsedNumber = Number(rawNumber);
                if (!Number.isFinite(parsedNumber) || Math.abs(parsedNumber) > MAX_ABS) {
                    return { ok: false, error: 'Invalid number in expression' };
                }
                tokens.push(parsedNumber);
                continue;
            }
            return { ok: false, error: 'Expression contains unsupported characters' };
        }
        if (depth !== 0) {
            return { ok: false, error: 'Mismatched parentheses in expression' };
        }
        if (tokens.length > MAX_TOKENS) {
            return { ok: false, error: `Expression is too complex (max ${MAX_TOKENS} tokens)` };
        }

        let cursor = 0;
        const peek = () => tokens[cursor];
        const consume = () => {
            const token = tokens[cursor];
            cursor += 1;
            return token;
        };
        const safeValue = (value) => {
            if (!Number.isFinite(value)) {
                return { ok: false, error: 'Expression did not resolve to a finite number' };
            }
            if (Math.abs(value) > MAX_ABS) {
                return { ok: false, error: `Expression result exceeds limit (${MAX_ABS})` };
            }
            return { ok: true, value };
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

        const parsePower = () => {
            const left = parsePrimary();
            if (!left.ok) {
                return left;
            }
            if (peek() !== '^') {
                return left;
            }
            consume();
            const right = parseUnary();
            if (!right.ok) {
                return right;
            }
            return safeValue(Math.pow(left.value, right.value));
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
                return safeValue(-next.value);
            }
            return parsePower();
        };

        const parseTerm = () => {
            let left = parseUnary();
            if (!left.ok) {
                return left;
            }
            while (peek() === '*' || peek() === '/' || peek() === '%') {
                const op = consume();
                const right = parseUnary();
                if (!right.ok) {
                    return right;
                }
                if ((op === '/' || op === '%') && right.value === 0) {
                    return { ok: false, error: 'Division by zero is not allowed' };
                }
                const nextValue = op === '*'
                    ? left.value * right.value
                    : (op === '/'
                        ? left.value / right.value
                        : left.value % right.value);
                left = safeValue(nextValue);
                if (!left.ok) {
                    return left;
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
                left = safeValue(op === '+' ? left.value + right.value : left.value - right.value);
                if (!left.ok) {
                    return left;
                }
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
        return resolved;
    }

    function parseByType(field, rawValue, config) {
        const value = String(rawValue).trim();
        const multiSelectSeparator = String((config && config.multiSelectSeparator) || ',');

        if (field.type === 'string') {
            return { ok: true, value };
        }

        if (field.type === 'number') {
            const allowMath = !!(field && field.allowMathExpression === true);
            if (allowMath) {
                const looksLikeExpression = /[+\-*/%^()[\]{}]/.test(value);
                const evaluated = evaluateMathExpression(value);
                if (evaluated.ok) {
                    return { ok: true, value: evaluated.value };
                }
                if (looksLikeExpression) {
                    return { ok: false, error: `Invalid math expression for ${field.key}: ${evaluated.error}` };
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
            return parseDate(value, !!field.naturalDate, field);
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

    function humanizeIdentifier(raw) {
        const value = String(raw || '').trim();
        if (!value) {
            return 'field';
        }
        return value
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function resolveReasonFieldLabel(fieldRef, context) {
        const ctx = context || {};
        const ref = String(fieldRef || '').trim();
        if (!ref) {
            return 'field';
        }
        if (ref === ctx.selfFieldKey) {
            const selfLabel = String(ctx.selfFieldLabel || '').trim();
            return selfLabel || 'this field';
        }
        const lookup = ctx.fieldLabelLookup;
        if (lookup && lookup[ref]) {
            const next = lookup[ref];
            if (typeof next === 'string') {
                const text = next.trim();
                if (text) {
                    return text;
                }
            }
            if (typeof next === 'object') {
                const text = String(next.label || next.key || '').trim();
                if (text) {
                    return text;
                }
            }
        }
        return humanizeIdentifier(ref);
    }

    function reasonValueText(value) {
        if (Array.isArray(value)) {
            const rendered = value.map((item) => reasonValueText(item));
            return rendered.join(', ');
        }
        if (value === undefined || value === null || value === '') {
            return 'empty';
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        return `"${String(value)}"`;
    }

    function reasonClauseForRule(rule, context) {
        const ctx = context || {};
        const fieldRef = normalizeRuleField(rule.field, ctx.selfFieldKey);
        const fieldLabel = resolveReasonFieldLabel(fieldRef, ctx);
        const op = String(rule.op || 'eq').toLowerCase();
        const valueText = reasonValueText(rule.value);
        if (op === 'exists') return `${fieldLabel} is set`;
        if (op === 'notexists') return `${fieldLabel} is empty`;
        if (op === 'eq') return `${fieldLabel} is ${valueText}`;
        if (op === 'neq') return `${fieldLabel} is not ${valueText}`;
        if (op === 'in') return `${fieldLabel} is one of ${valueText}`;
        if (op === 'notin') return `${fieldLabel} is not any of ${valueText}`;
        if (op === 'includes') return `${fieldLabel} includes ${valueText}`;
        if (op === 'gt') return `${fieldLabel} is greater than ${valueText}`;
        if (op === 'gte') return `${fieldLabel} is at least ${valueText}`;
        if (op === 'lt') return `${fieldLabel} is less than ${valueText}`;
        if (op === 'lte') return `${fieldLabel} is at most ${valueText}`;
        return `${fieldLabel} satisfies ${humanOp(op)} ${valueText}`;
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
            return 'requirements were not met';
        }
        if (Array.isArray(rule)) {
            return rule.map((item) => dependencyReason(item, ctx)).join(' and ');
        }
        if (typeof rule !== 'object') {
            return 'requirements were not met';
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
        return reasonClauseForRule(rule, ctx);
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
                    reason: `${prefix}Allowed only when ${dependencyReason(whenRule, ctx)} and ${dependencyReason(targetRule, ctx)}.`
                };
            }
            return { ok: false, reason: `${prefix}Allowed only when ${dependencyReason(targetRule, ctx)}.` };
        }
        return { ok: true, reason: '' };
    }

    function findOptionByParsedValue(field, parsedValue) {
        const options = getFieldOptions(field);
        const target = String(parsedValue).toLowerCase();
        return options.find((option) => option.value.toLowerCase() === target) || null;
    }

    function evaluateFieldDependency(field, parsedValue, fields, fieldLabelLookup) {
        if (!field) {
            return { ok: true, reason: '' };
        }
        const context = {
            selfFieldKey: field.key,
            selfValue: parsedValue,
            selfFieldLabel: field.label || field.key,
            fieldLabelLookup: fieldLabelLookup || null
        };
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
                const allowed = evaluateFieldDependency(field, nextParsedValue, entry.fields, normalizedSchema.byKey);
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
            const allowed = evaluateFieldDependency(field, inf.value, entry.fields, normalizedSchema.byKey);
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
                const allowed = evaluateFieldDependency(field, nextParsedValue, trialFields, normalizedSchema.byKey);
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
            const rawValueSlice = rawEntry.slice(valueStartLocal, valueEndLocal);
            const trailingWhitespaceMatch = rawValueSlice.match(/\s+$/);
            const trailingWhitespaceCount = trailingWhitespaceMatch ? trailingWhitespaceMatch[0].length : 0;
            const normalizedValueEndLocal = Math.max(valueStartLocal, valueEndLocal - trailingWhitespaceCount);
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
                localValueEnd: normalizedValueEndLocal,
                globalStart: globalStart + tokenStartLocal,
                globalEnd: globalStart + tokenEndLocal,
                globalValueStart: globalStart + valueStartLocal,
                globalValueEnd: globalStart + normalizedValueEndLocal
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

    function sanitizeInlineSvgMarkup(raw) {
        const value = String(raw || '').trim();
        if (!value) {
            return '';
        }
        if (!/^<svg[\s\S]*<\/svg>$/i.test(value)) {
            return '';
        }
        return value
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
            .replace(/\son[a-z0-9_-]+\s*=\s*"[^"]*"/gi, '')
            .replace(/\son[a-z0-9_-]+\s*=\s*'[^']*'/gi, '')
            .replace(/\s(?:href|xlink:href)\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, '');
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

    function deepCloneValue(value) {
        if (value === undefined || value === null) {
            return value;
        }
        if (typeof value !== 'object') {
            return value;
        }
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (err) {
            if (Array.isArray(value)) {
                return value.slice();
            }
            return Object.assign({}, value);
        }
    }

    function focusElementIfPossible(el) {
        if (!el || typeof el.focus !== 'function') {
            return false;
        }
        if (el.isConnected === false) {
            return false;
        }
        try {
            el.focus();
            return true;
        } catch (err) {
            return false;
        }
    }

    function findFocusableElement(el) {
        if (!el || el.isConnected === false) {
            return null;
        }
        const isFocusableSelf = !!(
            el.matches
            && el.matches('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]')
        );
        if (isFocusableSelf) {
            return el;
        }
        if (typeof el.querySelector !== 'function') {
            return null;
        }
        return el.querySelector('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]');
    }

    function normalizeAttachmentMode(rawMode) {
        return String(rawMode || 'base64').toLowerCase() === 'metadata-only'
            ? 'metadata-only'
            : 'base64';
    }

    function arrayBufferToBase64(buffer) {
        const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer || 0);
        const chunkSize = 0x8000;
        let binary = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, chunk);
        }
        return btoa(binary);
    }

    function base64ToUint8Array(base64) {
        const raw = atob(String(base64 || ''));
        const out = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i += 1) {
            out[i] = raw.charCodeAt(i);
        }
        return out;
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
        if (Array.isArray(raw)) {
            return raw.map((item) => String(item || '').trim()).filter(Boolean);
        }
        throw new Error('QuickAdd: attachmentSources must be an array of strings');
    }

    function normalizeFieldActionButtons(raw) {
        if (raw === undefined || raw === null) {
            return [];
        }
        if (!Array.isArray(raw)) {
            throw new Error('QuickAdd: fieldActionBarButtons must be an array');
        }
        return raw
            .map((item) => (item && typeof item === 'object' ? item : null))
            .filter(Boolean)
            .map((item) => ({
                fieldKey: String(item.fieldKey || '').trim(),
                iconSvg: typeof item.iconSvg === 'string' ? item.iconSvg : '',
                showLabel: item.showLabel !== false,
                expandOnValue: item.expandOnValue !== false,
                visible: item.visible !== false
            }))
            .filter((item) => !!item.fieldKey);
    }

    function normalizeAiToolsConfig(raw) {
        if (raw === undefined || raw === null) {
            return null;
        }
        if (Array.isArray(raw)) {
            return raw.slice();
        }
        throw new Error('QuickAdd: ai.tools must be an array');
    }

    function resolveMount(mount) {
        if (typeof document === 'undefined' || typeof HTMLElement === 'undefined') {
            throw new Error('QuickAdd: create() requires a browser DOM');
        }
        if (!mount) {
            throw new Error('QuickAdd: mount is required');
        }
        if (mount instanceof HTMLElement) {
            return mount;
        }
        throw new Error('QuickAdd: mount must be an HTMLElement');
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
            queuedRequest: null,
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
        this.deterministicDeletedEntries = new Set();
        this.focusOrigins = {
            dropdown: null,
            datePicker: null,
            blockedInfo: null,
            attachmentSourceMenu: null
        };
        this.dropdownListId = `qa_listbox_${Math.random().toString(36).slice(2, 10)}`;
        this.dropdownOptionIdPrefix = `qa_opt_${Math.random().toString(36).slice(2, 10)}_`;
        this.suppressNextInsertParagraph = false;
        this.historyPast = [];
        this.historyFuture = [];
        this.historySuspend = false;
        this.viewportRepositionFrame = 0;
        this.datePickerSuppressUntil = 0;
        this.datePickerInternalClickUntil = 0;
        this.blockedInfoState = null;
        this.lastInteractedEntryIndex = null;
        this.fieldActionApplyToAllEnabled = this.config.fieldActionBarApplyToAllToggle === true
            && this.config.fieldActionBarApplyToAllDefault === true;
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
        this.captureHistorySnapshot('init');
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
        return this.config.mode === 'ai';
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
            const probeRequestId = Number(this.aiState.requestSeq || 0) + 1;
            const batch = await this.buildAIDispatchBatch(input, probeRequestId);
            const dispatchOutcome = await this.extractAIFromInput(input, {
                requestId: probeRequestId,
                batch,
                source: 'verify',
                context: { verifyOnly: true }
            });
            if (dispatchOutcome.status === 'queued') {
                const reason = this.normalizeAIDispatchReason(dispatchOutcome.reason);
                const queuedMessage = dispatchOutcome.message
                    ? `Verification queued: ${dispatchOutcome.message}`
                    : `Verification queued (${reason}).`;
                this.aiVerificationState = { status: 'error', message: queuedMessage, signature: '' };
                this.parseAndRender({ source: this.inputText });
                return { ok: false, message: queuedMessage };
            }
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
        const toListText = (item) => {
            if (item === undefined || item === null) {
                return '';
            }
            if (typeof item === 'string') {
                return item;
            }
            if (typeof item === 'number' || typeof item === 'boolean') {
                return String(item);
            }
            try {
                return JSON.stringify(item);
            } catch (err) {
                return String(item);
            }
        };
        return {
            entries: Array.isArray(data.entries) ? data.entries : [],
            missing: Array.isArray(data.missing) ? data.missing.map(toListText).filter(Boolean) : [],
            warnings: Array.isArray(data.warnings) ? data.warnings.map(toListText).filter(Boolean) : []
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
        const noEntryDelimiterHint = (!this.isAISeparatorAwareEnabled() || !String(this.config.entrySeparator || ''))
            ? `\nDo not require explicit entry delimiters. Infer entry boundaries from natural-language context when multiple entries are present.`
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
            `- Treat input as natural language; key:value field prefixes and field delimiters may be absent\n` +
            `- Infer fields from context even when explicit field syntax is not used\n` +
            `${noEntryDelimiterHint}` +
            `- Keep unknown optional fields as null or empty string/array\n` +
            `- If multiple pets/events are present, create separate entries\n` +
            `- Put unresolved entities in "missing"\n` +
            `- Put ambiguity/assumptions in "warnings"${separatorHint}${spanHint}${fileHint}${attachmentHint}\n` +
            `Input:\n${String(input || '')}`;
    };

    QuickAddComponent.prototype.cloneAIData = function cloneAIData(value) {
        if (value === undefined) {
            return undefined;
        }
        if (value === null) {
            return null;
        }
        if (typeof value !== 'object') {
            return value;
        }
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (err) {
            if (Array.isArray(value)) {
                return value.slice();
            }
            return Object.assign({}, value);
        }
    };

    QuickAddComponent.prototype.canUseBuiltInAIDispatch = function canUseBuiltInAIDispatch() {
        return typeof fetch === 'function';
    };

    QuickAddComponent.prototype.assertAIDispatchConfig = function assertAIDispatchConfig() {
        const ai = this.config.ai || {};
        if (typeof ai.dispatch !== 'function' && !this.canUseBuiltInAIDispatch()) {
            throw new Error('Missing ai.dispatch(batch, context) in AI mode and fetch() is unavailable');
        }
        const provider = String(ai.provider || '').trim().toLowerCase();
        if (!provider) {
            throw new Error('Missing ai.provider');
        }
        if (!['openai', 'anthropic', 'google', 'custom'].includes(provider)) {
            throw new Error(`Unknown AI provider: ${provider}`);
        }
        if (provider === 'custom' && !String(ai.endpoint || '').trim()) {
            throw new Error('Missing ai.endpoint for custom provider');
        }
        if (provider !== 'custom' && !String(ai.apiKey || '').trim()) {
            throw new Error('Missing ai.apiKey');
        }
        return provider;
    };

    QuickAddComponent.prototype.tryParseJson = function tryParseJson(text) {
        const raw = String(text || '').trim();
        if (!raw) {
            return null;
        }
        try {
            return JSON.parse(raw);
        } catch (err) {
            return null;
        }
    };

    QuickAddComponent.prototype.extractProviderErrorMessage = function extractProviderErrorMessage(payload, fallback) {
        const data = payload && typeof payload === 'object' ? payload : null;
        if (!data) {
            return String(fallback || 'Provider request failed');
        }
        if (typeof data.error === 'string' && data.error.trim()) {
            return data.error.trim();
        }
        if (data.error && typeof data.error === 'object') {
            const nested = data.error;
            const nestedMsg = nested.message || nested.error || nested.detail;
            if (typeof nestedMsg === 'string' && nestedMsg.trim()) {
                return nestedMsg.trim();
            }
        }
        if (typeof data.message === 'string' && data.message.trim()) {
            return data.message.trim();
        }
        return String(fallback || 'Provider request failed');
    };

    QuickAddComponent.prototype.extractOpenAIResponseText = function extractOpenAIResponseText(payload) {
        const data = payload && typeof payload === 'object' ? payload : null;
        if (!data) {
            return '';
        }
        if (typeof data.output_text === 'string' && data.output_text.trim()) {
            return data.output_text;
        }
        if (Array.isArray(data.output)) {
            const outputText = [];
            data.output.forEach((item) => {
                if (!item || typeof item !== 'object') {
                    return;
                }
                if (Array.isArray(item.content)) {
                    item.content.forEach((part) => {
                        if (!part || typeof part !== 'object') {
                            return;
                        }
                        if (typeof part.text === 'string' && part.text.trim()) {
                            outputText.push(part.text);
                            return;
                        }
                        if (part.text && typeof part.text === 'object' && typeof part.text.value === 'string') {
                            outputText.push(part.text.value);
                        }
                    });
                }
            });
            if (outputText.length) {
                return outputText.join('\n');
            }
        }
        if (Array.isArray(data.choices) && data.choices.length) {
            const message = data.choices[0] && data.choices[0].message;
            if (message) {
                if (typeof message.content === 'string') {
                    return message.content;
                }
                if (Array.isArray(message.content)) {
                    return message.content.map((item) => {
                        if (!item) return '';
                        if (typeof item === 'string') return item;
                        if (typeof item.text === 'string') return item.text;
                        return '';
                    }).filter(Boolean).join('\n');
                }
            }
        }
        return '';
    };

    QuickAddComponent.prototype.extractAnthropicResponseText = function extractAnthropicResponseText(payload) {
        const data = payload && typeof payload === 'object' ? payload : null;
        if (!data || !Array.isArray(data.content)) {
            return '';
        }
        const parts = [];
        data.content.forEach((item) => {
            if (!item || typeof item !== 'object') {
                return;
            }
            if (typeof item.text === 'string' && item.text.trim()) {
                parts.push(item.text);
            }
        });
        return parts.join('\n');
    };

    QuickAddComponent.prototype.extractGoogleResponseText = function extractGoogleResponseText(payload) {
        const data = payload && typeof payload === 'object' ? payload : null;
        if (!data || !Array.isArray(data.candidates) || !data.candidates.length) {
            return '';
        }
        const candidate = data.candidates[0] || {};
        const content = candidate.content || {};
        if (!Array.isArray(content.parts)) {
            return '';
        }
        const parts = content.parts
            .map((part) => (part && typeof part.text === 'string') ? part.text : '')
            .filter(Boolean);
        return parts.join('\n');
    };

    QuickAddComponent.prototype.extractCustomResponsePayload = function extractCustomResponsePayload(payload, rawText) {
        const data = payload && typeof payload === 'object' ? payload : null;
        if (!data) {
            return rawText || '';
        }
        if (Array.isArray(data.entries) || Array.isArray(data.warnings) || Array.isArray(data.missing)) {
            return data;
        }
        if (typeof data.responseText === 'string') {
            return data.responseText;
        }
        if (typeof data.text === 'string') {
            return data.text;
        }
        if (typeof data.content === 'string') {
            return data.content;
        }
        const openaiText = this.extractOpenAIResponseText(data);
        if (openaiText) {
            return openaiText;
        }
        return rawText || data;
    };

    QuickAddComponent.prototype.extractProviderResponsePayload = function extractProviderResponsePayload(providerRaw, payload, rawText) {
        const provider = String(providerRaw || '').trim().toLowerCase();
        if (provider === 'openai') {
            const text = this.extractOpenAIResponseText(payload);
            return text || payload || rawText || '';
        }
        if (provider === 'anthropic') {
            const text = this.extractAnthropicResponseText(payload);
            return text || payload || rawText || '';
        }
        if (provider === 'google') {
            const text = this.extractGoogleResponseText(payload);
            return text || payload || rawText || '';
        }
        if (provider === 'custom') {
            return this.extractCustomResponsePayload(payload, rawText);
        }
        return payload || rawText || '';
    };

    QuickAddComponent.prototype.dispatchAIBatchViaProviderApi = async function dispatchAIBatchViaProviderApi(batch, context) {
        const requestBatch = Array.isArray(batch) ? batch : [];
        if (!requestBatch.length) {
            return {
                status: 'completed',
                responses: [],
                providerRawResponse: {
                    requestId: Number(context && context.requestId),
                    provider: String(this.config.ai && this.config.ai.provider || ''),
                    mode: 'built-in',
                    requests: []
                }
            };
        }
        if (!this.canUseBuiltInAIDispatch()) {
            throw new Error('fetch() is not available for built-in provider dispatch');
        }

        const responses = [];
        const rawRequests = [];
        for (let i = 0; i < requestBatch.length; i++) {
            const item = requestBatch[i] || {};
            const request = item.request || {};
            const url = String(request.url || '');
            const method = String(request.method || 'POST').toUpperCase();
            const headers = Object.assign({}, request.headers || {});
            const payload = request.payload !== undefined ? request.payload : null;
            const startedAt = new Date().toISOString();
            let httpResponse;
            let parsedBody = null;
            let rawBody = '';

            try {
                httpResponse = await fetch(url, {
                    method,
                    headers,
                    body: payload === null ? undefined : JSON.stringify(payload)
                });
            } catch (error) {
                throw this.normalizeAIDispatchError({
                    kind: 'offline',
                    message: String(error && error.message ? error.message : 'Network request failed'),
                    detail: {
                        chunkId: item.chunkId,
                        provider: request.provider || item.provider || '',
                        url
                    }
                });
            }

            try {
                rawBody = await httpResponse.text();
            } catch (err) {
                rawBody = '';
            }
            parsedBody = this.tryParseJson(rawBody);

            rawRequests.push({
                chunkId: item.chunkId,
                chunkIndex: item.chunkIndex,
                provider: request.provider || item.provider || '',
                request: {
                    method,
                    url
                },
                response: {
                    status: Number(httpResponse.status),
                    ok: httpResponse.ok,
                    startedAt,
                    endedAt: new Date().toISOString()
                }
            });

            if (!httpResponse.ok) {
                const message = this.extractProviderErrorMessage(parsedBody, `AI provider request failed (${httpResponse.status})`);
                throw this.normalizeAIDispatchError({
                    kind: httpResponse.status === 401 || httpResponse.status === 403 ? 'auth' : (httpResponse.status === 429 ? 'rate-limited' : 'error'),
                    message,
                    detail: {
                        status: Number(httpResponse.status),
                        chunkId: item.chunkId,
                        provider: request.provider || item.provider || '',
                        url
                    }
                });
            }

            const providerPayload = this.extractProviderResponsePayload(
                request.provider || item.provider || '',
                parsedBody,
                rawBody
            );

            responses.push({
                chunkId: item.chunkId,
                chunkIndex: item.chunkIndex,
                result: providerPayload,
                raw: parsedBody || rawBody || null
            });
        }

        return {
            status: 'completed',
            responses,
            providerRawResponse: {
                requestId: Number(context && context.requestId),
                provider: String(this.config.ai && this.config.ai.provider || ''),
                model: String(this.config.ai && this.config.ai.model || ''),
                mode: 'built-in',
                requests: rawRequests
            }
        };
    };

    QuickAddComponent.prototype.buildAIProviderDispatchRequest = function buildAIProviderDispatchRequest(providerRaw, promptRaw) {
        const provider = String(providerRaw || '').trim().toLowerCase();
        const prompt = String(promptRaw || '');
        const ai = this.config.ai || {};
        const apiKey = String(ai.apiKey || '');
        const model = String(ai.model || '');
        const endpoint = String(ai.endpoint || '');
        const forceJson = ai.forceJson !== false;
        const outputType = String(ai.outputType || '').trim().toLowerCase();
        const outputSchema = ai.outputSchema && typeof ai.outputSchema === 'object'
            ? ai.outputSchema
            : null;
        const tools = this.resolveAIProviderTools(provider);
        const temperature = Number(ai.temperature || 0.3);

        if (provider === 'openai') {
            const useResponsesApi = this.hasOpenAIWebSearchTool(tools);
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
                return {
                    provider: 'openai',
                    url: 'https://api.openai.com/v1/responses',
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    payload
                };
            }
            const payload = {
                model: model || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'Return only valid JSON object output.' },
                    { role: 'user', content: prompt }
                ],
                temperature
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
            return {
                provider: 'openai',
                url: 'https://api.openai.com/v1/chat/completions',
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                payload
            };
        }

        if (provider === 'anthropic') {
            const payload = {
                model: model || 'claude-3-haiku-20240307',
                max_tokens: 2048,
                system: 'Return one valid JSON object only. No markdown.',
                messages: [{ role: 'user', content: prompt }]
            };
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
            return {
                provider: 'anthropic',
                url: 'https://api.anthropic.com/v1/messages',
                method: 'POST',
                headers,
                payload
            };
        }

        if (provider === 'google') {
            const defaultModel = this.isAIWebSearchEnabled() ? 'gemini-2.5-flash' : 'gemini-1.5-flash';
            const generationConfig = { temperature };
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
            if (tools && tools.length) {
                payload.tools = tools;
            }
            return {
                provider: 'google',
                url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || defaultModel)}:generateContent?key=${encodeURIComponent(apiKey)}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                payload
            };
        }

        if (provider === 'custom') {
            const payload = {
                model: model || 'default',
                messages: [
                    { role: 'system', content: 'Return only valid JSON object output.' },
                    { role: 'user', content: prompt }
                ],
                temperature
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
            return {
                provider: 'custom',
                url: endpoint,
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                payload
            };
        }

        throw new Error(`Unknown AI provider: ${provider}`);
    };

    QuickAddComponent.prototype.buildAIDispatchBatch = async function buildAIDispatchBatch(input, requestId) {
        const rawInput = String(input || '');
        const chunks = this.resolveAIInputChunks(rawInput);
        const provider = this.assertAIDispatchConfig();
        const ai = this.config.ai || {};

        const batch = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const prompt = await this.buildAIPrompt(chunk.raw);
            const request = this.buildAIProviderDispatchRequest(provider, prompt);
            batch.push({
                requestId,
                chunkId: `${requestId}:${Number.isFinite(Number(chunk.index)) ? Number(chunk.index) : i}`,
                chunkIndex: Number.isFinite(Number(chunk.index)) ? Number(chunk.index) : i,
                start: Number.isFinite(Number(chunk.start)) ? Number(chunk.start) : 0,
                end: Number.isFinite(Number(chunk.end)) ? Number(chunk.end) : 0,
                input: String(chunk.raw || ''),
                prompt,
                provider,
                model: String(ai.model || ''),
                endpoint: String(ai.endpoint || ''),
                request
            });
        }
        return batch;
    };

    QuickAddComponent.prototype.normalizeAIDispatchReason = function normalizeAIDispatchReason(rawReason) {
        const reason = String(rawReason || '').trim().toLowerCase();
        if (reason === 'offline' || reason === 'deferred' || reason === 'rate-limited') {
            return reason;
        }
        return 'custom';
    };

    QuickAddComponent.prototype.normalizeAIDispatchError = function normalizeAIDispatchError(rawError) {
        if (rawError && typeof rawError === 'object') {
            const kind = String(rawError.kind || rawError.code || '').trim().toLowerCase();
            const message = String(rawError.message || '').trim();
            return {
                kind: kind || (this.isLikelyNetworkError(rawError) ? 'offline' : 'error'),
                message: message || 'AI dispatch failed',
                detail: rawError.detail !== undefined ? rawError.detail : undefined
            };
        }
        const message = String(rawError || 'AI dispatch failed');
        return {
            kind: this.isLikelyNetworkError(rawError) ? 'offline' : 'error',
            message
        };
    };

    QuickAddComponent.prototype.extractAIDispatchResponsePayload = function extractAIDispatchResponsePayload(item) {
        if (item === undefined || item === null) {
            return null;
        }
        if (item && typeof item === 'object') {
            if (Object.prototype.hasOwnProperty.call(item, 'result')) {
                return item.result;
            }
            if (Object.prototype.hasOwnProperty.call(item, 'parsed')) {
                return item.parsed;
            }
            if (Object.prototype.hasOwnProperty.call(item, 'responseText')) {
                return item.responseText;
            }
            if (Object.prototype.hasOwnProperty.call(item, 'text')) {
                return item.text;
            }
            if (Object.prototype.hasOwnProperty.call(item, 'content')) {
                return item.content;
            }
            if (Object.prototype.hasOwnProperty.call(item, 'raw')) {
                return item.raw;
            }
        }
        return item;
    };

    QuickAddComponent.prototype.resolveAIDispatchResponseForChunk = function resolveAIDispatchResponseForChunk(responses, requestItem, index) {
        const list = Array.isArray(responses) ? responses : [];
        if (!list.length) {
            return null;
        }
        const chunkId = String(requestItem && requestItem.chunkId ? requestItem.chunkId : '');
        const chunkIndex = Number(requestItem && requestItem.chunkIndex);
        const byId = chunkId
            ? list.find((item) => item && typeof item === 'object' && String(item.chunkId || '') === chunkId)
            : null;
        if (byId) {
            return byId;
        }
        const byIndex = Number.isFinite(chunkIndex)
            ? list.find((item) => item && typeof item === 'object' && Number(item.chunkIndex) === chunkIndex)
            : null;
        if (byIndex) {
            return byIndex;
        }
        return list[index] !== undefined ? list[index] : null;
    };

    QuickAddComponent.prototype.normalizeCompletedAIDispatchResponses = function normalizeCompletedAIDispatchResponses(responses, batch) {
        const requestBatch = Array.isArray(batch) ? batch : [];
        const merged = { entries: [], missing: [], warnings: [] };

        for (let i = 0; i < requestBatch.length; i++) {
            const requestItem = requestBatch[i];
            const responseItem = this.resolveAIDispatchResponseForChunk(responses, requestItem, i);
            const payload = this.extractAIDispatchResponsePayload(responseItem);
            const normalizedItem = this.normalizeAIResponse(this.parseAIResponse(payload));

            merged.entries = merged.entries.concat(
                this.annotateAIEntriesWithSource(
                    normalizedItem.entries,
                    Number.isFinite(Number(requestItem.start)) ? Number(requestItem.start) : 0,
                    Number.isFinite(Number(requestItem.end)) ? Number(requestItem.end) : 0,
                    Number.isFinite(Number(requestItem.chunkIndex)) ? Number(requestItem.chunkIndex) : i
                )
            );
            if (normalizedItem.missing && normalizedItem.missing.length) {
                const missingPrefix = requestBatch.length > 1 ? `entry ${i + 1}: ` : '';
                merged.missing = merged.missing.concat(normalizedItem.missing.map((missing) => `${missingPrefix}${missing}`));
            }
            if (normalizedItem.warnings && normalizedItem.warnings.length) {
                const warningPrefix = requestBatch.length > 1 ? `entry ${i + 1}: ` : '';
                merged.warnings = merged.warnings.concat(normalizedItem.warnings.map((warning) => `${warningPrefix}${warning}`));
            }
        }
        return merged;
    };

    QuickAddComponent.prototype.dispatchAIBatch = async function dispatchAIBatch(batch, context) {
        const ai = this.config.ai || {};
        if (typeof ai.dispatch === 'function') {
            return ai.dispatch(batch, context);
        }
        return this.dispatchAIBatchViaProviderApi(batch, context);
    };

    QuickAddComponent.prototype.clearAIQueuedRequest = function clearAIQueuedRequest() {
        this.aiState.queuedRequest = null;
    };

    QuickAddComponent.prototype.setAIQueuedRequest = function setAIQueuedRequest(details) {
        const payload = details && typeof details === 'object' ? details : {};
        this.aiState.queuedRequest = {
            requestId: Number(payload.requestId),
            input: String(payload.input || ''),
            reason: this.normalizeAIDispatchReason(payload.reason),
            message: payload.message ? String(payload.message) : '',
            queueItems: Array.isArray(payload.queueItems) ? this.cloneAIData(payload.queueItems) : [],
            batch: Array.isArray(payload.batch) ? this.cloneAIData(payload.batch) : []
        };
        this.aiState.error = '';
        this.aiState.errorKind = '';
    };

    QuickAddComponent.prototype.buildAICallerRequest = function buildAICallerRequest(input, batch, requestId) {
        const rawInput = String(input || '');
        const ai = this.config.ai || {};
        const requestBatch = Array.isArray(batch)
            ? batch.map((item) => this.cloneAIData(item))
            : [];
        const chunks = requestBatch.length
            ? requestBatch.map((item, idx) => ({
                index: Number.isFinite(Number(item.chunkIndex)) ? Number(item.chunkIndex) : idx,
                start: Number.isFinite(Number(item.start)) ? Number(item.start) : 0,
                end: Number.isFinite(Number(item.end)) ? Number(item.end) : 0,
                input: String(item.input || '')
            }))
            : this.resolveAIInputChunks(rawInput).map((chunk) => ({
                index: Number.isFinite(Number(chunk.index)) ? Number(chunk.index) : 0,
                start: Number.isFinite(Number(chunk.start)) ? Number(chunk.start) : 0,
                end: Number.isFinite(Number(chunk.end)) ? Number(chunk.end) : 0,
                input: String(chunk.raw || '')
            }));
        return {
            mode: 'ai',
            requestId: Number.isFinite(Number(requestId)) ? Number(requestId) : Number(this.aiState.requestSeq || 0),
            input: rawInput,
            chunks,
            batch: requestBatch,
            provider: String(ai.provider || ''),
            model: String(ai.model || ''),
            endpoint: String(ai.endpoint || ''),
            temperature: Number(ai.temperature || 0.3),
            forceJson: ai.forceJson !== false,
            webSearch: ai.webSearch === true,
            tools: this.normalizeAIToolsForProvider(ai.tools),
            dispatchConfigured: typeof ai.dispatch === 'function',
            promptMode: String(ai.promptMode || 'default'),
            hasCustomResponseParser: typeof ai.parseResponse === 'function'
        };
    };

    QuickAddComponent.prototype.buildAIParseState = function buildAIParseState(rawInput) {
        const input = String(rawInput || '');
        const trimmed = input.trim();
        const minInputLength = Math.max(0, Number(this.config.ai.minInputLength || 0));
        const hasInput = trimmed.length > 0;
        const belowMinLength = hasInput && trimmed.length < minInputLength;
        const snapshotMatch = String(this.aiState.lastParsedInput || '') === input;
        const attemptedForCurrentInput = String(this.aiState.lastAttemptedInput || '') === input;
        const hasCurrentError = attemptedForCurrentInput && !!this.aiState.error;
        const queued = this.aiState.queuedRequest && typeof this.aiState.queuedRequest === 'object'
            ? this.aiState.queuedRequest
            : null;
        const hasQueuedForCurrentInput = !!(
            queued
            && Number(queued.requestId) === Number(this.aiState.requestSeq)
            && String(queued.input || '') === input
        );

        let status = 'stale';
        if (!hasInput) {
            status = 'idle';
        } else if (belowMinLength) {
            status = 'below-min-length';
        } else if (this.aiState.isProcessing) {
            status = 'processing';
        } else if (hasQueuedForCurrentInput) {
            status = 'queued';
        } else if (hasCurrentError) {
            status = this.aiState.errorKind === 'offline' ? 'offline' : 'error';
        } else if (snapshotMatch) {
            status = 'ready';
        }

        const shouldParse = (
            status === 'stale'
            || status === 'error'
            || status === 'offline'
        );
        const queueReason = hasQueuedForCurrentInput ? this.normalizeAIDispatchReason(queued.reason) : '';
        const queueMessage = hasQueuedForCurrentInput ? String(queued.message || '') : '';
        const queueItems = hasQueuedForCurrentInput && Array.isArray(queued.queueItems)
            ? this.cloneAIData(queued.queueItems)
            : [];

        return {
            status,
            isReady: status === 'ready',
            isProcessing: status === 'processing',
            isQueued: status === 'queued',
            isStale: status === 'stale',
            isOffline: status === 'offline' || queueReason === 'offline',
            shouldParse,
            hasInput,
            belowMinLength,
            minInputLength,
            currentInput: input,
            lastParsedInput: String(this.aiState.lastParsedInput || ''),
            error: hasCurrentError ? String(this.aiState.error || '') : '',
            errorKind: hasCurrentError ? String(this.aiState.errorKind || 'error') : '',
            queueReason,
            queueMessage,
            queueItems
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

    QuickAddComponent.prototype.applyAIParseResult = function applyAIParseResult(result) {
        const normalized = this.normalizeAIResponse(result);
        this.aiState.warnings = normalized.warnings;
        this.aiState.missing = normalized.missing;
        this.aiState.error = '';
        this.aiState.errorKind = '';
        this.clearAIQueuedRequest();
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

    QuickAddComponent.prototype.extractAIFromInput = async function extractAIFromInput(input, options) {
        const rawInput = String(input || '');
        const opts = options || {};
        const requestId = Number.isFinite(Number(opts.requestId))
            ? Number(opts.requestId)
            : Number(this.aiState.requestSeq || 0);
        const batch = Array.isArray(opts.batch)
            ? opts.batch
            : await this.buildAIDispatchBatch(rawInput, requestId);
        if (!batch.length) {
            return {
                status: 'completed',
                normalized: { entries: [], missing: [], warnings: [] },
                responses: [],
                providerRawResponse: '',
                batch
            };
        }

        const context = Object.assign({
            mode: 'ai',
            requestId,
            input: rawInput,
            source: opts.source || 'extract',
            timestamp: Date.now()
        }, opts.context || {});
        const dispatchResult = await this.dispatchAIBatch(batch, context);
        const status = String(dispatchResult && dispatchResult.status ? dispatchResult.status : '').trim().toLowerCase();
        if (status === 'queued') {
            return {
                status: 'queued',
                reason: this.normalizeAIDispatchReason(dispatchResult.reason),
                message: dispatchResult.message ? String(dispatchResult.message) : '',
                queueItems: Array.isArray(dispatchResult.queueItems) ? dispatchResult.queueItems : [],
                responses: [],
                providerRawResponse: dispatchResult.providerRawResponse,
                batch
            };
        }
        if (status !== 'completed') {
            throw new Error('Invalid ai.dispatch result: expected status "completed" or "queued"');
        }

        const responses = Array.isArray(dispatchResult.responses) ? dispatchResult.responses : [];
        const normalized = this.normalizeCompletedAIDispatchResponses(responses, batch);
        return {
            status: 'completed',
            normalized,
            responses,
            providerRawResponse: dispatchResult.providerRawResponse,
            batch
        };
    };

    QuickAddComponent.prototype.parseAI = async function parseAI(options) {
        if (!this.isAiMode()) {
            return;
        }
        const currentInput = String(this.inputText || this.readInputText() || '');
        const opts = options || {};
        const input = currentInput;
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
        this.clearAIQueuedRequest();
        this.aiState.providerRawResponse = '';
        this.parseAndRender({ source: this.inputText, skipTypingSync: true });

        try {
            const batch = await this.buildAIDispatchBatch(input, requestId);
            if (requestId !== this.aiState.requestSeq) {
                return;
            }
            this.aiState.callerRequest = this.buildAICallerRequest(input, batch, requestId);
            this.parseAndRender({ source: this.inputText, skipTypingSync: true });

            const dispatchOutcome = await this.extractAIFromInput(input, {
                requestId,
                batch,
                source: opts.force ? 'manual-parse' : 'auto-parse'
            });
            if (requestId !== this.aiState.requestSeq) {
                return;
            }

            if (dispatchOutcome.status === 'queued') {
                this.setAIQueuedRequest({
                    requestId,
                    input,
                    reason: dispatchOutcome.reason,
                    message: dispatchOutcome.message,
                    queueItems: dispatchOutcome.queueItems,
                    batch
                });
                this.aiState.providerRawResponse = this.serializeAIProviderRawResponse(
                    dispatchOutcome.providerRawResponse !== undefined
                        ? dispatchOutcome.providerRawResponse
                        : dispatchOutcome.queueItems
                );
            } else {
                this.aiState.providerRawResponse = this.serializeAIProviderRawResponse(
                    dispatchOutcome.providerRawResponse !== undefined
                        ? dispatchOutcome.providerRawResponse
                        : dispatchOutcome.responses
                );
                this.applyAIParseResult(dispatchOutcome.normalized);
                this.aiState.lastParsedInput = input;
            }
        } catch (err) {
            if (requestId !== this.aiState.requestSeq) {
                return;
            }
            const normalizedError = this.normalizeAIDispatchError(err);
            this.aiState.error = normalizedError.message;
            this.aiState.errorKind = normalizedError.kind === 'offline' ? 'offline' : 'error';
        } finally {
            if (requestId === this.aiState.requestSeq) {
                this.aiState.isProcessing = false;
            }
            this.parseAndRender({ source: this.inputText });
        }
    };

    QuickAddComponent.prototype.applyQueuedAIResult = function applyQueuedAIResult(payload) {
        if (!this.isAiMode()) {
            return false;
        }
        const data = payload && typeof payload === 'object' ? payload : {};
        const requestId = Number(data.requestId);
        const queued = this.aiState.queuedRequest;
        if (
            !Number.isFinite(requestId)
            || !queued
            || Number(queued.requestId) !== requestId
            || Number(this.aiState.requestSeq) !== requestId
        ) {
            return false;
        }
        const currentInput = String(this.inputText || this.readInputText() || '');
        if (currentInput !== String(queued.input || '')) {
            return false;
        }
        const batch = Array.isArray(queued.batch) ? queued.batch : [];
        const responses = Array.isArray(data.responses) ? data.responses : [];
        const normalized = this.normalizeCompletedAIDispatchResponses(responses, batch);
        this.aiState.providerRawResponse = this.serializeAIProviderRawResponse(
            data.providerRawResponse !== undefined
                ? data.providerRawResponse
                : responses
        );
        this.applyAIParseResult(normalized);
        this.aiState.lastParsedInput = String(queued.input || '');
        this.aiState.isProcessing = false;
        this.parseAndRender({ source: this.inputText });
        return true;
    };

    QuickAddComponent.prototype.applyQueuedAIError = function applyQueuedAIError(payload) {
        if (!this.isAiMode()) {
            return false;
        }
        const data = payload && typeof payload === 'object' ? payload : {};
        const requestId = Number(data.requestId);
        const queued = this.aiState.queuedRequest;
        if (
            !Number.isFinite(requestId)
            || !queued
            || Number(queued.requestId) !== requestId
            || Number(this.aiState.requestSeq) !== requestId
        ) {
            return false;
        }
        const currentInput = String(this.inputText || this.readInputText() || '');
        if (currentInput !== String(queued.input || '')) {
            return false;
        }
        const normalizedError = this.normalizeAIDispatchError(data.error || data);
        this.clearAIQueuedRequest();
        this.aiState.isProcessing = false;
        this.aiState.error = normalizedError.message;
        this.aiState.errorKind = normalizedError.kind === 'offline' ? 'offline' : 'error';
        this.parseAndRender({ source: this.inputText });
        return true;
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
        this.clearAIQueuedRequest();
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

    QuickAddComponent.prototype.buildDeterministicEntryDeleteKey = function buildDeterministicEntryDeleteKey(entry, sourceText) {
        if (!entry || !Number.isFinite(Number(entry.globalStart)) || !Number.isFinite(Number(entry.globalEnd))) {
            return '';
        }
        const start = Number(entry.globalStart);
        const end = Number(entry.globalEnd);
        if (end <= start) {
            return '';
        }
        const source = String(sourceText === undefined ? (this.inputText || this.readInputText() || '') : sourceText);
        const chunk = source.slice(start, end).trim().toLowerCase();
        return `${start}:${end}:${chunk}`;
    };

    QuickAddComponent.prototype.isDeterministicEntryDeleted = function isDeterministicEntryDeleted(entry, sourceText) {
        const key = this.buildDeterministicEntryDeleteKey(entry, sourceText);
        if (!key) {
            return false;
        }
        return this.deterministicDeletedEntries.has(key);
    };

    QuickAddComponent.prototype.markDeterministicEntryDeleted = function markDeterministicEntryDeleted(entry, deleted, sourceText) {
        const key = this.buildDeterministicEntryDeleteKey(entry, sourceText);
        if (!key) {
            return false;
        }
        if (deleted) {
            this.deterministicDeletedEntries.add(key);
        } else {
            this.deterministicDeletedEntries.delete(key);
        }
        return true;
    };

    QuickAddComponent.prototype.applyDeterministicDeletedEntries = function applyDeterministicDeletedEntries(result) {
        if (!result || this.isAiMode()) {
            return result;
        }
        const entries = Array.isArray(result.entries) ? result.entries : [];
        const source = String(result.input === undefined ? (this.inputText || this.readInputText() || '') : result.input);
        const activeKeys = new Set();
        entries.forEach((entry) => {
            const key = this.buildDeterministicEntryDeleteKey(entry, source);
            if (!key) {
                return;
            }
            activeKeys.add(key);
            const deleted = this.deterministicDeletedEntries.has(key);
            entry.detMeta = Object.assign({}, entry.detMeta || {}, { deleted });
            if (deleted) {
                entry.isValid = false;
            }
        });
        this.deterministicDeletedEntries.forEach((key) => {
            if (!activeKeys.has(key)) {
                this.deterministicDeletedEntries.delete(key);
            }
        });
        const validCount = entries.filter((entry) => entry && entry.isValid).length;
        result.validCount = validCount;
        result.invalidCount = Math.max(0, entries.length - validCount);
        return result;
    };

    QuickAddComponent.prototype.buildAIResult = function buildAIResult() {
        const input = String(this.inputText || '');
        const parseState = this.buildAIParseState(input);
        const callerRequest = parseState.hasInput
            ? (this.aiState.callerRequest && this.aiState.callerRequest.input === input
                ? this.cloneAIData(this.aiState.callerRequest)
                : null)
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
                            aria-label="${escHtml(this.config.a11y.inputAriaLabel)}"
                            spellcheck="false"
                            data-placeholder="${escHtml(this.config.placeholder)}"
                        ></div>
                        <button type="button" class="${c.inputClearBtn}" data-role="inputClear" aria-label="Clear input" title="Clear input" hidden>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path fill="currentColor" d="M19 15.59L17.59 17L14 13.41L10.41 17L9 15.59L12.59 12L9 8.41L10.41 7L14 10.59L17.59 7L19 8.41L15.41 12zM22 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7c-.69 0-1.23-.36-1.59-.89L0 12l5.41-8.12C5.77 3.35 6.31 3 7 3zm0 2H7l-4.72 7L7 19h15z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="${c.fieldActionBar}" data-role="fieldActionBar" hidden></div>
                    <div class="${c.hint}">${escHtml(hint)}</div>
                </div>
                <div class="${c.status}" data-role="status" role="status" aria-live="polite"></div>
                <div class="${c.preview}" data-role="preview"></div>
                ${outputBlock}
                <div class="${c.dropdown}" data-role="dropdown" hidden>
                    <textarea class="${c.dropdownSearch}" data-role="dropdownSearch" rows="1" placeholder="Filter options..." spellcheck="false"></textarea>
                    <div class="${c.dropdownListWrap}">
                        <div class="${c.dropdownList}" data-role="dropdownList" role="listbox" id="${this.dropdownListId}"></div>
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
            </div>
        `;

        this.rootEl = this.mountEl.querySelector('[data-role="root"]');
        this.inputSurfaceEl = this.mountEl.querySelector('[data-role="inputSurface"]');
        this.inputEl = this.mountEl.querySelector('[data-role="input"]');
        this.inputClearBtnEl = this.mountEl.querySelector('[data-role="inputClear"]');
        this.fieldActionBarEl = this.mountEl.querySelector('[data-role="fieldActionBar"]');
        this.statusEl = this.mountEl.querySelector('[data-role="status"]');
        this.previewEl = this.mountEl.querySelector('[data-role="preview"]');
        this.outputEl = this.mountEl.querySelector('[data-role="output"]');
        this.dropdownEl = this.mountEl.querySelector('[data-role="dropdown"]');
        this.dropdownSearchEl = this.mountEl.querySelector('[data-role="dropdownSearch"]');
        this.dropdownListEl = this.mountEl.querySelector('[data-role="dropdownList"]');
        this.attachmentSourceMenuEl = this.mountEl.querySelector('[data-role="attachmentSourceMenu"]');
        this.conflictModalOverlayEl = this.mountEl.querySelector('[data-role="conflictModalOverlay"]');
        this.conflictModalEl = this.mountEl.querySelector('[data-role="conflictModal"]');
        this.datePickerEl = this.mountEl.querySelector('[data-role="datePicker"]');
        this.datePickerTitleEl = this.mountEl.querySelector('[data-role="datePickerTitle"]');
        this.datePickerWeekdaysEl = this.mountEl.querySelector('[data-role="datePickerWeekdays"]');
        this.datePickerGridEl = this.mountEl.querySelector('[data-role="datePickerGrid"]');
        this.datePickerQuickEl = this.mountEl.querySelector('[data-role="datePickerQuick"]');
        this.datePickerTimeEl = this.mountEl.querySelector('[data-role="datePickerTime"]');
        this.blockedInfoEl = null;
        this.renderFieldActionBar();
        this.syncDropdownA11y();
    };

    QuickAddComponent.prototype.syncInputClearButton = function syncInputClearButton() {
        if (!this.inputClearBtnEl) {
            return;
        }
        const isMobileViewport = typeof window !== 'undefined'
            && typeof window.matchMedia === 'function'
            && window.matchMedia('(max-width: 640px)').matches;
        const hasValue = String(this.inputText || this.readInputText() || '').length > 0;
        const shouldShow = isMobileViewport && hasValue;
        this.inputClearBtnEl.hidden = !shouldShow;
        this.inputClearBtnEl.disabled = !shouldShow;
    };

    QuickAddComponent.prototype.clearInputFromControl = function clearInputFromControl() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.setInput('');
        this.syncInputClearButton();
        if (this.inputEl) {
            this.setCaretOffset(0, true);
        }
    };

    QuickAddComponent.prototype.applyTokens = function applyTokens() {
        const tokens = this.config.tokens || {};
        Object.keys(tokens).forEach((name) => {
            if (name.startsWith('--')) {
                this.rootEl.style.setProperty(name, String(tokens[name]));
            }
        });
        const colorScheme = String(tokens['--qa-color-scheme'] || '').trim().toLowerCase() === 'dark' ? 'dark' : 'light';
        this.rootEl.setAttribute('data-color-scheme', colorScheme);
        if (this.config.fontFamily) {
            this.rootEl.style.setProperty('--qa-font', String(this.config.fontFamily));
        } else {
            this.rootEl.style.removeProperty('--qa-font');
        }
        this.rootEl.setAttribute('data-pill-color-style', this.config.pillColorStyle === 'border' ? 'border' : 'background');
    };

    QuickAddComponent.prototype.isFieldActionApplyAllActive = function isFieldActionApplyAllActive() {
        return this.config.fieldActionBarApplyToAllToggle === true && this.fieldActionApplyToAllEnabled === true;
    };

    QuickAddComponent.prototype.getEntryFieldCurrentValueForActionBar = function getEntryFieldCurrentValueForActionBar(entryIndex, fieldKey) {
        if (!Number.isFinite(Number(entryIndex)) || !fieldKey) {
            return '';
        }
        const entry = (this.lastResult.entries || []).find((item) => Number(item.index) === Number(entryIndex));
        if (!entry) {
            return '';
        }
        const values = this.resolveEntryFieldValues(entry, fieldKey);
        if (!values.length) {
            return '';
        }
        const field = this.getFieldDefinition(fieldKey);
        if (field && field.multiple) {
            const separator = String(this.config.multiSelectSeparator || ',');
            return values.join(`${separator} `);
        }
        return String(values[values.length - 1]);
    };

    QuickAddComponent.prototype.getActionBarValuePreview = function getActionBarValuePreview(entryIndex, fieldKey) {
        const rawValue = this.getEntryFieldCurrentValueForActionBar(entryIndex, fieldKey);
        if (!rawValue) {
            return '';
        }
        const compact = String(rawValue).replace(/\s+/g, ' ').trim();
        if (!compact) {
            return '';
        }
        return compact.length > 42 ? `${compact.slice(0, 41).trimEnd()}…` : compact;
    };

    QuickAddComponent.prototype.getFieldActionBarItems = function getFieldActionBarItems() {
        if (this.config.showFieldActionBar !== true) {
            return [];
        }
        const buttons = Array.isArray(this.config.fieldActionBarButtons) ? this.config.fieldActionBarButtons : [];
        if (!buttons.length) {
            return [];
        }
        const activeEntryIndex = this.resolvePreferredEntryIndexForFieldAction();
        const showMetaIndicators = this.config.fieldActionBarShowMetaIndicators !== false;
        const expandOnValue = this.config.fieldActionBarExpandOnValue !== false && !this.isFieldActionApplyAllActive();
        return buttons
            .filter((item) => item && item.visible !== false)
            .map((item) => {
                const field = this.getFieldDefinition(item.fieldKey);
                if (!field) {
                    return null;
                }
                const label = String(field.label || field.key || '').trim() || String(field.key || '').trim();
                if (!label) {
                    return null;
                }
                const iconSvg = sanitizeInlineSvgMarkup(item.iconSvg);
                const required = showMetaIndicators && !!field.required;
                const autoDetect = showMetaIndicators && !!(
                    field.autoDetectWithoutPrefix === true
                    || (this.config.autoDetectOptionsWithoutPrefix && field.autoDetectWithoutPrefix !== false)
                );
                const currentValue = expandOnValue && item.expandOnValue !== false
                    ? this.getActionBarValuePreview(activeEntryIndex, field.key)
                    : '';
                const expanded = !!currentValue;
                return {
                    fieldKey: String(field.key),
                    label,
                    showLabel: item.showLabel !== false && !expanded,
                    iconSvg,
                    required,
                    autoDetect,
                    currentValue,
                    expanded
                };
            })
            .filter(Boolean);
    };

    QuickAddComponent.prototype.renderFieldActionBar = function renderFieldActionBar() {
        if (!this.fieldActionBarEl) {
            return;
        }
        if (this.config.fieldActionBarApplyToAllToggle === true) {
            const existingToggle = this.fieldActionBarEl.querySelector('[data-field-action-apply-all="1"]');
            if (existingToggle) {
                this.fieldActionApplyToAllEnabled = existingToggle.checked === true;
            }
        }
        const c = this.config.classNames;
        const items = this.getFieldActionBarItems();
        if (!items.length) {
            this.fieldActionBarEl.innerHTML = '';
            this.fieldActionBarEl.hidden = true;
            return;
        }
        const buttonsHtml = items.map((item) => {
            const iconHtml = item.iconSvg
                ? `<span class="${c.fieldActionBtnIcon}" aria-hidden="true">${item.iconSvg}</span>`
                : `<span class="${c.fieldActionBtnIcon}" aria-hidden="true">${escHtml((item.label || '?').slice(0, 2).toUpperCase())}</span>`;
            const labelHtml = item.showLabel !== false
                ? `<span class="${c.fieldActionBtnLabel}">${escHtml(item.label)}</span>`
                : '';
            const valueHtml = item.currentValue
                ? `<span class="${c.fieldActionBtnValue}" title="${escHtml(item.currentValue)}">${escHtml(item.currentValue)}</span>`
                : '';
            const metaBadges = [];
            if (item.required) {
                metaBadges.push(`<span class="${c.fieldActionBtnMetaBadge} ${c.fieldActionBtnMetaBadgeRequired}" title="Required">${ACTION_META_REQUIRED_ICON}</span>`);
            }
            if (item.autoDetect) {
                metaBadges.push(`<span class="${c.fieldActionBtnMetaBadge} ${c.fieldActionBtnMetaBadgeAuto}" title="Auto">${ACTION_META_AUTO_ICON}</span>`);
            }
            const metaHtml = metaBadges.length
                ? `<span class="${c.fieldActionBtnMeta}" aria-hidden="true">${metaBadges.join('')}</span>`
                : '';
            const classList = [
                c.fieldActionBtn,
                item.currentValue ? c.fieldActionBtnExpanded : '',
                metaBadges.length ? c.fieldActionBtnWithMeta : ''
            ].filter(Boolean).join(' ');
            return `<button type="button" class="${classList}" data-field-action-btn="1" data-field-key="${escHtml(item.fieldKey)}" aria-label="${escHtml(item.label)}">${metaHtml}${iconHtml}${labelHtml}${valueHtml}</button>`;
        }).join('');
        const applyAllEnabled = this.isFieldActionApplyAllActive();
        const applyAllToggleHtml = this.config.fieldActionBarApplyToAllToggle === true
            ? `<label class="${c.fieldActionApplyAll}"><input type="checkbox" class="${c.fieldActionApplyAllCheckbox}" data-field-action-apply-all="1"${applyAllEnabled ? ' checked' : ''}><span class="${c.fieldActionApplyAllLabel}">${escHtml(String(this.config.fieldActionBarApplyToAllLabel || 'Apply to all'))}</span></label>`
            : '';
        this.fieldActionBarEl.innerHTML = `${applyAllToggleHtml}<div class="${c.fieldActionBarButtons}">${buttonsHtml}</div>`;
        if (this.rootEl) {
            this.rootEl.setAttribute('data-field-action-apply-all', applyAllEnabled ? '1' : '0');
        }
        this.fieldActionBarEl.hidden = false;
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

    QuickAddComponent.prototype.captureFocusOrigin = function captureFocusOrigin(kind, openerEl, fallbackEl) {
        const key = String(kind || '');
        if (!key) {
            return;
        }
        const active = document.activeElement;
        const openerFocusTarget = findFocusableElement(openerEl) || openerEl || null;
        this.focusOrigins[key] = {
            openerEl: openerFocusTarget,
            activeEl: active && active !== document.body ? active : null,
            fallbackEl: fallbackEl || this.inputEl || null
        };
    };

    QuickAddComponent.prototype.restoreFocusOrigin = function restoreFocusOrigin(kind) {
        const key = String(kind || '');
        if (!key) {
            return false;
        }
        const origin = this.focusOrigins[key] || null;
        this.focusOrigins[key] = null;
        if (!origin) {
            return false;
        }
        if (focusElementIfPossible(origin.openerEl)) {
            return true;
        }
        if (focusElementIfPossible(origin.activeEl)) {
            return true;
        }
        return focusElementIfPossible(origin.fallbackEl || this.inputEl);
    };

    QuickAddComponent.prototype.shouldRefocusInputAfterCommit = function shouldRefocusInputAfterCommit(options) {
        const opts = options || {};
        if (opts.source === 'typing' || opts.source === 'field-menu') {
            return true;
        }
        if (opts.sourceRegion === 'card') {
            return false;
        }
        const anchorEl = opts.anchorEl || null;
        return !!(anchorEl && this.inputSurfaceEl && this.inputSurfaceEl.contains(anchorEl));
    };

    QuickAddComponent.prototype.syncDropdownA11y = function syncDropdownA11y() {
        const isOpen = !!(this.dropdownEl && !this.dropdownEl.hidden && this.dropdownState);
        const activeValue = isOpen && this.dropdownState ? this.dropdownState.activeOptionValue : null;
        let activeId = '';
        if (isOpen && activeValue !== undefined && activeValue !== null) {
            const options = Array.from(this.dropdownListEl.querySelectorAll('[data-option-value]'));
            const activeNode = options.find((node) => normValue(node.getAttribute('data-option-value')) === normValue(activeValue));
            activeId = activeNode ? String(activeNode.id || '') : '';
        }
        const inputEl = this.inputEl || null;
        const searchEl = this.dropdownSearchEl || null;
        [inputEl, searchEl].forEach((el) => {
            if (!el) {
                return;
            }
            el.setAttribute('aria-controls', this.dropdownListId);
            el.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            if (activeId) {
                el.setAttribute('aria-activedescendant', activeId);
            } else {
                el.removeAttribute('aria-activedescendant');
            }
        });
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
        this.captureFocusOrigin('datePicker', options.anchorEl || null, this.inputEl);
        this.closeBlockedInfo({ restoreFocus: false });
        this.closeDropdown({ restoreFocus: false });
        this.closeNumberPicker();
        this.closeAttachmentSourceMenu({ restoreFocus: false });
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
            cleanupTokenIdOnClose: options.cleanupTokenIdOnClose ? String(options.cleanupTokenIdOnClose) : '',
            entryIndex: options.entryIndex,
            anchorEl: options.anchorEl || null,
            fieldType: options.field.type,
            source: options.source || 'click',
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
            applyToAll: options.applyToAll === true,
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

    QuickAddComponent.prototype.closeDatePicker = function closeDatePicker(options) {
        const opts = options || {};
        const previousState = this.datePickerState;
        const cleanupTokenId = previousState && previousState.cleanupTokenIdOnClose
            ? String(previousState.cleanupTokenIdOnClose)
            : '';
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
        if (cleanupTokenId && opts.discardPendingToken !== false) {
            this.discardPendingTokenById(cleanupTokenId, { focusInput: false });
        }
        if (opts.restoreFocus !== false) {
            this.restoreFocusOrigin('datePicker');
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

    QuickAddComponent.prototype.closeNumberPicker = function closeNumberPicker() {
    };

    QuickAddComponent.prototype.measureFloatingPanelHeight = function measureFloatingPanelHeight(panelEl, width) {
        if (!panelEl) {
            return 0;
        }
        const prevHidden = panelEl.hidden;
        const prevVisibility = panelEl.style.visibility;
        const prevDisplay = panelEl.style.display;
        const prevWidth = panelEl.style.width;
        const prevMaxHeight = panelEl.style.maxHeight;

        panelEl.hidden = false;
        panelEl.style.visibility = 'hidden';
        panelEl.style.removeProperty('display');
        panelEl.style.width = `${Math.max(0, Number(width) || 0)}px`;
        panelEl.style.removeProperty('max-height');

        const measuredHeight = Math.ceil(panelEl.getBoundingClientRect().height || panelEl.scrollHeight || 0);

        if (prevHidden) {
            panelEl.hidden = true;
        }
        panelEl.style.visibility = prevVisibility;
        if (prevDisplay) {
            panelEl.style.display = prevDisplay;
        } else {
            panelEl.style.removeProperty('display');
        }
        if (prevWidth) {
            panelEl.style.width = prevWidth;
        } else {
            panelEl.style.removeProperty('width');
        }
        if (prevMaxHeight) {
            panelEl.style.maxHeight = prevMaxHeight;
        } else {
            panelEl.style.removeProperty('max-height');
        }

        return measuredHeight;
    };

    QuickAddComponent.prototype.computeFloatingLayout = function computeFloatingLayout(options) {
        const opts = options || {};
        const anchorRect = opts.anchorRect || this.getCaretClientRect();
        const anchorEl = opts.anchorEl || this.inputEl;
        const pad = Number.isFinite(Number(opts.pad))
            ? Number(opts.pad)
            : (window.innerWidth <= 480 ? 8 : 10);
        const gap = Number.isFinite(Number(opts.gap)) ? Number(opts.gap) : 0;
        const bounds = this.getFloatingBounds(
            opts.ignoreAnchorClip ? null : anchorEl,
            { includeMountBounds: opts.ignoreAnchorClip !== true }
        );
        const viewportWidth = Math.max(0, (bounds.right - bounds.left) - (pad * 2));

        const minWidthRaw = Number(opts.minWidth);
        const maxWidthRaw = Number(opts.maxWidth);
        const preferredWidthRaw = Number(opts.preferredWidth);
        const minWidth = Number.isFinite(minWidthRaw) && minWidthRaw > 0 ? minWidthRaw : 0;
        const maxWidth = Number.isFinite(maxWidthRaw) && maxWidthRaw > 0
            ? maxWidthRaw
            : Math.max(0, viewportWidth);
        const preferredWidth = Number.isFinite(preferredWidthRaw) && preferredWidthRaw > 0
            ? preferredWidthRaw
            : Math.max(minWidth, Math.min(maxWidth, viewportWidth));

        let width = Math.max(minWidth, Math.min(preferredWidth, maxWidth, viewportWidth));
        if (!Number.isFinite(width)) {
            width = Math.max(0, Math.min(maxWidth, viewportWidth));
        }

        const minLeft = bounds.left + pad;
        const maxLeft = bounds.right - width - pad;
        const align = opts.align === 'end' ? 'end' : (opts.align === 'center' ? 'center' : 'start');
        const anchorLeft = Number.isFinite(Number(anchorRect.left)) ? Number(anchorRect.left) : minLeft;
        const anchorRight = Number.isFinite(Number(anchorRect.right)) ? Number(anchorRect.right) : anchorLeft;
        let preferredLeft = anchorLeft;
        if (align === 'center') {
            preferredLeft = anchorLeft + ((anchorRight - anchorLeft) - width) / 2;
        } else if (align === 'end') {
            preferredLeft = anchorRight - width;
        }
        const left = maxLeft >= minLeft
            ? Math.max(minLeft, Math.min(preferredLeft, maxLeft))
            : minLeft;

        const measuredHeight = this.measureFloatingPanelHeight(opts.panelEl, width);
        const fallbackHeightRaw = Number(opts.fallbackHeight);
        const fallbackHeight = Number.isFinite(fallbackHeightRaw) && fallbackHeightRaw > 0 ? fallbackHeightRaw : 0;
        const maxPanelHeightRaw = Number(opts.maxPanelHeight);
        const maxPanelHeight = Number.isFinite(maxPanelHeightRaw) && maxPanelHeightRaw > 0
            ? maxPanelHeightRaw
            : Number.POSITIVE_INFINITY;
        const desiredHeight = Math.min(maxPanelHeight, Math.max(1, measuredHeight || fallbackHeight || 1));

        const minTop = bounds.top + pad;
        const maxBottom = bounds.bottom - pad;
        const anchorTop = Number.isFinite(Number(anchorRect.top)) ? Number(anchorRect.top) : minTop;
        const anchorBottom = Number.isFinite(Number(anchorRect.bottom)) ? Number(anchorRect.bottom) : anchorTop;
        const belowTop = anchorBottom + gap;
        const aboveBottom = anchorTop - gap;
        const availableBelow = Math.max(0, maxBottom - belowTop);
        const availableAbove = Math.max(0, aboveBottom - minTop);

        const preferredPlacement = opts.preferredPlacement === 'top' ? 'top' : 'bottom';
        const allowFlip = opts.flip !== false;
        let placeBelow = preferredPlacement !== 'top';
        if (allowFlip) {
            if (placeBelow && availableBelow < desiredHeight && availableAbove > availableBelow) {
                placeBelow = false;
            } else if (!placeBelow && availableAbove < desiredHeight && availableBelow > availableAbove) {
                placeBelow = true;
            }
        }

        const availableHeight = Math.max(0, placeBelow ? availableBelow : availableAbove);
        const allowExpand = opts.allowExpand === true;
        const panelHeight = Math.max(
            0,
            Math.min(
                maxPanelHeight,
                allowExpand ? availableHeight : Math.min(availableHeight, desiredHeight)
            )
        );

        const rawTop = placeBelow ? belowTop : (aboveBottom - panelHeight);
        const maxTop = Math.max(minTop, maxBottom - panelHeight);
        const top = Math.max(minTop, Math.min(rawTop, maxTop));

        return {
            bounds,
            viewportWidth,
            width,
            left,
            top,
            panelHeight,
            placement: placeBelow ? 'bottom' : 'top',
            availableBelow,
            availableAbove
        };
    };

    QuickAddComponent.prototype.adjustNumberPillValue = async function adjustNumberPillValue(pillEl, direction) {
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
            const commitValidation = await this.runBeforeCommitField({
                entryIndex,
                entryKey: entryId,
                fieldKey,
                nextValue,
                source: 'stepper',
                sourceRegion,
                fieldType: 'number'
            });
            if (!commitValidation.allow) {
                this.statusEl.textContent = commitValidation.reason || 'Value blocked';
                return false;
            }
            nextValue = Number(commitValidation.value);
            if (!Number.isFinite(nextValue)) {
                this.statusEl.textContent = 'Invalid value from beforeCommitField';
                return false;
            }
            if (commitValidation.warning) {
                this.statusEl.textContent = commitValidation.warning;
            }
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
            const entry = (this.lastResult.entries || []).find((item) => item.index === entryIndex);
            if (entry && entry.fields) {
                const entryValue = entry.fields[fieldKey];
                if (Array.isArray(entryValue)) {
                    baseValue = Number(entryValue[0]);
                } else {
                    baseValue = Number(entryValue);
                }
            }
        }
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
        const commitValidation = await this.runBeforeCommitField({
            entryIndex,
            entryKey: entryIndex,
            fieldKey,
            nextValue,
            source: 'stepper',
            sourceRegion,
            fieldType: 'number'
        });
        if (!commitValidation.allow) {
            this.statusEl.textContent = commitValidation.reason || 'Value blocked';
            return false;
        }
        nextValue = Number(commitValidation.value);
        if (!Number.isFinite(nextValue)) {
            this.statusEl.textContent = 'Invalid value from beforeCommitField';
            return false;
        }
        if (commitValidation.warning) {
            this.statusEl.textContent = commitValidation.warning;
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

    QuickAddComponent.prototype.getFloatingBounds = function getFloatingBounds(anchorEl, options) {
        const opts = options || {};
        const includeMountBounds = opts.includeMountBounds !== false;
        const viewport = {
            left: 0,
            top: 0,
            right: window.innerWidth,
            bottom: window.innerHeight
        };
        const isValidRect = (rect) => rect && (rect.right - rect.left) > 24 && (rect.bottom - rect.top) > 24;
        const intersectRect = (rect, axes) => {
            if (!rect) {
                return;
            }
            if (axes.x) {
                bounds.left = Math.max(bounds.left, rect.left);
                bounds.right = Math.min(bounds.right, rect.right);
            }
            if (axes.y) {
                bounds.top = Math.max(bounds.top, rect.top);
                bounds.bottom = Math.min(bounds.bottom, rect.bottom);
            }
        };
        const getClipAxes = (style) => {
            const overflowX = String(style.overflowX || style.overflow || '').toLowerCase();
            const overflowY = String(style.overflowY || style.overflow || '').toLowerCase();
            const clips = (value) => value === 'auto' || value === 'scroll' || value === 'hidden' || value === 'clip';
            return {
                x: clips(overflowX),
                y: clips(overflowY)
            };
        };
        const isDialogBoundary = (el) => {
            if (!el || !el.getAttribute) {
                return false;
            }
            if (el.hasAttribute('data-qa-floating-boundary')) {
                return true;
            }
            const role = String(el.getAttribute('role') || '').toLowerCase();
            if (role === 'dialog' || role === 'alertdialog') {
                return true;
            }
            const ariaModal = String(el.getAttribute('aria-modal') || '').toLowerCase();
            if (ariaModal === 'true') {
                return true;
            }
            return String(el.tagName || '').toLowerCase() === 'dialog';
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
                const fixedPos = style.position === 'fixed';
                const forceBoundary = fixedPos || isDialogBoundary(el);
                let rect = null;
                if (clipAxes.x || clipAxes.y) {
                    rect = el.getBoundingClientRect();
                    intersectRect(rect, clipAxes);
                }
                if (forceBoundary) {
                    rect = rect || el.getBoundingClientRect();
                    intersectRect(rect, { x: true, y: true });
                }
                if (fixedPos) {
                    break;
                }
                el = el.parentElement;
            }
        };

        if (anchorEl) {
            applyAncestors(anchorEl);
        }
        if (includeMountBounds && this.mountEl) {
            applyAncestors(this.mountEl);
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
        const hasTime = !!(this.datePickerState && this.datePickerState.fieldType === 'datetime');
        const compactMax = window.innerWidth <= 480
            ? (hasTime ? 328 : 304)
            : (hasTime ? 356 : 324);
        const compactMin = window.innerWidth <= 480
            ? (hasTime ? 278 : 252)
            : (hasTime ? 308 : 286);
        const preferredWidth = Math.max(compactMin, (rect.width || 0) + 28);
        const fallbackHeight = window.innerWidth <= 480
            ? (hasTime ? 410 : 290)
            : (hasTime ? 360 : 280);
        const layout = this.computeFloatingLayout({
            panelEl: this.datePickerEl,
            anchorRect: rect,
            anchorEl: anchorEl || this.inputEl,
            ignoreAnchorClip: true,
            minWidth: compactMin,
            maxWidth: compactMax,
            preferredWidth,
            gap: 8,
            fallbackHeight,
            preferredPlacement: 'bottom',
            flip: true,
            allowExpand: false
        });
        this.datePickerEl.style.position = 'fixed';
        this.datePickerEl.style.left = `${layout.left}px`;
        this.datePickerEl.style.top = `${layout.top}px`;
        this.datePickerEl.style.width = `${layout.width}px`;
        this.datePickerEl.style.maxWidth = `${Math.max(0, layout.viewportWidth)}px`;
        this.datePickerEl.style.maxHeight = `${Math.floor(layout.panelHeight)}px`;
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

    QuickAddComponent.prototype.applyDateSelection = async function applyDateSelection(nextValue) {
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
        const commitValidation = await this.runBeforeCommitField({
            entryIndex: this.datePickerState.entryIndex,
            entryKey: this.datePickerState.aiContext
                ? this.datePickerState.aiContext.entryId
                : this.datePickerState.entryIndex,
            fieldKey: this.datePickerState.fieldKey,
            nextValue: commitValue,
            source: 'click',
            sourceRegion: this.datePickerState.sourceRegion || 'inline',
            fieldType: this.datePickerState.fieldType
        });
        if (!commitValidation.allow) {
            this.statusEl.textContent = commitValidation.reason || 'Date value blocked';
            return;
        }
        commitValue = String(commitValidation.value);
        if (commitValidation.warning) {
            this.statusEl.textContent = commitValidation.warning;
        }
        this.datePickerState.selectedValue = commitValue;
        this.datePickerState.cleanupTokenIdOnClose = '';

        if (this.datePickerState.aiContext) {
            const context = Object.assign({}, this.datePickerState.aiContext);
            const sourceRegion = this.datePickerState.sourceRegion || 'inline';
            this.datePickerSuppressUntil = Date.now() + 150;
            this.closeDatePicker();
            this.applyAIFieldSelection({
                entryId: context.entryId,
                fieldKey: context.fieldKey,
                currentValue: context.currentValue,
                occurrence: context.occurrence,
                mappingKey: context.mappingKey,
                nextValue: commitValue,
                sourceRegion: context.sourceRegion || sourceRegion
            });
            return;
        }
        if (this.datePickerState.applyToAll === true && !this.isAiMode()) {
            const sourceRegion = this.datePickerState.sourceRegion || 'inline';
            const pickerSource = this.datePickerState.source || 'click';
            const pickerAnchorEl = this.datePickerState.anchorEl || null;
            this.fieldActionApplyToAllEnabled = true;
            const updatedAll = this.applyDeterministicFieldValueToAllEntries({
                fieldKey: this.datePickerState.fieldKey,
                nextValue: commitValue
            });
            this.datePickerSuppressUntil = Date.now() + 150;
            this.closeDatePicker();
            if (typeof updatedAll === 'string') {
                this.parseAndRender({
                    source: updatedAll,
                    focusInput: this.shouldRefocusInputAfterCommit({
                        source: pickerSource,
                        sourceRegion,
                        anchorEl: pickerAnchorEl
                    }),
                    skipTypingSync: sourceRegion === 'card'
                });
            }
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
                const nextChar = updated.charAt(caret);
                if (nextChar !== '\n' && !/\s/.test(nextChar || '')) {
                    updated = this.replaceRange(updated, caret, caret, ' ');
                    caret += 1;
                }
            }
        }
        const sourceRegion = this.datePickerState && this.datePickerState.sourceRegion ? this.datePickerState.sourceRegion : 'inline';
        const pickerSource = this.datePickerState && this.datePickerState.source ? this.datePickerState.source : 'click';
        const pickerAnchorEl = this.datePickerState && this.datePickerState.anchorEl ? this.datePickerState.anchorEl : null;
        this.datePickerSuppressUntil = Date.now() + 150;
        this.closeDatePicker();
        this.parseAndRender({
            source: updated,
            caretOffset: caret,
            focusInput: this.shouldRefocusInputAfterCommit({
                source: pickerSource,
                sourceRegion,
                anchorEl: pickerAnchorEl
            }),
            skipTypingSync: sourceRegion === 'card'
        });
    };

    QuickAddComponent.prototype.commitDateSelection = function commitDateSelection(nextValue) {
        this.applyDateSelection(nextValue).catch(() => {
            if (this.statusEl) {
                this.statusEl.textContent = 'Could not apply date selection';
            }
        });
    };

    QuickAddComponent.prototype.commitDropdownSelection = function commitDropdownSelection(nextValue) {
        this.applyDropdownSelection(nextValue).catch(() => {
            if (this.statusEl) {
                this.statusEl.textContent = 'Could not apply option selection';
            }
        });
    };

    QuickAddComponent.prototype.bindEvents = function bindEvents() {
        this.onInput = () => {
            if (this.isRenderingInput) {
                return;
            }
            const keepTypingDropdownOpen = !!(
                this.dropdownState
                && (this.dropdownState.source === 'typing' || this.dropdownState.source === 'field-menu')
                && !this.dropdownEl.hidden
                && document.activeElement === this.inputEl
            );
            if (!keepTypingDropdownOpen) {
                this.closeDropdown();
            }
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
                if (this.suppressNextInsertParagraph) {
                    this.suppressNextInsertParagraph = false;
                    event.preventDefault();
                    return;
                }
                event.preventDefault();
                this.insertTextAtSelection('\n', { preferTokenBoundary: true });
                return;
            }

            if (inputType === 'insertText' && event.data === ' ') {
                const offsets = this.getSelectionOffsets();
                if (offsets && offsets.isCollapsed) {
                    const tokenAtCaret = this.findFieldTokenAtOffset(offsets.start);
                    const tokenEndingAtCaret = this.findCommittedFieldTokenEndingAtOffset(offsets.start);
                    const boundaryToken = tokenAtCaret || tokenEndingAtCaret;
                    if (boundaryToken && boundaryToken.kind === 'field' && boundaryToken.committed) {
                        event.preventDefault();
                        this.insertTextAtSelection(' ', { preferTokenBoundary: true });
                        return;
                    }
                    if (this.tryAutoCloseFieldOnSpace(offsets.start)) {
                        event.preventDefault();
                        return;
                    }
                }
            }

            if (
                inputType === 'insertText'
                && typeof event.data === 'string'
                && event.data.length === 1
                && this.config.allowMultipleEntries !== false
            ) {
                const entrySeparator = String(this.config.entrySeparator || '');
                if (entrySeparator && !/[\r\n]/.test(entrySeparator)) {
                    const offsets = this.getSelectionOffsets();
                    if (offsets && offsets.isCollapsed) {
                        const source = String(this.inputText || this.readInputText() || '');
                        const next = `${source.slice(0, offsets.start)}${event.data}${source.slice(offsets.end)}`;
                        const caretAfter = offsets.start + event.data.length;
                        const recentStart = Math.max(0, caretAfter - entrySeparator.length);
                        const recent = next.slice(recentStart, caretAfter);
                        const escapeChar = String(this.config.escapeChar || '');
                        const escapedSeparator = escapeChar ? `${escapeChar}${entrySeparator}` : '';
                        const escapedStart = Math.max(0, caretAfter - escapedSeparator.length);
                        const escapedMatch = !!escapedSeparator && next.slice(escapedStart, caretAfter) === escapedSeparator;
                        const nextChar = next.charAt(caretAfter);
                        if (recent === entrySeparator && !escapedMatch && nextChar !== '\n' && nextChar !== '\r') {
                            event.preventDefault();
                            this.insertTextAtSelection(`${event.data}\n`, { preferTokenBoundary: true });
                            return;
                        }
                    }
                }
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
            const isTypingDropdown = !!(
                this.dropdownState
                && (this.dropdownState.source === 'typing' || this.dropdownState.source === 'field-menu')
                && !this.dropdownEl.hidden
            );
            if ((event.key === 'Backspace' || event.key === 'Delete') && !event.metaKey && !event.ctrlKey && !event.altKey) {
                const offsets = this.getSelectionOffsets();
                if (offsets) {
                    const source = String(this.inputText || this.readInputText() || '');
                    let deleteStart = offsets.start;
                    let deleteEnd = offsets.end;
                    if (offsets.isCollapsed) {
                        if (event.key === 'Backspace') {
                            if (deleteStart <= 0) {
                                return;
                            }
                            deleteStart = deleteStart - 1;
                        } else {
                            if (deleteEnd >= source.length) {
                                return;
                            }
                            deleteEnd = deleteEnd + 1;
                        }
                    }
                    event.preventDefault();
                    this.replaceTextInInput(deleteStart, deleteEnd, '');
                    return;
                }
            }
            if (isTypingDropdown && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
                event.preventDefault();
                this.moveDropdownActiveOption(event.key === 'ArrowDown' ? 1 : -1);
                return;
            }
            if (event.key === 'Enter') {
                if (isTypingDropdown) {
                    const dropdownField = this.dropdownState
                        ? this.getFieldDefinition(this.dropdownState.fieldKey)
                        : null;
                    const isMultiSelectTypingDropdown = !!(
                        dropdownField
                        && dropdownField.type === 'options'
                        && dropdownField.multiple
                    );
                    let active = this.dropdownState.activeOptionValue;
                    if (active === undefined || active === null || active === '') {
                        const firstFiltered = Array.isArray(this.dropdownState.filteredOptions)
                            ? this.dropdownState.filteredOptions[0]
                            : null;
                        if (firstFiltered && firstFiltered.value !== undefined && firstFiltered.value !== null) {
                            active = firstFiltered.value;
                        }
                    }
                    if ((active === undefined || active === null || active === '') && this.dropdownListEl) {
                        const firstOption = this.dropdownListEl.querySelector('[data-option-value]');
                        if (firstOption) {
                            active = firstOption.getAttribute('data-option-value') || '';
                        }
                    }
                    if (active !== undefined && active !== null && active !== '') {
                        event.preventDefault();
                        if (this.timer) {
                            clearTimeout(this.timer);
                            this.timer = null;
                        }
                        this.suppressNextInsertParagraph = true;
                        setTimeout(() => {
                            this.suppressNextInsertParagraph = false;
                        }, 0);
                        this.commitDropdownSelection(active);
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
            this.syncActiveEntryIndicator();
        };

        this.onInputClick = (event) => {
            const numberStepBtn = event.target.closest('[data-number-step]');
            if (numberStepBtn) {
                event.preventDefault();
                event.stopPropagation();
                const direction = Number(numberStepBtn.getAttribute('data-number-step'));
                if (direction === -1 || direction === 1) {
                    void this.adjustNumberPillValue(numberStepBtn.closest('[data-qa-pill="1"]'), direction);
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
            const clickedEntryIndex = this.getEntryIndexAtCaret(this.getCaretOffset());
            if (Number.isFinite(Number(clickedEntryIndex))) {
                this.lastInteractedEntryIndex = Number(clickedEntryIndex);
            }
            this.syncActiveEntryIndicator();
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
                this.normalizeCaretAfterCommittedTokenBoundary();
                return;
            }
            event.preventDefault();
            this.placeCaretNearPill(pill, event);
            this.handlePillClick(pill);
        };

        this.onPreviewClick = (event) => {
            const cardEntryEl = event.target.closest('[data-qa-entry-index]');
            if (cardEntryEl) {
                const cardEntryIndex = Number(cardEntryEl.getAttribute('data-qa-entry-index'));
                if (Number.isFinite(cardEntryIndex)) {
                    this.lastInteractedEntryIndex = cardEntryIndex;
                    this.syncActiveEntryIndicator();
                }
            } else if (this.isAiMode()) {
                const aiCardEl = event.target.closest('[data-ai-entry-id]');
                if (aiCardEl) {
                    const aiEntryId = String(aiCardEl.getAttribute('data-ai-entry-id') || '');
                    if (aiEntryId) {
                        const aiEntryIndex = (this.aiState.entries || []).findIndex((item) => item && item._id === aiEntryId);
                        if (aiEntryIndex >= 0) {
                            this.lastInteractedEntryIndex = aiEntryIndex;
                            this.syncActiveEntryIndicator();
                        }
                    }
                }
            }
            const numberStepBtn = event.target.closest('[data-number-step]');
            if (numberStepBtn) {
                event.preventDefault();
                event.stopPropagation();
                const direction = Number(numberStepBtn.getAttribute('data-number-step'));
                if (direction === -1 || direction === 1) {
                    void this.adjustNumberPillValue(numberStepBtn.closest('[data-qa-pill="1"]'), direction);
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
                this.captureFocusOrigin('dropdown', entryLinkBtn, this.inputEl);
                this.dropdownEl.hidden = false;
                this.dropdownEl.classList.add(this.config.classNames.dropdownOpen);
                this.scrollDropdownActiveOptionIntoView();
                this.syncDropdownA11y();
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
                    let didInlineSync = false;
                    if (targetEntry) {
                        const previousEntry = deepCloneValue(targetEntry);
                        const inlineSyncChanges = [];
                        const fields = (this.normalizedSchema && Array.isArray(this.normalizedSchema.fields))
                            ? this.normalizedSchema.fields
                            : [];
                        fields.forEach((field) => {
                            if (!field || !field.key) {
                                return;
                            }
                            const previousValue = previousEntry[field.key];
                            const inputId = this.getAIEditInputId(entryId, field.key);
                            const node = document.getElementById(inputId);
                            if (!node) {
                                return;
                            }
                            const raw = String(node.value || '').trim();
                            let nextValue;
                            if (field.key === 'status') {
                                nextValue = this.normalizeAIStatus(raw);
                                targetEntry[field.key] = nextValue;
                                return;
                            }
                            if (isFileFieldType(field.type)) {
                                if (field.multiple) {
                                    nextValue = this.normalizeAIAttachmentRefs(raw);
                                    targetEntry[field.key] = nextValue;
                                } else {
                                    nextValue = raw;
                                    targetEntry[field.key] = nextValue;
                                }
                                return;
                            }
                            if (field.type === 'number') {
                                const num = Number(raw);
                                nextValue = Number.isFinite(num) ? num : null;
                                targetEntry[field.key] = nextValue;
                                if (
                                    this.isInteractivePill(field)
                                    && Number.isFinite(num)
                                    && Number(previousValue) !== Number(nextValue)
                                ) {
                                    inlineSyncChanges.push({
                                        fieldKey: field.key,
                                        currentValue: previousValue,
                                        nextValue
                                    });
                                }
                                return;
                            }
                            if (field.multiple) {
                                const parsedMulti = raw
                                    ? splitByMultiSeparator(raw, String(this.config.multiSelectSeparator || ','))
                                    : [];
                                nextValue = parsedMulti;
                                targetEntry[field.key] = nextValue;
                                return;
                            }
                            nextValue = raw;
                            targetEntry[field.key] = nextValue;
                            if (
                                this.isInteractivePill(field)
                                && !field.multiple
                                && !isFileFieldType(field.type)
                                && normValue(previousValue) !== normValue(nextValue)
                            ) {
                                inlineSyncChanges.push({
                                    fieldKey: field.key,
                                    currentValue: previousValue,
                                    nextValue
                                });
                            }
                        });
                        this.aiState.editedEntries.add(entryId);
                        this.aiState.editingEntryId = '';
                        if (inlineSyncChanges.length && this.isAIInlinePillsEnabled()) {
                            const entryIndex = this.aiState.entries.findIndex((item) => item && item._id === entryId);
                            inlineSyncChanges.forEach((change) => {
                                this.applyAIFieldSelection({
                                    entryId,
                                    fieldKey: change.fieldKey,
                                    currentValue: change.currentValue,
                                    occurrence: 0,
                                    mappingKey: this.buildAIInlineMappingKey(entryId, change.fieldKey, change.currentValue, 0),
                                    entryIndex: entryIndex >= 0 ? entryIndex : 0,
                                    nextValue: change.nextValue,
                                    sourceRegion: 'card'
                                });
                            });
                            didInlineSync = true;
                        }
                    }
                    if (!targetEntry) {
                        this.aiState.editingEntryId = '';
                    }
                    if (!didInlineSync) {
                        this.parseAndRender({ source: this.inputText });
                    }
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
                } else if (action === 'restore-entry') {
                    const entryIndex = Number(deterministicAction.getAttribute('data-entry-index'));
                    if (Number.isFinite(entryIndex)) {
                        this.restoreDeterministicEntry(entryIndex, 'card');
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
                    this.commitDateSelection(value);
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
                    this.commitDateSelection(this.datePickerState.selectedDateValue || toYMD(this.datePickerState.activeDate || new Date()));
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
                this.commitDateSelection(currentValue);
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
            if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && this.dropdownState.source !== 'action-input') {
                event.preventDefault();
                this.moveDropdownActiveOption(event.key === 'ArrowDown' ? 1 : -1);
                return;
            }
            if (event.key === 'Enter') {
                const active = this.dropdownState.activeOptionValue;
                if (active !== undefined && active !== null && active !== '') {
                    event.preventDefault();
                    this.commitDropdownSelection(active);
                    return;
                }
                const query = String(this.dropdownSearchEl.value || '').trim();
                if (
                    this.dropdownState.allowCustom
                    && !isFileFieldType(this.dropdownState.fieldType)
                    && query
                ) {
                    event.preventDefault();
                    this.commitDropdownSelection(query);
                }
            }
        };

        this.onDropdownListClick = (event) => {
            const optionBtn = event.target.closest('[data-option-value]');
            if (!optionBtn) {
                return;
            }
            const value = optionBtn.getAttribute('data-option-value') || '';
            this.commitDropdownSelection(value);
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
                return;
            }
            if (this.attachmentSourceMenuEl && !this.attachmentSourceMenuEl.hidden) {
                const insideMenu = this.attachmentSourceMenuEl.contains(targetEl);
                const onToggle = !!targetEl.closest('[data-entry-attachment-picker-toggle="1"]');
                if (!insideMenu && !onToggle) {
                    this.closeAttachmentSourceMenu({ restoreFocus: false });
                    return;
                }
            }
            if (this.datePickerEl && !this.datePickerEl.hidden) {
                if (Date.now() < this.datePickerInternalClickUntil) {
                    return;
                }
                if (!this.datePickerEl.contains(targetEl) && !targetEl.closest('[data-qa-date-pill="1"]')) {
                    this.closeDatePicker({ restoreFocus: false });
                    return;
                }
            }
            if (this.dropdownEl && !this.dropdownEl.hidden) {
                if (!this.dropdownEl.contains(targetEl) && !targetEl.closest('[data-qa-pill="1"]')) {
                    this.closeDropdown({ restoreFocus: false, finalizeOpenToken: true });
                    return;
                }
            }
            if (this.blockedInfoEl && !this.blockedInfoEl.hidden) {
                if (!this.blockedInfoEl.contains(targetEl) && !targetEl.closest('[data-qa-blocked="1"]')) {
                    this.closeBlockedInfo({ restoreFocus: false });
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
        };

        this.onDocumentKeyDown = (event) => {
            const targetEl = eventTargetElement(event);
            const containsInQuickAdd = (node) => {
                if (!node || !(node instanceof Element)) {
                    return false;
                }
                return !!(
                    (this.rootEl && this.rootEl.contains(node))
                    || (this.dropdownEl && this.dropdownEl.contains(node))
                    || (this.datePickerEl && this.datePickerEl.contains(node))
                    || (this.attachmentSourceMenuEl && this.attachmentSourceMenuEl.contains(node))
                    || (this.blockedInfoEl && this.blockedInfoEl.contains(node))
                    || (this.conflictModalOverlayEl && this.conflictModalOverlayEl.contains(node))
                );
            };
            const targetInside = containsInQuickAdd(targetEl);
            const activeInside = containsInQuickAdd(document.activeElement);
            if (!targetInside && !activeInside && !this.conflictModalState) {
                return;
            }
            const isUndoRedoModifier = !!(event.metaKey || event.ctrlKey);
            const isPlainZ = event.key === 'z' || event.key === 'Z';
            if (isUndoRedoModifier && isPlainZ && !event.altKey) {
                event.preventDefault();
                if (event.shiftKey) {
                    this.redo();
                } else {
                    this.undo();
                }
                return;
            }
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
                    this.closeDropdown({ finalizeOpenToken: true });
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
                if (this.attachmentSourceMenuState && this.attachmentSourceMenuEl && !this.attachmentSourceMenuEl.hidden) {
                    this.positionAttachmentSourceMenu(this.attachmentSourceMenuState.anchorEl || null);
                }
                this.syncInputClearButton();
                this.syncActiveEntryIndicator();
            });
        };

        this.onRootClick = (event) => {
            const actionBtn = event.target.closest('[data-field-action-btn="1"]');
            if (!actionBtn) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            const fieldKey = String(actionBtn.getAttribute('data-field-key') || '').trim();
            if (!fieldKey) {
                return;
            }
            this.handleFieldActionButtonClick(fieldKey, actionBtn);
        };
        this.onRootChange = (event) => {
            const applyToAllInput = event.target.closest('[data-field-action-apply-all="1"]');
            if (!applyToAllInput) {
                return;
            }
            this.fieldActionApplyToAllEnabled = applyToAllInput.checked === true;
            this.renderFieldActionBar();
        };

        this.inputEl.addEventListener('input', this.onInput);
        this.inputEl.addEventListener('beforeinput', this.onBeforeInput);
        this.inputEl.addEventListener('keydown', this.onInputKeyDown);
        this.inputEl.addEventListener('paste', this.onInputPaste);
        this.inputEl.addEventListener('copy', this.onInputCopy);
        this.inputEl.addEventListener('cut', this.onInputCut);
        this.inputEl.addEventListener('blur', this.onInputBlur);
        this.inputEl.addEventListener('click', this.onInputClick);
        this.onInputScroll = () => {
            this.syncActiveEntryIndicator();
        };
        this.inputEl.addEventListener('scroll', this.onInputScroll, { passive: true });
        this.onInputClearClick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.clearInputFromControl();
        };
        if (this.inputClearBtnEl) {
            this.inputClearBtnEl.addEventListener('click', this.onInputClearClick);
        }
        this.previewEl.addEventListener('click', this.onPreviewClick);
        this.previewEl.addEventListener('change', this.onPreviewChange);
        this.dropdownSearchEl.addEventListener('input', this.onDropdownInput);
        this.dropdownSearchEl.addEventListener('keydown', this.onDropdownSearchKeyDown);
        this.dropdownListEl.addEventListener('click', this.onDropdownListClick);
        this.dropdownListEl.addEventListener('scroll', this.onDropdownListScroll, { passive: true });
        this.attachmentSourceMenuEl.addEventListener('click', this.onAttachmentSourceMenuClick);
        if (this.rootEl && this.onRootClick) {
            this.rootEl.addEventListener('click', this.onRootClick);
        }
        if (this.rootEl && this.onRootChange) {
            this.rootEl.addEventListener('change', this.onRootChange);
        }
        if (this.conflictModalOverlayEl) {
            this.conflictModalOverlayEl.addEventListener('click', this.onConflictModalClick);
        }
        this.datePickerEl.addEventListener('click', this.onDatePickerClick);
        this.datePickerEl.addEventListener('change', this.onDatePickerChange);
        this.datePickerEl.addEventListener('keydown', this.onDatePickerKeyDown);
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
        if (this.inputEl && this.onInputScroll) {
            this.inputEl.removeEventListener('scroll', this.onInputScroll);
        }
        if (this.inputClearBtnEl && this.onInputClearClick) {
            this.inputClearBtnEl.removeEventListener('click', this.onInputClearClick);
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
        if (this.rootEl && this.onRootClick) {
            this.rootEl.removeEventListener('click', this.onRootClick);
        }
        if (this.rootEl && this.onRootChange) {
            this.rootEl.removeEventListener('change', this.onRootChange);
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
        let replaceStart = safeStart;
        let replaceEnd = safeEnd;
        if (safeStart === safeEnd && inserted === String(this.config.multiSelectSeparator || ',')) {
            const boundaryToken = this.findCommittedFieldTokenEndingAtOffset(safeStart)
                || this.findCommittedFieldTokenEndingAtOffset(safeStart - 1);
            if (boundaryToken) {
                const boundaryField = this.getFieldDefinition(boundaryToken.key);
                if (boundaryField && boundaryField.type === 'options' && boundaryField.multiple) {
                    const valueEnd = Number.isFinite(Number(boundaryToken.globalValueEnd))
                        ? Number(boundaryToken.globalValueEnd)
                        : Number(boundaryToken.globalEnd);
                    replaceStart = Math.max(0, Math.min(valueEnd, len));
                    replaceEnd = replaceStart;
                }
            }
        }
        const updated = this.replaceRange(source, replaceStart, replaceEnd, inserted);
        const caret = replaceStart + inserted.length;

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        const keepTypingDropdownOpen = !!(
            this.dropdownState
            && this.dropdownState.source === 'typing'
            && !this.dropdownEl.hidden
            && document.activeElement === this.inputEl
        );
        if (!keepTypingDropdownOpen) {
            this.closeDropdown();
        }
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

    QuickAddComponent.prototype.findCommittedFieldTokenEndingAtOffset = function findCommittedFieldTokenEndingAtOffset(offset) {
        if (typeof offset !== 'number') {
            return null;
        }
        let best = null;
        this.lastResult.entries.forEach((entry) => {
            entry.tokens.forEach((token) => {
                if (token.kind !== 'field' || !token.committed) {
                    return;
                }
                if (Number(token.globalEnd) !== Number(offset)) {
                    return;
                }
                if (!best || token.globalStart >= best.globalStart) {
                    best = token;
                }
            });
        });
        return best;
    };

    QuickAddComponent.prototype.getFieldAutoCloseConfidence = function getFieldAutoCloseConfidence(field, rawValue) {
        if (!field) {
            return 0;
        }
        const value = String(rawValue || '').trim();
        if (!value) {
            return 0;
        }
        const parsed = parseByType(field, value, this.config);
        if (!parsed.ok) {
            return 0;
        }
        const type = String(field.type || 'string').toLowerCase();
        if (type === 'number') {
            return /^[-+]?\d+(\.\d+)?$/.test(value) ? 0.98 : 0.93;
        }
        if (type === 'boolean') {
            return 0.98;
        }
        if (type === 'options') {
            const options = getFieldOptions(field);
            const exact = options.some((option) =>
                String(option.value || '').toLowerCase() === value.toLowerCase()
                || String(option.label || '').toLowerCase() === value.toLowerCase()
            );
            if (exact) {
                return 0.98;
            }
            return field.allowCustom ? 0.74 : 0;
        }
        if (isDateFieldType(type)) {
            const hasDigits = /\d/.test(value);
            const hasMonthWord = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(value);
            const hasTime = /(\b\d{1,2}:\d{2}\b|\b\d{1,2}\s*(am|pm)\b|\bat\s+\d{1,2}\b)/i.test(value);
            const minLengthBonus = value.length >= 8 ? 0.04 : 0;
            let score = type === 'datetime' ? 0.62 : 0.78;
            if (hasDigits) score += 0.08;
            if (hasMonthWord) score += 0.08;
            if (type === 'datetime') {
                if (hasTime) {
                    score += 0.2;
                } else if (field.allowDateOnly) {
                    score += 0.08;
                }
            }
            score += minLengthBonus;
            return Math.max(0, Math.min(1, score));
        }
        if (isFileFieldType(type)) {
            return value.length >= 2 ? 0.8 : 0.4;
        }
        return 0;
    };

    QuickAddComponent.prototype.tryAutoCloseFieldOnSpace = function tryAutoCloseFieldOnSpace(caretOffset) {
        if (this.config.autoCloseFieldOnSpace !== true || typeof caretOffset !== 'number') {
            return false;
        }
        const terminator = String(this.config.fieldTerminator || '');
        if (!terminator) {
            return false;
        }
        const source = String(this.readInputText() || this.inputText || '');
        const safeCaret = Math.max(0, Math.min(Number(caretOffset) || 0, source.length));
        const liveResult = parseInput(source, this.config);
        let token = null;
        (liveResult.entries || []).forEach((entry) => {
            (entry.tokens || []).forEach((candidate) => {
                if (!candidate || candidate.kind !== 'field' || candidate.committed) {
                    return;
                }
                if (!candidate.prefix || !String(candidate.prefix).trim()) {
                    return;
                }
                const valueStart = Number.isFinite(Number(candidate.globalValueStart))
                    ? Number(candidate.globalValueStart)
                    : Number(candidate.globalStart);
                const tokenEnd = Number.isFinite(Number(candidate.globalEnd))
                    ? Number(candidate.globalEnd)
                    : Number(valueStart);
                if (!Number.isFinite(valueStart) || !Number.isFinite(tokenEnd)) {
                    return;
                }
                if (safeCaret < valueStart || safeCaret > tokenEnd) {
                    return;
                }
                if (!token || Number(candidate.globalStart) >= Number(token.globalStart)) {
                    token = candidate;
                }
            });
        });
        if (!token) {
            return false;
        }
        const field = this.getFieldDefinition(token.key);
        if (!field) {
            return false;
        }
        const valueStart = Number.isFinite(Number(token.globalValueStart))
            ? Number(token.globalValueStart)
            : Number(token.globalStart);
        const valueEnd = Number.isFinite(Number(token.globalValueEnd))
            ? Number(token.globalValueEnd)
            : Number(token.globalEnd);
        if (!Number.isFinite(valueStart) || !Number.isFinite(valueEnd) || safeCaret < valueEnd) {
            return false;
        }
        const rawValue = source.slice(Math.max(0, valueStart), Math.max(valueStart, valueEnd));
        const threshold = Number(this.config.autoCloseFieldOnSpaceConfidenceThreshold);
        const confidence = this.getFieldAutoCloseConfidence(field, rawValue);
        if (!(confidence >= threshold)) {
            return false;
        }
        let updated = source;
        let caret = Math.max(0, Math.min(valueEnd, updated.length));
        const tokenTail = updated.slice(caret, caret + terminator.length);
        if (tokenTail !== terminator) {
            updated = this.replaceRange(updated, caret, caret, terminator);
            caret += terminator.length;
        }
        const nextChar = updated.charAt(caret);
        if (nextChar !== '\n' && !/\s/.test(nextChar || '')) {
            updated = this.replaceRange(updated, caret, caret, ' ');
            caret += 1;
        } else if (nextChar === ' ') {
            caret += 1;
        }
        if (this.dropdownState && !this.dropdownEl.hidden) {
            this.closeDropdown({ restoreFocus: false });
        }
        this.parseAndRender({
            source: updated,
            caretOffset: caret,
            focusInput: true,
            skipTypingSync: true
        });
        return true;
    };

    QuickAddComponent.prototype.normalizeCaretAfterCommittedTokenBoundary = function normalizeCaretAfterCommittedTokenBoundary() {
        if (this.isAiMode()) {
            return;
        }
        const offsets = this.getSelectionOffsets();
        if (!offsets || !offsets.isCollapsed) {
            return;
        }
        const source = String(this.inputText || this.readInputText() || '');
        const caret = Math.max(0, Math.min(Number(offsets.start) || 0, source.length));
        if (!/\s/.test(source.charAt(caret) || '')) {
            return;
        }
        const token = this.findCommittedFieldTokenEndingAtOffset(caret);
        if (!token) {
            return;
        }
        this.setCaretOffset(caret + 1, true);
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
                this.ensureCaretVisibleInInput();
                this.syncActiveEntryIndicator();
                return;
            }
            remaining -= len;
            node = walker.nextNode();
        }

        range.selectNodeContents(this.inputEl);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        this.ensureCaretVisibleInInput();
        this.syncActiveEntryIndicator();
    };

    QuickAddComponent.prototype.ensureCaretVisibleInInput = function ensureCaretVisibleInInput() {
        if (!this.inputEl || this.inputEl.scrollHeight <= this.inputEl.clientHeight + 1) {
            return;
        }
        const caretOffset = this.getCaretOffset();
        const source = String(this.inputText || this.readInputText() || '');
        if (Number.isFinite(Number(caretOffset)) && Number(caretOffset) >= source.length) {
            this.inputEl.scrollTop = this.inputEl.scrollHeight;
            return;
        }
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return;
        }
        const range = selection.getRangeAt(0).cloneRange();
        range.collapse(true);
        const inputRect = this.inputEl.getBoundingClientRect();
        let caretRect = range.getBoundingClientRect();
        if ((!caretRect || (caretRect.width === 0 && caretRect.height === 0)) && typeof range.getClientRects === 'function') {
            const rects = range.getClientRects();
            if (rects && rects.length > 0) {
                caretRect = rects[0];
            }
        }
        if (!caretRect || (!caretRect.width && !caretRect.height)) {
            if (Number.isFinite(Number(caretOffset)) && Number(caretOffset) >= source.length) {
                this.inputEl.scrollTop = this.inputEl.scrollHeight;
            }
            return;
        }
        const pad = 6;
        if (caretRect.bottom > inputRect.bottom - pad) {
            this.inputEl.scrollTop += caretRect.bottom - (inputRect.bottom - pad);
        } else if (caretRect.top < inputRect.top + pad) {
            this.inputEl.scrollTop -= (inputRect.top + pad) - caretRect.top;
        }
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

        const markerClass = c.entryMarker || 'qa-entry-marker';
        const markerActiveClass = c.entryMarkerActive || 'qa-entry-marker-active';
        const preferredEntryIndex = this.resolvePreferredEntryIndexForFieldAction();
        const entryStarts = (result.entries || [])
            .filter((entry) => Number.isFinite(Number(entry.globalStart)))
            .map((entry, idx) => {
                let start = Math.max(0, Math.min(raw.length, Number(entry.globalStart)));
                while (start < raw.length) {
                    const ch = raw.charAt(start);
                    if (ch !== '\n' && ch !== '\r') {
                        break;
                    }
                    start += 1;
                }
                return {
                    index: Number(entry.index),
                    displayIndex: idx,
                    start
                };
            })
            .sort((a, b) => a.start - b.start || a.displayIndex - b.displayIndex);
        const buildEntryMarkerHtml = (entryInfo) => {
            const label = String(Number(entryInfo.displayIndex) + 1).padStart(2, '0');
            const active = Number(entryInfo.index) === Number(preferredEntryIndex);
            return `<span class="${markerClass}${active ? ` ${markerActiveClass}` : ''}" data-qa-ignore="1" contenteditable="false" data-entry-marker-index="${entryInfo.index}" title="Entry ${Number(entryInfo.displayIndex) + 1}" aria-hidden="true">${label}</span>`;
        };
        let entryCursor = 0;
        const pushMarkersAt = (position, parts) => {
            while (entryCursor < entryStarts.length && entryStarts[entryCursor].start === position) {
                parts.push(buildEntryMarkerHtml(entryStarts[entryCursor]));
                entryCursor += 1;
            }
        };
        const pushRawSegmentWithMarkers = (start, end, parts) => {
            if (end <= start) {
                return;
            }
            let rawCursor = start;
            while (entryCursor < entryStarts.length) {
                const marker = entryStarts[entryCursor];
                if (marker.start < start) {
                    entryCursor += 1;
                    continue;
                }
                if (marker.start >= end) {
                    break;
                }
                if (marker.start > rawCursor) {
                    parts.push(escHtml(raw.slice(rawCursor, marker.start)));
                }
                parts.push(buildEntryMarkerHtml(marker));
                entryCursor += 1;
                rawCursor = marker.start;
            }
            if (end > rawCursor) {
                parts.push(escHtml(raw.slice(rawCursor, end)));
            }
        };

        let html = '';
        if (!this.config.showInlinePills) {
            const parts = [];
            pushRawSegmentWithMarkers(0, raw.length, parts);
            pushMarkersAt(raw.length, parts);
            html = `<span class="${c.inlineText}">${parts.join('')}</span>`;
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
                    pushRawSegmentWithMarkers(cursor, token.globalStart, parts);
                }
                pushMarkersAt(token.globalStart, parts);

                const rawTokenChunk = raw.slice(token.globalStart, token.globalEnd);
                const trailingWhitespaceMatch = rawTokenChunk.match(/\s+$/);
                const trailingWhitespace = trailingWhitespaceMatch ? trailingWhitespaceMatch[0] : '';
                const displayChunk = trailingWhitespace
                    ? rawTokenChunk.slice(0, rawTokenChunk.length - trailingWhitespace.length)
                    : rawTokenChunk;
                parts.push(this.buildInlineMarkHtml(token, displayChunk || rawTokenChunk));
                if (trailingWhitespace) {
                    parts.push(escHtml(trailingWhitespace));
                }
                cursor = token.globalEnd;
            });
            if (cursor < raw.length) {
                pushRawSegmentWithMarkers(cursor, raw.length, parts);
            }
            pushMarkersAt(raw.length, parts);
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

    QuickAddComponent.prototype.extendAIInlineMarkRangeWithTerminator = function extendAIInlineMarkRangeWithTerminator(mark, rawInput) {
        if (!mark || !mark.explicit || !mark.fieldKey) {
            return mark;
        }
        const raw = String(rawInput || '');
        const terminator = String(this.config.fieldTerminator || '');
        if (!terminator) {
            return mark;
        }
        const start = Number(mark.start);
        const end = Number(mark.end);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end > raw.length) {
            return mark;
        }
        if (!raw.startsWith(terminator, end)) {
            return mark;
        }
        return Object.assign({}, mark, {
            end: Math.min(raw.length, end + terminator.length)
        });
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
            const aiEntries = Array.isArray(this.aiState.entries) ? this.aiState.entries : [];
            const custom = ai.inlinePillHarness({
                input: raw,
                entries: aiEntries.slice(),
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
                        if (!entryId && fieldKey) {
                            const matchedEntryIndex = aiEntries.findIndex((item) => {
                                const segStart = Number(item && item._sourceStart);
                                const segEnd = Number(item && item._sourceEnd);
                                return Number.isFinite(segStart)
                                    && Number.isFinite(segEnd)
                                    && start >= segStart
                                    && end <= segEnd;
                            });
                            if (matchedEntryIndex >= 0) {
                                entryIndex = matchedEntryIndex;
                            }
                        }
                        if (!Number.isFinite(entryIndex) && entryId) {
                            const lookupIndex = aiEntries.findIndex((item) => item && item._id === entryId);
                            if (lookupIndex >= 0) {
                                entryIndex = lookupIndex;
                            }
                        }
                        const normalizedEntryIndex = Number.isFinite(entryIndex) ? entryIndex : 0;
                        const resolvedEntry = aiEntries[normalizedEntryIndex] || null;
                        const resolvedEntryId = entryId
                            ? String(entryId)
                            : String((resolvedEntry && resolvedEntry._id) || '');
                        return {
                            start,
                            end,
                            label: String(mark.label || raw.slice(start, end)),
                            inferred: mark.inferred !== false,
                            explicit: mark.explicit === true || (!!resolvedEntryId && !!fieldKey),
                            entryId: resolvedEntryId,
                            entryIndex: normalizedEntryIndex,
                            fieldKey: String(fieldKey || ''),
                            value: mark.value
                        };
                    })
                    .filter(Boolean)
                    .map((mark) => this.extendAIInlineMarkRangeWithTerminator(mark, raw))
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
                    explicit: !!entryId && !!candidate.key,
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

        const normalizedMarks = marks
            .map((mark) => this.extendAIInlineMarkRangeWithTerminator(mark, raw))
            .sort((a, b) => a.start - b.start || a.end - b.end);
        this.indexAIInlineMarks(normalizedMarks);
        return normalizedMarks;
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
            const trailingWhitespaceMatch = chunk.match(/\s+$/);
            const trailingWhitespace = trailingWhitespaceMatch ? trailingWhitespaceMatch[0] : '';
            const displayChunk = trailingWhitespace
                ? chunk.slice(0, chunk.length - trailingWhitespace.length)
                : chunk;
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
            parts.push(`<span class="${classes}"${aiAttrs}${styleAttr} title="${title}"><span class="${c.inlineMarkLabel}">${escHtml(displayChunk || chunk)}</span></span>`);
            if (trailingWhitespace) {
                parts.push(escHtml(trailingWhitespace));
            }
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
        this.closeAttachmentSourceMenu({ restoreFocus: false });
        this.closeBlockedInfo({ restoreFocus: false });

        const input = this.inputText || '';
        if (this.isAiMode()) {
            this.lastResult = this.syncEntryAttachmentMeta(this.buildAIResult());
            this.rebuildTokenMap({ entries: [] });
            this.renderAIInlineLayer(opts);
            this.renderResult(this.lastResult);
            this.closeDropdown({ restoreFocus: false });
            this.closeDatePicker({ restoreFocus: false });
            this.closeNumberPicker();
        } else {
            this.aiInlineMarkIndex = {};
            this.lastResult = parseInput(input, this.config);
            this.lastResult = this.applyDismissedSelections(this.lastResult);
            this.lastResult = this.syncEntryAttachmentMeta(this.lastResult);
            this.lastResult = this.applyDeterministicDeletedEntries(this.lastResult);
            this.rebuildTokenMap(this.lastResult);
            this.renderInlineLayer(this.lastResult, opts);
            this.renderResult(this.lastResult);

            const caretOffset = typeof opts.caretOffset === 'number'
                ? opts.caretOffset
                : this.getCaretOffset();
            if (!opts.skipTypingSync) {
                const fieldMenuOpen = this.syncFieldMenuDropdown(caretOffset);
                if (!fieldMenuOpen) {
                    this.syncTypingDropdown(caretOffset);
                }
            }
        }

        if (typeof this.config.onParse === 'function') {
            this.config.onParse(this.lastResult);
        }
        this.syncInputClearButton();
        this.renderFieldActionBar();
        this.syncActiveEntryIndicator();
        if (!opts.skipHistory) {
            this.captureHistorySnapshot('parse');
        }
    };

    QuickAddComponent.prototype.createHistorySnapshot = function createHistorySnapshot(reason) {
        const attachmentPool = (this.attachmentPool || []).map((item) => Object.assign({}, item));
        const aiState = {
            entries: deepCloneValue(this.aiState.entries || []),
            editedEntries: Array.from(this.aiState.editedEntries || []),
            deletedEntries: Array.from(this.aiState.deletedEntries || []),
            editingEntryId: String(this.aiState.editingEntryId || '')
        };
        const deterministicDeletedEntries = Array.from(this.deterministicDeletedEntries || []);
        const signature = JSON.stringify({
            input: this.inputText || '',
            dismissed: Array.from(this.dismissedSelections || []),
            deterministicDeleted: deterministicDeletedEntries,
            attachments: attachmentPool.map((item) => `${item.id}|${item.ref}|${item.fingerprint}`),
            aiEntries: aiState.entries.length,
            reason: String(reason || '')
        });
        return {
            signature,
            inputText: String(this.inputText || ''),
            dismissedSelections: Array.from(this.dismissedSelections || []),
            attachmentCounter: Number(this.attachmentCounter || 0),
            attachmentPool,
            aiState,
            deterministicDeletedEntries
        };
    };

    QuickAddComponent.prototype.captureHistorySnapshot = function captureHistorySnapshot(reason) {
        if (!this.config.history.enabled || this.historySuspend) {
            return;
        }
        const snapshot = this.createHistorySnapshot(reason);
        const previous = this.historyPast.length ? this.historyPast[this.historyPast.length - 1] : null;
        if (previous && previous.signature === snapshot.signature) {
            return;
        }
        this.historyPast.push(snapshot);
        this.historyFuture = [];
        const maxDepth = Number(this.config.history.maxDepth || 100);
        if (this.historyPast.length > maxDepth) {
            this.historyPast = this.historyPast.slice(this.historyPast.length - maxDepth);
        }
    };

    QuickAddComponent.prototype.applyHistorySnapshot = function applyHistorySnapshot(snapshot) {
        if (!snapshot) {
            return false;
        }
        this.historySuspend = true;
        try {
            this.inputText = String(snapshot.inputText || '');
            this.dismissedSelections = new Set(Array.isArray(snapshot.dismissedSelections) ? snapshot.dismissedSelections : []);
            this.deterministicDeletedEntries = new Set(
                Array.isArray(snapshot.deterministicDeletedEntries) ? snapshot.deterministicDeletedEntries : []
            );
            this.attachmentCounter = Number(snapshot.attachmentCounter || 0);
            this.attachmentPool = Array.isArray(snapshot.attachmentPool)
                ? snapshot.attachmentPool.map((item) => Object.assign({}, item))
                : [];
            if (snapshot.aiState && typeof snapshot.aiState === 'object') {
                this.aiState.entries = Array.isArray(snapshot.aiState.entries) ? deepCloneValue(snapshot.aiState.entries) : [];
                this.aiState.editedEntries = new Set(Array.isArray(snapshot.aiState.editedEntries) ? snapshot.aiState.editedEntries : []);
                this.aiState.deletedEntries = new Set(Array.isArray(snapshot.aiState.deletedEntries) ? snapshot.aiState.deletedEntries : []);
                this.aiState.editingEntryId = String(snapshot.aiState.editingEntryId || '');
            }
            this.parseAndRender({
                source: this.inputText,
                skipTypingSync: true,
                focusInput: false,
                skipHistory: true
            });
            return true;
        } finally {
            this.historySuspend = false;
        }
    };

    QuickAddComponent.prototype.canUndo = function canUndo() {
        return this.config.history.enabled && this.historyPast.length > 1;
    };

    QuickAddComponent.prototype.canRedo = function canRedo() {
        return this.config.history.enabled && this.historyFuture.length > 0;
    };

    QuickAddComponent.prototype.undo = function undo() {
        if (!this.canUndo()) {
            return false;
        }
        const current = this.historyPast.pop();
        const previous = this.historyPast[this.historyPast.length - 1];
        if (!previous) {
            if (current) {
                this.historyPast.push(current);
            }
            return false;
        }
        if (current) {
            this.historyFuture.push(current);
        }
        return this.applyHistorySnapshot(previous);
    };

    QuickAddComponent.prototype.redo = function redo() {
        if (!this.canRedo()) {
            return false;
        }
        const next = this.historyFuture.pop();
        if (!next) {
            return false;
        }
        this.historyPast.push(next);
        return this.applyHistorySnapshot(next);
    };

    QuickAddComponent.prototype.clearHistory = function clearHistory() {
        this.historyPast = [];
        this.historyFuture = [];
        this.captureHistorySnapshot('clear');
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
        return evaluateFieldDependency(field, value, fields, this.normalizedSchema.byKey);
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

    QuickAddComponent.prototype.fieldSupportsActionInput = function fieldSupportsActionInput(field) {
        if (!field) {
            return false;
        }
        if (isDateFieldType(field.type) || isFileFieldType(field.type)) {
            return false;
        }
        return field.type !== 'options';
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
        return this.fieldSupportsDropdown(field) || this.fieldSupportsActionInput(field);
    };

    QuickAddComponent.prototype.openFieldInputDropdown = function openFieldInputDropdown(options) {
        const opts = options || {};
        const field = opts.field || null;
        if (!field || !opts.anchorEl) {
            return false;
        }
        const entryIndex = Number.isFinite(Number(opts.entryIndex)) ? Number(opts.entryIndex) : 0;
        const currentValue = opts.currentValue === undefined || opts.currentValue === null
            ? ''
            : String(opts.currentValue);
        const searchValue = opts.searchValue === undefined || opts.searchValue === null
            ? currentValue
            : String(opts.searchValue);
        const openOptions = Array.isArray(opts.options) ? opts.options.slice() : [];
        this.dropdownState = {
            fieldKey: field.key,
            fieldType: field.type,
            tokenId: opts.tokenId || '',
            cleanupTokenIdOnClose: opts.cleanupTokenIdOnClose ? String(opts.cleanupTokenIdOnClose) : '',
            entryIndex,
            entryKey: opts.entryKey !== undefined ? opts.entryKey : entryIndex,
            currentValue,
            allowCustom: opts.allowCustom === true,
            options: openOptions,
            sourceRegion: opts.sourceRegion || 'inline',
            anchorRect: opts.anchorRect || (opts.anchorEl && opts.anchorEl.getBoundingClientRect ? opts.anchorEl.getBoundingClientRect() : null),
            anchorEl: opts.anchorEl || null,
            source: opts.source || 'click',
            activeOptionValue: null,
            filteredOptions: [],
            activateFirstOnOpen: true,
            keepActiveWhenFiltering: false,
            aiContext: opts.aiContext || null,
            applyToAll: opts.applyToAll === true
        };
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.dropdownSearchEl.hidden = false;
        this.dropdownSearchEl.value = searchValue;
        this.renderDropdownList();
        this.positionDropdown(opts.anchorEl);
        this.captureFocusOrigin('dropdown', opts.anchorEl, this.inputEl);
        this.dropdownEl.hidden = false;
        this.dropdownEl.classList.add(this.config.classNames.dropdownOpen);
        this.scrollDropdownActiveOptionIntoView();
        this.syncDropdownA11y();
        this.dropdownSearchEl.focus();
        this.dropdownSearchEl.select();
        return true;
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
        const fieldLabelText = field ? String(field.label || field.key || 'value') : 'value';
        const dismiss = (!blocked && data.dismissKey)
            ? `<button type="button" class="${c.pillDismiss}" data-dismiss-key="${escHtml(data.dismissKey)}" aria-label="Dismiss ${escHtml(fieldLabelText)}">x</button>`
            : '';
        const numberControls = (!blocked && numberInteractive)
            ? `<span class="${c.numberPillStepper}"><button type="button" class="${c.numberPillStepBtn}" data-number-step="-1" aria-label="Decrease ${escHtml(fieldLabelText)}">−</button><span class="${c.pillLabel}">${escHtml(data.label)}</span><button type="button" class="${c.numberPillStepBtn}" data-number-step="1" aria-label="Increase ${escHtml(fieldLabelText)}">+</button></span>`
            : `<span class="${c.pillLabel}">${escHtml(data.label)}</span>`;

        return `<span class="${classes}"${attrs}${styleAttr}>${blockedIcon}${autoIcon}${inferredIcon}${numberControls}${dismiss}</span>`;
    };

    QuickAddComponent.prototype.buildInlineMarkHtml = function buildInlineMarkHtml(token, rawChunk) {
        const c = this.config.classNames;
        const field = this.getFieldDefinition(token.key);
        const color = this.resolvePillColor(field, token.value);
        const interactive = this.isInteractivePill(field);
        const numberInteractive = !!(field && field.type === 'number' && this.isNumberStepperEnabledForField(field));
        let displayChunk = String(rawChunk || '');
        if (this.config.hideFieldTerminatorInPills === true && token.committed) {
            const terminator = String(this.config.fieldTerminator || '');
            if (terminator && displayChunk.endsWith(terminator)) {
                displayChunk = displayChunk.slice(0, -terminator.length);
            }
        }
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
        const fieldLabelText = field ? String(field.label || field.key || 'value') : 'value';
        const dismiss = token.dismissKey
            ? `<button type="button" class="${c.inlineMarkDismiss}" data-qa-ignore="1" contenteditable="false" data-dismiss-key="${escHtml(token.dismissKey)}" aria-label="Dismiss ${escHtml(fieldLabelText)}">x</button>`
            : '';
        const titleAttr = token.blocked && token.reason ? ` title="${escHtml(`Blocked by constraints: ${token.reason}`)}"` : '';
        const numberControls = (numberInteractive && !token.blocked)
            ? `<span class="${c.numberPillStepper}"><button type="button" class="${c.numberPillStepBtn}" data-qa-ignore="1" contenteditable="false" data-number-step="-1" aria-label="Decrease ${escHtml(fieldLabelText)}">−</button><span class="${c.inlineMarkLabel}">${escHtml(displayChunk)}</span><button type="button" class="${c.numberPillStepBtn}" data-qa-ignore="1" contenteditable="false" data-number-step="1" aria-label="Increase ${escHtml(fieldLabelText)}">+</button></span>`
            : `<span class="${c.inlineMarkLabel}">${escHtml(displayChunk)}</span>`;
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

        const prefixRange = this.findAIFieldPrefixValueRange(entry, fieldKey, occurrence, text);
        if (prefixRange) {
            return prefixRange;
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

    QuickAddComponent.prototype.findAIFieldPrefixValueRange = function findAIFieldPrefixValueRange(entry, fieldKey, occurrence, source) {
        const text = String(source || '');
        if (!entry || !fieldKey || !text) {
            return null;
        }
        const startBound = Number.isFinite(Number(entry._sourceStart)) ? Math.max(0, Number(entry._sourceStart)) : 0;
        const endBound = Number.isFinite(Number(entry._sourceEnd)) ? Math.min(text.length, Number(entry._sourceEnd)) : text.length;
        if (endBound <= startBound) {
            return null;
        }

        const field = this.getFieldDefinition(fieldKey);
        const rawPrefixes = field && Array.isArray(field.prefixes) && field.prefixes.length
            ? field.prefixes
            : [`${fieldKey}:`];
        const prefixes = rawPrefixes
            .map((prefix) => String(prefix || '').trim())
            .filter(Boolean);
        if (!prefixes.length) {
            return null;
        }

        const segment = text.slice(startBound, endBound);
        const lowerSegment = segment.toLowerCase();
        const allPrefixes = ((this.normalizedSchema && Array.isArray(this.normalizedSchema.fields))
            ? this.normalizedSchema.fields
                .reduce((acc, fieldDef) => {
                    const list = Array.isArray(fieldDef && fieldDef.prefixes) && fieldDef.prefixes.length
                        ? fieldDef.prefixes
                        : [`${fieldDef && fieldDef.key ? fieldDef.key : ''}:`];
                    list.forEach((item) => {
                        const value = String(item || '').trim();
                        if (value) {
                            acc.push(value.toLowerCase());
                        }
                    });
                    return acc;
                }, [])
            : [])
            .filter(Boolean);

        const isPrefixBoundary = function isPrefixBoundary(segmentText, idx) {
            if (idx <= 0) {
                return true;
            }
            return /[\s;,\n\r\t(]/.test(segmentText.charAt(idx - 1));
        };
        const matches = [];
        prefixes.forEach((prefix) => {
            const lowerPrefix = prefix.toLowerCase();
            let idx = lowerSegment.indexOf(lowerPrefix);
            while (idx !== -1) {
                if (isPrefixBoundary(lowerSegment, idx)) {
                    matches.push({ idx, prefix });
                }
                idx = lowerSegment.indexOf(lowerPrefix, idx + lowerPrefix.length);
            }
        });
        if (!matches.length) {
            return null;
        }

        matches.sort((a, b) => a.idx - b.idx);
        const matchIndex = Math.max(0, Math.min(matches.length - 1, Number.isFinite(Number(occurrence)) ? Number(occurrence) : 0));
        const selected = matches[matchIndex];
        let valueStart = selected.idx + selected.prefix.length;
        while (valueStart < lowerSegment.length && /\s/.test(lowerSegment.charAt(valueStart))) {
            valueStart += 1;
        }

        if (valueStart >= lowerSegment.length) {
            return null;
        }

        let valueEnd = lowerSegment.length;
        const addCandidate = function addCandidate(nextIdx) {
            if (Number.isFinite(nextIdx) && nextIdx >= valueStart && nextIdx < valueEnd) {
                valueEnd = nextIdx;
            }
        };

        const fieldTerminator = String(this.config.fieldTerminator || '');
        if (fieldTerminator) {
            const idx = lowerSegment.indexOf(fieldTerminator.toLowerCase(), valueStart);
            if (idx !== -1) {
                addCandidate(idx);
            }
        }
        const entrySeparator = String(this.config.entrySeparator || '');
        if (entrySeparator) {
            const idx = lowerSegment.indexOf(entrySeparator.toLowerCase(), valueStart);
            if (idx !== -1) {
                addCandidate(idx);
            }
        }

        allPrefixes.forEach((prefix) => {
            let idx = lowerSegment.indexOf(prefix, valueStart);
            while (idx !== -1) {
                if (isPrefixBoundary(lowerSegment, idx)) {
                    addCandidate(idx);
                    break;
                }
                idx = lowerSegment.indexOf(prefix, idx + prefix.length);
            }
        });

        const punctuationStops = ['\n', '\r'];
        punctuationStops.forEach((token) => {
            const idx = lowerSegment.indexOf(token, valueStart);
            if (idx !== -1) {
                addCandidate(idx);
            }
        });

        while (valueEnd > valueStart && /\s/.test(lowerSegment.charAt(valueEnd - 1))) {
            valueEnd -= 1;
        }
        if (valueEnd <= valueStart) {
            return null;
        }
        return {
            start: startBound + valueStart,
            end: startBound + valueEnd,
            value: segment.slice(valueStart, valueEnd),
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

    QuickAddComponent.prototype.findInferredById = function findInferredById(inferredId) {
        const targetId = String(inferredId || '');
        if (!targetId) {
            return null;
        }
        const entries = this.lastResult && Array.isArray(this.lastResult.entries) ? this.lastResult.entries : [];
        for (let i = 0; i < entries.length; i++) {
            const inferred = entries[i] && Array.isArray(entries[i].inferred) ? entries[i].inferred : [];
            for (let j = 0; j < inferred.length; j++) {
                if (String(inferred[j] && inferred[j].id || '') === targetId) {
                    return inferred[j];
                }
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

    QuickAddComponent.prototype.resolvePillAnchorForToken = function resolvePillAnchorForToken(sourceRegion, tokenId, fallbackEl) {
        const id = String(tokenId || '').trim();
        if (!id) {
            return fallbackEl || null;
        }
        const scope = sourceRegion === 'card' ? this.previewEl : this.inputEl;
        if (!scope || typeof scope.querySelectorAll !== 'function') {
            return fallbackEl || null;
        }
        const candidates = scope.querySelectorAll('[data-qa-pill="1"][data-pill-token]');
        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];
            if (String(candidate.getAttribute('data-pill-token') || '') === id) {
                return candidate;
            }
        }
        return fallbackEl || null;
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
        const layout = this.computeFloatingLayout({
            panelEl: this.attachmentSourceMenuEl,
            anchorRect,
            anchorEl: anchorEl || this.inputEl,
            ignoreAnchorClip: true,
            minWidth: 180,
            maxWidth: 240,
            preferredWidth: 240,
            gap: 2,
            fallbackHeight: 120,
            preferredPlacement: 'bottom',
            flip: true,
            allowExpand: false
        });

        this.attachmentSourceMenuEl.style.position = 'fixed';
        this.attachmentSourceMenuEl.style.left = `${layout.left}px`;
        this.attachmentSourceMenuEl.style.top = `${layout.top}px`;
        this.attachmentSourceMenuEl.style.width = `${layout.width}px`;
        this.attachmentSourceMenuEl.style.maxWidth = `${Math.max(0, layout.viewportWidth)}px`;
        this.attachmentSourceMenuEl.style.maxHeight = `${Math.floor(layout.panelHeight)}px`;
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
        this.captureFocusOrigin('attachmentSourceMenu', anchorEl || null, this.inputEl);
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

    QuickAddComponent.prototype.closeAttachmentSourceMenu = function closeAttachmentSourceMenu(options) {
        const opts = options || {};
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
        if (opts.restoreFocus !== false) {
            this.restoreFocusOrigin('attachmentSourceMenu');
        }
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

    QuickAddComponent.prototype.readAttachmentContentBase64 = async function readAttachmentContentBase64(item) {
        if (!item) {
            return null;
        }
        if (item.contentBase64) {
            return {
                contentBase64: String(item.contentBase64),
                encoding: 'base64',
                byteLength: Number(item.byteLength || item.size || 0)
            };
        }
        if (!item.file || typeof item.file.arrayBuffer !== 'function') {
            return null;
        }
        const arrayBuffer = await item.file.arrayBuffer();
        const contentBase64 = arrayBufferToBase64(arrayBuffer);
        return {
            contentBase64,
            encoding: 'base64',
            byteLength: Number(item.file.size || 0)
        };
    };

    QuickAddComponent.prototype.toExportAttachment = async function toExportAttachment(item, details) {
        if (!item) {
            return null;
        }
        const opts = details || {};
        const mode = normalizeAttachmentMode(opts.attachmentMode);
        const base = {
            id: String(item.id || ''),
            ref: String(item.ref || ''),
            entryKey: opts.entryKey !== undefined && opts.entryKey !== null ? String(opts.entryKey) : null,
            fieldKey: opts.fieldKey !== undefined && opts.fieldKey !== null ? String(opts.fieldKey) : null,
            name: String(item.name || (item.file && item.file.name) || 'attachment'),
            mimeType: String(item.type || (item.file && item.file.type) || ''),
            size: Number(item.size || (item.file && item.file.size) || 0),
            lastModified: Number(item.lastModified || (item.file && item.file.lastModified) || 0),
            fingerprint: String(item.fingerprint || ''),
            previewUrl: item.previewUrl || null,
            linked: opts.linked !== false
        };
        if (mode === 'metadata-only') {
            return base;
        }
        const encoded = await this.readAttachmentContentBase64(item);
        if (!encoded) {
            return base;
        }
        return Object.assign(base, encoded);
    };

    QuickAddComponent.prototype.getLinkedAttachmentRecords = function getLinkedAttachmentRecords(result) {
        const entries = result && Array.isArray(result.entries) ? result.entries : [];
        const records = [];
        const seen = new Set();
        entries.forEach((entry) => {
            const entryKey = this.getEntryKey(entry);
            const attachments = Array.isArray(entry && entry.attachments) ? entry.attachments : [];
            attachments.forEach((attachment) => {
                if (!attachment || !attachment.id) {
                    return;
                }
                const key = `${entryKey}|${attachment.fieldKey || ''}|${attachment.id}`;
                if (seen.has(key)) {
                    return;
                }
                seen.add(key);
                const poolItem = this.getAttachmentById(attachment.id) || attachment;
                records.push({
                    item: poolItem,
                    fieldKey: attachment.fieldKey || null,
                    entryKey
                });
            });
        });
        return records;
    };

    QuickAddComponent.prototype.getUnlinkedAttachments = async function getUnlinkedAttachments(options) {
        const opts = options || {};
        const mode = normalizeAttachmentMode(opts.attachmentMode);
        const result = this.getResult() || { entries: [] };
        const usage = this.getAttachmentUsage(result);
        const unlinked = [];
        for (const item of (this.attachmentPool || [])) {
            if (!item || usage.has(item.id)) {
                continue;
            }
            const exportItem = await this.toExportAttachment(item, {
                linked: false,
                fieldKey: null,
                attachmentMode: mode
            });
            if (exportItem) {
                unlinked.push(exportItem);
            }
        }
        return unlinked;
    };

    QuickAddComponent.prototype.checkWarnings = async function checkWarnings(options) {
        const opts = options || {};
        const action = opts.action === 'close' ? 'close' : 'save';
        const warningCfg = this.config.warnings && this.config.warnings.unlinkedAttachments
            ? this.config.warnings.unlinkedAttachments
            : DEFAULT_WARNINGS_CONFIG.unlinkedAttachments;
        if (!warningCfg.enabled) {
            return { ok: true };
        }
        const unlinkedAttachments = await this.getUnlinkedAttachments({
            attachmentMode: normalizeAttachmentMode(opts.attachmentMode || 'metadata-only')
        });
        if (!unlinkedAttachments.length) {
            return { ok: true };
        }
        const result = this.getResult() || null;
        const linkedCount = this.getLinkedAttachmentRecords(result).length;
        const payload = {
            action,
            unlinkedAttachments,
            linkedAttachmentCount: linkedCount,
            result
        };
        if (typeof warningCfg.onCheck === 'function') {
            const accepted = await warningCfg.onCheck(payload);
            return accepted === false
                ? { ok: false, reason: 'warning-rejected', payload }
                : { ok: true, payload };
        }
        const label = action === 'close' ? 'close' : 'save';
        const accepted = await this.requestConflictConfirmation({
            message: `You uploaded ${unlinkedAttachments.length} file(s) that are not linked to any entry. Continue and ${label}?`,
            confirmLabel: `Continue and ${label}`,
            cancelLabel: 'Go back',
            ariaLabel: 'Unlinked attachments warning'
        });
        return accepted
            ? { ok: true, payload }
            : { ok: false, reason: 'warning-rejected', payload };
    };

    QuickAddComponent.prototype.runBeforeSaveValidation = async function runBeforeSaveValidation(result) {
        const handler = this.config.validation && this.config.validation.beforeSaveEntry;
        if (typeof handler !== 'function') {
            return { ok: true };
        }
        const entries = Array.isArray(result && result.entries) ? result.entries : [];
        const failures = [];
        for (let i = 0; i < entries.length; i += 1) {
            const entry = entries[i];
            const decision = await handler({
                entryDraft: deepCloneValue(entry),
                allEntriesDraft: deepCloneValue(entries),
                source: 'save'
            });
            if (!decision || typeof decision !== 'object' || decision.allow !== false) {
                continue;
            }
            failures.push({
                index: i,
                reason: String(decision.reason || 'Blocked by beforeSaveEntry'),
                code: decision.code ? String(decision.code) : ''
            });
        }
        if (!failures.length) {
            return { ok: true };
        }
        return { ok: false, failures };
    };

    QuickAddComponent.prototype.exportResult = async function exportResult(options) {
        const opts = options || {};
        const attachmentMode = normalizeAttachmentMode(opts.attachmentMode);
        const includeUnlinked = opts.includeUnlinked === true;
        const runWarnings = opts.runWarnings !== false;
        const runValidation = opts.runValidation !== false;
        const result = deepCloneValue(this.getResult() || {});
        if (runWarnings) {
            const warningResult = await this.checkWarnings({
                action: 'save',
                attachmentMode: 'metadata-only'
            });
            if (!warningResult.ok) {
                throw new Error('QuickAdd export cancelled by warnings check');
            }
        }
        if (runValidation) {
            const validation = await this.runBeforeSaveValidation(result);
            if (!validation.ok) {
                const err = new Error('QuickAdd export blocked by beforeSaveEntry');
                err.code = 'QA_BEFORE_SAVE_BLOCKED';
                err.details = validation.failures;
                throw err;
            }
        }
        const linkedRecords = this.getLinkedAttachmentRecords(result);
        const attachments = [];
        for (const record of linkedRecords) {
            const exported = await this.toExportAttachment(record.item, {
                linked: true,
                entryKey: record.entryKey,
                fieldKey: record.fieldKey || null,
                attachmentMode
            });
            if (exported) {
                attachments.push(exported);
            }
        }
        if (includeUnlinked) {
            const unlinked = await this.getUnlinkedAttachments({ attachmentMode });
            attachments.push.apply(attachments, unlinked);
        }
        return {
            version: 2,
            mode: this.isAiMode() ? 'ai' : 'deterministic',
            input: String(result.input || this.inputText || ''),
            entries: Array.isArray(result.entries) ? result.entries : [],
            attachments,
            warnings: Array.isArray(result.warnings) ? result.warnings.slice() : [],
            missing: Array.isArray(result.missing) ? result.missing.slice() : [],
            metadata: {
                exportedAt: new Date().toISOString()
            }
        };
    };

    QuickAddComponent.prototype.importResult = async function importResult(payload, options) {
        const data = payload && typeof payload === 'object' ? payload : null;
        if (!data) {
            return false;
        }
        const opts = options || {};
        const mergeStrategy = opts.mergeStrategy === 'append' ? 'append' : 'replace';
        const attachmentConflict = opts.attachmentConflict === 'keep-both' ? 'keep-both' : 'dedupe-by-fingerprint';
        const importedInput = String(data.input || '');
        const existingInput = String(this.inputText || this.readInputText() || '');
        let nextInput = importedInput;
        if (mergeStrategy === 'append' && existingInput && importedInput) {
            nextInput = `${existingInput}${this.config.entrySeparator || '\n'}${importedInput}`;
        } else if (mergeStrategy === 'append' && existingInput) {
            nextInput = existingInput;
        }
        const attachments = Array.isArray(data.attachments) ? data.attachments : [];
        if (mergeStrategy === 'replace') {
            (this.attachmentPool || []).forEach((item) => {
                if (item && item.previewUrl) {
                    URL.revokeObjectURL(item.previewUrl);
                }
            });
            this.attachmentPool = [];
            this.attachmentCounter = 0;
        }
        const existingFingerprints = new Set((this.attachmentPool || []).map((item) => String(item.fingerprint || '')));
        for (const imported of attachments) {
            if (!imported || typeof imported !== 'object') {
                continue;
            }
            const fingerprint = String(imported.fingerprint || `${imported.name}|${imported.size}|${imported.lastModified}|${imported.mimeType}`);
            if (attachmentConflict === 'dedupe-by-fingerprint' && existingFingerprints.has(fingerprint)) {
                continue;
            }
            let file = null;
            if (imported.contentBase64 && typeof File === 'function') {
                try {
                    const bytes = base64ToUint8Array(imported.contentBase64);
                    file = new File([bytes], String(imported.name || 'attachment'), {
                        type: String(imported.mimeType || ''),
                        lastModified: Number(imported.lastModified || Date.now())
                    });
                } catch (err) {
                    file = null;
                }
            }
            const item = {
                id: imported.id || `att_global_${++this.attachmentCounter}`,
                fingerprint,
                file,
                ref: String(imported.ref || imported.name || `attachment-${this.attachmentCounter}`),
                name: String(imported.name || imported.ref || `attachment-${this.attachmentCounter}`),
                size: Number(imported.size || (file && file.size) || 0),
                type: String(imported.mimeType || imported.type || (file && file.type) || ''),
                lastModified: Number(imported.lastModified || (file && file.lastModified) || 0),
                previewUrl: null,
                contentBase64: (typeof imported.contentBase64 === 'string' && imported.contentBase64)
                    ? imported.contentBase64
                    : '',
                byteLength: Number(imported.byteLength || imported.size || 0)
            };
            this.attachmentPool.push(item);
            existingFingerprints.add(fingerprint);
            if (typeof item.id === 'string' && item.id.startsWith('att_global_')) {
                const numericId = Number(item.id.slice('att_global_'.length));
                if (Number.isFinite(numericId)) {
                    this.attachmentCounter = Math.max(this.attachmentCounter, numericId);
                }
            }
        }
        this.parseAndRender({
            source: nextInput,
            caretOffset: nextInput.length,
            focusInput: false
        });
        return true;
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

    QuickAddComponent.prototype.requestConflictConfirmation = function requestConflictConfirmation(options) {
        const opts = options || {};
        if (this.conflictModalState) {
            return Promise.resolve(false);
        }
        return new Promise((resolve) => {
            this.openConflictModal({
                message: String(opts.message || 'Are you sure?'),
                confirmLabel: String(opts.confirmLabel || 'Confirm'),
                cancelLabel: String(opts.cancelLabel || 'Cancel'),
                ariaLabel: String(opts.ariaLabel || 'Confirmation'),
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
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
            this.conflictModalEl.removeAttribute('aria-label');
            return;
        }
        this.conflictModalEl.setAttribute('aria-label', String(state.ariaLabel || 'Attachment conflict'));
        this.conflictModalEl.innerHTML = `
            <div>${escHtml(state.message || 'Attachment conflict')}</div>
            <div class="${c.conflictModalActions}">
                <button type="button" class="${c.conflictModalBtn}" data-conflict-action="confirm">${escHtml(state.confirmLabel || 'Confirm')}</button>
                <button type="button" class="${c.conflictModalBtn}" data-conflict-action="cancel">${escHtml(state.cancelLabel || 'Cancel')}</button>
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
        } else if (action !== 'confirm' && typeof state.onCancel === 'function') {
            state.onCancel();
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
        const source = this.inputText || this.readInputText();
        const marked = this.markDeterministicEntryDeleted(entry, true, source);
        if (!marked) {
            return;
        }
        const origin = sourceRegion === 'card' ? 'card' : 'inline';
        this.parseAndRender({
            source,
            focusInput: origin !== 'card',
            skipTypingSync: origin === 'card'
        });
    };

    QuickAddComponent.prototype.restoreDeterministicEntry = function restoreDeterministicEntry(entryIndex, sourceRegion) {
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
        const source = this.inputText || this.readInputText();
        const marked = this.markDeterministicEntryDeleted(entry, false, source);
        if (!marked) {
            return;
        }
        const origin = sourceRegion === 'card' ? 'card' : 'inline';
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
                <button type="button" class="${c.attachmentOpen}" data-attachment-open="1" data-attachment-id="${escHtml(item.id)}" aria-label="Open attachment ${escHtml(item.name)}">
                    ${mediaHtml}
                </button>
                ${opts.removeAttr ? `<button type="button" class="${c.attachmentRemove}" ${opts.removeAttr} aria-label="Remove attachment ${escHtml(item.name)}">✕</button>` : ''}
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
        if (parseState && parseState.isQueued) {
            const queueReason = parseState.queueReason ? ` (${parseState.queueReason})` : '';
            statusParts.push(`queued${queueReason}`);
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
        if (parseState && parseState.isQueued) {
            const queueLabel = parseState.queueReason
                ? `Dispatch queued (${parseState.queueReason})`
                : 'Dispatch queued';
            warningRows.push(`<div class="${c.issue}">${escHtml(queueLabel)}</div>`);
            if (parseState.queueMessage) {
                warningRows.push(`<div class="${c.issue}">${escHtml(parseState.queueMessage)}</div>`);
            }
        }
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
                const removed = !!(entry.detMeta && entry.detMeta.deleted);
                const badgeText = removed
                    ? 'removed'
                    : (entry.isValid ? 'valid' : 'needs attention');
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
                            ${removed
                        ? `<button type="button" class="${c.aiActionBtn} ${c.aiActionBtnGhost}" data-det-action="restore-entry" data-entry-index="${entry.index}">Restore</button>`
                        : `<button type="button" class="${c.aiActionBtn} ${c.aiActionBtnDanger}" data-det-action="remove-entry" data-entry-index="${entry.index}">Remove</button>`}
                        </div>
                    `
                    : '';

                return `
                    <article class="${c.entry}${removed ? ` ${c.pillBlocked}` : ''}" data-qa-entry-index="${entry.index}">
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
        const hasArea = (rect) => !!(rect && (Number(rect.width) + Number(rect.height) > 0));
        const fallbackInputRect = this.inputEl ? this.inputEl.getBoundingClientRect() : null;
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0).cloneRange();
            range.collapse(true);
            const rect = range.getBoundingClientRect();
            if (hasArea(rect)) {
                return rect;
            }
            if (typeof range.getClientRects === 'function') {
                const rects = range.getClientRects();
                if (rects && rects.length > 0 && hasArea(rects[0])) {
                    return rects[0];
                }
            }
        }
        const caretOffset = this.getCaretOffset();
        if (Number.isFinite(Number(caretOffset))) {
            const offsetRect = this.getTextOffsetClientRect(Number(caretOffset));
            if (hasArea(offsetRect)) {
                return offsetRect;
            }
        }
        const source = String(this.inputText || this.readInputText() || '');
        const tailRect = this.getTextOffsetClientRect(source.length);
        if (hasArea(tailRect)) {
            return tailRect;
        }
        return fallbackInputRect || {
            left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0
        };
    };

    QuickAddComponent.prototype.findOptionTokenAtCaret = function findOptionTokenAtCaret(caretOffset) {
        if (typeof caretOffset !== 'number') {
            return null;
        }

        let best = null;
        let bestKind = -1;
        this.lastResult.entries.forEach((entry) => {
            entry.tokens.forEach((token) => {
                if (token.kind !== 'field') {
                    return;
                }
                const field = this.getFieldDefinition(token.key);
                if (!field || !this.fieldSupportsDropdown(field, token.entryIndex, token.key)) {
                    return;
                }

                const valueStart = Number.isFinite(Number(token.globalValueStart))
                    ? Number(token.globalValueStart)
                    : Number(token.globalStart);
                const valueEnd = Number.isFinite(Number(token.globalValueEnd))
                    ? Number(token.globalValueEnd)
                    : Number(token.globalEnd);
                const inPrefixGap = caretOffset >= Number(token.globalStart) && caretOffset <= valueStart;
                const inValueRange = caretOffset >= valueStart && caretOffset <= valueEnd;
                if (!inPrefixGap && !inValueRange) {
                    return;
                }
                const kind = inPrefixGap ? 2 : 1;
                if (
                    !best
                    || kind > bestKind
                    || (kind === bestKind && token.globalStart >= best.globalStart)
                ) {
                    best = token;
                    bestKind = kind;
                }
            });
        });

        return best;
    };

    QuickAddComponent.prototype.getEntryIndexAtCaret = function getEntryIndexAtCaret(caretOffset) {
        if (typeof caretOffset !== 'number') {
            return 0;
        }
        const entries = Array.isArray(this.lastResult && this.lastResult.entries) ? this.lastResult.entries : [];
        if (!entries.length) {
            return 0;
        }
        const safeCaret = Math.max(0, Math.min(Number(caretOffset), String(this.inputText || this.readInputText() || '').length));
        let fallback = entries[entries.length - 1].index;
        for (let i = 0; i < entries.length; i += 1) {
            const entry = entries[i];
            const start = Number(entry.globalStart);
            const end = Number(entry.globalEnd);
            if (!Number.isFinite(start) || !Number.isFinite(end)) {
                continue;
            }
            if (safeCaret >= start && safeCaret <= end) {
                return entry.index;
            }
            if (safeCaret < start) {
                return entry.index;
            }
            fallback = entry.index;
        }
        return fallback;
    };

    QuickAddComponent.prototype.getTextOffsetClientRect = function getTextOffsetClientRect(offset) {
        if (!this.inputEl) {
            return null;
        }
        const source = String(this.inputText || this.readInputText() || '');
        const safeOffset = Math.max(0, Math.min(Number(offset) || 0, source.length));
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
        let remaining = safeOffset;
        let node = walker.nextNode();
        while (node) {
            const len = (node.nodeValue || '').length;
            if (remaining <= len) {
                range.setStart(node, remaining);
                range.collapse(true);
                const rect = range.getBoundingClientRect();
                if (rect && (rect.width + rect.height) > 0) {
                    return rect;
                }
                break;
            }
            remaining -= len;
            node = walker.nextNode();
        }
        range.selectNodeContents(this.inputEl);
        range.collapse(false);
        const fallback = range.getBoundingClientRect();
        return fallback && (fallback.width + fallback.height) > 0 ? fallback : null;
    };

    QuickAddComponent.prototype.syncActiveEntryIndicator = function syncActiveEntryIndicator() {
        const c = this.config.classNames || {};
        const activeClass = c.entryActive || 'qa-entry-active';
        const preferredIndex = this.resolvePreferredEntryIndexForFieldAction();
        if (this.previewEl) {
            const cards = Array.from(this.previewEl.querySelectorAll(`.${c.entry}`));
            cards.forEach((card) => card.classList.remove(activeClass));
            if (cards.length) {
                let activeCard = null;
                if (this.isAiMode()) {
                    const aiCards = Array.from(this.previewEl.querySelectorAll(`.${c.entry}[data-ai-entry-id]`));
                    const preferred = Number(preferredIndex);
                    const aiIndex = Number.isFinite(preferred) ? preferred : (aiCards.length - 1);
                    activeCard = aiCards[aiIndex] || aiCards[aiCards.length - 1] || null;
                } else {
                    const deterministicCards = Array.from(this.previewEl.querySelectorAll(`.${c.entry}[data-qa-entry-index]`));
                    const preferred = Number(preferredIndex);
                    if (Number.isFinite(preferred)) {
                        activeCard = this.previewEl.querySelector(`.${c.entry}[data-qa-entry-index="${preferred}"]`);
                    }
                    if (!activeCard) {
                        activeCard = deterministicCards[deterministicCards.length - 1] || null;
                    }
                }
                if (activeCard) {
                    activeCard.classList.add(activeClass);
                }
            }
        }
        if (this.inputEl) {
            const markerActiveClass = c.entryMarkerActive || 'qa-entry-marker-active';
            const markerEls = Array.from(this.inputEl.querySelectorAll('[data-entry-marker-index]'));
            markerEls.forEach((el) => {
                const markerIndex = Number(el.getAttribute('data-entry-marker-index'));
                const isActive = Number.isFinite(markerIndex) && markerIndex === Number(preferredIndex);
                el.classList.toggle(markerActiveClass, isActive);
            });
        }
    };

    QuickAddComponent.prototype.resolvePreferredEntryIndexForFieldAction = function resolvePreferredEntryIndexForFieldAction(options) {
        const opts = options || {};
        const preferCaret = opts.preferCaret !== false;
        const dropdownEntryIndex = this.dropdownState && Number(this.dropdownState.entryIndex);
        if (Number.isFinite(dropdownEntryIndex)) {
            return dropdownEntryIndex;
        }
        const dateEntryIndex = this.datePickerState && Number(this.datePickerState.entryIndex);
        if (Number.isFinite(dateEntryIndex)) {
            return dateEntryIndex;
        }
        if (preferCaret && this.inputEl && document.activeElement === this.inputEl) {
            const caret = this.getCaretOffset();
            if (Number.isFinite(Number(caret))) {
                return this.getEntryIndexAtCaret(Number(caret));
            }
        }
        const lastInteracted = Number(this.lastInteractedEntryIndex);
        if (Number.isFinite(lastInteracted)) {
            return lastInteracted;
        }
        const entries = Array.isArray(this.lastResult && this.lastResult.entries) ? this.lastResult.entries : [];
        return entries.length ? Number(entries[entries.length - 1].index) : 0;
    };

    QuickAddComponent.prototype.findFieldMenuContextAtCaret = function findFieldMenuContextAtCaret(caretOffset) {
        if (typeof caretOffset !== 'number' || this.config.showFieldMenuOnTyping === false) {
            return null;
        }
        const trigger = String(this.config.fieldMenuTrigger || '');
        if (!trigger) {
            return null;
        }
        const sourceText = String(this.inputText || this.readInputText() || '');
        const safeCaret = Math.max(0, Math.min(Number(caretOffset), sourceText.length));
        const beforeCaret = sourceText.slice(0, safeCaret);
        const triggerStart = beforeCaret.lastIndexOf(trigger);
        if (triggerStart < 0) {
            return null;
        }
        const prevChar = triggerStart > 0 ? sourceText.charAt(triggerStart - 1) : '';
        if (prevChar && !/\s/.test(prevChar)) {
            return null;
        }
        const queryStart = triggerStart + trigger.length;
        const queryRaw = sourceText.slice(queryStart, safeCaret);
        if (/[\r\n]/.test(queryRaw)) {
            return null;
        }
        const query = queryRaw.trimStart();
        if (/\s/.test(query)) {
            return null;
        }
        return {
            triggerStart,
            queryStart,
            caretOffset: safeCaret,
            query,
            entryIndex: this.getEntryIndexAtCaret(safeCaret)
        };
    };

    QuickAddComponent.prototype.buildFieldMenuOptions = function buildFieldMenuOptions(entryIndex) {
        const fields = Array.isArray(this.normalizedSchema && this.normalizedSchema.fields)
            ? this.normalizedSchema.fields
            : [];
        if (!fields.length) {
            return [];
        }
        const fallbackKey = String(this.config.fallbackField || '');
        const entry = (this.lastResult.entries || []).find((item) => item.index === entryIndex) || null;
        const usedKeys = new Set();
        if (entry && Array.isArray(entry.tokens)) {
            entry.tokens.forEach((token) => {
                if (token && token.kind === 'field' && token.key) {
                    usedKeys.add(String(token.key));
                }
            });
        }
        return fields
            .filter((field) => String(field.key || '') !== fallbackKey)
            .filter((field) => this.config.fieldMenuShowUsedFields !== false || !usedKeys.has(String(field.key)))
            .map((field) => {
                const prefix = (Array.isArray(field.prefixes) && field.prefixes[0])
                    ? String(field.prefixes[0])
                    : `${field.key}:`;
                const isRequired = !!(field.required && this.config.fieldMenuShowRequiredMeta !== false);
                const isAutoDetect = !!(
                    this.config.fieldMenuShowAutoDetectMeta !== false
                    && (field.autoDetectWithoutPrefix === true || (this.config.autoDetectOptionsWithoutPrefix && field.autoDetectWithoutPrefix !== false))
                );
                const typeLabel = String(field.type || 'string');
                const typeKey = typeLabel.toLowerCase();
                const typeGlyph = ({
                    string: 'Aa',
                    number: '12',
                    options: '≡',
                    date: 'D',
                    datetime: 'DT',
                    file: '📎',
                    boolean: '✓'
                })[typeKey] || String(typeLabel || '?').slice(0, 2).toUpperCase();
                const hasDefault = !(
                    field.defaultValue === undefined
                    || field.defaultValue === null
                    || (typeof field.defaultValue === 'string' && field.defaultValue.trim() === '')
                    || (Array.isArray(field.defaultValue) && field.defaultValue.length === 0)
                );
                const isLimited = typeKey === 'options' && field.allowCustom === false;
                const isDateType = isDateFieldType(typeKey);
                const hasMeta = !!(
                    isRequired
                    || isAutoDetect
                    || hasDefault
                    || field.multiple
                    || isLimited
                    || (isDateType && field.naturalDate)
                    || (isDateType && field.allowDateOnly)
                    || field.allowMathExpression
                    || field.showNumberStepper
                    || (Array.isArray(field.prefixes) && field.prefixes.length > 1)
                );
                let metaTone = 'plain';
                if (isRequired) {
                    metaTone = 'required';
                } else if (isAutoDetect) {
                    metaTone = 'auto';
                } else if (hasDefault) {
                    metaTone = 'default';
                } else if (isLimited) {
                    metaTone = 'limited';
                } else if (field.multiple) {
                    metaTone = 'multi';
                } else if (hasMeta) {
                    metaTone = 'meta';
                }
                const metaFlags = [];
                if (isRequired) metaFlags.push('required');
                if (isAutoDetect) metaFlags.push('auto');
                if (hasDefault) metaFlags.push('default');
                if (field.multiple) metaFlags.push('multiple');
                if (isLimited) metaFlags.push('limited');
                if (isDateType && field.naturalDate) metaFlags.push('natural-date');
                if (isDateType && field.allowDateOnly) metaFlags.push('date-only');
                if (field.allowMathExpression) metaFlags.push('math');
                if (field.showNumberStepper) metaFlags.push('stepper');
                if (Array.isArray(field.prefixes) && field.prefixes.length > 1) metaFlags.push('aliases');
                return {
                    value: String(field.key),
                    label: `${field.label || field.key}`,
                    meta: typeLabel,
                    metaType: typeLabel,
                    required: isRequired,
                    autoDetect: isAutoDetect,
                    prefix,
                    typeGlyph,
                    metaTone,
                    metaSummary: metaFlags.length ? metaFlags.join(' · ') : 'no field flags',
                    color: field.color || null
                };
            });
    };

    QuickAddComponent.prototype.syncFieldMenuDropdown = function syncFieldMenuDropdown(caretOffset) {
        const context = this.findFieldMenuContextAtCaret(caretOffset);
        if (!context) {
            if (this.dropdownState && this.dropdownState.source === 'field-menu') {
                this.closeDropdown();
            }
            return false;
        }
        const options = this.buildFieldMenuOptions(context.entryIndex);
        if (!options.length) {
            if (this.dropdownState && this.dropdownState.source === 'field-menu') {
                this.closeDropdown();
            }
            return false;
        }
        this.dropdownState = {
            fieldKey: '__field_menu__',
            fieldType: 'field-menu',
            tokenId: '',
            entryIndex: context.entryIndex,
            entryKey: context.entryIndex,
            currentValue: context.query,
            allowCustom: false,
            options,
            sourceRegion: 'inline',
            anchorRect: null,
            source: 'field-menu',
            activeOptionValue: null,
            filteredOptions: [],
            activateFirstOnOpen: true,
            keepActiveWhenFiltering: false,
            fieldMenuContext: context
        };
        this.dropdownSearchEl.hidden = true;
        this.dropdownSearchEl.value = context.query;
        this.renderDropdownList();
        this.positionDropdownAtRect(this.getCaretClientRect());
        this.captureFocusOrigin('dropdown', this.inputEl, this.inputEl);
        this.dropdownEl.hidden = false;
        this.dropdownEl.classList.add(this.config.classNames.dropdownOpen);
        this.syncDropdownA11y();
        return true;
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

        const sourceText = String(this.inputText || this.readInputText() || '');
        const tokenValueStartRaw = Number.isFinite(Number(token.globalValueStart))
            ? Number(token.globalValueStart)
            : Number(token.globalStart);
        const tokenValueEndRaw = Number.isFinite(Number(token.globalValueEnd))
            ? Number(token.globalValueEnd)
            : Number(token.globalEnd);
        const safeSourceLength = sourceText.length;
        const safeValueStart = Math.max(0, Math.min(tokenValueStartRaw, safeSourceLength));
        const safeCaret = Number.isFinite(Number(caretOffset))
            ? Math.max(safeValueStart, Math.min(Number(caretOffset), safeSourceLength))
            : safeValueStart;
        const safeValueEnd = token.committed
            ? Math.max(safeValueStart, Math.min(tokenValueEndRaw, safeSourceLength))
            : Math.max(
                safeValueStart,
                Math.min(Math.max(tokenValueEndRaw, safeCaret), safeSourceLength)
            );
        const isCommittedValueEdge = !!(token.committed && safeCaret >= safeValueEnd);
        let typedValue = isCommittedValueEdge
            ? ''
            : (safeCaret >= safeValueStart && safeCaret <= safeValueEnd
                ? sourceText.slice(safeValueStart, safeCaret)
                : '');
        if (token.committed && field && field.type === 'options' && !field.multiple) {
            const normalizedTyped = normValue(String(typedValue || '').replace(/[;:,]+$/g, '').trim());
            const normalizedToken = normValue(token.value || '');
            typedValue = (!normalizedTyped || normalizedTyped === normalizedToken)
                ? ''
                : String(typedValue || '').replace(/[;:,]+$/g, '').trim();
        }

        this.dropdownState = {
            fieldKey: token.key,
            fieldType: field.type,
            tokenId: token.id,
            entryIndex: typeof token.entryIndex === 'number' ? token.entryIndex : 0,
            entryKey: typeof token.entryIndex === 'number' ? token.entryIndex : 0,
            currentValue: typedValue,
            allowCustom: !!field.allowCustom,
            options,
            sourceRegion: 'inline',
            anchorRect: null,
            source: 'typing',
            activeOptionValue: null,
            filteredOptions: [],
            activateFirstOnOpen: true,
            keepActiveWhenFiltering: false
        };

        this.dropdownSearchEl.hidden = true;
        this.dropdownSearchEl.value = typedValue;
        this.renderDropdownList();
        this.positionDropdownAtRect(this.getCaretClientRect());
        this.captureFocusOrigin('dropdown', this.inputEl, this.inputEl);
        this.dropdownEl.hidden = false;
        this.dropdownEl.classList.add(this.config.classNames.dropdownOpen);
        this.syncDropdownA11y();
    };

    QuickAddComponent.prototype.getPrimaryPrefixForField = function getPrimaryPrefixForField(field) {
        if (!field) {
            return '';
        }
        if (Array.isArray(field.prefixes) && field.prefixes.length > 0 && String(field.prefixes[0] || '').trim()) {
            return String(field.prefixes[0]);
        }
        return `${field.key}:`;
    };

    QuickAddComponent.prototype.findFieldTokenAtCaretForField = function findFieldTokenAtCaretForField(caretOffset, fieldKey) {
        if (!Number.isFinite(Number(caretOffset)) || !fieldKey) {
            return null;
        }
        const caret = Number(caretOffset);
        let match = null;
        (this.lastResult.entries || []).forEach((entry) => {
            (entry.tokens || []).forEach((token) => {
                if (!token || token.kind !== 'field' || token.key !== fieldKey) {
                    return;
                }
                const start = Number(token.globalStart);
                const end = Number(token.globalEnd);
                if (!Number.isFinite(start) || !Number.isFinite(end)) {
                    return;
                }
                const touchesCaret = (caret >= start && caret <= end) || ((caret - 1) >= start && (caret - 1) <= end);
                if (!touchesCaret) {
                    return;
                }
                if (!match || start >= Number(match.globalStart)) {
                    match = token;
                }
            });
        });
        if (match) {
            return match;
        }
        const fallback = this.findCommittedFieldTokenEndingAtOffset(caret) || this.findCommittedFieldTokenEndingAtOffset(caret - 1);
        if (fallback && fallback.key === fieldKey) {
            return fallback;
        }
        return null;
    };

    QuickAddComponent.prototype.resolveFieldTokenForInteraction = function resolveFieldTokenForInteraction(entryIndex, fieldKey, preferredValue, sourceRegion) {
        const entry = (this.lastResult.entries || []).find((item) => item.index === entryIndex);
        if (!entry) {
            return null;
        }
        const tokens = (entry.tokens || []).filter((token) => token && token.kind === 'field' && token.key === fieldKey);
        if (!tokens.length) {
            return null;
        }
        if (preferredValue !== undefined && preferredValue !== null && preferredValue !== '') {
            const exact = tokens.find((token) => normValue(token.value || '') === normValue(preferredValue));
            if (exact) {
                return exact;
            }
        }
        return tokens[tokens.length - 1] || null;
    };

    QuickAddComponent.prototype.handleFieldActionButtonClick = function handleFieldActionButtonClick(fieldKey, anchorEl) {
        const field = this.getFieldDefinition(fieldKey);
        if (!field || !this.inputEl) {
            return;
        }
        const applyToAll = this.isFieldActionApplyAllActive() && !this.isAiMode();
        this.closeAttachmentSourceMenu();
        this.closeBlockedInfo();
        this.closeDatePicker();
        const hadInputFocus = document.activeElement === this.inputEl;
        const targetEntryIndex = hadInputFocus
            ? this.getEntryIndexAtCaret(this.getCaretOffset())
            : this.resolvePreferredEntryIndexForFieldAction({ preferCaret: false });
        if (document.activeElement !== this.inputEl) {
            this.inputEl.focus();
        }
        let source = String(this.inputText || this.readInputText() || '');
        let caret = hadInputFocus ? this.getCaretOffset() : NaN;
        if (!hadInputFocus) {
            const targetEntry = (this.lastResult.entries || []).find((entry) => Number(entry.index) === Number(targetEntryIndex));
            if (targetEntry && Number.isFinite(Number(targetEntry.globalEnd))) {
                caret = Number(targetEntry.globalEnd);
            }
        }
        if (!Number.isFinite(Number(caret))) {
            caret = source.length;
        }
        caret = Math.max(0, Math.min(Number(caret), source.length));
        this.setCaretOffset(caret, true);
        this.lastInteractedEntryIndex = targetEntryIndex;
        let token = this.findFieldTokenAtCaretForField(caret, field.key);
        let cleanupTokenIdOnClose = '';
        if (!token) {
            token = this.resolveFieldTokenForInteraction(targetEntryIndex, field.key, '', 'inline');
        }
        if (!token && !applyToAll) {
            const prefix = this.getPrimaryPrefixForField(field);
            const beforeChar = source.charAt(Math.max(0, caret - 1));
            const needsSpace = !!beforeChar && !/\s/.test(beforeChar);
            const snippet = `${needsSpace ? ' ' : ''}${prefix}`;
            source = this.replaceRange(source, caret, caret, snippet);
            caret += snippet.length;
            this.parseAndRender({
                source,
                caretOffset: caret,
                focusInput: true,
                skipTypingSync: true
            });
            token = this.resolveFieldTokenForInteraction(targetEntryIndex, field.key, '', 'inline')
                || this.findFieldTokenAtCaretForField(caret, field.key);
            if (token && token.id) {
                cleanupTokenIdOnClose = String(token.id);
            }
        }
        if (!token && !applyToAll) {
            return;
        }
        const currentEntryValue = this.getEntryFieldCurrentValueForActionBar(targetEntryIndex, field.key);
        const entryIndex = token && Number.isFinite(Number(token.entryIndex))
            ? Number(token.entryIndex)
            : this.getEntryIndexAtCaret(caret);
        if (isDateFieldType(field.type)) {
            this.openDatePicker({
                field,
                token,
                value: token ? token.value : currentEntryValue,
                entryIndex,
                anchorEl: anchorEl || this.inputEl,
                sourceRegion: 'inline',
                cleanupTokenIdOnClose,
                applyToAll
            });
            return;
        }
        const supportsDropdown = this.fieldSupportsDropdown(field, entryIndex, field.key);
        const supportsInput = this.fieldSupportsActionInput(field);
        if (!supportsDropdown && !supportsInput) {
            return;
        }
        const options = supportsDropdown
            ? this.getDropdownOptionsForField(field, entryIndex, field.key)
            : [];
        if (supportsDropdown && options.length === 0) {
            return;
        }
        this.openFieldInputDropdown({
            field,
            tokenId: token && token.id ? token.id : '',
            entryIndex,
            entryKey: entryIndex,
            currentValue: token ? (token.value || '') : currentEntryValue,
            searchValue: supportsDropdown ? '' : (token ? (token.value || '') : currentEntryValue),
            allowCustom: supportsDropdown ? !!field.allowCustom : true,
            options,
            sourceRegion: 'inline',
            anchorEl: anchorEl || this.inputEl,
            source: supportsDropdown ? 'click' : 'action-input',
            cleanupTokenIdOnClose,
            applyToAll
        });
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
            this.lastInteractedEntryIndex = resolvedEntryIndex;
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
            const supportsDropdown = this.fieldSupportsDropdown(field, entryId, fieldKey);
            const supportsInput = this.fieldSupportsActionInput(field);
            if (!supportsDropdown && !supportsInput) {
                return;
            }
            const options = supportsDropdown
                ? this.getDropdownOptionsForField(field, entryId, fieldKey)
                : [];
            if (supportsDropdown && options.length === 0) {
                return;
            }
            this.openFieldInputDropdown({
                field,
                tokenId: '',
                entryIndex: resolvedEntryIndex,
                entryKey: entryId,
                currentValue,
                searchValue: supportsDropdown ? '' : currentValue,
                allowCustom: supportsDropdown ? !!field.allowCustom : true,
                options,
                sourceRegion,
                anchorRect: pillEl.getBoundingClientRect(),
                anchorEl: pillEl,
                source: supportsDropdown ? 'click' : 'action-input',
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

        const fieldKey = pillEl.getAttribute('data-pill-field');
        const tokenId = pillEl.getAttribute('data-pill-token');
        const pillValue = pillEl.getAttribute('data-pill-value') || '';
        if (!fieldKey || Number.isNaN(entryIndex)) {
            return;
        }
        this.lastInteractedEntryIndex = entryIndex;

        const field = this.getFieldDefinition(fieldKey);
        if (!field) {
            return;
        }

        let token = tokenId ? this.tokenMap[tokenId] : null;
        let anchorElForOpen = pillEl;
        if (!token && pillValue) {
            token = this.materializeEntryFieldToken(entryIndex, fieldKey, pillValue, sourceRegion);
            if (token && token.id) {
                anchorElForOpen = this.resolvePillAnchorForToken(sourceRegion, token.id, pillEl);
            }
        }

        if (isDateFieldType(field.type)) {
            if (Date.now() < this.datePickerSuppressUntil) {
                return;
            }
            if (token && this.datePickerState && this.datePickerState.tokenId === token.id) {
                this.closeDatePicker();
                return;
            }
            if (anchorElForOpen) {
                anchorElForOpen.setAttribute('data-qa-date-pill', '1');
            }
            this.openDatePicker({
                field,
                token,
                entryIndex,
                anchorEl: anchorElForOpen || pillEl,
                sourceRegion
            });
            return;
        }
        if (field.type === 'number' && this.isNumberStepperEnabledForField(field)) {
            return;
        }

        const supportsDropdown = this.fieldSupportsDropdown(field, entryIndex, fieldKey);
        const supportsInput = this.fieldSupportsActionInput(field);
        if (!supportsDropdown && !supportsInput) {
            return;
        }

        const options = supportsDropdown
            ? this.getDropdownOptionsForField(field, entryIndex, fieldKey)
            : [];
        if (supportsDropdown && options.length === 0) {
            return;
        }

        this.openFieldInputDropdown({
            field,
            tokenId: token ? token.id : '',
            entryIndex,
            entryKey: entryIndex,
            currentValue: (field.multiple && field.type === 'options')
                ? (pillValue || (token ? token.value : ''))
                : (token ? token.value : pillValue),
            searchValue: supportsDropdown
                ? ''
                : ((field.multiple && field.type === 'options')
                    ? (pillValue || (token ? token.value : ''))
                    : (token ? token.value : pillValue)),
            allowCustom: supportsDropdown ? !!field.allowCustom : true,
            options,
            sourceRegion,
            anchorRect: anchorElForOpen && anchorElForOpen.getBoundingClientRect
                ? anchorElForOpen.getBoundingClientRect()
                : pillEl.getBoundingClientRect(),
            anchorEl: anchorElForOpen || pillEl,
            source: supportsDropdown ? 'click' : 'action-input'
        });
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
            const token = this.tokenMap[tokenId] || this.findInferredById(tokenId);
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
        if (Number.isFinite(Number(caretOffset))) {
            const source = String(this.inputText || this.readInputText() || '');
            const safeOffset = Math.max(0, Math.min(Number(caretOffset), source.length));
            if (safeOffset < source.length && /\s/.test(source.charAt(safeOffset) || '')) {
                const token = tokenId ? this.tokenMap[tokenId] : null;
                const isTokenRightEdge = token && safeOffset === Number(token.globalEnd) && clickX >= midpoint;
                if (isTokenRightEdge || this.findCommittedFieldTokenEndingAtOffset(safeOffset)) {
                    caretOffset = safeOffset + 1;
                }
            }
        }
        this.closeDropdown();
        this.setCaretOffset(Number(caretOffset), true);
    };

    QuickAddComponent.prototype.positionDropdownAtRect = function positionDropdownAtRect(rect, anchorEl) {
        // Reset stale max-height constraints before measurement so the panel can grow
        // when option count increases between typing/backspace cycles.
        this.dropdownEl.style.removeProperty('max-height');
        this.dropdownListEl.style.removeProperty('max-height');
        const maxPanelHeight = 250;
        const layout = this.computeFloatingLayout({
            panelEl: this.dropdownEl,
            anchorRect: rect,
            anchorEl: anchorEl || this.inputEl,
            ignoreAnchorClip: true,
            minWidth: 260,
            maxWidth: 320,
            preferredWidth: 320,
            maxPanelHeight,
            gap: 0,
            fallbackHeight: maxPanelHeight,
            preferredPlacement: 'bottom',
            flip: true,
            allowExpand: false
        });

        const viewportPad = 8;
        const viewportBottom = Math.max(viewportPad, window.innerHeight - viewportPad);
        let nextTop = Number(layout.top || 0);
        let nextPanelHeight = Math.max(0, Number(layout.panelHeight || 0));
        if ((nextTop + nextPanelHeight) > viewportBottom) {
            const overflow = (nextTop + nextPanelHeight) - viewportBottom;
            nextTop = Math.max(viewportPad, nextTop - overflow);
        }
        if (nextTop < viewportPad) {
            nextTop = viewportPad;
        }
        nextPanelHeight = Math.min(nextPanelHeight, Math.max(0, viewportBottom - nextTop));

        this.dropdownEl.style.position = 'fixed';
        this.dropdownEl.style.left = `${layout.left}px`;
        this.dropdownEl.style.top = `${nextTop}px`;
        this.dropdownEl.style.width = `${layout.width}px`;
        this.dropdownEl.style.maxWidth = `${Math.max(0, layout.viewportWidth)}px`;
        this.dropdownEl.style.maxHeight = `${Math.floor(nextPanelHeight)}px`;
        this.dropdownEl.style.zIndex = '9999';
        const searchHeight = (this.dropdownSearchEl && !this.dropdownSearchEl.hidden)
            ? Math.ceil(this.dropdownSearchEl.getBoundingClientRect().height || 0)
            : 0;
        const listMaxHeight = Math.max(0, nextPanelHeight - searchHeight - 1);
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
        this.captureFocusOrigin('blockedInfo', anchorEl || null, this.inputEl);
        this.closeDropdown({ restoreFocus: false });
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
        const layout = this.computeFloatingLayout({
            panelEl: this.blockedInfoEl,
            anchorRect: rect,
            anchorEl: anchorEl || this.inputEl,
            ignoreAnchorClip: true,
            minWidth: 180,
            maxWidth: 420,
            preferredWidth: Math.max(180, (rect.width || 0) + 90),
            maxPanelHeight: 220,
            gap: 8,
            fallbackHeight: 88,
            preferredPlacement: 'bottom',
            flip: true,
            allowExpand: false
        });
        this.blockedInfoEl.style.position = 'fixed';
        this.blockedInfoEl.style.left = `${layout.left}px`;
        this.blockedInfoEl.style.top = `${layout.top}px`;
        this.blockedInfoEl.style.marginTop = '0';
        this.blockedInfoEl.style.width = `${layout.width}px`;
        this.blockedInfoEl.style.maxWidth = `${layout.viewportWidth}px`;
        this.blockedInfoEl.style.maxHeight = `${Math.floor(layout.panelHeight)}px`;
        this.blockedInfoEl.style.overflow = 'auto';
        this.blockedInfoEl.style.zIndex = '10000';
        this.blockedInfoEl.style.removeProperty('position-anchor');
        this.blockedInfoEl.style.removeProperty('position-try-fallbacks');
        this.blockedInfoEl.hidden = false;
    };

    QuickAddComponent.prototype.closeBlockedInfo = function closeBlockedInfo(options) {
        const opts = options || {};
        this.blockedInfoState = null;
        if (!this.blockedInfoEl) {
            return;
        }
        if (this.blockedInfoEl.parentNode) {
            this.blockedInfoEl.parentNode.removeChild(this.blockedInfoEl);
        }
        this.blockedInfoEl = null;
        if (opts.restoreFocus !== false) {
            this.restoreFocusOrigin('blockedInfo');
        }
    };

    QuickAddComponent.prototype.renderDropdownList = function renderDropdownList() {
        if (!this.dropdownState) {
            this.dropdownListEl.innerHTML = '';
            this.updateDropdownScrollIndicators();
            this.syncDropdownA11y();
            return;
        }

        const c = this.config.classNames;
        const field = this.getFieldDefinition(this.dropdownState.fieldKey);
        const isFieldMenu = this.dropdownState.source === 'field-menu';
        const fieldLabel = field && field.label ? field.label : (this.dropdownState.fieldKey || 'options');
        this.dropdownListEl.setAttribute('aria-label', `${fieldLabel} options`);
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
                option.label.toLowerCase().includes(query)
                || option.value.toLowerCase().includes(query)
                || String(option.prefix || '').toLowerCase().includes(query)
            );
        }
        if (isMultiSelectOptions && this.config.sortSelectedMultiOptionsToBottom !== false && filtered.length > 1) {
            const unselected = [];
            const selected = [];
            filtered.forEach((option) => {
                if (selectedNorm.has(normValue(option.value))) {
                    selected.push(option);
                } else {
                    unselected.push(option);
                }
            });
            filtered = unselected.concat(selected);
        }

        const items = filtered.map((option, idx) => {
            const colorStyle = option.color ? ` style="background:${escHtml(option.color)}"` : '';
            const selected = isMultiValueDropdown
                ? selectedNorm.has(normValue(option.value))
                : normValue(option.value) === normValue(this.dropdownState.currentValue);
            const active = this.dropdownState.activeOptionValue !== null
                && this.dropdownState.activeOptionValue !== undefined
                && normValue(option.value) === normValue(this.dropdownState.activeOptionValue);
            const optionId = `${this.dropdownOptionIdPrefix}${idx}`;
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
            const typeMeta = option.metaType
                ? `<span class="${c.dropdownMeta} ${c.dropdownMetaType}">${escHtml(option.metaType)}</span>`
                : (option.meta ? `<span class="${c.dropdownMeta} ${c.dropdownMetaType}">${escHtml(option.meta)}</span>` : '');
            const badgeBits = [];
            if (option.required) {
                badgeBits.push(`<span class="${c.dropdownMetaBadgeRequired}" title="Required" aria-label="Required">✱</span>`);
            }
            if (option.autoDetect) {
                badgeBits.push(`<span class="${c.dropdownMetaBadgeAuto}" title="Auto-detected" aria-label="Auto-detected">⚡</span>`);
            }
            const badgeMeta = badgeBits.length
                ? `<span class="${c.dropdownMeta} ${c.dropdownMetaBadges}">${badgeBits.join('')}</span>`
                : '';
            const fieldGlyphToneClass = (
                {
                    required: c.dropdownFieldGlyphToneRequired,
                    auto: c.dropdownFieldGlyphToneAuto,
                    default: c.dropdownFieldGlyphToneDefault,
                    limited: c.dropdownFieldGlyphToneLimited,
                    multi: c.dropdownFieldGlyphToneMulti,
                    meta: c.dropdownFieldGlyphToneMeta
                }[String(option.metaTone || '')]
                || c.dropdownFieldGlyphTonePlain
            );
            const trailingMeta = isFieldMenu
                ? `<span class="${c.dropdownMeta} ${c.dropdownFieldPrefix}" title="${escHtml(String(option.prefix || ''))}">${escHtml(String(option.prefix || ''))}</span>`
                : (selected
                    ? `<span class="${c.dropdownMeta} qa-dropdown-selected-meta" aria-hidden="true">${selectedCheckIcon}</span>`
                    : (usedMeta || `${typeMeta}${badgeMeta}`));
            const showAttachmentPreview = this.config.showAttachmentDropdownPreview !== false;
            const leadingVisual = isFieldMenu
                ? `<span class="${c.dropdownFieldGlyph} ${fieldGlyphToneClass}" title="${escHtml(String(option.metaSummary || ''))}" aria-hidden="true">${escHtml(String(option.typeGlyph || ''))}</span>`
                : (isFileFieldType(this.dropdownState.fieldType) && showAttachmentPreview
                    ? (option.previewUrl
                        ? `<img class="${c.dropdownAttachmentPreview}" src="${escHtml(option.previewUrl)}" alt="" loading="lazy" aria-hidden="true" />`
                        : `<span class="${c.dropdownAttachmentIcon}" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="13 2 13 9 20 9"/></svg></span>`)
                    : `<span class="${c.dropdownColor}"${colorStyle}></span>`);
            return `
                <button type="button" id="${optionId}" role="option" aria-selected="${selected ? 'true' : 'false'}" class="${c.dropdownOption}${active ? ` ${c.dropdownOptionActive}` : ''}" data-option-value="${escHtml(option.value)}">
                    ${leadingVisual}
                    <span class="qa-dropdown-label">${escHtml(option.label)}</span>
                    ${trailingMeta}
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
        const customValue = filterRaw.trim();
        const allowCustomOption = !!(
            this.dropdownState.allowCustom
            && !!(field && field.type === 'options')
            && !isFileFieldType(this.dropdownState.fieldType)
            && query
            && !exactMatch
            && customAllowedByDependency
        );

        if (allowCustomOption) {
            const customId = `${this.dropdownOptionIdPrefix}${filtered.length}`;
            const customActive = this.dropdownState.activeOptionValue !== null
                && this.dropdownState.activeOptionValue !== undefined
                && normValue(this.dropdownState.activeOptionValue) === normValue(customValue);
            items.push(`
                <button type="button" id="${customId}" role="option" aria-selected="${customActive ? 'true' : 'false'}" class="${c.dropdownOption} ${c.dropdownAdd}${customActive ? ` ${c.dropdownOptionActive}` : ''}" data-option-value="${escHtml(customValue)}">
                    <span class="${c.dropdownColor}"></span>
                    <span class="qa-dropdown-label">Add "${escHtml(customValue)}"</span>
                    <span class="${c.dropdownMeta}">custom</span>
                </button>
            `);
        }

        if (items.length === 0) {
            const dependencyBlocked = dependencyFiltered.length === 0;
            const msg = this.dropdownState.source === 'action-input'
                ? 'Type a value and press Enter'
                : (dependencyBlocked ? 'No options (constraints active)' : 'No options');
            this.dropdownListEl.innerHTML = `<div class="${c.dropdownMeta}" style="padding:8px 10px;">${escHtml(msg)}</div>`;
            this.dropdownState.filteredOptions = [];
            this.dropdownState.activeOptionValue = null;
            this.updateDropdownScrollIndicators();
            this.syncDropdownA11y();
            return;
        }

        const navigableOptions = filtered.slice();
        if (allowCustomOption) {
            navigableOptions.push({ value: customValue });
        }
        this.dropdownState.filteredOptions = navigableOptions;
        const hasActive = this.dropdownState.activeOptionValue !== null
            && this.dropdownState.activeOptionValue !== undefined
            && navigableOptions.some((option) => normValue(option.value) === normValue(this.dropdownState.activeOptionValue));
        if (!hasActive && this.dropdownState.activateFirstOnOpen) {
            const preferTopUnselected = isMultiSelectOptions && this.config.sortSelectedMultiOptionsToBottom !== false;
            const firstSelected = navigableOptions.find((option) => selectedNorm.has(normValue(option.value)));
            const firstUnselected = navigableOptions.find((option) => !selectedNorm.has(normValue(option.value)));
            this.dropdownState.activeOptionValue = (
                preferTopUnselected
                    ? (firstUnselected || navigableOptions[0] || {})
                    : (firstSelected || navigableOptions[0] || {})
            ).value || null;
            this.dropdownState.activateFirstOnOpen = false;
            return this.renderDropdownList();
        }
        if (!hasActive && !this.dropdownState.keepActiveWhenFiltering) {
            this.dropdownState.activeOptionValue = null;
        }
        this.dropdownState.keepActiveWhenFiltering = false;
        this.dropdownListEl.innerHTML = items.join('');
        this.updateDropdownScrollIndicators();
        this.syncDropdownA11y();
    };

    QuickAddComponent.prototype.updateDropdownScrollIndicators = function updateDropdownScrollIndicators() {
        return;
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

    QuickAddComponent.prototype.discardPendingTokenById = function discardPendingTokenById(tokenId, options) {
        const id = String(tokenId || '').trim();
        if (!id) {
            return false;
        }
        const token = this.tokenMap && this.tokenMap[id];
        if (!token || token.kind !== 'field' || token.committed) {
            return false;
        }
        const source = String(this.inputText || this.readInputText() || '');
        const start = Math.max(0, Math.min(Number(token.globalStart) || 0, source.length));
        const end = Math.max(start, Math.min(Number(token.globalEnd) || start, source.length));
        if (end <= start) {
            return false;
        }
        let updated = this.replaceRange(source, start, end, '');
        if (start > 0 && start < updated.length && updated.charAt(start - 1) === ' ' && updated.charAt(start) === ' ') {
            updated = this.replaceRange(updated, start, start + 1, '');
        }
        const opts = options || {};
        this.parseAndRender({
            source: updated,
            caretOffset: Math.max(0, Math.min(start, updated.length)),
            focusInput: opts.focusInput === true,
            skipTypingSync: true
        });
        return true;
    };

    QuickAddComponent.prototype.runBeforeCommitField = async function runBeforeCommitField(context) {
        const handler = this.config.validation && this.config.validation.beforeCommitField;
        if (typeof handler !== 'function') {
            return { allow: true, value: context.nextValue };
        }
        const decision = await handler(context);
        if (!decision || typeof decision !== 'object') {
            return { allow: true, value: context.nextValue };
        }
        if (decision.allow === false) {
            return {
                allow: false,
                reason: String(decision.reason || 'Blocked by beforeCommitField')
            };
        }
        return {
            allow: true,
            value: Object.prototype.hasOwnProperty.call(decision, 'value') ? decision.value : context.nextValue,
            warning: decision.warning ? String(decision.warning) : ''
        };
    };

    QuickAddComponent.prototype.addOrUpdateFieldOption = function addOrUpdateFieldOption(fieldKey, option) {
        const field = this.getFieldDefinition(fieldKey);
        if (!field || field.type !== 'options') {
            return null;
        }
        const normalized = normalizeOption(option);
        const existing = Array.isArray(field.options) ? field.options.slice() : [];
        const idx = existing.findIndex((item) => normValue(item && item.value) === normValue(normalized.value));
        if (idx >= 0) {
            existing[idx] = normalized;
        } else {
            existing.push(normalized);
        }
        field.options = existing;
        return normalized;
    };

    QuickAddComponent.prototype.resolveCustomOptionSelection = async function resolveCustomOptionSelection(state, value, selectedOption) {
        if (selectedOption || !state.allowCustom || state.fieldType !== 'options') {
            return {
                accepted: true,
                option: selectedOption,
                value
            };
        }
        const trimmed = String(value || '').trim();
        if (!trimmed) {
            return { accepted: false, reason: 'Custom value is empty' };
        }
        const createHandler = this.config.options && this.config.options.onCreateOption;
        let normalized = normalizeOption({ value: trimmed, label: trimmed });
        if (typeof createHandler === 'function') {
            const response = await createHandler({
                fieldKey: state.fieldKey,
                value: trimmed,
                label: trimmed,
                entryIndex: state.entryIndex,
                source: state.source === 'typing' ? 'typing' : 'click'
            });
            if (response === null || response === false) {
                return { accepted: false, reason: 'Custom value rejected' };
            }
            if (response && typeof response === 'object') {
                normalized = normalizeOption({
                    value: response.value !== undefined ? response.value : trimmed,
                    label: response.label !== undefined ? response.label : (response.value !== undefined ? response.value : trimmed),
                    color: response.color
                });
            }
        }
        const persisted = this.addOrUpdateFieldOption(state.fieldKey, normalized) || normalized;
        const optionsChange = this.config.options && this.config.options.onOptionsCatalogChange;
        if (typeof optionsChange === 'function') {
            const field = this.getFieldDefinition(state.fieldKey);
            const nextOptions = Array.isArray(field && field.options) ? field.options.map(normalizeOption) : [];
            optionsChange({
                fieldKey: state.fieldKey,
                options: nextOptions
            });
        }
        return {
            accepted: true,
            option: persisted,
            value: String(persisted.value)
        };
    };

    QuickAddComponent.prototype.applyDeterministicFieldValueToAllEntries = function applyDeterministicFieldValueToAllEntries(options) {
        if (this.isAiMode() || !options || !options.fieldKey) {
            return null;
        }
        const field = this.getFieldDefinition(options.fieldKey);
        if (!field) {
            return null;
        }
        const entries = Array.isArray(this.lastResult && this.lastResult.entries)
            ? this.lastResult.entries.slice().sort((a, b) => Number(b.globalStart) - Number(a.globalStart))
            : [];
        if (!entries.length) {
            return null;
        }
        const separator = String(this.config.multiSelectSeparator || ',');
        const terminator = String(this.config.fieldTerminator || '');
        const targetValue = String(options.nextValue === undefined || options.nextValue === null ? '' : options.nextValue);
        const multiToggleMode = options.multiToggleMode === 'add' || options.multiToggleMode === 'remove'
            ? options.multiToggleMode
            : '';
        let source = String(this.inputText || this.readInputText() || '');
        entries.forEach((entry) => {
            const tokens = (entry.tokens || []).filter((token) => token && token.kind === 'field' && token.key === field.key);
            const token = tokens.length ? tokens[tokens.length - 1] : null;
            let nextValueForEntry = targetValue;
            if (field.multiple && field.type === 'options' && multiToggleMode) {
                const existingValues = token
                    ? splitByMultiSeparator(token.value || '', separator)
                    : this.resolveEntryFieldValues(entry, field.key);
                const targetNorm = normValue(targetValue);
                const nextValues = dedupeMultiValues(existingValues);
                const existingIndex = nextValues.findIndex((item) => normValue(item) === targetNorm);
                if (multiToggleMode === 'add') {
                    if (existingIndex < 0) {
                        nextValues.push(targetValue);
                    }
                } else if (existingIndex >= 0) {
                    nextValues.splice(existingIndex, 1);
                }
                nextValueForEntry = nextValues.join(`${separator} `);
            }
            if (!token && multiToggleMode === 'remove') {
                return;
            }
            if (token) {
                source = this.replaceRange(source, token.globalValueStart, token.globalValueEnd, nextValueForEntry);
                let caret = token.globalValueStart + nextValueForEntry.length;
                if (!token.committed && terminator) {
                    const tokenTail = source.slice(caret, caret + terminator.length);
                    if (tokenTail !== terminator) {
                        source = this.replaceRange(source, caret, caret, terminator);
                        caret += terminator.length;
                    }
                    const nextChar = source.charAt(caret);
                    if (nextChar !== '\n' && !/\s/.test(nextChar || '')) {
                        source = this.replaceRange(source, caret, caret, ' ');
                    }
                }
                return;
            }
            if (!nextValueForEntry && !terminator) {
                return;
            }
            const prefix = this.getPrimaryPrefixForField(field);
            const insertAt = Math.max(0, Math.min(Number(entry.globalEnd) || 0, source.length));
            const beforeChar = source.charAt(Math.max(0, insertAt - 1));
            const needsSpace = !!beforeChar && !/\s/.test(beforeChar);
            const snippet = `${needsSpace ? ' ' : ''}${prefix}${nextValueForEntry}${terminator}`;
            source = this.replaceRange(source, insertAt, insertAt, snippet);
            const afterInsert = insertAt + snippet.length;
            const nextChar = source.charAt(afterInsert);
            if (nextChar && nextChar !== '\n' && !/\s/.test(nextChar)) {
                source = this.replaceRange(source, afterInsert, afterInsert, ' ');
            }
        });
        return source;
    };

    QuickAddComponent.prototype.applyDropdownSelection = async function applyDropdownSelection(nextValue) {
        if (!this.dropdownState) {
            return;
        }
        const state = Object.assign({}, this.dropdownState);
        if (state.source === 'field-menu') {
            const menuOption = (state.options || []).find((option) => normValue(option && option.value) === normValue(nextValue)) || null;
            if (!menuOption || !menuOption.prefix) {
                this.closeDropdown();
                return;
            }
            const context = state.fieldMenuContext || this.findFieldMenuContextAtCaret(this.getCaretOffset());
            if (!context) {
                this.closeDropdown();
                return;
            }
            const source = String(this.inputText || this.readInputText() || '');
            const updated = this.replaceRange(source, context.triggerStart, context.caretOffset, String(menuOption.prefix));
            const caret = context.triggerStart + String(menuOption.prefix).length;
            this.closeDropdown();
            this.parseAndRender({
                source: updated,
                caretOffset: caret,
                focusInput: true
            });
            return;
        }
        const field = this.getFieldDefinition(state.fieldKey);
        const isMultiSelectOptions = !!(field && field.type === 'options' && field.multiple);
        let selectedOption = (state.options || []).find((option) => normValue(option.value) === normValue(nextValue)) || null;
        const customResult = await this.resolveCustomOptionSelection(state, nextValue, selectedOption);
        if (!customResult.accepted) {
            this.statusEl.textContent = customResult.reason || 'Custom option not accepted';
            return;
        }
        nextValue = customResult.value;
        if (customResult.option) {
            selectedOption = customResult.option;
            if (!Array.isArray(state.options)) {
                state.options = [];
            }
            if (!state.options.some((item) => normValue(item && item.value) === normValue(selectedOption.value))) {
                state.options.push(normalizeOption(selectedOption));
            }
        }
        const allowed = this.isFieldValueDependencyAllowed(
            state.fieldKey,
            nextValue,
            state.entryIndex
        );
        if (!allowed.ok) {
            return;
        }
        const commitValidation = await this.runBeforeCommitField({
            entryIndex: state.entryIndex,
            entryKey: state.entryKey,
            fieldKey: state.fieldKey,
            nextValue,
            source: state.source,
            sourceRegion: state.sourceRegion,
            fieldType: state.fieldType
        });
        if (!commitValidation.allow) {
            this.statusEl.textContent = commitValidation.reason || 'Value blocked';
            return;
        }
        nextValue = commitValidation.value;
        if (commitValidation.warning) {
            this.statusEl.textContent = commitValidation.warning;
        }
        if (this.dropdownState) {
            this.dropdownState.cleanupTokenIdOnClose = '';
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
        if (state.applyToAll === true && !this.isAiMode() && !isFileFieldType(state.fieldType)) {
            const separator = String(this.config.multiSelectSeparator || ',');
            const selectedNorm = normValue(nextValue);
            const selectedInCurrent = isMultiSelectOptions
                ? splitByMultiSeparator(state.currentValue || '', separator).some((item) => normValue(item) === selectedNorm)
                : false;
            this.fieldActionApplyToAllEnabled = true;
            const updatedAll = this.applyDeterministicFieldValueToAllEntries({
                fieldKey: state.fieldKey,
                nextValue,
                multiToggleMode: isMultiSelectOptions ? (selectedInCurrent ? 'remove' : 'add') : ''
            });
            const focusInput = this.shouldRefocusInputAfterCommit({
                source: state.source,
                sourceRegion: state.sourceRegion,
                anchorEl: state.anchorEl
            });
            this.closeDropdown();
            if (typeof updatedAll === 'string') {
                this.parseAndRender({
                    source: updatedAll,
                    focusInput,
                    skipTypingSync: true
                });
            }
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
        const terminator = String(this.config.fieldTerminator || '');
        const fromTyping = state.source === 'typing' || state.source === 'action-input';
        const escapedSeparator = String(separator || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedTerminator = String(terminator || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let replacement = String(nextValue);
        let updated = source;
        let caret = token.globalValueStart + replacement.length;
        let keepOpen = false;

        if (isMultiSelectOptions) {
            keepOpen = fromTyping || state.source === 'click';
            let appendedContinuationSpace = false;
            let values;
            if (fromTyping) {
                const rawTokenValue = String(token.value || '');
                const hasSeparator = !!(separator && rawTokenValue.includes(separator));
                const parts = separator ? rawTokenValue.split(separator) : [rawTokenValue];
                const trailingPart = parts.length ? String(parts[parts.length - 1] || '') : '';
                const leadingValues = dedupeMultiValues(parts.slice(0, -1));
                const fullValues = dedupeMultiValues(parts);
                const hasTrailingQuery = hasSeparator && trailingPart.trim().length > 0;
                const hasTrailingSeparator = hasSeparator && trailingPart.trim().length === 0;
                if (!token.committed && !hasSeparator) {
                    values = [];
                } else if (hasTrailingQuery || hasTrailingSeparator) {
                    values = leadingValues;
                } else {
                    values = fullValues;
                }
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
            if (fromTyping && didAdd && values.length > 0 && !token.committed) {
                replacement = `${replacement}${separator} `;
                appendedContinuationSpace = true;
            }
            caret = token.globalValueStart + replacement.length - (appendedContinuationSpace ? 1 : 0);
            updated = this.replaceRange(source, token.globalValueStart, token.globalValueEnd, replacement);
        } else {
            updated = this.replaceRange(source, token.globalValueStart, token.globalValueEnd, replacement);
        }

        if (isMultiSelectOptions && fromTyping && escapedSeparator && escapedTerminator) {
            const beforeCaret = updated.slice(0, caret);
            const afterCaret = updated.slice(caret);
            if (new RegExp(`${escapedSeparator}\\s*$`).test(beforeCaret) && new RegExp(`^\\s*${escapedTerminator}`).test(afterCaret)) {
                const trimmedBefore = beforeCaret.replace(new RegExp(`${escapedSeparator}\\s*$`), '');
                updated = trimmedBefore + afterCaret;
                caret = trimmedBefore.length;
            }
            const refreshedAfter = updated.slice(caret);
            const trimmedAfter = refreshedAfter.replace(new RegExp(`^\\s*${escapedSeparator}\\s*(?=${escapedTerminator})`), '');
            if (trimmedAfter.length !== refreshedAfter.length) {
                updated = updated.slice(0, caret) + trimmedAfter;
            }
        }

        if (!token.committed && terminator && !(isMultiSelectOptions && fromTyping && keepOpen)) {
            const tokenTail = updated.slice(caret, caret + terminator.length);
            let appendedTerminator = false;
            const shouldAppendTerminator = (
                tokenTail !== terminator
                && (fromTyping || state.source === 'click' || this.config.fieldTerminatorMode === 'strict')
            );
            if (shouldAppendTerminator) {
                if (isMultiSelectOptions && fromTyping) {
                    if (escapedSeparator) {
                        const beforeCaret = updated.slice(0, caret);
                        const trimmedBefore = beforeCaret.replace(new RegExp(`${escapedSeparator}\\s*$`), '');
                        if (trimmedBefore.length !== beforeCaret.length) {
                            updated = trimmedBefore + updated.slice(caret);
                            caret = trimmedBefore.length;
                        }
                        const afterCaret = updated.slice(caret);
                        const trimmedAfter = afterCaret.replace(new RegExp(`^\\s*${escapedSeparator}\\s*`), '');
                        if (trimmedAfter.length !== afterCaret.length) {
                            updated = updated.slice(0, caret) + trimmedAfter;
                        }
                    }
                }
                updated = this.replaceRange(updated, caret, caret, terminator);
                caret += terminator.length;
                appendedTerminator = true;
            }
            if (fromTyping || appendedTerminator) {
                const nextChar = updated.charAt(caret);
                if (nextChar !== '\n' && !/\s/.test(nextChar || '')) {
                    updated = this.replaceRange(updated, caret, caret, ' ');
                    caret += 1;
                }
            }
        }

        if (isMultiSelectOptions && fromTyping && escapedSeparator && terminator) {
            const valueStart = Math.max(0, Number(token.globalValueStart) || 0);
            const terminatorIndex = updated.indexOf(terminator, valueStart);
            if (terminatorIndex > valueStart) {
                const rawValueSegment = updated.slice(valueStart, terminatorIndex);
                const cleanedValueSegment = rawValueSegment.replace(new RegExp(`${escapedSeparator}\\s*$`), '');
                if (cleanedValueSegment.length !== rawValueSegment.length) {
                    const delta = rawValueSegment.length - cleanedValueSegment.length;
                    updated = `${updated.slice(0, valueStart)}${cleanedValueSegment}${updated.slice(terminatorIndex)}`;
                    const removedStart = valueStart + cleanedValueSegment.length;
                    const removedEnd = valueStart + rawValueSegment.length;
                    if (caret > removedEnd) {
                        caret -= delta;
                    } else if (caret > removedStart) {
                        caret = removedStart;
                    }
                }
            }
        }
        if (isMultiSelectOptions && fromTyping && escapedSeparator && escapedTerminator) {
            const beforeCleanup = updated;
            updated = updated.replace(new RegExp(`${escapedSeparator}\\s*(?=${escapedTerminator})`, 'g'), '');
            if (updated.length !== beforeCleanup.length) {
                caret = Math.max(0, Math.min(caret, updated.length));
            }
        }

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        const focusInput = this.shouldRefocusInputAfterCommit({
            source: state.source,
            sourceRegion: state.sourceRegion,
            anchorEl: state.anchorEl
        });
        if (!keepOpen) {
            this.closeDropdown();
        }
        const shouldRunTypingSync = keepOpen && fromTyping && state.sourceRegion !== 'card';
        this.parseAndRender({
            source: updated,
            caretOffset: caret,
            focusInput,
            skipTypingSync: !shouldRunTypingSync
        });

        if (keepOpen && !fromTyping) {
            const entry = (this.lastResult.entries || []).find((item) => item.index === state.entryIndex);
            const nextToken = entry
                ? (entry.tokens || []).filter((item) => item.kind === 'field' && item.key === state.fieldKey && item.committed).slice(-1)[0]
                : null;
            const preferTopUnselected = isMultiSelectOptions && this.config.sortSelectedMultiOptionsToBottom !== false;
            this.dropdownState = {
                fieldKey: state.fieldKey,
                fieldType: state.fieldType,
                tokenId: nextToken ? nextToken.id : state.tokenId,
                entryIndex: state.entryIndex,
                entryKey: state.entryKey,
                currentValue: replacement,
                allowCustom: !!state.allowCustom,
                options: Array.isArray(state.options) ? state.options.slice() : [],
                sourceRegion: state.sourceRegion || 'inline',
                anchorRect: state.anchorRect || (state.anchorEl && state.anchorEl.getBoundingClientRect ? state.anchorEl.getBoundingClientRect() : null),
                anchorEl: state.anchorEl || null,
                source: state.source,
                activeOptionValue: preferTopUnselected ? null : nextValue,
                filteredOptions: [],
                activateFirstOnOpen: preferTopUnselected,
                keepActiveWhenFiltering: false
            };
            this.dropdownSearchEl.hidden = false;
            this.dropdownSearchEl.value = '';
            this.renderDropdownList();
            this.positionDropdown(state.anchorEl);
            this.captureFocusOrigin('dropdown', state.anchorEl || null, this.inputEl);
            this.dropdownEl.hidden = false;
            this.dropdownEl.classList.add(this.config.classNames.dropdownOpen);
            this.scrollDropdownActiveOptionIntoView();
            this.syncDropdownA11y();
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
        const fallbackRange = sourceRegion === 'card'
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
        const canUseFallbackRange = sourceRegion === 'card'
            && hasFallbackRange
            && !canSyncCardDirectMatch;
        const effectiveSyncStart = canUseFallbackRange ? fallbackStart : syncStart;
        const effectiveSyncEnd = canUseFallbackRange ? fallbackEnd : syncEnd;
        const hasEffectiveSyncRange = Number.isFinite(effectiveSyncStart)
            && Number.isFinite(effectiveSyncEnd)
            && effectiveSyncEnd > effectiveSyncStart;
        const shouldSyncInlineSource = hasEffectiveSyncRange;
        if (shouldSyncInlineSource) {
            const currentChunkText = source.slice(effectiveSyncStart, effectiveSyncEnd);
            let replacementText = String(normalizedNextValue);
            if (currentChunkText) {
                const lowerChunkText = currentChunkText.toLowerCase();
                const needleCandidates = [
                    currentValueText,
                    mappingValueText
                ]
                    .map((value) => String(value === undefined || value === null ? '' : value))
                    .filter(Boolean);
                for (let i = 0; i < needleCandidates.length; i++) {
                    const needle = needleCandidates[i];
                    const startIdx = lowerChunkText.indexOf(needle.toLowerCase());
                    if (startIdx === -1) {
                        continue;
                    }
                    replacementText = `${currentChunkText.slice(0, startIdx)}${String(normalizedNextValue)}${currentChunkText.slice(startIdx + needle.length)}`;
                    break;
                }
            }
            nextSource = this.replaceRange(source, effectiveSyncStart, effectiveSyncEnd, replacementText);
            if (sourceRegion !== 'card') {
                caretOffset = effectiveSyncStart + replacementText.length;
            }
            if (!Array.isArray(entry.spans)) {
                entry.spans = [];
            }
            if (Array.isArray(entry.spans)) {
                const delta = replacementText.length - (effectiveSyncEnd - effectiveSyncStart);
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
                    const isDirectMatch = isTargetField && start === effectiveSyncStart && end === effectiveSyncEnd;
                    const isOccurrenceMatch = isTargetField
                        && !updatedCurrent
                        && fieldOccurrence === expectedOccurrence
                        && (start <= effectiveSyncStart && end >= effectiveSyncEnd);
                    if (!updatedCurrent && (isDirectMatch || isOccurrenceMatch)) {
                        updatedCurrent = true;
                        const nextStart = start;
                        const nextEnd = isDirectMatch
                            ? (nextStart + replacementText.length)
                            : (effectiveSyncStart + replacementText.length);
                        nextSpan = Object.assign({}, span, {
                            start: nextStart,
                            end: nextEnd,
                            value: normalizedNextValue
                        });
                    } else if (start >= effectiveSyncEnd && delta !== 0) {
                        nextSpan = Object.assign({}, span, { start: start + delta, end: end + delta });
                    }
                    if (isTargetField) {
                        fieldOccurrence += 1;
                    }
                    return nextSpan;
                });
                if (!updatedCurrent && fieldKey) {
                    entry.spans.push({
                        field: fieldKey,
                        value: normalizedNextValue,
                        start: effectiveSyncStart,
                        end: effectiveSyncStart + replacementText.length
                    });
                    entry.spans.sort((a, b) => Number(a.start) - Number(b.start) || Number(a.end) - Number(b.end));
                }
                if (Number.isFinite(Number(entry._sourceEnd))) {
                    entry._sourceEnd = Number(entry._sourceEnd) + delta;
                }
                if (delta !== 0) {
                    (this.aiState.entries || []).forEach((candidate) => {
                        if (!candidate || candidate === entry || candidate._id === entryId) {
                            return;
                        }
                        const candidateStart = Number(candidate._sourceStart);
                        const candidateEnd = Number(candidate._sourceEnd);
                        if (Number.isFinite(candidateStart) && candidateStart >= effectiveSyncEnd) {
                            candidate._sourceStart = candidateStart + delta;
                        }
                        if (Number.isFinite(candidateEnd) && candidateEnd >= effectiveSyncEnd) {
                            candidate._sourceEnd = candidateEnd + delta;
                        }
                        if (Array.isArray(candidate.spans)) {
                            candidate.spans = candidate.spans.map((span) => {
                                const start = Number(span && span.start);
                                const end = Number(span && span.end);
                                if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
                                    return span;
                                }
                                if (start >= effectiveSyncEnd) {
                                    return Object.assign({}, span, { start: start + delta, end: end + delta });
                                }
                                if (end > effectiveSyncEnd) {
                                    return Object.assign({}, span, { end: end + delta });
                                }
                                return span;
                            });
                        }
                    });
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
            const preferTopUnselected = !!(field.multiple && this.config.sortSelectedMultiOptionsToBottom !== false);
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
                activeOptionValue: preferTopUnselected ? null : normalizedNextValue,
                filteredOptions: [],
                activateFirstOnOpen: preferTopUnselected,
                keepActiveWhenFiltering: false
            };
            this.dropdownSearchEl.hidden = false;
            this.dropdownSearchEl.value = '';
            this.renderDropdownList();
            this.positionDropdown(options.anchorEl);
            this.captureFocusOrigin('dropdown', options.anchorEl || null, this.inputEl);
            this.dropdownEl.hidden = false;
            this.dropdownEl.classList.add(this.config.classNames.dropdownOpen);
            this.scrollDropdownActiveOptionIntoView();
            this.syncDropdownA11y();
            this.dropdownSearchEl.focus();
        }
    };

    QuickAddComponent.prototype.finalizeOpenMultiValueTokenOnDropdownClose = function finalizeOpenMultiValueTokenOnDropdownClose(state) {
        if (!state || state.source !== 'typing') {
            return false;
        }
        const field = this.getFieldDefinition(state.fieldKey);
        if (!field || field.type !== 'options' || !field.multiple) {
            return false;
        }
        const token = this.tokenMap[state.tokenId];
        if (!token || token.committed) {
            return false;
        }
        const terminator = String(this.config.fieldTerminator || '');
        if (!terminator) {
            return false;
        }
        const source = String(this.inputText || this.readInputText() || '');
        const separator = String(this.config.multiSelectSeparator || ',');
        const escapedSeparator = String(separator || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const valueEnd = Number.isFinite(Number(token.globalValueEnd))
            ? Number(token.globalValueEnd)
            : Number(token.globalEnd);
        const safeValueEnd = Math.max(0, Math.min(Number(valueEnd) || 0, source.length));
        let updated = source;
        let caret = safeValueEnd;
        if (escapedSeparator) {
            const beforeCaret = updated.slice(0, caret);
            const trimmedBefore = beforeCaret.replace(new RegExp(`${escapedSeparator}\\s*$`), '');
            if (trimmedBefore.length !== beforeCaret.length) {
                updated = trimmedBefore + updated.slice(caret);
                caret = trimmedBefore.length;
            }
        }
        const tokenTail = updated.slice(caret, caret + terminator.length);
        if (tokenTail !== terminator) {
            updated = this.replaceRange(updated, caret, caret, terminator);
            caret += terminator.length;
        }
        const nextChar = updated.charAt(caret);
        if (nextChar !== '\n' && !/\s/.test(nextChar || '')) {
            updated = this.replaceRange(updated, caret, caret, ' ');
            caret += 1;
        }
        if (updated === source) {
            return false;
        }
        this.parseAndRender({
            source: updated,
            caretOffset: caret,
            focusInput: true,
            skipTypingSync: true
        });
        return true;
    };

    QuickAddComponent.prototype.closeDropdown = function closeDropdown(options) {
        const opts = options || {};
        const previousState = this.dropdownState;
        const cleanupTokenId = previousState && previousState.cleanupTokenIdOnClose
            ? String(previousState.cleanupTokenIdOnClose)
            : '';
        if (opts.finalizeOpenToken === true) {
            this.finalizeOpenMultiValueTokenOnDropdownClose(previousState);
        }
        this.dropdownState = null;
        if (!this.dropdownEl) {
            return;
        }
        this.dropdownEl.hidden = true;
        this.dropdownEl.classList.remove(this.config.classNames.dropdownOpen);
        this.dropdownListEl.innerHTML = '';
        this.dropdownSearchEl.hidden = false;
        this.dropdownSearchEl.value = '';
        this.dropdownEl.style.removeProperty('max-height');
        this.dropdownListEl.style.removeProperty('max-height');
        this.dropdownListEl.style.removeProperty('min-height');
        this.dropdownListEl.scrollTop = 0;
        if (cleanupTokenId && opts.discardPendingToken !== false) {
            this.discardPendingTokenById(cleanupTokenId, { focusInput: false });
        }
        this.syncDropdownA11y();
        if (opts.restoreFocus !== false) {
            this.restoreFocusOrigin('dropdown');
        }
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
        this.closeAttachmentSourceMenu({ restoreFocus: false });
        this.closeConflictModal();
        this.closeDropdown({ restoreFocus: false });
        this.closeNumberPicker();
        this.closeBlockedInfo({ restoreFocus: false });
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

        this.closeDropdown({ restoreFocus: false });
        this.closeAttachmentSourceMenu({ restoreFocus: false });
        this.closeConflictModal();
        this.closeBlockedInfo({ restoreFocus: false });
        this.closeDatePicker({ restoreFocus: false });
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
        this.closeBlockedInfo({ restoreFocus: false });
        this.closeDatePicker({ restoreFocus: false });
        this.closeNumberPicker();
        this.closeDropdown({ restoreFocus: false });
        this.closeAttachmentSourceMenu({ restoreFocus: false });
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
})(globalThis);
