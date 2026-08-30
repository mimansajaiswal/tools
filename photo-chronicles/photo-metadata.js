/* Read capture dates only. File.lastModified is not a photo creation date. */
const PhotoMetadata = (() => {
    const text = (view, start, length) => String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + start, length));

    function parseDate(value, offset = '') {
        const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value || '');
        if (!match) return null;
        const [, year, month, day, hour, minute, second] = match.map(Number);
        if (year < 1000 || month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) return null;
        if (day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
        if (offset && !/^[+-](?:0\d|1[0-4]):[0-5]\d$/.test(offset)) return null;
        const date = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}${offset}`);
        return Number.isFinite(date.getTime()) ? date.toISOString() : null;
    }

    function readExif(buffer) {
        try {
            let view = new DataView(buffer);
            if (view.byteLength >= 6 && text(view, 0, 6) === 'Exif\0\0') view = new DataView(buffer, 6);
            const order = text(view, 0, 2);
            if (order !== 'II' && order !== 'MM') return null;
            const little = order === 'II';
            const u16 = pos => view.getUint16(pos, little);
            const u32 = pos => view.getUint32(pos, little);
            if (u16(2) !== 42) return null;
            const tags = new Map();
            const visited = new Set();
            function readDirectory(pos) {
                if (!pos || visited.has(pos) || visited.size >= 2) return;
                visited.add(pos);
                const count = u16(pos);
                if (pos + 2 + count * 12 > view.byteLength) return;
                for (let i = 0; i < count; i++) {
                    const entry = pos + 2 + i * 12;
                    const tag = u16(entry);
                    const type = u16(entry + 2);
                    const length = u32(entry + 4);
                    if (tag === 0x8769 && type === 4 && length === 1) readDirectory(u32(entry + 8));
                    if (![0x9003, 0x9004, 0x9011, 0x9012].includes(tag) || type !== 2 || length > 64 || !length) continue;
                    const start = length <= 4 ? entry + 8 : u32(entry + 8);
                    if (start + length <= view.byteLength) tags.set(tag, text(view, start, length).replace(/\0.*$/, '').trim());
                }
            }
            readDirectory(u32(4));
            return parseDate(tags.get(0x9003), tags.get(0x9011)) || parseDate(tags.get(0x9004), tags.get(0x9012));
        } catch {
            return null; // Invalid metadata must not prevent importing.
        }
    }

    // HEIF stores EXIF as an item, located through meta/iinf/iloc, not a JPEG APP1 chunk.
    // Read those tables and the EXIF extents only; never decode or scan the image pixels.
    async function readHeif(file) {
        const limit = 256 * 1024;
        const read = async (start, size) => {
            if (!Number.isSafeInteger(start) || size < 0 || size > limit || start < 0 || start + size > file.size) throw new Error('Invalid HEIF range');
            return new DataView(await file.slice(start, start + size).arrayBuffer());
        };
        const header = (view, pos, end) => {
            let size = view.getUint32(pos);
            let bytes = 8;
            if (size === 1) {
                size = view.getUint32(pos + 8) * 4294967296 + view.getUint32(pos + 12);
                bytes = 16;
            } else if (size === 0) size = end - pos;
            if (!Number.isSafeInteger(size) || size < bytes || pos + size > end) throw new Error('Invalid HEIF box');
            return { type: text(view, pos + 4, 4), start: pos + bytes, end: pos + size };
        };
        async function boxes(start, end) {
            const found = [];
            for (let pos = start; pos < end;) {
                if (found.length >= 512 || end - pos < 8) throw new Error('Invalid HEIF box list');
                const box = header(await read(pos, Math.min(16, end - pos)), 0, end - pos);
                found.push({ type: box.type, start: pos + box.start, end: pos + box.end });
                pos += box.end;
            }
            return found;
        }
        const top = await boxes(0, file.size);
        const meta = top.find(box => box.type === 'meta');
        if (!meta) return null;
        const children = await boxes(meta.start + 4, meta.end);
        const info = children.find(box => box.type === 'iinf');
        const locations = children.find(box => box.type === 'iloc');
        const itemData = children.find(box => box.type === 'idat');
        if (!info || !locations) return null;

        const infoView = await read(info.start, info.end - info.start);
        const exifIds = new Set();
        const countBytes = infoView.getUint8(0) === 0 ? 2 : 4;
        const count = countBytes === 2 ? infoView.getUint16(4) : infoView.getUint32(4);
        if (count > 512) return null;
        let pos = 4 + countBytes;
        for (let i = 0; i < count; i++) {
            const box = header(infoView, pos, infoView.byteLength);
            if (box.type === 'infe') {
                const version = infoView.getUint8(box.start);
                const idBytes = version === 2 ? 2 : 4;
                if ((version === 2 || version === 3) && box.start + 4 + idBytes + 6 <= box.end) {
                    const id = idBytes === 2 ? infoView.getUint16(box.start + 4) : infoView.getUint32(box.start + 4);
                    const protection = infoView.getUint16(box.start + 4 + idBytes);
                    if (!protection && text(infoView, box.start + 6 + idBytes, 4) === 'Exif') exifIds.add(id);
                }
            }
            pos = box.end;
        }
        if (!exifIds.size) return null;

        const loc = await read(locations.start, locations.end - locations.start);
        const version = loc.getUint8(0);
        if (version > 2) return null;
        const offsetBytes = loc.getUint8(4) >> 4;
        const lengthBytes = loc.getUint8(4) & 15;
        const baseBytes = loc.getUint8(5) >> 4;
        const indexBytes = version ? loc.getUint8(5) & 15 : 0;
        pos = 6;
        const integer = bytes => {
            if (bytes > 8) throw new Error('Invalid HEIF integer');
            let value = 0;
            for (let i = 0; i < bytes; i++) value = value * 256 + loc.getUint8(pos++);
            if (!Number.isSafeInteger(value)) throw new Error('HEIF offset exceeds safe range');
            return value;
        };
        const itemCount = integer(version < 2 ? 2 : 4);
        if (itemCount > 512) return null;
        for (let i = 0; i < itemCount; i++) {
            const id = integer(version < 2 ? 2 : 4);
            const method = version ? integer(2) & 15 : 0;
            const reference = integer(2);
            const base = integer(baseBytes);
            const extentCount = integer(2);
            if (extentCount > 512) return null;
            const parts = [];
            let total = 0;
            const readable = exifIds.has(id) && !reference && (method === 0 || (method === 1 && itemData));
            for (let j = 0; j < extentCount; j++) {
                integer(indexBytes);
                const offset = integer(offsetBytes);
                const length = integer(lengthBytes);
                if (!readable) continue;
                total += length;
                if (total > limit || !length) return null;
                const start = (method === 1 ? itemData.start : 0) + base + offset;
                if (method === 1 && start + length > itemData.end) return null;
                parts.push((await read(start, length)).buffer);
            }
            if (parts.length && total >= 4) {
                const data = await new Blob(parts).arrayBuffer();
                // HEIF's first four bytes give the TIFF-header offset after this field.
                const tiffStart = 4 + new DataView(data).getUint32(0);
                if (tiffStart + 8 <= data.byteLength) {
                    const date = readExif(data.slice(tiffStart));
                    if (date) return date;
                }
            }
        }
        return null;
    }

    async function createdAt(file) {
        try {
            const head = new DataView(await file.slice(0, 12).arrayBuffer());
            // Read metadata chunks, skipping compressed image pixels.
            const readChunk = async (start, length) => {
                if (length > 256 * 1024 || start + length > file.size) return null;
                return readExif(await file.slice(start, start + length).arrayBuffer());
            };
            if (head.getUint16(0) === 0xffd8) {
                let pos = 2;
                for (let i = 0; i < 256 && pos + 4 <= file.size; i++) {
                    const marker = new DataView(await file.slice(pos, pos + 4).arrayBuffer());
                    if (marker.getUint8(0) !== 0xff) break;
                    const type = marker.getUint8(1);
                    if (type === 0xda || type === 0xd9) break;
                    const length = marker.getUint16(2);
                    if (length < 2) break;
                    if (type === 0xe1) {
                        const date = await readChunk(pos + 4, length - 2);
                        if (date) return date;
                    }
                    pos += length + 2;
                }
            } else if (text(head, 0, 4) === 'RIFF' && text(head, 8, 4) === 'WEBP') {
                for (let pos = 12, i = 0; pos + 8 <= file.size && i < 256; i++) {
                    const chunk = new DataView(await file.slice(pos, pos + 8).arrayBuffer());
                    const length = chunk.getUint32(4, true);
                    if (text(chunk, 0, 4) === 'EXIF') return readChunk(pos + 8, length);
                    pos += 8 + length + (length % 2);
                }
            } else if (head.getUint32(0) === 0x89504e47 && head.getUint32(4) === 0x0d0a1a0a) {
                for (let pos = 8, i = 0; pos + 12 <= file.size && i < 256; i++) {
                    const chunk = new DataView(await file.slice(pos, pos + 8).arrayBuffer());
                    const length = chunk.getUint32(0);
                    if (text(chunk, 4, 4) === 'eXIf') return readChunk(pos + 8, length);
                    pos += 12 + length;
                }
            } else if (text(head, 4, 4) === 'ftyp') {
                return await readHeif(file);
            } else if (['II', 'MM'].includes(text(head, 0, 2))) {
                return readExif(await file.slice(0, 256 * 1024).arrayBuffer());
            }
        } catch { /* Unsupported format or unreadable metadata. */ }
        return null;
    }

    function entryDate(segments, now = new Date()) {
        const photos = segments.filter(Boolean);
        if (photos.some(photo => photo.origin !== 'file')) return now;
        const dates = photos.map(photo => Date.parse(photo.createdAt)).filter(Number.isFinite);
        return dates.length ? new Date(Math.max(...dates)) : now;
    }

    return { createdAt, entryDate, parseDate, readExif };
})();
