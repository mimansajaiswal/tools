function esc(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export { esc };

function parseDisplayDate(value) {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        return new Date(`${value}T12:00:00`);
    }
    return new Date(value);
}

export function prettyDate(value, options) {
    if (!value) return 'No date';
    const date = parseDisplayDate(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-US', options || {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    }).format(date);
}

export function prettyDateTime(value) {
    if (!value) return 'No time';
    const date = parseDisplayDate(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    }).format(date);
}

export function renderDocumentList(documents, currentDocumentId, journalsById = new Map()) {
    return documents.map((doc) => {
        const journal = journalsById.get(doc.journalId);
        return `
            <button class="doc-list-item ${doc.id === currentDocumentId ? 'is-active' : ''}" type="button" data-open-doc="${esc(doc.id)}">
                <span class="doc-list-item-top">
                    <span class="doc-type-pill">${esc(journal?.name || doc.type)}</span>
                    <span class="doc-list-date">${esc(prettyDate(doc.date || doc.updatedAt))}</span>
                </span>
                <strong>${esc(doc.smartTitle || doc.title || 'Untitled')}</strong>
                <span class="doc-list-meta">
                    ${esc([
                        doc.favorite ? 'Favorite' : '',
                        doc.highlighted ? 'Highlight' : '',
                        doc.locationName || '',
                        (doc.tags || []).slice(0, 2).join(' • ')
                    ].filter(Boolean).join(' • ') || 'No tags yet')}
                </span>
            </button>
        `;
    }).join('');
}

export function renderPropertySummary(doc, journal) {
    const items = [
        doc.locationName || '',
        Number.isFinite(doc.mood) ? `Mood ${doc.mood}/10` : '',
        Number.isFinite(doc.energy) ? `Energy ${doc.energy}/10` : '',
        doc.reminderAt ? `Reminder ${prettyDateTime(doc.reminderAt)}` : '',
        Array.isArray(doc.people) && doc.people.length ? `${doc.people.length} people` : '',
        Array.isArray(doc.categories) && doc.categories.length ? `${doc.categories.length} categories` : '',
        Array.isArray(doc.tags) && doc.tags.length ? `${doc.tags.length} tags` : ''
    ].filter(Boolean).slice(0, 5);
    return items.map((item) => `<span class="entry-property">${esc(item)}</span>`).join('');
}

export function renderTagRow(items, className) {
    return (Array.isArray(items) ? items : []).map((item) => `
        <span class="${className}">${esc(item)}</span>
    `).join('');
}

export function renderTimeline(documents, journalsById = new Map()) {
    const grouped = new Map();
    documents.forEach((doc) => {
        const key = doc.date || 'Undated';
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(doc);
    });
    return Array.from(grouped.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([date, docs]) => `
            <section class="timeline-day">
                <header>
                    <h3>${esc(prettyDate(date, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }))}</h3>
                    <span>${docs.length} entries</span>
                </header>
                <div class="timeline-items">
                    ${docs.map((doc) => {
            const journal = journalsById.get(doc.journalId);
            return `
                            <article class="timeline-item" data-open-doc="${esc(doc.id)}">
                                <div class="timeline-item-head">
                                    <strong>${esc(doc.smartTitle || doc.title)}</strong>
                                    <span>${esc(journal?.name || doc.type)}</span>
                                </div>
                                <p>${esc((doc.summary || (doc.blocks || []).map((block) => block.text).join(' ')).slice(0, 210))}</p>
                                <div class="timeline-tags">${renderTagRow(doc.tags, 'mini-tag')}</div>
                            </article>
                        `;
        }).join('')}
                </div>
            </section>
        `).join('');
}

export function renderCalendar(documents, year, month) {
    const start = new Date(year, month, 1);
    const firstWeekday = start.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const docsByDay = new Map();

    documents.forEach((doc) => {
        if (!doc.date) return;
        if (!docsByDay.has(doc.date)) docsByDay.set(doc.date, []);
        docsByDay.get(doc.date).push(doc);
    });

    const cells = [];
    for (let i = 0; i < firstWeekday; i += 1) {
        cells.push('<div class="calendar-cell calendar-cell--empty"></div>');
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(year, month, day).toISOString().slice(0, 10);
        const dayDocs = docsByDay.get(date) || [];
        cells.push(`
            <div class="calendar-cell ${dayDocs.length ? 'calendar-cell--has-entry' : 'calendar-cell--no-entry'}">
                <div class="calendar-cell-head">
                    <strong>${day}</strong>
                    <span>${dayDocs.length ? `${dayDocs.length} entries` : ''}</span>
                </div>
                <div class="calendar-cell-list">
                    ${dayDocs.slice(0, 3).map((doc) => `
                        <button type="button" class="calendar-pill" data-open-doc="${esc(doc.id)}">
                            ${esc(doc.smartTitle || doc.title)}
                        </button>
                    `).join('')}
                </div>
            </div>
        `);
    }

    return `
        <div class="calendar-grid">
            ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => `<div class="calendar-weekday">${day}</div>`).join('')}
            ${cells.join('')}
        </div>
    `;
}

export function renderInsightBars(items) {
    const max = Math.max(1, ...items.map((item) => Number(item.value) || 0));
    return items.map((item) => {
        const pct = Math.round((Number(item.value) || 0) / max * 100);
        return `
        <div class="insight-bar-row">
            <div class="insight-bar-label">${esc(item.label)}</div>
            <div class="insight-bar-track"><span class="insight-bar-fill" style="width:${pct}%"></span></div>
            <div class="insight-bar-value">${esc(item.display || item.value)}</div>
        </div>
    `;
    }).join('');
}

export function renderMeasurementsTable(measurements) {
    return measurements.map((item) => `
        <tr>
            <td>${esc(item.metric)}</td>
            <td>${esc(item.value)}</td>
            <td>${esc(item.unit || '')}</td>
            <td>${esc(item.sourcePlatform || item.source || 'manual')}</td>
            <td>${esc(prettyDate(item.date || item.recordedAt))}</td>
        </tr>
    `).join('');
}

export function renderTranscriptCards(transcripts) {
    return transcripts.map((item) => `
        <article class="transcript-card">
            <header>
                <div>
                    <strong>${esc(item.title || 'Transcript')}</strong>
                    <span>${esc(item.provider || 'provider')}</span>
                </div>
                <span class="status-pill status-pill--${esc(item.status || 'pending')}">${esc(item.status || 'pending')}</span>
            </header>
            <p>${esc(item.text || 'No transcript text yet.')}</p>
            <footer>
                <span>${esc(item.language || 'lang?')}</span>
                <span>${esc(prettyDate(item.createdAt))}</span>
            </footer>
        </article>
    `).join('');
}
