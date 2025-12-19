/**
 * GhostInk Flashcards - NotionMapper Module
 * Bidirectional mapping between app objects and Notion API format.
 */

import {
    fsrsW,
    DEFAULT_DESIRED_RETENTION,
    DEFAULT_AI_PROMPT,
    clampRetention
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
        chunks.push({ text: { content: str.slice(i, i + MAX_CHARS) } });
    }
    return chunks;
};

// Compact review history format: "g1702473000,h1702559400,a1702645800"
// Rating codes: a=again, h=hard, g=good, e=easy
// Timestamp: Unix epoch seconds
export const compactReviewHistory = (history) => {
    if (!history || !history.length) return '';
    const ratingCodes = { again: 'a', hard: 'h', good: 'g', easy: 'e' };
    return history.map(entry => {
        const code = ratingCodes[entry.rating] || 'g';
        const ms = new Date(entry.at).getTime();
        if (!Number.isFinite(ms)) return null;
        const ts = Math.floor(ms / 1000);
        return `${code}${ts}`;
    }).filter(Boolean).join(',');
};

// Phase 4: Review history parse validation
export const parseReviewHistory = (compact) => {
    if (!compact || typeof compact !== 'string') return [];
    // Handle legacy JSON format
    if (compact.startsWith('[')) {
        try { return JSON.parse(compact); } catch { return []; }
    }
    const ratingNames = { a: 'again', h: 'hard', g: 'good', e: 'easy' };
    return compact.split(',').filter(Boolean).map(entry => {
        // Need at least 2 characters (rating code + timestamp)
        if (!entry || entry.length < 2) return null;
        const code = entry[0].toLowerCase();
        const rating = ratingNames[code];
        // Skip invalid rating characters
        if (!rating) return null;
        const ts = parseInt(entry.slice(1), 10);
        // Skip invalid or non-positive timestamps
        if (!Number.isFinite(ts) || ts <= 0) return null;
        return {
            rating,
            at: new Date(ts * 1000).toISOString()
        };
    }).filter(Boolean);
};

// Convert Notion rich_text array to Markdown
export const richToMarkdown = (arr = []) => {
    return (arr || []).map(rt => {
        if (!rt) return '';
        const a = rt.annotations || {};
        let s = '';
        if (rt.type === 'equation' && rt.equation?.expression) {
            s = `<span class="notion-equation">${rt.equation.expression}</span>`;
        } else {
            const t = rt.plain_text || '';
            if (!t) return '';
            if (rt.href) s = `[${t}](${rt.href})`; else s = t;
            if (a.code) s = '`' + s + '`';
            if (a.bold) s = '**' + s + '**';
            if (a.italic) s = '*' + s + '*';
            if (a.strikethrough) s = '~~' + s + '~~';
            if (a.underline) s = '__' + s + '__';
            if (a.color && a.color !== 'default') {
                s = `<span class="notion-color-${a.color.replace('_', '-')}">${s}</span>`;
            }
        }
        return s;
    }).join('');
};

// Convert markdown to Notion rich_text using Marked (markdown→HTML) + DOM parsing (HTML→runs).
// This avoids regex-recursive parsing (which can cause stack overflows on pathological content).
// Supported:
// - bold/italic/strikethrough/code/links
// - underline (from our exporter: __text__ → <u>text</u>)
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

    // Treat __text__ as underline (we generate underline using __...__ in richToMarkdown()).
    // This is intentionally different from Markdown strong; we always generate bold with **...**.
    const pre = raw.replace(/__([\s\S]+?)__/g, '<u>$1</u>');

    let html;
    try {
        html = marked.parse(pre, {
            gfm: true,
            breaks: true,
            headerIds: false,
            mangle: false
        });
    } catch (e) {
        console.error('marked.parse failed; falling back to plain text:', e);
        return safePlain(pre);
    }

    let doc;
    try {
        const parser = new DOMParser();
        doc = parser.parseFromString(`<div id="__rtroot__">${html}</div>`, 'text/html');
    } catch (e) {
        console.error('DOMParser failed; falling back to plain text:', e);
        return safePlain(pre);
    }

    const root = doc.getElementById('__rtroot__');
    if (!root) return safePlain(pre);

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
            // Only keep HTTPS links for Notion properties (everything else is dropped).
            if (proto !== 'https:') return null;
            return u.toString();
        } catch (_) {
            return null;
        }
    };

    const normalizeColor = (cls) => {
        // notion-color-gray-background -> gray_background
        const c = (cls || '').replace(/^notion-color-/, '').trim();
        if (!c) return null;
        return c.replace(/-/g, '_');
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

    const walk = (node, state) => {
        if (!node) return;
        const curAnn = state?.annotations || null;
        const curLink = state?.link || null;

        if (runs.length >= 2000) return; // soft safety cap before chunking

        if (node.nodeType === Node.TEXT_NODE) {
            const val = node.nodeValue || '';
            // Marked inserts formatting whitespace/newlines between block elements.
            // We generate our own newlines for blocks, so ignore whitespace-only nodes to avoid double newlines.
            if (!val || /^\s+$/.test(val)) return;
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
            const content = codeEl ? codeEl.textContent : el.textContent;
            if (content) {
                pushText(content, mergeAnn(curAnn, { code: true }), curLink);
            }
            pushNewline(curAnn, curLink);
            return;
        }

        // Notion equation span
        if (tag === 'SPAN' && el.classList && el.classList.contains('notion-equation')) {
            const expr = (el.textContent || '').trim();
            if (expr) runs.push({ type: 'equation', equation: { expression: expr } });
            return;
        }

        // Notion color span
        if (tag === 'SPAN' && el.classList) {
            const colorClass = [...el.classList].find(c => c.startsWith('notion-color-'));
            if (colorClass) {
                const color = normalizeColor(colorClass);
                const nextState = { ...state, annotations: mergeAnn(curAnn, { color }) };
                for (const child of Array.from(el.childNodes)) walk(child, nextState);
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
            for (const child of Array.from(el.childNodes)) walk(child, nextState);
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

// FSRS params parsing/serialization
export const parseFsrsParamsText = (raw) => {
    const text = (raw || '').toString().trim();
    const out = { desiredRetention: DEFAULT_DESIRED_RETENTION, weights: null };
    if (!text) return out;

    // JSON format (recommended): {"desired_retention":0.9,"weights":[...]}
    if (text.startsWith('{')) {
        try {
            const obj = JSON.parse(text);
            const dr = obj.desired_retention ?? obj.desiredRetention ?? obj.request_retention ?? obj.requestRetention;
            if (dr !== undefined) out.desiredRetention = clampRetention(dr);
            const w = obj.weights ?? obj.w ?? obj.params;
            if (Array.isArray(w)) {
                if (w.length === 21) {
                    out.weights = w.map(n => Number(n));
                } else if (w.length > 0) {
                    // Recovery: pad with defaults
                    const recovered = w.map(n => Number.isFinite(Number(n)) ? Number(n) : 0);
                    while (recovered.length < 21) {
                        recovered.push(fsrsW[recovered.length]);
                    }
                    out.weights = recovered.slice(0, 21);
                }
            }
            if (out.weights) return out;
        } catch (_) { }
    }

    // Numeric format: either "0.9, w1, w2, ... w21" or just "w1, ... w21"
    const nums = text.split(/[\s,]+/).map(s => parseFloat(s.trim())).filter(n => Number.isFinite(n));

    if (nums.length === 0) return out;

    if (nums.length === 1 && nums[0] > 0 && nums[0] < 1) {
        out.desiredRetention = clampRetention(nums[0]);
        return out;
    }

    // Check if first number looks like retention
    let startIdx = 0;
    if (nums[0] > 0 && nums[0] < 1 && nums.length > 1) {
        out.desiredRetention = clampRetention(nums[0]);
        startIdx = 1;
    }

    // Extract weights and recover if needed
    const rawWeights = nums.slice(startIdx);
    const recovered = [...rawWeights];
    while (recovered.length < 21) {
        recovered.push(fsrsW[recovered.length]);
    }
    out.weights = recovered.slice(0, 21);

    return out;
};

export const serializeFsrsParamsText = (deck) => {
    if (!deck || deck.algorithm !== 'FSRS') return '';
    const desiredRetention = clampRetention(deck.fsrsDesiredRetention ?? DEFAULT_DESIRED_RETENTION);
    const weights = (Array.isArray(deck.fsrsWeights) && deck.fsrsWeights.length === 21) ? deck.fsrsWeights : fsrsW;
    const obj = { desired_retention: desiredRetention, weights: weights };
    return JSON.stringify(obj);
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
        const title = props['Deck Name']?.title?.map(t => t.plain_text).join('') || 'Untitled deck';
        const rawMode = props['Order Mode']?.select?.name || 'None';
        const orderMap = { 'none': 'none', 'created time': 'created', 'order property': 'property' };
        const fsrsParamsRaw = props['FSRS Params']?.rich_text?.map(t => t.plain_text).join('') || '';
        const fsrsParams = parseFsrsParamsText(fsrsParamsRaw);
        return {
            id: page.id,
            notionId: page.id,
            name: title,
            algorithm: props['SRS Algorithm']?.select?.name || 'SM-2',
            orderMode: orderMap[rawMode.toLowerCase()] || 'none',
            reviewLimit: props['Daily Review Limit']?.number || 50,
            newLimit: props['New Card Limit']?.number || 20,
            reverse: props['Reverse Mode Enabled']?.checkbox || false,
            createdInApp: props['Created In-App']?.checkbox || false,
            archived: props['Archived?']?.checkbox || false,
            ankiMetadata: props['Anki Metadata']?.rich_text?.[0]?.plain_text || '',
            aiPrompt: props['AI Revision Prompt']?.rich_text?.map(t => t.plain_text).join('') || DEFAULT_AI_PROMPT,
            fsrsDesiredRetention: fsrsParams.desiredRetention,
            fsrsWeights: fsrsParams.weights,
            fsrsParamsRaw,
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
        return {
            'Deck Name': { title: markdownToNotionRichText(deck.name) },
            'SRS Algorithm': { select: { name: deck.algorithm } },
            'Order Mode': { select: { name: orderLabels[deck.orderMode] || orderLabels.none } },
            'Daily Review Limit': { number: deck.reviewLimit },
            'New Card Limit': { number: deck.newLimit },
            'Reverse Mode Enabled': { checkbox: !!deck.reverse },
            'Created In-App': { checkbox: true },
            'Archived?': { checkbox: !!deck.archived },
            'Anki Metadata': { rich_text: deck.ankiMetadata ? [{ text: { content: deck.ankiMetadata } }] : [] },
            'AI Revision Prompt': { rich_text: markdownToNotionRichText(deck.aiPrompt) },
            'FSRS Params': { rich_text: toRichTextChunks(serializeFsrsParamsText(deck)) }
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
        const name = richToMarkdown(p['Name']?.title) || 'Card';
        const back = richToMarkdown(p['Back']?.rich_text) || '';
        const tags = p['Tags']?.multi_select?.map(t => ({ name: t.name, color: t.color || 'default' })) || [];
        const lastReview = p['Last Review']?.date?.start || null;
        const fsrs = {
            difficulty: p['Difficulty']?.number ?? initDifficulty(fsrsW, 'good'),
            stability: p['Stability']?.number ?? initStability(fsrsW, 'good'),
            retrievability: p['Retrievability']?.number ?? 0.9,
            lastRating: normalizeRating(p['Last Rating']?.select?.name) || null,
            lastReview,
            dueDate: p['Due Date']?.date?.start || null
        };
        const intervalVal = p['Interval / Box Level']?.number ?? 1;
        const sm2 = {
            interval: intervalVal,
            easeFactor: p['Ease Factor']?.number ?? 2.5,
            // If there's no lastReview, treat as new card (0 reps) to avoid jumping straight to the 6-day step.
            // Otherwise, infer repetitions from interval: 1 day = 1 rep, 6 days = 2 reps, else 3+.
            repetitions: !lastReview ? 0 : (intervalVal <= 1 ? 1 : (intervalVal === 6 ? 2 : 3)),
            dueDate: p['Due Date']?.date?.start || null,
            lastRating: normalizeRating(p['Last Rating']?.select?.name) || null,
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
            suspended: p['Suspended']?.checkbox || false,
            leech: p['Leech']?.checkbox || false,
            fsrs,
            sm2,
            syncId: page.id,
            updatedInApp: p['Updated In-App']?.checkbox || false,
            order: typeof p['Order']?.number === 'number' ? p['Order'].number : null,
            reviewHistory: parseReviewHistory(p['Review History']?.rich_text?.[0]?.plain_text || ''),
            ankiGuid: p['Anki GUID']?.rich_text?.[0]?.plain_text || '',
            ankiNoteType: p['Anki Note Type']?.select?.name || '',
            ankiFields: p['Anki Fields JSON']?.rich_text?.[0]?.plain_text || '',
            clozeIndexes: p['Cloze Indexes']?.rich_text?.[0]?.plain_text || '',
            createdAt: page.created_time,
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

        // Helper to get rich_text: use original if content unchanged, else convert markdown
        const getRichText = (field, content, originalRichText) => {
            // If we have original rich_text and content hasn't been edited in app
            if (originalRichText && originalRichText.length > 0 && !card.updatedInApp) {
                // Check if content matches original (convert original back to markdown and compare)
                const originalMarkdown = richToMarkdown(originalRichText);
                if (content === originalMarkdown) {
                    // Content unchanged - use original rich_text to preserve colors/equations
                    return originalRichText;
                }
            }
            // Content was changed - convert markdown to rich_text (may lose colors)
            return markdownToNotionRichText(content);
        };

        const orig = card._notionRichText || {};
        const props = {
            'Name': { title: getRichText('name', card.name, orig.name) },
            'Back': { rich_text: getRichText('back', card.back, orig.back) },
            'Card Type': { select: { name: card.type } },
            'Tags': { multi_select: card.tags.map(t => ({ name: t.name })) },
            'Notes': { rich_text: getRichText('notes', card.notes, orig.notes) },
            'Suspended': { checkbox: !!card.suspended },
            'Leech': { checkbox: !!card.leech },
            'Order': { number: typeof card.order === 'number' ? card.order : null },
            'Difficulty': { number: card.fsrs?.difficulty ?? 4 },
            'Stability': { number: card.fsrs?.stability ?? 1 },
            'Retrievability': { number: card.fsrs?.retrievability ?? 0.9 },
            'Last Rating': lastRating ? { select: { name: displayRating(lastRating) } } : { select: null },
            'Last Review': { date: lastReview ? { start: lastReview } : null },
            'Due Date': { date: dueDate ? { start: dueDate } : null },
            'Interval / Box Level': { number: card.sm2?.interval ?? 1 },
            'Ease Factor': { number: card.sm2?.easeFactor ?? 2.5 },
            'Updated In-App': { checkbox: false },
            'Review History': { rich_text: toRichTextChunks(compactReviewHistory(card.reviewHistory || [])) },
            'Anki GUID': card.ankiGuid ? { rich_text: [{ type: 'text', text: { content: card.ankiGuid } }] } : { rich_text: [] },
            'Anki Note Type': card.ankiNoteType ? { select: { name: card.ankiNoteType } } : { select: null },
            'Anki Fields JSON': card.ankiFields ? { rich_text: [{ type: 'text', text: { content: card.ankiFields } }] } : { rich_text: [] },
            'Cloze Indexes': card.clozeIndexes ? { rich_text: [{ type: 'text', text: { content: card.clozeIndexes } }] } : { rich_text: [] }
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
