import { DEFAULT_SETTINGS } from './schema.js';

const now = new Date();

function dateWith(offsetDays = 0, hour = 9, minute = 0) {
    const date = new Date(now.getTime());
    date.setDate(date.getDate() + offsetDays);
    date.setHours(hour, minute, 0, 0);
    return date;
}

function iso(offsetDays = 0, hour = 9, minute = 0) {
    return dateWith(offsetDays, hour, minute).toISOString();
}

function ymd(offsetDays = 0) {
    const date = dateWith(offsetDays, 9, 0);
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
}

function weekdayFromYmd(value) {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(`${value}T12:00:00`));
}

function dtLocal(offsetDays = 0, hour = 9, minute = 0) {
    const date = dateWith(offsetDays, hour, minute);
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
}

export function createSampleState() {
    const localToday = ymd(0);
    const currentWeekday = weekdayFromYmd(localToday);
    return {
        settings: {
            ...DEFAULT_SETTINGS,
            showRightPanel: false,
            activeJournalId: 'journal_personal',
            ai: {
                ...DEFAULT_SETTINGS.ai,
                provider: 'local-reflection',
                model: 'Reflective notes'
            }
        },
        documents: [
            {
                id: 'doc_today_personal',
                type: 'entry',
                journalId: 'journal_personal',
                templateId: 'template_daily_reset',
                title: `${currentWeekday} landing page`,
                createdAt: iso(0, 7, 18),
                updatedAt: iso(0, 8, 6),
                date: localToday,
                startAt: iso(0, 7, 18),
                endAt: iso(0, 8, 6),
                durationMinutes: 48,
                status: 'today',
                favorite: true,
                highlighted: true,
                tags: ['morning', 'focus', 'writing'],
                people: ['Mira'],
                categories: ['reset'],
                locationName: 'Home desk',
                latitude: 37.7749,
                longitude: -122.4194,
                weather: 'Cool sun after fog',
                activity: 'Morning pages',
                music: 'Nils Frahm',
                mood: 7,
                energy: 6,
                reminderAt: dtLocal(0, 19, 0),
                reminderLabel: 'Evening revisit',
                summary: 'A quieter editor and stronger journal structure matter more than extra surface area.',
                smartTitle: `${currentWeekday} landing page`,
                customFields: {
                    focus: 'writing',
                    state: 4,
                    context: ['home', 'quiet']
                },
                linkedDocumentIds: ['doc_lab_ship', 'doc_memory_portland'],
                transcripts: [
                    {
                        id: 'transcript_today',
                        title: 'Morning voice note',
                        provider: 'browser_native',
                        createdAt: iso(0, 7, 41),
                        language: 'en-US',
                        status: 'ready',
                        text: 'The app should feel as calm as Journalistic but with multiple journals, better metadata, and the ability to sync readable files later.'
                    }
                ],
                blocks: [
                    { id: 'b1', type: 'heading', text: 'What feels real today?', depth: 0 },
                    { id: 'b2', type: 'paragraph', text: 'The writing surface needs to disappear so the journal can feel like a room instead of a dashboard.', depth: 0 },
                    { id: 'b3', type: 'bullet', text: 'Keep journals separate but searchable together.', depth: 0 },
                    { id: 'b4', type: 'bullet', text: 'Treat tags, people, places, and custom fields as one metadata language.', depth: 0 },
                    { id: 'b5', type: 'quote', text: 'Useful software should calm the hand before it tries to impress the eye.', depth: 0 }
                ]
            },
            {
                id: 'doc_lab_ship',
                type: 'entry',
                journalId: 'journal_lab',
                templateId: 'template_meeting_note',
                title: 'Shipping pass for the rewrite',
                createdAt: iso(-1, 13, 5),
                updatedAt: iso(0, 9, 18),
                date: ymd(-1),
                startAt: iso(-1, 13, 5),
                endAt: iso(-1, 14, 1),
                durationMinutes: 56,
                status: 'active',
                highlighted: false,
                tags: ['product', 'design', 'ai'],
                people: ['Mira', 'Self'],
                categories: ['planning'],
                locationName: 'Studio table',
                latitude: 37.7793,
                longitude: -122.4184,
                weather: 'Warm inside, windy outside',
                activity: 'Implementation planning',
                music: 'Lo-fi piano',
                mood: 8,
                energy: 7,
                summary: 'The rewrite should prioritize first-class journals, metadata, and map support rather than continue patching the old app shell.',
                smartTitle: 'Shipping pass for the rewrite',
                customFields: {
                    focus: 'work',
                    state: 5,
                    context: ['studio']
                },
                linkedDocumentIds: ['doc_today_personal'],
                transcripts: [],
                blocks: [
                    { id: 'b1', type: 'heading', text: 'Keep', depth: 0 },
                    { id: 'b2', type: 'checklist', text: 'Inline QuickAdd with compact schema', checked: true, depth: 0 },
                    { id: 'b3', type: 'checklist', text: 'Map view with location-linked entries', checked: true, depth: 0 },
                    { id: 'b4', type: 'checklist', text: 'Day One-like reflection and AI surfaces', checked: false, depth: 0 }
                ]
            },
            {
                id: 'doc_memory_portland',
                type: 'entry',
                journalId: 'journal_field',
                templateId: '',
                title: 'Rain walk in Portland',
                createdAt: iso(-362, 17, 30),
                updatedAt: iso(-362, 18, 12),
                date: ymd(-362),
                status: 'archive',
                highlighted: true,
                tags: ['travel', 'memory', 'rain'],
                people: ['Abhinav'],
                categories: ['place'],
                locationName: 'Portland riverfront',
                latitude: 45.5152,
                longitude: -122.6784,
                weather: 'Rain and yellow streetlight',
                activity: 'Walk',
                music: 'City noise',
                mood: 6,
                energy: 5,
                summary: 'A stored memory with location, weather, and a person mention for On This Day and map recall.',
                smartTitle: 'Rain walk in Portland',
                customFields: {
                    focus: 'travel',
                    state: 3,
                    context: ['outside', 'travel']
                },
                linkedDocumentIds: [],
                transcripts: [],
                blocks: [
                    { id: 'b1', type: 'paragraph', text: 'The pavement held light in sheets and the conversation kept drifting back to what kind of city feels livable.', depth: 0 },
                    { id: 'b2', type: 'bullet', text: 'Warm ramen after the walk', depth: 0 },
                    { id: 'b3', type: 'bullet', text: 'Talked about moving slower on purpose', depth: 0 }
                ]
            },
            {
                id: 'doc_health_sleep',
                type: 'entry',
                journalId: 'journal_health',
                templateId: '',
                title: 'Sleep and recovery check',
                createdAt: iso(-2, 6, 45),
                updatedAt: iso(-2, 7, 10),
                date: ymd(-2),
                status: 'review',
                highlighted: false,
                tags: ['sleep', 'recovery'],
                people: [],
                categories: ['health'],
                locationName: 'Home',
                latitude: 37.7749,
                longitude: -122.4194,
                weather: 'Cold morning',
                activity: 'Recovery note',
                music: '',
                mood: 5,
                energy: 3,
                summary: 'Late meals continue to correlate with shallow sleep and lower morning energy.',
                smartTitle: 'Sleep and recovery check',
                customFields: {
                    focus: 'health',
                    state: 2,
                    context: ['home']
                },
                linkedDocumentIds: [],
                transcripts: [],
                blocks: [
                    { id: 'b1', type: 'paragraph', text: 'Fell asleep too late and woke up foggy. Water and daylight helped more than coffee.', depth: 0 },
                    { id: 'b2', type: 'callout', text: 'Pattern: late dinner + phone light = weaker sleep', depth: 0 }
                ]
            }
        ],
        healthLogs: [
            {
                id: 'health_sleep_duration',
                kind: 'measurement',
                title: 'Sleep duration',
                value: 6.3,
                unit: 'hours',
                recordedAt: iso(-2, 7, 0),
                source: 'fitbit',
                tags: ['sleep'],
                notes: 'Below target',
                linkedDocumentId: 'doc_health_sleep',
                metadata: { sourcePlatform: 'fitbit' }
            },
            {
                id: 'health_hrv',
                kind: 'measurement',
                title: 'HRV',
                value: 47,
                unit: 'ms',
                recordedAt: iso(-2, 7, 2),
                source: 'fitbit',
                tags: ['recovery'],
                notes: 'Lower than average',
                linkedDocumentId: 'doc_health_sleep',
                metadata: { sourcePlatform: 'fitbit' }
            },
            {
                id: 'health_headache',
                kind: 'symptom',
                title: 'Headache',
                value: 2,
                unit: 'severity',
                recordedAt: iso(0, 9, 5),
                source: 'manual',
                tags: ['head'],
                notes: 'Mild and short-lived',
                linkedDocumentId: 'doc_today_personal',
                metadata: {}
            }
        ],
        assets: [],
        views: [],
        syncQueue: [],
        syncState: {
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
        }
    };
}
