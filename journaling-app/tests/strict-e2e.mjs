import http from 'node:http';
import fs from 'node:fs';
import { chromium } from '/tmp/journaling-playwright/node_modules/playwright/index.mjs';

const appUrl = process.env.JOURNALING_APP_URL || 'http://127.0.0.1:8000/journaling-app/';
const token = 'test-notion-token';
const parentPageId = 'test-parent-page-id';
const proxyPort = Number(process.env.JOURNALING_NOTION_PROXY_PORT || 8788);
const executablePath = '/Users/mimansajaiswal/Library/Caches/ms-playwright/chromium_headless_shell-1148/chrome-mac/headless_shell';
const consoleErrors = [];
let lastNotionPageId = '';
let fileUploadCreateCount = 0;

const server = http.createServer(async (req, res) => {
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type,notion-version,x-proxy-token'
  };
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors);
      res.end();
      return;
    }
    const url = new URL(req.url, `http://127.0.0.1:${proxyPort}`);
    const target = url.searchParams.get('url');
    if (!target) {
      res.writeHead(400, cors);
      res.end('Missing target');
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const targetUrl = new URL(target);
    if (req.method === 'POST' && targetUrl.pathname === '/v1/file_uploads') fileUploadCreateCount += 1;
    const upstream = await fetch(target, {
      method: req.method,
      headers: {
        authorization: req.headers.authorization || '',
        'notion-version': req.headers['notion-version'] || '2025-09-03',
        ...(req.headers['content-type'] ? { 'content-type': req.headers['content-type'] } : {})
      },
      body: chunks.length ? Buffer.concat(chunks) : undefined
    });
    const body = await upstream.arrayBuffer();
    if (upstream.ok && req.method === 'POST' && targetUrl.pathname === '/v1/pages') {
      lastNotionPageId = JSON.parse(Buffer.from(body).toString('utf8')).id || '';
    }
    const headers = Object.fromEntries(upstream.headers);
    delete headers['content-encoding'];
    delete headers['content-length'];
    delete headers['transfer-encoding'];
    res.writeHead(upstream.status, { ...headers, ...cors });
    res.end(Buffer.from(body));
  } catch (error) {
    res.writeHead(500, cors);
    res.end(error.stack || String(error));
  }
});

function assert(condition, message, details = undefined) {
  if (!condition) {
    throw new Error(details ? `${message}: ${JSON.stringify(details, null, 2)}` : message);
  }
}

async function assertNoOverflow(page, label) {
  const offenders = await page.evaluate(() => Array.from(document.querySelectorAll('body *')).filter((node) => {
    if (node.classList.contains('sr-only') || node.closest('.sr-only') || node.closest('.leaflet-container')) return false;
    if (document.body.dataset.rightPanelHidden === 'true' && node.closest('.rail-right')) return false;
    if (document.body.dataset.leftRailOpen === 'false' && innerWidth <= 640 && node.closest('.rail-left')) return false;
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || style.position === 'fixed') return false;
    const rect = node.getBoundingClientRect();
    return rect.right > innerWidth + 2 || rect.left < -2;
  }).slice(0, 8).map((node) => ({
    tag: node.tagName.toLowerCase(),
    className: String(node.className || ''),
    text: String(node.textContent || '').trim().slice(0, 80),
    left: node.getBoundingClientRect().left,
    right: node.getBoundingClientRect().right,
    width: node.getBoundingClientRect().width
  })));
  assert(offenders.length === 0, `${label} viewport overflow`, offenders);
}

async function assertWriteSurface(page, label) {
  const metrics = await page.evaluate(() => {
    const editor = document.querySelector('#editor');
    const title = document.querySelector('#docTitleInput');
    const prose = document.querySelector('.ProseMirror');
    return {
      editorVisible: Boolean(editor && getComputedStyle(editor).display !== 'none'),
      hasTitle: Boolean(title),
      hasProseMirror: Boolean(prose),
      proseEditable: prose?.getAttribute('contenteditable') === 'true'
    };
  });
  assert(metrics.editorVisible, `${label} editor is not visible`, metrics);
  assert(metrics.hasTitle, `${label} title input is missing`, metrics);
  assert(metrics.hasProseMirror, `${label} ProseMirror editor is missing`, metrics);
  assert(metrics.proseEditable, `${label} ProseMirror editor is not editable`, metrics);
  return metrics;
}

async function assertSlashFlow(page) {
  await page.click('.ProseMirror');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+End' : 'Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/heading2');
  await page.waitForSelector('.tiptap-slash-menu:not(.is-hidden)');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Strict QA heading');
  await page.keyboard.press('Enter');
  await page.keyboard.type('A journal editor should keep typing continuous after a slash-created heading.');
  const state = await page.evaluate(() => ({
    hasHeading: Array.from(document.querySelectorAll('.ProseMirror h2')).some((node) => node.textContent.includes('Strict QA heading')),
    proseText: document.querySelector('.ProseMirror').innerText,
    slashHidden: document.querySelector('.tiptap-slash-menu').classList.contains('is-hidden')
  }));
  assert(state.hasHeading, 'Slash command did not create an h2 heading', state);
  assert(state.proseText.includes('typing continuous'), 'Typing after slash heading did not continue in the document', state);
  assert(state.slashHidden, 'Slash menu stayed open after command selection', state);
}

async function assertSlashToggleFlow(page) {
  await page.click('.ProseMirror');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+End' : 'Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/toggle');
  await page.waitForSelector('.tiptap-slash-menu:not(.is-hidden)');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Strict toggle summary');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Strict nested toggle content');
  await page.waitForTimeout(900);
  const toggle = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('.ProseMirror .toggle-block'));
    const node = nodes.at(-1);
    return {
      count: nodes.length,
      text: node?.textContent || '',
      paragraphs: node?.querySelectorAll('p').length || 0
    };
  });
  assert(toggle.count > 0, 'Slash command did not create a toggle', toggle);
  assert(toggle.text.includes('Strict toggle summary'), 'Toggle summary was not editable after slash insertion', toggle);
  assert(toggle.text.includes('Strict nested toggle content'), 'Toggle child content was not editable after slash insertion', toggle);
  assert(toggle.paragraphs >= 2, 'Toggle does not contain separate summary and child blocks', toggle);
}

async function attachMediaThroughEditorButton(page) {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAGklEQVR4nGP8z8Dwn4EIwESJ5lEDRgYAtBcCFQ2Y7SMAAAAASUVORK5CYII=', 'base64');
  const imagePath = '/tmp/journaling-strict-image.png';
  fs.writeFileSync(imagePath, png);
  const chooserPromise = page.waitForEvent('filechooser');
  await page.click('#attachMediaBtn');
  const chooser = await chooserPromise;
  await chooser.setFiles(imagePath);
  await page.click('#toggleDetailsBtn');
  await page.waitForSelector('#detailsPanel:not([hidden])');
  await page.waitForSelector('#assetList img');
  const asset = await page.locator('#assetList img').first().evaluate((node) => ({
    src: node.getAttribute('src'),
    width: node.naturalWidth,
    height: node.naturalHeight
  }));
  assert(asset.src?.startsWith('blob:') || asset.src?.startsWith('data:image/'), 'Attached image did not render as a local image asset', asset);
  assert(asset.width > 0 && asset.height > 0, 'Attached image has no rendered dimensions', asset);
  await page.waitForTimeout(500);
  const inlineMedia = await page.evaluate(() => {
    const node = document.querySelector('.ProseMirror img[data-asset-id]');
    return {
      assetId: node?.getAttribute('data-asset-id') || '',
      src: node?.getAttribute('src') || '',
      alt: node?.getAttribute('alt') || '',
      editorHtml: document.querySelector('.ProseMirror')?.innerHTML || ''
    };
  });
  assert(Boolean(inlineMedia.assetId), 'Toolbar attachment did not create an inline editor media block', inlineMedia);
  const optimized = await page.evaluate(async (assetId) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('JournalingAppDB_journaling-app');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise((resolve, reject) => {
      const request = db.transaction('assets').objectStore('assets').get(assetId);
      request.onsuccess = () => resolve({
        mimeType: request.result?.mimeType,
        storageMode: request.result?.storageMode,
        width: request.result?.width,
        height: request.result?.height,
        blobType: request.result?.metadata?.blob?.type,
        originalName: request.result?.originalName
      });
      request.onerror = () => reject(request.error);
    });
  }, inlineMedia.assetId);
  assert(optimized.mimeType === 'image/webp', 'Image attachment was not converted to WebP', optimized);
  assert(optimized.storageMode === 'optimized', 'Image attachment was not marked as optimized', optimized);
  assert(optimized.width === 10 && optimized.height === 10, 'Optimized image dimensions were not persisted', optimized);
  assert(optimized.blobType === 'image/webp', 'Persisted optimized Blob has the wrong MIME type', optimized);
  assert(optimized.originalName === 'journaling-strict-image.png', 'Original image filename was not retained', optimized);
}

await new Promise((resolve) => server.listen(proxyPort, '127.0.0.1', resolve));

const context = await chromium.launchPersistentContext(`/tmp/journaling-strict-profile-${Date.now()}`, {
  executablePath,
  headless: true,
  serviceWorkers: 'block',
  viewport: { width: 1440, height: 1180 }
});

try {
  const page = context.pages()[0] || await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.stack || String(error)));

  await page.goto(`${appUrl}#write`);
  await page.waitForSelector('.ProseMirror');
  const lightMetrics = await assertWriteSurface(page, 'light write');
  await assertNoOverflow(page, 'light write');
  await page.screenshot({ path: '/tmp/journaling-strict-write-light.png', fullPage: true });

  await assertSlashFlow(page);
  await assertSlashToggleFlow(page);
  await attachMediaThroughEditorButton(page);
  await page.click('#toggleDetailsBtn');
  await page.waitForFunction(() => document.querySelector('#detailsPanel')?.hasAttribute('hidden'));

  await page.waitForSelector('.rail-right');
  await page.fill('[name="notionWorkerUrl"]', `http://127.0.0.1:${proxyPort}`);
  await page.fill('[name="notionParentPageId"]', parentPageId);
  await page.fill('[name="notionAuthToken"]', token);
  await page.check('[name="notionEnabled"]');
  await page.click('#settingsForm button[type="submit"]');
  await page.locator('#runSyncBtn').evaluate((button) => button.click());
  await page.waitForFunction(() => document.querySelector('#syncStatusCard')?.textContent.includes('Synced to Notion'), null, { timeout: 25000 });
  await page.screenshot({ path: '/tmp/journaling-strict-write-synced.png', fullPage: true });
  await assertNoOverflow(page, 'synced');

  const notionText = await page.locator('#syncStatusCard').innerText();
  assert(notionText.includes('Synced to Notion'), 'Notion worker sync did not report success', { notionText });
  assert(notionText.includes('with 1 attachment'), 'Notion sync did not report the native media upload', { notionText });
  assert(Boolean(lastNotionPageId), 'Notion did not return a created page id');
  assert(fileUploadCreateCount === 1, 'The first sync did not create exactly one Notion file upload', { fileUploadCreateCount });

  await page.locator('#runSyncBtn').evaluate((button) => button.click());
  await page.waitForFunction(() => document.querySelector('#syncStatusCard')?.textContent.includes('Syncing current page'));
  await page.waitForFunction(() => {
    const text = document.querySelector('#syncStatusCard')?.textContent || '';
    return text.includes('Synced to Notion') || text.includes('failed:');
  }, null, { timeout: 25000 });
  const secondSyncText = await page.locator('#syncStatusCard').innerText();
  assert(secondSyncText.includes('Synced to Notion'), 'Second Notion sync failed', { secondSyncText });
  assert(fileUploadCreateCount === 1, 'The second sync re-uploaded an already attached Notion file', { fileUploadCreateCount });

  const childrenResponse = await fetch(`https://api.notion.com/v1/blocks/${lastNotionPageId}/children?page_size=100`, {
    headers: {
      authorization: `Bearer ${token}`,
      'notion-version': '2026-03-11'
    }
  });
  if (!childrenResponse.ok) {
    throw new Error(`Could not inspect the synced Notion page: ${childrenResponse.status} ${await childrenResponse.text()}`);
  }
  const children = await childrenResponse.json();
  const nativeImages = children.results.filter((block) => block.type === 'image');
  assert(nativeImages.length === 1, 'The synced Notion page does not contain exactly one native image block', {
    pageId: lastNotionPageId,
    blockTypes: children.results.map((block) => block.type)
  });
  await page.setViewportSize({ width: 430, height: 1180 });
  await page.goto(`${appUrl}#write`);
  await page.waitForSelector('.ProseMirror');
  const mobileMetrics = await page.evaluate(() => {
    return {
      editorVisible: getComputedStyle(document.querySelector('#editor')).display !== 'none',
      hasProseMirror: Boolean(document.querySelector('.ProseMirror'))
    };
  });
  assert(mobileMetrics.editorVisible && mobileMetrics.hasProseMirror, 'Mobile write editor is not usable', mobileMetrics);
  await page.screenshot({ path: '/tmp/journaling-strict-write-mobile.png', fullPage: true });

  assert(consoleErrors.length === 0, 'Browser console/page errors occurred', consoleErrors);
  console.log(JSON.stringify({
    ok: true,
    lightMetrics,
    mobileMetrics,
    screenshots: [
      '/tmp/journaling-strict-write-light.png',
      '/tmp/journaling-strict-write-synced.png',
      '/tmp/journaling-strict-write-mobile.png'
    ]
  }, null, 2));
} finally {
  await context.close();
  server.close();
}
