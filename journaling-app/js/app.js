import { Storage, createJournalDocument, createAssetEntry } from './storage.js';
import { APP_NAME, normalizeSettings } from './schema.js';
import { createGoogleSync } from './google-sync.js';
import { createSampleState } from './sample-data.js';
import { mountDocumentEditor } from './editor.js';
import {
    esc,
    prettyDate,
    prettyDateTime,
    renderDocumentList,
    renderPropertySummary,
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
    googleSync: null,
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
    }
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
    if (view === 'journal') return 'journals';
    return view;
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
    URL.revokeObjectURL(url);
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
    if (!lines.length) {
        return [{ id: Storage.createId('block'), type: 'paragraph', text: '' }];
    }
    return lines.map((line) => {
        const match = line.match(/^([A-Za-z]+)\s*:\s*(.*)$/);
        const kind = match ? match[1].trim().toLowerCase() : 'paragraph';
        const text = match ? match[2] : line;
        const blockType = ({
            heading: 'heading',
            bullet: 'bullet',
            checklist: 'checklist',
            quote: 'quote',
            callout: 'callout',
            paragraph: 'paragraph'
        })[kind] || 'paragraph';
        return {
            id: Storage.createId('block'),
            type: blockType,
            text,
            checked: false,
            depth: 0
        };
    });
}

function buildDefaultBlocks(templateId = '') {
    const template = templateMap().get(templateId);
    if (!template) return [{ id: Storage.createId('block'), type: 'paragraph', text: '' }];
    return parseTemplateBody(template.body);
}

function isDesktopViewport() {
    return window.innerWidth > 980;
}

function syncShellState() {
    const shouldShowRightRail = state.settings.showRightPanel === true && state.activeView === 'write';
    document.body.dataset.rightPanelHidden = shouldShowRightRail ? 'false' : 'true';
    document.body.dataset.leftRailOpen = state.leftRailOpen ? 'true' : 'false';
    $$('[data-rail-section]').forEach((section) => {
        const key = section.getAttribute('data-rail-section');
        const isOpen = state.railSections[key] !== false;
        section.dataset.collapsed = isOpen ? 'false' : 'true';
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
        quickAddToggle.title = state.writePanels.quickAdd ? 'Hide quick add' : 'Open quick add';
        quickAddToggle.setAttribute('aria-label', state.writePanels.quickAdd ? 'Hide quick add' : 'Open quick add');
    }

    if (detailsToggle) {
        detailsToggle.setAttribute('aria-expanded', state.writePanels.details ? 'true' : 'false');
        detailsToggle.classList.toggle('btn-primary', state.writePanels.details);
        detailsToggle.classList.toggle('btn-secondary', !state.writePanels.details);
        detailsToggle.title = state.writePanels.details ? 'Hide page details' : 'Open page details';
        detailsToggle.setAttribute('aria-label', state.writePanels.details ? 'Hide page details' : 'Open page details');
    }
}

function renderVisiblePanels() {
    $$('[data-view-link]').forEach((link) => {
        link.classList.toggle('active', link.getAttribute('data-view-link') === state.activeView);
    });
    $$('.workspace-section').forEach((section) => {
        section.classList.toggle('is-hidden', section.getAttribute('data-view') !== state.activeView);
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
        blankArray(doc.blocks).map((block) => block.text).join(' '),
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
    const blockText = blankArray(doc.blocks).map((block) => String(block.text || '').trim()).find(Boolean) || '';
    const compact = [
        doc.locationName ? `From ${doc.locationName}` : '',
        doc.weather || '',
        doc.activity || '',
        blankArray(doc.categories)[0] ? `Category ${blankArray(doc.categories)[0]}` : '',
        blockText
    ].filter(Boolean).join(' • ');
    return compact || 'No summary yet.';
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
    $('#journalList').innerHTML = rows.map((journal) => `
        <button class="doc-list-item ${journal.active ? 'is-active' : ''}" type="button" data-select-journal="${esc(journal.id)}">
            <span class="doc-list-item-top">
                <span class="doc-type-pill">${esc(journal.name)}</span>
                <span class="doc-list-date">${journal.count}</span>
            </span>
            <strong>${esc(journal.description || 'Untitled journal')}</strong>
            <span class="doc-list-meta">${esc(journal.latest ? prettyDate(journal.latest.date || journal.latest.updatedAt) : 'No entries yet')}</span>
        </button>
    `).join('');
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
    $('#docList').innerHTML = renderDocumentList(docs, state.currentDocumentId, journalMap());
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
    $('#editorMetaChips').innerHTML = renderPropertySummary(doc, journal);
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
        blocks: state.editor ? state.editor.getValue() : blankArray(existing.blocks),
        attachments: blankArray(existing.attachments),
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
        onChange: () => {
            const draft = collectDocumentDraft();
            renderDocumentChrome(draft);
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
    state.googleSync = createGoogleSync({
        rootFolderName: state.settings.drive.rootFolderName || APP_NAME
    });
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
    populateReferenceSelects();
    mountQuickAdd();
    renderAll();
}

async function persistDocument(doc) {
    const saved = await Storage.saveDocument(doc);
    await Storage.enqueueSyncJob({
        type: 'document',
        action: 'upsert',
        targetId: saved.id,
        status: 'queued',
        payload: { updatedAt: saved.updatedAt }
    });
    await state.googleSync.enqueueDocument(saved);
    await refreshFromStorage(saved.id);
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

async function saveAssetFiles(files) {
    const doc = currentDocument();
    if (!doc || !files.length) return;
    const nextAttachmentIds = new Set(doc.attachments || []);
    for (const file of files) {
        let blob = file;
        let mimeType = file.type || 'application/octet-stream';
        let name = file.name || `asset-${Date.now()}`;
        let width = null;
        let height = null;
        let storageMode = 'original';
        if (mimeType.startsWith('image/') && state.settings.media.preserveOriginalImages === false) {
            const optimized = await optimizeImageFile(file);
            blob = optimized.blob;
            mimeType = optimized.mimeType;
            name = optimized.name;
            width = optimized.width;
            height = optimized.height;
            storageMode = 'optimized';
        }
        const asset = await Storage.saveAsset(createAssetEntry({
            documentId: doc.id,
            kind: mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('audio/') ? 'audio' : mimeType.startsWith('video/') ? 'video' : 'file',
            name,
            originalName: file.name,
            mimeType,
            size: blob.size,
            width,
            height,
            storageMode,
            metadata: { blob }
        }));
        nextAttachmentIds.add(asset.id);
        await Storage.enqueueSyncJob({
            type: 'asset',
            action: 'upsert',
            targetId: asset.id,
            status: 'queued',
            payload: { documentId: doc.id }
        });
        await state.googleSync.enqueueAsset(asset);
    }
    await persistDocument({
        ...doc,
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

async function saveCurrentDocument() {
    const draft = collectDocumentDraft();
    await persistDocument(draft);
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
        blocks: [{ id: Storage.createId('block'), type: 'paragraph', text: $('#draftBody').value.trim() }],
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
        { id: Storage.createId('block'), type: 'callout', text: title, depth: 0 }
    ];
    if (meta) blocks.push({ id: Storage.createId('block'), type: 'paragraph', text: meta, depth: 0 });
    if (summaryText) blocks.push({ id: Storage.createId('block'), type: 'paragraph', text: summaryText, depth: 0 });
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
                <button class="btn btn-secondary" type="button" data-select-journal="${esc(journal.id)}"><img class="app-icon" data-lucide="book-open" src="./assets/lucide/book-open.svg" alt="" aria-hidden="true" /><span>Open journal</span></button>
                <button class="btn btn-secondary" type="button" data-new-entry-for-journal="${esc(journal.id)}"><img class="app-icon" data-lucide="plus" src="./assets/lucide/plus.svg" alt="" aria-hidden="true" /><span>New entry</span></button>
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
        <button class="doc-list-item" type="button" data-run-search="${esc(item.query || '')}">
            <span class="doc-list-item-top">
                <span class="doc-type-pill">${esc(item.name)}</span>
                <span class="doc-list-date">${item.count}</span>
            </span>
            <strong>${esc(item.subtitle || 'Open collection')}</strong>
            <span class="doc-list-meta">${esc(item.preview || '')}</span>
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
                <button class="btn btn-secondary" type="button" data-apply-template="${esc(template.id)}"><img class="app-icon" data-lucide="layout-template" src="./assets/lucide/layout-template.svg" alt="" aria-hidden="true" /><span>Use template</span></button>
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
            <span class="doc-list-meta">${esc(item.frequency)}</span>
            ${item.docId ? `<div class="composer-actions"><button class="btn btn-secondary" type="button" data-open-doc="${esc(item.docId)}"><img class="app-icon" data-lucide="arrow-up-right" src="./assets/lucide/arrow-up-right.svg" alt="" aria-hidden="true" /><span>Open entry</span></button></div>` : ''}
        </article>
    `).join('') : '<div class="inspector-empty">No reminders yet.</div>';
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
    const firstParagraph = blankArray(doc.blocks).map((block) => block.text).find(Boolean) || '';
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
    const firstWords = blankArray(doc.blocks).map((block) => block.text).join(' ').trim().split(/\s+/).slice(0, 5).join(' ');
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
        if (!window.ai?.languageModel?.create) {
            throw new Error('Chrome Prompt API is not available in this browser.');
        }
        const session = await window.ai.languageModel.create();
        const result = await session.prompt(messages.map((item) => `${item.role}: ${item.content}`).join('\n\n'));
        return String(result || '');
    }
    if (provider === 'byok' || provider === 'local_model') {
        if (!state.settings.ai.apiKey || !state.settings.ai.model || !state.settings.ai.endpoint) {
            throw new Error('AI provider needs an API key, endpoint, and model.');
        }
        const response = await fetch(state.settings.ai.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.settings.ai.apiKey}`
            },
            body: JSON.stringify({
                model: state.settings.ai.model,
                temperature: 0.4,
                messages
            })
        });
        if (!response.ok) throw new Error(`AI request failed: ${response.status}`);
        const payload = await response.json();
        return payload.choices?.[0]?.message?.content || payload.output_text || '';
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
                    { role: 'user', content: blankArray(doc.blocks).map((block) => block.text).join('\n') }
                ]);
            await persistDocument({ ...doc, summary });
            state.aiResponse = summary;
        } else if (action === 'title') {
            const smartTitle = state.settings.ai.provider === 'local-reflection'
                ? buildLocalTitle(doc)
                : await runAiChatCompletion([
                    { role: 'system', content: 'Suggest one short strong title for this journal entry.' },
                    { role: 'user', content: blankArray(doc.blocks).map((block) => block.text).join('\n') }
                ]);
            await persistDocument({ ...doc, smartTitle: String(smartTitle).trim() });
            state.aiResponse = String(smartTitle).trim();
        } else if (action === 'chat') {
            const prompt = state.aiDraft.trim() || 'What should I notice here?';
            const reply = state.settings.ai.provider === 'local-reflection'
                ? buildLocalChat(doc)
                : await runAiChatCompletion([
                    { role: 'system', content: 'You are a reflective journaling assistant. Ground answers in the provided journal entry and keep them concise.' },
                    { role: 'user', content: `Prompt: ${prompt}\n\nEntry:\n${blankArray(doc.blocks).map((block) => block.text).join('\n')}` }
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
    const snapshot = state.googleSync.getSnapshot();
    $('#syncStatusCard').innerHTML = `
        <span class="status-pill status-pill--${snapshot.state.status === 'ready' ? 'ready' : snapshot.state.status === 'error' ? 'error' : 'queued'}">${esc(snapshot.state.status)}</span>
        <p>${esc(snapshot.state.lastError || 'Local save is active. Google Drive connection will be added when you wire OAuth later.')}</p>
        <span class="sync-help">${snapshot.state.pendingDocumentIds.length} documents and ${snapshot.state.pendingAssetIds.length} assets queued.</span>
    `;
    $('#syncQueueList').innerHTML = blankArray(state.syncQueue).slice(0, 6).map((job) => `
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

function renderSettingsPanel() {
    setFieldValue('[name="imageMaxEdge"]', state.settings.media?.imageMaxEdge ?? 2200);
    setFieldValue('[name="imageQuality"]', state.settings.media?.imageQuality ?? 0.82);
    setCheckboxValue('[name="keepOriginalImages"]', state.settings.media?.preserveOriginalImages === true);
    setCheckboxValue('[name="storeOriginalAudio"]', true);
    setCheckboxValue('[name="showRightPanel"]', state.settings.showRightPanel === true);
    setFieldValue('[name="aiProvider"]', state.settings.ai?.provider || 'local-reflection');
    setFieldValue('[name="aiModel"]', state.settings.ai?.model || '');
    setFieldValue('[name="aiEndpoint"]', state.settings.ai?.endpoint || '');
    setFieldValue('[name="aiApiKey"]', state.settings.ai?.apiKey || '');
    setFieldValue('#transcriptionProviderInput', state.settings.ai?.transcriptionProvider || 'browser_native');
    setFieldValue('#transcriptionLanguageInput', 'en-US');
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
    await Storage.saveHealthLog({
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
    await refreshFromStorage();
    event.target.reset();
}

function appendTranscriptToCurrentDocument(text, assetId = null) {
    const doc = currentDocument();
    if (!doc || !text) return;
    const job = createTranscriptionJob({
        documentId: doc.id,
        sourceAudioId: assetId,
        provider: $('#transcriptionProviderInput').value,
        language: $('#transcriptionLanguageInput').value || 'en-US',
        transcriptText: text
    });
    const bundle = buildTranscriptBundle(job, createTranscriptArtifact({
        documentId: doc.id,
        text,
        language: $('#transcriptionLanguageInput').value || 'en-US',
        status: 'ready'
    }));
    const insertion = buildTranscriptInsertion(bundle.transcript, $('#transcriptionInsertModeInput').checked ? 'collapsible' : 'body');
    persistDocument({
        ...doc,
        blocks: blankArray(doc.blocks).concat(insertion.blocks.map((block) => ({
            id: Storage.createId('block'),
            type: block.type === 'collapsible' ? 'callout' : (block.type || 'paragraph'),
            text: block.text || `${block.title || 'Transcript'} ${block.path || ''}`.trim(),
            depth: 0
        }))),
        transcripts: blankArray(doc.transcripts).concat([bundle.transcript])
    });
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
        const blob = new Blob(state.recordingSession._chunks || [], { type: state.mediaRecorder.mimeType || 'audio/webm' });
        const finished = finalizeRecordingSession(state.recordingSession, {
            documentId: currentDocument()?.id || '',
            mimeType: blob.type,
            size: blob.size,
            durationMs: state.recordingSession.durationMs
        });
        const asset = await Storage.saveAsset(createAssetEntry({
            documentId: finished.documentId,
            kind: 'audio',
            name: `voice-${Date.now()}.webm`,
            mimeType: blob.type,
            size: blob.size,
            storageMode: 'original',
            metadata: { blob }
        }));
        const doc = currentDocument();
        if (doc) {
            await persistDocument({
                ...doc,
                attachments: [...new Set(blankArray(doc.attachments).concat([asset.id]))]
            });
        }
        if (state.speechTranscript) appendTranscriptToCurrentDocument(state.speechTranscript, asset.id);
        $('#recordingStatus').textContent = state.speechTranscript ? 'Recording saved and transcript inserted.' : 'Recording saved.';
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
    };
    state.mediaRecorder.start(700);
    state.speechRecognition = initSpeechRecognition();
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
    const asset = await Storage.saveAsset(createAssetEntry({
        documentId: currentDocument()?.id || '',
        kind: 'audio',
        name: file.name,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        metadata: { blob: file }
    }));
    const doc = currentDocument();
    if (doc) {
        await persistDocument({
            ...doc,
            attachments: [...new Set(blankArray(doc.attachments).concat([asset.id]))]
        });
    }
    $('#recordingStatus').textContent = 'Audio uploaded and attached.';
    event.target.value = '';
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
            color: $('#journalColorInput').value.trim() || 'plum',
            description: $('#journalDescriptionInput').value.trim(),
            icon: '✎'
        }])
    });
    await Storage.saveSettings(state.settings);
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
    event.target.reset();
    await refreshFromStorage();
}

async function saveReminder(event) {
    event.preventDefault();
    const title = $('#reminderTitleInput').value.trim();
    if (!title) return;
    state.settings = normalizeSettings({
        ...state.settings,
        reminders: blankArray(state.settings.reminders).concat([{
            id: `reminder_${slugify(title)}_${Date.now().toString(36)}`,
            title,
            journalId: $('#reminderJournalInput').value || '',
            date: $('#reminderDateInput').value,
            time: $('#reminderTimeInput').value,
            frequency: $('#reminderFrequencyInput').value,
            active: true
        }])
    });
    await Storage.saveSettings(state.settings);
    event.target.reset();
    await refreshFromStorage();
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
        ai: {
            ...state.settings.ai,
            provider: String(form.get('aiProvider') || 'local-reflection'),
            model: String(form.get('aiModel') || ''),
            endpoint: String(form.get('aiEndpoint') || ''),
            apiKey: String(form.get('aiApiKey') || ''),
            transcriptionProvider: String($('#transcriptionProviderInput').value || 'browser_native')
        },
        showRightPanel: form.get('showRightPanel') === 'on'
    });
    await Storage.saveSettings(state.settings);
    await refreshFromStorage();
}

function buildMarkdownForDocument(doc) {
    const lines = [
        `# ${doc.smartTitle || doc.title || 'Untitled'}`,
        '',
        `- Journal: ${journalById(doc.journalId)?.name || doc.journalId}`,
        `- Date: ${doc.date || ''}`,
        doc.locationName ? `- Location: ${doc.locationName}` : '',
        doc.weather ? `- Weather: ${doc.weather}` : '',
        doc.activity ? `- Activity: ${doc.activity}` : '',
        blankArray(doc.tags).length ? `- Tags: ${blankArray(doc.tags).join(', ')}` : '',
        blankArray(doc.people).length ? `- People: ${blankArray(doc.people).join(', ')}` : '',
        '',
        ...(doc.summary ? [`> ${doc.summary}`, ''] : []),
        ...blankArray(doc.blocks).map((block) => {
            if (block.type === 'heading') return `## ${block.text}`;
            if (block.type === 'bullet') return `- ${block.text}`;
            if (block.type === 'checklist') return `- [${block.checked ? 'x' : ' '}] ${block.text}`;
            if (block.type === 'quote') return `> ${block.text}`;
            if (block.type === 'callout') return `> ${block.text}`;
            return block.text;
        })
    ].filter(Boolean);
    return lines.join('\n');
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
        await Storage.clearAll();
        await Storage.seedDefaults();
        for (const doc of blankArray(payload.documents)) await Storage.saveDocument(doc);
        for (const log of blankArray(payload.healthLogs)) await Storage.saveHealthLog(log);
        for (const asset of blankArray(payload.assets)) {
            const hydrated = {
                ...asset,
                metadata: {
                    ...asset.metadata,
                    blob: asset.metadata?.blobDataUrl ? dataUrlToBlob(asset.metadata.blobDataUrl) : undefined
                }
            };
            delete hydrated.metadata.blobDataUrl;
            await Storage.saveAsset(hydrated);
        }
        for (const view of blankArray(payload.views)) await Storage.saveView(view);
        for (const job of blankArray(payload.syncQueue)) await Storage.updateSyncJob(job);
        if (payload.settings) await Storage.saveSettings(payload.settings);
        if (payload.syncState) await Storage.saveSyncState(payload.syncState);
        await refreshFromStorage(payload.documents?.[0]?.id || null);
        state.activeView = 'write';
        location.hash = '#write';
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
    $('#libraryCreateDocumentBtn').addEventListener('click', () => createNewDocument());
    $('#createJournalBtn').addEventListener('click', () => {
        state.activeView = 'journals';
        renderAll();
    });
    $('#topNewEntryBtn').addEventListener('click', () => createNewDocument());
    $('#topMarkdownBtn').addEventListener('click', exportMarkdownDump);
    $('#topImportBtn').addEventListener('click', () => $('#importJsonInput').click());
    $('#topExportBtn').addEventListener('click', exportJsonDump);
    $('#importJsonInput').addEventListener('change', importJsonDump);
    $('#toggleFavoriteBtn').addEventListener('click', toggleCurrentFavorite);
    $('#toggleHighlightBtn').addEventListener('click', toggleCurrentHighlight);
    $('#saveDocBtn').addEventListener('click', saveCurrentDocument);
    $('#toggleQuickAddBtn').addEventListener('click', () => {
        state.writePanels.quickAdd = !state.writePanels.quickAdd;
        syncWriteSurfaceState();
    });
    $('#toggleDetailsBtn').addEventListener('click', () => {
        state.writePanels.details = !state.writePanels.details;
        syncWriteSurfaceState();
    });
    $('#docTemplateInput').addEventListener('change', (event) => {
        const doc = currentDocument();
        if (!doc) return;
        const templateId = event.target.value;
        if (!templateId) return;
        const template = templateMap().get(templateId);
        if (!template) return;
        setFieldValue('#docTitleInput', template.name);
        setFieldValue('#docTagsInput', blankArray(template.tags).join(', '));
        state.editor.setValue(buildDefaultBlocks(templateId));
        renderDocumentChrome(collectDocumentDraft());
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
    $('#recordAudioBtn').addEventListener('click', startRecording);
    $('#stopAudioBtn').addEventListener('click', stopRecording);
    $('#audioUploadInput').addEventListener('change', handleAudioUpload);
    $('#settingsForm').addEventListener('submit', saveSettings);
    $('#templateForm').addEventListener('submit', saveTemplate);
    $('#reminderForm').addEventListener('submit', saveReminder);
    $('#journalForm').addEventListener('submit', saveJournal);
    $('#addCustomFieldBtn').addEventListener('click', addCustomField);
    $('#addSavedSearchBtn').addEventListener('click', addSavedSearch);
    $('#runSyncBtn').addEventListener('click', async () => {
        await state.googleSync.syncNow();
        renderSyncPanel();
    });
    $('#connectDriveBtn').addEventListener('click', () => {
        state.aiStatus = 'Google Drive wiring is deferred until you add OAuth credentials.';
        renderSyncPanel();
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

    document.body.addEventListener('input', (event) => {
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
        }
    });

    document.body.addEventListener('click', async (event) => {
        const docButton = event.target.closest('[data-open-doc]');
        if (docButton) {
            const id = docButton.getAttribute('data-open-doc');
            if (id) {
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
            state.settings = normalizeSettings({
                ...state.settings,
                activeJournalId: journalButton.getAttribute('data-select-journal')
            });
            await Storage.saveSettings(state.settings);
            state.activeView = 'journals';
            await refreshFromStorage();
            location.hash = '#journals';
            return;
        }

        const newEntryJournal = event.target.closest('[data-new-entry-for-journal]');
        if (newEntryJournal) {
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
        syncShellState();
        if (state.map) requestAnimationFrame(() => state.map.invalidateSize());
    });
}

async function main() {
    await loadState();
    document.documentElement.removeAttribute('data-initial-view');
    state.activeView = mapViewHashToState(location.hash.replace(/^#/, '')) || 'write';
    state.leftRailOpen = false;
    mountEditor();
    populateReferenceSelects();
    mountQuickAdd();
    bindEvents();
    setFieldValue('#draftDate', todayYmd());
    setFieldValue('#docDateInput', todayYmd());
    state.googleSync.state.subscribe(() => renderSyncPanel());
    renderAll();
}

main().catch((error) => {
    console.error(error);
    document.body.innerHTML = `<main style="padding:24px;font-family:sans-serif"><h1>Failed to start</h1><pre>${esc(String(error.stack || error.message || error))}</pre></main>`;
});
