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
        badges: 'qa-badges',
        badge: 'qa-badge',
        attachmentSection: 'qa-attachment-section',
        attachmentControls: 'qa-attachment-controls',
        attachmentPick: 'qa-attachment-pick',
        attachmentInput: 'qa-attachment-input',
        attachmentHint: 'qa-attachment-hint',
        attachmentList: 'qa-attachment-list',
        attachmentItem: 'qa-attachment-item',
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
        blockedInfo: 'qa-blocked-info',
        blockedInfoAnchored: 'qa-blocked-info-anchored',
        blockedInfoAnchorBelowStart: 'qa-blocked-info-anchor-below-start',
        blockedInfoAnchorBelowEnd: 'qa-blocked-info-anchor-below-end',
        blockedInfoAnchorAboveStart: 'qa-blocked-info-anchor-above-start',
        blockedInfoAnchorAboveEnd: 'qa-blocked-info-anchor-above-end',
        blockedInfoIcon: 'qa-blocked-info-icon',
        blockedInfoText: 'qa-blocked-info-text',
        pillBlocked: 'qa-pill-blocked',
        pillBlockedIcon: 'qa-pill-blocked-icon'
    };

    const DEFAULT_CONFIG = {
        mount: null,
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
        allowEntryAttachments: false,
        allowMultipleAttachments: true,
        allowedAttachmentTypes: [],
        autoDetectOptionsWithoutPrefix: false,
        reduceInferredOptions: true,
        placeholder: 'Type entries with prefixes and terminators...',
        hintText: '',
        schema: {
            fields: []
        },
        classNames: {},
        tokens: {},
        onParse: null
    };

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
        merged.classNames = Object.assign({}, DEFAULT_CLASSNAMES, merged.classNames || {});
        if (typeof merged.allowedAttachmentTypes === 'string') {
            merged.allowedAttachmentTypes = merged.allowedAttachmentTypes
                .split(',')
                .map((part) => part.trim())
                .filter(Boolean);
        } else if (!Array.isArray(merged.allowedAttachmentTypes)) {
            merged.allowedAttachmentTypes = [];
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
            type: 'string', // string | number | options | date | boolean
            enum: [],
            options: [],
            required: false,
            multiple: false,
            naturalDate: false,
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

    function parseDate(rawValue, naturalDate) {
        const raw = String(rawValue).trim();
        const value = raw.toLowerCase();
        if (!value) {
            return { ok: false, error: 'Missing date value' };
        }

        if (naturalDate) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const chrono = (typeof globalThis !== 'undefined' && globalThis.chrono && typeof globalThis.chrono.parseDate === 'function')
                ? globalThis.chrono
                : null;
            if (chrono) {
                const chronoDate = chrono.parseDate(raw, now, { forwardDate: true });
                if (chronoDate && !Number.isNaN(chronoDate.getTime())) {
                    return { ok: true, value: toYMD(chronoDate) };
                }
            }

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

            const parsedNatural = new Date(raw);
            if (!Number.isNaN(parsedNatural.getTime())) {
                return { ok: true, value: toYMD(parsedNatural) };
            }
        }

        const strict = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!strict) {
            return { ok: false, error: 'Date must be YYYY-MM-DD' };
        }

        return { ok: true, value: `${strict[1]}-${strict[2]}-${strict[3]}` };
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
                    findBoundaryMatches(rawEntry, label).forEach((match) => {
                        candidates.push({
                            fieldKey: field.key,
                            value: option.value,
                            label: option.label || option.value,
                            start: match.start,
                            end: match.end
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
                inferred: true
            });
        });

        const entry = {
            index: entryIndex,
            raw: rawEntry,
            globalStart,
            globalEnd: globalStart + rawEntry.length,
            fields,
            explicitValues,
            inferred,
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

    function normValue(value) {
        return String(value).toLowerCase().trim();
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
        this.lastResult = parseInput('', this.config);
        this.tokenMap = {};
        this.dismissedSelections = new Set();
        this.attachmentsByEntry = new Map();
        this.attachmentCounter = 0;
        this.dropdownState = null;
        this.blockedInfoState = null;
        this.blockedAnchorEl = null;
        this.anchorSupportChecked = false;
        this.anchorSupported = false;

        ensureQuickAddStyles();

        this.renderShell();
        this.applyTokens();
        this.bindEvents();
        this.parseAndRender();
    }

    QuickAddComponent.prototype.defaultHintText = function defaultHintText() {
        const separator = this.config.entrySeparator === '\n' ? 'newline' : this.config.entrySeparator;
        return `Field terminator: "${this.config.fieldTerminator}" | Entry separator: "${separator}"`;
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

    QuickAddComponent.prototype.bindEvents = function bindEvents() {
        this.onInput = () => {
            if (this.isRenderingInput) {
                return;
            }
            this.closeDropdown();
            this.closeBlockedInfo();
            if (this.timer) {
                clearTimeout(this.timer);
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

        this.onInputClick = (event) => {
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
                const entryIndex = Number(removeBtn.getAttribute('data-entry-index'));
                const attachmentId = removeBtn.getAttribute('data-attachment-id') || '';
                if (!Number.isNaN(entryIndex) && attachmentId) {
                    this.removeEntryAttachment(entryIndex, attachmentId);
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

        this.onDocumentClick = (event) => {
            if (this.blockedInfoEl && !this.blockedInfoEl.hidden) {
                if (!this.blockedInfoEl.contains(event.target) && !event.target.closest('[data-qa-blocked="1"]')) {
                    this.closeBlockedInfo();
                }
            }
            if (!this.dropdownEl || this.dropdownEl.hidden) {
                return;
            }
            if (this.dropdownEl.contains(event.target)) {
                return;
            }
            if (event.target.closest('[data-qa-pill="1"]')) {
                return;
            }
            this.closeDropdown();
        };

        this.onDocumentKeyDown = (event) => {
            if (event.key === 'Escape' && this.dropdownState) {
                this.closeDropdown();
            }
            if (event.key === 'Escape' && this.blockedInfoState) {
                this.closeBlockedInfo();
            }
        };

        this.inputEl.addEventListener('input', this.onInput);
        this.inputEl.addEventListener('beforeinput', this.onBeforeInput);
        this.inputEl.addEventListener('keydown', this.onInputKeyDown);
        this.inputEl.addEventListener('paste', this.onInputPaste);
        this.inputEl.addEventListener('copy', this.onInputCopy);
        this.inputEl.addEventListener('cut', this.onInputCut);
        this.inputEl.addEventListener('click', this.onInputClick);
        this.previewEl.addEventListener('click', this.onPreviewClick);
        this.previewEl.addEventListener('change', this.onPreviewChange);
        this.dropdownSearchEl.addEventListener('input', this.onDropdownInput);
        this.dropdownListEl.addEventListener('click', this.onDropdownListClick);
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

    QuickAddComponent.prototype.parseAndRender = function parseAndRender(options) {
        const opts = options || {};
        if (typeof opts.source === 'string') {
            this.inputText = opts.source;
        } else {
            this.inputText = this.readInputText();
        }
        this.closeBlockedInfo();

        const input = this.inputText || '';
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

    QuickAddComponent.prototype.isInteractivePill = function isInteractivePill(field) {
        if (!field) {
            return false;
        }
        return field.type === 'options' && !field.multiple && getFieldOptions(field).length > 0;
    };

    QuickAddComponent.prototype.buildPillHtml = function buildPillHtml(data) {
        const c = this.config.classNames;
        const field = this.getFieldDefinition(data.fieldKey);
        const color = this.resolvePillColor(field, data.value);
        const inferred = !!data.inferred;
        const blocked = !!data.blocked;
        const interactive = !blocked && this.isInteractivePill(field) && !!data.tokenId;
        const styleAttr = (!blocked && color) ? ` style="--qa-pill-accent:${escHtml(color)}"` : '';
        const classes = [
            c.pill,
            interactive ? c.pillInteractive : '',
            inferred ? c.pillInferred : '',
            blocked ? c.pillBlocked : ''
        ].filter(Boolean).join(' ');

        const interactionAttrs = interactive
            ? ` data-qa-pill="1" data-pill-field="${escHtml(data.fieldKey)}" data-pill-token="${escHtml(data.tokenId)}" data-pill-entry="${data.entryIndex}"`
            : '';
        const blockedAttrs = blocked
            ? ` data-qa-blocked="1" data-blocked-reason="${escHtml(data.reason || 'Blocked by constraints')}"`
            : '';
        const attrs = `${interactionAttrs}${blockedAttrs}`;
        const inferredIcon = inferred
            ? `<span class="${c.pillInferredIcon}" aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12" focusable="false"><path d="M8 1.5l1.4 2.9 3.1.5-2.2 2.2.5 3.2L8 8.9l-2.8 1.4.5-3.2L3.5 4.9l3.1-.5L8 1.5z" fill="currentColor"/></svg></span>`
            : '';
        const blockedIcon = blocked
            ? `<span class="${c.pillBlockedIcon}" aria-hidden="true">!</span>`
            : '';
        const dismiss = (!blocked && data.dismissKey)
            ? `<button type="button" class="${c.pillDismiss}" data-dismiss-key="${escHtml(data.dismissKey)}" aria-label="Dismiss value">x</button>`
            : '';

        return `<span class="${classes}"${attrs}${styleAttr}>${blockedIcon}${inferredIcon}<span class="${c.pillLabel}">${escHtml(data.label)}</span>${dismiss}</span>`;
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
            ? ` data-qa-pill="1" data-pill-field="${escHtml(token.key)}" data-pill-token="${escHtml(token.id)}" data-pill-entry="${token.entryIndex}"`
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
                    tokenId: token ? token.id : null,
                    token: token || null,
                    inferredItem: inferredItem || null,
                    inferred: !!inferredItem && !token,
                    dismissKey
                });
            });
        });

        return selections;
    };

    QuickAddComponent.prototype.supportsEntryAttachments = function supportsEntryAttachments() {
        return this.config.showEntryCards !== false && this.config.allowEntryAttachments === true;
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
        const active = new Set(result.entries.map((entry) => entry.index));
        Array.from(this.attachmentsByEntry.keys()).forEach((entryIndex) => {
            if (!active.has(entryIndex)) {
                this.attachmentsByEntry.delete(entryIndex);
            }
        });
    };

    QuickAddComponent.prototype.getEntryAttachmentMeta = function getEntryAttachmentMeta(entryIndex) {
        const list = this.attachmentsByEntry.get(entryIndex) || [];
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
                delete entry.attachments;
            });
            return result;
        }
        this.pruneAttachmentsForResult(result);
        result.entries.forEach((entry) => {
            const attachments = this.getEntryAttachmentMeta(entry.index);
            if (attachments.length > 0) {
                entry.attachments = attachments;
            } else {
                delete entry.attachments;
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

    QuickAddComponent.prototype.addEntryAttachments = function addEntryAttachments(entryIndex, files) {
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

        const current = this.attachmentsByEntry.get(entryIndex) || [];
        const canMultiple = this.config.allowMultipleAttachments !== false;
        let next = canMultiple ? current.slice() : [];

        allowed.forEach((file) => {
            const fingerprint = `${file.name}|${file.size}|${file.lastModified}|${file.type}`;
            const exists = next.some((item) => item.fingerprint === fingerprint);
            if (exists) {
                return;
            }
            next.push({
                id: `att_${entryIndex}_${++this.attachmentCounter}`,
                fingerprint,
                file,
                name: file.name || 'attachment',
                size: Number(file.size || 0),
                type: file.type || '',
                lastModified: Number(file.lastModified || 0)
            });
        });

        if (!canMultiple && next.length > 1) {
            next = [next[next.length - 1]];
        }

        this.attachmentsByEntry.set(entryIndex, next);
        this.syncEntryAttachmentMeta(this.lastResult);
        this.renderResult(this.lastResult);
        if (typeof this.config.onParse === 'function') {
            this.config.onParse(this.lastResult);
        }
    };

    QuickAddComponent.prototype.removeEntryAttachment = function removeEntryAttachment(entryIndex, attachmentId) {
        const current = this.attachmentsByEntry.get(entryIndex) || [];
        if (!current.length) {
            return;
        }
        const next = current.filter((item) => item.id !== attachmentId);
        if (next.length > 0) {
            this.attachmentsByEntry.set(entryIndex, next);
        } else {
            this.attachmentsByEntry.delete(entryIndex);
        }
        this.syncEntryAttachmentMeta(this.lastResult);
        this.renderResult(this.lastResult);
        if (typeof this.config.onParse === 'function') {
            this.config.onParse(this.lastResult);
        }
    };

    QuickAddComponent.prototype.renderEntryAttachments = function renderEntryAttachments(entry) {
        if (!this.supportsEntryAttachments()) {
            return '';
        }
        const c = this.config.classNames;
        const attachments = this.attachmentsByEntry.get(entry.index) || [];
        const accept = this.getAttachmentAcceptValue();
        const acceptAttr = accept ? ` accept="${escHtml(accept)}"` : '';
        const multipleAttr = this.config.allowMultipleAttachments !== false ? ' multiple' : '';
        const inputId = `qa_att_input_${entry.index}`;

        const listHtml = attachments.length
            ? `
                <div class="${c.attachmentList}">
                    ${attachments.map((item) => `
                        <div class="${c.attachmentItem}">
                            <span class="${c.attachmentName}" title="${escHtml(item.name)}">${escHtml(item.name)}</span>
                            <span class="${c.attachmentMeta}">${escHtml(this.formatAttachmentSize(item.size))}</span>
                            <button
                                type="button"
                                class="${c.attachmentRemove}"
                                data-entry-attachment-remove="1"
                                data-entry-index="${entry.index}"
                                data-attachment-id="${escHtml(item.id)}"
                                aria-label="Remove attachment"
                            >x</button>
                        </div>
                    `).join('')}
                </div>
            `
            : '';

        return `
            <div class="${c.attachmentSection}">
                <div class="${c.attachmentControls}">
                    <label class="${c.attachmentPick}" for="${escHtml(inputId)}">
                        + Add attachment
                    </label>
                    <input
                        type="file"
                        class="${c.attachmentInput}"
                        id="${escHtml(inputId)}"
                        data-entry-attachment-input="1"
                        data-entry-index="${entry.index}"${acceptAttr}${multipleAttr}
                    />
                    <span class="${c.attachmentHint}">
                        ${this.config.allowMultipleAttachments !== false ? 'Multiple files allowed' : 'Single file only'}
                    </span>
                </div>
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

    QuickAddComponent.prototype.renderResult = function renderResult(result) {
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
        if (!field || field.type !== 'options') {
            return;
        }

        const token = this.tokenMap[tokenId];
        if (!token) {
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

    QuickAddComponent.prototype.positionDropdownAtRect = function positionDropdownAtRect(rect) {
        const pad = window.innerWidth <= 480 ? 8 : 10;
        const viewportWidth = Math.max(0, window.innerWidth - (pad * 2));
        const preferredWidth = Math.max(200, (rect.width || 0) + 40);
        const width = Math.min(360, viewportWidth, preferredWidth);
        const left = Math.max(pad, Math.min(rect.left || 0, window.innerWidth - width - pad));

        const belowTop = (rect.bottom || rect.top || 0) + 8;
        const approxHeight = 280;
        let top = belowTop;
        if (belowTop + approxHeight > window.innerHeight) {
            top = Math.max(pad, (rect.top || 0) - approxHeight - 8);
        }
        if (top + approxHeight > window.innerHeight - pad) {
            top = Math.max(pad, window.innerHeight - approxHeight - pad);
        }

        this.dropdownEl.style.position = 'fixed';
        this.dropdownEl.style.left = `${left}px`;
        this.dropdownEl.style.top = `${top}px`;
        this.dropdownEl.style.width = `${width}px`;
        this.dropdownEl.style.maxWidth = `${viewportWidth}px`;
        this.dropdownEl.style.zIndex = '9999';
    };

    QuickAddComponent.prototype.positionDropdown = function positionDropdown(anchorEl) {
        this.positionDropdownAtRect(anchorEl.getBoundingClientRect());
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
        this.config = mergeConfig(Object.assign({}, this.config, nextConfig || {}));
        this.normalizedSchema = normalizeSchema(this.config.schema, this.config.fallbackField);

        this.closeDropdown();
        this.closeBlockedInfo();
        this.unbindEvents();
        this.renderShell();
        this.applyTokens();
        this.bindEvents();
        this.parseAndRender();
    };

    QuickAddComponent.prototype.destroy = function destroy() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.unbindEvents();
        this.closeBlockedInfo();

        this.mountEl.innerHTML = '';
    };

    global.QuickAdd = {
        create: function create(config) {
            return new QuickAddComponent(config);
        },
        parse: parseInput
    };
})(window);
