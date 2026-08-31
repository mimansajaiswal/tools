import assert from 'node:assert/strict';
import { chromium } from '/tmp/journaling-playwright/node_modules/playwright/index.mjs';

const appUrl = process.env.JOURNALING_APP_URL || 'http://127.0.0.1:8000/journaling-app/';
const executablePath = '/Users/mimansajaiswal/Library/Caches/ms-playwright/chromium_headless_shell-1148/chrome-mac/headless_shell';
const calls = [];
const activity = { summary: { steps: 8421, caloriesOut: 2140, fairlyActiveMinutes: 18, veryActiveMinutes: 27, restingHeartRate: 61 } };
const sleep = {
  summary: { totalMinutesAsleep: 420 },
  sleep: [{ isMainSleep: true, logId: 987, efficiency: 92, levels: { summary: {
    deep: { minutes: 72 }, light: { minutes: 241 }, rem: { minutes: 107 }, wake: { minutes: 35 }
  } } }]
};

const context = await chromium.launchPersistentContext(`/tmp/journaling-fitbit-${Date.now()}`, {
  executablePath,
  headless: true,
  serviceWorkers: 'block',
  viewport: { width: 1280, height: 900 }
});

try {
  const page = context.pages()[0] || await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(error.stack || String(error)));
  await page.route('https://api.fitbit.com/**', async (route) => {
    calls.push({ url: route.request().url(), authorization: route.request().headers().authorization });
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(route.request().url().includes('/sleep/') ? sleep : activity) });
  });
  await page.goto(`${appUrl}#write`);
  await page.waitForSelector('.ProseMirror');
  await page.click('#toggleStudioBtn');
  await page.waitForSelector('.rail-right');
  await page.check('[name="driveEnabled"]');
  await page.selectOption('[name="driveSyncMode"]', 'manual');
  await page.click('#settingsForm button[type="submit"]');
  await page.click('#toggleSectionsBtn');
  await page.click('[data-view-link="health"]');
  await page.waitForSelector('#health:not([hidden])');
  await page.fill('#fitbitAccessTokenInput', 'fitbit-browser-token');
  await page.fill('#fitbitImportDateInput', '2026-07-12');
  assert.equal(await page.inputValue('#fitbitAccessTokenInput'), 'fitbit-browser-token');
  await page.waitForTimeout(700);
  assert.equal(await page.inputValue('#fitbitAccessTokenInput'), 'fitbit-browser-token', 'Fitbit token field was overwritten by an unrelated render');
  await page.click('#importFitbitBtn');
  await page.waitForFunction(() => /Imported|failed/.test(document.querySelector('#fitbitImportStatus')?.textContent || ''));
  const status = await page.locator('#fitbitImportStatus').innerText();
  assert(status.includes('Imported 10 Fitbit measurements'), `Fitbit import did not succeed: ${JSON.stringify({ status, calls, browserErrors }, null, 2)}`);

  assert.equal(calls.length, 2);
  assert(calls.every((call) => call.authorization === 'Bearer fitbit-browser-token'));
  assert.equal(await page.locator('#healthMeasurementsBody tr').count(), 12);
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
    const [healthLogs, settings, queue] = await Promise.all([readAll('healthLogs'), readAll('settings'), readAll('syncQueue')]);
    return {
      fitbitLogs: healthLogs.filter((item) => item.source === 'fitbit' && item.recordedAt.startsWith('2026-07-12')),
      healthSettings: settings[0].value.health,
      queuedFitbit: queue.filter((job) => job.type === 'health' && job.payload?.source === 'fitbit')
    };
  });
  assert.equal(persisted.fitbitLogs.length, 10);
  assert.equal(persisted.healthSettings.fitbitAccessToken, 'fitbit-browser-token');
  assert.equal(persisted.healthSettings.fitbitEnabled, true);
  assert(persisted.healthSettings.fitbitLastImportedAt);
  assert.equal(persisted.queuedFitbit.length, 10);
  console.log(JSON.stringify({ ok: true, imported: persisted.fitbitLogs.length }, null, 2));
} finally {
  await context.close();
}
