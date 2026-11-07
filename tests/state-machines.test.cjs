'use strict';
// Regression tests for operation ownership, durable saves, and recoverable queues.
// No network requests, browser writes, or application-file mutations are made.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const silent = { log() { }, warn() { }, error() { }, debug() { } };
function part(file, start, end) {
  const src = read(file); const a = src.indexOf(start); const b = src.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, file + ': source boundaries'); return src.slice(a, b);
}
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
async function settleUntil(fn) { for (let i = 0; i < 100; i++) { if (fn()) return; await new Promise(r => setImmediate(r)); } throw Error('Probe did not reach expected pause'); }
function element() { return { value: '', textContent: '', innerHTML: '', style: {}, dataset: {}, classList: { add() { }, remove() { }, toggle() { }, contains() { return false; } }, removeAttribute() { }, getBoundingClientRect() { return {}; } }; }
function memoryDB() {
  const stores = new Map(); const map = name => { if (!stores.has(name)) stores.set(name, new Map()); return stores.get(name); };
  const api = {
    stores, failNextCommit: false,
    get: async (s, id) => structuredClone(map(s).get(id)),
    put: async (s, item) => { map(s).set(item.id, structuredClone(item)); return structuredClone(item); },
    delete: async (s, id) => map(s).delete(id),
    query: async (s, p) => Array.from(map(s).values()).filter(p).map(x => structuredClone(x)),
    getAll: async s => Array.from(map(s).values()).map(x => structuredClone(x)),
    getByNotionId: async (s, id) => structuredClone(Array.from(map(s).values()).find(x => x.notionId === id))
  };
  api.open = async () => ({
    transaction(names, mode) {
      names = Array.isArray(names) ? names : [names];
      const staged = new Map(names.map(name => [name, structuredClone(map(name))]));
      const fail = mode === 'readwrite' && api.failNextCommit; if (fail) api.failNextCommit = false;
      let active = true, pending = 0, scheduled = false;
      const tx = {
        error: null, abort() { if (!active) return; active = false; tx.error = Error('Transaction aborted'); setImmediate(() => tx.onabort?.()); }, objectStore(name) {
          assert.ok(staged.has(name)); const records = staged.get(name);
          return {
            get: id => request(() => records.get(id)), getAll: () => request(() => Array.from(records.values())),
            put: item => { const cloned = structuredClone(item); return request(() => { records.set(cloned.id, cloned); return cloned.id; }); },
            delete: id => request(() => records.delete(id)), clear: () => request(() => records.clear())
          };
        }
      };
      function complete() {
        if (!active || pending || scheduled) return; scheduled = true; setImmediate(() => {
          scheduled = false; if (!active || pending) return;
          if (fail) { tx.abort(); return; }
          if (mode === 'readwrite') for (const [name, records] of staged) stores.set(name, records);
          active = false; tx.oncomplete?.();
        });
      }
      function request(fn) {
        const req = {}; pending++; setImmediate(() => {
          if (!active) return;
          try { req.result = structuredClone(fn()); req.onsuccess?.(); } catch (error) { req.error = error; tx.error = error; req.onerror?.(); tx.onerror?.(); tx.abort(); }
          pending--; complete();
        }); return req;
      }
      complete(); return tx;
    }
  });
  return api;
}
function petContext() {
  const ctx = { console: silent, crypto: require('node:crypto').webcrypto, navigator: { onLine: true }, setTimeout, clearTimeout, localStorage: { getItem() { return null; }, setItem() { } } }; ctx.window = ctx;
  vm.createContext(ctx); vm.runInContext(read('pet-tracker/js/storage.js'), ctx); vm.runInContext(read('pet-tracker/js/sync.js'), ctx);
  const db = memoryDB(); Object.assign(ctx.PetTracker.DB, db); const sy = ctx.PetTracker.Sync;
  ctx.PetTracker.Settings.get = () => ({ dataSources: { events: 'source' } }); sy.toNotionProperties = async (_store, p) => p; sy.cleanupUploadedLocalBlobsForRecord = async () => { }; sy.waitForRateLimit = async () => { }; sy.updatePendingCount = async () => { };
  return { ctx, db, sy, q: ctx.PetTracker.SyncQueue };
}

test('F01 Pet Tracker: older acknowledgment preserves a newer coalesced edit', async () => {
  const { ctx, db, sy, q } = petContext(); const pending = deferred(); let started = false;
  ctx.PetTracker.API = { updatePage: async () => { started = true; await pending.promise; } };
  await db.put('events', { id: 'e', notionId: 'remote', title: 'old', synced: false });
  await q.add({ type: 'update', store: 'events', recordId: 'e', data: { id: 'e', title: 'old' } });
  const push = sy.pushLocalChanges(); await settleUntil(() => started);
  await db.put('events', { id: 'e', notionId: 'remote', title: 'new', synced: false });
  await q.add({ type: 'update', store: 'events', recordId: 'e', data: { id: 'e', title: 'new' } });
  assert.equal((await q.getPending())[0].data.title, 'new'); pending.resolve(); await push;
  assert.equal((await q.getPending()).length, 1); assert.equal((await q.getPending())[0].data.title, 'new'); assert.equal((await db.get('events', 'e')).title, 'new');
});

test('F02 GhostInk: an old push preserves the replacement queue entry and newer card data', async () => {
  const pending = deferred(); let started = false; const disk = new Map(); const card = { id: 'c', notionId: 'remote', deckId: 'd', name: 'old' };
  const old = { id: 1, type: 'card-upsert', payload: structuredClone(card) };
  const app = { state: { settings: {}, queue: new Map([['card-upsert:c', old]]), cards: new Map([['c', card]]) }, queueKey: op => op.type + ':' + op.payload.id, deckById: () => ({ id: 'd', notionId: 'deck' }), isTempId: () => false, setCard(c) { this.state.cards.set(c.id, structuredClone(c)); }, cardByNotionId: () => null, renderConnection() { } };
  const ctx = { app, console: silent, sleep: async () => { }, toast() { }, el: () => element(), isClozeParent: () => false, NotionMapper: { cardProps: p => ({ Name: { title: p.name }, Back: { rich_text: [] }, Notes: { rich_text: [] } }) }, API: { updatePage: async () => { started = true; await pending.promise; } }, Storage: { getSyncQueue: async () => Array.from(disk.entries()).filter(([k]) => k.startsWith('syncQueue:')).map(([, v]) => structuredClone(v)), getAll: async () => Array.from(app.state.cards.values()), put: async (s, v) => disk.set(s + ':' + v.id, structuredClone(v)), setMeta: async () => { }, removeFromSyncQueue: async id => disk.delete('syncQueue:' + id) } };
  vm.createContext(ctx); vm.runInContext('Object.assign(app, {' + part('ghostink-flashcards/js/app.js', '    async pushQueue() {', '    async queueOp(') + '});', ctx);
  disk.set('syncQueue:1', old); const push = app.pushQueue(); await settleUntil(() => started);
  const replacement = { id: 2, type: 'card-upsert', payload: { ...card, name: 'new' } }; app.state.queue.set('card-upsert:c', replacement); app.state.cards.set('c', replacement.payload); disk.set('syncQueue:2', replacement);
  pending.resolve(); await push;
  assert.equal(app.state.queue.size, 1); assert.equal(app.state.cards.get('c').name, 'new'); assert.ok(disk.has('syncQueue:2'));
});

test('F03 Photo Chronicles: Save waits for a durable full-resolution asset', async () => {
  const pending = deferred(); let saved = null;
  const job = { preparation: pending.promise };
  const nodes = new Map(); const el = id => { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); };
  el('entryDate').value = '2026-11-06T12:00';
  const App = { state: { highResJob: job, capturedImage: 'preview', capturedImageHighRes: null, activeDiaryId: 'd', currentTags: [], segments: [] }, setEntryLoading(v) { this.state.entryLoading = v; }, getVisibleEntries: () => [], closeModal() { }, renderSidebar() { }, renderDiaryView() { }, showToast() { } };
  const ctx = { App, Storage: { getData: () => [{ id: 'd', title: 'Diary' }], saveEntry: (_id, e) => { saved = e; }, queuePendingEntry() { }, clearEntryDraft() { } }, document: { getElementById: el }, ImageStore: { isAvailable: () => false }, UTILS: { id: () => 'e', localToUTC: x => x }, crypto: require('node:crypto').webcrypto, navigator: { onLine: false }, SyncManager: { updateUI() { } } };
  vm.createContext(ctx); vm.runInContext('Object.assign(App,{' + part('photo-chronicles/index.html', '            saveEntry: async () => {', '            copyWorkerCode:') + '});', ctx);
  const saving = App.saveEntry(); assert.equal(saved, null); job.result = 'full-resolution'; pending.resolve(); await saving;
  assert.equal(saved.uploadDataURL, 'full-resolution'); assert.equal(saved.uploadPending, false);
});

test('F04 GhostInk: delayed AI judgment cannot reveal the next card', async () => {
  const pending = deferred(); let started = false; const nodes = new Map(); const el = s => { if (!nodes.has(s)) nodes.set(s, element()); return nodes.get(s); }; el('#aiAnswer').value = 'my answer';
  const app = { state: { aiLocked: false, answerRevealed: false, cardReversed: false, selectedCard: { id: 'a', deckId: 'd', name: 'question A', back: 'answer A' }, settings: { aiVerified: true, aiKey: 'key' } }, isMicActive: () => false, deckById: () => null, setAiControlsLocked(v) { this.state.aiLocked = v; }, updateMobileFab() { }, callAI: async () => { started = true; return pending.promise; }, renderMath() { }, reveal() { this.revealed = this.state.selectedCard.id; this.state.answerRevealed = true; } };
  const ctx = { app, el, navigator: { onLine: true }, DEFAULT_AI_PROMPT: '{{question}}', toast() { }, safeMarkdownParse: x => x, applyMediaEmbeds() { }, console: silent, setTimeout() { } }; vm.createContext(ctx); vm.runInContext('Object.assign(app, {' + part('ghostink-flashcards/js/app.js', '    async submitToAI() {', '    async callAI(') + '});', ctx);
  const request = app.submitToAI(); await settleUntil(() => started); app.state.selectedCard = { id: 'b', deckId: 'd', name: 'question B', back: 'answer B' }; pending.resolve('Feedback for A'); await request;
  assert.equal(app.revealed, undefined); assert.notEqual(el('#aiFeedback').innerHTML, 'Feedback for A');
});

test('F05 Quick Add: an awaited commit cannot write into a replacement token', async () => {
  const pending = deferred(); let started = false;
  function QuickAddComponent() { } const ctx = { QuickAddComponent, normValue: x => String(x), normalizeOption: x => x, isFileFieldType: () => false }; vm.createContext(ctx);
  vm.runInContext(part('components/quick-add/quick-add-component.js', '    QuickAddComponent.prototype.applyDropdownSelection =', '    QuickAddComponent.prototype.applyAIFieldSelection ='), ctx);
  const app = { inputText: 'p:low;', config: { multiSelectSeparator: ',', fieldTerminator: ';' }, tokenMap: { e0_t0: { key: 'priority', globalValueStart: 2, globalValueEnd: 5, value: 'low', committed: true } }, dropdownState: { fieldKey: 'priority', fieldType: 'options', tokenId: 'e0_t0', entryIndex: 0, entryKey: 0, source: 'click', sourceRegion: 'inline' }, getFieldDefinition: () => ({ type: 'options', multiple: false }), resolveCustomOptionSelection: async () => { started = true; await pending.promise; return { accepted: true, value: 'high' }; }, isFieldValueDependencyAllowed: () => ({ ok: true }), runBeforeCommitField: async c => ({ allow: true, value: c.nextValue }), closeDropdown() { this.dropdownState = null; }, replaceRange: (src, a, b, r) => src.slice(0, a) + r + src.slice(b), shouldRefocusInputAfterCommit: () => false, parseAndRender(opts) { this.inputText = opts.source; } };
  const run = QuickAddComponent.prototype.applyDropdownSelection.call(app, 'high'); await settleUntil(() => started);
  app.dropdownState = null; app.inputText = 'pet:Pico;'; app.tokenMap = { e0_t0: { key: 'pet', globalValueStart: 4, globalValueEnd: 8, value: 'Pico', committed: true } };
  pending.resolve(); await run; assert.equal(app.inputText, 'pet:Pico;');
});

test('F06 Quick Add: destroy invalidates in-flight parsing', async () => {
  const pending = deferred(); let started = false; function QuickAddComponent() { } const ctx = { QuickAddComponent, URL: { revokeObjectURL() { } } }; vm.createContext(ctx);
  vm.runInContext(part('components/quick-add/quick-add-component.js', '    QuickAddComponent.prototype.parseAI =', '    QuickAddComponent.prototype.applyQueuedAIResult =') + part('components/quick-add/quick-add-component.js', '    QuickAddComponent.prototype.destroy =', '    const quickAddApi ='), ctx);
  const app = { inputText: 'text', aiState: { requestSeq: 0 }, config: { ai: { minInputLength: 0 } }, isAiMode: () => true, clearAIQueuedRequest() { }, parseAndRender() { }, buildAIDispatchBatch: async () => [], buildAICallerRequest: () => ({}), extractAIFromInput: async () => { started = true; return pending.promise; }, serializeAIProviderRawResponse: () => '', applyAIParseResult() { this.applied = true; }, mountEl: { innerHTML: 'mounted' }, unbindEvents() { }, closeBlockedInfo() { }, closeDatePicker() { }, closeNumberPicker() { }, closeDropdown() { }, closeAttachmentSourceMenu() { }, closeConflictModal() { } };
  const request = QuickAddComponent.prototype.parseAI.call(app); await settleUntil(() => started); QuickAddComponent.prototype.destroy.call(app); pending.resolve({ status: 'completed', normalized: { entries: [] }, responses: [] }); await request;
  assert.equal(app.mountEl.innerHTML, ''); assert.equal(app.applied, undefined);
});

test('F07 VoxMark: one session has one processing owner', async () => {
  const pending = deferred(); let calls = 0; let applied = 0; const session = { id: 's', status: 'queued', transcript: 'speech', audioChunks: [] };
  const ctx = { state: { queue: [session], settings: {} }, elements: { progressLabel: element() }, notify() { }, setLoading() { }, updateQueueItem() { }, logEvent() { }, splitSessionForProcessing: () => [{}], buildAiPayload: () => ({}), callAi: async () => { calls++; await pending.promise; return {}; }, applyAnnotations: async () => { applied++; } };
  vm.createContext(ctx); vm.runInContext(part('voxmark/js/ai.js', 'async function processSession(session) {', 'function splitSessionForProcessing('), ctx);
  const one = ctx.processSession(session), two = ctx.processSession(session); await settleUntil(() => calls === 1); pending.resolve(); await Promise.all([one, two]); assert.equal(applied, 1);
});

test('F08 VoxMark: final audio is queued only after recording stops', async () => {
  const stopped = deferred(); const session = { id: 's', transcript: '', audioChunks: [], snapshots: [], taps: [] }; let queued = 0;
  const ctx = { captureAttempt: 0, state: { recording: true, recordingSession: session, mode: 'batch' }, elements: { micButton: element() }, endCaptureLoop() { }, endSTT: () => stopped.promise, notify() { }, logEvent() { }, clearFocusPins() { }, addToQueue() { queued++; } };
  vm.createContext(ctx); vm.runInContext(part('voxmark/js/stt.js', 'async function stopRecordingSession() {', 'function beginCaptureLoop()'), ctx);
  const stopping = ctx.stopRecordingSession(); assert.equal(queued, 0); session.audioChunks.push({ blob: 'final-audio' }); stopped.resolve(); await stopping; assert.equal(queued, 1);
});

test('F09 Sequence: clients cannot reset the host game', () => {
  let resets = 0; const ctx = { selfId: 'host', isHost: true, hostState: { gameStarted: true, gameOver: false, players: [{ id: 'host' }, { id: 'client' }], turnIndex: 0 }, resetGame() { resets++; }, broadcastState() { }, setPlayerTeam() { } };
  vm.createContext(ctx); vm.runInContext(part('games/sequence/index.html', '    function handleAction(playerId, action) {', '    function drawCard('), ctx); ctx.handleAction('client', { type: 'reset_game' }); assert.equal(resets, 0);
});

test('F10 Sequence: disconnecting another player preserves the current turn', () => {
  const src = part('games/sequence/index.html', '        conn.on("close", () => {', '    function replaceHostId(');
  const body = src.slice(src.indexOf('          connections.delete'), src.indexOf('\n        });'));
  const ctx = { isHost: true, disconnectTimers: new Map(), REJOIN_GRACE_MS: 60000, setTimeout: () => 1, conn: { peer: 'c' }, connections: new Map(), hostState: { players: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], hands: {}, turnIndex: 0, gameStarted: true }, assignTeams() { }, setTurnTimer() { }, logHost() { }, updateLobbyControls() { }, broadcastState() { } };
  vm.createContext(ctx); vm.runInContext('(function(){' + body + '})()', ctx); assert.equal(ctx.hostState.players[ctx.hostState.turnIndex].id, 'a');
});

test('F11 Sequence: a pending DataConnection cannot block the next attempt', () => {
  const ctx = { isHost: false, hostConn: { open: false, close() { } }, reconnectAttempts: 1, MAX_RECONNECT_ATTEMPTS: 5, peer: { open: true }, loadSession: () => ({ role: 'client', joinCode: 'code' }), toast() { }, connectToHost() { }, RECONNECT_INTERVAL: 5000, setTimeout: () => 1 };
  vm.createContext(ctx); vm.runInContext(part('games/sequence/index.html', '    function attemptReconnect() {', '    function cancelAutoReconnect()'), ctx); ctx.attemptReconnect(); assert.equal(ctx.reconnectAttempts, 2);
});

test('F12 PDF Stack: slower first upload cannot replace a newer document', async () => {
  const a = deferred(), b = deferred(); const ctx = { state: { pdfDoc: null, loadToken: 0, renderToken: 0 }, els: { placeholder: element(), downloadBtn: element(), canvas: element() }, setStatus() { }, loadPagesFromDoc: async () => { }, pdfjsLib: { getDocument: ({ data }) => ({ promise: data === 'A' ? a.promise : b.promise }) }, console: silent };
  vm.createContext(ctx); vm.runInContext(part('pdf-stack-designer.html', '        async function handleFileUpload(e) {', '        async function handleUrlLoad()'), ctx);
  const first = ctx.handleFileUpload({ target: { files: [{ type: 'application/pdf', arrayBuffer: async () => 'A' }] } }), second = ctx.handleFileUpload({ target: { files: [{ type: 'application/pdf', arrayBuffer: async () => 'B' }] } });
  await new Promise(r => setImmediate(r)); b.resolve({ id: 'B', numPages: 1 }); await second; a.resolve({ id: 'A', numPages: 1 }); await first; assert.equal(ctx.state.pdfDoc.id, 'B');
});

test('F13 Config Explorer: invalid input cannot export a previous object', () => {
  const old = { secret: 'last valid data' }; let rendered = false; const ctx = { currentData: old, missingCloses: [], commentMap: {}, commentUsage: {}, els: { input: { value: '{broken' }, opts: { comments: { checked: false } }, preview: element(), exportCode: element(), modal: element() }, JSON5: { parse() { throw Error('invalid'); } }, jsyaml: { load() { throw Error('invalid'); } }, parserLocked: true, currentParserMode: () => 'json', setStatus() { }, tryFixJson: () => ({ fixed: null }), buildPalette: () => ({ palette: {} }), buildComponent: data => JSON.stringify(data), console: silent, renderPreview() { rendered = true; } };
  vm.createContext(ctx); vm.runInContext(part('config-explorer.html', '        function handleInput() {', '        function setStatus(') + part('config-explorer.html', '        function generateComponent() {', '        function copyToClipboard()'), ctx); ctx.handleInput(); ctx.generateComponent(); assert.equal(ctx.els.exportCode.value, ''); assert.equal(rendered, false);
});

test('F14 Pet Tracker: pending local edits survive newer remote timestamps', async () => {
  const { ctx, db, sy, q } = petContext(); ctx.PetTracker.NotionExtract = { icon: () => null }; sy.normalizeRelationFields = async () => { }; sy.fromNotionPage = () => ({ title: 'remote' });
  await db.put('events', { id: 'e', notionId: 'remote', title: 'unsent local', synced: false, updatedAt: '2026-11-06T10:00:00Z' }); await q.add({ type: 'update', store: 'events', recordId: 'e', data: { title: 'unsent local' } });
  await sy.reconcileRecord('events', 'EVENTS', { id: 'remote', last_edited_time: '2026-11-06T10:00:01Z' }); assert.equal((await db.get('events', 'e')).title, 'unsent local'); assert.equal((await q.getPending()).length, 1);
});

test('F15 GhostInk: manual refresh stops before pull after push failure', async () => {
  let pulls = 0; const app = { state: { syncing: false, queue: new Map([['x', {}]]) }, isReady: () => true, processDyContextQueue: async () => { }, setRefreshDecksSpinning() { }, updateSyncButtonState() { }, setSyncButtonSpinning() { }, pushQueue: async () => ({ success: false, failedCount: 1 }), pullFromNotion: async () => { pulls++; }, renderConnection() { }, requestAutoSyncSoon() { } };
  const ctx = { app, navigator: { onLine: true }, toast() { }, setTimeout: () => 1, el: () => element(), Storage: { put: async () => { } }, MIN_PUSH_INTERVAL_MS: 1000, console: silent }; vm.createContext(ctx); vm.runInContext('Object.assign(app,{' + part('ghostink-flashcards/js/app.js', '    async syncNow() {', '    async pullFromNotion(') + part('ghostink-flashcards/js/app.js', '    async manualSync() {', '    startAutoSync() {') + '});', ctx); await app.manualSync(); assert.equal(pulls, 0); assert.equal(app.state.lastPush, undefined); assert.equal(app.state.lastSync, undefined);
});

test('F16 Service workers: activation preserves another tool cache', async () => {
  for (const file of ['voxmark/sw.js', 'pet-tracker/service-worker.js']) { const handlers = {}; let work; const deleted = []; const ctx = { self: { addEventListener: (name, fn) => handlers[name] = fn, skipWaiting() { }, clients: { claim: async () => { } } }, caches: { keys: async () => ['photo-chronicles-cache-v19', 'ghostink-cache-v19'], delete: async k => deleted.push(k) } }; vm.createContext(ctx); vm.runInContext(read(file), ctx); handlers.activate({ waitUntil(p) { work = p; } }); await work; assert.ok(!deleted.includes('photo-chronicles-cache-v19')); }
});

test('F17 Pet Tracker: partial Quick Add success retains failed entries', async () => {
  const ctx = { window: {}, PetTracker: { UI: { toast() { }, localDateYYYYMMDD: () => '2026-11-06' } }, App: { renderDashboard() { } }, Events: { create: async () => { } }, console: silent }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(read('pet-tracker/js/quick-add-modal.js'), ctx);
  const qa = ctx.QuickAddModal; const entries = [{ isValid: true, globalStart: 0, globalEnd: 5, fields: { pet: 'Pico', type: 'Walk' } }, { isValid: true, globalStart: 5, globalEnd: 8, fields: { pet: 'Missing Pet', type: 'Walk' } }];
  qa.state.qaInstance = { getResult: () => ({ entries }), exportResult: async () => ({ entries, input: 'good\nbad' }), setInput(v) { qa.remaining = v; } }; qa.state.pets = [{ id: 'p', name: 'Pico' }]; qa.state.eventTypes = [{ id: 't', name: 'Walk' }]; qa.state.scaleLevels = []; qa._validateEntry = () => []; qa.mapAttachmentRefsToMedia = async () => []; qa.resolveProviderId = () => null;
  qa._persistDraft = async () => { }; qa.clearDraft = () => { qa.cleared = true; }; qa.close = () => { qa.closed = true; }; await qa.save(); assert.equal(qa.cleared, undefined); assert.equal(qa.closed, undefined); assert.equal(qa.remaining, 'bad');
});

test('F18 GhostInk: closing a nested modal restores the parent trap', () => {
  const nodes = { parent: element(), child: element() }; for (const n of Object.values(nodes)) { n.setAttribute = () => { }; n.removeAttribute = () => { }; n.querySelector = () => ({ focus() { } }); n.querySelectorAll = () => [{ focus() { } }]; }
  const document = { activeElement: { focus() { } }, body: { contains: () => true }, addEventListener() { }, removeEventListener() { } };
  const code = read('ghostink-flashcards/js/ui/modal.js').replace("import { el } from '../config.js';", '').replaceAll('export const ', 'const ');
  const ctx = { document, el: s => nodes[s.slice(1)], setTimeout: () => 1, clearTimeout() { } }; vm.createContext(ctx); vm.runInContext(code + '\nglobalThis.modal={open:openModal,close:closeModal,tab:handleTabKey,active:()=>activeModal};', ctx);
  ctx.modal.open('parent'); ctx.modal.open('child'); ctx.modal.close('child'); assert.equal(ctx.modal.active(), nodes.parent);
});

test('F19 Sequence: unexpected disconnect preserves the hand for rejoin', () => {
  const src = part('games/sequence/index.html', '        conn.on("close", () => {', '    function replaceHostId('); const body = src.slice(src.indexOf('          connections.delete'), src.indexOf('\n        });'));
  const messages = []; const ctx = { isHost: true, disconnectTimers: new Map(), REJOIN_GRACE_MS: 60000, clearTimeout() { }, conn: { peer: 'c' }, connections: new Map([['new-c', { send: m => messages.push(m), close() { } }]]), hostState: { players: [{ id: 'host', token: 'host-token' }, { id: 'c', token: 'client-token' }], hands: { c: ['AS'] }, turnIndex: 0, gameStarted: true }, assignTeams() { }, setTurnTimer() { }, logHost() { }, updateLobbyControls() { }, broadcastState() { }, kickedTokens: new Set(), setTimeout: () => 1 };
  vm.createContext(ctx); vm.runInContext('(function(){' + body + '})();' + part('games/sequence/index.html', '    function handleIncoming(peerId, data) {', '    hostBtn.addEventListener'), ctx); ctx.handleIncoming('new-c', { type: 'join', token: 'client-token', name: 'Client' }); assert.equal(ctx.hostState.hands['new-c'][0], 'AS'); assert.equal(ctx.hostState.players[1].id, 'new-c'); assert.equal(messages.length, 0);
});

test('F20 GhostInk: rating has one commit owner', async () => {
  const pending = deferred(); let writes = 0; const card = { id: 'c', deckId: 'd', sm2: { repetitions: 0 }, fsrs: {}, reviewHistory: [] };
  const app = { state: { selectedCard: card, answerRevealed: true, settings: {}, session: { ratingCounts: { Good: 0 } } }, isAiModeSelected: () => false, deckById: () => ({ algorithm: 'SM-2' }), applySm2Learning: () => false, adjustDueDateForEasyDays: x => x, buildSrsState: (_c, learning) => ({ learning }), setCard() { }, suspendClozeSubs: async () => { }, queueOp() { }, maybeGenerateDyContext: async () => { }, showUndoToast() { }, advanceSession() { }, setRatingEnabled() { } };
  const ctx = { app, normalizeRating: x => x.toLowerCase(), displayRating: () => 'Good', parseSrsConfig: () => ({ easyDays: [] }), parseSrsState: () => ({ learning: { state: 'review', lapses: 0 } }), SRS: { sm2: c => ({ repetitions: c.sm2.repetitions + 1, dueDate: '2026-11-07' }) }, DEFAULT_LEECH_LAPSE_THRESHOLD: 8, Storage: { put: async () => { writes++; await pending.promise; } }, toast() { }, console: silent };
  vm.createContext(ctx); vm.runInContext('Object.assign(app,{' + part('ghostink-flashcards/js/app.js', '    async rate(rating) {', '    nextCard() {') + '});', ctx);
  const one = app.rate('Good'), two = app.rate('Good'); await settleUntil(() => writes === 1); assert.equal(card.reviewHistory.length, 1); assert.equal(card.sm2.repetitions, 1); pending.resolve(); await Promise.all([one, two]);
});

test('F21 GhostInk: exhausted retries retain failed work', async () => {
  const op = { id: 1, retryCount: 5, type: 'deck-upsert', payload: { id: 'd', notionId: 'remote', name: 'unsent' } }; const removed = [];
  const app = { state: { settings: {}, queue: new Map([['deck-upsert:d', op]]) }, queueKey: x => x.type + ':' + x.payload.id, renderConnection() { } };
  const ctx = { app, sleep: async () => { }, isClozeParent: () => false, NotionMapper: { deckProps: x => x }, API: { updatePage: async () => { throw Error('unavailable'); } }, Storage: { getSyncQueue: async () => [op], put: async () => { }, setMeta: async () => { }, removeFromSyncQueue: async id => removed.push(id) }, toast() { }, el: () => element(), console: silent };
  vm.createContext(ctx); vm.runInContext('Object.assign(app,{' + part('ghostink-flashcards/js/app.js', '    async pushQueue() {', '    async queueOp(') + '});', ctx); const result = await app.pushQueue(); assert.equal(app.state.queue.size, 1); assert.deepEqual(removed, []); assert.equal(result.success, false); assert.equal(result.failedCount, 1);
});

test('F22 Pet Tracker: queued AI results survive reload before event save', async () => {
  const { ctx, db } = petContext(); vm.runInContext(read('pet-tracker/js/ai.js'), ctx); const ai = ctx.AI;
  ctx.PetTracker.UI = { toast() { } }; ctx.PetTracker.Settings.get = () => ({ aiProvider: 'openai', aiApiKey: 'key' }); ai.renderEntries = () => { }; ai.renderQueueIndicator = () => { }; ai.updateQueueCount = async () => { }; ai.callProvider = async () => ({ entries: [{ title: 'Unsaved result', petName: 'Pico' }], warnings: [], missing: [] });
  const item = await ctx.PetTracker.AIQueue.add('Walk with Pico'); await ai.processQueue(); assert.equal(ai.state.entries.length, 1); const persisted = await db.get('aiQueue', item.id); assert.equal(persisted.status, 'completed'); assert.equal(persisted.entries, undefined); assert.equal(persisted.result, undefined);
  ai.state.entries = []; await ai.restoreReview(); assert.equal(ai.state.entries.length, 1);
});

test('F17 additional path: failed AI save keeps unsaved entries', async () => {
  const ctx = { console: silent, window: {}, PetTracker: { generateId: () => 'event-id', STORES: { PETS: 'pets', EVENT_TYPES: 'types' }, DB: { put: async () => { }, getAll: async s => s === 'pets' ? [{ id: 'p', name: 'Pico' }] : [{ id: 't', name: 'Walk' }] }, UI: { toast() { } }, QuickAddModal: { close() { } } }, Events: { create: async () => { throw Error('local database error'); } }, App: { renderDashboard() { } } }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(read('pet-tracker/js/ai.js'), ctx);
  const ai = ctx.AI; ai.renderEntries = () => { }; ai.state.entries = [{ _id: 'entry', petName: 'Pico', eventType: 'Walk', date: '2026-11-06' }]; ai.reset = () => { ai.state.entries = []; }; await ai.saveAll(); assert.equal(ai.state.entries.length, 1);
});


test('Pet Tracker: create acknowledgment keeps an edit queued as update', async () => {
  const { ctx, db, sy, q } = petContext(); const pending = deferred(); let started = false;
  ctx.PetTracker.API = { createPage: async () => { started = true; await pending.promise; return { id: 'notion-id' }; } };
  await db.put('events', { id: 'e', title: 'old', synced: false });
  await q.add({ type: 'create', store: 'events', recordId: 'e', data: { id: 'e', title: 'old' } });
  const push = sy.pushLocalChanges(); await settleUntil(() => started);
  await db.put('events', { id: 'e', title: 'new', synced: false });
  await q.add({ type: 'update', store: 'events', recordId: 'e', data: { id: 'e', title: 'new' } });
  pending.resolve(); await push;
  const next = (await q.getPending())[0]; assert.equal(next.type, 'update'); assert.equal(next.data.title, 'new');
  assert.equal((await db.get('events', 'e')).notionId, 'notion-id'); assert.equal((await db.get('events', 'e')).synced, false);
});

test('Pet Tracker: delete during create keeps the remote deletion queued', async () => {
  const { ctx, db, sy, q } = petContext(); const pending = deferred(); let started = false;
  ctx.PetTracker.API = { createPage: async () => { started = true; await pending.promise; return { id: 'notion-id' }; } };
  await db.put('events', { id: 'e', title: 'old', synced: false });
  await q.add({ type: 'create', store: 'events', recordId: 'e', data: { id: 'e', title: 'old' } });
  const push = sy.pushLocalChanges(); await settleUntil(() => started);
  await q.add({ type: 'delete', store: 'events', recordId: 'e', data: {} }); await db.delete('events', 'e');
  pending.resolve(); await push;
  const next = (await q.getPending())[0]; assert.equal(next.type, 'delete'); assert.equal(next.data.notionId, 'notion-id');
  assert.equal(await db.get('events', 'e'), undefined);
});

test('Pet Tracker: unknown create result blocks replay and retains newer payload', async () => {
  const { ctx, db, sy, q } = petContext(); const pending = deferred(); let started = false, calls = 0;
  ctx.PetTracker.API = { createPage: async () => { calls++; started = true; await pending.promise; throw Error('Network response lost'); } };
  await db.put('events', { id: 'e', title: 'old', synced: false });
  await q.add({ type: 'create', store: 'events', recordId: 'e', data: { id: 'e', title: 'old' } });
  const push = sy.pushLocalChanges(); await settleUntil(() => started);
  await q.add({ type: 'update', store: 'events', recordId: 'e', data: { id: 'e', title: 'new' } });
  pending.resolve(); await push; await q.resetFailed();
  await q.add({ type: 'update', store: 'events', recordId: 'e', data: { title: 'newest' } });
  await sy.pushLocalChanges(); const [op] = await q.getActiveForRecord('events', 'e');
  assert.equal(calls, 1); assert.equal(op.status, 'failed'); assert.equal(op.uncertainCreate, true); assert.equal(op.data.title, 'newest');
});

test('Pet Tracker: definite rate limit leaves a create retryable', async () => {
  const { ctx, db, sy, q } = petContext();
  ctx.PetTracker.API = { createPage: async () => { throw { status: 429, isRetryable: true, message: 'rate limited' }; } };
  await db.put('events', { id: 'e', title: 'event' }); await q.add({ type: 'create', store: 'events', recordId: 'e', data: { id: 'e' } });
  await sy.pushLocalChanges(); const [op] = await q.getPending(); assert.ok(op); assert.equal(op.uncertainCreate, undefined);
});

test('Pet Tracker: event and outbox roll back together, then retry once', async () => {
  const { ctx, db, q } = petContext(); ctx.document = { addEventListener() { } };
  vm.runInContext(read('pet-tracker/js/events.js'), ctx); const events = ctx.PetTracker.Events;
  db.failNextCommit = true;
  await assert.rejects(events.create({ id: 'durable-entry', title: 'Walk', petIds: ['p'] }));
  assert.equal((await db.getAll('events')).length, 0); assert.equal((await q.getPending()).length, 0);
  await events.create({ id: 'durable-entry', title: 'Walk', petIds: ['p'] });
  await events.create({ id: 'durable-entry', title: 'Walk', petIds: ['p'] });
  assert.equal((await db.getAll('events')).length, 1); assert.equal((await q.getPending()).length, 1);
});

test('VoxMark: endSTT waits for the final dataavailable and stop events', async () => {
  const callbacks = {}; const order = [];
  const recorder = {
    state: 'recording', addEventListener: (name, fn) => callbacks[name] = fn,
    stop() { setImmediate(() => { order.push('final chunk'); callbacks.stop(); }); }
  };
  const ctx = { mediaRecorder: recorder, recognition: null, mediaStream: { getTracks: () => [{ stop() { order.push('track stopped'); } }] } };
  vm.createContext(ctx); vm.runInContext(part('voxmark/js/stt.js', 'async function endSTT() {', 'function handleTapFocusPointer('), ctx);
  await ctx.endSTT(); assert.deepEqual(order, ['final chunk', 'track stopped']);
});

test('Service workers: activation removes old versions of their own cache', async () => {
  for (const [file, own] of [['voxmark/sw.js', 'voxmark-cache-v1'], ['pet-tracker/service-worker.js', 'pet-tracker-v1']]) {
    const handlers = {}; let work; const deleted = [];
    const ctx = {
      self: { addEventListener: (name, fn) => handlers[name] = fn, skipWaiting() { }, clients: { claim: async () => { } } },
      caches: { keys: async () => [own, 'unrelated-cache'], delete: async k => deleted.push(k) }
    };
    vm.createContext(ctx); vm.runInContext(read(file), ctx); handlers.activate({ waitUntil(p) { work = p; } }); await work;
    assert.deepEqual(deleted, [own]);
  }
});

test('VoxMark: classic browser scripts can share a global scope', () => {
  const html = read('voxmark/index.html');
  const sources = Array.from(html.matchAll(/<script src="\.\/(js\/[^\"]+)"/g), m => read('voxmark/' + m[1]));
  assert.ok(sources.length > 10); assert.doesNotThrow(() => new vm.Script(sources.join('\n;\n')));
});

test('VoxMark: an interrupted queue owner can be retried after reload', async () => {
  const request = {};
  const ctx = { db: { transaction: () => ({ objectStore: () => ({ getAll: () => request }) }) } };
  vm.createContext(ctx); vm.runInContext(part('voxmark/js/storage.js', 'function loadQueueFromDB() {', 'async function persistPdfState('), ctx);
  const loading = ctx.loadQueueFromDB(); request.result = [{ id: 's', status: 'processing', processing: true }, { id: 'done', status: 'processed' }]; request.onsuccess();
  const loaded = await loading; assert.equal(loaded.length, 1); assert.equal(loaded[0].processing, false); assert.equal(loaded[0].status, 'queued');
});

test('GhostInk: a failed replacement write keeps the previous queued edit', async () => {
  const previous = { id: 1, type: 'card-upsert', payload: { id: 'c', name: 'saved work' } };
  const app = { state: { queue: new Map() }, queueKey: op => op.type + ':' + op.payload.id, queueEntityId: op => op.payload.id };
  const ctx = { app, Storage: { getSyncQueue: async () => [structuredClone(previous)], addToSyncQueue: async () => { throw Error('Quota exceeded'); } }, navigator: { onLine: false } };
  vm.createContext(ctx); vm.runInContext('Object.assign(app,{' + part('ghostink-flashcards/js/app.js', '    async queueOpLocked(', '    updateSyncButtonState()') + '});', ctx);
  await assert.rejects(app.queueOpLocked({ type: 'card-upsert', payload: { id: 'c', name: 'new work' } }));
  assert.equal(app.state.queue.get('card-upsert:c').payload.name, 'saved work');
});

test('VoxMark: native recognition finalizes before a session can be queued', async () => {
  const callbacks = {}; let stopped = false;
  const owner = { addEventListener: (name, fn) => callbacks[name] = fn, stop() { stopped = true; } };
  const ctx = { recognition: owner, mediaRecorder: null, mediaStream: null };
  vm.createContext(ctx); vm.runInContext(part('voxmark/js/stt.js', 'async function endSTT() {', 'function handleTapFocusPointer('), ctx);
  let finished = false; const stopping = ctx.endSTT().then(() => { finished = true; }); await settleUntil(() => stopped);
  assert.equal(finished, false); callbacks.end(); await stopping; assert.equal(finished, true); assert.equal(ctx.recognition, null);
});

test('Quick Add: restoring the same text still invalidates an awaited field commit', async () => {
  const pending = deferred(); let started = false; function QuickAddComponent() { }
  const ctx = { QuickAddComponent }; vm.createContext(ctx);
  vm.runInContext(part('components/quick-add/quick-add-component.js', '    QuickAddComponent.prototype.runBeforeCommitField =', '    QuickAddComponent.prototype.'), ctx);
  const editor = { inputText: 'pet:Pico;', inputRevision: 1, config: { validation: { beforeCommitField: async () => { started = true; await pending.promise; return { allow: true }; } } } };
  const commit = QuickAddComponent.prototype.runBeforeCommitField.call(editor, { nextValue: 'Luna' });
  await settleUntil(() => started); editor.inputRevision++; pending.resolve();
  assert.equal((await commit).allow, false);
});

test('VoxMark: an already-ended recognizer does not block Stop', async () => {
  const ctx = { recognition: { captureEnded: true, stop() { throw Error('Recognizer already ended'); } }, mediaRecorder: null, mediaStream: null };
  vm.createContext(ctx); vm.runInContext(part('voxmark/js/stt.js', 'async function endSTT() {', 'function handleTapFocusPointer('), ctx);
  await ctx.endSTT(); assert.equal(ctx.recognition, null);
});

test('Pet Tracker: an aborted edit preserves the record and previous outbox payload', async () => {
  const { db, q } = petContext();
  await q.save({ type: 'create', store: 'events', recordId: 'e', data: { id: 'e', title: 'original', synced: false } });
  const before = await q.getPending(); db.failNextCommit = true;
  await assert.rejects(q.save({ type: 'update', store: 'events', recordId: 'e', data: { id: 'e', title: 'edited', synced: false } }));
  assert.equal((await db.get('events', 'e')).title, 'original'); assert.deepEqual(await q.getPending(), before);
});

test('Pet Tracker: an aborted delete preserves the record and its pending create', async () => {
  const { db, q } = petContext();
  await q.save({ type: 'create', store: 'events', recordId: 'e', data: { id: 'e', title: 'original', synced: false } });
  db.failNextCommit = true; await assert.rejects(q.save({ type: 'delete', store: 'events', recordId: 'e', data: {} }));
  assert.ok(await db.get('events', 'e')); assert.equal((await q.getPending())[0].type, 'create');
  await q.save({ type: 'delete', store: 'events', recordId: 'e', data: {} });
  assert.equal(await db.get('events', 'e'), undefined); assert.equal((await q.getPending()).length, 0);
});

test('Pet Tracker: replaying a saved draft preserves the remote identity and newer edits', async () => {
  const { db, q } = petContext();
  await db.put('events', { id: 'e', title: 'newer', notionId: 'remote', synced: true });
  const saved = await q.save({ type: 'create', store: 'events', recordId: 'e', data: { id: 'e', title: 'old draft' } });
  assert.equal(saved.title, 'newer'); assert.equal(saved.notionId, 'remote'); assert.equal((await q.getPending()).length, 0);
});

test('Pet Tracker: a stale save cannot resurrect a record with a pending deletion', async () => {
  const { db, q } = petContext(); await db.put('events', { id: 'e', notionId: 'remote', synced: true });
  await q.save({ type: 'delete', store: 'events', recordId: 'e', data: { notionId: 'remote' } });
  await assert.rejects(q.save({ type: 'create', store: 'events', recordId: 'e', data: { id: 'e', title: 'stale draft' } }));
  assert.equal(await db.get('events', 'e'), undefined); assert.equal((await q.getPending())[0].type, 'delete');
});

test('Pet Tracker: DB.put rejects a transaction abort after request success', async () => {
  const { ctx, db } = petContext(); const isolated = { console: silent }; isolated.window = isolated; vm.createContext(isolated);
  vm.runInContext(read('pet-tracker/js/storage.js'), isolated); isolated.PetTracker.DB.open = db.open;
  db.failNextCommit = true; await assert.rejects(isolated.PetTracker.DB.put('events', { id: 'e', title: 'not committed' }));
  assert.equal(await db.get('events', 'e'), undefined);
});

function recordingContext(options = {}) {
  const streams = []; const recorders = []; const saved = []; const notifications = [];
  function stream() { const value = { active: true, getTracks: () => [{ stop() { value.active = false; } }] }; streams.push(value); return value; }
  const state = { settings: { sttProvider: 'cloud' }, queue: [], mode: 'batch', recording: false };
  const ctx = {
    state, crypto: require('node:crypto').webcrypto, console: silent, setTimeout, clearTimeout, setInterval: () => 1, clearInterval() { },
    elements: { micButton: element() }, saveSessionState() { }, logEvent() { }, clearFocusPins() { },
    notify: (title, message) => notifications.push({ title, message }), captureSnapshot: options.captureSnapshot || asyncNull,
    navigator: { mediaDevices: { getUserMedia: options.getUserMedia || asyncStream } },
    addToQueue: async session => { saved.push(structuredClone(session)); state.queue.push(session); },
    MediaRecorder: class {
      constructor() { if (options.constructorError) throw Error('Recorder unavailable'); this.state = 'inactive'; this.callbacks = {}; recorders.push(this); }
      addEventListener(name, fn) { this.callbacks[name] = fn; }
      start() { if (options.startError) throw Error('Recorder start failed'); this.state = 'recording'; }
      stop() {
        if (options.stopError) throw Error('Recorder stop failed'); this.state = 'inactive'; setImmediate(() => {
          this.ondataavailable?.({ data: { size: 1 } }); this.callbacks.stop?.();
        });
      }
    }
  };
  function asyncNull() { return Promise.resolve(null); } function asyncStream() { return Promise.resolve(stream()); }
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(read('voxmark/js/stt.js'), ctx); ctx.clearFocusPins = () => { };
  return { ctx, state, streams, recorders, saved, notifications, stream };
}

test('VoxMark: audio starts before a slow initial PDF snapshot', async () => {
  const pending = deferred(); let capturing = false; const env = recordingContext({ captureSnapshot: () => { capturing = true; return pending.promise; } });
  const starting = env.ctx.startRecordingSession(); await settleUntil(() => capturing);
  assert.equal(env.recorders[0].state, 'recording'); await env.ctx.stopRecordingSession();
  pending.resolve({ oldSnapshot: true }); await starting;
  assert.equal(env.saved.length, 1); assert.equal(env.saved[0].audioChunks.length, 1); assert.equal(env.saved[0].snapshots.length, 0);
  assert.equal(env.streams[0].active, false); assert.equal(env.state.recordingSession, null);
});

test('VoxMark: snapshot failure releases capture and preserves final audio', async () => {
  const env = recordingContext({ captureSnapshot: async () => { throw Error('Page render failed'); } });
  await env.ctx.startRecordingSession();
  assert.equal(env.state.recording, false); assert.equal(env.state.recordingStopping, false); assert.equal(env.streams[0].active, false);
  assert.equal(env.saved.length, 1); assert.equal(env.saved[0].status, 'failed'); assert.equal(env.saved[0].audioChunks.length, 1);
});

test('VoxMark: failed recording storage retains capture for one save retry', async () => {
  const env = recordingContext(); await env.ctx.startRecordingSession(); let fail = true;
  env.ctx.addToQueue = async session => { if (fail) { fail = false; throw Error('Storage full'); } env.saved.push(structuredClone(session)); };
  await env.ctx.stopRecordingSession(); const retained = env.state.recordingSession;
  assert.ok(retained); assert.equal(env.state.recordingStopping, false); assert.equal(env.saved.length, 0);
  await env.ctx.startRecordingSession(); assert.equal(env.state.recordingSession, retained); assert.equal(env.recorders.length, 1);
  await env.ctx.stopRecordingSession(); assert.equal(env.saved.length, 1); assert.equal(env.saved[0].lastError, ''); assert.equal(env.state.recordingSession, null);
});

test('VoxMark: cancelled permission cannot replace or stop a newer capture stream', async () => {
  const first = deferred(), second = deferred(); let calls = 0;
  const env = recordingContext({ getUserMedia: () => ++calls === 1 ? first.promise : second.promise });
  const oldStart = env.ctx.startRecordingSession(); await env.ctx.stopRecordingSession();
  const newStart = env.ctx.startRecordingSession(); const newer = env.stream(); second.resolve(newer); await newStart;
  const older = env.stream(); first.resolve(older); await oldStart;
  assert.equal(older.active, false); assert.equal(newer.active, true); assert.equal(env.state.recording, true);
  await env.ctx.stopRecordingSession(); assert.equal(newer.active, false);
});

test('VoxMark: recorder startup failure releases the microphone and busy flags', async () => {
  for (const key of ['constructorError', 'startError']) {
    const env = recordingContext({ [key]: true }); await env.ctx.startRecordingSession();
    assert.equal(env.state.recording, false); assert.equal(env.state.recordingStarting, false); assert.equal(env.state.recordingStopping, false);
    assert.equal(env.state.recordingSession, null); assert.equal(env.streams[0].active, false); assert.equal(env.saved.length, 0);
  }
});

test('VoxMark: recorder stop failure releases the stream and permits save retry', async () => {
  const env = recordingContext({ stopError: true }); await env.ctx.startRecordingSession(); await env.ctx.stopRecordingSession();
  assert.equal(env.state.recordingStopping, false); assert.equal(env.streams[0].active, false); assert.ok(env.state.recordingSession);
  await env.ctx.stopRecordingSession(); assert.equal(env.state.recordingSession, null);
});

test('VoxMark: recording queue insertion waits for durable commit', async () => {
  const db = memoryDB(); const ctx = { db: await db.open(), state: { queue: [] }, updateQueueIndicator() { }, updateStorageUsage() { } };
  vm.createContext(ctx); vm.runInContext(part('voxmark/js/storage.js', 'async function addToQueue(session) {', 'function updateQueueItem('), ctx);
  db.failNextCommit = true; await assert.rejects(ctx.addToQueue({ id: 's' })); assert.equal(ctx.state.queue.length, 0);
  await ctx.addToQueue({ id: 's' }); await ctx.addToQueue({ id: 's' });
  assert.equal(ctx.state.queue.length, 1); assert.equal((await db.getAll('queue')).length, 1);
});

test('Pet Tracker: an aborted metadata acknowledgment leaves the record unchanged', async () => {
  const { ctx, db } = petContext(); await db.put('events', { id: 'e', title: 'current', synced: false }); db.failNextCommit = true;
  await assert.rejects(ctx.PetTracker.DB.modify('events', 'e', record => ({ ...record, notionId: 'remote', synced: true })));
  assert.deepEqual(await db.get('events', 'e'), { id: 'e', title: 'current', synced: false });
});

test('Pet Tracker: metadata acknowledgments cannot recreate a deleted record', async () => {
  const { ctx, db } = petContext(); let called = false;
  const result = await ctx.PetTracker.DB.modify('events', 'missing', record => { called = true; return { ...record, notionId: 'remote' }; });
  assert.equal(called, false); assert.equal(result, null); assert.equal((await db.getAll('events')).length, 0);
});

test('Pet Tracker: a pull cannot restore a record whose remote deletion is still queued', async () => {
  const { ctx, db, sy, q } = petContext();
  ctx.PetTracker.NotionExtract = { icon: () => null }; sy.normalizeRelationFields = async () => { }; sy.fromNotionPage = () => ({ title: 'remote copy' });
  await db.put('events', { id: 'e', title: 'deleted', notionId: 'remote', synced: true });
  await q.save({ type: 'delete', store: 'events', recordId: 'e', data: { notionId: 'remote' } });
  await sy.reconcileRecord('events', 'EVENTS', { id: 'remote', last_edited_time: '2026-11-06T12:00:00Z' });
  assert.equal((await db.getAll('events')).length, 0); assert.equal((await q.getPending())[0].type, 'delete');
});

test('Pet Tracker: every synced store supports atomic create, edit and delete', async () => {
  for (const store of ['pets', 'events', 'eventTypes', 'scales', 'scaleLevels', 'contacts']) {
    const { db, q } = petContext(); await q.save({ type: 'create', store, recordId: 'r', data: { id: 'r', name: 'created', synced: false } });
    await q.save({ type: 'update', store, recordId: 'r', data: { id: 'r', name: 'edited', synced: false } });
    assert.equal((await db.get(store, 'r')).name, 'edited'); assert.equal((await q.getPending())[0].data.name, 'edited');
    await q.save({ type: 'delete', store, recordId: 'r', data: {} });
    assert.equal(await db.get(store, 'r'), undefined); assert.equal((await q.getPending()).length, 0);
  }
});
