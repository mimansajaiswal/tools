import assert from 'node:assert/strict';
import { syncDocumentToNotion } from '../js/notion-sync.js';

const calls = [];
let nextUploadId = 'upload-1';
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
    const target = new URL(url).searchParams.get('url');
    const endpoint = new URL(target).pathname.replace('/v1', '');
    let body = options.body;
    if (typeof body === 'string') body = JSON.parse(body);
    calls.push({ method: options.method, endpoint, body, isFormData: body instanceof FormData });
    if (endpoint === '/file_uploads') return Response.json({ id: nextUploadId, status: 'pending' });
    if (/^\/file_uploads\/upload-[12]\/send$/.test(endpoint)) return Response.json({ id: endpoint.split('/')[2], status: 'pending' });
    if (/^\/file_uploads\/upload-[12]\/complete$/.test(endpoint)) return Response.json({ id: endpoint.split('/')[2], status: 'uploaded' });
    if (endpoint === '/pages') return Response.json({ id: 'page-1', url: 'https://notion.so/page-1' });
    if (endpoint === '/pages/page-1' && options.method === 'PATCH') return Response.json({ id: 'page-1' });
    if (endpoint === '/pages/page-1/markdown') return Response.json({ object: 'page_markdown' });
    if (endpoint === '/pages/page-1' && options.method === 'GET') return Response.json({ id: 'page-1', url: 'https://notion.so/page-1' });
    if (endpoint === '/blocks/page-1/children') return Response.json({ results: [] });
    throw new Error(`Unexpected request ${options.method} ${endpoint}`);
};

try {
    const blob = new Blob(['image'], { type: 'image/png' });
    const result = await syncDocumentToNotion({
        workerUrl: 'https://worker.example/proxy',
        authToken: 'test-token',
        parentPageId: 'parent-1'
    }, {
        id: 'doc-1',
        title: 'Native media',
        date: '2026-07-12',
        tags: [],
        people: [],
        blocks: [{ id: 'block-1', type: 'image', assetId: 'asset-1', alt: 'A small image', captionRichText: [] }]
    }, {
        assets: [{ id: 'asset-1', name: 'small.png', mimeType: 'image/png', metadata: { blob } }]
    });

    assert.deepEqual(result.assets, [{ assetId: 'asset-1', fileUploadId: 'upload-1' }]);
    const createUpload = calls.find((call) => call.endpoint === '/file_uploads');
    assert.equal(createUpload.body.mode, 'single_part');
    assert.equal(createUpload.body.filename, 'small.png');
    const sendUpload = calls.find((call) => call.endpoint.endsWith('/send'));
    assert.equal(sendUpload.isFormData, true);
    const createPage = calls.find((call) => call.endpoint === '/pages');
    assert.doesNotMatch(createPage.body.markdown, /Attachment:/);
    const append = calls.find((call) => call.endpoint === '/blocks/page-1/children');
    assert.deepEqual(append.body.children[0], {
        object: 'block',
        type: 'image',
        image: {
            type: 'file_upload',
            file_upload: { id: 'upload-1' },
            caption: [{ type: 'text', text: { content: 'A small image' } }]
        }
    });

    calls.length = 0;
    await syncDocumentToNotion({
        workerUrl: 'https://worker.example/proxy',
        authToken: 'test-token',
        parentPageId: 'parent-1'
    }, {
        id: 'doc-1',
        title: 'Native media',
        date: '2026-07-12',
        tags: [],
        people: [],
        metadata: { notionPageId: 'page-1' },
        blocks: []
    }, { assets: [] });
    const replace = calls.find((call) => call.endpoint === '/pages/page-1/markdown');
    assert.deepEqual(replace.body, {
        type: 'replace_content',
        replace_content: { new_str: replace.body.replace_content.new_str }
    });

    calls.length = 0;
    nextUploadId = 'upload-2';
    const largeBlob = new Blob([new Uint8Array(21 * 1024 * 1024)], { type: 'video/mp4' });
    const multipartResult = await syncDocumentToNotion({
        workerUrl: 'https://worker.example/proxy',
        authToken: 'test-token',
        parentPageId: 'parent-1'
    }, {
        id: 'doc-2',
        title: 'Large media',
        date: '2026-07-12',
        tags: [],
        people: [],
        blocks: [{ id: 'block-2', type: 'video', assetId: 'asset-2', captionRichText: [] }]
    }, {
        assets: [{ id: 'asset-2', name: 'large.mp4', mimeType: 'video/mp4', metadata: { blob: largeBlob } }]
    });
    assert.deepEqual(multipartResult.assets, [{ assetId: 'asset-2', fileUploadId: 'upload-2' }]);
    const multipartCreate = calls.find((call) => call.endpoint === '/file_uploads');
    assert.deepEqual(multipartCreate.body, {
        mode: 'multi_part',
        filename: 'large.mp4',
        content_type: 'video/mp4',
        number_of_parts: 3
    });
    const multipartSends = calls.filter((call) => call.endpoint === '/file_uploads/upload-2/send');
    assert.equal(multipartSends.length, 3);
    assert.deepEqual(multipartSends.map((call) => call.body.get('part_number')), ['1', '2', '3']);
    assert.deepEqual(multipartSends.map((call) => call.body.get('file').size), [10 * 1024 * 1024, 10 * 1024 * 1024, 1024 * 1024]);
    const completeIndex = calls.findIndex((call) => call.endpoint === '/file_uploads/upload-2/complete');
    const finalSendIndex = calls.map((call) => call.endpoint).lastIndexOf('/file_uploads/upload-2/send');
    assert(completeIndex > finalSendIndex);
    console.log(JSON.stringify({ ok: true }, null, 2));
} finally {
    globalThis.fetch = originalFetch;
}
