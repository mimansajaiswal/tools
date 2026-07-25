import { Editor, Extension, Node, Mark } from 'https://esm.sh/@tiptap/core@3.24.0';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@3.24.0';
import Placeholder from 'https://esm.sh/@tiptap/extension-placeholder@3.24.0';
import { TaskList, TaskItem } from 'https://esm.sh/@tiptap/extension-list@3.24.0';
import Underline from 'https://esm.sh/@tiptap/extension-underline@3.24.0';
import Link from 'https://esm.sh/@tiptap/extension-link@3.24.0';
import { TextStyle } from 'https://esm.sh/@tiptap/extension-text-style@3.24.0';
import Color from 'https://esm.sh/@tiptap/extension-color@3.24.0';
import Highlight from 'https://esm.sh/@tiptap/extension-highlight@3.24.0';
import Image from 'https://esm.sh/@tiptap/extension-image@3.24.0';
import { Table, TableRow, TableCell, TableHeader } from 'https://esm.sh/@tiptap/extension-table@3.24.0';

const BLOCK_TYPES = [
    { value: 'paragraph', label: 'Text', icon: 'type', group: 'BASIC' },
    { value: 'heading1', label: 'Heading 1', icon: 'heading-1', group: 'BASIC' },
    { value: 'heading2', label: 'Heading 2', icon: 'heading-2', group: 'BASIC' },
    { value: 'heading3', label: 'Heading 3', icon: 'heading-3', group: 'BASIC' },
    { value: 'heading4', label: 'Heading 4', icon: 'heading-4', group: 'BASIC' },
    { value: 'divider', label: 'Divider', icon: 'minus', group: 'BASIC' },
    { value: 'bullet', label: 'Bullet list', icon: 'list', group: 'LIST' },
    { value: 'numbered', label: 'Numbered list', icon: 'list-ordered', group: 'LIST' },
    { value: 'checklist', label: 'To-do list', icon: 'check-square', group: 'LIST' },
    { value: 'toggle', label: 'Toggle', icon: 'chevron-right', group: 'LIST' },
    { value: 'quote', label: 'Quote', icon: 'quote', group: 'CONTENT' },
    { value: 'callout', label: 'Callout', icon: 'info', group: 'CONTENT' },
    { value: 'code', label: 'Code block', icon: 'code', group: 'CONTENT' },
    { value: 'image', label: 'Image', icon: 'image', group: 'MEDIA' },
    { value: 'video', label: 'Video', icon: 'video', group: 'MEDIA' },
    { value: 'audio', label: 'Audio', icon: 'music', group: 'MEDIA' },
    { value: 'file', label: 'File', icon: 'file', group: 'MEDIA' },
    { value: 'table', label: 'Table', icon: 'table', group: 'TABLE' },
];

const ICON_ALIASES = {
    'heading-1': 'heading',
    'heading-2': 'heading',
    'heading-3': 'heading',
    'heading-4': 'heading',
    'list-ordered': 'list',
    'check-square': 'list-checks',
    quote: 'text-quote',
    info: 'lightbulb',
    minus: 'circle',
    code: 'file-text',
    image: 'image-plus',
    video: 'file-plus',
    music: 'mic',
    file: 'file-text',
    table: 'square',
};

const LIST_TYPE_MAP = {
    bullet: 'bulletList',
    numbered: 'orderedList',
    checklist: 'taskList',
};

const LIST_NODE_TO_BLOCK = {
    bulletList: 'bullet',
    orderedList: 'numbered',
    taskList: 'checklist',
};

const NOTION_TEXT_COLORS = {
    gray: '#787774',
    brown: '#9F6B53',
    orange: '#D9730D',
    yellow: '#CB912F',
    green: '#448361',
    blue: '#337EA9',
    purple: '#9065B0',
    pink: '#C14C8A',
    red: '#D44C47',
};

const NOTION_BG_COLORS = {
    gray: '#F1F1EF',
    brown: '#F4EEEE',
    orange: '#FBECDD',
    yellow: '#FBEDD6',
    green: '#EDF3EC',
    blue: '#E7F3F8',
    purple: '#F7F3F8',
    pink: '#FBF2F5',
    red: '#FDEBEC',
};

const TEXTUAL_BLOCK_TYPES = new Set(['paragraph', 'heading', 'bullet', 'numbered', 'checklist', 'quote', 'callout', 'toggle']);

function esc(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function icon(name, label = '') {
    const mapped = ICON_ALIASES[name] || name;
    return `<img class="app-icon" data-lucide="${esc(mapped)}" src="./assets/lucide/${esc(mapped)}.svg" alt="${esc(label)}" aria-hidden="${label ? 'false' : 'true'}" />`;
}

function createId() {
    const uuid = globalThis.crypto?.randomUUID?.();
    return `block_${(uuid || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`).replace(/-/g, '')}`;
}

function toArray(value) {
    return Array.isArray(value) ? value : [];
}

function ensureRichText(value, fallbackText = '') {
    if (Array.isArray(value)) return value;
    if (fallbackText !== undefined) {
        const text = String(fallbackText || '');
        return text ? [{ type: 'text', text }] : [];
    }
    return [];
}

function ensureCaption(value) {
    return Array.isArray(value) ? value : [];
}

function normalizeColorValue(cssValue = '') {
    const value = String(cssValue || '').trim().toLowerCase();
    if (!value) return '';
    if (value.startsWith('#')) return value;
    const rgb = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!rgb) return value;
    return `#${rgb.slice(1, 4).map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`;
}

function cssToNotionTextColor(cssValue) {
    const normalized = normalizeColorValue(cssValue);
    for (const [name, css] of Object.entries(NOTION_TEXT_COLORS)) {
        if (css.toLowerCase() === normalized) return name;
    }
    return null;
}

function cssToNotionBgColor(cssValue) {
    const normalized = normalizeColorValue(cssValue);
    for (const [name, css] of Object.entries(NOTION_BG_COLORS)) {
        if (css.toLowerCase() === normalized) return name;
    }
    return null;
}

export function richTextToPlain(richText = []) {
    return toArray(richText).map((node) => node?.text || '').join('');
}

const INLINE_TOKEN_RE = /(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*|~~[^~\n]+?~~|`[^`\n]+?`)/g;

function textToInlineNodes(text = '') {
    if (!text) return [];
    const nodes = [];
    INLINE_TOKEN_RE.lastIndex = 0;
    let lastIndex = 0;
    let match;
    while ((match = INLINE_TOKEN_RE.exec(text)) !== null) {
        if (match.index > lastIndex) {
            nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) });
        }
        const token = match[0];
        if (token.startsWith('**')) {
            nodes.push({ type: 'text', text: token.slice(2, -2), marks: [{ type: 'bold' }] });
        } else if (token.startsWith('*')) {
            nodes.push({ type: 'text', text: token.slice(1, -1), marks: [{ type: 'italic' }] });
        } else if (token.startsWith('~~')) {
            nodes.push({ type: 'text', text: token.slice(2, -2), marks: [{ type: 'strike' }] });
        } else if (token.startsWith('`')) {
            nodes.push({ type: 'text', text: token.slice(1, -1), marks: [{ type: 'code' }] });
        }
        lastIndex = match.index + token.length;
    }
    if (lastIndex < text.length) {
        nodes.push({ type: 'text', text: text.slice(lastIndex) });
    }
    return nodes.filter((node) => node.text);
}

function normalizeMarkdownRichText(richText = []) {
    let changed = false;
    const next = [];
    toArray(richText).forEach((node) => {
        if (!node || node.type !== 'text' || toArray(node.marks).length || !/[`*~]/.test(node.text || '')) {
            if (node) next.push(node);
            return;
        }
        const converted = textToInlineNodes(node.text || '');
        if (converted.length) {
            if (!(converted.length === 1 && converted[0].text === node.text && !converted[0].marks)) {
                changed = true;
            }
            next.push(...converted);
            return;
        }
        next.push(node);
    });
    return { richText: next, changed };
}

function normalizeMarkdownBlocks(blocks = []) {
    let changed = false;
    const next = toArray(blocks).map((block) => {
        if (!block || typeof block !== 'object') return block;
        if (TEXTUAL_BLOCK_TYPES.has(block.type) && Array.isArray(block.richText)) {
            const normalized = normalizeMarkdownRichText(block.richText);
            if (normalized.changed) {
                changed = true;
                return { ...block, richText: normalized.richText };
            }
        }
        if (block.type === 'toggle' && Array.isArray(block.children)) {
            const nested = normalizeMarkdownBlocks(block.children);
            if (nested.changed) {
                changed = true;
                return { ...block, children: nested.blocks };
            }
        }
        if (block.type === 'table') {
            const rows = toArray(block.rows).map((row) => toArray(row).map((cell) => {
                const normalized = normalizeMarkdownRichText(cell);
                if (normalized.changed) changed = true;
                return normalized.richText;
            }));
            return { ...block, rows };
        }
        return block;
    });
    return { blocks: next, changed };
}

function richTextToTiptap(richText = []) {
    return toArray(richText).map((node) => {
        if (!node || node.type !== 'text' || !node.text) return null;
        const tiptapMarks = toArray(node.marks).map((mark) => {
            switch (mark?.type) {
                case 'textColor':
                    return { type: 'textStyle', attrs: { color: NOTION_TEXT_COLORS[mark.attrs?.color] || mark.attrs?.color } };
                case 'bgColor':
                    return { type: 'highlight', attrs: { color: NOTION_BG_COLORS[mark.attrs?.color] || mark.attrs?.color } };
                case 'link':
                    return { type: 'link', attrs: mark.attrs || {} };
                default:
                    return mark?.type ? { type: mark.type, attrs: mark.attrs || {} } : null;
            }
        }).filter(Boolean);
        return tiptapMarks.length
            ? { type: 'text', text: node.text || '', marks: tiptapMarks }
            : { type: 'text', text: node.text || '' };
    }).filter(Boolean);
}

function tiptapToRichText(nodes = []) {
    return toArray(nodes)
        .filter((node) => node?.type === 'text')
        .map((node) => {
            const marks = toArray(node.marks).map((mark) => {
                if (mark.type === 'textStyle' && mark.attrs?.color) {
                    const notionColor = cssToNotionTextColor(mark.attrs.color);
                    return notionColor ? { type: 'textColor', attrs: { color: notionColor } } : null;
                }
                if (mark.type === 'highlight' && mark.attrs?.color) {
                    const notionColor = cssToNotionBgColor(mark.attrs.color);
                    return notionColor ? { type: 'bgColor', attrs: { color: notionColor } } : null;
                }
                if (mark.type === 'link') return { type: 'link', attrs: mark.attrs || {} };
                return mark.type ? { type: mark.type, attrs: mark.attrs || undefined } : null;
            }).filter(Boolean).map((mark) => {
                if (!mark.attrs) {
                    delete mark.attrs;
                }
                return mark;
            });
            const next = { type: 'text', text: node.text || '' };
            if (marks.length) next.marks = marks;
            return next;
        });
}

function fragmentToJson(fragment) {
    return fragment?.toJSON?.() || [];
}

function resolveAssetUrl(block = {}, getAssetUrl) {
    if (block.src) return block.src;
    if (block.assetId && typeof getAssetUrl === 'function') return getAssetUrl(block.assetId) || '';
    return block.assetId || '';
}

function createListContainer(type) {
    const listNode = LIST_TYPE_MAP[type] || 'bulletList';
    if (listNode === 'orderedList') {
        return { type: 'orderedList', attrs: { start: 1 }, content: [] };
    }
    return { type: listNode, content: [] };
}

function createListItem(block) {
    const paragraph = { type: 'paragraph', content: richTextToTiptap(ensureRichText(block.richText, block.text)) };
    if (block.type === 'checklist') {
        return {
            type: 'taskItem',
            attrs: { checked: block.checked === true },
            content: [paragraph],
        };
    }
    return { type: 'listItem', content: [paragraph] };
}

function blocksToDoc(blocks = [], getAssetUrl) {
    const source = Array.isArray(blocks) && blocks.length ? blocks : [{ id: createId(), type: 'paragraph', richText: [] }];
    const content = [];
    const listStack = [];

    function closeToDepth(targetDepth) {
        while (listStack.length > targetDepth) listStack.pop();
    }

    function appendNodeAtDepth(node, depth) {
        if (depth <= 0 || !listStack.length) {
            content.push(node);
            return;
        }
        const parentLevel = listStack[Math.min(depth - 1, listStack.length - 1)];
        const parentItem = parentLevel?.lastItem;
        if (!parentItem) {
            content.push(node);
            return;
        }
        parentItem.content.push(node);
    }

    for (const rawBlock of source) {
        const block = rawBlock || {};
        const type = block.type || 'paragraph';
        const richText = ensureRichText(block.richText, block.text);

        if (!LIST_TYPE_MAP[type]) {
            closeToDepth(0);
            switch (type) {
                case 'paragraph':
                    content.push({ type: 'paragraph', content: richTextToTiptap(richText) });
                    break;
                case 'heading':
                    content.push({ type: 'heading', attrs: { level: Math.min(4, Math.max(1, Number(block.level || 2))) }, content: richTextToTiptap(richText) });
                    break;
                case 'quote':
                    content.push({ type: 'blockquote', content: [{ type: 'paragraph', content: richTextToTiptap(richText) }] });
                    break;
                case 'callout':
                    content.push({ type: 'callout', attrs: { icon: block.icon || 'lightbulb' }, content: richTextToTiptap(richText) });
                    break;
                case 'toggle':
                    content.push({
                        type: 'toggleBlock',
                        attrs: { open: block.open !== false },
                        content: [
                            { type: 'paragraph', content: richTextToTiptap(richText) },
                            ...blocksToDoc(toArray(block.children), getAssetUrl).content,
                        ],
                    });
                    break;
                case 'code':
                    content.push({
                        type: 'codeBlock',
                        attrs: { language: block.language || '' },
                        content: block.text ? [{ type: 'text', text: block.text || '' }] : [],
                    });
                    break;
                case 'divider':
                    content.push({ type: 'horizontalRule' });
                    break;
                case 'image':
                    content.push({
                        type: 'image',
                        attrs: {
                            src: resolveAssetUrl(block, getAssetUrl),
                            alt: block.alt || '',
                            assetId: block.assetId || '',
                            captionRichText: ensureCaption(block.captionRichText),
                        },
                    });
                    break;
                case 'video':
                    content.push({
                        type: 'videoEmbed',
                        attrs: {
                            assetId: block.assetId || '',
                            src: resolveAssetUrl(block, getAssetUrl),
                            captionRichText: ensureCaption(block.captionRichText),
                        },
                    });
                    break;
                case 'audio':
                    content.push({
                        type: 'audioEmbed',
                        attrs: {
                            assetId: block.assetId || '',
                            src: resolveAssetUrl(block, getAssetUrl),
                            captionRichText: ensureCaption(block.captionRichText),
                        },
                    });
                    break;
                case 'file':
                    content.push({
                        type: 'fileEmbed',
                        attrs: {
                            assetId: block.assetId || '',
                            src: resolveAssetUrl(block, getAssetUrl),
                            name: block.name || '',
                            mimeType: block.mimeType || '',
                            captionRichText: ensureCaption(block.captionRichText),
                        },
                    });
                    break;
                case 'table': {
                    const rows = toArray(block.rows);
                    if (!rows.length) {
                        content.push({ type: 'paragraph' });
                        break;
                    }
                    content.push({
                        type: 'table',
                        content: rows.map((row, rowIndex) => ({
                            type: 'tableRow',
                            content: toArray(row).map((cell) => ({
                                type: rowIndex === 0 ? 'tableHeader' : 'tableCell',
                                content: [{ type: 'paragraph', content: richTextToTiptap(cell) }],
                            })),
                        })),
                    });
                    break;
                }
                default:
                    content.push({ type: 'paragraph', content: richTextToTiptap(richText) });
                    break;
            }
            continue;
        }

        const depth = Math.max(0, Number(block.depth || 0));
        closeToDepth(depth + 1);

        while (listStack.length < depth + 1) {
            const newList = createListContainer(type);
            appendNodeAtDepth(newList, listStack.length);
            listStack.push({ type, list: newList, lastItem: null });
        }

        let currentLevel = listStack[depth];
        if (!currentLevel || currentLevel.type !== type) {
            listStack.length = depth;
            const newList = createListContainer(type);
            appendNodeAtDepth(newList, depth);
            currentLevel = { type, list: newList, lastItem: null };
            listStack[depth] = currentLevel;
        }

        const item = createListItem({ ...block, richText });
        currentLevel.list.content.push(item);
        currentLevel.lastItem = item;
    }

    return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}

function forEachChild(node, fn) {
    if (!node?.forEach) return;
    node.forEach((child, _offset, index) => fn(child, index));
}

function extractInlineJson(node) {
    return fragmentToJson(node?.content);
}

function extractTextContentFromBlock(node) {
    if (!node) return [];
    if (node.type.name === 'paragraph' || node.type.name === 'heading' || node.type.name === 'callout' || node.type.name === 'toggleBlock') {
        return tiptapToRichText(extractInlineJson(node));
    }
    let paragraphLike = null;
    forEachChild(node, (child) => {
        if (!paragraphLike && child.isTextblock) paragraphLike = child;
    });
    if (paragraphLike) return tiptapToRichText(extractInlineJson(paragraphLike));
    return tiptapToRichText(extractInlineJson(node));
}

function processListNode(node, output, depth) {
    const blockType = LIST_NODE_TO_BLOCK[node.type.name] || 'bullet';
    forEachChild(node, (item) => {
        let contentNode = null;
        const nested = [];
        forEachChild(item, (child) => {
            if (!contentNode && child.isTextblock) contentNode = child;
            else if (LIST_NODE_TO_BLOCK[child.type.name]) nested.push(child);
        });
        output.push({
            id: createId(),
            type: blockType,
            depth,
            checked: blockType === 'checklist' ? item.attrs?.checked === true : false,
            richText: contentNode ? tiptapToRichText(extractInlineJson(contentNode)) : tiptapToRichText(extractInlineJson(item)),
        });
        nested.forEach((child) => processNode(child, output, depth + 1));
    });
}

function processNode(node, output, depth = 0) {
    if (!node) return;
    switch (node.type.name) {
        case 'paragraph':
            output.push({ id: createId(), type: 'paragraph', richText: tiptapToRichText(extractInlineJson(node)) });
            break;
        case 'heading':
            output.push({ id: createId(), type: 'heading', level: node.attrs?.level || 2, richText: tiptapToRichText(extractInlineJson(node)) });
            break;
        case 'bulletList':
        case 'orderedList':
        case 'taskList':
            processListNode(node, output, depth);
            break;
        case 'blockquote': {
            output.push({ id: createId(), type: 'quote', richText: extractTextContentFromBlock(node) });
            break;
        }
        case 'callout':
            output.push({ id: createId(), type: 'callout', icon: node.attrs?.icon || 'lightbulb', richText: tiptapToRichText(extractInlineJson(node)) });
            break;
        case 'toggleBlock':
            {
                const nestedNodes = [];
                forEachChild(node, (child) => nestedNodes.push(child));
                const summary = nestedNodes.shift();
                const children = [];
                nestedNodes.forEach((child) => processNode(child, children, 0));
            output.push({
                id: createId(),
                type: 'toggle',
                open: node.attrs?.open !== false,
                richText: summary ? tiptapToRichText(extractInlineJson(summary)) : [],
                children,
            });
            break;
            }
        case 'codeBlock':
            output.push({ id: createId(), type: 'code', language: node.attrs?.language || '', text: node.textContent || '' });
            break;
        case 'horizontalRule':
            output.push({ id: createId(), type: 'divider' });
            break;
        case 'image':
            output.push({
                id: createId(),
                type: 'image',
                assetId: node.attrs?.assetId || '',
                captionRichText: ensureCaption(node.attrs?.captionRichText),
                alt: node.attrs?.alt || '',
            });
            break;
        case 'videoEmbed':
            output.push({ id: createId(), type: 'video', assetId: node.attrs?.assetId || '', captionRichText: ensureCaption(node.attrs?.captionRichText) });
            break;
        case 'audioEmbed':
            output.push({ id: createId(), type: 'audio', assetId: node.attrs?.assetId || '', captionRichText: ensureCaption(node.attrs?.captionRichText) });
            break;
        case 'fileEmbed':
            output.push({
                id: createId(),
                type: 'file',
                assetId: node.attrs?.assetId || '',
                captionRichText: ensureCaption(node.attrs?.captionRichText),
                name: node.attrs?.name || '',
                mimeType: node.attrs?.mimeType || '',
            });
            break;
        case 'table': {
            const rows = [];
            forEachChild(node, (row) => {
                const cells = [];
                forEachChild(row, (cell) => {
                    let paragraph = null;
                    forEachChild(cell, (child) => {
                        if (!paragraph && child.isTextblock) paragraph = child;
                    });
                    cells.push(paragraph ? tiptapToRichText(extractInlineJson(paragraph)) : tiptapToRichText(extractInlineJson(cell)));
                });
                rows.push(cells);
            });
            output.push({ id: createId(), type: 'table', rows });
            break;
        }
        default:
            if (node.isTextblock) {
                output.push({ id: createId(), type: 'paragraph', richText: tiptapToRichText(extractInlineJson(node)) });
            }
            break;
    }
}

function docToBlocks(doc) {
    const blocks = [];
    forEachChild(doc, (node) => processNode(node, blocks, 0));
    if (!blocks.length) return [{ id: createId(), type: 'paragraph', richText: [] }];
    return blocks;
}

const CalloutNode = Node.create({
    name: 'callout',
    group: 'block',
    content: 'inline*',
    defining: true,
    addAttributes() {
        return {
            icon: {
                default: 'lightbulb',
                parseHTML: (element) => element.getAttribute('data-icon') || 'lightbulb',
                renderHTML: (attrs) => ({ 'data-icon': attrs.icon || 'lightbulb' }),
            },
        };
    },
    parseHTML() {
        return [{ tag: 'div[data-type="callout"]', contentElement: '.callout-content' }];
    },
    renderHTML({ node }) {
        const iconName = node.attrs.icon || 'lightbulb';
        return [
            'div',
            { 'data-type': 'callout', 'data-icon': iconName, class: 'callout-block' },
            ['img', { src: `./assets/lucide/${iconName}.svg`, class: 'callout-icon app-icon', alt: '', 'aria-hidden': 'true' }],
            ['div', { class: 'callout-content' }, 0],
        ];
    },
    addNodeView() {
        return ({ node }) => {
            const dom = document.createElement('div');
            dom.className = 'callout-block';
            dom.dataset.type = 'callout';

            const iconEl = document.createElement('img');
            iconEl.className = 'callout-icon app-icon';
            iconEl.alt = '';
            iconEl.setAttribute('aria-hidden', 'true');

            const contentDOM = document.createElement('div');
            contentDOM.className = 'callout-content';

            dom.append(iconEl, contentDOM);

            const update = (current) => {
                const name = current.attrs.icon || 'lightbulb';
                iconEl.src = `./assets/lucide/${name}.svg`;
            };
            update(node);

            return { dom, contentDOM, update };
        };
    },
});

const ToggleNode = Node.create({
    name: 'toggleBlock',
    group: 'block',
    content: 'paragraph block*',
    defining: true,
    addAttributes() {
        return {
            open: {
                default: true,
                parseHTML: (element) => element.getAttribute('data-open') !== 'false',
                renderHTML: (attrs) => ({ 'data-open': String(attrs.open !== false) }),
            },
        };
    },
    parseHTML() {
        return [{ tag: 'div[data-type="toggle"]' }];
    },
    renderHTML({ node }) {
        return [
            'div',
            { 'data-type': 'toggle', 'data-open': String(node.attrs.open !== false), class: 'toggle-block' },
            ['span', { class: 'toggle-arrow' },
                ['img', { src: './assets/lucide/chevron-right.svg', class: 'app-icon toggle-arrow-icon', alt: '', 'aria-hidden': 'true' }],
            ],
            ['div', { class: 'toggle-content' }, 0],
        ];
    },
    addNodeView() {
        return ({ node, editor, getPos }) => {
            const dom = document.createElement('div');
            dom.className = 'toggle-block';
            dom.dataset.type = 'toggle';

            const arrow = document.createElement('span');
            arrow.className = 'toggle-arrow';
            const arrowImg = document.createElement('img');
            arrowImg.className = 'app-icon toggle-arrow-icon';
            arrowImg.src = './assets/lucide/chevron-right.svg';
            arrowImg.alt = '';
            arrowImg.setAttribute('aria-hidden', 'true');
            arrow.appendChild(arrowImg);

            const contentDOM = document.createElement('div');
            contentDOM.className = 'toggle-content';

            dom.append(arrow, contentDOM);

            const sync = (current) => {
                dom.dataset.open = String(current.attrs.open !== false);
                requestAnimationFrame(() => {
                    Array.from(contentDOM.children).forEach((child, index) => {
                        if (index > 0) child.style.display = current.attrs.open === false ? 'none' : '';
                    });
                });
            };

            sync(node);

            arrow.addEventListener('mousedown', (event) => {
                event.preventDefault();
                if (typeof getPos !== 'function') return;
                const position = getPos();
                const nextOpen = node.attrs.open === false;
                editor.chain().focus().command(({ tr }) => {
                    tr.setNodeMarkup(position, undefined, { ...node.attrs, open: nextOpen });
                    return true;
                }).run();
            });

            return {
                dom,
                contentDOM,
                update(updatedNode) {
                    if (updatedNode.type.name !== 'toggleBlock') return false;
                    node = updatedNode;
                    sync(updatedNode);
                    return true;
                },
            };
        };
    },
});

const JournalImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            assetId: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-asset-id') || '',
                renderHTML: (attrs) => (attrs.assetId ? { 'data-asset-id': attrs.assetId } : {}),
            },
            captionRichText: {
                default: [],
            },
        };
    },
    renderHTML({ HTMLAttributes }) {
        const { assetId = '', captionRichText, 'data-asset-id': renderedAssetId = '', ...attrs } = HTMLAttributes || {};
        return ['img', { ...attrs, 'data-asset-id': assetId || renderedAssetId }];
    },
});

function createEmbedPlaceholder(label, iconName) {
    const placeholder = document.createElement('div');
    placeholder.className = 'embed-placeholder';
    const img = document.createElement('img');
    img.className = 'app-icon';
    img.src = `./assets/lucide/${iconName}.svg`;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    const txt = document.createElement('span');
    txt.textContent = label;
    placeholder.append(img, txt);
    return placeholder;
}

function createMediaNodeView({ className, buildContent }) {
    return ({ node }) => {
        const dom = document.createElement('div');
        dom.className = className;
        dom.dataset.assetId = node.attrs.assetId || '';
        buildContent(dom, node);
        return { dom };
    };
}

const VideoEmbedNode = Node.create({
    name: 'videoEmbed',
    group: 'block',
    atom: true,
    selectable: true,
    addAttributes() {
        return {
            assetId: { default: '' },
            src: { default: '' },
            captionRichText: { default: [] },
        };
    },
    parseHTML() {
        return [{ tag: 'div[data-type="video-embed"]' }];
    },
    renderHTML({ node }) {
        return ['div', { 'data-type': 'video-embed', 'data-asset-id': node.attrs.assetId || '', class: 'media-embed video-embed' }];
    },
    addNodeView() {
        return createMediaNodeView({
            className: 'media-embed video-embed',
            buildContent(dom, node) {
                if (node.attrs.src) {
                    const video = document.createElement('video');
                    video.src = node.attrs.src;
                    video.controls = true;
                    dom.appendChild(video);
                    return;
                }
                dom.appendChild(createEmbedPlaceholder('Video', 'video'));
            },
        });
    },
});

const AudioEmbedNode = Node.create({
    name: 'audioEmbed',
    group: 'block',
    atom: true,
    selectable: true,
    addAttributes() {
        return {
            assetId: { default: '' },
            src: { default: '' },
            captionRichText: { default: [] },
        };
    },
    parseHTML() {
        return [{ tag: 'div[data-type="audio-embed"]' }];
    },
    renderHTML({ node }) {
        return ['div', { 'data-type': 'audio-embed', 'data-asset-id': node.attrs.assetId || '', class: 'media-embed audio-embed' }];
    },
    addNodeView() {
        return createMediaNodeView({
            className: 'media-embed audio-embed',
            buildContent(dom, node) {
                if (node.attrs.src) {
                    const audio = document.createElement('audio');
                    audio.src = node.attrs.src;
                    audio.controls = true;
                    dom.appendChild(audio);
                    return;
                }
                dom.appendChild(createEmbedPlaceholder('Audio', 'music'));
            },
        });
    },
});

const FileEmbedNode = Node.create({
    name: 'fileEmbed',
    group: 'block',
    atom: true,
    selectable: true,
    addAttributes() {
        return {
            assetId: { default: '' },
            src: { default: '' },
            name: { default: '' },
            mimeType: { default: '' },
            captionRichText: { default: [] },
        };
    },
    parseHTML() {
        return [{ tag: 'div[data-type="file-embed"]' }];
    },
    renderHTML({ node }) {
        return ['div', { 'data-type': 'file-embed', 'data-asset-id': node.attrs.assetId || '', class: 'media-embed file-embed' }];
    },
    addNodeView() {
        return createMediaNodeView({
            className: 'media-embed file-embed',
            buildContent(dom, node) {
                const link = document.createElement(node.attrs.src ? 'a' : 'div');
                link.className = 'file-embed';
                if (node.attrs.src) {
                    link.href = node.attrs.src;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                }
                const iconEl = document.createElement('img');
                iconEl.className = 'app-icon';
                iconEl.src = './assets/lucide/file.svg';
                iconEl.alt = '';
                iconEl.setAttribute('aria-hidden', 'true');
                const copy = document.createElement('div');
                copy.innerHTML = `<strong>${esc(node.attrs.name || 'File')}</strong><div>${esc(node.attrs.mimeType || '')}</div>`;
                link.append(iconEl, copy);
                dom.appendChild(link);
            },
        });
    },
});

function renderSlashMenu(items = []) {
    const groups = {};
    items.forEach((item) => {
        if (!groups[item.group]) groups[item.group] = [];
        groups[item.group].push(item);
    });

    let html = '<div class="slash-menu">';
    let flatIndex = 0;
    for (const [groupName, groupItems] of Object.entries(groups)) {
        html += `<div class="slash-menu-group">${esc(groupName)}</div>`;
        groupItems.forEach((item) => {
            html += `
                <button type="button" class="tiptap-slash-item slash-menu-item" data-value="${esc(item.value)}" data-item-index="${flatIndex}">
                    <span class="slash-menu-item-icon">${icon(item.icon)}</span>
                    <span class="slash-menu-item-label">${esc(item.label)}</span>
                </button>
            `;
            flatIndex += 1;
        });
    }
    html += '</div>';
    return html;
}

function createBubbleMenuElement() {
    const el = document.createElement('div');
    el.className = 'bubble-menu';
    el.innerHTML = `
        <button class="bm-btn" data-cmd="toggleBold" title="Bold"><b>B</b></button>
        <button class="bm-btn" data-cmd="toggleItalic" title="Italic"><i>I</i></button>
        <button class="bm-btn" data-cmd="toggleUnderline" title="Underline"><u>U</u></button>
        <button class="bm-btn" data-cmd="toggleStrike" title="Strikethrough"><s>S</s></button>
        <button class="bm-btn" data-cmd="toggleCode" title="Code"><code>&lt;/&gt;</code></button>
        <div class="bm-separator"></div>
        <button class="bm-btn bm-link" data-cmd="setLink" title="Link">🔗</button>
        <div class="bm-separator"></div>
        <div class="bm-color-picker">
            <button class="bm-btn bm-color-toggle" title="Text color">A</button>
            <div class="bm-color-dropdown is-hidden">
                <div class="bm-color-label">Text</div>
                ${Object.entries(NOTION_TEXT_COLORS).map(([name, css]) => `
                    <button class="bm-color-swatch" data-type="textColor" data-color="${name}" style="background:${css}" title="${name}"></button>
                `).join('')}
                <button class="bm-color-swatch bm-color-default" data-type="textColor" data-color="default" title="Default">A</button>
                <div class="bm-color-label">Background</div>
                ${Object.entries(NOTION_BG_COLORS).map(([name, css]) => `
                    <button class="bm-color-swatch" data-type="bgColor" data-color="${name}" style="background:${css}" title="${name}"></button>
                `).join('')}
                <button class="bm-color-swatch bm-color-default" data-type="bgColor" data-color="default" title="None">✕</button>
            </div>
        </div>
    `;
    return el;
}

function pickFile(accept = '') {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        if (accept) input.accept = accept;
        input.addEventListener('change', () => resolve(input.files?.[0] || null), { once: true });
        input.click();
    });
}

function createSlashMenuElement(container) {
    const menu = document.createElement('div');
    menu.className = 'tiptap-slash-menu is-hidden';
    container.appendChild(menu);
    return menu;
}

export function initEditor(container, { placeholder, onUpdate, getAssetUrl, createAsset } = {}) {
    const bubbleMenuEl = createBubbleMenuElement();
    document.body.appendChild(bubbleMenuEl);
    const slashMenuEl = createSlashMenuElement(container);
    let slashRange = null;
    let slashItems = [];
    let activeSlashIndex = 0;

    let suppressUpdate = false;

    const editor = new Editor({
        element: container,
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4] },
                orderedList: {},
                codeBlock: {},
                horizontalRule: {},
                link: false,
                underline: false,
            }),
            Placeholder.configure({ placeholder: placeholder || 'Write something...' }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Underline,
            Link.configure({ openOnClick: false }),
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            JournalImage.configure({ inline: false }),
            Table.configure({ resizable: false }),
            TableRow,
            TableCell,
            TableHeader,
            CalloutNode,
            ToggleNode,
            VideoEmbedNode,
            AudioEmbedNode,
            FileEmbedNode,
        ],
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
        editorProps: {
            attributes: {
                class: 'ProseMirror journaling-prose',
            },
        },
        onUpdate({ editor: instance }) {
            if (suppressUpdate) return;
            const blocks = docToBlocks(instance.state.doc);
            const normalized = normalizeMarkdownBlocks(blocks);
            if (normalized.changed) {
                suppressUpdate = true;
                instance.commands.setContent(blocksToDoc(normalized.blocks, getAssetUrl), false);
                suppressUpdate = false;
                onUpdate?.(normalized.blocks);
                return;
            }
            onUpdate?.(blocks);
        },
    });

    // Custom floating bubble menu — no @floating-ui dependency
    function positionBubbleMenu() {
        const { from, to, empty } = editor.state.selection;
        if (empty || editor.isActive('codeBlock')) {
            bubbleMenuEl.style.display = 'none';
            return;
        }
        const startCoords = editor.view.coordsAtPos(from);
        const endCoords = editor.view.coordsAtPos(to);
        const midX = (startCoords.left + endCoords.left) / 2;
        const topY = Math.min(startCoords.top, endCoords.top);
        bubbleMenuEl.style.display = 'flex';
        requestAnimationFrame(() => {
            const menuW = bubbleMenuEl.offsetWidth || 340;
            const menuH = bubbleMenuEl.offsetHeight || 44;
            let left = midX - menuW / 2;
            let top = topY - menuH - 10 + window.scrollY;
            left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
            top = Math.max(8, top);
            bubbleMenuEl.style.left = left + 'px';
            bubbleMenuEl.style.top = top + 'px';
        });
        syncBubbleMenuState();
    }

    editor.on('selectionUpdate', positionBubbleMenu);
    editor.on('transaction', ({ transaction }) => {
        if (!transaction.selectionSet) return;
        positionBubbleMenu();
    });
    editor.on('blur', () => { bubbleMenuEl.style.display = 'none'; });
    bubbleMenuEl.addEventListener('mousedown', (e) => e.preventDefault());

    function hideSlashMenu() {
        slashRange = null;
        slashItems = [];
        activeSlashIndex = 0;
        slashMenuEl.classList.add('is-hidden');
        slashMenuEl.innerHTML = '';
        slashMenuEl.style.left = '';
        slashMenuEl.style.top = '';
    }

    function setActiveSlashItem() {
        slashMenuEl.querySelectorAll('[data-item-index]').forEach((item) => {
            item.classList.toggle('is-active', Number(item.getAttribute('data-item-index')) === activeSlashIndex);
        });
    }

    function detectSlashQuery() {
        const { state } = editor;
        const { from, empty, $from } = state.selection;
        if (!empty || !$from.parent.isTextblock) return null;
        const blockStart = $from.start();
        const textBefore = state.doc.textBetween(blockStart, from, '\n', '\0');
        if (!textBefore.startsWith('/')) return null;
        if (/\s/.test(textBefore.slice(1))) return null;
        return {
            query: textBefore.slice(1).trim().toLowerCase(),
            range: { from: blockStart, to: from },
            coords: editor.view.coordsAtPos(from),
        };
    }

    function updateSlashMenu() {
        const slash = detectSlashQuery();
        if (!slash) {
            hideSlashMenu();
            return;
        }
        const items = BLOCK_TYPES.filter((item) => {
            if (!slash.query) return true;
            const query = slash.query.toLowerCase();
            return item.label.toLowerCase().includes(query) || item.value.toLowerCase().includes(query) || item.group.toLowerCase().includes(query);
        });
        if (!items.length) {
            hideSlashMenu();
            return;
        }
        slashRange = slash.range;
        slashItems = items;
        activeSlashIndex = Math.max(0, Math.min(activeSlashIndex, slashItems.length - 1));
        slashMenuEl.innerHTML = renderSlashMenu(items);
        slashMenuEl.classList.remove('is-hidden');
        const box = container.getBoundingClientRect();
        slashMenuEl.style.left = `${slash.coords.left - box.left}px`;
        slashMenuEl.style.top = `${slash.coords.bottom - box.top + 8}px`;
        setActiveSlashItem();
    }

    function syncBubbleMenuState() {
        const mappings = {
            toggleBold: 'bold',
            toggleItalic: 'italic',
            toggleUnderline: 'underline',
            toggleStrike: 'strike',
            toggleCode: 'code',
            setLink: 'link',
        };
        bubbleMenuEl.querySelectorAll('[data-cmd]').forEach((button) => {
            const cmd = button.getAttribute('data-cmd');
            button.classList.toggle('is-active', editor.isActive(mappings[cmd] || cmd));
        });
    }

    async function insertMediaBlock(type) {
        const accept = {
            image: 'image/*',
            video: 'video/*',
            audio: 'audio/*',
            file: '',
        }[type] || '';
        const file = await pickFile(accept);
        if (!file) return;
        let asset = null;
        if (typeof createAsset === 'function') {
            asset = await createAsset(file, type);
        }
        const assetId = asset?.id || asset?.assetId || '';
        const src = asset?.src || (assetId && typeof getAssetUrl === 'function' ? getAssetUrl(assetId) : '') || URL.createObjectURL(file);
        if (type === 'image') {
            editor.chain().focus().insertContent({ type: 'image', attrs: { src, alt: file.name || '', assetId, captionRichText: [] } }).run();
            return;
        }
        if (type === 'video') {
            editor.chain().focus().insertContent({ type: 'videoEmbed', attrs: { assetId, src, captionRichText: [] } }).run();
            return;
        }
        if (type === 'audio') {
            editor.chain().focus().insertContent({ type: 'audioEmbed', attrs: { assetId, src, captionRichText: [] } }).run();
            return;
        }
        editor.chain().focus().insertContent({ type: 'fileEmbed', attrs: { assetId, src, name: file.name || 'File', mimeType: file.type || '', captionRichText: [] } }).run();
    }

    async function insertBlock(type) {
        const chain = editor.chain().focus();
        if (slashRange) chain.deleteRange(slashRange).focus();
        hideSlashMenu();
        switch (type) {
            case 'paragraph':
                chain.setParagraph().run();
                break;
            case 'heading1':
                chain.setHeading({ level: 1 }).run();
                break;
            case 'heading2':
                chain.setHeading({ level: 2 }).run();
                break;
            case 'heading3':
                chain.setHeading({ level: 3 }).run();
                break;
            case 'heading4':
                chain.setHeading({ level: 4 }).run();
                break;
            case 'bullet':
                chain.toggleBulletList().run();
                break;
            case 'numbered':
                chain.toggleOrderedList().run();
                break;
            case 'checklist':
                chain.toggleTaskList().run();
                break;
            case 'toggle':
                chain.insertContent({
                    type: 'toggleBlock',
                    attrs: { open: true },
                    content: [{ type: 'paragraph' }, { type: 'paragraph' }],
                }).run();
                break;
            case 'quote':
                chain.toggleBlockquote().run();
                break;
            case 'callout':
                chain.setNode('callout', { icon: 'lightbulb' }).run();
                break;
            case 'code':
                chain.setCodeBlock().run();
                break;
            case 'divider':
                chain.setHorizontalRule().run();
                break;
            case 'table':
                chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                break;
            case 'image':
            case 'video':
            case 'audio':
            case 'file':
                chain.run();
                await insertMediaBlock(type);
                break;
            default:
                chain.setParagraph().run();
                break;
        }
    }

    function closeBubbleDropdowns() {
        bubbleMenuEl.querySelectorAll('.bm-color-dropdown').forEach((dropdown) => dropdown.classList.add('is-hidden'));
    }

    bubbleMenuEl.addEventListener('click', (event) => {
        const toggle = event.target.closest('.bm-color-toggle');
        if (toggle) {
            const dropdown = toggle.nextElementSibling;
            dropdown?.classList.toggle('is-hidden');
            return;
        }

        const swatch = event.target.closest('[data-type]');
        if (swatch) {
            const type = swatch.getAttribute('data-type');
            const color = swatch.getAttribute('data-color');
            if (type === 'textColor') {
                if (color === 'default') editor.chain().focus().unsetColor().run();
                else editor.chain().focus().setColor(NOTION_TEXT_COLORS[color] || color).run();
            }
            if (type === 'bgColor') {
                if (color === 'default') editor.chain().focus().unsetHighlight().run();
                else editor.chain().focus().setHighlight({ color: NOTION_BG_COLORS[color] || color }).run();
            }
            closeBubbleDropdowns();
            syncBubbleMenuState();
            return;
        }

        const button = event.target.closest('[data-cmd]');
        if (!button) return;
        const cmd = button.getAttribute('data-cmd');
        if (cmd === 'setLink') {
            const existing = editor.getAttributes('link').href || '';
            const url = prompt('Enter URL:', existing);
            if (url && url.trim()) editor.chain().focus().setLink({ href: url.trim(), target: '_blank' }).run();
            else editor.chain().focus().unsetLink().run();
        } else if (cmd === 'toggleBold') {
            editor.chain().focus().toggleBold().run();
        } else if (cmd === 'toggleItalic') {
            editor.chain().focus().toggleItalic().run();
        } else if (cmd === 'toggleUnderline') {
            editor.chain().focus().toggleUnderline().run();
        } else if (cmd === 'toggleStrike') {
            editor.chain().focus().toggleStrike().run();
        } else if (cmd === 'toggleCode') {
            editor.chain().focus().toggleCode().run();
        }
        syncBubbleMenuState();
    });

    slashMenuEl.addEventListener('mousedown', (event) => {
        event.preventDefault();
        const item = event.target.closest('[data-value]');
        if (!item) return;
        insertBlock(item.getAttribute('data-value') || 'paragraph');
    });

    container.addEventListener('keydown', (event) => {
        if (!slashRange || !slashItems.length) return;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            activeSlashIndex = (activeSlashIndex + 1) % slashItems.length;
            setActiveSlashItem();
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            activeSlashIndex = (activeSlashIndex - 1 + slashItems.length) % slashItems.length;
            setActiveSlashItem();
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            insertBlock(slashItems[activeSlashIndex]?.value || 'paragraph');
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            hideSlashMenu();
        }
    }, true);

    document.addEventListener('mousedown', (event) => {
        if (!bubbleMenuEl.contains(event.target)) closeBubbleDropdowns();
    });

    editor.on('selectionUpdate', () => {
        updateSlashMenu();
        syncBubbleMenuState();
    });
    editor.on('transaction', () => {
        updateSlashMenu();
        syncBubbleMenuState();
    });
    editor.on('blur', () => {
        window.setTimeout(() => {
            if (!slashMenuEl.matches(':hover')) hideSlashMenu();
        }, 120);
    });

    editor.__bubbleMenuEl = bubbleMenuEl;
    editor.__slashMenuEl = slashMenuEl;
    return editor;
}

export function setEditorContent(editor, blocks) {
    if (!editor) return;
    editor.commands.setContent(blocksToDoc(blocks, editor.__getAssetUrl), false);
}

export function getEditorBlocks(editor) {
    if (!editor) return [];
    return docToBlocks(editor.state.doc);
}

export function mountDocumentEditor(options = {}) {
    const editor = initEditor(options.container, {
        placeholder: options.placeholder || "Type '/' for blocks",
        onUpdate: options.onChange,
        getAssetUrl: options.getAssetUrl,
        createAsset: options.createAsset,
    });
    editor.__getAssetUrl = options.getAssetUrl;
    return {
        setValue(blocks) {
            setEditorContent(editor, blocks);
        },
        getValue() {
            return getEditorBlocks(editor);
        },
        destroy() {
            editor.__bubbleMenuEl?.remove();
            editor.__slashMenuEl?.remove();
            editor.destroy();
        },
    };
}

// v4
