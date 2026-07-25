import assert from 'node:assert/strict';
import { collectReminderCandidates, evaluateDueReminders, reminderOccurrence } from '../js/reminders.js';

const now = new Date(2026, 6, 12, 9, 2, 0, 0);
const settings = {
    journals: [{ id: 'journal-1', name: 'Personal' }],
    reminders: [{
        id: 'daily-1',
        title: 'Morning note',
        journalId: 'journal-1',
        time: '09:00',
        frequency: 'daily',
        active: true
    }]
};

const first = evaluateDueReminders({ settings, documents: [], now, deliveryState: {} });
assert.equal(first.due.length, 1);
assert.equal(first.due[0].title, 'Morning note');
assert.equal(first.due[0].journalId, 'journal-1');
assert.match(first.due[0].url, /#journals:journal-1$/);

const duplicate = evaluateDueReminders({ settings, documents: [], now: new Date(2026, 6, 12, 9, 3), deliveryState: first.deliveryState });
assert.equal(duplicate.due.length, 0);

const nextDay = evaluateDueReminders({ settings, documents: [], now: new Date(2026, 6, 13, 9, 1), deliveryState: first.deliveryState });
assert.equal(nextDay.due.length, 1);

const weekly = reminderOccurrence({ active: true, time: '09:00', frequency: 'weekly', weekday: now.getDay() }, now);
assert.equal(weekly.getHours(), 9);
assert.equal(reminderOccurrence({ active: true, time: '09:00', frequency: 'weekly', weekday: (now.getDay() + 1) % 7 }, now), null);

const monthly = reminderOccurrence({ active: true, time: '08:30', frequency: 'monthly', dayOfMonth: 12 }, now);
assert.equal(monthly.getDate(), 12);
assert.equal(reminderOccurrence({ active: true, time: '08:30', frequency: 'monthly', dayOfMonth: 13 }, now), null);

const documentAt = new Date(2026, 6, 12, 9, 1).toISOString();
const documents = [{ id: 'doc-1', journalId: 'journal-1', title: 'Specific entry', reminderAt: documentAt }];
const candidates = collectReminderCandidates({ journals: settings.journals, reminders: [] }, documents);
assert.equal(candidates[0].documentId, 'doc-1');
assert.match(candidates[0].url, /#write:doc-1$/);
const documentDue = evaluateDueReminders({ settings: { journals: settings.journals, reminders: [] }, documents, now, deliveryState: {} });
assert.equal(documentDue.due.length, 1);
assert.equal(documentDue.due[0].documentId, 'doc-1');

const old = evaluateDueReminders({
    settings: { journals: [], reminders: [] },
    documents: [{ id: 'old', title: 'Old', reminderAt: new Date(2026, 6, 10, 9, 0).toISOString() }],
    now,
    deliveryState: { lastCheckAt: new Date(2026, 6, 10, 8, 0).toISOString(), deliveredKeys: [] }
});
assert.equal(old.due.length, 0);

console.log(JSON.stringify({ ok: true }, null, 2));
