import assert from 'node:assert/strict';
import { restoreJournalFromDrive } from '../js/drive-sync.js';

const calls = [];
let declareMissingDocument = false;
const json = (body) => Response.json(body);
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
    const current = String(url);
    calls.push({ url: current, method: options.method || 'GET' });
    if (current.includes('/drive/v3/files?') && !current.includes('alt=media')) {
        return json({
            files: [
                {
                    id: 'manifest-file',
                    name: 'journaling-library.json',
                    mimeType: 'application/json',
                    modifiedTime: '2026-07-12T12:00:00.000Z',
                    webViewLink: 'https://drive.google.com/manifest-file'
                },
                {
                    id: 'json-old',
                    name: '2026-07-12 Restored page.json',
                    mimeType: 'application/json',
                    modifiedTime: '2026-07-12T10:00:00.000Z',
                    webViewLink: 'https://drive.google.com/json-old'
                },
                {
                    id: 'json-new',
                    name: '2026-07-12 Restored page.json',
                    mimeType: 'application/json',
                    modifiedTime: '2026-07-12T12:00:00.000Z',
                    webViewLink: 'https://drive.google.com/json-new'
                },
                {
                    id: 'markdown-new',
                    name: '2026-07-12 Restored page.md',
                    mimeType: 'text/markdown',
                    modifiedTime: '2026-07-12T12:00:00.000Z',
                    webViewLink: 'https://drive.google.com/markdown-new'
                },
                {
                    id: 'json-stale',
                    name: '2025-01-01 Deleted page.json',
                    mimeType: 'application/json',
                    modifiedTime: '2025-01-01T12:00:00.000Z',
                    webViewLink: 'https://drive.google.com/json-stale'
                }
            ]
        });
    }
    if (current.includes('/files/manifest-file?alt=media')) {
        return json({
            object: 'journaling-library',
            version: 1,
            documentIds: declareMissingDocument ? ['doc-1', 'doc-missing'] : ['doc-1'],
            healthLogs: [{ id: 'health-1', kind: 'symptom', title: 'Headache' }],
            views: [{ id: 'view-1', type: 'list', name: 'Restored view', query: {} }],
            workspace: { settings: { activeJournalId: 'journal-restored' } }
        });
    }
    if (current.includes('/files/json-old?alt=media')) {
        return json({ document: { id: 'doc-1', title: 'Old title', blocks: [] }, assets: [] });
    }
    if (current.includes('/files/json-new?alt=media')) {
        return json({
            document: {
                id: 'doc-1',
                title: 'Restored page',
                blocks: [{ id: 'block-1', type: 'image', assetId: 'asset-1', captionRichText: [] }]
            },
            assets: [{
                id: 'asset-1',
                documentId: 'doc-1',
                name: 'restored.webp',
                mimeType: 'image/webp',
                metadata: { driveFileId: 'asset-file-1' }
            }]
        });
    }
    if (current.includes('/files/json-stale?alt=media')) {
        return json({ document: { id: 'doc-deleted', title: 'Deleted page', blocks: [] }, assets: [] });
    }
    if (current.includes('/files/asset-file-1?alt=media')) {
        return new Response(new Blob(['restored-image'], { type: 'image/webp' }));
    }
    throw new Error(`Unexpected Drive request: ${current}`);
};

try {
    const result = await restoreJournalFromDrive({ accessToken: 'token', rootFolderId: 'root-folder' });
    assert.equal(result.rootFolderId, 'root-folder');
    assert.equal(result.manifestId, 'manifest-file');
    assert.equal(result.library.healthLogs[0].title, 'Headache');
    assert.equal(result.library.views[0].name, 'Restored view');
    assert.equal(result.documents.length, 1);
    assert.equal(result.documents.some((document) => document.id === 'doc-deleted'), false);
    assert.equal(result.documents[0].title, 'Restored page');
    assert.equal(result.documents[0].metadata.driveFiles.jsonId, 'json-new');
    assert.equal(result.documents[0].metadata.driveFiles.markdownId, 'markdown-new');
    assert.equal(result.assets.length, 1);
    assert.equal(result.assets[0].metadata.driveFileId, 'asset-file-1');
    assert.equal(result.assets[0].metadata.blob instanceof Blob, true);
    assert.equal(await result.assets[0].metadata.blob.text(), 'restored-image');
    assert.equal(calls.some((call) => call.url.includes('/files/json-old?alt=media')), true);
    declareMissingDocument = true;
    await assert.rejects(
        () => restoreJournalFromDrive({ accessToken: 'token', rootFolderId: 'root-folder' }),
        /doc-missing/
    );
    console.log(JSON.stringify({ ok: true }, null, 2));
} finally {
    globalThis.fetch = originalFetch;
}
