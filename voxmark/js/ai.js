function buildAiPayload(session, chunk = null) {
  const base = chunk || {
    transcript: session.transcript,
    transcriptSegments: session.segments,
    snapshots: session.snapshots,
    taps: session.taps,
    contextHistory: session.pdfContextHistory
  };
  return {
    transcript: base.transcript,
    transcriptSegments: base.transcriptSegments,
    timestamps: base.snapshots.map((snap) => snap.timestamp),
    snapshots: base.snapshots,
    taps: base.taps,
    contextHistory: base.contextHistory,
    activePdfId: base.snapshots[base.snapshots.length - 1]?.pdfId || null,
    recentSnapshots: base.snapshots.slice(-5),
    audioChunkTimestamps: session.audioChunks.map((chunk) => chunk.timestamp),
    chunkMeta: base.chunkMeta || null
  };
}

function getSystemPrompt() {
  const palette = getPaletteForPrompt();
  const paletteList = palette.length
    ? palette.map((c) => c.name).join(", ")
    : "Yellow, Blue, Red, Green, Purple, Pink";
  const paletteDetails = palette.length
    ? palette.map((c) => `${c.name} (${c.color})`).join(", ")
    : "Yellow (#f9de6f), Blue (#6f9fe6), Red (#e56b6b), Green (#6dbb8a), Purple (#b1a0d4), Pink (#d9a0b5)";
  return `
You are VoxMark, a PDF annotation parser.
Return ONLY valid JSON. No markdown, no code fences, no extra text.
If there are no annotations, return {"annotations": []}.
Schema:
{
  "annotations": [
    {
      "type": "highlight|underline|strikethrough|note|bbox",
      "pageIndex": number,
      "color": "one of the palette color names",
      "comment": "string",
      "target": {
        "mode": "text|bbox|tapFocus|auto",
        "text": {
          "exact": "string",
          "quote": "string",
          "startHint": "string",
          "endHint": "string"
        },
        "bbox": { "x": number, "y": number, "width": number, "height": number, "unit": "pdf" },
        "tapFocusIndex": number,
        "confidence": number
      },
      "contextRef": {
        "previousSection": boolean,
        "previousPdf": boolean,
        "recordingIndex": number
      }
    }
  ]
}
Guidelines:
- Use text anchors (target.text) when possible. Use bbox or tapFocus for figures/tables or when text is unavailable.
- Use 0-based pageIndex.
- Use color names EXACTLY as listed; if the user doesn't specify a color, choose the closest from the palette.
- Use contextRef.previousSection or contextRef.previousPdf when referencing prior sections or files.
Palette names: ${paletteList}.
Palette reference: ${paletteDetails}.
`;
}

async function callAi(payload) {
  if (state.settings.mockAI) {
    return mockAi(payload);
  }
  if (!navigator.onLine) {
    notify("AI Processing", "You are offline. Enable mock AI or process later.", {
      type: "error",
      duration: 4000
    });
    return null;
  }
  if (!state.settings.aiKey && !state.settings.mockAI) {
    notify("AI Processing", "Missing AI API key.", { type: "error", duration: 4000 });
    return null;
  }
  const provider = state.settings.aiProvider;
  const model = state.settings.aiModel;
  const prompt = state.settings.customPrompt ? `\nUser prompt: ${state.settings.customPrompt}` : "";
  const systemPrompt = getSystemPrompt();
  const userContent = JSON.stringify(payload);

  if (provider === "openai") {
    const response = await retryFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${state.settings.aiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt + prompt },
          { role: "user", content: userContent }
        ]
      })
    });
    const data = await response.json();
    return safeJsonParse(data.choices?.[0]?.message?.content || "");
  }

  if (provider === "anthropic") {
    const response = await retryFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": state.settings.aiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        messages: [{ role: "user", content: systemPrompt + prompt + "\n" + userContent }]
      })
    });
    const data = await response.json();
    return safeJsonParse(data.content?.[0]?.text || "");
  }

  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${state.settings.aiKey}`;
    const response = await retryFetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: systemPrompt + prompt + "\n" + userContent }] }]
      })
    });
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return safeJsonParse(text);
  }

  notify("AI Processing", "AI provider not configured.");
  return null;
}

function safeJsonParse(text) {
  try {
    const trimmed = (text || "").trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const jsonText = trimmed.slice(start, end + 1);
    return JSON.parse(jsonText);
  } catch (err) {
    notify("AI Processing", "Failed to parse AI response.");
    return null;
  }
}

function getPaletteForPrompt() {
  const palette = Array.isArray(state.settings.colorPalette)
    ? state.settings.colorPalette
    : [];
  return palette
    .map((entry) => ({
      name: String(entry.name || "").trim(),
      color: String(entry.color || "").trim()
    }))
    .filter((entry) => entry.name);
}

function mockAi(payload) {
  const snapshot = payload.snapshots?.[payload.snapshots.length - 1];
  const pageIndex = snapshot?.pages?.[0]?.pageIndex || 0;
  return {
    annotations: [
      {
        type: "highlight",
        pageIndex,
        color: "yellow",
        comment: "Mock: highlight this section.",
        target: {
          mode: "auto",
          text: { exact: "", quote: "", startHint: "", endHint: "" },
          bbox: { x: 60, y: 100, width: 200, height: 40, unit: "pdf" },
          tapFocusIndex: 0,
          confidence: 0.4
        },
        contextRef: {
          previousSection: false,
          previousPdf: false,
          recordingIndex: 0
        }
      }
    ]
  };
}

async function transcribeAudio(session) {
  const provider = state.settings.sttProvider;
  if (provider === "native") {
    return session.transcript || "";
  }
  if (!state.settings.sttKey && provider !== "native") {
    notify("Speech-to-Text", "Missing STT API key.", { type: "error", duration: 4000 });
    return "";
  }
  logEvent({
    title: "STT request",
    detail: { provider, model: state.settings.sttModel },
    sessionId: session.id
  });
  const blobs = session.audioChunks.map((chunk) => chunk.blob);
  const audioBlob = new Blob(blobs, { type: "audio/webm" });
  if (provider === "openai") {
    const form = new FormData();
    form.append("file", audioBlob, "audio.webm");
    form.append("model", state.settings.sttModel || "whisper-1");
    if (state.settings.sttPrompt) form.append("prompt", state.settings.sttPrompt);
    const response = await retryFetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${state.settings.sttKey}`
      },
      body: form
    });
    const data = await response.json();
    logEvent({
      title: "STT response",
      detail: data,
      sessionId: session.id
    });
    return data.text || "";
  }
  if (provider === "gemini" || provider === "anthropic") {
    notify("Speech-to-Text", "STT provider not implemented.", { type: "error", duration: 4000 });
    logEvent({
      title: "STT unsupported",
      detail: { provider, message: "Not implemented." },
      sessionId: session.id
    });
    return "";
  }
  notify("Speech-to-Text", "STT provider not implemented.", { type: "error", duration: 4000 });
  logEvent({
    title: "STT fallback",
    detail: { provider, message: "Not implemented." },
    sessionId: session.id
  });
  return "";
}

async function processSession(session) {
  if (!session) return false;
  const queued = state.queue.find((item) => item.id === session.id);
  if (queued) {
    session.status = "processing";
    session.lastError = "";
    if (typeof updateQueueItem === "function") {
      updateQueueItem(session);
    }
  }
  notify("Processing", "Processing annotation...");
  setLoading(true);
  try {
    if (!session.transcript && !session.audioChunks.length && !state.settings.mockAI) {
      notify("Processing", "No audio captured for this session.");
      session.status = "failed";
      session.lastError = "No audio captured.";
      session.attempts = (session.attempts || 0) + 1;
      if (typeof updateQueueItem === "function") {
        updateQueueItem(session);
      }
      return false;
    }
    const transcript = session.transcript || (state.settings.mockAI ? "" : await transcribeAudio(session));
    session.transcript = transcript || "";
    if (!session.transcript && !state.settings.mockAI) {
      notify("Processing", "Transcription failed. Check STT settings.");
      session.status = "failed";
      session.lastError = "Transcription failed.";
      session.attempts = (session.attempts || 0) + 1;
      if (typeof updateQueueItem === "function") {
        updateQueueItem(session);
      }
      return false;
    }
    const chunks = splitSessionForProcessing(session);
    logEvent({
      title: "Processing started",
      detail: { sessionId: session.id, chunks: chunks.length },
      sessionId: session.id
    });
    let chunkIndex = 0;
    let anyResponse = false;
    const processedChunks = new Set(session.processedChunks || []);
    for (const chunk of chunks) {
      chunkIndex += 1;
      if (processedChunks.has(chunkIndex)) continue;
      const payload = buildAiPayload(session, chunk);
      logEvent({
        title: `AI request (chunk ${chunkIndex}/${chunks.length})`,
        detail: payload,
        sessionId: session.id
      });
      const response = await callAi(payload);
      if (response) {
        anyResponse = true;
        await applyAnnotations(response, session);
        processedChunks.add(chunkIndex);
        logEvent({
          title: `AI response (chunk ${chunkIndex}/${chunks.length})`,
          detail: response,
          sessionId: session.id
        });
      }
    }
    session.processedChunks = Array.from(processedChunks).sort((a, b) => a - b);
    if (!anyResponse || processedChunks.size < chunks.length) {
      session.status = "failed";
      session.lastError = "AI processing incomplete.";
      session.attempts = (session.attempts || 0) + 1;
      if (typeof updateQueueItem === "function") {
        updateQueueItem(session);
      }
      notify("Processing", "Processing incomplete. Session kept in queue.", {
        type: "error",
        duration: 4000
      });
      logEvent({
        title: "Processing incomplete",
        detail: {
          sessionId: session.id,
          processed: processedChunks.size,
          total: chunks.length
        },
        sessionId: session.id
      });
      return false;
    }
    session.status = "processed";
    session.lastError = "";
    notify("Processing", "Annotations applied.");
    logEvent({
      title: "Processing complete",
      detail: { sessionId: session.id },
      sessionId: session.id
    });
    return true;
  } catch (error) {
    notify("Processing", "Processing failed. Please retry.");
    session.status = "failed";
    session.lastError = error?.message || "Processing failed.";
    session.attempts = (session.attempts || 0) + 1;
    if (typeof updateQueueItem === "function") {
      updateQueueItem(session);
    }
    logEvent({
      title: "Processing failed",
      detail: error?.message || "Unknown error",
      sessionId: session.id
    });
  } finally {
    setLoading(false);
  }
  return false;
}

function splitSessionForProcessing(session) {
  const snapshots = session.snapshots || [];
  const transcript = session.transcript || "";
  if (!snapshots.length) {
    return [
      {
        transcript,
        transcriptSegments: session.segments || [],
        snapshots: [],
        taps: session.taps || [],
        contextHistory: session.pdfContextHistory || [],
        chunkMeta: { index: 1, total: 1 }
      }
    ];
  }
  const maxSnapshots = 12;
  const maxChars = 2000;
  const chunkCount = Math.max(
    1,
    Math.ceil(snapshots.length / maxSnapshots),
    Math.ceil(transcript.length / maxChars)
  );
  if (chunkCount === 1) {
    return [
      {
        transcript,
        transcriptSegments: session.segments || [],
        snapshots,
        taps: session.taps || [],
        contextHistory: session.pdfContextHistory || [],
        chunkMeta: { index: 1, total: 1 }
      }
    ];
  }
  const snapshotsPerChunk = Math.ceil(snapshots.length / chunkCount);
  const transcriptChunks = splitTranscript(transcript, chunkCount);
  const chunks = [];
  for (let i = 0; i < chunkCount; i++) {
    const startIndex = i * snapshotsPerChunk;
    const endIndex = Math.min(snapshots.length, (i + 1) * snapshotsPerChunk + 2);
    const slice = snapshots.slice(startIndex, endIndex);
    const startTime = slice[0]?.timestamp || 0;
    const endTime = slice[slice.length - 1]?.timestamp || startTime;
    const segments =
      session.segments?.filter(
        (seg) => seg.timestamp >= startTime && seg.timestamp <= endTime
      ) || [];
    const taps =
      session.taps?.filter(
        (tap) => tap.timestamp >= startTime && tap.timestamp <= endTime
      ) || [];
    const contextHistory =
      session.pdfContextHistory?.filter(
        (entry) => entry.timestamp >= startTime - 1000 && entry.timestamp <= endTime + 1000
      ) || [];
    chunks.push({
      transcript: segments.length ? segments.map((s) => s.text).join(" ") : transcriptChunks[i] || transcript,
      transcriptSegments: segments,
      snapshots: slice,
      taps,
      contextHistory,
      chunkMeta: {
        index: i + 1,
        total: chunkCount,
        timeRange: { startTime, endTime }
      }
    });
  }
  return chunks;
}

function splitTranscript(text, parts) {
  if (!text) return Array(parts).fill("");
  const size = Math.ceil(text.length / parts);
  return Array.from({ length: parts }, (_, i) => text.slice(i * size, (i + 1) * size));
}

async function retryFetch(url, options, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 429) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      if (attempt === retries) throw new Error("Request failed");
    } catch (error) {
      if (attempt === retries) {
        notify("Network", "Request failed. Check your connection or API key.");
        throw error;
      }
    }
  }
  return null;
}
