import { Storage, createJournalDocument, createAssetEntry } from './storage.js';
import { APP_NAME, normalizeSettings } from './schema.js';
import { syncDocumentToNotion, verifyNotionConnection } from './notion-sync.js';
import { requestDriveToken, restoreJournalFromDrive } from './drive-sync.js';
import { DRIVE_BACKGROUND_SYNC_TAG, buildDriveWorkspaceSettings, syncDriveLibrarySnapshot } from './drive-library-sync.js';
import { importFitbitDay } from './fitbit-sync.js';
import { transcribeAudio } from './transcription-service.js';
import { createSampleState } from './sample-data.js';
import { mountDocumentEditor, richTextToPlain } from './editor.js?v=10';
import {
    REMINDER_META_KEY,
    REMINDER_PERIODIC_INTERVAL,
    REMINDER_PERIODIC_TAG,
    evaluateDueReminders
} from './reminders.js';
import {
    esc,
    prettyDate,
    prettyDateTime,
    renderDocumentList,
    renderTimeline,
    renderCalendar,
    renderInsightBars,
    renderMeasurementsTable,
    renderTranscriptCards
} from './ui.js';
import {
    buildCategorySeries,
    buildHealthInsightModel,
    computeStreak
} from './insights.js';
import {
    createRecordingSessionDraft,
    appendRecordingChunk,
    finalizeRecordingSession,
    createTranscriptionJob,
    buildTranscriptBundle,
    buildTranscriptInsertion,
    createTranscriptArtifact
} from './transcription.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const blankArray = (value) => Array.isArray(value) ? value : [];

function makeRichText(text = '') {
    const value = String(text ?? '');
    return value ? [{ type: 'text', text: value }] : [];
}

function createTextBlock(type, text = '', extra = {}) {
    return {
        id: Storage.createId('block'),
        type,
        richText: makeRichText(text),
        ...extra
    };
}

function blockToPlainText(block = {}) {
    if (!block || typeof block !== 'object') return '';
    if (Array.isArray(block.richText)) return richTextToPlain(block.richText);
    if (block.type === 'code') return String(block.text || '');
    if (block.type === 'table') {
        return blankArray(block.rows).map((row) => blankArray(row).map((cell) => richTextToPlain(cell)).join(' | ')).join(' ');
    }
    if (Array.isArray(block.captionRichText)) {
        const caption = richTextToPlain(block.captionRichText);
        if (caption) return caption;
    }
    return String(block.text || block.name || block.alt || '');
}

function blocksToPlainText(blocks = [], separator = '\n') {
    return blankArray(blocks).map((block) => {
        if (block?.type === 'toggle') {
            const head = blockToPlainText(block);
            const children = blocksToPlainText(block.children || [], separator);
            return [head, children].filter(Boolean).join(separator);
        }
        return blockToPlainText(block);
    }).filter(Boolean).join(separator);
}

function collectBlockAssetIds(blocks = []) {
    const ids = new Set();
    const visit = (items) => {
        blankArray(items).forEach((block) => {
            if (block?.assetId) ids.add(block.assetId);
            if (block?.type === 'toggle') visit(block.children);
        });
    };
    visit(blocks);
    return [...ids];
}

function formatLocalYmd(date = new Date()) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const todayYmd = () => formatLocalYmd(new Date());

function weekdayFromYmd(value) {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(`${value}T12:00:00`));
}

function parseCalendarValue(value) {
    if (!value) return new Date();
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        return new Date(`${value}T12:00:00`);
    }
    return new Date(value);
}

const state = {
    documents: [],
    healthLogs: [],
    assets: [],
    views: [],
    settings: normalizeSettings({}),
    syncQueue: [],
    syncState: null,
    currentDocumentId: null,
    search: '',
    calendarCursor: new Date(),
    editor: null,
    quickAdd: null,
    notionStatus: '',
    driveStatus: '',
    mediaRecorder: null,
    mediaStream: null,
    recordingSession: null,
    speechRecognition: null,
    speechTranscript: '',
    objectUrls: new Set(),
    leftRailOpen: false,
    railSections: {
        journals: true,
        views: true,
        workspace: false
    },
    activeView: 'write',
    map: null,
    mapLayer: null,
    aiStatus: '',
    aiResponse: '',
    aiDraft: '',
    writePanels: {
        quickAdd: false,
        details: false
    },
    autosaveTimer: null,
    pendingAutosave: null,
    lastSavedDocumentSnapshot: '',
    reminderTimer: null,
    reminderCheckInFlight: false,
    reminderNotificationStatus: '',
    fitbitStatus: '',
    fitbitAccessTokenDraft: null,
    fitbitImportDate: '',
    transcriptionDraft: null
};

function splitCsv(value) {
    return String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function mergeUniqueValues(...groups) {
    return [...new Set(groups.flat().map((item) => String(item || '').trim()).filter(Boolean))];
}

function slugify(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'item';
}

function mapViewHashToState(view) {
    if (!view) return 'write';
    view = String(view).split(':')[0];
    if (view === 'journal') return 'journals';
    return view;
}

function parseAppHash() {
    const [view = 'write', encodedTarget = ''] = location.hash.replace(/^#/, '').split(':');
    return { view: mapViewHashToState(view), targetId: encodedTarget ? decodeURIComponent(encodedTarget) : '' };
}

function refreshIcons() {
    document.querySelectorAll('[data-lucide]').forEach((icon) => {
        const name = icon.getAttribute('data-lucide');
        if (!name) return;
        if (icon.tagName === 'IMG') {
            icon.setAttribute('src', `./assets/lucide/${name}.svg`);
        } else {
            icon.style.setProperty('--icon-url', `url("./assets/lucide/${name}.svg")`);
        }
    });
}

function setIconName(icon, name) {
    if (!icon || !name) return;
    icon.setAttribute('data-lucide', name);
    if (icon.tagName === 'IMG') {
        icon.setAttribute('src', `./assets/lucide/${name}.svg`);
    }
}

function resolvedThemeMode(theme = 'auto') {
    if (theme === 'dark' || theme === 'light') return theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemePreference(theme = 'auto') {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');

    const themeToggleBtn = $('#themeToggleBtn');
    if (!themeToggleBtn) return;
    const icon = themeToggleBtn.querySelector('.app-icon');
    const activeTheme = resolvedThemeMode(theme);
    setIconName(icon, activeTheme === 'dark' ? 'lightbulb' : 'circle');
    themeToggleBtn.setAttribute('aria-label', activeTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    themeToggleBtn.title = activeTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
}

function setFieldValue(selector, value) {
    const element = $(selector);
    if (element) element.value = value ?? '';
}

function autosizeTitleInput() {
    const element = $('#docTitleInput');
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${Math.max(element.scrollHeight, 44)}px`;
}

function setCheckboxValue(selector, checked) {
    const element = $(selector);
    if (element) element.checked = Boolean(checked);
}

function toLocalDateTimeValue(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function fromLocalDateTimeValue(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function toNullableNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function downloadFile(name, contents, type = 'text/plain;charset=utf-8') {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function journalMap() {
    return new Map(blankArray(state.settings.journals).map((journal) => [journal.id, journal]));
}

function templateMap() {
    return new Map(blankArray(state.settings.templates).map((template) => [template.id, template]));
}

function activeJournalId() {
    return state.settings.activeJournalId || state.settings.journals[0]?.id || '';
}

function normalizeSeedDocuments(documents) {
    const localToday = todayYmd();
    const weekday = weekdayFromYmd(localToday);
    let changed = false;
    const normalized = blankArray(documents).map((doc) => {
        if (doc.id !== 'doc_today_personal') return doc;
        const nextTitle = `${weekday} landing page`;
        if (doc.title === nextTitle && doc.smartTitle === nextTitle && doc.date === localToday) return doc;
        changed = true;
        return {
            ...doc,
            date: localToday,
            title: nextTitle,
            smartTitle: nextTitle
        };
    });
    return { normalized, changed };
}

function preferredDocumentId(documents = state.documents) {
    const docs = blankArray(documents);
    const preferred = docs.find((doc) => doc.journalId === activeJournalId() && doc.date === todayYmd())
        || docs.find((doc) => doc.journalId === activeJournalId())
        || docs[0];
    return preferred?.id || null;
}

function journals() {
    return blankArray(state.settings.journals);
}

function templates() {
    return blankArray(state.settings.templates);
}

function reminders() {
    return blankArray(state.settings.reminders);
}

function savedSearches() {
    return blankArray(state.settings.editor?.savedSearches);
}

function customFields() {
    return blankArray(state.settings.editor?.customFields);
}

function journalById(id) {
    return journalMap().get(id) || null;
}

function currentDocument() {
    return state.documents.find((doc) => doc.id === state.currentDocumentId) || state.documents[0] || null;
}

function ensureCurrentDocument() {
    const doc = currentDocument();
    if (doc && state.currentDocumentId !== doc.id) state.currentDocumentId = doc.id;
    return doc;
}

function getAllTranscripts() {
    return state.documents.flatMap((doc) => blankArray(doc.transcripts).map((item) => ({
        ...item,
        documentId: doc.id
    })));
}

function findTemplateByNameOrId(value) {
    if (!value) return null;
    const normalized = String(value).trim().toLowerCase();
    return templates().find((template) => template.id === normalized || template.name.toLowerCase() === normalized) || null;
}

function findJournalByNameOrId(value) {
    if (!value) return null;
    const normalized = String(value).trim().toLowerCase();
    return journals().find((journal) => journal.id === normalized || journal.name.toLowerCase() === normalized) || null;
}

function parseTemplateBody(body = '') {
    const lines = String(body || '').split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return [createTextBlock('paragraph', '')];
    return lines.map((line) => {
        const match = line.match(/^([A-Za-z]+)\s*:\s*(.*)$/);
        const kind = match ? match[1].trim().toLowerCase() : 'paragraph';
        const value = match ? match[2] : line;
        switch (kind) {
            case 'heading':
                return createTextBlock('heading', value, { level: 2 });
            case 'bullet':
                return createTextBlock('bullet', value, { depth: 0 });
            case 'numbered':
                return createTextBlock('numbered', value, { depth: 0 });
            case 'checklist':
            case 'todo':
                return createTextBlock('checklist', value, { checked: false, depth: 0 });
            case 'quote':
                return createTextBlock('quote', value);
            case 'callout':
                return createTextBlock('callout', value, { icon: '💡' });
            case 'divider':
                return { id: Storage.createId('block'), type: 'divider' };
            case 'code':
                return { id: Storage.createId('block'), type: 'code', text: value, language: '' };
            default:
                return createTextBlock('paragraph', value);
        }
    });
}

function buildDefaultBlocks(templateId = '') {
    const template = templateMap().get(templateId);
    if (!template) return [createTextBlock('paragraph', '')];
    return parseTemplateBody(template.body);
}

function isDesktopViewport() {
    return window.innerWidth > 980;
}

function syncShellState() {
    const shouldShowRightRail = state.settings.showRightPanel === true && state.activeView === 'write' && isDesktopViewport();
    const leftRail = $('.rail-left');
    const rightRail = $('.rail-right');
    if (leftRail) leftRail.hidden = !state.leftRailOpen;
    if (rightRail) rightRail.hidden = !shouldShowRightRail;
    document.body.dataset.activeView = state.activeView;
    document.body.dataset.rightPanelHidden = shouldShowRightRail ? 'false' : 'true';
    document.body.dataset.leftRailOpen = state.leftRailOpen ? 'true' : 'false';
    $$('[data-rail-section]').forEach((section) => {
        const key = section.getAttribute('data-rail-section');
        const isOpen = state.railSections[key] !== false;
        section.dataset.collapsed = isOpen ? 'false' : 'true';
        const body = section.querySelector('.rail-section-body');
        if (body) body.hidden = !isOpen;
        const toggle = section.querySelector('[data-toggle-rail-section]');
        if (toggle) {
            const icon = toggle.querySelector('.app-icon');
            const labelBase = `${key} section`;
            toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            toggle.setAttribute('aria-label', `${isOpen ? 'Collapse' : 'Expand'} ${labelBase}`);
            toggle.title = `${isOpen ? 'Collapse' : 'Expand'} ${labelBase}`;
            setIconName(icon, isOpen ? 'chevron-up' : 'chevron-down');
        }
    });
    const toggle = $('#toggleSectionsBtn');
    if (toggle) {
        const expanded = state.leftRailOpen ? 'true' : 'false';
        const icon = toggle.querySelector('.app-icon');
        toggle.setAttribute('aria-expanded', expanded);
        toggle.setAttribute('aria-label', state.leftRailOpen ? 'Collapse left rail' : 'Expand left rail');
        toggle.title = state.leftRailOpen ? 'Collapse left rail' : 'Expand left rail';
        setIconName(icon, state.leftRailOpen ? 'panel-left-close' : 'panel-left-open');
    }
    const studioToggle = $('#toggleStudioBtn');
    if (studioToggle) {
        studioToggle.hidden = state.activeView !== 'write';
        const icon = studioToggle.querySelector('.app-icon');
        studioToggle.setAttribute('aria-expanded', shouldShowRightRail ? 'true' : 'false');
        studioToggle.setAttribute('aria-label', shouldShowRightRail ? 'Hide right sidebar' : 'Show right sidebar');
        studioToggle.title = shouldShowRightRail ? 'Hide right sidebar' : 'Show right sidebar';
        setIconName(icon, shouldShowRightRail ? 'panel-right-close' : 'panel-right-open');
    }
    syncWriteSurfaceState();
    refreshIcons();
}

function syncWriteSurfaceState() {
    const quickAddPanel = $('#quickAddPanel');
    const detailsPanel = $('#detailsPanel');
    const quickAddToggle = $('#toggleQuickAddBtn');
    const detailsToggle = $('#toggleDetailsBtn');

    if (quickAddPanel) quickAddPanel.hidden = !state.writePanels.quickAdd;
    if (detailsPanel) detailsPanel.hidden = !state.writePanels.details;

    if (quickAddToggle) {
        quickAddToggle.setAttribute('aria-expanded', state.writePanels.quickAdd ? 'true' : 'false');
        quickAddToggle.classList.toggle('btn-primary', state.writePanels.quickAdd);
        quickAddToggle.classList.toggle('btn-secondary', !state.writePanels.quickAdd);
        quickAddToggle.title = state.writePanels.quickAdd ? 'Hide quick capture' : 'Quick capture';
        quickAddToggle.setAttribute('aria-label', state.writePanels.quickAdd ? 'Hide quick capture' : 'Quick capture');
    }

    if (detailsToggle) {
        detailsToggle.setAttribute('aria-expanded', state.writePanels.details ? 'true' : 'false');
        detailsToggle.classList.toggle('btn-primary', state.writePanels.details);
        detailsToggle.classList.toggle('btn-secondary', !state.writePanels.details);
        detailsToggle.title = state.writePanels.details ? 'Hide entry details' : 'Entry details';
        detailsToggle.setAttribute('aria-label', state.writePanels.details ? 'Hide entry details' : 'Entry details');
    }
}

function renderVisiblePanels() {
    $$('[data-view-link]').forEach((link) => {
        link.classList.toggle('active', link.getAttribute('data-view-link') === state.activeView);
    });
    $$('.workspace-section').forEach((section) => {
        const isHidden = section.getAttribute('data-view') !== state.activeView;
        section.classList.toggle('is-hidden', isHidden);
        if (section.id !== 'today') section.hidden = isHidden;
    });
}

function documentSearchHaystack(doc) {
    return [
        doc.title,
        doc.smartTitle,
        doc.summary,
        doc.locationName,
        doc.weather,
        doc.activity,
        doc.music,
        blankArray(doc.tags).join(' '),
        blankArray(doc.people).join(' '),
        blankArray(doc.categories).join(' '),
        blocksToPlainText(doc.blocks, ' '),
        Object.values(doc.customFields || {}).flat().join(' ')
    ].join(' ').toLowerCase();
}

function documentMatchesSearch(doc, query) {
    const raw = String(query || '').trim().toLowerCase();
    if (!raw) return true;
    const tokens = raw.split(/\s+/).filter(Boolean);
    return tokens.every((token) => {
        if (token === 'highlighted:true' || token === 'highlight:true') return doc.highlighted === true;
        if (token === 'favorite:true' || token === 'favorite') return doc.favorite === true;
        if (token.startsWith('journal:')) {
            const wanted = token.slice('journal:'.length);
            const journal = journalById(doc.journalId);
            return doc.journalId === wanted || journal?.name.toLowerCase() === wanted;
        }
        if (token.startsWith('tag:')) return blankArray(doc.tags).some((tag) => tag.toLowerCase() === token.slice(4));
        if (token.startsWith('category:')) return blankArray(doc.categories).some((category) => category.toLowerCase() === token.slice(9));
        if (token.startsWith('@')) return blankArray(doc.people).some((person) => person.toLowerCase() === token.slice(1));
        return documentSearchHaystack(doc).includes(token);
    });
}

function filteredDocuments() {
    return state.documents.filter((doc) => documentMatchesSearch(doc, state.search));
}

function journalDocuments(journalId = activeJournalId()) {
    return filteredDocuments().filter((doc) => !journalId || doc.journalId === journalId);
}

function mapDocumentToInsightRecord(doc) {
    return {
        id: doc.id,
        type: doc.journalId || doc.type,
        title: doc.title,
        at: doc.date || doc.updatedAt,
        tags: doc.tags || [],
        people: doc.people || [],
        durationMinutes: Number(doc.durationMinutes || 0),
        value: Number(doc.mood || 0) || 1
    };
}

function buildWorkspaceMetrics() {
    const today = todayYmd();
    const todaysDocs = state.documents.filter((doc) => doc.date === today);
    const transcripts = getAllTranscripts();
    const locations = state.documents.filter((doc) => Number.isFinite(doc.latitude) && Number.isFinite(doc.longitude));
    return [
        { value: String(todaysDocs.length), label: 'entries today' },
        { value: String(journals().length), label: 'journals' },
        { value: String(transcripts.length), label: 'transcripts' },
        { value: String(locations.length), label: 'places' }
    ];
}

function buildHeroMetrics() {
    const docs = journalDocuments().slice().sort((a, b) => String(b.date || b.updatedAt).localeCompare(String(a.date || a.updatedAt)));
    const highlighted = state.documents.filter((doc) => doc.highlighted).length;
    const reminderCount = reminders().filter((item) => item.active !== false).length;
    const onThisDayCount = state.documents.filter((doc) => {
        if (!doc.date) return false;
        const monthDay = doc.date.slice(5);
        return monthDay === todayYmd().slice(5) && doc.date.slice(0, 4) !== todayYmd().slice(0, 4);
    }).length;
    return [
        { value: `${docs.length}`, label: 'entries in journal' },
        { value: `${highlighted}`, label: 'highlights' },
        { value: `${reminderCount}`, label: 'reminders' },
        { value: `${onThisDayCount}`, label: 'on this day' }
    ];
}

function buildTopbarContext() {
    const journal = journalById(activeJournalId());
    const journalName = journal?.name || 'Library';
    if (state.activeView === 'library') return state.search ? `Library / ${state.search}` : 'Library';
    if (state.search) return `${journalName} / ${state.search}`;
    return journalName;
}

function buildEntryLead(doc) {
    const summary = String(doc.summary || '').trim();
    if (summary) return summary;
    const blockText = blankArray(doc.blocks).map((block) => blockToPlainText(block).trim()).find(Boolean) || '';
    const compact = [
        doc.locationName ? `From ${doc.locationName}` : '',
        doc.weather || '',
        doc.activity || '',
        blankArray(doc.categories)[0] ? `Category ${blankArray(doc.categories)[0]}` : '',
        blockText
    ].filter(Boolean).join(' • ');
    return compact || 'No summary yet.';
}

function buildDocumentExcerpt(doc) {
    return String(doc.summary || blocksToPlainText(doc.blocks, ' ') || 'No excerpt yet.')
        .replace(/\s+/g, ' ')
        .trim();
}

function groupDocsByMonth(docs) {
    const groups = new Map();
    docs.forEach((doc) => {
        const date = doc.date ? new Date(`${doc.date}T12:00:00`) : new Date(doc.updatedAt || Date.now());
        const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
        const key = validDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(doc);
    });
    return groups;
}

function renderLibraryDocuments(docs) {
    if (!docs.length) return '<div class="inspector-empty">No entries match your search.</div>';
    const journalsById = journalMap();
    return Array.from(groupDocsByMonth(docs).entries()).map(([label, entries]) => `
        <section class="library-month-group">
            <div class="library-month-label">${esc(label)}</div>
            ${entries.map((doc) => {
                const journal = journalsById.get(doc.journalId);
                return `
                    <button class="doc-list-item ${doc.id === state.currentDocumentId ? 'is-active' : ''}" type="button" data-open-doc="${esc(doc.id)}">
                        <div class="doc-list-item-inner">
                            <span class="doc-list-item-top">
                                <span class="doc-type-pill">${esc(journal?.name || doc.type)}</span>
                                <span class="doc-list-date">${esc(prettyDate(doc.date || doc.updatedAt))}</span>
                            </span>
                            <strong>${esc(doc.smartTitle || doc.title || 'Untitled')}</strong>
                            <span class="doc-list-excerpt">${esc(buildDocumentExcerpt(doc))}</span>
                        </div>
                    </button>
                `;
            }).join('')}
        </section>
    `).join('');
}

function renderTodayHero(doc) {
    if (!doc) return;
    const date = parseCalendarValue(doc.date || doc.startAt || '');
    const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
    $('#todayDateLine').textContent = validDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    $('#todayDayTitle').textContent = validDate.toLocaleDateString('en-US', { weekday: 'long' });
    $('#todayJournalPill').textContent = journalById(doc.journalId)?.name || 'Journal';
    $('#todayStatusPill').textContent = doc.highlighted ? 'Highlighted' : doc.favorite ? 'Favorite' : (doc.status || 'Today');
    $('#todayStatusPill').className = `status-pill ${doc.highlighted || doc.favorite ? 'status-pill--ready' : 'status-pill--queued'}`;
    $('#todaySummaryLine').textContent = buildEntryLead(doc);
}

function getJournalCardModel() {
    return journals().map((journal) => {
        const docs = state.documents.filter((doc) => doc.journalId === journal.id);
        const latest = docs.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] || null;
        return {
            ...journal,
            count: docs.length,
            latest,
            active: activeJournalId() === journal.id
        };
    });
}

function renderJournalRail() {
    const rows = getJournalCardModel();
    $('#journalList').innerHTML = rows.map((journal) => {
        const color = journal.color || 'blue';
        const colorVarMap = { gray: '#787774', brown: '#9F6B53', orange: '#D9730D', yellow: '#CB912F', green: '#448361', blue: '#337EA9', purple: '#9065B0', pink: '#C14C8A', red: '#D44C47' };
        const dotColor = colorVarMap[color] || colorVarMap.blue;
        return `
        <button class="doc-list-item ${journal.active ? 'is-active' : ''}" type="button" data-select-journal="${esc(journal.id)}">
            <div class="doc-list-item-inner">
                <span class="doc-list-item-top">
                    <span class="journal-dot" style="background:${dotColor}"></span>
                    <span class="doc-list-title">${esc(journal.name)}</span>
                    <span class="doc-list-date">${journal.count}</span>
                </span>
                <span class="doc-list-meta">${esc(journal.latest ? prettyDate(journal.latest.date || journal.latest.updatedAt) : 'No entries yet')}</span>
            </div>
        </button>`;
    }).join('');
}

function renderLibrary() {
    const docs = filteredDocuments();
    const topbarContext = $('#topbarContext');
    if (topbarContext) topbarContext.textContent = buildTopbarContext();
    $('#workspaceStats').innerHTML = buildWorkspaceMetrics().map((item) => `
        <div class="metric">
            <span class="metric-value">${item.value}</span>
            <span class="metric-label">${item.label}</span>
        </div>
    `).join('');
    $('#heroMetrics').innerHTML = buildHeroMetrics().map((item) => `
        <div class="metric">
            <span class="metric-value">${item.value}</span>
            <span class="metric-label">${item.label}</span>
        </div>
    `).join('');
    $('#docList').innerHTML = renderLibraryDocuments(docs);
    renderJournalRail();
}

function renderCustomFieldInputs(doc) {
    const fields = customFields();
    const mount = $('#customFieldsMount');
    if (!mount) return;
    if (!fields.length) {
        mount.innerHTML = '';
        return;
    }
    mount.innerHTML = fields.map((field) => {
        const value = doc.customFields?.[field.key];
        if (field.type === 'boolean') {
            return `
                <label class="toggle">
                    <input type="checkbox" data-custom-field-input="${esc(field.key)}" ${value === true ? 'checked' : ''} />
                    ${esc(field.label)}
                </label>
            `;
        }
        if (field.type === 'options' && !field.multiple) {
            return `
                <label class="field">
                    <span>${esc(field.label)}</span>
                    <select data-custom-field-input="${esc(field.key)}">
                        <option value=""></option>
                        ${blankArray(field.options).map((option) => `<option value="${esc(option)}" ${value === option ? 'selected' : ''}>${esc(option)}</option>`).join('')}
                    </select>
                </label>
            `;
        }
        const inputType = field.type === 'datetime' ? 'datetime-local' : field.type === 'number' || field.type === 'rating' ? 'number' : 'text';
        const renderedValue = field.type === 'datetime'
            ? toLocalDateTimeValue(value)
            : Array.isArray(value)
                ? value.join(', ')
                : value ?? '';
        return `
            <label class="field">
                <span>${esc(field.label)}</span>
                <input
                    data-custom-field-input="${esc(field.key)}"
                    type="${inputType}"
                    ${field.type === 'rating' ? `min="1" max="${Number(field.max) || 5}" step="1"` : ''}
                    ${field.type === 'number' ? 'step="any"' : ''}
                    placeholder="${esc(blankArray(field.options).join(', '))}"
                    value="${esc(renderedValue)}"
                />
            </label>
        `;
    }).join('');
}

function collectCustomFieldValues() {
    return customFields().reduce((acc, field) => {
        const element = document.querySelector(`[data-custom-field-input="${field.key}"]`);
        if (!element) return acc;
        if (field.type === 'boolean') {
            acc[field.key] = element.checked;
            return acc;
        }
        if (field.type === 'options' && field.multiple) {
            acc[field.key] = splitCsv(element.value);
            return acc;
        }
        if (field.type === 'datetime') {
            acc[field.key] = fromLocalDateTimeValue(element.value);
            return acc;
        }
        if (field.type === 'number' || field.type === 'rating') {
            acc[field.key] = toNullableNumber(element.value);
            return acc;
        }
        acc[field.key] = element.value.trim();
        return acc;
    }, {});
}

function applyDocumentFields(doc) {
    setFieldValue('#docJournalInput', doc.journalId || activeJournalId());
    setFieldValue('#docTemplateInput', doc.templateId || '');
    setFieldValue('#docTitleInput', doc.title || '');
    setFieldValue('#docDateInput', doc.date || todayYmd());
    setFieldValue('#docTimeInput', doc.startAt ? toLocalDateTimeValue(doc.startAt).slice(11, 16) : '');
    setFieldValue('#docStatusInput', doc.status || 'today');
    setFieldValue('#docTagsInput', blankArray(doc.tags).join(', '));
    setFieldValue('#docPeopleInput', blankArray(doc.people).join(', '));
    setFieldValue('#docCategoriesInput', blankArray(doc.categories).join(', '));
    setFieldValue('#docLocationInput', doc.locationName || '');
    setFieldValue('#docLatitudeInput', doc.latitude ?? '');
    setFieldValue('#docLongitudeInput', doc.longitude ?? '');
    setFieldValue('#docWeatherInput', doc.weather || '');
    setFieldValue('#docActivityInput', doc.activity || '');
    setFieldValue('#docMusicInput', doc.music || '');
    setFieldValue('#docReminderInput', toLocalDateTimeValue(doc.reminderAt));
    setFieldValue('#docMoodInput', doc.mood ?? '');
    setFieldValue('#docEnergyInput', doc.energy ?? '');
    autosizeTitleInput();
}

function renderDocumentChrome(doc) {
    const journal = journalById(doc.journalId);
    const date = doc.date ? new Date(doc.date) : new Date();
    const validDate = Number.isNaN(date.getTime()) ? new Date() : date;

    const cover = $('#entryCover');
    if (cover) {
        const coverColor = journal?.color || 'blue';
        cover.setAttribute('data-color', coverColor);
    }

    const title = doc.smartTitle || doc.title || 'Untitled';
    const pageMeta = [
        journal?.name || 'Journal',
        validDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        })
    ].join(' · ');
    $('#editorPageMeta').textContent = pageMeta;
    const chips = [];
    const chipIcon = (name) => `<img class="app-icon" src="./assets/lucide/${name}.svg" alt="" aria-hidden="true" />`;
    if (doc.weather) chips.push(`<span class="entry-property"><span class="entry-property-icon">${chipIcon('cloud-sun')}</span><span class="entry-property-value">${esc(doc.weather)}</span></span>`);
    if (doc.locationName) chips.push(`<span class="entry-property"><span class="entry-property-icon">${chipIcon('map-pin')}</span><span class="entry-property-value">${esc(doc.locationName)}</span></span>`);
    if (doc.activity) chips.push(`<span class="entry-property"><span class="entry-property-icon">${chipIcon('activity')}</span><span class="entry-property-value">${esc(doc.activity)}</span></span>`);
    const mood = Number(doc.mood);
    if (doc.mood !== null && doc.mood !== undefined && doc.mood !== '' && Number.isFinite(mood)) {
        const moodIcon = mood >= 7 ? 'smile' : mood >= 4 ? 'meh' : 'frown';
        chips.push(`<span class="entry-property"><span class="entry-property-icon">${chipIcon(moodIcon)}</span><span class="entry-property-value">${mood}/10</span></span>`);
    }
    if (doc.favorite) chips.push(`<span class="entry-property"><span class="entry-property-icon">${chipIcon('star')}</span><span class="entry-property-value">Favorite</span></span>`);
    if (doc.highlighted) chips.push(`<span class="entry-property"><span class="entry-property-icon">${chipIcon('bookmark')}</span><span class="entry-property-value">Highlighted</span></span>`);
    const metaChips = $('#editorMetaChips');
    if (metaChips) {
        metaChips.innerHTML = chips.join('');
        metaChips.style.display = chips.length ? 'flex' : 'none';
    }
    const subtitle = $('#editorSubtitle');
    if (subtitle) {
        subtitle.textContent = doc.summary || '';
        subtitle.hidden = !doc.summary;
    }
    const highlightBtn = $('#toggleHighlightBtn');
    if (highlightBtn) {
        highlightBtn.setAttribute('aria-pressed', doc.highlighted ? 'true' : 'false');
        highlightBtn.setAttribute('aria-label', doc.highlighted ? 'Unhighlight entry' : 'Highlight entry');
        highlightBtn.title = doc.highlighted ? 'Unhighlight entry' : 'Highlight entry';
        highlightBtn.classList.toggle('btn-primary', doc.highlighted);
        highlightBtn.classList.toggle('btn-secondary', !doc.highlighted);
    }
    const favoriteBtn = $('#toggleFavoriteBtn');
    if (favoriteBtn) {
        favoriteBtn.setAttribute('aria-pressed', doc.favorite ? 'true' : 'false');
        favoriteBtn.setAttribute('aria-label', doc.favorite ? 'Remove favorite' : 'Favorite entry');
        favoriteBtn.title = doc.favorite ? 'Remove favorite' : 'Favorite entry';
        favoriteBtn.classList.toggle('btn-primary', doc.favorite);
        favoriteBtn.classList.toggle('btn-secondary', !doc.favorite);
    }
    const studioTitle = [title, journal?.name, doc.status].filter(Boolean).join(' • ');
    const topbarContext = $('#topbarContext');
    if (topbarContext) topbarContext.textContent = studioTitle || buildTopbarContext();
    renderTodayHero(doc);
    syncWriteSurfaceState();
}

function renderDocumentEditor(doc) {
    clearTimeout(state.autosaveTimer);
    state.autosaveTimer = null;
    state.pendingAutosave = null;
    state.lastSavedDocumentSnapshot = documentSnapshot(doc);
    syncAutosaveIndicator('');
    applyDocumentFields(doc);
    renderDocumentChrome(doc);
    renderCustomFieldInputs(doc);
    state.editor.setValue(blankArray(doc.blocks).length ? doc.blocks : buildDefaultBlocks(doc.templateId));
    renderAssets(doc);
    renderInspector(doc);
    $('#linkedDocList').innerHTML = blankArray(doc.linkedDocumentIds).map((id) => {
        const linked = state.documents.find((item) => item.id === id);
        if (!linked) return '';
        return `
            <button type="button" class="doc-list-item" data-open-doc="${esc(linked.id)}">
                <strong>${esc(linked.title)}</strong>
                <span class="doc-list-meta">${esc(journalById(linked.journalId)?.name || linked.type)}</span>
            </button>
        `;
    }).join('') || '<div class="inspector-empty">No linked pages yet.</div>';
}

function collectDocumentDraft() {
    const existing = currentDocument() || createJournalDocument({ journalId: activeJournalId() });
    const timeValue = $('#docTimeInput')?.value || '';
    const startAt = $('#docDateInput')?.value && timeValue
        ? new Date(`${$('#docDateInput').value}T${timeValue}`).toISOString()
        : existing.startAt || '';
    const blocks = state.editor ? state.editor.getValue() : blankArray(existing.blocks);
    const attachments = [...new Set(blankArray(existing.attachments).concat(collectBlockAssetIds(blocks)))];
    return {
        ...existing,
        journalId: $('#docJournalInput').value || activeJournalId(),
        templateId: $('#docTemplateInput').value || '',
        title: $('#docTitleInput').value.trim(),
        date: $('#docDateInput').value || todayYmd(),
        startAt,
        status: $('#docStatusInput').value,
        tags: splitCsv($('#docTagsInput').value),
        people: splitCsv($('#docPeopleInput').value),
        categories: splitCsv($('#docCategoriesInput').value),
        locationName: $('#docLocationInput').value.trim(),
        latitude: toNullableNumber($('#docLatitudeInput').value),
        longitude: toNullableNumber($('#docLongitudeInput').value),
        weather: $('#docWeatherInput').value.trim(),
        activity: $('#docActivityInput').value.trim(),
        music: $('#docMusicInput').value.trim(),
        mood: toNullableNumber($('#docMoodInput').value),
        energy: toNullableNumber($('#docEnergyInput').value),
        reminderAt: fromLocalDateTimeValue($('#docReminderInput').value),
        blocks,
        attachments,
        linkedDocumentIds: blankArray(existing.linkedDocumentIds),
        transcripts: blankArray(existing.transcripts),
        customFields: collectCustomFieldValues()
    };
}

function buildQuickAddSchema() {
    const journalOptions = journals().map((journal) => journal.name);
    const templateOptions = templates().map((template) => template.name);
    const customFieldDefs = customFields().map((field) => ({
        key: field.key,
        type: field.type === 'rating' ? 'number' : field.type,
        prefixes: blankArray(field.prefixes).length ? field.prefixes : [`${field.key}:`],
        options: blankArray(field.options),
        multiple: field.multiple === true,
        allowCustom: field.type === 'options',
        max: field.max || undefined,
        min: field.type === 'rating' ? 1 : undefined,
        showNumberStepper: field.type === 'rating'
    }));
    return {
        fields: [
            { key: 'title', type: 'string', required: true },
            { key: 'journal', type: 'options', prefixes: ['journal:', 'j:'], options: journalOptions, allowCustom: false },
            { key: 'template', type: 'options', prefixes: ['template:', 'tpl:'], options: templateOptions, allowCustom: false },
            { key: 'date', type: 'datetime', prefixes: ['due:', 'date:'], naturalDate: true, allowDateOnly: true, defaultTime: '09:00' },
            { key: 'duration', type: 'number', prefixes: ['for:', 'dur:'], allowMathExpression: true },
            { key: 'mood', type: 'number', prefixes: ['mood:'], min: 1, max: 10, showNumberStepper: true },
            { key: 'energy', type: 'number', prefixes: ['energy:'], min: 1, max: 10, showNumberStepper: true },
            { key: 'location', type: 'string', prefixes: ['place:', 'where:'] },
            { key: 'lat', type: 'number', prefixes: ['lat:'], allowMathExpression: true },
            { key: 'lng', type: 'number', prefixes: ['lng:', 'lon:'], allowMathExpression: true },
            { key: 'weather', type: 'string', prefixes: ['weather:'] },
            { key: 'activity', type: 'string', prefixes: ['activity:'] },
            { key: 'music', type: 'string', prefixes: ['music:'] },
            { key: 'symptom', type: 'string', prefixes: ['symptom:', 'sym:'] },
            { key: 'factor', type: 'string', prefixes: ['factor:', 'fac:'] },
            { key: 'reminder', type: 'datetime', prefixes: ['remind:', 'reminder:'], naturalDate: true, allowDateOnly: true, defaultTime: '18:00' },
            { key: 'tags', type: 'options', prefixes: ['#', 'tag:'], multiple: true, allowCustom: true, options: [] },
            { key: 'people', type: 'string', prefixes: ['@'], multiple: true },
            { key: 'categories', type: 'string', prefixes: ['category:', 'cat:'], multiple: true },
            { key: 'files', type: 'file', prefixes: ['file:', 'files:'], multiple: true },
            ...customFieldDefs
        ]
    };
}

function mountEditor() {
    state.editor = mountDocumentEditor({
        container: $('#documentEditorRoot'),
        getAssetUrl,
        createAsset: async (file, kind) => {
            const doc = currentDocument();
            if (!doc || !file) return null;
            return saveSingleAssetFile(file, doc, kind);
        },
        onChange: () => {
            const draft = collectDocumentDraft();
            renderDocumentChrome(draft);
            scheduleAutosave();
        }
    });
}

function mountQuickAdd() {
    if (!window.QuickAdd) return;
    const mount = $('#quickAddMount');
    mount.innerHTML = '';
    state.quickAdd = window.QuickAdd.create({
        mount,
        debounceMs: 260,
        entrySeparator: '\n\n',
        fieldTerminator: ';;',
        fieldTerminatorMode: 'or-next-prefix',
        fallbackField: 'title',
        autoDetectOptionsWithoutPrefix: true,
        placeholder: 'Walk at sunrise journal:Personal;; mood:7;; energy:6;; place:Home desk;; focus:writing;; @Mira;; #morning;;',
        showFieldActionBar: true,
        fieldActionBarButtons: [
            { fieldKey: 'date' },
            { fieldKey: 'journal' },
            { fieldKey: 'mood' },
            { fieldKey: 'location' },
            { fieldKey: 'reminder' }
        ],
        attachmentSources: ['upload'],
        schema: buildQuickAddSchema()
    });
}

async function applySeedState(seed) {
    for (const doc of blankArray(seed.documents)) await Storage.saveDocument(doc);
    for (const log of blankArray(seed.healthLogs)) await Storage.saveHealthLog(log);
    for (const asset of blankArray(seed.assets)) await Storage.saveAsset(asset);
    for (const view of blankArray(seed.views)) await Storage.saveView(view);
    for (const job of blankArray(seed.syncQueue)) await Storage.updateSyncJob(job);
    if (seed.settings) await Storage.saveSettings(seed.settings);
    if (seed.syncState) await Storage.saveSyncState(seed.syncState);
}

async function seedIfNeeded() {
    let all = await Storage.getAllData();
    const incompatible = all.documents.length && !('journalId' in all.documents[0]);
    if (incompatible) {
        await Storage.clearAll();
        await Storage.seedDefaults();
        all = await Storage.getAllData();
    }
    if (all.documents.length || all.healthLogs.length) return all;
    const seed = createSampleState();
    await applySeedState(seed);
    return Storage.getAllData();
}

async function loadState() {
    await Storage.init();
    await Storage.seedDefaults();
    const all = await seedIfNeeded();
    const { normalized, changed } = normalizeSeedDocuments(all.documents);
    if (changed) {
        for (const doc of normalized) await Storage.saveDocument(doc);
    }
    state.documents = normalized.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    state.healthLogs = blankArray(all.healthLogs).sort((a, b) => String(b.recordedAt).localeCompare(String(a.recordedAt)));
    state.assets = blankArray(all.assets).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    state.views = blankArray(all.views);
    state.settings = normalizeSettings(all.settings);
    state.syncQueue = blankArray(all.syncQueue);
    state.syncState = all.syncState;
    state.currentDocumentId = preferredDocumentId(state.documents);
}

async function refreshFromStorage(preferredDocId) {
    const all = await Storage.getAllData();
    state.documents = normalizeSeedDocuments(all.documents).normalized.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    state.healthLogs = blankArray(all.healthLogs).sort((a, b) => String(b.recordedAt).localeCompare(String(a.recordedAt)));
    state.assets = blankArray(all.assets).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    state.views = blankArray(all.views);
    state.settings = normalizeSettings(all.settings);
    state.syncQueue = blankArray(all.syncQueue);
    state.syncState = all.syncState;
    const existing = preferredDocId || state.currentDocumentId;
    state.currentDocumentId = state.documents.some((doc) => doc.id === existing) ? existing : preferredDocumentId(state.documents);
    state.lastSavedDocumentSnapshot = currentDocument() ? documentSnapshot(currentDocument()) : '';
    populateReferenceSelects();
    mountQuickAdd();
    renderAll();
}

function syncAutosaveIndicator(status = '') {
    const indicator = $('#autosaveIndicator');
    if (!indicator) return;
    clearTimeout(indicator._t);
    if (!status) {
        indicator.textContent = '';
        indicator.className = 'autosave-indicator';
        return;
    }
    if (status === 'saving') {
        indicator.textContent = 'Saving…';
        indicator.className = 'autosave-indicator saving';
        return;
    }
    indicator.textContent = 'Saved';
    indicator.className = 'autosave-indicator saved';
    indicator._t = setTimeout(() => {
        indicator.textContent = '';
        indicator.className = 'autosave-indicator';
    }, 1500);
}

function documentSnapshot(doc = {}) {
    const snapshot = JSON.parse(JSON.stringify(doc || {}));
    delete snapshot.updatedAt;
    return JSON.stringify(snapshot);
}

function upsertLocalDocument(saved) {
    state.documents = [saved, ...state.documents.filter((doc) => doc.id !== saved.id)]
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    state.currentDocumentId = saved.id;
    state.lastSavedDocumentSnapshot = documentSnapshot(saved);
}

function upsertLocalSyncJob(job) {
    state.syncQueue = [job, ...state.syncQueue.filter((item) => item.id !== job.id)]
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function refreshAfterDocumentSave(saved) {
    renderLibrary();
    if (saved && state.currentDocumentId === saved.id) {
        renderDocumentChrome(saved);
        renderAssets(saved);
        renderInspector(saved);
    }
    renderJournalSections();
    renderTimelineView();
    renderCalendarView();
    renderReflectView();
    renderInsights();
    renderHighlightsView();
    renderTagsView();
    renderPeopleView();
    renderTemplatesView();
    renderRemindersView();
    renderTranscriptView();
    renderMapView();
    renderSyncPanel();
    refreshIcons();
}

async function registerDriveBackgroundSync() {
    const drive = state.settings.drive || {};
    if (drive.enabled !== true || drive.syncMode !== 'background' || !drive.accessToken || !('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
        state.driveStatus = 'Background Drive sync is waiting for PWA registration.';
        renderSyncPanel();
        return false;
    }
    if (!('sync' in registration)) {
        state.driveStatus = 'Background Drive sync is unavailable in this browser.';
        renderSyncPanel();
        return false;
    }
    try {
        await registration.sync.register(DRIVE_BACKGROUND_SYNC_TAG);
    } catch (error) {
        state.driveStatus = `Background Drive sync is unavailable: ${error.message}`;
        renderSyncPanel();
        return false;
    }
    state.driveStatus = 'Drive changes queued for background delivery.';
    renderSyncPanel();
    return true;
}

async function queueDriveLibraryChange(type, targetId, payload = {}) {
    if (state.settings.drive?.enabled !== true) return null;
    const job = await Storage.enqueueSyncJob({
        type,
        action: 'upsert',
        targetId,
        status: 'queued',
        payload
    });
    upsertLocalSyncJob(job);
    await registerDriveBackgroundSync();
    return job;
}

async function persistDocument(doc, { refresh = true } = {}) {
    const saved = await Storage.saveDocument(doc);
    const syncJob = await Storage.enqueueSyncJob({
        type: 'document',
        action: 'upsert',
        targetId: saved.id,
        status: 'queued',
        payload: { updatedAt: saved.updatedAt }
    });
    await registerDriveBackgroundSync();
    if (refresh) {
        state.lastSavedDocumentSnapshot = documentSnapshot(saved);
        await refreshFromStorage(saved.id);
        return saved;
    }
    upsertLocalDocument(saved);
    upsertLocalSyncJob(syncJob);
    refreshAfterDocumentSave(saved);
    return saved;
}

function scheduleAutosave() {
    if (!currentDocument()) return;
    const draft = collectDocumentDraft();
    const snapshot = documentSnapshot(draft);
    if (snapshot === state.lastSavedDocumentSnapshot) return;
    state.pendingAutosave = draft;
    syncAutosaveIndicator('saving');
    clearTimeout(state.autosaveTimer);
    state.autosaveTimer = window.setTimeout(() => {
        flushAutosave().catch((error) => {
            console.error(error);
            syncAutosaveIndicator('');
        });
    }, 600);
}

async function flushAutosave() {
    clearTimeout(state.autosaveTimer);
    state.autosaveTimer = null;
    const draft = state.pendingAutosave;
    state.pendingAutosave = null;
    if (!draft) return null;
    const snapshot = documentSnapshot(draft);
    if (snapshot === state.lastSavedDocumentSnapshot) {
        syncAutosaveIndicator('');
        return null;
    }
    syncAutosaveIndicator('saving');
    const saved = await persistDocument(draft, { refresh: false });
    syncAutosaveIndicator('saved');
    return saved;
}

function revokeObjectUrls() {
    state.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    state.objectUrls.clear();
}

function makeBlobUrl(blob) {
    const url = URL.createObjectURL(blob);
    state.objectUrls.add(url);
    return url;
}

function getAssetById(id) {
    return state.assets.find((asset) => asset.id === id) || null;
}

function getAssetUrl(assetId = '') {
    const asset = getAssetById(assetId);
    if (!asset) return '';
    if (asset.remoteUrl) return asset.remoteUrl;
    if (asset.previewUrl) return asset.previewUrl;
    const blob = asset.metadata?.blob;
    return blob ? makeBlobUrl(blob) : '';
}

function resolveBlockAssetUrl(block = {}) {
    return block.src || getAssetUrl(block.assetId) || block.assetId || '';
}

function loadImageElement(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Could not load image'));
        };
        image.src = url;
    });
}

async function optimizeImageFile(file) {
    const maxEdge = Number(state.settings.media.imageMaxEdge || 2200);
    const quality = Number(state.settings.media.imageQuality || 0.82);
    const image = await loadImageElement(file);
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    return {
        blob,
        width: canvas.width,
        height: canvas.height,
        mimeType: 'image/webp',
        name: file.name.replace(/\.[^.]+$/, '') + '.webp'
    };
}

async function saveSingleAssetFile(file, doc = currentDocument(), forcedKind = '') {
    if (!doc || !file) return null;
    let blob = file;
    let mimeType = file.type || 'application/octet-stream';
    let name = file.name || `asset-${Date.now()}`;
    let width = null;
    let height = null;
    let storageMode = 'original';
    if ((forcedKind === 'image' || mimeType.startsWith('image/')) && state.settings.media.preserveOriginalImages === false) {
        const optimized = await optimizeImageFile(file);
        blob = optimized.blob;
        mimeType = optimized.mimeType;
        name = optimized.name;
        width = optimized.width;
        height = optimized.height;
        storageMode = 'optimized';
    }
    const kind = forcedKind || (mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('audio/') ? 'audio' : mimeType.startsWith('video/') ? 'video' : 'file');
    const asset = await Storage.saveAsset(createAssetEntry({
        documentId: doc.id,
        kind,
        name,
        originalName: file.name,
        mimeType,
        size: blob.size,
        width,
        height,
        storageMode,
        metadata: { blob }
    }));
    state.assets = [asset, ...state.assets.filter((item) => item.id !== asset.id)];
    await Storage.enqueueSyncJob({
        type: 'asset',
        action: 'upsert',
        targetId: asset.id,
        status: 'queued',
        payload: { documentId: doc.id }
    });
    await registerDriveBackgroundSync();
    return asset;
}

async function saveAssetFiles(files) {
    const doc = currentDocument();
    if (!doc || !files.length) return;
    const nextAttachmentIds = new Set(doc.attachments || []);
    const addedAssets = [];
    for (const file of files) {
        const asset = await saveSingleAssetFile(file, doc);
        if (!asset) continue;
        nextAttachmentIds.add(asset.id);
        addedAssets.push(asset);
    }
    const draft = collectDocumentDraft() || doc;
    const addedBlocks = addedAssets.map((asset) => ({
        id: `block_${asset.id}`,
        type: asset.kind,
        assetId: asset.id,
        ...(asset.kind === 'image' ? { alt: asset.name } : {}),
        ...(asset.kind === 'file' ? { name: asset.name, mimeType: asset.mimeType } : {}),
        captionRichText: []
    }));
    const blocks = [...blankArray(draft.blocks), ...addedBlocks];
    state.editor.setValue(blocks);
    await persistDocument({
        ...draft,
        blocks,
        attachments: [...nextAttachmentIds]
    });
}

function renderAssets(doc) {
    const assets = blankArray(doc.attachments).map(getAssetById).filter(Boolean);
    $('#assetList').innerHTML = assets.length ? assets.map((asset) => {
        const blob = asset.metadata?.blob;
        const url = blob ? makeBlobUrl(blob) : '';
        const media = asset.kind === 'image'
            ? `<img src="${url}" alt="${esc(asset.altText || asset.name)}">`
            : asset.kind === 'audio'
                ? `<audio controls src="${url}"></audio>`
                : asset.kind === 'video'
                    ? `<video controls src="${url}"></video>`
                    : '<div class="stack-item">File stored</div>';
        return `
            <article class="asset-card">
                <header>
                    <strong>${esc(asset.name)}</strong>
                    <span class="doc-type-pill">${esc(asset.kind)}</span>
                </header>
                ${media}
            </article>
        `;
    }).join('') : '<div class="inspector-empty">No attachments yet.</div>';
}

function renderInspector(doc) {
    $('#inspectorContent').innerHTML = `
        <article class="inspector-card">
            <header>
                <strong>${esc(doc.smartTitle || doc.title || 'Untitled')}</strong>
                <span class="doc-type-pill">${esc(journalById(doc.journalId)?.name || doc.type)}</span>
            </header>
            <div class="stack-list small">
                <div class="stack-item">
                    <span class="stack-title">Summary</span>
                    <span class="stack-meta">${esc(doc.summary || 'No summary yet')}</span>
                </div>
                <div class="stack-item">
                    <span class="stack-title">Place</span>
                    <span class="stack-meta">${esc(doc.locationName || 'No place')}</span>
                </div>
                <div class="stack-item">
                    <span class="stack-title">Metadata</span>
                    <span class="stack-meta">${esc([
                        Number.isFinite(doc.mood) ? `Mood ${doc.mood}/10` : '',
                        Number.isFinite(doc.energy) ? `Energy ${doc.energy}/10` : '',
                        doc.weather || ''
                    ].filter(Boolean).join(' • ') || 'No metadata yet')}</span>
                </div>
            </div>
        </article>
    `;
}

function populateReferenceSelects() {
    const journalOptions = journals().map((journal) => `<option value="${esc(journal.id)}">${esc(journal.name)}</option>`).join('');
    const templateOptions = templates().map((template) => `<option value="${esc(template.id)}">${esc(template.name)}</option>`).join('');
    ['#docJournalInput', '#templateJournalInput', '#reminderJournalInput'].forEach((selector) => {
        const element = $(selector);
        if (!element) return;
        const current = element.value;
        const blankLabel = selector === '#docJournalInput'
            ? '<option value="">General journal</option>'
            : '<option value="">All journals</option>';
        element.innerHTML = `${blankLabel}${journalOptions}`;
        if (current) element.value = current;
    });
    const docTemplate = $('#docTemplateInput');
    if (docTemplate) {
        const current = docTemplate.value;
        docTemplate.innerHTML = `<option value="">Blank page</option>${templateOptions}`;
        if (current) docTemplate.value = current;
    }
}

async function createNewDocument(options = {}) {
    const journalId = options.journalId || activeJournalId();
    const templateId = options.templateId || '';
    const template = templateMap().get(templateId);
    const doc = createJournalDocument({
        type: 'entry',
        journalId,
        templateId,
        title: options.title || template?.name || 'Untitled page',
        date: options.date || todayYmd(),
        status: 'today',
        tags: mergeUniqueValues(blankArray(options.tags), blankArray(template?.tags)),
        categories: blankArray(options.categories),
        blocks: options.blocks || buildDefaultBlocks(templateId),
        locationName: options.locationName || '',
        customFields: options.customFields || {}
    });
    await persistDocument(doc);
    state.activeView = 'write';
    location.hash = '#write';
}

async function toggleCurrentHighlight() {
    const doc = currentDocument();
    if (!doc) return;
    await persistDocument({
        ...doc,
        highlighted: !doc.highlighted
    });
}

async function toggleCurrentFavorite() {
    const doc = currentDocument();
    if (!doc) return;
    await persistDocument({
        ...doc,
        favorite: !doc.favorite
    });
}

async function createDraftDocumentFromForm(event) {
    event.preventDefault();
    const doc = createJournalDocument({
        journalId: activeJournalId(),
        title: $('#draftTitle').value.trim() || 'Untitled draft',
        date: $('#draftDate').value || todayYmd(),
        tags: splitCsv($('#draftTags').value),
        blocks: [createTextBlock('paragraph', $('#draftBody').value.trim())],
        status: 'active'
    });
    await persistDocument(doc);
    event.target.reset();
    setFieldValue('#draftDate', todayYmd());
}

async function exportQuickAddEntries() {
    if (!state.quickAdd) return [];
    const payload = await state.quickAdd.exportResult({
        attachmentMode: 'metadata-only',
        includeUnlinked: true,
        runValidation: false,
        runWarnings: false
    });
    return blankArray(payload.entries);
}

function buildQuickAddInsertionBlocks(entry, summaryText) {
    const title = String(entry.title || 'Quick capture').trim() || 'Quick capture';
    const meta = [
        entry.journal ? `Journal ${entry.journal}` : '',
        entry.date ? `When ${String(entry.date).replace('T', ' ').slice(0, 16)}` : '',
        entry.location ? `Place ${entry.location}` : '',
        entry.duration ? `Duration ${entry.duration}` : '',
        entry.mood ? `Mood ${entry.mood}/10` : '',
        entry.energy ? `Energy ${entry.energy}/10` : '',
        (Array.isArray(entry.categories) ? entry.categories : splitCsv(entry.categories)).length ? `Categories ${(Array.isArray(entry.categories) ? entry.categories : splitCsv(entry.categories)).join(', ')}` : '',
        entry.reminder ? `Reminder ${String(entry.reminder).replace('T', ' ').slice(0, 16)}` : ''
    ].filter(Boolean).join(' • ');
    const blocks = [
        createTextBlock('callout', title, { icon: '💡' })
    ];
    if (meta) blocks.push(createTextBlock('paragraph', meta));
    if (summaryText) blocks.push(createTextBlock('paragraph', summaryText));
    return blocks;
}

async function materializeQuickAddHealth(entry, linkedDocumentId) {
    const jobs = [];
    if (entry.symptom) {
        jobs.push(Storage.saveHealthLog({
            kind: 'symptom',
            title: entry.symptom,
            value: entry.mood || '',
            unit: entry.mood ? 'mood' : '',
            recordedAt: String(entry.date || new Date().toISOString()),
            source: 'quickadd',
            linkedDocumentId,
            notes: entry.title || '',
            metadata: entry
        }));
    }
    if (entry.factor) {
        jobs.push(Storage.saveHealthLog({
            kind: 'factor',
            title: entry.factor,
            value: entry.energy || '',
            unit: entry.energy ? 'energy' : '',
            recordedAt: String(entry.date || new Date().toISOString()),
            source: 'quickadd',
            linkedDocumentId,
            notes: entry.title || '',
            metadata: entry
        }));
    }
    await Promise.all(jobs);
}

function extractCustomFieldValuesFromEntry(entry) {
    return customFields().reduce((acc, field) => {
        if (entry[field.key] === undefined) return acc;
        acc[field.key] = entry[field.key];
        return acc;
    }, {});
}

async function saveQuickAddResult(mode = 'append') {
    const entries = await exportQuickAddEntries();
    if (!entries.length) return;
    if (mode === 'append') {
        const doc = currentDocument();
        if (!doc) return;
        const nextBlocks = [...blankArray(doc.blocks)];
        let tags = blankArray(doc.tags);
        let people = blankArray(doc.people);
        let categories = blankArray(doc.categories);
        let customFieldValues = { ...(doc.customFields || {}) };
        for (const entry of entries) {
            tags = mergeUniqueValues(tags, Array.isArray(entry.tags) ? entry.tags : splitCsv(entry.tags));
            people = mergeUniqueValues(people, Array.isArray(entry.people) ? entry.people : splitCsv(entry.people));
            categories = mergeUniqueValues(categories, Array.isArray(entry.categories) ? entry.categories : splitCsv(entry.categories));
            customFieldValues = { ...customFieldValues, ...extractCustomFieldValuesFromEntry(entry) };
            const summaryText = [
                entry.weather ? `Weather ${entry.weather}` : '',
                entry.activity ? `Activity ${entry.activity}` : '',
                entry.music ? `Music ${entry.music}` : '',
                entry.symptom ? `Symptom ${entry.symptom}` : '',
                entry.factor ? `Factor ${entry.factor}` : ''
            ].filter(Boolean).join(' • ');
            nextBlocks.push(...buildQuickAddInsertionBlocks(entry, summaryText));
            await materializeQuickAddHealth(entry, doc.id);
        }
        await persistDocument({
            ...doc,
            tags,
            people,
            categories,
            locationName: entries[0].location || doc.locationName,
            mood: toNullableNumber(entries[0].mood) ?? doc.mood,
            energy: toNullableNumber(entries[0].energy) ?? doc.energy,
            customFields: customFieldValues,
            blocks: nextBlocks
        });
        state.quickAdd.setInput('');
        return;
    }
    for (const entry of entries) {
        const journal = findJournalByNameOrId(entry.journal) || journalById(activeJournalId());
        const template = findTemplateByNameOrId(entry.template);
        const doc = createJournalDocument({
            journalId: journal?.id || activeJournalId(),
            templateId: template?.id || '',
            title: entry.title || template?.name || 'Quick capture',
            date: String(entry.date || '').slice(0, 10) || todayYmd(),
            startAt: entry.date ? new Date(entry.date).toISOString() : '',
            durationMinutes: toNullableNumber(entry.duration),
            mood: toNullableNumber(entry.mood),
            energy: toNullableNumber(entry.energy),
            tags: Array.isArray(entry.tags) ? entry.tags : splitCsv(entry.tags),
            people: Array.isArray(entry.people) ? entry.people : splitCsv(entry.people),
            categories: Array.isArray(entry.categories) ? entry.categories : splitCsv(entry.categories),
            locationName: entry.location || '',
            latitude: toNullableNumber(entry.lat),
            longitude: toNullableNumber(entry.lng),
            weather: entry.weather || '',
            activity: entry.activity || '',
            music: entry.music || '',
            reminderAt: entry.reminder ? new Date(entry.reminder).toISOString() : '',
            blocks: buildQuickAddInsertionBlocks(entry, ''),
            customFields: extractCustomFieldValuesFromEntry(entry)
        });
        await persistDocument(doc);
        await materializeQuickAddHealth(entry, doc.id);
    }
    state.quickAdd.setInput('');
}

function renderJournalSections() {
    const journalsContent = getJournalCardModel().map((journal) => `
        <article class="doc-list-item ${journal.active ? 'is-active' : ''}">
            <div class="doc-list-item-top">
                <span class="doc-type-pill">${esc(journal.name)}</span>
                <span class="doc-list-date">${journal.count}</span>
            </div>
            <strong>${esc(journal.description)}</strong>
            <div class="composer-actions">
                <button class="btn btn-secondary btn-icon" type="button" data-select-journal="${esc(journal.id)}" aria-label="Open ${esc(journal.name)}"><img class="app-icon" data-lucide="book-open" src="./assets/lucide/book-open.svg" alt="" aria-hidden="true" /></button>
                <button class="btn btn-secondary btn-icon" type="button" data-new-entry-for-journal="${esc(journal.id)}" aria-label="New entry in ${esc(journal.name)}"><img class="app-icon" data-lucide="plus" src="./assets/lucide/plus.svg" alt="" aria-hidden="true" /></button>
            </div>
        </article>
    `).join('');
    $('#journalDrawerContent').innerHTML = journalsContent || '<div class="inspector-empty">No journals yet.</div>';

    const monthDay = todayYmd().slice(5);
    const memories = state.documents
        .filter((doc) => doc.date && doc.date.slice(5) === monthDay && doc.date.slice(0, 4) !== todayYmd().slice(0, 4))
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    $('#onThisDayContent').innerHTML = memories.length ? memories.map((doc) => `
        <button class="doc-list-item" type="button" data-open-doc="${esc(doc.id)}">
            <span class="doc-list-item-top">
                <span class="doc-type-pill">${esc(doc.date.slice(0, 4))}</span>
                <span class="doc-list-date">${esc(doc.locationName || journalById(doc.journalId)?.name || '')}</span>
            </span>
            <strong>${esc(doc.smartTitle || doc.title)}</strong>
            <span class="doc-list-meta">${esc(doc.summary || '')}</span>
        </button>
    `).join('') : '<div class="inspector-empty">Nothing from this day yet.</div>';
}

function renderTimelineView() {
    $('#timelineContent').innerHTML = renderTimeline(journalDocuments(), journalMap());
}

function renderCalendarView() {
    const cursor = state.calendarCursor;
    $('#calendarLabel').textContent = cursor.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    $('#calendarContent').innerHTML = renderCalendar(journalDocuments(), cursor.getFullYear(), cursor.getMonth());
}

function renderHighlightsView() {
    const docs = filteredDocuments().filter((doc) => doc.highlighted);
    $('#highlightsContent').innerHTML = docs.length
        ? renderDocumentList(docs, state.currentDocumentId, journalMap())
        : '<div class="inspector-empty">No highlights yet. Highlight a page from the editor header.</div>';
}

function renderAggregateRows(items) {
    return items.map((item) => `
        <button class="doc-list-item doc-list-item--compact" type="button" data-run-search="${esc(item.query || '')}">
            <span class="doc-type-pill">${esc(item.name)}</span>
            <strong>${esc(item.subtitle || 'Open collection')}</strong>
            <span class="doc-list-meta">${esc(item.preview || '')}</span>
            <span class="doc-list-date">${item.count}</span>
        </button>
    `).join('');
}

function renderTagsView() {
    const map = new Map();
    filteredDocuments().forEach((doc) => {
        blankArray(doc.tags).forEach((tag) => {
            const row = map.get(tag) || { name: tag, count: 0, subtitle: '', preview: '', query: `tag:${tag}` };
            row.count += 1;
            row.subtitle = prettyDate(doc.updatedAt);
            row.preview = doc.smartTitle || doc.title;
            map.set(tag, row);
        });
    });
    const rows = [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    $('#tagsContent').innerHTML = rows.length ? renderAggregateRows(rows) : '<div class="inspector-empty">No tags yet.</div>';
}

function renderPeopleView() {
    const map = new Map();
    filteredDocuments().forEach((doc) => {
        blankArray(doc.people).forEach((person) => {
            const row = map.get(person) || { name: person, count: 0, subtitle: '', preview: '', query: `@${person}` };
            row.count += 1;
            row.subtitle = prettyDate(doc.updatedAt);
            row.preview = doc.smartTitle || doc.title;
            map.set(person, row);
        });
    });
    const rows = [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    $('#peopleContent').innerHTML = rows.length ? renderAggregateRows(rows) : '<div class="inspector-empty">No people yet.</div>';
}

function renderTemplatesView() {
    $('#templatesList').innerHTML = templates().map((template) => `
        <article class="doc-list-item">
            <span class="doc-list-item-top">
                <span class="doc-type-pill">${esc(journalById(template.journalId)?.name || 'All journals')}</span>
                <span class="doc-list-date">${blankArray(template.tags).length}</span>
            </span>
            <strong>${esc(template.name)}</strong>
            <span class="doc-list-meta">${esc(blankArray(template.tags).join(' • ') || 'No tags')}</span>
            <div class="composer-actions">
                <button class="btn btn-secondary btn-icon" type="button" data-apply-template="${esc(template.id)}" aria-label="Use ${esc(template.name)} template"><img class="app-icon" data-lucide="layout-template" src="./assets/lucide/layout-template.svg" alt="" aria-hidden="true" /></button>
            </div>
        </article>
    `).join('');
}

function recurringReminderDate(reminder) {
    if (reminder.date && reminder.time) return `${reminder.date} ${reminder.time}`;
    if (reminder.time) return `${reminder.frequency || 'repeat'} at ${reminder.time}`;
    return reminder.frequency || 'No schedule';
}

function renderRemindersView() {
    const docReminders = state.documents.filter((doc) => doc.reminderAt).map((doc) => ({
        id: `doc-${doc.id}`,
        title: doc.reminderLabel || doc.title,
        journalId: doc.journalId,
        date: doc.reminderAt,
        time: '',
        frequency: 'entry',
        docId: doc.id
    }));
    const rows = [...reminders(), ...docReminders];
    $('#remindersList').innerHTML = rows.length ? rows.map((item) => `
        <article class="doc-list-item">
            <span class="doc-list-item-top">
                <span class="doc-type-pill">${esc(journalById(item.journalId)?.name || 'Any journal')}</span>
                <span class="doc-list-date">${esc(item.docId ? prettyDateTime(item.date) : recurringReminderDate(item))}</span>
            </span>
            <strong>${esc(item.title)}</strong>
            <span class="doc-list-meta">${esc(item.active === false ? `${item.frequency} · paused` : item.frequency)}</span>
            ${item.docId
                ? `<div class="composer-actions"><button class="btn btn-secondary btn-icon" type="button" data-open-doc="${esc(item.docId)}" aria-label="Open entry"><img class="app-icon" data-lucide="arrow-up-right" src="./assets/lucide/arrow-up-right.svg" alt="" aria-hidden="true" /></button></div>`
                : `<div class="composer-actions">
                    <button class="btn btn-secondary btn-icon" type="button" data-toggle-reminder="${esc(item.id)}" aria-label="${item.active === false ? 'Resume' : 'Pause'} ${esc(item.title)}"><img class="app-icon" data-lucide="${item.active === false ? 'bell' : 'circle'}" src="./assets/lucide/${item.active === false ? 'bell' : 'circle'}.svg" alt="" aria-hidden="true" /></button>
                    <button class="btn btn-secondary btn-icon" type="button" data-delete-reminder="${esc(item.id)}" aria-label="Delete ${esc(item.title)}"><img class="app-icon" data-lucide="x" src="./assets/lucide/x.svg" alt="" aria-hidden="true" /></button>
                </div>`}
        </article>
    `).join('') : '<div class="inspector-empty">No reminders yet.</div>';
    const notifications = state.settings.notifications || {};
    const status = state.reminderNotificationStatus || (notifications.enabled
        ? notifications.periodicRegistered ? 'Notifications on · background checks browser-managed' : 'Notifications on · while app is open'
        : 'Notifications off');
    $('#reminderNotificationStatus').textContent = status;
    $('#enableRemindersBtn').setAttribute('aria-label', notifications.enabled ? 'Disable reminder notifications' : 'Enable reminder notifications');
    $('#enableRemindersBtn').setAttribute('title', notifications.enabled ? 'Disable reminder notifications' : 'Enable reminder notifications');
}

async function checkDueReminderNotifications() {
    if (state.reminderCheckInFlight || state.settings.notifications?.enabled !== true) return [];
    if (!('Notification' in window) || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return [];
    state.reminderCheckInFlight = true;
    try {
        const registration = await navigator.serviceWorker.ready;
        const deliveryState = await Storage.getMeta(REMINDER_META_KEY) || {};
        const result = evaluateDueReminders({ settings: state.settings, documents: state.documents, now: new Date(), deliveryState });
        for (const reminder of result.due) {
            await registration.showNotification(reminder.title, {
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
        await Storage.saveMeta(REMINDER_META_KEY, result.deliveryState);
        if (result.due.length) {
            state.reminderNotificationStatus = `Delivered ${result.due.length} reminder${result.due.length === 1 ? '' : 's'}`;
            renderRemindersView();
        }
        return result.due;
    } finally {
        state.reminderCheckInFlight = false;
    }
}

async function enableReminderNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) throw new Error('This browser does not support PWA notifications');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error(`Notification permission is ${permission}`);
    const registration = await navigator.serviceWorker.ready;
    let periodicRegistered = false;
    if ('periodicSync' in registration) {
        const periodicPermission = await navigator.permissions.query({ name: 'periodic-background-sync' });
        if (periodicPermission.state === 'granted') {
            await registration.periodicSync.register(REMINDER_PERIODIC_TAG, { minInterval: REMINDER_PERIODIC_INTERVAL });
            periodicRegistered = true;
        }
    }
    state.settings = normalizeSettings({
        ...state.settings,
        notifications: { enabled: true, periodicRegistered, permission }
    });
    await Storage.saveSettings(state.settings);
    state.reminderNotificationStatus = periodicRegistered
        ? 'Notifications on · background checks browser-managed'
        : 'Notifications on · while app is open';
    if (state.reminderTimer) clearInterval(state.reminderTimer);
    state.reminderTimer = window.setInterval(checkDueReminderNotifications, 30 * 1000);
    renderRemindersView();
    return checkDueReminderNotifications();
}

async function disableReminderNotifications() {
    const registration = await navigator.serviceWorker.ready;
    if (state.settings.notifications?.periodicRegistered === true) {
        await registration.periodicSync.unregister(REMINDER_PERIODIC_TAG);
    }
    state.settings = normalizeSettings({
        ...state.settings,
        notifications: { enabled: false, periodicRegistered: false, permission: Notification.permission }
    });
    await Storage.saveSettings(state.settings);
    if (state.reminderTimer) clearInterval(state.reminderTimer);
    state.reminderTimer = null;
    state.reminderNotificationStatus = 'Notifications off';
    renderRemindersView();
}

async function openReminderTarget(data = {}) {
    await flushAutosave();
    if (data.documentId && state.documents.some((document) => document.id === data.documentId)) {
        state.currentDocumentId = data.documentId;
        state.activeView = 'write';
        location.hash = `#write:${encodeURIComponent(data.documentId)}`;
    } else if (data.journalId && journalById(data.journalId)) {
        state.settings = normalizeSettings({ ...state.settings, activeJournalId: data.journalId });
        await Storage.saveSettings(state.settings);
        state.activeView = 'journals';
        location.hash = `#journals:${encodeURIComponent(data.journalId)}`;
    } else {
        state.activeView = 'write';
        location.hash = '#write';
    }
    renderAll();
}

function startReminderRuntime() {
    if (state.reminderTimer) clearInterval(state.reminderTimer);
    if (state.settings.notifications?.enabled === true) {
        checkDueReminderNotifications();
        state.reminderTimer = window.setInterval(checkDueReminderNotifications, 30 * 1000);
    }
    navigator.serviceWorker?.addEventListener('message', async (event) => {
        if (event.data?.type === 'open-reminder') {
            await openReminderTarget(event.data);
            return;
        }
        if (event.data?.type === 'drive-sync-complete') {
            state.driveStatus = `Background Drive sync completed for ${event.data.documentCount} page${event.data.documentCount === 1 ? '' : 's'}.`;
            await refreshFromStorage(state.currentDocumentId);
            return;
        }
        if (event.data?.type === 'drive-sync-error') {
            state.driveStatus = `Background Drive sync failed: ${event.data.message}`;
            renderSyncPanel();
        }
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkDueReminderNotifications();
    });
}

function renderHealth() {
    const model = buildHealthInsightModel(state.healthLogs);
    const cards = [
        { label: 'Health entries', value: model.cards[0]?.value || 0, note: 'Total logged' },
        { label: 'Tracked days', value: model.cards[1]?.value || 0, note: 'Days with health data' },
        { label: 'Average mood', value: (model.cards[2]?.value || 0).toFixed(1), note: 'Across tracked days' },
        { label: 'Average severity', value: (model.cards[3]?.value || 0).toFixed(1), note: 'Across tracked days' }
    ];
    $('#healthSummaryGrid').innerHTML = cards.map((card) => `
        <article class="health-card">
            <span class="health-label">${esc(card.label)}</span>
            <strong>${esc(card.value)}</strong>
            <span class="health-note">${esc(card.note)}</span>
        </article>
    `).join('');
    $('#healthMeasurementsBody').innerHTML = renderMeasurementsTable(
        state.healthLogs
            .filter((item) => item.kind === 'measurement')
            .map((item) => ({
                metric: item.title,
                value: item.value,
                unit: item.unit,
                sourcePlatform: item.metadata?.sourcePlatform || item.source,
                date: item.recordedAt
            }))
    );
    const tokenControl = $('#fitbitAccessTokenInput');
    const dateControl = $('#fitbitImportDateInput');
    if (tokenControl?.value) state.fitbitAccessTokenDraft = tokenControl.value;
    if (dateControl?.value) state.fitbitImportDate = dateControl.value;
    if (state.fitbitAccessTokenDraft === null) state.fitbitAccessTokenDraft = state.settings.health?.fitbitAccessToken || '';
    if (!state.fitbitImportDate) state.fitbitImportDate = todayYmd();
    setFieldValue('#fitbitAccessTokenInput', state.fitbitAccessTokenDraft);
    setFieldValue('#fitbitImportDateInput', state.fitbitImportDate);
    $('#fitbitImportStatus').textContent = state.fitbitStatus
        || (state.settings.health?.fitbitLastImportedAt
            ? `Last imported ${prettyDateTime(state.settings.health.fitbitLastImportedAt)}`
            : 'Not imported yet');
}

function renderTranscriptView() {
    $('#transcriptList').innerHTML = renderTranscriptCards(getAllTranscripts());
}

function renderInsights() {
    const insightRecords = state.documents.map(mapDocumentToInsightRecord);
    const tagSeries = buildCategorySeries(insightRecords, { field: 'tags', reducer: 'count', limit: 6 });
    const journalSeries = buildCategorySeries(state.documents.map((doc) => ({
        ...mapDocumentToInsightRecord(doc),
        tags: [journalById(doc.journalId)?.name || doc.journalId]
    })), { field: 'tags', reducer: 'count', limit: 6 });
    $('#insightTags').innerHTML = renderInsightBars([
        ...tagSeries.map((item) => ({ label: item.key, value: item.count, display: `${item.count}` })),
        ...journalSeries.slice(0, 2).map((item) => ({ label: item.key, value: item.count, display: `${item.count}` }))
    ]);
    const healthModel = buildHealthInsightModel(state.healthLogs);
    $('#insightHealth').innerHTML = renderInsightBars(
        healthModel.cards.map((item) => ({
            label: item.label,
            value: item.value,
            display: `${Math.round(item.value * 10) / 10}`
        }))
    );
    const streak = computeStreak(insightRecords, { dateKey: 'at' });
    $('#insightStreakChip').textContent = `${streak.current}-day streak`;
}

function buildLocalSummary(doc) {
    const firstParagraph = blocksToPlainText(doc.blocks, ' ').trim();
    const parts = [
        doc.locationName ? `Set in ${doc.locationName}.` : '',
        Number.isFinite(doc.mood) ? `Mood ${doc.mood}/10.` : '',
        doc.weather ? `${doc.weather}.` : '',
        firstParagraph ? firstParagraph.slice(0, 140).trim() : ''
    ].filter(Boolean);
    return parts.join(' ').trim() || 'A quieter note with room for follow-up.';
}

function buildLocalTitle(doc) {
    if (doc.title && doc.title.trim() && doc.title !== 'Untitled page') return doc.title.trim();
    const tag = blankArray(doc.tags)[0];
    const place = doc.locationName;
    if (tag && place) return `${tag[0].toUpperCase()}${tag.slice(1)} in ${place}`;
    if (tag) return `${tag[0].toUpperCase()}${tag.slice(1)} check-in`;
    if (place) return `Notes from ${place}`;
    const firstWords = blocksToPlainText(doc.blocks, ' ').trim().split(/\s+/).slice(0, 5).join(' ');
    return firstWords || 'Untitled reflection';
}

function buildLocalChat(doc) {
    return [
        `A useful theme here is ${doc.activity || blankArray(doc.tags)[0] || 'attention'}.`,
        Number.isFinite(doc.energy) && doc.energy < 5 ? 'Energy looks lower than ideal, so tonight might need a softer plan.' : 'Energy looks usable, so this could support one deliberate next step.',
        doc.locationName ? `This entry is anchored to ${doc.locationName}, which makes it easier to recall later in map and On This Day views.` : 'Adding a place could make this memory easier to revisit later.',
        `One next move: ${doc.reminderAt ? 'honor the reminder you already set' : 'set a reminder or turn this into tomorrow’s first block'}.`
    ].join(' ');
}

async function runAiChatCompletion(messages) {
    const provider = state.settings.ai.provider;
    if (provider === 'local-reflection') {
        const doc = currentDocument();
        return buildLocalChat(doc || {});
    }
    if (provider === 'prompt_api') {
        if (!window.LanguageModel?.create) {
            throw new Error('Chrome Prompt API is not available in this browser.');
        }
        const availability = await window.LanguageModel.availability();
        if (availability === 'unavailable') throw new Error('Chrome Prompt API model is unavailable on this device.');
        const initialPrompts = messages
            .filter((item) => item.role === 'system')
            .map((item) => ({ role: 'system', content: item.content }));
        const prompts = messages
            .filter((item) => item.role !== 'system')
            .map((item) => ({ role: item.role, content: item.content }));
        const session = await window.LanguageModel.create({ initialPrompts });
        try {
            const result = await session.prompt(prompts.length === 1 ? prompts[0].content : prompts);
            return String(result || '');
        } finally {
            session.destroy?.();
        }
    }
    if (provider === 'byok' || provider === 'local_model') {
        if (!state.settings.ai.model || !state.settings.ai.endpoint) throw new Error('AI provider needs an endpoint and model.');
        if (provider === 'byok' && !state.settings.ai.apiKey) throw new Error('BYOK AI provider needs an API key.');
        const headers = { 'Content-Type': 'application/json' };
        if (state.settings.ai.apiKey) headers.Authorization = `Bearer ${state.settings.ai.apiKey}`;
        const response = await fetch(state.settings.ai.endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: state.settings.ai.model,
                temperature: 0.4,
                messages
            })
        });
        if (!response.ok) throw new Error(`AI request failed: ${response.status}`);
        const payload = await response.json();
        const result = payload.choices?.[0]?.message?.content || payload.output_text || payload.text || payload.response || '';
        if (!result) throw new Error('AI endpoint returned no response text.');
        return String(result);
    }
    throw new Error('Choose an AI provider in settings first.');
}

async function runAiAction(action) {
    const doc = currentDocument();
    if (!doc) return;
    state.aiStatus = 'Working...';
    renderReflectView();
    try {
        if (action === 'summary') {
            const summary = state.settings.ai.provider === 'local-reflection'
                ? buildLocalSummary(doc)
                : await runAiChatCompletion([
                    { role: 'system', content: 'Summarize this journal entry in 2 concise sentences.' },
                    { role: 'user', content: blocksToPlainText(doc.blocks, '\n') }
                ]);
            await persistDocument({ ...doc, summary });
            state.aiResponse = summary;
        } else if (action === 'title') {
            const smartTitle = state.settings.ai.provider === 'local-reflection'
                ? buildLocalTitle(doc)
                : await runAiChatCompletion([
                    { role: 'system', content: 'Suggest one short strong title for this journal entry.' },
                    { role: 'user', content: blocksToPlainText(doc.blocks, '\n') }
                ]);
            await persistDocument({ ...doc, smartTitle: String(smartTitle).trim() });
            state.aiResponse = String(smartTitle).trim();
        } else if (action === 'chat') {
            const prompt = state.aiDraft.trim() || 'What should I notice here?';
            const reply = state.settings.ai.provider === 'local-reflection'
                ? buildLocalChat(doc)
                : await runAiChatCompletion([
                    { role: 'system', content: 'You are a reflective journaling assistant. Ground answers in the provided journal entry and keep them concise.' },
                    { role: 'user', content: `Prompt: ${prompt}\n\nEntry:\n${blocksToPlainText(doc.blocks, '\n')}` }
                ]);
            const history = blankArray(doc.metadata?.aiHistory).concat([{ prompt, reply, at: new Date().toISOString() }]);
            await persistDocument({ ...doc, metadata: { ...(doc.metadata || {}), aiHistory: history } });
            state.aiResponse = reply;
        }
        state.aiStatus = 'Ready';
    } catch (error) {
        state.aiStatus = String(error.message || error);
    }
    renderReflectView();
}

function renderReflectView() {
    const doc = currentDocument();
    const journal = journalById(activeJournalId());
    const recent = journalDocuments().slice(0, 3);
    const memories = state.documents
        .filter((item) => item.highlighted || item.journalId === activeJournalId())
        .slice(0, 4);
    const boardHead = $('#boards .panel-head h2');
    if (boardHead) boardHead.textContent = 'Reflect';
    $('#boardContent').innerHTML = `
        <section class="subpanel">
            <div class="subpanel-head">
                <h3>${esc(journal?.name || 'Current journal')}</h3>
            </div>
            <div class="stack-list small">
                ${recent.map((item) => `
                    <button class="doc-list-item" type="button" data-open-doc="${esc(item.id)}">
                        <strong>${esc(item.smartTitle || item.title)}</strong>
                        <span class="doc-list-meta">${esc(item.summary || item.locationName || prettyDate(item.date))}</span>
                    </button>
                `).join('')}
            </div>
        </section>
        <section class="subpanel">
            <div class="subpanel-head">
                <h3>AI</h3>
            </div>
            <label class="field">
                <span>Ask the journal</span>
                <textarea id="aiPromptInput" rows="4" placeholder="What pattern should I notice in this page?">${esc(state.aiDraft)}</textarea>
            </label>
            <div class="composer-actions">
                <button class="btn btn-secondary" type="button" data-ai-action="summary"><img class="app-icon" data-lucide="file-text" src="./assets/lucide/file-text.svg" alt="" aria-hidden="true" /><span>Summarize</span></button>
                <button class="btn btn-secondary" type="button" data-ai-action="title"><img class="app-icon" data-lucide="sparkles" src="./assets/lucide/sparkles.svg" alt="" aria-hidden="true" /><span>Title</span></button>
                <button class="btn btn-primary" type="button" data-ai-action="chat"><img class="app-icon" data-lucide="message-square" src="./assets/lucide/message-square.svg" alt="" aria-hidden="true" /><span>Chat</span></button>
            </div>
            <div class="stack-item">
                <span class="stack-title">${esc(state.aiStatus || 'AI ready')}</span>
                <span class="stack-meta">${esc(state.aiResponse || doc?.summary || 'AI responses will appear here.')}</span>
            </div>
        </section>
        <section class="subpanel">
            <div class="subpanel-head">
                <h3>Memory</h3>
            </div>
            <div class="stack-list small">
                ${memories.map((item) => `
                    <button class="doc-list-item" type="button" data-open-doc="${esc(item.id)}">
                        <strong>${esc(item.smartTitle || item.title)}</strong>
                        <span class="doc-list-meta">${esc([prettyDate(item.date), item.locationName].filter(Boolean).join(' • '))}</span>
                    </button>
                `).join('')}
            </div>
        </section>
    `;
}

function renderMapView() {
    if (state.activeView !== 'map') return;
    const entries = filteredDocuments()
        .filter((doc) => Number.isFinite(doc.latitude) && Number.isFinite(doc.longitude));
    $('#mapLocationList').innerHTML = entries.length ? entries.map((doc) => `
        <button class="doc-list-item" type="button" data-open-doc="${esc(doc.id)}">
            <span class="doc-list-item-top">
                <span class="doc-type-pill">${esc(journalById(doc.journalId)?.name || doc.type)}</span>
                <span class="doc-list-date">${esc(doc.locationName)}</span>
            </span>
            <strong>${esc(doc.smartTitle || doc.title)}</strong>
            <span class="doc-list-meta">${esc([prettyDate(doc.date), doc.weather].filter(Boolean).join(' • '))}</span>
        </button>
    `).join('') : '<div class="inspector-empty">No map-linked entries yet. Add a place with coordinates in the editor.</div>';

    if (!entries.length || !window.L) return;
    const mapCanvas = $('#mapCanvas');
    if (!mapCanvas) return;
    if (!state.map) {
        state.map = window.L.map(mapCanvas, {
            zoomControl: true,
            scrollWheelZoom: false
        }).setView([20, 0], 2);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(state.map);
        state.mapLayer = window.L.layerGroup().addTo(state.map);
    }
    state.mapLayer.clearLayers();
    const bounds = [];
    entries.forEach((doc) => {
        const marker = window.L.marker([doc.latitude, doc.longitude]).addTo(state.mapLayer);
        marker.bindPopup(`<strong>${esc(doc.smartTitle || doc.title)}</strong><br>${esc(doc.locationName || '')}`);
        marker.on('click', () => {
            state.currentDocumentId = doc.id;
            state.activeView = 'write';
            renderAll();
            location.hash = '#write';
        });
        bounds.push([doc.latitude, doc.longitude]);
    });
    requestAnimationFrame(() => {
        state.map.invalidateSize();
        if (bounds.length === 1) state.map.setView(bounds[0], 8);
        else state.map.fitBounds(bounds, { padding: [28, 28] });
    });
}

function renderSyncPanel() {
    const notion = state.settings.notion || {};
    const drive = state.settings.drive || {};
    const hasRecentSync = Boolean(notion.lastSyncedAt || drive.lastPushAt || drive.lastPullAt);
    // Compute status only from enabled providers — avoid Drive "disabled" bleeding through
    let syncStatus;
    if (!notion.enabled && !drive.enabled) {
        syncStatus = 'inactive';
    } else if ((notion.enabled && state.notionStatus?.startsWith('Syncing')) ||
               (drive.enabled && state.driveStatus?.startsWith('Syncing'))) {
        syncStatus = 'syncing';
    } else if (hasRecentSync) {
        syncStatus = 'synced';
    } else {
        syncStatus = 'ready';
    }
    const queuedJobs = blankArray(state.syncQueue).filter((job) => job.status === 'queued');
    const notionLine = notion.enabled
        ? state.notionStatus || `Notion ready${notion.lastSyncedAt ? ` · last sync ${prettyDateTime(notion.lastSyncedAt)}` : ''}`
        : 'Notion sync is off. Add worker URL, token, and parent page in Settings.';
    const driveActivity = drive.lastPullAt
        ? ` · last restore ${prettyDateTime(drive.lastPullAt)}`
        : drive.lastPushAt ? ` · last push ${prettyDateTime(drive.lastPushAt)}` : '';
    const driveLine = drive.enabled
        ? state.driveStatus || `Drive ready${driveActivity}`
        : 'Drive sync is off. Add a Google OAuth client ID or access token in Settings.';
    $('#syncStatusCard').innerHTML = `
        <span class="status-pill status-pill--${syncStatus}">${esc(syncStatus)}</span>
        <p>${esc(notionLine)}</p>
        ${drive.enabled ? `<p>${esc(driveLine)}</p>` : ''}
        ${notion.lastPageUrl ? `<a class="sync-help" href="${esc(notion.lastPageUrl)}" target="_blank" rel="noreferrer">Open latest Notion page ↗</a>` : ''}
        ${drive.lastFileUrl ? `<a class="sync-help" href="${esc(drive.lastFileUrl)}" target="_blank" rel="noreferrer">Open latest Drive file ↗</a>` : ''}
        ${queuedJobs.length ? `<span class="sync-help">${queuedJobs.length} queued job${queuedJobs.length > 1 ? 's' : ''}.</span>` : ''}
    `;
    $('#syncQueueList').innerHTML = queuedJobs.slice(0, 6).map((job) => `
        <div class="sync-job">
            <strong>${esc(job.type)}</strong>
            <span class="stack-meta">${esc(`${job.action} • ${job.status}`)}</span>
        </div>
    `).join('') || '<div class="inspector-empty">No queued sync jobs.</div>';
}

function renderCustomFieldList() {
    $('#customFieldsList').innerHTML = customFields().map((field) => `
        <article class="doc-list-item">
            <span class="doc-list-item-top">
                <span class="doc-type-pill">${esc(field.type)}</span>
                <span class="doc-list-date">${field.multiple ? 'multi' : 'single'}</span>
            </span>
            <strong>${esc(field.label)}</strong>
            <span class="doc-list-meta">${esc(blankArray(field.prefixes).join(', ') || field.key)}</span>
        </article>
    `).join('');
}

function renderSavedSearchList() {
    const html = savedSearches().map((item) => `
        <button class="doc-list-item" type="button" data-run-search="${esc(item.query)}">
            <strong>${esc(item.name)}</strong>
            <span class="doc-list-meta">${esc(item.query)}</span>
        </button>
    `).join('') || '<div class="inspector-empty">No saved searches yet.</div>';
    const settingsMount = $('#savedSearchList');
    if (settingsMount) settingsMount.innerHTML = html;
    const libraryMount = $('#librarySavedSearchList');
    if (libraryMount) libraryMount.innerHTML = html;
}

function transcriptionSettingsFromAi(ai = state.settings.ai || {}) {
    return {
        provider: ai.transcriptionProvider || 'browser_native',
        apiKey: ai.transcriptionApiKey || '',
        endpoint: ai.transcriptionEndpoint || '',
        model: ai.transcriptionModel || '',
        language: ai.transcriptionLanguage || 'en-US',
        instructions: ai.transcriptionInstructions || '',
        insertMode: ai.transcriptionInsertMode || 'collapsible'
    };
}

function readTranscriptionControls() {
    return {
        provider: $('#transcriptionProviderInput').value || 'browser_native',
        apiKey: $('#transcriptionApiKeyInput').value.trim(),
        endpoint: $('#transcriptionEndpointInput').value.trim(),
        model: $('#transcriptionModelInput').value.trim(),
        language: $('#transcriptionLanguageInput').value.trim() || 'auto',
        instructions: $('#transcriptionInstructionsInput').value.trim(),
        insertMode: $('#transcriptionInsertModeInput').value || 'collapsible'
    };
}

function ensureTranscriptionDraft() {
    if (!state.transcriptionDraft) state.transcriptionDraft = transcriptionSettingsFromAi();
    return state.transcriptionDraft;
}

async function saveTranscriptionSettings(event) {
    event?.preventDefault();
    state.transcriptionDraft = readTranscriptionControls();
    const draft = state.transcriptionDraft;
    state.settings = normalizeSettings({
        ...state.settings,
        ai: {
            ...state.settings.ai,
            transcriptionProvider: draft.provider,
            transcriptionApiKey: draft.apiKey,
            transcriptionEndpoint: draft.endpoint,
            transcriptionModel: draft.model,
            transcriptionLanguage: draft.language,
            transcriptionInstructions: draft.instructions,
            transcriptionInsertMode: draft.insertMode
        }
    });
    await Storage.saveSettings(state.settings);
    await queueDriveLibraryChange('workspace', 'transcription-settings', { changedAt: new Date().toISOString() });
    $('#recordingStatus').textContent = 'Transcription settings saved.';
    return draft;
}

function renderSettingsPanel() {
    setFieldValue('[name="imageMaxEdge"]', state.settings.media?.imageMaxEdge ?? 2200);
    setFieldValue('[name="imageQuality"]', state.settings.media?.imageQuality ?? 0.82);
    setCheckboxValue('[name="keepOriginalImages"]', state.settings.media?.preserveOriginalImages === true);
    setCheckboxValue('[name="storeOriginalAudio"]', true);
    setCheckboxValue('[name="showRightPanel"]', state.settings.showRightPanel === true);
    setCheckboxValue('[name="notionEnabled"]', state.settings.notion?.enabled === true);
    setFieldValue('[name="notionWorkerUrl"]', state.settings.notion?.workerUrl || '');
    setFieldValue('[name="notionParentPageId"]', state.settings.notion?.parentPageId || '');
    setFieldValue('[name="notionAuthToken"]', state.settings.notion?.authToken || '');
    setFieldValue('[name="notionProxyToken"]', state.settings.notion?.proxyToken || '');
    setCheckboxValue('[name="driveEnabled"]', state.settings.drive?.enabled === true);
    setFieldValue('[name="driveClientId"]', state.settings.drive?.clientId || '');
    setFieldValue('[name="driveAccessToken"]', state.settings.drive?.accessToken || '');
    setFieldValue('[name="driveRootFolderName"]', state.settings.drive?.rootFolderName || APP_NAME);
    setFieldValue('[name="driveSyncMode"]', state.settings.drive?.syncMode || 'background');
    setFieldValue('[name="aiProvider"]', state.settings.ai?.provider || 'local-reflection');
    setFieldValue('[name="aiModel"]', state.settings.ai?.model || '');
    setFieldValue('[name="aiEndpoint"]', state.settings.ai?.endpoint || '');
    setFieldValue('[name="aiApiKey"]', state.settings.ai?.apiKey || '');
    const transcription = ensureTranscriptionDraft();
    setFieldValue('#transcriptionProviderInput', transcription.provider);
    setFieldValue('#transcriptionApiKeyInput', transcription.apiKey);
    setFieldValue('#transcriptionEndpointInput', transcription.endpoint);
    setFieldValue('#transcriptionModelInput', transcription.model);
    setFieldValue('#transcriptionLanguageInput', transcription.language);
    setFieldValue('#transcriptionInstructionsInput', transcription.instructions);
    setFieldValue('#transcriptionInsertModeInput', transcription.insertMode);
    renderCustomFieldList();
    renderSavedSearchList();
}

function renderAll() {
    revokeObjectUrls();
    syncShellState();
    renderVisiblePanels();
    populateReferenceSelects();
    renderLibrary();
    const doc = ensureCurrentDocument();
    if (doc) {
        renderTodayHero(doc);
        renderDocumentEditor(doc);
    }
    renderJournalSections();
    renderTimelineView();
    renderCalendarView();
    renderReflectView();
    renderInsights();
    renderHighlightsView();
    renderTagsView();
    renderPeopleView();
    renderTemplatesView();
    renderRemindersView();
    renderHealth();
    renderTranscriptView();
    renderMapView();
    renderSyncPanel();
    renderSettingsPanel();
    refreshIcons();
}

async function createHealthLogFromForm(event) {
    event.preventDefault();
    const saved = await Storage.saveHealthLog({
        kind: $('#healthKindInput').value,
        title: $('#healthTitleInput').value.trim() || $('#healthKindInput').value,
        value: toNullableNumber($('#healthValueInput').value),
        unit: $('#healthUnitInput').value.trim(),
        recordedAt: new Date().toISOString(),
        source: 'manual',
        notes: $('#healthNotesInput').value.trim(),
        linkedDocumentId: currentDocument()?.id || '',
        metadata: {}
    });
    await queueDriveLibraryChange('health', saved.id, { recordedAt: saved.recordedAt });
    await refreshFromStorage();
    event.target.reset();
}

async function importFitbitHealthData() {
    const accessToken = String(state.fitbitAccessTokenDraft || '').trim();
    const date = state.fitbitImportDate || todayYmd();
    state.fitbitStatus = `Importing Fitbit data for ${date}...`;
    $('#fitbitImportStatus').textContent = state.fitbitStatus;
    try {
        const result = await importFitbitDay({ accessToken }, date);
        for (const log of result.logs) {
            const saved = await Storage.saveHealthLog(log);
            await queueDriveLibraryChange('health', saved.id, { recordedAt: saved.recordedAt, source: 'fitbit' });
        }
        state.settings = normalizeSettings({
            ...state.settings,
            health: {
                ...state.settings.health,
                fitbitEnabled: true,
                fitbitAccessToken: accessToken,
                fitbitLastImportedAt: result.importedAt
            }
        });
        await Storage.saveSettings(state.settings);
        state.fitbitStatus = `Imported ${result.logs.length} Fitbit measurements for ${date}`;
        await refreshFromStorage(state.currentDocumentId);
    } catch (error) {
        state.fitbitStatus = `Fitbit import failed: ${error.message}`;
        renderHealth();
    }
}

async function attachAudioAssetToCurrentDocument(asset) {
    const doc = currentDocument();
    if (!doc || !asset) return;
    const draft = collectDocumentDraft() || doc;
    const blocks = blankArray(draft.blocks).some((block) => block.assetId === asset.id)
        ? blankArray(draft.blocks)
        : blankArray(draft.blocks).concat([{
            id: `block_${asset.id}`,
            type: 'audio',
            assetId: asset.id,
            captionRichText: []
        }]);
    state.editor.setValue(blocks);
    await persistDocument({
        ...draft,
        blocks,
        attachments: [...new Set(blankArray(draft.attachments).concat([asset.id]))]
    });
}

async function appendTranscriptToCurrentDocument(text, assetId = null, settings = ensureTranscriptionDraft()) {
    const doc = currentDocument();
    if (!doc || !text) return;
    const job = createTranscriptionJob({
        documentId: doc.id,
        sourceAudioId: assetId,
        settings: {
            provider: settings.provider,
            apiKey: settings.apiKey,
            endpoint: settings.endpoint,
            model: settings.model,
            language: settings.language,
            cleanupInstructions: settings.instructions,
            autoInsertTranscript: settings.insertMode
        },
        transcriptText: text
    });
    const bundle = buildTranscriptBundle(job, createTranscriptArtifact({
        documentId: doc.id,
        text,
        language: settings.language,
        sourceAudioId: assetId,
        status: 'ready',
        metadata: { provider: settings.provider, model: settings.model || '' }
    }));
    const insertion = buildTranscriptInsertion(bundle.transcript, settings.insertMode);
    const mappedBlocks = insertion.blocks.map((block) => {
        if (block.type === 'collapsible') {
            return {
                id: Storage.createId('block'),
                type: 'toggle',
                open: true,
                richText: makeRichText(block.title || 'Transcript'),
                children: blankArray(block.blocks).map((child) => createTextBlock(child.type || 'paragraph', child.text || `${child.title || 'Transcript'} ${child.path || ''}`.trim()))
            };
        }
        return createTextBlock(block.type || 'paragraph', block.text || `${block.title || 'Transcript'} ${block.path || ''}`.trim());
    });
    await persistDocument({
        ...doc,
        blocks: blankArray(doc.blocks).concat(mappedBlocks),
        transcripts: blankArray(doc.transcripts).concat([bundle.transcript])
    });
    return bundle.transcript;
}

async function transcribeStoredAudio(asset, blob, filename) {
    const settings = await saveTranscriptionSettings();
    if (settings.provider === 'browser_native') return null;
    $('#recordingStatus').textContent = 'Transcribing audio...';
    const result = await transcribeAudio(settings, blob, filename);
    await appendTranscriptToCurrentDocument(result.text, asset.id, settings);
    return result;
}

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = $('#transcriptionLanguageInput')?.value || 'en-US';
    recognition.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; i += 1) {
            text += event.results[i][0].transcript + ' ';
        }
        state.speechTranscript = text.trim();
        $('#recordingStatus').textContent = state.speechTranscript || 'Listening...';
    };
    recognition.onerror = () => {
        $('#recordingStatus').textContent = 'Speech recognition unavailable for this recording.';
    };
    return recognition;
}

async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
        $('#recordingStatus').textContent = 'Audio recording is not available in this browser.';
        return;
    }
    const transcriptionSettings = await saveTranscriptionSettings();
    state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.recordingSession = createRecordingSessionDraft({
        documentId: currentDocument()?.id || '',
        title: `Voice note ${prettyDate(new Date())}`
    });
    state.speechTranscript = '';
    state.mediaRecorder = new MediaRecorder(state.mediaStream);
    state.mediaRecorder.ondataavailable = (event) => {
        if (!event.data?.size) return;
        state.recordingSession = appendRecordingChunk(state.recordingSession, {
            size: event.data.size,
            mimeType: event.data.type,
            durationMs: 800
        });
        if (!state.recordingSession._chunks) state.recordingSession._chunks = [];
        state.recordingSession._chunks.push(event.data);
    };
    state.mediaRecorder.onstop = async () => {
        const recorder = state.mediaRecorder;
        const session = state.recordingSession;
        const blob = new Blob(session?._chunks || [], { type: recorder?.mimeType || 'audio/webm' });
        const filename = `voice-${Date.now()}.webm`;
        try {
            finalizeRecordingSession(session, {
                documentId: currentDocument()?.id || '',
                mimeType: blob.type,
                size: blob.size,
                durationMs: session?.durationMs || 0
            });
            const file = new File([blob], filename, { type: blob.type });
            const asset = await saveSingleAssetFile(file, currentDocument(), 'audio');
            await attachAudioAssetToCurrentDocument(asset);
            if (transcriptionSettings.provider === 'browser_native') {
                if (state.speechTranscript) {
                    await appendTranscriptToCurrentDocument(state.speechTranscript, asset.id, transcriptionSettings);
                    $('#recordingStatus').textContent = 'Recording saved and transcript inserted.';
                } else {
                    $('#recordingStatus').textContent = 'Recording saved without a browser transcript.';
                }
            } else {
                await transcribeStoredAudio(asset, blob, filename);
                $('#recordingStatus').textContent = 'Recording saved and API transcript inserted.';
            }
        } catch (error) {
            $('#recordingStatus').textContent = `Recording saved; transcription failed: ${error.message}`;
        } finally {
            $('#stopAudioBtn').disabled = true;
            $('#recordAudioBtn').disabled = false;
            state.mediaStream?.getTracks().forEach((track) => track.stop());
            state.mediaStream = null;
            state.mediaRecorder = null;
            state.recordingSession = null;
            if (state.speechRecognition) {
                try { state.speechRecognition.stop(); } catch (_) {}
                state.speechRecognition = null;
            }
        }
    };
    state.mediaRecorder.start(700);
    state.speechRecognition = transcriptionSettings.provider === 'browser_native' ? initSpeechRecognition() : null;
    if (state.speechRecognition) {
        try { state.speechRecognition.start(); } catch (_) {}
    }
    $('#recordingStatus').textContent = 'Recording in progress...';
    $('#stopAudioBtn').disabled = false;
    $('#recordAudioBtn').disabled = true;
}

function stopRecording() {
    if (state.mediaRecorder?.state !== 'inactive') state.mediaRecorder.stop();
}

async function handleAudioUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
        const asset = await saveSingleAssetFile(file, currentDocument(), 'audio');
        await attachAudioAssetToCurrentDocument(asset);
        const settings = await saveTranscriptionSettings();
        if (settings.provider === 'browser_native') {
            $('#recordingStatus').textContent = 'Audio uploaded and attached. Browser-native transcription requires live recording.';
        } else {
            await transcribeStoredAudio(asset, file, file.name);
            $('#recordingStatus').textContent = 'Audio uploaded, attached, and transcribed.';
        }
    } catch (error) {
        $('#recordingStatus').textContent = `Audio saved; transcription failed: ${error.message}`;
    } finally {
        event.target.value = '';
    }
}

async function saveJournal(event) {
    event.preventDefault();
    const name = $('#journalNameInput').value.trim();
    if (!name) return;
    state.settings = normalizeSettings({
        ...state.settings,
        journals: blankArray(state.settings.journals).concat([{
            id: `journal_${slugify(name)}`,
            name,
            color: $('#journalColorInput').value.trim(),
            description: $('#journalDescriptionInput').value.trim(),
            icon: '✎'
        }])
    });
    await Storage.saveSettings(state.settings);
    await queueDriveLibraryChange('workspace', 'journals');
    event.target.reset();
    await refreshFromStorage();
}

async function saveTemplate(event) {
    event.preventDefault();
    const name = $('#templateNameInput').value.trim();
    if (!name) return;
    state.settings = normalizeSettings({
        ...state.settings,
        templates: blankArray(state.settings.templates).concat([{
            id: `template_${slugify(name)}`,
            name,
            journalId: $('#templateJournalInput').value || '',
            tags: splitCsv($('#templateTagsInput').value),
            body: $('#templateBodyInput').value
        }])
    });
    await Storage.saveSettings(state.settings);
    await queueDriveLibraryChange('workspace', 'templates');
    event.target.reset();
    await refreshFromStorage();
}

async function saveReminder(event) {
    event.preventDefault();
    const title = $('#reminderTitleInput').value.trim();
    if (!title) return;
    const date = $('#reminderDateInput').value;
    const frequency = $('#reminderFrequencyInput').value;
    const anchor = date ? new Date(`${date}T12:00:00`) : new Date();
    state.settings = normalizeSettings({
        ...state.settings,
        reminders: blankArray(state.settings.reminders).concat([{
            id: `reminder_${slugify(title)}_${Date.now().toString(36)}`,
            title,
            journalId: $('#reminderJournalInput').value || '',
            date,
            time: $('#reminderTimeInput').value,
            frequency,
            weekday: frequency === 'weekly' ? anchor.getDay() : null,
            dayOfMonth: frequency === 'monthly' ? anchor.getDate() : null,
            active: true
        }])
    });
    await Storage.saveSettings(state.settings);
    await queueDriveLibraryChange('workspace', 'reminders');
    event.target.reset();
    await refreshFromStorage();
    await checkDueReminderNotifications();
}

async function addCustomField() {
    const label = $('#customFieldNameInput').value.trim();
    const key = slugify($('#customFieldKeyInput').value || label);
    if (!label || !key) return;
    state.settings = normalizeSettings({
        ...state.settings,
        editor: {
            ...state.settings.editor,
            customFields: blankArray(state.settings.editor.customFields).concat([{
                id: `field_${key}`,
                key,
                label,
                type: $('#customFieldTypeInput').value,
                prefixes: splitCsv($('#customFieldPrefixesInput').value),
                options: splitCsv($('#customFieldOptionsInput').value),
                multiple: $('#customFieldMultipleInput').checked,
                max: toNullableNumber($('#customFieldMaxInput').value)
            }])
        }
    });
    await Storage.saveSettings(state.settings);
    await queueDriveLibraryChange('workspace', 'custom-fields');
    ['#customFieldNameInput', '#customFieldKeyInput', '#customFieldPrefixesInput', '#customFieldOptionsInput', '#customFieldMaxInput'].forEach((selector) => setFieldValue(selector, ''));
    setFieldValue('#customFieldTypeInput', 'string');
    setCheckboxValue('#customFieldMultipleInput', false);
    await refreshFromStorage();
}

async function addSavedSearch() {
    const name = $('#savedSearchNameInput').value.trim();
    const query = $('#savedSearchQueryInput').value.trim();
    if (!name || !query) return;
    state.settings = normalizeSettings({
        ...state.settings,
        editor: {
            ...state.settings.editor,
            savedSearches: blankArray(state.settings.editor.savedSearches).concat([{
                id: `search_${slugify(name)}`,
                name,
                query
            }])
        }
    });
    await Storage.saveSettings(state.settings);
    await queueDriveLibraryChange('workspace', 'saved-searches');
    setFieldValue('#savedSearchNameInput', '');
    setFieldValue('#savedSearchQueryInput', '');
    await refreshFromStorage();
}

async function saveSettings(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    state.settings = normalizeSettings({
        ...state.settings,
        media: {
            ...state.settings.media,
            imageMaxEdge: Number(form.get('imageMaxEdge') || 2200),
            imageQuality: Number(form.get('imageQuality') || 0.82),
            preserveOriginalImages: form.get('keepOriginalImages') === 'on'
        },
        notion: {
            ...state.settings.notion,
            enabled: form.get('notionEnabled') === 'on',
            workerUrl: String(form.get('notionWorkerUrl') || '').trim(),
            parentPageId: String(form.get('notionParentPageId') || '').trim(),
            authToken: String(form.get('notionAuthToken') || '').trim(),
            proxyToken: String(form.get('notionProxyToken') || '').trim()
        },
        drive: {
            ...state.settings.drive,
            enabled: form.get('driveEnabled') === 'on',
            clientId: String(form.get('driveClientId') || '').trim(),
            accessToken: String(form.get('driveAccessToken') || '').trim(),
            rootFolderName: String(form.get('driveRootFolderName') || APP_NAME).trim(),
            syncMode: String(form.get('driveSyncMode') || 'background')
        },
        ai: {
            ...state.settings.ai,
            provider: String(form.get('aiProvider') || 'local-reflection'),
            model: String(form.get('aiModel') || ''),
            endpoint: String(form.get('aiEndpoint') || ''),
            apiKey: String(form.get('aiApiKey') || ''),
            transcriptionProvider: ensureTranscriptionDraft().provider,
            transcriptionApiKey: ensureTranscriptionDraft().apiKey,
            transcriptionEndpoint: ensureTranscriptionDraft().endpoint,
            transcriptionModel: ensureTranscriptionDraft().model,
            transcriptionLanguage: ensureTranscriptionDraft().language,
            transcriptionInstructions: ensureTranscriptionDraft().instructions,
            transcriptionInsertMode: ensureTranscriptionDraft().insertMode
        },
        showRightPanel: form.get('showRightPanel') === 'on'
    });
    await Storage.saveSettings(state.settings);
    await queueDriveLibraryChange('workspace', 'settings', { changedAt: new Date().toISOString() });
    await refreshFromStorage();
}

// Local Markdown export. Drive and Notion use their shared provider serializers.
function buildMarkdownForDocument(doc, assetRecords = state.assets) {
    if (!doc) return '';
    const parts = [];
    const assetsById = new Map(blankArray(assetRecords).map((asset) => [asset.id, asset]));

    function durableAssetUrl(block = {}) {
        const asset = assetsById.get(block.assetId);
        const candidate = asset?.metadata?.driveWebViewLink || asset?.remoteUrl || block.src || '';
        return /^https:\/\//i.test(candidate) ? candidate : '';
    }

    function assetLabel(block = {}) {
        const asset = assetsById.get(block.assetId);
        return asset?.name || block.name || block.alt || 'Attachment';
    }

    // Title
    parts.push(`# ${doc.smartTitle || doc.title || 'Untitled'}`);
    parts.push('');

    // Metadata callout
    const metaLines = [
        `Journal: ${journalById(doc.journalId)?.name || doc.journalId || ''}`,
        doc.date ? `Date: ${doc.date}` : '',
        doc.locationName ? `Location: ${doc.locationName}` : '',
        doc.weather ? `Weather: ${doc.weather}` : '',
        doc.activity ? `Activity: ${doc.activity}` : '',
        Number.isFinite(Number(doc.mood)) ? `Mood: ${doc.mood}/10` : '',
        Number.isFinite(Number(doc.energy)) ? `Energy: ${doc.energy}/10` : '',
        blankArray(doc.tags).length ? `Tags: ${blankArray(doc.tags).join(', ')}` : '',
        blankArray(doc.people).length ? `People: ${blankArray(doc.people).join(', ')}` : '',
    ].filter(Boolean);

    if (metaLines.length) {
        parts.push('<callout icon="📋">');
        metaLines.forEach((l) => parts.push(`\t${l}`));
        parts.push('</callout>');
        parts.push('');
    }

    // Summary
    if (doc.summary) {
        parts.push(`> ${doc.summary}`);
        parts.push('');
    }

    // --- inline serializer ---
    function inlineToMd(richText = []) {
        return blankArray(richText).map((node) => {
            if (!node || node.type !== 'text') return '';
            let t = node.text || '';
            const marks = node.marks || [];

            // Code span takes priority (no other marks inside)
            if (marks.some((m) => m.type === 'code')) return `\`${t}\``;

            // Standard marks
            if (marks.some((m) => m.type === 'bold'))      t = `**${t}**`;
            if (marks.some((m) => m.type === 'italic'))    t = `*${t}*`;
            if (marks.some((m) => m.type === 'strike'))    t = `~~${t}~~`;
            if (marks.some((m) => m.type === 'underline')) t = `<span underline="true">${t}</span>`;

            // Notion Enhanced Markdown color spans
            const bgMark   = marks.find((m) => m.type === 'bgColor');
            const txtMark  = marks.find((m) => m.type === 'textColor');
            if (bgMark?.attrs?.color)  t = `<span color="${bgMark.attrs.color}_bg">${t}</span>`;
            else if (txtMark?.attrs?.color) t = `<span color="${txtMark.attrs.color}">${t}</span>`;

            // Link
            const link = marks.find((m) => m.type === 'link');
            if (link?.attrs?.href) t = `[${t}](${link.attrs.href})`;

            return t;
        }).join('');
    }

    // --- block serializer ---
    function processBlocks(blocks, indent = '') {
        blankArray(blocks).forEach((block) => {
            const colorAttr = block.color ? ` {color="${block.color}"}` : '';

            switch (block.type) {
                case 'paragraph': {
                    const t = inlineToMd(block.richText);
                    parts.push(`${indent}${t || '<empty-block/>'}${colorAttr}`);
                    break;
                }
                case 'heading': {
                    const lvl = Math.min(4, Math.max(1, Number(block.level || 2)));
                    parts.push(`${indent}${'#'.repeat(lvl)} ${inlineToMd(block.richText)}${colorAttr}`);
                    break;
                }
                case 'bullet':
                    parts.push(`${indent}${'  '.repeat(block.depth || 0)}- ${inlineToMd(block.richText)}${colorAttr}`);
                    break;
                case 'numbered':
                    parts.push(`${indent}${'  '.repeat(block.depth || 0)}1. ${inlineToMd(block.richText)}${colorAttr}`);
                    break;
                case 'checklist':
                    parts.push(`${indent}- [${block.checked ? 'x' : ' '}] ${inlineToMd(block.richText)}${colorAttr}`);
                    break;
                case 'quote':
                    parts.push(`${indent}> ${inlineToMd(block.richText)}${colorAttr}`);
                    break;
                case 'callout': {
                    const icon = block.icon || '💡';
                    const col  = block.color ? ` color="${block.color}"` : '';
                    parts.push(`${indent}<callout icon="${icon}"${col}>`);
                    parts.push(`${indent}\t${inlineToMd(block.richText)}`);
                    parts.push(`${indent}</callout>`);
                    break;
                }
                case 'toggle': {
                    const col = block.color ? ` color="${block.color}"` : '';
                    parts.push(`${indent}<details${col}>`);
                    parts.push(`${indent}<summary>${inlineToMd(block.richText)}</summary>`);
                    processBlocks(block.children, `${indent}\t`);
                    parts.push(`${indent}</details>`);
                    break;
                }
                case 'code':
                    parts.push(`${indent}\`\`\`${block.language || ''}`);
                    (block.text || '').split('\n').forEach((l) => parts.push(`${indent}${l}`));
                    parts.push(`${indent}\`\`\``);
                    break;
                case 'divider':
                    parts.push(`${indent}---`);
                    break;
                case 'image': {
                    const src     = durableAssetUrl(block);
                    const caption = inlineToMd(block.captionRichText) || block.alt || '';
                    parts.push(src ? `${indent}![${caption}](${src})${colorAttr}` : `${indent}Attachment: ${assetLabel(block)}`);
                    break;
                }
                case 'video': {
                    const src     = durableAssetUrl(block);
                    const caption = inlineToMd(block.captionRichText) || '';
                    parts.push(src ? `${indent}<video src="${src}"${colorAttr}>${caption}</video>` : `${indent}Attachment: ${assetLabel(block)}`);
                    break;
                }
                case 'audio': {
                    const src     = durableAssetUrl(block);
                    const caption = inlineToMd(block.captionRichText) || '';
                    parts.push(src ? `${indent}<audio src="${src}"${colorAttr}>${caption}</audio>` : `${indent}Attachment: ${assetLabel(block)}`);
                    break;
                }
                case 'file': {
                    const src = durableAssetUrl(block);
                    parts.push(src ? `${indent}<file src="${src}"${colorAttr}>${block.name || assetLabel(block)}</file>` : `${indent}Attachment: ${assetLabel(block)}`);
                    break;
                }
                case 'table': {
                    const rows = block.rows || [];
                    if (!rows.length) break;
                    parts.push(`${indent}<table header-row="true">`);
                    rows.forEach((row) => {
                        parts.push(`${indent}\t<tr>`);
                        blankArray(row).forEach((cell) => {
                            parts.push(`${indent}\t\t<td>${inlineToMd(cell)}</td>`);
                        });
                        parts.push(`${indent}\t</tr>`);
                    });
                    parts.push(`${indent}</table>`);
                    break;
                }
                default: {
                    const t = blockToPlainText(block);
                    if (t) parts.push(`${indent}${t}`);
                }
            }
            parts.push('');
        });
    }

    processBlocks(doc.blocks);
    return parts.join('\n').trim();
}

async function verifyNotionSettings() {
    const settings = state.settings.notion || {};
    state.notionStatus = 'Verifying Notion connection...';
    renderSyncPanel();
    try {
        const user = await verifyNotionConnection(settings);
        state.notionStatus = `Notion verified as ${user.name || user.person?.email || user.id || 'integration'}`;
    } catch (error) {
        state.notionStatus = `Notion verification failed: ${error.message}`;
    }
    renderSyncPanel();
}

async function markDocumentQueueSynced(documentId, assets = [], syncedAt = new Date().toISOString(), includeAssets = false) {
    const assetIds = includeAssets ? new Set(blankArray(assets).map((asset) => asset.id)) : new Set();
    const queued = blankArray(state.syncQueue).filter((job) => {
        if (job.status !== 'queued') return false;
        if (job.type === 'document' && job.targetId === documentId) return true;
        if (job.type === 'asset' && assetIds.has(job.targetId)) return true;
        return false;
    });
    await Promise.all(queued.map((job) => Storage.updateSyncJob({
        ...job,
        status: 'synced',
        payload: {
            ...(job.payload || {}),
            syncedAt
        }
    })));
}

async function markDriveLibraryQueueSynced(result, notionEnabled) {
    if (!result) return;
    const documentIds = new Set(blankArray(result.documentIds));
    const assetIds = new Set(blankArray(result.assets).map((asset) => asset.id));
    const queued = blankArray(state.syncQueue).filter((job) => {
        if (job.status !== 'queued') return false;
        if (job.type === 'document') return notionEnabled !== true && documentIds.has(job.targetId);
        if (job.type === 'asset') return assetIds.has(job.targetId);
        return ['health', 'workspace', 'library'].includes(job.type);
    });
    await Promise.all(queued.map((job) => Storage.updateSyncJob({
        ...job,
        status: 'synced',
        payload: { ...(job.payload || {}), driveSyncedAt: result.syncedAt }
    })));
}

async function syncCurrentDocumentToNotion() {
    const doc = collectDocumentDraft();
    if (!doc) return;
    const settings = state.settings.notion || {};
    if (settings.enabled !== true) {
        state.notionStatus = 'Turn on Notion sync in Settings first.';
        renderSyncPanel();
        return;
    }

    state.notionStatus = 'Syncing current page to Notion...';
    renderSyncPanel();
    const saved = await Storage.saveDocument(doc);
    const assets = state.assets.filter((asset) => asset.documentId === saved.id);
    const result = await syncDocumentToNotion(settings, saved, {
        journalName: journalById(saved.journalId)?.name || '',
        assets
    });
    const syncedAt = new Date().toISOString();
    const notionUploads = new Map(blankArray(result.assets).map((item) => [item.assetId, item.fileUploadId]));
    for (const asset of assets) {
        const fileUploadId = notionUploads.get(asset.id);
        if (!fileUploadId) continue;
        await Storage.saveAsset({
            ...asset,
            metadata: {
                ...(asset.metadata || {}),
                notionFileUploadId: fileUploadId,
                notionSyncedAt: syncedAt
            }
        });
    }
    const nextDoc = {
        ...saved,
        metadata: {
            ...(saved.metadata || {}),
            notionPageId: result.pageId,
            notionUrl: result.url,
            notionSyncedAt: syncedAt
        },
        updatedAt: syncedAt
    };
    state.settings = normalizeSettings({
        ...state.settings,
        notion: {
            ...settings,
            lastSyncedAt: syncedAt,
            lastPageUrl: result.url
        }
    });
    await Storage.saveSettings(state.settings);
    await Storage.saveDocument(nextDoc);
    await Storage.enqueueSyncJob({
        type: 'notion-document',
        action: 'upsert',
        targetId: nextDoc.id,
        status: 'synced',
        payload: { notionPageId: result.pageId, notionUrl: result.url, syncedAt }
    });
    const mediaCount = notionUploads.size;
    state.notionStatus = `Synced to Notion${mediaCount ? ` with ${mediaCount} attachment${mediaCount === 1 ? '' : 's'}` : ''} at ${prettyDateTime(syncedAt)}`;
    await refreshFromStorage(nextDoc.id);
}

async function connectGoogleDrive() {
    const settings = state.settings.drive || {};
    if (settings.accessToken) {
        state.settings = normalizeSettings({
            ...state.settings,
            drive: {
                ...settings,
                enabled: true,
                lastConnectedAt: new Date().toISOString()
            }
        });
        await Storage.saveSettings(state.settings);
        await registerDriveBackgroundSync();
        state.driveStatus = 'Google Drive access token is saved.';
        renderSyncPanel();
        return;
    }
    state.driveStatus = 'Opening Google authorization...';
    renderSyncPanel();
    try {
        const accessToken = await requestDriveToken(settings.clientId);
        const connectedAt = new Date().toISOString();
        state.settings = normalizeSettings({
            ...state.settings,
            drive: {
                ...settings,
                enabled: true,
                accessToken,
                lastConnectedAt: connectedAt
            }
        });
        await Storage.saveSettings(state.settings);
        await registerDriveBackgroundSync();
        state.driveStatus = `Google Drive connected at ${prettyDateTime(connectedAt)}`;
    } catch (error) {
        state.driveStatus = `Google Drive connection failed: ${error.message}`;
    }
    renderSyncPanel();
}
async function syncLibraryToDrive() {
    await flushAutosave();
    const settings = state.settings.drive || {};
    if (settings.enabled !== true) {
        state.driveStatus = 'Turn on Google Drive sync in Settings first.';
        renderSyncPanel();
        return;
    }

    state.driveStatus = 'Syncing library to Google Drive...';
    renderSyncPanel();
    const library = await Storage.getAllData();
    const result = await syncDriveLibrarySnapshot({
        settings,
        documents: library.documents,
        assets: library.assets,
        healthLogs: library.healthLogs,
        views: library.views,
        workspaceSettings: buildDriveWorkspaceSettings(library.settings)
    });
    for (const document of result.documents) await Storage.saveDocument(document);
    for (const asset of result.assets) await Storage.saveAsset(asset);
    state.settings = normalizeSettings({ ...state.settings, drive: result.driveSettings });
    await Storage.saveSettings(state.settings);
    await Storage.enqueueSyncJob({
        type: 'drive-library',
        action: 'upsert',
        targetId: result.manifestResult.manifestId,
        status: 'synced',
        payload: {
            documentCount: result.documents.length,
            assetCount: result.assets.length,
            syncedAt: result.syncedAt
        }
    });
    state.driveStatus = `Synced ${result.documents.length} page${result.documents.length === 1 ? '' : 's'} and ${result.assets.length} attachment${result.assets.length === 1 ? '' : 's'} to Google Drive`;
    await refreshFromStorage(state.currentDocumentId);
    return {
        documentIds: result.documents.map((document) => document.id),
        assets: result.assets,
        syncedAt: result.syncedAt
    };
}

async function restoreLibraryFromDrive() {
    const settings = state.settings.drive || {};
    if (settings.enabled !== true) {
        state.driveStatus = 'Turn on Google Drive sync in Settings first.';
        renderSyncPanel();
        return;
    }
    await flushAutosave();
    state.driveStatus = 'Restoring library from Google Drive...';
    renderSyncPanel();
    const result = await restoreJournalFromDrive(settings);
    if (!result.documents.length) throw new Error('Google Drive did not contain any journal documents');

    await Storage.replaceLibrary({
        documents: result.documents,
        healthLogs: result.library.healthLogs,
        assets: result.assets,
        views: result.library.views
    });

    const restoredSettings = result.library.workspace.settings;
    const localAi = state.settings.ai || {};
    const localHealth = state.settings.health || {};
    state.settings = normalizeSettings({
        ...state.settings,
        ...restoredSettings,
        notion: state.settings.notion,
        ai: {
            ...localAi,
            ...(restoredSettings.ai || {}),
            apiKey: localAi.apiKey,
            transcriptionApiKey: localAi.transcriptionApiKey
        },
        health: {
            ...localHealth,
            ...(restoredSettings.health || {}),
            fitbitAccessToken: localHealth.fitbitAccessToken || ''
        },
        drive: {
            ...settings,
            rootFolderId: result.rootFolderId,
            libraryManifestId: result.manifestId,
            libraryManifestUrl: result.manifestUrl,
            lastPullAt: result.restoredAt
        }
    });
    await Storage.saveSettings(state.settings);
    state.driveStatus = `Restored ${result.documents.length} page${result.documents.length === 1 ? '' : 's'}, ${result.assets.length} attachment${result.assets.length === 1 ? '' : 's'}, and ${result.library.healthLogs.length} health log${result.library.healthLogs.length === 1 ? '' : 's'} from Google Drive`;
    await refreshFromStorage(result.documents[0].id);
}

async function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('Could not serialize blob'));
        reader.readAsDataURL(blob);
    });
}

function dataUrlToBlob(dataUrl) {
    const [header, body] = String(dataUrl || '').split(',');
    const mimeMatch = header.match(/data:(.*?);base64/);
    const mimeType = mimeMatch?.[1] || 'application/octet-stream';
    const binary = atob(body || '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mimeType });
}

async function exportJsonDump() {
    const assets = await Promise.all(state.assets.map(async (asset) => {
        const blob = asset.metadata?.blob;
        const blobDataUrl = blob ? await blobToDataUrl(blob) : '';
        return {
            ...asset,
            metadata: {
                ...asset.metadata,
                blob: undefined,
                blobDataUrl
            }
        };
    }));
    const payload = {
        exportedAt: new Date().toISOString(),
        documents: state.documents,
        healthLogs: state.healthLogs,
        assets,
        views: state.views,
        settings: state.settings,
        syncQueue: state.syncQueue,
        syncState: state.syncState
    };
    downloadFile(`journaling-${todayYmd()}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
}

function exportMarkdownDump() {
    const body = state.documents
        .slice()
        .sort((a, b) => String(b.date || b.updatedAt).localeCompare(String(a.date || a.updatedAt)))
        .map((doc) => buildMarkdownForDocument(doc))
        .join('\n\n---\n\n');
    downloadFile(`journaling-${todayYmd()}.md`, body, 'text/markdown;charset=utf-8');
}

async function importJsonDump(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
        const text = await file.text();
        const payload = JSON.parse(text);
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Import must contain a Journaling workspace object');
        for (const key of ['documents', 'healthLogs', 'assets', 'views', 'syncQueue']) {
            if (!Array.isArray(payload[key])) throw new Error(`Import is missing the ${key} array`);
        }
        if (!payload.settings || typeof payload.settings !== 'object') throw new Error('Import is missing workspace settings');
        if (!payload.syncState || typeof payload.syncState !== 'object') throw new Error('Import is missing sync state');
        const assets = payload.assets.map((asset) => {
            const blobDataUrl = asset?.metadata?.blobDataUrl || '';
            if (blobDataUrl && !/^data:[^,]+;base64,/.test(blobDataUrl)) throw new Error(`Asset ${asset?.id || ''} has invalid embedded media`);
            const hydrated = {
                ...asset,
                metadata: {
                    ...asset.metadata,
                    blob: blobDataUrl ? dataUrlToBlob(blobDataUrl) : undefined
                }
            };
            delete hydrated.metadata.blobDataUrl;
            return hydrated;
        });
        await Storage.replaceWorkspace({
            documents: payload.documents,
            healthLogs: payload.healthLogs,
            assets,
            views: payload.views,
            settings: payload.settings,
            syncQueue: payload.syncQueue,
            syncState: payload.syncState
        });
        await refreshFromStorage(payload.documents?.[0]?.id || null);
        state.activeView = 'write';
        location.hash = '#write';
        state.driveStatus = `Imported ${payload.documents.length} page${payload.documents.length === 1 ? '' : 's'} from JSON.`;
        renderAll();
    } catch (error) {
        state.driveStatus = `Import failed: ${error.message}`;
        renderSyncPanel();
    } finally {
        event.target.value = '';
    }
}

function bindEvents() {
    $$('[data-view-link]').forEach((link) => {
        link.addEventListener('click', () => {
            state.activeView = mapViewHashToState(link.getAttribute('data-view-link') || 'write');
            if (!isDesktopViewport()) state.leftRailOpen = false;
            renderAll();
        });
    });

    $$('[data-toggle-rail-section]').forEach((button) => {
        button.addEventListener('click', () => {
            const key = button.getAttribute('data-toggle-rail-section');
            if (!key) return;
            state.railSections[key] = !(state.railSections[key] !== false);
            syncShellState();
        });
    });

    $('#toggleSectionsBtn').addEventListener('click', () => {
        state.leftRailOpen = !state.leftRailOpen;
        syncShellState();
    });
    $('#toggleStudioBtn').addEventListener('click', async () => {
        state.settings = normalizeSettings({
            ...state.settings,
            showRightPanel: !(state.settings.showRightPanel === true)
        });
        await Storage.saveSettings(state.settings);
        syncShellState();
        renderAll();
    });
    $('#closeRailRightBtn')?.addEventListener('click', () => $('#toggleStudioBtn').click());
    $('#libraryCreateDocumentBtn').addEventListener('click', async () => {
        await flushAutosave();
        await createNewDocument();
    });
    $('#createJournalBtn').addEventListener('click', () => {
        state.activeView = 'journals';
        renderAll();
    });
    $('#topNewEntryBtn').addEventListener('click', async () => {
        await flushAutosave();
        await createNewDocument();
    });
    $('#topMarkdownBtn').addEventListener('click', exportMarkdownDump);
    $('#topImportBtn').addEventListener('click', () => $('#importJsonInput').click());
    $('#topExportBtn').addEventListener('click', exportJsonDump);
    $('#importJsonInput').addEventListener('change', importJsonDump);
    $('#toggleFavoriteBtn').addEventListener('click', toggleCurrentFavorite);
    $('#toggleHighlightBtn').addEventListener('click', toggleCurrentHighlight);
    $('#attachMediaBtn').addEventListener('click', () => $('#assetInput').click());
    $('#toggleQuickAddBtn').addEventListener('click', () => {
        state.writePanels.quickAdd = !state.writePanels.quickAdd;
        syncWriteSurfaceState();
    });
    $('#toggleDetailsBtn').addEventListener('click', async () => {
        if (!state.settings.showRightPanel) {
            state.settings = normalizeSettings({ ...state.settings, showRightPanel: true });
            await Storage.saveSettings(state.settings);
            syncShellState();
        }
        state.writePanels.details = !state.writePanels.details;
        syncWriteSurfaceState();
    });
    const themeToggleBtn = $('#themeToggleBtn');
    if (themeToggleBtn) {
        const storedTheme = localStorage.getItem('theme') || 'auto';
        applyThemePreference(storedTheme);
        themeToggleBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'auto';
            const next = current === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', next);
            applyThemePreference(next);
        });
    }
    $('#docTemplateInput').addEventListener('change', (event) => {
        const doc = currentDocument();
        if (!doc) return;
        const templateId = event.target.value;
        if (!templateId) {
            scheduleAutosave();
            return;
        }
        const template = templateMap().get(templateId);
        if (!template) return;
        setFieldValue('#docTitleInput', template.name);
        setFieldValue('#docTagsInput', blankArray(template.tags).join(', '));
        state.editor.setValue(buildDefaultBlocks(templateId));
        renderDocumentChrome(collectDocumentDraft());
        scheduleAutosave();
    });
    $('#draftForm').addEventListener('submit', createDraftDocumentFromForm);
    $('#insertQuickAddBtn').addEventListener('click', () => saveQuickAddResult('append'));
    $('#saveQuickAddBtn').addEventListener('click', () => saveQuickAddResult('new'));
    $('#clearQuickAddBtn').addEventListener('click', () => state.quickAdd?.setInput(''));
    $('#assetInput').addEventListener('change', async (event) => {
        await saveAssetFiles(Array.from(event.target.files || []));
        event.target.value = '';
    });
    $('#healthLogForm').addEventListener('submit', createHealthLogFromForm);
    $('#fitbitAccessTokenInput').addEventListener('input', (event) => {
        state.fitbitAccessTokenDraft = event.target.value;
    });
    $('#fitbitImportDateInput').addEventListener('input', (event) => {
        state.fitbitImportDate = event.target.value;
    });
    $('#importFitbitBtn').addEventListener('pointerdown', () => {
        state.fitbitAccessTokenDraft = $('#fitbitAccessTokenInput').value;
        state.fitbitImportDate = $('#fitbitImportDateInput').value;
    });
    $('#importFitbitBtn').addEventListener('click', importFitbitHealthData);
    $('#recordAudioBtn').addEventListener('click', startRecording);
    $('#stopAudioBtn').addEventListener('click', stopRecording);
    $('#audioUploadInput').addEventListener('change', handleAudioUpload);
    $('#transcriptionSettingsForm').addEventListener('submit', saveTranscriptionSettings);
    $('#settingsForm').addEventListener('submit', saveSettings);
    $('#templateForm').addEventListener('submit', saveTemplate);
    $('#reminderForm').addEventListener('submit', saveReminder);
    $('#enableRemindersBtn').addEventListener('click', async () => {
        try {
            if (state.settings.notifications?.enabled) await disableReminderNotifications();
            else await enableReminderNotifications();
        } catch (error) {
            state.reminderNotificationStatus = `Notifications unavailable: ${error.message}`;
            renderRemindersView();
        }
    });
    $('#journalForm').addEventListener('submit', saveJournal);
    $('#addCustomFieldBtn').addEventListener('click', addCustomField);
    $('#addSavedSearchBtn').addEventListener('click', addSavedSearch);
    $('#runSyncBtn').addEventListener('click', async () => {
        try {
            const driveEnabled = state.settings.drive?.enabled === true;
            const notionEnabled = state.settings.notion?.enabled === true;
            let driveResult = null;
            if (driveEnabled) driveResult = await syncLibraryToDrive();
            if (notionEnabled) await syncCurrentDocumentToNotion();
            if (driveEnabled || notionEnabled) {
                const doc = currentDocument();
                const assets = driveResult?.assets || [];
                if (driveEnabled) await markDriveLibraryQueueSynced(driveResult, notionEnabled);
                await markDocumentQueueSynced(doc.id, assets, new Date().toISOString(), driveEnabled);
                await refreshFromStorage(doc.id);
            }
            if (!notionEnabled && !driveEnabled) {
                state.notionStatus = 'Enable Notion or Google Drive sync in Settings first.';
                state.driveStatus = '';
                renderSyncPanel();
            }
        } catch (error) {
            if (state.settings.drive?.enabled === true) state.driveStatus = `Sync failed: ${error.message}`;
            if (state.settings.notion?.enabled === true) state.notionStatus = `Sync failed: ${error.message}`;
            renderSyncPanel();
        }
    });
    $('#verifyNotionBtn').addEventListener('click', verifyNotionSettings);
    $('#connectDriveBtn').addEventListener('click', () => {
        connectGoogleDrive();
    });
    $('#restoreDriveBtn').addEventListener('click', async () => {
        try {
            await restoreLibraryFromDrive();
        } catch (error) {
            state.driveStatus = `Restore failed: ${error.message}`;
            renderSyncPanel();
        }
    });
    $('#searchInput').addEventListener('input', (event) => {
        state.search = event.target.value.trim();
        renderAll();
    });
    $('#calendarPrevBtn').addEventListener('click', () => {
        state.calendarCursor = new Date(state.calendarCursor.getFullYear(), state.calendarCursor.getMonth() - 1, 1);
        renderCalendarView();
    });
    $('#calendarNextBtn').addEventListener('click', () => {
        state.calendarCursor = new Date(state.calendarCursor.getFullYear(), state.calendarCursor.getMonth() + 1, 1);
        renderCalendarView();
    });

    window.addEventListener('hashchange', () => {
        const nextView = mapViewHashToState(window.location.hash.replace(/^#/, '') || 'write');
        if (nextView === state.activeView) return;
        state.activeView = nextView;
        if (!isDesktopViewport()) state.leftRailOpen = false;
        renderAll();
    });

    document.body.addEventListener('input', (event) => {
        if (event.target.closest('#transcriptionSettingsForm')) {
            state.transcriptionDraft = readTranscriptionControls();
            return;
        }
        if (event.target.id === 'fitbitAccessTokenInput') {
            state.fitbitAccessTokenDraft = event.target.value;
            return;
        }
        if (event.target.id === 'fitbitImportDateInput') {
            state.fitbitImportDate = event.target.value;
            return;
        }
        if (event.target.id === 'aiPromptInput') {
            state.aiDraft = event.target.value;
            return;
        }
        if (event.target.id === 'docTitleInput') {
            autosizeTitleInput();
        }
        if (event.target.closest('#detailsPanel') || event.target.id === 'docTitleInput') {
            const draft = collectDocumentDraft();
            renderDocumentChrome(draft);
            scheduleAutosave();
        }
    });

    document.body.addEventListener('change', (event) => {
        if (event.target.closest('#transcriptionSettingsForm')) {
            state.transcriptionDraft = readTranscriptionControls();
            return;
        }
        if (event.target.closest('#detailsPanel')) {
            const draft = collectDocumentDraft();
            renderDocumentChrome(draft);
            scheduleAutosave();
        }
    });

    document.body.addEventListener('click', async (event) => {
        const toggleReminder = event.target.closest('[data-toggle-reminder]');
        if (toggleReminder) {
            const id = toggleReminder.getAttribute('data-toggle-reminder');
            state.settings = normalizeSettings({
                ...state.settings,
                reminders: reminders().map((reminder) => reminder.id === id ? { ...reminder, active: reminder.active === false } : reminder)
            });
            await Storage.saveSettings(state.settings);
            await queueDriveLibraryChange('workspace', 'reminders');
            await refreshFromStorage();
            await checkDueReminderNotifications();
            return;
        }

        const deleteReminder = event.target.closest('[data-delete-reminder]');
        if (deleteReminder) {
            const id = deleteReminder.getAttribute('data-delete-reminder');
            state.settings = normalizeSettings({
                ...state.settings,
                reminders: reminders().filter((reminder) => reminder.id !== id)
            });
            await Storage.saveSettings(state.settings);
            await queueDriveLibraryChange('workspace', 'reminders');
            await refreshFromStorage();
            return;
        }

        const docButton = event.target.closest('[data-open-doc]');
        if (docButton) {
            const id = docButton.getAttribute('data-open-doc');
            if (id) {
                await flushAutosave();
                state.currentDocumentId = id;
                state.activeView = 'write';
                if (!isDesktopViewport()) state.leftRailOpen = false;
                renderAll();
                location.hash = '#write';
            }
            return;
        }

        const journalButton = event.target.closest('[data-select-journal]');
        if (journalButton) {
            await flushAutosave();
            state.settings = normalizeSettings({
                ...state.settings,
                activeJournalId: journalButton.getAttribute('data-select-journal')
            });
            await Storage.saveSettings(state.settings);
            await queueDriveLibraryChange('workspace', 'active-journal');
            state.activeView = 'journals';
            await refreshFromStorage();
            location.hash = '#journals';
            return;
        }

        const newEntryJournal = event.target.closest('[data-new-entry-for-journal]');
        if (newEntryJournal) {
            await flushAutosave();
            await createNewDocument({ journalId: newEntryJournal.getAttribute('data-new-entry-for-journal') });
            return;
        }

        const savedSearch = event.target.closest('[data-run-search]');
        if (savedSearch) {
            const query = savedSearch.getAttribute('data-run-search') || '';
            state.search = query;
            setFieldValue('#searchInput', query);
            state.activeView = 'library';
            renderAll();
            location.hash = '#library';
            return;
        }

        const templateButton = event.target.closest('[data-apply-template]');
        if (templateButton) {
            await createNewDocument({ templateId: templateButton.getAttribute('data-apply-template'), journalId: activeJournalId() });
            return;
        }

        const aiButton = event.target.closest('[data-ai-action]');
        if (aiButton) {
            await runAiAction(aiButton.getAttribute('data-ai-action'));
        }
    });

    window.addEventListener('resize', () => {
        if (!isDesktopViewport() && state.leftRailOpen) {
            state.leftRailOpen = false;
        }
        syncShellState();
        if (state.map) requestAnimationFrame(() => state.map.invalidateSize());
    });
}

async function main() {
    await loadState();
    document.documentElement.removeAttribute('data-initial-view');
    const navigation = parseAppHash();
    state.activeView = navigation.view || 'write';
    if (state.activeView === 'write' && navigation.targetId && state.documents.some((document) => document.id === navigation.targetId)) {
        state.currentDocumentId = navigation.targetId;
    }
    if (state.activeView === 'journals' && navigation.targetId && journalById(navigation.targetId)) {
        state.settings = normalizeSettings({ ...state.settings, activeJournalId: navigation.targetId });
        await Storage.saveSettings(state.settings);
    }
    state.leftRailOpen = false;
    mountEditor();
    populateReferenceSelects();
    mountQuickAdd();
    bindEvents();
    setFieldValue('#draftDate', todayYmd());
    setFieldValue('#docDateInput', todayYmd());
    renderAll();
    startReminderRuntime();
}

main().catch((error) => {
    console.error(error);
    document.body.innerHTML = `<main><h1>Failed to start</h1><pre>${esc(String(error.stack || error.message || error))}</pre></main>`;
});
