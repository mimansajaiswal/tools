export const REMINDER_META_KEY = 'journaling:reminder-deliveries:v1';
export const REMINDER_PERIODIC_TAG = 'journaling-reminders';
export const REMINDER_PERIODIC_INTERVAL = 15 * 60 * 1000;

const list = (value) => Array.isArray(value) ? value : [];
const text = (value = '') => String(value || '').trim();

function localDateTime(dateText, timeText) {
    const match = text(dateText).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const time = text(timeText).match(/^(\d{2}):(\d{2})/);
    if (!match || !time) return null;
    const value = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(time[1]), Number(time[2]), 0, 0);
    return Number.isFinite(value.getTime()) ? value : null;
}

function localYmd(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function reminderOccurrence(reminder = {}, nowValue = new Date()) {
    const now = new Date(nowValue);
    if (!reminder.active || !Number.isFinite(now.getTime())) return null;
    if (reminder.at) {
        const at = new Date(reminder.at);
        return Number.isFinite(at.getTime()) ? at : null;
    }
    const time = text(reminder.time);
    if (!time) return null;
    const frequency = text(reminder.frequency || 'none');
    if (frequency === 'none') return localDateTime(reminder.date, time);

    const occurrence = localDateTime(localYmd(now), time);
    if (!occurrence) return null;
    const startsAt = reminder.date ? localDateTime(reminder.date, time) : null;
    if (startsAt && occurrence < startsAt) return null;
    if (frequency === 'daily') return occurrence;
    if (frequency === 'weekly') {
        const weekday = Number.isInteger(Number(reminder.weekday)) ? Number(reminder.weekday) : startsAt?.getDay();
        return weekday === now.getDay() ? occurrence : null;
    }
    if (frequency === 'monthly') {
        const dayOfMonth = Number.isInteger(Number(reminder.dayOfMonth)) ? Number(reminder.dayOfMonth) : startsAt?.getDate();
        return dayOfMonth === now.getDate() ? occurrence : null;
    }
    return null;
}

export function collectReminderCandidates(settings = {}, documents = []) {
    const journals = new Map(list(settings.journals).map((journal) => [journal.id, journal.name]));
    const configured = list(settings.reminders).map((reminder) => ({
        ...reminder,
        source: 'configured',
        body: journals.get(reminder.journalId) ? `Journal in ${journals.get(reminder.journalId)}` : 'Time to journal',
        url: reminder.journalId ? `./#journals:${encodeURIComponent(reminder.journalId)}` : './#write'
    }));
    const documentReminders = list(documents)
        .filter((document) => text(document.reminderAt))
        .map((document) => ({
            id: `document:${document.id}`,
            title: text(document.reminderLabel || document.smartTitle || document.title) || 'Journal reminder',
            at: document.reminderAt,
            active: true,
            source: 'document',
            documentId: document.id,
            body: journals.get(document.journalId) ? `Open ${journals.get(document.journalId)}` : 'Open journal entry',
            url: `./#write:${encodeURIComponent(document.id)}`
        }));
    return [...configured, ...documentReminders];
}

export function evaluateDueReminders({ settings = {}, documents = [], now = new Date(), deliveryState = {} } = {}) {
    const current = new Date(now);
    const currentMs = current.getTime();
    const previousCheck = new Date(deliveryState.lastCheckAt || 0).getTime();
    const windowStart = Number.isFinite(previousCheck) && previousCheck > 0
        ? Math.max(previousCheck, currentMs - 24 * 60 * 60 * 1000)
        : currentMs - 5 * 60 * 1000;
    const delivered = new Set(list(deliveryState.deliveredKeys));
    const due = [];
    collectReminderCandidates(settings, documents).forEach((reminder) => {
        const occurrence = reminderOccurrence(reminder, current);
        if (!occurrence) return;
        const occurrenceMs = occurrence.getTime();
        const key = `${reminder.id}:${occurrence.toISOString()}`;
        if (occurrenceMs <= windowStart || occurrenceMs > currentMs || delivered.has(key)) return;
        delivered.add(key);
        due.push({ ...reminder, occurrenceAt: occurrence.toISOString(), deliveryKey: key });
    });
    return {
        due,
        deliveryState: {
            lastCheckAt: current.toISOString(),
            deliveredKeys: [...delivered].slice(-256)
        }
    };
}
