import assert from 'node:assert/strict';
import { buildFitbitHealthLogs, importFitbitDay } from '../js/fitbit-sync.js';
import { buildDriveWorkspaceSettings } from '../js/drive-library-sync.js';

const activity = {
    summary: {
        steps: 8421,
        caloriesOut: 2140,
        fairlyActiveMinutes: 18,
        veryActiveMinutes: 27,
        restingHeartRate: 61
    }
};
const sleep = {
    summary: { totalMinutesAsleep: 420 },
    sleep: [{
        isMainSleep: true,
        logId: 987,
        efficiency: 92,
        levels: { summary: { deep: { minutes: 72 }, light: { minutes: 241 }, rem: { minutes: 107 }, wake: { minutes: 35 } } }
    }]
};

const logs = buildFitbitHealthLogs('2026-07-12', activity, sleep);
assert.equal(logs.length, 10);
assert.equal(logs.find((item) => item.id.endsWith(':steps')).value, 8421);
assert.equal(logs.find((item) => item.id.endsWith(':active_minutes')).value, 45);
assert.equal(logs.find((item) => item.id.endsWith(':sleep_duration')).value, 7);
assert.equal(logs.find((item) => item.id.endsWith(':sleep_deep')).metadata.sleepLogId, 987);
assert(logs.every((item) => item.source === 'fitbit' && item.recordedAt === '2026-07-12T12:00:00.000Z'));
const driveSettings = buildDriveWorkspaceSettings({ health: { fitbitEnabled: true, fitbitAccessToken: 'secret', fitbitLastImportedAt: '2026-07-12T13:00:00.000Z' } });
assert.equal(driveSettings.health.fitbitEnabled, true);
assert.equal(driveSettings.health.fitbitLastImportedAt, '2026-07-12T13:00:00.000Z');
assert.equal('fitbitAccessToken' in driveSettings.health, false);

const originalFetch = globalThis.fetch;
const calls = [];
globalThis.fetch = async (url, options) => {
    calls.push({ url, authorization: options.headers.Authorization });
    return Response.json(url.includes('/sleep/') ? sleep : activity);
};
try {
    const imported = await importFitbitDay({ accessToken: 'fitbit-token', apiBase: 'https://fitbit.test/' }, '2026-07-12');
    assert.equal(imported.logs.length, 10);
    assert.deepEqual(calls.map((call) => call.url), [
        'https://fitbit.test/1/user/-/activities/date/2026-07-12.json',
        'https://fitbit.test/1.2/user/-/sleep/date/2026-07-12.json'
    ]);
    assert(calls.every((call) => call.authorization === 'Bearer fitbit-token'));
} finally {
    globalThis.fetch = originalFetch;
}

console.log(JSON.stringify({ ok: true, metrics: logs.length }, null, 2));
