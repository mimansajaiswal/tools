import { syncAssetsToDrive, syncDocumentToDrive, syncLibraryManifestToDrive } from './drive-sync.js';
import { buildDocumentMarkdown } from './notion-sync.js';

const list = (value) => Array.isArray(value) ? value : [];
export const DRIVE_BACKGROUND_SYNC_TAG = 'journaling-drive-sync';

export function buildDriveWorkspaceSettings(settings = {}) {
    const ai = settings.ai || {};
    const health = settings.health || {};
    return {
        showRightPanel: settings.showRightPanel,
        activeJournalId: settings.activeJournalId,
        journals: list(settings.journals),
        templates: list(settings.templates),
        reminders: list(settings.reminders),
        editor: settings.editor || {},
        media: settings.media || {},
        health: {
            fitbitEnabled: health.fitbitEnabled === true,
            fitbitLastImportedAt: health.fitbitLastImportedAt || null,
            googleFitEnabled: health.googleFitEnabled === true,
            appleHealthBridgeEnabled: health.appleHealthBridgeEnabled === true
        },
        ai: {
            provider: ai.provider,
            endpoint: ai.endpoint,
            model: ai.model,
            transcriptionProvider: ai.transcriptionProvider,
            transcriptionEndpoint: ai.transcriptionEndpoint,
            transcriptionModel: ai.transcriptionModel,
            transcriptionLanguage: ai.transcriptionLanguage,
            transcriptionInstructions: ai.transcriptionInstructions,
            transcriptionInsertMode: ai.transcriptionInsertMode,
            dailyChatInstruction: ai.dailyChatInstruction
        }
    };
}

export async function syncDriveLibrarySnapshot({
    settings = {},
    documents = [],
    assets = [],
    healthLogs = [],
    views = [],
    workspaceSettings = {},
    syncedAt = new Date().toISOString()
} = {}) {
    let driveSettings = { ...settings };
    let latestFileUrl = settings.lastFileUrl || '';
    const journals = new Map(list(workspaceSettings.journals).map((journal) => [journal.id, journal.name]));
    const nextAssetsById = new Map(list(assets).map((asset) => [asset.id, asset]));
    const nextDocuments = [];

    for (const document of list(documents)) {
        const documentAssets = list(assets).filter((asset) => asset.documentId === document.id);
        const mediaResult = await syncAssetsToDrive(driveSettings, documentAssets);
        driveSettings = {
            ...driveSettings,
            rootFolderId: mediaResult.rootFolderId || driveSettings.rootFolderId,
            assetsFolderId: mediaResult.assetsFolderId || driveSettings.assetsFolderId
        };
        const uploadedById = new Map(mediaResult.assets.map((item) => [item.assetId, item]));
        const syncedDocumentAssets = documentAssets.map((asset) => {
            const uploaded = uploadedById.get(asset.id);
            if (!uploaded) return asset;
            const next = {
                ...asset,
                remoteStatus: 'synced',
                remoteUrl: uploaded.webViewLink || uploaded.webContentLink,
                metadata: {
                    ...(asset.metadata || {}),
                    driveFileId: uploaded.fileId,
                    driveWebViewLink: uploaded.webViewLink,
                    driveWebContentLink: uploaded.webContentLink,
                    driveSyncedAt: syncedAt
                }
            };
            nextAssetsById.set(next.id, next);
            return next;
        });
        const exportAssets = syncedDocumentAssets.map((asset) => ({
            ...asset,
            metadata: { ...(asset.metadata || {}), blob: undefined }
        }));
        const markdown = buildDocumentMarkdown(document, {
            journalName: journals.get(document.journalId) || document.journalId || '',
            assets: syncedDocumentAssets,
            allowDriveUrls: true
        });
        const result = await syncDocumentToDrive(driveSettings, document, {
            markdown,
            json: { document, assets: exportAssets }
        });
        driveSettings = { ...driveSettings, rootFolderId: result.rootFolderId };
        latestFileUrl = result.markdownUrl || result.jsonUrl || latestFileUrl;
        nextDocuments.push({
            ...document,
            metadata: {
                ...(document.metadata || {}),
                driveFiles: {
                    markdownId: result.markdownId,
                    markdownUrl: result.markdownUrl,
                    jsonId: result.jsonId,
                    jsonUrl: result.jsonUrl
                },
                driveSyncedAt: syncedAt
            },
            updatedAt: syncedAt
        });
    }

    driveSettings = { ...driveSettings, lastPushAt: syncedAt, lastFileUrl: latestFileUrl };
    const manifestResult = await syncLibraryManifestToDrive(driveSettings, {
        exportedAt: syncedAt,
        documentIds: nextDocuments.map((document) => document.id),
        healthLogs: list(healthLogs),
        views: list(views),
        workspace: { settings: workspaceSettings }
    });
    driveSettings = {
        ...driveSettings,
        rootFolderId: manifestResult.rootFolderId,
        libraryManifestId: manifestResult.manifestId,
        libraryManifestUrl: manifestResult.manifestUrl
    };
    return {
        documents: nextDocuments,
        assets: [...nextAssetsById.values()],
        driveSettings,
        manifestResult,
        syncedAt
    };
}
