import assert from 'node:assert/strict';
import { syncAssetsToDrive, syncDocumentToDrive, syncLibraryManifestToDrive } from '../js/drive-sync.js';

const calls = [];
const json = (body, init = {}) => new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) }
});

globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET', body: options.body, headers: options.headers || {} });
    const current = calls.length;
    if (current === 1) return json({ files: [] });
    if (current === 2) return json({ id: 'root-folder', name: 'Journaling' });
    if (current === 3) return json({ files: [] });
    if (current === 4) return json({ id: 'assets-folder', name: 'Assets' });
    if (current === 5) return new Response('', { status: 200, headers: { Location: 'https://upload.example/session-1' } });
    if (current === 6) return json({
        id: 'asset-file',
        name: 'photo.webp',
        webViewLink: 'https://drive.google.com/file/d/asset-file/view',
        webContentLink: 'https://drive.google.com/uc?id=asset-file'
    });
    if (current === 7) return json({ id: 'markdown-file', name: 'entry.md', webViewLink: 'https://drive.google.com/markdown-file' });
    if (current === 8) return json({ id: 'json-file', name: 'entry.json', webViewLink: 'https://drive.google.com/json-file' });
    if (current === 9) return json({ id: 'manifest-file', name: 'journaling-library.json', webViewLink: 'https://drive.google.com/manifest-file' });
    throw new Error(`Unexpected fetch call ${current}: ${url}`);
};

const settings = {
    accessToken: 'drive-token',
    rootFolderName: 'Journaling'
};
const asset = {
    id: 'asset-1',
    documentId: 'doc-1',
    name: 'photo.webp',
    mimeType: 'image/webp',
    metadata: { blob: new Blob(['image-data'], { type: 'image/webp' }) }
};

const media = await syncAssetsToDrive(settings, [asset]);
assert.equal(media.rootFolderId, 'root-folder');
assert.equal(media.assetsFolderId, 'assets-folder');
assert.equal(media.assets[0].fileId, 'asset-file');
assert.equal(calls[4].method, 'POST');
assert.match(calls[4].url, /uploadType=resumable/);
assert.equal(calls[5].method, 'PUT');
assert.equal(calls[5].body.size, asset.metadata.blob.size);

const documentResult = await syncDocumentToDrive({ ...settings, rootFolderId: media.rootFolderId }, {
    id: 'doc-1',
    date: '2026-07-12',
    title: 'Media entry',
    metadata: {}
}, {
    markdown: '# Media entry',
    json: { document: { id: 'doc-1' }, assets: media.assets }
});
assert.equal(documentResult.markdownId, 'markdown-file');
assert.equal(documentResult.jsonId, 'json-file');
const manifestResult = await syncLibraryManifestToDrive({ ...settings, rootFolderId: media.rootFolderId }, {
    exportedAt: '2026-07-12T12:00:00.000Z',
    documentIds: ['doc-1'],
    healthLogs: [],
    views: [],
    workspace: { settings: { journals: [], templates: [], reminders: [], editor: {}, media: {}, health: {}, ai: {} } }
});
assert.equal(manifestResult.manifestId, 'manifest-file');
assert.equal(calls.length, 9);

console.log(JSON.stringify({ ok: true, calls: calls.map(({ url, method }) => ({ url, method })) }, null, 2));
