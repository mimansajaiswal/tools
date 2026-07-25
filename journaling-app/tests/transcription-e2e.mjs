import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '/tmp/journaling-playwright/node_modules/playwright/index.mjs';

const appUrl = process.env.JOURNALING_APP_URL || 'http://127.0.0.1:8000/journaling-app/';
const executablePath = '/Users/mimansajaiswal/Library/Caches/ms-playwright/chromium_headless_shell-1148/chrome-mac/headless_shell';
const requests = [];
const context = await chromium.launchPersistentContext(`/tmp/journaling-transcription-${Date.now()}`, {
  executablePath,
  headless: true,
  serviceWorkers: 'block',
  viewport: { width: 1280, height: 900 }
});

try {
  const page = context.pages()[0] || await context.newPage();
  await page.route('https://transcribe.test/audio', async (route) => {
    const request = route.request();
    requests.push({
      authorization: request.headers().authorization,
      contentType: request.headers()['content-type'],
      body: request.postDataBuffer()?.toString('utf8') || ''
    });
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ transcript: 'Custom transcript from uploaded audio.' }) });
  });

  await page.goto(`${appUrl}#write`);
  await page.waitForSelector('.ProseMirror');
  await page.click('#toggleSectionsBtn');
  await page.click('[data-view-link="transcribe"]');
  await page.waitForSelector('#transcribe:not([hidden])');
  await page.selectOption('#transcriptionProviderInput', 'custom_endpoint');
  await page.fill('#transcriptionApiKeyInput', 'transcription-secret');
  await page.fill('#transcriptionEndpointInput', 'https://transcribe.test/audio');
  await page.fill('#transcriptionModelInput', 'personal-stt');
  await page.fill('#transcriptionLanguageInput', 'en-US');
  await page.fill('#transcriptionInstructionsInput', 'Keep product names exact.');
  await page.selectOption('#transcriptionInsertModeInput', 'collapsible');
  await page.click('#transcriptionSettingsForm button[type="submit"]');

  const audioPath = '/tmp/journaling-transcription-note.webm';
  fs.writeFileSync(audioPath, Buffer.from('synthetic-webm-audio'));
  await page.setInputFiles('#audioUploadInput', audioPath);
  await page.waitForFunction(() => document.querySelector('#recordingStatus')?.textContent.includes('uploaded, attached, and transcribed'));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].authorization, 'Bearer transcription-secret');
  assert(requests[0].contentType.includes('multipart/form-data'));
  assert(requests[0].body.includes('personal-stt'));
  assert(requests[0].body.includes('Keep product names exact.'));

  await page.click('[data-view-link="write"]');
  await page.waitForSelector('#editor:not([hidden])');
  assert.equal(await page.locator('.ProseMirror .audio-embed[data-asset-id]').count(), 1);
  const editorDiagnostic = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('JournalingAppDB_journaling-app');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const documents = await new Promise((resolve, reject) => {
      const request = db.transaction('documents').objectStore('documents').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const doc = documents.find((item) => item.id === 'doc_today_personal');
    return { editorText: document.querySelector('.ProseMirror')?.textContent || '', blocks: doc?.blocks || [], transcripts: doc?.transcripts || [] };
  });
  assert(editorDiagnostic.editorText.includes('Custom transcript from uploaded audio.'), `Transcript was not rendered: ${JSON.stringify(editorDiagnostic, null, 2)}`);
  const nestedTranscript = page.locator('.ProseMirror .toggle-content p').last();
  await nestedTranscript.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' Edited in toggle.');
  await page.waitForTimeout(900);
  assert((await page.locator('.ProseMirror').textContent()).includes('Edited in toggle.'));

  const persisted = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('JournalingAppDB_journaling-app');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const readAll = (name) => new Promise((resolve, reject) => {
      const request = db.transaction(name).objectStore(name).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const [documents, assets, settings, queue] = await Promise.all([
      readAll('documents'), readAll('assets'), readAll('settings'), readAll('syncQueue')
    ]);
    const doc = documents.find((item) => item.id === 'doc_today_personal');
    const audio = assets.find((item) => item.kind === 'audio' && item.originalName === 'journaling-transcription-note.webm');
    return {
      transcript: doc?.transcripts?.at(-1),
      audioHasBlob: audio?.metadata?.blob instanceof Blob,
      audioId: audio?.id || '',
      ai: settings[0]?.value?.ai || {},
      queuedTypes: queue.filter((job) => ['asset', 'document'].includes(job.type)).map((job) => job.type)
    };
  });
  assert.equal(persisted.transcript.text, 'Custom transcript from uploaded audio.');
  assert.equal(persisted.transcript.sourceAudioId, persisted.audioId);
  assert.equal(persisted.transcript.metadata.provider, 'custom_endpoint');
  assert.equal(persisted.audioHasBlob, true);
  assert.equal(persisted.ai.transcriptionApiKey, 'transcription-secret');
  assert.equal(persisted.ai.transcriptionEndpoint, 'https://transcribe.test/audio');
  assert(persisted.queuedTypes.includes('asset'));
  assert(persisted.queuedTypes.includes('document'));

  await page.reload();
  await page.waitForSelector('.ProseMirror .audio-embed[data-asset-id]');
  assert((await page.locator('.ProseMirror').textContent()).includes('Edited in toggle.'));
  console.log(JSON.stringify({ ok: true, transcriptId: persisted.transcript.id }, null, 2));
} finally {
  await context.close();
}
