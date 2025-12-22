let recognition;
let mediaRecorder;
let mediaStream;
let captureInterval;

async function ensureMediaStream() {
  if (mediaStream && mediaStream.active) {
    mediaStream.getTracks().forEach((track) => {
      track.enabled = true;
    });
    return mediaStream;
  }
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return mediaStream;
}

function startRecordingSession() {
  state.recording = true;
  const session = {
    id: crypto.randomUUID(),
    startedAt: Date.now(),
    transcript: "",
    snapshots: [],
    taps: [],
    segments: [],
    audioChunks: [],
    pdfContextHistory: [],
    status: "recording"
  };
  if (state.activePdfId) {
    session.pdfContextHistory.push({
      timestamp: Date.now(),
      fromPdfId: null,
      toPdfId: state.activePdfId
    });
  }
  state.recordingSession = session;
  state.activeSessionId = session.id;
  saveSessionState({ activeSessionId: session.id });
  elements.micButton.classList.add("recording");
  notify("Recording", "Recording started.");
  logEvent({
    title: "Recording started",
    detail: {
      sessionId: session.id,
      pdfId: state.activePdfId || null
    },
    sessionId: session.id
  });
  const initialSnapshot = captureSnapshot();
  if (initialSnapshot) session.snapshots.push(initialSnapshot);
  beginCaptureLoop();
  beginSTT(session);
}

function stopRecordingSession() {
  state.recording = false;
  elements.micButton.classList.remove("recording");
  if (!state.recordingSession) return;
  state.recordingSession.status = "stopped";
  endCaptureLoop();
  endSTT();
  notify("Recording", "Recording saved.");
  const session = state.recordingSession;
  state.recordingSession = null;
  logEvent({
    title: "Recording stopped",
    detail: {
      sessionId: session.id,
      durationMs: Date.now() - session.startedAt,
      snapshots: session.snapshots.length,
      taps: session.taps.length
    },
    sessionId: session.id
  });
  addToQueue(session);
  if (state.mode === "realtime") {
    processSession(session).then((success) => {
      if (success) removeFromQueue(session.id);
    });
  }
  clearFocusPins();
}

function beginCaptureLoop() {
  const interval = window.innerWidth < 900 ? 1500 : 1000;
  captureInterval = setInterval(() => {
    if (!state.recording) return;
    const snapshot = captureSnapshot();
    if (!snapshot) return;
    state.recordingSession.snapshots.push(snapshot);
    if (state.showMarkers) showViewportMarkers(snapshot);
  }, interval);
}

function endCaptureLoop() {
  if (captureInterval) clearInterval(captureInterval);
}

async function beginSTT(session) {
  if (state.settings.sttProvider === "native") {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      notify("Speech Recognition", "Speech Recognition not supported.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let fullTranscript = "";
      let deltaTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript || "";
        fullTranscript += text;
        if (i >= event.resultIndex) {
          deltaTranscript += text;
        }
      }
      session.transcript = fullTranscript.trim();
      const delta = deltaTranscript.trim();
      if (delta) {
        session.segments.push({
          timestamp: Date.now(),
          text: delta
        });
      }
    };
    recognition.start();
    return;
  }

  try {
    mediaStream = await ensureMediaStream();
    mediaRecorder = new MediaRecorder(mediaStream);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        session.audioChunks.push({ blob: event.data, timestamp: Date.now() });
      }
    };
    mediaRecorder.start(1000);
  } catch (error) {
    notify("Microphone", "Microphone access denied or unavailable.");
  }
}

function endSTT() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
  if (mediaRecorder) {
    mediaRecorder.stop();
    mediaRecorder = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => {
      track.enabled = false;
    });
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
