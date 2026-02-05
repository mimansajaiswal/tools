/**
 * GhostInk Flashcards - NotionMapper Module
 * Bidirectional mapping between app objects and Notion API format.
 */

import {
    fsrsW,
    DEFAULT_DESIRED_RETENTION,
    DEFAULT_AI_PROMPT,
    DEFAULT_DYCONTEXT_PROMPT,
    parseSrsConfig,
    parseSrsState
} from './config.js';

import {
    initDifficulty,
    initStability,
    normalizeRating,
    displayRating,
    detectCardType
} from './srs.js';

// Rich text chunking for Notion limits
export const toRichTextChunks = (text) => {
    const str = (text || '').toString();
    if (!str) return [];
    const MAX_CHARS = 2000;
    const MAX_ITEMS = 100;
    const chunks = [];
    for (let i = 0; i < str.length && chunks.length < MAX_ITEMS; i += MAX_CHARS) {
        chunks.push({ type: 'text', text: { content: str.slice(i, i + MAX_CHARS) } });
    }
    return chunks;
};

export const parseSrsConfigText = (raw, algorithm = 'SM-2') => parseSrsConfig(raw, algorithm);

// Compact review history format: "gk3f9s.2a,hk3g5a.1c,ak3h2b.2o"
// Rating code + base36 epoch seconds + '.' + base36 duration milliseconds
// Rating codes: a=again, h=hard, g=good, e=easy
// Timestamp: Unix epoch seconds
export const compactReviewHistory = (history) => {
    if (!history || !history.length) return '';
    const ratingCodes = { again: 'a', hard: 'h', good: 'g', easy: 'e' };
    const seen = new Set();
    return history.map(entry => {
        const code = ratingCodes[entry.rating] || 'g';
        const ms = new Date(entry.at).getTime();
        if (!Number.isFinite(ms)) return null;
        const ts = Math.floor(ms / 1000);
        const ts36 = ts.toString(36);
        const durMs = Math.max(0, Math.round(Number(entry.ms || 0)));
        const dur36 = durMs.toString(36);
        const key = `${code}${ts36}.${dur36}`;
        if (seen.has(key)) return null;
        seen.add(key);
        return key;
    }).filter(Boolean).join(',');
};

export const parseReviewHistory = (compact) => {
    if (!compact || typeof compact !== 'string') return [];
    const ratingNames = { a: 'again', h: 'hard', g: 'good', e: 'easy' };
    const seen = new Set();
    return compact.split(',').filter(Boolean).map(entry => {
        if (!entry || entry.length < 4) return null;
        const code = entry[0].toLowerCase();
        const rating = ratingNames[code];
        if (!rating) return null;
        const parts = entry.slice(1).split('.');
        if (parts.length !== 2) return null;
        const [tsRaw, durRaw] = parts;
        const ts = parseInt(tsRaw, 36);
        if (!Number.isFinite(ts) || ts <= 0) return null;
        const dur = parseInt(durRaw, 36);
        if (!Number.isFinite(dur) || dur < 0) return null;
        const key = `${code}${tsRaw}.${durRaw}`;
        if (seen.has(key)) return null;
        seen.add(key);
        return {
            rating,
            at: new Date(ts * 1000).toISOString(),
            ms: dur
        };
    }).filter(Boolean);
};

// Convert Notion rich_text array to Markdown
export const richToMarkdown = (arr = []) => {
    return (arr || []).map(rt => {
        if (!rt) return '';
        const a = rt.annotations || {};
        let s = '';
        const isEquation = rt.type === 'equation' && rt.equation?.expression;
        if (isEquation) {
            s = `<span class="notion-equation">${rt.equation.expression}</span>`;
        } else {
            const t = rt.plain_text || '';
            if (!t) return '';
            const link = rt.href || rt.text?.link?.url || null;
            if (link) s = `[${t}](${link})`; else s = t;
            if (a.code) s = '`' + s + '`';
        }
        if (!s) return '';
        if (a.bold) s = '**' + s + '**';
        if (a.italic) s = '*' + s + '*';
        if (a.strikethrough) s = '~~' + s + '~~';
        if (a.underline) s = `<u>${s}</u>`;
        if (a.color && a.color !== 'default') {
            s = `<span class="notion-color-${a.color.replace(/_/g, '-')}">${s}</span>`;
        }
        return s;
    }).join('');
};

// Convert markdown to Notion rich_text using Marked (markdown→HTML) + DOM parsing (HTML→runs).
// This avoids regex-recursive parsing (which can cause stack overflows on pathological content).
// Supported:
// - bold/italic/strikethrough/code/links
// - underline (from our exporter: <u>text</u>)
// - Notion colors: <span class="notion-color-...">...</span>
// - Notion equations: <span class="notion-equation">...</span>
export const markdownToNotionRichText = (markdown) => {
    const raw = (markdown ?? '').toString();
    if (!raw) return [];

    const MAX_INPUT_CHARS = 50000;
    const MAX_ITEMS = 100;
    const MAX_CHARS_PER_ITEM = 2000;

    const safePlain = (input) => {
        const s = (input || '').toString();
        if (!s) return [];
        const cleaned = s.replace(/<[^>]+>/g, '');
        const out = [];
        for (let i = 0; i < cleaned.length && out.length < MAX_ITEMS; i += MAX_CHARS_PER_ITEM) {
            out.push({ type: 'text', text: { content: cleaned.slice(i, i + MAX_CHARS_PER_ITEM) } });
        }
        return out;
    };

    if (raw.length > MAX_INPUT_CHARS) return safePlain(raw);

    // Protect special characters from being misinterpreted:
    // 1. Escape angle brackets in non-HTML contexts (e.g., "<<backtrack>>" → stripped by DOM)
    // 2. Protect tildes (e.g., "~2 bytes" can be mangled by some parsers)
    // Use placeholders that won't appear in normal text.
    const LT_PLACEHOLDER = '\u0000LT\u0000';
    const GT_PLACEHOLDER = '\u0000GT\u0000';
    const TILDE_PLACEHOLDER = '\u0000TILDE\u0000';

    // Protect our known safe HTML patterns first
    const protectedPatterns = [];

    // 1. Protect notion equation/color spans
    let preprocessed = raw.replace(/<span\s+class="notion-(equation|color-[^"]+)">([\s\S]*?)<\/span>/gi, (match) => {
        const idx = protectedPatterns.length;
        protectedPatterns.push(match);
        return `\u0000PROT${idx}\u0000`;
    });

    // 2. Protect underline tags
    preprocessed = preprocessed.replace(/<\/?u>/gi, (match) => {
        const idx = protectedPatterns.length;
        protectedPatterns.push(match);
        return `\u0000PROT${idx}\u0000`;
    });

    // 3. Protect markdown links [text](url)
    preprocessed = preprocessed.replace(/\[([^\]]*)\]\(([^)]*)\)/g, (match) => {
        const idx = protectedPatterns.length;
        protectedPatterns.push(match);
        return `\u0000PROT${idx}\u0000`;
    });

    // 4. Protect inline code with backticks (may contain < or >)
    preprocessed = preprocessed.replace(/`[^`]+`/g, (match) => {
        const idx = protectedPatterns.length;
        protectedPatterns.push(match);
        return `\u0000PROT${idx}\u0000`;
    });

    // Protect tildes - they can be stripped or misinterpreted during HTML parsing
    preprocessed = preprocessed.replace(/~/g, TILDE_PLACEHOLDER);

    // Now escape ALL remaining angle brackets - anything not protected is likely user content
    // that would be incorrectly parsed as HTML (e.g., <<backtrack>>, <something>)
    preprocessed = preprocessed.replace(/</g, LT_PLACEHOLDER);
    preprocessed = preprocessed.replace(/>/g, GT_PLACEHOLDER);

    // Restore protected patterns
    preprocessed = preprocessed.replace(/\u0000PROT(\d+)\u0000/g, (_, idx) => protectedPatterns[parseInt(idx, 10)]);

    let html;
    try {
        html = marked.parse(preprocessed, {
            gfm: true,
            breaks: true
        });
    } catch (e) {
        console.error('marked.parse failed; falling back to plain text:', e);
        return safePlain(raw);
    }

    // Restore placeholders back to original characters
    html = html.replace(new RegExp(TILDE_PLACEHOLDER, 'g'), '~');
    html = html.replace(new RegExp(LT_PLACEHOLDER, 'g'), '&lt;');
    html = html.replace(new RegExp(GT_PLACEHOLDER, 'g'), '&gt;');

    let doc;
    let parser;
    try {
        parser = new DOMParser();
        doc = parser.parseFromString(`<div id="__rtroot__">${html}</div>`, 'text/html');
    } catch (e) {
        console.error('DOMParser failed; falling back to plain text:', e);
        return safePlain(raw);
    }

    const root = doc.getElementById('__rtroot__');
    if (!root) return safePlain(raw);

    const runs = [];

    const sanitizeLinkUrl = (url) => {
        const s = (url ?? '').toString().trim();
        if (!s) return null;
        // Notion text.link.url must be an absolute URL (or mailto/tel).
        // Drop relative/hash/javascript links to avoid Notion 400s ("Invalid URL for link.").
        if (s.startsWith('#')) return null;
        if (s.toLowerCase().startsWith('javascript:')) return null;
        if (s.toLowerCase().startsWith('data:')) return null;  // Block data: URIs (XSS mitigation)
        if (s.toLowerCase().startsWith('vbscript:')) return null;  // Block vbscript: (XSS mitigation)
        const candidate = s.startsWith('//') ? `https:${s}` : s;
        try {
            const u = new URL(candidate);
            const proto = (u.protocol || '').toLowerCase();
            // Keep only allowed protocols to avoid Notion 400s for invalid links.
            if (!['https:', 'http:', 'mailto:', 'tel:'].includes(proto)) return null;
            return u.toString();
        } catch (_) {
            return null;
        }
    };

    const allowedColors = new Set([
        'default',
        'gray',
        'brown',
        'orange',
        'yellow',
        'green',
        'blue',
        'purple',
        'pink',
        'red',
        'gray_background',
        'brown_background',
        'orange_background',
        'yellow_background',
        'green_background',
        'blue_background',
        'purple_background',
        'pink_background',
        'red_background'
    ]);

    const normalizeColor = (cls) => {
        // notion-color-gray-background -> gray_background
        const c = (cls || '').replace(/^notion-color-/, '').trim();
        if (!c) return undefined;
        const normalized = c.replace(/-/g, '_');
        if (normalized === 'default_background') return 'default';
        return allowedColors.has(normalized) ? normalized : undefined;
    };

    const pushText = (text, annotations, link) => {
        if (!text) return;
        const content = text.toString();
        if (!content) return;
        const item = { type: 'text', text: { content } };
        const cleanLink = sanitizeLinkUrl(link);
        if (cleanLink) item.text.link = { url: cleanLink };
        if (annotations && Object.keys(annotations).length) item.annotations = annotations;
        runs.push(item);
    };

    const pushNewline = (annotations, link) => {
        // Avoid piling up newlines (keeps Notion props cleaner)
        const last = runs[runs.length - 1];
        if (last?.type === 'text' && last.text?.content?.endsWith('\n')) return;
        pushText('\n', annotations, link);
    };

    const mergeAnn = (base, extra) => {
        const out = { ...(base || {}) };
        for (const [k, v] of Object.entries(extra || {})) {
            if (v !== undefined) out[k] = v;
        }
        return out;
    };

    const parseInlineMarkdown = (input) => {
        const s = (input ?? '').toString();
        if (!s) return '';
        if (typeof marked === 'undefined') return s;
        try {
            if (typeof marked.parseInline === 'function') {
                return marked.parseInline(s, { gfm: true, breaks: true });
            }
            const blockHtml = marked.parse(s, { gfm: true, breaks: true });
            return blockHtml.replace(/^<p>/i, '').replace(/<\/p>\s*$/i, '');
        } catch (e) {
            console.error('marked.parseInline failed; using raw inline HTML:', e);
            return s;
        }
    };

    const walkInlineHtml = (rawHtml, state) => {
        const html = parseInlineMarkdown(rawHtml);
        if (!html) return;
        let inlineDoc;
        try {
            inlineDoc = parser.parseFromString(`<div id="__rtinline__">${html}</div>`, 'text/html');
        } catch (e) {
            console.error('Inline DOMParser failed; falling back to plain text:', e);
            pushText(rawHtml.replace(/<[^>]+>/g, ''), state?.annotations, state?.link);
            return;
        }
        const inlineRoot = inlineDoc.getElementById('__rtinline__');
        if (!inlineRoot) {
            pushText(rawHtml.replace(/<[^>]+>/g, ''), state?.annotations, state?.link);
            return;
        }
        for (const child of Array.from(inlineRoot.childNodes)) walk(child, state);
    };

    const walk = (node, state) => {
        if (!node) return;
        const curAnn = state?.annotations || null;
        const curLink = state?.link || null;

        if (runs.length >= 2000) return; // soft safety cap before chunking

        if (node.nodeType === Node.TEXT_NODE) {
            const val = node.nodeValue || '';
            // Marked inserts formatting whitespace/newlines between block elements.
            // We generate our own newlines for blocks, so ignore whitespace-only nodes to avoid double newlines.
            if (!val) return;
            if (/^\s+$/.test(val) && /[\r\n]/.test(val)) return;
            pushText(val, curAnn, curLink);
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const el = node;
        const tag = (el.tagName || '').toUpperCase();

        // Ignore unsafe or irrelevant elements entirely
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return;

        // Handle PRE/code blocks - preserve content literally
        if (tag === 'PRE') {
            // Get raw text content, preserving whitespace for code blocks
            const codeEl = el.querySelector('code');
            let lang = '';
            if (codeEl && codeEl.className) {
                const match = codeEl.className.match(/language-(\w+)/);
                if (match) lang = match[1];
            }
            const content = codeEl ? codeEl.textContent : el.textContent;
            if (content) {
                // Store as text with backticks so it survives round-trip as a block
                pushText('```' + lang + '\n' + content + '\n```', curAnn, curLink);
            }
            pushNewline(curAnn, curLink);
            return;
        }

        // Notion equation span
        if (tag === 'SPAN' && el.classList && el.classList.contains('notion-equation')) {
            const expr = (el.textContent || '').trim();
            if (expr) {
                const eq = { type: 'equation', equation: { expression: expr } };
                if (curAnn && Object.keys(curAnn).length) eq.annotations = curAnn;
                runs.push(eq);
            }
            return;
        }

        // Notion color span
        if (tag === 'SPAN' && el.classList) {
            const colorClass = [...el.classList].find(c => c.startsWith('notion-color-'));
            if (colorClass) {
                const color = normalizeColor(colorClass);
                const nextState = { ...state, annotations: mergeAnn(curAnn, { color }) };
                walkInlineHtml(el.innerHTML || '', nextState);
                return;
            }
        }

        // Annotation tags
        if (tag === 'STRONG' || tag === 'B') {
            const nextState = { ...state, annotations: mergeAnn(curAnn, { bold: true }) };
            for (const child of Array.from(el.childNodes)) walk(child, nextState);
            return;
        }
        if (tag === 'EM' || tag === 'I') {
            const nextState = { ...state, annotations: mergeAnn(curAnn, { italic: true }) };
            for (const child of Array.from(el.childNodes)) walk(child, nextState);
            return;
        }
        if (tag === 'U') {
            const nextState = { ...state, annotations: mergeAnn(curAnn, { underline: true }) };
            walkInlineHtml(el.innerHTML || '', nextState);
            return;
        }
        if (tag === 'DEL' || tag === 'S') {
            const nextState = { ...state, annotations: mergeAnn(curAnn, { strikethrough: true }) };
            for (const child of Array.from(el.childNodes)) walk(child, nextState);
            return;
        }
        if (tag === 'CODE') {
            // Treat code as a single literal chunk (no nested parsing)
            pushText(el.textContent || '', mergeAnn(curAnn, { code: true }), curLink);
            return;
        }
        if (tag === 'A') {
            const href = sanitizeLinkUrl(el.getAttribute('href') || curLink);
            const nextState = { ...state, link: href || null };
            for (const child of Array.from(el.childNodes)) walk(child, nextState);
            return;
        }
        if (tag === 'BR') {
            pushNewline(curAnn, curLink);
            return;
        }

        // Block-ish elements: preserve line breaks
        const blockTags = new Set(['P', 'DIV', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE']);
        const isBlock = blockTags.has(tag);

        for (const child of Array.from(el.childNodes)) walk(child, state);
        if (isBlock) pushNewline(curAnn, curLink);
    };

    for (const child of Array.from(root.childNodes)) walk(child, { annotations: null, link: null });

    // Merge adjacent text runs with identical formatting.
    const merged = [];
    const sameAnn = (a, b) => JSON.stringify(a || {}) === JSON.stringify(b || {});
    for (const item of runs) {
        if (!item) continue;
        if (merged.length === 0) { merged.push(item); continue; }
        const prev = merged[merged.length - 1];
        if (item.type === 'text' && prev.type === 'text') {
            const a1 = prev.annotations || null;
            const a2 = item.annotations || null;
            const l1 = prev.text?.link?.url || null;
            const l2 = item.text?.link?.url || null;
            if (l1 === l2 && sameAnn(a1, a2)) {
                prev.text.content = (prev.text.content || '') + (item.text.content || '');
                continue;
            }
        }
        merged.push(item);
    }

    // Chunk text items to Notion limits.
    const out = [];
    for (const item of merged) {
        if (out.length >= MAX_ITEMS) break;
        if (item.type === 'equation') {
            out.push(item);
            continue;
        }
        const content = item.text?.content || '';
        if (!content) continue;
        if (content.length <= MAX_CHARS_PER_ITEM) {
            out.push(item);
            continue;
        }
        for (let i = 0; i < content.length && out.length < MAX_ITEMS; i += MAX_CHARS_PER_ITEM) {
            out.push({
                type: 'text',
                text: {
                    content: content.slice(i, i + MAX_CHARS_PER_ITEM),
                    link: item.text?.link
                },
                annotations: item.annotations
            });
        }
    }

    // Trim trailing whitespace/newlines (avoid Notion properties ending with blank lines).
    while (out.length && out[out.length - 1].type === 'text') {
        const last = out[out.length - 1];
        const content = (last.text?.content || '');
        const trimmedRight = content.replace(/\s+$/g, '');
        if (trimmedRight.length === 0) {
            out.pop();
            continue;
        }
        if (trimmedRight !== content) {
            last.text.content = trimmedRight;
        }
        break;
    }

    return out.slice(0, MAX_ITEMS);
};


/**
 * NotionMapper - Bidirectional mapping between app objects and Notion API format.
 * Handles conversion of decks and cards to/from Notion page properties.
 */
export const NotionMapper = {
    /**
     * Convert a Notion page to an app deck object
     * @param {Object} page - Notion page object from API
     * @returns {Object} Deck object for internal use
     */
    deckFrom(page) {
        const props = page.properties || {};
        const richTextToString = (prop) => (prop?.rich_text || []).map(t => t.plain_text).join('');
        const title = props['Deck Name']?.title?.map(t => t.plain_text).join('') || 'Untitled deck';
        const rawMode = props['Order Mode']?.select?.name || 'None';
        const orderMap = { 'none': 'none', 'created time': 'created', 'order property': 'property' };
        const srsConfigRaw = richTextToString(props['SRS Config']) || '';
        let srsConfigError = false;
        let srsConfigObj = null;
        if (srsConfigRaw) {
            try { srsConfigObj = JSON.parse(srsConfigRaw); } catch { srsConfigError = true; }
        }
        const algoRaw = props['SRS Algorithm']?.select?.name || 'SM-2';
        const algorithm = (algoRaw || '').toUpperCase() === 'FSRS' ? 'FSRS' : 'SM-2';
        const srsConfig = parseSrsConfigText(srsConfigRaw, algorithm);
        const hasFsrs = !!(srsConfigObj && typeof srsConfigObj === 'object' && 'fsrs' in srsConfigObj);
        const srsConfigMismatch = !srsConfigError && srsConfigObj && (
            (algorithm !== 'FSRS' && hasFsrs) ||
            (algorithm === 'FSRS' && !hasFsrs)
        );
        const aiPromptRaw = richTextToString(props['AI Revision Prompt']);
        const dyPromptRaw = richTextToString(props['DyContext AI Prompt']);
        const dynamicContext = props['Dynamic Context?']?.checkbox || false;
        const dyPrompt = dyPromptRaw || (dynamicContext ? DEFAULT_DYCONTEXT_PROMPT : '');
        return {
            id: page.id,
            notionId: page.id,
            name: title,
            algorithm,
            orderMode: orderMap[rawMode.toLowerCase()] || 'none',
            reviewLimit: props['Daily Review Limit']?.number || 50,
            newLimit: props['New Card Limit']?.number || 20,
            reverse: props['Reverse Mode Enabled']?.checkbox || false,
            createdInApp: props['Created In-App']?.checkbox || false,
            archived: props['Archived?']?.checkbox || false,
            ankiMetadata: props['Anki Metadata']?.rich_text?.[0]?.plain_text || '',
            aiPrompt: aiPromptRaw || DEFAULT_AI_PROMPT,
            dynamicContext,
            dyAiPrompt: dyPrompt,
            dyAiPromptRaw: dyPromptRaw || '',
            srsConfig,
            srsConfigRaw,
            srsConfigError,
            srsConfigMismatch,
            updatedInApp: false
        };
    },

    /**
     * Convert an app deck object to Notion page properties
     * @param {Object} deck - App deck object
     * @returns {Object} Notion properties object for API
     */
    deckProps(deck) {
        const orderLabels = { none: 'None', created: 'Created Time', property: 'Order Property' };
        const algorithm = deck.algorithm || 'SM-2';
        const normalizedSrsConfig = parseSrsConfig(deck.srsConfig || null, algorithm);
        const dyPromptRaw = (deck.dyAiPrompt || '').trim();
        const dyPrompt = dyPromptRaw || (deck.dynamicContext ? DEFAULT_DYCONTEXT_PROMPT : '');
        const srsPayload = {
            learningSteps: normalizedSrsConfig.learningSteps,
            relearningSteps: normalizedSrsConfig.relearningSteps,
            graduatingInterval: normalizedSrsConfig.graduatingInterval,
            easyInterval: normalizedSrsConfig.easyInterval,
            easyDays: normalizedSrsConfig.easyDays
        };
        if (algorithm === 'FSRS') {
            srsPayload.fsrs = {
                retention: normalizedSrsConfig.fsrs?.retention ?? DEFAULT_DESIRED_RETENTION,
                weights: normalizedSrsConfig.fsrs?.weights || fsrsW
            };
        }
        return {
            'Deck Name': { title: markdownToNotionRichText(deck.name) },
            'SRS Algorithm': { select: { name: algorithm } },
            'Order Mode': { select: { name: orderLabels[deck.orderMode] || orderLabels.none } },
            'Daily Review Limit': { number: deck.reviewLimit },
            'New Card Limit': { number: deck.newLimit },
            'Reverse Mode Enabled': { checkbox: !!deck.reverse },
            'Created In-App': { checkbox: true },
            'Archived?': { checkbox: !!deck.archived },
            'Anki Metadata': { rich_text: toRichTextChunks(deck.ankiMetadata) },
            'AI Revision Prompt': { rich_text: markdownToNotionRichText(deck.aiPrompt) },
            'Dynamic Context?': { checkbox: !!deck.dynamicContext },
            'DyContext AI Prompt': { rich_text: toRichTextChunks(dyPrompt) },
            'SRS Config': { rich_text: toRichTextChunks(JSON.stringify(srsPayload)) }
        };
    },

    /**
     * Convert a Notion page to an app card object
     * @param {Object} page - Notion page object from API
     * @param {Array} decks - Array of deck objects for resolving relations
     * @returns {Object} Card object for internal use
     */
    cardFrom(page, decks) {
        const p = page.properties || {};
        const deckRel = p['Deck']?.relation?.[0]?.id || null;
        if (!deckRel) return null; // Filter out orphaned cards immediately
        const name = richToMarkdown(p['Name']?.title) || 'Card';
        const back = richToMarkdown(p['Back']?.rich_text) || '';
        const tags = p['Tags']?.multi_select?.map(t => ({ name: t.name, color: t.color || 'default' })) || [];
        const lastReview = p['Last Review']?.date?.start || null;
        const dueDate = p['Due Date']?.date?.start || null;
        const lastRating = normalizeRating(p['Last Rating']?.select?.name) || null;
        const srsStateRaw = p['SRS State']?.rich_text?.map(t => t.plain_text).join('') || '';
        const reviewHistoryText = (p['Review History']?.rich_text || []).map(t => t.plain_text || '').join('');
        let srsStateError = false;
        if (srsStateRaw) {
            try { JSON.parse(srsStateRaw); } catch { srsStateError = true; }
        }
        const srsState = parseSrsState(srsStateRaw);
        if (srsState.learning.state === 'new' && (lastReview || reviewHistoryText.length > 0)) {
            srsState.learning.state = 'review';
            srsState.learning.step = 0;
            srsState.learning.due = null;
        }
        const fsrs = {
            difficulty: srsState.fsrs.difficulty ?? initDifficulty(fsrsW, 'good'),
            stability: srsState.fsrs.stability ?? initStability(fsrsW, 'good'),
            retrievability: srsState.fsrs.retrievability ?? 0.9,
            lastRating,
            lastReview,
            dueDate
        };
        const sm2 = {
            interval: srsState.sm2.interval ?? 1,
            easeFactor: srsState.sm2.easeFactor ?? 2.5,
            repetitions: srsState.sm2.repetitions ?? 0,
            dueDate,
            lastRating,
            lastReview
        };
        return {
            id: page.id,
            notionId: page.id,
            deckId: deckRel,
            name,
            back,
            type: p['Card Type']?.select?.name || detectCardType(name, back),
            tags,
            notes: richToMarkdown(p['Notes']?.rich_text) || '',
            marked: p['Marked']?.checkbox || false,
            flag: p['Flag']?.select?.name || '',
            suspended: p['Suspended']?.checkbox ? 1 : 0,
            leech: p['Leech']?.checkbox || false,
            srsState,
            srsStateRaw,
            srsStateError,
            fsrs,
            sm2,
            syncId: page.id,
            updatedInApp: p['Updated In-App']?.checkbox || false,
            order: (p['Order']?.rich_text || []).map(t => t.plain_text).join('') || null,
            reviewHistory: parseReviewHistory(reviewHistoryText),
            ankiGuid: p['Anki GUID']?.rich_text?.[0]?.plain_text || '',
            ankiNoteType: p['Anki Note Type']?.select?.name || '',
            ankiFields: p['Anki Fields JSON']?.rich_text?.[0]?.plain_text || '',
            clozeIndexes: p['Cloze Indexes']?.rich_text?.[0]?.plain_text || '',
            parentCard: p['Cloze Parent Card']?.relation?.[0]?.id || null,
            subCards: (p['Cloze Sub Cards']?.relation || []).map(r => r.id),
            dyRootCard: p['DyContext Root Card']?.relation?.[0]?.id || null,
            dyPrevCard: p['DyContext Previous Card']?.relation?.[0]?.id || null,
            dyNextCard: p['DyContext Next Card']?.relation?.[0]?.id || null,
            createdAt: page.created_time,
            lastEditedAt: page.last_edited_time,
            // Store original Notion rich_text to preserve colors/equations on sync
            _notionRichText: {
                name: p['Name']?.title || [],
                back: p['Back']?.rich_text || [],
                notes: p['Notes']?.rich_text || []
            }
        };
    },

    /**
     * Convert an app card object to Notion page properties.
     * Preserves original rich_text (colors, equations) if content unchanged.
     * @param {Object} card - App card object
     * @param {string|null} notionDeckId - Notion page ID for deck relation
     * @returns {Object} Notion properties object for API
     */
    cardProps(card, deck = null) {
        // Only use a real Notion page ID for relations.
        // Local deck IDs (randomUUID) must not be sent to Notion.
        const notionDeckId = deck?.notionId || null;
        const deckAlgorithm = deck?.algorithm || 'SM-2';
        const dueDate = (deckAlgorithm === 'FSRS' ? card.fsrs?.dueDate : card.sm2?.dueDate) || card.fsrs?.dueDate || card.sm2?.dueDate || null;
        const lastReview = (deckAlgorithm === 'FSRS' ? card.fsrs?.lastReview : card.sm2?.lastReview) || card.fsrs?.lastReview || card.sm2?.lastReview || null;
        const lastRating = (deckAlgorithm === 'FSRS' ? card.fsrs?.lastRating : card.sm2?.lastRating) || card.fsrs?.lastRating || card.sm2?.lastRating || null;
        const srsState = parseSrsState(card.srsState || null);
        srsState.fsrs.difficulty = card.fsrs?.difficulty ?? srsState.fsrs.difficulty;
        srsState.fsrs.stability = card.fsrs?.stability ?? srsState.fsrs.stability;
        srsState.fsrs.retrievability = card.fsrs?.retrievability ?? srsState.fsrs.retrievability;
        srsState.sm2.easeFactor = card.sm2?.easeFactor ?? srsState.sm2.easeFactor;
        srsState.sm2.interval = card.sm2?.interval ?? srsState.sm2.interval;
        srsState.sm2.repetitions = card.sm2?.repetitions ?? srsState.sm2.repetitions;

        // Normalize content for comparison to handle equation formatting differences
        const normalizeForCompare = (s) => {
            if (!s) return '';
            return s
                .replace(/<span\s+class=/g, '<span class=')
                .replace(/<span class="notion-equation">\s*/g, '<span class="notion-equation">')
                .replace(/\s*<\/span>/g, '</span>')
                .replace(/\s+/g, ' ')
                .trim();
        };

        // Helper to get rich_text: use original if content unchanged, else convert markdown
        const getRichText = (field, content, originalRichText) => {
            // If we have original rich_text and content hasn't been edited in app
            if (originalRichText && originalRichText.length > 0 && !card.updatedInApp) {
                // Check if content matches original (convert original back to markdown and compare)
                const originalMarkdown = richToMarkdown(originalRichText);
                // Use normalized comparison to avoid false positives from formatting differences
                if (normalizeForCompare(content) === normalizeForCompare(originalMarkdown)) {
                    // Content unchanged - use original rich_text to preserve colors/equations
                    return originalRichText;
                }
            }
            // Content was changed - convert markdown to rich_text (may lose colors)
            return markdownToNotionRichText(content);
        };

        const orig = card._notionRichText || {};
        const isTempId = (id) => typeof id === 'string' && id.startsWith('tmp_');
        const props = {
            'Name': { title: getRichText('name', card.name, orig.name) },
            'Back': { rich_text: getRichText('back', card.back, orig.back) },
            'Card Type': { select: { name: card.type } },
            'Tags': { multi_select: card.tags.map(t => ({ name: t.name })) },
            'Notes': { rich_text: getRichText('notes', card.notes, orig.notes) },
            'Marked': { checkbox: !!card.marked },
            'Flag': card.flag ? { select: { name: card.flag } } : { select: null },
            'Suspended': { checkbox: !!card.suspended },
            'Leech': { checkbox: !!card.leech },
            'Order': { rich_text: card.order ? [{ type: 'text', text: { content: String(card.order) } }] : [] },
            'Last Rating': lastRating ? { select: { name: displayRating(lastRating) } } : { select: null },
            'Last Review': { date: lastReview ? { start: lastReview } : null },
            'Due Date': { date: dueDate ? { start: dueDate } : null },
            'Updated In-App': { checkbox: false },
            'Review History': { rich_text: toRichTextChunks(compactReviewHistory(card.reviewHistory || [])) },
            'SRS State': { rich_text: toRichTextChunks(JSON.stringify(srsState)) },
            'Anki GUID': card.ankiGuid ? { rich_text: [{ type: 'text', text: { content: card.ankiGuid } }] } : { rich_text: [] },
            'Anki Note Type': card.ankiNoteType ? { select: { name: card.ankiNoteType } } : { select: null },
            'Anki Fields JSON': { rich_text: toRichTextChunks(card.ankiFields) },
            'Cloze Indexes': card.clozeIndexes ? { rich_text: [{ type: 'text', text: { content: card.clozeIndexes } }] } : { rich_text: [] },
            'Cloze Parent Card': card.parentCard
                ? { relation: [{ id: card.parentCard }] }
                : { relation: [] },
            'DyContext Root Card': card.dyRootCard && !isTempId(card.dyRootCard)
                ? { relation: [{ id: card.dyRootCard }] }
                : { relation: [] },
            'DyContext Previous Card': card.dyPrevCard && !isTempId(card.dyPrevCard)
                ? { relation: [{ id: card.dyPrevCard }] }
                : { relation: [] }
        };

        // Only include Deck if we can safely set it:
        // - If we have a Notion deck page ID, set relation to that.
        // - If the card has no deck, explicitly clear it.
        // - If the card has a deckId but we can't resolve it (missing deck), omit to avoid wiping in Notion.
        if (notionDeckId) props['Deck'] = { relation: [{ id: notionDeckId }] };
        else if (!card.deckId) props['Deck'] = { relation: [] };
        return props;
    }
};
