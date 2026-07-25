const GEMINI_INLINE_LIMIT = 20 * 1024 * 1024;

const text = (value = '') => String(value || '').trim();

function apiError(provider, response, message) {
    return new Error(message || `${provider} transcription failed with ${response.status}`);
}

async function parseError(response) {
    const body = await response.text();
    try {
        const parsed = JSON.parse(body);
        return parsed.error?.message || parsed.message || parsed.errors?.[0]?.message || body;
    } catch {
        return body;
    }
}

function extractTranscript(payload = {}) {
    return text(
        payload.text
        || payload.transcript
        || payload.output_text
        || payload.result?.text
        || payload.data?.text
        || payload.results?.channels?.[0]?.alternatives?.[0]?.transcript
        || payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n')
    );
}

async function readJsonTranscript(provider, response) {
    if (!response.ok) throw apiError(provider, response, await parseError(response));
    const payload = await response.json();
    const transcript = extractTranscript(payload);
    if (!transcript) throw new Error(`${provider} returned no transcript text`);
    return { text: transcript, payload };
}

function audioForm(blob, filename, settings) {
    const form = new FormData();
    form.append('file', blob, filename);
    if (text(settings.model)) form.append('model', text(settings.model));
    if (text(settings.language) && settings.language !== 'auto') form.append('language', text(settings.language));
    if (text(settings.instructions)) form.append('prompt', text(settings.instructions));
    return form;
}

async function blobToBase64(blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    const chunkSize = 32 * 1024;
    for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + chunkSize, bytes.length)));
    }
    return btoa(binary);
}

export async function transcribeAudio(settings = {}, blob, filename = 'audio.webm') {
    if (!(blob instanceof Blob)) throw new Error('Transcription requires an audio Blob');
    const provider = text(settings.provider);
    const apiKey = text(settings.apiKey);
    const model = text(settings.model);
    const language = text(settings.language) || 'auto';
    const instructions = text(settings.instructions) || 'Transcribe this audio accurately. Preserve paragraph breaks and speaker changes when clear.';

    if (provider === 'browser_native') throw new Error('Browser-native transcription only works during live recording');

    if (provider === 'openai_byo_key') {
        if (!apiKey) throw new Error('OpenAI transcription requires an API key');
        const endpoint = text(settings.endpoint) || 'https://api.openai.com/v1/audio/transcriptions';
        const form = audioForm(blob, filename, { model: model || 'gpt-4o-mini-transcribe', language, instructions });
        return readJsonTranscript('OpenAI', await fetch(endpoint, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form
        }));
    }

    if (provider === 'google_byo_key') {
        if (!apiKey) throw new Error('Gemini transcription requires an API key');
        if (blob.size >= GEMINI_INLINE_LIMIT) throw new Error('Gemini inline transcription requires audio smaller than 20 MB');
        const selectedModel = model || 'gemini-3.5-flash';
        const endpoint = text(settings.endpoint) || `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent`;
        const data = await blobToBase64(blob);
        return readJsonTranscript('Gemini', await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [
                    { inline_data: { mime_type: blob.type || 'audio/webm', data } },
                    { text: instructions }
                ] }]
            })
        }));
    }

    if (provider === 'deepgram_byo_key') {
        if (!apiKey) throw new Error('Deepgram transcription requires an API key');
        const endpoint = new URL(text(settings.endpoint) || 'https://api.deepgram.com/v1/listen');
        endpoint.searchParams.set('model', model || 'nova-3');
        endpoint.searchParams.set('smart_format', 'true');
        if (language !== 'auto') endpoint.searchParams.set('language', language);
        return readJsonTranscript('Deepgram', await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Token ${apiKey}`,
                'Content-Type': blob.type || 'application/octet-stream'
            },
            body: blob
        }));
    }

    if (provider === 'custom_endpoint' || provider === 'local_model') {
        const endpoint = text(settings.endpoint);
        if (!endpoint) throw new Error('Custom transcription requires an endpoint');
        const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
        const form = audioForm(blob, filename, { model, language, instructions });
        return readJsonTranscript(provider === 'local_model' ? 'Local model' : 'Custom endpoint', await fetch(endpoint, {
            method: 'POST', headers, body: form
        }));
    }

    throw new Error('Choose a transcription provider');
}
