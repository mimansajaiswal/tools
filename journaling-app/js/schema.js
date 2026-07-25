export const APP_NAME = 'Journaling';
export const APP_SCOPE = 'journaling-app';
export const DB_NAME = 'JournalingAppDB';
export const DB_VERSION = 2;

export const STORAGE_KEYS = Object.freeze({
    settings: `${APP_SCOPE}:settings:v2`,
    syncState: `${APP_SCOPE}:sync-state:v2`
});

export const STORE_NAMES = Object.freeze({
    documents: 'documents',
    healthLogs: 'healthLogs',
    assets: 'assets',
    views: 'views',
    settings: 'settings',
    syncQueue: 'syncQueue',
    meta: 'meta'
});

const DEFAULT_CUSTOM_FIELDS = Object.freeze([
    {
        id: 'field_focus',
        key: 'focus',
        label: 'Focus',
        type: 'options',
        prefixes: ['focus:'],
        options: ['writing', 'health', 'relationships', 'work', 'travel'],
        multiple: false,
        max: null
    },
    {
        id: 'field_state',
        key: 'state',
        label: 'State',
        type: 'rating',
        prefixes: ['state:', 'rate:'],
        options: [],
        multiple: false,
        max: 5
    },
    {
        id: 'field_context',
        key: 'context',
        label: 'Context',
        type: 'options',
        prefixes: ['context:'],
        options: ['home', 'studio', 'outside', 'travel', 'quiet'],
        multiple: true,
        max: null
    }
]);

const DEFAULT_JOURNALS = Object.freeze([
    {
        id: 'journal_personal',
        name: 'Personal',
        color: '',
        description: 'Daily writing, memory, people, and highlights.',
        icon: '✎'
    },
    {
        id: 'journal_lab',
        name: 'Practice',
        color: '',
        description: 'Ideas, experiments, product notes, and AI workflows.',
        icon: '◫'
    },
    {
        id: 'journal_health',
        name: 'Health',
        color: '',
        description: 'Symptoms, recovery, body signals, and treatments.',
        icon: '•'
    },
    {
        id: 'journal_field',
        name: 'Field',
        color: '',
        description: 'Travel, map-linked entries, and environmental notes.',
        icon: '◉'
    }
]);

const DEFAULT_TEMPLATES = Object.freeze([
    {
        id: 'template_daily_reset',
        name: 'Daily reset',
        journalId: 'journal_personal',
        tags: ['today', 'reset'],
        body: 'Heading: What feels true right now?\nParagraph: \nHeading: What deserves attention?\nBullet: \nBullet: \nHeading: One thing to protect\nParagraph: '
    },
    {
        id: 'template_weekly_review',
        name: 'Weekly review',
        journalId: 'journal_personal',
        tags: ['review', 'weekly'],
        body: 'Heading: What moved forward?\nBullet: \nHeading: What felt heavy?\nBullet: \nHeading: What do I want more of next week?\nBullet: '
    },
    {
        id: 'template_meeting_note',
        name: 'Meeting note',
        journalId: 'journal_lab',
        tags: ['meeting', 'notes'],
        body: 'Heading: Context\nParagraph: \nHeading: Decisions\nBullet: \nHeading: Follow-ups\nChecklist: '
    }
]);

const DEFAULT_REMINDERS = Object.freeze([
    {
        id: 'reminder_morning',
        title: 'Morning pages',
        journalId: 'journal_personal',
        date: '',
        time: '07:30',
        frequency: 'daily',
        active: true
    },
    {
        id: 'reminder_weekly',
        title: 'Weekly review',
        journalId: 'journal_personal',
        date: '',
        time: '19:00',
        frequency: 'weekly',
        weekday: 1,
        active: true
    }
]);

const DEFAULT_SAVED_SEARCHES = Object.freeze([
    { id: 'search_highlights', name: 'Highlights', query: 'highlighted:true' },
    { id: 'search_favorites', name: 'Favorites', query: 'favorite:true' },
    { id: 'search_health', name: 'Health notes', query: 'journal:health' }
]);

export const DEFAULT_SETTINGS = Object.freeze({
    version: 2,
    showRightPanel: false,
    activeJournalId: 'journal_personal',
    journals: DEFAULT_JOURNALS,
    templates: DEFAULT_TEMPLATES,
    reminders: DEFAULT_REMINDERS,
    notifications: {
        enabled: false,
        periodicRegistered: false,
        permission: 'default'
    },
    drive: {
        enabled: false,
        clientId: '',
        accessToken: '',
        rootFolderId: '',
        rootFolderName: APP_NAME,
        assetsFolderId: '',
        libraryManifestId: '',
        libraryManifestUrl: '',
        lastFileUrl: '',
        lastConnectedAt: null,
        lastPullAt: null,
        syncMode: 'background',
        mediaStrategy: 'optimized',
        audioStrategy: 'keep-original'
    },
    notion: {
        enabled: false,
        workerUrl: '',
        authToken: '',
        proxyToken: '',
        parentPageId: '',
        lastSyncedAt: null,
        lastPageUrl: ''
    },
    editor: {
        blockBehavior: 'notion-like',
        quickAddInline: true,
        customFields: DEFAULT_CUSTOM_FIELDS,
        savedSearches: DEFAULT_SAVED_SEARCHES
    },
    ai: {
        provider: 'local-reflection',
        apiKey: '',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: '',
        transcriptionProvider: 'browser_native',
        transcriptionApiKey: '',
        transcriptionEndpoint: '',
        transcriptionModel: '',
        transcriptionLanguage: 'en-US',
        transcriptionInstructions: 'Transcribe accurately, remove filler words, and preserve speaker changes when clear.',
        transcriptionInsertMode: 'collapsible',
        dailyChatInstruction: 'Reflect gently, notice patterns, and suggest one next action.'
    },
    health: {
        fitbitEnabled: false,
        fitbitAccessToken: '',
        fitbitLastImportedAt: null,
        googleFitEnabled: false,
        appleHealthBridgeEnabled: false
    },
    media: {
        imageMaxEdge: 2200,
        imageQuality: 0.82,
        preserveOriginalImages: false,
        preserveOriginalVideo: true
    }
});

export const DEFAULT_SYNC_STATE = Object.freeze({
    version: 2,
    provider: 'google-drive',
    status: 'idle',
    lastSyncAt: null,
    lastPushAt: null,
    lastPullAt: null,
    lastError: null,
    rootFolderId: '',
    folderMap: {},
    remoteFingerprints: {},
    pendingDocumentIds: [],
    pendingAssetIds: []
});

export const DEFAULT_VIEW = Object.freeze({
    id: '',
    type: 'list',
    name: '',
    query: {},
    createdAt: '',
    updatedAt: ''
});

export const DEFAULT_DOCUMENT = Object.freeze({
    id: '',
    type: 'entry',
    journalId: 'journal_personal',
    templateId: '',
    title: '',
    content: '',
    createdAt: '',
    updatedAt: '',
    date: '',
    startAt: '',
    endAt: '',
    durationMinutes: null,
    status: 'today',
    highlighted: false,
    favorite: false,
    pinned: false,
    tags: [],
    people: [],
    categories: [],
    attachments: [],
    blocks: [],
    linkedDocumentIds: [],
    transcripts: [],
    locationName: '',
    latitude: null,
    longitude: null,
    weather: '',
    activity: '',
    music: '',
    mood: null,
    energy: null,
    reminderAt: '',
    reminderLabel: '',
    summary: '',
    smartTitle: '',
    customFields: {},
    metadata: {},
    archived: false
});

export const DEFAULT_HEALTH_LOG = Object.freeze({
    id: '',
    kind: 'symptom',
    title: '',
    value: null,
    unit: '',
    recordedAt: '',
    createdAt: '',
    updatedAt: '',
    source: 'manual',
    tags: [],
    notes: '',
    linkedDocumentId: '',
    metadata: {}
});

export const DEFAULT_ASSET = Object.freeze({
    id: '',
    documentId: '',
    kind: 'image',
    name: '',
    mimeType: '',
    size: 0,
    width: null,
    height: null,
    duration: null,
    originalName: '',
    storageMode: 'optimized',
    localStatus: 'cached',
    remoteStatus: 'pending',
    createdAt: '',
    updatedAt: '',
    checksum: '',
    previewUrl: '',
    remoteUrl: '',
    altText: '',
    metadata: {}
});

export const DEFAULT_SYNC_JOB = Object.freeze({
    id: null,
    type: 'document',
    action: 'upsert',
    targetId: '',
    status: 'queued',
    attempts: 0,
    createdAt: '',
    updatedAt: '',
    payload: {},
    error: null
});

export const FIELD_INDEXES = Object.freeze({
    documents: ['date', 'updatedAt', 'type', 'archived', 'journalId', 'highlighted'],
    healthLogs: ['kind', 'recordedAt', 'updatedAt', 'linkedDocumentId'],
    assets: ['documentId', 'kind', 'remoteStatus', 'localStatus', 'updatedAt'],
    views: ['type', 'updatedAt'],
    syncQueue: ['status', 'type', 'targetId', 'updatedAt']
});

export const nowIso = () => new Date().toISOString();

export const createId = (prefix = 'id') => {
    const rand = (globalThis.crypto?.randomUUID?.() || `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`).replace(/-/g, '');
    return `${prefix}_${rand}`;
};

const toObject = (value) => (value && typeof value === 'object' && !Array.isArray(value)) ? value : {};
const toArray = (value) => Array.isArray(value) ? value.slice() : [];
const toString = (value, fallback = '') => typeof value === 'string' ? value : fallback;
const toBoolean = (value, fallback = false) => value === undefined ? fallback : value === true;
const toNumberOrNull = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const normalizeJournal = (raw = {}) => {
    const candidate = toObject(raw);
    return {
        id: toString(candidate.id, createId('journal')),
        name: toString(candidate.name, 'Untitled journal'),
        color: toString(candidate.color, ''),
        description: toString(candidate.description, ''),
        icon: toString(candidate.icon, '✎')
    };
};

const normalizeTemplate = (raw = {}) => {
    const candidate = toObject(raw);
    return {
        id: toString(candidate.id, createId('template')),
        name: toString(candidate.name, 'Untitled template'),
        journalId: toString(candidate.journalId, ''),
        tags: toArray(candidate.tags).map((item) => String(item)),
        body: toString(candidate.body, '')
    };
};

const normalizeReminder = (raw = {}) => {
    const candidate = toObject(raw);
    return {
        id: toString(candidate.id, createId('reminder')),
        title: toString(candidate.title, 'Reminder'),
        journalId: toString(candidate.journalId, ''),
        date: toString(candidate.date, ''),
        time: toString(candidate.time, ''),
        frequency: toString(candidate.frequency, 'none'),
        weekday: candidate.weekday === null || candidate.weekday === undefined || candidate.weekday === ''
            ? null : (Number.isInteger(Number(candidate.weekday)) ? Number(candidate.weekday) : null),
        dayOfMonth: candidate.dayOfMonth === null || candidate.dayOfMonth === undefined || candidate.dayOfMonth === ''
            ? null : (Number.isInteger(Number(candidate.dayOfMonth)) ? Number(candidate.dayOfMonth) : null),
        active: candidate.active !== false
    };
};

const normalizeSavedSearch = (raw = {}) => {
    const candidate = toObject(raw);
    return {
        id: toString(candidate.id, createId('search')),
        name: toString(candidate.name, 'Saved search'),
        query: toString(candidate.query, '')
    };
};

const normalizeCustomField = (raw = {}) => {
    const candidate = toObject(raw);
    return {
        id: toString(candidate.id, createId('field')),
        key: toString(candidate.key, ''),
        label: toString(candidate.label || candidate.name, 'Field'),
        type: toString(candidate.type, 'string'),
        prefixes: toArray(candidate.prefixes).map((item) => String(item).trim()).filter(Boolean),
        options: toArray(candidate.options).map((item) => String(item).trim()).filter(Boolean),
        multiple: candidate.multiple === true,
        max: candidate.max === null || candidate.max === undefined || candidate.max === '' ? null : Number(candidate.max)
    };
};

const RICH_TEXT_BLOCK_TYPES = new Set(['paragraph', 'heading', 'bullet', 'numbered', 'checklist', 'quote', 'callout', 'toggle']);

function normalizeMark(raw = {}) {
    const candidate = toObject(raw);
    const type = toString(candidate.type, '');
    if (!type) return null;
    const mark = { type };
    if (candidate.attrs && typeof candidate.attrs === 'object' && !Array.isArray(candidate.attrs)) {
        mark.attrs = { ...candidate.attrs };
    }
    return mark;
}

function normalizeInlineNode(raw = {}) {
    const candidate = toObject(raw);
    if (toString(candidate.type, 'text') !== 'text') return null;
    const node = { type: 'text', text: toString(candidate.text, '') };
    const marks = toArray(candidate.marks).map(normalizeMark).filter(Boolean);
    if (marks.length) node.marks = marks;
    return node;
}

function normalizeRichText(value) {
    return toArray(value).map(normalizeInlineNode).filter(Boolean);
}

function normalizeBlock(raw = {}) {
    const block = { ...toObject(raw) };
    if (!block.id) block.id = createId('block');
    if (!block.type) block.type = 'paragraph';
    if (!block.richText && block.text !== undefined && RICH_TEXT_BLOCK_TYPES.has(block.type)) {
        block.richText = [{ type: 'text', text: String(block.text || '') }];
        delete block.text;
    }
    if (RICH_TEXT_BLOCK_TYPES.has(block.type)) block.richText = normalizeRichText(block.richText);
    if (block.captionRichText !== undefined) block.captionRichText = normalizeRichText(block.captionRichText);
    if (block.type === 'toggle') block.children = toArray(block.children).map(normalizeBlock);
    if (block.type === 'table') {
        block.rows = toArray(block.rows).map((row) => toArray(row).map((cell) => normalizeRichText(cell)));
    }
    return block;
}

export const normalizeSettings = (raw = {}) => {
    const candidate = toObject(raw);
    const editor = toObject(candidate.editor);
    return {
        ...DEFAULT_SETTINGS,
        ...candidate,
        activeJournalId: toString(candidate.activeJournalId, DEFAULT_SETTINGS.activeJournalId),
        journals: (Array.isArray(candidate.journals) ? candidate.journals : DEFAULT_SETTINGS.journals).map(normalizeJournal),
        templates: (Array.isArray(candidate.templates) ? candidate.templates : DEFAULT_SETTINGS.templates).map(normalizeTemplate),
        reminders: (Array.isArray(candidate.reminders) ? candidate.reminders : DEFAULT_SETTINGS.reminders).map(normalizeReminder),
        notifications: {
            ...DEFAULT_SETTINGS.notifications,
            ...toObject(candidate.notifications)
        },
        drive: {
            ...DEFAULT_SETTINGS.drive,
            ...toObject(candidate.drive)
        },
        notion: {
            ...DEFAULT_SETTINGS.notion,
            ...toObject(candidate.notion)
        },
        editor: {
            ...DEFAULT_SETTINGS.editor,
            ...editor,
            customFields: (Array.isArray(editor.customFields) ? editor.customFields : DEFAULT_SETTINGS.editor.customFields).map(normalizeCustomField),
            savedSearches: (Array.isArray(editor.savedSearches) ? editor.savedSearches : DEFAULT_SETTINGS.editor.savedSearches).map(normalizeSavedSearch)
        },
        ai: {
            ...DEFAULT_SETTINGS.ai,
            ...toObject(candidate.ai)
        },
        health: {
            ...DEFAULT_SETTINGS.health,
            ...toObject(candidate.health)
        },
        media: {
            ...DEFAULT_SETTINGS.media,
            ...toObject(candidate.media)
        },
        version: 2
    };
};

export const normalizeSyncState = (raw = {}) => {
    const candidate = toObject(raw);
    return {
        ...DEFAULT_SYNC_STATE,
        ...candidate,
        folderMap: toObject(candidate.folderMap),
        remoteFingerprints: toObject(candidate.remoteFingerprints),
        pendingDocumentIds: toArray(candidate.pendingDocumentIds),
        pendingAssetIds: toArray(candidate.pendingAssetIds),
        version: 2
    };
};

export const normalizeDocument = (raw = {}) => {
    const candidate = toObject(raw);
    return {
        ...DEFAULT_DOCUMENT,
        ...candidate,
        journalId: toString(candidate.journalId, DEFAULT_DOCUMENT.journalId),
        templateId: toString(candidate.templateId, ''),
        title: toString(candidate.title, ''),
        content: toString(candidate.content, ''),
        date: toString(candidate.date, ''),
        startAt: toString(candidate.startAt, ''),
        endAt: toString(candidate.endAt, ''),
        durationMinutes: candidate.durationMinutes === null || candidate.durationMinutes === undefined || candidate.durationMinutes === '' ? null : Number(candidate.durationMinutes),
        status: toString(candidate.status, 'today'),
        highlighted: toBoolean(candidate.highlighted, false),
        favorite: toBoolean(candidate.favorite, false),
        pinned: toBoolean(candidate.pinned, false),
        tags: toArray(candidate.tags).map((item) => String(item).trim()).filter(Boolean),
        people: toArray(candidate.people).map((item) => String(item).trim()).filter(Boolean),
        categories: toArray(candidate.categories).map((item) => String(item).trim()).filter(Boolean),
        attachments: toArray(candidate.attachments),
        blocks: toArray(candidate.blocks).map(normalizeBlock),
        linkedDocumentIds: toArray(candidate.linkedDocumentIds),
        transcripts: toArray(candidate.transcripts),
        locationName: toString(candidate.locationName, ''),
        latitude: toNumberOrNull(candidate.latitude),
        longitude: toNumberOrNull(candidate.longitude),
        weather: toString(candidate.weather, ''),
        activity: toString(candidate.activity, ''),
        music: toString(candidate.music, ''),
        mood: toNumberOrNull(candidate.mood),
        energy: toNumberOrNull(candidate.energy),
        reminderAt: toString(candidate.reminderAt, ''),
        reminderLabel: toString(candidate.reminderLabel, ''),
        summary: toString(candidate.summary, ''),
        smartTitle: toString(candidate.smartTitle, ''),
        customFields: toObject(candidate.customFields),
        metadata: toObject(candidate.metadata),
        archived: candidate.archived === true,
        type: toString(candidate.type, 'entry')
    };
};

export const normalizeHealthLog = (raw = {}) => {
    const candidate = toObject(raw);
    return {
        ...DEFAULT_HEALTH_LOG,
        ...candidate,
        tags: toArray(candidate.tags),
        notes: toString(candidate.notes, ''),
        title: toString(candidate.title, ''),
        kind: toString(candidate.kind, 'symptom'),
        recordedAt: toString(candidate.recordedAt, ''),
        source: toString(candidate.source, 'manual'),
        metadata: toObject(candidate.metadata)
    };
};

export const normalizeAsset = (raw = {}) => {
    const candidate = toObject(raw);
    return {
        ...DEFAULT_ASSET,
        ...candidate,
        name: toString(candidate.name, ''),
        mimeType: toString(candidate.mimeType, ''),
        originalName: toString(candidate.originalName, ''),
        storageMode: toString(candidate.storageMode, 'optimized'),
        localStatus: toString(candidate.localStatus, 'cached'),
        remoteStatus: toString(candidate.remoteStatus, 'pending'),
        metadata: toObject(candidate.metadata)
    };
};

export const normalizeView = (raw = {}) => {
    const candidate = toObject(raw);
    return {
        ...DEFAULT_VIEW,
        ...candidate,
        query: toObject(candidate.query),
        type: toString(candidate.type, 'list'),
        name: toString(candidate.name, '')
    };
};

export const normalizeSyncJob = (raw = {}) => {
    const candidate = toObject(raw);
    return {
        ...DEFAULT_SYNC_JOB,
        ...candidate,
        targetId: toString(candidate.targetId, ''),
        status: toString(candidate.status, 'queued'),
        type: toString(candidate.type, 'document'),
        action: toString(candidate.action, 'upsert'),
        payload: toObject(candidate.payload),
        error: candidate.error ?? null
    };
};

export const buildDocumentRecord = (partial = {}) => {
    const now = nowIso();
    const candidate = normalizeDocument(partial);
    return {
        ...candidate,
        id: candidate.id || createId('doc'),
        createdAt: candidate.createdAt || now,
        updatedAt: candidate.updatedAt || now
    };
};

export const buildHealthLogRecord = (partial = {}) => {
    const now = nowIso();
    const candidate = normalizeHealthLog(partial);
    return {
        ...candidate,
        id: candidate.id || createId('health'),
        createdAt: candidate.createdAt || now,
        updatedAt: candidate.updatedAt || now,
        recordedAt: candidate.recordedAt || now
    };
};

export const buildAssetRecord = (partial = {}) => {
    const now = nowIso();
    const candidate = normalizeAsset(partial);
    return {
        ...candidate,
        id: candidate.id || createId('asset'),
        createdAt: candidate.createdAt || now,
        updatedAt: candidate.updatedAt || now
    };
};

export const buildViewRecord = (partial = {}) => {
    const now = nowIso();
    const candidate = normalizeView(partial);
    return {
        ...candidate,
        id: candidate.id || createId('view'),
        createdAt: candidate.createdAt || now,
        updatedAt: candidate.updatedAt || now
    };
};

export const buildSyncJobRecord = (partial = {}) => {
    const now = nowIso();
    const candidate = normalizeSyncJob(partial);
    const id = candidate.id;
    return {
        ...candidate,
        id: id === null || id === undefined || id === '' ? undefined : (Number.isFinite(Number(id)) ? Number(id) : String(id)),
        createdAt: candidate.createdAt || now,
        updatedAt: candidate.updatedAt || now
    };
};
