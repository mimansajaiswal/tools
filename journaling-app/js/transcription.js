const TRANSCRIPTION_PROVIDERS = Object.freeze([
    'none',
    'openai_byo_key',
    'google_byo_key',
    'anthropic_byo_key',
    'groq_byo_key',
    'deepgram_byo_key',
    'assemblyai_byo_key',
    'browser_native',
    'local_model'
]);

const TRANSCRIPTION_STATUSES = Object.freeze([
    'draft',
    'recording',
    'queued',
    'uploading',
    'transcribing',
    'ready',
    'error',
    'paused'
]);

const DEFAULT_TRANSCRIPTION_SETTINGS = Object.freeze({
    provider: 'none',
    apiKey: '',
    model: '',
    endpoint: '',
    language: 'auto',
    diarization: false,
    timestamps: true,
    preserveDisfluencies: false,
    storeOriginalAudio: true,
    storeOptimizedAudio: true,
    storeTranscriptMarkdown: true,
    storeTranscriptJson: true,
    autoInsertTranscript: 'collapsible',
    cleanupInstructions: '',
    rawInstructions: '',
    targetFormat: 'markdown',
    maxAudioMinutes: 60,
    preferredMimeType: 'audio/webm',
    transcriptionQuality: 'balanced'
});

const AUDIO_MIME_EXTENSIONS = Object.freeze({
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/x-m4a': 'm4a',
    'audio/aac': 'aac',
    'audio/flac': 'flac'
});

const createId = (prefix = 'ln') => `${prefix}_${crypto.randomUUID()}`;

const nowIso = () => new Date().toISOString();

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const coerceString = (value, fallback = '') => {
    if (value === null || value === undefined) return fallback;
    const text = String(value);
    return text.trim() ? text.trim() : fallback;
};

const coerceBoolean = (value, fallback = false) => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const text = String(value).trim().toLowerCase();
    if (!text) return fallback;
    return ['1', 'true', 'yes', 'on'].includes(text);
};

const coerceNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const pickEnum = (value, allowed, fallback) => {
    const text = coerceString(value, fallback);
    return allowed.includes(text) ? text : fallback;
};

export const normalizeTranscriptionSettings = (raw = {}) => {
    const settings = { ...DEFAULT_TRANSCRIPTION_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) };
    settings.provider = pickEnum(settings.provider, TRANSCRIPTION_PROVIDERS, 'none');
    settings.language = coerceString(settings.language, 'auto');
    settings.apiKey = coerceString(settings.apiKey, '');
    settings.model = coerceString(settings.model, '');
    settings.endpoint = coerceString(settings.endpoint, '');
    settings.diarization = coerceBoolean(settings.diarization, false);
    settings.timestamps = coerceBoolean(settings.timestamps, true);
    settings.preserveDisfluencies = coerceBoolean(settings.preserveDisfluencies, false);
    settings.storeOriginalAudio = coerceBoolean(settings.storeOriginalAudio, true);
    settings.storeOptimizedAudio = coerceBoolean(settings.storeOptimizedAudio, true);
    settings.storeTranscriptMarkdown = coerceBoolean(settings.storeTranscriptMarkdown, true);
    settings.storeTranscriptJson = coerceBoolean(settings.storeTranscriptJson, true);
    settings.autoInsertTranscript = pickEnum(settings.autoInsertTranscript, ['body', 'collapsible', 'attachment', 'off'], 'collapsible');
    settings.cleanupInstructions = coerceString(settings.cleanupInstructions, '');
    settings.rawInstructions = coerceString(settings.rawInstructions, '');
    settings.targetFormat = pickEnum(settings.targetFormat, ['markdown', 'plain', 'json'], 'markdown');
    settings.maxAudioMinutes = clamp(coerceNumber(settings.maxAudioMinutes, 60), 1, 600);
    settings.preferredMimeType = coerceString(settings.preferredMimeType, 'audio/webm') || 'audio/webm';
    settings.transcriptionQuality = pickEnum(settings.transcriptionQuality, ['fast', 'balanced', 'high'], 'balanced');
    return settings;
};

export const createAudioCaptureSettings = (raw = {}) => {
    const input = raw && typeof raw === 'object' ? raw : {};
    return {
        mimeType: coerceString(input.mimeType, 'audio/webm'),
        audioBitsPerSecond: coerceNumber(input.audioBitsPerSecond, 128000),
        channelCount: clamp(coerceNumber(input.channelCount, 1), 1, 2),
        sampleRate: clamp(coerceNumber(input.sampleRate, 48000), 8000, 96000),
        echoCancellation: coerceBoolean(input.echoCancellation, true),
        noiseSuppression: coerceBoolean(input.noiseSuppression, true),
        autoGainControl: coerceBoolean(input.autoGainControl, true)
    };
};

export const createRecordingSessionDraft = (raw = {}) => {
    const input = raw && typeof raw === 'object' ? raw : {};
    const createdAt = coerceString(input.createdAt, nowIso());
    return {
        id: coerceString(input.id, createId('rec')),
        documentId: coerceString(input.documentId, ''),
        title: coerceString(input.title, ''),
        status: pickEnum(input.status, TRANSCRIPTION_STATUSES, 'draft'),
        createdAt,
        startedAt: coerceString(input.startedAt, createdAt),
        endedAt: coerceString(input.endedAt, ''),
        mimeType: coerceString(input.mimeType, 'audio/webm'),
        captureSettings: createAudioCaptureSettings(input.captureSettings || {}),
        chunkCount: clamp(coerceNumber(input.chunkCount, 0), 0, Number.MAX_SAFE_INTEGER),
        durationMs: clamp(coerceNumber(input.durationMs, 0), 0, Number.MAX_SAFE_INTEGER),
        transcriptJobId: coerceString(input.transcriptJobId, ''),
        note: coerceString(input.note, ''),
        chunks: Array.isArray(input.chunks) ? input.chunks.map((chunk) => ({ ...chunk })) : []
    };
};

export const appendRecordingChunk = (session, chunk = {}) => {
    const next = session && typeof session === 'object' ? { ...session } : createRecordingSessionDraft();
    const nextChunk = {
        at: coerceString(chunk.at, nowIso()),
        size: clamp(coerceNumber(chunk.size, 0), 0, Number.MAX_SAFE_INTEGER),
        mimeType: coerceString(chunk.mimeType, next.mimeType || 'audio/webm'),
        durationMs: clamp(coerceNumber(chunk.durationMs, 0), 0, Number.MAX_SAFE_INTEGER)
    };
    next.chunks = Array.isArray(next.chunks) ? next.chunks.slice() : [];
    next.chunks.push(nextChunk);
    next.chunkCount = next.chunks.length;
    next.durationMs = clamp(next.durationMs + nextChunk.durationMs, 0, Number.MAX_SAFE_INTEGER);
    next.status = 'recording';
    return next;
};

const resolveAudioExtension = (mimeType) => AUDIO_MIME_EXTENSIONS[coerceString(mimeType, 'audio/webm')] || 'webm';

export const buildAudioAssetPath = (asset) => {
    const input = asset && typeof asset === 'object' ? asset : {};
    const assetId = coerceString(input.id, createId('audio'));
    return coerceString(input.path, `assets/${assetId}.${resolveAudioExtension(input.mimeType)}`);
};

export const createAudioUploadMetadata = (raw = {}) => {
    const input = raw && typeof raw === 'object' ? raw : {};
    const createdAt = coerceString(input.createdAt, nowIso());
    const mimeType = coerceString(input.mimeType, 'audio/webm');
    const id = coerceString(input.id, createId('audio'));
    return {
        id,
        documentId: coerceString(input.documentId, ''),
        transcriptJobId: coerceString(input.transcriptJobId, ''),
        title: coerceString(input.title, ''),
        source: pickEnum(input.source, ['recording', 'upload'], 'recording'),
        status: pickEnum(input.status, ['draft', 'local', 'queued', 'uploaded', 'synced', 'error'], 'draft'),
        createdAt,
        updatedAt: coerceString(input.updatedAt, createdAt),
        mimeType,
        size: clamp(coerceNumber(input.size, 0), 0, Number.MAX_SAFE_INTEGER),
        durationMs: clamp(coerceNumber(input.durationMs, 0), 0, Number.MAX_SAFE_INTEGER),
        fileName: coerceString(input.fileName, `${id}.${resolveAudioExtension(mimeType)}`),
        localPath: coerceString(input.localPath, ''),
        remotePath: coerceString(input.remotePath, buildAudioAssetPath({ id, mimeType })),
        previewPath: coerceString(input.previewPath, ''),
        checksum: coerceString(input.checksum, ''),
        notes: coerceString(input.notes, ''),
        uploadedAt: coerceString(input.uploadedAt, ''),
        syncedAt: coerceString(input.syncedAt, ''),
        preserveOriginal: coerceBoolean(input.preserveOriginal, true)
    };
};

export const normalizeAudioUploadMetadata = (raw = {}) => createAudioUploadMetadata(raw);

export const finalizeRecordingSession = (session, raw = {}) => {
    const input = raw && typeof raw === 'object' ? raw : {};
    const draft = session && typeof session === 'object' ? { ...session } : createRecordingSessionDraft();
    const createdAt = coerceString(input.createdAt, nowIso());
    const metadata = createAudioUploadMetadata({
        id: input.id || draft.id,
        documentId: input.documentId || draft.documentId,
        transcriptJobId: input.transcriptJobId || draft.transcriptJobId,
        title: input.title || draft.title,
        source: input.source || 'recording',
        status: input.status || 'local',
        createdAt,
        updatedAt: coerceString(input.updatedAt, createdAt),
        mimeType: input.mimeType || draft.mimeType,
        size: input.size,
        durationMs: input.durationMs || draft.durationMs,
        fileName: input.fileName,
        localPath: input.localPath,
        remotePath: input.remotePath,
        previewPath: input.previewPath,
        checksum: input.checksum,
        notes: input.notes,
        uploadedAt: input.uploadedAt,
        syncedAt: input.syncedAt,
        preserveOriginal: input.preserveOriginal
    });
    return {
        ...draft,
        id: metadata.id,
        status: 'paused',
        endedAt: coerceString(input.endedAt, createdAt),
        durationMs: clamp(coerceNumber(input.durationMs, draft.durationMs), 0, Number.MAX_SAFE_INTEGER),
        transcriptJobId: metadata.transcriptJobId,
        audio: metadata
    };
};

export const createTranscriptionJob = (raw = {}) => {
    const input = raw && typeof raw === 'object' ? raw : {};
    const settings = normalizeTranscriptionSettings(input.settings || {});
    const createdAt = coerceString(input.createdAt, nowIso());
    const id = coerceString(input.id, createId('tx'));
    return {
        id,
        documentId: coerceString(input.documentId, ''),
        sourceAudioId: coerceString(input.sourceAudioId, ''),
        sourceAudio: input.sourceAudio && typeof input.sourceAudio === 'object' ? { ...normalizeAudioUploadMetadata(input.sourceAudio) } : null,
        title: coerceString(input.title, ''),
        provider: settings.provider,
        model: coerceString(input.model, settings.model),
        endpoint: coerceString(input.endpoint, settings.endpoint),
        language: coerceString(input.language, settings.language),
        diarization: coerceBoolean(input.diarization, settings.diarization),
        timestamps: coerceBoolean(input.timestamps, settings.timestamps),
        preserveDisfluencies: coerceBoolean(input.preserveDisfluencies, settings.preserveDisfluencies),
        cleanupInstructions: coerceString(input.cleanupInstructions, settings.cleanupInstructions),
        rawInstructions: coerceString(input.rawInstructions, settings.rawInstructions),
        targetFormat: pickEnum(input.targetFormat, ['markdown', 'plain', 'json'], settings.targetFormat),
        autoInsertTranscript: pickEnum(input.autoInsertTranscript, ['body', 'collapsible', 'attachment', 'off'], settings.autoInsertTranscript),
        status: pickEnum(input.status, TRANSCRIPTION_STATUSES, 'draft'),
        createdAt,
        updatedAt: coerceString(input.updatedAt, createdAt),
        queuedAt: coerceString(input.queuedAt, ''),
        startedAt: coerceString(input.startedAt, ''),
        finishedAt: coerceString(input.finishedAt, ''),
        error: coerceString(input.error, ''),
        attemptCount: clamp(coerceNumber(input.attemptCount, 0), 0, Number.MAX_SAFE_INTEGER),
        transcriptId: coerceString(input.transcriptId, ''),
        transcriptText: coerceString(input.transcriptText, ''),
        transcriptJson: input.transcriptJson && typeof input.transcriptJson === 'object' ? { ...input.transcriptJson } : null,
        transcriptSegments: Array.isArray(input.transcriptSegments) ? input.transcriptSegments.map((segment) => ({ ...segment })) : [],
        speakerLabels: Array.isArray(input.speakerLabels) ? input.speakerLabels.slice() : [],
        storeOriginalAudio: coerceBoolean(input.storeOriginalAudio, settings.storeOriginalAudio),
        storeOptimizedAudio: coerceBoolean(input.storeOptimizedAudio, settings.storeOptimizedAudio),
        storeTranscriptMarkdown: coerceBoolean(input.storeTranscriptMarkdown, settings.storeTranscriptMarkdown),
        storeTranscriptJson: coerceBoolean(input.storeTranscriptJson, settings.storeTranscriptJson),
        maxAudioMinutes: clamp(coerceNumber(input.maxAudioMinutes, settings.maxAudioMinutes), 1, 600),
        quality: pickEnum(input.quality, ['fast', 'balanced', 'high'], settings.transcriptionQuality),
        settings
    };
};

export const normalizeTranscriptionJob = (raw = {}) => {
    const job = createTranscriptionJob(raw);
    job.status = pickEnum(raw.status, TRANSCRIPTION_STATUSES, job.status);
    job.attemptCount = clamp(coerceNumber(raw.attemptCount, job.attemptCount), 0, Number.MAX_SAFE_INTEGER);
    job.error = coerceString(raw.error, job.error);
    return job;
};

export const updateTranscriptionJob = (job, patch = {}) => {
    const current = normalizeTranscriptionJob(job || {});
    const input = patch && typeof patch === 'object' ? patch : {};
    return normalizeTranscriptionJob({
        ...current,
        ...input,
        settings: input.settings ? normalizeTranscriptionSettings(input.settings) : current.settings,
        updatedAt: coerceString(input.updatedAt, nowIso())
    });
};

export const setTranscriptionJobStatus = (job, status, patch = {}) => {
    const nextStatus = pickEnum(status, TRANSCRIPTION_STATUSES, 'draft');
    return updateTranscriptionJob(job, {
        ...patch,
        status: nextStatus,
        updatedAt: nowIso()
    });
};

export const createTranscriptArtifact = (raw = {}) => {
    const input = raw && typeof raw === 'object' ? raw : {};
    const createdAt = coerceString(input.createdAt, nowIso());
    const format = pickEnum(input.format, ['markdown', 'plain', 'json'], 'markdown');
    const id = coerceString(input.id, createId('tr'));
    return {
        id,
        jobId: coerceString(input.jobId, ''),
        documentId: coerceString(input.documentId, ''),
        format,
        language: coerceString(input.language, 'auto'),
        text: coerceString(input.text, ''),
        summary: coerceString(input.summary, ''),
        speakerLabels: Array.isArray(input.speakerLabels) ? input.speakerLabels.slice() : [],
        segments: Array.isArray(input.segments) ? input.segments.map((segment) => ({ ...segment })) : [],
        createdAt,
        updatedAt: coerceString(input.updatedAt, createdAt),
        path: coerceString(input.path, `transcripts/${id}.${format === 'json' ? 'json' : 'md'}`),
        status: pickEnum(input.status, ['draft', 'ready', 'synced', 'error'], 'draft'),
        sourceAudioId: coerceString(input.sourceAudioId, ''),
        metadata: input.metadata && typeof input.metadata === 'object' ? { ...input.metadata } : {}
    };
};

export const buildTranscriptBundle = (job, transcript = {}) => {
    const normalizedJob = normalizeTranscriptionJob(job || {});
    const artifact = createTranscriptArtifact({
        ...transcript,
        jobId: normalizedJob.id,
        documentId: normalizedJob.documentId,
        sourceAudioId: normalizedJob.sourceAudioId,
        language: transcript.language || normalizedJob.language,
        status: transcript.status || 'draft'
    });
    return {
        job: normalizedJob,
        transcript: artifact,
        audio: normalizedJob.sourceAudio ? normalizeAudioUploadMetadata(normalizedJob.sourceAudio) : null,
        settings: normalizedJob.settings
    };
};

export const buildTranscriptionPrompt = (job, context = {}) => {
    const normalizedJob = normalizeTranscriptionJob(job || {});
    const input = context && typeof context === 'object' ? context : {};
    const instructions = [
        normalizedJob.rawInstructions,
        normalizedJob.cleanupInstructions,
        input.instructions
    ].filter(Boolean).join('\n\n');
    const system = [
        'You transcribe audio into clean, structured text.',
        normalizedJob.preserveDisfluencies ? 'Preserve filler words and hesitations where useful.' : 'Remove filler words and normalize the text.',
        normalizedJob.diarization ? 'Preserve speaker turns if the audio contains multiple speakers.' : 'Single-speaker transcript unless the audio clearly indicates otherwise.',
        normalizedJob.timestamps ? 'Include timestamps when they help the transcript.' : 'Do not include timestamps unless explicitly useful.',
        normalizedJob.targetFormat === 'json' ? 'Return JSON only.' : 'Return readable prose and preserve transcript structure.',
        normalizedJob.language !== 'auto' ? `Language: ${normalizedJob.language}.` : 'Detect the spoken language automatically.'
    ].join(' ');
    const user = [
        instructions,
        input.topic ? `Topic: ${input.topic}` : '',
        input.context ? `Context: ${input.context}` : ''
    ].filter(Boolean).join('\n');
    return {
        system,
        user,
        settings: normalizedJob.settings
    };
};

export const buildTranscriptInsertion = (artifact, mode = 'collapsible') => {
    const transcript = createTranscriptArtifact(artifact || {});
    const text = transcript.text || '';
    if (mode === 'off') return { mode, blocks: [] };
    if (mode === 'attachment') {
        return {
            mode,
            blocks: [
                {
                    type: 'attachment',
                    title: 'Transcript',
                    path: transcript.path,
                    metadata: transcript.metadata
                }
            ]
        };
    }
    if (mode === 'body') {
        return {
            mode,
            blocks: [{ type: 'paragraph', text }]
        };
    }
    return {
        mode: 'collapsible',
        blocks: [
            {
                type: 'collapsible',
                title: 'Transcript',
                blocks: [
                    {
                        type: 'paragraph',
                        text
                    }
                ]
            }
        ]
    };
};

export const transcriptionModule = Object.freeze({
    TRANSCRIPTION_PROVIDERS,
    TRANSCRIPTION_STATUSES,
    DEFAULT_TRANSCRIPTION_SETTINGS,
    normalizeTranscriptionSettings,
    createAudioCaptureSettings,
    createRecordingSessionDraft,
    appendRecordingChunk,
    buildAudioAssetPath,
    createAudioUploadMetadata,
    normalizeAudioUploadMetadata,
    finalizeRecordingSession,
    createTranscriptionJob,
    normalizeTranscriptionJob,
    updateTranscriptionJob,
    setTranscriptionJobStatus,
    createTranscriptArtifact,
    buildTranscriptBundle,
    buildTranscriptionPrompt,
    buildTranscriptInsertion
});

export default transcriptionModule;
