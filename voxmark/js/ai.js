function buildAiPayload(session, chunk = null) {
  const base = chunk || {
    transcript: session.transcript,
    transcriptSegments: session.segments,
    snapshots: session.snapshots,
    taps: session.taps,
    contextHistory: session.pdfContextHistory,
    chunkMeta: { index: 1, total: 1 }
  };
  const meta = base.chunkMeta || { index: 1, total: 1 };
  const optimizedSnapshots = optimizeSnapshots(base.snapshots, meta);
  const compressedSegments = compressTranscriptSegments(base.transcriptSegments);
  const payload = {
    transcript: base.transcript,
    transcriptSegments: compressedSegments,
    timestamps: base.snapshots.map((snap) => snap.timestamp),
    snapshots: optimizedSnapshots,
    taps: base.taps?.map((tap) => ({
      timestamp: tap.timestamp,
      pageIndex: tap.pageIndex,
      x: tap.x,
      y: tap.y
    })) || [],
    contextHistory: base.contextHistory?.slice(-3) || [],
    activePdfId: base.snapshots[base.snapshots.length - 1]?.pdfId || null,
    chunkMeta: meta
  };
  if (meta.index > 1 && meta.precedingSummary) {
    payload.precedingContext = meta.precedingSummary;
  }
  return payload;
}

function optimizeSnapshots(snapshots, chunkMeta) {
  if (!snapshots?.length) return [];
  const isMultiChunk = chunkMeta.total > 1;
  const isFirstChunk = chunkMeta.index === 1;
  const isLastChunk = chunkMeta.index === chunkMeta.total;
  return snapshots.map((snap, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === snapshots.length - 1;
    const isOverlap = snap._isOverlap;
    const includeFullText = isFirst || isLast || !isMultiChunk;
    const optimized = {
      timestamp: snap.timestamp,
      pdfId: snap.pdfId,
      pageIndex: snap.pages?.[0]?.pageIndex ?? snap.pageIndex
    };
    if (snap.pages) {
      optimized.pages = snap.pages.map((page, pageIdx) => {
        const pageData = {
          pageIndex: page.pageIndex,
          scrollY: page.scrollY
        };
        if (includeFullText || pageIdx === 0) {
          pageData.visibleText = page.visibleText;
        } else if (page.visibleText) {
          pageData.textLength = page.visibleText.length;
          pageData.textPreview = page.visibleText.slice(0, 100);
        }
        return pageData;
      });
    }
    if (isOverlap) {
      optimized._isOverlap = true;
    }
    return optimized;
  });
}

function compressTranscriptSegments(segments) {
  if (!segments?.length) return [];
  const compressed = [];
  let prevText = "";
  for (const seg of segments) {
    if (seg.text === prevText) {
      if (compressed.length) {
        compressed[compressed.length - 1].repeatCount =
          (compressed[compressed.length - 1].repeatCount || 1) + 1;
      }
    } else {
      compressed.push({
        timestamp: seg.timestamp,
        text: seg.text
      });
      prevText = seg.text;
    }
  }
  return compressed;
}

function summarizeAiPayload(payload) {
  const annotationsPreview = {
    transcriptChars: (payload.transcript || "").length,
    segmentCount: payload.transcriptSegments?.length || 0,
    snapshotCount: payload.snapshots?.length || 0,
    tapCount: payload.taps?.length || 0,
    contextEntries: payload.contextHistory?.length || 0,
    chunk: payload.chunkMeta || null
  };
  return annotationsPreview;
}

function summarizeAiResponse(response) {
  const list = Array.isArray(response?.annotations) ? response.annotations : [];
  const types = {};
  list.forEach((item) => {
    const type = item?.type || "unknown";
    types[type] = (types[type] || 0) + 1;
  });
  return {
    annotationCount: list.length,
    types
  };
}

function summarizeSttResponse(provider, text) {
  return {
    provider,
    transcriptChars: (text || "").length
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
    const estimatedInputTokens = estimateTokens(systemPrompt + prompt + userContent);
    const maxTokens = Math.max(2000, Math.min(8000, estimatedInputTokens));
    const response = await retryFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": state.settings.aiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt + prompt,
        messages: [{ role: "user", content: userContent }]
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
    if (start === -1 || end === -1) {
      logEvent({
        title: "JSON parse error",
        detail: { reason: "No JSON object found", responseChars: trimmed.length },
        type: "error"
      });
      notify("AI Processing", "No valid JSON in AI response.", { type: "error", duration: 4000 });
      return null;
    }
    const jsonText = trimmed.slice(start, end + 1);
    return JSON.parse(jsonText);
  } catch (err) {
    logEvent({
      title: "JSON parse error",
      detail: { reason: err.message, responseChars: (text || "").length },
      type: "error"
    });
    notify("AI Processing", `Failed to parse AI response: ${err.message}`, { type: "error", duration: 4000 });
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
    detail: {
      provider,
      model: state.settings.sttModel,
      audioChunks: session.audioChunks.length
    },
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
    const text = data.text || "";
    logEvent({
      title: "STT response",
      detail: summarizeSttResponse(provider, text),
      sessionId: session.id
    });
    return text;
  }
  if (provider === "gemini") {
    const base64Audio = await blobToBase64(audioBlob);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${state.settings.sttModel || "gemini-1.5-flash"}:generateContent?key=${state.settings.sttKey}`;
    const response = await retryFetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { inline_data: { mime_type: "audio/webm", data: base64Audio } },
            { text: state.settings.sttPrompt || "Transcribe this audio accurately." }
          ]
        }]
      })
    });
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    logEvent({
      title: "STT response (Gemini)",
      detail: summarizeSttResponse(provider, text),
      sessionId: session.id
    });
    return text.trim();
  }

  if (provider === "anthropic") {
    const base64Audio = await blobToBase64(audioBlob);
    const response = await retryFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": state.settings.sttKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: state.settings.sttModel || "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "audio/webm", data: base64Audio }
            },
            { type: "text", text: state.settings.sttPrompt || "Transcribe this audio accurately. Return only the transcription." }
          ]
        }]
      })
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    logEvent({
      title: "STT response (Anthropic)",
      detail: summarizeSttResponse(provider, text),
      sessionId: session.id
    });
    return text.trim();
  }

  notify("Speech-to-Text", "Unknown STT provider.", { type: "error", duration: 4000 });
  logEvent({
    title: "STT fallback",
    detail: { provider, message: "Unknown provider." },
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
      elements.progressLabel.textContent = `Processing chunk ${chunkIndex} of ${chunks.length}...`;
      elements.progressLabel.classList.remove("hidden");
      const payload = buildAiPayload(session, chunk);
      logEvent({
        title: `AI request (chunk ${chunkIndex}/${chunks.length})`,
        detail: summarizeAiPayload(payload),
        sessionId: session.id
      });
      const response = await callAi(payload);
      if (response) {
        anyResponse = true;
        await applyAnnotations(response, session);
        processedChunks.add(chunkIndex);
        logEvent({
          title: `AI response (chunk ${chunkIndex}/${chunks.length})`,
          detail: summarizeAiResponse(response),
          sessionId: session.id
        });
      }
    }
    elements.progressLabel.classList.add("hidden");
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
  const segments = session.segments || [];
  const transcript = session.transcript || "";
  if (!snapshots.length) {
    return [
      {
        transcript,
        transcriptSegments: segments,
        snapshots: [],
        taps: session.taps || [],
        contextHistory: session.pdfContextHistory || [],
        chunkMeta: { index: 1, total: 1 }
      }
    ];
  }
  const breakpoints = findNaturalBreakpoints(snapshots, segments);
  const estimatedTokens = estimateSessionTokens(session);
  const targetTokensPerChunk = 6000;
  const maxSnapshotsPerChunk = 15;
  const overlapCount = 2;
  let chunkCount = Math.max(
    1,
    Math.ceil(estimatedTokens / targetTokensPerChunk),
    Math.ceil(snapshots.length / maxSnapshotsPerChunk)
  );
  if (chunkCount === 1) {
    return [
      {
        transcript,
        transcriptSegments: segments,
        snapshots,
        taps: session.taps || [],
        contextHistory: session.pdfContextHistory || [],
        chunkMeta: { index: 1, total: 1 }
      }
    ];
  }
  const chunkBoundaries = computeChunkBoundaries(snapshots, breakpoints, chunkCount, overlapCount);
  chunkCount = chunkBoundaries.length;
  const chunks = [];
  let prevChunkSummary = null;
  for (let i = 0; i < chunkCount; i++) {
    const { startIdx, endIdx, overlapStart } = chunkBoundaries[i];
    const slice = snapshots.slice(startIdx, endIdx).map((snap, idx) => {
      if (idx < overlapStart - startIdx && i > 0) {
        return { ...snap, _isOverlap: true };
      }
      return snap;
    });
    const startTime = slice[0]?.timestamp || 0;
    const endTime = slice[slice.length - 1]?.timestamp || startTime;
    const chunkSegments = segments.filter(
      (seg) => seg.timestamp >= startTime && seg.timestamp <= endTime
    );
    const taps = session.taps?.filter(
      (tap) => tap.timestamp >= startTime && tap.timestamp <= endTime
    ) || [];
    const contextHistory = session.pdfContextHistory?.filter(
      (entry) => entry.timestamp >= startTime - 1000 && entry.timestamp <= endTime + 1000
    ) || [];
    const chunkTranscript = chunkSegments.length
      ? chunkSegments.map((s) => s.text).join(" ")
      : splitTranscriptByTime(transcript, segments, startTime, endTime);
    const chunkMeta = {
      index: i + 1,
      total: chunkCount,
      timeRange: { startTime, endTime },
      snapshotRange: { start: startIdx, end: endIdx },
      hasOverlap: i > 0
    };
    if (prevChunkSummary) {
      chunkMeta.precedingSummary = prevChunkSummary;
    }
    chunks.push({
      transcript: chunkTranscript,
      transcriptSegments: chunkSegments,
      snapshots: slice,
      taps,
      contextHistory,
      chunkMeta
    });
    prevChunkSummary = buildChunkSummary(slice, chunkSegments, i + 1);
  }
  return chunks;
}

function findNaturalBreakpoints(snapshots, segments) {
  const breakpoints = [];
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];
    const timeDiff = curr.timestamp - prev.timestamp;
    const pageChanged = prev.pages?.[0]?.pageIndex !== curr.pages?.[0]?.pageIndex;
    const pdfChanged = prev.pdfId !== curr.pdfId;
    let score = 0;
    if (pdfChanged) score += 100;
    if (pageChanged) score += 50;
    if (timeDiff > 5000) score += 30;
    if (timeDiff > 2000) score += 10;
    const segmentGap = findSegmentGapNear(segments, curr.timestamp);
    if (segmentGap > 2000) score += 20;
    if (score > 0) {
      breakpoints.push({ index: i, score, timeDiff, pageChanged, pdfChanged });
    }
  }
  return breakpoints.sort((a, b) => b.score - a.score);
}

function findSegmentGapNear(segments, timestamp) {
  if (!segments?.length) return 0;
  let minDist = Infinity;
  let gapBefore = 0;
  for (let i = 0; i < segments.length; i++) {
    const dist = Math.abs(segments[i].timestamp - timestamp);
    if (dist < minDist) {
      minDist = dist;
      if (i > 0) {
        gapBefore = segments[i].timestamp - segments[i - 1].timestamp;
      }
    }
  }
  return gapBefore;
}

function computeChunkBoundaries(snapshots, breakpoints, targetChunkCount, overlapCount) {
  const n = snapshots.length;
  const idealSize = Math.ceil(n / targetChunkCount);
  const boundaries = [];
  let currentStart = 0;
  for (let chunk = 0; chunk < targetChunkCount && currentStart < n; chunk++) {
    const idealEnd = Math.min(n, currentStart + idealSize);
    let bestEnd = idealEnd;
    const searchStart = Math.max(currentStart + Math.floor(idealSize * 0.7), currentStart + 3);
    const searchEnd = Math.min(currentStart + Math.ceil(idealSize * 1.3), n);
    for (const bp of breakpoints) {
      if (bp.index >= searchStart && bp.index <= searchEnd) {
        bestEnd = bp.index;
        break;
      }
    }
    const overlapStart = chunk > 0 ? Math.max(0, currentStart - overlapCount) : currentStart;
    boundaries.push({
      startIdx: overlapStart,
      endIdx: bestEnd,
      overlapStart: currentStart
    });
    currentStart = bestEnd;
  }
  if (currentStart < n) {
    const lastBoundary = boundaries[boundaries.length - 1];
    lastBoundary.endIdx = n;
  }
  return boundaries;
}

function splitTranscriptByTime(fullTranscript, segments, startTime, endTime) {
  if (!segments?.length || !fullTranscript) return fullTranscript;
  const relevantSegments = segments.filter(
    (s) => s.timestamp >= startTime && s.timestamp <= endTime
  );
  if (relevantSegments.length) {
    return relevantSegments.map((s) => s.text).join(" ");
  }
  const totalDuration = segments[segments.length - 1]?.timestamp - segments[0]?.timestamp || 1;
  const startRatio = (startTime - segments[0]?.timestamp) / totalDuration;
  const endRatio = (endTime - segments[0]?.timestamp) / totalDuration;
  const startChar = Math.floor(startRatio * fullTranscript.length);
  const endChar = Math.ceil(endRatio * fullTranscript.length);
  return fullTranscript.slice(Math.max(0, startChar), Math.min(fullTranscript.length, endChar));
}

function buildChunkSummary(snapshots, segments, chunkIndex) {
  const pages = new Set();
  const pdfs = new Set();
  snapshots.forEach((snap) => {
    if (snap.pdfId) pdfs.add(snap.pdfId);
    snap.pages?.forEach((p) => pages.add(p.pageIndex));
  });
  const transcriptPreview = segments.length
    ? segments.map((s) => s.text).join(" ").slice(0, 200)
    : "";
  return {
    chunkIndex,
    pagesCovered: Array.from(pages),
    pdfIds: Array.from(pdfs),
    snapshotCount: snapshots.length,
    transcriptPreview: transcriptPreview + (transcriptPreview.length >= 200 ? "..." : ""),
    timeRange: {
      start: snapshots[0]?.timestamp,
      end: snapshots[snapshots.length - 1]?.timestamp
    }
  };
}

async function retryFetch(url, options, retries = 2) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 429) {
        const waitTime = 1000 * (attempt + 1);
        notify("Rate Limit", `Rate limited. Retrying in ${waitTime / 1000}s...`, { type: "info", duration: waitTime });
        await new Promise((r) => setTimeout(r, waitTime));
        continue;
      }
      if (response.status === 401 || response.status === 403) {
        notify("Auth Error", "Invalid API key or unauthorized.", { type: "error", duration: 4000 });
        throw new Error(`Auth error: ${response.status}`);
      }
      lastError = new Error(`Request failed with status ${response.status}`);
      if (attempt === retries) throw lastError;
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        notify("Network", `Request failed: ${error.message || "Check connection"}`, { type: "error", duration: 4000 });
        throw error;
      }
    }
  }
  throw lastError || new Error("Request failed after retries");
}

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function estimateTokens(text) {
  if (!text) return 0;
  const words = text.split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  const punctuation = (text.match(/[.,!?;:'"()\[\]{}]/g) || []).length;
  const numbers = (text.match(/\d+/g) || []).length;
  const tokensFromWords = words * 1.3;
  const tokensFromChars = chars / 4;
  const tokensFromPunctuation = punctuation * 0.5;
  const tokensFromNumbers = numbers * 0.5;
  return Math.ceil(
    (tokensFromWords + tokensFromChars) / 2 + tokensFromPunctuation + tokensFromNumbers
  );
}

function estimateSessionTokens(session) {
  let total = 0;
  total += estimateTokens(session.transcript || "");
  const snapshots = session.snapshots || [];
  for (const snap of snapshots) {
    total += 20;
    if (snap.pages) {
      for (const page of snap.pages) {
        total += estimateTokens(page.visibleText || "");
        total += 10;
      }
    }
  }
  const segments = session.segments || [];
  for (const seg of segments) {
    total += estimateTokens(seg.text || "");
    total += 5;
  }
  total += (session.taps?.length || 0) * 15;
  total += (session.pdfContextHistory?.length || 0) * 30;
  total += 500;
  return total;
}
