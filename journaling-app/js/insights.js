import {
    normalizeHealthEntry,
    groupHealthEntriesByDay,
    summarizeHealthDay,
    computePearsonCorrelation
} from './health.js';

const DEFAULT_INSIGHT_WINDOW_DAYS = 30;

const coerceString = (value, fallback = '') => {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text || fallback;
};

const coerceNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const unique = (items) => Array.from(new Set((items || []).filter(Boolean)));

const parseDateLike = (value) => {
    if (!value && value !== 0) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const toDayKey = (value) => {
    const date = parseDateLike(value);
    return date ? date.toISOString().slice(0, 10) : '';
};

export const toWeekKey = (value) => {
    const date = parseDateLike(value);
    if (!date) return '';
    const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNumber = (day.getUTCDay() + 6) % 7;
    day.setUTCDate(day.getUTCDate() - dayNumber);
    return day.toISOString().slice(0, 10);
};

export const toMonthKey = (value) => {
    const date = parseDateLike(value);
    if (!date) return '';
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

export const groupBy = (items = [], getKey = (item) => item) => {
    const map = new Map();
    for (const item of items || []) {
        const key = getKey(item);
        if (key === undefined || key === null || key === '') continue;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
    }
    return map;
};

export const countBy = (items = [], getKey = (item) => item) => {
    const map = new Map();
    for (const item of items || []) {
        const key = getKey(item);
        if (key === undefined || key === null || key === '') continue;
        map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
};

export const sumBy = (items = [], getter = (item) => item) => {
    return (items || []).reduce((total, item) => total + coerceNumber(getter(item), 0), 0);
};

export const averageBy = (items = [], getter = (item) => item) => {
    if (!items || !items.length) return 0;
    return sumBy(items, getter) / items.length;
};

export const medianBy = (items = [], getter = (item) => item) => {
    const values = (items || []).map((item) => coerceNumber(getter(item), 0)).sort((a, b) => a - b);
    if (!values.length) return 0;
    const mid = Math.floor(values.length / 2);
    return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
};

export const percentChange = (previous, current) => {
    const prev = coerceNumber(previous, 0);
    const next = coerceNumber(current, 0);
    if (!prev) return next ? 100 : 0;
    return ((next - prev) / Math.abs(prev)) * 100;
};

export const rollingAverage = (values = [], windowSize = 7) => {
    const size = clamp(coerceNumber(windowSize, 7), 1, 3650);
    return values.map((_, index) => {
        const start = Math.max(0, index - size + 1);
        const slice = values.slice(start, index + 1);
        return averageBy(slice, (item) => item);
    });
};

export const normalizeRecord = (record = {}) => {
    const input = record && typeof record === 'object' ? record : {};
    return {
        ...input,
        id: coerceString(input.id, ''),
        type: coerceString(input.type, 'note'),
        title: coerceString(input.title, ''),
        at: coerceString(input.at || input.date || input.createdAt, input.createdAt || new Date().toISOString()),
        tags: unique(Array.isArray(input.tags) ? input.tags.map((tag) => coerceString(tag, '')) : []),
        people: unique(Array.isArray(input.people) ? input.people.map((person) => coerceString(person, '')) : []),
        durationMinutes: coerceNumber(input.durationMinutes, 0),
        value: coerceNumber(input.value, 0)
    };
};

export const buildTimeSeries = (records = [], options = {}) => {
    const input = options && typeof options === 'object' ? options : {};
    const dateKey = coerceString(input.dateKey, 'at');
    const period = coerceString(input.period, 'day');
    const valueKey = coerceString(input.valueKey, 'value');
    const groupKey = coerceString(input.groupKey, '');
    const reducer = coerceString(input.reducer, 'sum');
    const limit = clamp(coerceNumber(input.limit, DEFAULT_INSIGHT_WINDOW_DAYS), 1, 3650);

    const normalized = (records || []).map((record) => normalizeRecord(record));
    const grouped = groupKey
        ? groupBy(normalized, (record) => coerceString(record[groupKey], 'unknown'))
        : groupBy(normalized, (record) => {
            const date = record[dateKey] || record.at || record.createdAt;
            if (period === 'week') return toWeekKey(date);
            if (period === 'month') return toMonthKey(date);
            return toDayKey(date);
        });

    const series = Array.from(grouped.entries()).map(([key, items]) => {
        let value = 0;
        if (reducer === 'count') value = items.length;
        else if (reducer === 'avg') value = averageBy(items, (item) => item[valueKey]);
        else if (reducer === 'median') value = medianBy(items, (item) => item[valueKey]);
        else if (reducer === 'sum') value = sumBy(items, (item) => item[valueKey]);
        else if (reducer === 'duration') value = sumBy(items, (item) => item.durationMinutes);
        else value = sumBy(items, (item) => item[valueKey]);
        return { key, value, count: items.length, items };
    });

    series.sort((a, b) => String(a.key).localeCompare(String(b.key)));
    return series.slice(-limit);
};

export const buildCategorySeries = (records = [], options = {}) => {
    const input = options && typeof options === 'object' ? options : {};
    const field = coerceString(input.field, 'tags');
    const reducer = coerceString(input.reducer, 'count');
    const limit = clamp(coerceNumber(input.limit, 20), 1, 100);
    const normalized = (records || []).map((record) => normalizeRecord(record));
    const counts = new Map();
    const itemsByKey = new Map();

    for (const record of normalized) {
        const values = Array.isArray(record[field]) ? record[field] : (record[field] ? [record[field]] : []);
        for (const value of values.map((item) => coerceString(item, '')).filter(Boolean)) {
            if (!counts.has(value)) counts.set(value, 0);
            if (!itemsByKey.has(value)) itemsByKey.set(value, []);
            counts.set(value, counts.get(value) + 1);
            itemsByKey.get(value).push(record);
        }
    }

    const series = Array.from(counts.entries()).map(([key, count]) => {
        const items = itemsByKey.get(key) || [];
        const value = reducer === 'avg'
            ? averageBy(items, (item) => item[coerceString(input.valueKey, 'value')])
            : reducer === 'sum'
                ? sumBy(items, (item) => item[coerceString(input.valueKey, 'value')])
                : reducer === 'duration'
                    ? sumBy(items, (item) => item.durationMinutes)
                    : count;
        return { key, value, count, items };
    });

    series.sort((a, b) => b.value - a.value || String(a.key).localeCompare(String(b.key)));
    return series.slice(0, limit);
};

export const computeStreak = (records = [], options = {}) => {
    const input = options && typeof options === 'object' ? options : {};
    const dateKey = coerceString(input.dateKey, 'at');
    const predicate = typeof input.predicate === 'function' ? input.predicate : () => true;
    const normalized = (records || []).map((record) => normalizeRecord(record)).filter(predicate);
    const days = unique(normalized.map((record) => toDayKey(record[dateKey] || record.at || record.createdAt)).filter(Boolean)).sort();
    if (!days.length) {
        return { current: 0, longest: 0, days: [] };
    }
    let current = 1;
    let longest = 1;
    let run = 1;
    for (let i = 1; i < days.length; i += 1) {
        const prev = new Date(`${days[i - 1]}T00:00:00Z`).getTime();
        const next = new Date(`${days[i]}T00:00:00Z`).getTime();
        if (next - prev === 86400000) {
            run += 1;
            longest = Math.max(longest, run);
        } else {
            run = 1;
        }
    }
    const last = days[days.length - 1];
    const previous = days[days.length - 2];
    if (previous) {
        const prev = new Date(`${previous}T00:00:00Z`).getTime();
        const next = new Date(`${last}T00:00:00Z`).getTime();
        current = next - prev === 86400000 ? 2 : 1;
    }
    if (days.length > 2) {
        let trailingRun = 1;
        for (let i = days.length - 1; i > 0; i -= 1) {
            const prev = new Date(`${days[i - 1]}T00:00:00Z`).getTime();
            const next = new Date(`${days[i]}T00:00:00Z`).getTime();
            if (next - prev === 86400000) trailingRun += 1;
            else break;
        }
        current = trailingRun;
    }
    return { current, longest, days };
};

export const comparePeriods = (records = [], options = {}) => {
    const input = options && typeof options === 'object' ? options : {};
    const period = coerceString(input.period, 'day');
    const valueKey = coerceString(input.valueKey, 'value');
    const dateKey = coerceString(input.dateKey, 'at');
    const normalized = (records || []).map((record) => normalizeRecord(record));
    const grouped = buildTimeSeries(normalized, { period, valueKey, dateKey, reducer: 'sum' });
    if (grouped.length < 2) {
        return { current: grouped[0]?.value || 0, previous: 0, change: 0 };
    }
    const current = grouped[grouped.length - 1].value;
    const previous = grouped[grouped.length - 2].value;
    return {
        current,
        previous,
        change: percentChange(previous, current)
    };
};

export const buildInsightCards = (records = [], options = {}) => {
    const input = options && typeof options === 'object' ? options : {};
    const normalized = (records || []).map((record) => normalizeRecord(record));
    const dateKey = coerceString(input.dateKey, 'at');
    const currentWindow = clamp(coerceNumber(input.windowDays, DEFAULT_INSIGHT_WINDOW_DAYS), 1, 3650);
    const byType = countBy(normalized, (record) => record.type);
    const tags = buildCategorySeries(normalized, { field: 'tags', limit: 8, reducer: 'count' });
    const people = buildCategorySeries(normalized, { field: 'people', limit: 8, reducer: 'count' });
    const timeSeries = buildTimeSeries(normalized, { period: 'day', dateKey, valueKey: 'value', reducer: 'sum', limit: currentWindow });
    const durationSeries = buildTimeSeries(normalized, { period: 'day', dateKey, valueKey: 'durationMinutes', reducer: 'duration', limit: currentWindow });
    const streak = computeStreak(normalized, { dateKey, predicate: (record) => Boolean(record.title || record.value || record.durationMinutes) });

    const latest = normalized[normalized.length - 1] || null;
    const totalDuration = sumBy(normalized, (record) => record.durationMinutes);
    const totalValue = sumBy(normalized, (record) => record.value);

    return [
        { id: 'entries', label: 'Entries', value: normalized.length },
        { id: 'total-value', label: 'Value', value: totalValue },
        { id: 'duration', label: 'Duration', value: totalDuration, unit: 'min' },
        { id: 'streak', label: 'Streak', value: streak.current, unit: 'days' },
        { id: 'latest-type', label: 'Latest type', value: latest?.type || 'none' },
        { id: 'tags', label: 'Top tags', value: tags.slice(0, 3).map((item) => item.key).join(', ') || 'none' }
    ].map((card) => ({
        ...card,
        types: Object.fromEntries(byType.entries()),
        people: people.slice(0, 3),
        tags: tags.slice(0, 3),
        trends: {
            values: timeSeries,
            duration: durationSeries,
            change: comparePeriods(normalized, { dateKey, valueKey: 'value', period: 'day' })
        }
    }));
};

export const buildChartSeries = (records = [], options = {}) => {
    const input = options && typeof options === 'object' ? options : {};
    const kind = coerceString(input.kind, 'line');
    const dateKey = coerceString(input.dateKey, 'at');
    const period = coerceString(input.period, 'day');
    const valueKey = coerceString(input.valueKey, 'value');
    const groupKey = coerceString(input.groupKey, '');
    if (kind === 'bar' || groupKey) {
        const series = buildCategorySeries(records, {
            field: groupKey || 'tags',
            valueKey,
            reducer: coerceString(input.reducer, 'count'),
            limit: input.limit || 10
        });
        return {
            kind: 'bar',
            series: series.map((item) => ({ label: item.key, value: item.value, count: item.count, items: item.items }))
        };
    }
    const series = buildTimeSeries(records, {
        dateKey,
        period,
        valueKey,
        reducer: coerceString(input.reducer, 'sum'),
        limit: input.limit || DEFAULT_INSIGHT_WINDOW_DAYS
    });
    return {
        kind: 'line',
        series: series.map((item) => ({ label: item.key, value: item.value, count: item.count, items: item.items }))
    };
};

export const buildDashboardModel = (records = [], options = {}) => {
    const input = options && typeof options === 'object' ? options : {};
    const normalized = (records || []).map((record) => normalizeRecord(record));
    const dateKey = coerceString(input.dateKey, 'at');
    const cards = buildInsightCards(normalized, input);
    const charts = Array.isArray(input.charts)
        ? input.charts.map((chart) => ({
            ...chart,
            data: buildChartSeries(normalized, chart)
        }))
        : [
            {
                id: 'timeline',
                label: 'Timeline',
                data: buildChartSeries(normalized, { kind: 'line', dateKey, valueKey: 'value', period: 'day', reducer: 'sum' })
            },
            {
                id: 'activity',
                label: 'Activity',
                data: buildChartSeries(normalized, { kind: 'bar', groupKey: 'type', valueKey: 'value', reducer: 'count' })
            }
        ];

    return {
        total: normalized.length,
        cards,
        charts,
        topTags: buildCategorySeries(normalized, { field: 'tags', reducer: 'count', limit: 10 }),
        topPeople: buildCategorySeries(normalized, { field: 'people', reducer: 'count', limit: 10 }),
        streak: computeStreak(normalized, { dateKey }),
        comparison: comparePeriods(normalized, { dateKey, valueKey: 'value', period: 'day' })
    };
};

export const buildHealthInsightModel = (entries = [], options = {}) => {
    const normalized = (entries || []).map((entry) => normalizeHealthEntry(entry));
    const byDay = groupHealthEntriesByDay(normalized);
    const days = Array.from(byDay.keys()).sort();
    const summaries = days.map((day) => ({ day, summary: summarizeHealthDay(byDay.get(day) || []) }));
    const moodSeries = summaries.map((item) => item.summary.averageMood ?? 0);
    const severitySeries = summaries.map((item) => item.summary.averageSeverity ?? 0);
    const correlations = {
        moodVsSeverity: computePearsonCorrelation(moodSeries, severitySeries)
    };

    return {
        days: summaries,
        cards: [
            { id: 'health-total', label: 'Health entries', value: normalized.length },
            { id: 'health-days', label: 'Tracked days', value: summaries.length },
            { id: 'health-mood', label: 'Average mood', value: summaries.length ? averageBy(moodSeries, (value) => value) : 0 },
            { id: 'health-severity', label: 'Average severity', value: summaries.length ? averageBy(severitySeries, (value) => value) : 0 }
        ],
        correlations,
        charts: [
            {
                id: 'health-mood',
                label: 'Mood',
                data: {
                    kind: 'line',
                    series: summaries.map((item) => ({ label: item.day, value: item.summary.averageMood ?? 0 }))
                }
            },
            {
                id: 'health-severity',
                label: 'Severity',
                data: {
                    kind: 'line',
                    series: summaries.map((item) => ({ label: item.day, value: item.summary.averageSeverity ?? 0 }))
                }
            }
        ],
        options
    };
};

export const insightsModule = Object.freeze({
    DEFAULT_INSIGHT_WINDOW_DAYS,
    toDayKey,
    toWeekKey,
    toMonthKey,
    groupBy,
    countBy,
    sumBy,
    averageBy,
    medianBy,
    percentChange,
    rollingAverage,
    normalizeRecord,
    buildTimeSeries,
    buildCategorySeries,
    computeStreak,
    comparePeriods,
    buildInsightCards,
    buildChartSeries,
    buildDashboardModel,
    buildHealthInsightModel
});

export default insightsModule;
