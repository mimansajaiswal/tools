const DEFAULT_API_BASE = 'https://api.fitbit.com';

const text = (value = '') => String(value || '').trim();
const number = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

function metric(date, key, title, value, unit, metadata = {}) {
    return {
        id: `fitbit:${date}:${key}`,
        kind: 'measurement',
        title,
        value,
        unit,
        recordedAt: `${date}T12:00:00.000Z`,
        source: 'fitbit',
        tags: ['fitbit', key],
        notes: '',
        linkedDocumentId: '',
        metadata: {
            sourcePlatform: 'fitbit',
            sourceMetric: key,
            sourceDate: date,
            ...metadata
        }
    };
}

async function fitbitRequest(accessToken, endpoint, apiBase) {
    const response = await fetch(`${apiBase}${endpoint}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
        let message = await response.text();
        try {
            const parsed = JSON.parse(message);
            message = parsed.errors?.[0]?.message || parsed.error?.message || message;
        } catch {}
        throw new Error(message || `Fitbit request failed with ${response.status}`);
    }
    return response.json();
}

export function buildFitbitHealthLogs(date, activityPayload = {}, sleepPayload = {}) {
    const logs = [];
    const activity = activityPayload.summary || {};
    const sleep = sleepPayload.summary || {};
    const mainSleep = (Array.isArray(sleepPayload.sleep) ? sleepPayload.sleep : []).find((item) => item?.isMainSleep) || null;
    const add = (key, title, value, unit, metadata) => {
        const numeric = number(value);
        if (numeric !== null) logs.push(metric(date, key, title, numeric, unit, metadata));
    };

    add('steps', 'Steps', activity.steps, 'count');
    add('calories_out', 'Calories burned', activity.caloriesOut, 'kcal');
    const fairlyActiveMinutes = number(activity.fairlyActiveMinutes);
    const veryActiveMinutes = number(activity.veryActiveMinutes);
    if (fairlyActiveMinutes !== null || veryActiveMinutes !== null) {
        add('active_minutes', 'Active minutes', (fairlyActiveMinutes || 0) + (veryActiveMinutes || 0), 'minutes');
    }
    add('resting_heart_rate', 'Resting heart rate', activity.restingHeartRate, 'bpm');
    add('sleep_duration', 'Sleep duration', number(sleep.totalMinutesAsleep) === null ? null : number(sleep.totalMinutesAsleep) / 60, 'hours');
    add('sleep_efficiency', 'Sleep efficiency', mainSleep?.efficiency, 'percent');

    const stages = mainSleep?.levels?.summary || {};
    for (const [stage, label] of [['deep', 'Deep sleep'], ['light', 'Light sleep'], ['rem', 'REM sleep'], ['wake', 'Awake during sleep']]) {
        add(`sleep_${stage}`, label, stages[stage]?.minutes, 'minutes', { sleepLogId: mainSleep?.logId || '' });
    }
    return logs;
}

export async function importFitbitDay(settings = {}, date = new Date().toISOString().slice(0, 10)) {
    const accessToken = text(settings.accessToken);
    if (!accessToken) throw new Error('Missing Fitbit access token');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Fitbit import date must use YYYY-MM-DD');
    const apiBase = text(settings.apiBase).replace(/\/$/, '') || DEFAULT_API_BASE;
    const [activity, sleep] = await Promise.all([
        fitbitRequest(accessToken, `/1/user/-/activities/date/${date}.json`, apiBase),
        fitbitRequest(accessToken, `/1.2/user/-/sleep/date/${date}.json`, apiBase)
    ]);
    return {
        date,
        logs: buildFitbitHealthLogs(date, activity, sleep),
        importedAt: new Date().toISOString()
    };
}
