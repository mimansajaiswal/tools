import assert from 'node:assert/strict';
import { transcribeAudio } from '../js/transcription-service.js';

const originalFetch = globalThis.fetch;
const calls = [];
globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('openai')) return Response.json({ text: 'OpenAI transcript' });
    if (String(url).includes('googleapis')) return Response.json({ candidates: [{ content: { parts: [{ text: 'Gemini transcript' }] } }] });
    if (String(url).includes('deepgram')) return Response.json({ results: { channels: [{ alternatives: [{ transcript: 'Deepgram transcript' }] }] } });
    return Response.json({ transcript: 'Custom transcript' });
};

try {
    const blob = new Blob(['audio'], { type: 'audio/webm' });
    assert.equal((await transcribeAudio({ provider: 'openai_byo_key', apiKey: 'openai-key', language: 'en' }, blob, 'note.webm')).text, 'OpenAI transcript');
    const openai = calls.at(-1);
    assert.equal(openai.options.headers.Authorization, 'Bearer openai-key');
    assert(openai.options.body instanceof FormData);
    assert.equal(openai.options.body.get('model'), 'gpt-4o-mini-transcribe');
    assert.equal(openai.options.body.get('language'), 'en');

    assert.equal((await transcribeAudio({ provider: 'google_byo_key', apiKey: 'google-key', instructions: 'Exact words.' }, blob)).text, 'Gemini transcript');
    const gemini = calls.at(-1);
    assert.equal(gemini.options.headers['x-goog-api-key'], 'google-key');
    const geminiBody = JSON.parse(gemini.options.body);
    assert.equal(geminiBody.contents[0].parts[0].inline_data.mime_type, 'audio/webm');
    assert.equal(geminiBody.contents[0].parts[1].text, 'Exact words.');

    assert.equal((await transcribeAudio({ provider: 'deepgram_byo_key', apiKey: 'deepgram-key', language: 'en-US' }, blob)).text, 'Deepgram transcript');
    const deepgram = calls.at(-1);
    assert(deepgram.url.includes('model=nova-3'));
    assert(deepgram.url.includes('language=en-US'));
    assert.equal(deepgram.options.headers.Authorization, 'Token deepgram-key');
    assert.equal(deepgram.options.body, blob);

    assert.equal((await transcribeAudio({ provider: 'custom_endpoint', endpoint: 'https://custom.test/transcribe', apiKey: 'custom-key', model: 'own-model' }, blob, 'note.webm')).text, 'Custom transcript');
    const custom = calls.at(-1);
    assert.equal(custom.options.headers.Authorization, 'Bearer custom-key');
    assert.equal(custom.options.body.get('model'), 'own-model');
} finally {
    globalThis.fetch = originalFetch;
}

console.log(JSON.stringify({ ok: true, providers: 4 }, null, 2));
