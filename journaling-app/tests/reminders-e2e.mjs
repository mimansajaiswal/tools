import { chromium } from '/tmp/journaling-playwright/node_modules/playwright/index.mjs';

const appUrl = process.env.JOURNALING_APP_URL || 'http://127.0.0.1:8000/journaling-app/';
const origin = new URL(appUrl).origin;
const executablePath = '/Users/mimansajaiswal/Library/Caches/ms-playwright/chromium_headless_shell-1148/chrome-mac/headless_shell';

function assert(condition, message, details = undefined) {
  if (!condition) throw new Error(details ? `${message}: ${JSON.stringify(details, null, 2)}` : message);
}

const context = await chromium.launchPersistentContext(`/tmp/journaling-reminders-${Date.now()}`, {
  executablePath,
  headless: true,
  viewport: { width: 1440, height: 1000 },
  permissions: ['notifications']
});
await context.grantPermissions(['notifications'], { origin });

try {
  const page = context.pages()[0] || await context.newPage();
  await page.addInitScript(() => {
    window.__shownNotifications = [];
    Object.defineProperty(Notification, 'permission', { configurable: true, get: () => 'granted' });
    Notification.requestPermission = async () => 'granted';
    ServiceWorkerRegistration.prototype.showNotification = async function showNotification(title, options) {
      window.__shownNotifications.push({ title, options });
    };
  });
  await page.goto(`${appUrl}#write`);
  await page.waitForSelector('.ProseMirror');
  await page.evaluate(() => navigator.serviceWorker.ready);
  const originalTitle = await page.locator('#docTitleInput').inputValue();
  await page.locator('[data-view-link="reminders"]').evaluate((link) => link.click());
  await page.fill('#reminderTitleInput', 'Managed reminder');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowYmd = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  await page.fill('#reminderDateInput', tomorrowYmd);
  await page.fill('#reminderTimeInput', '09:15');
  await page.selectOption('#reminderFrequencyInput', 'daily');
  await page.locator('#reminderForm button[type="submit"]').evaluate((button) => button.click());
  const managed = page.locator('#remindersList article').filter({ hasText: 'Managed reminder' });
  await managed.waitFor();
  await managed.locator('[data-toggle-reminder]').evaluate((button) => button.click());
  await page.waitForFunction(() => Array.from(document.querySelectorAll('#remindersList article')).some((node) => node.textContent.includes('Managed reminder') && node.textContent.includes('paused')));
  await managed.locator('[data-toggle-reminder]').evaluate((button) => button.click());
  await page.waitForFunction(() => Array.from(document.querySelectorAll('#remindersList article')).some((node) => node.textContent.includes('Managed reminder') && !node.textContent.includes('paused')));
  await managed.locator('[data-delete-reminder]').evaluate((button) => button.click());
  await page.waitForFunction(() => !Array.from(document.querySelectorAll('#remindersList article')).some((node) => node.textContent.includes('Managed reminder')));
  await page.locator('[data-view-link="write"]').evaluate((link) => link.click());
  const due = new Date();
  due.setSeconds(0, 0);
  const localValue = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}T${String(due.getHours()).padStart(2, '0')}:${String(due.getMinutes()).padStart(2, '0')}`;
  await page.locator('#docReminderInput').evaluate((input, value) => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, localValue);
  await page.waitForTimeout(900);
  await page.locator('#enableRemindersBtn').evaluate((button) => button.click());
  await page.waitForTimeout(1000);
  const deliveryDiagnostic = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('JournalingAppDB_journaling-app');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const getAll = (store) => new Promise((resolve, reject) => {
      const request = db.transaction(store).objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const [documents, settings] = await Promise.all([getAll('documents'), getAll('settings')]);
    return {
      shown: window.__shownNotifications,
      permission: Notification.permission,
      status: document.querySelector('#reminderNotificationStatus')?.textContent || '',
      reminderDates: documents.filter((document) => document.reminderAt).map((document) => ({ id: document.id, title: document.title, reminderAt: document.reminderAt })),
      notifications: settings[0]?.value?.notifications || null
    };
  });
  assert(deliveryDiagnostic.shown.length > 0, 'Due reminder was not delivered', deliveryDiagnostic);
  const first = await page.evaluate(() => window.__shownNotifications.slice());
  const documentNotification = first.find((item) => item.options.data.documentId);
  assert(Boolean(documentNotification), 'No document-specific notification was delivered', first);
  assert(documentNotification.options.data.documentId, 'Notification omitted its document id', documentNotification);
  assert(documentNotification.options.data.url.includes('#write:'), 'Notification omitted its entry URL', documentNotification);

  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(300);
  const secondCount = await page.evaluate(() => window.__shownNotifications.length);
  assert(secondCount === first.length, 'Enabling/checking reminders twice duplicated a notification', { first: first.length, secondCount });

  await page.locator('[data-view-link="library"]').evaluate((link) => link.click());
  await page.waitForFunction(() => document.body.dataset.activeView === 'library');
  const another = page.locator('[data-open-doc]').filter({ hasNotText: originalTitle }).first();
  if (await another.count()) await another.evaluate((button) => button.click());
  await page.evaluate((data) => {
    navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { type: 'open-reminder', ...data } }));
  }, documentNotification.options.data);
  await page.waitForFunction((id) => location.hash === `#write:${encodeURIComponent(id)}`, documentNotification.options.data.documentId);
  assert(await page.locator('#docTitleInput').inputValue() === originalTitle, 'Reminder click-through did not reopen the originating entry');

  const persisted = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('JournalingAppDB_journaling-app');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const get = (store, key) => new Promise((resolve, reject) => {
      const request = db.transaction(store).objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const [settings, ledger] = await Promise.all([
      get('settings', 'current'), get('meta', 'journaling:reminder-deliveries:v1')
    ]);
    return {
      enabled: settings.value.notifications.enabled,
      permission: settings.value.notifications.permission,
      delivered: ledger.value.deliveredKeys.length
    };
  });
  assert(persisted.enabled && persisted.permission === 'granted', 'Notification permission state was not persisted', persisted);
  assert(persisted.delivered >= 1, 'Reminder delivery ledger was not persisted', persisted);
  await page.locator('#enableRemindersBtn').evaluate((button) => button.click());
  await page.waitForFunction(() => document.querySelector('#reminderNotificationStatus')?.textContent === 'Notifications off');
  const disabled = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('JournalingAppDB_journaling-app');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise((resolve, reject) => {
      const request = db.transaction('settings').objectStore('settings').get('current');
      request.onsuccess = () => resolve(request.result.value.notifications.enabled);
      request.onerror = () => reject(request.error);
    });
  });
  assert(disabled === false, 'Disabling reminders was not persisted');
  console.log(JSON.stringify({ ok: true, notificationCount: first.length }, null, 2));
} finally {
  await context.close();
}
