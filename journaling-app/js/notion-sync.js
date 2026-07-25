// Uses the Notion Enhanced Markdown API:
// POST /v1/pages          { ..., markdown: "..." }   — create with content
// PATCH /v1/pages/:id/markdown { markdown: "..." }   — replace content
// Spec: https://developers.notion.com/guides/data-apis/enhanced-markdown

const NOTION_VERSION = '2026-03-11';
const NOTION_DIRECT_UPLOAD_LIMIT = 20 * 1024 * 1024;
const NOTION_MULTIPART_CHUNK_SIZE = 10 * 1024 * 1024;

const text = (value = '') => String(value || '').trim();
const list = (value) => Array.isArray(value) ? value : [];

// --- Enhanced Markdown serializer for Notion ---

const NOTION_TEXT_COLORS = {
    gray: '#787774', brown: '#9F6B53', orange: '#D9730D', yellow: '#CB912F',
    green: '#448361', blue: '#337EA9', purple: '#9065B0', pink: '#C14C8A', red: '#D44C47',
};
const NOTION_BG_COLORS = {
    gray: '#F1F1EF', brown: '#F4EEEE', orange: '#FBECDD', yellow: '#FBEDD6',
    green: '#EDF3EC', blue: '#E7F3F8', purple: '#F7F3F8', pink: '#FBF2F5', red: '#FDEBEC',
};

function resolveAssetUrl(block = {}, context = {}) {
    if (/^https:\/\//i.test(text(block.src)) && (context.allowDriveUrls || !/drive\.google\.com/i.test(text(block.src)))) return text(block.src);
    const asset = list(context.assets).find((item) => item?.id === block.assetId) || null;
    const candidate = text(asset?.remoteUrl || asset?.previewUrl);
    if (/^https:\/\//i.test(candidate) && (context.allowDriveUrls || !/drive\.google\.com/i.test(candidate))) return candidate;
    return '';
}

function attachmentLabel(block = {}, context = {}) {
    const asset = list(context.assets).find((item) => item?.id === block.assetId) || null;
    return text(asset?.name || block.name || block.alt || 'Attachment');
}

function hasNotionUpload(block = {}, context = {}) {
    return Boolean(block.assetId && context.notionFileUploads?.[block.assetId]);
}

function inlineToMd(richText = []) {
    return list(richText).map((node) => {
        if (!node || node.type !== 'text') return '';
        let t = node.text || '';
        const marks = node.marks || [];

        if (marks.some((m) => m.type === 'code')) return `\`${t}\``;
        if (marks.some((m) => m.type === 'bold'))      t = `**${t}**`;
        if (marks.some((m) => m.type === 'italic'))    t = `*${t}*`;
        if (marks.some((m) => m.type === 'strike'))    t = `~~${t}~~`;
        if (marks.some((m) => m.type === 'underline')) t = `<span underline="true">${t}</span>`;

        const bgMark  = marks.find((m) => m.type === 'bgColor');
        const txtMark = marks.find((m) => m.type === 'textColor');
        if (bgMark?.attrs?.color)       t = `<span color="${bgMark.attrs.color}_bg">${t}</span>`;
        else if (txtMark?.attrs?.color) t = `<span color="${txtMark.attrs.color}">${t}</span>`;

        const link = marks.find((m) => m.type === 'link');
        if (link?.attrs?.href) t = `[${t}](${link.attrs.href})`;

        return t;
    }).join('');
}

function serializeBlocks(blocks, context, indent = '') {
    const parts = [];
    list(blocks).forEach((block) => {
        const colorAttr = block.color ? ` {color="${block.color}"}` : '';

        switch (block.type) {
            case 'paragraph': {
                const t = inlineToMd(block.richText);
                parts.push(`${indent}${t || '<empty-block/>'}${colorAttr}`);
                break;
            }
            case 'heading': {
                const lvl = Math.min(4, Math.max(1, Number(block.level || 2)));
                parts.push(`${indent}${'#'.repeat(lvl)} ${inlineToMd(block.richText)}${colorAttr}`);
                break;
            }
            case 'bullet':
                parts.push(`${indent}${'  '.repeat(block.depth || 0)}- ${inlineToMd(block.richText)}${colorAttr}`);
                break;
            case 'numbered':
                parts.push(`${indent}${'  '.repeat(block.depth || 0)}1. ${inlineToMd(block.richText)}${colorAttr}`);
                break;
            case 'checklist':
                parts.push(`${indent}- [${block.checked ? 'x' : ' '}] ${inlineToMd(block.richText)}${colorAttr}`);
                break;
            case 'quote':
                parts.push(`${indent}> ${inlineToMd(block.richText)}${colorAttr}`);
                break;
            case 'callout': {
                const icon = block.icon || '💡';
                const col  = block.color ? ` color="${block.color}"` : '';
                parts.push(`${indent}<callout icon="${icon}"${col}>`);
                parts.push(`${indent}\t${inlineToMd(block.richText)}`);
                parts.push(`${indent}</callout>`);
                break;
            }
            case 'toggle': {
                const col = block.color ? ` color="${block.color}"` : '';
                parts.push(`${indent}<details${col}>`);
                parts.push(`${indent}<summary>${inlineToMd(block.richText)}</summary>`);
                parts.push(...serializeBlocks(list(block.children), context, `${indent}\t`));
                parts.push(`${indent}</details>`);
                break;
            }
            case 'code':
                parts.push(`${indent}\`\`\`${block.language || ''}`);
                (block.text || '').split('\n').forEach((l) => parts.push(`${indent}${l}`));
                parts.push(`${indent}\`\`\``);
                break;
            case 'divider':
                parts.push(`${indent}---`);
                break;
            case 'image': {
                if (hasNotionUpload(block, context)) break;
                const src     = resolveAssetUrl(block, context);
                const caption = inlineToMd(block.captionRichText) || block.alt || '';
                parts.push(src ? `${indent}![${caption}](${src})${colorAttr}` : `${indent}Attachment: ${attachmentLabel(block, context)}`);
                break;
            }
            case 'video': {
                if (hasNotionUpload(block, context)) break;
                const src     = resolveAssetUrl(block, context);
                const caption = inlineToMd(block.captionRichText) || '';
                parts.push(src ? `${indent}<video src="${src}"${colorAttr}>${caption}</video>` : `${indent}Attachment: ${attachmentLabel(block, context)}`);
                break;
            }
            case 'audio': {
                if (hasNotionUpload(block, context)) break;
                const src     = resolveAssetUrl(block, context);
                const caption = inlineToMd(block.captionRichText) || '';
                parts.push(src ? `${indent}<audio src="${src}"${colorAttr}>${caption}</audio>` : `${indent}Attachment: ${attachmentLabel(block, context)}`);
                break;
            }
            case 'file': {
                if (hasNotionUpload(block, context)) break;
                const src = resolveAssetUrl(block, context);
                parts.push(src ? `${indent}<file src="${src}"${colorAttr}>${block.name || ''}</file>` : `${indent}Attachment: ${attachmentLabel(block, context)}`);
                break;
            }
            case 'table': {
                const rows = list(block.rows);
                if (!rows.length) break;
                parts.push(`${indent}<table header-row="true">`);
                rows.forEach((row) => {
                    parts.push(`${indent}\t<tr>`);
                    list(row).forEach((cell) => parts.push(`${indent}\t\t<td>${inlineToMd(cell)}</td>`));
                    parts.push(`${indent}\t</tr>`);
                });
                parts.push(`${indent}</table>`);
                break;
            }
            default: {
                const t = list(block.richText).map((n) => n.text || '').join('') || block.text || '';
                if (t) parts.push(`${indent}${t}`);
            }
        }
        parts.push('');
    });
    return parts;
}

function pageTitle(doc = {}) {
    return text(doc.smartTitle || doc.title) || `Journal entry ${doc.date || ''}`.trim() || 'Journal entry';
}

export function buildDocumentMarkdown(doc = {}, context = {}) {
    const parts = [];

    // Title
    parts.push(`# ${pageTitle(doc)}`);
    parts.push('');

    // Metadata callout
    const metaLines = [
        context.journalName ? `Journal: ${context.journalName}` : '',
        doc.date ? `Date: ${doc.date}` : '',
        doc.locationName ? `Location: ${doc.locationName}` : '',
        doc.weather ? `Weather: ${doc.weather}` : '',
        doc.activity ? `Activity: ${doc.activity}` : '',
        Number.isFinite(Number(doc.mood)) ? `Mood: ${doc.mood}/10` : '',
        Number.isFinite(Number(doc.energy)) ? `Energy: ${doc.energy}/10` : '',
        list(doc.tags).length ? `Tags: ${list(doc.tags).join(', ')}` : '',
        list(doc.people).length ? `People: ${list(doc.people).join(', ')}` : '',
        doc.highlighted ? 'Highlighted: yes' : '',
        doc.favorite ? 'Favorite: yes' : '',
        `ID: ${doc.id}`,
    ].filter(Boolean);

    if (metaLines.length) {
        parts.push('<callout icon="📋">');
        metaLines.forEach((l) => parts.push(`\t${l}`));
        parts.push('</callout>');
        parts.push('');
    }

    // Summary
    if (doc.summary) {
        parts.push(`> ${doc.summary}`);
        parts.push('');
    }

    // Blocks
    parts.push(...serializeBlocks(list(doc.blocks), context));

    // Transcripts
    const transcripts = list(doc.transcripts);
    if (transcripts.length) {
        parts.push('## Transcripts');
        parts.push('');
        transcripts.forEach((t) => {
            if (t.text) parts.push(t.text);
            parts.push('');
        });
    }

    return parts.join('\n').trim();
}

export function createNotionClient(settings = {}) {
    const workerUrl = text(settings.workerUrl).replace(/\/$/, '');
    const authToken = text(settings.authToken);
    const proxyToken = text(settings.proxyToken);

    async function request(method, endpoint, body = null) {
        if (!workerUrl || !authToken) throw new Error('Missing Notion worker URL or token');
        const target = `https://api.notion.com/v1${endpoint}`;
        const url = new URL(workerUrl);
        url.searchParams.set('url', target);
        const headers = {
            Authorization: `Bearer ${authToken}`,
            'Notion-Version': NOTION_VERSION,
        };
        if (proxyToken) headers['X-Proxy-Token'] = proxyToken;
        let payload = null;
        if (body instanceof FormData) {
            payload = body;
        } else if (body !== null) {
            headers['Content-Type'] = 'application/json';
            payload = JSON.stringify(body);
        }
        const response = await fetch(url.toString(), { method, headers, body: payload });
        if (!response.ok) {
            let message = await response.text();
            try {
                const parsed = JSON.parse(message);
                message = parsed.message || message;
            } catch {}
            throw new Error(message || `Notion request failed with ${response.status}`);
        }
        return response.status === 204 ? null : response.json();
    }

    return { request };
}

function collectMediaBlocks(blocks = [], result = []) {
    list(blocks).forEach((block) => {
        if (['image', 'video', 'audio', 'file'].includes(block?.type) && block.assetId) result.push(block);
        if (block?.children) collectMediaBlocks(block.children, result);
    });
    return result;
}

function notionMediaType(block = {}, asset = {}) {
    if (block.type !== 'file') return block.type;
    return asset.mimeType === 'application/pdf' ? 'pdf' : 'file';
}

function notionCaption(block = {}) {
    const content = inlineToMd(block.captionRichText) || text(block.alt);
    return content ? [{ type: 'text', text: { content } }] : [];
}

async function uploadAsset(client, asset = {}) {
    const existingId = text(asset.metadata?.notionFileUploadId);
    if (existingId) return existingId;
    const blob = asset.metadata?.blob;
    if (!(blob instanceof Blob)) throw new Error(`Attachment ${asset.name || asset.id || ''} has no local file data`);
    const filename = text(asset.name || asset.originalName || asset.id) || 'attachment';
    const contentType = text(asset.mimeType || blob.type) || 'application/octet-stream';
    const isMultipart = blob.size > NOTION_DIRECT_UPLOAD_LIMIT;
    const numberOfParts = isMultipart ? Math.ceil(blob.size / NOTION_MULTIPART_CHUNK_SIZE) : 1;
    const created = await client.request('POST', '/file_uploads', {
        mode: isMultipart ? 'multi_part' : 'single_part',
        filename,
        content_type: contentType,
        ...(isMultipart ? { number_of_parts: numberOfParts } : {})
    });
    const uploadId = text(created?.id);
    if (!uploadId) throw new Error('Notion did not return a file upload id');

    if (isMultipart) {
        for (let index = 0; index < numberOfParts; index += 1) {
            const start = index * NOTION_MULTIPART_CHUNK_SIZE;
            const part = blob.slice(start, Math.min(start + NOTION_MULTIPART_CHUNK_SIZE, blob.size), contentType);
            const form = new FormData();
            form.append('file', part, filename);
            form.append('part_number', String(index + 1));
            await client.request('POST', `/file_uploads/${uploadId}/send`, form);
        }
        await client.request('POST', `/file_uploads/${uploadId}/complete`, {});
    } else {
        const form = new FormData();
        form.append('file', blob, filename);
        await client.request('POST', `/file_uploads/${uploadId}/send`, form);
    }
    return uploadId;
}

function buildNotionMediaBlocks(mediaBlocks = [], assetsById = new Map(), uploads = {}) {
    return mediaBlocks.map((block) => {
        const asset = assetsById.get(block.assetId) || {};
        const type = notionMediaType(block, asset);
        const file = {
            type: 'file_upload',
            file_upload: { id: uploads[block.assetId] }
        };
        if (type === 'file') file.name = text(asset.name || block.name) || 'Attachment';
        const value = { ...file };
        const caption = notionCaption(block);
        if (caption.length) value.caption = caption;
        return { object: 'block', type, [type]: value };
    });
}

export async function verifyNotionConnection(settings = {}) {
    const client = createNotionClient(settings);
    return client.request('GET', '/users/me');
}

export async function syncDocumentToNotion(settings = {}, doc = {}, context = {}) {
    const parentPageId = text(settings.parentPageId);
    if (!parentPageId) throw new Error('Missing Notion parent page id');
    const client = createNotionClient(settings);
    const title    = pageTitle(doc);
    const mediaBlocks = collectMediaBlocks(doc.blocks);
    const assetsById = new Map(list(context.assets).map((asset) => [asset.id, asset]));
    const notionFileUploads = {};
    const uploadedAssets = [];
    for (const block of mediaBlocks) {
        if (notionFileUploads[block.assetId]) continue;
        const asset = assetsById.get(block.assetId);
        if (!asset) throw new Error(`Missing local attachment ${block.assetId}`);
        const fileUploadId = await uploadAsset(client, asset);
        notionFileUploads[block.assetId] = fileUploadId;
        uploadedAssets.push({ assetId: block.assetId, fileUploadId });
    }
    const markdown = buildDocumentMarkdown(doc, { ...context, notionFileUploads });
    const existingPageId = text(doc.metadata?.notionPageId);
    let page;

    if (existingPageId) {
        // Update title property
        await client.request('PATCH', `/pages/${existingPageId}`, {
            properties: { title: { title: [{ text: { content: title } }] } },
        });
        // Replace page content via the Enhanced Markdown endpoint
        await client.request('PATCH', `/pages/${existingPageId}/markdown`, {
            type: 'replace_content',
            replace_content: { new_str: markdown }
        });
        page = await client.request('GET', `/pages/${existingPageId}`);
    } else {
        // Create new page with markdown content
        page = await client.request('POST', '/pages', {
            parent: { page_id: parentPageId },
            properties: { title: { title: [{ text: { content: title } }] } },
            markdown,
        });
    }

    const pageId = existingPageId || page.id;
    const nativeMediaBlocks = buildNotionMediaBlocks(mediaBlocks, assetsById, notionFileUploads);
    if (nativeMediaBlocks.length) {
        await client.request('PATCH', `/blocks/${pageId}/children`, { children: nativeMediaBlocks });
    }
    return { pageId, url: page.url || '', assets: uploadedAssets };
}
