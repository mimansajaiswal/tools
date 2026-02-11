/**
 * GhostInk Flashcards - Main Application Module
 * Contains the main App object with all application logic.
 */

// Import core modules
import {
    SYNC_INTERVAL_MS,
    MIN_PULL_INTERVAL_MS,
    MIN_PUSH_INTERVAL_MS,
    fsrsW,
    DEFAULT_DESIRED_RETENTION,
    MAX_INTERVAL,
    DAY_START_HOUR,
    ratingsMap,
    DEFAULT_LEECH_LAPSE_THRESHOLD,
    DEFAULT_AI_PROMPT,
    DEFAULT_DYCONTEXT_PROMPT,
    parseSrsConfig,
    parseSrsState,
    el,
    isMac,
    encodeDataAttr,
    decodeDataAttr,
    escapeHtml,
    sleep,
    clamp2,
    constrainDifficulty,
    clampRetention,
    constrainWeights,
    debounce
} from './config.js';

import { Storage } from './storage.js';
import { API } from './api.js';

const OAUTH_DEV_PASSWORD_KEY = 'oauth_dev_password';

import {
    SRS,
    getDecay,
    getFactor,
    meanReversion,
    initDifficulty,
    initStability,
    forgettingCurve,
    nextInterval,
    nextDifficulty,
    nextRecallStability,
    nextForgetStability,
    nextShortTermStability,
    normalizeRating,
    displayRating,
    detectCardType,
    buildFsrsTrainingPayload
} from './srs.js';

import { runFsrsOptimization } from './fsrs-optimizer.js';

import {
    NotionMapper,
    toRichTextChunks,
    compactReviewHistory,
    parseReviewHistory,
    richToMarkdown,
    markdownToNotionRichText
} from './notion-mapper.js';

import {
    parseClozeIndices,
    isClozeParent,
    isSubItem,
    isSchedulable,
    reconcileSubItems,
    createSubItem,
    transformClozeForSubItem
} from './cloze-manager.js';

import {
    toast,
    toastLong,
    toastHide,
    showLoading,
    setLoadingProgress,
    hideLoading,
    Tooltip,
    openModal as uiOpenModal,
    closeModal as uiCloseModal,
    setLastFocusedElement
} from './ui/index.js';

import {
    initLightbox,
    getLightbox,
    destroyLightbox,
    refreshLightbox,
    cleanupTempLightboxes,
    applyMediaEmbeds,
    getMediaInfo,
    createMediaFigure,
    stripUrlPunctuation
} from './features/media.js';

// Configure marked to open all links in new tab (deferred until marked is available)
let markedConfigured = false;
const ensureMarkedConfigured = () => {
    if (markedConfigured) return;
    if (typeof marked === 'undefined') return;
    // marked v17+ uses extension-based renderer overrides
    marked.use({
        renderer: {
            link({ href, title, text }) {
                const titleAttr = title ? ` title="${title}"` : '';
                return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
            }
        }
    });
    markedConfigured = true;
};

const safeMarkdownParse = (md) => {
    if (!md) return '';
    try {
        ensureMarkedConfigured();
        if (typeof marked === 'undefined') return escapeHtml(md);
        // Protect notion-equation spans from markdown processing (prevent _ and * from being interpreted)
        const eqPlaceholders = [];
        const protectedMd = md.replace(/<span class="notion-equation">([^<]*)<\/span>/g, (match, expr) => {
            const idx = eqPlaceholders.length;
            eqPlaceholders.push(expr);
            return `\x00EQ${idx}EQ\x00`;
        });
        let html = marked.parse(protectedMd, { breaks: true, gfm: true });
        // Restore equation spans with original (unmangled) expressions
        html = html.replace(/\x00EQ(\d+)EQ\x00/g, (_, idx) => {
            const expr = eqPlaceholders[parseInt(idx, 10)] || '';
            return `<span class="notion-equation">${expr}</span>`;
        });
        return html;
    } catch (e) {
        console.error('Markdown parse error:', e);
        return md; // Return raw markdown on failure
    }
};

const safeHistoryReplace = (data, title, url) => {
    try {
        history.replaceState(data, title, url);
    } catch (e) {
        console.warn('History replaceState failed:', e);
    }
};

// Normalize content for comparison to avoid false positives from formatting differences.
// This handles whitespace variations in equation spans and other minor differences.
const normalizeContentForComparison = (content) => {
    if (!content) return '';
    return content
        // Normalize whitespace inside span tags
        .replace(/<span\s+class=/g, '<span class=')
        // Normalize equation span whitespace
        .replace(/<span class="notion-equation">\s*/g, '<span class="notion-equation">')
        .replace(/\s*<\/span>/g, '</span>')
        // Collapse multiple spaces
        .replace(/\s+/g, ' ')
        .trim();
};

const GHOSTINK_CLOZE_REGEX = /\{\{c(\d+)::((?:[^{}]|\{(?!\{)|\}(?!\}))*?)(?:::((?:[^{}]|\{(?!\{)|\}(?!\}))*?))?\}\}/g;
const GHOSTINK_HAS_CLOZE_REGEX = /\{\{c\d+::.+?\}\}/i;
const ghostinkPunctuationRegex = (() => {
    try {
        return new RegExp('[\\p{P}\\p{S}]', 'gu');
    } catch (_) {
        return /[^\w\s]|_/g;
    }
})();
const ghostinkGraphemeSegmenter = (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function')
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

const markdownToPlainText = (value) => {
    const raw = String(value || '');
    if (!raw.trim()) return '';
    if (typeof document === 'undefined' || !document.createElement) {
        return raw.replace(/\s+/g, ' ').trim();
    }
    const node = document.createElement('div');
    node.innerHTML = safeMarkdownParse(raw);
    return (node.textContent || '').replace(/\s+/g, ' ').trim();
};

const normalizeGhostInkText = (value) => {
    const raw = String(value || '');
    if (!raw) return '';
    const folded = raw.normalize('NFKC').toLocaleLowerCase();
    return folded
        .replace(ghostinkPunctuationRegex, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const splitGraphemes = (value) => {
    const text = String(value || '');
    if (!text) return [];
    if (ghostinkGraphemeSegmenter) {
        return Array.from(ghostinkGraphemeSegmenter.segment(text), part => part.segment);
    }
    return Array.from(text);
};

const levenshteinDistance = (a, b) => {
    const aa = splitGraphemes(a);
    const bb = splitGraphemes(b);
    if (aa.length === 0) return bb.length;
    if (bb.length === 0) return aa.length;

    const prev = new Array(bb.length + 1);
    const curr = new Array(bb.length + 1);
    for (let j = 0; j <= bb.length; j++) prev[j] = j;

    for (let i = 1; i <= aa.length; i++) {
        curr[0] = i;
        for (let j = 1; j <= bb.length; j++) {
            const cost = aa[i - 1] === bb[j - 1] ? 0 : 1;
            curr[j] = Math.min(
                prev[j] + 1,
                curr[j - 1] + 1,
                prev[j - 1] + cost
            );
        }
        for (let j = 0; j <= bb.length; j++) prev[j] = curr[j];
    }
    return prev[bb.length];
};

const computeGhostInkSimilarity = (typed, expected) => {
    const left = normalizeGhostInkText(typed);
    const right = normalizeGhostInkText(expected);
    if (!left && !right) return 1;
    if (!left || !right) return 0;
    const dist = levenshteinDistance(left, right);
    const maxLen = Math.max(splitGraphemes(left).length, splitGraphemes(right).length);
    if (maxLen === 0) return 1;
    return Math.max(0, 1 - (dist / maxLen));
};

const splitGhostInkInputLines = (rawInput, expectedCount) => {
    const lines = String(rawInput || '')
        .replace(/\r/g, '')
        .split('\n')
        .map(line => line.trim());
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
    if ((expectedCount || 1) <= 1) return [lines.join(' ').trim()];
    return lines;
};

const getClozeSourceForGhostInk = (card) => {
    const name = String(card?.name || '');
    const back = String(card?.back || '');
    const hasInName = GHOSTINK_HAS_CLOZE_REGEX.test(name);
    const hasInBack = GHOSTINK_HAS_CLOZE_REGEX.test(back);
    if (!hasInName && hasInBack) return back;
    return name;
};

const extractGhostInkClozeAnswers = (source, subItemIndex = null) => {
    const text = String(source || '');
    if (!text) return [];
    const eqPlaceholders = [];
    const protectedText = text.replace(/<span class="notion-equation">([\s\S]*?)<\/span>/g, (match) => {
        const idx = eqPlaceholders.length;
        eqPlaceholders.push(match);
        return `\x00EQ${idx}\x00`;
    });
    const restoreEq = (value) => value.replace(/\x00EQ(\d+)\x00/g, (_, idx) => eqPlaceholders[parseInt(idx, 10)] || '');

    const out = [];
    const re = new RegExp(GHOSTINK_CLOZE_REGEX.source, 'g');
    let match;
    while ((match = re.exec(protectedText)) !== null) {
        const clozeNum = parseInt(match[1], 10);
        if (subItemIndex !== null && clozeNum !== subItemIndex) continue;
        const answer = restoreEq(match[2] || '');
        const plain = markdownToPlainText(answer);
        if (plain) out.push(plain);
    }
    return out;
};

const getGhostInkExpectedAnswers = (card, isReversed) => {
    if (!card) return [];
    const typeKey = (card.type || '').toLowerCase();
    if (typeKey === 'cloze') {
        const source = getClozeSourceForGhostInk(card);
        const subItemIndex = isSubItem(card) ? parseInt(card.clozeIndexes, 10) : null;
        return extractGhostInkClozeAnswers(source, Number.isFinite(subItemIndex) ? subItemIndex : null);
    }
    const answer = isReversed ? card.name : card.back;
    const plain = markdownToPlainText(answer);
    return plain ? [plain] : [];
};

const ghostinkToneClass = (percent) => {
    if (percent >= 90) return 'ghostink-score-fill--strong';
    if (percent >= 70) return 'ghostink-score-fill--close';
    return 'ghostink-score-fill--weak';
};

const buildGhostInkFeedbackHtml = (result) => {
    const overallTone = ghostinkToneClass(result.percent);
    return `
<div class="space-y-1">
 <div class="flex items-center justify-between text-[11px] text-[color:var(--text-sub)]">
 <span>Normalized and lowercased match</span>
 <span class="font-medium tabular-nums">${result.percent}%</span>
 </div>
 <div class="ghostink-score-track">
 <span class="ghostink-score-fill ${overallTone}" style="width:${result.percent}%"></span>
 </div>
</div>
`;
};

const evaluateGhostInkAnswer = (rawInput, expectedAnswers) => {
    const expected = (Array.isArray(expectedAnswers) ? expectedAnswers : [])
        .map(v => markdownToPlainText(v))
        .filter(v => !!v);
    if (expected.length === 0) {
        return {
            percent: 0,
            lines: [],
            summary: 'No expected answer found for this card.'
        };
    }

    const typedLines = splitGhostInkInputLines(rawInput, expected.length);
    const compareCount = Math.max(expected.length, typedLines.length);
    const lines = [];
    let total = 0;
    for (let i = 0; i < compareCount; i++) {
        const typed = typedLines[i] || '';
        const expectedLine = expected[i] || '';
        const similarity = computeGhostInkSimilarity(typed, expectedLine);
        const percent = Math.round(similarity * 100);
        total += similarity;
        lines.push({ percent, typed, expected: expectedLine });
    }
    const overall = compareCount > 0 ? (total / compareCount) : 0;
    const overallPercent = Math.round(overall * 100);
    const summary = expected.length > 1
        ? `Expected ${expected.length} blanks. Enter one answer per line.`
        : 'Compared with Unicode normalization, case-insensitive and punctuation-insensitive matching.';
    return {
        percent: overallPercent,
        lines,
        summary
    };
};

const createIconsInScope = (container) => {
    if (typeof lucide === 'undefined') return;
    if (container && container.querySelectorAll) {
        lucide.createIcons({ nodes: container.querySelectorAll('[data-lucide]') });
    } else {
        lucide.createIcons();
    }
};

const isTypingTarget = (target) => {
    if (!target) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (target.isContentEditable) return true;
    return typeof target.closest === 'function' && !!target.closest('[contenteditable="true"]');
};

const SYNC_QUEUE_WARN_THRESHOLD = 500;
const SYNC_QUEUE_WARN_COOLDOWN_MS = 10 * 60 * 1000;
const STUDY_DUE_BUCKET_MS = 5 * 60 * 1000;
const ANALYTICS_RETENTION_BINS = [
    { label: '0d', min: 0, max: 0 },
    { label: '1d', min: 1, max: 1 },
    { label: '2d', min: 2, max: 2 },
    { label: '3-6d', min: 3, max: 6 },
    { label: '7-13d', min: 7, max: 13 },
    { label: '14-29d', min: 14, max: 29 },
    { label: '30-59d', min: 30, max: 59 },
    { label: '60-119d', min: 60, max: 119 },
    { label: '120d+', min: 120, max: Infinity }
];

const focusTrap = {
    active: null,
    handleKeydown(e) {
        if (e.key !== 'Tab' || !focusTrap.active) return;
        const focusable = focusTrap.active.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    },
    attach(modal) {
        focusTrap.active = modal;
        document.addEventListener('keydown', focusTrap.handleKeydown);
        const first = modal.querySelector('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
        if (first) setTimeout(() => first.focus(), 10);
    },
    detach() {
        if (!focusTrap.active) return; // Already detached
        focusTrap.active = null;
        document.removeEventListener('keydown', focusTrap.handleKeydown);
    }
};

class GhostInkSelect extends HTMLElement {
    static instances = new Set();
    static globalsBound = false;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._ready = false;
        this._activeIndex = -1;
        this._value = '';
        this._observer = null;
        this._trigger = null;
        this._menu = null;
        this._optionsWrap = null;
        this._label = null;
    }

    connectedCallback() {
        if (!this._ready) this._mount();
        GhostInkSelect.instances.add(this);
        this._syncFromLightOptions();
        this._bindGlobals();
    }

    disconnectedCallback() {
        GhostInkSelect.instances.delete(this);
        if (this._observer) this._observer.disconnect();
    }

    static closeAll(except = null) {
        for (const inst of GhostInkSelect.instances) {
            if (except && inst === except) continue;
            inst.close();
        }
    }

    _bindGlobals() {
        if (GhostInkSelect.globalsBound) return;
        document.addEventListener('click', (e) => {
            const path = e.composedPath ? e.composedPath() : [];
            for (const inst of GhostInkSelect.instances) {
                if (path.includes(inst)) return;
            }
            GhostInkSelect.closeAll();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') GhostInkSelect.closeAll();
        });
        window.addEventListener('resize', () => GhostInkSelect.closeAll());
        GhostInkSelect.globalsBound = true;
    }

    _mount() {
        this._ready = true;
        this.shadowRoot.innerHTML = `
<style>
:host {
  display: block;
  width: 100%;
  position: relative;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0 !important;
  border-radius: 0 !important;
}
:host([hidden]) { display: none; }
button { font: inherit; }
.trigger {
  width: 100%;
  min-height: 2rem;
  border-radius: 5px;
  border: 1px solid var(--card-border);
  background: var(--surface);
  color: var(--text-main);
  padding: 0.42rem 0.65rem;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  text-align: left;
  font-size: 0.8125rem;
  line-height: 1.15rem;
  box-shadow: none;
  transition: border-color .14s ease, background-color .14s ease, box-shadow .14s ease;
}
.trigger:hover:not(:disabled) {
  background: var(--surface-muted);
}
:host([open]) .trigger, .trigger:focus-visible {
  outline: none;
  border-color: color-mix(in srgb, var(--accent) 52%, var(--card-border));
  background: var(--surface);
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
}
:host([disabled]) .trigger {
  cursor: not-allowed;
  color: var(--text-faint);
  border-color: var(--border-weak);
  background: var(--surface-strong);
  opacity: .92;
  box-shadow: none;
}
.label {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.chevron {
  width: .56rem;
  height: .56rem;
  border-right: 2px solid var(--text-sub);
  border-bottom: 2px solid var(--text-sub);
  transform: rotate(45deg) translateY(-1px);
  flex: 0 0 auto;
  transition: transform .14s ease;
}
:host([open]) .chevron {
  transform: rotate(-135deg) translateX(-1px);
}
.menu {
  position: absolute;
  top: calc(100% + .25rem);
  left: 0;
  right: 0;
  z-index: 180;
  border-radius: 5px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  box-shadow: 0 10px 24px rgb(18 14 10 / 0.16);
  padding: 0;
}
:host([drop-up]) .menu {
  top: auto;
  bottom: calc(100% + .25rem);
}
.menu[hidden] { display: none; }
.options { max-height: 9.5rem; overflow-y: auto; }
.option {
  width: 100%;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-main);
  text-align: left;
  padding: .38rem .65rem;
  font-size: .8125rem;
  line-height: 1.18;
  display: flex;
  align-items: center;
  gap: .4rem;
  cursor: pointer;
  transition: background-color .12s ease, color .12s ease;
}
.option:hover:not(:disabled), .option.is-active {
  background: var(--surface-muted);
}
.option.is-selected {
  background: var(--accent-soft);
  color: var(--text-main);
  font-weight: 500;
}
.option:disabled {
  color: var(--text-faint);
  cursor: not-allowed;
  opacity: .86;
}
.mark {
  width: .9rem;
  flex: 0 0 .9rem;
  color: var(--accent);
  font-size: .78rem;
  line-height: 1;
  opacity: 0;
}
.option.is-selected .mark { opacity: 1; }
@media (max-width: 640px) {
  .trigger { min-height: 40px; font-size: 14px; }
  .option { min-height: 36px; font-size: 14px; }
}
</style>
<button type="button" class="trigger" aria-haspopup="listbox" aria-expanded="false">
  <span class="label"></span>
  <span class="chevron" aria-hidden="true"></span>
</button>
<div class="menu" hidden>
  <div class="options" role="listbox"></div>
</div>
`;

        this._trigger = this.shadowRoot.querySelector('.trigger');
        this._menu = this.shadowRoot.querySelector('.menu');
        this._optionsWrap = this.shadowRoot.querySelector('.options');
        this._label = this.shadowRoot.querySelector('.label');

        this._trigger.addEventListener('click', () => {
            if (this.disabled) return;
            if (this.hasAttribute('open')) this.close();
            else this.open();
        });

        this._trigger.addEventListener('keydown', (e) => this._onTriggerKeydown(e));

        this._observer = new MutationObserver(() => this._syncFromLightOptions());
        this._observer.observe(this, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['disabled', 'selected', 'value']
        });
    }

    _onTriggerKeydown(e) {
        if (this.disabled) return;
        const optionCount = this.options.length;
        const isOpen = this.hasAttribute('open');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) this.open();
            this._setActiveIndex(Math.min((this._activeIndex < 0 ? 0 : this._activeIndex + 1), Math.max(0, optionCount - 1)), true);
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) this.open();
            this._setActiveIndex(Math.max((this._activeIndex < 0 ? 0 : this._activeIndex - 1), 0), true);
            return;
        }
        if (e.key === 'Home') {
            e.preventDefault();
            if (!isOpen) this.open();
            this._setActiveIndex(0, true);
            return;
        }
        if (e.key === 'End') {
            e.preventDefault();
            if (!isOpen) this.open();
            this._setActiveIndex(Math.max(0, optionCount - 1), true);
            return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!isOpen) {
                this.open();
                return;
            }
            const idx = this._activeIndex >= 0 ? this._activeIndex : this.selectedIndex;
            const opt = this.options[idx];
            if (opt && !opt.disabled) this._setValue(opt.value, { emit: true });
            this.close();
            return;
        }
        if (e.key === 'Escape' && isOpen) {
            e.preventDefault();
            this.close();
        }
    }

    get options() {
        return Array.from(this.querySelectorAll('option'));
    }

    get selectedIndex() {
        return this.options.findIndex(o => o.value === this.value);
    }

    set selectedIndex(i) {
        const idx = Number(i);
        const opts = this.options;
        const opt = opts[idx];
        if (opt) this._setValue(opt.value, { emit: false });
    }

    get value() {
        return this._value || '';
    }

    set value(next) {
        this._setValue(String(next ?? ''), { emit: false });
    }

    get disabled() {
        return this.hasAttribute('disabled');
    }

    set disabled(on) {
        if (on) this.setAttribute('disabled', '');
        else this.removeAttribute('disabled');
        if (this._trigger) this._trigger.disabled = !!on;
    }

    focus() {
        this._trigger?.focus();
    }

    open() {
        if (this.disabled) return;
        GhostInkSelect.closeAll(this);
        this.setAttribute('open', '');
        this._menu.hidden = false;
        this._trigger?.setAttribute('aria-expanded', 'true');
        this._updateMenuPlacement();
        const idx = Math.max(0, this.selectedIndex);
        this._setActiveIndex(idx, true);
        requestAnimationFrame(() => this._updateMenuPlacement());
    }

    close() {
        this.removeAttribute('open');
        this.removeAttribute('drop-up');
        if (this._menu) this._menu.hidden = true;
        if (this._optionsWrap) this._optionsWrap.style.maxHeight = '';
        this._trigger?.setAttribute('aria-expanded', 'false');
    }

    _updateMenuPlacement() {
        if (!this.hasAttribute('open') || !this._optionsWrap) return;
        const rect = this.getBoundingClientRect();
        const viewportH = window.innerHeight || document.documentElement.clientHeight || 800;
        const gap = 8;
        const minPanelHeight = 120;
        const availableBelow = Math.max(0, viewportH - rect.bottom - gap);
        const availableAbove = Math.max(0, rect.top - gap);
        const openUp = availableBelow < minPanelHeight && availableAbove > availableBelow;
        if (openUp) this.setAttribute('drop-up', '');
        else this.removeAttribute('drop-up');
        const chosenSpace = openUp ? availableAbove : availableBelow;
        const maxHeight = Math.max(minPanelHeight, Math.min(360, chosenSpace - 8));
        this._optionsWrap.style.maxHeight = `${maxHeight}px`;
    }

    _setActiveIndex(index, scroll = false) {
        const buttons = Array.from(this.shadowRoot.querySelectorAll('.option'));
        if (!buttons.length) return;
        const bounded = Math.max(0, Math.min(index, buttons.length - 1));
        this._activeIndex = bounded;
        buttons.forEach((btn, idx) => btn.classList.toggle('is-active', idx === bounded));
        if (scroll) buttons[bounded].scrollIntoView({ block: 'nearest' });
    }

    _syncFromLightOptions() {
        const opts = this.options;
        if (!opts.length) {
            this._value = '';
            this._renderOptions();
            this._refreshLabel();
            return;
        }

        let next = this._value || this.getAttribute('value') || '';
        const selectedLight = opts.find(o => o.selected);
        if ((!next || !opts.some(o => o.value === next)) && selectedLight) next = selectedLight.value;
        if (!opts.some(o => o.value === next)) next = opts[0].value || '';
        this._setValue(next, { emit: false, force: true });
    }

    _setValue(next, { emit = false, force = false } = {}) {
        const opts = this.options;
        if (!opts.length) {
            this._value = '';
            this._refreshLabel();
            return;
        }
        const valid = opts.some(o => o.value === next);
        const value = valid ? next : (opts[0].value || '');
        const changed = force || value !== this._value;
        this._value = value;
        opts.forEach(o => { o.selected = (o.value === value); });
        this._renderOptions();
        this._refreshLabel();
        if (emit && changed) {
            this.dispatchEvent(new Event('input', { bubbles: true }));
            this.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    _refreshLabel() {
        if (!this._label) return;
        const current = this.options.find(o => o.value === this._value);
        this._label.textContent = (current?.textContent || '').trim() || 'Select';
        this._trigger.disabled = this.disabled;
    }

    _renderOptions() {
        if (!this._optionsWrap) return;
        const opts = this.options;
        if (!opts.length) {
            this._optionsWrap.innerHTML = '<div style="padding:.5rem .55rem;font-size:.78rem;color:var(--text-sub)">No options</div>';
            return;
        }
        this._optionsWrap.innerHTML = opts.map((opt, idx) => `
<button type="button" class="option ${opt.value === this._value ? 'is-selected' : ''}" role="option" aria-selected="${opt.value === this._value ? 'true' : 'false'}" data-index="${idx}" data-value="${encodeDataAttr(opt.value || '')}" ${opt.disabled ? 'disabled' : ''}>
  <span class="mark">✓</span>
  <span>${escapeHtml(opt.textContent || '')}</span>
</button>
`).join('');

        this._optionsWrap.querySelectorAll('.option').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                const idx = Number(btn.dataset.index || 0);
                this._setActiveIndex(idx, false);
            });
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                const value = decodeDataAttr(btn.dataset.value || '');
                this._setValue(value, { emit: true });
                this.close();
                this.focus();
            });
        });
    }
}

if (!customElements.get('gi-select')) {
    customElements.define('gi-select', GhostInkSelect);
}

const upgradeNativeSelects = () => {
    document.querySelectorAll('select').forEach((nativeSelect) => {
        const custom = document.createElement('gi-select');
        for (const attr of Array.from(nativeSelect.attributes)) {
            const name = attr.name;
            if (name === 'class' || name === 'style') continue;
            custom.setAttribute(name, attr.value);
        }
        custom.innerHTML = nativeSelect.innerHTML;
        const currentValue = nativeSelect.value || '';
        if (currentValue) custom.setAttribute('value', currentValue);
        nativeSelect.replaceWith(custom);
    });
};

// Helper for natural sorting (e.g. 1.1, 1.2, 1.10)
const naturalCompare = (a, b) => {
    const sA = (a || '').toString();
    const sB = (b || '').toString();

    // Split into numbers and non-numbers
    // "1.1a" -> ["1", ".", "1", "a"]
    // "1a" -> ["1", "a"]
    const tokensA = sA.match(/[0-9]+|[^0-9]+/g) || [];
    const tokensB = sB.match(/[0-9]+|[^0-9]+/g) || [];

    const len = Math.max(tokensA.length, tokensB.length);

    for (let i = 0; i < len; i++) {
        const t1 = tokensA[i];
        const t2 = tokensB[i];

        if (t1 === undefined) return -1; // shorter first ("1" < "1a")
        if (t2 === undefined) return 1;

        // Check if numbers
        const n1 = Number(t1);
        const n2 = Number(t2);
        const isNum1 = !isNaN(n1);
        const isNum2 = !isNaN(n2);

        if (isNum1 && isNum2) {
            const diff = n1 - n2;
            if (diff !== 0) return diff;
            continue;
        }

        // If one is number and other is string? 
        // Standard sort usually puts numbers before strings, but let's check consistent behavior
        if (isNum1) return -1;
        if (isNum2) return 1;

        // Both strings (separators like "." or letters like "a")
        // CUSTOM RULE: letters before dot?
        // a vs .
        // standard: . < a
        // desired: a < .

        const isDot1 = t1 === ".";
        const isDot2 = t2 === ".";

        if (isDot1 && !isDot2) return 1; // Dot comes AFTER other strings (pushing 1.1 after 1a)
        if (!isDot1 && isDot2) return -1;

        const cmp = t1.localeCompare(t2);
        if (cmp !== 0) return cmp;
    }
    return 0;
};

const incrementAlpha = (str) => {
    const chars = str.split('');
    let i = chars.length - 1;
    while (i >= 0) {
        if (chars[i] !== 'z' && chars[i] !== 'Z') {
            chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
            return chars.join('');
        }
        chars[i] = (chars[i] === 'z') ? 'a' : 'A';
        i--;
    }
    return 'a' + chars.join('');
};

const getNextVariantOrder = (prevOrder, isPrevRoot) => {
    const s = String(prevOrder).trim();
    if (!s) return null;

    // If previous card is the root, we always start the suffix (e.g. "1" -> "1a")
    if (isPrevRoot) {
        return s + 'a';
    }

    // If previous card is already a variant (not root), increment the suffix
    const match = s.match(/([a-z]+)$/i);
    if (match) {
        const prefix = s.substring(0, match.index);
        const alpha = match[1];
        return prefix + incrementAlpha(alpha);
    }

    // Fallback if not root but no letters found (append 'a' to start chain)
    return s + 'a';
};

const FILTER_MODE_INCLUDE = 'include';
const FILTER_MODE_EXCLUDE = 'exclude';
const FILTER_MODE_IGNORE = 'ignore';
const FILTER_NONE_LABEL = '__NO_VALUE__';
const REVISION_MODE_MANUAL = 'manual';
const REVISION_MODE_TYPEIN = 'typein';
const REVISION_MODE_AI = 'ai';

const normalizeRevisionMode = (mode) => {
    if (mode === 'ghostink') return REVISION_MODE_TYPEIN; // legacy migration
    if (mode === REVISION_MODE_AI || mode === REVISION_MODE_TYPEIN) return mode;
    return REVISION_MODE_MANUAL;
};

const normalizeFilterMode = (mode) => {
    if (mode === FILTER_MODE_INCLUDE || mode === FILTER_MODE_EXCLUDE) return mode;
    return FILTER_MODE_IGNORE;
};

const cycleFilterMode = (mode) => {
    const current = normalizeFilterMode(mode);
    if (current === FILTER_MODE_IGNORE) return FILTER_MODE_INCLUDE;
    if (current === FILTER_MODE_INCLUDE) return FILTER_MODE_EXCLUDE;
    return FILTER_MODE_IGNORE;
};

const normalizeFilterList = (val) => {
    const raw = Array.isArray(val) ? val : (val === null || val === undefined ? [] : [val]);
    const seen = new Set();
    const out = [];
    for (const item of raw) {
        const text = (item ?? '').toString().trim();
        if (!text) continue;
        if (seen.has(text)) continue;
        seen.add(text);
        out.push(text);
    }
    return out;
};

const getListMode = (includeList, excludeList, value) => {
    const normalized = (value ?? '').toString().trim();
    if (!normalized) return FILTER_MODE_IGNORE;
    if (Array.isArray(includeList) && includeList.includes(normalized)) return FILTER_MODE_INCLUDE;
    if (Array.isArray(excludeList) && excludeList.includes(normalized)) return FILTER_MODE_EXCLUDE;
    return FILTER_MODE_IGNORE;
};

const applyListMode = (includeList, excludeList, value, mode) => {
    const normalized = (value ?? '').toString().trim();
    let include = normalizeFilterList(includeList).filter(v => v !== normalized);
    let exclude = normalizeFilterList(excludeList).filter(v => v !== normalized);
    const next = normalizeFilterMode(mode);
    if (normalized) {
        if (next === FILTER_MODE_INCLUDE) include.push(normalized);
        if (next === FILTER_MODE_EXCLUDE) exclude.push(normalized);
    }
    const includeSet = new Set(include);
    exclude = exclude.filter(v => !includeSet.has(v));
    return { include, exclude };
};

const normalizeFilterState = (filters = {}) => {
    const tags = normalizeFilterList(filters.tags);
    let tagsExclude = normalizeFilterList(filters.tagsExclude);
    tagsExclude = tagsExclude.filter(t => !tags.includes(t));

    const flag = normalizeFilterList(filters.flag);
    let flagExclude = normalizeFilterList(filters.flagExclude);
    flagExclude = flagExclude.filter(f => !flag.includes(f));

    const studyDecks = normalizeFilterList(filters.studyDecks);
    let studyDecksExclude = normalizeFilterList(filters.studyDecksExclude);
    studyDecksExclude = studyDecksExclude.filter(id => !studyDecks.includes(id));

    return {
        again: !!filters.again,
        hard: !!filters.hard,
        addedToday: !!filters.addedToday,
        tags,
        tagsExclude,
        tagEmptyMode: normalizeFilterMode(filters.tagEmptyMode),
        suspended: typeof filters.suspended === 'boolean' ? filters.suspended : true,
        leech: typeof filters.leech === 'boolean' ? filters.leech : true,
        marked: !!filters.marked,
        flag,
        flagExclude,
        flagEmptyMode: normalizeFilterMode(filters.flagEmptyMode),
        studyDecks,
        studyDecksExclude
    };
};

// Initialize lightbox on module load
const lightbox = initLightbox();

// Main App object
export const App = {
    state: {
        decks: [],
        cards: new Map(),
        cardNotionIdIndex: new Map(),
        cardDeckIndex: new Map(),
        tagRegistry: new Map(),
        deckStats: new Map(),
        cardsVersion: 0,
        fsrsTrainingCache: new Map(),
        fsrsDeckHistoryVersion: new Map(),
        optimizing: { active: false, deckId: null, startedAt: null },
        studyDeckCache: null,
        dueIndex: new Map(),
        cardMeta: new Map(),
        tagIndex: new Map(),
        flagIndex: new Map(),
        markedIndex: new Set(),
        ratingIndex: new Map(),
        createdDateIndex: new Map(),
        queue: new Map(),
        lastQueueError: null,
        queueLastChangedAt: null,
        lastQueueWarnAt: null,
        dyContextProcessing: false,
        selectedDeck: null,
        selectedCard: null,
        // Library filters: suspended/leech true by default (auto-hide)
        filters: normalizeFilterState({ suspended: true, leech: true }),
        cardSearch: '',
        deckSearch: '',
        cardLimit: 50,
        cardLimitStep: 50,
        analyticsRange: 'this-year',
        analyticsYear: 'all',
        analyticsDecks: [],
        analyticsHeatmapMetric: 'count',
        analyticsIncludeSuspended: true,
        analyticsHasLastYearOption: true,
        analyticsTags: [],
        analyticsFlags: [],
        analyticsMarked: false,
        analyticsDirty: true,
        analyticsCache: null,
        analyticsCardSummary: new Map(),
        analyticsAggGlobalAll: null,
        analyticsAggGlobalActive: null,
        analyticsAggDeckAll: new Map(),
        analyticsAggDeckActive: new Map(),
        analyticsAggVersion: 0,
        analyticsHeatmapYearHtmlCache: new Map(),
        reverse: false,
        lastSync: null,
        lastPull: null,
        lastPush: null,
        activeTab: 'study',
        settings: Storage.getSettings(),
        sourcesCache: { deckOptions: [], cardOptions: [] },
        workerVerified: Storage.getSettings().workerVerified || false,
        authVerified: Storage.getSettings().authVerified || false,
        sourcesVerified: Storage.getSettings().sourcesVerified || false,
        autoSyncTimer: null,
        autoSyncSoonTimer: null,
        syncing: false,
        autoScanPending: false,
        answerRevealed: false,
        cardShownAt: null,
        answerRevealedAt: null,
        aiLocked: false,
        lockAiUntilNextCard: false,
        activeMicButton: null, // 'inline' | 'fab'
        micPermissionPromise: null,
        cardReversed: false,
        studyNonDue: false,
        session: null, // Active study session (loaded from localStorage)
        sessionReversed: null, // Pre-computed reverse decision from session
        lastRating: null, // For undo feature: { cardId, sm2, fsrs, history, rating, sessionIndex }
        undoToastTimeout: null,
        tagOptions: [],
        tagSelection: [],
        userStoppedMic: false,
        activeAudioStream: null,
        fabSetupMode: false,
        joystickActive: false,
        joystickHandlers: null,
        queueBadgeTimer: null,
        queueBadgeSig: '',
        expandedClozeParents: new Set()
    },
    confirmResolve: null,
    confirmDefaults: {
        title: 'Confirm delete',
        body: 'This removes it locally and syncs deletion to Notion.',
        confirmLabel: 'Delete'
    },
    isAiModeSelected() {
        return normalizeRevisionMode(el('#revisionMode')?.value) === REVISION_MODE_AI;
    },
    isTypeInModeSelected() {
        return normalizeRevisionMode(el('#revisionMode')?.value) === REVISION_MODE_TYPEIN;
    },
    isAiModeUsable() {
        if (!this.isAiModeSelected()) return false;
        if (!navigator.onLine) return false;
        if (!this.state.settings.aiVerified) return false;
        if (!this.state.settings.aiKey) return false;
        return true;
    },
    async init() {
        this.applyTheme();
        this.applyFontMode();
        this.applyFabPosition();

        showLoading('Preparing app...', 'Loading your decks and cards.');
        await Storage.init();
        await this.loadFromDB();
        if (!this.state.tagOptions || this.state.tagOptions.length === 0) {
            this.state.tagOptions = this.buildLocalTagOptions();
        }
        await this.loadSession(); // Load any active study session (async for IndexedDB)
        this.captureOAuth();
        upgradeNativeSelects();
        this.bind();
        this.seedIfEmpty();
        this.renderAll();
        await this.autoVerifyWorker();
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        if (window.matchMedia) {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            mq.addEventListener('change', () => this.applyTheme());
        }
        Tooltip.bind();
        this.startAutoSync();
        this.startQueueBadgeHeartbeat();
        this.processDyContextQueue();
        hideLoading();
    },
    startQueueBadgeHeartbeat() {
        if (this.state.queueBadgeTimer) return;
        const buildSig = () => {
            const size = this.state.queue.size;
            const syncing = this.state.syncing ? 1 : 0;
            const online = navigator.onLine ? 1 : 0;
            const err = this.state.lastQueueError?.message || '';
            const at = this.state.queueLastChangedAt || '';
            return `${size}|${syncing}|${online}|${err}|${at}`;
        };
        this.state.queueBadgeSig = buildSig();
        this.state.queueBadgeTimer = setInterval(() => {
            const sig = buildSig();
            if (sig === this.state.queueBadgeSig) return;
            this.state.queueBadgeSig = sig;
            this.renderConnection();
        }, 5000);
    },
    async loadSession() {
        this.state.session = await Storage.getSession();
        if (this.state.session) {
            this.state.activeTab = 'study';
        }
    },
    saveSession() {
        // Fire-and-forget async save - session is cached in Storage for sync access
        Storage.setSession(this.state.session).catch(e => {
            console.error('Failed to save session:', e);
        });
    },
    // Debounced version for frequent updates during study
    _debouncedSaveSession: null,
    saveSessionDebounced() {
        if (!this._debouncedSaveSession) {
            this._debouncedSaveSession = debounce(() => {
                Storage.setSession(this.state.session).catch(e => {
                    console.error('Failed to save session:', e);
                });
            }, 500);
        }
        this._debouncedSaveSession();
    },
    setSyncButtonSpinning(on) {
        const btn = el('#syncNowBtn');
        if (!btn) return;
        const icon = btn.querySelector('svg, i');
        btn.disabled = on || !navigator.onLine || this.state.syncing;
        btn.classList.toggle('opacity-70', btn.disabled);
        if (icon) icon.classList.toggle('animate-spin', on);
    },
    setRefreshDecksSpinning(on) {
        const btn = el('#refreshDecksBtn');
        if (!btn) return;
        const icon = btn.querySelector('svg, i');
        btn.disabled = on || !navigator.onLine || this.state.syncing;
        btn.classList.toggle('opacity-70', btn.disabled);
        if (icon) icon.classList.toggle('animate-spin', on);
    },
    async ensureMicPermission({ toastOnError = false } = {}) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return true;
        if (this.state.micPermissionPromise) return this.state.micPermissionPromise;
        this.state.micPermissionPromise = navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                // Immediately stop the tracks: we only want the permission grant, not an always-on mic.
                // Keeping a live stream makes the browser show "microphone in use" even when not recording.
                try { stream.getTracks().forEach(t => t.stop()); } catch (_) { }
                // Only set warmed state after successfully stopping tracks
                this.state.settings.sttPermissionWarmed = true;
                Storage.setSettings(this.state.settings);
                return true;
            })
            .catch(err => {
                // Permission denied or other error - ensure state reflects reality
                this.state.settings.sttPermissionWarmed = false;
                Storage.setSettings(this.state.settings);
                if (toastOnError) toast('Microphone access denied');
                throw err;
            })
            .finally(() => {
                this.state.micPermissionPromise = null;
            });
        return this.state.micPermissionPromise;
    },
    warmMicStreamForAi() {
        // Only warm when explicitly requested elsewhere; avoid auto prompts on load
        if (this.state.micPermissionPromise) return;
        this.ensureMicPermission({ toastOnError: true }).catch(() => { /* handled via toast */ });
    },
    isSttEnabled() {
        return !!this.state.settings.sttProvider;
    },
    stopMicActivity(hideFeedback = false) {
        const hadActive = this.isMicActive() || !!this.state.activeAudioStream;
        try {
            if (this.state.activeAudioStream) {
                this.state.activeAudioStream.getTracks().forEach(t => t.stop());
                this.state.activeAudioStream = null;
            }
        } catch (_) { this.state.activeAudioStream = null; }
        try {
            if (this.state.currentRecorder && typeof this.state.currentRecorder.stop === 'function') {
                // SpeechRecognition can keep the system mic indicator on until it fully ends;
                // abort() is the most reliable way to release immediately.
                if (typeof this.state.currentRecorder.abort === 'function') {
                    try { this.state.currentRecorder.abort(); } catch (_) { }
                } else {
                    this.state.currentRecorder.stop();
                }
            }
        } catch (_) { }
        try {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
            }
        } catch (_) { }
        this.state.currentRecorder = null;
        this.mediaRecorder = null;
        // Preserve `userStoppedMic` while async onend/onstop handlers run (cloud STT uses it).
        // If nothing was active, clear it to avoid stale UI state.
        if (!hadActive) this.state.userStoppedMic = false;
        this.state.activeMicButton = null;
        if (hideFeedback) {
            const feedback = el('#aiFeedback');
            if (feedback) { feedback.classList.add('hidden'); feedback.innerHTML = ''; }
        }
        this.setMicVisualState(false);
        this.setAiControlsLocked(this.state.aiLocked);
        this.updateMobileFab();
    },
    async getMicStream() {
        // Request a fresh stream for actual recording; do not keep the mic open between actions.
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Microphone unsupported');
        return navigator.mediaDevices.getUserMedia({ audio: true });
    },
    isMicActive() {
        return !!this.state.currentRecorder || (this.mediaRecorder && this.mediaRecorder.state === 'recording');
    },
    toggleMicRecording() {
        const isAiMode = this.isAiModeUsable();
        if (!isAiMode || !this.isSttEnabled() || this.state.answerRevealed || this.state.aiLocked) return;

        if (this.isMicActive()) {
            const feedback = el('#aiFeedback');
            if (feedback) {
                const txt = (feedback.textContent || '').toLowerCase();
                if (txt.includes('listening') || txt.includes('recording')) {
                    feedback.classList.remove('hidden');
                    feedback.innerHTML = 'Captured. Now send.';
                }
            }
            this.stopMicActivity(false);
            return;
        }

        this.recordAnswer();
    },
    setMicVisualState(listening) {
        const micBtn = el('#aiRecord');
        const fabMic = el('#fabMic');
        const buttons = [micBtn, fabMic];
        // Reset all
        buttons.forEach(btn => {
            if (!btn) return;
            btn.classList.remove('ring', 'ring-dull-purple', 'ring-offset-2', 'animate-pulse', 'bg-accent-soft');
        });
        if (!listening) return;
        const target = this.state.activeMicButton === 'fab' ? fabMic : micBtn || fabMic;
        if (!target) return;
        target.classList.add('ring', 'ring-dull-purple', 'ring-offset-2', 'animate-pulse', 'bg-accent-soft');
    },
    setAiControlsLocked(locked) {
        if (!locked && this.state.lockAiUntilNextCard && !this.state.answerRevealed) {
            locked = true;
        }
        this.state.aiLocked = locked;
        const sendBtn = el('#aiSubmit');
        const micBtn = el('#aiRecord');
        const fabMic = el('#fabMic');
        const fabSend = el('#fabSend');
        const isAiMode = this.isAiModeUsable();
        const sttEnabled = this.isSttEnabled();
        const listening = this.isMicActive();
        const answerField = el('#aiAnswer');
        const lockInput = isAiMode && locked;
        if (sendBtn) {
            sendBtn.disabled = locked || sendBtn.dataset.empty === '1';
            sendBtn.classList.toggle('opacity-50', sendBtn.disabled);
            sendBtn.classList.toggle('cursor-not-allowed', sendBtn.disabled);
            sendBtn.classList.toggle('hidden', isAiMode && locked);
        }
        if (micBtn) {
            micBtn.disabled = locked;
            micBtn.classList.toggle('opacity-50', micBtn.disabled);
            micBtn.classList.toggle('cursor-not-allowed', micBtn.disabled);
            micBtn.classList.toggle('hidden', isAiMode && (locked || !sttEnabled));
        }
        if (answerField) {
            answerField.disabled = lockInput;
            answerField.readOnly = lockInput;
            answerField.classList.toggle('pointer-events-none', lockInput);
            answerField.classList.toggle('opacity-60', lockInput);
        }
        if (fabMic) {
            fabMic.disabled = locked;
            fabMic.classList.toggle('opacity-50', fabMic.disabled);
            fabMic.classList.toggle('cursor-not-allowed', fabMic.disabled);
            fabMic.classList.toggle('hidden', isAiMode && (locked || !sttEnabled));
        }
        if (fabSend) {
            fabSend.disabled = locked || (sendBtn && sendBtn.dataset.empty === '1');
            fabSend.classList.toggle('opacity-50', fabSend.disabled);
            fabSend.classList.toggle('cursor-not-allowed', fabSend.disabled);
        }
        this.setMicVisualState(listening);
        this.updateMobileFab();
    },
    updateGhostInkControlsState() {
        const answerField = el('#ghostinkAnswer');
        const checkBtn = el('#ghostinkCheck');
        if (!answerField || !checkBtn) return;

        const hasText = (answerField.value || '').trim().length > 0;
        const inGhostInkMode = this.isTypeInModeSelected();
        const locked = this.state.answerRevealed;

        answerField.disabled = !inGhostInkMode || locked;
        answerField.readOnly = !inGhostInkMode || locked;
        answerField.classList.toggle('pointer-events-none', !inGhostInkMode || locked);
        answerField.classList.toggle('opacity-60', !inGhostInkMode || locked);

        checkBtn.disabled = !inGhostInkMode || locked || !hasText;
        checkBtn.classList.toggle('opacity-50', checkBtn.disabled);
        checkBtn.classList.toggle('cursor-not-allowed', checkBtn.disabled);
    },
    generateCardQueue(deckIds, includeNonDue = false, opts = {}) {
        const { precomputeReverse = true, isCram = false } = opts || {};
        const validIds = (deckIds || []).filter(id => !!this.deckById(id));
        const selectedDeckIds = [...new Set(validIds)];
        if (selectedDeckIds.length === 0) return [];

        const deckBuckets = new Map();
        for (const id of selectedDeckIds) {
            deckBuckets.set(id, []);
        }

        for (const deckId of selectedDeckIds) {
            const cardIds = this.state.cardDeckIndex.get(deckId);
            if (!cardIds) continue;
            for (const cardId of cardIds) {
                const c = this.state.cards.get(cardId);
                if (!c) continue;
                if (this.passFilters(c, { context: 'study' }) &&
                    isSchedulable(c) &&
                    (includeNonDue || this.isDue(c))
                ) {
                    deckBuckets.get(deckId).push(c);
                }
            }
        }

        const shuffleInPlace = (arr) => {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        };

        const applyOrderForDeck = (arr, deck, isNewCards = false) => {
            const mode = deck?.orderMode || 'none';
            const shuffleNewCards = deck?.shuffleNew ?? true;

            if (isNewCards && shuffleNewCards && mode !== 'property') {
                shuffleInPlace(arr);
                return;
            }

            if (mode === 'created') {
                arr.sort((a, b) => {
                    const aKey = a.createdAt || a.id || '';
                    const bKey = b.createdAt || b.id || '';
                    return aKey.localeCompare(bKey);
                });
                return;
            }
            if (mode === 'property') {
                arr.sort((a, b) => {
                    const aOrder = (a.order !== null && a.order !== undefined && a.order !== '') ? a.order : null;
                    const bOrder = (b.order !== null && b.order !== undefined && b.order !== '') ? b.order : null;

                    if (aOrder === null && bOrder === null) {
                        const aKey = a.createdAt || a.id || '';
                        const bKey = b.createdAt || b.id || '';
                        return aKey.localeCompare(bKey);
                    }
                    if (aOrder === null) return 1;
                    if (bOrder === null) return -1;

                    const cmp = naturalCompare(aOrder, bOrder);
                    if (cmp !== 0) return cmp;

                    const aKey = a.createdAt || a.id || '';
                    const bKey = b.createdAt || b.id || '';
                    return aKey.localeCompare(bKey);
                });
                return;
            }
            shuffleInPlace(arr);
        };

        const interleavePreservingOrder = (deckToArr) => {
            const ids = Object.keys(deckToArr || {}).filter(id => Array.isArray(deckToArr[id]) && deckToArr[id].length > 0);
            if (ids.length === 0) return [];
            const remaining = new Map(ids.map(id => [id, deckToArr[id].slice()]));
            const out = [];
            while (true) {
                const choices = ids.filter(id => (remaining.get(id) || []).length > 0);
                if (choices.length === 0) break;
                let total = 0;
                for (const id of choices) total += remaining.get(id).length;
                let r = Math.random() * total;
                let chosen = choices[0];
                for (const id of choices) {
                    r -= remaining.get(id).length;
                    if (r <= 0) { chosen = id; break; }
                }
                out.push(remaining.get(chosen).shift());
            }
            return out;
        };

        const reviewBuckets = {};
        const newBuckets = {};
        const allBuckets = {};

        for (const deckId of selectedDeckIds) {
            const deck = this.deckById(deckId);
            const deckCards = deckBuckets.get(deckId) || [];
            if (deckCards.length === 0) continue;

            if (includeNonDue) {
                // Practice mode: cap per deck using reviewLimit, preserve deck-specific ordering.
                const limit = Math.max(0, deck?.reviewLimit ?? 50);
                const arr = deckCards.slice();
                applyOrderForDeck(arr, deck);
                allBuckets[deckId] = arr.slice(0, limit);
            } else {
                // Due-only: cap per deck with separate review vs new limits.
                const reviewLimit = Math.max(0, deck?.reviewLimit ?? 50);
                const newLimit = Math.max(0, deck?.newLimit ?? 20);
                const newCards = deckCards.filter(c => this.isCardNew(c));
                const reviewCards = deckCards.filter(c => !this.isCardNew(c));
                applyOrderForDeck(reviewCards, deck, false);
                applyOrderForDeck(newCards, deck, true); // Apply separate ordering for new cards
                reviewBuckets[deckId] = reviewCards.slice(0, reviewLimit);
                newBuckets[deckId] = newCards.slice(0, newLimit);
            }
        }

        const chosen = includeNonDue
            ? interleavePreservingOrder(allBuckets)
            : [...interleavePreservingOrder(reviewBuckets), ...interleavePreservingOrder(newBuckets)];

        // Pre-compute reverse decisions PER-CARD based on its own deck's settings.
        return chosen.map(card => {
            if (!precomputeReverse) {
                return { cardId: card.id, reversed: null };
            }
            const deck = this.deckById(card.deckId);
            const typeKey = (card.type || '').toLowerCase();
            const isCloze = typeKey === 'cloze';
            const isFrontStyle = typeKey.includes('front');
            // Never reverse cloze cards. Reverse only if the source deck enables it.
            const shouldReverse = !isCloze && !!deck?.reverse && isFrontStyle && Math.random() < 0.5;
            return { cardId: card.id, reversed: shouldReverse };
        });
    },
    startSession() {
        if (this.state.optimizing?.active) {
            toast('Optimization in progress — please wait');
            return;
        }

        const deckIds = this.getEffectiveStudyDeckIds();
        if (deckIds.length === 0) {
            toast('No decks match current deck filter');
            return;
        }

        // Check card selection mode (due only vs all vs cram)
        const cardSelectionMode = el('#cardSelectionMode')?.value || 'due';
        let revisionMode = normalizeRevisionMode(el('#revisionMode')?.value);

        if (revisionMode === REVISION_MODE_AI && !navigator.onLine) {
            revisionMode = REVISION_MODE_MANUAL;
            toast('Offline: switched to Manual mode');
        }

        const includeNonDue = cardSelectionMode !== 'due';
        const noScheduleChanges = cardSelectionMode === 'cram'
            ? true
            : includeNonDue
                ? (el('#noScheduleChanges')?.checked ?? true)
                : false;

        const cardQueue = this.generateCardQueue(deckIds, includeNonDue, {
            isCram: cardSelectionMode === 'cram'
        });

        if (cardQueue.length === 0) {
            if (includeNonDue) {
                // No cards at all in the selected decks
                toast('No cards in selected decks');
            } else {
                // Check if there are non-due cards available for practice
                let totalNonDue = 0;
                for (const dId of deckIds) {
                    const cardIds = this.state.cardDeckIndex.get(dId);
                    if (!cardIds) continue;
                    for (const cId of cardIds) {
                        const c = this.state.cards.get(cId);
                        if (!c) continue;
                        if (!this.passFilters(c, { context: 'study' })) continue;
                        if (!isSchedulable(c)) continue;
                        if (!this.isDue(c)) totalNonDue += 1;
                    }
                }

                if (totalNonDue > 0) {
                    // Show a more helpful message with option to practice
                    toastLong(`All caught up! ${totalNonDue} card${totalNonDue === 1 ? ' is' : 's are'} available for extra practice.`);
                    // Auto-switch to the practice mode offer in renderStudy
                    this.renderStudy();
                } else {
                    toast('No cards available - add some cards to get started');
                }
            }
            return;
        }

        const deck = this.deckById(deckIds[0]);
        this.state.session = {
            id: 'session_' + Date.now(),
            startedAt: new Date().toISOString(),
            startTime: Date.now(),
            deckIds: deckIds,
            algorithm: deck?.algorithm || 'SM-2',
            settings: {
                revisionMode: revisionMode,
                cardSelectionMode: cardSelectionMode,
                filters: { ...this.state.filters }
            },
            cardQueue: cardQueue,
            currentIndex: 0,
            completed: [],
            skipped: [],
            studyingNonDue: includeNonDue,
            ratingCounts: { Again: 0, Hard: 0, Good: 0, Easy: 0 },
            noScheduleChanges
        };

        this.saveSession();
        this.renderStudy();
        toast(`Session started: ${cardQueue.length} cards`);
    },
    abandonSession() {
        this.state.session = null;
        this.saveSession();
        this.renderStudy();
        toast('Session stopped');
        if (this.state.queue.size > 0) this.requestAutoSyncSoon(200, 'session-end');
    },
    getSessionCard() {
        const session = this.state.session;
        while (session && session.currentIndex < session.cardQueue.length) {
            const queueItem = session.cardQueue[session.currentIndex];
            const card = this.cardById(queueItem.cardId);
            if (card) {
                if (card.suspended || card.leech) {
                    console.warn(`Skipping suspended/leech card in session: ${queueItem.cardId}`);
                    session.skipped.push(queueItem.cardId);
                    session.currentIndex++;
                    this.saveSessionDebounced();
                    continue;
                }
                return {
                    card: card,
                    reversed: queueItem.reversed
                };
            }
            // Card deleted or not found; skip it and persist progress
            console.warn(`Skipping deleted card in session: ${queueItem.cardId}`);
            session.skipped.push(queueItem.cardId);
            session.currentIndex++;
            this.saveSessionDebounced();
        }
        return null;
    },
    advanceSession(wasSkipped = false) {
        const session = this.state.session;
        if (!session) return;

        if (this.state._advancingSession) return;
        this.state._advancingSession = true;

        cleanupTempLightboxes();

        const queueItem = session.cardQueue[session.currentIndex];
        if (queueItem) {
            // Check for pending saves (e.g. from Mark/Flag in preview/cram/study) that weren't saved by rate()
            // This catches "Skip" actions where data was modified
            const card = this.cardById(queueItem.cardId);
            if (card && card._pendingSave) {
                // Clone the card data before async ops to avoid stale references
                const cardSnapshot = JSON.parse(JSON.stringify(card));
                delete card._pendingSave;
                Storage.put('cards', card).then(() => {
                    this.queueOp({ type: 'card-upsert', payload: cardSnapshot });
                }).catch(e => console.error('Failed to save skipped card:', e));
            }

            if (wasSkipped) {
                session.skipped.push(queueItem.cardId);
            } else {
                session.completed.push(queueItem.cardId);
            }
        }

        session.currentIndex++;
        // Debounced save is sufficient - IndexedDB persists locally, no crash risk
        this.saveSessionDebounced();

        // Add fade transition between cards
        const cardFront = el('#cardFront');
        const cardBack = el('#cardBack');
        if (cardFront) cardFront.classList.add('card-transitioning');
        if (cardBack) cardBack.classList.add('card-transitioning');

        // Use a local reference to avoid closure issues if session changes
        const currentSession = session;
        setTimeout(() => {
            try {
                // Check if session is complete
                if (currentSession.currentIndex >= currentSession.cardQueue.length) {
                    this.renderSessionComplete();
                } else {
                    this.renderStudy();
                }
                if (cardFront) cardFront.classList.remove('card-transitioning');
                if (cardBack) cardBack.classList.remove('card-transitioning');
            } finally {
                // Always release the guard, even if render throws
                this.state._advancingSession = false;
            }
        }, 150);
    },
    renderSessionComplete() {
        const session = this.state.session;
        if (!session) return;

        const completedCount = session.completed.length;
        const skippedCount = session.skipped.length;

        // Calculate session statistics
        const durationMs = Date.now() - (session.startTime || Date.now());
        const durationMins = Math.round(durationMs / 60000);
        const cardsPerMin = durationMins > 0 ? (completedCount / durationMins).toFixed(1) : completedCount;
        const ratings = session.ratingCounts || { Again: 0, Hard: 0, Good: 0, Easy: 0 };
        const totalRatings = ratings.Again + ratings.Hard + ratings.Good + ratings.Easy;

        // Update session UI to show completion state
        const activeBar = el('#sessionActiveBar');
        const progressText = el('#sessionProgressText');
        if (activeBar) {
            progressText.textContent = `Study Session - Complete!`;
        }

        // Hide mobile FAB since session is complete (showing stats)
        this.updateMobileFab();

        // Hide all study controls
        const studyControls = el('#studyControls');
        if (studyControls) studyControls.classList.add('hidden');
        const revealBtn = el('#revealBtn');
        if (revealBtn) revealBtn.classList.add('hidden');
        const addNoteBtn = el('#addNoteBlock');
        if (addNoteBtn) addNoteBtn.classList.add('hidden');
        const copyBtn = el('#copyCardContent');
        if (copyBtn) copyBtn.classList.add('hidden');
        const notesSection = el('#notesSection');
        if (notesSection) notesSection.classList.add('hidden');

        // Calculate percentages for positioning
        const againPct = totalRatings > 0 ? (ratings.Again / totalRatings * 100) : 0;
        const hardPct = totalRatings > 0 ? (ratings.Hard / totalRatings * 100) : 0;
        const goodPct = totalRatings > 0 ? (ratings.Good / totalRatings * 100) : 0;
        const easyPct = totalRatings > 0 ? (ratings.Easy / totalRatings * 100) : 0;

        // Build rating distribution bar with aligned numbers
        const ratingBar = totalRatings > 0 ? `
 <div class="flex w-full h-2 rounded-full overflow-hidden bg-surface-muted mt-2">
 ${ratings.Again > 0 ? `<div style="width: ${againPct}%; background: var(--rating-again-fill);"></div>` : ''}
 ${ratings.Hard > 0 ? `<div style="width: ${hardPct}%; background: var(--rating-hard-fill);"></div>` : ''}
 ${ratings.Good > 0 ? `<div style="width: ${goodPct}%; background: var(--rating-good-fill);"></div>` : ''}
 ${ratings.Easy > 0 ? `<div style="width: ${easyPct}%; background: var(--rating-easy-fill);"></div>` : ''}
 </div>
 <div class="flex w-full text-[10px] mt-1">
 ${ratings.Again > 0 ? `<span class="rating-text-again text-center" style="width: ${againPct}%">${ratings.Again}</span>` : ''}
 ${ratings.Hard > 0 ? `<span class="rating-text-hard text-center" style="width: ${hardPct}%">${ratings.Hard}</span>` : ''}
 ${ratings.Good > 0 ? `<span class="rating-text-good text-center" style="width: ${goodPct}%">${ratings.Good}</span>` : ''}
 ${ratings.Easy > 0 ? `<span class="rating-text-easy text-center" style="width: ${easyPct}%">${ratings.Easy}</span>` : ''}
 </div>
 ` : '';

        el('#studyDeckLabel').textContent = 'Session Complete';
        el('#cardFront').innerHTML = `
 <div class="text-center py-4 md:py-6">
 <h3 class="font-display text-base md:text-lg text-main mb-1">Session Complete</h3>
 <p class="text-muted text-xs md:text-sm">
 ${completedCount} card${completedCount !== 1 ? 's' : ''} reviewed${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}
 </p>
 <p class="text-faint text-[10px] md:text-xs mb-3">
 ${durationMins > 0 ? `${durationMins} min` : '<1 min'} · ${cardsPerMin} cards/min
 </p>
 <div class="max-w-[200px] mx-auto mb-4">
 ${ratingBar}
 </div>
 <div class="flex flex-col gap-3 items-center">
 <div class="flex flex-col items-center">
 <button id="restartAllCardsBtn" class="px-4 py-2 bg-[color:var(--accent)] text-[color:var(--badge-text)] rounded-lg text-sm hover:bg-[color:color-mix(in_srgb,var(--accent)_90%,transparent)] transition">
 Restart
 </button>
 <label class="flex items-center gap-2 text-[11px] text-sub mt-2">
 <input id="restartNoScheduleChanges" type="checkbox" class="accent-dull-purple" checked>
 <span>No scheduling changes</span>
 </label>
 <p class="text-[10px] md:text-xs text-faint mt-1">Restart with all cards in selected decks</p>
 </div>
 <button id="endSessionBtn" class="px-4 py-2 border border-card text-sub rounded-lg text-sm hover:bg-surface-muted transition">
 End Session
 </button>
 </div>
 </div>
 `;
        el('#cardBack').innerHTML = '';
        el('#cardBack').classList.add('hidden');
        this.state.selectedCard = null;
        this.setRatingEnabled(false);

        // Bind completion buttons
        setTimeout(() => {
            const restartBtn = el('#restartAllCardsBtn');
            const endBtn = el('#endSessionBtn');
            if (restartBtn) restartBtn.onclick = () => this.restartWithAllCards();
            if (endBtn) endBtn.onclick = () => this.abandonSession();
        }, 0);

        // Trigger sync for any pending reviews from this session
        if (this.state.queue?.size > 0) {
            this.requestAutoSyncSoon(500, 'session-complete');
        }
    },
    restartWithAllCards() {
        const session = this.state.session;
        if (!session) return;

        const previewCheckbox = el('#restartNoScheduleChanges');
        const noScheduleChanges = previewCheckbox ? previewCheckbox.checked : true;
        const cardQueue = this.generateCardQueue(session.deckIds, true);
        if (cardQueue.length === 0) {
            toast('No cards available');
            this.abandonSession();
            return;
        }

        session.cardQueue = cardQueue;
        session.currentIndex = 0;
        session.completed = [];
        session.skipped = [];
        session.studyingNonDue = true;
        session.noScheduleChanges = noScheduleChanges;
        if (session.settings) session.settings.cardSelectionMode = 'all';
        this.saveSession();
        this.renderStudy();
        toast(`Practicing ${cardQueue.length} cards`);
    },
    captureOAuth() {
        const hashParams = new URLSearchParams(location.hash.replace('#', '?'));
        const token = hashParams.get('token') || hashParams.get('accessToken');
        if (token) {
            this.state.settings.authToken = token;
            this.state.authVerified = false;
            this.state.settings.authVerified = false;
            Storage.setSettings(this.state.settings);
            toast('Notion token captured');
            safeHistoryReplace({}, document.title, location.pathname);
            this.openSettings();
            if (this.state.settings.workerUrl) {
                this.verifyAuth().catch(() => { });
            } else {
                toast('Add worker URL then scan sources');
            }
        }
    },
    async loadFromDB() {
        this.state.decks = (await Storage.getAll('decks')).map(d => {
            const algorithm = (d.algorithm || '').toUpperCase() === 'FSRS' ? 'FSRS' : 'SM-2';
            return {
                ...d,
                algorithm,
                orderMode: d.orderMode || (d.ordered ? 'created' : 'none') || 'none',
                aiPrompt: d.aiPrompt || DEFAULT_AI_PROMPT,
                dynamicContext: !!d.dynamicContext,
                dyAiPrompt: ((d.dyAiPrompt || '').trim())
                    ? (d.dyAiPrompt || '')
                    : (d.dynamicContext ? DEFAULT_DYCONTEXT_PROMPT : ''),
                srsConfig: parseSrsConfig(d.srsConfig || d.srsConfigRaw || null, algorithm)
            };
        });
        this.state.cards = new Map();
        this.state.cardNotionIdIndex = new Map();
        this.state.cardDeckIndex = new Map();
        this.state.tagRegistry = new Map();
        this.state.deckStats = new Map();
        this.state.dueIndex = new Map();
        this.state.cardMeta = new Map();
        this.state.cardsVersion = 0;
        this.state.fsrsDeckHistoryVersion = new Map();
        this.state.studyDeckCache = null;
        this.state.tagIndex = new Map();
        this.state.flagIndex = new Map();
        this.state.markedIndex = new Set();
        this.state.ratingIndex = new Map();
        this.state.createdDateIndex = new Map();
        this.state.analyticsCardSummary = new Map();
        this.state.analyticsAggGlobalAll = this.createAnalyticsAggregate();
        this.state.analyticsAggGlobalActive = this.createAnalyticsAggregate();
        this.state.analyticsAggDeckAll = new Map();
        this.state.analyticsAggDeckActive = new Map();
        this.state.analyticsAggVersion = 0;
        this.state.analyticsHeatmapYearHtmlCache = new Map();

        const rawCards = await Storage.getAll('cards');
        let invalidCardStates = 0;
        const cardsToSave = [];
        for (const c of rawCards) {
            const srsState = parseSrsState(c.srsState || null);
            let needsSave = false;
            if (!Array.isArray(c.reviewHistory)) needsSave = true;
            if (srsState.learning.state === 'new' && ((c.reviewHistory || []).length > 0 || c.fsrs?.lastReview || c.sm2?.lastReview)) {
                srsState.learning.state = 'review';
                srsState.learning.step = 0;
                srsState.learning.due = null;
                needsSave = true;
            }
            const card = {
                ...c,
                suspended: c.suspended ? 1 : 0,
                reviewHistory: Array.isArray(c.reviewHistory) ? c.reviewHistory : [],
                srsState,
                fsrs: {
                    difficulty: c.fsrs?.difficulty ?? srsState.fsrs.difficulty,
                    stability: c.fsrs?.stability ?? srsState.fsrs.stability,
                    retrievability: c.fsrs?.retrievability ?? srsState.fsrs.retrievability,
                    lastRating: c.fsrs?.lastRating ?? c.lastRating ?? null,
                    lastReview: c.fsrs?.lastReview ?? c.lastReview ?? null,
                    dueDate: c.fsrs?.dueDate ?? c.dueDate ?? null
                },
                sm2: {
                    interval: c.sm2?.interval ?? srsState.sm2.interval,
                    easeFactor: c.sm2?.easeFactor ?? srsState.sm2.easeFactor,
                    repetitions: c.sm2?.repetitions ?? srsState.sm2.repetitions,
                    lastRating: c.sm2?.lastRating ?? c.lastRating ?? null,
                    lastReview: c.sm2?.lastReview ?? c.lastReview ?? null,
                    dueDate: c.sm2?.dueDate ?? c.dueDate ?? null
                }
            };
            const normalizedHistory = this.normalizeReviewHistory(card.reviewHistory);
            if (!this.reviewHistoriesEqual(card.reviewHistory, normalizedHistory)) {
                card.reviewHistory = normalizedHistory;
                needsSave = true;
            }
            if (card.srsStateError) {
                invalidCardStates += 1;
                needsSave = true;
                delete card.srsStateError;
            }
            if (needsSave) cardsToSave.push(card);
            this.setCard(card);
        }
        // Persist corrected SRS states to avoid repeated warnings
        if (cardsToSave.length > 0) {
            await Storage.putMany('cards', cardsToSave).catch(() => { });
        }
        const invalidDeckConfigs = this.state.decks.filter(d => d.srsConfigError).length;
        if (invalidDeckConfigs > 0) {
            toast(`Invalid SRS Config in ${invalidDeckConfigs} deck${invalidDeckConfigs === 1 ? '' : 's'} — using defaults`);
        }
        if (invalidCardStates > 0) {
            toast(`Invalid SRS State in ${invalidCardStates} card${invalidCardStates === 1 ? '' : 's'} — using defaults`);
        }

        const rawQueue = await Storage.getSyncQueue();
        this.state.queue = new Map();
        for (const op of rawQueue) {
            const key = this.queueKey(op);
            if (key) this.state.queue.set(key, op);
        }
        el('#queueCount').textContent = String(this.state.queue.size);

        this.state.lastQueueError = (await Storage.getMeta('lastQueueError')) || null;
        this.state.queueLastChangedAt = (await Storage.getMeta('queueLastChangedAt')) || null;
        const meta = await Storage.getAll('meta');
        const last = meta.find(m => m.key === 'lastSync');
        if (last) this.state.lastSync = last.value;
        const lp = meta.find(m => m.key === 'lastPull');
        if (lp) this.state.lastPull = lp.value;
        const lpush = meta.find(m => m.key === 'lastPush');
        if (lpush) this.state.lastPush = lpush.value;
        const tagMeta = meta.find(m => m.key === 'tagOptions');
        if (tagMeta && Array.isArray(tagMeta.value)) this.state.tagOptions = tagMeta.value;
        const filterPrefs = meta.find(m => m.key === 'filterPrefs')?.value;
        if (filterPrefs && typeof filterPrefs === 'object') {
            const libraryPrefs = filterPrefs.library || {};
            const analyticsPrefs = filterPrefs.analytics || {};
            if (typeof libraryPrefs.hideSuspended === 'boolean') this.state.filters.suspended = libraryPrefs.hideSuspended;
            if (typeof libraryPrefs.hideLeech === 'boolean') this.state.filters.leech = libraryPrefs.hideLeech;
            if (typeof analyticsPrefs.includeSuspended === 'boolean') this.state.analyticsIncludeSuspended = analyticsPrefs.includeSuspended;
            if (Array.isArray(analyticsPrefs.tags)) this.state.analyticsTags = analyticsPrefs.tags.filter(Boolean);
            if (Array.isArray(analyticsPrefs.flags)) this.state.analyticsFlags = analyticsPrefs.flags.filter(Boolean);
            if (typeof analyticsPrefs.marked === 'boolean') this.state.analyticsMarked = analyticsPrefs.marked;
        }
        const uiState = meta.find(m => m.key === 'uiState')?.value;
        if (uiState && typeof uiState === 'object') {
            const allowedTabs = new Set(['study', 'library', 'analytics']);
            if (typeof uiState.activeTab === 'string' && allowedTabs.has(uiState.activeTab)) {
                this.state.activeTab = uiState.activeTab;
            }
            if (typeof uiState.selectedDeckId === 'string') {
                const deck = this.deckById(uiState.selectedDeckId);
                if (deck) this.state.selectedDeck = deck;
            }
            if (typeof uiState.cardSearch === 'string') this.state.cardSearch = uiState.cardSearch;
            if (typeof uiState.deckSearch === 'string') this.state.deckSearch = uiState.deckSearch;
            if (uiState.filters && typeof uiState.filters === 'object') {
                this.state.filters = normalizeFilterState({
                    ...this.state.filters,
                    ...uiState.filters
                });
            }
            if (typeof uiState.analyticsRange === 'string') this.state.analyticsRange = uiState.analyticsRange;
            if (typeof uiState.analyticsYear === 'string') this.state.analyticsYear = uiState.analyticsYear;
            if (Array.isArray(uiState.analyticsDecks)) this.state.analyticsDecks = uiState.analyticsDecks.filter(Boolean);
            if (typeof uiState.analyticsHeatmapMetric === 'string') this.state.analyticsHeatmapMetric = uiState.analyticsHeatmapMetric;
            if (typeof uiState.analyticsIncludeSuspended === 'boolean') this.state.analyticsIncludeSuspended = uiState.analyticsIncludeSuspended;
            if (Array.isArray(uiState.analyticsTags)) this.state.analyticsTags = uiState.analyticsTags.filter(Boolean);
            if (Array.isArray(uiState.analyticsFlags)) this.state.analyticsFlags = uiState.analyticsFlags.filter(Boolean);
            if (typeof uiState.analyticsMarked === 'boolean') this.state.analyticsMarked = uiState.analyticsMarked;
        }
        this.state.filters = normalizeFilterState(this.state.filters);
    },
    async seedIfEmpty() {
        return;
    },
    makeTempId() {
        return `tmp_${crypto.randomUUID()}`;
    },
    isTempId(id) {
        return typeof id === 'string' && id.startsWith('tmp_');
    },
    newDeck(name, algorithm = 'SM-2') {
        return {
            id: this.makeTempId(),
            notionId: null,
            name,
            algorithm,
            reviewLimit: 50,
            newLimit: 20,
            reverse: false,
            createdInApp: true,
            updatedInApp: true,
            aiPrompt: DEFAULT_AI_PROMPT,
            aiProvider: '',
            aiModel: '',
            aiKey: '',
            dynamicContext: false,
            dyAiPrompt: '',
            orderMode: 'none',
            srsConfig: parseSrsConfig(null, algorithm)
        };
    },
    newCard(deckId, name, back, type) {
        const now = new Date().toISOString();
        return {
            id: this.makeTempId(),
            notionId: null,
            deckId,
            name,
            back,
            type,
            tags: [],
            notes: '',
            marked: false,
            flag: '',
            suspended: 0,
            leech: false,
            order: null,
            parentCard: null,
            subCards: [],
            clozeIndexes: '',
            dyRootCard: null,
            dyPrevCard: null,
            fsrs: { difficulty: 4, stability: 1, retrievability: 0.9, lastRating: null, lastReview: null, dueDate: now },
            sm2: { interval: 1, easeFactor: 2.5, repetitions: 0, dueDate: now },
            syncId: crypto.randomUUID(),
            updatedInApp: true,
            reviewHistory: [],
            srsState: parseSrsState(null),
            createdAt: now
        };
    },
    async applyIdMappings({ deckIdMap = {}, cardIdMap = {} } = {}) {
        const hasDeckMap = deckIdMap && Object.keys(deckIdMap).length > 0;
        const hasCardMap = cardIdMap && Object.keys(cardIdMap).length > 0;
        if (!hasDeckMap && !hasCardMap) return;

        const deckChanges = [];
        const cardIdChanges = [];
        const cardUpdates = [];
        const cardsBeingRenamed = new Set();

        // Update decks
        if (hasDeckMap) {
            for (const deck of this.state.decks) {
                const newId = deckIdMap[deck.id];
                if (newId && newId !== deck.id) {
                    const oldId = deck.id;
                    deck.id = newId;
                    deck.notionId = newId;
                    deckChanges.push({ oldId, value: deck });
                }
            }

            if (this.state.selectedDeck && deckIdMap[this.state.selectedDeck.id]) {
                this.state.selectedDeck.id = deckIdMap[this.state.selectedDeck.id];
                this.state.selectedDeck.notionId = this.state.selectedDeck.id;
            }

            if (this.state.filters?.studyDecks?.length) {
                this.state.filters.studyDecks = this.state.filters.studyDecks.map(id => deckIdMap[id] || id);
            }
            if (this.state.filters?.studyDecksExclude?.length) {
                this.state.filters.studyDecksExclude = this.state.filters.studyDecksExclude.map(id => deckIdMap[id] || id);
            }

            if (this.state.session?.deckIds?.length) {
                this.state.session.deckIds = this.state.session.deckIds.map(id => deckIdMap[id] || id);
            }
            this.state.filters = normalizeFilterState(this.state.filters);
        }

        if (hasDeckMap) {
            for (const [oldDeckId, newDeckId] of Object.entries(deckIdMap)) {
                if (oldDeckId === newDeckId) continue;
                const cardIds = this.state.cardDeckIndex.get(oldDeckId);
                if (cardIds) {
                    const toUpdate = Array.from(cardIds).map(id => this.state.cards.get(id)).filter(Boolean);
                    for (const card of toUpdate) {
                        card.deckId = newDeckId;
                        this.updateCardIndices(card);
                        cardUpdates.push(card);
                        this.state.cardDeckIndex.get(oldDeckId).delete(card.id);
                        if (!this.state.cardDeckIndex.has(newDeckId)) {
                            this.state.cardDeckIndex.set(newDeckId, new Set());
                        }
                        this.state.cardDeckIndex.get(newDeckId).add(card.id);
                    }
                }
            }
        }

        if (hasCardMap) {
            for (const [oldId, newId] of Object.entries(cardIdMap)) {
                if (oldId === newId) continue;

                const card = this.state.cards.get(oldId);
                if (card) {
                    this.removeCard(oldId);
                    card.id = newId;
                    card.notionId = newId;
                    this.setCard(card);
                    cardIdChanges.push({ oldId, value: card });
                    cardsBeingRenamed.add(card);
                    if (card.dyRootCard === oldId) card.dyRootCard = newId;
                    if (card.dyPrevCard === oldId) card.dyPrevCard = newId;
                    if (card.dyNextCard === oldId) card.dyNextCard = newId;

                    if (Array.isArray(card.subCards) && card.subCards.length > 0) {
                        for (const childId of card.subCards) {
                            const child = this.state.cards.get(childId);
                            if (child) {
                                this.removeCard(child.id);
                                child.parentCard = newId;
                                this.setCard(child);
                                if (!cardsBeingRenamed.has(child)) cardUpdates.push(child);
                            }
                        }
                    }

                    if (card.parentCard) {
                        const parent = this.state.cards.get(card.parentCard);
                        if (parent && parent.subCards) {
                            const idx = parent.subCards.indexOf(oldId);
                            if (idx !== -1) {
                                parent.subCards[idx] = newId;
                                if (!cardsBeingRenamed.has(parent)) cardUpdates.push(parent);
                            }
                        }
                    }

                    if (card.dyPrevCard) {
                        const prev = this.state.cards.get(card.dyPrevCard);
                        if (prev && prev.dyNextCard === oldId) {
                            prev.dyNextCard = newId;
                            if (!cardsBeingRenamed.has(prev)) cardUpdates.push(prev);
                        }
                    }
                    if (card.dyNextCard) {
                        const next = this.state.cards.get(card.dyNextCard);
                        if (next && next.dyPrevCard === oldId) {
                            next.dyPrevCard = newId;
                            if (!cardsBeingRenamed.has(next)) cardUpdates.push(next);
                        }
                    }
                }
            }
        }

        if (this.state.selectedCard && hasCardMap && cardIdMap[this.state.selectedCard.id]) {
            this.state.selectedCard.id = cardIdMap[this.state.selectedCard.id];
            this.state.selectedCard.notionId = this.state.selectedCard.id;
        }

        // Update session references
        if (this.state.session) {
            const session = this.state.session;
            if (hasCardMap && Array.isArray(session.cardQueue)) {
                session.cardQueue.forEach(item => {
                    if (cardIdMap[item.cardId]) item.cardId = cardIdMap[item.cardId];
                });
            }
            if (hasCardMap && Array.isArray(session.completed)) {
                session.completed = session.completed.map(id => cardIdMap[id] || id);
            }
            if (hasCardMap && Array.isArray(session.skipped)) {
                session.skipped = session.skipped.map(id => cardIdMap[id] || id);
            }
        }

        // Update lastRating reference for undo
        if (this.state.lastRating?.cardId && hasCardMap && cardIdMap[this.state.lastRating.cardId]) {
            this.state.lastRating.cardId = cardIdMap[this.state.lastRating.cardId];
        }

        // Update queue payloads
        if (this.state.queue instanceof Map) {
            const rekeys = [];
            const dirtyOps = [];

            for (const [key, op] of this.state.queue) {
                let keyChanged = false;
                let payloadChanged = false;

                if (op?.payload) {
                    const pid = op.payload.id;
                    if (pid && deckIdMap[pid]) {
                        op.payload.id = deckIdMap[pid];
                        op.payload.notionId = op.payload.id;
                        keyChanged = true;
                        payloadChanged = true;
                    }
                    if (pid && cardIdMap[pid]) {
                        op.payload.id = cardIdMap[pid];
                        op.payload.notionId = op.payload.id;
                        keyChanged = true;
                        payloadChanged = true;
                    }
                    if (op.payload.deckId && deckIdMap[op.payload.deckId]) {
                        op.payload.deckId = deckIdMap[op.payload.deckId];
                        payloadChanged = true;
                    }
                    if (hasCardMap) {
                        if (op.payload.parentCard && cardIdMap[op.payload.parentCard]) {
                            op.payload.parentCard = cardIdMap[op.payload.parentCard];
                            payloadChanged = true;
                        }
                        if (op.payload.dyRootCard && cardIdMap[op.payload.dyRootCard]) {
                            op.payload.dyRootCard = cardIdMap[op.payload.dyRootCard];
                            payloadChanged = true;
                        }
                        if (op.payload.dyPrevCard && cardIdMap[op.payload.dyPrevCard]) {
                            op.payload.dyPrevCard = cardIdMap[op.payload.dyPrevCard];
                            payloadChanged = true;
                        }
                        if (op.payload.dyNextCard && cardIdMap[op.payload.dyNextCard]) {
                            op.payload.dyNextCard = cardIdMap[op.payload.dyNextCard];
                            payloadChanged = true;
                        }
                    }
                }
                if (op?.type === 'block-append' && op.payload?.pageId && hasCardMap && cardIdMap[op.payload.pageId]) {
                    op.payload.pageId = cardIdMap[op.payload.pageId];
                    keyChanged = true;
                    payloadChanged = true;
                }

                if (payloadChanged && op.id) dirtyOps.push(op);
                if (keyChanged) {
                    const newKey = this.queueKey(op);
                    if (newKey && newKey !== key) {
                        rekeys.push({ oldKey: key, newKey, op });
                    }
                }
            }

            for (const { oldKey, newKey, op } of rekeys) {
                this.state.queue.delete(oldKey);
                this.state.queue.set(newKey, op);
            }

            if (dirtyOps.length > 0) {
                await Promise.all(dirtyOps.map(op => Storage.put('syncQueue', op).catch(() => { })));
            }
        }

        // Persist updates
        if (deckChanges.length > 0) {
            await Storage.replaceIds('decks', deckChanges);
        }
        if (cardIdChanges.length > 0) {
            await Storage.replaceIds('cards', cardIdChanges);
        }
        if (cardUpdates.length > 0) {
            await Storage.putMany('cards', cardUpdates);
        }
        if (this.state.session) {
            this.saveSession();
        }
    },
    bind() {
        el('#syncNowBtn').onclick = () => this.syncNow();
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => btn.onclick = () => this.switchTab(btn.dataset.tab));
        document.querySelectorAll('.theme-btn').forEach(btn => btn.onclick = () => {
            this.state.settings.themeMode = btn.dataset.theme;
            Storage.setSettings(this.state.settings);
            this.applyTheme();
        });
        document.querySelectorAll('.font-btn').forEach(btn => btn.onclick = () => {
            this.state.settings.fontMode = btn.dataset.font;
            Storage.setSettings(this.state.settings);
            this.applyFontMode();
        });
        el('#newDeckBtn').onclick = () => this.openDeckModal();
        el('#refreshDecksBtn').onclick = () => this.manualSync();
        el('#closeDeckModal').onclick = () => this.closeDeckModal();
        el('#saveDeckBtn').onclick = () => this.saveDeckFromModal();
        el('#saveDeckTopBtn')?.addEventListener('click', () => this.saveDeckFromModal());
        el('#archiveDeckBtn').onclick = () => this.archiveDeckFromModal();
        el('#deckAlgoInput').onchange = (e) => {
            const isFsrs = e.target.value === 'FSRS';
            el('#fsrsParamsField')?.classList.toggle('hidden', !isFsrs);
        };
        el('#newCardBtn').onclick = () => this.openCardModal();
        el('#resetAlgorithmBtn').onclick = () => this.openResetAlgorithmModal();
        el('#cancelResetAlgorithm').onclick = () => this.closeModal('resetAlgorithmModal');
        el('#confirmResetAlgorithm').onclick = () => this.confirmResetAlgorithm();
        el('#resetAlgorithmModal').addEventListener('click', (e) => { if (e.target === el('#resetAlgorithmModal')) this.closeModal('resetAlgorithmModal'); });
        el('#closeCardModal').onclick = () => this.closeCardModal();
        el('#saveCardBtn').onclick = () => this.saveCardFromModal();
        el('#saveCardTopBtn')?.addEventListener('click', () => this.saveCardFromModal());
        el('#cardTypeInput').onchange = () => this.updateCardBackVisibility();
        el('#deleteCardBtn').onclick = () => this.deleteCardFromModal();
        const cardSelectionMode = el('#cardSelectionMode');
        const noScheduleRow = el('#noScheduleRow');
        const noScheduleChk = el('#noScheduleChanges');
        const toggleNoScheduleUI = () => {
            const isAll = cardSelectionMode.value === 'all';
            const isCram = cardSelectionMode.value === 'cram';
            if (noScheduleRow) {
                noScheduleRow.classList.toggle('hidden', !(isAll || isCram));
                if (noScheduleChk) {
                    if (isCram) {
                        noScheduleChk.checked = true;
                        noScheduleChk.disabled = true;
                    } else {
                        noScheduleChk.disabled = false;
                        noScheduleChk.checked = isAll;
                    }
                }
            }
            this.updateActiveFiltersCount();
        };
        if (cardSelectionMode) {
            cardSelectionMode.onchange = toggleNoScheduleUI;
            toggleNoScheduleUI();
        }
        if (noScheduleChk) {
            noScheduleChk.onchange = () => this.updateActiveFiltersCount();
        }
        const filtersBannerBtn = el('#studyFiltersBannerBtn');
        if (filtersBannerBtn) {
            filtersBannerBtn.onclick = () => {
                this.setFiltersPanelOpen(true);
                const content = el('#filtersContent');
                if (content && content.scrollIntoView) {
                    content.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            };
        }
        el('#revealBtn').onclick = () => this.reveal();
        el('#skipCard').onclick = () => this.nextCard();
        el('#copyCardContent').onclick = () => this.copyCardContent();
        el('#addNoteBlock').onclick = () => this.openAddBlockModal();
        el('#closeAddBlockModal').onclick = () => this.closeModal('addBlockModal');
        el('#cancelAddBlockBtn').onclick = () => this.closeModal('addBlockModal');
        el('#saveAddBlockBtn').onclick = () => this.saveBlockNote();
        el('#blockNoteArea')?.addEventListener('input', () => this.renderBlockNotePreview());
        el('#addBlockModal').addEventListener('click', (e) => { if (e.target === el('#addBlockModal')) this.closeModal('addBlockModal'); });
        // Session control buttons
        el('#startSessionBtn').onclick = () => this.startSession();
        el('#abandonSessionBtn').onclick = () => this.abandonSession();
        document.querySelectorAll('.rate-btn').forEach(btn => btn.onclick = (e) => this.rate(e.currentTarget.dataset.rate));
        const tagInput = el('#cardTagSearch');
        const tagDropdown = el('#cardTagDropdown');
        if (tagInput) {
            tagInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addTagByName(tagInput.value.trim(), { toSelection: true });
                    tagInput.value = '';
                    this.renderCardTagSelectors();
                }
            });
            tagInput.addEventListener('input', () => {
                if (tagDropdown) tagDropdown.classList.remove('hidden');
                this.renderCardTagSelectors();
            });
            tagInput.addEventListener('focus', () => {
                if (tagDropdown) tagDropdown.classList.remove('hidden');
                this.renderCardTagSelectors();
            });
            tagInput.addEventListener('blur', () => {
                setTimeout(() => {
                    if (tagDropdown && !tagDropdown.matches(':hover')) tagDropdown.classList.add('hidden');
                }, 150);
            });
        }
        if (tagDropdown) {
            tagDropdown.onmouseenter = () => tagDropdown.classList.remove('hidden');
            tagDropdown.onmouseleave = () => tagDropdown.classList.add('hidden');
        }
        const refreshTagsBtn = el('#refreshTagOptionsBtn');
        if (refreshTagsBtn) refreshTagsBtn.onclick = () => this.refreshTagOptions();
        el('#openShortcuts')?.addEventListener('click', () => this.openModal('shortcutsModal'));
        el('#openShortcutsMobile')?.addEventListener('click', () => this.openModal('shortcutsModal'));
        el('#closeShortcutsModal')?.addEventListener('click', () => this.closeModal('shortcutsModal'));
        el('#shortcutsModal')?.addEventListener('click', (e) => {
            if (e.target === el('#shortcutsModal')) this.closeModal('shortcutsModal');
        });
        const markBtn = el('#markCardBtn');
        if (markBtn) markBtn.onclick = () => this.toggleMarkForSelected();
        const flagBtn = el('#flagCardBtn');
        if (flagBtn) flagBtn.onclick = (e) => this.openFlagPicker(e.currentTarget);
        const analyticsDeckBtn = el('#analyticsDeckBtn');
        const analyticsDeckMenu = el('#analyticsDeckMenu');
        const analyticsFilterBtn = el('#analyticsFilterBtn');
        const analyticsFilterMenu = el('#analyticsFilterMenu');
        const rangeBtn = el('#analyticsRangeBtn');
        const rangeMenu = el('#analyticsRangeMenu');
        const yearMenu = el('#analyticsYearMenu');
        const closeAnalyticsMenus = () => {
            if (analyticsDeckMenu) analyticsDeckMenu.classList.add('hidden');
            if (analyticsFilterMenu) analyticsFilterMenu.classList.add('hidden');
            if (rangeMenu) rangeMenu.classList.add('hidden');
            if (yearMenu) yearMenu.classList.remove('is-open');
        };
        if (analyticsDeckBtn && analyticsDeckMenu) {
            analyticsDeckBtn.onclick = (e) => {
                e.stopPropagation();
                const willOpen = analyticsDeckMenu.classList.contains('hidden');
                closeAnalyticsMenus();
                analyticsDeckMenu.classList.toggle('hidden', !willOpen);
            };
        }
        if (analyticsFilterBtn && analyticsFilterMenu) {
            analyticsFilterBtn.onclick = (e) => {
                e.stopPropagation();
                const willOpen = analyticsFilterMenu.classList.contains('hidden');
                closeAnalyticsMenus();
                analyticsFilterMenu.classList.toggle('hidden', !willOpen);
            };
        }
        const heatmapMetricReviews = el('#heatmapMetricReviews');
        const heatmapMetricRating = el('#heatmapMetricRating');
        if (heatmapMetricReviews) {
            heatmapMetricReviews.onclick = () => {
                this.state.analyticsHeatmapMetric = 'count';
                this.renderAnalytics();
            };
        }
        if (heatmapMetricRating) {
            heatmapMetricRating.onclick = () => {
                this.state.analyticsHeatmapMetric = 'rating';
                this.renderAnalytics();
            };
        }
        const heatmapDownloadBtn = el('#heatmapDownloadBtn');
        if (heatmapDownloadBtn) {
            heatmapDownloadBtn.onclick = () => this.downloadHeatmapPng();
        }
        if (rangeBtn && rangeMenu) {
            rangeBtn.onclick = (e) => {
                e.stopPropagation();
                const willOpen = rangeMenu.classList.contains('hidden');
                closeAnalyticsMenus();
                rangeMenu.classList.toggle('hidden', !willOpen);
            };
            rangeMenu.onclick = (e) => {
                const btn = e.target.closest('[data-range]');
                if (!btn) return;
                const range = btn.dataset.range || '';
                if (range === 'by-year') {
                    if (yearMenu) yearMenu.classList.toggle('is-open');
                    return;
                }
                this.state.analyticsRange = range || 'this-year';
                if (range !== 'year') this.state.analyticsYear = 'all';
                rangeMenu.classList.add('hidden');
                if (yearMenu) yearMenu.classList.remove('is-open');
                this.renderAnalytics();
            };
        }
        document.addEventListener('click', (e) => {
            const inDeck = analyticsDeckBtn?.contains(e.target) || analyticsDeckMenu?.contains(e.target);
            const inFilter = analyticsFilterBtn?.contains(e.target) || analyticsFilterMenu?.contains(e.target);
            const inRange = rangeBtn?.contains(e.target) || rangeMenu?.contains(e.target);
            if (inDeck || inFilter || inRange) return;
            closeAnalyticsMenus();
        });
        document.querySelectorAll('.analytics-reset-btn').forEach(btn => {
            btn.onclick = () => {
                this.state.analyticsDecks = [];
                this.state.analyticsRange = 'this-year';
                this.state.analyticsYear = 'all';
                this.state.analyticsTags = [];
                this.state.analyticsFlags = [];
                this.state.analyticsMarked = false;
                this.state.analyticsIncludeSuspended = true;
                this.persistFilterPrefs();
                this.renderAnalytics();
                closeAnalyticsMenus();
            };
        });
        const analyticsIncludeSuspended = el('#analyticsIncludeSuspended');
        if (analyticsIncludeSuspended) {
            analyticsIncludeSuspended.onchange = (e) => {
                this.state.analyticsIncludeSuspended = e.target.checked;
                this.persistFilterPrefs();
                this.renderAnalytics();
            };
        }
        const debouncedCardSearch = debounce((val) => {
            this.state.cardSearch = val;
            this.state.cardLimit = 50;
            this.renderCards();
            this.persistUiStateDebounced();
        }, 150);
        const debouncedDeckSearch = debounce((val) => {
            this.state.deckSearch = val;
            this.renderDecks();
            this.persistUiStateDebounced();
        }, 150);
        el('#cardSearchInput').oninput = (e) => debouncedCardSearch(e.target.value);
        el('#libraryDeckSearch').oninput = (e) => debouncedDeckSearch(e.target.value);
        el('#filterAgain').onchange = (e) => { this.state.filters.again = e.target.checked; this.renderCards(); this.updateActiveFiltersCount(); };
        el('#filterHard').onchange = (e) => { this.state.filters.hard = e.target.checked; this.renderCards(); this.updateActiveFiltersCount(); };
        el('#filterAddedToday').onchange = (e) => { this.state.filters.addedToday = e.target.checked; this.renderCards(); this.updateActiveFiltersCount(); };
        // Tag filter handled via renderTagFilter()
        el('#resetFilters').onclick = () => this.resetFilters();
        const resetAll = el('#resetFiltersAll');
        if (resetAll) resetAll.onclick = () => this.resetFilters();
        const filterTagInput = el('#filterTagSearch');
        const filterTagDropdown = el('#filterTagDropdown');
        if (filterTagInput) {
            const debouncedTagFilter = debounce(() => this.renderTagFilter(), 100);
            filterTagInput.addEventListener('input', () => {
                if (filterTagDropdown) filterTagDropdown.classList.remove('hidden');
                debouncedTagFilter();
            });
            filterTagInput.addEventListener('focus', () => {
                if (filterTagDropdown) filterTagDropdown.classList.remove('hidden');
                this.renderTagFilter();
            });
            filterTagInput.addEventListener('blur', () => {
                setTimeout(() => {
                    if (filterTagDropdown && !filterTagDropdown.matches(':hover')) filterTagDropdown.classList.add('hidden');
                }, 150);
            });
        }
        if (filterTagDropdown) {
            filterTagDropdown.onmouseenter = () => filterTagDropdown.classList.remove('hidden');
            filterTagDropdown.onmouseleave = () => filterTagDropdown.classList.add('hidden');
        }
        el('#filterSuspended').onchange = (e) => {
            this.state.filters.suspended = e.target.checked;
            this.persistFilterPrefs();
            this.renderCards();
            this.updateActiveFiltersCount();
        };
        el('#filterLeech').onchange = (e) => {
            this.state.filters.leech = e.target.checked;
            this.persistFilterPrefs();
            this.renderCards();
            this.updateActiveFiltersCount();
        };
        el('#filterMarked').onchange = (e) => { this.state.filters.marked = e.target.checked; this.renderCards(); this.updateActiveFiltersCount(); };
        const filterFlagSwatches = el('#filterFlagSwatches');
        if (filterFlagSwatches) {
            this.state.filters = normalizeFilterState(this.state.filters);
            this.updateFlagSwatchTriState(filterFlagSwatches);
            filterFlagSwatches.onclick = (e) => {
                const btn = e.target.closest('[data-flag]');
                if (!btn) return;
                const flag = btn.dataset.flag || '';
                if (flag === FILTER_NONE_LABEL) {
                    this.state.filters.flagEmptyMode = cycleFilterMode(this.state.filters.flagEmptyMode);
                } else {
                    const current = getListMode(this.state.filters.flag, this.state.filters.flagExclude, flag);
                    const next = cycleFilterMode(current);
                    const updated = applyListMode(this.state.filters.flag, this.state.filters.flagExclude, flag, next);
                    this.state.filters.flag = updated.include;
                    this.state.filters.flagExclude = updated.exclude;
                }
                this.state.filters = normalizeFilterState(this.state.filters);
                this.updateFlagSwatchTriState(filterFlagSwatches);
                this.renderCards();
                this.renderStudyDeckSelection();
                this.renderStudy();
                this.updateActiveFiltersCount();
            };
        }
        const filterFlagClear = el('#filterFlagClear');
        if (filterFlagClear) {
            filterFlagClear.onclick = () => {
                this.state.filters.flag = [];
                this.state.filters.flagExclude = [];
                this.state.filters.flagEmptyMode = FILTER_MODE_IGNORE;
                this.state.filters = normalizeFilterState(this.state.filters);
                if (filterFlagSwatches) this.updateFlagSwatchTriState(filterFlagSwatches);
                this.renderCards();
                this.renderStudyDeckSelection();
                this.renderStudy();
                this.updateActiveFiltersCount();
            };
        }
        const filterDeckClear = el('#filterDeckClear');
        if (filterDeckClear) {
            filterDeckClear.onclick = () => {
                this.state.filters.studyDecks = [];
                this.state.filters.studyDecksExclude = [];
                this.state.filters = normalizeFilterState(this.state.filters);
                this.state.studyNonDue = false;
                const deckInput = el('#deckSearchInput');
                if (deckInput) deckInput.value = '';
                this.renderStudyDeckSelection();
                this.renderStudy();
                this.updateActiveFiltersCount();
            };
        }
        const filterTagClear = el('#filterTagClear');
        if (filterTagClear) {
            filterTagClear.onclick = () => {
                this.state.filters.tags = [];
                this.state.filters.tagsExclude = [];
                this.state.filters.tagEmptyMode = FILTER_MODE_IGNORE;
                this.state.filters = normalizeFilterState(this.state.filters);
                this.renderTagFilter();
                this.renderCards();
                this.renderStudyDeckSelection();
                this.renderStudy();
                this.updateActiveFiltersCount();
                this.persistUiStateDebounced();
            };
        }
        const unsuspendAllBtn = el('#unsuspendAllBtn');
        if (unsuspendAllBtn) unsuspendAllBtn.onclick = () => this.unsuspendAllSelectedDeck();
        // Toggle filters panel
        el('#toggleFilters').onclick = () => this.toggleFiltersPanel();
        el('#ankiImportInput').onchange = (e) => this.handleAnkiImport(e.target.files[0]);
        el('#exportAnkiBtn').onclick = () => this.exportAnki();
        // Mobile menu toggle and duplicate handlers
        el('#mobileMoreBtn').onclick = () => {
            const menu = el('#mobileMoreMenu');
            menu.classList.toggle('hidden');
            menu.classList.toggle('flex');
        };
        // Show mobile menu by default on small screens (avoid hidden-only controls)
        const mobileMenu = el('#mobileMoreMenu');
        if (mobileMenu && window.innerWidth < 640) {
            mobileMenu.classList.remove('hidden');
            mobileMenu.classList.add('flex');
        }
        const exportMobile = el('#exportAnkiBtnMobile');
        if (exportMobile) exportMobile.onclick = () => this.exportAnki();
        const importMobile = el('#ankiImportInputMobile');
        if (importMobile) importMobile.onchange = (e) => this.handleAnkiImport(e.target.files[0]);
        this.initMobileFab();
        this.bindDeckSearch();
        this.applyFilterPrefsToUi();
        // Keyboard shortcuts for study
        // Use capture to ensure we can intercept combo hotkeys even when textarea is focused.
        document.addEventListener('keydown', (e) => {
            if ((e.key === '?' || (e.shiftKey && e.key === '/')) && !isTypingTarget(e.target)) {
                e.preventDefault();
                this.openModal('shortcutsModal');
                return;
            }
            // Undo shortcut (Ctrl+Z or Cmd+Z) - works globally during study
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && this.state.lastRating) {
                e.preventDefault();
                this.undoLastRating();
                return;
            }
            // Stop session via Ctrl/Cmd+. (works even when focused in textarea)
            if ((e.ctrlKey || e.metaKey) && e.key === '.' && this.state.session) {
                e.preventDefault();
                e.stopImmediatePropagation();
                this.abandonSession();
                return;
            }
            // Start session via Cmd/Ctrl+Enter (desktop)
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !this.state.session && this.state.activeTab === 'study') {
                if (isTypingTarget(e.target)) return;
                e.preventDefault();
                this.startSession();
                return;
            }
            if (!this.state.session) return;

            const isAiMode = this.isAiModeUsable();
            const isGhostInkMode = this.isTypeInModeSelected();
            const aiAnswer = el('#aiAnswer');
            const hasAiText = (aiAnswer?.value || '').trim().length > 0;
            const ghostinkAnswer = el('#ghostinkAnswer');
            const hasGhostInkText = (ghostinkAnswer?.value || '').trim().length > 0;
            // Option/Alt+Shift+S can produce a different printable character on macOS, so prefer physical key detection.
            const isSkipCombo = !!(e.altKey && e.shiftKey && (
                (e.code === 'KeyS') ||
                ((e.key || '').toLowerCase() === 's') ||
                e.keyCode === 83 ||
                e.which === 83
            ));

            if (isSkipCombo) {
                e.preventDefault();
                e.stopImmediatePropagation();
                this.nextCard();
                return;
            }

            // Global send in AI mode (Cmd/Ctrl+Enter) even inside textarea
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                if (isAiMode && hasAiText && !this.state.aiLocked) {
                    e.preventDefault();
                    this.submitToAI();
                    return;
                }
                if (isGhostInkMode && hasGhostInkText && !this.state.answerRevealed) {
                    e.preventDefault();
                    this.submitGhostInkAnswer();
                    return;
                }
                // In Reveal mode, allow reveal via Cmd/Ctrl+Enter
                if (!this.isAiModeSelected() && !isGhostInkMode && !this.state.answerRevealed) {
                    e.preventDefault();
                    this.reveal();
                    return;
                }
            }

            // Mic toggle via Cmd/Ctrl+E even when focused in textarea
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e' && isAiMode && this.isSttEnabled() && !this.state.answerRevealed && !this.state.aiLocked) {
                e.preventDefault();
                this.toggleMicRecording();
                return;
            }

            if (e.key === 'Escape' && this.isMicActive()) {
                e.preventDefault();
                this.stopMicActivity(false);
            }

            if (isTypingTarget(e.target) && e.key !== 'Escape') return;

            // Space key logic
            if (e.key === ' ' && !this.state.answerRevealed) {
                e.preventDefault();
                if (this.isAiModeUsable()) {
                    const btn = el('#aiSubmit');
                    // If text area has content (button enabled), Send. Otherwise do nothing.
                    if (!btn.disabled && !this.state.aiLocked) this.submitToAI();
                } else if (this.isTypeInModeSelected()) {
                    const btn = el('#ghostinkCheck');
                    if (btn && !btn.disabled) this.submitGhostInkAnswer();
                } else {
                    this.reveal();
                }
            }

            // Toggle Mic with Alt/Option+M in AI mode
            if (e.altKey && e.key.toLowerCase() === 'm' && this.isAiModeUsable() && this.isSttEnabled() && !this.state.answerRevealed && !this.state.aiLocked) {
                e.preventDefault();
                this.toggleMicRecording();
            }
            if (this.state.answerRevealed) {
                const ratings = { '1': 'Again', '2': 'Hard', '3': 'Good', '4': 'Easy' };
                if (ratings[e.key]) this.rate(ratings[e.key]);
            }
            if (e.key.toLowerCase() === 's') this.nextCard();
            if (e.key.toLowerCase() === 'm') this.toggleMarkForSelected();
            if (e.key.toLowerCase() === 'f') {
                if (e.shiftKey) {
                    this.setFlagForSelected('');
                } else {
                    const order = this.getFlagOrder();
                    const card = this.state.selectedCard;
                    if (!card) return;
                    const idx = Math.max(0, order.indexOf(card.flag || ''));
                    const next = order[(idx + 1) % order.length];
                    this.setFlagForSelected(next);
                }
            }
        }, true);
        document.addEventListener('click', (e) => {
            const clozeToggle = e.target.closest('.cloze-parent-toggle');
            if (clozeToggle) {
                e.stopPropagation();
                const parentId = clozeToggle.dataset.parentId;
                if (parentId) this.toggleClozeParent(parentId);
                return;
            }
            // Handle edit deck button click
            const editDeckBtn = e.target.closest('.edit-deck-btn');
            if (editDeckBtn) {
                e.stopPropagation();
                const deckId = editDeckBtn.dataset.deckId;
                this.editDeck(deckId);
                return;
            }
            // Handle deck selection (click on deck card)
            const deckCard = e.target.closest('[data-deck-id]');
            if (deckCard && !e.target.closest('.edit-card-btn') && !e.target.closest('.info-card-btn') && !e.target.closest('.edit-deck-btn') && !e.target.closest('.deck-option') && !e.target.closest('.selected-deck-pill')) {
                this.selectDeck(deckCard.dataset.deckId);
                return;
            }
            // Handle edit card button click
            const editCardBtn = e.target.closest('.edit-card-btn');
            if (editCardBtn) {
                e.stopPropagation();
                const cardId = editCardBtn.dataset.cardId;
                this.editCard(cardId);
                return;
            }
            // Handle info card button click (show review history popover)
            const infoCardBtn = e.target.closest('.info-card-btn');
            if (infoCardBtn) {
                e.stopPropagation();
                const cardId = infoCardBtn.dataset.cardId;
                this.showReviewHistoryPopover(infoCardBtn, cardId);
                return;
            }
        });
        el('#openSettings').onclick = () => this.openSettings();
        el('#closeSettings').onclick = () => this.closeSettings();
        el('#saveSettings').onclick = () => this.saveSettings();
        el('#verifyWorker').onclick = () => this.verifyWorker();
        el('#verifyAuth').onclick = () => this.verifyAuth();
        el('#oauthBtn').onclick = () => { if (this.state.settings.workerUrl) this.startOAuth(); else toast('Add worker URL first'); };
        el('#scanSources').onclick = () => this.scanSources();
        el('#saveSourcesChoice').onclick = () => {
            this.state.settings.deckSource = el('#deckSourceSelect').value;
            this.state.settings.cardSource = el('#cardSourceSelect').value;
            this.state.sourcesVerified = !!(this.state.settings.deckSource && this.state.settings.cardSource);
            this.state.settings.sourcesVerified = this.state.sourcesVerified;
            this.state.settings.sourcesSaved = true;
            Storage.setSettings(this.state.settings);
            this.renderStatus();
            toast('Sources choice saved. Syncing...');
            this.syncNow();
        };
        // Mobile FAB position picker (grid-based)
        this.bindFabPositionPicker();
        el('#openWorkerHelp').onclick = () => this.openModal('workerHelpModal');
        el('#closeWorkerHelp').onclick = () => this.closeModal('workerHelpModal');
        el('#copyWorkerCode').onclick = () => this.copyWorkerCode();
        el('#lockedOpenSettings').onclick = () => this.openSettings();
        el('#resetApp').onclick = () => this.openModal('resetConfirmModal');
        el('#cancelReset').onclick = () => this.closeModal('resetConfirmModal');
        el('#confirmReset').onclick = () => this.resetApp();
        el('#toggleDangerZone').onclick = () => this.toggleDangerZone();
        el('#resetConfirmModal').addEventListener('click', (e) => { if (e.target === el('#resetConfirmModal')) this.closeModal('resetConfirmModal'); });
        this.updateSettingsButtons();
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { this.closeSettings(); this.closeModal('workerHelpModal'); this.closeDeckModal(); this.closeCardModal(); this.closeConfirmModal(false); this.closeModal('aiSettingsRequiredModal'); this.closeModal('notesModal'); this.closeModal('addBlockModal'); this.closeModal('shortcutsModal'); } });
        el('#settingsModal').addEventListener('click', (e) => { if (e.target === el('#settingsModal')) this.closeSettings(); });
        el('#workerHelpModal').addEventListener('click', (e) => { if (e.target === el('#workerHelpModal')) this.closeModal('workerHelpModal'); });
        el('#revisionMode').onchange = (e) => {
            const nextMode = normalizeRevisionMode(e.target.value);
            if (nextMode !== e.target.value) e.target.value = nextMode;
            if (nextMode === REVISION_MODE_AI) {
                if (!navigator.onLine) {
                    e.target.value = REVISION_MODE_MANUAL;
                    this.showAiBlockedModal('offline');
                    return;
                }
                if (!this.state.settings.aiVerified) {
                    e.target.value = REVISION_MODE_MANUAL;
                    this.showAiBlockedModal('unverified');
                    return;
                }
                if (!this.state.settings.aiKey) {
                    e.target.value = REVISION_MODE_MANUAL;
                    this.showAiBlockedModal('unverified');
                    return;
                }
            }
            const on = this.isAiModeUsable();
            el('#aiControls').classList.toggle('hidden', !on);
            el('#ghostinkControls').classList.toggle('hidden', !this.isTypeInModeSelected());
            this.updateSkipHotkeyLabel(on);
            this.updateGhostInkControlsState();
            this.updateMobileFab();
            this.renderStudy();
        };
        el('#closeAiSettingsModal').onclick = () => this.closeModal('aiSettingsRequiredModal');
        el('#openSettingsFromAiModal').onclick = () => { this.closeModal('aiSettingsRequiredModal'); this.openSettings(); };
        el('#aiSettingsRequiredModal').addEventListener('click', (e) => { if (e.target === el('#aiSettingsRequiredModal')) this.closeModal('aiSettingsRequiredModal'); });
        // Notes modal bindings
        el('#editNotesBtn').onclick = () => this.openNotesModal();
        el('#closeNotesModal').onclick = () => this.closeModal('notesModal');
        el('#cancelNotesBtn').onclick = () => this.closeModal('notesModal');
        el('#saveNotesBtn').onclick = () => this.saveNotes();
        el('#notesModal').addEventListener('click', (e) => { if (e.target === el('#notesModal')) this.closeModal('notesModal'); });
        el('#verifyAi').onclick = () => this.verifyAiSettings();
        el('#verifyDyContextAi').onclick = () => this.verifyDyContextSettings();
        el('#verifyStt').onclick = () => this.verifySttSettings();
        el('#aiSubmit').onclick = () => this.submitToAI();
        el('#aiAnswer').oninput = (e) => {
            const btn = el('#aiSubmit');
            const hasText = e.target.value.trim().length > 0;
            btn.dataset.empty = hasText ? '0' : '1';
            this.setAiControlsLocked(this.state.aiLocked);
        };
        el('#ghostinkCheck').onclick = () => this.submitGhostInkAnswer();
        el('#ghostinkAnswer').oninput = () => this.updateGhostInkControlsState();
        el('#aiRecord').onclick = () => {
            if (!this.isAiModeUsable() || !this.isSttEnabled() || this.state.answerRevealed || this.state.aiLocked) return;
            this.state.activeMicButton = 'inline';
            this.toggleMicRecording();
        };
        const fabMic = el('#fabMic');
        const fabSend = el('#fabSend');
        if (fabMic) fabMic.onclick = () => {
            if (!this.isAiModeUsable() || !this.isSttEnabled() || this.state.answerRevealed || this.state.aiLocked) return;
            this.state.activeMicButton = 'fab';
            this.toggleMicRecording();
        };
        if (fabSend) fabSend.onclick = () => { if (!this.state.aiLocked) this.submitToAI(); };
        el('#confirmDelete').onclick = () => this.closeConfirmModal(true);
        el('#cancelDelete').onclick = () => this.closeConfirmModal(false);
        el('#confirmModal').addEventListener('click', (e) => { if (e.target === el('#confirmModal')) this.closeConfirmModal(false); });
        el('#deckModal').addEventListener('click', (e) => { if (e.target === el('#deckModal')) this.closeDeckModal(); });
        el('#cardModal').addEventListener('click', (e) => { if (e.target === el('#cardModal')) this.closeCardModal(); });
    },
    renderAll() {
        this.state.filters = normalizeFilterState(this.state.filters);
        this.renderDecks();
        this.renderCards();
        this.renderConnection();
        this.renderStudy();
        this.renderStudyDeckSelection();
        this.renderTagFilter();
        this.updateCounts();
        this.populateSourceSelects();
        this.renderGate();
        this.renderStatus();
        this.renderSelectedDeckBar();
        this.updateActiveFiltersCount();
        createIconsInScope(document.body);
        this.loadAISettings();
        const cardSearchInput = el('#cardSearchInput');
        if (cardSearchInput) cardSearchInput.value = this.state.cardSearch || '';
        const deckSearchInput = el('#libraryDeckSearch');
        if (deckSearchInput) deckSearchInput.value = this.state.deckSearch || '';
        const filterAgain = el('#filterAgain');
        if (filterAgain) filterAgain.checked = !!this.state.filters.again;
        const filterHard = el('#filterHard');
        if (filterHard) filterHard.checked = !!this.state.filters.hard;
        const filterAddedToday = el('#filterAddedToday');
        if (filterAddedToday) filterAddedToday.checked = !!this.state.filters.addedToday;
        const filterMarked = el('#filterMarked');
        if (filterMarked) filterMarked.checked = !!this.state.filters.marked;
        const filterSuspended = el('#filterSuspended');
        if (filterSuspended) filterSuspended.checked = !!this.state.filters.suspended;
        const filterLeech = el('#filterLeech');
        if (filterLeech) filterLeech.checked = !!this.state.filters.leech;
        const filterFlagSwatches = el('#filterFlagSwatches');
        if (filterFlagSwatches) this.updateFlagSwatchTriState(filterFlagSwatches);
        // Show/hide STT settings based on whether AI is verified
        const isAiVerified = this.state.settings?.aiVerified;
        el('#sttSettings')?.classList.toggle('hidden', !isAiVerified);
        // Update hotkey labels based on platform
        const sendHotkey = el('#aiSendHotkey');
        const ctrlSymbol = isMac ? '⌘' : '⌃';
        const enterSymbol = '↵';
        if (sendHotkey) sendHotkey.textContent = `${ctrlSymbol} ${enterSymbol}`;
        const micHotkey = el('#micHotkey');
        if (micHotkey) micHotkey.textContent = `${ctrlSymbol} E`;
        const startHotkey = el('#startSessionHotkey');
        if (startHotkey) startHotkey.textContent = `${ctrlSymbol} ${enterSymbol}`;
        const stopHotkey = el('#stopSessionHotkey');
        if (stopHotkey) stopHotkey.textContent = `${ctrlSymbol} .`;
        const shortcutsStart = el('#shortcutsStartSession');
        if (shortcutsStart) shortcutsStart.textContent = `${ctrlSymbol} ${enterSymbol}`;
        const shortcutsStop = el('#shortcutsStopSession');
        if (shortcutsStop) shortcutsStop.textContent = `${ctrlSymbol} .`;
        const shortcutsUndo = el('#shortcutsUndo');
        if (shortcutsUndo) shortcutsUndo.textContent = `${ctrlSymbol} Z`;
        const shortcutsSend = el('#shortcutsSend');
        if (shortcutsSend) shortcutsSend.textContent = `${ctrlSymbol} ${enterSymbol}`;
        const shortcutsMic = el('#shortcutsMic');
        if (shortcutsMic) shortcutsMic.textContent = `${ctrlSymbol} E`;
        this.switchTab(this.state.activeTab || 'study', { silent: true, skipPersist: true });
    },
    // Tab switching
    switchTab(tab, opts = {}) {
        const { silent = false, skipPersist = false } = opts || {};
        if (this.state.optimizing?.active) {
            if (!silent) toast('Optimization in progress — please wait');
            return;
        }
        // Block library access during active study session
        if (tab === 'library' && this.state.session) {
            if (!silent) toast('Please stop your study session first to access the library');
            return;
        }
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        const tabEl = el(`#${tab}Tab`);
        if (tabEl) tabEl.classList.remove('hidden');
        const btnEl = el(`[data-tab="${tab}"]`);
        if (btnEl) btnEl.classList.add('active');
        this.state.activeTab = tab;
        if (!skipPersist) this.persistUiStateDebounced();
        if (tab === 'analytics') this.renderAnalytics();
        if (tab === 'study') this.updateFiltersBanner();
        if (tabEl) createIconsInScope(tabEl);
    },
    // Toggle filters panel
    setFiltersPanelOpen(open) {
        const content = el('#filtersContent');
        const chevron = el('#filtersChevron');
        const text = el('#moreOptionsText');
        if (!content) return;
        const isHidden = content.classList.contains('hidden');
        if (open && isHidden) {
            content.classList.remove('hidden');
            if (chevron) chevron.style.transform = 'rotate(180deg)';
            if (text) text.textContent = 'Less options';
        } else if (!open && !isHidden) {
            content.classList.add('hidden');
            if (chevron) chevron.style.transform = '';
            if (text) text.textContent = 'More options';
        }
    },
    toggleFiltersPanel() {
        const content = el('#filtersContent');
        const isHidden = content && content.classList.contains('hidden');
        this.setFiltersPanelOpen(!!isHidden);
    },
    shouldKeepFiltersPanelOpen() {
        const f = normalizeFilterState(this.state.filters);
        if (f.again || f.hard || f.addedToday) return true;
        if (f.tags.length > 0 || f.tagsExclude.length > 0 || f.tagEmptyMode !== FILTER_MODE_IGNORE) return true;
        if (f.marked) return true;
        if (f.flag.length > 0 || f.flagExclude.length > 0 || f.flagEmptyMode !== FILTER_MODE_IGNORE) return true;
        if (f.studyDecks.length > 0 || f.studyDecksExclude.length > 0) return true;
        const mode = el('#cardSelectionMode')?.value || 'due';
        if (mode !== 'due') return true;
        return false;
    },
    updateFiltersBanner() {
        const banner = el('#studyFiltersBanner');
        if (!banner) return;
        const btn = el('#studyFiltersBannerBtn');
        const active = this.shouldKeepFiltersPanelOpen();
        const text = el('#studyFiltersBannerText');
        if (text) {
            text.textContent = active
                ? 'Study filters are active.'
                : 'No filters are applied.';
        }
        if (btn) btn.classList.toggle('hidden', !active);
        banner.classList.toggle('study-filters-banner--inactive', !active);
        banner.setAttribute('aria-hidden', 'false');
    },
    // Update active filters count (for reset button visibility)
    updateActiveFiltersCount() {
        const f = normalizeFilterState(this.state.filters);
        this.state.filters = f;
        let count = 0;
        if (f.again) count++;
        if (f.hard) count++;
        if (f.addedToday) count++;
        const hasTagFilters = f.tags.length > 0 || f.tagsExclude.length > 0 || f.tagEmptyMode !== FILTER_MODE_IGNORE;
        if (hasTagFilters) count++;
        if (f.marked) count++;
        const hasFlags = f.flag.length > 0 || f.flagExclude.length > 0 || f.flagEmptyMode !== FILTER_MODE_IGNORE;
        if (hasFlags) count++;
        const hasDeckFilters = f.studyDecks.length > 0 || f.studyDecksExclude.length > 0;
        if (hasDeckFilters) count++;
        // Show reset button if any filters are active
        const resetBtn = el('#resetFilters');
        if (resetBtn) {
            resetBtn.classList.toggle('hidden', count === 0);
        }
        const resetAll = el('#resetFiltersAll');
        if (resetAll) {
            resetAll.classList.toggle('hidden', count === 0);
        }
        const flagClear = el('#filterFlagClear');
        if (flagClear) {
            flagClear.classList.toggle('hidden', !hasFlags);
        }
        const deckClear = el('#filterDeckClear');
        if (deckClear) {
            deckClear.classList.toggle('hidden', !hasDeckFilters);
        }
        const tagClear = el('#filterTagClear');
        if (tagClear) {
            tagClear.classList.toggle('hidden', !hasTagFilters);
        }
        this.updateFiltersBanner();
        this.persistUiStateDebounced();
    },
    persistFilterPrefs() {
        const prefs = {
            library: {
                hideSuspended: !!this.state.filters.suspended,
                hideLeech: !!this.state.filters.leech
            },
            analytics: {
                includeSuspended: this.state.analyticsIncludeSuspended !== false,
                tags: Array.isArray(this.state.analyticsTags) ? this.state.analyticsTags : [],
                flags: Array.isArray(this.state.analyticsFlags) ? this.state.analyticsFlags : [],
                marked: !!this.state.analyticsMarked
            }
        };
        Storage.setMeta('filterPrefs', prefs).catch(e => console.debug('Storage setMeta filterPrefs failed:', e));
    },
    persistUiState() {
        const uiState = {
            activeTab: this.state.activeTab,
            selectedDeckId: this.state.selectedDeck?.id || null,
            filters: { ...this.state.filters },
            cardSearch: this.state.cardSearch || '',
            deckSearch: this.state.deckSearch || '',
            analyticsRange: this.state.analyticsRange,
            analyticsYear: this.state.analyticsYear,
            analyticsDecks: Array.isArray(this.state.analyticsDecks) ? this.state.analyticsDecks : [],
            analyticsHeatmapMetric: this.state.analyticsHeatmapMetric,
            analyticsIncludeSuspended: this.state.analyticsIncludeSuspended,
            analyticsTags: Array.isArray(this.state.analyticsTags) ? this.state.analyticsTags : [],
            analyticsFlags: Array.isArray(this.state.analyticsFlags) ? this.state.analyticsFlags : [],
            analyticsMarked: !!this.state.analyticsMarked
        };
        Storage.setMeta('uiState', uiState).catch(e => console.debug('Storage setMeta uiState failed:', e));
    },
    persistUiStateDebounced() {
        if (!this._debouncedPersistUiState) {
            this._debouncedPersistUiState = debounce(() => {
                this.persistUiState();
            }, 300);
        }
        this._debouncedPersistUiState();
    },
    applyFilterPrefsToUi() {
        const filterSuspended = el('#filterSuspended');
        const filterLeech = el('#filterLeech');
        if (filterSuspended) filterSuspended.checked = !!this.state.filters.suspended;
        if (filterLeech) filterLeech.checked = !!this.state.filters.leech;
        const analyticsIncludeSuspended = el('#analyticsIncludeSuspended');
        if (analyticsIncludeSuspended) analyticsIncludeSuspended.checked = this.state.analyticsIncludeSuspended !== false;
        const analyticsMarkedOnly = el('#analyticsMarkedOnly');
        if (analyticsMarkedOnly) analyticsMarkedOnly.checked = !!this.state.analyticsMarked;
    },
    // Render selected deck bar
    renderSelectedDeckBar() {
        const deck = this.state.selectedDeck;
        const nameEl = el('#selectedDeckName');
        const newCardBtn = el('#newCardBtn');
        const resetBtn = el('#resetAlgorithmBtn');
        const cardsContent = el('#cardsContent');
        const footer = el('#footerAttribution');
        if (deck) {
            if (nameEl) nameEl.textContent = deck.name;
            if (newCardBtn) newCardBtn.classList.remove('hidden');
            if (resetBtn) resetBtn.classList.remove('hidden');
            if (cardsContent) cardsContent.classList.remove('hidden');
            if (footer) footer.classList.remove('hidden');
        } else {
            if (nameEl) nameEl.textContent = 'Select a deck above';
            if (newCardBtn) newCardBtn.classList.add('hidden');
            if (resetBtn) resetBtn.classList.add('hidden');
            if (cardsContent) cardsContent.classList.add('hidden');
            if (footer) footer.classList.add('hidden');
        }
    },
    renderGate() {
        const ready = this.isReady();
        const tabBar = el('#tabBar');
        el('#mainContent').style.display = ready ? 'block' : 'none';
        el('#lockedOverlay').classList.toggle('hidden', ready);
        if (tabBar) tabBar.classList.toggle('hidden', !ready);
        const oauth = el('#oauthBtn');
        const verifyAuthBtn = el('#verifyAuth');
        const tokenInput = el('#settingAuthToken');
        if (oauth) oauth.disabled = !this.state.settings.workerUrl;
        if (verifyAuthBtn) verifyAuthBtn.disabled = !this.state.settings.workerUrl;
        if (tokenInput) tokenInput.disabled = !this.state.settings.workerUrl;
        this.updateSettingsButtons();
    },
    renderConnection() {
        const badge = el('#connectionBadge');
        const badgeText = el('#connectionBadgeText');
        const badgeIcon = el('#connectionBadgeIcon');
        const online = navigator.onLine;
        const hasWorkerUrl = !!this.state.settings.workerUrl;
        const workerOk = hasWorkerUrl && this.state.workerVerified;
        const hasToken = !!this.state.settings.authToken;
        const authOk = workerOk && hasToken && (this.state.authVerified || this.state.settings.authVerified);
        const ready = online && workerOk && authOk;

        const q2count = this.state.queue.size;
        const queueCountEl = el('#queueCount');
        if (queueCountEl) queueCountEl.textContent = String(q2count);
        const pendingSuffix = q2count > 0 ? ` <span class="text-accent" style="font-family: monospace;">(${q2count})</span>` : '';
        const q2ind = el('#q2syncIndicator');
        const q2val = el('#q2syncCount');
        if (q2ind && q2val) {
            q2val.textContent = String(q2count);
            q2ind.classList.toggle('hidden', q2count === 0);
        }

        // Tooltip/diagnostics for stuck queues (best-effort).
        const ageMs = this.state.queueLastChangedAt ? (Date.now() - new Date(this.state.queueLastChangedAt).getTime()) : 0;
        const staleMinutes = ageMs > 0 ? Math.floor(ageMs / 60000) : 0;
        const errorMsg = this.state.lastQueueError?.message || '';
        const errorAt = this.state.lastQueueError?.at ? new Date(this.state.lastQueueError.at).toLocaleString() : '';
        badge.removeAttribute('title');
        badge.dataset.tip = '';
        if (q2count > 0) {
            const parts = [];
            if (staleMinutes >= 2) parts.push(`Queue unchanged for ~${staleMinutes} min`);
            if (errorMsg) parts.push(`Last sync error${errorAt ? ` (${errorAt})` : ''}: ${errorMsg}`);
            if (parts.length) badge.dataset.tip = parts.join(' | ');
        }

        let text = '';
        let showIcon = false;

        if (!online) {
            text = `Offline${pendingSuffix}`;
        } else if (!hasWorkerUrl) {
            text = `Online · add worker URL${pendingSuffix}`;
        } else if (!workerOk) {
            text = `Online · verify worker${pendingSuffix}`;
        } else if (!hasToken) {
            text = `Online · set token${pendingSuffix}`;
        } else if (!authOk) {
            text = `Online · verify token${pendingSuffix}`;
        } else if (q2count > 0) {
            text = `Online${pendingSuffix}`;
        } else {
            text = 'Online';
            showIcon = true;
        }

        if (badgeText) badgeText.innerHTML = text;
        if (badgeIcon) badgeIcon.classList.toggle('hidden', !showIcon);

        badge.className = ready
            ? 'px-3 py-1 rounded-full pill text-xs bg-surface border border-card text-main'
            : 'px-3 py-1 rounded-full pill text-xs bg-surface-strong border border-card text-main';
        this.updateSyncButtonState();
    },
    renderConnectionDebounced() {
        if (!this._debouncedRenderConnection) {
            this._debouncedRenderConnection = debounce(() => this.renderConnection(), 500);
        }
        this._debouncedRenderConnection();
    },
    renderDecks() {
        const grid = el('#deckGrid');
        const theme = document.body.getAttribute('data-theme') || 'light';
        const selectedId = this.state.selectedDeck?.id;
        const searchQuery = (this.state.deckSearch || '').toLowerCase().trim();

        const deckStats = this.state.deckStats;

        let decks = this.state.decks;
        if (searchQuery) {
            decks = decks.filter(d => d.name.toLowerCase().includes(searchQuery));
        }
        if (decks.length === 0) {
            grid.innerHTML = `<p class="text-muted text-sm col-span-full text-center py-4">${searchQuery ? 'No decks match your search.' : 'No decks yet. Click "New deck" to create one.'}</p>`;
            return;
        }
        grid.innerHTML = decks.map(d => {
            const isSelected = d.id === selectedId;
            const selectedClass = isSelected ? 'ring-2 ring-dull-purple' : '';
            const stats = deckStats.get(d.id) || { total: 0 };
            const dueCount = this.getDueCountForDeck(d.id);
            return `
 <article class="rounded-2xl border border-[color:var(--card-border)] p-3 bg-[color:var(--surface)] text-[color:var(--text-main)] flex flex-col gap-2 hover:bg-[color:var(--surface-strong)] transition cursor-pointer ${selectedClass}" data-deck-id="${d.id}">
 <div class="flex items-center justify-between">
 <p class="font-semibold text-[color:var(--text-main)] truncate flex-1">${escapeHtml(d.name)}</p>
 <div class="flex items-center gap-1.5">
 <button class="edit-deck-btn p-1 rounded hover:bg-accent-soft text-accent" data-deck-id="${d.id}" title="Edit deck">
 <i data-lucide="edit-2" class="w-3.5 h-3.5 pointer-events-none"></i>
 </button>
 <span class="tag-pill text-[11px] px-2 py-1 rounded-full bg-[color:var(--surface-strong)] text-[color:var(--text-main)] border border-[color:var(--card-border)]">${d.algorithm}</span>
 </div>
 </div>
 <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-sub)]">
 <span>${dueCount} due</span>
 <span>${stats.total} studyable cards</span>
 </div>
 <div class="flex items-center gap-2 text-[11px] text-[color:var(--text-sub)]">
 <i data-lucide="refresh-cw" class="w-3 h-3"></i>
 <span>Reverse ${d.reverse ? 'on' : 'off'}</span>
 </div>
 <div class="flex items-center gap-2 text-[11px] text-[color:var(--text-sub)]">
 <i data-lucide="list-ordered" class="w-3 h-3"></i>
 <span>Order: ${(d.orderMode === 'created' && 'Created Time') || (d.orderMode === 'property' && 'Order Property') || 'None'}</span>
 </div>
 </article>
 `}).join('');
        createIconsInScope(grid);
    },
    renderCards() {
        const tbody = el('#cardTable');
        const noCardsMsg = el('#noCardsMessage');
        const container = el('#cardsContainer');
        const previousScrollTop = container ? container.scrollTop : 0;

        // Cleanup previous observer to prevent memory leaks
        if (this.state.cardListObserver) {
            this.state.cardListObserver.disconnect();
            this.state.cardListObserver = null;
        }

        // If no deck selected, show message and hide table
        if (!this.state.selectedDeck) {
            tbody.innerHTML = '';
            if (container) container.classList.add('hidden');
            if (noCardsMsg) {
                noCardsMsg.textContent = 'Select a deck above to view its cards';
                noCardsMsg.classList.remove('hidden');
            }
            const unsuspendWrap = el('#unsuspendAllWrap');
            if (unsuspendWrap) unsuspendWrap.classList.add('hidden');
            this.updateCounts();
            return;
        }

        const deckCards = this.cardsForDeck(this.state.selectedDeck.id);
        let suspendedCount = 0;
        deckCards.forEach(c => {
            if (c.suspended || c.leech) suspendedCount += 1;
        });
        const unsuspendWrap = el('#unsuspendAllWrap');
        const unsuspendBtn = el('#unsuspendAllBtn');
        if (unsuspendWrap && unsuspendBtn) {
            if (suspendedCount > 0) {
                unsuspendWrap.classList.remove('hidden');
                unsuspendBtn.textContent = `Unsuspend all (${suspendedCount})`;
            } else {
                unsuspendWrap.classList.add('hidden');
            }
        }

        let cards = deckCards.filter(c => this.passFilters(c, { context: 'library' }));

        // Sort by due date (overdue/upcoming first, new cards at end)
        cards.sort((a, b) => {
            const dueA = this.getCardDueTs(a, this.state.selectedDeck);
            const dueB = this.getCardDueTs(b, this.state.selectedDeck);
            const validA = Number.isFinite(dueA);
            const validB = Number.isFinite(dueB);
            if (!validA && !validB) return 0;
            if (!validA) return 1;
            if (!validB) return -1;
            return dueA - dueB;
        });

        const searchQuery = (this.state.cardSearch || '').toLowerCase().trim();
        const matchesSearch = (card) => {
            const plainName = (card.name || '').replace(/<[^>]*>/g, '').replace(/\{\{c\d+::(.*?)\}\}/g, '$1').toLowerCase();
            return plainName.includes(searchQuery);
        };
        if (searchQuery) {
            cards = cards.filter(c => matchesSearch(c));
        }

        if (cards.length === 0) {
            tbody.innerHTML = '';
            if (container) container.classList.add('hidden');
            if (noCardsMsg) {
                noCardsMsg.textContent = searchQuery ? 'No cards match your search.' : 'No cards in this deck yet. Click "New card" to add one.';
                noCardsMsg.classList.remove('hidden');
            }
        } else {
            if (container) container.classList.remove('hidden');
            if (noCardsMsg) noCardsMsg.classList.add('hidden');

            const expandedParents = this.state.expandedClozeParents || new Set();
            const displayCards = [];

            const parseClozeIndex = (val) => {
                if (val === undefined || val === null) return Infinity;
                const str = String(val);
                const first = str.split(',')[0];
                const num = Number(first);
                return Number.isFinite(num) ? num : Infinity;
            };

            const buildSubCards = (parent) => {
                const subIds = Array.isArray(parent.subCards) ? parent.subCards : [];
                const subs = subIds
                    .map(id => this.state.cards.get(id))
                    .filter(Boolean)
                    .filter(sub => this.passFilters(sub, { context: 'library', allowSubItems: true }));
                subs.sort((a, b) => {
                    const valA = (a.order !== null && a.order !== undefined && a.order !== '') ? a.order : parseClozeIndex(a.clozeIndexes);
                    const valB = (b.order !== null && b.order !== undefined && b.order !== '') ? b.order : parseClozeIndex(b.clozeIndexes);

                    const cmp = naturalCompare(valA, valB);
                    if (cmp !== 0) return cmp;
                    return (a.name || '').localeCompare(b.name || '');
                });
                return subs;
            };

            cards.forEach(c => {
                displayCards.push({ card: c, isSub: false });
                if (isClozeParent(c) && expandedParents.has(c.id)) {
                    const subs = buildSubCards(c);
                    subs.forEach(sub => displayCards.push({ card: sub, isSub: true, parentId: c.id }));
                }
            });

            const limit = this.state.cardLimit || 50;
            const visibleCards = displayCards.slice(0, limit);
            const hasMore = displayCards.length > limit;
            const remainingCount = displayCards.length - limit;

            // Reuse existing rows where possible
            const existingRows = new Map();
            Array.from(tbody.children).forEach(row => {
                if (row.dataset.cardId) existingRows.set(row.dataset.cardId, row);
            });

            // Build new content using a DocumentFragment
            const frag = document.createDocumentFragment();

            visibleCards.forEach(item => {
                const c = item.card;
                const existingRow = existingRows.get(c.id);
                const lastUpdated = c._lastUpdated || 0;
                const isParent = isClozeParent(c);
                const isSub = isSubItem(c);

                const expandedKey = (isParent && expandedParents.has(c.id)) ? '1' : '0';
                if (existingRow && existingRow.dataset.timestamp == lastUpdated && (existingRow.dataset.expanded || '0') === expandedKey) {
                    // Reuse DOM node if timestamp matches (no changes)
                    frag.appendChild(existingRow);
                    existingRows.delete(c.id); // Mark as used
                    return;
                }

                // Render new row
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-surface-muted';
                tr.dataset.cardId = c.id;
                tr.dataset.timestamp = lastUpdated;
                tr.dataset.expanded = expandedKey;
                if (item.isSub) tr.dataset.parentId = item.parentId;
                if (item.isSub) tr.classList.add('cloze-sub-row');

                // Strip HTML tags and cloze syntax for display, then escape for safety
                const plainName = (c.name || '').replace(/<[^>]*>/g, '').replace(/\{\{c\d+::(.*?)\}\}/g, '$1');
                const maxNameLen = 50;
                const displayName = plainName.length > maxNameLen
                    ? `${plainName.slice(0, Math.max(0, maxNameLen - 3))}...`
                    : plainName;
                const nameText = escapeHtml(displayName);
                const flagColorClass = c.flag ? this.getFlagColorClass(c.flag) : '';
                const flagIcon = c.flag ? `<i data-lucide="flag" class="w-3 h-3 ${flagColorClass} flag-icon-filled" title="${escapeHtml(c.flag)}"></i>` : '';
                const markIcon = c.marked ? `<i data-lucide="star" class="w-3 h-3 text-accent fill-current" title="Marked"></i>` : '';
                const suspendedIcon = c.suspended ? `<i data-lucide="ban" class="w-3 h-3 text-[color:var(--danger-soft-text)]" title="Suspended"></i>` : '';
                const leechIcon = c.leech ? `<i data-lucide="bug" class="w-3 h-3 text-[color:var(--danger-soft-text)]" title="Leech"></i>` : '';
                const tagPills = c.tags.slice(0, 2).map(t => `<span class="notion-color-${t.color.replace('_', '-')}-background px-1.5 py-0.5 rounded text-[10px]">${escapeHtml(t.name)}</span>`).join(' ');
                const extraTagCount = Math.max(0, c.tags.length - 2);
                const extraTagLabel = extraTagCount > 0 ? `<span class="text-faint ">+${extraTagCount}</span>` : '';
                const dueTs = this.getCardDueTs(c, this.state.selectedDeck);
                const dueDisplay = Number.isFinite(dueTs) ? new Date(dueTs).toLocaleDateString() : '—';
                const subCount = isParent ? (Array.isArray(c.subCards) ? c.subCards.length : 0) : 0;
                const expanded = isParent && expandedParents.has(c.id);
                const hierarchyIcon = isParent
                    ? `<button class="cloze-parent-toggle ${expanded ? 'is-open' : ''}" data-parent-id="${c.id}" aria-expanded="${expanded ? 'true' : 'false'}" title="${expanded ? 'Hide sub-cards' : 'Show sub-cards'}"><i data-lucide="chevron-right" class="cloze-toggle-icon w-3 h-3"></i><span class="cloze-toggle-count">${subCount}</span></button>`
                    : '';

                tr.innerHTML = `
 <td class="py-2 pr-2 text-main ${item.isSub ? 'cloze-sub-cell' : ''}">
 <div class="flex items-center gap-2 cloze-row-main ${item.isSub ? 'cloze-row-main-sub' : ''}">
 ${hierarchyIcon}
 ${markIcon}
 ${flagIcon}
 ${suspendedIcon}
 ${leechIcon}
 <div class="truncate max-w-[150px] sm:max-w-[250px] md:max-w-[350px] lg:max-w-[450px]">${nameText}</div>
 </div>
 </td>
 <td class="py-2 pr-2 capitalize hidden sm:table-cell">${c.type}${isSub ? ` #${c.clozeIndexes || '?'}` : ''}</td>
 <td class="py-2 pr-2 text-sub text-xs whitespace-nowrap">${isParent ? '—' : dueDisplay}</td>
 <td class="py-2 pr-2 hidden md:table-cell text-xs"><div class="flex gap-1 flex-wrap">${tagPills}${extraTagLabel}</div></td>
 <td class="py-2 flex gap-1">
 <button class="info-card-btn p-1 rounded hover:bg-accent-soft text-muted relative" data-card-id="${c.id}" title="Review history">
 <i data-lucide="info" class="w-4 h-4 pointer-events-none"></i>
 </button>
 <button class="edit-card-btn p-1 rounded hover:bg-accent-soft text-accent" data-card-id="${c.id}" title="Edit card">
 <i data-lucide="edit-2" class="w-4 h-4 pointer-events-none"></i>
 </button>
 </td>`;
                frag.appendChild(tr);
            });

            // Handle sentinel for infinite scroll
            if (hasMore) {
                const sentinelRow = document.createElement('tr');
                sentinelRow.id = 'cardListSentinel';
                sentinelRow.innerHTML = `
 <td colspan="5" class="py-3 text-center">
 <button id="showMoreCardsBtn" class="text-xs text-accent hover:underline bg-surface-muted px-4 py-2 rounded-lg">
 Show ${Math.min(remainingCount, this.state.cardLimitStep || 50)} more cards (${remainingCount} remaining)
 </button>
 </td>`;
                frag.appendChild(sentinelRow);
            }

            // Replace entire tbody content with the optimized fragment
            // This implicitly removes any rows in existingRows that weren't reused (stale/filtered out)
            tbody.innerHTML = '';
            tbody.appendChild(frag);
            if (container) container.scrollTop = previousScrollTop;

            // Re-bind intersection observer if needed
            if (hasMore) {
                setTimeout(() => {
                    const btn = el('#showMoreCardsBtn');
                    const sentinel = el('#cardListSentinel');
                    if (btn) btn.onclick = () => {
                        this.state.cardLimit += (this.state.cardLimitStep || 50);
                        this.renderCards();
                    };
                    if (sentinel && 'IntersectionObserver' in window) {
                        if (this.state.cardListObserver) {
                            this.state.cardListObserver.disconnect();
                            this.state.cardListObserver = null;
                        }
                        const observer = new IntersectionObserver((entries) => {
                            if (entries[0].isIntersecting) {
                                observer.disconnect();
                                this.state.cardListObserver = null;
                                this.state.cardLimit += (this.state.cardLimitStep || 50);
                                this.renderCards();
                            }
                        }, { rootMargin: '100px' });
                        observer.observe(sentinel);
                        this.state.cardListObserver = observer;
                    }
                }, 0);
            }
            createIconsInScope(tbody);
        }
        this.updateCounts();
        this.persistUiStateDebounced();
    },
    toggleClozeParent(parentId) {
        if (!parentId) return;
        const expanded = this.state.expandedClozeParents || new Set();
        if (expanded.has(parentId)) expanded.delete(parentId);
        else expanded.add(parentId);
        this.state.expandedClozeParents = expanded;
        this.renderCards();
    },
    renderStudy() {
        // Ensure we never keep the mic open across cards/screens.
        if (this.isMicActive() || this.state.activeAudioStream) {
            this.stopMicActivity(true);
        }
        // Update session UI controls
        const session = this.state.session;
        const revisionSelect = el('#revisionMode');
        if (session?.settings?.revisionMode && revisionSelect) {
            const normalized = normalizeRevisionMode(session.settings.revisionMode);
            if (session.settings.revisionMode !== normalized) {
                session.settings.revisionMode = normalized;
                this.saveSessionDebounced();
            }
            revisionSelect.value = normalized;
        }
        const activeBar = el('#sessionActiveBar');
        const progressText = el('#sessionProgressText');
        const studySettingsCard = el('#studySettingsCard');
        const studyCardSection = el('#studyCardSection');
        const notesSection = el('#notesSection');

        // Show/hide sections based on session state
        if (session) {
            // Session is active - hide settings, show session bar and study card
            // Notes are hidden until answer is revealed
            if (studySettingsCard) studySettingsCard.classList.add('hidden');
            if (studyCardSection) studyCardSection.classList.remove('hidden');
            if (notesSection) notesSection.classList.add('hidden'); // Hidden until reveal
            if (activeBar) {
                activeBar.classList.remove('hidden');
                const current = session.currentIndex + 1;
                const total = session.cardQueue.length;
                progressText.textContent = `Study Session (${current}/${total})`;
                const previewBadge = el('#previewBadge');
                if (previewBadge) previewBadge.classList.toggle('hidden', !session.noScheduleChanges);
            }
            createIconsInScope(studyCardSection || document.body);
        } else {
            // No session - show settings, hide session bar, study card, and notes
            if (studySettingsCard) studySettingsCard.classList.remove('hidden');
            if (studyCardSection) studyCardSection.classList.add('hidden');
            if (notesSection) notesSection.classList.add('hidden');
            if (activeBar) activeBar.classList.add('hidden');
        }

        if (!session && this.state.decks.length === 0) {
            el('#studyDeckLabel').textContent = 'No decks yet';
            el('#cardFront').innerHTML = `
 <div class="text-center py-4">
 <p class="text-sub text-sm mb-2">No decks found.</p>
 <p class="text-muted text-xs">Create a deck to start studying.</p>
 </div>
 `;
            el('#cardBack').innerHTML = '';
            el('#cardBack').classList.add('hidden');
            el('#aiControls').classList.add('hidden');
            el('#ghostinkControls').classList.add('hidden');
            this.state.answerRevealed = false;
            this.setRatingEnabled(false);
            this.updateMobileFab();
            this.state.selectedCard = null;
            return;
        }

        const card = this.pickCard();
        const deck = card ? this.deckById(card.deckId) : null;
        const isCloze = card && (card.type || '').toLowerCase() === 'cloze';

        // Check if no cards are due but decks are selected
        const selectedDeckIds = this.getEffectiveStudyDeckIds();
        const hasDeckFilter = this.hasStudyDeckFilter();

        let hasDue = false;
        let nonDueCount = 0;

        if (!card && hasDeckFilter && !session) {
            for (const dId of selectedDeckIds) {
                const cardIds = this.state.cardDeckIndex?.get(dId);
                if (!cardIds) continue;

                for (const cId of cardIds) {
                    const c = this.state.cards.get(cId);
                    if (c && this.passFilters(c, { context: 'study' }) && isSchedulable(c)) {
                        if (this.isDue(c)) {
                            hasDue = true;
                            break; // Stop if we found a due card (should have been picked by pickCard?)
                        } else {
                            nonDueCount++;
                        }
                    }
                }
                if (hasDue) break;
            }
        }

        if (!card && hasDeckFilter && nonDueCount > 0 && !session) {
            // No due cards but there are non-due cards available (only show when no session)
            el('#studyDeckLabel').textContent = 'No cards due';
            el('#cardFront').innerHTML = `
 <div class="text-center py-4">
 <p class="text-sub text-sm mb-3">No cards are due for review right now.</p>
 <p class="text-muted text-xs mb-4">${nonDueCount} card${nonDueCount === 1 ? '' : 's'} available for extra practice.</p>
 <button id="studyNonDueBtn" class="px-4 py-2 bg-[color:var(--accent)] text-[color:var(--badge-text)] rounded-lg text-sm hover:bg-[color:color-mix(in_srgb,var(--accent)_90%,transparent)] transition">
 Practice non-due cards
 </button>
 </div>
 `;
            el('#cardBack').innerHTML = '';
            el('#cardBack').classList.add('hidden');
            el('#aiControls').classList.add('hidden');
            el('#ghostinkControls').classList.add('hidden');
            this.state.answerRevealed = false;
            this.setRatingEnabled(false);
            this.updateMobileFab();
            this.state.selectedCard = null;
            // Bind the button
            setTimeout(() => {
                const btn = el('#studyNonDueBtn');
                if (btn) btn.onclick = () => this.enableNonDueStudy();
            }, 0);
            return;
        }

        el('#studyDeckLabel').textContent = deck ? deck.name : 'Choose a deck';
        // Clear cardFront before setting new content to force fresh DOM
        el('#cardFront').innerHTML = '';
        const front = card ? this.renderCardFront(card, deck) : '<p class="text-sub text-sm">No card selected</p>';
        el('#cardFront').innerHTML = front;
        applyMediaEmbeds(el('#cardFront'));
        // Show opposite side based on whether card was reversed
        const backContent = card ? (this.state.cardReversed ? card.name : card.back) : '';
        el('#cardBack').innerHTML = card ? safeMarkdownParse(backContent || '') : '';
        applyMediaEmbeds(el('#cardBack'));
        this.renderMath(el('#cardFront'));
        this.renderMath(el('#cardBack'));
        // Ensure cloze blanks are NOT revealed on new card (must be after renderMath)
        document.querySelectorAll('#cardFront .cloze-blank').forEach(span => span.classList.remove('revealed'));
        el('#cardBack').classList.add('hidden');
        el('#aiControls').classList.add('hidden');
        el('#ghostinkControls').classList.add('hidden');
        // Show study controls (may have been hidden by session complete)
        const studyControls = el('#studyControls');
        if (studyControls) studyControls.classList.remove('hidden');

        this.state.activeMicButton = null;
        this.state.lockAiUntilNextCard = false;
        const isAiMode = this.isAiModeUsable();
        const revealBtn = el('#revealBtn');

        this.updateSkipHotkeyLabel(isAiMode);
        this.setAiControlsLocked(false);
        this.updateGhostInkControlsState();
        if (revealBtn) {
            revealBtn.disabled = false;
            revealBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }

        const isGhostInkMode = this.isTypeInModeSelected();
        if (isAiMode) {
            if (revealBtn) revealBtn.classList.add('hidden');
            el('#aiControls').classList.remove('hidden');
            const submitBtn = el('#aiSubmit');
            submitBtn.dataset.empty = '1';
            const feedback = el('#aiFeedback');
            if (feedback) { feedback.classList.add('hidden'); feedback.innerHTML = ''; }
            this.setAiControlsLocked(false);
            setTimeout(() => el('#aiAnswer').focus(), 50);
        } else if (isGhostInkMode) {
            if (revealBtn) revealBtn.classList.add('hidden');
            el('#ghostinkControls').classList.remove('hidden');
            const expected = getGhostInkExpectedAnswers(card, this.state.cardReversed);
            const answerField = el('#ghostinkAnswer');
            if (answerField) {
                answerField.placeholder = expected.length > 1
                    ? `Type ${expected.length} answers, one per line`
                    : 'Type your answer...';
            }
            const feedback = el('#ghostinkFeedback');
            if (feedback) { feedback.classList.add('hidden'); feedback.innerHTML = ''; }
            this.updateGhostInkControlsState();
            setTimeout(() => el('#ghostinkAnswer')?.focus(), 50);
        } else {
            if (revealBtn) revealBtn.classList.remove('hidden');
            el('#aiControls').classList.add('hidden');
            el('#ghostinkControls').classList.add('hidden');
        }

        // Hide copy button until reveal (shows answer content)
        const copyBtn = el('#copyCardContent');
        if (copyBtn) copyBtn.classList.add('hidden');
        // Hide add note button until reveal
        const addNoteBtn = el('#addNoteBlock');
        if (addNoteBtn) addNoteBtn.classList.add('hidden');
        // Reset answer revealed state and disable rating buttons
        this.state.answerRevealed = false;
        this.state.answerRevealedAt = null;
        this.setRatingEnabled(false);
        this.updateMobileFab();
        this.state.selectedCard = card || null;
        this.state.cardShownAt = card ? Date.now() : null;
        if (card) this.updateMarkFlagButtons(card);
        else this.updateMarkFlagButtons({ marked: false, flag: '' });
        this.renderNotes();
        this.renderFsrsMeta();
        el('#aiAnswer').value = '';
        el('#aiFeedback').innerHTML = '';
        el('#aiFeedback').classList.add('hidden');
        el('#ghostinkAnswer').value = '';
        el('#ghostinkFeedback').innerHTML = '';
        el('#ghostinkFeedback').classList.add('hidden');
        this.updateGhostInkControlsState();
        createIconsInScope(el('#studyTab') || studyCardSection || document.body);
    },
    renderNotes() {
        const notes = this.state.selectedCard?.notes ?? '';
        el('#notesPreview').innerHTML = notes ? safeMarkdownParse(notes) : '<p class="text-muted text-sm">No notes for this card</p>';
        applyMediaEmbeds(el('#notesPreview'));
        this.renderMath(el('#notesPreview'));
    },
    renderFsrsMeta() {
        // Stats display removed - internal calculation only
    },
    renderTagFilter() {
        const input = el('#filterTagSearch');
        const dropdown = el('#filterTagDropdown');
        const selectedWrap = el('#filterTagSelected');
        if (!input || !dropdown || !selectedWrap) return;

        const filters = normalizeFilterState(this.state.filters);
        this.state.filters = filters;
        const allTags = Array.from(this.state.tagRegistry.keys()).sort((a, b) => a.localeCompare(b));
        const included = new Set(filters.tags || []);
        const noTagMode = normalizeFilterMode(filters.tagEmptyMode);
        const clearBtn = el('#filterTagClear');
        const hasTagFilter = included.size > 0 || (filters.tagsExclude || []).length > 0 || noTagMode !== FILTER_MODE_IGNORE;
        if (clearBtn) clearBtn.classList.toggle('hidden', !hasTagFilter);
        const query = (input.value || '').toLowerCase();
        const options = [
            { value: FILTER_NONE_LABEL, label: 'No tag' },
            ...allTags.map(name => ({ value: name, label: name }))
        ].filter(option => option.label.toLowerCase().includes(query));

        dropdown.innerHTML = options.length
            ? options.map(({ value, label }) => {
                const mode = value === FILTER_NONE_LABEL
                    ? noTagMode
                    : getListMode(filters.tags, filters.tagsExclude, value);
                const isIncluded = mode === FILTER_MODE_INCLUDE;
                const isExcluded = mode === FILTER_MODE_EXCLUDE;
                return `<button class="tag-option w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-1.5 ${isIncluded ? 'bg-accent-soft' : ''} ${isExcluded ? 'bg-[color:var(--surface-strong)]' : 'hover:bg-surface-muted'}" data-tag="${encodeDataAttr(value)}">
 <span class="flex-1">${escapeHtml(label)}</span>
 ${isIncluded ? '<span class="text-[11px] font-mono text-accent">+</span>' : ''}
 ${isExcluded ? '<span class="text-[11px] font-mono text-sub">-</span>' : ''}
 </button>`;
            }).join('')
            : `<div class="px-3 py-2 text-sm text-muted ">No tags found</div>`;

        dropdown.querySelectorAll('.tag-option').forEach(btn => {
            btn.onclick = () => {
                const tag = decodeDataAttr(btn.dataset.tag);
                if (tag === FILTER_NONE_LABEL) {
                    this.state.filters.tagEmptyMode = cycleFilterMode(this.state.filters.tagEmptyMode);
                } else {
                    const current = getListMode(this.state.filters.tags, this.state.filters.tagsExclude, tag);
                    const next = cycleFilterMode(current);
                    const updated = applyListMode(this.state.filters.tags, this.state.filters.tagsExclude, tag, next);
                    this.state.filters.tags = updated.include;
                    this.state.filters.tagsExclude = updated.exclude;
                }
                this.state.filters = normalizeFilterState(this.state.filters);
                this.renderTagFilter();
                this.renderCards();
                this.renderStudyDeckSelection();
                this.renderStudy();
                this.updateActiveFiltersCount();
                this.persistUiStateDebounced();
            };
        });

        const pills = [];
        for (const tag of filters.tags) {
            pills.push(`
 <span class="tag-pill filter-pill--include inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border" data-tag="${encodeDataAttr(tag)}" data-mode="${FILTER_MODE_INCLUDE}">
 <span class="filter-pill-mode">+</span>
 ${escapeHtml(tag)}
 <button class="remove-tag text-sub" data-tag="${encodeDataAttr(tag)}" data-mode="${FILTER_MODE_INCLUDE}">&times;</button>
 </span>
 `);
        }
        for (const tag of filters.tagsExclude) {
            pills.push(`
 <span class="tag-pill filter-pill--exclude inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border" data-tag="${encodeDataAttr(tag)}" data-mode="${FILTER_MODE_EXCLUDE}">
 <span class="filter-pill-mode">-</span>
 ${escapeHtml(tag)}
 <button class="remove-tag text-sub" data-tag="${encodeDataAttr(tag)}" data-mode="${FILTER_MODE_EXCLUDE}">&times;</button>
 </span>
 `);
        }
        if (filters.tagEmptyMode !== FILTER_MODE_IGNORE) {
            const modeLabel = filters.tagEmptyMode === FILTER_MODE_INCLUDE ? '+' : '-';
            const modeClass = filters.tagEmptyMode === FILTER_MODE_INCLUDE ? 'filter-pill--include' : 'filter-pill--exclude';
            pills.push(`
 <span class="tag-pill ${modeClass} inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border" data-tag="${encodeDataAttr(FILTER_NONE_LABEL)}" data-mode="${filters.tagEmptyMode}">
 <span class="filter-pill-mode">${modeLabel}</span>
 No tag
 <button class="remove-tag text-sub" data-tag="${encodeDataAttr(FILTER_NONE_LABEL)}" data-mode="${filters.tagEmptyMode}">&times;</button>
 </span>
 `);
        }
        selectedWrap.innerHTML = pills.length
            ? pills.join('')
            : '<span class="text-faint text-xs">All tags</span>';

        selectedWrap.querySelectorAll('.remove-tag').forEach(btn => {
            btn.onclick = () => {
                const tag = decodeDataAttr(btn.dataset.tag);
                if (tag === FILTER_NONE_LABEL) {
                    this.state.filters.tagEmptyMode = FILTER_MODE_IGNORE;
                } else {
                    this.state.filters.tags = normalizeFilterList(this.state.filters.tags).filter(t => t !== tag);
                    this.state.filters.tagsExclude = normalizeFilterList(this.state.filters.tagsExclude).filter(t => t !== tag);
                }
                this.state.filters = normalizeFilterState(this.state.filters);
                this.renderTagFilter();
                this.renderCards();
                this.renderStudyDeckSelection();
                this.renderStudy();
                this.updateActiveFiltersCount();
                this.persistUiStateDebounced();
            };
        });
    },
    formatDuration(ms) {
        if (!Number.isFinite(ms) || ms <= 0) return '0 sec';
        const totalSec = Math.round(ms / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        if (mins <= 0) return `${secs} sec`;
        return secs > 0 ? `${mins} min ${secs} sec` : `${mins} min`;
    },
    parseDurationToMs(token) {
        if (!token) return null;
        const s = token.toString().trim().toLowerCase();
        const match = s.match(/^(\d+(?:\.\d+)?)([smhd])$/);
        if (!match) return null;
        const val = parseFloat(match[1]);
        const unit = match[2];
        const mult = unit === 's' ? 1000 : unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000;
        return Math.round(val * mult);
    },
    stepsToMs(steps) {
        if (!Array.isArray(steps)) return [];
        return steps.map(s => this.parseDurationToMs(s)).filter(ms => Number.isFinite(ms) && ms > 0);
    },
    adjustDueDateForEasyDays(dueIso, easyDays) {
        if (!dueIso) return dueIso;
        const days = Array.isArray(easyDays) ? easyDays : [];
        if (!days.length) return dueIso;
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const set = new Set(days.map(d => d.toString().slice(0, 3)));
        const d = new Date(dueIso);
        if (!Number.isFinite(d.getTime())) return dueIso;
        let guard = 0;
        while (set.has(dayNames[d.getDay()]) && guard < 14) {
            d.setDate(d.getDate() + 1);
            guard++;
        }
        return d.toISOString();
    },
    buildSrsState(card, learningOverride = null) {
        const base = parseSrsState(card.srsState || null);
        const learning = learningOverride || base.learning;
        return {
            fsrs: {
                difficulty: card.fsrs?.difficulty ?? base.fsrs.difficulty,
                stability: card.fsrs?.stability ?? base.fsrs.stability,
                retrievability: card.fsrs?.retrievability ?? base.fsrs.retrievability
            },
            sm2: {
                easeFactor: card.sm2?.easeFactor ?? base.sm2.easeFactor,
                interval: card.sm2?.interval ?? base.sm2.interval,
                repetitions: card.sm2?.repetitions ?? base.sm2.repetitions
            },
            learning: {
                state: learning?.state ?? base.learning.state,
                step: Number.isFinite(learning?.step) ? learning.step : base.learning.step,
                due: learning?.due ?? base.learning.due,
                lapses: Number.isFinite(learning?.lapses) ? learning.lapses : base.learning.lapses
            }
        };
    },
    getFlagOrder() {
        return ['', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple'];
    },
    getFlagClass(flag) {
        const key = (flag || '').toLowerCase();
        return {
            red: 'flag-red',
            orange: 'flag-orange',
            yellow: 'flag-yellow',
            green: 'flag-green',
            blue: 'flag-blue',
            purple: 'flag-purple'
        }[key] || '';
    },
    getFlagColorClass(flag) {
        const key = (flag || '').toLowerCase();
        return {
            red: 'flag-color-red',
            orange: 'flag-color-orange',
            yellow: 'flag-color-yellow',
            green: 'flag-color-green',
            blue: 'flag-color-blue',
            purple: 'flag-color-purple'
        }[key] || '';
    },
    async toggleMarkForSelected() {
        const card = this.state.selectedCard;
        if (!card) return;
        card.marked = !card.marked;
        this.updateMarkFlagButtons(card);
        this.setCard(card);
        // Defer persistence if in a session (will be saved on rate/skip)
        if (this.state.session) {
            card._pendingSave = true;
            return;
        }
        await Storage.put('cards', card);
        this.queueOp({ type: 'card-upsert', payload: card });
        this.renderCards();
    },
    async unsuspendAllSelectedDeck() {
        const deck = this.state.selectedDeck;
        if (!deck) {
            toast('Select a deck first');
            return;
        }
        const deckCards = this.cardsForDeck(deck.id);
        const targets = deckCards.filter(c => c.suspended || c.leech);
        if (targets.length === 0) {
            toast('No suspended cards in this deck');
            return;
        }
        targets.forEach(card => {
            card.suspended = 0;
            if (card.leech) card.leech = false;
            this.setCard(card);
        });
        try {
            await Storage.putMany('cards', targets);
        } catch (e) {
            console.error('Bulk unsuspend failed, retrying individually:', e);
            for (const card of targets) {
                await Storage.put('cards', card).catch(err => console.error('Unsuspend save failed:', err));
            }
        }
        targets.forEach(card => this.queueOp({ type: 'card-upsert', payload: card }));
        this.renderCards();
        this.renderDecks();
        this.renderStudyDeckSelection();
        this.renderStudy();
        toast(`Unsuspended ${targets.length} card${targets.length === 1 ? '' : 's'}`);
    },
    async setFlagForSelected(flag) {
        const card = this.state.selectedCard;
        if (!card) return;
        card.flag = flag || '';
        this.updateMarkFlagButtons(card);
        this.setCard(card);
        // Defer persistence if in a session (will be saved on rate/skip)
        if (this.state.session) {
            card._pendingSave = true;
            return;
        }
        await Storage.put('cards', card);
        this.queueOp({ type: 'card-upsert', payload: card });
        this.renderCards();
    },
    updateMarkFlagButtons(card) {
        const markBtn = el('#markCardBtn');
        const flagBtn = el('#flagCardBtn');
        if (markBtn) {
            markBtn.classList.toggle('text-accent', !!card?.marked);
            markBtn.classList.toggle('text-muted', !card?.marked);
            markBtn.classList.toggle('is-marked', !!card?.marked);
            markBtn.setAttribute('aria-pressed', !!card?.marked);
        }
        if (flagBtn) {
            const flag = card?.flag || '';
            const flagColorClass = this.getFlagColorClass(flag);
            const flagColorClasses = ['flag-color-red', 'flag-color-orange', 'flag-color-yellow', 'flag-color-green', 'flag-color-blue', 'flag-color-purple'];
            flagBtn.dataset.flag = card?.flag || '';
            flagBtn.classList.remove('text-accent');
            flagBtn.classList.remove(...flagColorClasses);
            flagBtn.classList.toggle('is-flagged', !!flag);
            flagBtn.classList.toggle('text-muted', !flag);
            if (flagColorClass) flagBtn.classList.add(flagColorClass);
            flagBtn.setAttribute('aria-pressed', !!flag);
        }
    },
    updateFlagSwatchSelection(container, flag) {
        if (!container) return;
        const current = flag || '';
        container.querySelectorAll('[data-flag]').forEach(btn => {
            const val = btn.dataset.flag || '';
            const isSelected = val === current;
            btn.classList.toggle('is-selected', isSelected);
            btn.setAttribute('aria-pressed', isSelected);
        });
    },
    updateFlagSwatchMulti(container, flags) {
        if (!container) return;
        const selected = new Set(Array.isArray(flags) ? flags : (flags ? [flags] : []));
        container.querySelectorAll('[data-flag], [data-analytic-flag]').forEach(btn => {
            const val = btn.dataset.flag || btn.dataset.analyticFlag || '';
            const isSelected = selected.has(val);
            btn.classList.toggle('is-selected', isSelected);
            btn.setAttribute('aria-pressed', isSelected);
        });
    },
    updateFlagSwatchTriState(container) {
        if (!container) return;
        const f = normalizeFilterState(this.state.filters);
        this.state.filters = f;
        container.querySelectorAll('[data-flag]').forEach(btn => {
            const value = (btn.dataset.flag || '').trim();
            const mode = value === FILTER_NONE_LABEL
                ? normalizeFilterMode(f.flagEmptyMode)
                : getListMode(f.flag, f.flagExclude, value);
            btn.classList.toggle('is-included', mode === FILTER_MODE_INCLUDE);
            btn.classList.toggle('is-excluded', mode === FILTER_MODE_EXCLUDE);
            btn.classList.toggle('is-selected', mode !== FILTER_MODE_IGNORE);
            btn.dataset.mode = mode;
            btn.setAttribute('aria-pressed', mode !== FILTER_MODE_IGNORE);
            let modeLabel = btn.querySelector('.flag-filter-mode');
            if (!modeLabel) {
                modeLabel = document.createElement('span');
                modeLabel.className = 'flag-filter-mode';
                modeLabel.setAttribute('aria-hidden', 'true');
                btn.appendChild(modeLabel);
            }
            modeLabel.textContent = mode === FILTER_MODE_INCLUDE ? '+' : (mode === FILTER_MODE_EXCLUDE ? '-' : '');
        });
    },
    openFlagPicker(anchor) {
        const card = this.state.selectedCard;
        if (!card || !anchor) return;
        const existing = document.querySelector('.flag-picker-popover');
        if (existing) existing.remove();
        const flags = this.getFlagOrder();
        const popover = document.createElement('div');
        popover.className = 'flag-picker-popover fixed z-50 bg-[color:var(--surface)] border border-[color:var(--card-border)] rounded-lg shadow-lg p-2 flex gap-2';
        popover.innerHTML = flags.map(f => {
            const label = f || 'None';
            const swatchClass = f ? this.getFlagClass(f) : 'is-none';
            const selected = (card.flag || '') === (f || '') ? ' is-selected' : '';
            return `
 <button type="button" class="flag-swatch-btn${selected}" data-flag="${f || ''}" aria-label="${label}">
 <span class="flag-swatch ${swatchClass}"></span>
 </button>`;
        }).join('');
        document.body.appendChild(popover);
        this.updateFlagSwatchSelection(popover, card.flag || '');
        const rect = anchor.getBoundingClientRect();
        // Clamp left so popover stays within viewport
        const desiredLeft = rect.right - popover.offsetWidth;
        const clampedLeft = Math.max(8, Math.min(window.innerWidth - popover.offsetWidth - 8, desiredLeft));
        popover.style.left = `${clampedLeft}px`;
        popover.style.top = `${rect.bottom + 6}px`;
        popover.querySelectorAll('.flag-swatch-btn').forEach(btn => {
            btn.onclick = async () => {
                const flag = btn.dataset.flag || '';
                await this.setFlagForSelected(flag);
                popover.remove();
            };
        });
        const closeOnClickOutside = (e) => {
            if (!popover.contains(e.target) && e.target !== anchor) {
                popover.remove();
                document.removeEventListener('click', closeOnClickOutside);
            }
        };
        setTimeout(() => document.addEventListener('click', closeOnClickOutside), 0);
    },
    applySm2Learning(card, ratingKey, deck) {
        const config = parseSrsConfig(deck?.srsConfig || null, deck?.algorithm || 'SM-2');
        const learningSteps = this.stepsToMs(config.learningSteps);
        const relearningSteps = this.stepsToMs(config.relearningSteps);
        const learning = parseSrsState(card.srsState || null).learning;

        if (learning.state === 'review') {
            if (ratingKey !== 'again' || relearningSteps.length === 0) return false;
            learning.state = 'relearning';
            learning.step = 0;
        } else if (learning.state === 'new') {
            if (learningSteps.length === 0) return false;
            learning.state = 'learning';
            learning.step = 0;
        }

        const steps = learning.state === 'relearning' ? relearningSteps : learningSteps;
        if (steps.length === 0) return false;

        if (ratingKey === 'again') {
            learning.lapses = (learning.lapses || 0) + 1;
            learning.step = 0;
        } else if (ratingKey === 'hard') {
            // stay on same step
        } else if (ratingKey === 'good') {
            learning.step += 1;
        } else if (ratingKey === 'easy') {
            learning.step = steps.length;
        }

        const now = new Date();
        const nowIso = now.toISOString();

        if (learning.step >= steps.length || ratingKey === 'easy') {
            learning.state = 'review';
            learning.step = 0;
            learning.due = null;
            const intervalMs = this.parseDurationToMs(ratingKey === 'easy' ? config.easyInterval : config.graduatingInterval) || 86400000;
            const intervalDays = Math.max(1, Math.round(intervalMs / 86400000));
            let due = SRS.getDueDate(intervalDays);
            due = this.adjustDueDateForEasyDays(due, config.easyDays);
            card.sm2.interval = intervalDays;
            card.sm2.repetitions = Math.max(1, (card.sm2.repetitions ?? 0) + 1);
            card.sm2.dueDate = due;
        } else {
            const stepMs = steps[Math.min(learning.step, steps.length - 1)];
            let due = new Date(now.getTime() + stepMs).toISOString();
            due = this.adjustDueDateForEasyDays(due, config.easyDays);
            learning.due = due;
            card.sm2.interval = 0;
            card.sm2.repetitions = 0;
            card.sm2.dueDate = due;
        }

        card.sm2.lastReview = nowIso;
        card.sm2.lastRating = ratingKey;
        card.srsState = this.buildSrsState(card, learning);
        return true;
    },
    formatDateKey(date) {
        const d = new Date(date);
        if (!Number.isFinite(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },
    formatStudyDateKey(date) {
        const d = new Date(date);
        if (!Number.isFinite(d.getTime())) return '';
        if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1);
        return this.formatDateKey(d);
    },
    startOfDay(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    },
    startOfStudyDay(date) {
        const d = new Date(date);
        if (!Number.isFinite(d.getTime())) return new Date(NaN);
        if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1);
        d.setHours(DAY_START_HOUR, 0, 0, 0);
        return d;
    },
    studyDateFromKey(key) {
        if (!key || typeof key !== 'string') return new Date(NaN);
        const [y, m, d] = key.split('-').map(v => Number(v));
        if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return new Date(NaN);
        return new Date(y, m - 1, d, DAY_START_HOUR, 0, 0, 0);
    },
    reviewHistoriesEqual(a, b) {
        if (a === b) return true;
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            const x = a[i] || {};
            const y = b[i] || {};
            if (x.rating !== y.rating || x.at !== y.at || x.ms !== y.ms) return false;
        }
        return true;
    },
    normalizeReviewHistory(history) {
        if (!Array.isArray(history) || history.length === 0) return [];
        const normalized = [];
        for (const entry of history) {
            const ts = Number.isFinite(entry?._ts)
                ? Number(entry._ts)
                : (entry?.at ? new Date(entry.at).getTime() : NaN);
            if (!Number.isFinite(ts)) continue;
            const at = new Date(ts);
            if (!Number.isFinite(at.getTime())) continue;
            const rawRating = normalizeRating(entry?.rating) || entry?.rating;
            const rating = ratingsMap[rawRating] ? rawRating : 'good';
            const ms = Number.isFinite(entry?.ms) ? Math.max(0, Math.round(entry.ms)) : 0;
            normalized.push({ rating, at: at.toISOString(), ms, _ts: Math.round(ts) });
        }
        normalized.sort((a, b) => (a._ts || 0) - (b._ts || 0));
        const deduped = [];
        const seen = new Set();
        for (const entry of normalized) {
            const key = `${entry.rating}|${entry._ts}|${entry.ms}`;
            if (seen.has(key)) continue;
            seen.add(key);
            deduped.push(entry);
        }
        return deduped;
    },
    getRetentionBinIndex(days) {
        for (let i = 0; i < ANALYTICS_RETENTION_BINS.length; i++) {
            const b = ANALYTICS_RETENTION_BINS[i];
            if (days >= b.min && days <= b.max) return i;
        }
        return -1;
    },
    createAnalyticsAggregate() {
        return {
            dayMap: new Map(),
            hourlyByDay: new Map(),
            retentionByDay: new Map(),
            reviewCount: 0,
            firstDayKey: '',
            lastDayKey: ''
        };
    },
    createRetentionDayRow() {
        return {
            total: new Array(ANALYTICS_RETENTION_BINS.length).fill(0),
            success: new Array(ANALYTICS_RETENTION_BINS.length).fill(0)
        };
    },
    createAnalyticsDayStat() {
        return {
            count: 0,
            ms: 0,
            ratingSum: 0,
            ratingCount: 0,
            ratingCounts: { again: 0, hard: 0, good: 0, easy: 0 }
        };
    },
    updateAnalyticsAggregateBounds(agg) {
        let first = '';
        let last = '';
        for (const key of agg.dayMap.keys()) {
            if (!first || key < first) first = key;
            if (!last || key > last) last = key;
        }
        agg.firstDayKey = first;
        agg.lastDayKey = last;
    },
    mergeAnalyticsSummaryIntoAggregate(agg, summary, sign = 1) {
        if (!agg || !summary) return;
        agg.reviewCount += sign * (summary.reviewCount || 0);
        if (agg.reviewCount < 0) agg.reviewCount = 0;

        for (const [dayKey, stat] of summary.dayMap.entries()) {
            const target = agg.dayMap.get(dayKey) || this.createAnalyticsDayStat();
            target.count += sign * (stat.count || 0);
            target.ms += sign * (stat.ms || 0);
            target.ratingSum += sign * (stat.ratingSum || 0);
            target.ratingCount += sign * (stat.ratingCount || 0);
            const srcCounts = stat.ratingCounts || {};
            target.ratingCounts.again += sign * (srcCounts.again || 0);
            target.ratingCounts.hard += sign * (srcCounts.hard || 0);
            target.ratingCounts.good += sign * (srcCounts.good || 0);
            target.ratingCounts.easy += sign * (srcCounts.easy || 0);
            if (target.count <= 0) {
                agg.dayMap.delete(dayKey);
            } else {
                agg.dayMap.set(dayKey, target);
            }
        }

        for (const [dayKey, hours] of summary.hourlyByDay.entries()) {
            const target = agg.hourlyByDay.get(dayKey) || new Array(24).fill(0);
            for (let i = 0; i < 24; i++) {
                target[i] = (target[i] || 0) + sign * (hours[i] || 0);
            }
            if (target.every(v => v <= 0)) {
                agg.hourlyByDay.delete(dayKey);
            } else {
                agg.hourlyByDay.set(dayKey, target);
            }
        }

        for (const [dayKey, row] of summary.retentionByDay.entries()) {
            const target = agg.retentionByDay.get(dayKey) || this.createRetentionDayRow();
            for (let i = 0; i < ANALYTICS_RETENTION_BINS.length; i++) {
                target.total[i] += sign * (row.total?.[i] || 0);
                target.success[i] += sign * (row.success?.[i] || 0);
            }
            if (target.total.every(v => v <= 0)) {
                agg.retentionByDay.delete(dayKey);
            } else {
                agg.retentionByDay.set(dayKey, target);
            }
        }

        if (sign > 0) {
            if (summary.firstDayKey && (!agg.firstDayKey || summary.firstDayKey < agg.firstDayKey)) agg.firstDayKey = summary.firstDayKey;
            if (summary.lastDayKey && (!agg.lastDayKey || summary.lastDayKey > agg.lastDayKey)) agg.lastDayKey = summary.lastDayKey;
        } else {
            this.updateAnalyticsAggregateBounds(agg);
        }
    },
    mergeAnalyticsAggregateInto(target, source) {
        if (!target || !source) return target;
        const pseudoSummary = {
            dayMap: source.dayMap,
            hourlyByDay: source.hourlyByDay,
            retentionByDay: source.retentionByDay,
            reviewCount: source.reviewCount || 0,
            firstDayKey: source.firstDayKey || '',
            lastDayKey: source.lastDayKey || ''
        };
        this.mergeAnalyticsSummaryIntoAggregate(target, pseudoSummary, 1);
        return target;
    },
    buildAnalyticsCardSummary(card) {
        if (!card?.id || isClozeParent(card)) return null;
        const history = Array.isArray(card.reviewHistory) ? card.reviewHistory : [];
        const dayMap = new Map();
        const hourlyByDay = new Map();
        const retentionByDay = new Map();
        let reviewCount = 0;
        let firstDayKey = '';
        let lastDayKey = '';
        let prevTs = null;

        for (const h of history) {
            const ts = Number.isFinite(h?._ts)
                ? Number(h._ts)
                : (h?.at ? new Date(h.at).getTime() : NaN);
            if (!Number.isFinite(ts)) continue;
            const at = new Date(ts);
            if (!Number.isFinite(at.getTime())) continue;
            const dayKey = this.formatStudyDateKey(at);
            if (!dayKey) continue;
            const rawRating = normalizeRating(h?.rating) || h?.rating;
            const rating = ratingsMap[rawRating] ? rawRating : 'good';
            const ratingValue = ratingsMap[rating] || ratingsMap.good;
            const durationMs = Number.isFinite(h?.ms) ? Math.max(0, h.ms) : 0;

            const dayStat = dayMap.get(dayKey) || this.createAnalyticsDayStat();
            dayStat.count += 1;
            dayStat.ms += durationMs;
            dayStat.ratingSum += ratingValue;
            dayStat.ratingCount += 1;
            if (dayStat.ratingCounts[rating] === undefined) dayStat.ratingCounts[rating] = 0;
            dayStat.ratingCounts[rating] += 1;
            dayMap.set(dayKey, dayStat);

            const hours = hourlyByDay.get(dayKey) || new Array(24).fill(0);
            hours[at.getHours()] += 1;
            hourlyByDay.set(dayKey, hours);

            if (Number.isFinite(prevTs)) {
                const prevStudy = this.startOfStudyDay(new Date(prevTs));
                const currStudy = this.startOfStudyDay(at);
                const days = Math.max(0, Math.floor((currStudy - prevStudy) / 86400000));
                const binIdx = this.getRetentionBinIndex(days);
                if (binIdx >= 0) {
                    const retRow = retentionByDay.get(dayKey) || this.createRetentionDayRow();
                    retRow.total[binIdx] += 1;
                    if (rating !== 'again') retRow.success[binIdx] += 1;
                    retentionByDay.set(dayKey, retRow);
                }
            }
            prevTs = ts;
            reviewCount += 1;
            if (!firstDayKey || dayKey < firstDayKey) firstDayKey = dayKey;
            if (!lastDayKey || dayKey > lastDayKey) lastDayKey = dayKey;
        }

        if (reviewCount === 0) return null;

        return {
            cardId: card.id,
            deckId: card.deckId || '',
            includeActive: !card.suspended && !card.leech,
            reviewCount,
            firstDayKey,
            lastDayKey,
            dayMap,
            hourlyByDay,
            retentionByDay
        };
    },
    bumpAnalyticsAggregateVersion() {
        this.state.analyticsAggVersion = (this.state.analyticsAggVersion || 0) + 1;
        if (this.state.analyticsHeatmapYearHtmlCache) this.state.analyticsHeatmapYearHtmlCache.clear();
    },
    ensureAnalyticsAggregateState() {
        if (!this.state.analyticsCardSummary) this.state.analyticsCardSummary = new Map();
        if (!this.state.analyticsAggGlobalAll) this.state.analyticsAggGlobalAll = this.createAnalyticsAggregate();
        if (!this.state.analyticsAggGlobalActive) this.state.analyticsAggGlobalActive = this.createAnalyticsAggregate();
        if (!this.state.analyticsAggDeckAll) this.state.analyticsAggDeckAll = new Map();
        if (!this.state.analyticsAggDeckActive) this.state.analyticsAggDeckActive = new Map();
        if (!this.state.analyticsHeatmapYearHtmlCache) this.state.analyticsHeatmapYearHtmlCache = new Map();
        if (!Number.isFinite(this.state.analyticsAggVersion)) this.state.analyticsAggVersion = 0;
    },
    getOrCreateAnalyticsDeckAggregate(map, deckId) {
        if (!deckId) return null;
        let agg = map.get(deckId);
        if (!agg) {
            agg = this.createAnalyticsAggregate();
            map.set(deckId, agg);
        }
        return agg;
    },
    updateAnalyticsSummaryForCard(card) {
        if (!card?.id) return;
        this.ensureAnalyticsAggregateState();
        const prev = this.state.analyticsCardSummary.get(card.id) || null;
        if (prev) {
            this.mergeAnalyticsSummaryIntoAggregate(this.state.analyticsAggGlobalAll, prev, -1);
            if (prev.includeActive) this.mergeAnalyticsSummaryIntoAggregate(this.state.analyticsAggGlobalActive, prev, -1);
            if (prev.deckId) {
                const deckAll = this.state.analyticsAggDeckAll.get(prev.deckId);
                if (deckAll) this.mergeAnalyticsSummaryIntoAggregate(deckAll, prev, -1);
                const deckActive = this.state.analyticsAggDeckActive.get(prev.deckId);
                if (prev.includeActive && deckActive) this.mergeAnalyticsSummaryIntoAggregate(deckActive, prev, -1);
            }
            this.state.analyticsCardSummary.delete(card.id);
        }

        const next = this.buildAnalyticsCardSummary(card);
        if (next) {
            this.state.analyticsCardSummary.set(card.id, next);
            this.mergeAnalyticsSummaryIntoAggregate(this.state.analyticsAggGlobalAll, next, 1);
            if (next.includeActive) this.mergeAnalyticsSummaryIntoAggregate(this.state.analyticsAggGlobalActive, next, 1);
            if (next.deckId) {
                const deckAll = this.getOrCreateAnalyticsDeckAggregate(this.state.analyticsAggDeckAll, next.deckId);
                this.mergeAnalyticsSummaryIntoAggregate(deckAll, next, 1);
                if (next.includeActive) {
                    const deckActive = this.getOrCreateAnalyticsDeckAggregate(this.state.analyticsAggDeckActive, next.deckId);
                    this.mergeAnalyticsSummaryIntoAggregate(deckActive, next, 1);
                }
            }
        }

        if (prev || next) this.bumpAnalyticsAggregateVersion();
    },
    removeAnalyticsSummaryForCard(cardId) {
        if (!cardId) return;
        this.ensureAnalyticsAggregateState();
        const prev = this.state.analyticsCardSummary.get(cardId);
        if (!prev) return;
        this.mergeAnalyticsSummaryIntoAggregate(this.state.analyticsAggGlobalAll, prev, -1);
        if (prev.includeActive) this.mergeAnalyticsSummaryIntoAggregate(this.state.analyticsAggGlobalActive, prev, -1);
        if (prev.deckId) {
            const deckAll = this.state.analyticsAggDeckAll.get(prev.deckId);
            if (deckAll) this.mergeAnalyticsSummaryIntoAggregate(deckAll, prev, -1);
            const deckActive = this.state.analyticsAggDeckActive.get(prev.deckId);
            if (prev.includeActive && deckActive) this.mergeAnalyticsSummaryIntoAggregate(deckActive, prev, -1);
        }
        this.state.analyticsCardSummary.delete(cardId);
        this.bumpAnalyticsAggregateVersion();
    },
    getAnalyticsAggregateForDeckSelection(selectedSet, allSelected, includeSuspended) {
        this.ensureAnalyticsAggregateState();
        const globalAgg = includeSuspended ? this.state.analyticsAggGlobalAll : this.state.analyticsAggGlobalActive;
        const deckAggMap = includeSuspended ? this.state.analyticsAggDeckAll : this.state.analyticsAggDeckActive;
        if (allSelected) return globalAgg || this.createAnalyticsAggregate();
        const ids = Array.from(selectedSet || []);
        if (ids.length === 1) return deckAggMap.get(ids[0]) || this.createAnalyticsAggregate();
        const merged = this.createAnalyticsAggregate();
        for (const deckId of ids) {
            const deckAgg = deckAggMap.get(deckId);
            if (deckAgg) this.mergeAnalyticsAggregateInto(merged, deckAgg);
        }
        return merged;
    },
    buildAnalyticsAggregateFromCards(cards) {
        this.ensureAnalyticsAggregateState();
        const agg = this.createAnalyticsAggregate();
        for (const card of cards || []) {
            const summary = this.state.analyticsCardSummary.get(card?.id);
            if (!summary) continue;
            this.mergeAnalyticsSummaryIntoAggregate(agg, summary, 1);
        }
        return agg;
    },
    buildSparkBars(values, opts = {}) {
        const height = opts.height || 80;
        const width = opts.width || 6;
        const gap = opts.gap ?? 2;
        const color = opts.color || 'var(--chart-accent)';
        const max = Math.max(1, ...values);
        const svgWidth = values.length * (width + gap);
        const parts = values.map((val, i) => {
            const h = max > 0 ? Math.round((val / max) * (height - 6)) : 0;
            const x = i * (width + gap);
            const y = height - h;
            const title = opts.titleFormatter ? opts.titleFormatter(val, i) : `${val}`;
            return `<g><title>${escapeHtml(String(title))}</title><rect x="${x}" y="${y}" width="${width}" height="${Math.max(h, 1)}" rx="1" fill="${color}"></rect></g>`;
        }).join('');
        return `<svg class="chart-svg" width="${svgWidth}" height="${height}" viewBox="0 0 ${svgWidth} ${height}" xmlns="http://www.w3.org/2000/svg">${parts}</svg>`;
    },
    formatShortDateLabel(dateStr, includeYear = false) {
        const d = new Date(dateStr);
        if (!Number.isFinite(d.getTime())) return '';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const label = `${months[d.getMonth()]} ${d.getDate()}`;
        return includeYear ? `${label}, ${d.getFullYear()}` : label;
    },
    buildChartAxis(labels) {
        if (!labels || labels.length === 0) return '';
        return `<div class="chart-axis">${labels.map(label => `<span>${escapeHtml(label)}</span>`).join('')}</div>`;
    },
    formatChartValue(value, { unit = '', isTime = false } = {}) {
        const num = Number.isFinite(value) ? value : 0;
        const decimals = isTime && num < 10 ? 1 : 0;
        const formatted = num.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
        return unit ? `${formatted}${unit}` : formatted;
    },
    buildChartTopValues(values, { unit = '', isTime = false } = {}) {
        if (!values || values.length === 0) return '';
        const clean = values.map(v => Number.isFinite(v) ? v : 0);
        const sorted = [...clean].sort((a, b) => a - b);
        const min = sorted[0] ?? 0;
        const max = sorted[sorted.length - 1] ?? 0;
        const avg = clean.reduce((sum, v) => sum + v, 0) / clean.length;
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
        return `<div class="chart-top-values">
 <span>Min ${escapeHtml(this.formatChartValue(min, { unit, isTime }))}</span>
 <span>Med ${escapeHtml(this.formatChartValue(median, { unit, isTime }))}</span>
 <span>Avg ${escapeHtml(this.formatChartValue(avg, { unit, isTime }))}</span>
 <span>Max ${escapeHtml(this.formatChartValue(max, { unit, isTime }))}</span>
 </div>`;
    },
    buildDateAxisLabels(dates) {
        if (!dates || dates.length === 0) return '';
        const first = dates[0];
        const last = dates[dates.length - 1];
        const mid = dates[Math.floor(dates.length / 2)] || first;
        const includeYear = new Date(first).getFullYear() !== new Date(last).getFullYear();
        const labels = [
            this.formatShortDateLabel(first, includeYear),
            this.formatShortDateLabel(mid, includeYear),
            this.formatShortDateLabel(last, includeYear)
        ];
        return this.buildChartAxis(labels);
    },
    buildDistributionBars(items) {
        if (!items || items.length === 0) return '<p class="text-sm text-[color:var(--text-sub)]">No data yet.</p>';
        const max = Math.max(1, ...items.map(i => i.value));
        return `
 <div class="space-y-2.5">
 ${items.map(item => `
 <div class="flex items-center gap-3 text-sm">
 <span class="w-16 font-medium text-[color:var(--text-main)]">${escapeHtml(item.label)}</span>
 <div class="flex-1 analytics-bar-bg">
 <div class="analytics-bar-fill" style="width:${(item.value / max) * 100}%;${item.color ? ` background:${item.color};` : ''}"></div>
 </div>
 <span class="w-12 text-right text-[color:var(--text-sub)]">${item.value.toLocaleString()}</span>
 </div>
 `).join('')}
 </div>
 `;
    },
    buildPieChart(slices) {
        const total = slices.reduce((sum, s) => sum + s.value, 0);
        const radius = 48;
        const cx = 55;
        const cy = 55;
        if (total <= 0) {
            return `<svg width="110" height="110" viewBox="0 0 110 110" aria-hidden="true">
 <circle cx="${cx}" cy="${cy}" r="${radius}" fill="rgb(var(--dull-purple-rgb) / 0.12)"></circle>
 <circle cx="${cx}" cy="${cy}" r="${radius * 0.55}" fill="var(--card-bg)"></circle>
 </svg>`;
        }
        let startAngle = -90;
        const paths = slices.map(slice => {
            const angle = (slice.value / total) * 360;
            const endAngle = startAngle + angle;
            const large = angle > 180 ? 1 : 0;
            const start = this.polarToCartesian(cx, cy, radius, endAngle);
            const end = this.polarToCartesian(cx, cy, radius, startAngle);
            const d = [
                'M', start.x, start.y,
                'A', radius, radius, 0, large, 0, end.x, end.y,
                'L', cx, cy,
                'Z'
            ].join(' ');
            const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
            const title = `${slice.label}: ${slice.value} (${pct}%)`;
            startAngle = endAngle;
            return `<path d="${d}" fill="${slice.color}" aria-label="${escapeHtml(title)}"><title>${escapeHtml(title)}</title></path>`;
        }).join('');
        const hole = `<circle cx="${cx}" cy="${cy}" r="${radius * 0.55}" fill="var(--card-bg)"></circle>`;
        return `<svg width="110" height="110" viewBox="0 0 110 110" aria-hidden="true">${paths}${hole}</svg>`;
    },
    async downloadHeatmapPng() {
        const heatmap = el('#analyticsHeatmap');
        if (!heatmap) return;
        if (typeof html2canvas === 'undefined') {
            toast('Heatmap download unavailable');
            return;
        }
        const card = heatmap.closest('.card');
        const downloadBtn = el('#heatmapDownloadBtn');
        const grids = Array.from(heatmap.querySelectorAll('.heatmap-grid'));
        const prevStyles = grids.map(grid => ({
            node: grid,
            overflow: grid.style.overflow,
            width: grid.style.width
        }));
        const prevHeatmap = {
            width: heatmap.style.width
        };
        const prevCard = card ? {
            width: card.style.width,
            maxWidth: card.style.maxWidth,
            overflow: card.style.overflow
        } : null;
        const prevDownloadVisibility = downloadBtn ? downloadBtn.style.visibility : '';
        grids.forEach(grid => {
            grid.scrollLeft = 0;
            grid.style.overflow = 'visible';
            grid.style.width = `${grid.scrollWidth}px`;
        });
        const widestGrid = grids.reduce((max, grid) => Math.max(max, grid.scrollWidth || 0), heatmap.clientWidth);
        if (widestGrid > 0) heatmap.style.width = `${widestGrid}px`;
        if (card) {
            card.style.overflow = 'visible';
            card.style.maxWidth = 'none';
            const cardWidth = Math.max(card.scrollWidth, widestGrid);
            card.style.width = `${cardWidth}px`;
        }
        if (downloadBtn) downloadBtn.style.visibility = 'hidden';

        await new Promise(resolve => requestAnimationFrame(resolve));

        const target = card || heatmap;
        const bgColor = target ? getComputedStyle(target).backgroundColor : getComputedStyle(document.body).backgroundColor;
        try {
            const canvas = await html2canvas(target, {
                backgroundColor: bgColor || '#ffffff',
                scale: window.devicePixelRatio || 2
            });
            const link = document.createElement('a');
            link.download = `activity-heatmap-${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Heatmap download failed', err);
            toast('Heatmap download failed');
        } finally {
            prevStyles.forEach(({ node, overflow, width }) => {
                node.style.overflow = overflow;
                node.style.width = width;
            });
            heatmap.style.width = prevHeatmap.width;
            if (card && prevCard) {
                card.style.width = prevCard.width;
                card.style.maxWidth = prevCard.maxWidth;
                card.style.overflow = prevCard.overflow;
            }
            if (downloadBtn) downloadBtn.style.visibility = prevDownloadVisibility;
        }
    },
    polarToCartesian(cx, cy, r, angleDeg) {
        const rad = (angleDeg - 90) * Math.PI / 180.0;
        return { x: cx + (r * Math.cos(rad)), y: cy + (r * Math.sin(rad)) };
    },
    isCardNew(card) {
        const lastReview = card.fsrs?.lastReview || card.sm2?.lastReview || null;
        const hasHistory = Array.isArray(card.reviewHistory) && card.reviewHistory.length > 0;
        const reps = card.sm2?.repetitions ?? 0;
        const learning = parseSrsState(card.srsState || null).learning;
        const isLearning = ['learning', 'relearning'].includes(learning?.state);
        return !lastReview && !hasHistory && reps === 0 && !isLearning;
    },
    renderAnalytics() {
        const deckLabel = el('#analyticsDeckLabel');
        const deckMenu = el('#analyticsDeckMenu');
        const filterLabel = el('#analyticsFilterLabel');
        const filterMenu = el('#analyticsFilterMenu');
        if (this.state.analyticsRange === '365') this.state.analyticsRange = 'last-year';
        const deckIds = this.state.decks.map(d => d.id);
        const deckIdSet = new Set(deckIds);
        const normalizedAnalyticsDecks = Array.isArray(this.state.analyticsDecks)
            ? this.state.analyticsDecks.filter(id => deckIdSet.has(id))
            : [];
        if ((this.state.analyticsDecks || []).length !== normalizedAnalyticsDecks.length) {
            this.state.analyticsDecks = normalizedAnalyticsDecks;
        }
        const selectedSet = new Set(normalizedAnalyticsDecks);
        const allSelected = selectedSet.size === 0;
        const analyticsTags = Array.isArray(this.state.analyticsTags) ? this.state.analyticsTags : [];
        const analyticsFlags = Array.isArray(this.state.analyticsFlags) ? this.state.analyticsFlags : [];
        const analyticsMarked = !!this.state.analyticsMarked;
        const tagsKey = analyticsTags.slice().sort().join('|');
        const flagsKey = analyticsFlags.slice().sort().join('|');

        const currentCacheKey = JSON.stringify({
            filters: {
                range: this.state.analyticsRange,
                year: this.state.analyticsYear,
                decks: normalizedAnalyticsDecks,
                suspended: this.state.analyticsIncludeSuspended,
                metric: this.state.analyticsHeatmapMetric,
                tags: tagsKey,
                flags: flagsKey,
                marked: analyticsMarked ? 1 : 0
            },
            aggVersion: this.state.analyticsAggVersion || 0
        });

        // Helper to update labels (always runs)
        const updateLabels = () => {
            if (deckLabel) {
                if (allSelected) deckLabel.textContent = 'All decks';
                else if (selectedSet.size === 1) {
                    const onlyId = Array.from(selectedSet)[0];
                    deckLabel.textContent = this.deckById(onlyId)?.name || '1 deck';
                } else {
                    deckLabel.textContent = `${selectedSet.size} decks`;
                }
            }
            if (deckMenu) {
                const allCheck = allSelected ? '<i data-lucide="check" class="w-3 h-3 text-accent"></i>' : '<span class="w-3 h-3"></span>';
                const deckQuery = (deckMenu.dataset.query || '').trim().toLowerCase();
                const deckRows = this.state.decks.length
                    ? this.state.decks.map(d => {
                        const active = selectedSet.has(d.id);
                        const deckName = escapeHtml(d.name);
                        const deckNameKey = escapeHtml((d.name || '').toLowerCase());
                        return `
 <button type="button" class="analytics-menu-option analytics-deck-option w-full text-left px-3 py-1.5 text-[13px] rounded-md inline-flex items-start justify-between gap-1.5 ${active ? 'bg-surface-muted' : 'hover:bg-surface-muted'}" data-deck="${d.id}" data-deck-name="${deckNameKey}">
 <span class="analytics-deck-name">${deckName}</span>
 ${active ? '<i data-lucide="check" class="w-3 h-3 text-accent mt-0.5"></i>' : '<span class="w-3 h-3 mt-0.5"></span>'}
 </button>
 `;
                    }).join('')
                    : '<div class="px-3 py-2 text-xs text-[color:var(--text-sub)]">No decks yet.</div>';
                const deckSearch = this.state.decks.length ? `
 <div class="px-3 py-2">
 <input id="analyticsDeckSearch" type="text" value="${escapeHtml(deckMenu.dataset.query || '')}" placeholder="Search decks"
 class="w-full rounded-md border border-[color:var(--card-border)] bg-[color:var(--surface)] px-2 py-1.5 text-xs text-[color:var(--text-main)] placeholder:text-[color:var(--text-sub)]">
 </div>
 ` : '';
                deckMenu.innerHTML = `
 <button type="button" class="analytics-menu-option w-full text-left px-3 py-1.5 text-[13px] rounded-md inline-flex items-center justify-between ${allSelected ? 'bg-surface-muted' : 'hover:bg-surface-muted'}" data-deck="all">
 <span>No filter (all decks)</span>
 ${allCheck}
 </button>
 ${this.state.decks.length ? '<div class="h-px bg-[color:var(--card-border)] my-1"></div>' : ''}
 ${deckSearch}
 ${this.state.decks.length ? '<div class="analytics-deck-scroll scroll-minimal">' + deckRows + '</div>' : deckRows}
 `;
                deckMenu.querySelectorAll('[data-deck]').forEach(btn => {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const deckId = btn.dataset.deck || '';
                        if (deckId === 'all') {
                            this.state.analyticsDecks = [];
                            this.renderAnalytics();
                            deckMenu.classList.remove('hidden');
                            return;
                        }
                        const next = new Set(this.state.analyticsDecks || []);
                        if (next.has(deckId)) next.delete(deckId);
                        else next.add(deckId);
                        if (next.size === deckIds.length) next.clear();
                        this.state.analyticsDecks = Array.from(next);
                        this.renderAnalytics();
                        deckMenu.classList.remove('hidden');
                    };
                });
                const deckSearchInput = deckMenu.querySelector('#analyticsDeckSearch');
                const deckButtons = Array.from(deckMenu.querySelectorAll('.analytics-deck-option'));
                const applyDeckQuery = (query) => {
                    const q = (query || '').trim().toLowerCase();
                    deckButtons.forEach(btn => {
                        const name = (btn.dataset.deckName || '').toLowerCase();
                        btn.classList.toggle('hidden', q && !name.includes(q));
                    });
                };
                if (deckSearchInput) {
                    deckSearchInput.oninput = (e) => {
                        const q = e.target.value || '';
                        deckMenu.dataset.query = q;
                        applyDeckQuery(q);
                    };
                    applyDeckQuery(deckSearchInput.value || '');
                }
            }
            if (filterLabel) {
                const filterCount = analyticsTags.length + analyticsFlags.length + (analyticsMarked ? 1 : 0);
                filterLabel.textContent = filterCount > 0 ? `Filters • ${filterCount}` : 'Filters';
            }
            if (filterMenu) {
                const selectedTags = new Set(analyticsTags);
                const selectedFlags = new Set(analyticsFlags);
                const tagOptions = this.collectTagOptions();
                const tagRows = tagOptions.length
                    ? tagOptions.map(opt => {
                        const active = selectedTags.has(opt.name);
                        const tagName = opt.name || '';
                        return `
 <button type="button" class="analytics-menu-option analytics-tag-option w-full text-left px-3 py-1.5 text-[13px] rounded-md inline-flex items-center justify-between ${active ? 'bg-surface-muted' : 'hover:bg-surface-muted'}" data-analytic-tag="${encodeDataAttr(tagName)}" data-tag-name="${encodeDataAttr(tagName.toLowerCase())}">
 <span class="truncate">${escapeHtml(tagName)}</span>
 ${active ? '<i data-lucide="check" class="w-3 h-3 text-accent"></i>' : '<span class="w-3 h-3"></span>'}
 </button>
 `;
                    }).join('')
                    : '<div class="px-3 py-2 text-xs text-[color:var(--text-sub)]">No tags yet.</div>';

                const flagOrder = this.getFlagOrder().filter(f => f);
                const tagHeaderAction = selectedTags.size > 0
                    ? `<button type="button" class="analytics-filter-clear-btn rounded-md px-2 text-[10px] font-semibold bg-[color:color-mix(in_srgb,var(--accent-2)_10%,transparent)] text-[color:var(--accent-2)] hover:bg-[color:color-mix(in_srgb,var(--accent-2)_20%,transparent)]" data-analytic-clear-tags="1">Clear</button>`
                    : '';
                const flagHeaderAction = selectedFlags.size > 0
                    ? `<button type="button" class="analytics-filter-clear-btn rounded-md px-2 text-[10px] font-semibold bg-[color:color-mix(in_srgb,var(--accent-2)_10%,transparent)] text-[color:var(--accent-2)] hover:bg-[color:color-mix(in_srgb,var(--accent-2)_20%,transparent)]" data-analytic-clear-flags="1">Clear</button>`
                    : '';
                filterMenu.innerHTML = `
 <div class="flex items-center justify-between px-3 py-2">
 <span class="text-[11px] uppercase tracking-wide text-[color:var(--text-sub)]">Tags</span>
 ${tagHeaderAction}
 </div>
 <div class="px-3 py-2">
 <input id="analyticsTagSearch" type="text" value="${escapeHtml(filterMenu.dataset.tagQuery || '')}" placeholder="Search tags"
 class="w-full rounded-md border border-[color:var(--card-border)] bg-[color:var(--surface)] px-2 py-1.5 text-xs text-[color:var(--text-main)] placeholder:text-[color:var(--text-sub)]">
 </div>
 <div class="analytics-tag-scroll scroll-minimal">${tagRows}</div>
 <div class="h-px bg-[color:var(--card-border)] my-2"></div>
 <div class="flex items-center justify-between px-3 py-2">
 <span class="text-[11px] uppercase tracking-wide text-[color:var(--text-sub)]">Flags</span>
 ${flagHeaderAction}
 </div>
 <div class="px-3 py-2">
 <div id="analyticsFlagSwatches" class="flag-swatch-row">
 ${flagOrder.map(f => `
 <button type="button" class="flag-swatch-btn" data-analytic-flag="${f}" aria-label="${f} flag">
 <span class="flag-swatch ${this.getFlagClass(f)}"></span>
 </button>
 `).join('')}
 </div>
 </div>
 <div class="h-px bg-[color:var(--card-border)] my-2"></div>
 <label class="flex items-center gap-2 px-3 py-2 text-sm text-[color:var(--text-main)]">
 <input id="analyticsMarkedOnly" type="checkbox" class="accent-dull-purple" ${analyticsMarked ? 'checked' : ''}>
 <span>Marked only</span>
 </label>
 <label class="flex items-center gap-2 px-3 py-2 text-sm text-[color:var(--text-main)]">
 <input id="analyticsIncludeSuspended" type="checkbox" class="accent-dull-purple" ${this.state.analyticsIncludeSuspended !== false ? 'checked' : ''}>
 <span>Include suspended</span>
 </label>
 <div class="h-px bg-[color:var(--card-border)] my-2"></div>
 <button type="button" class="analytics-menu-option w-full text-left px-3 py-1.5 text-[13px] rounded-md bg-[color:color-mix(in_srgb,var(--accent)_10%,transparent)] text-[color:var(--accent)] hover:bg-[color:color-mix(in_srgb,var(--accent)_20%,transparent)]" data-analytic-clear="1">Clear filters</button>
 `;

                const flagRow = filterMenu.querySelector('#analyticsFlagSwatches');
                this.updateFlagSwatchMulti(flagRow, analyticsFlags);

                filterMenu.querySelectorAll('[data-analytic-tag]').forEach(btn => {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const raw = btn.dataset.analyticTag || '';
                        const tag = decodeDataAttr(raw);
                        const next = new Set(this.state.analyticsTags || []);
                        if (next.has(tag)) next.delete(tag);
                        else next.add(tag);
                        this.state.analyticsTags = Array.from(next);
                        this.persistFilterPrefs();
                        this.renderAnalytics();
                        filterMenu.classList.remove('hidden');
                    };
                });
                const tagSearch = filterMenu.querySelector('#analyticsTagSearch');
                const tagButtons = Array.from(filterMenu.querySelectorAll('.analytics-tag-option'));
                const applyTagQuery = (query) => {
                    const q = (query || '').trim().toLowerCase();
                    tagButtons.forEach(btn => {
                        const name = decodeDataAttr(btn.dataset.tagName || '');
                        btn.classList.toggle('hidden', q && !name.includes(q));
                    });
                };
                if (tagSearch) {
                    tagSearch.oninput = (e) => {
                        const q = e.target.value || '';
                        filterMenu.dataset.tagQuery = q;
                        applyTagQuery(q);
                    };
                    applyTagQuery(tagSearch.value || '');
                }

                filterMenu.querySelectorAll('[data-analytic-flag]').forEach(btn => {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const raw = btn.dataset.analyticFlag || '';
                        const next = new Set(this.state.analyticsFlags || []);
                        if (next.has(raw)) next.delete(raw);
                        else next.add(raw);
                        this.state.analyticsFlags = Array.from(next);
                        this.persistFilterPrefs();
                        this.renderAnalytics();
                        filterMenu.classList.remove('hidden');
                    };
                });

                const clearTagsBtn = filterMenu.querySelector('[data-analytic-clear-tags]');
                if (clearTagsBtn) {
                    clearTagsBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.state.analyticsTags = [];
                        this.persistFilterPrefs();
                        this.renderAnalytics();
                        filterMenu.classList.remove('hidden');
                    };
                }
                const clearFlagsBtn = filterMenu.querySelector('[data-analytic-clear-flags]');
                if (clearFlagsBtn) {
                    clearFlagsBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.state.analyticsFlags = [];
                        this.persistFilterPrefs();
                        this.renderAnalytics();
                        filterMenu.classList.remove('hidden');
                    };
                }

                const markedToggle = filterMenu.querySelector('#analyticsMarkedOnly');
                if (markedToggle) {
                    markedToggle.onchange = (e) => {
                        this.state.analyticsMarked = !!e.target.checked;
                        this.persistFilterPrefs();
                        this.renderAnalytics();
                        filterMenu.classList.remove('hidden');
                    };
                }
                const includeSuspendedToggle = filterMenu.querySelector('#analyticsIncludeSuspended');
                if (includeSuspendedToggle) {
                    includeSuspendedToggle.onchange = (e) => {
                        this.state.analyticsIncludeSuspended = !!e.target.checked;
                        this.persistFilterPrefs();
                        this.renderAnalytics();
                        filterMenu.classList.remove('hidden');
                    };
                }

                const clearBtn = filterMenu.querySelector('[data-analytic-clear]');
                if (clearBtn) {
                    clearBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.state.analyticsTags = [];
                        this.state.analyticsFlags = [];
                        this.state.analyticsMarked = false;
                        this.state.analyticsIncludeSuspended = true;
                        this.persistFilterPrefs();
                        this.renderAnalytics();
                        filterMenu.classList.remove('hidden');
                    };
                }
                createIconsInScope(filterMenu);
            }
            let rangeMode = this.state.analyticsRange || 'this-year';
            if (rangeMode === '365') rangeMode = 'last-year';
            if (rangeMode !== 'year') this.state.analyticsYear = 'all';
            const rangeLabels = {
                all: 'All time',
                '7': 'Last week',
                '30': 'Last month',
                '90': 'Last 3 months',
                '180': 'Last 6 months',
                '365': 'Last year',
                'last-year': 'Last year',
                'this-year': 'This year',
                year: 'Year'
            };
            const rangeLabelEl = el('#analyticsRangeLabel');
            if (rangeLabelEl) {
                if (rangeMode === 'year' && this.state.analyticsYear && this.state.analyticsYear !== 'all') {
                    rangeLabelEl.textContent = `Year • ${this.state.analyticsYear}`;
                } else {
                    rangeLabelEl.textContent = rangeLabels[rangeMode] || 'This year';
                }
            }
            const rangeMenu = el('#analyticsRangeMenu');
            if (rangeMenu) {
                const lastYearBtn = rangeMenu.querySelector('[data-range="last-year"], [data-range="365"]');
                if (lastYearBtn) lastYearBtn.classList.toggle('hidden', this.state.analyticsHasLastYearOption === false);
                rangeMenu.querySelectorAll('[data-range]').forEach(btn => {
                    const rangeKey = btn.dataset.range || '';
                    const isActive = rangeKey === rangeMode || (rangeKey === 'by-year' && rangeMode === 'year');
                    btn.classList.toggle('bg-surface-muted', isActive);
                    btn.classList.toggle('text-main', true);
                });
            }
            const includeSuspendedToggle = el('#analyticsIncludeSuspended');
            if (includeSuspendedToggle) includeSuspendedToggle.checked = this.state.analyticsIncludeSuspended !== false;

            const heatmapMetricReviewsBtn = el('#heatmapMetricReviews');
            const heatmapMetricRatingBtn = el('#heatmapMetricRating');
            if (heatmapMetricReviewsBtn && heatmapMetricRatingBtn) {
                const isReviews = this.state.analyticsHeatmapMetric === 'count';
                heatmapMetricReviewsBtn.classList.toggle('is-active', isReviews);
                heatmapMetricRatingBtn.classList.toggle('is-active', !isReviews);
                heatmapMetricReviewsBtn.setAttribute('aria-pressed', String(isReviews));
                heatmapMetricRatingBtn.setAttribute('aria-pressed', String(!isReviews));
            }
        };

        // If cache valid and DOM populated, just update labels
        if (!this.state.analyticsDirty && this.state.analyticsCache && this.state.analyticsCache.key === currentCacheKey && el('#analyticsToday').hasChildNodes()) {
            updateLabels();
            return;
        }

        updateLabels();

        // HEAVY CALCULATION START
        let rangeMode = this.state.analyticsRange || 'this-year';
        if (rangeMode === '365') rangeMode = 'last-year';
        if (rangeMode !== 'year') this.state.analyticsYear = 'all';

        const includeSuspended = this.state.analyticsIncludeSuspended !== false;
        const filterIds = this.getAnalyticsFilterCandidates();
        let baseCards;
        if (filterIds) {
            baseCards = [];
            for (const id of filterIds) {
                const card = this.state.cards.get(id);
                if (!card) continue;
                if (!allSelected && !selectedSet.has(card.deckId)) continue;
                baseCards.push(card);
            }
        } else {
            const allCardsArray = Array.from(this.state.cards.values());
            baseCards = allSelected
                ? allCardsArray
                : allCardsArray.filter(c => selectedSet.has(c.deckId));
        }
        const filteredBase = baseCards.filter(c => !isClozeParent(c));
        const cards = includeSuspended
            ? filteredBase
            : filteredBase.filter(c => !c.suspended && !c.leech);

        const hasAttributeFilters = analyticsTags.length > 0 || analyticsFlags.length > 0 || analyticsMarked;
        const analyticsAgg = hasAttributeFilters
            ? this.buildAnalyticsAggregateFromCards(cards)
            : this.getAnalyticsAggregateForDeckSelection(selectedSet, allSelected, includeSuspended);
        const dayMap = analyticsAgg.dayMap || new Map();
        const hasAnalyticsDayActivity = (stat) => (stat?.count || 0) > 0 || (stat?.ratingCount || 0) > 0;
        const dayKeysSorted = Array.from(dayMap.keys()).sort();
        const firstActiveKey = dayKeysSorted.find(k => hasAnalyticsDayActivity(dayMap.get(k))) || '';
        const firstActiveDate = firstActiveKey ? this.studyDateFromKey(firstActiveKey) : null;

        const now = new Date();
        const todayKey = this.formatStudyDateKey(now);
        const todayStats = dayMap.get(todayKey) || { count: 0, ms: 0 };
        const dueToday = cards.filter(c => isSchedulable(c) && this.isDue(c)).length;
        const lastYearPrefix = `${now.getFullYear() - 1}-`;
        const hasLastYearData = dayKeysSorted.some(k => k.startsWith(lastYearPrefix) && hasAnalyticsDayActivity(dayMap.get(k)));
        this.state.analyticsHasLastYearOption = hasLastYearData;
        if (rangeMode === 'last-year' && !hasLastYearData) {
            rangeMode = 'this-year';
            this.state.analyticsRange = 'this-year';
        }

        let rangeStart = this.startOfStudyDay(new Date(now));
        let rangeEnd = this.startOfStudyDay(new Date(now));
        if (rangeMode === 'this-year') {
            rangeStart = new Date(now.getFullYear(), 0, 1, DAY_START_HOUR, 0, 0, 0);
        } else if (rangeMode === 'last-year') {
            const prevYear = now.getFullYear() - 1;
            rangeStart = new Date(prevYear, 0, 1, DAY_START_HOUR, 0, 0, 0);
            rangeEnd = new Date(prevYear, 11, 31, DAY_START_HOUR, 0, 0, 0);
        } else if (rangeMode === 'year' && this.state.analyticsYear && this.state.analyticsYear !== 'all') {
            const yearNum = Number(this.state.analyticsYear);
            if (Number.isFinite(yearNum)) {
                rangeStart = new Date(yearNum, 0, 1, DAY_START_HOUR, 0, 0, 0);
                rangeEnd = new Date(yearNum, 11, 31, DAY_START_HOUR, 0, 0, 0);
                if (yearNum === now.getFullYear()) rangeEnd = this.startOfStudyDay(now);
            }
        } else if (rangeMode === 'all') {
            const firstKey = analyticsAgg.firstDayKey || '';
            const firstDate = firstKey ? this.studyDateFromKey(firstKey) : null;
            rangeStart = firstDate && Number.isFinite(firstDate.getTime()) ? firstDate : this.startOfStudyDay(now);
        } else {
            const rangeDays = Number(rangeMode || 90);
            rangeStart.setDate(rangeStart.getDate() - (rangeDays - 1));
        }
        if (rangeMode !== 'all' && firstActiveDate && Number.isFinite(firstActiveDate.getTime()) && rangeStart < firstActiveDate) {
            rangeStart = new Date(firstActiveDate);
        }
        if (rangeStart > rangeEnd) {
            const oneDayPastEnd = new Date(rangeEnd);
            oneDayPastEnd.setDate(oneDayPastEnd.getDate() + 1);
            rangeStart = oneDayPastEnd;
        }
        const rangeStartKey = this.formatDateKey(rangeStart);
        const rangeEndKey = this.formatDateKey(rangeEnd);
        const daySet = new Set(dayKeysSorted);
        let streak = 0;
        if (dayKeysSorted.length > 0) {
            const cursor = this.startOfStudyDay(now);
            let key = this.formatDateKey(cursor);
            if (!daySet.has(key)) {
                cursor.setDate(cursor.getDate() - 1);
                key = this.formatDateKey(cursor);
            }
            if (daySet.has(key)) {
                while (daySet.has(key)) {
                    streak += 1;
                    cursor.setDate(cursor.getDate() - 1);
                    key = this.formatDateKey(cursor);
                }
            }
        }
        let longest = 0;
        let current = 0;
        let prevKey = '';
        for (const key of dayKeysSorted) {
            if (!prevKey) {
                current = 1;
            } else {
                const prevDate = this.studyDateFromKey(prevKey);
                const currDate = this.studyDateFromKey(key);
                const gapDays = (Number.isFinite(prevDate.getTime()) && Number.isFinite(currDate.getTime()))
                    ? Math.floor((currDate - prevDate) / 86400000)
                    : Number.POSITIVE_INFINITY;
                current = gapDays === 1 ? current + 1 : 1;
            }
            if (current > longest) longest = current;
            prevKey = key;
        }

        const ratings = { again: 0, hard: 0, good: 0, easy: 0 };
        const hourly = new Array(24).fill(0);
        const retentionTotals = new Array(ANALYTICS_RETENTION_BINS.length).fill(0);
        const retentionSuccess = new Array(ANALYTICS_RETENTION_BINS.length).fill(0);
        const rangeDates = [];
        const rangeCounts = [];
        const rangeMinutes = [];
        const tempDate = new Date(rangeStart);
        while (tempDate <= rangeEnd) {
            const key = this.formatDateKey(tempDate);
            const dayStat = dayMap.get(key) || this.createAnalyticsDayStat();
            rangeDates.push(key);
            rangeCounts.push(dayStat.count || 0);
            rangeMinutes.push((dayStat.ms || 0) / 60000);

            const rc = dayStat.ratingCounts || {};
            ratings.again += rc.again || 0;
            ratings.hard += rc.hard || 0;
            ratings.good += rc.good || 0;
            ratings.easy += rc.easy || 0;

            const hourRow = analyticsAgg.hourlyByDay.get(key);
            if (Array.isArray(hourRow)) {
                for (let i = 0; i < 24; i++) hourly[i] += hourRow[i] || 0;
            }

            const retRow = analyticsAgg.retentionByDay.get(key);
            if (retRow) {
                for (let i = 0; i < ANALYTICS_RETENTION_BINS.length; i++) {
                    retentionTotals[i] += retRow.total?.[i] || 0;
                    retentionSuccess[i] += retRow.success?.[i] || 0;
                }
            }
            tempDate.setDate(tempDate.getDate() + 1);
        }
        const totalRatings = Object.values(ratings).reduce((a, b) => a + b, 0);
        const successCount = totalRatings - (ratings.again || 0);
        const retentionPct = totalRatings ? Math.round((successCount / totalRatings) * 100) : 0;

        // Cache the heavy lifting result
        this.state.analyticsCache = {
            key: currentCacheKey,
            data: { /* Just key marker for now, we render directly */ }
        };
        this.state.analyticsDirty = false;

        const todayEl = el('#analyticsToday');
        if (todayEl) {
            todayEl.innerHTML = `
 <div class="analytics-stat-value">${todayStats.count}</div>
 <div class="flex flex-wrap gap-2 mt-2">
 <span class="analytics-pill"><i data-lucide="clock" class="w-3 h-3"></i><span class="analytics-pill-value">${this.formatDuration(todayStats.ms)}</span></span>
 <span class="analytics-pill"><i data-lucide="calendar" class="w-3 h-3"></i>${dueToday} due</span>
 </div>
 `;
        }
        const streakEl = el('#analyticsStreaks');
        if (streakEl) {
            streakEl.innerHTML = `
 <div class="analytics-stat-value">${streak} <span class="text-base font-normal text-[color:var(--text-sub)]">day${streak === 1 ? '' : 's'}</span></div>
 <div class="flex flex-wrap gap-2 mt-2">
 <span class="analytics-pill"><i data-lucide="trophy" class="w-3 h-3"></i>Best: ${longest}</span>
 <span class="analytics-pill"><i data-lucide="activity" class="w-3 h-3"></i>${dayMap.size} active</span>
 </div>
 `;
        }
        const retentionEl = el('#analyticsRetention');
        if (retentionEl) {
            retentionEl.innerHTML = `
 <div class="analytics-stat-value">${retentionPct}%</div>
 <div class="flex flex-wrap gap-2 mt-2">
 <span class="analytics-pill"><i data-lucide="bar-chart-3" class="w-3 h-3"></i>${totalRatings.toLocaleString()} reviews</span>
 </div>
 `;
        }
        const streakBadge = el('#analyticsStreakBadge');
        if (streakBadge) streakBadge.innerHTML = `<i data-lucide="flame" class="w-3 h-3"></i>${streak} day streak`;

        const countChart = el('#analyticsReviewCount');
        if (countChart) {
            const axis = this.buildDateAxisLabels(rangeDates);
            const top = this.buildChartTopValues(rangeCounts);
            countChart.innerHTML = `<div class="chart-wrap">
 ${top}
 ${this.buildSparkBars(rangeCounts, {
                height: 100,
                width: 7,
                gap: 2,
                color: 'var(--chart-accent)',
                titleFormatter: (val, i) => `${rangeDates[i]} • ${val} reviews`
            })}
 ${axis}
 </div>`;
        }
        const timeChart = el('#analyticsReviewTime');
        if (timeChart) {
            const axis = this.buildDateAxisLabels(rangeDates);
            const top = this.buildChartTopValues(rangeMinutes, { unit: 'm', isTime: true });
            timeChart.innerHTML = `<div class="chart-wrap">
 ${top}
 ${this.buildSparkBars(rangeMinutes, {
                height: 100,
                width: 7,
                gap: 2,
                color: 'var(--chart-accent-2)',
                titleFormatter: (_, i) => `${rangeDates[i]} • ${this.formatDuration(dayMap.get(rangeDates[i])?.ms || 0)}`
            })}
 ${axis}
 </div>`;
        }

        const answerBreakdown = el('#analyticsAnswerBreakdown');
        if (answerBreakdown) {
            const rows = [
                { label: 'Again', key: 'again', color: 'var(--rating-again-fill)' },
                { label: 'Hard', key: 'hard', color: 'var(--rating-hard-fill)' },
                { label: 'Good', key: 'good', color: 'var(--rating-good-fill)' },
                { label: 'Easy', key: 'easy', color: 'var(--rating-easy-fill)' }
            ];
            answerBreakdown.innerHTML = `
 <div class="space-y-3">
 ${rows.map(r => {
                const count = ratings[r.key] || 0;
                const pct = totalRatings ? Math.round((count / totalRatings) * 100) : 0;
                return `
 <div class="flex items-center gap-3">
 <span class="w-14 text-sm font-medium text-[color:var(--text-main)]">${r.label}</span>
 <div class="flex-1 analytics-bar-bg">
 <div class="analytics-bar-fill" style="width:${pct}%; background:${r.color}"></div>
 </div>
 <span class="w-20 text-right text-sm text-[color:var(--text-sub)]">${count.toLocaleString()} <span class="text-xs">(${pct}%)</span></span>
 </div>
 `;
            }).join('')}
 </div>
 `;
        }

        const hourlyEl = el('#analyticsHourlyBreakdown');
        if (hourlyEl) {
            const formatHour = (h) => h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
            const axis = this.buildChartAxis(['12a', '6a', '12p', '6p', '11p']);
            hourlyEl.innerHTML = `<div class="chart-wrap">
 ${this.buildChartTopValues(hourly)}
 ${this.buildSparkBars(hourly, {
                height: 100,
                width: 14,
                gap: 4,
                color: 'var(--chart-accent)',
                titleFormatter: (val, i) => `${formatHour(i)} • ${val} reviews`
            })}
 ${axis}
 </div>`;
        }

        const intervalBuckets = [
            { label: 'New', min: null, max: null, value: 0 },
            { label: '0d', min: 0, max: 0, value: 0 },
            { label: '1d', min: 1, max: 1, value: 0 },
            { label: '2d', min: 2, max: 2, value: 0 },
            { label: '3-6d', min: 3, max: 6, value: 0 },
            { label: '7-13d', min: 7, max: 13, value: 0 },
            { label: '14-29d', min: 14, max: 29, value: 0 },
            { label: '30-59d', min: 30, max: 59, value: 0 },
            { label: '60-119d', min: 60, max: 119, value: 0 },
            { label: '120d+', min: 120, max: Infinity, value: 0 }
        ];
        cards.forEach(card => {
            if (this.isCardNew(card)) {
                intervalBuckets[0].value += 1;
                return;
            }
            const lastReview = card.fsrs?.lastReview || card.sm2?.lastReview;
            const due = card.fsrs?.dueDate || card.sm2?.dueDate;
            const last = lastReview ? new Date(lastReview) : null;
            const dueDate = due ? new Date(due) : null;
            if (!last || !Number.isFinite(last.getTime()) || !dueDate || !Number.isFinite(dueDate.getTime())) return;
            const lastStudy = this.startOfStudyDay(last);
            const dueStudy = this.startOfStudyDay(dueDate);
            const days = Math.max(0, Math.floor((dueStudy - lastStudy) / 86400000));
            const bucket = intervalBuckets.find(b => b.min !== null && days >= b.min && days <= b.max);
            if (bucket) bucket.value += 1;
        });
        const intervalEl = el('#analyticsIntervalDistribution');
        if (intervalEl) intervalEl.innerHTML = this.buildDistributionBars(intervalBuckets);

        const easeBuckets = [
            { label: '1.3-1.7', min: 1.3, max: 1.69, value: 0 },
            { label: '1.7-2.1', min: 1.7, max: 2.09, value: 0 },
            { label: '2.1-2.5', min: 2.1, max: 2.49, value: 0 },
            { label: '2.5-2.9', min: 2.5, max: 2.89, value: 0 },
            { label: '2.9+', min: 2.9, max: Infinity, value: 0 }
        ];
        const diffBuckets = [
            { label: '1-3', min: 1, max: 3, value: 0 },
            { label: '4-6', min: 4, max: 6, value: 0 },
            { label: '7-8', min: 7, max: 8, value: 0 },
            { label: '9-10', min: 9, max: 10, value: 0 }
        ];
        cards.forEach(card => {
            const deck = this.deckById(card.deckId);
            const alg = deck?.algorithm || 'SM-2';
            if (alg === 'SM-2' && card.sm2?.easeFactor) {
                const ease = card.sm2.easeFactor;
                const bucket = easeBuckets.find(b => ease >= b.min && ease <= b.max);
                if (bucket) bucket.value += 1;
            }
            if (alg === 'FSRS' && card.fsrs?.difficulty) {
                const diff = card.fsrs.difficulty;
                const bucket = diffBuckets.find(b => diff >= b.min && diff <= b.max);
                if (bucket) bucket.value += 1;
            }
        });
        const easeEl = el('#analyticsEaseDifficulty');
        if (easeEl) {
            easeEl.innerHTML = `
 <div class="space-y-5">
 <div>
 <p class="text-xs font-medium text-[color:var(--text-sub)] mb-3">SM-2 ease factor</p>
 ${this.buildDistributionBars(easeBuckets)}
 </div>
 <div>
 <p class="text-xs font-medium text-[color:var(--text-sub)] mb-3">FSRS difficulty</p>
 ${this.buildDistributionBars(diffBuckets)}
 </div>
 </div>
 `;
        }

        const cardCounts = {
            New: 0,
            Due: 0,
            'Not due': 0,
            Suspended: 0
        };
        cards.forEach(card => {
            if (card.suspended || card.leech) {
                cardCounts.Suspended += 1;
                return;
            }
            if (this.isCardNew(card)) {
                cardCounts.New += 1;
                return;
            }
            if (this.isDue(card)) cardCounts.Due += 1;
            else cardCounts['Not due'] += 1;
        });
        const pieSlices = [
            { label: 'New', value: cardCounts.New, color: 'var(--muted-pink)' },
            { label: 'Due', value: cardCounts.Due, color: 'var(--dull-purple)' },
            { label: 'Not due', value: cardCounts['Not due'], color: 'var(--earth-metal)' },
            ...(includeSuspended ? [{ label: 'Suspended', value: cardCounts.Suspended, color: 'rgb(var(--earth-metal-rgb) / 0.4)' }] : [])
        ];
        const total = pieSlices.reduce((sum, s) => sum + s.value, 0);
        const cardCountsEl = el('#analyticsCardCounts');
        if (cardCountsEl) {
            cardCountsEl.innerHTML = `
 <div class="analytics-pie">
 <div class="analytics-pie-chart">
 ${this.buildPieChart(pieSlices)}
 </div>
 <div class="analytics-legend flex-col gap-2">
 ${pieSlices.map(s => {
                const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                return `<span class="text-sm"><i class="analytics-dot" style="background:${s.color}"></i><span class="font-medium text-[color:var(--text-main)]">${s.label}</span> <span class="text-[color:var(--text-sub)]">${s.value.toLocaleString()} (${pct}%)</span></span>`;
            }).join('')}
 </div>
 </div>
 `;
        }

        const retentionRows = ANALYTICS_RETENTION_BINS.map((b, idx) => ({
            label: b.label,
            total: retentionTotals[idx] || 0,
            success: retentionSuccess[idx] || 0
        }));
        const retentionTable = el('#analyticsTrueRetention');
        if (retentionTable) {
            retentionTable.innerHTML = `
<table class="analytics-table">
 <thead>
 <tr>
 <th>Interval</th>
 <th>Reviews</th>
 <th>Retention</th>
 </tr>
 </thead>
 <tbody>
 ${retentionRows.map(r => {
                const pct = r.total ? Math.round((r.success / r.total) * 100) : 0;
                return `<tr>
 <td>${r.label}</td>
 <td>${r.total}</td>
 <td>${r.total ? `${pct}%` : '—'}</td>
 </tr>`;
            }).join('')}
 </tbody>
 </table>
 `;
        }

        const legendLow = el('#heatmapLegendLow');
        const legendHigh = el('#heatmapLegendHigh');
        if (legendLow && legendHigh) {
            if (this.state.analyticsHeatmapMetric === 'rating') {
                legendLow.textContent = 'Lower rating';
                legendHigh.textContent = 'Higher rating';
            } else {
                legendLow.textContent = 'Fewer reviews';
                legendHigh.textContent = 'More reviews';
            }
        }

        const heatmapRangeStart = rangeStart;
        const heatmapRangeEnd = rangeEnd;
        const heatmapDayMap = dayMap;

        const heatmapEl = el('#analyticsHeatmap');
        if (heatmapEl) {
            const rangeYearStart = heatmapRangeStart.getFullYear();
            const rangeYearEnd = heatmapRangeEnd.getFullYear();
            const rangeYearList = [];
            for (let y = rangeYearStart; y <= rangeYearEnd; y++) rangeYearList.push(y);
            const parsedYearStart = analyticsAgg.firstDayKey ? Number(analyticsAgg.firstDayKey.slice(0, 4)) : NaN;
            const availableYearStart = Number.isFinite(parsedYearStart) ? parsedYearStart : now.getFullYear();
            const availableYearEnd = now.getFullYear();
            const availableYearSet = new Set();
            for (const key of dayKeysSorted) {
                const y = Number(key.slice(0, 4));
                if (Number.isFinite(y) && y >= availableYearStart && y <= availableYearEnd) {
                    availableYearSet.add(y);
                }
            }
            const availableYearList = Array.from(availableYearSet).sort((a, b) => a - b);
            const yearMenu = el('#analyticsYearMenu');
            const selectedYear = (this.state.analyticsYear || 'all').toString();
            const validYear = availableYearList.includes(Number(selectedYear));
            const activeYear = (rangeMode === 'year' && validYear) ? selectedYear : 'all';
            this.state.analyticsYear = activeYear;
            if (yearMenu) {
                yearMenu.innerHTML = availableYearList.length
                    ? availableYearList.map(y => `<button type="button" class="analytics-year-option w-full text-left px-3 py-2 text-sm rounded-md hover:bg-surface-muted" data-year="${y}">${y}</button>`).join('')
                    : '<div class="px-3 py-2 text-xs text-[color:var(--text-sub)]">No years with reviews.</div>';
                yearMenu.querySelectorAll('[data-year]').forEach(btn => {
                    const isActive = (btn.dataset.year || '') === activeYear;
                    btn.classList.toggle('bg-surface-muted', isActive);
                    btn.onclick = () => {
                        this.state.analyticsRange = 'year';
                        this.state.analyticsYear = btn.dataset.year || 'all';
                        el('#analyticsRangeMenu')?.classList.add('hidden');
                        el('#analyticsYearMenu')?.classList.remove('is-open');
                        this.renderAnalytics();
                    };
                });
            }
            const yearsWithRangeActivity = new Set();
            for (const key of dayKeysSorted) {
                if (key < rangeStartKey || key > rangeEndKey) continue;
                if (!hasAnalyticsDayActivity(heatmapDayMap.get(key))) continue;
                const y = Number(key.slice(0, 4));
                if (Number.isFinite(y)) yearsWithRangeActivity.add(y);
            }
            const yearsToRender = (activeYear === 'all' ? rangeYearList : [Number(activeYear)])
                .filter(y => yearsWithRangeActivity.has(y));
            const dayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
            const monthLabels = ['Ja', 'Fe', 'Mr', 'Ap', 'My', 'Jn', 'Jl', 'Au', 'Se', 'Oc', 'No', 'De'];
            let heatmapFirstActiveKey = '';
            for (const key of dayKeysSorted) {
                if (key < rangeStartKey || key > rangeEndKey) continue;
                if (hasAnalyticsDayActivity(heatmapDayMap.get(key))) {
                    heatmapFirstActiveKey = key;
                    break;
                }
            }

            const yearMaxCounts = new Map();
            for (const [key, val] of heatmapDayMap.entries()) {
                if (key < rangeStartKey || key > rangeEndKey) continue;
                const y = Number(key.slice(0, 4));
                const prev = yearMaxCounts.get(y) || 0;
                if (val.count > prev) yearMaxCounts.set(y, val.count);
            }

            const startOfWeekMonday = (date) => {
                const d = this.startOfDay(date);
                const dayIndex = (d.getDay() + 6) % 7; // Monday = 0
                d.setDate(d.getDate() - dayIndex);
                return d;
            };
            const endOfWeekSunday = (date) => {
                const d = this.startOfDay(date);
                const dayIndex = (d.getDay() + 6) % 7; // Monday = 0
                d.setDate(d.getDate() + (6 - dayIndex));
                return d;
            };

            const buildYearGrid = (year) => {
                const heatmapMemoKey = `${year}|${currentCacheKey}|${rangeStartKey}|${rangeEndKey}|${this.state.analyticsAggVersion || 0}`;
                const cachedYearHtml = this.state.analyticsHeatmapYearHtmlCache?.get(heatmapMemoKey);
                if (cachedYearHtml) return cachedYearHtml;

                const yearStart = new Date(year, 0, 1);
                const yearEnd = new Date(year, 11, 31);
                const start = startOfWeekMonday(yearStart);
                const end = endOfWeekSunday(yearEnd);
                const days = [];
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    days.push(new Date(d));
                }
                const weeks = Math.ceil(days.length / 7);
                const maxDayCount = Math.max(1, yearMaxCounts.get(year) || 0);
                const maxDayRating = 4;
                const cells = [];

                dayLabels.forEach((label, idx) => {
                    cells.push(`<div class="heatmap-label heatmap-day-label" style="grid-row:${idx + 2};">${label}</div>`);
                });

                days.forEach((d, idx) => {
                    const inYear = d.getFullYear() === year;
                    const key = this.formatDateKey(d);
                    const inRange = key >= rangeStartKey && key <= rangeEndKey;
                    const inDomain = inYear && inRange;
                    const isPreStart = inDomain && heatmapFirstActiveKey && key < heatmapFirstActiveKey;
                    const stats = inDomain && !isPreStart
                        ? (heatmapDayMap.get(key) || this.createAnalyticsDayStat())
                        : this.createAnalyticsDayStat();
                    const hasActivity = hasAnalyticsDayActivity(stats);
                    const count = stats.count || 0;
                    const avgRating = stats.ratingCount ? stats.ratingSum / stats.ratingCount : 0;
                    const rc = stats.ratingCounts || { again: 0, hard: 0, good: 0, easy: 0 };
                    const distLabel = `Again ${rc.again || 0}, Hard ${rc.hard || 0}, Good ${rc.good || 0}, Easy ${rc.easy || 0}`;
                    let level = 0;
                    if (this.state.analyticsHeatmapMetric === 'rating' && stats.ratingCount > 0) {
                        const ratio = avgRating / Math.max(1, maxDayRating || 4);
                        if (ratio > 0.75) level = 4;
                        else if (ratio > 0.5) level = 3;
                        else if (ratio > 0.25) level = 2;
                        else level = 1;
                    } else if (count > 0) {
                        const ratio = count / maxDayCount;
                        if (ratio > 0.75) level = 4;
                        else if (ratio > 0.5) level = 3;
                        else if (ratio > 0.25) level = 2;
                        else level = 1;
                    }
                    const weekIndex = Math.floor(idx / 7);
                    const row = ((d.getDay() + 6) % 7) + 2;
                    const title = this.state.analyticsHeatmapMetric === 'rating'
                        ? `${key}: ${count} card${count === 1 ? '' : 's'} reviewed • Average ${avgRating ? avgRating.toFixed(2) : '—'} • ${distLabel}`
                        : `${key}: ${count} card${count === 1 ? '' : 's'} reviewed`;
                    const classNames = ['heatmap-cell'];
                    if (!inDomain) {
                        classNames.push('level-0', 'is-outside');
                    } else if (isPreStart) {
                        classNames.push('is-prestart');
                    } else {
                        classNames.push(`level-${level}`);
                        if (!hasActivity) classNames.push('is-zero');
                    }
                    const hasTip = inDomain && !isPreStart && hasActivity;
                    const tipAttr = hasTip ? ` data-tip="${escapeHtml(title)}"` : '';
                    const tabIndex = hasTip ? '0' : '-1';
                    cells.push(`<div class="${classNames.join(' ')}" style="grid-column:${weekIndex + 2}; grid-row:${row}"${tipAttr} tabindex="${tabIndex}"></div>`);

                    if (inYear && d.getDate() === 1) {
                        const label = monthLabels[d.getMonth()];
                        cells.push(`<div class="heatmap-label heatmap-month-label" style="grid-column:${weekIndex + 2};">${label}</div>`);
                    }
                });

                const html = `
 <div class="heatmap-year" data-year="${year}">
 <div class="heatmap-year-title">${year}</div>
 <div class="heatmap-grid" style="--heatmap-weeks:${weeks};">
 ${cells.join('')}
 </div>
 </div>
 `;
                if (this.state.analyticsHeatmapYearHtmlCache) {
                    this.state.analyticsHeatmapYearHtmlCache.set(heatmapMemoKey, html);
                    if (this.state.analyticsHeatmapYearHtmlCache.size > 120) {
                        this.state.analyticsHeatmapYearHtmlCache.clear();
                    }
                }
                return html;
            };

            heatmapEl.innerHTML = yearsToRender.map(buildYearGrid).join('');
        }

        const container = el('#analyticsTab');
        if (container) createIconsInScope(container);
        updateLabels();
        this.persistUiStateDebounced();
    },
    buildLocalTagOptions() {
        return Array.from(this.state.tagRegistry.entries())
            .map(([name, data]) => ({ name, color: data.color }))
            .sort((a, b) => a.name.localeCompare(b.name));
    },
    collectTagOptions() {
        const tagMap = new Map();
        (this.state.tagOptions || []).forEach(t => { if (t?.name) tagMap.set(t.name, t.color || 'default'); });
        this.buildLocalTagOptions().forEach(t => { if (!tagMap.has(t.name)) tagMap.set(t.name, t.color || 'default'); });
        return Array.from(tagMap.entries())
            .map(([name, color]) => ({ name, color }))
            .sort((a, b) => a.name.localeCompare(b.name));
    },
    renderCardTagSelectors() {
        const input = el('#cardTagSearch');
        const dropdown = el('#cardTagDropdown');
        const selectedWrap = el('#cardTagSelected');
        if (!input || !dropdown || !selectedWrap) return;

        const selected = new Set(this.state.tagSelection || []);
        const allOptions = this.collectTagOptions();
        const colorMap = new Map();
        allOptions.forEach(opt => {
            if (opt?.name) colorMap.set(opt.name, opt.color || 'default');
        });
        (this.state.editingCard?.tags || []).forEach(t => {
            if (t?.name && !colorMap.has(t.name)) colorMap.set(t.name, t.color || 'default');
        });
        const query = (input.value || '').toLowerCase();
        const options = allOptions.filter(opt => opt.name.toLowerCase().includes(query));
        const canAdd = query && !allOptions.some(opt => opt.name.toLowerCase() === query);

        dropdown.innerHTML = `
 ${canAdd ? `<button class="tag-add-option w-full text-left px-3 py-2 text-sm text-accent hover:bg-accent-soft" data-add="${encodeDataAttr(input.value.trim())}">+ Add "${escapeHtml(input.value.trim())}"</button>` : ''}
 ${options.map(opt => {
            const active = selected.has(opt.name);
            return `<button class="tag-option w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-1.5 ${active ? 'bg-accent-soft border-lime-200' : 'hover:bg-surface-muted'}" data-tag="${encodeDataAttr(opt.name)}">
 <span class="flex-1">${escapeHtml(opt.name)}</span>
 ${active ? '<span class="text-[11px] text-accent">Selected</span>' : ''}
 </button>`;
        }).join('')}
 `;

        dropdown.querySelectorAll('.tag-option').forEach(btn => {
            btn.onclick = () => {
                const tag = decodeDataAttr(btn.dataset.tag);
                if (selected.has(tag)) selected.delete(tag); else selected.add(tag);
                this.state.tagSelection = Array.from(selected);
                this.renderCardTagSelectors();
            };
        });
        dropdown.querySelectorAll('.tag-add-option').forEach(btn => {
            btn.onclick = () => {
                const name = decodeDataAttr(btn.dataset.add);
                this.addTagByName(name, { toSelection: true });
                if (input) input.value = '';
            };
        });

        selectedWrap.innerHTML = selected.size
            ? Array.from(selected).map(tag => {
                const color = colorMap.get(tag) || 'default';
                const colorClass = `notion-color-${color.replace(/_/g, '-')}-background`;
                return `
 <span class="tag-pill tag-colored inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-card ${colorClass}">
 ${escapeHtml(tag)}
 <button class="remove-tag text-sub" data-tag="${encodeDataAttr(tag)}">&times;</button>
 </span>
 `;
            }).join('')
            : '<span class="text-faint text-xs">No tags selected</span>';

        selectedWrap.querySelectorAll('.remove-tag').forEach(btn => {
            btn.onclick = () => {
                const tag = decodeDataAttr(btn.dataset.tag);
                this.state.tagSelection = this.state.tagSelection.filter(t => t !== tag);
                this.renderCardTagSelectors();
            };
        });
    },
    addTagByName(name, { toSelection = false } = {}) {
        if (!name) return;
        const exists = this.state.tagOptions.some(t => t.name.toLowerCase() === name.toLowerCase());
        if (!exists) {
            this.state.tagOptions.push({ name, color: 'default' });
            Storage.setMeta('tagOptions', this.state.tagOptions).catch(e => console.debug('Storage setMeta tagOptions failed:', e));
        }
        if (toSelection && !this.state.tagSelection.includes(name)) {
            this.state.tagSelection.push(name);
        }
        this.renderCardTagSelectors();
        this.renderTagFilter();
    },
    async refreshTagOptions() {
        const btn = el('#refreshTagOptionsBtn');
        if (btn) btn.disabled = true;
        try {
            if (!this.isReady()) {
                this.state.tagOptions = this.buildLocalTagOptions();
                this.renderCardTagSelectors();
                toast('Offline: using local tags');
                return;
            }
            const { cardSource } = this.state.settings;
            if (!cardSource) throw new Error('Missing card source');
            const db = await API.getDatabase(cardSource);
            const opts = db?.properties?.['Tags']?.multi_select?.options || [];
            this.state.tagOptions = opts.map(o => ({ name: o.name, color: o.color || 'default' }));
            await Storage.setMeta('tagOptions', this.state.tagOptions);
            this.renderCardTagSelectors();
            this.renderTagFilter();
            toast('Tags refreshed');
        } catch (e) {
            console.error('Refresh tags failed', e);
            toast('Could not refresh tags – check your connection and try again');
        } finally {
            if (btn) btn.disabled = false;
        }
    },
    renderStudyDeckSelection() {
        const dropdown = el('#deckDropdown');
        const display = el('#selectedDecksDisplay');
        const input = el('#deckSearchInput');
        if (!dropdown || !display || !input) return;

        const startBtn = el('#startSessionBtn');
        if (this.state.decks.length === 0) {
            dropdown.classList.add('hidden');
            display.innerHTML = '<span class="text-muted text-xs">No decks yet — create one in the Library tab.</span>';
            input.value = '';
            input.disabled = true;
            if (startBtn) {
                startBtn.disabled = true;
                startBtn.classList.add('opacity-60', 'cursor-not-allowed');
            }
            return;
        }

        input.disabled = false;
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.classList.remove('opacity-60', 'cursor-not-allowed');
        }

        const dueCounts = new Map();
        let totalDue = 0;
        const f = normalizeFilterState(this.state.filters);
        this.state.filters = f;
        const defaultStudyFilters = !f.again && !f.hard && !f.addedToday &&
            f.tags.length === 0 && f.tagsExclude.length === 0 && f.tagEmptyMode === FILTER_MODE_IGNORE &&
            !f.marked &&
            f.flag.length === 0 && f.flagExclude.length === 0 && f.flagEmptyMode === FILTER_MODE_IGNORE;
        const tagsKey = `${f.tags.slice().sort().join('|')}::${f.tagsExclude.slice().sort().join('|')}::${f.tagEmptyMode}`;
        const flagKey = `${f.flag.slice().sort().join('|')}::${f.flagExclude.slice().sort().join('|')}::${f.flagEmptyMode}`;
        const timeBucket = Math.floor(Date.now() / STUDY_DUE_BUCKET_MS);
        const cacheKey = JSON.stringify({
            v: this.state.cardsVersion,
            b: timeBucket,
            f: { again: f.again, hard: f.hard, addedToday: f.addedToday, tags: tagsKey, marked: f.marked, flag: flagKey, default: defaultStudyFilters }
        });

        if (this.state.studyDeckCache?.key === cacheKey) {
            const cached = this.state.studyDeckCache;
            cached.dueCounts.forEach((value, key) => dueCounts.set(key, value));
            totalDue = cached.totalDue;
        } else {
            if (defaultStudyFilters) {
                const effectiveNow = this.getEffectiveNowMs();
                for (const d of this.state.decks) {
                    const due = this.getDueCountForDeck(d.id, effectiveNow);
                    if (due > 0) dueCounts.set(d.id, due);
                    totalDue += due;
                }
            } else {
                const candidateIds = this.getStudyFilterCandidates(f);
                if (candidateIds && candidateIds.size === 0) {
                    totalDue = 0;
                } else if (candidateIds) {
                    for (const id of candidateIds) {
                        const card = this.state.cards.get(id);
                        if (!card) continue;
                        if (!this.passFilters(card, { context: 'study' })) continue;
                        if (!isSchedulable(card)) continue;
                        if (!this.isDue(card)) continue;
                        dueCounts.set(card.deckId, (dueCounts.get(card.deckId) || 0) + 1);
                        totalDue += 1;
                    }
                } else {
                    for (const card of this.state.cards.values()) {
                        if (!this.passFilters(card, { context: 'study' })) continue;
                        if (!isSchedulable(card)) continue;
                        if (!this.isDue(card)) continue;
                        dueCounts.set(card.deckId, (dueCounts.get(card.deckId) || 0) + 1);
                        totalDue += 1;
                    }
                }
            }
            this.state.studyDeckCache = { key: cacheKey, dueCounts, totalDue };
        }

        const selectedInclude = this.state.filters.studyDecks || [];
        const selectedExclude = this.state.filters.studyDecksExclude || [];
        const query = (input.value || '').toLowerCase();

        // Render dropdown options
        const filtered = this.state.decks.filter(d => d.name.toLowerCase().includes(query));
        dropdown.innerHTML = filtered.map(d => {
            const mode = getListMode(selectedInclude, selectedExclude, d.id);
            const isIncluded = mode === FILTER_MODE_INCLUDE;
            const isExcluded = mode === FILTER_MODE_EXCLUDE;
            const dueCount = dueCounts.get(d.id) || 0;
            const modeLabel = isIncluded ? '<span class="text-[10px] font-mono text-accent">+</span>' : (isExcluded ? '<span class="text-[10px] font-mono text-sub">-</span>' : '');
            return `<div class="deck-option flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-surface-muted ${isIncluded ? 'bg-accent-soft' : ''} ${isExcluded ? 'bg-[color:var(--surface-strong)]' : ''}" data-deck-id="${d.id}">
 <span class="flex items-center gap-2">
 ${isIncluded ? '<i data-lucide="check" class="w-3 h-3 text-accent"></i>' : (isExcluded ? '<i data-lucide="x" class="w-3 h-3 text-sub"></i>' : '<span class="w-3"></span>')}
 <span class="text-[13px]">${escapeHtml(d.name)}</span>
 </span>
 <span class="flex items-center gap-2 shrink-0 ml-2">
 ${modeLabel}
 <span class="text-xs text-accent font-medium tabular-nums whitespace-nowrap">${dueCount}</span>
 </span>
 </div>`;
        }).join('');
        if (filtered.length === 0) {
            dropdown.innerHTML = '<div class="px-3 py-1.5 text-xs text-muted italic">No decks found</div>';
        }

        // Render selected deck pills
        const pills = [];
        for (const id of selectedInclude) {
            const d = this.deckById(id);
            if (!d) continue;
            pills.push(`<span class="selected-deck-pill filter-pill--include inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border" data-deck-id="${id}" data-mode="${FILTER_MODE_INCLUDE}">
 <span class="filter-pill-mode">+</span>
 ${escapeHtml(d.name)}
 <button class="remove-deck-btn hover:bg-surface-muted rounded-full p-0.5" data-deck-id="${id}">
 <i data-lucide="x" class="w-3 h-3 pointer-events-none"></i>
 </button>
 </span>`);
        }
        for (const id of selectedExclude) {
            const d = this.deckById(id);
            if (!d) continue;
            pills.push(`<span class="selected-deck-pill filter-pill--exclude inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border" data-deck-id="${id}" data-mode="${FILTER_MODE_EXCLUDE}">
 <span class="filter-pill-mode">-</span>
 ${escapeHtml(d.name)}
 <button class="remove-deck-btn hover:bg-surface-muted rounded-full p-0.5" data-deck-id="${id}">
 <i data-lucide="x" class="w-3 h-3 pointer-events-none"></i>
 </button>
 </span>`);
        }
        display.innerHTML = pills.join('');
        if (pills.length === 0) {
            display.innerHTML = `<span class="text-accent text-xs italic">All decks (${totalDue})</span>`;
        }
        createIconsInScope(dropdown);
        createIconsInScope(display);
    },
    getStudyFilterCandidates(filters) {
        const f = normalizeFilterState(filters || this.state.filters);
        const tags = normalizeFilterList(f.tags);
        const flags = normalizeFilterList(f.flag);
        const needsMarked = !!f.marked;
        const needsAgain = !!f.again;
        const needsHard = !!f.hard;
        const needsToday = !!f.addedToday;
        const includeNoTag = normalizeFilterMode(f.tagEmptyMode) === FILTER_MODE_INCLUDE;
        const includeNoFlag = normalizeFilterMode(f.flagEmptyMode) === FILTER_MODE_INCLUDE;

        let candidates = null;
        if (tags.length > 0 && !includeNoTag) {
            const union = new Set();
            for (const tag of tags) {
                const set = this.state.tagIndex.get(tag);
                if (set) set.forEach(id => union.add(id));
            }
            candidates = union;
        }
        if (flags.length > 0 && !includeNoFlag) {
            const union = new Set();
            for (const flag of flags) {
                const set = this.state.flagIndex.get(flag);
                if (set) set.forEach(id => union.add(id));
            }
            candidates = candidates ? this.intersectIdSets(candidates, union) : union;
        }
        if (needsMarked) {
            const marked = this.state.markedIndex || new Set();
            candidates = candidates ? this.intersectIdSets(candidates, marked) : new Set(marked);
        }
        if (needsAgain || needsHard) {
            const union = new Set();
            const againSet = this.state.ratingIndex.get('again');
            if (againSet) againSet.forEach(id => union.add(id));
            if (!needsAgain) {
                const hardSet = this.state.ratingIndex.get('hard');
                if (hardSet) hardSet.forEach(id => union.add(id));
            }
            candidates = candidates ? this.intersectIdSets(candidates, union) : union;
        }
        if (needsToday) {
            const key = this.formatDateKey(new Date());
            const set = (key && this.state.createdDateIndex.get(key)) || new Set();
            candidates = candidates ? this.intersectIdSets(candidates, set) : new Set(set);
        }
        return candidates;
    },
    getAnalyticsFilterCandidates() {
        const tags = Array.isArray(this.state.analyticsTags) ? this.state.analyticsTags.map(t => (t || '').trim()).filter(Boolean) : [];
        const flags = Array.isArray(this.state.analyticsFlags) ? this.state.analyticsFlags.map(t => (t || '').trim()).filter(Boolean) : [];
        const needsMarked = !!this.state.analyticsMarked;

        let candidates = null;
        if (tags.length > 0) {
            const union = new Set();
            for (const tag of tags) {
                const set = this.state.tagIndex.get(tag);
                if (set) set.forEach(id => union.add(id));
            }
            candidates = union;
        }
        if (flags.length > 0) {
            const union = new Set();
            for (const flag of flags) {
                const set = this.state.flagIndex.get(flag);
                if (set) set.forEach(id => union.add(id));
            }
            candidates = candidates ? this.intersectIdSets(candidates, union) : union;
        }
        if (needsMarked) {
            const marked = this.state.markedIndex || new Set();
            candidates = candidates ? this.intersectIdSets(candidates, marked) : new Set(marked);
        }
        return candidates;
    },
    intersectIdSets(a, b) {
        if (!a || !b) return new Set();
        const out = new Set();
        const [small, large] = a.size <= b.size ? [a, b] : [b, a];
        for (const id of small) {
            if (large.has(id)) out.add(id);
        }
        return out;
    },
    bindDeckSearch() {
        const input = el('#deckSearchInput');
        const dropdown = el('#deckDropdown');
        if (!input || !dropdown) return;

        input.onfocus = () => {
            dropdown.classList.remove('hidden');
            this.renderStudyDeckSelection();
        };
        input.oninput = () => this.renderStudyDeckSelection();
        input.onblur = (e) => {
            // Delay hiding to allow click on dropdown
            setTimeout(() => {
                if (!dropdown.contains(document.activeElement)) {
                    dropdown.classList.add('hidden');
                }
            }, 150);
        };

        dropdown.onmousedown = (e) => {
            e.preventDefault(); // Prevent blur
            const option = e.target.closest('.deck-option');
            if (option) {
                const deckId = option.dataset.deckId;
                const current = getListMode(this.state.filters.studyDecks, this.state.filters.studyDecksExclude, deckId);
                const next = cycleFilterMode(current);
                const updated = applyListMode(this.state.filters.studyDecks, this.state.filters.studyDecksExclude, deckId, next);
                this.state.filters.studyDecks = updated.include;
                this.state.filters.studyDecksExclude = updated.exclude;
                this.state.filters = normalizeFilterState(this.state.filters);
                // Reset non-due study mode when decks change
                this.state.studyNonDue = false;
                this.renderStudyDeckSelection();
                this.renderStudy();
                this.updateActiveFiltersCount();
            }
        };

        el('#selectedDecksDisplay').onclick = (e) => {
            const btn = e.target.closest('.remove-deck-btn');
            if (btn) {
                const deckId = btn.dataset.deckId;
                this.state.filters.studyDecks = normalizeFilterList(this.state.filters.studyDecks).filter(id => id !== deckId);
                this.state.filters.studyDecksExclude = normalizeFilterList(this.state.filters.studyDecksExclude).filter(id => id !== deckId);
                this.state.filters = normalizeFilterState(this.state.filters);
                // Reset non-due study mode when decks change
                this.state.studyNonDue = false;
                this.renderStudyDeckSelection();
                this.renderStudy();
                this.updateActiveFiltersCount();
            }
        };
    },
    highlightVariables(el, allowedVars = [], sourceText = null) {
        if (!el) return;

        // Save cursor position
        const getCaretIndex = (element) => {
            let position = 0;
            const isSupported = typeof window.getSelection !== "undefined";
            if (isSupported) {
                const selection = window.getSelection();
                if (selection.rangeCount !== 0) {
                    const range = window.getSelection().getRangeAt(0);
                    const preCaretRange = range.cloneRange();
                    preCaretRange.selectNodeContents(element);
                    preCaretRange.setEnd(range.endContainer, range.endOffset);
                    position = preCaretRange.toString().length;
                }
            }
            return position;
        };

        const setCaretIndex = (element, index) => {
            let charIndex = 0, range = document.createRange();
            range.setStart(element, 0);
            range.collapse(true);
            let nodeStack = [element], node, found = false, stop = false;

            while (!stop && (node = nodeStack.pop())) {
                if (node.nodeType === 3) {
                    const nextCharIndex = charIndex + node.length;
                    if (!found && index >= charIndex && index <= nextCharIndex) {
                        range.setStart(node, index - charIndex);
                        range.collapse(true);
                        found = true;
                    }
                    charIndex = nextCharIndex;
                } else {
                    let i = node.childNodes.length;
                    while (i--) {
                        nodeStack.push(node.childNodes[i]);
                    }
                }
            }
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        };

        const caret = sourceText === null ? getCaretIndex(el) : 0;
        const text = sourceText !== null ? sourceText : el.innerText;

        // Highlight logic - only match allowed variables
        let html = escapeHtml(text);
        if (allowedVars.length > 0) {
            // Escape vars for regex just in case (though these are known safe strings)
            const pattern = new RegExp(`\\{\\{(${allowedVars.join('|')})\\}\\}`, 'g');
            html = html.replace(pattern, '<span class="text-accent bg-accent-soft rounded px-0.5">{{$1}}</span>');
        }

        html = html.replace(/\n/g, '<br>');

        // Only update if changed (prevents loop/jitter if no change)
        if (el.innerHTML !== html) {
            el.innerHTML = html;
            try {
                setCaretIndex(el, caret);
            } catch (e) {
                const range = document.createRange();
                range.selectNodeContents(el);
                range.collapse(false);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    },

    openDeckModal(deck) {
        if (!this.isReady()) { this.openSettings(); return; }
        this.state.editingDeck = deck || null;
        el('#deckModalTitle').textContent = deck ? 'Edit deck' : 'New deck';
        el('#deckNameInput').value = deck?.name ?? '';
        const algo = deck?.algorithm || 'SM-2';
        el('#deckAlgoInput').value = algo;
        el('#deckReviewLimit').value = deck?.reviewLimit ?? 50;
        el('#deckNewLimit').value = deck?.newLimit ?? 20;
        el('#deckOrderMode').value = deck?.orderMode ?? 'none';
        el('#deckReverseInput').checked = deck?.reverse ?? false;

        const promptInput = el('#deckPromptInput');
        const revVars = ['question', 'answer', 'user'];
        // Use innerText for contenteditable
        if (promptInput) {
            const rawPrompt = deck?.aiPrompt ?? DEFAULT_AI_PROMPT;
            this.highlightVariables(promptInput, revVars, rawPrompt);
            promptInput.oninput = debounce(() => this.highlightVariables(promptInput, revVars), 300);
        }

        const dyEnabled = el('#deckDynamicContextInput');
        const dyFields = el('#dyContextFields');
        const dyPromptInput = el('#deckDyPromptInput');
        const dyVars = ['root_front', 'root_back', 'root_notes', 'prev_front', 'prev_back', 'prev_notes', 'deck_name', 'tags', 'card_type'];
        if (dyEnabled) dyEnabled.checked = !!deck?.dynamicContext;
        if (dyPromptInput) {
            const rawDy = deck?.dyAiPrompt ?? '';
            this.highlightVariables(dyPromptInput, dyVars, rawDy);
            dyPromptInput.oninput = debounce(() => this.highlightVariables(dyPromptInput, dyVars), 300);
        }
        const toggleDyContextFields = () => {
            if (!dyFields || !dyEnabled) return;
            dyFields.classList.toggle('hidden', !dyEnabled.checked);
            if (dyEnabled.checked && dyPromptInput && !(dyPromptInput.innerText || '').trim()) {
                // If showing for first time and empty, load default
                this.highlightVariables(dyPromptInput, dyVars, DEFAULT_DYCONTEXT_PROMPT);
            }
        };
        if (dyEnabled) dyEnabled.onchange = toggleDyContextFields;
        toggleDyContextFields();

        const srsConfig = parseSrsConfig(deck?.srsConfig || null, algo);
        const learningStepsInput = el('#deckLearningSteps');
        if (learningStepsInput) learningStepsInput.value = (srsConfig.learningSteps || []).join(', ');
        const relearningStepsInput = el('#deckRelearningSteps');
        if (relearningStepsInput) relearningStepsInput.value = (srsConfig.relearningSteps || []).join(', ');
        const graduatingInput = el('#deckGraduatingInterval');
        if (graduatingInput) graduatingInput.value = srsConfig.graduatingInterval || '';
        const easyIntervalInput = el('#deckEasyInterval');
        if (easyIntervalInput) easyIntervalInput.value = srsConfig.easyInterval || '';
        const easyDaysInput = el('#deckEasyDays');
        if (easyDaysInput) easyDaysInput.value = (srsConfig.easyDays || []).join(', ');

        // Populate FSRS params
        const paramsField = el('#fsrsParamsField');
        const paramsInput = el('#deckFsrsParams');
        const retentionInput = el('#deckFsrsDesiredRetention');
        const optimizeBtn = el('#optimizeFsrsBtn');
        if (paramsInput) {
            paramsInput.value = (srsConfig.fsrs?.weights || fsrsW).join(', ');
        }
        if (retentionInput) {
            retentionInput.value = (srsConfig.fsrs?.retention ?? DEFAULT_DESIRED_RETENTION).toFixed(2);
        }
        if (optimizeBtn) {
            optimizeBtn.onclick = async () => {
                const current = this.state.editingDeck;
                if (!current || current.algorithm !== 'FSRS') return toast('Switch to FSRS first');
                if (!current.id) return toast('Save the deck first');
                await this.optimizeFsrsWeightsForDeck(current);
            };
        }
        if (paramsField) {
            paramsField.classList.toggle('hidden', algo !== 'FSRS');
        }

        el('#archiveDeckBtn').classList.toggle('hidden', !deck);
        const modal = el('#deckModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        focusTrap.attach(modal);
    },
    async optimizeFsrsWeightsForDeck(deck) {
        if (this.state.session) {
            toast('Stop your study session before optimizing');
            return;
        }
        if (this.state.optimizing?.active) {
            toast('Optimization already in progress');
            return;
        }

        const cards = this.cardsForDeck(deck.id);
        const cache = this.state.fsrsTrainingCache.get(deck.id);
        const deckHistoryVersion = this.state.fsrsDeckHistoryVersion.get(deck.id) || 0;
        let payload = cache && cache.version === deckHistoryVersion ? cache.payload : null;
        if (!payload) {
            payload = buildFsrsTrainingPayload(cards, { maxCards: 400 });
            this.state.fsrsTrainingCache.set(deck.id, { version: deckHistoryVersion, payload });
        }

        const totalEvents = payload.totalReviews || 0;
        const cardCount = payload.cardCount || 0;
        if (cardCount === 0 || totalEvents === 0) {
            toast('No review history to optimize');
            return;
        }
        const confirmed = await this.openConfirmModal({
            title: `Optimize FSRS weights for "${deck.name}"?`,
            body: 'This uses your review history for this deck and can take ~10–60 seconds.',
            confirmLabel: 'Optimize'
        });
        if (!confirmed) return;

        const optimizeBtn = el('#optimizeFsrsBtn');
        if (optimizeBtn) optimizeBtn.disabled = true;
        this.state.optimizing = { active: true, deckId: deck.id, startedAt: Date.now() };

        const startedOnline = navigator.onLine;
        const controller = new AbortController();
        const cancelOptimization = () => {
            controller.abort();
            toast('Optimization cancelled');
        };

        const beforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = '';
            return '';
        };

        const offlineHandler = () => {
            if (startedOnline) {
                controller.abort();
                toast('Network disconnected — optimization cancelled');
            }
        };

        window.addEventListener('beforeunload', beforeUnload);
        if (startedOnline) window.addEventListener('offline', offlineHandler);

        try {
            const start = constrainWeights(Array.isArray(deck.srsConfig?.fsrs?.weights) && deck.srsConfig.fsrs.weights.length === 21 ? deck.srsConfig.fsrs.weights : fsrsW);
            showLoading('Optimizing FSRS weights...', `Using ${cardCount} cards (~${totalEvents} reviews)`, cancelOptimization);
            setLoadingProgress(0, `0% • iter 0`);
            await new Promise(r => setTimeout(r, 0));

            const formatEta = (ms) => {
                if (!Number.isFinite(ms) || ms <= 0) return null;
                const totalSec = Math.max(1, Math.round(ms / 1000));
                const hrs = Math.floor(totalSec / 3600);
                const mins = Math.floor((totalSec % 3600) / 60);
                const secs = totalSec % 60;
                if (hrs > 0) return `${hrs}h ${mins}m`;
                if (mins > 0) return `${mins}m ${secs}s`;
                return `${secs}s`;
            };

            const progress = ({ iter, iters, bestLoss, converged, etaMs, mode, workerCount }) => {
                const pct = iters ? ((iter / iters) * 100) : 0;
                if (converged) {
                    setLoadingProgress(100, `Converged at iter ${iter}`);
                    return;
                }
                const lossLabel = Number.isFinite(bestLoss) ? bestLoss.toFixed(4) : 'n/a';
                const etaLabel = formatEta(etaMs);
                const modeLabel = mode === 'worker'
                    ? `MT x${workerCount || 1}`
                    : 'ST';
                const label = iters
                    ? `${Math.round(pct)}% • iter ${iter}/${iters} • best logloss ${lossLabel}${etaLabel ? ` • ETA ${etaLabel}` : ''} • ${modeLabel}`
                    : `Iter ${iter} • best logloss ${lossLabel}${etaLabel ? ` • ETA ${etaLabel}` : ''} • ${modeLabel}`;
                setLoadingProgress(pct, label);
            };

            const result = await runFsrsOptimization({
                payload,
                startWeights: start,
                onProgress: progress,
                signal: controller.signal,
                options: {
                    seedKey: `${deck.id}:${this.state.cardsVersion}`,
                    workerCount: Math.max(1, Math.min(navigator?.hardwareConcurrency || 2, 4))
                }
            });

            if (controller.signal.aborted) return;

            setLoadingProgress(100, `100% • iter ${result.iterations}/${result.iterations}`);

            const rounded = result.bestWeights.map(n => +n.toFixed(4));
            // Update modal fields (user still presses Save to persist/sync).
            deck.srsConfig = parseSrsConfig(deck.srsConfig || null, deck.algorithm);
            deck.srsConfig.fsrs.weights = rounded;
            const paramsInput = el('#deckFsrsParams');
            if (paramsInput) paramsInput.value = rounded.join(', ');
            const bestLossLabel = Number.isFinite(result.bestLoss) ? result.bestLoss.toFixed(4) : 'n/a';
            toast(`Optimized FSRS weights loaded (best logloss ${bestLossLabel}). Press Save to apply.`);
        } catch (err) {
            if (err?.name !== 'AbortError') {
                console.error('FSRS optimization failed', err);
                toast('Optimization failed — see console for details');
            }
        } finally {
            hideLoading();
            if (optimizeBtn) optimizeBtn.disabled = false;
            this.state.optimizing = { active: false, deckId: null, startedAt: null };
            window.removeEventListener('beforeunload', beforeUnload);
            if (startedOnline) window.removeEventListener('offline', offlineHandler);
        }
    },
    editDeck(deckId) {
        const deck = this.state.decks.find(d => d.id === deckId);
        if (deck) this.openDeckModal(deck);
    },
    closeDeckModal() {
        focusTrap.detach();
        el('#deckModal').classList.add('hidden');
        el('#deckModal').classList.remove('flex');
    },
    async saveDeckFromModal() {
        const wasDynamic = this.state.editingDeck?.dynamicContext === true;
        const d = this.state.editingDeck || this.newDeck('', 'SM-2');
        const prevAlgorithm = d.algorithm || 'SM-2';
        d.name = el('#deckNameInput').value || d.name || 'Untitled deck';
        d.algorithm = el('#deckAlgoInput').value || 'SM-2';
        d.reviewLimit = Number(el('#deckReviewLimit').value) || 50;
        d.newLimit = Number(el('#deckNewLimit').value) || 20;
        d.orderMode = el('#deckOrderMode').value || 'none';
        d.reverse = el('#deckReverseInput').checked;
        d.aiPrompt = el('#deckPromptInput')?.innerText || '';
        d.dynamicContext = !!el('#deckDynamicContextInput')?.checked;
        const rawDyPrompt = (el('#deckDyPromptInput')?.innerText || '').trim();
        d.dyAiPrompt = d.dynamicContext
            ? (rawDyPrompt || DEFAULT_DYCONTEXT_PROMPT)
            : rawDyPrompt;

        const srsConfig = parseSrsConfig(d.srsConfig || null, d.algorithm);

        const learningSteps = el('#deckLearningSteps')?.value || '';
        const relearningSteps = el('#deckRelearningSteps')?.value || '';
        const graduatingInterval = el('#deckGraduatingInterval')?.value || '';
        const easyInterval = el('#deckEasyInterval')?.value || '';
        const easyDays = el('#deckEasyDays')?.value || '';
        const toList = (val) => val.split(',').map(s => s.trim()).filter(Boolean);
        if (learningSteps.trim()) srsConfig.learningSteps = toList(learningSteps);
        if (relearningSteps.trim()) srsConfig.relearningSteps = toList(relearningSteps);
        if (graduatingInterval.trim()) srsConfig.graduatingInterval = graduatingInterval.trim();
        if (easyInterval.trim()) srsConfig.easyInterval = easyInterval.trim();
        if (easyDays.trim()) srsConfig.easyDays = toList(easyDays).map(d => d.slice(0, 3));

        if (d.algorithm === 'FSRS') {
            const rawRetention = el('#deckFsrsDesiredRetention')?.value?.trim() || '';
            const rawParams = el('#deckFsrsParams')?.value?.trim() || '';
            if (rawRetention) {
                srsConfig.fsrs.retention = clampRetention(parseFloat(rawRetention)) || DEFAULT_DESIRED_RETENTION;
            }
            if (rawParams) {
                let weights = null;
                if (rawParams.trim().startsWith('{') || rawParams.trim().startsWith('[')) {
                    try {
                        const parsed = JSON.parse(rawParams);
                        if (Array.isArray(parsed)) weights = parsed;
                        else if (parsed && Array.isArray(parsed.weights)) weights = parsed.weights;
                    } catch (_) { }
                }
                if (!weights) {
                    const nums = rawParams.split(/[^0-9\.\-]+/).map(n => parseFloat(n)).filter(n => Number.isFinite(n));
                    if (nums.length >= 21) weights = nums.slice(0, 21);
                }
                if (weights) srsConfig.fsrs.weights = constrainWeights(weights);
            }
        }
        d.srsConfig = srsConfig;

        if (!this.state.editingDeck) this.state.decks.push(d);
        d.updatedInApp = true;
        await Storage.put('decks', d);
        this.queueOp({ type: 'deck-upsert', payload: d });
        if (d.dynamicContext && !wasDynamic) {
            await this.normalizeDyContextRootsForDeck(d.id);
        }
        if (this.state.editingDeck && prevAlgorithm !== d.algorithm) {
            this.reindexDeckDue(d.id);
        }
        this.closeDeckModal();
        this.renderDecks();
        this.renderStudy();
        toast('Deck saved');
    },
    async archiveDeckFromModal() {
        const deck = this.state.editingDeck;
        if (!deck) return;
        // Check if this was the selected deck
        const wasSelected = this.state.selectedDeck?.id === deck.id;
        const deckCards = this.cardsForDeck(deck.id);
        // Remove from study deck filters if it was there
        if (this.state.filters.studyDecks) {
            this.state.filters.studyDecks = this.state.filters.studyDecks.filter(id => id !== deck.id);
        }
        if (this.state.filters.studyDecksExclude) {
            this.state.filters.studyDecksExclude = this.state.filters.studyDecksExclude.filter(id => id !== deck.id);
        }
        this.state.filters = normalizeFilterState(this.state.filters);

        // Archive in Notion (deck + cards), then remove locally
        if (deck.notionId) {
            this.queueOp({ type: 'deck-delete', payload: { id: deck.id, notionId: deck.notionId } }, 'deck-delete');
        }
        for (const c of deckCards) {
            if (c?.notionId) {
                this.queueOp({ type: 'card-delete', payload: { id: c.id, notionId: c.notionId } }, 'deck-delete');
            }
        }

        await Storage.deleteCardsByDeck(deck.id);
        // Clean from memory using index (efficient)
        // Use a copy since removeCard modifies the index
        for (const c of [...deckCards]) {
            this.removeCard(c.id);
        }

        const deckIdx = this.state.decks.findIndex(d => d.id === deck.id);
        if (deckIdx >= 0) this.state.decks.splice(deckIdx, 1);
        await Storage.delete('decks', deck.id);

        // Clear selection if this was the selected deck
        if (wasSelected) {
            this.state.selectedDeck = null;
        }
        this.closeDeckModal();
        this.renderDecks();
        this.renderCards();
        this.renderSelectedDeckBar();
        this.renderStudyDeckSelection();
        this.renderStudy();
        toast('Deck archived');
    },
    openResetAlgorithmModal() {
        const deck = this.state.selectedDeck;
        if (!deck) {
            toast('Select a deck first');
            return;
        }
        el('#resetDeckName').textContent = deck.name;
        this.openModal('resetAlgorithmModal');
    },
    async confirmResetAlgorithm() {
        const deck = this.state.selectedDeck;
        if (!deck) return;
        const cards = await Storage.getCardsByDeck(deck.id);
        if (cards.length === 0) {
            toast('No cards in this deck');
            this.closeModal('resetAlgorithmModal');
            return;
        }

        // Show progress UI
        const container = el('#resetProgressContainer');
        const bar = el('#resetProgressBar');
        const percent = el('#resetProgressPercent');
        const confirmBtn = el('#confirmResetAlgorithm');
        const cancelBtn = el('#cancelResetAlgorithm');

        if (container) container.classList.remove('hidden');
        if (confirmBtn) confirmBtn.classList.add('hidden');
        if (cancelBtn) cancelBtn.classList.add('hidden');

        // Reset algorithm parameters for all cards in the deck
        const total = cards.length;
        const CHUNK_SIZE = 50; // Larger chunks for batch writes
        const weights = deck.srsConfig?.fsrs?.weights || fsrsW;

        for (let i = 0; i < total; i += CHUNK_SIZE) {
            const chunk = cards.slice(i, i + CHUNK_SIZE);

            // Update UI
            if (percent) percent.textContent = Math.round((i / total) * 100) + '%';
            if (bar) bar.style.width = ((i / total) * 100) + '%';

            // Allow UI to breathe
            await new Promise(resolve => setTimeout(resolve, 0));

            // Reset all cards in this chunk
            for (const card of chunk) {
                // Reset SM-2 parameters
                card.sm2 = {
                    easeFactor: 2.5,
                    interval: 1,
                    repetitions: 0,
                    dueDate: null,
                    lastRating: null,
                    lastReview: null
                };
                // Reset FSRS parameters with proper initial values
                card.fsrs = {
                    stability: initStability(weights, 'good'),
                    difficulty: initDifficulty(weights, 'good'),
                    dueDate: null,
                    lastReview: null,
                    lastRating: null,
                    retrievability: 0.9
                };
                card.srsState = this.buildSrsState(card, { state: 'new', step: 0, due: null, lapses: 0 });
            }

            // Batch save to IndexedDB - single transaction for the chunk
            try {
                await Storage.putMany('cards', chunk);
            } catch (e) {
                console.error('Failed to batch save cards:', e);
                toast('Error saving cards: ' + e.message);
                // Try individual saves as fallback
                for (const card of chunk) {
                    await Storage.put('cards', card).catch(err => console.error('Individual save failed:', err));
                }
            }

            for (const card of chunk) {
                this.queueOp({ type: 'card-upsert', payload: card });
            }
        }

        for (const card of cards) {
            if (this.state.cards.has(card.id)) {
                this.setCard(card);
            }
        }

        this.closeModal('resetAlgorithmModal');

        // Reset UI for next time
        if (container) container.classList.add('hidden');
        if (confirmBtn) confirmBtn.classList.remove('hidden');
        if (cancelBtn) cancelBtn.classList.remove('hidden');
        if (bar) bar.style.width = '0%';

        // Re-render all views that show due counts
        this.renderCards();
        this.renderDecks();
        this.renderStudyDeckSelection();
        this.renderStudy();
        toast(`Reset ${total} card${total !== 1 ? 's' : ''} — syncing to Notion`);
    },
    openCardModal(card) {
        if (!this.isReady()) { this.openSettings(); return; }
        this.state.editingCard = card || null;
        el('#cardModalTitle').textContent = card ? 'Edit card' : 'New card';
        const notionBtn = el('#openCardNotionBtn');
        if (notionBtn) {
            notionBtn.classList.toggle('hidden', !card || !card.notionId);
            notionBtn.onclick = () => {
                if (card && card.notionId) {
                    const url = `https://www.notion.so/${card.notionId.replace(/-/g, '')}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                }
            };
        }
        const deckSelect = el('#cardDeckInput');
        deckSelect.innerHTML = this.state.decks.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        deckSelect.value = card?.deckId || this.state.selectedDeck?.id || this.state.decks[0]?.id;
        deckSelect.onchange = () => this.updateCardOrderVisibility(deckSelect.value);
        el('#cardTypeInput').value = card?.type ?? 'Front-Back';
        el('#cardNameInput').value = card?.name ?? '';
        el('#cardBackInput').value = card?.back ?? '';
        el('#cardNotesInput').value = card?.notes ?? '';
        // Initialize tag selection for modal
        this.state.tagSelection = card?.tags?.map(t => t.name) || [];
        const tagSearch = el('#cardTagSearch');
        if (tagSearch) tagSearch.value = '';
        this.renderCardTagSelectors();
        el('#cardOrderInput').value = (card?.order !== null && card?.order !== undefined) ? card.order : '';
        el('#cardSuspendedInput').checked = card?.suspended ?? false;
        el('#cardLeechInput').checked = card?.leech ?? false;
        const suspendedInput = el('#cardSuspendedInput');
        const leechInput = el('#cardLeechInput');
        if (suspendedInput && leechInput) {
            suspendedInput.onchange = () => {
                if (!suspendedInput.checked) leechInput.checked = false;
            };
            leechInput.onchange = () => {
                if (leechInput.checked) suspendedInput.checked = true;
            };
        }
        el('#cardMarkedInput').checked = card?.marked ?? false;
        el('#cardFlagInput').value = card?.flag || '';
        const flagSwatches = el('#cardFlagSwatches');
        if (flagSwatches) {
            this.updateFlagSwatchSelection(flagSwatches, card?.flag || '');
            flagSwatches.onclick = (e) => {
                const btn = e.target.closest('[data-flag]');
                if (!btn) return;
                const value = btn.dataset.flag || '';
                const input = el('#cardFlagInput');
                if (input) input.value = value;
                this.updateFlagSwatchSelection(flagSwatches, value);
            };
        }
        el('#deleteCardBtn').classList.toggle('hidden', !card);
        const suspField = el('#cardSuspendedLeechField');
        if (suspField) suspField.classList.toggle('hidden', !card);
        this.updateCardOrderVisibility(deckSelect.value);
        // Show/hide back section based on card type
        this.updateCardBackVisibility();
        // Populate review history section
        this.renderCardModalReviewHistory(card);
        const modal = el('#cardModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        createIconsInScope(modal);
        focusTrap.attach(modal);
    },
    renderCardModalReviewHistory(card) {
        const section = el('#cardReviewHistorySection');
        const countEl = el('#cardReviewHistoryCount');
        const tableEl = el('#cardReviewHistoryTable');

        if (!card || !card.reviewHistory || card.reviewHistory.length === 0) {
            section.classList.add('hidden');
            return;
        }

        section.classList.remove('hidden');
        const history = card.reviewHistory;
        countEl.textContent = history.length;

        const ratingColors = { again: 'rating-text-again', hard: 'rating-text-hard', good: 'rating-text-good', easy: 'rating-text-easy' };
        // Show all reviews (most recent first)
        const sortedHistory = [...history].reverse();
        tableEl.innerHTML = `
 <table class="w-full text-xs">
 <thead class="sticky top-0 bg-surface-strong "><tr class="text-faint border-b border-weak"><th class="text-left py-1.5 px-2">Rating</th><th class="text-left py-1.5 px-2">Date</th><th class="text-left py-1.5 px-2">Time</th></tr></thead>
 <tbody>
 ${sortedHistory.map(h => `
 <tr class="border-b border-faint last:border-0">
 <td class="py-1 px-2 capitalize ${ratingColors[h.rating] || ''}">${h.rating}</td>
 <td class="py-1 px-2 text-sub">${new Date(h.at).toLocaleDateString()}</td>
 <td class="py-1 px-2 text-sub">${new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
 </tr>
 `).join('')}
 </tbody>
 </table>
 `;
    },
    updateCardBackVisibility() {
        const isCloze = el('#cardTypeInput').value === 'Cloze';
        const backSection = el('#cardBackSection');
        if (backSection) backSection.classList.toggle('hidden', isCloze);
    },
    updateCardOrderVisibility(deckId) {
        const field = el('#cardOrderField');
        if (!field) return;
        const deck = this.deckById(deckId) || this.state.selectedDeck;
        const show = deck?.orderMode === 'property';
        field.classList.toggle('hidden', !show);
    },
    closeCardModal() {
        const modal = el('#cardModal');
        focusTrap.detach();
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    },
    async saveCardFromModal() {
        let card = this.state.editingCard || this.newCard('', '', '', 'Front-Back');
        const oldName = card.name;
        const oldBack = card.back;
        const oldNotes = card.notes;
        card.deckId = el('#cardDeckInput').value;
        card.type = el('#cardTypeInput').value;
        card.name = el('#cardNameInput').value || 'Untitled';
        card.back = el('#cardBackInput').value || '';
        card.notes = el('#cardNotesInput').value || '';
        if (!this.state.editingCard) {
            const autoType = detectCardType(card.name, card.back);
            if (card.type === 'Front-Back' && autoType === 'Cloze') card.type = 'Cloze';
        }
        if (isClozeParent(card)) {
            const clozeSet = parseClozeIndices(card.name);
            if (card.back) parseClozeIndices(card.back).forEach(i => clozeSet.add(i));
            const indices = Array.from(clozeSet).sort((a, b) => a - b);
            card.clozeIndexes = indices.length ? indices.join(',') : '';
        } else if ((card.type || '').toLowerCase() !== 'cloze' && !card.parentCard) {
            card.clozeIndexes = '';
        }
        const selectedTags = this.state.tagSelection || [];
        const optionMap = new Map(this.collectTagOptions().map(t => [t.name, t.color || 'default']));
        const existingColors = new Map((this.state.editingCard?.tags || []).map(t => [t.name, t.color || 'default']));
        card.tags = selectedTags.map(name => ({ name, color: optionMap.get(name) || existingColors.get(name) || 'default' }));
        const orderField = el('#cardOrderField');
        const orderVal = (orderField && orderField.classList.contains('hidden')) ? '' : el('#cardOrderInput').value;
        card.order = (orderVal && orderVal.trim() !== '') ? orderVal.trim() : null;
        card.marked = el('#cardMarkedInput').checked;
        card.flag = el('#cardFlagInput').value || '';
        const suspendedChecked = el('#cardSuspendedInput').checked;
        const leechChecked = el('#cardLeechInput').checked;
        if (!suspendedChecked && leechChecked) {
            // Unsuspending always clears leech.
            card.suspended = 0;
            card.leech = false;
        } else {
            card.leech = leechChecked;
            card.suspended = (suspendedChecked || leechChecked) ? 1 : 0;
        }
        if (card.name !== oldName || card.back !== oldBack || card.notes !== oldNotes) {
            card.updatedInApp = true;
        }
        // Ensure selected tags are stored for future modal suggestions
        selectedTags.forEach(name => {
            if (!this.state.tagOptions.some(t => t.name === name)) {
                this.state.tagOptions.push({ name, color: optionMap.get(name) || 'default' });
            }
        });
        Storage.setMeta('tagOptions', this.state.tagOptions).catch(e => console.debug('Storage setMeta tagOptions failed:', e));

        this.setCard(card);

        await Storage.put('cards', card);
        this.queueOp({ type: 'card-upsert', payload: card });
        if (isClozeParent(card)) {
            await this.reconcileSingleParent(card);
        }
        this.renderCards();
        this.renderDecks(); // Refresh stats (due counts, etc.)
        this.renderStudyDeckSelection();
        this.closeCardModal();
        toast('Card saved');
    },
    async deleteCardFromModal() {
        const card = this.state.editingCard;
        if (!card) return;
        this.pendingDelete = { type: 'card', id: card.id, notionId: card.notionId };
        const confirmed = await this.openConfirmModal({
            title: 'Confirm delete',
            body: 'This removes it locally and syncs deletion to Notion.',
            confirmLabel: 'Delete'
        });
        if (!confirmed) {
            this.pendingDelete = null;
            return;
        }
        await this.performDelete();
    },
    async syncNow() {
        if (!navigator.onLine) {
            toast('Offline: sync will resume when you reconnect');
            return;
        }
        if (!this.isReady()) return toast('Complete settings first');
        if (this.state.syncing) { toast('Sync already in progress'); return; }
        this.state.syncing = true;
        this.updateSyncButtonState();
        this.setSyncButtonSpinning(true);
        const loadingMsg = el('#loadingMessage');
        el('#syncProgress').style.width = '10%';
        try {
            // Push first to save local changes
            if (loadingMsg && !el('#loadingOverlay').classList.contains('hidden')) {
                loadingMsg.textContent = 'Pushing local changes...';
            }
            const pushResult = await this.pushQueue();
            el('#syncProgress').style.width = '50%';

            if (pushResult.failedCount > 0) {
                toast(`Push completed with ${pushResult.failedCount} errors. Some items may not be synced.`);
            }
            if (!pushResult.success) {
                if (loadingMsg && !el('#loadingOverlay').classList.contains('hidden')) {
                    loadingMsg.textContent = 'Push failed — pull skipped';
                }
                toast('Push failed, skipping pull to avoid overwriting local changes');
                return;
            }

            // Then pull to get updates
            if (loadingMsg && !el('#loadingOverlay').classList.contains('hidden')) {
                loadingMsg.textContent = 'Fetching decks...';
            }
            await this.pullFromNotion({ forceFull: true });
            el('#syncProgress').style.width = '100%';

            if (loadingMsg && !el('#loadingOverlay').classList.contains('hidden')) {
                loadingMsg.textContent = 'Preparing your library...';
            }
            const nowIso = new Date().toISOString();
            this.state.lastPull = nowIso;
            if (pushResult.success) {
                this.state.lastPush = nowIso;
                this.state.lastSync = nowIso;
                await Storage.put('meta', { key: 'lastPush', value: nowIso });
                await Storage.put('meta', { key: 'lastSync', value: nowIso });
                toast('Synced with Notion');
            } else {
                toast('Synced with warnings (check status)');
            }
            await Storage.put('meta', { key: 'lastPull', value: nowIso });
        } catch (e) {
            console.error('Sync failed', e);
            toast('Sync failed – check your internet connection or Notion settings');
        } finally {
            this.setSyncButtonSpinning(false);
            setTimeout(() => el('#syncProgress').style.width = '0%', 700);
            this.state.syncing = false;
            this.updateSyncButtonState();
            if (this.state.queue.size > 0) {
                this.requestAutoSyncSoon(MIN_PUSH_INTERVAL_MS + 100);
            }
        }
    },
    async pullFromNotion(opts = {}) {
        const { deckSource, cardSource } = this.state.settings;
        if (!deckSource || !cardSource) return;
        const forceFull = !!opts.forceFull;
        const since = forceFull ? null : this.state.lastPull;
        const isFullSync = !since;
        const firstSync = !this.state.lastPull;
        const localDeckMap = new Map(this.state.decks.map(d => [d.notionId || d.id, d]));

        // Deck visibility logic...
        let deckFilter = null;
        if (since) {
            deckFilter = { timestamp: 'last_edited_time', last_edited_time: { on_or_after: since } };
        }

        // Fetch decks (small dataset, streaming not critical but good for consistency)
        const decks = await API.queryDatabase(deckSource, deckFilter);
        const deckPages = decks || [];
        const isHiddenDeck = (p) => !!p?.properties?.['Archived?']?.checkbox;
        const seenDeckNotionIds = new Set(deckPages.map(p => p?.id).filter(Boolean));
        const deletedDeckNotionIds = new Set(deckPages.filter(p => p?.archived).map(p => p.id));
        const hiddenDeckNotionIds = new Set(deckPages.filter(p => !p?.archived && isHiddenDeck(p)).map(p => p.id));

        if (since) {
            try {
                const hiddenAll = await API.queryDatabase(deckSource, { property: 'Archived?', checkbox: { equals: true } });
                for (const p of (hiddenAll || [])) {
                    if (p?.id) hiddenDeckNotionIds.add(p.id);
                }
            } catch (_) { /* best-effort */ }
        }

        const mappedDecks = deckPages
            .filter(p => !p?.archived && !isHiddenDeck(p))
            .map(d => NotionMapper.deckFrom(d));

        // Queue sync for inferred 'Order Mode' (defaulting to 'None')
        for (const p of deckPages) {
            if (p?.archived || isHiddenDeck(p)) continue;
            const rawOrder = p.properties['Order Mode']?.select?.name;
            if (!rawOrder) {
                const mapped = mappedDecks.find(d => d.notionId === p.id);
                if (mapped) {
                    this.queueOp({ type: 'deck-upsert', payload: mapped }, 'inferred-order');
                }
            }
        }

        const decksToNormalize = new Set();

        for (const d of mappedDecks) {
            // Restore logic: Fix invalid Notion configs by pushing local defaults
            if (d.srsConfigError) {
                console.warn(`Fixing invalid SRS config for deck ${d.name}`);
                toast(`Fixing invalid config in deck: ${d.name}`);
                this.queueOp({ type: 'deck-upsert', payload: d });
            }

            if (!d.dynamicContext) continue;
            const local = localDeckMap.get(d.notionId || d.id);
            if (firstSync || !local || !local.dynamicContext) {
                decksToNormalize.add(d.notionId || d.id);
            }
        }

        const upsertDeck = (deck) => {
            const idx = this.state.decks.findIndex(d => d.notionId === deck.notionId);
            if (idx >= 0) this.state.decks[idx] = { ...this.state.decks[idx], ...deck };
            else this.state.decks.push(deck);
        };
        for (const d of mappedDecks) upsertDeck(d);
        if (mappedDecks.length > 0) await Storage.putMany('decks', mappedDecks);

        // Identify decks active for sync
        const existingActiveDeckNotionIds = new Set(
            this.state.decks.filter(d => d.notionId && !d.archived).map(d => d.notionId)
        );
        const newDeckIds = mappedDecks.filter(d => !existingActiveDeckNotionIds.has(d.notionId)).map(d => d.notionId);
        const activeDeckNotionIds = new Set([...existingActiveDeckNotionIds, ...mappedDecks.map(d => d.notionId)]);
        for (const id of hiddenDeckNotionIds) activeDeckNotionIds.delete(id);
        for (const id of deletedDeckNotionIds) activeDeckNotionIds.delete(id);
        if (isFullSync && seenDeckNotionIds.size > 0) {
            for (const id of activeDeckNotionIds) {
                if (!seenDeckNotionIds.has(id)) activeDeckNotionIds.delete(id);
            }
        }

        // STREAMING CARDS
        let cardFilter = null;
        if (since) {
            cardFilter = { timestamp: 'last_edited_time', last_edited_time: { on_or_after: since } };
        }

        // Mark-and-sweep for full syncs: track seen IDs to detect server-side deletions
        const seenNotionIds = isFullSync ? new Set() : null;
        const clozeParentsToReconcile = new Set();
        let analyticsTouched = false;

        const upsertCard = (card) => {
            if (seenNotionIds && card.notionId) {
                seenNotionIds.add(card.notionId);
            }

            let existing = this.state.cards.get(card.id);
            if (!existing && card.notionId) {
                existing = this.cardByNotionId(card.notionId);
            }

            if (existing) {
                const localHistory = existing.reviewHistory || [];
                const remoteHistory = card.reviewHistory || [];
                // Preserve local history if remote is empty
                const preservedHistory = (remoteHistory.length === 0 && localHistory.length > 0) ? localHistory : remoteHistory;
                const updated = { ...existing, ...card, reviewHistory: preservedHistory };
                if (!this.reviewHistoriesEqual(localHistory, preservedHistory) ||
                    (existing.fsrs?.lastReview || null) !== (card.fsrs?.lastReview || null) ||
                    (existing.sm2?.lastReview || null) !== (card.sm2?.lastReview || null) ||
                    (existing.fsrs?.lastRating || null) !== (card.fsrs?.lastRating || null) ||
                    (existing.sm2?.lastRating || null) !== (card.sm2?.lastRating || null)) {
                    analyticsTouched = true;
                }
                this.setCard(updated);
            } else {
                if ((card.reviewHistory && card.reviewHistory.length > 0) || card.fsrs?.lastReview || card.sm2?.lastReview) {
                    analyticsTouched = true;
                }
                this.setCard(card);
            }
        };

        const processCardChunk = async (results) => {
            const chunkDeleted = new Set(results.filter(p => p?.archived).map(p => p.id));
            // Map and filter chunk
            // Pass `this.state.decks` (latest) to `cardFrom` to resolve relations
            const chunkMapped = results.filter(p => !p?.archived).map(c => NotionMapper.cardFrom(c, this.state.decks)).filter(Boolean);

            // Queue sync for inferred card types (Notion missing type -> App inferred it)
            results.forEach(p => {
                if (p?.archived) return;
                const rawType = p.properties['Card Type']?.select?.name;
                if (!rawType) {
                    const mapped = chunkMapped.find(c => c.notionId === p.id);
                    if (mapped) {
                        this.queueOp({ type: 'card-upsert', payload: mapped }, 'inferred-type');
                    }
                }
            });

            // Filter by active decks
            const chunkFiltered = chunkMapped.filter(c => {
                if (!c.deckId) return true;
                return activeDeckNotionIds.has(c.deckId);
            });

            for (const c of chunkFiltered) {
                if (isClozeParent(c)) {
                    clozeParentsToReconcile.add(c.id);
                } else if (isSubItem(c) && c.parentCard) {
                    clozeParentsToReconcile.add(c.parentCard);
                }
            }

            // Upsert to memory and DB
            for (const c of chunkFiltered) upsertCard(c);
            if (chunkFiltered.length > 0) await Storage.putMany('cards', chunkFiltered);

            // Handle deletions in this chunk
            if (since && chunkDeleted.size > 0) {
                if (chunkDeleted.size > 0) analyticsTouched = true;
                for (const nid of chunkDeleted) {
                    const local = this.cardByNotionId(nid);
                    if (local) {
                        await Storage.delete('cards', local.id);
                        this.removeCard(local.id);
                        // Update cardDeckIndex
                        if (this.state.cardDeckIndex?.has(local.deckId)) {
                            this.state.cardDeckIndex.get(local.deckId).delete(local.id);
                        }
                    }
                }
            }

            // Update UI incrementally (optional, or just wait for end)
            // this.updateCounts(); // fast enough?
        };

        // Stream main card query
        await API.queryDatabase(cardSource, cardFilter, processCardChunk);

        // Fetch new decks' cards if incremental
        if (since && newDeckIds.length > 0) {
            for (const deckId of newDeckIds) {
                await API.queryDatabase(cardSource, {
                    property: 'Deck',
                    relation: { contains: deckId }
                }, processCardChunk);
            }
        }

        // Full Sync Sweep: Remove local cards that are no longer on the server
        if (isFullSync && seenNotionIds) {
            const orphans = [];
            // Optimize: Iterate only relevant decks instead of all cards
            for (const deck of this.state.decks) {
                if (deck.notionId && activeDeckNotionIds.has(deck.notionId)) {
                    const deckCards = this.cardsForDeck(deck.id);
                    for (const c of deckCards) {
                        // Check for orphans: has Notion ID, not seen in sync, not sub-item
                        if (c.notionId && !seenNotionIds.has(c.notionId) && !isSubItem(c)) {
                            orphans.push(c);
                        }
                    }
                }
            }

            if (orphans.length > 0) {
                console.log(`Sweeping ${orphans.length} orphaned cards`);
                // Collect orphan IDs for sub-item cleanup
                const orphanIds = new Set(orphans.map(c => c.id));
                for (const c of orphans) {
                    // Also remove sub-items of orphaned parents
                    if (isClozeParent(c) && Array.isArray(c.subCards)) {
                        for (const subId of c.subCards) {
                            if (!orphanIds.has(subId)) {
                                await Storage.delete('cards', subId);
                                this.removeCard(subId);
                            }
                        }
                    }
                    await Storage.delete('cards', c.id);
                    this.removeCard(c.id);
                }
                analyticsTouched = true;
            }
        }

        // Handle Deck deletions/hiding (cleanup)
        if (since || isFullSync) {
            const removeDeckLocal = async (deck) => {
                if (!deck) return;
                if (this.state.filters.studyDecks) {
                    this.state.filters.studyDecks = this.state.filters.studyDecks.filter(id => id !== deck.id);
                }
                if (this.state.filters.studyDecksExclude) {
                    this.state.filters.studyDecksExclude = this.state.filters.studyDecksExclude.filter(id => id !== deck.id);
                }
                this.state.filters = normalizeFilterState(this.state.filters);
                if (Array.isArray(this.state.analyticsDecks)) {
                    this.state.analyticsDecks = this.state.analyticsDecks.filter(id => id !== deck.id);
                }
                if (this.state.selectedDeck?.id === deck.id) {
                    this.state.selectedDeck = null;
                }
                await Storage.delete('decks', deck.id);
                await Storage.deleteCardsByDeck(deck.id);
                const deckCards = this.cardsForDeck(deck.id);
                // Use a copy since removeCard modifies the index
                for (const c of [...deckCards]) this.removeCard(c.id);
            };

            if (hiddenDeckNotionIds.size > 0) {
                const toHideDecks = this.state.decks.filter(d => d.notionId && hiddenDeckNotionIds.has(d.notionId));
                for (const d of toHideDecks) await removeDeckLocal(d);
                this.state.decks = this.state.decks.filter(d => !hiddenDeckNotionIds.has(d.notionId));
            }
            if (deletedDeckNotionIds.size > 0) {
                const toDeleteDecks = this.state.decks.filter(d => d.notionId && deletedDeckNotionIds.has(d.notionId));
                for (const d of toDeleteDecks) await removeDeckLocal(d);
                this.state.decks = this.state.decks.filter(d => !deletedDeckNotionIds.has(d.notionId));
            }
            if (isFullSync && seenDeckNotionIds.size > 0) {
                const missingDecks = this.state.decks.filter(d => d.notionId && !seenDeckNotionIds.has(d.notionId));
                if (missingDecks.length > 0) {
                    for (const d of missingDecks) await removeDeckLocal(d);
                    const missingIds = new Set(missingDecks.map(d => d.notionId));
                    this.state.decks = this.state.decks.filter(d => !missingIds.has(d.notionId));
                }
            }
        }

        // Post-process
        if (clozeParentsToReconcile.size > 0) {
            await this.reconcileClozeSubItems(Array.from(clozeParentsToReconcile));
        }
        if (decksToNormalize.size > 0) {
            let normalized = 0;
            for (const deckId of decksToNormalize) {
                normalized += await this.normalizeDyContextRootsForDeck(deckId);
            }
            if (normalized > 0) {
                toast(`Normalized DyContext roots for ${normalized} card${normalized === 1 ? '' : 's'}`);
            }
        }

        this.renderDecks();

        if (analyticsTouched) this.state.analyticsDirty = true;
        this.renderAll();
    },

    /**
    * Reconcile sub-items for all cloze parent cards.
    * Creates missing sub-items and suspends removed ones.
    */
    async reconcileClozeSubItems(parents = null) {
        let clozeParents = [];
        if (Array.isArray(parents)) {
            for (const p of parents) {
                const card = typeof p === 'string'
                    ? (this.cardById(p) || this.cardByNotionId(p))
                    : p;
                if (isClozeParent(card)) clozeParents.push(card);
            }
        } else {
            for (const card of this.state.cards.values()) {
                if (isClozeParent(card)) clozeParents.push(card);
            }
        }
        if (clozeParents.length === 0) return;

        const queuedSubItemsByParent = new Map();
        const addToMap = (map, parentKey, item) => {
            if (!map.has(parentKey)) map.set(parentKey, []);
            map.get(parentKey).push(item);
        };

        const queuedSubItemsMap = new Map();
        this.state.queue.forEach(op => {
            if (op.type === 'card-upsert' && op.payload?.parentCard) {
                queuedSubItemsMap.set(op.payload.id, op.payload);
            }
        });
        Array.from(queuedSubItemsMap.values()).forEach(c => {
            if (c.parentCard) addToMap(queuedSubItemsByParent, c.parentCard, c);
        });

        for (const parent of clozeParents) {
            const stableParentId = parent.notionId || parent.id;
            const mappedSubs = (parent.subCards || []).map(id => {
                return this.state.cards.get(id) || this.cardByNotionId(id);
            }).filter(c => c && !c.suspended);

            const queuedSubs = (queuedSubItemsByParent.get(parent.id) || [])
                .concat(queuedSubItemsByParent.get(parent.notionId) || []);

            const currentSubs = [...mappedSubs];

            for (const q of queuedSubs) {
                const idx = currentSubs.findIndex(s => s.id === q.id || (s.notionId && s.notionId === q.notionId));
                if (idx >= 0) currentSubs[idx] = q;
                else currentSubs.push(q);
            }

            const { toCreate, toKeep, toSuspend, parsedIndices } = reconcileSubItems(parent, currentSubs);

            // Sync parsed clozeIndexes back to parent if they were inferred from text
            if (parsedIndices.size > 0) {
                const newClozeIndexes = Array.from(parsedIndices).sort((a, b) => a - b).join(',');
                if (parent.clozeIndexes !== newClozeIndexes) {
                    parent.clozeIndexes = newClozeIndexes;
                    this.setCard(parent);
                    await Storage.put('cards', parent);
                    this.queueOp({ type: 'card-upsert', payload: parent });
                }
            }

            const createdSubs = [];
            for (const idx of toCreate) {
                const subItem = createSubItem(parent, idx, parent.deckId, () => this.makeTempId());
                subItem.parentCard = stableParentId;
                subItem.suspended = parent.suspended ? 1 : 0;

                this.setCard(subItem);
                createdSubs.push(subItem);

                if (!Array.isArray(parent.subCards)) parent.subCards = [];
                if (!parent.subCards.includes(subItem.id)) {
                    parent.subCards.push(subItem.id);
                }

                await Storage.put('cards', subItem);
                this.queueOp({ type: 'card-upsert', payload: subItem });
            }

            for (const subId of toKeep) {
                const sub = currentSubs.find(s => s.id === subId);
                if (!sub) continue;
                const idx = parseInt(sub.clozeIndexes, 10);
                if (!idx) continue;

                const newName = transformClozeForSubItem(parent.name, idx);
                const newBack = parent.back || '';
                const newTags = parent.tags ? JSON.parse(JSON.stringify(parent.tags)) : [];
                const tagsChanged = JSON.stringify(sub.tags || []) !== JSON.stringify(newTags);
                const shouldUpdateNotes = !sub.notes;
                const newNotes = shouldUpdateNotes ? parent.notes : sub.notes;
                const notesChanged = normalizeContentForComparison(sub.notes) !== normalizeContentForComparison(newNotes);

                const newOrder = (parent.order && String(parent.order).trim())
                    ? `${String(parent.order).trim().replace(/\.$/, '')}.${idx}`
                    : null;
                const orderChanged = sub.order !== newOrder;

                // Use normalized comparison for content with equations to avoid false positives
                const nameChanged = normalizeContentForComparison(sub.name) !== normalizeContentForComparison(newName);
                const backChanged = normalizeContentForComparison(sub.back) !== normalizeContentForComparison(newBack);
                const contentChanged = nameChanged || backChanged || notesChanged || sub.deckId !== parent.deckId || orderChanged;

                if (contentChanged || tagsChanged) {
                    sub.name = newName;
                    sub.back = newBack;
                    if (shouldUpdateNotes) sub.notes = parent.notes;
                    sub.tags = newTags;
                    sub.deckId = parent.deckId;
                    sub.order = newOrder;
                    sub.updatedInApp = true;
                    this.setCard(sub);
                    await Storage.put('cards', sub);
                    this.queueOp({ type: 'card-upsert', payload: sub });
                }
            }

            for (const subId of toSuspend) {
                const sub = this.cardById(subId);
                if (sub && !sub.suspended) {
                    sub.suspended = 1;
                    this.setCard(sub);
                    await Storage.put('cards', sub);
                    this.queueOp({ type: 'card-upsert', payload: sub });
                }
            }

            if (parent.suspended) {
                await this.suspendClozeSubs(parent, currentSubs.concat(createdSubs));
            }

            parent._lastClozeReconcile = new Date().toISOString();
            if (toCreate.length > 0) await Storage.put('cards', parent);
        }
    },
    /**
    * Reconcile sub-items for a single parent (called when saving a cloze card in app)
    */
    async reconcileSingleParent(parent) {
        if (!isClozeParent(parent)) return;

        const stableParentId = parent.notionId || parent.id;
        const matchesParent = (c) =>
            c.parentCard === parent.id ||
            c.parentCard === stableParentId ||
            (parent.notionId && c.parentCard === parent.notionId);

        const subsById = await Storage.getSubItems(parent.id);
        let subsByNotion = [];
        if (parent.notionId) {
            subsByNotion = await Storage.getSubItems(parent.notionId);
        }

        // Merge and dedup
        const subMap = new Map();
        [...subsById, ...subsByNotion].forEach(s => subMap.set(s.id, s));
        const existingSubs = Array.from(subMap.values());

        // We still check the queue for pending creations (small list, fast)
        const queuedSubs = Array.from(this.state.queue.values())
            .filter(op => op.type === 'card-upsert' && op.payload?.parentCard && matchesParent(op.payload))
            .map(op => op.payload);

        const existingIds = new Set(existingSubs.map(s => s.id));
        const allSubs = [...existingSubs, ...queuedSubs.filter(s => !existingIds.has(s.id))];

        const subsMap = new Map(allSubs.map(s => [s.id, s]));

        const { toCreate, toKeep, toSuspend, parsedIndices } = reconcileSubItems(parent, allSubs);

        // Sync parsed clozeIndexes back to parent if they were inferred from text
        if (parsedIndices.size > 0) {
            const newClozeIndexes = Array.from(parsedIndices).sort((a, b) => a - b).join(',');
            if (parent.clozeIndexes !== newClozeIndexes) {
                parent.clozeIndexes = newClozeIndexes;
                this.setCard(parent);
                await Storage.put('cards', parent);
                this.queueOp({ type: 'card-upsert', payload: parent });
            }
        }

        // Skip if nothing to do (no creates, no suspends, and no existing subs to update)
        if (toCreate.length === 0 && toSuspend.length === 0 && toKeep.length === 0) {
            parent._lastClozeReconcile = new Date().toISOString();
            await Storage.put('cards', parent);
            return;
        }

        // Update content for existing sub-items (handle parent text edits)
        for (const subId of toKeep) {
            const sub = subsMap.get(subId);
            if (!sub) continue;

            const idx = parseInt(sub.clozeIndexes, 10);
            if (!idx) continue;

            const newName = transformClozeForSubItem(parent.name, idx);
            const newBack = parent.back || '';

            // Serialize tags for comparison
            const newTags = parent.tags ? JSON.parse(JSON.stringify(parent.tags)) : [];
            const tagsChanged = JSON.stringify(sub.tags || []) !== JSON.stringify(newTags);

            // Notes logic: Only overwrite if sub-card notes are empty
            const shouldUpdateNotes = !sub.notes;
            const newNotes = shouldUpdateNotes ? parent.notes : sub.notes;
            const notesChanged = normalizeContentForComparison(sub.notes) !== normalizeContentForComparison(newNotes);

            const newOrder = (parent.order && String(parent.order).trim())
                ? `${String(parent.order).trim().replace(/\.$/, '')}.${idx}`
                : null;
            const orderChanged = sub.order !== newOrder;

            // Use normalized comparison for content with equations to avoid false positives
            const nameChanged = normalizeContentForComparison(sub.name) !== normalizeContentForComparison(newName);
            const backChanged = normalizeContentForComparison(sub.back) !== normalizeContentForComparison(newBack);
            const contentChanged = nameChanged || backChanged || notesChanged || sub.deckId !== parent.deckId || orderChanged;

            // Only save if content or tags actually changed
            if (contentChanged || tagsChanged) {
                sub.name = newName;
                sub.back = newBack;
                if (shouldUpdateNotes) sub.notes = parent.notes;
                sub.tags = newTags;
                sub.deckId = parent.deckId; // Ensure deck matches parent
                sub.order = newOrder;
                sub.updatedInApp = true;

                // Save update
                this.setCard(sub);
                await Storage.put('cards', sub);
                this.queueOp({ type: 'card-upsert', payload: sub });
            }
        }

        const createdSubs = [];
        // Create missing sub-items
        for (const idx of toCreate) {
            const alreadyExists = allSubs.some(s => parseInt(s.clozeIndexes, 10) === idx && !s.suspended);
            if (alreadyExists) continue;

            const subItem = createSubItem(parent, idx, parent.deckId, () => this.makeTempId());
            subItem.parentCard = stableParentId;
            subItem.suspended = parent.suspended ? 1 : 0;

            // Update Map and notionId index
            this.setCard(subItem);
            createdSubs.push(subItem);

            if (!Array.isArray(parent.subCards)) parent.subCards = [];
            if (!parent.subCards.includes(subItem.id)) {
                parent.subCards.push(subItem.id);
            }

            await Storage.put('cards', subItem);
            this.queueOp({ type: 'card-upsert', payload: subItem });
        }

        // Suspend removed sub-items
        for (const subId of toSuspend) {
            const sub = this.state.cards.get(subId);
            if (sub && !sub.suspended) {
                sub.suspended = 1;
                this.setCard(sub);
                await Storage.put('cards', sub);
                this.queueOp({ type: 'card-upsert', payload: sub });
            }
        }

        if (parent.suspended) {
            await this.suspendClozeSubs(parent, allSubs.concat(createdSubs));
        }

        parent._lastClozeReconcile = new Date().toISOString();
        await Storage.put('cards', parent);
    },
    async suspendClozeSubs(parent, subs = null) {
        if (!isClozeParent(parent) || !parent.suspended) return 0;
        const seen = new Set();
        const candidates = [];

        if (Array.isArray(subs)) {
            for (const s of subs) {
                if (!s?.id || seen.has(s.id)) continue;
                seen.add(s.id);
                candidates.push(s);
            }
        } else {
            const subIds = parent.subCards || [];
            for (const id of subIds) {
                if (!id || seen.has(id)) continue;
                seen.add(id);
                const sub = this.cardById(id) || this.cardByNotionId(id);
                if (sub) candidates.push(sub);
            }
        }

        const updates = [];
        for (const sub of candidates) {
            if (sub.suspended) continue;
            sub.suspended = 1;
            sub.updatedInApp = true;
            this.setCard(sub);
            updates.push(sub);
        }
        if (updates.length === 0) return 0;

        await Storage.putMany('cards', updates);
        for (const sub of updates) {
            this.queueOp({ type: 'card-upsert', payload: sub });
        }
        return updates.length;
    },
    queueEntityId(op) {
        if (!op) return null;
        return op.payload?.id || op.payload?.notionId || op.payload?.pageId || null;
    },
    queueKey(op) {
        if (!op?.type) return null;
        if (op.type === 'block-append' || op.type === 'dy-generation') {
            if (op._queueKey) return op._queueKey;
            const seed = op.id || (typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}_${Math.random().toString(16).slice(2)}`);
            op._queueKey = `${op.type}:${seed}`;
            return op._queueKey;
        }
        const entityId = this.queueEntityId(op);
        if (!entityId) return null;
        return `${op.type}:${entityId}`;
    },
    async pushQueue() {
        const { deckSource, cardSource } = this.state.settings;

        const rawQueue = [];
        for (const op of this.state.queue.values()) {
            if (op.type !== 'dy-generation') rawQueue.push(op);
        }

        const buckets = {
            'deck-upsert': [],
            'deck-delete': [],
            'card-upsert': [],
            'card-upsert-sub': [], // Sub-items deferred until parents sync
            'card-delete': [],
            'block-append': [],
            other: []
        };
        // Collect parent cards being synced in this batch
        const parentCardIds = new Set();
        for (const op of rawQueue) {
            if (op.type === 'card-upsert' && op.payload && isClozeParent(op.payload)) {
                parentCardIds.add(op.payload.id);
                if (op.payload.notionId) parentCardIds.add(op.payload.notionId);
            }
        }
        for (const op of rawQueue) {
            if (op.type === 'card-upsert' && op.payload?.parentCard) {
                // Defer subcards if their parent is also being synced in this batch
                const parentRef = op.payload.parentCard;
                if (this.isTempId(parentRef) || parentCardIds.has(parentRef)) {
                    buckets['card-upsert-sub'].push(op);
                    continue;
                }
            }
            const bucket = buckets[op.type] || buckets.other;
            bucket.push(op);
        }

        const queue = [
            ...buckets['deck-upsert'],
            ...buckets['deck-delete'],
            ...buckets['card-upsert'],
            ...buckets['card-upsert-sub'], // Process subcards after their parents
            ...buckets['card-delete'],
            ...buckets['block-append'],
            ...buckets.other
        ];

        const hadQueue = queue.length > 0;

        const failed = [];
        const succeeded = [];

        for (let i = 0; i < queue.length; i++) {
            const op = queue[i];
            if (i > 0) await sleep(350);
            if (op.type === 'card-upsert' && op.payload && op.payload.parentCard && this.isTempId(op.payload.parentCard)) {
                const parent = this.state.cards.get(op.payload.parentCard);
                if (parent && parent.notionId) op.payload.parentCard = parent.notionId;
            }

            try {
                if (op.type === 'deck-upsert') {
                    const props = NotionMapper.deckProps(op.payload);
                    if (op.payload.notionId) await API.updatePage(op.payload.notionId, props);
                    else {
                        const oldId = op.payload.id;
                        const res = await API.createPage(deckSource, props);
                        op.payload.notionId = res.id;
                        op.payload.id = res.id;
                        await Storage.put('decks', op.payload);
                        if (oldId && oldId !== res.id) {
                            await this.applyIdMappings({ deckIdMap: { [oldId]: res.id } });
                        }
                        const deckIdx = this.state.decks.findIndex(d => d.id === op.payload.id);
                        if (deckIdx >= 0) {
                            this.state.decks[deckIdx] = { ...this.state.decks[deckIdx], ...op.payload };
                        }
                    }
                }
                if (op.type === 'deck-delete' && op.payload.notionId) await API.archivePage(op.payload.notionId);
                if (op.type === 'card-upsert') {
                    const deck = this.deckById(op.payload.deckId);
                    if (!op.payload.notionId && op.payload.deckId && (!deck || !deck.notionId)) {
                        throw new Error('Deck not yet synced');
                    }
                    const props = NotionMapper.cardProps(op.payload, deck);
                    if (op.payload.notionId) await API.updatePage(op.payload.notionId, props);
                    else {
                        const oldId = op.payload.id;
                        const res = await API.createPage(cardSource, props);
                        op.payload.notionId = res.id;
                        op.payload.id = res.id;
                        op.payload.syncId = res.id;
                        if (oldId && oldId !== res.id) {
                            await this.applyIdMappings({ cardIdMap: { [oldId]: res.id } });
                        }
                    }
                    op.payload.updatedInApp = false;
                    op.payload._notionRichText = {
                        name: props['Name'].title,
                        back: props['Back'].rich_text,
                        notes: props['Notes'].rich_text
                    };
                    if (isClozeParent(op.payload)) {
                        op.payload._lastClozeReconcile = new Date().toISOString();
                    }
                    const existingCard = this.state.cards.get(op.payload.id) || this.cardByNotionId(op.payload.notionId);
                    if (existingCard) {
                        this.setCard({ ...existingCard, ...op.payload });
                    } else {
                        this.setCard(op.payload);
                    }
                    await Storage.put('cards', op.payload);
                }
                if (op.type === 'card-delete' && op.payload.notionId) await API.archivePage(op.payload.notionId);
                if (op.type === 'block-append' && op.payload.pageId) {
                    await API.appendBlocks(op.payload.pageId, op.payload.blocks);
                }

                if (op.id) await Storage.removeFromSyncQueue(op.id).catch(() => { });
                const key = this.queueKey(op);
                if (key) this.state.queue.delete(key);
                succeeded.push(op);
            } catch (e) {
                console.error(`Queue op failed: ${op.type}`, e);
                this.state.lastQueueError = {
                    at: new Date().toISOString(),
                    type: op.type,
                    message: e?.message || String(e)
                };
                Storage.setMeta('lastQueueError', this.state.lastQueueError).catch(() => { });
                op.retryCount = (op.retryCount || 0) + 1;
                if (op.retryCount <= 5) {
                    failed.push(op);
                    if (op.id) await Storage.put('syncQueue', op).catch(() => { });
                } else {
                    toast(`Sync dropped item after 5 attempts: ${e.message}`);
                    if (op.id) await Storage.removeFromSyncQueue(op.id).catch(() => { });
                    const key = this.queueKey(op);
                    if (key) this.state.queue.delete(key);
                }
            }
        }

        if (failed.length > 0) {
            toast(`${failed.length} sync operation(s) failed, will retry`);
            this.state.queueLastChangedAt = new Date().toISOString();
            Storage.setMeta('queueLastChangedAt', this.state.queueLastChangedAt).catch(() => { });
        } else if (hadQueue && succeeded.length > 0) {
            this.state.lastQueueError = null;
            Storage.setMeta('lastQueueError', null).catch(() => { });
            this.state.queueLastChangedAt = new Date().toISOString();
            Storage.setMeta('queueLastChangedAt', this.state.queueLastChangedAt).catch(() => { });
        }

        el('#queueCount').textContent = String(this.state.queue.size);
        this.renderConnection();
        return { success: failed.length === 0, failedCount: failed.length };
    },
    async queueOp(op, reason = 'generic') {
        op.reason = reason;

        const key = this.queueKey(op);
        if (!key) return;

        const entityId = this.queueEntityId(op);
        if (entityId && (op.type.endsWith('-delete') || op.type.endsWith('-upsert'))) {
            const counterpartType = op.type.endsWith('-delete')
                ? op.type.replace('-delete', '-upsert')
                : op.type.replace('-upsert', '-delete');
            const counterpartKey = `${counterpartType}:${entityId}`;
            if (this.state.queue.has(counterpartKey)) {
                const existing = this.state.queue.get(counterpartKey);
                if (existing.id) await Storage.removeFromSyncQueue(existing.id).catch(() => { });
                this.state.queue.delete(counterpartKey);
            }
        }

        if (this.state.queue.has(key)) {
            const existing = this.state.queue.get(key);
            if (existing.id) await Storage.removeFromSyncQueue(existing.id).catch(() => { });
            this.state.queue.delete(key);
        }

        if (op.type === 'card-upsert' && op.payload) {
            op.payload._lastUpdated = Date.now();
        }

        const dbKey = await Storage.addToSyncQueue(op);
        op.id = dbKey; // Assign DB key to in-memory obj
        this.state.queue.set(key, op);

        el('#queueCount').textContent = String(this.state.queue.size);
        this.state.queueLastChangedAt = new Date().toISOString();
        Storage.setMeta('queueLastChangedAt', this.state.queueLastChangedAt).catch(e => console.debug('Storage setMeta queueLastChangedAt failed:', e));

        if (!navigator.onLine && this.state.queue.size >= SYNC_QUEUE_WARN_THRESHOLD) {
            const now = Date.now();
            const lastWarn = this.state.lastQueueWarnAt || 0;
            if (now - lastWarn > SYNC_QUEUE_WARN_COOLDOWN_MS) {
                toastLong(`Sync queue is large (${this.state.queue.size}). Go online soon to avoid storage limits.`);
                this.state.lastQueueWarnAt = now;
            }
        }
        this.updateSyncButtonState();
        this.renderConnectionDebounced();
        const delay = (reason === 'rating') ? (5 * 60 * 1000) : 1500;
        this.requestAutoSyncSoon(delay, reason);
    },
    updateSyncButtonState() {
        const btn = el('#syncNowBtn');
        if (!btn) return;
        const pendingOffline = this.state.queue.size > 0 && !navigator.onLine;
        const offline = !navigator.onLine;
        btn.disabled = pendingOffline || this.state.syncing || offline;
        btn.classList.toggle('opacity-70', btn.disabled);
        const refreshBtn = el('#refreshDecksBtn');
        if (refreshBtn) {
            refreshBtn.disabled = pendingOffline || this.state.syncing || offline;
            refreshBtn.classList.toggle('opacity-70', refreshBtn.disabled);
        }
    },
    applyTemplateVars(tpl, vars) {
        let out = String(tpl || '');
        for (const [key, value] of Object.entries(vars || {})) {
            out = out.split(`{{${key}}}`).join(String(value ?? ''));
        }
        return out;
    },
    getDyContextConfig(deck) {
        if (!deck || !deck.dynamicContext) return null;
        const useJudge = this.state.settings.dyUseJudgeAi === true;
        if (useJudge) {
            if (!this.state.settings.aiVerified) return null;
        } else {
            if (!this.state.settings.dyVerified) return null;
        }
        const provider = useJudge ? (this.state.settings.aiProvider || '') : (this.state.settings.dyProvider || '');
        const model = useJudge ? (this.state.settings.aiModel || '') : (this.state.settings.dyModel || '');
        const key = useJudge ? (this.state.settings.aiKey || '') : (this.state.settings.dyKey || '');
        if (!provider || !model || !key) return null;
        const prompt = (deck.dyAiPrompt || '').trim() || DEFAULT_DYCONTEXT_PROMPT;
        return { provider, model, key, prompt };
    },
    getDyContextCardContent(card) {
        if (!card) return { front: '', back: '' };
        const type = (card.type || '').toLowerCase();
        if (type === 'cloze') {
            const hasClozeInName = /\{\{c\d+::.+?\}\}/i.test(card.name || '');
            const hasClozeInBack = /\{\{c\d+::.+?\}\}/i.test(card.back || '');
            if (!hasClozeInName && hasClozeInBack) {
                return { front: card.back || '', back: card.name || '' };
            }
        }
        return { front: card.name || '', back: card.back || '' };
    },
    async ensureDyContextRoot(card) {
        if (!card || card.dyRootCard) return card?.dyRootCard || null;
        card.dyRootCard = card.id;
        card.updatedInApp = true;
        await Storage.put('cards', card);
        this.queueOp({ type: 'card-upsert', payload: card });
        return card.dyRootCard;
    },
    async normalizeDyContextRootsForDeck(deckId) {
        if (!deckId) return 0;
        const updates = [];
        const cardIds = this.state.cardDeckIndex?.get(deckId);
        if (!cardIds || cardIds.size === 0) return 0;
        for (const cardId of cardIds) {
            const card = this.state.cards.get(cardId);
            if (!card) continue;
            if (isSubItem(card)) continue;
            if (card.dyRootCard || card.dyPrevCard) continue;
            card.dyRootCard = card.id;
            card.updatedInApp = true;
            updates.push(card);
        }
        if (updates.length === 0) return 0;
        await Promise.all(updates.map(c => Storage.put('cards', c)));
        updates.forEach(c => this.queueOp({ type: 'card-upsert', payload: c }));
        return updates.length;
    },
    parseDyContextJson(raw) {
        if (!raw || typeof raw !== 'string') return null;
        let text = raw.trim();
        if (text.startsWith('```')) {
            text = text.replace(/^```[a-z]*\s*/i, '').replace(/```$/i, '').trim();
        }
        try {
            return JSON.parse(text);
        } catch (_) {
            const first = text.indexOf('{');
            const last = text.lastIndexOf('}');
            if (first >= 0 && last > first) {
                const slice = text.slice(first, last + 1);
                try { return JSON.parse(slice); } catch { return null; }
            }
            return null;
        }
    },
    async enqueueDyContextJob(job) {
        if (!job?.prevId) return;
        const deck = this.deckById(job.deckId);
        if (!deck || !deck.dynamicContext) return;
        const dyConfig = this.getDyContextConfig(deck);
        if (!dyConfig) return;
        this.queueOp({ type: 'dy-generation', payload: job }, 'dy-context');
    },
    async processDyContextQueue() {
        if (this.state.dyContextProcessing) return;
        if (!navigator.onLine) return;

        const queue = Array.from(this.state.queue.values()).filter(op => op.type === 'dy-generation');
        if (queue.length === 0) return;

        this.state.dyContextProcessing = true;

        try {
            for (const op of queue) {
                const job = op.payload;
                const deck = this.deckById(job.deckId);
                const prevCard = this.cardById(job.prevId);
                const key = this.queueKey(op);

                if (!deck || !prevCard || !deck.dynamicContext) {
                    await Storage.removeFromSyncQueue(op.id).catch(() => { });
                    if (key) this.state.queue.delete(key);
                    continue;
                }

                const dyConfig = this.getDyContextConfig(deck);
                if (!dyConfig) {
                    await Storage.removeFromSyncQueue(op.id).catch(() => { });
                    if (key) this.state.queue.delete(key);
                    continue;
                }

                if (prevCard.dyNextCard) {
                    await Storage.removeFromSyncQueue(op.id).catch(() => { });
                    if (key) this.state.queue.delete(key);
                    continue;
                }

                if (prevCard.dyPrevCard) {
                    const prevInChain = this.cardById(prevCard.dyPrevCard);
                    if (!this.isDyContextGoodEasy(prevInChain, deck)) {
                        continue;
                    }
                }
                if (job.includeSubCards && !this.allClozeSubsGoodEasy(prevCard, deck)) {
                    continue;
                }

                const rootCard = this.cardById(job.rootId) || prevCard;
                try {
                    await this.generateDyContextVariant(prevCard, rootCard, deck, dyConfig, { includeSubCards: !!job.includeSubCards });
                    await Storage.removeFromSyncQueue(op.id).catch(() => { });
                    if (key) this.state.queue.delete(key);
                } catch (e) {
                    const retryCount = (op.retryCount || 0) + 1;
                    if (retryCount <= 5) {
                        op.retryCount = retryCount;
                        await Storage.put('syncQueue', op).catch(() => { });
                    } else {
                        toast(`DyContext job dropped: ${e?.message || 'error'}`);
                        await Storage.removeFromSyncQueue(op.id).catch(() => { });
                        if (key) this.state.queue.delete(key);
                    }
                }
            }
        } finally {
            this.state.dyContextProcessing = false;
            el('#queueCount').textContent = String(this.state.queue.size);
            this.renderConnection();
        }
    },
    getLastRatingFor(card, deck) {
        const alg = deck?.algorithm || 'SM-2';
        return (alg === 'FSRS' ? card.fsrs?.lastRating : card.sm2?.lastRating) || card.fsrs?.lastRating || card.sm2?.lastRating || null;
    },
    isDyContextGoodEasy(card, deck) {
        if (!card) return false;
        if (isClozeParent(card)) {
            return this.allClozeSubsGoodEasy(card, deck);
        }
        const r = this.getLastRatingFor(card, deck);
        return r === 'good' || r === 'easy';
    },
    allClozeSubsGoodEasy(parent, deck) {
        if (!parent) return false;

        const subIds = parent.subCards || [];

        if (subIds.length === 0) return false;

        let allGood = true;
        let activeCount = 0;
        for (const subId of subIds) {
            const sub = this.state.cards.get(subId);
            if (!sub) continue;
            if (sub.suspended) continue;
            activeCount += 1;
            const r = this.getLastRatingFor(sub, deck);
            if (r !== 'good' && r !== 'easy') {
                allGood = false;
                break;
            }
        }
        return allGood && activeCount > 0;
    },
    buildDyContextPrompt(promptTemplate, rootCard, prevCard, deck) {
        const root = this.getDyContextCardContent(rootCard);
        const prev = this.getDyContextCardContent(prevCard);
        const tags = (prevCard?.tags || []).map(t => t?.name).filter(Boolean).join(', ');
        return this.applyTemplateVars(promptTemplate, {
            root_front: root.front || '',
            root_back: root.back || '',
            root_notes: rootCard?.notes || '',
            prev_front: prev.front || '',
            prev_back: prev.back || '',
            prev_notes: prevCard?.notes || '',
            deck_name: deck?.name || '',
            tags,
            card_type: prevCard?.type || ''
        });
    },
    async retirePreviousVariant(currentCard, includeSubCards = false) {
        if (!currentCard || !currentCard.dyPrevCard) return;

        const prevId = currentCard.dyPrevCard;
        const prevCard = this.state.cards.get(prevId);

        if (prevCard && !prevCard.suspended) {
            prevCard.suspended = 1;
            this.setCard(prevCard);
            await Storage.put('cards', prevCard);
            this.queueOp({ type: 'card-upsert', payload: prevCard });

            if (includeSubCards && isClozeParent(prevCard)) {
                const subIds = prevCard.subCards || [];
                for (const subId of subIds) {
                    const sub = this.state.cards.get(subId);
                    if (sub && !sub.suspended) {
                        sub.suspended = 1;
                        this.setCard(sub);
                        await Storage.put('cards', sub);
                        this.queueOp({ type: 'card-upsert', payload: sub });
                    }
                }
            }
        }
    },
    async generateDyContextVariant(prevCard, rootCard, deck, dyConfig, { includeSubCards = false } = {}) {
        if (!prevCard || !deck || !dyConfig) return;
        const prompt = this.buildDyContextPrompt(dyConfig.prompt, rootCard, prevCard, deck);
        const raw = await this.callAI(dyConfig.provider, dyConfig.model, prompt, dyConfig.key);
        const parsed = this.parseDyContextJson(raw);
        if (!parsed || typeof parsed.front !== 'string') {
            throw new Error('DyContext AI returned invalid JSON');
        }
        const front = parsed.front.trim();
        const back = typeof parsed.back === 'string' ? parsed.back.trim() : '';
        const notes = typeof parsed.notes === 'string' ? parsed.notes.trim() : '';
        if (!front) {
            throw new Error('DyContext AI returned empty front');
        }
        if ((prevCard.type || '').toLowerCase() === 'cloze' && !/\{\{c\d+::.+?\}\}/i.test(front)) {
            throw new Error('DyContext AI returned invalid cloze front');
        }
        const newCard = this.newCard(prevCard.deckId, front, back, prevCard.type || 'Front-Back');
        newCard.notes = notes;
        newCard.tags = (prevCard.tags || []).map(t => ({ name: t.name, color: t.color || 'default' }));

        if (prevCard.order) {
            const isRoot = prevCard.id === rootCard.id;
            newCard.order = getNextVariantOrder(prevCard.order, isRoot);
        }

        newCard.dyRootCard = rootCard?.id || prevCard.dyRootCard || prevCard.id;
        newCard.dyPrevCard = prevCard.id;

        this.setCard(newCard);
        await Storage.put('cards', newCard);
        this.queueOp({ type: 'card-upsert', payload: newCard });

        // Link previous card to new one
        prevCard.dyNextCard = newCard.id;
        await Storage.put('cards', prevCard);
        this.queueOp({ type: 'card-upsert', payload: prevCard });

        await this.retirePreviousVariant(prevCard, includeSubCards);

        if (includeSubCards && isClozeParent(newCard)) {
            await this.reconcileSingleParent(newCard);
        }

        toast('Generated new DyContext variant');
    },
    async maybeGenerateDyContext(card, ratingKey) {
        if (!card || !ratingKey) return;
        if (!['good', 'easy'].includes(ratingKey)) return;
        const previewMode = !!this.state.session?.noScheduleChanges;
        if (previewMode) return;
        const deck = this.deckById(card.deckId);
        if (!deck || !deck.dynamicContext) return;

        // Check if AI is configured first
        const dyConfig = this.getDyContextConfig(deck);
        if (!dyConfig) return;

        let prevCard = card;
        let includeSubCards = false;

        if (isSubItem(card)) {
            const parent = this.cardById(card.parentCard);
            if (!parent) return;
            prevCard = parent;
            includeSubCards = true;
        } else if (isClozeParent(card)) {
            includeSubCards = true;
        }

        if (prevCard.dyNextCard) return;

        if (includeSubCards) {
            if (!this.allClozeSubsGoodEasy(prevCard, deck)) return;
        }

        const rootId = prevCard.dyRootCard || prevCard.id;
        const rootCard = this.cardById(rootId) || prevCard;
        if (!prevCard.dyRootCard) {
            await this.ensureDyContextRoot(prevCard);
        }

        if (prevCard.dyPrevCard) {
            const prevInChain = this.cardById(prevCard.dyPrevCard);
            if (!this.isDyContextGoodEasy(prevInChain, deck)) return;
        }

        if (!navigator.onLine) {
            await this.enqueueDyContextJob({
                id: crypto.randomUUID(),
                deckId: deck.id,
                prevId: prevCard.id,
                rootId: rootId,
                includeSubCards,
                createdAt: new Date().toISOString(),
                retryCount: 0
            });
            return;
        }

        this.generateDyContextVariant(prevCard, rootCard, deck, dyConfig, { includeSubCards })
            .catch(e => console.error('DyContext generation failed', e));
    },
    async manualSync() {
        if (!navigator.onLine) {
            toast('Offline: sync will run when you are online');
            return;
        }
        if (!this.isReady()) { toast('Complete setup first'); return; }
        if (this.state.syncing) { toast('Sync already in progress'); return; }

        this.state.syncing = true;
        this.setRefreshDecksSpinning(true);

        try {
            // Always push first to save local progress
            if (this.state.queue.size > 0) {
                await this.pushQueue();
                this.state.lastPush = new Date().toISOString();
                await Storage.put('meta', { key: 'lastPush', value: this.state.lastPush });
            }
            // Then pull to get updates
            await this.pullFromNotion({ forceFull: true });
            this.state.lastPull = new Date().toISOString();
            await Storage.put('meta', { key: 'lastPull', value: this.state.lastPull });

            this.state.lastSync = new Date().toISOString();
            await Storage.put('meta', { key: 'lastSync', value: this.state.lastSync });
            this.renderConnection();
            toast('Synced with Notion');
        } catch (e) {
            console.error('Manual sync failed', e);
            toast('Sync failed - check connection');
        } finally {
            this.state.syncing = false;
            this.setRefreshDecksSpinning(false);
            if (this.state.queue.size > 0) {
                this.requestAutoSyncSoon(MIN_PUSH_INTERVAL_MS + 100);
            }
        }
    },
    startAutoSync() {
        if (this.state.autoSyncTimer) clearInterval(this.state.autoSyncTimer);
        this.state.autoSyncTimer = setInterval(() => this.autoSyncTick(), SYNC_INTERVAL_MS);
        this.autoSyncTick(); // kick off once on load
        this.updateSyncButtonState();
    },
    requestAutoSyncSoon(delayMs = 1500, reason = 'generic') {
        if (this.state.autoSyncSoonTimer) {
            if (reason !== 'rating') {
                clearTimeout(this.state.autoSyncSoonTimer);
                this.state.autoSyncSoonTimer = null;
            } else {
                return;
            }
        }
        if (!navigator.onLine) return;
        if (!this.isReady()) return;
        const ms = Math.max(200, Number(delayMs) || 0);
        this.state.autoSyncSoonTimer = setTimeout(() => {
            this.state.autoSyncSoonTimer = null;
            this.autoSyncTick();
        }, ms);
    },
    async autoSyncTick() {
        if (this.state.syncing) return;
        if (!navigator.onLine) {
            this.updateSyncButtonState();
            return;
        }
        if (!this.isReady()) return;
        const now = Date.now();
        const lastPullMs = this.state.lastPull ? new Date(this.state.lastPull).getTime() : 0;
        const lastPushMs = this.state.lastPush ? new Date(this.state.lastPush).getTime() : 0;
        // Don't pull during a study session; keep focus on local flow.
        const wantsPull = !this.state.session && (now - lastPullMs > MIN_PULL_INTERVAL_MS);
        // Never pull while there are pending local mutations; a pull can overwrite local edits or
        // break deck/card references before the queue finishes pushing.
        const wantsPush = this.state.queue.size > 0;
        const canPushNow = wantsPush && (this.state.lastPush == null || (now - lastPushMs > MIN_PUSH_INTERVAL_MS));
        if (!wantsPull && !wantsPush) return;
        // If we have pending work but are within the push cooldown, schedule another tick close to the allowed time.
        if (wantsPush && !canPushNow) {
            const remaining = MIN_PUSH_INTERVAL_MS - (now - lastPushMs);
            this.requestAutoSyncSoon(remaining + 100);
            return;
        }
        this.state.syncing = true;
        try {
            let didWork = false;
            // Always push first to avoid overwriting local changes with stale Notion data
            if (canPushNow) {
                const pushResult = await this.pushQueue();
                if (pushResult.success) {
                    this.state.lastPush = new Date().toISOString();
                    await Storage.put('meta', { key: 'lastPush', value: this.state.lastPush });
                }
                didWork = true;
            }
            // Only pull when the queue is empty after any push attempt.
            if (wantsPull && this.state.queue.size === 0) {
                await this.pullFromNotion();
                this.state.lastPull = new Date().toISOString();
                await Storage.put('meta', { key: 'lastPull', value: this.state.lastPull });
                didWork = true;
            }
            if (didWork) {
                this.state.lastSync = new Date().toISOString();
                await Storage.put('meta', { key: 'lastSync', value: this.state.lastSync });
                this.renderConnection();
            }
        } catch (e) {
            console.error('Auto sync failed', e);
        } finally {
            this.state.syncing = false;
            this.updateSyncButtonState();
            // If more work was added to the queue during sync, schedule another tick.
            if (this.state.queue.size > 0) {
                this.requestAutoSyncSoon(MIN_PUSH_INTERVAL_MS + 100);
            }
        }
    },
    handleOnline() {
        toast('Back online');
        this.renderConnection();
        this.processDyContextQueue();
        this.requestAutoSyncSoon(250);
    },
    handleOffline() {
        toast('You are offline - changes will sync when online');
        this.renderConnection();
        this.updateSyncButtonState();
    },
    selectDeck(id) {
        const deck = this.deckById(id);
        this.state.selectedDeck = deck;
        this.state.cardLimit = 50; // Reset limit
        this.renderDecks(); // Re-render to show selection highlight
        this.renderCards();
        this.renderStudy();
        this.renderSelectedDeckBar();
        this.persistUiStateDebounced();
        // Scroll to cards section
        const cardsSection = el('#cardsSection');
        if (cardsSection) cardsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    selectCard(id) {
        const card = this.cardById(id);
        this.state.selectedCard = card;
        this.renderStudy();
        this.openCardModal(card);
    },
    editCard(id) {
        const card = this.cardById(id);
        if (!card) return;
        this.state.selectedCard = card;
        this.openCardModal(card);
    },
    showReviewHistoryPopover(btn, cardId) {
        // Close any existing popover
        const existing = document.querySelector('.review-history-popover');
        if (existing) existing.remove();

        const card = this.cardById(cardId);
        if (!card) return;

        const history = card.reviewHistory || [];
        const ratingColors = { again: 'rating-text-again', hard: 'rating-text-hard', good: 'rating-text-good', easy: 'rating-text-easy' };

        // Create popover content
        let content;
        if (history.length === 0) {
            content = '<p class="text-faint text-center py-2">No reviews yet</p>';
        } else {
            // Show last 10 reviews (most recent first)
            const recentHistory = [...history].reverse().slice(0, 10);
            content = `
 <table class="w-full text-xs">
 <thead><tr class="text-faint border-b border-weak "><th class="text-left py-1">Rating</th><th class="text-left py-1">Date</th></tr></thead>
 <tbody>
 ${recentHistory.map(h => `
 <tr class="border-b border-faint last:border-0">
 <td class="py-1 capitalize ${ratingColors[h.rating] || ''}">${escapeHtml(String(h.rating || ''))}</td>
 <td class="py-1 text-sub ">${new Date(h.at).toLocaleDateString()} ${new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
 </tr>
 `).join('')}
 </tbody>
 </table>
 ${history.length > 10 ? `<p class="text-faint text-xs text-center mt-1">+${history.length - 10} more</p>` : ''}
 `;
        }

        // Create and position popover
        const popover = document.createElement('div');
        popover.className = 'review-history-popover fixed z-50 bg-[color:var(--surface)] border border-[color:var(--card-border)] rounded-lg shadow-lg p-3 min-w-[200px] max-w-[280px]';
        popover.innerHTML = `
 <div class="flex justify-between items-center mb-2">
 <span class="font-medium text-sm text-main ">Review History</span>
 <button class="close-popover text-faint hover:text-main p-0.5"><i data-lucide="x" class="w-4 h-4"></i></button>
 </div>
 ${content}
 `;

        // Position popover near button
        document.body.appendChild(popover);
        const btnRect = btn.getBoundingClientRect();
        const popRect = popover.getBoundingClientRect();

        // Position to the left of button, or right if not enough space
        let left = btnRect.left - popRect.width - 8;
        if (left < 8) left = Math.min(window.innerWidth - popRect.width - 8, btnRect.right + 8);
        let top = btnRect.top;
        if (top + popRect.height > window.innerHeight - 8) top = window.innerHeight - popRect.height - 8;

        popover.style.left = `${left}px`;
        popover.style.top = `${top}px`;

        createIconsInScope(popover);

        // Close handlers
        const closeOnClickOutside = (e) => {
            if (!popover.contains(e.target) && !btn.contains(e.target)) {
                popover.remove();
                document.removeEventListener('click', closeOnClickOutside);
            }
        };
        popover.querySelector('.close-popover').onclick = () => {
            popover.remove();
            document.removeEventListener('click', closeOnClickOutside);
        };
        setTimeout(() => document.addEventListener('click', closeOnClickOutside), 0);
    },
    passFilters(card, opts = {}) {
        const f = normalizeFilterState(this.state.filters);
        const context = opts.context || 'library';
        const allowSubItems = opts.allowSubItems === true;

        if (context === 'study') {
            // Study Mode: Strict rules
            // 1. MUST NOT be suspended or leech (hard rule)
            if (card.suspended || card.leech) return false;

            // 2. Filter by card type (unless sub-item)
            const typeKey = (card.type || '').toLowerCase();
            const isFrontBack = typeKey.includes('front');
            if (!isSubItem(card) && !isFrontBack) return false;

            // 3. Apply Study-specific filters
            const now = new Date();
            const deck = this.deckById(card.deckId);
            const alg = deck?.algorithm || 'SM-2';
            const lastRating = (alg === 'FSRS' ? card.fsrs?.lastRating : card.sm2?.lastRating) || card.fsrs?.lastRating || card.sm2?.lastRating;

            // Apply again/hard filters: if both selected, show cards matching either
            const wantsAgain = f.again;
            const wantsHard = f.hard;
            if (wantsAgain || wantsHard) {
                const matchesAgain = lastRating === 'again';
                const matchesHard = lastRating === 'hard';
                if (wantsAgain && wantsHard) {
                    if (!matchesAgain && !matchesHard) return false;
                } else if (wantsAgain && !matchesAgain) {
                    return false;
                } else if (wantsHard && !matchesHard && !matchesAgain) {
                    // Hard filter includes "again" as more severe
                    return false;
                }
            }
            if (f.addedToday && card.createdAt && new Date(card.createdAt).toDateString() !== now.toDateString()) return false;
            const cardTagNames = this.normalizeTagNames(card.tags);
            const hasTags = cardTagNames.length > 0;
            const includeNoTag = f.tagEmptyMode === FILTER_MODE_INCLUDE;
            const excludeNoTag = f.tagEmptyMode === FILTER_MODE_EXCLUDE;
            if (f.tags.length > 0 || includeNoTag) {
                const includeMatch = (f.tags.length > 0 && f.tags.some(t => cardTagNames.includes(t))) ||
                    (includeNoTag && !hasTags);
                if (!includeMatch) return false;
            }
            if (f.tagsExclude.length > 0 && f.tagsExclude.some(t => cardTagNames.includes(t))) return false;
            if (excludeNoTag && !hasTags) return false;
            if (f.marked && !card.marked) return false;
            const cardFlag = (card.flag || '').trim();
            const hasFlag = !!cardFlag;
            const includeNoFlag = f.flagEmptyMode === FILTER_MODE_INCLUDE;
            const excludeNoFlag = f.flagEmptyMode === FILTER_MODE_EXCLUDE;
            if (f.flag.length > 0 || includeNoFlag) {
                const includeMatch = (f.flag.length > 0 && f.flag.includes(cardFlag)) ||
                    (includeNoFlag && !hasFlag);
                if (!includeMatch) return false;
            }
            if (f.flagExclude.length > 0 && f.flagExclude.includes(cardFlag)) return false;
            if (excludeNoFlag && !hasFlag) return false;

            return true;
        } else {
            // Library Mode: Only respect Library-specific controls
            // Ignore 'again', 'hard', 'tags', 'flag' etc. set in Study tab
            if (f.suspended && card.suspended) return false; // "Hide suspended" checked
            if (f.leech && card.leech) return false;       // "Hide leeches" checked
            // Hide sub-items by default in library unless explicitly allowed
            if (!allowSubItems && isSubItem(card)) return false;

            return true;
        }
    },
    isDue(card) {
        const deck = this.deckById(card.deckId);
        const alg = deck?.algorithm || 'SM-2';
        const learning = parseSrsState(card.srsState || null).learning;
        if (learning && ['learning', 'relearning'].includes(learning.state) && learning.due) {
            const due = new Date(learning.due);
            if (Number.isFinite(due.getTime())) {
                return due <= new Date();
            }
        }
        const duePrimary = alg === 'FSRS' ? card.fsrs?.dueDate : card.sm2?.dueDate;
        const dueFallback = alg === 'FSRS' ? card.sm2?.dueDate : card.fsrs?.dueDate;
        const due = duePrimary || dueFallback;
        if (!due) return true;
        const dueDate = new Date(due);
        if (!Number.isFinite(dueDate.getTime())) return true;
        return dueDate.getTime() <= this.getEffectiveNowMs();
    },
    pickCard() {
        // If session is active, return the session's current card
        if (this.state.session) {
            const sessionData = this.getSessionCard();
            if (sessionData && sessionData.card) {
                // Store the pre-computed reverse decision from session
                this.state.sessionReversed = sessionData.reversed;
                return sessionData.card;
            }
            // Session complete or no more cards
            return null;
        }

        const deckIds = this.getEffectiveStudyDeckIds();
        const queue = this.generateCardQueue(deckIds, this.state.studyNonDue, { precomputeReverse: false });
        if (!queue.length) return null;
        return this.cardById(queue[0].cardId) || null;
    },
    stableReverseDecision(card, deck) {
        const key = `${card?.id || ''}:${deck?.id || ''}`;
        let hash = 5381;
        for (let i = 0; i < key.length; i++) {
            hash = ((hash << 5) + hash) ^ key.charCodeAt(i);
        }
        return (hash >>> 0) % 2 === 0;
    },
    renderCardFront(card, deck) {
        const typeKey = (card.type || '').toLowerCase();
        const isCloze = typeKey === 'cloze';
        const isFrontStyle = typeKey.includes('front');
        // Use session's pre-computed reverse decision if active, otherwise random
        let shouldReverse;
        if (this.state.session && typeof this.state.sessionReversed === 'boolean') {
            shouldReverse = !isCloze && this.state.sessionReversed;
        } else {
            shouldReverse = !isCloze && deck?.reverse && isFrontStyle && this.stableReverseDecision(card, deck);
        }
        // Store reverse state for reveal
        this.state.cardReversed = shouldReverse;
        let prompt = shouldReverse ? card.back : card.name;
        if (isCloze) {
            // Cloze content may be stored in either Name or Back; prefer the field that contains cloze markup.
            const hasClozeInName = /\{\{c\d+::.+?\}\}/i.test(card.name || '');
            const hasClozeInBack = /\{\{c\d+::.+?\}\}/i.test(card.back || '');
            if (!hasClozeInName && hasClozeInBack) {
                prompt = card.back;
            }

            // For sub-items, only hide the specific cloze index, reveal all others
            const subItemIndex = isSubItem(card) ? parseInt(card.clozeIndexes, 10) : null;

            // Protect equation spans from cloze regex - they may contain braces like x^{2}
            const eqPlaceholders = [];
            let protectedPrompt = prompt.replace(/<span class="notion-equation">([\s\S]*?)<\/span>/g, (match) => {
                const idx = eqPlaceholders.length;
                eqPlaceholders.push(match);
                return `\x00EQ${idx}\x00`;
            });

            // Helper to safely escape content while preserving equation placeholders
            const safeEscapePreservingEquations = (content) => {
                if (!content) return '';
                // The equation placeholders are already in the content, just escape around them
                const parts = content.split(/(\x00EQ\d+\x00)/g);
                return parts.map(part => {
                    if (/^\x00EQ\d+\x00$/.test(part)) return part; // Keep placeholder as-is
                    return escapeHtml(part);
                }).join('');
            };

            // Uses a non-greedy match with proper handling of nested content
            let processed = protectedPrompt.replace(/\{\{c(\d+)::((?:[^{}]|\{(?!\{)|\}(?!\}))*?)(?:::((?:[^{}]|\{(?!\{)|\}(?!\}))*?))?\}\}/g, (match, num, answer, hint) => {
                const clozeNum = parseInt(num, 10);
                // The hint (if present) is the 3rd capture group after the optional :::
                // Escape content for XSS but preserve equation spans for KaTeX rendering
                const safeAnswer = safeEscapePreservingEquations(answer);
                const safeHint = hint ? safeEscapePreservingEquations(hint) : null;

                // For sub-items: only hide the specific cloze index, reveal others
                if (subItemIndex !== null && clozeNum !== subItemIndex) {
                    // Show this cloze as revealed (not the one being tested)
                    return `<span class="cloze-revealed">${safeAnswer}</span>`;
                }

                const displayHint = safeHint ? `[${safeHint}]` : '[...]';
                return `<span class="cloze-blank"><span class="cloze-placeholder">${displayHint}</span><span class="cloze-answer">${safeAnswer}</span></span>`;
            });

            // Restore equation spans
            processed = processed.replace(/\x00EQ(\d+)\x00/g, (_, idx) => eqPlaceholders[parseInt(idx, 10)]);
            return safeMarkdownParse(processed);
        }
        return safeMarkdownParse(prompt);
    },
    setRatingEnabled(enabled) {
        document.querySelectorAll('.rate-btn').forEach(btn => {
            btn.disabled = !enabled;
            btn.classList.toggle('opacity-30', !enabled);
            btn.classList.toggle('cursor-not-allowed', !enabled);
            btn.classList.toggle('pointer-events-none', !enabled);
        });
    },
    reveal() {
        const card = this.state.selectedCard;
        const isCloze = card && (card.type || '').toLowerCase() === 'cloze';
        if (this.state.answerRevealed) return;

        // Only show cardBack for non-cloze cards
        if (!isCloze) {
            el('#cardBack').classList.remove('hidden');
        }

        // Show notes section after reveal (no longer a hint)
        const notesSection = el('#notesSection');
        if (notesSection) notesSection.classList.remove('hidden');

        // Show add note button after reveal
        const addNoteBtn = el('#addNoteBlock');
        if (addNoteBtn) addNoteBtn.classList.remove('hidden');

        // Show copy button after reveal
        const copyBtn = el('#copyCardContent');
        if (copyBtn) copyBtn.classList.remove('hidden');

        // Reveal cloze blanks
        document.querySelectorAll('#cardFront .cloze-blank').forEach(span => span.classList.add('revealed'));

        // Enable rating (in both Manual and AI modes, reveal() signifies answer is now visible)
        this.state.answerRevealed = true;
        this.state.answerRevealedAt = Date.now();
        this.setRatingEnabled(true);
        this.updateMobileFab();
        const revealBtn = el('#revealBtn');
        if (revealBtn) {
            revealBtn.classList.add('hidden');
        }
        this.state.activeMicButton = null;
        this.state.lockAiUntilNextCard = true;
        this.updateGhostInkControlsState();
    },
    async rate(rating) {
        const card = this.state.selectedCard;
        if (!card) return;
        if (!this.state.answerRevealed) {
            const mode = normalizeRevisionMode(el('#revisionMode').value);
            const hint = mode === REVISION_MODE_AI
                ? 'Judge the answer first'
                : (mode === REVISION_MODE_TYPEIN ? 'Check your typed answer first' : 'Reveal the answer first');
            toast(hint);
            return;
        }
        if (this.isAiModeSelected() && navigator.onLine && !this.state.settings.aiKey) {
            toast('Add an AI key or switch to Reveal mode');
            return;
        }
        const ratingKey = normalizeRating(rating);
        const ratingLabel = displayRating(ratingKey) || 'Good';
        // Save previous state for undo
        const previousState = {
            cardId: card.id,
            sm2: JSON.parse(JSON.stringify(card.sm2 || {})),
            fsrs: JSON.parse(JSON.stringify(card.fsrs || {})),
            history: [...card.reviewHistory],
            srsState: JSON.parse(JSON.stringify(card.srsState || {})),
            leech: !!card.leech,
            suspended: card.suspended ? 1 : 0,
            rating: ratingLabel,
            sessionIndex: this.state.session ? this.state.session.currentIndex : null,
            ratingCounts: this.state.session?.ratingCounts ? { ...this.state.session.ratingCounts } : null
        };
        // Preview mode: never modify scheduling (independent of due/all selection).
        const previewMode = !!this.state.session?.noScheduleChanges;

        try {

            if (previewMode) {
                if (this.state.session && this.state.session.ratingCounts) {
                    this.state.session.ratingCounts[ratingLabel] = (this.state.session.ratingCounts[ratingLabel] || 0) + 1;
                }
                if (card._pendingSave) {
                    await Storage.put('cards', card);
                    delete card._pendingSave;
                    this.queueOp({ type: 'card-upsert', payload: card }, 'rating');
                }
                this.state.lastRating = null;
                this.setRatingEnabled(false);
                this.advanceSession(false);
                toast('Preview mode: scheduling unchanged');
                return;
            }

            const deck = this.deckById(card.deckId);

            const alg = deck?.algorithm || 'SM-2';

            const srsConfig = parseSrsConfig(deck?.srsConfig || null, alg);

            let handledLearning = false;

            if (alg === 'SM-2') {

                handledLearning = this.applySm2Learning(card, ratingKey, deck);

                if (!handledLearning) {

                    card.sm2 = SRS.sm2(card, ratingKey); // SM-2 is default

                    card.sm2.dueDate = this.adjustDueDateForEasyDays(card.sm2.dueDate, srsConfig.easyDays);

                }

            } else {

                card.fsrs = SRS.fsrs(card, ratingKey, srsConfig.fsrs?.weights, srsConfig.fsrs?.retention);

                card.fsrs.dueDate = this.adjustDueDateForEasyDays(card.fsrs.dueDate, srsConfig.easyDays);

            }

            card.fsrs = card.fsrs || {};

            if (alg === 'FSRS') card.fsrs.lastRating = ratingKey;

            else {

                card.sm2 = card.sm2 || {};

                card.sm2.lastRating = ratingKey;

            }

            let learning = parseSrsState(card.srsState || null).learning;

            if (alg === 'SM-2' && !handledLearning) {

                learning.state = 'review';

                learning.step = 0;

                learning.due = null;

            }

            if (alg === 'FSRS') {

                learning.state = 'review';

                learning.step = 0;

                learning.due = null;

            }

            if (ratingKey === 'again' && !handledLearning) {

                learning.lapses = (learning.lapses || 0) + 1;

            }

            if (!card.leech && (learning.lapses || 0) >= DEFAULT_LEECH_LAPSE_THRESHOLD) {

                card.leech = true;

                card.suspended = 1;

                toast(`Leech detected (lapses: ${learning.lapses}) — auto-suspended`);

            }

            card.srsState = this.buildSrsState(card, learning);

            const now = new Date();

            const nowMs = now.getTime();

            const startMs = this.state.cardShownAt || nowMs;

            let durationMs = Math.max(0, nowMs - startMs);

            durationMs = Math.min(durationMs, 10 * 60 * 1000);

            card.reviewHistory.push({ rating: ratingKey, at: now.toISOString(), ms: durationMs });
            await Storage.put('cards', card);

            delete card._pendingSave;
            this.setCard(card);

            await this.suspendClozeSubs(card);
            this.queueOp({ type: 'card-upsert', payload: card }, 'rating');
            this.state.analyticsDirty = true;
            this.maybeGenerateDyContext(card, ratingKey).catch(e => {
                console.error('DyContext generation error:', e);
            });

            if (this.state.session && this.state.session.ratingCounts) {
                this.state.session.ratingCounts[ratingLabel] = (this.state.session.ratingCounts[ratingLabel] || 0) + 1;
            }

            this.showUndoToast(previousState);
            if (this.state.session) {
                this.advanceSession(false);
            } else {
                this.nextCard();
            }
        } catch (e) {
            console.error('Rating failed, rolling back:', e);
            card.sm2 = previousState.sm2;
            card.fsrs = previousState.fsrs;
            card.reviewHistory = previousState.history;
            card.srsState = previousState.srsState;
            card.leech = previousState.leech;
            card.suspended = previousState.suspended ? 1 : 0;
            toast('Rating failed, please try again');
        }
    },
    nextCard() {
        if (this.state.session) {
            this.advanceSession(true); // wasSkipped = true
        } else {
            this.renderStudy();
        }
    },
    showUndoToast(previousState) {
        // Clear any existing undo toast timeout
        if (this.state.undoToastTimeout) {
            clearTimeout(this.state.undoToastTimeout);
        }
        this.state.lastRating = previousState;
        const t = el('#toast');
        t.innerHTML = `Rated "${previousState.rating}" <button id="undoBtn" class="ml-2 underline font-medium hover:text-ghost-dark">Undo</button>`;
        t.classList.remove('hidden', 'opacity-0');
        el('#undoBtn').onclick = () => this.undoLastRating();
        this.state.undoToastTimeout = setTimeout(() => {
            this.state.lastRating = null;
            t.classList.add('opacity-0');
            setTimeout(() => {
                t.classList.add('hidden');
                t.innerHTML = '';
            }, 300);
        }, 4000);
    },
    async undoLastRating() {
        const prev = this.state.lastRating;
        if (!prev) {
            toast('Nothing to undo');
            return;
        }
        // Clear the undo toast timeout
        if (this.state.undoToastTimeout) {
            clearTimeout(this.state.undoToastTimeout);
            this.state.undoToastTimeout = null;
        }
        // Find the card and restore its state
        const card = this.cardById(prev.cardId);
        if (!card) {
            toast('Card not found');
            this.state.lastRating = null;
            return;
        }
        // Restore SRS state
        card.sm2 = prev.sm2;
        card.fsrs = prev.fsrs;
        card.reviewHistory = prev.history;
        card.srsState = prev.srsState || parseSrsState(null);
        card.leech = !!prev.leech;
        card.suspended = prev.suspended ? 1 : 0;
        // Save restored card
        await Storage.put('cards', card);
        // Ensure undo is propagated to Notion on next sync.
        this.queueOp({ type: 'card-upsert', payload: card });
        // Also update in memory (with notionId index)
        this.setCard(card);
        this.state.analyticsDirty = true;
        // Restore session state if applicable
        if (this.state.session && prev.sessionIndex !== null) {
            this.state.session.currentIndex = prev.sessionIndex;
            // Remove from completed array if it was added
            const completedIdx = this.state.session.completed.indexOf(prev.cardId);
            if (completedIdx !== -1) {
                this.state.session.completed.splice(completedIdx, 1);
            }
            // Restore rating counts
            if (prev.ratingCounts) {
                this.state.session.ratingCounts = prev.ratingCounts;
            }
            this.saveSession();
        }
        this.state.lastRating = null;
        // Hide the undo toast
        const t = el('#toast');
        t.classList.add('hidden', 'opacity-0');
        t.innerHTML = '';
        // Re-render study view to show the card again
        this.renderStudy();
        toast('Rating undone');
    },
    enableNonDueStudy() {
        // Temporarily ignore due dates for this study session
        this.state.studyNonDue = true;
        this.renderStudy();
    },
    cardsForDeck(deckId) {
        const cardIds = this.state.cardDeckIndex.get(deckId);
        if (!cardIds) return [];

        const results = [];
        for (const id of cardIds) {
            const c = this.state.cards.get(id);
            if (c) results.push(c);
        }
        return results;
    },
    deckById(id) {
        return this.state.decks.find(d => d.id === id);
    },
    cardById(id) {
        if (!id) return null;
        return this.state.cards.get(id) || null;
    },
    cardByNotionId(notionId) {
        if (!notionId) return null;
        const cardId = this.state.cardNotionIdIndex.get(notionId);
        return cardId ? this.state.cards.get(cardId) : null;
    },
    getTagsKey(tags) {
        if (!Array.isArray(tags) || tags.length === 0) return '';
        return tags
            .map(t => `${t?.name || ''}:${t?.color || ''}`)
            .sort()
            .join('|');
    },
    getEffectiveNowMs(now = new Date()) {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), DAY_START_HOUR, 0, 0, 0);
        const effectiveNow = now < start ? start : now;
        return effectiveNow.getTime();
    },
    getCardDueTs(card, deck = null) {
        if (!card) return null;
        const learning = parseSrsState(card.srsState || null).learning;
        if (learning && ['learning', 'relearning'].includes(learning.state) && learning.due) {
            const d = new Date(learning.due);
            if (Number.isFinite(d.getTime())) return d.getTime();
        }
        const alg = deck?.algorithm || 'SM-2';
        const duePrimary = alg === 'FSRS' ? card.fsrs?.dueDate : card.sm2?.dueDate;
        const dueFallback = alg === 'FSRS' ? card.sm2?.dueDate : card.fsrs?.dueDate;
        const due = duePrimary || dueFallback;
        if (!due) return Number.NEGATIVE_INFINITY;
        const dueDate = new Date(due);
        if (!Number.isFinite(dueDate.getTime())) return Number.NEGATIVE_INFINITY;
        return dueDate.getTime();
    },
    isValidDueTs(dueTs) {
        return dueTs !== null && dueTs !== undefined && !Number.isNaN(dueTs);
    },
    normalizeTagNames(tags) {
        if (!Array.isArray(tags) || tags.length === 0) return [];
        const out = new Set();
        for (const t of tags) {
            const name = (t?.name || '').trim();
            if (name) out.add(name);
        }
        return Array.from(out);
    },
    addToIndex(map, key, cardId) {
        if (!key || !cardId) return;
        let set = map.get(key);
        if (!set) {
            set = new Set();
            map.set(key, set);
        }
        set.add(cardId);
    },
    removeFromIndex(map, key, cardId) {
        if (!key || !cardId) return;
        const set = map.get(key);
        if (!set) return;
        set.delete(cardId);
        if (set.size === 0) map.delete(key);
    },
    updateTagIndex(prevTags, nextTags, cardId) {
        const prevSet = new Set(prevTags || []);
        const nextSet = new Set(nextTags || []);
        for (const tag of prevSet) {
            if (!nextSet.has(tag)) this.removeFromIndex(this.state.tagIndex, tag, cardId);
        }
        for (const tag of nextSet) {
            if (!prevSet.has(tag)) this.addToIndex(this.state.tagIndex, tag, cardId);
        }
    },
    updateFlagIndex(prevFlag, nextFlag, cardId) {
        const prev = (prevFlag || '').trim();
        const next = (nextFlag || '').trim();
        if (prev && prev !== next) this.removeFromIndex(this.state.flagIndex, prev, cardId);
        if (next && prev !== next) this.addToIndex(this.state.flagIndex, next, cardId);
    },
    updateMarkedIndex(prevMarked, nextMarked, cardId) {
        if (prevMarked && !nextMarked) this.state.markedIndex.delete(cardId);
        if (!prevMarked && nextMarked) this.state.markedIndex.add(cardId);
    },
    updateRatingIndex(prevRating, nextRating, cardId) {
        const prev = normalizeRating(prevRating);
        const next = normalizeRating(nextRating);
        if (prev && prev !== next) this.removeFromIndex(this.state.ratingIndex, prev, cardId);
        if (next && prev !== next) this.addToIndex(this.state.ratingIndex, next, cardId);
    },
    updateCreatedDateIndex(prevDateKey, nextDateKey, cardId) {
        const prev = (prevDateKey || '').trim();
        const next = (nextDateKey || '').trim();
        if (prev && prev !== next) this.removeFromIndex(this.state.createdDateIndex, prev, cardId);
        if (next && prev !== next) this.addToIndex(this.state.createdDateIndex, next, cardId);
    },
    bumpFsrsDeckHistoryVersion(deckId) {
        if (!deckId) return;
        const cur = this.state.fsrsDeckHistoryVersion.get(deckId) || 0;
        this.state.fsrsDeckHistoryVersion.set(deckId, cur + 1);
    },
    adjustDeckTotal(deckId, delta) {
        if (!deckId) return;
        const stats = this.state.deckStats.get(deckId) || { total: 0 };
        stats.total = Math.max(0, (stats.total || 0) + delta);
        this.state.deckStats.set(deckId, stats);
    },
    insertDueIndex(deckId, cardId, dueTs) {
        if (!deckId || !cardId || !this.isValidDueTs(dueTs)) return;
        let arr = this.state.dueIndex.get(deckId);
        if (!arr) {
            arr = [];
            this.state.dueIndex.set(deckId, arr);
        }
        let lo = 0;
        let hi = arr.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (arr[mid].due <= dueTs) lo = mid + 1;
            else hi = mid;
        }
        arr.splice(lo, 0, { due: dueTs, id: cardId });
    },
    removeDueIndex(deckId, cardId, dueTs) {
        if (!deckId || !cardId || !this.isValidDueTs(dueTs)) return;
        const arr = this.state.dueIndex.get(deckId);
        if (!arr || arr.length === 0) return;
        let lo = 0;
        let hi = arr.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (arr[mid].due < dueTs) lo = mid + 1;
            else hi = mid;
        }
        for (let i = lo; i < arr.length && arr[i].due === dueTs; i++) {
            if (arr[i].id === cardId) {
                arr.splice(i, 1);
                break;
            }
        }
        if (arr.length === 0) this.state.dueIndex.delete(deckId);
    },
    getDueCountForDeck(deckId, nowMs = null) {
        const arr = this.state.dueIndex.get(deckId);
        if (!arr || arr.length === 0) return 0;
        const now = Number.isFinite(nowMs) ? nowMs : this.getEffectiveNowMs();
        let lo = 0;
        let hi = arr.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (arr[mid].due <= now) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    },
    buildCardMeta(card) {
        const deckId = card?.deckId || '';
        const deck = deckId ? this.deckById(deckId) : null;
        const schedulable = isSchedulable(card);
        const suspended = card?.suspended ? 1 : 0;
        const leech = !!card?.leech;
        const totalEligible = !!deckId && schedulable && !suspended;
        const dueEligible = totalEligible && !leech;
        const dueTs = dueEligible ? this.getCardDueTs(card, deck) : null;
        const tagsKey = this.getTagsKey(card?.tags);
        const tagsList = this.normalizeTagNames(card?.tags);
        const lastRating = normalizeRating(this.getLastRatingFor(card, deck) || '') || '';
        const flag = (card?.flag || '').trim();
        const marked = !!card?.marked;
        const createdDateKey = card?.createdAt ? this.formatDateKey(card.createdAt) : '';
        const versionSig = [
            deckId,
            schedulable ? 1 : 0,
            suspended,
            leech ? 1 : 0,
            flag,
            marked ? 1 : 0,
            tagsKey,
            lastRating,
            createdDateKey,
            dueEligible ? String(dueTs ?? '') : ''
        ].join('|');

        const learning = parseSrsState(card?.srsState || null).learning;
        const history = Array.isArray(card?.reviewHistory) ? card.reviewHistory : [];
        const firstEntry = history.length > 0 ? history[0] : null;
        const lastEntry = history.length > 0 ? history[history.length - 1] : null;
        const firstEntrySig = firstEntry ? `${firstEntry.rating || ''}:${firstEntry.at || ''}:${Number.isFinite(firstEntry.ms) ? firstEntry.ms : 0}` : '';
        const lastEntrySig = lastEntry ? `${lastEntry.rating || ''}:${lastEntry.at || ''}:${Number.isFinite(lastEntry.ms) ? lastEntry.ms : 0}` : '';
        const trainingSig = [
            history.length,
            firstEntrySig,
            lastEntrySig
        ].join('|');
        const lastReview = card?.fsrs?.lastReview || card?.sm2?.lastReview || '';
        const analyticsSig = [
            deckId,
            suspended,
            leech ? 1 : 0,
            dueEligible ? String(dueTs ?? '') : '',
            lastReview,
            lastRating,
            card?.sm2?.repetitions ?? '',
            card?.sm2?.easeFactor ?? '',
            card?.fsrs?.difficulty ?? '',
            learning?.state || '',
            Number.isFinite(learning?.step) ? learning.step : '',
            learning?.due || '',
            Number.isFinite(learning?.lapses) ? learning.lapses : '',
            history.length,
            lastEntrySig
        ].join('|');

        return { deckId, totalEligible, dueEligible, dueTs, versionSig, analyticsSig, trainingSig, tagsList, flag, marked, lastRating, createdDateKey };
    },
    updateCardIndices(card) {
        if (!card?.id) return;
        const prev = this.state.cardMeta.get(card.id);
        if (prev?.deckId) {
            if (prev.totalEligible) this.adjustDeckTotal(prev.deckId, -1);
            if (prev.dueEligible && this.isValidDueTs(prev.dueTs)) {
                this.removeDueIndex(prev.deckId, card.id, prev.dueTs);
            }
        }
        const next = this.buildCardMeta(card);
        if (next.deckId) {
            if (next.totalEligible) this.adjustDeckTotal(next.deckId, 1);
            if (next.dueEligible && this.isValidDueTs(next.dueTs)) {
                this.insertDueIndex(next.deckId, card.id, next.dueTs);
            }
        }
        this.updateTagIndex(prev?.tagsList, next.tagsList, card.id);
        this.updateFlagIndex(prev?.flag, next.flag, card.id);
        this.updateMarkedIndex(!!prev?.marked, !!next.marked, card.id);
        this.updateRatingIndex(prev?.lastRating, next.lastRating, card.id);
        this.updateCreatedDateIndex(prev?.createdDateKey, next.createdDateKey, card.id);
        this.state.cardMeta.set(card.id, next);
        const prevTrainingSig = prev?.trainingSig || '0||';
        const nextTrainingSig = next.trainingSig || '0||';
        const prevHasTraining = !prevTrainingSig.startsWith('0|');
        const nextHasTraining = !nextTrainingSig.startsWith('0|');
        const trainingChanged = prevTrainingSig !== nextTrainingSig || prev?.deckId !== next.deckId;
        if (trainingChanged && (prevHasTraining || nextHasTraining)) {
            if (prev?.deckId) {
                this.bumpFsrsDeckHistoryVersion(prev.deckId);
                this.state.fsrsTrainingCache.delete(prev.deckId);
            }
            if (next.deckId) {
                this.bumpFsrsDeckHistoryVersion(next.deckId);
                this.state.fsrsTrainingCache.delete(next.deckId);
            }
        }
        if (!prev || prev.versionSig !== next.versionSig) {
            this.state.cardsVersion = (this.state.cardsVersion || 0) + 1;
        }
        if (!prev || prev.analyticsSig !== next.analyticsSig || prev.versionSig !== next.versionSig) {
            this.state.analyticsDirty = true;
        }
    },
    removeCardMeta(cardId) {
        const prev = this.state.cardMeta.get(cardId);
        if (!prev) {
            this.removeAnalyticsSummaryForCard(cardId);
            return;
        }
        if (prev.deckId) {
            if (prev.totalEligible) this.adjustDeckTotal(prev.deckId, -1);
            if (prev.dueEligible && this.isValidDueTs(prev.dueTs)) {
                this.removeDueIndex(prev.deckId, cardId, prev.dueTs);
            }
        }
        this.updateTagIndex(prev.tagsList, [], cardId);
        this.updateFlagIndex(prev.flag, '', cardId);
        this.updateMarkedIndex(!!prev.marked, false, cardId);
        this.updateRatingIndex(prev.lastRating, '', cardId);
        this.updateCreatedDateIndex(prev.createdDateKey, '', cardId);
        this.state.cardMeta.delete(cardId);
        if (prev.deckId && prev.trainingSig && !prev.trainingSig.startsWith('0|')) {
            this.bumpFsrsDeckHistoryVersion(prev.deckId);
            this.state.fsrsTrainingCache.delete(prev.deckId);
        }
        this.state.cardsVersion = (this.state.cardsVersion || 0) + 1;
        this.state.analyticsDirty = true;
        this.removeAnalyticsSummaryForCard(cardId);
    },
    reindexDeckDue(deckId) {
        if (!deckId) return;
        const deckCards = this.cardsForDeck(deckId);
        for (const card of deckCards) {
            this.updateCardIndices(card);
        }
    },
    setCard(card) {
        if (!card?.id) return;

        card.suspended = card.suspended ? 1 : 0;
        const normalizedHistory = this.normalizeReviewHistory(card.reviewHistory);
        if (!this.reviewHistoriesEqual(card.reviewHistory, normalizedHistory)) {
            card.reviewHistory = normalizedHistory;
        }
        const oldCard = this.state.cards.get(card.id);

        const oldTags = oldCard?.tags || [];
        const newTags = card.tags || [];
        const seenTags = new Set();

        if (oldCard) {
            oldTags.forEach(t => {
                const entry = this.state.tagRegistry.get(t.name);
                if (entry) {
                    entry.count--;
                    if (entry.count <= 0) this.state.tagRegistry.delete(t.name);
                }
            });
        }

        newTags.forEach(t => {
            if (!seenTags.has(t.name)) {
                seenTags.add(t.name);
                const entry = this.state.tagRegistry.get(t.name);
                if (entry) {
                    entry.count++;
                    // Update color if it changed to something non-default
                    if (t.color && t.color !== 'default') entry.color = t.color;
                } else {
                    this.state.tagRegistry.set(t.name, { count: 1, color: t.color || 'default' });
                }
            }
        });

        this.state.cards.set(card.id, card);
        if (oldCard?.notionId && oldCard.notionId !== card.notionId) {
            this.state.cardNotionIdIndex.delete(oldCard.notionId);
        }
        if (card.notionId) {
            this.state.cardNotionIdIndex.set(card.notionId, card.id);
        } else if (oldCard?.notionId) {
            this.state.cardNotionIdIndex.delete(oldCard.notionId);
        }

        if (this.state.cardDeckIndex && card.deckId) {
            if (oldCard && oldCard.deckId && oldCard.deckId !== card.deckId) {
                const oldSet = this.state.cardDeckIndex.get(oldCard.deckId);
                if (oldSet) oldSet.delete(card.id);
            }
            if (!this.state.cardDeckIndex.has(card.deckId)) {
                this.state.cardDeckIndex.set(card.deckId, new Set());
            }
            this.state.cardDeckIndex.get(card.deckId).add(card.id);
        }
        this.updateCardIndices(card);
        this.updateAnalyticsSummaryForCard(card);
    },
    removeCard(cardId) {
        const card = this.state.cards.get(cardId);
        if (!card) return;

        if (card.notionId) {
            this.state.cardNotionIdIndex.delete(card.notionId);
        }
        if (this.state.cardDeckIndex && card.deckId) {
            const set = this.state.cardDeckIndex.get(card.deckId);
            if (set) set.delete(cardId);
        }

        (card.tags || []).forEach(t => {
            const entry = this.state.tagRegistry.get(t.name);
            if (entry) {
                entry.count--;
                if (entry.count <= 0) this.state.tagRegistry.delete(t.name);
            }
        });

        this.state.cards.delete(cardId);
        this.removeCardMeta(cardId);
    },
    deckName(id) {
        return this.deckById(id)?.name ?? '—';
    },
    hasStudyDeckFilter() {
        const f = normalizeFilterState(this.state.filters);
        return (f.studyDecks.length > 0) || (f.studyDecksExclude.length > 0);
    },
    getEffectiveStudyDeckIds() {
        const f = normalizeFilterState(this.state.filters);
        const allDeckIds = this.state.decks.map(d => d.id);
        const include = f.studyDecks.filter(id => allDeckIds.includes(id));
        const exclude = new Set(f.studyDecksExclude.filter(id => allDeckIds.includes(id)));
        const base = include.length > 0 ? include : allDeckIds;
        return base.filter(id => !exclude.has(id));
    },
    getDeckLabel(deckIds) {
        if (!deckIds || deckIds.length === 0) return 'No decks';
        const allDeckIds = this.state.decks.map(d => d.id);
        const isAllDecks = deckIds.length === allDeckIds.length &&
            deckIds.every(id => allDeckIds.includes(id));
        if (isAllDecks) return 'All decks';
        if (deckIds.length === 1) return this.deckById(deckIds[0])?.name || 'Unknown';
        return `${deckIds.length} decks`;
    },
    resetFilters() {
        const { suspended, leech } = normalizeFilterState(this.state.filters);
        this.state.filters = normalizeFilterState({
            again: false,
            hard: false,
            addedToday: false,
            tags: [],
            tagsExclude: [],
            tagEmptyMode: FILTER_MODE_IGNORE,
            suspended,
            leech,
            marked: false,
            flag: [],
            flagExclude: [],
            flagEmptyMode: FILTER_MODE_IGNORE,
            studyDecks: [],
            studyDecksExclude: []
        });
        el('#filterAgain').checked = false;
        el('#filterHard').checked = false;
        el('#filterAddedToday').checked = false;
        const filterSuspended = el('#filterSuspended');
        const filterLeech = el('#filterLeech');
        if (filterSuspended) filterSuspended.checked = !!suspended;
        if (filterLeech) filterLeech.checked = !!leech;
        el('#filterMarked').checked = false;
        const filterFlagSwatches = el('#filterFlagSwatches');
        if (filterFlagSwatches) this.updateFlagSwatchTriState(filterFlagSwatches);
        this.renderStudyDeckSelection();
        this.renderTagFilter();
        this.renderStudy();
        this.renderCards();
        this.updateActiveFiltersCount();
    },
    openNotesModal() {
        const card = this.state.selectedCard;
        if (!card) return toast('No card selected');
        el('#notesArea').value = card.notes || '';
        el('#noteStatus').textContent = '';
        this.openModal('notesModal');
    },
    async saveNotes() {
        const card = this.state.selectedCard;
        if (!card) return;
        card.notes = el('#notesArea').value;
        await Storage.put('cards', card);
        this.queueOp({ type: 'card-upsert', payload: card });
        el('#noteStatus').textContent = 'Saved';
        el('#notesPreview').innerHTML = card.notes ? safeMarkdownParse(card.notes) : '<p class="text-muted text-sm">No notes yet.</p>';
        applyMediaEmbeds(el('#notesPreview'));
        this.renderMath(el('#notesPreview'));
        this.closeModal('notesModal');
        toast('Notes saved');
    },
    openAddBlockModal() {
        const card = this.state.selectedCard;
        if (!card) return toast('No card selected');
        if (!card.notionId) return toast('Card not synced to Notion yet');
        el('#blockNoteArea').value = '';
        this.renderBlockNotePreview();
        this.openModal('addBlockModal');
    },
    renderBlockNotePreview() {
        const area = el('#blockNoteArea');
        const preview = el('#blockNotePreview');
        if (!area || !preview) return;
        const md = (area.value || '').trim();
        if (!md) {
            preview.innerHTML = '<p class="text-faint ">Type a note to preview media embeds.</p>';
            return;
        }
        preview.innerHTML = safeMarkdownParse(md);
        applyMediaEmbeds(preview);
        this.renderMath(preview);
    },
    async saveBlockNote() {
        const card = this.state.selectedCard;
        if (!card || !card.notionId) return toast('Card not synced to Notion');
        const content = el('#blockNoteArea').value.trim();
        if (!content) return toast('Please enter some text');

        // Add timestamp prefix
        const timestamp = new Date().toLocaleString();
        const fullContent = `[${timestamp}] ${content}`;

        // Create Notion paragraph block (no 'object' property needed for children)
        const block = {
            type: 'paragraph',
            paragraph: {
                rich_text: markdownToNotionRichText(fullContent)
            }
        };

        // Queue the block append operation
        await this.queueOp({
            type: 'block-append',
            payload: {
                pageId: card.notionId,
                blocks: [block]
            }
        });

        this.closeModal('addBlockModal');
        toast('Note queued for sync');
    },
    async copyCardContent() {
        const card = this.state.selectedCard;
        if (!card) return toast('No card selected');
        const deck = this.deckById(card.deckId);
        const isCloze = (card.type || '').toLowerCase() === 'cloze';
        let content = `## ${card.name}\n\n`;
        if (!isCloze && card.back) {
            content += `**Answer:**\n${card.back}\n\n`;
        }
        if (card.notes) {
            content += `**Notes:**\n${card.notes}\n\n`;
        }
        content += `Deck: ${deck?.name ?? '—'}`;
        try {
            await navigator.clipboard.writeText(content);
            toast('Copied to clipboard');
        } catch (_) {
            toast('Copy failed');
        }
    },
    async handleAnkiImport(file) {
        if (!file) return;
        if (file.size > 100 * 1024 * 1024) return toast('File too large (max 100MB)');
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'apkg' || ext === 'zip') {
            await this.importApkg(file);
            return;
        }
        const text = await file.text();
        let payload;
        try { payload = JSON.parse(text); } catch { payload = null; }
        if (!payload?.cards?.length) return toast('Unsupported file');

        const deckName = file.name.replace('.apkg', '').replace('.json', '');
        let deck = this.state.decks.find(d => d.name === deckName);
        if (!deck) {
            deck = this.newDeck(deckName, 'SM-2');
            this.state.decks.push(deck);
            await Storage.put('decks', deck);
            this.queueOp({ type: 'deck-upsert', payload: deck });
        }

        let importedCount = 0;
        for (const raw of payload.cards) {
            const guid = raw.guid || raw.id || null;

            const card = this.newCard(deck.id, raw.name || raw.front || 'Imported', raw.back || '', raw.type || 'Front-Back');
            card.tags = (raw.tags || []).map(t => typeof t === 'string' ? { name: t, color: 'default' } : t);
            card.notes = raw.notes || '';
            card.ankiGuid = guid || crypto.randomUUID();
            this.setCard(card);
            await Storage.put('cards', card);
            this.queueOp({ type: 'card-upsert', payload: card });
            importedCount++;
        }
        this.state.analyticsDirty = true;
        this.renderAll();
        toast(`Imported ${importedCount} cards from JSON`);
    },
    async importApkg(file) {
        try {
            showLoading('Importing Anki deck...', 'Reading file...');
            const buf = await file.arrayBuffer();
            setLoadingProgress(10, 'Extracting archive...');
            const zip = await JSZip.loadAsync(buf);
            const collectionFile = zip.file('collection.anki2');
            if (!collectionFile) {
                hideLoading();
                toast('Invalid .apkg file: missing collection.anki2');
                return;
            }
            setLoadingProgress(25, 'Parsing database...');
            const collection = await collectionFile.async('uint8array');
            const SQL = await Storage.ensureSQL();
            const db = new SQL.Database(collection);
            const colRow = db.exec("SELECT * FROM col LIMIT 1")[0];
            const row = colRow?.values?.[0] || [];
            const models = JSON.parse(row[9] || '{}');
            const decksJson = JSON.parse(row[10] || '{}');
            const decksMap = {};
            Object.values(decksJson).forEach(d => { decksMap[d.id] = d.name; });
            const notes = db.exec("SELECT id,guid,mid,mod,usn,tags,flds,sfld,csum,flags,data FROM notes")[0]?.values || [];
            const cards = db.exec("SELECT id,nid,did,ord,mod,usn,type,queue,due,ivl,factor,reps,lapses,left,odue,odid,flags,data FROM cards")[0]?.values || [];
            setLoadingProgress(50, 'Processing cards...');

            const deckCache = {};
            const notesById = new Map(notes.map(n => [n[0], n]));
            let importedCount = 0;
            const batchSize = 200;
            let batchCards = [];
            let batchQueue = [];

            const normalizeAnkiFieldName = (name) => {
                const raw = (name || '').toString().trim();
                if (!raw) return '';
                const parts = raw.split(':');
                return (parts[parts.length - 1] || '').trim();
            };

            const renderAnkiTemplate = (template, fieldMap, extras = {}) => {
                let out = (template || '').toString();
                if (!out) return '';

                const resolveField = (rawName) => {
                    const key = normalizeAnkiFieldName(rawName);
                    if (!key) return '';
                    if (key === 'FrontSide') return extras.frontSide ?? '';
                    if (key === 'Tags') return extras.tags ?? '';
                    if (key === 'Deck') return extras.deck ?? '';
                    return fieldMap[key] ?? '';
                };

                const sectionRe = /\{\{([#^])\s*([^}]+?)\s*\}\}([\s\S]*?)\{\{\/\s*\2\s*\}\}/g;
                let prev;
                do {
                    prev = out;
                    out = out.replace(sectionRe, (_, type, key, body) => {
                        const val = resolveField(key);
                        const hasVal = !!(val && String(val).trim());
                        return type === '#' ? (hasVal ? body : '') : (hasVal ? '' : body);
                    });
                } while (out !== prev);

                out = out.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key) => {
                    const trimmed = (key || '').trim();
                    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('^') || trimmed.startsWith('/')) return '';
                    return resolveField(trimmed);
                });

                return out;
            };

            const stripAnkiBackFrontSide = (html) => {
                if (!html) return '';
                return html
                    .replace(/\{\{\s*FrontSide\s*\}\}/gi, '')
                    .replace(/<hr\s+id=["']?answer["']?\s*\/?>/gi, '');
            };

            const flushBatch = async () => {
                if (batchCards.length === 0) return;
                try {
                    await Storage.putMany('cards', batchCards);
                    batchQueue.forEach(op => this.queueOp(op));
                } catch (e) {
                    console.error('Batch import failed:', e);
                    for (const c of batchCards) await Storage.put('cards', c);
                    batchQueue.forEach(op => this.queueOp(op));
                }
                setLoadingProgress(30 + Math.floor((importedCount / cards.length) * 70), `Imported ${importedCount} cards...`);
                batchCards = [];
                batchQueue = [];
            };

            const cardsByNid = new Map();
            for (const cardRow of cards) {
                const [cid, nid, did, ord] = cardRow;
                if (!cardsByNid.has(nid)) cardsByNid.set(nid, []);
                cardsByNid.get(nid).push({ cid, nid, did, ord });
            }

            const resolveDeckForDid = async (deckId) => {
                if (!deckCache[deckId]) {
                    let deckName = decksMap[deckId] || file.name.replace('.apkg', '');

                    let finalDeckName = deckName;
                    let suffix = 1;
                    while (this.state.decks.some(d => d.name === finalDeckName)) {
                        finalDeckName = `${deckName} (${suffix++})`;
                    }

                    let deck = this.state.decks.find(d => d.name === finalDeckName);
                    if (!deck) {
                        deck = this.newDeck(finalDeckName, 'SM-2');
                        this.state.decks.push(deck);
                        await Storage.put('decks', deck);
                        this.queueOp({ type: 'deck-upsert', payload: deck });
                    }
                    deckCache[deckId] = deck;
                }
                return deckCache[deckId];
            };

            for (const [nid, cardRows] of cardsByNid.entries()) {
                const note = notesById.get(nid);
                if (!note) continue;
                const [_, guid, mid, mod, usn, tags, flds] = note;

                const model = models[mid];
                const fields = (flds || '').split('\u001f');
                const front = fields[0] || 'Imported';
                const back = fields[1] || '';
                const isCloze = model?.type === 1;
                const fieldMap = {};
                (model?.flds || []).forEach((f, idx) => {
                    if (f?.name) fieldMap[f.name] = fields[idx] || '';
                });
                const noteTags = (tags || '').trim();

                if (isCloze) {
                    const firstRow = cardRows[0];
                    const deck = await resolveDeckForDid(firstRow.did);
                    if (!deck) continue;

                    // Create parent card (no SRS scheduling - sub-items handle that)
                    const parent = this.newCard(deck.id, front, back || front, 'Cloze');
                    parent.tags = (tags || '').trim().split(' ').filter(Boolean).map(t => ({ name: t.replace(/^\s*/, '').replace(/\s*$/, ''), color: 'default' }));
                    parent.ankiGuid = guid;
                    parent.ankiNoteType = model?.name || '';
                    parent.ankiFields = JSON.stringify(fields);

                    const clozeSet = parseClozeIndices(front);
                    if (clozeSet.size === 0 && back) {
                        parseClozeIndices(back).forEach(i => clozeSet.add(i));
                    }
                    const clozeIndices = Array.from(clozeSet).filter(n => n > 0).sort((a, b) => a - b);
                    parent.clozeIndexes = clozeIndices.length ? clozeIndices.join(',') : '';

                    // Parent doesn't get scheduled - clear due dates
                    parent.fsrs.dueDate = null;
                    parent.sm2.dueDate = null;
                    parent.subCards = [];

                    this.setCard(parent);
                    batchCards.push(parent);
                    batchQueue.push({ type: 'card-upsert', payload: parent });
                    importedCount++;

                    for (const idx of clozeIndices) {
                        const subItem = createSubItem(parent, idx, deck.id, () => this.makeTempId());
                        this.setCard(subItem);
                        parent.subCards.push(subItem.id);
                        batchCards.push(subItem);
                        batchQueue.push({ type: 'card-upsert', payload: subItem });
                        importedCount++;
                    }
                } else {
                    const templates = Array.isArray(model?.tmpls) ? model.tmpls : [];
                    const templateByOrd = new Map();
                    templates.forEach(t => {
                        if (t && Number.isFinite(Number(t.ord))) templateByOrd.set(Number(t.ord), t);
                    });

                    const seenOrd = new Set();
                    for (const row of cardRows) {
                        const ord = Number(row.ord);
                        if (Number.isFinite(ord) && seenOrd.has(ord)) continue;
                        if (Number.isFinite(ord)) seenOrd.add(ord);
                        const deck = await resolveDeckForDid(row.did);
                        if (!deck) continue;

                        const tmpl = templateByOrd.get(ord) || templates[ord] || templates[0] || null;
                        const extras = { tags: noteTags, deck: deck.name || '', frontSide: '' };
                        const renderedFront = tmpl ? renderAnkiTemplate(tmpl.qfmt || '', fieldMap, extras) : front;
                        const renderedBack = tmpl ? renderAnkiTemplate(tmpl.afmt || '', fieldMap, extras) : back;
                        const finalFront = (renderedFront || front || 'Imported').trim() || 'Imported';
                        const finalBack = stripAnkiBackFrontSide(renderedBack || back || '');

                        const card = this.newCard(deck.id, finalFront, finalBack, 'Front-Back');
                        card.tags = noteTags.split(' ').filter(Boolean).map(t => ({ name: t.replace(/^\s*/, '').replace(/\s*$/, ''), color: 'default' }));
                        card.ankiGuid = guid;
                        card.ankiNoteType = model?.name || '';
                        card.ankiFields = JSON.stringify(fields);
                        card.clozeIndexes = '';

                        this.setCard(card);
                        batchCards.push(card);
                        batchQueue.push({ type: 'card-upsert', payload: card });
                        importedCount++;
                    }
                }

                if (batchCards.length >= batchSize) {
                    await flushBatch();
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }

            // Flush remaining items
            await flushBatch();

            this.state.queueLastChangedAt = new Date().toISOString();
            await Storage.setMeta('queueLastChangedAt', this.state.queueLastChangedAt);
            this.updateSyncButtonState();
            this.renderConnection();

            setLoadingProgress(100, 'Complete!');
            hideLoading();
            this.state.analyticsDirty = true;
            this.renderAll();
            toast(`Imported ${importedCount} cards from .apkg`);

            // Trigger sync if online
            if (this.state.queue.size > 0) {
                this.requestAutoSyncSoon(2000, 'import');
            }
        } catch (e) {
            hideLoading();
            console.error(e);
            toast('Import failed');
        }
    },
    async exportAnki() {
        const deck = this.state.selectedDeck || this.state.decks[0];
        if (!deck) return toast('No deck to export');
        const cards = this.cardsForDeck(deck.id);
        try {
            const dbBytes = await this.buildApkgSql(deck, cards);
            const zip = new JSZip();
            zip.file('collection.anki2', dbBytes);
            zip.file('media', JSON.stringify({}));
            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeName = (deck.name || 'deck')
                .toString()
                .replace(/[\\/:*?"<>|]+/g, '-')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 120) || 'deck';
            a.download = `${safeName}.apkg`;
            a.click();
            URL.revokeObjectURL(url);
            toast('Exported .apkg');
        } catch (e) {
            toast('Export failed');
            console.error(e);
        }
    },
    async buildApkgSql(deck, cards) {
        const SQL = await Storage.ensureSQL();
        const db = new SQL.Database();
        db.run(`CREATE TABLE col (id integer primary key, crt integer, mod integer, scm integer, ver integer, dty integer, usn integer, ls integer, conf text, models text, decks text, dconf text, tags text);`);
        db.run(`CREATE TABLE notes (id integer primary key, guid text, mid integer, mod integer, usn integer, tags text, flds text, sfld text, csum integer, flags integer, data text);`);
        db.run(`CREATE TABLE cards (id integer primary key, nid integer, did integer, ord integer, mod integer, usn integer, type integer, queue integer, due integer, ivl integer, factor integer, reps integer, lapses integer, left integer, odue integer, odid integer, flags integer, data text);`);
        db.run(`CREATE TABLE revlog (id integer primary key, cid integer, usn integer, ease integer, ivl integer, lastIvl integer, factor integer, time integer, type integer);`);
        db.run(`CREATE TABLE graves (id integer primary key, oid integer, type integer, usn integer);`);

        const nowMs = Date.now();
        const now = Math.floor(nowMs / 1000);
        const dayStart = Math.floor(now / 86400);
        const deckId = Math.abs(this.hash(deck.name));
        const modelBasicId = deckId + 1;
        const modelClozeId = deckId + 2;

        const cardMap = this.state.cards; // Already a Map

        const conf = { nextPos: 1, estTimes: true, activeDecks: [deckId], sortType: "noteFld", sortBackwards: false, newSpread: 0, dueCounts: true, curDeck: deckId, timeLim: 0 };
        const models = {};
        models[modelBasicId] = {
            id: modelBasicId,
            name: "Basic",
            type: 0,
            mod: now,
            usn: 0,
            sortf: 0,
            did: deckId,
            latexPre: "\\documentclass{article}\\begin{document}",
            latexPost: "\\end{document}",
            flds: [
                { name: "Front", ord: 0, sticky: false, rtl: false, font: "Arial", size: 20, media: [] },
                { name: "Back", ord: 1, sticky: false, rtl: false, font: "Arial", size: 20, media: [] }
            ],
            tmpls: [
                { name: "Card 1", ord: 0, qfmt: "{{Front}}", afmt: "{{FrontSide}}<hr id=answer>{{Back}}", did: null, bqfmt: "", bafmt: "" }
            ],
            css: ".card { font-family: Arial; font-size: 20px; }"
        };
        models[modelClozeId] = {
            id: modelClozeId,
            name: "Cloze",
            type: 1,
            mod: now,
            usn: 0,
            sortf: 0,
            did: deckId,
            flds: [
                { name: "Text", ord: 0, sticky: false, rtl: false, font: "Arial", size: 20, media: [] },
                { name: "Back Extra", ord: 1, sticky: false, rtl: false, font: "Arial", size: 20, media: [] }
            ],
            tmpls: [{ name: "Cloze", ord: 0, qfmt: "{{cloze:Text}}", afmt: "{{cloze:Text}}<br>{{Back Extra}}", did: null }],
            css: ".card { font-family: Arial; font-size: 20px; }"
        };

        const decks = {};
        decks[deckId] = { id: deckId, name: deck.name, mod: now, usn: 0, desc: "", dyn: 0, extendNew: 0, extendRev: 0, conf: 1, collapsed: false, browserCollapsed: false, newToday: [dayStart, 0], revToday: [dayStart, 0], lrnToday: [dayStart, 0], timeToday: [dayStart, 0] };
        const dconf = { 1: { id: 1, name: "Default", new: { perDay: 20 }, rev: { perDay: 200 }, lapse: { delays: [10], mult: 0 }, dyn: false, maxTaken: 60, timer: 0 } };
        const tags = {};
        const colRow = db.prepare("INSERT INTO col VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
        colRow.run([nowMs, dayStart, now, now, 11, 0, 0, 0, JSON.stringify(conf), JSON.stringify(models), JSON.stringify(decks), JSON.stringify(dconf), JSON.stringify(tags)]);

        let nidCounter = nowMs;
        let cidCounter = nowMs + 500;
        const noteStmt = db.prepare("INSERT INTO notes VALUES (?,?,?,?,?,?,?,?,?,?,?)");
        const cardStmt = db.prepare("INSERT INTO cards VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");

        // Group sub-items by parent for cloze export
        const parentGroups = new Map(); // parentId → subItems[]
        const regularCards = [];
        const exportedParentIds = new Set();

        for (const card of cards) {
            if (isSubItem(card)) {
                const list = parentGroups.get(card.parentCard) || [];
                list.push(card);
                parentGroups.set(card.parentCard, list);
            } else if (!isClozeParent(card)) {
                regularCards.push(card);
            }
        }

        // Export regular (non-cloze) cards
        regularCards.forEach((card, idx) => {
            const mid = modelBasicId;
            const nid = ++nidCounter;

            const fields = [card.name, card.back];
            const flds = fields.join('\u001f');
            const tagStr = card.tags.length ? card.tags.map(t => t.name.trim()).join(' ') + ' ' : '';
            const sfld = fields[0];
            const csum = Math.abs(this.hash(flds)) >>> 0;
            noteStmt.run([nid, card.ankiGuid || crypto.randomUUID(), mid, now, 0, tagStr, flds, sfld, csum, 0, ""]);

            const cid = ++cidCounter;
            cardStmt.run([cid, nid, deckId, 0, now, 0, 0, 0, idx + 1, 0, 0, 0, 0, 0, 0, 0, 0, ""]);
        });

        // Export cloze parents with their sub-items
        let clozeIdx = regularCards.length;
        for (const [parentId, subs] of parentGroups) {
            const parent = cardMap.get(parentId);
            if (!parent) continue;

            const mid = modelClozeId;
            const nid = ++nidCounter;

            const fields = [parent.name, parent.back];
            const flds = fields.join('\u001f');
            const tagStr = parent.tags.length ? parent.tags.map(t => t.name.trim()).join(' ') + ' ' : '';
            const sfld = fields[0];
            const csum = Math.abs(this.hash(flds)) >>> 0;
            noteStmt.run([nid, parent.ankiGuid || crypto.randomUUID(), mid, now, 0, tagStr, flds, sfld, csum, 0, ""]);

            // Create cards from sub-items (use sub.order as ordinal)
            for (const sub of subs) {
                const cid = ++cidCounter;
                // Parse cloze index; fallback to 0 if NaN
                const clozeIndex = parseInt(sub.clozeIndexes, 10);
                const ord = sub.order ?? (Number.isFinite(clozeIndex) ? clozeIndex - 1 : 0);
                cardStmt.run([cid, nid, deckId, Number.isFinite(ord) ? ord : 0, now, 0, 0, 0, ++clozeIdx, 0, 0, 0, 0, 0, 0, 0, 0, ""]);
            }
        }

        return new Uint8Array(db.export());
    },
    hash(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = Math.imul(31, h) + str.charCodeAt(i) | 0;
        }
        return h;
    },
    updateCounts() {
        el('#cardCount').textContent = String(this.state.cards.size);
        const deckCount = this.state.decks.filter(d => !d.archived).length;
        el('#deckCount').textContent = String(deckCount);
        el('#queueCount').textContent = String(this.state.queue.size);
    },
    openSettings() {
        setLastFocusedElement(document.activeElement);
        const s = this.state.settings;
        el('#settingWorkerUrl').value = s.workerUrl;
        el('#settingProxyToken').value = s.proxyToken;
        el('#settingAuthToken').value = s.authToken.startsWith('secret_') ? s.authToken : s.authToken;
        const modal = el('#settingsModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        this.renderStatus();
        this.updateSettingsButtons();
        focusTrap.attach(modal);
    },
    closeSettings() {
        focusTrap.detach();
        uiCloseModal('settingsModal');
    },
    showAiBlockedModal(reason) {
        const modal = el('#aiSettingsRequiredModal');
        const title = el('#aiSettingsModalTitle');
        const body = el('#aiSettingsModalBody');
        const actions = el('#aiSettingsModalActions');
        const closeBtn = el('#closeAiSettingsModal');
        const openSettingsBtn = el('#openSettingsFromAiModal');
        if (!modal || !title || !body || !actions) return;

        if (reason === 'offline') {
            title.textContent = 'AI not available offline';
            body.textContent = 'Reconnect to use AI mode. We switched you back to Reveal.';
            if (openSettingsBtn) openSettingsBtn.classList.add('hidden');
            if (closeBtn) closeBtn.textContent = 'OK';
            closeBtn.onclick = () => {
                this.closeModal('aiSettingsRequiredModal');
                const revisionSelect = el('#revisionMode');
                if (revisionSelect) revisionSelect.value = 'manual';
                el('#aiControls')?.classList.add('hidden');
            };
        } else {
            title.textContent = 'AI settings required';
            body.textContent = 'Set and verify your AI provider in Settings to enable AI mode.';
            if (openSettingsBtn) openSettingsBtn.classList.remove('hidden');
            if (closeBtn) closeBtn.textContent = 'Cancel';
            closeBtn.onclick = () => this.closeModal('aiSettingsRequiredModal');
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },
    async saveSettings() {
        const prevWorkerUrl = this.state.settings.workerUrl;
        const prevProxyToken = this.state.settings.proxyToken;
        const prevAiProvider = this.state.settings.aiProvider || '';
        const prevAiModel = this.state.settings.aiModel || '';
        const prevAiKey = this.state.settings.aiKey || '';
        const prevDyUseJudge = this.state.settings.dyUseJudgeAi === true;
        const prevDyProvider = this.state.settings.dyProvider || '';
        const prevDyModel = this.state.settings.dyModel || '';
        const prevDyKey = this.state.settings.dyKey || '';
        this.state.settings.workerUrl = el('#settingWorkerUrl').value.trim();
        this.state.settings.proxyToken = el('#settingProxyToken').value.trim();
        if (this.state.settings.workerUrl !== prevWorkerUrl || this.state.settings.proxyToken !== prevProxyToken) {
            this.state.workerVerified = false;
            this.state.settings.workerVerified = false;
        }
        const authVal = el('#settingAuthToken').value.trim();
        const prevAuth = this.state.settings.authToken;
        if (authVal) {
            this.state.settings.authToken = authVal;
            if (authVal !== prevAuth) {
                this.state.authVerified = false;
                this.state.settings.authVerified = false;
            }
        } else {
            this.state.settings.authToken = '';
            this.state.authVerified = false;
            this.state.settings.authVerified = false;
        }
        // Save AI settings
        const aiProvider = el('#aiProvider').value;
        const aiModel = el('#aiModel').value.trim();
        const aiKey = el('#aiKey').value.trim();
        this.state.settings.aiProvider = aiProvider;
        this.state.settings.aiModel = aiModel;
        this.state.settings.aiKey = aiKey;
        const aiKeyChanged = !!(aiKey !== prevAiKey);
        const aiChanged = (aiProvider || '') !== prevAiProvider || (aiModel || '') !== prevAiModel || aiKeyChanged;
        if (!aiProvider || aiChanged) {
            this.state.settings.aiVerified = false;
        }
        // Save DyContext AI settings (separate from judge)
        const dyUseJudgeAi = el('#dyUseJudgeAi')?.checked ?? true;
        const dyProvider = (el('#dyProvider')?.value || '').trim();
        const dyModel = (el('#dyModel')?.value || '').trim();
        const dyKey = (el('#dyKey')?.value || '').trim();
        this.state.settings.dyUseJudgeAi = dyUseJudgeAi;
        this.state.settings.dyProvider = dyProvider;
        this.state.settings.dyModel = dyModel;
        this.state.settings.dyKey = dyKey;
        const dyKeyChanged = !!(dyKey !== prevDyKey);
        const dyChanged = dyUseJudgeAi !== prevDyUseJudge
            || (dyProvider || '') !== prevDyProvider
            || (dyModel || '') !== prevDyModel
            || dyKeyChanged;
        if (dyUseJudgeAi || dyChanged || !dyProvider || !dyModel || !dyKey) {
            this.state.settings.dyVerified = false;
        }

        // Save STT settings
        const prevSttProvider = this.state.settings.sttProvider;
        const prevSttModel = this.state.settings.sttModel || '';
        const prevSttKey = this.state.settings.sttKey || '';
        const sttProvider = el('#sttProvider').value;
        const sttModel = el('#sttModel').value.trim();
        const sttKey = el('#sttKey').value.trim();
        const sttPrompt = el('#sttPrompt').value.trim();
        this.state.settings.sttProvider = sttProvider;
        this.state.settings.sttModel = sttModel;
        this.state.settings.sttKey = sttKey;
        this.state.settings.sttPrompt = sttPrompt;
        const sttKeyChanged = !!(sttKey !== prevSttKey);
        const sttChanged = (sttProvider || '') !== (prevSttProvider || '') || (sttModel || '') !== prevSttModel || sttKeyChanged;
        if (!sttProvider) {
            this.state.settings.sttVerified = false;
        } else if (sttProvider === 'browser') {
            this.state.settings.sttVerified = true;
        } else if (sttChanged) {
            this.state.settings.sttVerified = false;
        }

        Storage.setSettings(this.state.settings);
        this.renderStatus();
        this.applyTheme();
        this.applyFontMode();
        this.renderGate();
        this.applySttChangeEffects(!sttProvider || sttChanged);
        // If AI became unverified, force the UI out of AI mode to avoid a broken study flow.
        if (!this.state.settings.aiVerified) {
            const revisionSelect = el('#revisionMode');
            if (revisionSelect && revisionSelect.value === 'ai') revisionSelect.value = 'manual';
            el('#aiControls')?.classList.add('hidden');
            el('#sttSettings')?.classList.add('hidden');
            this.updateSkipHotkeyLabel(false);
            this.updateMobileFab();
        }

        // Check first sync status
        const isFirstSync = this.state.decks.length === 0 && this.state.cards.size === 0;

        if (isFirstSync && this.isReady()) {
            // Close settings and show sync loading overlay
            this.closeSettings();
            showLoading('Syncing your content...', 'Fetching decks and cards from Notion.');

            try {
                await this.syncNow();
                toast('Initial sync complete');
            } catch (err) {
                console.error('First sync error:', err);
                toast('Sync error - please try again');
            } finally {
                hideLoading();
                this.renderAll();
            }
        } else {
            this.closeSettings();
            this.renderConnection();
            toast('Settings saved');
        }
    },
    async verifyWorker() {
        if (!navigator.onLine) {
            toast('Offline: connect to verify worker');
            return;
        }
        const workerUrl = el('#settingWorkerUrl').value.trim();
        const proxyToken = el('#settingProxyToken').value.trim();
        if (!workerUrl) return toast('Add worker URL');
        try {
            const url = new URL(workerUrl.replace(/\/$/, ''));
            url.searchParams.append('url', 'https://api.notion.com/v1/users/me');
            const headers = {};
            if (proxyToken) headers['X-Proxy-Token'] = proxyToken;
            const res = await fetch(url.toString(), { headers });
            if (res.ok || res.status === 401) {
                toast('Worker reachable');
                this.state.settings.workerUrl = workerUrl;
                this.state.settings.proxyToken = proxyToken;
                this.state.workerVerified = true;
                this.state.settings.workerVerified = true;
                Storage.setSettings(this.state.settings);
                this.renderStatus();
                this.renderGate();
                el('#workerSettingsDetails')?.removeAttribute('open');
            } else throw new Error(res.status);
        } catch (e) {
            toast('Worker check failed');
            this.state.workerVerified = false;
            this.state.settings.workerVerified = false;
            Storage.setSettings(this.state.settings);
            this.renderStatus();
        }
    },
    async verifyAuth() {
        if (!navigator.onLine) {
            toast('Offline: connect to verify Notion token');
            return;
        }
        if (!this.state.settings.workerUrl) { this.updateSettingsButtons(); return toast('Add worker URL first'); }
        const workerUrl = (el('#settingWorkerUrl').value.trim()) || this.state.settings.workerUrl;
        const proxyToken = (el('#settingProxyToken').value.trim()) || this.state.settings.proxyToken;
        const authVal = (el('#settingAuthToken').value.trim()) || this.state.settings.authToken;
        if (!authVal) return toast('Add Notion token');
        try {
            showLoading('Verifying Notion token...', 'Checking access with Notion.');
            await API.request('GET', '/users/me', null, {
                workerUrl,
                proxyToken,
                authToken: authVal
            });
            this.state.settings.workerUrl = workerUrl;
            this.state.settings.proxyToken = proxyToken;
            this.state.settings.authToken = authVal;
            this.state.authVerified = true;
            this.state.settings.authVerified = true;
            Storage.setSettings(this.state.settings);
            toast('Token verified');
            this.renderStatus();
            this.renderGate();
            await this.scanSources();
        } catch (e) {
            console.error('Token verification failed:', e);
            this.state.authVerified = false;
            this.state.settings.authVerified = false;
            Storage.setSettings(this.state.settings);
            this.renderStatus();
            this.renderGate();
            toast('Token verification failed');
        } finally {
            hideLoading();
        }
    },
    async verifyAiSettings() {
        if (!navigator.onLine) {
            toast('Offline: connect to verify AI settings');
            return;
        }
        const provider = el('#aiProvider').value;
        const model = el('#aiModel').value.trim();
        const key = el('#aiKey').value.trim();
        if (!provider) return toast('Select an AI provider');
        if (!model) return toast('Enter a model name');
        if (!key) return toast('Enter an API key');
        try {
            showLoading('Verifying AI settings...', 'Testing connection to AI provider.');
            let endpoint, headers, body;
            if (provider === 'openai') {
                endpoint = 'https://api.openai.com/v1/models';
                headers = { 'Authorization': `Bearer ${key}` };
            } else if (provider === 'anthropic') {
                endpoint = 'https://api.anthropic.com/v1/messages';
                headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' };
                body = JSON.stringify({ model, max_tokens: 1, messages: [{ role: 'user', content: 'Hi' }] });
            } else if (provider === 'gemini') {
                endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
                headers = {};
            }
            const res = await fetch(endpoint, { method: body ? 'POST' : 'GET', headers, body });
            if (res.ok || res.status === 400) {
                this.state.settings.aiProvider = provider;
                this.state.settings.aiModel = model;
                this.state.settings.aiKey = key;
                this.state.settings.aiVerified = true;
                Storage.setSettings(this.state.settings);
                // Show STT settings now that AI is verified
                el('#sttSettings')?.classList.remove('hidden');
                this.updateDyContextSettingsUI();
                toast('AI settings verified');
            } else {
                throw new Error(`API returned ${res.status}`);
            }
        } catch (e) {
            this.state.settings.aiVerified = false;
            Storage.setSettings(this.state.settings);
            // Hide STT settings since AI is not verified
            el('#sttSettings')?.classList.add('hidden');
            this.updateDyContextSettingsUI();
            toast('AI verification failed: ' + e.message);
        } finally {
            hideLoading();
        }
    },
    async verifyDyContextSettings() {
        if (!navigator.onLine) {
            toast('Offline: connect to verify Dynamic Context AI settings');
            return;
        }
        const provider = el('#dyProvider')?.value || '';
        const model = el('#dyModel')?.value?.trim() || '';
        const key = el('#dyKey')?.value?.trim() || '';
        if (!provider) return toast('Select a provider for Dynamic Context');
        if (!model) return toast('Enter a model name for Dynamic Context');
        if (!key) return toast('Enter an API key for Dynamic Context');
        try {
            showLoading('Verifying Dynamic Context AI...', 'Testing connection to AI provider.');
            let endpoint, headers, body;
            if (provider === 'openai') {
                endpoint = 'https://api.openai.com/v1/models';
                headers = { 'Authorization': `Bearer ${key}` };
            } else if (provider === 'anthropic') {
                endpoint = 'https://api.anthropic.com/v1/messages';
                headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' };
                body = JSON.stringify({ model, max_tokens: 1, messages: [{ role: 'user', content: 'Hi' }] });
            } else if (provider === 'gemini') {
                endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
                headers = {};
            }
            const res = await fetch(endpoint, { method: body ? 'POST' : 'GET', headers, body });
            if (res.ok || res.status === 400) {
                this.state.settings.dyProvider = provider;
                this.state.settings.dyModel = model;
                this.state.settings.dyKey = key;
                this.state.settings.dyVerified = true;
                Storage.setSettings(this.state.settings);
                toast('Dynamic Context AI settings verified');
            } else {
                throw new Error(`API returned ${res.status}`);
            }
        } catch (e) {
            this.state.settings.dyVerified = false;
            Storage.setSettings(this.state.settings);
            toast('Dynamic Context AI verification failed: ' + e.message);
        } finally {
            hideLoading();
        }
    },
    async verifySttSettings() {
        if (!navigator.onLine) {
            toast('Offline: connect to verify speech settings');
            return;
        }
        const provider = el('#sttProvider').value;
        const model = el('#sttModel').value.trim();
        const key = el('#sttKey').value.trim();
        const prompt = el('#sttPrompt').value.trim();
        const inAiMode = normalizeRevisionMode(el('#revisionMode').value) === REVISION_MODE_AI;

        if (!provider) {
            this.state.settings.sttProvider = '';
            this.state.settings.sttModel = '';
            this.state.settings.sttKey = '';
            this.state.settings.sttPrompt = prompt;
            this.state.settings.sttVerified = false;
            this.state.settings.sttPermissionWarmed = false;
            Storage.setSettings(this.state.settings);
            this.state.sttProvider = '';
            this.state.sttVerified = false;
            this.state.sttKey = '';
            this.stopMicActivity(true);
            this.applySttChangeEffects(true);
            toast('Speech-to-text disabled');
            return;
        }

        if (provider === 'browser') {
            this.state.settings.sttProvider = 'browser';
            this.state.settings.sttModel = '';
            this.state.settings.sttKey = '';
            this.state.settings.sttPrompt = prompt;
            this.state.settings.sttVerified = true;
            Storage.setSettings(this.state.settings);
            this.state.sttProvider = 'browser';
            this.state.sttModel = '';
            this.state.sttKey = '';
            this.state.sttPrompt = prompt;
            this.state.sttVerified = true;
            this.applySttChangeEffects(false);
            if (inAiMode) el('#aiControls')?.classList.remove('hidden');
            toast('Using browser speech recognition');
            return;
        }

        if (!key) return toast('Enter an API key for cloud provider');

        try {
            showLoading('Verifying STT settings...', 'Testing connection to speech provider.');
            let endpoint, headers;

            if (provider === 'openai') {
                // Verify OpenAI key by checking models endpoint
                endpoint = 'https://api.openai.com/v1/models';
                headers = { 'Authorization': `Bearer ${key}` };
            } else if (provider === 'groq') {
                // Verify Groq key by checking models endpoint
                endpoint = 'https://api.groq.com/openai/v1/models';
                headers = { 'Authorization': `Bearer ${key}` };
            } else if (provider === 'gemini') {
                // Verify Gemini key by listing models
                endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
                headers = {};
            }

            const res = await fetch(endpoint, { method: 'GET', headers });
            if (res.ok) {
                this.state.settings.sttProvider = provider;
                this.state.settings.sttModel = model || this.getDefaultSttModel(provider);
                this.state.settings.sttKey = key;
                this.state.settings.sttPrompt = prompt;
                this.state.settings.sttVerified = true;
                Storage.setSettings(this.state.settings);
                this.applySttChangeEffects(false);
                if (inAiMode) el('#aiControls')?.classList.remove('hidden');
                toast('STT settings verified');
            } else {
                throw new Error(`API returned ${res.status}`);
            }
        } catch (e) {
            this.state.settings.sttVerified = false;
            Storage.setSettings(this.state.settings);
            toast('STT verification failed: ' + e.message);
        } finally {
            hideLoading();
        }
    },
    getDefaultSttModel(provider) {
        if (provider === 'openai') return 'whisper-1';
        if (provider === 'groq') return 'whisper-large-v3';
        if (provider === 'gemini') return 'gemini-2.0-flash';
        return '';
    },
    async startOAuth() {
        if (!this.state.settings.workerUrl) return toast('Add worker URL first');
        this.saveSettings();
        showLoading('Starting Notion sign-in...', 'Redirecting to Notion authorization.');
        const oauthBase = 'https://notion-oauth-handler.mimansa-jaiswal.workers.dev';
        const here = encodeURIComponent(window.location.href);
        const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        try {
            if (isLocal) {
                const devPassword = (localStorage.getItem(OAUTH_DEV_PASSWORD_KEY) || '').trim();
                if (!devPassword) {
                    hideLoading();
                    toast(`Set localStorage.${OAUTH_DEV_PASSWORD_KEY} first`);
                    return;
                }
                const unlockRes = await fetch(`${oauthBase}/auth/dev-unlock`, {
                    method: 'POST',
                    headers: { 'X-OAuth-Dev-Password': devPassword }
                });
                if (!unlockRes.ok) {
                    const msg = await unlockRes.text().catch(() => '');
                    throw new Error(msg || `Dev unlock failed (${unlockRes.status})`);
                }
                const data = await unlockRes.json();
                const unlockToken = (data?.unlockToken || '').trim();
                if (!unlockToken) throw new Error('Dev unlock token missing');
                window.location.href = `${oauthBase}/auth/login?from=${here}&dev_unlock=${encodeURIComponent(unlockToken)}`;
                return;
            }
            window.location.href = `${oauthBase}/auth/login?from=${here}`;
        } catch (e) {
            hideLoading();
            toast(`OAuth start failed: ${e?.message || 'unknown error'}`);
        }
    },
    async scanSources() {
        if (!navigator.onLine) {
            toast('Offline: cannot scan databases');
            return;
        }
        if (!this.state.settings.workerUrl || !this.state.settings.authToken) return toast('Add worker URL and token first');
        try {
            showLoading('Scanning databases...', 'Finding valid deck and card sources.');
            toastLong('Scanning data sources...');
            const dbs = await API.listDatabases();
            const deckOptions = [];
            const cardOptions = [];
            for (const d of dbs) {
                const id = d.id;
                const title = d.title?.[0]?.plain_text || d.name || id;
                if (await this.validateDb(d, 'deck')) deckOptions.push({ id, title });
                if (await this.validateDb(d, 'card')) cardOptions.push({ id, title });
            }
            this.state.sourcesCache = { deckOptions, cardOptions };
            this.state.settings.sourcesCache = { deckOptions, cardOptions };
            el('#deckSourceSelect').innerHTML = `<option value=\"\">Select deck source</option>` + deckOptions.map(o => `<option value=\"${o.id}\">${o.title}</option>`).join('');
            el('#cardSourceSelect').innerHTML = `<option value=\"\">Select card source</option>` + cardOptions.map(o => `<option value=\"${o.id}\">${o.title}</option>`).join('');
            if (deckOptions.length === 1) this.state.settings.deckSource = deckOptions[0].id;
            if (cardOptions.length === 1) this.state.settings.cardSource = cardOptions[0].id;
            this.state.settings.sourcesSaved = false;
            Storage.setSettings(this.state.settings);
            if (this.state.settings.deckSource) el('#deckSourceSelect').value = this.state.settings.deckSource;
            if (this.state.settings.cardSource) el('#cardSourceSelect').value = this.state.settings.cardSource;
            this.state.sourcesVerified = !!(this.state.settings.deckSource && this.state.settings.cardSource);
            this.state.settings.sourcesVerified = this.state.sourcesVerified;
            Storage.setSettings(this.state.settings);
            this.renderStatus();
            this.renderGate();
            toast('Sources loaded');
        } catch (e) {
            toast(e.message);
        } finally {
            hideLoading();
            toastHide();
        }
    },
    populateSourceSelects() {
        const cache = this.state.settings.sourcesCache || { deckOptions: [], cardOptions: [] };
        const deckOptions = cache.deckOptions || [];
        const cardOptions = cache.cardOptions || [];
        this.state.sourcesCache = { deckOptions, cardOptions };
        el('#deckSourceSelect').innerHTML = `<option value="">Select deck source</option>` + deckOptions.map(o => `<option value="${o.id}">${o.title}</option>`).join('');
        el('#cardSourceSelect').innerHTML = `<option value="">Select card source</option>` + cardOptions.map(o => `<option value="${o.id}">${o.title}</option>`).join('');
        if (this.state.settings.deckSource) el('#deckSourceSelect').value = this.state.settings.deckSource;
        if (this.state.settings.cardSource) el('#cardSourceSelect').value = this.state.settings.cardSource;
        el('#deckSourceSelect').onchange = (e) => {
            this.state.settings.deckSource = e.target.value;
            this.state.sourcesVerified = !!(this.state.settings.deckSource && this.state.settings.cardSource);
            this.state.settings.sourcesVerified = this.state.sourcesVerified;
            this.state.settings.sourcesSaved = false;
            Storage.setSettings(this.state.settings);
            this.renderStatus();
            this.renderGate();
        };
        el('#cardSourceSelect').onchange = (e) => {
            this.state.settings.cardSource = e.target.value;
            this.state.sourcesVerified = !!(this.state.settings.deckSource && this.state.settings.cardSource);
            this.state.settings.sourcesVerified = this.state.sourcesVerified;
            this.state.settings.sourcesSaved = false;
            Storage.setSettings(this.state.settings);
            this.renderStatus();
            this.renderGate();
        };
    },
    openModal(id) {
        // Delegate to the UI module's openModal function
        // This keeps the App interface consistent while using shared implementation
        uiOpenModal(id);
    },
    closeModal(id) {
        // Delegate to the UI module's closeModal function
        uiCloseModal(id);
    },
    openConfirmModal({ title, body, confirmLabel } = {}) {
        const titleEl = el('#confirmModalTitle');
        const bodyEl = el('#confirmModalBody');
        const confirmBtn = el('#confirmDelete');
        if (titleEl) titleEl.textContent = title || this.confirmDefaults.title;
        if (bodyEl) bodyEl.textContent = body || this.confirmDefaults.body;
        if (confirmBtn) confirmBtn.textContent = confirmLabel || this.confirmDefaults.confirmLabel;

        if (this.confirmResolve) {
            // Resolve any previous pending confirm as canceled.
            try { this.confirmResolve(false); } catch (_) { }
        }

        this.openModal('confirmModal');
        return new Promise(resolve => {
            this.confirmResolve = resolve;
        });
    },
    closeConfirmModal(confirmed = false) {
        this.closeModal('confirmModal');
        if (this.confirmResolve) {
            const resolve = this.confirmResolve;
            this.confirmResolve = null;
            resolve(!!confirmed);
        }
    },
    async copyWorkerCode() {
        const code = el('#workerCodeBlock').innerText;
        try {
            await navigator.clipboard.writeText(code);
            toast('Worker code copied');
        } catch (e) {
            console.error('Clipboard write failed:', e);
            toast('Failed to copy - please select and copy manually');
        }
    },
    toggleDangerZone() {
        const content = el('#dangerZoneContent');
        const chevron = el('#dangerZoneChevron');
        content.classList.toggle('hidden');
        chevron.classList.toggle('rotate-180');
    },
    async resetApp() {
        this.closeModal('resetConfirmModal');
        showLoading('Resetting GhostInk...', 'Clearing all local data.');
        // Clear IndexedDB stores
        await Storage.wipeStore('decks');
        await Storage.wipeStore('cards');
        await Storage.wipeStore('meta');
        // Clear all GhostInk-specific localStorage keys
        localStorage.removeItem(Storage.settingsKey);
        // Close the database connection before deleting
        if (Storage.db) {
            Storage.db.close();
            Storage.db = null;
        }
        // Delete the entire database and wait for it to complete
        const deleteDb = (name) => new Promise((resolve, reject) => {
            const req = indexedDB.deleteDatabase(name);
            req.onsuccess = resolve;
            req.onerror = reject;
            req.onblocked = () => {
                console.warn('Database delete blocked, reloading anyway');
                resolve();
            };
        });
        await deleteDb(Storage.dbName);
        // Clear caches used by this app only
        if (typeof caches !== 'undefined') {
            try {
                const keys = await caches.keys();
                await Promise.all(keys.filter(k => k.startsWith('ghostink-cache-')).map(k => caches.delete(k)));
            } catch (e) {
                console.warn('Cache clear failed', e);
            }
        }
        // Unregister only this app's service worker (scope limited to current path)
        if (navigator.serviceWorker) {
            try {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.filter(r => r.scope.includes('ghostink-flashcards')).map(r => r.unregister()));
            } catch (e) {
                console.warn('SW unregister failed', e);
            }
        }
        location.reload();
    },
    renderStatus() {
        const hasWorkerUrl = !!this.state.settings.workerUrl;
        const workerOk = hasWorkerUrl && (this.state.workerVerified || this.state.settings.workerVerified);
        const hasToken = !!this.state.settings.authToken;
        const authOk = workerOk && hasToken && (this.state.authVerified || this.state.settings.authVerified);
        const hasSources = !!(this.state.settings.deckSource && this.state.settings.cardSource && this.state.sourcesVerified);
        const sourcesSaved = this.state.settings.sourcesSaved === true;

        el('#statusWorker').textContent = `Worker: ${workerOk ? 'verified' : hasWorkerUrl ? 'unverified' : 'missing'}`;
        el('#statusAuth').textContent = `Auth: ${authOk ? 'verified' : workerOk ? (hasToken ? 'unverified' : 'missing') : 'blocked (verify worker)'}`;
        el('#statusSources').textContent = `Sources: ${hasSources ? 'verified' : 'missing'}`;

        const vaultSection = el('#vaultStatusSection');
        if (vaultSection) vaultSection.classList.toggle('hidden', !hasSources);

        const notionDetails = el('#notionSettingsDetails');
        if (notionDetails && authOk && hasSources && sourcesSaved && !notionDetails.dataset.autoCollapsed) {
            notionDetails.removeAttribute('open');
            notionDetails.dataset.autoCollapsed = '1';
        }
        if (!sourcesSaved && notionDetails?.dataset.autoCollapsed) {
            delete notionDetails.dataset.autoCollapsed;
        }

        this.updateSettingsButtons();
        this.renderConnection();
    },
    async validateDb(dbOrId, type) {
        try {
            let meta = typeof dbOrId === 'string'
                ? await API.getDatabase(dbOrId)
                : dbOrId;
            if (!meta?.properties && meta?.id) {
                meta = await API.getDatabase(meta.id);
            }
            const props = meta?.properties || {};
            const has = (name, kind) => props[name]?.type === kind;
            if (type === 'deck') {
                const required = [
                    ['Deck Name', 'title'],
                    ['SRS Algorithm', 'select'],
                    ['Order Mode', 'select'],
                    ['Daily Review Limit', 'number'],
                    ['New Card Limit', 'number'],
                    ['Reverse Mode Enabled', 'checkbox'],
                    ['Dynamic Context?', 'checkbox'],
                    ['Anki Metadata', 'rich_text'],
                    ['AI Revision Prompt', 'rich_text'],
                    ['DyContext AI Prompt', 'rich_text'],
                    ['Created In-App', 'checkbox'],
                    ['Archived?', 'checkbox'],
                    ['SRS Config', 'rich_text']
                ];
                const missing = required.filter(([n, k]) => !has(n, k));
                if (missing.length) return false;
                return true;
            }
            if (type === 'card') {
                const required = [
                    ['Name', 'title'],
                    ['Back', 'rich_text'],
                    ['Card Type', 'select'],
                    ['Deck', 'relation'],
                    ['Tags', 'multi_select'],
                    ['Notes', 'rich_text'],
                    ['Marked', 'checkbox'],
                    ['Flag', 'select'],
                    ['Suspended', 'checkbox'],
                    ['Leech', 'checkbox'],
                    ['Order', 'rich_text'],
                    ['Last Rating', 'select'],
                    ['Last Review', 'date'],
                    ['Due Date', 'date'],
                    ['Updated In-App', 'checkbox'],
                    ['Review History', 'rich_text'],
                    ['Anki GUID', 'rich_text'],
                    ['Anki Note Type', 'select'],
                    ['Anki Fields JSON', 'rich_text'],
                    ['Cloze Indexes', 'rich_text'],
                    ['SRS State', 'rich_text'],
                    ['Cloze Parent Card', 'relation'],
                    ['Cloze Sub Cards', 'relation'],
                    ['DyContext Root Card', 'relation'],
                    ['DyContext Previous Card', 'relation'],
                    ['DyContext Next Card', 'relation']
                ];
                const missing = required.filter(([n, k]) => !has(n, k));
                if (missing.length) return false;
                return true;
            }
        } catch (e) {
            // Validation failed - database doesn't match expected schema
        }
        return false;
    },
    updateSettingsButtons() {
        const s = this.state.settings;
        // Block scan/save/sources until both worker AND Notion auth are verified
        const workerOk = s.workerVerified || this.state.workerVerified;
        const notionOk = s.authVerified || this.state.authVerified;
        const blockScanSave = !(workerOk && notionOk);
        const online = navigator.onLine;

        ['scanSources', 'saveSourcesChoice', 'saveSettings', 'deckSourceSelect', 'cardSourceSelect'].forEach(id => {
            const elem = el('#' + id);
            if (!elem) return;
            elem.disabled = blockScanSave;
        });
        const oa = el('#oauthBtn');
        const va = el('#verifyAuth');
        const tokenInput = el('#settingAuthToken');
        const blockAuth = !this.state.settings.workerUrl;
        if (oa) { oa.disabled = blockAuth; oa.classList.toggle('opacity-60', blockAuth); oa.classList.toggle('cursor-not-allowed', blockAuth); }
        if (va) { va.disabled = blockAuth; va.classList.toggle('opacity-60', blockAuth); va.classList.toggle('cursor-not-allowed', blockAuth); }
        if (tokenInput) tokenInput.disabled = blockAuth;

        // Disable AI/STT verification buttons when offline
        ['verifyAi', 'verifyDyContextAi', 'verifyStt'].forEach(id => {
            const btn = el('#' + id);
            if (!btn) return;
            btn.disabled = !online;
            btn.classList.toggle('opacity-60', !online);
            btn.classList.toggle('cursor-not-allowed', !online);
        });
    },
    async autoVerifyWorker() {
        const s = this.state.settings;
        // If already verified from storage, just re-render gate
        if (s.workerUrl && this.state.workerVerified && s.authToken && this.state.sourcesVerified) {
            this.renderGate();
            el('#workerSettingsDetails')?.removeAttribute('open');
            return;
        }
        // Otherwise, silently verify worker using stored settings (not input fields)
        if (!s.workerUrl) return;
        try {
            const url = new URL(s.workerUrl.replace(/\/$/, ''));
            url.searchParams.append('url', 'https://api.notion.com/v1/users/me');
            const headers = {};
            if (s.proxyToken) headers['X-Proxy-Token'] = s.proxyToken;

            // Add timeout to prevent hanging on unstable networks
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            const res = await fetch(url.toString(), { signal: controller.signal, headers });
            clearTimeout(timeout);

            if (res.ok || res.status === 401) {
                this.state.workerVerified = true;
                this.state.settings.workerVerified = true;
                Storage.setSettings(this.state.settings);
                el('#workerSettingsDetails')?.removeAttribute('open');
            }
        } catch (_) { /* silent fail - user can manually verify */ }
        this.renderGate();
        this.renderConnection();
    },
    applyTheme() {
        const mode = this.state.settings.themeMode || 'system';
        const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : mode;
        document.body.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === mode);
        });
    },
    applyFabPosition() {
        const fab = el('#mobileFabCluster');
        if (!fab) return;
        if (this.state.settings.fabEnabled === false) {
            fab.style.left = '';
            fab.style.bottom = '';
            fab.style.top = '';
            fab.style.right = '';
            fab.style.transform = '';
            return;
        }
        const pos = this.state.settings.fabPos;

        // Grid format: { mode:'grid', rows, cols, cell } anchored to the *center* of the cluster.
        const grid = pos && typeof pos === 'object' && pos.mode === 'grid' ? pos : null;
        // Custom 3x5 grid logic with 12% fixed borders on all sides
        // Active area: 76% width (12% left + 76% content + 12% right)
        // Active area: 76% height (12% top + 76% content + 12% bottom)

        const cellMax = 15;
        const cell = Math.max(1, Math.min(cellMax, Number(grid?.cell) || 15)); // default bottom-right (15)

        const logicalCol = (cell - 1) % 3; // 0, 1, 2
        const logicalRow = Math.floor((cell - 1) / 3); // 0, 1, 2, 3, 4

        const vw = window.innerWidth || document.documentElement.clientWidth || 360;
        const vh = window.innerHeight || document.documentElement.clientHeight || 640;

        // Border offset
        const borderX = 0.12;
        const borderY = 0.06;
        const activeW = 0.76;
        const activeH = 0.88;

        // Center X % = border + (col * (activeW / 3)) + half_col
        const colW = activeW / 3;
        const cxPct = borderX + (logicalCol * colW) + (colW / 2);

        // Center Y % = border + (row * (activeH / 5)) + half_row
        const rowH = activeH / 5;
        const cyPct = borderY + (logicalRow * rowH) + (rowH / 2);

        const centerX = cxPct * vw;
        const centerY = cyPct * vh;

        // Clamp to ensure it doesn't go off screen even with safe area adjustments
        const pad = 48;
        const clampedX = Math.min(vw - pad, Math.max(pad, centerX));
        const clampedY = Math.min(vh - pad, Math.max(pad, centerY));

        fab.style.transform = 'translate(-50%, 50%)';
        fab.style.left = clampedX + 'px';
        fab.style.bottom = (vh - clampedY) + 'px';
        fab.style.top = 'auto';
        fab.style.right = 'auto';
    },
    bindFabPositionPicker() {
        const select = el('#fabPosCellSelect');
        const ascii = el('#fabGridAscii');
        const enabledToggle = el('#fabEnabledToggle');
        const posControls = el('#fabPosControls');
        if (!select) return;

        const rows = 5;
        const cols = 3;
        const total = rows * cols;

        const getSavedCell = () => {
            const pos = this.state.settings.fabPos;
            if (pos && typeof pos === 'object' && pos.mode === 'grid') {
                const c = Number(pos.cell);
                if (Number.isFinite(c) && c >= 1 && c <= total) return c;
            }
            return 15; // near bottom-left by default
        };

        const renderAscii = (activeCell) => {
            if (!ascii) return;
            const pad2 = (n) => String(n).padStart(2, '0');
            let out = '';
            out += '┌──────────────┐\n';
            out += '│ ┌──────────┐ │\n';
            let cell = 1;
            for (let r = 0; r < rows; r++) {
                const rowArr = [];
                for (let c = 0; c < cols; c++) {
                    const label = pad2(cell);
                    if (cell === activeCell) {
                        rowArr.push(`<span class="text-accent font-semibold">${label}</span>`);
                    } else {
                        rowArr.push(label);
                    }
                    cell++;
                }
                out += `│ │ ${rowArr.join(' ')} │ │\n`;
            }
            out += '│ └──────────┘ │\n';
            out += '└──────────────┘';
            ascii.innerHTML = out;
        };

        const applyCell = (cell) => {
            const n = Math.max(1, Math.min(total, Number(cell) || 1));
            this.state.settings.fabPos = { mode: 'grid', rows, cols, cell: n };
            Storage.setSettings(this.state.settings);
            this.applyFabPosition();
            renderAscii(n);
            toast('Mobile FAB position saved');
        };

        const initial = getSavedCell();
        select.value = String(initial);
        renderAscii(initial);
        select.onchange = () => applyCell(select.value);

        const applyEnabled = (enabled) => {
            const on = !!enabled;
            this.state.settings.fabEnabled = on;
            Storage.setSettings(this.state.settings);
            if (posControls) posControls.classList.toggle('hidden', !on);
            this.applyFabPosition();
            this.updateMobileFab();
        };

        if (enabledToggle) {
            const savedEnabled = this.state.settings.fabEnabled;
            enabledToggle.checked = savedEnabled !== false;
            if (posControls) posControls.classList.toggle('hidden', enabledToggle.checked === false);
            enabledToggle.onchange = () => applyEnabled(enabledToggle.checked);
        } else {
            // No toggle in DOM; ensure controls are visible if present.
            if (posControls) posControls.classList.remove('hidden');
        }
    },
    applyFontMode() {
        const mode = this.state.settings.fontMode || 'mono';
        const fontMode = mode === 'mono' ? 'mono' : 'serif';
        document.body.setAttribute('data-font', fontMode);
        document.documentElement.setAttribute('data-font', fontMode);
        document.querySelectorAll('.font-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.font === mode);
        });
    },
    isReady() {
        const s = this.state.settings;
        const hasSettings = !!(s.workerUrl && s.authToken && s.deckSource && s.cardSource);
        const hasSavedSources = s.sourcesSaved === true;
        // If offline, trust the stored settings (assume they were verified before)
        if (!navigator.onLine && hasSettings && hasSavedSources) return true;
        // If online, require full verification
        return hasSettings && hasSavedSources && s.workerVerified && (s.authVerified || this.state.authVerified) && s.sourcesVerified;
    },
    loadAISettings() {
        const s = Storage.getSettings();
        if (s.aiProvider) el('#aiProvider').value = s.aiProvider;
        if (s.aiModel) el('#aiModel').value = s.aiModel;
        if (s.aiKey) el('#aiKey').value = s.aiKey;
        const dyUseJudgeAi = s.dyUseJudgeAi === true;
        const dyUseJudgeEl = el('#dyUseJudgeAi');
        if (dyUseJudgeEl) dyUseJudgeEl.checked = dyUseJudgeAi;
        if (s.dyProvider) el('#dyProvider').value = s.dyProvider;
        if (s.dyModel) el('#dyModel').value = s.dyModel;
        if (s.dyKey) el('#dyKey').value = s.dyKey;
        this.state.settings.dyVerified = s.dyVerified || false;

        // Load STT settings
        if (s.sttProvider) el('#sttProvider').value = s.sttProvider;
        if (s.sttModel) el('#sttModel').value = s.sttModel;
        if (s.sttKey) el('#sttKey').value = s.sttKey;
        if (s.sttPrompt) el('#sttPrompt').value = s.sttPrompt;

        this.state.settings.sttVerified = s.sttVerified || false;
        this.state.settings.sttPermissionWarmed = s.sttPermissionWarmed || false;
        if (s.themeMode) this.state.settings.themeMode = s.themeMode;
        if (s.fontMode) this.state.settings.fontMode = s.fontMode;
        this.applyTheme();
        this.applyFontMode();
        this.updateSkipHotkeyLabel(normalizeRevisionMode(el('#revisionMode')?.value) === REVISION_MODE_AI);
        this.updateGhostInkControlsState();
        // Toggle provider field visibility based on current selection
        this.toggleAiProviderFields();
        this.updateDyContextSettingsUI();
        this.toggleSttProviderFields();
        // On file:// we still need to proactively ask once to enable mic; HTTPS will reuse prior grant
        if (location.protocol === 'file:' && s.sttProvider && s.sttPermissionWarmed) {
            this.warmMicStreamForAi();
        }
        // Add change listeners for provider dropdowns
        el('#aiProvider').onchange = () => this.toggleAiProviderFields();
        const dyUseToggle = el('#dyUseJudgeAi');
        if (dyUseToggle) dyUseToggle.onchange = () => this.updateDyContextSettingsUI();
        const dyProvider = el('#dyProvider');
        if (dyProvider) dyProvider.onchange = () => this.updateDyContextSettingsUI();
        el('#sttProvider').onchange = () => {
            this.toggleSttProviderFields();
            const provider = el('#sttProvider')?.value || '';
            this.persistSttSettingsFromUI({ requestPermission: !!provider });
        };
    },
    persistSttSettingsFromUI({ requestPermission = false } = {}) {
        const prevProvider = this.state.settings.sttProvider || '';
        const provider = (el('#sttProvider')?.value || '').trim();
        const model = (el('#sttModel')?.value || '').trim();
        const key = (el('#sttKey')?.value || '').trim();
        const prompt = (el('#sttPrompt')?.value || '').trim();

        this.state.settings.sttProvider = provider;
        this.state.settings.sttModel = model;
        this.state.settings.sttPrompt = prompt;
        if (key) this.state.settings.sttKey = key;
        // Browser STT doesn't require verification. Disabled clears verification.
        if (!provider) {
            this.state.settings.sttVerified = false;
            this.state.settings.sttPermissionWarmed = false;
            this.state.settings.sttModel = '';
            this.state.settings.sttKey = '';
        } else if (provider === 'browser') {
            this.state.settings.sttVerified = true;
            this.state.settings.sttModel = '';
            this.state.settings.sttKey = '';
        } else if (provider !== prevProvider) {
            // If provider changed, require re-verify to avoid using stale creds with a new endpoint.
            this.state.settings.sttVerified = false;
        }

        Storage.setSettings(this.state.settings);
        this.applySttChangeEffects(!provider);

        if (prevProvider && provider && provider !== prevProvider) {
            toast(provider === 'browser' ? 'Using browser speech recognition' : 'STT provider changed — verify STT settings');
        }

        // Only request mic permission when transitioning from disabled -> enabled.
        const shouldRequest = !!(requestPermission && !prevProvider && provider);
        if (!shouldRequest) return;
        this.ensureMicPermission({ toastOnError: false })
            .then(() => {
                this.state.settings.sttPermissionWarmed = true;
                Storage.setSettings(this.state.settings);
            })
            .catch(() => {
                this.state.settings.sttPermissionWarmed = false;
                Storage.setSettings(this.state.settings);
                toast('Microphone access denied');
            });
    },
    toggleAiProviderFields() {
        const provider = el('#aiProvider').value;
        const fields = el('#aiProviderFields');
        if (fields) {
            if (provider) {
                fields.classList.remove('hidden');
            } else {
                fields.classList.add('hidden');
            }
        }
    },
    updateDyContextSettingsUI() {
        const useRow = el('#dyUseJudgeAiRow');
        const useToggle = el('#dyUseJudgeAi');
        const fields = el('#dyProviderFields');
        const detailFields = el('#dyProviderDetailFields');
        const providerSelect = el('#dyProvider');
        const help = el('#dyProviderHelp');
        const aiVerified = !!this.state.settings.aiVerified;
        if (useRow) useRow.classList.toggle('hidden', !aiVerified);
        if (!aiVerified) {
            if (useToggle) useToggle.checked = false;
            if (this.state.settings.dyUseJudgeAi !== false) {
                this.state.settings.dyUseJudgeAi = false;
                Storage.setSettings(this.state.settings);
            }
        }
        const useJudge = aiVerified && (useToggle?.checked ?? false);
        if (fields) fields.classList.toggle('hidden', useJudge);
        const provider = (providerSelect?.value || '').trim();
        const showDetails = !!provider && !useJudge;
        if (detailFields) detailFields.classList.toggle('hidden', !showDetails);
        if (help) help.classList.toggle('hidden', !provider);
    },
    toggleSttProviderFields() {
        const provider = el('#sttProvider').value;
        const fields = el('#sttProviderFields');
        if (fields) {
            if (provider && provider !== 'browser') {
                fields.classList.remove('hidden');
            } else {
                fields.classList.add('hidden');
            }
        }
        // Avoid auto-triggering mic prompts on simple provider toggles; recording will request when needed
    },
    updateSkipHotkeyLabel(isAiMode) {
        const skipKbd = el('#skipHotkey');
        if (!skipKbd) return;
        if (isAiMode) {
            // Use symbols for both platforms (⎇ = Alt, ⇧ = Shift)
            skipKbd.textContent = isMac ? '⌥ ⇧ S' : '⎇ ⇧ S';
        } else {
            skipKbd.textContent = 'S';
        }
    },
    applySttChangeEffects(disabled = false) {
        if (disabled || !this.isSttEnabled()) {
            this.stopMicActivity(true);
        } else {
            const feedback = el('#aiFeedback');
            if (feedback) feedback.classList.add('hidden');
            if (location.protocol === 'file:' && this.state.settings.sttPermissionWarmed) {
                // Prompt once on local files so mic shows up immediately
                this.warmMicStreamForAi();
            }
        }
        this.setAiControlsLocked(this.state.aiLocked);
        this.updateMobileFab();
    },
    submitGhostInkAnswer() {
        if (!this.isTypeInModeSelected()) return;
        if (!this.state.selectedCard) return;
        if (this.state.answerRevealed) {
            toast('Answer already checked. Go to the next card.');
            return;
        }
        const answerField = el('#ghostinkAnswer');
        const feedback = el('#ghostinkFeedback');
        const rawInput = answerField?.value || '';
        if (!rawInput.trim()) {
            toast('Type an answer first');
            return;
        }

        const expected = getGhostInkExpectedAnswers(this.state.selectedCard, this.state.cardReversed);
        const result = evaluateGhostInkAnswer(rawInput, expected);

        if (feedback) {
            feedback.classList.remove('hidden');
            feedback.innerHTML = buildGhostInkFeedbackHtml(result);
            applyMediaEmbeds(feedback);
            this.renderMath(feedback);
        }
        this.reveal();
    },
    async submitToAI() {
        if (this.state.aiLocked) return;
        if (!this.state.selectedCard) return;
        if (this.state.answerRevealed) {
            toast('Answer already reviewed. Go to the next card.');
            return;
        }
        // Stop any ongoing mic recording before sending
        if (this.isMicActive()) this.stopMicActivity(true);
        const ans = el('#aiAnswer').value.trim();
        if (!ans) { toast('Enter or record an answer first'); return; }
        if (!navigator.onLine) {
            toast('Offline: AI mode needs internet');
            return;
        }
        if (!this.state.settings.aiVerified) {
            toast('Verify AI settings in Settings first');
            return;
        }
        if (!this.state.settings.aiKey) { toast('Add an AI key in Settings'); return; }
        const deck = this.deckById(this.state.selectedCard.deckId);
        const promptTemplate = deck?.aiPrompt || DEFAULT_AI_PROMPT;
        // Swap question and answer if card is reversed
        const isReversed = this.state.cardReversed;
        const question = isReversed ? this.state.selectedCard.back : this.state.selectedCard.name;
        const answer = isReversed ? this.state.selectedCard.name : this.state.selectedCard.back;
        const applyTemplate = (tpl, vars) => {
            let out = String(tpl || '');
            for (const [key, value] of Object.entries(vars)) {
                out = out.split(`{{${key}}}`).join(String(value ?? ''));
            }
            return out;
        };
        const prompt = applyTemplate(promptTemplate, { question, answer, user: ans });
        const provider = this.state.settings.aiProvider || 'openai';
        const model = this.state.settings.aiModel || (provider === 'anthropic' ? 'claude-3-haiku-20240307' : provider === 'gemini' ? 'gemini-1.5-flash-latest' : 'gpt-4o-mini');
        try {
            this.state.lockAiUntilNextCard = true;
            this.setAiControlsLocked(true);
            this.updateMobileFab();
            el('#aiFeedback').classList.remove('hidden');
            el('#aiFeedback').innerHTML = 'Thinking...';
            const res = await this.callAI(provider, model, prompt, this.state.settings.aiKey);
            // Validate response before rendering
            if (!res || typeof res !== 'string') {
                throw new Error('Invalid response from AI');
            }
            el('#aiFeedback').innerHTML = safeMarkdownParse(res);
            applyMediaEmbeds(el('#aiFeedback'));
            this.renderMath(el('#aiFeedback'));
            this.reveal();
        } catch (e) {
            // Comprehensive error boundary - ensure all UI state is reset
            const feedback = el('#aiFeedback');
            if (feedback) {
                feedback.innerHTML = '';
                feedback.classList.add('hidden');
            }
            this.state.lockAiUntilNextCard = false;
            this.setAiControlsLocked(false);
            this.updateMobileFab();
            // Provide user-friendly error messages
            const msg = e?.message || 'Unknown error';
            if (msg.includes('Switch to Reveal mode')) {
                // Create toast with action button
                const t = el('#toast');
                t.innerHTML = `AI timed out. <button id="switchToRevealBtn" class="underline font-bold ml-1">Switch to Reveal mode?</button>`;
                t.classList.remove('hidden', 'opacity-0');
                // Auto hide after 5s
                setTimeout(() => {
                    t.classList.add('opacity-0');
                    setTimeout(() => t.classList.add('hidden'), 300);
                }, 5000);

                const switchBtn = el('#switchToRevealBtn');
                if (switchBtn) {
                    switchBtn.onclick = () => {
                        el('#revisionMode').value = REVISION_MODE_MANUAL;
                        el('#aiControls').classList.add('hidden');
                        this.state.aiLocked = false;
                        this.updateMobileFab();
                        toast('Switched to Reveal mode');
                    };
                }
            } else if (msg.includes('401') || msg.includes('403')) {
                toast('AI API key invalid or expired');
            } else if (msg.includes('429')) {
                toast('AI rate limited - try again in a moment');
            } else if (msg.includes('Network') || msg.includes('fetch')) {
                toast('Network error - check your connection');
            } else {
                toast('AI error: ' + msg);
            }
            console.error('AI judging error:', e);
        }
    },
    async callAI(provider, model, prompt, key) {
        if (!navigator.onLine) {
            throw new Error('Network unavailable');
        }

        // Helper for safe JSON parsing with error context
        const safeParseJson = async (resp, providerName) => {
            const text = await resp.text();
            try {
                return JSON.parse(text);
            } catch (parseErr) {
                console.error(`${providerName} returned invalid JSON:`, text.slice(0, 500));
                throw new Error(`${providerName} returned invalid response`);
            }
        };

        const fetchWithTimeout = async (url, options, timeoutMs = 15000) => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const res = await fetch(url, { ...options, signal: controller.signal });
                clearTimeout(timeout);
                return res;
            } catch (e) {
                clearTimeout(timeout);
                throw e;
            }
        };

        const attemptFetch = async (url, options) => {
            let lastErr;
            for (let i = 0; i < 3; i++) {
                try {
                    const res = await fetchWithTimeout(url, options);
                    if (res.status === 429 || res.status >= 500) {
                        lastErr = new Error(`Request failed ${res.status}`);
                        await sleep(1000 * (i + 1));
                        continue;
                    }
                    return res;
                } catch (e) {
                    lastErr = e;
                    if (e.name === 'AbortError') throw new Error('Request timed out. Switch to Reveal mode?');
                    await sleep(1000);
                }
            }
            throw lastErr;
        };

        if (provider === 'anthropic') {
            const resp = await attemptFetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-api-key': key,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({ model, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] })
            });
            if (!resp.ok) throw new Error('Claude returned ' + resp.status);
            const json = await safeParseJson(resp, 'Claude');
            return json.content?.[0]?.text || 'No response';
        }
        if (provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
            const resp = await attemptFetch(url, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            if (!resp.ok) throw new Error('Gemini returned ' + resp.status);
            const json = await safeParseJson(resp, 'Gemini');
            return json.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || 'No response';
        }
        const resp = await attemptFetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + key },
            body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 1024 })
        });
        if (!resp.ok) throw new Error('OpenAI returned ' + resp.status);
        const json = await safeParseJson(resp, 'OpenAI');
        return json.choices?.[0]?.message?.content || 'No response';
    },
    initMobileFab() {
        const cluster = el('#mobileFabCluster');
        if (!cluster) return;

        // Bind action buttons (always bind, visibility controlled by updateMobileFab)
        el('#fabReveal')?.addEventListener('click', () => this.reveal());
        el('#fabSkip')?.addEventListener('click', () => this.nextCard());
        el('#fabCopy')?.addEventListener('click', () => this.copyCardContent());
        el('#fabAddNote')?.addEventListener('click', () => this.openAddBlockModal());

        // Initialize joystick with Hammer.js
        this.initJoystick();

        // Listen for window resize to show/hide FAB cluster
        window.addEventListener('resize', () => this.updateMobileFab());
    },
    initJoystick() {
        const isSmallDevice = window.matchMedia('(max-width: 640px)').matches;
        const inSession = !!this.state.session;
        const fabEnabled = this.state.settings.fabEnabled !== false;
        const shouldBeActive = isSmallDevice && inSession && fabEnabled;

        if (!shouldBeActive) {
            if (this.state.joystickActive || this.state.joystickHandlers) {
                this.cleanupJoystick();
            }
            return;
        }

        // Always cleanup before re-initializing to prevent duplicate handlers
        if (this.state.joystickActive || this.state.joystickHandlers) {
            this.cleanupJoystick();
        }

        const joystick = el('#joystick');
        if (!joystick) return;

        const THRESHOLD = 15;
        let startX = 0;
        let startY = 0;
        let currentDirection = null;

        const getDirection = (dx, dy) => {
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);
            if (absX < THRESHOLD && absY < THRESHOLD) return null;
            if (absX > absY) {
                return dx > 0 ? 'right' : 'left';
            } else {
                return dy > 0 ? 'down' : 'up';
            }
        };

        const updateJoystick = (direction) => {
            joystick.classList.remove('up', 'down', 'left', 'right');
            joystick.querySelectorAll('.joystick-label').forEach(l => l.classList.remove('active'));
            if (direction) {
                joystick.classList.add(direction);
                joystick.querySelector(`.joystick-label-${direction}`)?.classList.add('active');
            }
        };

        const onPointerDown = (e) => {
            startX = e.clientX;
            startY = e.clientY;
            joystick.setPointerCapture(e.pointerId);
        };

        const onPointerMove = (e) => {
            if (!startX && !startY) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            currentDirection = getDirection(dx, dy);
            updateJoystick(currentDirection);
        };

        const onPointerUp = (e) => {
            if (currentDirection) {
                const ratings = { up: 'Good', down: 'Again', left: 'Hard', right: 'Easy' };
                this.rate(ratings[currentDirection]);
            }
            startX = 0;
            startY = 0;
            currentDirection = null;
            updateJoystick(null);
        };

        joystick.addEventListener('pointerdown', onPointerDown);
        joystick.addEventListener('pointermove', onPointerMove);
        joystick.addEventListener('pointerup', onPointerUp);
        joystick.addEventListener('pointercancel', onPointerUp);

        this.state.joystickActive = true;
        this.state.joystickHandlers = { onPointerDown, onPointerMove, onPointerUp };
    },
    cleanupJoystick() {
        const joystick = el('#joystick');
        if (joystick && this.state.joystickHandlers) {
            const { onPointerDown, onPointerMove, onPointerUp } = this.state.joystickHandlers;
            joystick.removeEventListener('pointerdown', onPointerDown);
            joystick.removeEventListener('pointermove', onPointerMove);
            joystick.removeEventListener('pointerup', onPointerUp);
            joystick.removeEventListener('pointercancel', onPointerUp);
            joystick.classList.remove('up', 'down', 'left', 'right');
            joystick.querySelectorAll('.joystick-label').forEach(l => l.classList.remove('active'));
        }
        this.state.joystickActive = false;
        this.state.joystickHandlers = null;
    },

    updateMobileFab() {
        const isSmallDevice = window.matchMedia('(max-width: 640px)').matches;
        const cluster = el('#mobileFabCluster');

        // Try to init joystick if needed
        this.initJoystick();

        // Hide FAB on large screens
        if (!isSmallDevice) {
            if (cluster) cluster.classList.add('hidden');
            return;
        }
        // Hard-disable FAB entirely if user turned it off.
        if (this.state.settings.fabEnabled === false) {
            if (cluster) cluster.classList.add('hidden');
            return;
        }

        const hasCard = !!this.state.selectedCard;
        const inSession = !!this.state.session;
        const revealed = this.state.answerRevealed;
        const revisionMode = normalizeRevisionMode(el('#revisionMode')?.value);
        const isAiMode = revisionMode === REVISION_MODE_AI;
        const sttEnabled = this.isSttEnabled();
        // Check if the actual reveal button in the card is visible (not hidden)
        const revealBtnVisible = el('#revealBtn') && !el('#revealBtn').classList.contains('hidden');

        const joystickContainer = el('#joystickContainer');
        const fabPreRevealActions = el('#fabPreRevealActions');
        const fabCopy = el('#fabCopy');
        const fabAddNote = el('#fabAddNote');
        const fabMic = el('#fabMic');
        const fabSend = el('#fabSend');

        // Only show FAB cluster when there's an active card with reveal button visible or already revealed
        const showFab = hasCard && inSession && (revealBtnVisible || revealed || isAiMode);
        if (cluster) cluster.classList.toggle('hidden', !showFab);

        // Show joystick only when answer is revealed
        if (joystickContainer) joystickContainer.classList.toggle('hidden', !revealed);
        // Show pre-reveal actions (skip + reveal) only when not revealed and reveal button is visible
        if (fabPreRevealActions) fabPreRevealActions.classList.toggle('hidden', revealed || !revealBtnVisible);
        // Show copy and add note only when revealed
        if (fabCopy) fabCopy.classList.toggle('hidden', !revealed);
        if (fabAddNote) fabAddNote.classList.toggle('hidden', !revealed);
        const hideFabMic = !hasCard || !inSession || this.state.answerRevealed || !isAiMode || this.state.aiLocked || !sttEnabled;
        const hideFabSend = !hasCard || !inSession || this.state.answerRevealed || !isAiMode || this.state.aiLocked;
        if (fabMic) fabMic.classList.toggle('hidden', hideFabMic);
        if (fabSend) fabSend.classList.toggle('hidden', hideFabSend);

        // Re-init lucide icons for the joystick
        if (revealed) {
            const iconScope = joystickContainer || cluster || document.body;
            setTimeout(() => createIconsInScope(iconScope), 0);
        }
    },
    renderMath(container) {
        // Guard against KaTeX not being loaded yet (async CDN load)
        if (!container) return;
        if (typeof katex === 'undefined') {
            // KaTeX not loaded yet, wait for it using a shared poller
            if (this._katexPolling) return; // Already polling globally
            this._katexPolling = true;
            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;
                if (typeof katex !== 'undefined') {
                    clearInterval(checkInterval);
                    this._katexPolling = false;
                    // Re-render everything that might have math
                    this.renderMath(document.body);
                } else if (attempts > 50) {
                    clearInterval(checkInterval);
                    this._katexPolling = false;
                }
            }, 100);
            return;
        }

        // Use auto-render if available (handles $$...$$ blocks and $...$ inline with better newlines support)
        if (typeof renderMathInElement === 'function') {
            try {
                renderMathInElement(container, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '\\[', right: '\\]', display: true }
                    ],
                    throwOnError: false
                });
            } catch (e) { console.error('KaTeX auto-render error:', e); }
        }

        // Fallback/Legacy: Render specific Notion equation blocks that might not be caught by delimiters
        container.querySelectorAll('.notion-equation').forEach(span => {
            // Skip already-rendered equations
            if (span.querySelector('.katex')) return;
            try {
                const expr = span.textContent || '';
                span.innerHTML = katex.renderToString(expr, { throwOnError: false });
            } catch (e) { console.error('KaTeX render error:', e); }
        });
    },
    async recordAnswer() {
        const isAiMode = normalizeRevisionMode(el('#revisionMode')?.value) === REVISION_MODE_AI;
        if (!isAiMode) {
            toast('Mic is available in AI mode only.');
            return;
        }
        if (!this.isSttEnabled()) {
            toast('Enable speech-to-text in Settings first.');
            return;
        }
        if (this.state.answerRevealed) {
            toast('Already judged. Go to the next card.');
            return;
        }
        this.state.userStoppedMic = false;
        if (!this.state.activeMicButton) this.state.activeMicButton = 'inline';
        const provider = this.state.settings.sttProvider;
        const isCloudProvider = provider && provider !== 'browser';

        // If cloud provider is configured and verified, use it
        if (isCloudProvider) {
            if (!this.state.settings.sttKey) {
                toast('Add and verify your STT API key in Settings.');
                return;
            }
            if (!this.state.settings.sttVerified) {
                toast('Verify STT settings in Settings first.');
                return;
            }
            await this.recordWithCloudSTT();
            return;
        }

        // Fall back to browser speech recognition
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            toast('Speech recognition not supported. Configure a cloud provider in settings.');
            return;
        }
        try {
            await this.ensureMicPermission({ toastOnError: true });
        } catch (_) {
            return;
        }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR();
        rec.lang = 'en-US';
        rec.interimResults = true;
        rec.continuous = true;
        rec.maxAlternatives = 1;
        el('#aiFeedback').classList.remove('hidden');
        el('#aiFeedback').innerHTML = 'Listening...';

        let finalTranscript = el('#aiAnswer').value;
        if (finalTranscript) finalTranscript += ' ';

        rec.onresult = (e) => {
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; ++i) {
                if (e.results[i].isFinal) {
                    finalTranscript += e.results[i][0].transcript;
                } else {
                    interim += e.results[i][0].transcript;
                }
            }
            el('#aiAnswer').value = finalTranscript + interim;
            // Trigger input event to update Send button state
            el('#aiAnswer').dispatchEvent(new Event('input'));
        };

        // Store recorder instance to allow stopping it
        this.state.currentRecorder = rec;
        this.setAiControlsLocked(false);

        rec.onerror = (e) => {
            if (e.error !== 'aborted') {
                el('#aiFeedback').innerHTML = '';
                if (['not-allowed', 'service-not-allowed', 'permission-denied'].includes(e.error)) {
                    toast('Microphone access denied');
                } else {
                    toast('Mic error: ' + e.error);
                }
            }
            this.state.currentRecorder = null;
            this.state.userStoppedMic = false;
            this.state.activeMicButton = null;
            this.setAiControlsLocked(this.state.aiLocked);
        };
        rec.onend = () => {
            if (el('#aiFeedback').innerHTML.includes('Listening') && this.state.userStoppedMic) {
                el('#aiFeedback').innerHTML = 'Captured. Now send.';
            } else if (el('#aiFeedback').innerHTML.includes('Listening')) {
                el('#aiFeedback').innerHTML = '';
            }
            this.state.currentRecorder = null;
            this.state.userStoppedMic = false;
            this.state.activeMicButton = null;
            this.setAiControlsLocked(this.state.aiLocked);
        };
        rec.start();
    },
    async recordWithCloudSTT() {
        const provider = this.state.settings.sttProvider;
        const model = this.state.settings.sttModel || this.getDefaultSttModel(provider);
        const key = this.state.settings.sttKey;
        const prompt = this.state.settings.sttPrompt || '';

        el('#aiFeedback').classList.remove('hidden');
        el('#aiFeedback').innerHTML = 'Recording... Click again to stop.';

        // If already recording, stop
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.state.userStoppedMic = true;
            this.mediaRecorder.stop();
            return;
        }
        this.state.userStoppedMic = false;
        if (!this.state.activeMicButton) this.state.activeMicButton = 'inline';

        let stream = null;
        try {
            stream = await this.getMicStream();
            if (!stream) throw new Error('Microphone unavailable');
            this.state.activeAudioStream = stream;
            const chunks = [];
            this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            this.mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

            this.mediaRecorder.onstop = async () => {
                const cleanupStream = () => {
                    try { stream.getTracks().forEach(t => t.stop()); } catch (_) { }
                    if (this.state.activeAudioStream === stream) this.state.activeAudioStream = null;
                };

                cleanupStream();
                el('#aiFeedback').innerHTML = 'Transcribing...';
                this.state.currentRecorder = null;
                this.setAiControlsLocked(this.state.aiLocked);

                try {
                    const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                    let transcript = '';

                    if (provider === 'openai' || provider === 'groq') {
                        transcript = await this.transcribeWithWhisper(audioBlob, provider, model, key, prompt);
                    } else if (provider === 'gemini') {
                        transcript = await this.transcribeWithGemini(audioBlob, model, key, prompt);
                    }

                    if (transcript) {
                        const current = el('#aiAnswer').value.trim();
                        el('#aiAnswer').value = current ? `${current} ${transcript}` : transcript;
                        // Trigger input event to update Send button state
                        el('#aiAnswer').dispatchEvent(new Event('input'));
                    }
                    el('#aiFeedback').innerHTML = this.state.userStoppedMic ? 'Captured. Now send.' : '';
                    this.mediaRecorder = null;
                    this.state.userStoppedMic = false;
                    this.state.activeMicButton = null;
                    this.setAiControlsLocked(false);
                } catch (e) {
                    el('#aiFeedback').innerHTML = '';
                    toast('Transcription failed: ' + e.message);
                    this.mediaRecorder = null;
                    this.state.userStoppedMic = false;
                    this.state.activeMicButton = null;
                    this.setAiControlsLocked(false);
                    this.updateMobileFab();
                }
            };

            this.mediaRecorder.onerror = () => {
                try { stream.getTracks().forEach(t => t.stop()); } catch (_) { }
                if (this.state.activeAudioStream === stream) this.state.activeAudioStream = null;
                el('#aiFeedback').innerHTML = '';
                toast('Recording error');
                this.state.currentRecorder = null;
                this.mediaRecorder = null;
                this.state.userStoppedMic = false;
                this.state.activeMicButton = null;
                this.setAiControlsLocked(this.state.aiLocked);
            };

            this.state.currentRecorder = {
                stop: () => {
                    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                        this.state.userStoppedMic = true;
                        this.mediaRecorder.stop();
                    }
                }
            };
            this.setAiControlsLocked(false);
            this.mediaRecorder.start();
            const activeRecorder = this.mediaRecorder;

            // Auto-stop after 60 seconds
            setTimeout(() => {
                if (this.mediaRecorder === activeRecorder && activeRecorder && activeRecorder.state === 'recording') {
                    activeRecorder.stop();
                }
            }, 60000);

        } catch (e) {
            if (stream) {
                try { stream.getTracks().forEach(t => t.stop()); } catch (_) { }
            }
            this.state.activeAudioStream = null;
            el('#aiFeedback').innerHTML = '';
            toast('Microphone access denied');
            this.state.currentRecorder = null;
            this.mediaRecorder = null;
            this.state.userStoppedMic = false;
            this.state.activeMicButton = null;
            this.setAiControlsLocked(this.state.aiLocked);
            this.updateMobileFab();
        }
    },
    async transcribeWithWhisper(audioBlob, provider, model, key, prompt) {
        if (!navigator.onLine) {
            throw new Error('Network unavailable for transcription');
        }
        const endpoint = provider === 'openai'
            ? 'https://api.openai.com/v1/audio/transcriptions'
            : 'https://api.groq.com/openai/v1/audio/transcriptions';

        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', model);
        if (prompt) formData.append('prompt', prompt);

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}` },
            body: formData
        });

        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const data = await res.json();
        return data.text || '';
    },
    async transcribeWithGemini(audioBlob, model, key, prompt) {
        if (!navigator.onLine) {
            throw new Error('Network unavailable for transcription');
        }
        // Use FileReader for efficient non-blocking Base64 conversion
        const base64Audio = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
        });

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

        const systemPrompt = prompt
            ? `Transcribe this audio. Context: ${prompt}. Return only the transcription, no other text.`
            : 'Transcribe this audio. Return only the transcription, no other text.';

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: systemPrompt },
                        { inline_data: { mime_type: 'audio/webm', data: base64Audio } }
                    ]
                }]
            })
        });

        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    },
    async performDelete() {
        const target = this.pendingDelete;
        if (!target) return;
        if (target.type === 'card') {
            await Storage.delete('cards', target.id);
            this.removeCard(target.id);
            this.queueOp({ type: 'card-delete', payload: { id: target.id, notionId: target.notionId } });
            this.renderCards();
            this.renderDecks(); // Refresh stats
            toast('Card deleted');
        }
        this.pendingDelete = null;
    }
};
