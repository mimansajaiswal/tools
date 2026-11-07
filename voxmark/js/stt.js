let recognition;
let mediaRecorder;
let mediaStream;
let captureInterval;
let captureAttempt = 0;

async function ensureMediaStream() {
  if (mediaStream && mediaStream.active) {
    mediaStream.getTracks().forEach((track) => {
      track.enabled = true;
    });
    return mediaStream;
  }
  return navigator.mediaDevices.getUserMedia({ audio: true });
}

async function startRecordingSession() {
  if (state.recording || state.recordingStarting || state.recordingStopping || state.recordingSession) return;
  state.recordingStarting = true;
  const attempt = ++captureAttempt;
  const provider = state.settings.sttProvider;
  let session;
  try {
    if (provider === "native") {
      if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
        notify("Speech Recognition", "Speech Recognition not supported.");
        return;
      }
    } else {
      const stream = await ensureMediaStream();
      if (attempt !== captureAttempt) {
        if (stream !== mediaStream) stream.getTracks().forEach(track => track.stop());
        return;
      }
      mediaStream = stream;
    }
    session = {
      id: crypto.randomUUID(), startedAt: Date.now(), transcript: "", snapshots: [], taps: [],
      segments: [], audioChunks: [], pdfContextHistory: [], status: "recording", attempts: 0,
      lastError: "", processedChunks: [], sttProvider: provider
    };
    if (state.activePdfId) {
      session.pdfContextHistory.push({ timestamp: Date.now(), fromPdfId: null, toPdfId: state.activePdfId });
    }
    state.recordingSession = session;
    state.recording = true;
    state.activeSessionId = session.id;
    await beginSTT(session);
    if (attempt !== captureAttempt || state.recordingSession !== session || !state.recording) return;
    state.recordingStarting = false;
    saveSessionState({ activeSessionId: session.id });
    elements.micButton.classList.add("recording");
    notify("Recording", "Recording started.");
    logEvent({ title: "Recording started", detail: { sessionId: session.id, pdfId: state.activePdfId || null }, sessionId: session.id });
    beginCaptureLoop();
    // Audio starts before the potentially slow PDF snapshot.
    const initialSnapshot = await captureSnapshot();
    if (attempt !== captureAttempt || state.recordingSession !== session || !state.recording) return;
    if (initialSnapshot) session.snapshots.push(initialSnapshot);
  } catch (error) {
    if (attempt !== captureAttempt) return;
    notify("Recording", `Recording stopped: ${error?.message || 'Capture failed.'}`);
    if (session) {
      session.captureError = error?.message || "Capture failed.";
      await stopRecordingSession();
    } else {
      mediaStream?.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
  } finally {
    if (attempt === captureAttempt) state.recordingStarting = false;
  }
}

async function stopRecordingSession() {
  if (state.recordingStopping) return;
  ++captureAttempt;
  state.recordingStarting = false;
  state.recording = false;
  elements.micButton.classList.remove("recording");
  if (!state.recordingSession) return;
  const session = state.recordingSession;
  state.recordingStopping = true;
  session.status = "stopping";
  try {
    endCaptureLoop();
    await endSTT();
    if (!session.transcript && !session.audioChunks.length) {
      state.recordingSession = null;
      notify("Recording", "No audio captured. Session discarded.");
      logEvent({ title: "Recording discarded", detail: { sessionId: session.id, reason: "No audio captured" }, sessionId: session.id });
      return;
    }
    session.lastError = session.captureError || "";
    session.status = session.lastError ? "failed" : "stopped";
    await addToQueue(session);
    state.recordingSession = null;
    notify("Recording", "Recording saved.");
    logEvent({
      title: "Recording stopped", detail: {
        sessionId: session.id, durationMs: Date.now() - session.startedAt,
        snapshots: session.snapshots.length, taps: session.taps.length
      }, sessionId: session.id
    });
    if (state.mode === "realtime" && !session.lastError) {
      processSession(session).then(success => {
        if (success) removeFromQueue(session.id);
        else if (typeof updateQueueItem === "function") updateQueueItem(session);
      });
    }
  } catch (error) {
    session.status = "failed";
    session.lastError = error?.message || "Recording could not be saved.";
    notify("Recording", "Recording is still in memory. Click the microphone to retry saving before closing this tab.");
    logEvent({ title: "Recording save failed", detail: session.lastError, sessionId: session.id });
  } finally {
    state.recordingStopping = false;
    clearFocusPins();
  }
}

function beginCaptureLoop() {
  const interval = window.innerWidth < 900 ? 1500 : 1000;
  captureInterval = setInterval(() => {
    if (!state.recording) return;
    const session = state.recordingSession;
    captureSnapshot().then((snapshot) => {
      if (!snapshot || !state.recording || state.recordingSession !== session) return;
      session.snapshots.push(snapshot);
      if (state.showMarkers) showViewportMarkers(snapshot);
    });
  }, interval);
}

function endCaptureLoop() {
  if (captureInterval) clearInterval(captureInterval);
}

async function beginSTT(session) {
  if ((session.sttProvider || state.settings.sttProvider) === "native") {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      notify("Speech Recognition", "Speech Recognition not supported.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    const owner = recognition;
    owner.captureEnded = false;
    owner.continuous = true;
    owner.interimResults = true;
    owner.lang = navigator.language || "en-US";
    owner.onresult = (event) => {
      if (state.recordingSession !== session || recognition !== owner) return;
      let fullTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript || "";
        fullTranscript += text;
        if (event.results[i].isFinal && i >= event.resultIndex) {
          const delta = text.trim();
          if (delta) {
            session.segments.push({
              timestamp: Date.now(),
              text: delta
            });
          }
        }
      }
      session.transcript = fullTranscript.trim();
    };
    owner.onerror = (event) => {
      if (state.recordingSession !== session || recognition !== owner) return;
      const errorType = event?.error || "Unknown error";
      if (errorType === "no-speech" || errorType === "aborted") {
        if (state.recording && state.recordingSession === session && recognition === owner) {
          try {
            owner.start();
          } catch (e) {
            logEvent({
              title: "Speech recognition restart failed",
              detail: e?.message || "Unknown",
              sessionId: session.id
            });
          }
        }
        return;
      }
      owner.captureFailed = true;
      notify("Speech Recognition", `Speech recognition error: ${errorType}`);
      logEvent({
        title: "Speech recognition error",
        detail: errorType,
        sessionId: session.id
      });
    };
    owner.onend = () => {
      owner.captureEnded = true;
      if (state.recording && state.recordingSession === session && recognition === owner && !owner.captureFailed) {
        logEvent({
          title: "Speech recognition ended, restarting",
          detail: { sessionId: session.id },
          sessionId: session.id
        });
        try {
          owner.captureEnded = false;
          owner.start();
        } catch (e) {
          owner.captureEnded = true;
          notify("Speech Recognition", "Failed to restart recognition.");
          logEvent({
            title: "Speech recognition restart failed",
            detail: e?.message || "Unknown",
            sessionId: session.id
          });
        }
      }
    };
    try {
      owner.start();
    } catch (error) {
      owner.captureEnded = true;
      throw error;
    }
    return;
  }

  const stream = await ensureMediaStream();
  if (!state.recording || state.recordingSession !== session) {
    if (stream !== mediaStream) stream.getTracks().forEach(track => track.stop());
    return;
  }
  mediaStream = stream;
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      session.audioChunks.push({ blob: event.data, timestamp: Date.now() });
    }
  };
  mediaRecorder.start(1000);
}

async function endSTT() {
  const owner = recognition;
  const recorder = mediaRecorder;
  const stream = mediaStream;
  try {
    if (owner && !owner.captureEnded) {
      await new Promise((resolve, reject) => {
        owner.addEventListener('end', resolve, { once: true });
        try { owner.stop(); } catch (error) { reject(error); }
      });
    }
    if (recorder && recorder.state !== 'inactive') {
      await new Promise((resolve, reject) => {
        recorder.addEventListener('stop', resolve, { once: true });
        try { recorder.stop(); } catch (error) { reject(error); }
      });
    }
  } finally {
    if (recognition === owner) recognition = null;
    if (mediaRecorder === recorder) mediaRecorder = null;
    if (mediaStream === stream) mediaStream = null;
    stream?.getTracks().forEach(track => track.stop());
  }
}

function handleTapFocusPointer(pointer) {
  if (!state.settings.tapFocus || state.adjustMode) return;
  const pdfState = getActivePdf();
  if (!pdfState) return;
  const pageDiv = pointer.pageDiv;
  if (!pageDiv) return;
  const pageNum = Number(pageDiv.dataset.pageNumber);
  const pageData = pdfState.pages.find((p) => p.pageNum === pageNum);
  if (!pageData) return;
  const x = pointer.x;
  const y = pointer.y;
  const pin = document.createElement("div");
  pin.className = "focus-pin";
  pin.style.left = `${x}px`;
  pin.style.top = `${y}px`;
  pageDiv.appendChild(pin);

  if (!state.recording) {
    pin.classList.add("temp");
    if (!state.tapFocusHintShown) {
      state.tapFocusHintShown = true;
    }
    setTimeout(() => pin.remove(), 1800);
    return;
  }
  if (!state.recordingSession) return;
  const [pdfX, pdfY] = pageData.viewport.convertToPdfPoint(x, y);
  state.recordingSession.taps.push({
    timestamp: Date.now(),
    pdfId: pdfState.id,
    pageIndex: pageNum - 1,
    pdfX,
    pdfY
  });
}

function clearFocusPins() {
  document.querySelectorAll(".focus-pin").forEach((pin) => pin.remove());
}
