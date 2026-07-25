import http from 'node:http';
import { chromium } from '/tmp/journaling-playwright/node_modules/playwright/index.mjs';

const appUrl = process.env.JOURNALING_APP_URL || 'http://127.0.0.1:8000/journaling-app/';
const origin = new URL(appUrl).origin;
const executablePath = '/Users/mimansajaiswal/Library/Caches/ms-playwright/chromium_headless_shell-1148/chrome-mac/headless_shell';
const uploadedNames = [];
const uploadedPayloads = new Map();
const workerErrors = [];
const mockPort = 8791;
let rejectDriveRequests = false;

function assert(condition, message, details = undefined) {
  if (!condition) throw new Error(details ? `${message}: ${JSON.stringify(details, null, 2)}` : message);
}

function parseMultipartBuffer(buffer, contentType) {
  const boundary = String(contentType || '').match(/boundary=([^;]+)/)?.[1] || '';
  return buffer.toString('utf8')
    .split(`--${boundary}`)
    .filter((part) => part.includes('\r\n\r\n'))
    .map((part) => {
      const content = part.slice(part.indexOf('\r\n\r\n') + 4).replace(/\r\n$/, '').trim();
      if (!content) return null;
      try { return JSON.parse(content); } catch { return content; }
    })
    .filter(Boolean);
}

const mockDrive = http.createServer(async (request, response) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'authorization,content-type'
  };
  if (request.method === 'OPTIONS') {
    response.writeHead(204, cors);
    response.end();
    return;
  }
  const url = new URL(request.url, `http://127.0.0.1:${mockPort}`);
  if (rejectDriveRequests) {
    response.writeHead(401, { ...cors, 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: { message: 'Test token expired' } }));
    return;
  }
  if (request.method === 'GET' && url.pathname === '/drive/v3/files') {
    response.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ files: [{ id: 'root-folder', name: 'Journaling' }] }));
    return;
  }
  if (['POST', 'PATCH'].includes(request.method) && url.pathname.startsWith('/upload/drive/v3/files')) {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const [metadata, payload] = parseMultipartBuffer(Buffer.concat(chunks), request.headers['content-type']);
    uploadedNames.push(metadata.name);
    uploadedPayloads.set(metadata.name, payload);
    const id = `background-file-${uploadedNames.length}`;
    response.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ id, name: metadata.name, webViewLink: `https://drive.google.com/${id}` }));
    return;
  }
  response.writeHead(404, cors);
  response.end('Not found');
});

const context = await chromium.launchPersistentContext(`/tmp/journaling-drive-background-${Date.now()}`, {
  executablePath,
  headless: true,
  ignoreDefaultArgs: ['--disable-background-networking'],
  viewport: { width: 1440, height: 1000 }
});

try {
  await new Promise((resolve) => mockDrive.listen(mockPort, '127.0.0.1', resolve));

  const page = context.pages()[0] || await context.newPage();
  await page.addInitScript(() => {
    window.__registeredSyncTags = [];
    Object.defineProperty(ServiceWorkerRegistration.prototype, 'sync', {
      configurable: true,
      get() {
        return {
          register: async (tag) => {
            if (!window.__registeredSyncTags.includes(tag)) window.__registeredSyncTags.push(tag);
          },
          getTags: async () => window.__registeredSyncTags.slice()
        };
      }
    });
  });
  await page.goto(`${appUrl}#write`);
  await page.waitForSelector('.ProseMirror');
  await page.click('#toggleStudioBtn');
  await page.waitForSelector('.rail-right');
  const registration = await page.evaluate(async () => {
    const value = await navigator.serviceWorker.ready;
    return { scope: value.scope, hasSync: 'sync' in value };
  });
  assert(registration.hasSync, 'Chromium did not expose one-off Background Sync', registration);

  await context.setOffline(true);
  await page.fill('[name="driveAccessToken"]', 'background-drive-token');
  await page.selectOption('[name="driveSyncMode"]', 'background');
  await page.locator('[name="driveEnabled"]').evaluate((input) => { input.checked = true; });
  await page.locator('[name="notionEnabled"]').evaluate((input) => { input.checked = false; });
  await page.locator('#settingsForm button[type="submit"]').evaluate((button) => button.click());
  await page.evaluate(async ({ apiBase, uploadBase }) => {
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
    current.value.drive.apiBase = apiBase;
    current.value.drive.uploadBase = uploadBase;
    store.put(current);
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }, {
    apiBase: `http://127.0.0.1:${mockPort}/drive/v3`,
    uploadBase: `http://127.0.0.1:${mockPort}/upload/drive/v3`
  });
  await page.fill('#docTitleInput', 'Background queued title');
  await page.waitForTimeout(900);

  const queuedBefore = await page.evaluate(async () => {
    const tags = window.__registeredSyncTags.slice();
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('JournalingAppDB_journaling-app');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const jobs = await new Promise((resolve, reject) => {
      const request = db.transaction('syncQueue').objectStore('syncQueue').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return { tags, queued: jobs.filter((job) => job.status === 'queued').length };
  });
  assert(queuedBefore.tags.includes('journaling-drive-sync'), 'Drive background tag was not registered', queuedBefore);
  assert(queuedBefore.queued > 0, 'No local changes were queued before reconnecting', queuedBefore);

  const cdp = await context.newCDPSession(page);
  let registrations = [];
  cdp.on('ServiceWorker.workerRegistrationUpdated', (event) => { registrations = event.registrations; });
  cdp.on('ServiceWorker.workerErrorReported', (event) => { workerErrors.push(event.errorMessage); });
  await cdp.send('ServiceWorker.enable');
  await page.waitForTimeout(300);
  const workerRegistration = registrations.find((item) => item.scopeURL.includes('/journaling-app/'));
  assert(Boolean(workerRegistration), 'Could not locate the Journaling service-worker registration', registrations);

  await context.setOffline(false);
  await cdp.send('ServiceWorker.dispatchSyncEvent', {
    origin,
    registrationId: workerRegistration.registrationId,
    tag: 'journaling-drive-sync',
    lastChance: false
  });
  await page.waitForTimeout(3000);
  const dispatchDiagnostic = await page.evaluate(async () => {
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
    const [jobs, settings] = await Promise.all([readAll('syncQueue'), readAll('settings')]);
    return {
      status: document.querySelector('#syncStatusCard')?.innerText || '',
      queued: jobs.filter((job) => job.status === 'queued').length,
      lastPushAt: settings[0]?.value?.drive?.lastPushAt || ''
    };
  });
  assert(dispatchDiagnostic.status.includes('Background Drive sync completed'), 'Service-worker Drive sync did not complete', {
    dispatchDiagnostic, uploadedNames, workerErrors
  });

  const after = await page.evaluate(async () => {
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
    const [jobs, documents, settings] = await Promise.all([readAll('syncQueue'), readAll('documents'), readAll('settings')]);
    return {
      queued: jobs.filter((job) => job.status === 'queued').length,
      backgroundJobs: jobs.filter((job) => job.type === 'drive-library' && job.payload?.background).length,
      titles: documents.map((document) => document.title),
      lastPushAt: settings[0].value.drive.lastPushAt
    };
  });
  assert(after.queued === 0, 'Background Drive sync did not complete queued jobs with Notion disabled', after);
  assert(after.backgroundJobs === 1, 'Worker did not persist its background sync receipt', after);
  assert(after.titles.includes('Background queued title'), 'Worker snapshot omitted the offline edit', after);
  assert(Boolean(after.lastPushAt), 'Worker did not persist Drive lastPushAt', after);
  assert(uploadedNames.filter((name) => name.endsWith('.md')).length === 4, 'Worker did not upload all Markdown pages', uploadedNames);
  assert(uploadedNames.filter((name) => name.endsWith('.json') && name !== 'journaling-library.json').length === 4, 'Worker did not upload all document JSON files', uploadedNames);
  assert(uploadedNames.at(-1) === 'journaling-library.json', 'Worker did not commit the manifest last', uploadedNames);
  const editedJson = [...uploadedPayloads.entries()].find(([name, payload]) => name.endsWith('.json') && payload?.document?.title === 'Background queued title');
  assert(Boolean(editedJson), 'Worker-uploaded JSON omitted the offline title edit', [...uploadedPayloads.keys()]);

  const successfulUploadCount = uploadedNames.length;
  const successfulPushAt = after.lastPushAt;
  await context.setOffline(true);
  await page.fill('#docTitleInput', 'Background failure remains queued');
  await page.waitForTimeout(900);
  rejectDriveRequests = true;
  await context.setOffline(false);
  await cdp.send('ServiceWorker.dispatchSyncEvent', {
    origin,
    registrationId: workerRegistration.registrationId,
    tag: 'journaling-drive-sync',
    lastChance: false
  });
  await page.waitForFunction(() => document.querySelector('#syncStatusCard')?.textContent.includes('Background Drive sync failed'), null, { timeout: 10000 });
  const failureState = await page.evaluate(async () => {
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
    const [jobs, settings] = await Promise.all([readAll('syncQueue'), readAll('settings')]);
    return {
      queued: jobs.filter((job) => job.status === 'queued').length,
      lastPushAt: settings[0].value.drive.lastPushAt
    };
  });
  assert(failureState.queued > 0, 'Failed background sync falsely completed the queue', failureState);
  assert(failureState.lastPushAt === successfulPushAt, 'Failed background sync advanced lastPushAt', { failureState, successfulPushAt });
  assert(uploadedNames.length === successfulUploadCount, 'Failed authentication still uploaded files', { uploadedNames, successfulUploadCount });
  console.log(JSON.stringify({ ok: true, uploadedNames }, null, 2));
} finally {
  await context.close();
  await new Promise((resolve) => mockDrive.close(resolve));
}
