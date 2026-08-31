import { REMINDER_META_KEY, REMINDER_PERIODIC_TAG, evaluateDueReminders } from './js/reminders.js';
import { DRIVE_BACKGROUND_SYNC_TAG, buildDriveWorkspaceSettings, syncDriveLibrarySnapshot } from './js/drive-library-sync.js';
import { normalizeSettings } from './js/schema.js';

const CACHE_NAME = 'journaling-app-v15';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './js/app.js',
  './js/editor.js',
  './js/fitbit-sync.js',
  './js/drive-sync.js',
  './js/drive-library-sync.js',
  './js/health.js',
  './js/insights.js',
  './js/notion-sync.js',
  './js/reminders.js',
  './js/sample-data.js',
  './js/schema.js',
  './js/storage.js',
  './js/transcription.js',
  './js/transcription-service.js',
  './js/ui.js',
  './assets/logo-mark.svg',
  './assets/lucide/plus.svg',
  './assets/lucide/check.svg',
  './assets/lucide/x.svg',
  '../components/quick-add/quick-add-component.css',
  '../components/quick-add/quick-add-component.js'
];

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

function openReminderDatabase() {
  const scopePath = new URL(self.registration.scope).pathname.replace(/\/$/, '');
  const scope = scopePath.split('/').filter(Boolean).at(-1) || 'journaling-app';
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(`JournalingAppDB_${scope}`);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open reminder database'));
  });
}

async function readReminderState(db) {
  const transaction = db.transaction(['settings', 'documents', 'meta']);
  const settingsRequest = transaction.objectStore('settings').get('current');
  const documentsRequest = transaction.objectStore('documents').getAll();
  const metaRequest = transaction.objectStore('meta').get(REMINDER_META_KEY);
  const [settingsRecord, documents, metaRecord] = await Promise.all([
    requestResult(settingsRequest), requestResult(documentsRequest), requestResult(metaRequest)
  ]);
  return { settings: settingsRecord?.value || {}, documents, deliveryState: metaRecord?.value || {} };
}

async function saveReminderDeliveryState(db, deliveryState) {
  const transaction = db.transaction('meta', 'readwrite');
  transaction.objectStore('meta').put({ key: REMINDER_META_KEY, value: deliveryState });
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('Could not save reminder delivery state'));
    transaction.onabort = () => reject(new Error('Reminder delivery transaction was aborted'));
  });
}

async function readDriveLibraryState(db) {
  const transaction = db.transaction(['settings', 'documents', 'healthLogs', 'assets', 'views', 'syncQueue']);
  const requests = {
    settings: transaction.objectStore('settings').get('current'),
    documents: transaction.objectStore('documents').getAll(),
    healthLogs: transaction.objectStore('healthLogs').getAll(),
    assets: transaction.objectStore('assets').getAll(),
    views: transaction.objectStore('views').getAll(),
    syncQueue: transaction.objectStore('syncQueue').getAll()
  };
  const [settingsRecord, documents, healthLogs, assets, views, syncQueue] = await Promise.all([
    requestResult(requests.settings), requestResult(requests.documents), requestResult(requests.healthLogs),
    requestResult(requests.assets), requestResult(requests.views), requestResult(requests.syncQueue)
  ]);
  return { settings: normalizeSettings(settingsRecord?.value || {}), documents, healthLogs, assets, views, syncQueue };
}

async function persistDriveSyncResult(db, library, result) {
  const settings = normalizeSettings({ ...library.settings, drive: result.driveSettings });
  const transaction = db.transaction(['settings', 'documents', 'assets', 'syncQueue'], 'readwrite');
  const stores = {
    settings: transaction.objectStore('settings'),
    documents: transaction.objectStore('documents'),
    assets: transaction.objectStore('assets'),
    syncQueue: transaction.objectStore('syncQueue')
  };
  result.documents.forEach((document) => stores.documents.put(document));
  result.assets.forEach((asset) => stores.assets.put(asset));
  stores.settings.put({ key: 'current', value: settings });
  library.syncQueue.forEach((job) => {
    if (job.status !== 'queued') return;
    if (job.type === 'document' && settings.notion?.enabled === true) return;
    stores.syncQueue.put({
      ...job,
      status: 'synced',
      updatedAt: result.syncedAt,
      payload: { ...(job.payload || {}), driveSyncedAt: result.syncedAt }
    });
  });
  stores.syncQueue.add({
    type: 'drive-library',
    action: 'upsert',
    targetId: result.manifestResult.manifestId,
    status: 'synced',
    attempts: 0,
    createdAt: result.syncedAt,
    updatedAt: result.syncedAt,
    payload: {
      documentCount: result.documents.length,
      assetCount: result.assets.length,
      background: true,
      syncedAt: result.syncedAt
    },
    error: null
  });
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(settings);
    transaction.onerror = () => reject(transaction.error || new Error('Could not persist background Drive sync'));
    transaction.onabort = () => reject(new Error('Background Drive sync transaction was aborted'));
  });
}

async function notifyClients(message) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  windows.forEach((client) => client.postMessage(message));
}

async function runQueuedDriveSync() {
  const db = await openReminderDatabase();
  try {
    const library = await readDriveLibraryState(db);
    const drive = library.settings.drive || {};
    if (drive.enabled !== true || drive.syncMode !== 'background' || !drive.accessToken) return;
    if (!library.syncQueue.some((job) => job.status === 'queued')) return;
    const result = await syncDriveLibrarySnapshot({
      settings: drive,
      documents: library.documents,
      assets: library.assets,
      healthLogs: library.healthLogs,
      views: library.views,
      workspaceSettings: buildDriveWorkspaceSettings(library.settings)
    });
    await persistDriveSyncResult(db, library, result);
    await notifyClients({
      type: 'drive-sync-complete',
      documentCount: result.documents.length,
      assetCount: result.assets.length,
      syncedAt: result.syncedAt
    });
  } catch (error) {
    await notifyClients({ type: 'drive-sync-error', message: error.message || String(error) });
    throw error;
  } finally {
    db.close();
  }
}

async function checkBackgroundReminders() {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (windows.some((client) => client.visibilityState === 'visible')) return;
  const db = await openReminderDatabase();
  try {
    const state = await readReminderState(db);
    if (state.settings.notifications?.enabled !== true) return;
    const result = evaluateDueReminders({
      settings: state.settings,
      documents: state.documents,
      now: new Date(),
      deliveryState: state.deliveryState
    });
    for (const reminder of result.due) {
      await self.registration.showNotification(reminder.title, {
        body: reminder.body,
        tag: `journaling-reminder-${reminder.deliveryKey}`,
        icon: './assets/logo-mark.svg',
        badge: './assets/logo-mark.svg',
        data: {
          url: reminder.url,
          documentId: reminder.documentId || '',
          journalId: reminder.journalId || ''
        }
      });
    }
    await saveReminderDeliveryState(db, result.deliveryState);
  } finally {
    db.close();
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  const isCodeLikeRequest =
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.webmanifest') ||
    url.pathname.endsWith('.svg');

  if (isCodeLikeRequest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === REMINDER_PERIODIC_TAG) event.waitUntil(checkBackgroundReminders());
});

self.addEventListener('sync', (event) => {
  if (event.tag === DRIVE_BACKGROUND_SYNC_TAG) event.waitUntil(runQueuedDriveSync());
});

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows[0];
    if (existing) {
      existing.postMessage({ type: 'open-reminder', documentId: data.documentId || '', journalId: data.journalId || '' });
      await existing.focus();
      return;
    }
    await self.clients.openWindow(new URL(data.url || './#write', self.registration.scope).href);
  })());
});
