const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const root = join(__dirname, '..');
const metadata = readFileSync(join(root, 'photo-metadata.js'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const appScript = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)[1];

function environment() {
    const elements = new Map();
    const storage = new Map();
    const frames = new Map();
    let frame = 0;
    const element = id => {
        if (!elements.has(id)) {
            const classes = new Set();
            elements.set(id, {
                value: '', disabled: false, dataset: {}, style: {}, innerText: '', innerHTML: '',
                classList: { add: (...names) => names.forEach(n => classes.add(n)), remove: (...names) => names.forEach(n => classes.delete(n)), contains: n => classes.has(n), toggle: (n, on) => on ? classes.add(n) : classes.delete(n) },
                removeAttribute: key => delete elements.get(id)[key],
                addEventListener() {}, play: async () => {}, getContext: () => new Proxy({}, { get: () => () => {} }),
                width: 640, height: 480, getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 480 })
            });
        }
        return elements.get(id);
    };
    const context = vm.createContext({
        console, Blob, Date, URL, URLSearchParams, DataView, Uint8Array, crypto: webcrypto, atob, btoa,
        setTimeout, clearTimeout,
        requestAnimationFrame: callback => { frames.set(++frame, callback); return frame; },
        cancelAnimationFrame: id => frames.delete(id),
        localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
        document: { getElementById: element, querySelectorAll: () => [], querySelector: () => null, createElement: () => element('canvas'), addEventListener() {}, hidden: false },
        window: { addEventListener() {}, devicePixelRatio: 1 },
        navigator: { onLine: false, mediaDevices: {} }, lucide: { createIcons() {} }, confirm: () => true,
        Image: class { set src(value) { this.width = 640; this.height = 480; queueMicrotask(() => this.onload()); } }
    });
    vm.runInContext(metadata + '\n' + appScript + '\nthis.exports = { App, UTILS, Storage, ImageStore, PhotoMetadata, SyncManager };', context);
    const exports = context.exports;
    exports.App.state.isEntryModalOpen = true;
    exports.App.state.activeDiaryId = 'test';
    exports.App.showToast = () => {};
    exports.App.renderDiaryView = () => {};
    exports.App.renderSidebar = () => {};
    exports.realInitCamera = exports.App.initCamera;
    exports.App.initCamera = () => {};
    exports.Storage.setData([{ id: 'test', entries: [], cameraConfig: {} }]);
    exports.App.state.diaries = exports.Storage.getData();
    return { ...exports, context, element, frames };
}

function exif({ date = '2024:07:12 13:14:15', offset = '+05:30', little = true, tag = 0x9003 } = {}) {
    const data = new Uint8Array(96);
    const view = new DataView(data.buffer);
    const u16 = (p, v) => view.setUint16(p, v, little);
    const u32 = (p, v) => view.setUint32(p, v, little);
    data.set(Buffer.from(little ? 'II' : 'MM')); u16(2, 42); u32(4, 8);
    u16(8, 1); u16(10, 0x8769); u16(12, 4); u32(14, 1); u32(18, 26);
    u16(26, 2); u16(28, tag); u16(30, 2); u32(32, 20); u32(36, 56);
    u16(40, tag === 0x9003 ? 0x9011 : 0x9012); u16(42, 2); u32(44, 7); u32(48, 76);
    data.set(Buffer.from(date + '\0'), 56); data.set(Buffer.from(offset + '\0'), 76);
    return data;
}

function jpeg(payload) {
    const size = payload.length + 8;
    return new Blob([new Uint8Array([255, 216, 255, 225, size >> 8, size & 255]), Buffer.from('Exif\0\0'), payload, new Uint8Array([255, 217])]);
}

function heif(tiff, { method = 0, wide = false, split = false, padding = 0, reference = 0, extendedFtyp = false } = {}) {
    const number = (value, width) => {
        const buffer = Buffer.alloc(width);
        if (width === 8) buffer.writeBigUInt64BE(BigInt(value));
        else buffer.writeUIntBE(value, 0, width);
        return buffer;
    };
    const box = (type, ...parts) => {
        const data = Buffer.concat(parts);
        return Buffer.concat([number(data.length + 8, 4), Buffer.from(type), data]);
    };
    const full = version => Buffer.from([version, 0, 0, 0]);
    const idWidth = wide ? 4 : 2;
    const id = wide ? 70000 : 9;
    const payload = Buffer.concat([number(6, 4), Buffer.from('Exif\0\0'), tiff]);
    const pieces = split ? [payload.subarray(0, 40), payload.subarray(40)] : [payload];
    // Extended brand lists and a 64-bit ftyp box are legal on newer phone exports.
    const brands = Buffer.concat([Buffer.from('heic'), number(0, 4), Buffer.from('mif1heic'), Buffer.from('MiHB'.repeat(12))]);
    const ftyp = extendedFtyp ? Buffer.concat([number(1, 4), Buffer.from('ftyp'), number(brands.length + 16, 8), brands]) : box('ftyp', brands);
    const iinf = box('iinf', full(wide ? 1 : 0), number(1, idWidth), box('infe', full(wide ? 3 : 2), number(id, idWidth), number(0, 2), Buffer.from('Exifmetadata\0')));
    const location = start => box('iloc', full(wide ? 2 : 1), Buffer.from([wide ? 0x88 : 0x44, 0]), number(1, idWidth), number(id, idWidth), number(method, 2), number(reference, 2), number(pieces.length, 2), ...pieces.flatMap((piece, i) => [number(start + (i ? 40 : 0), wide ? 8 : 4), number(piece.length, wide ? 8 : 4)]));
    const free = box('free', Buffer.alloc(padding));
    const initialMeta = box('meta', full(0), iinf, location(0));
    const payloadStart = ftyp.length + initialMeta.length + free.length + 8;
    return new Blob(method === 1
        ? [ftyp, box('meta', full(0), iinf, location(0), box('idat', payload))]
        : [ftyp, box('meta', full(0), iinf, location(payloadStart)), free, box('mdat', payload)], { type: 'image/heic' });
}

test('reads original capture dates and offsets from both EXIF byte orders', async () => {
    const { PhotoMetadata: m } = environment();
    for (const little of [true, false]) assert.equal(await m.createdAt(jpeg(exif({ little }))), '2024-07-12T07:44:15.000Z');
    assert.equal(await m.createdAt(jpeg(exif({ tag: 0x9004 }))), '2024-07-12T07:44:15.000Z');
});

test('reads PNG, WebP and TIFF EXIF metadata', async () => {
    const { PhotoMetadata: m } = environment();
    const tiff = exif();
    const pngLength = Buffer.alloc(4); pngLength.writeUInt32BE(tiff.length);
    const png = new Blob([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngLength, Buffer.from('eXIf'), tiff, Buffer.alloc(4)]);
    const webpLength = Buffer.alloc(4); webpLength.writeUInt32LE(tiff.length);
    const webp = new Blob([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPEXIF'), webpLength, tiff]);
    for (const file of [png, webp, new Blob([tiff])]) assert.equal(await m.createdAt(file), '2024-07-12T07:44:15.000Z');
});

test('reads phone HEIC/HEIF dates from file offsets and in-meta data', async () => {
    const { PhotoMetadata: m } = environment();
    for (const options of [{}, { method: 1 }, { wide: true }, { split: true }, { wide: true, method: 1, split: true }, { extendedFtyp: true }]) {
        assert.equal(await m.createdAt(heif(exif(), options)), '2024-07-12T07:44:15.000Z');
    }
});

test('HEIC reads skip large pixel ranges and reject malformed or external metadata', async () => {
    const { PhotoMetadata: m } = environment();
    const file = heif(exif(), { padding: 1024 * 1024 });
    let bytesRead = 0;
    const input = { size: file.size, slice: (start, end) => { bytesRead += end - start; return file.slice(start, end); } };
    assert.equal(await m.createdAt(input), '2024-07-12T07:44:15.000Z');
    assert.ok(bytesRead < 2048, `read ${bytesRead} bytes instead of skipping pixels`);
    assert.equal(await m.createdAt(file.slice(0, 120)), null);
    assert.equal(await m.createdAt(heif(exif(), { reference: 1 })), null);
    assert.equal(await m.createdAt(heif(exif(), { method: 2 })), null);
    assert.equal(await m.createdAt(heif(exif({ tag: 0x0132 }))), null);
});

test('actual phone-gallery input handler dates JPEG and HEIC files before conversion', async () => {
    const { App, element, context, UTILS } = environment();
    const inputTag = html.match(/<input\b[^>]*id="galleryInput"[^>]*>/)[0];
    assert.doesNotMatch(inputTag, /\bcapture=/);
    const handler = inputTag.match(/onchange="([^"]+)"/)[1];
    App.state.collageMode = 2;
    App.state.segments = [null, null];
    const newer = heif(exif({ date: '2025:07:21 15:45:00' }));
    // Phone exports may have empty MIME types, and lastModified may be the import time.
    Object.defineProperty(newer, 'lastModified', { value: Date.now() });
    context.event = { target: { files: [newer], value: 'photo-library-export' } };
    await vm.runInContext(handler, context);
    const expected = UTILS.toLocalISO(new Date('2025-07-21T10:15:00Z'));
    assert.equal(element('entryDate').value, expected);
    assert.equal(App.state.segments[0].origin, 'file');
    context.event = { target: { files: [jpeg(exif())], value: 'older-photo' } };
    await vm.runInContext(handler, context);
    assert.equal(element('entryDate').value, expected);
    assert.equal(App.state.segments[1].origin, 'file');
    App.cancelDraftSave();
});

test('native phone-camera handler still uses today even when a file contains old EXIF', async () => {
    const { App, element, context, UTILS } = environment();
    const handler = html.match(/<input\b[^>]*id="phoneCameraInput"[^>]*onchange="([^"]+)"/)[1];
    App.afterManualSegmentInsert = () => {};
    context.event = { target: { files: [jpeg(exif())], value: 'camera-photo' } };
    await vm.runInContext(handler, context);
    assert.equal(App.state.segments[0].origin, 'camera');
    assert.equal(element('entryDate').value, UTILS.toLocalISO(new Date()));
});

test('invalid, truncated, absent and modification-only metadata leave date unknown', async () => {
    const { PhotoMetadata: m } = environment();
    for (const file of [new Blob(['bad']), jpeg(exif({ date: '2024:02:31 00:00:00' })), jpeg(exif({ tag: 0x0132 })), jpeg(exif().slice(0, 32))]) assert.equal(await m.createdAt(file), null);
    assert.equal(m.parseDate('2023:02:29 10:00:00'), null);
    assert.equal(m.parseDate('2024:07:12 24:00:00'), null);
    const local = m.parseDate('2024:07:12 13:14:15');
    assert.equal(new Date(local).getHours(), 13);
});

test('newest known creation date wins regardless of insertion order; camera uses now', () => {
    const { PhotoMetadata: m } = environment();
    const now = new Date('2026-08-30T15:00:00Z');
    const older = { origin: 'file', createdAt: '2023-01-01T10:00:00Z' };
    const newer = { origin: 'file', createdAt: '2024-01-01T10:00:00Z' };
    assert.equal(m.entryDate([newer, null, older], now).toISOString(), newer.createdAt.replace('Z', '.000Z'));
    assert.equal(m.entryDate([older, { origin: 'file' }], now).toISOString(), older.createdAt.replace('Z', '.000Z'));
    assert.equal(m.entryDate([{ origin: 'file' }], now), now);
    assert.equal(m.entryDate([newer, { origin: 'camera' }], now), now);
    assert.equal(m.entryDate([newer, {}], now), now); // legacy draft has unknown provenance
});

test('manual date edits survive source changes; removing newest photo recomputes auto date', () => {
    const { App, element, UTILS } = environment();
    App.state.segments = [{ origin: 'file', createdAt: '2024-06-02T12:00:00Z' }];
    App.updateEntryDate();
    assert.equal(element('entryDate').value, UTILS.toLocalISO(new Date('2024-06-02T12:00:00Z')));
    App.state.segments.push({ origin: 'file', createdAt: '2025-01-01T12:00:00Z' });
    App.updateEntryDate();
    assert.equal(element('entryDate').value, UTILS.toLocalISO(new Date('2025-01-01T12:00:00Z')));
    App.state.segments.pop();
    App.updateEntryDate();
    assert.equal(element('entryDate').value, UTILS.toLocalISO(new Date('2024-06-02T12:00:00Z')));
    App.state.dateEdited = true;
    element('entryDate').value = '2020-01-01T12:00';
    App.state.segments = [{ origin: 'camera' }];
    App.updateEntryDate();
    assert.equal(element('entryDate').value, '2020-01-01T12:00');
});

test('draft saves write each original blob only once, including concurrent saves', async () => {
    const { App, ImageStore } = environment();
    let writes = 0;
    ImageStore.isAvailable = () => true;
    ImageStore.set = async () => { writes++; };
    const seg = { source: {}, sourceBlob: new Blob(['original']), origin: 'file', createdAt: '2024-01-01T00:00:00Z', isManipulatable: true, scale: 1 };
    const results = await Promise.all([App.segmentToDraft(seg), App.segmentToDraft({ ...seg, x: 50 })]);
    await App.segmentToDraft(seg);
    assert.equal(writes, 1);
    assert.equal(results[0].sourceKey, results[1].sourceKey);
    assert.equal(results[0].origin, 'file');
    assert.equal(results[1].x, 50);
});

test('a draft write completing after reset cannot restore discarded segments', async () => {
    const { App, ImageStore, Storage } = environment();
    let finish;
    ImageStore.isAvailable = () => true;
    const deleted = [];
    ImageStore.del = async key => deleted.push(key);
    ImageStore.set = () => new Promise(resolve => { finish = resolve; });
    App.state.segments = [{ source: {}, sourceBlob: new Blob(['a']), isManipulatable: true }];
    const pending = App.persistEntryDraftNow();
    App.retakeAll();
    finish();
    await pending;
    assert.equal(Storage.getEntryDraft('test'), null);
    assert.equal(deleted.length, 1);
    App.cancelDraftSave();
});

test('reset clears preview, cancels old exports, disables save and reuses live camera', () => {
    const { App, element } = environment();
    let cameraStarts = 0;
    App.initCamera = () => { cameraStarts++; };
    App.state.stream = { getTracks: () => [{ readyState: 'live' }] };
    const job = { cancelled: false };
    App.state.highResJob = job;
    App.state.capturedImage = 'old'; App.state.capturedImageHighRes = 'old-full';
    App.retakeAll();
    assert.equal(job.cancelled, true);
    assert.equal(App.state.capturedImage, null);
    assert.equal(App.state.capturedImageHighRes, null);
    assert.equal(element('saveEntryBtn').disabled, true);
    assert.equal(cameraStarts, 0);
    assert.equal(App.state.segments.some(Boolean), false);
    App.cancelDraftSave();
});

test('stale high-resolution jobs cannot overwrite a replacement photo', async () => {
    const { App, UTILS } = environment();
    let finish;
    UTILS.compressToLimit = () => new Promise(resolve => { finish = resolve; });
    App.drawCollageCanvas = () => {};
    const old = { segments: [], dims: {}, layout: [], maxBytes: 10 };
    App.state.highResJob = old;
    const pending = App.prepareHighResCollage(old);
    App.invalidatePhoto();
    App.state.capturedImageHighRes = 'replacement';
    finish('old');
    await pending;
    assert.equal(App.state.capturedImageHighRes, 'replacement');
});

test('saved export retains its own entry after another editor opens', async () => {
    const { App, UTILS, Storage, ImageStore } = environment();
    let finish;
    UTILS.compressToLimit = () => new Promise(resolve => { finish = resolve; });
    ImageStore.isAvailable = () => false;
    App.drawCollageCanvas = () => {};
    const updates = [];
    Storage.updateEntryUploadAsset = (...args) => updates.push(args);
    Storage.queuePendingEntry = () => {};
    const old = { segments: [], dims: {}, layout: [], maxBytes: 10, pendingEntry: { diaryId: 'original-diary', entryId: 'original-entry' } };
    App.state.highResJob = old;
    const pending = App.prepareHighResCollage(old);
    App.invalidatePhoto();
    App.state.activeDiaryId = 'new-diary';
    App.state.capturedImageHighRes = 'new-photo';
    finish('original-full');
    await pending;
    assert.deepEqual(updates, [['original-diary', 'original-entry', null, 'original-full']]);
    assert.equal(App.state.capturedImageHighRes, 'new-photo');
});

test('compression is asynchronous, honours size cap and can be cancelled', async () => {
    const { UTILS } = environment();
    let calls = 0;
    const canvas = { toBlob: callback => { calls++; queueMicrotask(() => callback(new Blob(['123']))); } };
    UTILS.toBase64 = async blob => `size:${blob.size}`;
    assert.equal(await UTILS.compressToLimit(canvas, { maxBytes: 4 }), 'size:3');
    assert.equal(calls, 1);
    assert.equal(await UTILS.compressToLimit(canvas, { cancelled: () => true }), null);
    assert.equal(calls, 1);
});

test('editor opens before slow ghost-image storage completes', async () => {
    const { App, Storage, element } = environment();
    App.state.isEntryModalOpen = false;
    const diary = { id: 'test', entries: [{ id: 'previous', photoKey: 'previous-photo' }], cameraConfig: {} };
    Storage.setData([diary]); App.state.diaries = [diary];
    let finish;
    App.loadEntryImage = () => new Promise(resolve => { finish = resolve; });
    const opening = App.initNewEntry();
    assert.equal(App.state.isEntryModalOpen, true);
    assert.equal(element('entryModal').classList.contains('flex'), true);
    finish(null);
    await opening;
    App.cancelDraftSave();
});

test('closing during a camera request stops the late stream', async () => {
    const { App, context, realInitCamera } = environment();
    let finish;
    let stops = 0;
    context.navigator.mediaDevices.getUserMedia = () => new Promise(resolve => { finish = resolve; });
    const opening = realInitCamera();
    App.closeModal('entryModal', { force: true });
    finish({ getTracks: () => [{ stop: () => stops++ }] });
    await opening;
    assert.equal(stops, 1);
    assert.equal(App.state.stream, null);
});

test('camera starts playback muted after acquiring the stream', async () => {
    const { context, realInitCamera, element } = environment();
    let plays = 0;
    element('videoSource').play = async () => { plays++; };
    context.navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [] });
    await realInitCamera();
    assert.equal(plays, 1);
    assert.equal(element('videoSource').muted, true);
});

test('restored single-photo drafts retain metadata and have a Finish button', async () => {
    const { App, Storage, element } = environment();
    Storage.setEntryDraft('test', { collageMode: 1, date: '2024-01-02T12:00', dateEdited: false, segments: [{ sourceDataURL: 'data:image/png;base64,YQ==', origin: 'file', createdAt: '2024-01-02T12:00:00Z' }] });
    App.state.restoringDraft = true;
    await App.restoreEntryDraft();
    assert.equal(App.state.segments[0].origin, 'file');
    assert.equal(App.state.segments[0].createdAt, '2024-01-02T12:00:00Z');
    assert.equal(App.state.dateEdited, false);
    assert.equal(element('doneSegmentsBtn').disabled, false);
    assert.equal(element('doneSegmentsBtn').classList.contains('hidden'), false);
});

test('a decoded upload finishing after reset does not insert a photo', async () => {
    const { App, PhotoMetadata, element } = environment();
    let finish;
    PhotoMetadata.createdAt = () => new Promise(resolve => { finish = resolve; });
    const pending = App.handleFileUpload({ target: { files: [new Blob(['test'])], value: 'selected' } });
    App.retakeAll();
    finish('2024-01-01T00:00:00Z');
    await pending;
    assert.equal(App.state.segments.some(Boolean), false);
    assert.equal(element('saveEntryBtn').disabled, true);
    App.cancelDraftSave();
});

test('resetting an empty draft does not leave a Saving indicator', async () => {
    const { App, element } = environment();
    element('draftStatus').innerText = 'Saving draft...';
    await App.persistEntryDraftNow();
    assert.equal(element('draftStatus').innerText, 'Draft idle');
});
