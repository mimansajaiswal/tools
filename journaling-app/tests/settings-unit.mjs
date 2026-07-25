import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, normalizeSettings } from '../js/schema.js';

const normalized = normalizeSettings({
    journals: [],
    templates: [],
    reminders: [],
    editor: { customFields: [], savedSearches: [] },
    notion: { workerUrl: DEFAULT_SETTINGS.notion.workerUrl, enabled: false }
});

assert.deepEqual(normalized.journals, []);
assert.deepEqual(normalized.templates, []);
assert.deepEqual(normalized.reminders, []);
assert.deepEqual(normalized.editor.customFields, []);
assert.deepEqual(normalized.editor.savedSearches, []);
assert.equal(normalized.notion.enabled, false);

console.log(JSON.stringify({ ok: true }, null, 2));
