import assert from 'node:assert/strict';
import { buildDocumentMarkdown } from '../js/notion-sync.js';

const base = {
    id: 'doc-1',
    title: 'Media entry',
    date: '2026-07-12',
    blocks: [{ id: 'block-1', type: 'image', assetId: 'asset-1', alt: 'Rain walk', captionRichText: [] }],
    tags: [],
    people: []
};

const privateDrive = buildDocumentMarkdown(base, {
    assets: [{ id: 'asset-1', name: 'rain.webp', remoteUrl: 'https://drive.google.com/file/d/asset-file/view' }]
});
assert.match(privateDrive, /Attachment: rain\.webp/);
assert.doesNotMatch(privateDrive, /!\[Rain walk\]\(https:\/\/drive\.google\.com/);

const publicMedia = buildDocumentMarkdown(base, {
    assets: [{ id: 'asset-1', name: 'rain.webp', remoteUrl: 'https://cdn.example/rain.webp' }]
});
assert.match(publicMedia, /!\[Rain walk\]\(https:\/\/cdn\.example\/rain\.webp\)/);

const nativeUpload = buildDocumentMarkdown(base, {
    assets: [{ id: 'asset-1', name: 'rain.webp' }],
    notionFileUploads: { 'asset-1': 'upload-1' }
});
assert.doesNotMatch(nativeUpload, /Attachment: rain\.webp/);
assert.doesNotMatch(nativeUpload, /!\[/);

const localAudio = buildDocumentMarkdown({
    ...base,
    blocks: [{ id: 'block-2', type: 'audio', assetId: 'asset-audio', captionRichText: [] }]
}, { assets: [{ id: 'asset-audio', name: 'note.webm' }] });
assert.match(localAudio, /Attachment: note\.webm/);
assert.doesNotMatch(localAudio, /<audio src="asset-audio"/);

console.log(JSON.stringify({ ok: true }, null, 2));
