import { chromium } from '/tmp/journaling-playwright/node_modules/playwright/index.mjs';

const appUrl = process.env.JOURNALING_APP_URL || 'http://127.0.0.1:8000/journaling-app/';
const executablePath = '/Users/mimansajaiswal/Library/Caches/ms-playwright/chromium_headless_shell-1148/chrome-mac/headless_shell';

function assert(condition, message, details = undefined) {
  if (!condition) throw new Error(details ? `${message}: ${JSON.stringify(details, null, 2)}` : message);
}

const context = await chromium.launchPersistentContext(`/tmp/journaling-drive-restore-${Date.now()}`, {
  executablePath,
  headless: true,
  serviceWorkers: 'block',
  viewport: { width: 1440, height: 1000 }
});

try {
  const page = context.pages()[0] || await context.newPage();
  await page.route('https://www.googleapis.com/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/drive/v3/files?') && !url.includes('alt=media')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          files: [
            {
              id: 'manifest-remote',
              name: 'journaling-library.json',
              mimeType: 'application/json',
              modifiedTime: '2026-07-12T12:00:00.000Z',
              webViewLink: 'https://drive.google.com/manifest-remote'
            },
            {
              id: 'json-remote',
              name: '2026-07-12 Drive memory.json',
              mimeType: 'application/json',
              modifiedTime: '2026-07-12T12:00:00.000Z',
              webViewLink: 'https://drive.google.com/json-remote'
            },
            {
              id: 'markdown-remote',
              name: '2026-07-12 Drive memory.md',
              mimeType: 'text/markdown',
              modifiedTime: '2026-07-12T12:00:00.000Z',
              webViewLink: 'https://drive.google.com/markdown-remote'
            }
          ]
        })
      });
      return;
    }
    if (url.includes('/files/manifest-remote?alt=media')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          object: 'journaling-library',
          version: 1,
          exportedAt: '2026-07-12T12:00:00.000Z',
          documentIds: ['doc-drive-restored'],
          healthLogs: [{
            id: 'health-drive-restored',
            kind: 'symptom',
            title: 'Restored energy dip',
            value: 4,
            unit: '/10',
            recordedAt: '2026-07-12T09:00:00.000Z',
            metadata: {}
          }],
          views: [{ id: 'view-drive-restored', type: 'list', name: 'Drive favorites', query: { favorite: true } }],
          workspace: {
            settings: {
              activeJournalId: 'journal-drive',
              journals: [{ id: 'journal-drive', name: 'Drive journal', color: '', description: 'Restored journal', icon: '' }],
              templates: [{ id: 'template-drive', name: 'Drive template', journalId: 'journal-drive', tags: ['restored'], body: 'Paragraph: Restored' }],
              reminders: [{ id: 'reminder-drive', title: 'Restored reminder', journalId: 'journal-drive', date: '', time: '08:00', frequency: 'daily', active: true }],
              editor: { blockBehavior: 'notion-like', quickAddInline: true, customFields: [], savedSearches: [] },
              media: { imageMaxEdge: 1800, imageQuality: 0.8, preserveOriginalImages: false, preserveOriginalVideo: true },
              health: { fitbitEnabled: false, googleFitEnabled: false, appleHealthBridgeEnabled: false },
              ai: { provider: 'local-reflection', endpoint: '', model: '', transcriptionProvider: 'browser_native', dailyChatInstruction: 'Restored instruction' }
            }
          }
        })
      });
      return;
    }
    if (url.includes('/files/json-remote?alt=media')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          document: {
            id: 'doc-drive-restored',
            type: 'entry',
            journalId: 'journal_personal',
            title: 'Drive memory',
            date: '2026-07-12',
            tags: ['restored'],
            people: [],
            categories: [],
            attachments: ['asset-drive-restored'],
            blocks: [
              { id: 'block-text', type: 'paragraph', richText: [{ type: 'text', text: 'This page came back from Google Drive.' }] },
              { id: 'block-image', type: 'image', assetId: 'asset-drive-restored', alt: 'Restored image', captionRichText: [] }
            ],
            metadata: {}
          },
          assets: [{
            id: 'asset-drive-restored',
            documentId: 'doc-drive-restored',
            kind: 'image',
            name: 'memory.webp',
            mimeType: 'image/webp',
            metadata: { driveFileId: 'asset-remote' }
          }]
        })
      });
      return;
    }
    if (url.includes('/files/asset-remote?alt=media')) {
      await route.fulfill({ contentType: 'image/webp', body: Buffer.from('restored-image') });
      return;
    }
    await route.abort();
  });

  await page.goto(`${appUrl}#write`);
  await page.waitForSelector('.ProseMirror');
  await page.click('#toggleStudioBtn');
  await page.waitForSelector('.rail-right');
  await page.fill('[name="driveAccessToken"]', 'test-drive-token');
  await page.fill('[name="driveRootFolderName"]', 'Journaling');
  await page.locator('[name="driveEnabled"]').evaluate((input) => {
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.locator('#settingsForm button[type="submit"]').evaluate((button) => button.click());
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('JournalingAppDB_journaling-app');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('settings', 'readwrite');
    const store = transaction.objectStore('settings');
    const current = await new Promise((resolve, reject) => {
      const request = store.get('current');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    current.value.health.fitbitAccessToken = 'local-fitbit-token';
    store.put(current);
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  });
  await page.reload();
  await page.waitForSelector('.ProseMirror');
  await page.waitForSelector('.rail-right');
  await page.locator('#restoreDriveBtn').evaluate((button) => button.click());
  await page.waitForFunction(() => document.querySelector('#syncStatusCard')?.textContent.includes('Restored 1 page, 1 attachment, and 1 health log'));
  await page.waitForFunction(() => document.querySelector('#docTitleInput')?.value === 'Drive memory');
  assert(await page.locator('.ProseMirror').innerText().then((text) => text.includes('came back from Google Drive')), 'Restored document text is missing');
  assert(await page.locator('.ProseMirror img[data-asset-id="asset-drive-restored"]').count() === 1, 'Restored image is not in the editor');

  await page.reload();
  await page.waitForSelector('.ProseMirror img[data-asset-id="asset-drive-restored"]');
  assert(await page.locator('#docTitleInput').inputValue() === 'Drive memory', 'Restored document did not persist after reload');
  assert(await page.locator('.ProseMirror').innerText().then((text) => text.includes('came back from Google Drive')), 'Restored text did not persist after reload');
  const restoredStores = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('JournalingAppDB_journaling-app');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const storeNames = Array.from(db.objectStoreNames);
    const requiredStores = ['healthLogs', 'views', 'settings', 'assets'];
    if (requiredStores.some((name) => !storeNames.includes(name))) {
      throw new Error(`Unexpected IndexedDB stores: ${storeNames.join(', ')}`);
    }
    const readAll = (name) => new Promise((resolve, reject) => {
      const request = db.transaction(name).objectStore(name).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const readSettings = () => new Promise((resolve, reject) => {
      const request = db.transaction('settings').objectStore('settings').get('current');
      request.onsuccess = () => resolve(request.result?.value || {});
      request.onerror = () => reject(request.error);
    });
    const [healthLogs, views, settings, assets] = await Promise.all([
      readAll('healthLogs'), readAll('views'), readSettings(), readAll('assets')
    ]);
    return {
      healthTitles: healthLogs.map((item) => item.title),
      viewNames: views.map((item) => item.name),
      journalNames: settings.journals.map((item) => item.name),
      templateNames: settings.templates.map((item) => item.name),
      reminderTitles: settings.reminders.map((item) => item.title),
      driveToken: settings.drive.accessToken,
      fitbitToken: settings.health.fitbitAccessToken,
      assetHasBlob: assets[0]?.metadata?.blob instanceof Blob
    };
  });
  assert(restoredStores.healthTitles.includes('Restored energy dip'), 'Health logs were not restored', restoredStores);
  assert(restoredStores.viewNames.includes('Drive favorites'), 'Saved views were not restored', restoredStores);
  assert(restoredStores.journalNames.includes('Drive journal'), 'Journals were not restored', restoredStores);
  assert(restoredStores.templateNames.includes('Drive template'), 'Templates were not restored', restoredStores);
  assert(restoredStores.reminderTitles.includes('Restored reminder'), 'Reminders were not restored', restoredStores);
  assert(restoredStores.driveToken === 'test-drive-token', 'Local Drive credentials were overwritten', restoredStores);
  assert(restoredStores.fitbitToken === 'local-fitbit-token', 'Local Fitbit credentials were overwritten', restoredStores);
  assert(restoredStores.assetHasBlob, 'Restored attachment blob did not persist', restoredStores);
  console.log(JSON.stringify({ ok: true }, null, 2));
} finally {
  await context.close();
}
