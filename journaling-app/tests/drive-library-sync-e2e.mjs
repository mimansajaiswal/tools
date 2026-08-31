import fs from 'node:fs';
import { chromium } from '/tmp/journaling-playwright/node_modules/playwright/index.mjs';

const appUrl = process.env.JOURNALING_APP_URL || 'http://127.0.0.1:8000/journaling-app/';
const executablePath = '/Users/mimansajaiswal/Library/Caches/ms-playwright/chromium_headless_shell-1148/chrome-mac/headless_shell';
const uploadedNames = [];
const uploadedPayloads = new Map();
const assetUploads = [];
let manifest = null;

function assert(condition, message, details = undefined) {
  if (!condition) throw new Error(details ? `${message}: ${JSON.stringify(details, null, 2)}` : message);
}

function parseMultipart(request) {
  const contentType = request.headers()['content-type'] || '';
  const boundary = contentType.match(/boundary=([^;]+)/)?.[1] || '';
  const text = request.postDataBuffer()?.toString('utf8') || '';
  const parts = text.split(`--${boundary}`).filter((part) => part.includes('\r\n\r\n'));
  return parts.map((part) => {
    const content = part.slice(part.indexOf('\r\n\r\n') + 4).replace(/\r\n$/, '').trim();
    if (!content) return null;
    try { return JSON.parse(content); } catch { return content; }
  }).filter(Boolean);
}

const context = await chromium.launchPersistentContext(`/tmp/journaling-drive-library-${Date.now()}`, {
  executablePath,
  headless: true,
  serviceWorkers: 'block',
  viewport: { width: 1440, height: 1000 }
});

try {
  const page = context.pages()[0] || await context.newPage();
  await page.route('https://www.googleapis.com/**', async (route) => {
    const request = route.request();
    const url = request.url();
    if (request.method() === 'GET' && url.includes('/drive/v3/files?')) {
      const query = new URL(url).searchParams.get('q') || '';
      const files = query.includes("'root-folder' in parents")
        ? [{ id: 'assets-folder', name: 'Assets' }]
        : [{ id: 'root-folder', name: 'Journaling' }];
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ files })
      });
      return;
    }
    if (url.includes('/upload/drive/v3/files') && url.includes('uploadType=resumable')) {
      const metadata = request.postDataJSON();
      assetUploads.push(metadata.name);
      await route.fulfill({
        status: 200,
        headers: {
          Location: `https://upload.example/${assetUploads.length}`,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Location'
        },
        body: ''
      });
      return;
    }
    if (url.includes('/upload/drive/v3/files') && url.includes('uploadType=multipart')) {
      const [metadata, payload] = parseMultipart(request);
      uploadedNames.push(metadata.name);
      uploadedPayloads.set(metadata.name, payload);
      if (metadata.name === 'journaling-library.json') manifest = payload;
      const id = `file-${uploadedNames.length}`;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ id, name: metadata.name, webViewLink: `https://drive.google.com/${id}` })
      });
      return;
    }
    await route.abort();
  });
  await page.route('https://upload.example/**', async (route) => {
    await route.fulfill({
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        id: 'asset-file',
        name: assetUploads[0],
        webViewLink: 'https://drive.google.com/asset-file',
        webContentLink: 'https://drive.google.com/uc?id=asset-file'
      })
    });
  });

  await page.goto(`${appUrl}#write`);
  await page.waitForSelector('.ProseMirror');
  const imagePath = '/tmp/journaling-drive-library-image.png';
  fs.writeFileSync(imagePath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAGklEQVR4nGP8z8Dwn4EIwESJ5lEDRgYAtBcCFQ2Y7SMAAAAASUVORK5CYII=', 'base64'));
  const chooserPromise = page.waitForEvent('filechooser');
  await page.locator('#attachMediaBtn').evaluate((button) => button.click());
  const chooser = await chooserPromise;
  await chooser.setFiles(imagePath);
  await page.waitForSelector('.ProseMirror img[data-asset-id]');
  await page.click('#toggleStudioBtn');
  await page.waitForSelector('.rail-right');
  await page.fill('[name="driveAccessToken"]', 'drive-secret-that-must-not-sync');
  await page.locator('[name="driveEnabled"]').evaluate((input) => { input.checked = true; });
  await page.locator('[name="notionEnabled"]').evaluate((input) => { input.checked = false; });
  await page.locator('#settingsForm button[type="submit"]').evaluate((button) => button.click());
  await page.locator('#runSyncBtn').evaluate((button) => button.click());
  await page.waitForFunction(() => {
    const text = document.querySelector('#syncStatusCard')?.textContent || '';
    return text.includes('Synced 4 pages and 1 attachment') || text.includes('Sync failed:');
  });
  const syncText = await page.locator('#syncStatusCard').innerText();
  assert(syncText.includes('Synced 4 pages and 1 attachment'), 'Drive library sync failed', { syncText, uploadedNames, assetUploads });

  const markdownFiles = uploadedNames.filter((name) => name.endsWith('.md'));
  const documentJsonFiles = uploadedNames.filter((name) => name.endsWith('.json') && name !== 'journaling-library.json');
  assert(markdownFiles.length === 4, 'Drive sync did not upload every Markdown page', { uploadedNames });
  assert(documentJsonFiles.length === 4, 'Drive sync did not upload every document JSON file', { uploadedNames });
  assert(assetUploads.length === 1, 'Drive sync did not upload the inline image', { assetUploads });
  assert(uploadedNames.at(-1) === 'journaling-library.json', 'Manifest was not committed after all document files', { uploadedNames });
  assert(manifest?.object === 'journaling-library' && manifest?.version === 1, 'Manifest contract is invalid', manifest);
  assert(manifest.documentIds.length === 4, 'Manifest does not declare every document', manifest.documentIds);
  assert(manifest.healthLogs.length > 0, 'Manifest omitted health logs');
  assert(Array.isArray(manifest.views), 'Manifest omitted saved views');
  assert(manifest.workspace.settings.journals.length === 4, 'Manifest omitted journals');
  assert(manifest.workspace.settings.templates.length > 0, 'Manifest omitted templates');
  assert(manifest.workspace.settings.reminders.length > 0, 'Manifest omitted reminders');
  const markdownWithMedia = [...uploadedPayloads.entries()].find(([name, payload]) => name.endsWith('.md') && String(payload).includes('asset-file'));
  assert(Boolean(markdownWithMedia), 'No uploaded Markdown file contains the durable Drive media link', [...uploadedPayloads.keys()]);
  assert(!String(markdownWithMedia[1]).includes('blob:'), 'Uploaded Markdown contains a transient blob URL', markdownWithMedia);
  const jsonWithMedia = [...uploadedPayloads.entries()].find(([name, payload]) => name.endsWith('.json') && payload?.assets?.length);
  assert(jsonWithMedia?.[1]?.assets?.[0]?.metadata?.driveFileId === 'asset-file', 'Document JSON omitted Drive attachment metadata', jsonWithMedia);
  const serialized = JSON.stringify(manifest);
  assert(!serialized.includes('drive-secret-that-must-not-sync'), 'Drive token leaked into the manifest');
  assert(!serialized.includes('ntn_'), 'Notion token leaked into the manifest');
  assert(!Object.hasOwn(manifest.workspace.settings.ai, 'apiKey'), 'AI API key field leaked into the manifest');
  assert(!Object.hasOwn(manifest.workspace.settings.ai, 'transcriptionApiKey'), 'Transcription API key field leaked into the manifest');
  console.log(JSON.stringify({ ok: true, uploadedNames }, null, 2));
} finally {
  await context.close();
}
