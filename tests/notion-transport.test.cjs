const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function client(app, settings) {
    const calls = [];
    const context = {
        URL, FormData, Blob, console,
        navigator: { onLine: true },
        setTimeout: fn => { fn(); },
        Storage: { getSettings: () => settings },
        PetTracker: { Settings: { get: () => settings } },
        fetch: async (url, options) => {
            calls.push({ url: new URL(url), ...options });
            return new Response(JSON.stringify({ results: [], has_more: false }), { status: 200 });
        }
    };
    context.window = context;
    let code;
    if (app === 'photo-chronicles') {
        const html = fs.readFileSync(path.join(root, app, 'index.html'), 'utf8');
        code = html.slice(html.indexOf('        const API = {'), html.indexOf('        const SyncManager = {'));
    } else {
        code = fs.readFileSync(path.join(root, app, 'js/api.js'), 'utf8')
            .replace("import { Storage } from './storage.js';", '')
            .replace('export const API', 'const API');
    }
    vm.runInNewContext(code + '\nglobalThis.testAPI = API;', context);
    return { api: context.testAPI, calls };
}

for (const app of ['photo-chronicles', 'ghostink-flashcards', 'pet-tracker']) {
    for (const useProxy of [undefined, false, true]) {
        test(`${app}: ${useProxy === true ? 'optional proxy' : useProxy === false ? 'selected direct' : 'legacy direct default'} preserves request credentials and payload`, async () => {
            const settings = {
                useProxy, workerUrl: 'https://proxy.example/', proxyToken: 'proxy-secret',
                authToken: 'notion-token', notionToken: 'notion-token'
            };
            const { api, calls } = client(app, settings);
            await api.request('PATCH', '/pages/page-id', { properties: { title: { title: [] } } });
            const call = calls[0];
            assert.equal(call.method, 'PATCH');
            assert.equal(call.headers.Authorization, 'Bearer notion-token');
            assert.equal(call.headers['Notion-Version'], '2025-09-03');
            assert.deepEqual(JSON.parse(call.body), { properties: { title: { title: [] } } });
            assert.ok(!call.url.href.includes('secret') && !call.url.href.includes('token'));
            if (useProxy === true) {
                assert.equal(call.url.origin, 'https://proxy.example');
                assert.equal(call.url.searchParams.get('url'), 'https://api.notion.com/v1/pages/page-id');
                assert.equal(call.headers['X-Proxy-Token'], 'proxy-secret');
            } else {
                assert.equal(call.url.href, 'https://api.notion.com/v1/pages/page-id');
                assert.equal(call.headers['X-Proxy-Token'], undefined);
            }
        });
    }
    test(`${app}: direct access needs no Worker; explicit proxy requires its URL`, async () => {
        const settings = { authToken: 'notion-token', notionToken: 'notion-token' };
        const { api, calls } = client(app, settings);
        await api.request('GET', '/users/me');
        assert.equal(calls[0].url.href, 'https://api.notion.com/v1/users/me');
        settings.useProxy = true;
        await assert.rejects(() => api.request('GET', '/users/me'), /proxy Worker URL/);
        assert.equal(calls.length, 1);
    });
}

for (const app of ['photo-chronicles', 'pet-tracker']) {
    for (const useProxy of [false, true]) {
        test(`${app}: multipart upload uses ${useProxy ? 'proxy' : 'direct'} route`, async () => {
            const { api, calls } = client(app, {
                useProxy, workerUrl: 'https://proxy.example', proxyToken: 'proxy-secret',
                authToken: 'notion-token', notionToken: 'notion-token'
            });
            const target = 'https://api.notion.com/v1/file_uploads/upload-id/send';
            await api.uploadFileContent(target, new Blob(['photo'], { type: 'image/jpeg' }));
            const call = calls[0];
            assert.equal(call.method, 'POST');
            assert.ok(call.body instanceof FormData);
            assert.equal(await call.body.get('file').text(), 'photo');
            assert.equal(call.headers['Content-Type'], undefined);
            assert.equal(call.headers['X-Proxy-Token'], useProxy ? 'proxy-secret' : undefined);
            assert.equal(useProxy ? call.url.searchParams.get('url') : call.url.href, target);
        });
    }
}

test('Pet Tracker: OAuth token uses direct requests with no Worker', async () => {
    const { api, calls } = client('pet-tracker', {
        authMode: 'oauth', notionOAuthData: { access_token: 'oauth-token' }, notionToken: 'manual-token'
    });
    await api.verifyConnection();
    assert.equal(calls[0].url.href, 'https://api.notion.com/v1/users/me');
    assert.equal(calls[0].headers.Authorization, 'Bearer oauth-token');
});

test('GhostInk: verified sources and auth enable study without proxy verification', () => {
    const code = fs.readFileSync(path.join(root, 'ghostink-flashcards/js/app.js'), 'utf8');
    const method = code.slice(code.indexOf('    isReady() {'), code.indexOf('    loadAISettings() {'));
    const { api } = client('ghostink-flashcards', {});
    const s = { authToken: 'qa', deckSource: 'deck', cardSource: 'card', sourcesSaved: true, authVerified: true, sourcesVerified: true };
    const context = { API: api, navigator: { onLine: true }, state: { settings: s } };
    vm.runInNewContext('const app = { state, ' + method + ' }; globalThis.ready = () => app.isReady();', context);
    assert.equal(context.ready(), true);
    s.useProxy = true;
    assert.equal(context.ready(), false);
    s.workerUrl = 'https://proxy.example';
    s.workerVerified = true;
    assert.equal(context.ready(), true);
});

test('Pet Tracker: direct sync passes configuration check with OAuth and sources', async () => {
    const code = fs.readFileSync(path.join(root, 'pet-tracker/js/sync.js'), 'utf8');
    const settings = { authMode: 'oauth', notionOAuthData: { access_token: 'qa' }, dataSources: { pets: 'qa' } };
    const { api } = client('pet-tracker', settings);
    const pendingReached = new Error('configuration passed');
    const context = {
        window: {}, console, navigator: { onLine: true },
        PetTracker: { Settings: { get: () => settings }, API: api, SyncQueue: { getPending: async () => { throw pendingReached; } } }
    };
    vm.runInNewContext(code + '\nglobalThis.sync = Sync;', context);
    context.sync.requiredDataSourceKeys = ['pets'];
    await assert.rejects(() => context.sync.run(), error => error === pendingReached);
    settings.useProxy = true;
    await context.sync.run();
});
