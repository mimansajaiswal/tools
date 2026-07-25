import assert from 'node:assert/strict';
import { chromium } from '/tmp/journaling-playwright/node_modules/playwright/index.mjs';

const appUrl = process.env.JOURNALING_APP_URL || 'http://127.0.0.1:8000/journaling-app/';
const executablePath = '/Users/mimansajaiswal/Library/Caches/ms-playwright/chromium_headless_shell-1148/chrome-mac/headless_shell';
const byokRequests = [];
const context = await chromium.launchPersistentContext(`/tmp/journaling-ai-${Date.now()}`, {
  executablePath,
  headless: true,
  serviceWorkers: 'block',
  viewport: { width: 1280, height: 900 }
});

try {
  const page = context.pages()[0] || await context.newPage();
  await page.addInitScript(() => {
    window.__promptCalls = { availability: 0, creates: [], prompts: [], destroys: 0 };
    window.LanguageModel = {
      availability: async () => {
        window.__promptCalls.availability += 1;
        return 'available';
      },
      create: async (options) => {
        window.__promptCalls.creates.push(options);
        return {
          prompt: async (input) => {
            window.__promptCalls.prompts.push(input);
            return 'Prompt API response grounded in this journal.';
          },
          destroy: () => { window.__promptCalls.destroys += 1; }
        };
      }
    };
  });
  await page.route('https://ai.test/chat', async (route) => {
    byokRequests.push({ headers: route.request().headers(), body: route.request().postDataJSON() });
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: 'BYOK response grounded in this journal.' } }] }) });
  });

  await page.goto(`${appUrl}#write`);
  await page.waitForSelector('.ProseMirror');
  await page.click('#toggleStudioBtn');
  await page.waitForSelector('.rail-right');
  await page.selectOption('[name="aiProvider"]', 'prompt_api');
  await page.click('#settingsForm button[type="submit"]');
  await page.waitForTimeout(200);
  await page.click('#toggleSectionsBtn');
  await page.click('[data-view-link="reflect"]');
  await page.fill('#aiPromptInput', 'What pattern is present?');
  await page.click('[data-ai-action="chat"]');
  await page.waitForFunction(() => document.querySelector('#boardContent')?.textContent.includes('Prompt API response grounded in this journal.'));
  const promptState = await page.evaluate(() => window.__promptCalls);
  assert.equal(promptState.availability, 1);
  assert.equal(promptState.creates.length, 1);
  assert.equal(promptState.creates[0].initialPrompts[0].role, 'system');
  assert(String(promptState.prompts[0]).includes('What pattern is present?'));
  assert.equal(promptState.destroys, 1);

  await page.click('[data-view-link="write"]');
  await page.waitForSelector('.rail-right');
  await page.selectOption('[name="aiProvider"]', 'byok');
  await page.fill('[name="aiModel"]', 'journal-model');
  await page.fill('[name="aiEndpoint"]', 'https://ai.test/chat');
  await page.fill('[name="aiApiKey"]', 'ai-secret');
  await page.click('#settingsForm button[type="submit"]');
  await page.waitForTimeout(200);
  await page.click('[data-view-link="reflect"]');
  await page.fill('#aiPromptInput', 'What is the next action?');
  await page.click('[data-ai-action="chat"]');
  await page.waitForFunction(() => document.querySelector('#boardContent')?.textContent.includes('BYOK response grounded in this journal.'));
  assert.equal(byokRequests.length, 1);
  assert.equal(byokRequests[0].headers.authorization, 'Bearer ai-secret');
  assert.equal(byokRequests[0].body.model, 'journal-model');
  assert(byokRequests[0].body.messages.at(-1).content.includes('What is the next action?'));

  const history = await page.evaluate(async () => {
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
    return documents.find((item) => item.id === 'doc_today_personal')?.metadata?.aiHistory || [];
  });
  assert.equal(history.length, 2);
  assert.equal(history[0].reply, 'Prompt API response grounded in this journal.');
  assert.equal(history[1].reply, 'BYOK response grounded in this journal.');
  console.log(JSON.stringify({ ok: true, history: history.length }, null, 2));
} finally {
  await context.close();
}
