function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);
    request.onupgradeneeded = (event) => {
      const dbInstance = event.target.result;
      if (!dbInstance.objectStoreNames.contains("queue")) {
        dbInstance.createObjectStore("queue", { keyPath: "id" });
      }
      if (!dbInstance.objectStoreNames.contains("pdfs")) {
        dbInstance.createObjectStore("pdfs", { keyPath: "id" });
      }
      if (!dbInstance.objectStoreNames.contains("session")) {
        dbInstance.createObjectStore("session", { keyPath: "key" });
      }
      if (!dbInstance.objectStoreNames.contains("logs")) {
        dbInstance.createObjectStore("logs", { keyPath: "id" });
      }
      if (!dbInstance.objectStoreNames.contains("settings")) {
        dbInstance.createObjectStore("settings", { keyPath: "key" });
      }
    };
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

function addToQueue(session) {
  session.status = session.status || "queued";
  session.attempts = session.attempts || 0;
  session.lastError = session.lastError || "";
  state.queue.push(session);
  updateQueueIndicator();
  updateStorageUsage();
  if (!db) return;
  const tx = db.transaction("queue", "readwrite");
  tx.objectStore("queue").put(session);
}

function updateQueueItem(session) {
  if (!session) return;
  const index = state.queue.findIndex((item) => item.id === session.id);
  if (index >= 0) {
    state.queue[index] = session;
  }
  updateQueueIndicator();
  updateStorageUsage();
  if (!db) return;
  const tx = db.transaction("queue", "readwrite");
  tx.objectStore("queue").put(session);
}

function removeFromQueue(sessionId) {
  state.queue = state.queue.filter((item) => item.id !== sessionId);
  updateQueueIndicator();
  updateStorageUsage();
  if (!db) return;
  const tx = db.transaction("queue", "readwrite");
  tx.objectStore("queue").delete(sessionId);
}

function loadQueueFromDB() {
  return new Promise((resolve) => {
    if (!db) {
      resolve([]);
      return;
    }
    const tx = db.transaction("queue", "readonly");
    const store = tx.objectStore("queue");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
}

function persistPdfState(pdfState) {
  if (!db || !pdfState) return;
  const original = cloneArrayBuffer(pdfState.originalBytes || pdfState.bytes);
  const record = {
    id: pdfState.id,
    name: pdfState.name,
    originalBytes: original,
    annotations: pdfState.annotations || [],
    annotationCount: pdfState.annotationCount || 0,
    scale: pdfState.scale || 1.15,
    autoFit: pdfState.autoFit ?? true,
    updatedAt: Date.now()
  };
  const tx = db.transaction("pdfs", "readwrite");
  tx.objectStore("pdfs").put(record);
  updateStorageUsage();
}

function deletePdfState(id) {
  if (!db) return;
  const tx = db.transaction("pdfs", "readwrite");
  tx.objectStore("pdfs").delete(id);
  updateStorageUsage();
}

function loadPdfsFromDB() {
  return new Promise((resolve) => {
    if (!db) {
      resolve([]);
      return;
    }
    const tx = db.transaction("pdfs", "readonly");
    const store = tx.objectStore("pdfs");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
}

function saveSessionState(partial) {
  if (!db) return;
  const record = {
    key: "current",
    ...(state.sessionState || {}),
    ...partial
  };
  state.sessionState = record;
  const tx = db.transaction("session", "readwrite");
  tx.objectStore("session").put(record);
}

function loadSessionState() {
  return new Promise((resolve) => {
    if (!db) {
      resolve(null);
      return;
    }
    const tx = db.transaction("session", "readonly");
    const store = tx.objectStore("session");
    const request = store.get("current");
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

function addLogEntry(entry) {
  if (!entry) return;
  const MAX_LOGS = 250;
  state.logs.push(entry);
  if (state.logs.length > MAX_LOGS) {
    const overflow = state.logs.length - MAX_LOGS;
    const removed = state.logs.splice(0, overflow);
    if (db && removed.length) {
      const tx = db.transaction("logs", "readwrite");
      const store = tx.objectStore("logs");
      removed.forEach((item) => store.delete(item.id));
    }
  }
  updateLogIndicator();
  renderLogs();
  if (!db) return;
  const tx = db.transaction("logs", "readwrite");
  tx.objectStore("logs").put(entry);
  updateStorageUsage();
}

function clearLogs(scope = "active") {
  const sessionId = state.activeSessionId;
  if (scope === "active" && sessionId) {
    state.logs = state.logs.filter((log) => log.sessionId !== sessionId);
  } else {
    state.logs = [];
  }
  updateLogIndicator();
  renderLogs();
  if (!db) return;
  const tx = db.transaction("logs", "readwrite");
  const store = tx.objectStore("logs");
  if (scope === "active" && sessionId) {
    const request = store.getAll();
    request.onsuccess = () => {
      const items = request.result || [];
      items
        .filter((item) => item.sessionId === sessionId)
        .forEach((item) => store.delete(item.id));
    };
    updateStorageUsage();
    return;
  }
  store.clear();
  updateStorageUsage();
}

function loadLogsFromDB() {
  return new Promise((resolve) => {
    if (!db) {
      resolve([]);
      return;
    }
    const tx = db.transaction("logs", "readonly");
    const store = tx.objectStore("logs");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
}

function saveSettingsToDB(settings) {
  if (!db) return;
  const tx = db.transaction("settings", "readwrite");
  tx.objectStore("settings").put({ key: "current", value: settings });
}

function loadSettingsFromDB() {
  return new Promise((resolve) => {
    if (!db) {
      resolve(null);
      return;
    }
    const tx = db.transaction("settings", "readonly");
    const store = tx.objectStore("settings");
    const request = store.get("current");
    request.onsuccess = () => resolve(request.result?.value || null);
    request.onerror = () => resolve(null);
  });
}

async function updateStorageUsage() {
  if (!navigator.storage || !navigator.storage.estimate) {
    elements.storageUsage.textContent = "IndexedDB: unavailable";
    return;
  }
  const { usage } = await navigator.storage.estimate();
  const mb = ((usage || 0) / (1024 * 1024)).toFixed(2);
  elements.storageUsage.textContent = `IndexedDB: ${mb} MB`;
}

function performReset() {
  performResetSession();
}

function performResetSession() {
  state.pdfs = [];
  state.activePdfId = null;
  state.queue = [];
  state.recordingSession = null;
  state.onlinePrompted = false;
  state.logs = [];
  state.activeSessionId = null;
  state.sessionState = null;
  state.linkReturn = null;
  elements.viewerArea.innerHTML = "";
  elements.pdfList.innerHTML = "";
  elements.viewerArea.appendChild(elements.emptyState);
  elements.emptyState.classList.remove("hidden");
  if (typeof updateActivePdfLabel === "function") {
    updateActivePdfLabel();
  }
  if (typeof hideJumpBack === "function") {
    hideJumpBack();
  }
  updateQueueIndicator();
  if (db) {
    const txQueue = db.transaction("queue", "readwrite");
    txQueue.objectStore("queue").clear();
    const txPdf = db.transaction("pdfs", "readwrite");
    txPdf.objectStore("pdfs").clear();
    const txSession = db.transaction("session", "readwrite");
    txSession.objectStore("session").clear();
    const txLogs = db.transaction("logs", "readwrite");
    txLogs.objectStore("logs").clear();
  }
  updateLogIndicator();
  renderLogs();
  if (typeof mediaStream !== "undefined" && mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
  notify("Session", "Session data reset.");
}

function performResetApp() {
  performResetSession();
  if (db) {
    const tx = db.transaction("settings", "readwrite");
    tx.objectStore("settings").clear();
  }
  localStorage.removeItem("voxmark-settings");
  localStorage.removeItem("voxmark-mode");
  localStorage.removeItem("voxmark-default-palette");
  state.settings = { ...DEFAULT_SETTINGS };
  loadSettings().then(() => {
    persistSettings();
    updatePdfInvert();
  });
  if (window.caches && caches.keys) {
    caches.keys().then((keys) =>
      keys
        .filter((key) => key.startsWith("voxmark-"))
        .forEach((key) => caches.delete(key))
    );
  }
  notify("App", "App reset (including settings).");
}

function confirmResetSession() {
  confirmModal({
    title: "Reset Session",
    body:
      "<p>This will remove all loaded PDFs, recordings, queued items, and annotations from this session. This cannot be undone.</p>",
    confirmLabel: "Reset Session",
    onConfirm: performResetSession
  });
}

function confirmResetApp() {
  confirmModal({
    title: "Reset App",
    body:
      "<p>This will remove session data and all settings (including API keys and color palette). This cannot be undone.</p>",
    confirmLabel: "Reset App",
    onConfirm: performResetApp
  });
}
function toArrayBuffer(data) {
  if (!data) return new ArrayBuffer(0);
  if (data instanceof ArrayBuffer) return data;
  if (ArrayBuffer.isView(data)) {
    try {
      return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    } catch (error) {
      return new ArrayBuffer(0);
    }
  }
  if (data.buffer instanceof ArrayBuffer) return data.buffer;
  return new ArrayBuffer(0);
}

function cloneArrayBuffer(data) {
  const buffer = toArrayBuffer(data);
  if (!buffer.byteLength) return new ArrayBuffer(0);
  try {
    const copy = new Uint8Array(buffer.byteLength);
    copy.set(new Uint8Array(buffer));
    return copy.buffer;
  } catch (error) {
    try {
      return buffer.slice(0);
    } catch (err) {
      return new ArrayBuffer(0);
    }
  }
}

function cloneUint8(data) {
  const buffer = toArrayBuffer(data);
  if (!buffer.byteLength) return new Uint8Array();
  try {
    const copy = new Uint8Array(buffer.byteLength);
    copy.set(new Uint8Array(buffer));
    return copy;
  } catch (error) {
    try {
      return new Uint8Array(buffer.slice(0));
    } catch (err) {
      return new Uint8Array();
    }
  }
}
