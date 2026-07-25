import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '/tmp/journaling-playwright/node_modules/playwright/index.mjs';

const appUrl = process.env.JOURNALING_APP_URL || 'http://127.0.0.1:8000/journaling-app/';
const executablePath = '/Users/mimansajaiswal/Library/Caches/ms-playwright/chromium_headless_shell-1148/chrome-mac/headless_shell';
const context = await chromium.launchPersistentContext(`/tmp/journaling-transfer-${Date.now()}`, {
  executablePath,
  headless: true,
  serviceWorkers: 'block',
  viewport: { width: 1280, height: 900 },
  acceptDownloads: true
});

try {
  const page = context.pages()[0] || await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(error.stack || String(error)));
  await page.goto(`${appUrl}#write`);
  await page.waitForSelector('.ProseMirror');

  const audioBase64 = Buffer.from('owned-audio-bytes').toString('base64');
  const validPayload = {
    exportedAt: '2026-07-12T22:00:00.000Z',
    documents: [{
      id: 'doc-import-owned',
      type: 'entry',
      journalId: 'journal-import',
      title: 'Imported owned journal',
      date: '2026-07-12',
      tags: ['owned'],
      people: [],
      categories: [],
      attachments: ['asset-import-audio'],
      blocks: [
        { id: 'block-import-text', type: 'paragraph', richText: [{ type: 'text', text: 'This survives a complete ownership round trip.' }] },
        { id: 'block-import-audio', type: 'audio', assetId: 'asset-import-audio', captionRichText: [] }
      ],
      transcripts: [{ id: 'transcript-import', text: 'Imported transcript.', status: 'ready', sourceAudioId: 'asset-import-audio' }],
      metadata: {}
    }],
    healthLogs: [],
    assets: [{
      id: 'asset-import-audio',
      documentId: 'doc-import-owned',
      kind: 'audio',
      name: 'owned.webm',
      originalName: 'owned.webm',
      mimeType: 'audio/webm',
      size: 17,
      metadata: { blobDataUrl: `data:audio/webm;base64,${audioBase64}` }
    }],
    views: [{ id: 'view-import', name: 'Owned view', type: 'list', query: { tags: ['owned'] } }],
    settings: {
      version: 2,
      activeJournalId: 'journal-import',
      journals: [{ id: 'journal-import', name: 'Imported journal', color: '', description: '', icon: '' }],
      templates: [],
      reminders: [],
      drive: { enabled: true, syncMode: 'manual', accessToken: 'owned-drive-token' },
      notion: { enabled: false },
      editor: { customFields: [], savedSearches: [] },
      ai: {}, health: {}, media: {}
    },
    syncQueue: [{ id: null, type: 'document', action: 'upsert', targetId: 'doc-import-owned', status: 'queued', payload: {} }],
    syncState: { version: 2, provider: 'google-drive', status: 'idle' }
  };
  const validPath = '/tmp/journaling-valid-import.json';
  fs.writeFileSync(validPath, JSON.stringify(validPayload));
  await page.setInputFiles('#importJsonInput', validPath);
  await page.waitForFunction(() => document.querySelector('#docTitleInput')?.value === 'Imported owned journal');
  assert.equal(await page.locator('.ProseMirror .audio-embed[data-asset-id="asset-import-audio"]').count(), 1);
  assert((await page.locator('.ProseMirror').textContent()).includes('ownership round trip'));

  const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await page.click('.topbar-menu summary');
  await page.click('#topExportBtn');
  const download = await downloadPromise;
  const exportDiagnostic = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('JournalingAppDB_journaling-app');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const assets = await new Promise((resolve, reject) => {
      const request = db.transaction('assets').objectStore('assets').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return { assetCount: assets.length, blobIsBlob: assets[0]?.metadata?.blob instanceof Blob, blobType: assets[0]?.metadata?.blob?.type || '' };
  });
  assert(download, `Export did not produce a download: ${JSON.stringify({ browserErrors, exportDiagnostic }, null, 2)}`);
  const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  assert.equal(exported.documents.length, 1);
  assert.equal(exported.documents[0].title, 'Imported owned journal');
  assert(exported.assets[0].metadata.blobDataUrl.startsWith('data:audio/webm;base64,'));
  assert.equal(Object.hasOwn(exported.assets[0].metadata, 'blob'), false);

  const malformedPath = '/tmp/journaling-malformed-import.json';
  fs.writeFileSync(malformedPath, JSON.stringify({ documents: [] }));
  await page.setInputFiles('#importJsonInput', malformedPath);
  await page.waitForFunction(() => document.querySelector('#syncStatusCard')?.textContent.includes('Import failed:'));
  assert.equal(await page.locator('#docTitleInput').inputValue(), 'Imported owned journal');

  const persisted = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('JournalingAppDB_journaling-app');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const readAll = (name) => new Promise((resolve, reject) => {
      const request = db.transaction(name).objectStore(name).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const [documents, assets, views, queue, settings] = await Promise.all([
      readAll('documents'), readAll('assets'), readAll('views'), readAll('syncQueue'), readAll('settings')
    ]);
    return {
      titles: documents.map((item) => item.title),
      audioText: assets[0]?.metadata?.blob ? await assets[0].metadata.blob.text() : '',
      viewNames: views.map((item) => item.name),
      queueCount: queue.length,
      journalNames: settings[0]?.value?.journals?.map((item) => item.name) || []
    };
  });
  assert.deepEqual(persisted.titles, ['Imported owned journal']);
  assert.equal(persisted.audioText, 'owned-audio-bytes');
  assert.deepEqual(persisted.viewNames, ['Owned view']);
  assert.equal(persisted.queueCount, 1);
  assert.deepEqual(persisted.journalNames, ['Imported journal']);

  await page.reload();
  await page.waitForSelector('.ProseMirror .audio-embed[data-asset-id="asset-import-audio"]');
  assert.equal(await page.locator('#docTitleInput').inputValue(), 'Imported owned journal');
  console.log(JSON.stringify({ ok: true, bytes: persisted.audioText.length }, null, 2));
} finally {
  await context.close();
}
