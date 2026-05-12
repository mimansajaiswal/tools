const HEALTH_ENTRY_TYPES = Object.freeze([
    'symptom',
    'factor',
    'medication',
    'treatment',
    'measurement',
    'mood',
    'sleep',
    'note'
]);

const DEFAULT_HEALTH_METRIC_DEFINITIONS = Object.freeze([
    { key: 'mood', label: 'Mood', unit: 'score', direction: 'higher-is-better' },
    { key: 'energy', label: 'Energy', unit: 'score', direction: 'higher-is-better' },
    { key: 'sleepHours', label: 'Sleep', unit: 'hours', direction: 'higher-is-better' },
    { key: 'steps', label: 'Steps', unit: 'count', direction: 'higher-is-better' },
    { key: 'restingHeartRate', label: 'Resting heart rate', unit: 'bpm', direction: 'lower-is-better' },
    { key: 'hrv', label: 'HRV', unit: 'ms', direction: 'higher-is-better' }
]);

const createId = (prefix = 'hl') => `${prefix}_${crypto.randomUUID()}`;
const nowIso = () => new Date().toISOString();
const coerceString = (value, fallback = '') => {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text || fallback;
};
const coerceNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};
const coerceBoolean = (value, fallback = false) => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const text = String(value).trim().toLowerCase();
    if (!text) return fallback;
    return ['1', 'true', 'yes', 'on'].includes(text);
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const unique = (items) => Array.from(new Set((items || []).filter(Boolean)));

const toDayKey = (value) => {
    const date = value instanceof Date ? value : new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
};

const normalizeType = (raw, fallback = 'note') => {
    const text = coerceString(raw, fallback);
    return HEALTH_ENTRY_TYPES.includes(text) ? text : fallback;
};

export const normalizeSeverity = (value, fallback = 0) => {
    const num = coerceNumber(value, fallback);
    return clamp(Math.round(num), 0, 5);
};

export const normalizeMood = (value, fallback = 0) => {
    const num = coerceNumber(value, fallback);
    return clamp(Math.round(num), 1, 10);
};

export const normalizeHealthTags = (tags = []) => unique(Array.isArray(tags) ? tags.map((tag) => coerceString(tag, '')) : []);

export const createHealthMetricDefinition = (raw = {}) => {
    const input = raw && typeof raw === 'object' ? raw : {};
    return {
        key: coerceString(input.key, createId('metric')),
        label: coerceString(input.label, 'Metric'),
        unit: coerceString(input.unit, ''),
        direction: coerceString(input.direction, 'higher-is-better'),
        color: coerceString(input.color, ''),
        kind: coerceString(input.kind, 'measurement')
    };
};

export const createHealthEntry = (raw = {}) => {
    const input = raw && typeof raw === 'object' ? raw : {};
    const createdAt = coerceString(input.createdAt, nowIso());
    const at = coerceString(input.at, createdAt);
    const type = normalizeType(input.type, 'note');
    return {
        id: coerceString(input.id, createId('hl')),
        type,
        at,
        createdAt,
        updatedAt: coerceString(input.updatedAt, createdAt),
        title: coerceString(input.title, ''),
        note: coerceString(input.note, ''),
        value: coerceNumber(input.value, 0),
        unit: coerceString(input.unit, ''),
        severity: normalizeSeverity(input.severity, 0),
        mood: input.mood === undefined ? null : normalizeMood(input.mood, 5),
        energy: input.energy === undefined ? null : normalizeSeverity(input.energy, 0),
        durationMinutes: clamp(coerceNumber(input.durationMinutes, 0), 0, Number.MAX_SAFE_INTEGER),
        count: clamp(coerceNumber(input.count, 1), 1, Number.MAX_SAFE_INTEGER),
        status: coerceString(input.status, 'recorded'),
        source: coerceString(input.source, 'manual'),
        sourceId: coerceString(input.sourceId, ''),
        documentId: coerceString(input.documentId, ''),
        linkedDocumentId: coerceString(input.linkedDocumentId, ''),
        metricKey: coerceString(input.metricKey, ''),
        symptom: coerceString(input.symptom, ''),
        factor: coerceString(input.factor, ''),
        medication: coerceString(input.medication, ''),
        treatment: coerceString(input.treatment, ''),
        dosage: coerceString(input.dosage, ''),
        tags: normalizeHealthTags(input.tags || []),
        contexts: normalizeHealthTags(input.contexts || []),
        notes: Array.isArray(input.notes) ? input.notes.map((entry) => coerceString(entry, '')).filter(Boolean) : [],
        metadata: input.metadata && typeof input.metadata === 'object' ? { ...input.metadata } : {},
        sourcePlatform: coerceString(input.sourcePlatform, ''),
        sourceMetric: coerceString(input.sourceMetric, ''),
        sourceRecordId: coerceString(input.sourceRecordId, '')
    };
};

export const createSymptomLog = (raw = {}) => createHealthEntry({ ...raw, type: 'symptom' });
export const createFactorLog = (raw = {}) => createHealthEntry({ ...raw, type: 'factor' });
export const createMedicationLog = (raw = {}) => createHealthEntry({ ...raw, type: 'medication' });
export const createTreatmentLog = (raw = {}) => createHealthEntry({ ...raw, type: 'treatment' });
export const createMeasurementLog = (raw = {}) => createHealthEntry({ ...raw, type: 'measurement' });

export const normalizeHealthEntry = (raw = {}) => {
    const entry = createHealthEntry(raw);
    entry.type = normalizeType(raw.type, entry.type);
    entry.severity = normalizeSeverity(raw.severity, entry.severity);
    entry.mood = raw.mood === undefined ? entry.mood : normalizeMood(raw.mood, entry.mood ?? 5);
    entry.energy = raw.energy === undefined ? entry.energy : normalizeSeverity(raw.energy, entry.energy ?? 0);
    entry.durationMinutes = clamp(coerceNumber(raw.durationMinutes, entry.durationMinutes), 0, Number.MAX_SAFE_INTEGER);
    entry.count = clamp(coerceNumber(raw.count, entry.count), 1, Number.MAX_SAFE_INTEGER);
    entry.tags = normalizeHealthTags(raw.tags || entry.tags);
    entry.contexts = normalizeHealthTags(raw.contexts || entry.contexts);
    return entry;
};

export const groupHealthEntriesByDay = (entries = [], dateKey = 'at') => {
    const groups = new Map();
    for (const raw of entries || []) {
        const entry = normalizeHealthEntry(raw);
        const key = toDayKey(entry[dateKey] || entry.at || entry.createdAt);
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(entry);
    }
    return groups;
};

const average = (values) => {
    const filtered = values.filter((value) => Number.isFinite(value));
    if (!filtered.length) return 0;
    return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
};

const sum = (values) => values.filter((value) => Number.isFinite(value)).reduce((acc, value) => acc + value, 0);

export const summarizeHealthDay = (entries = []) => {
    const list = (entries || []).map((entry) => normalizeHealthEntry(entry));
    const symptoms = list.filter((entry) => entry.type === 'symptom');
    const factors = list.filter((entry) => entry.type === 'factor');
    const medications = list.filter((entry) => entry.type === 'medication');
    const treatments = list.filter((entry) => entry.type === 'treatment');
    const measurements = list.filter((entry) => entry.type === 'measurement');
    const moodEntries = list.filter((entry) => Number.isFinite(entry.mood));
    const energyEntries = list.filter((entry) => Number.isFinite(entry.energy));

    return {
        total: list.length,
        symptoms: symptoms.length,
        factors: factors.length,
        medications: medications.length,
        treatments: treatments.length,
        measurements: measurements.length,
        averageSeverity: average(list.map((entry) => entry.severity)),
        averageMood: moodEntries.length ? average(moodEntries.map((entry) => entry.mood)) : null,
        averageEnergy: energyEntries.length ? average(energyEntries.map((entry) => entry.energy)) : null,
        totalDurationMinutes: sum(list.map((entry) => entry.durationMinutes)),
        tags: unique(list.flatMap((entry) => entry.tags)),
        topSymptoms: symptoms.reduce((acc, entry) => {
            const key = entry.symptom || entry.title || 'Symptom';
            acc.set(key, (acc.get(key) || 0) + 1);
            return acc;
        }, new Map()),
        topFactors: factors.reduce((acc, entry) => {
            const key = entry.factor || entry.title || 'Factor';
            acc.set(key, (acc.get(key) || 0) + 1);
            return acc;
        }, new Map())
    };
};

export const aggregateHealthSeries = (entries = [], options = {}) => {
    const input = options && typeof options === 'object' ? options : {};
    const dateKey = coerceString(input.dateKey, 'at');
    const valueKey = coerceString(input.valueKey, 'value');
    const reducer = coerceString(input.reducer, 'sum');
    const groupKey = coerceString(input.groupKey, '');

    const buckets = new Map();
    for (const raw of entries || []) {
        const entry = normalizeHealthEntry(raw);
        const bucketKey = groupKey ? coerceString(entry[groupKey], 'unknown') : toDayKey(entry[dateKey] || entry.at || entry.createdAt);
        if (!bucketKey) continue;
        if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
        buckets.get(bucketKey).push(entry);
    }

    return Array.from(buckets.entries()).map(([key, bucketEntries]) => {
        const numericValues = bucketEntries.map((entry) => coerceNumber(entry[valueKey], Number.isFinite(entry[valueKey]) ? entry[valueKey] : 0));
        const severityValues = bucketEntries.map((entry) => entry.severity);
        const moodValues = bucketEntries.map((entry) => entry.mood).filter((value) => Number.isFinite(value));
        let value = 0;
        if (reducer === 'count') value = bucketEntries.length;
        else if (reducer === 'avg') value = average(numericValues);
        else if (reducer === 'max') value = Math.max(...numericValues, 0);
        else if (reducer === 'min') value = Math.min(...numericValues, 0);
        else if (reducer === 'severity') value = average(severityValues);
        else if (reducer === 'mood') value = moodValues.length ? average(moodValues) : 0;
        else value = sum(numericValues);

        return {
            key,
            value,
            count: bucketEntries.length,
            entries: bucketEntries,
            summary: summarizeHealthDay(bucketEntries)
        };
    });
};

export const computePearsonCorrelation = (left = [], right = []) => {
    const xs = [];
    const ys = [];
    const length = Math.min(left.length, right.length);
    for (let i = 0; i < length; i += 1) {
        const x = Number(left[i]);
        const y = Number(right[i]);
        if (Number.isFinite(x) && Number.isFinite(y)) {
            xs.push(x);
            ys.push(y);
        }
    }
    if (xs.length < 2) return 0;
    const xMean = average(xs);
    const yMean = average(ys);
    let numerator = 0;
    let xDenom = 0;
    let yDenom = 0;
    for (let i = 0; i < xs.length; i += 1) {
        const dx = xs[i] - xMean;
        const dy = ys[i] - yMean;
        numerator += dx * dy;
        xDenom += dx * dx;
        yDenom += dy * dy;
    }
    const denominator = Math.sqrt(xDenom * yDenom);
    return denominator ? numerator / denominator : 0;
};

export const computeHealthCorrelations = (entries = [], options = {}) => {
    const input = options && typeof options === 'object' ? options : {};
    const windowDays = clamp(coerceNumber(input.windowDays, 30), 2, 3650);
    const lookbackDays = clamp(coerceNumber(input.lookbackDays, windowDays), 2, 3650);
    const list = (entries || []).map((entry) => normalizeHealthEntry(entry));
    const byDay = groupHealthEntriesByDay(list);
    const dayKeys = Array.from(byDay.keys()).sort();
    const selectedDays = dayKeys.slice(-lookbackDays);

    const moodSeries = [];
    const symptomSeries = new Map();
    const factorSeries = new Map();

    for (const day of selectedDays) {
        const dayEntries = byDay.get(day) || [];
        const summary = summarizeHealthDay(dayEntries);
        moodSeries.push(summary.averageMood ?? 0);
        const symptomBuckets = new Map();
        const factorBuckets = new Map();
        for (const entry of dayEntries) {
            if (entry.type === 'symptom') {
                const key = entry.symptom || entry.title || 'symptom';
                if (!symptomBuckets.has(key)) symptomBuckets.set(key, []);
                symptomBuckets.get(key).push(entry.severity);
            }
            if (entry.type === 'factor') {
                const key = entry.factor || entry.title || 'factor';
                if (!factorBuckets.has(key)) factorBuckets.set(key, []);
                factorBuckets.get(key).push(entry.value || entry.severity || 1);
            }
        }
        for (const [key, values] of symptomBuckets.entries()) {
            if (!symptomSeries.has(key)) symptomSeries.set(key, []);
            symptomSeries.get(key).push(average(values));
        }
        for (const [key, values] of factorBuckets.entries()) {
            if (!factorSeries.has(key)) factorSeries.set(key, []);
            factorSeries.get(key).push(average(values));
        }
        for (const [key, values] of symptomSeries.entries()) {
            if (values.length < moodSeries.length) values.push(0);
        }
        for (const [key, values] of factorSeries.entries()) {
            if (values.length < moodSeries.length) values.push(0);
        }
    }

    const symptomCorrelations = Array.from(symptomSeries.entries()).map(([name, values]) => ({
        name,
        correlationWithMood: computePearsonCorrelation(values, moodSeries)
    })).sort((a, b) => Math.abs(b.correlationWithMood) - Math.abs(a.correlationWithMood));

    const factorCorrelations = Array.from(factorSeries.entries()).map(([name, values]) => ({
        name,
        correlationWithMood: computePearsonCorrelation(values, moodSeries)
    })).sort((a, b) => Math.abs(b.correlationWithMood) - Math.abs(a.correlationWithMood));

    return {
        windowDays,
        lookbackDays,
        symptomCorrelations,
        factorCorrelations,
        moodSeries,
        byDay: selectedDays.map((day) => ({
            day,
            summary: summarizeHealthDay(byDay.get(day) || [])
        }))
    };
};

export const buildHealthDashboard = (entries = [], options = {}) => {
    const list = (entries || []).map((entry) => normalizeHealthEntry(entry));
    const byDay = groupHealthEntriesByDay(list);
    const days = Array.from(byDay.keys()).sort();
    const daily = days.map((day) => ({ day, summary: summarizeHealthDay(byDay.get(day) || []) }));
    const metrics = aggregateHealthSeries(list, { reducer: 'avg', valueKey: 'severity' });
    const counts = aggregateHealthSeries(list, { reducer: 'count' });
    const correlations = computeHealthCorrelations(list, options);

    return {
        totalEntries: list.length,
        daily,
        counts,
        metrics,
        correlations,
        latestDay: daily[daily.length - 1] || null
    };
};

export const healthModule = Object.freeze({
    HEALTH_ENTRY_TYPES,
    DEFAULT_HEALTH_METRIC_DEFINITIONS,
    normalizeSeverity,
    normalizeMood,
    normalizeHealthTags,
    createHealthMetricDefinition,
    createHealthEntry,
    createSymptomLog,
    createFactorLog,
    createMedicationLog,
    createTreatmentLog,
    createMeasurementLog,
    normalizeHealthEntry,
    groupHealthEntriesByDay,
    summarizeHealthDay,
    aggregateHealthSeries,
    computePearsonCorrelation,
    computeHealthCorrelations,
    buildHealthDashboard
});

export default healthModule;
