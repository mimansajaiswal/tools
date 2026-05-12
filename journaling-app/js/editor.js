import { Editor } from 'https://esm.sh/@tiptap/core';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit';
import Placeholder from 'https://esm.sh/@tiptap/extension-placeholder';
import Blockquote from 'https://esm.sh/@tiptap/extension-blockquote';
import { TaskList, TaskItem } from 'https://esm.sh/@tiptap/extension-list';

const BLOCK_TYPES = [
    { value: 'paragraph', label: 'Text' },
    { value: 'heading', label: 'Heading' },
    { value: 'bullet', label: 'Bullet list' },
    { value: 'checklist', label: 'To-do list' },
    { value: 'quote', label: 'Quote' },
    { value: 'callout', label: 'Callout' }
];

const LIST_TYPES = new Set(['bullet', 'checklist']);
const NESTED_LIST_NODE_TYPES = new Set(['bulletList', 'orderedList', 'taskList']);

function esc(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function icon(name, label = '') {
    return `<img class="app-icon" data-lucide="${esc(name)}" src="./assets/lucide/${esc(name)}.svg" alt="${esc(label)}" aria-hidden="${label ? 'false' : 'true'}" />`;
}

function createId() {
    return `block_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function textNode(text) {
    return text ? [{ type: 'text', text }] : [];
}

function paragraphNode(text = '') {
    return {
        type: 'paragraph',
        content: textNode(text)
    };
}

function headingNode(text = '') {
    return {
        type: 'heading',
        attrs: { level: 2 },
        content: textNode(text)
    };
}

function blockquoteNode(text = '', callout = false) {
    return {
        type: 'blockquote',
        attrs: { callout },
        content: [paragraphNode(text)]
    };
}

function listContainerNode(type) {
    if (type === 'checklist') return { type: 'taskList', content: [] };
    return { type: 'bulletList', content: [] };
}

function listItemNode(type, text = '', checked = false) {
    if (type === 'checklist') {
        return {
            type: 'taskItem',
            attrs: { checked: !!checked },
            content: [paragraphNode(text)]
        };
    }

    return {
        type: 'listItem',
        content: [paragraphNode(text)]
    };
}

function getCommandMatches(query) {
    const normalized = String(query || '').trim().toLowerCase();
    if (!normalized) return BLOCK_TYPES;
    return BLOCK_TYPES.filter((type) => {
        return type.label.toLowerCase().includes(normalized) || type.value.includes(normalized);
    });
}

function plainTextFromNode(node) {
    if (!node) return '';
    if (Array.isArray(node)) return node.map(plainTextFromNode).join('');
    if (node.type === 'text') return node.text || '';
    if (!Array.isArray(node.content)) return '';
    return node.content
        .filter((child) => !NESTED_LIST_NODE_TYPES.has(child.type))
        .map(plainTextFromNode)
        .join('');
}

function blocksToDoc(blocks) {
    const source = Array.isArray(blocks) && blocks.length
        ? blocks
        : [{ id: createId(), type: 'paragraph', text: '', depth: 0 }];
    const content = [];
    const listStack = [];

    function closeToDepth(targetDepth) {
        while (listStack.length > targetDepth) {
            listStack.pop();
        }
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

    for (const block of source) {
        const type = LIST_TYPES.has(block.type) ? block.type : block.type === 'callout' ? 'callout' : block.type === 'quote' ? 'quote' : block.type === 'heading' ? 'heading' : 'paragraph';
        const depth = Math.max(0, Number(block.depth || 0));

        if (!LIST_TYPES.has(type)) {
            closeToDepth(0);
            if (type === 'heading') {
                content.push(headingNode(block.text || ''));
            } else if (type === 'quote') {
                content.push(blockquoteNode(block.text || '', false));
            } else if (type === 'callout') {
                content.push(blockquoteNode(block.text || '', true));
            } else {
                content.push(paragraphNode(block.text || ''));
            }
            continue;
        }

        closeToDepth(depth + 1);

        while (listStack.length < depth + 1) {
            const newList = listContainerNode(type);
            appendNodeAtDepth(newList, listStack.length);
            listStack.push({ type, list: newList, lastItem: null });
        }

        let currentLevel = listStack[depth];
        if (!currentLevel || currentLevel.type !== type) {
            listStack.length = depth;
            const newList = listContainerNode(type);
            appendNodeAtDepth(newList, depth);
            currentLevel = { type, list: newList, lastItem: null };
            listStack[depth] = currentLevel;
        }

        const item = listItemNode(type, block.text || '', block.checked);
        currentLevel.list.content.push(item);
        currentLevel.lastItem = item;
    }

    return {
        type: 'doc',
        content: content.length ? content : [paragraphNode('')]
    };
}

function listItemToBlocks(node, type, depth, output) {
    if (!node) return;
    output.push({
        id: createId(),
        type,
        text: plainTextFromNode(node),
        checked: type === 'checklist' ? node.attrs?.checked === true : false,
        depth
    });

    for (const child of node.content || []) {
        if (!NESTED_LIST_NODE_TYPES.has(child.type)) continue;
        docNodeToBlocks(child, depth + 1, output);
    }
}

function docNodeToBlocks(node, depth, output) {
    if (!node) return;

    if (node.type === 'heading') {
        output.push({ id: createId(), type: 'heading', text: plainTextFromNode(node), checked: false, depth });
        return;
    }

    if (node.type === 'paragraph') {
        output.push({ id: createId(), type: 'paragraph', text: plainTextFromNode(node), checked: false, depth });
        return;
    }

    if (node.type === 'blockquote') {
        output.push({
            id: createId(),
            type: node.attrs?.callout ? 'callout' : 'quote',
            text: plainTextFromNode(node),
            checked: false,
            depth
        });
        return;
    }

    if (node.type === 'bulletList') {
        (node.content || []).forEach((item) => listItemToBlocks(item, 'bullet', depth, output));
        return;
    }

    if (node.type === 'taskList') {
        (node.content || []).forEach((item) => listItemToBlocks(item, 'checklist', depth, output));
        return;
    }

    (node.content || []).forEach((child) => docNodeToBlocks(child, depth, output));
}

function docToBlocks(doc) {
    const output = [];
    (doc?.content || []).forEach((node) => docNodeToBlocks(node, 0, output));
    if (!output.length) {
        return [{ id: createId(), type: 'paragraph', text: '', checked: false, depth: 0 }];
    }
    return output;
}

function createSlashMenu(container) {
    const menu = document.createElement('div');
    menu.className = 'tiptap-slash-menu is-hidden';
    menu.innerHTML = '<div class="tiptap-slash-menu-items"></div>';
    container.appendChild(menu);
    return menu;
}

function createBlockToolbar(container) {
    const toolbar = document.createElement('div');
    toolbar.className = 'tiptap-block-toolbar is-hidden';
    toolbar.innerHTML = `
        <button class="tiptap-block-tool" type="button" data-block-action="insert" aria-label="Insert block" title="Insert block">
            ${icon('plus')}
        </button>
    `;
    container.appendChild(toolbar);
    return toolbar;
}

function commandIcon(value) {
    if (value === 'heading') return 'square-pen';
    if (value === 'bullet') return 'circle';
    if (value === 'checklist') return 'check';
    if (value === 'quote') return 'message-square';
    if (value === 'callout') return 'message-square';
    return 'file-text';
}

export function mountDocumentEditor(options) {
    const { container, onChange } = options;
    let currentBlocks = [{ id: createId(), type: 'paragraph', text: '', checked: false, depth: 0 }];
    let suppressUpdates = false;
    let slashRange = null;
    let activeCommandIndex = 0;

    container.innerHTML = `
        <div class="document-editor-host">
            <div class="document-editor-prose"></div>
        </div>
    `;

    const proseMount = container.querySelector('.document-editor-prose');
    const slashMenu = createSlashMenu(container);
    const slashMenuItems = slashMenu.querySelector('.tiptap-slash-menu-items');
    const blockToolbar = createBlockToolbar(container);
    let hoveredBlock = null;
    let hoveredBlockPos = null;

    const ExtendedBlockquote = Blockquote.extend({
        addAttributes() {
            return {
                callout: {
                    default: false,
                    parseHTML: (element) => element.getAttribute('data-callout') === 'true',
                    renderHTML: (attributes) => (attributes.callout ? { 'data-callout': 'true' } : {})
                }
            };
        }
    });

    const editor = new Editor({
        element: proseMount,
        extensions: [
            StarterKit.configure({
                blockquote: false,
                heading: { levels: [2] },
                codeBlock: false,
                horizontalRule: false
            }),
            ExtendedBlockquote,
            TaskList,
            TaskItem.configure({ nested: true }),
            Placeholder.configure({
                placeholder: ({ node }) => {
                    if (node.type.name === 'heading') return 'Heading';
                    if (node.type.name === 'blockquote' && node.attrs?.callout) return 'Callout';
                    if (node.type.name === 'blockquote') return 'Quote';
                    return "Type '/' for commands";
                }
            })
        ],
        content: blocksToDoc(currentBlocks),
        editorProps: {
            attributes: {
                class: 'ProseMirror journaling-prose'
            }
        },
        onUpdate: ({ editor: instance }) => {
            if (suppressUpdates) return;
            currentBlocks = docToBlocks(instance.getJSON());
            updateSlashMenu();
            if (typeof onChange === 'function') {
                onChange(getValue());
            }
        },
        onSelectionUpdate: () => {
            updateSlashMenu();
        },
        onFocus: () => {
            updateSlashMenu();
        },
        onBlur: () => {
            window.setTimeout(() => {
                if (!slashMenu.matches(':hover')) hideSlashMenu();
            }, 120);
        }
    });

    function getValue() {
        return currentBlocks.map((block) => ({
            id: block.id || createId(),
            type: block.type || 'paragraph',
            text: String(block.text || ''),
            checked: !!block.checked,
            depth: Math.max(0, Number(block.depth || 0))
        }));
    }

    function setValue(blocks) {
        currentBlocks = Array.isArray(blocks) && blocks.length
            ? blocks.map((block) => ({
                id: block.id || createId(),
                type: block.type || 'paragraph',
                text: String(block.text || ''),
                checked: !!block.checked,
                depth: Math.max(0, Number(block.depth || 0))
            }))
            : [{ id: createId(), type: 'paragraph', text: '', checked: false, depth: 0 }];
        suppressUpdates = true;
        editor.commands.setContent(blocksToDoc(currentBlocks), false);
        suppressUpdates = false;
        hideSlashMenu();
    }

    function hideSlashMenu() {
        slashRange = null;
        activeCommandIndex = 0;
        slashMenu.classList.add('is-hidden');
        slashMenu.style.left = '';
        slashMenu.style.top = '';
        slashMenuItems.innerHTML = '';
    }

    function detectSlashQuery() {
        const { state } = editor;
        const { from, to, empty, $from } = state.selection;
        if (!empty || !$from.parent.isTextblock) return null;
        const blockStart = $from.start();
        const textBeforeCursor = state.doc.textBetween(blockStart, from, '\n', '\0');
        if (!textBeforeCursor.startsWith('/')) return null;
        if (/\s/.test(textBeforeCursor.slice(1))) return null;
        const coords = editor.view.coordsAtPos(from);
        return {
            query: textBeforeCursor.slice(1).toLowerCase(),
            range: { from: blockStart, to },
            coords
        };
    }

    function renderSlashMenu(matches, coords) {
        slashMenuItems.innerHTML = matches.map((item, index) => `
            <button class="tiptap-slash-item ${index === activeCommandIndex ? 'is-active' : ''}" type="button" data-command-type="${esc(item.value)}">
                <span class="tiptap-slash-item-copy">
                    <strong>${esc(item.label)}</strong>
                    <span>${esc(item.value === 'paragraph' ? 'Convert to text' : `Convert to ${item.label.toLowerCase()}`)}</span>
                </span>
                ${icon(commandIcon(item.value))}
            </button>
        `).join('');
        slashMenu.classList.remove('is-hidden');
        slashMenu.style.left = `${coords.left - container.getBoundingClientRect().left}px`;
        slashMenu.style.top = `${coords.bottom - container.getBoundingClientRect().top + 10}px`;
    }

    function updateSlashMenu() {
        const slashState = detectSlashQuery();
        if (!slashState) {
            hideSlashMenu();
            return;
        }
        const matches = getCommandMatches(slashState.query).slice(0, 6);
        if (!matches.length) {
            hideSlashMenu();
            return;
        }
        slashRange = slashState.range;
        activeCommandIndex = Math.max(0, Math.min(activeCommandIndex, matches.length - 1));
        renderSlashMenu(matches, slashState.coords);
    }

    function hideBlockToolbar() {
        hoveredBlock = null;
        hoveredBlockPos = null;
        blockToolbar.classList.add('is-hidden');
        blockToolbar.style.left = '';
        blockToolbar.style.top = '';
    }

    function findTopLevelBlock(target) {
        let node = target instanceof HTMLElement ? target : target?.parentElement || null;
        while (node && node !== proseMount) {
            if (node.parentElement === proseMount) return node;
            node = node.parentElement;
        }
        return null;
    }

    function showBlockToolbar(node) {
        if (!node) {
            hideBlockToolbar();
            return;
        }
        let pos = null;
        try {
            pos = editor.view.posAtDOM(node, 0);
        } catch {
            hideBlockToolbar();
            return;
        }
        const nodeRect = node.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        hoveredBlock = node;
        hoveredBlockPos = pos;
        blockToolbar.classList.remove('is-hidden');
        blockToolbar.style.left = `${Math.max(0, nodeRect.left - containerRect.left - 32)}px`;
        blockToolbar.style.top = `${Math.max(0, nodeRect.top - containerRect.top + 1)}px`;
    }

    function applyCommand(type) {
        if (!slashRange) return;
        const nextType = BLOCK_TYPES.some((item) => item.value === type) ? type : 'paragraph';
        const chain = editor.chain().focus().deleteRange(slashRange);

        if (nextType === 'heading') {
            chain.setHeading({ level: 2 }).run();
        } else if (nextType === 'bullet') {
            chain.toggleBulletList().run();
        } else if (nextType === 'checklist') {
            chain.toggleTaskList().run();
        } else if (nextType === 'quote') {
            chain.toggleBlockquote().updateAttributes('blockquote', { callout: false }).run();
        } else if (nextType === 'callout') {
            chain.toggleBlockquote().updateAttributes('blockquote', { callout: true }).run();
        } else {
            chain.setParagraph().run();
        }

        hideSlashMenu();
    }

    proseMount.addEventListener('keydown', (event) => {
        if (!slashRange) return;
        const matches = getCommandMatches(detectSlashQuery()?.query || '').slice(0, 6);
        if (!matches.length) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            activeCommandIndex = (activeCommandIndex + 1) % matches.length;
            updateSlashMenu();
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            activeCommandIndex = (activeCommandIndex - 1 + matches.length) % matches.length;
            updateSlashMenu();
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            applyCommand(matches[activeCommandIndex]?.value || 'paragraph');
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            hideSlashMenu();
        }
    });

    slashMenu.addEventListener('mousedown', (event) => {
        event.preventDefault();
        const button = event.target.closest('[data-command-type]');
        if (!button) return;
        applyCommand(button.getAttribute('data-command-type'));
    });

    proseMount.addEventListener('mousemove', (event) => {
        const block = findTopLevelBlock(event.target);
        if (!block || block === hoveredBlock) return;
        showBlockToolbar(block);
    });

    proseMount.addEventListener('mouseleave', () => {
        window.setTimeout(() => {
            if (!blockToolbar.matches(':hover')) hideBlockToolbar();
        }, 80);
    });

    blockToolbar.addEventListener('mouseleave', () => {
        window.setTimeout(() => {
            if (!proseMount.matches(':hover')) hideBlockToolbar();
        }, 80);
    });

    blockToolbar.addEventListener('mousedown', (event) => {
        event.preventDefault();
        const button = event.target.closest('[data-block-action]');
        if (!button || button.getAttribute('data-block-action') !== 'insert' || hoveredBlockPos === null) return;
        const node = editor.state.doc.nodeAt(hoveredBlockPos);
        const insertPos = hoveredBlockPos + (node?.nodeSize || 1);
        editor.chain().focus().insertContentAt(insertPos, { type: 'paragraph' }).setTextSelection(insertPos + 1).run();
        hideBlockToolbar();
    });

    currentBlocks = docToBlocks(editor.getJSON());

    return {
        setValue,
        getValue,
        destroy() {
            editor.destroy();
        }
    };
}
