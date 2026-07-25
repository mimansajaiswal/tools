const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const LIBRARY_MANIFEST_NAME = 'journaling-library.json';
const LIBRARY_MANIFEST_VERSION = 1;

const text = (value = '') => String(value || '').trim();

function safeName(value = '') {
    return text(value)
        .replace(/[\\/:*?"<>|#%{}[\]~]/g, '-')
        .replace(/\s+/g, ' ')
        .slice(0, 120) || 'journal-entry';
}

async function request(accessToken, url, options = {}) {
    if (!accessToken) throw new Error('Missing Google Drive access token');
    const response = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(options.headers || {})
        }
    });
    if (!response.ok) {
        let message = await response.text();
        try {
            const parsed = JSON.parse(message);
            message = parsed.error?.message || message;
        } catch { }
        throw new Error(message || `Drive request failed with ${response.status}`);
    }
    return response.status === 204 ? null : response.json();
}

function multipartBody(metadata, blob, boundary) {
    return new Blob([
        `--${boundary}\r\n`,
        'Content-Type: application/json; charset=UTF-8\r\n\r\n',
        JSON.stringify(metadata),
        `\r\n--${boundary}\r\n`,
        `Content-Type: ${blob.type || 'application/octet-stream'}\r\n\r\n`,
        blob,
        `\r\n--${boundary}--`
    ], { type: `multipart/related; boundary=${boundary}` });
}

async function uploadMultipart(accessToken, fileId, metadata, blob, uploadBase = DRIVE_UPLOAD) {
    const boundary = `journal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    const url = fileId
        ? `${uploadBase}/files/${encodeURIComponent(fileId)}?uploadType=multipart&fields=id,name,webViewLink,webContentLink`
        : `${uploadBase}/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink`;
    return request(accessToken, url, {
        method: fileId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: multipartBody(metadata, blob, boundary)
    });
}

async function uploadResumable(accessToken, fileId, metadata, blob, uploadBase = DRIVE_UPLOAD) {
    if (!accessToken) throw new Error('Missing Google Drive access token');
    const url = fileId
        ? `${uploadBase}/files/${encodeURIComponent(fileId)}?uploadType=resumable&fields=id,name,webViewLink,webContentLink`
        : `${uploadBase}/files?uploadType=resumable&fields=id,name,webViewLink,webContentLink`;
    const start = await fetch(url, {
        method: fileId ? 'PATCH' : 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Type': blob.type || 'application/octet-stream',
            'X-Upload-Content-Length': String(blob.size)
        },
        body: JSON.stringify(metadata)
    });
    if (!start.ok) throw new Error((await start.text()) || `Drive upload initialization failed with ${start.status}`);
    const uploadUrl = start.headers.get('location');
    if (!uploadUrl) throw new Error('Google Drive did not return a resumable upload URL');
    const complete = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': blob.type || 'application/octet-stream' },
        body: blob
    });
    if (!complete.ok) throw new Error((await complete.text()) || `Drive upload failed with ${complete.status}`);
    return complete.json();
}

export async function requestDriveToken(clientId = '') {
    if (!text(clientId)) throw new Error('Missing Google OAuth client id');
    if (!globalThis.google?.accounts?.oauth2) throw new Error('Google Identity Services script is not loaded');
    return new Promise((resolve, reject) => {
        const client = globalThis.google.accounts.oauth2.initTokenClient({
            client_id: text(clientId),
            scope: DRIVE_SCOPE,
            callback: (response) => {
                if (response?.access_token) resolve(response.access_token);
                else reject(new Error(response?.error || 'Google authorization did not return an access token'));
            }
        });
        client.requestAccessToken({ prompt: 'consent' });
    });
}

export async function ensureDriveFolder(settings = {}) {
    const accessToken = text(settings.accessToken);
    const existingId = text(settings.rootFolderId);
    if (existingId) return { id: existingId };
    const name = safeName(settings.rootFolderName || 'Journaling');
    const query = encodeURIComponent(`name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const apiBase = text(settings.apiBase) || DRIVE_API;
    const found = await request(accessToken, `${apiBase}/files?q=${query}&spaces=drive&fields=files(id,name)`);
    if (found.files?.[0]) return found.files[0];
    return request(accessToken, `${apiBase}/files?fields=id,name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name,
            mimeType: 'application/vnd.google-apps.folder'
        })
    });
}

async function ensureChildFolder(settings = {}, parentId = '', name = 'Assets') {
    const accessToken = text(settings.accessToken);
    const safeFolderName = safeName(name);
    const escaped = safeFolderName.replace(/'/g, "\\'");
    const query = encodeURIComponent(`name='${escaped}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const apiBase = text(settings.apiBase) || DRIVE_API;
    const found = await request(accessToken, `${apiBase}/files?q=${query}&spaces=drive&fields=files(id,name)`);
    if (found.files?.[0]) return found.files[0];
    return request(accessToken, `${apiBase}/files?fields=id,name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: safeFolderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
        })
    });
}

async function listFolderFiles(accessToken, folderId, apiBase = DRIVE_API) {
    const files = [];
    let pageToken = '';
    do {
        const query = `'${folderId}' in parents and trashed=false`;
        const url = new URL(`${apiBase}/files`);
        url.searchParams.set('q', query);
        url.searchParams.set('spaces', 'drive');
        url.searchParams.set('pageSize', '1000');
        url.searchParams.set('fields', 'nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,webContentLink)');
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        const page = await request(accessToken, url.toString());
        files.push(...(page.files || []));
        pageToken = text(page.nextPageToken);
    } while (pageToken);
    return files;
}

async function downloadFile(accessToken, fileId, responseType = 'blob', apiBase = DRIVE_API) {
    if (!accessToken) throw new Error('Missing Google Drive access token');
    const response = await fetch(`${apiBase}/files/${encodeURIComponent(fileId)}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
        let message = await response.text();
        try {
            const parsed = JSON.parse(message);
            message = parsed.error?.message || message;
        } catch { }
        throw new Error(message || `Drive download failed with ${response.status}`);
    }
    return responseType === 'json' ? response.json() : response.blob();
}

function fileStem(name = '') {
    return text(name).replace(/\.(json|md)$/i, '');
}

export async function syncAssetsToDrive(settings = {}, assets = []) {
    if (!assets.length) return { rootFolderId: text(settings.rootFolderId), assetsFolderId: '', assets: [] };
    const root = await ensureDriveFolder(settings);
    const folder = await ensureChildFolder(settings, root.id, 'Assets');
    const uploaded = [];
    for (const asset of assets) {
        const blob = asset?.metadata?.blob;
        if (!(blob instanceof Blob)) throw new Error(`Attachment ${asset?.name || asset?.id || ''} has no local file data`);
        const existingId = text(asset?.metadata?.driveFileId);
        const file = await uploadResumable(settings.accessToken, existingId, {
            name: safeName(asset.name || asset.originalName || asset.id),
            mimeType: asset.mimeType || blob.type || 'application/octet-stream',
            parents: existingId ? undefined : [folder.id],
            description: `Journaling attachment for ${asset.documentId || 'entry'}`
        }, blob, text(settings.uploadBase) || DRIVE_UPLOAD);
        uploaded.push({
            assetId: asset.id,
            fileId: file.id,
            name: file.name || asset.name,
            webViewLink: file.webViewLink || '',
            webContentLink: file.webContentLink || ''
        });
    }
    return { rootFolderId: root.id, assetsFolderId: folder.id, assets: uploaded };
}

export async function syncLibraryManifestToDrive(settings = {}, manifest = {}) {
    const root = await ensureDriveFolder(settings);
    const payload = {
        ...manifest,
        object: 'journaling-library',
        version: LIBRARY_MANIFEST_VERSION
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const file = await uploadMultipart(settings.accessToken, text(settings.libraryManifestId), {
        name: LIBRARY_MANIFEST_NAME,
        mimeType: 'application/json',
        parents: settings.libraryManifestId ? undefined : [root.id]
    }, blob, text(settings.uploadBase) || DRIVE_UPLOAD);
    return {
        rootFolderId: root.id,
        manifestId: file.id,
        manifestUrl: file.webViewLink || ''
    };
}

export async function restoreJournalFromDrive(settings = {}) {
    const root = await ensureDriveFolder(settings);
    const apiBase = text(settings.apiBase) || DRIVE_API;
    const files = await listFolderFiles(settings.accessToken, root.id, apiBase);
    const manifestFile = files.find((file) => file.name === LIBRARY_MANIFEST_NAME);
    if (!manifestFile) throw new Error(`Google Drive is missing ${LIBRARY_MANIFEST_NAME}`);
    const library = await downloadFile(settings.accessToken, manifestFile.id, 'json', apiBase);
    if (library?.object !== 'journaling-library' || library?.version !== LIBRARY_MANIFEST_VERSION ||
        !Array.isArray(library.documentIds) || !Array.isArray(library.healthLogs) ||
        !Array.isArray(library.views) || !library.workspace?.settings) {
        throw new Error(`${LIBRARY_MANIFEST_NAME} is not a valid version ${LIBRARY_MANIFEST_VERSION} library manifest`);
    }
    const markdownByStem = new Map(files
        .filter((file) => file.mimeType === 'text/markdown' || /\.md$/i.test(file.name || ''))
        .map((file) => [fileStem(file.name), file]));
    const jsonFiles = files.filter((file) => file.id !== manifestFile.id &&
        (file.mimeType === 'application/json' || /\.json$/i.test(file.name || '')));
    if (!jsonFiles.length) throw new Error('No Journaling JSON backups were found in the Google Drive folder');

    const snapshots = [];
    for (const file of jsonFiles) {
        const payload = await downloadFile(settings.accessToken, file.id, 'json', apiBase);
        if (!payload?.document?.id || !Array.isArray(payload.assets)) {
            throw new Error(`Drive backup ${file.name || file.id} is not a valid Journaling document export`);
        }
        snapshots.push({ file, payload });
    }

    const expectedDocumentIds = new Set(library.documentIds);
    const newestByDocumentId = new Map();
    snapshots.forEach((snapshot) => {
        const id = snapshot.payload.document.id;
        if (!expectedDocumentIds.has(id)) return;
        const existing = newestByDocumentId.get(id);
        if (!existing || String(snapshot.file.modifiedTime || '') > String(existing.file.modifiedTime || '')) {
            newestByDocumentId.set(id, snapshot);
        }
    });
    const missingDocumentIds = [...expectedDocumentIds].filter((id) => !newestByDocumentId.has(id));
    if (missingDocumentIds.length) {
        throw new Error(`Google Drive is missing document backups declared by the library manifest: ${missingDocumentIds.join(', ')}`);
    }

    const documents = [];
    const assets = [];
    for (const { file, payload } of newestByDocumentId.values()) {
        const markdown = markdownByStem.get(fileStem(file.name));
        documents.push({
            ...payload.document,
            metadata: {
                ...(payload.document.metadata || {}),
                driveFiles: {
                    ...(payload.document.metadata?.driveFiles || {}),
                    jsonId: file.id,
                    jsonUrl: file.webViewLink || '',
                    markdownId: markdown?.id || '',
                    markdownUrl: markdown?.webViewLink || ''
                }
            }
        });
        for (const asset of payload.assets) {
            const fileId = text(asset.metadata?.driveFileId);
            if (!asset.id || !fileId) throw new Error(`Drive backup ${file.name || file.id} contains an attachment without a Drive file id`);
            const blob = await downloadFile(settings.accessToken, fileId, 'blob', apiBase);
            assets.push({
                ...asset,
                size: blob.size,
                mimeType: asset.mimeType || blob.type || 'application/octet-stream',
                localStatus: 'cached',
                remoteStatus: 'synced',
                metadata: {
                    ...(asset.metadata || {}),
                    blob,
                    driveFileId: fileId
                }
            });
        }
    }

    return {
        rootFolderId: root.id,
        manifestId: manifestFile.id,
        manifestUrl: manifestFile.webViewLink || '',
        library,
        documents,
        assets,
        restoredAt: new Date().toISOString()
    };
}

export async function syncDocumentToDrive(settings = {}, doc = {}, payload = {}) {
    const folder = await ensureDriveFolder(settings);
    const base = safeName(`${doc.date || 'undated'} ${doc.smartTitle || doc.title || doc.id}`);
    const driveFiles = doc.metadata?.driveFiles || {};
    const markdownBlob = new Blob([payload.markdown || ''], { type: 'text/markdown;charset=utf-8' });
    const jsonBlob = new Blob([JSON.stringify(payload.json || doc, null, 2)], { type: 'application/json;charset=utf-8' });
    const uploadBase = text(settings.uploadBase) || DRIVE_UPLOAD;
    const md = await uploadMultipart(settings.accessToken, driveFiles.markdownId, {
        name: `${base}.md`,
        mimeType: 'text/markdown',
        parents: driveFiles.markdownId ? undefined : [folder.id]
    }, markdownBlob, uploadBase);
    const json = await uploadMultipart(settings.accessToken, driveFiles.jsonId, {
        name: `${base}.json`,
        mimeType: 'application/json',
        parents: driveFiles.jsonId ? undefined : [folder.id]
    }, jsonBlob, uploadBase);
    return {
        rootFolderId: folder.id,
        markdownId: md.id,
        markdownUrl: md.webViewLink || '',
        jsonId: json.id,
        jsonUrl: json.webViewLink || ''
    };
}
