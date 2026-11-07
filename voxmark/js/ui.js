let activeModalResolver = null;
let toastCounter = 0;
function openModal({ title, body, actions = [], onClose }) {
  elements.modalTitle.textContent = title;
  elements.modalBody.innerHTML = body;
  elements.modalActions.innerHTML = "";
  actions.forEach((action) => {
    const button = document.createElement("button");
    button.className = `btn ${action.variant || ""}`.trim();
    button.textContent = action.label;
    button.addEventListener("click", () => {
      if (action.onClick) action.onClick();
    });
    elements.modalActions.appendChild(button);
  });
  elements.modalOverlay.classList.add("open");
  activeModalResolver = onClose || null;
}

function closeModal() {
  elements.modalOverlay.classList.remove("open");
  if (activeModalResolver) activeModalResolver();
  activeModalResolver = null;
}

function notify(title, message, options = {}) {
  const { type = "info", duration = 2400 } = options;
  if (!title && !message) return;
  showToast(`${title}: ${message}`, type, duration);
}

function showToast(message, type = "info", duration = 2400) {
  const existing = elements.toastContainer.querySelectorAll(".toast");
  const MAX_TOASTS = 3;
  while (existing.length >= MAX_TOASTS) {
    const oldest = existing[0];
    oldest.remove();
  }
  const duplicate = Array.from(elements.toastContainer.querySelectorAll(".toast"))
    .find((t) => t.textContent === message);
  if (duplicate) {
    duplicate.classList.add("toast-pulse");
    setTimeout(() => duplicate.classList.remove("toast-pulse"), 300);
    return;
  }
  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "error" : ""}`.trim();
  toast.textContent = message;
  toast.dataset.toastId = `${Date.now()}-${toastCounter++}`;
  elements.toastContainer.appendChild(toast);
  const timer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(6px)";
    setTimeout(() => toast.remove(), 200);
  }, duration);
  toast.addEventListener("click", () => {
    clearTimeout(timer);
    toast.remove();
  });
}

function confirmModal({ title, body, confirmLabel = "Confirm", onConfirm }) {
  openModal({
    title,
    body,
    actions: [
      { label: "Cancel", variant: "secondary", onClick: closeModal },
      {
        label: confirmLabel,
        variant: "danger",
        onClick: () => {
          closeModal();
          onConfirm();
        }
      }
    ],
    onClose: null
  });
}

function setLoading(active, message = "Processing...") {
  elements.loadingOverlay.classList.toggle("active", active);
  elements.loadingOverlay.title = message;
}

function updateConnectionStatus() {
  if (navigator.onLine) {
    elements.connectionDot.classList.remove("offline");
    elements.connectionLabel.textContent = "Online";
    elements.connectionIcon.className = "ph ph-wifi-high";
    elements.connectionIcon.title = "Online";
    if (state.queue.length && !state.onlinePrompted) {
      state.onlinePrompted = true;
      confirmModal({
        title: "Back Online",
        body: `<p>${state.queue.length} queued recordings are waiting. Process them now?</p>`,
        confirmLabel: "Process Queue",
        onConfirm: processBatchQueue
      });
    }
  } else {
    elements.connectionDot.classList.add("offline");
    elements.connectionLabel.textContent = "Offline";
    elements.connectionIcon.className = "ph ph-wifi-slash";
    elements.connectionIcon.title = "Offline";
    state.onlinePrompted = false;
  }
}

function toggleSettings() {
  if (typeof closeOverflowMenu === "function") {
    closeOverflowMenu();
  }
  if (typeof closePdfMenu === "function") {
    closePdfMenu();
  }
  if (typeof closeSearchPanel === "function") {
    closeSearchPanel();
  }
  if (elements.logsPanel?.classList.contains("open")) {
    closeLogs();
  }
  const open = elements.settingsPanel.classList.toggle("open");
  elements.settingsScrim.classList.toggle("active", open);
  elements.settingsToggle?.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) {
    elements.settingsPanel?.focus();
  }
}

function toggleSearchPanel() {
  const app = document.querySelector(".app");
  if (!app) return;
  if (elements.settingsPanel?.classList.contains("open")) {
    elements.settingsPanel.classList.remove("open");
    elements.settingsScrim.classList.remove("active");
    elements.settingsToggle?.setAttribute("aria-expanded", "false");
  }
  if (elements.logsPanel?.classList.contains("open")) {
    closeLogs();
  }
  if (elements.queuePanel?.classList.contains("open")) {
    closeQueue();
  }
  const open = app.classList.toggle("search-open");
  elements.searchScrim?.classList.toggle("active", open);
  elements.searchToggle?.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) {
    elements.searchInput?.focus();
  }
}

function closeSearchPanel() {
  const app = document.querySelector(".app");
  if (!app) return;
  app.classList.remove("search-open");
  elements.searchScrim?.classList.remove("active");
  elements.searchToggle?.setAttribute("aria-expanded", "false");
}

function openSidebar() {
  const app = document.querySelector(".app");
  if (!app) return;
  if (window.innerWidth < 960) {
    app.classList.add("sidebar-open");
    elements.sidebarScrim?.classList.add("active");
  }
}

function closeSidebar() {
  const app = document.querySelector(".app");
  if (!app) return;
  app.classList.remove("sidebar-open");
  elements.sidebarScrim?.classList.remove("active");
}

function updateHeaderOffset() {
  if (!elements.header) return;
  const height = elements.header.getBoundingClientRect().height || 0;
  document.documentElement.style.setProperty("--topbar-height", `${height}px`);
}

function updateQueueIndicator() {
  const count = state.queue.length;
  const failed = state.queue.filter((item) => item.status === "failed").length;
  elements.queueIndicator.innerHTML = `<i class="ph ph-stack"></i><span class="queue-count">${count}</span>`;
  elements.queueIndicator.classList.toggle("hidden", count === 0);
  if (count) {
    const suffix = failed ? ` (${failed} failed)` : "";
    const label = `${count} queued recordings${suffix}`;
    elements.queueIndicator.title = label;
    elements.queueIndicator.setAttribute("aria-label", label);
  } else {
    elements.queueIndicator.title = "No queued recordings";
    elements.queueIndicator.setAttribute("aria-label", "No queued recordings");
  }
  if (elements.connectionLabel) {
    elements.connectionLabel.classList.toggle("sr-only", count > 0);
  }
  if (elements.queuePanel?.classList.contains("open")) {
    renderQueue();
  }
}

function updateLogIndicator() {
  if (!elements.logsCount) return;
  const sessionId = state.activeSessionId;
  const count = sessionId
    ? state.logs.filter((log) => log.sessionId === sessionId).length
    : state.logs.length;
  elements.logsCount.textContent = `${count}`;
  if (elements.logsPanel?.classList.contains("open")) {
    renderLogs();
  }
}

function showJumpBack(returnPoint, label = "Jumped to linked page.") {
  if (!elements.jumpBack) return;
  state.linkReturn = returnPoint;
  elements.jumpBackText.textContent = label;
  elements.jumpBack.classList.add("open");
}

function hideJumpBack() {
  if (!elements.jumpBack) return;
  elements.jumpBack.classList.remove("open");
  state.linkReturn = null;
}

function renderLogs() {
  if (!elements.logsList) return;
  let sessionId = state.activeSessionId;
  if (!sessionId && state.logs.length) {
    sessionId = state.logs[state.logs.length - 1].sessionId || null;
    state.activeSessionId = sessionId;
  }
  const logs = sessionId
    ? state.logs.filter((log) => log.sessionId === sessionId)
    : state.logs;
  elements.logsMeta.textContent = sessionId ? `Session ${sessionId}` : "Session logs";
  if (!logs.length) {
    elements.logsList.innerHTML = `<div class="viewer-hint">No logs yet for this session.</div>`;
    return;
  }
  elements.logsList.innerHTML = "";
  logs
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .forEach((entry) => {
      const details = document.createElement("details");
      details.className = "log-entry";
      const summary = document.createElement("summary");
      const time = new Date(entry.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      const title = document.createElement("span");
      title.textContent = entry.title || "Event";
      const stamp = document.createElement("span");
      stamp.textContent = time;
      summary.appendChild(title);
      summary.appendChild(stamp);
      details.appendChild(summary);
      const pre = document.createElement("pre");
      pre.textContent = entry.detail || "";
      details.appendChild(pre);
      elements.logsList.appendChild(details);
    });
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return "unknown time";
  const delta = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function renderQueue() {
  if (!elements.queueList) return;
  const sessions = state.queue
    .slice()
    .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
  elements.queueMeta.textContent = sessions.length
    ? `${sessions.length} queued session${sessions.length === 1 ? "" : "s"}`
    : "Queue is empty.";
  if (!sessions.length) {
    elements.queueList.innerHTML = `<div class="viewer-hint">No queued recordings yet.</div>`;
    return;
  }
  elements.queueList.innerHTML = "";
  sessions.forEach((session) => {
    const row = document.createElement("div");
    const status = session.status || "queued";
    row.className = `queue-item status-${status}`;
    const label = status === "failed" ? "Failed" : status === "processing" ? "Processing" : "Queued";
    const summary = document.createElement("div");
    summary.className = "queue-summary";
    const title = document.createElement("div");
    title.className = "queue-title";
    title.textContent = `Session ${session.id.slice(0, 6).toUpperCase()}`;
    const subtitle = document.createElement("div");
    subtitle.className = "queue-subtitle";
    subtitle.textContent = `${formatRelativeTime(session.startedAt)} · ${session.snapshots?.length || 0} snapshots`;
    summary.appendChild(title);
    summary.appendChild(subtitle);
    if (session.lastError) {
      const errorText = document.createElement("div");
      errorText.className = "queue-error";
      errorText.textContent = session.lastError;
      summary.appendChild(errorText);
    }
    const statusPill = document.createElement("div");
    statusPill.className = "queue-status";
    statusPill.textContent = label;
    const actions = document.createElement("div");
    actions.className = "queue-actions";
    const retry = document.createElement("button");
    retry.className = "btn secondary small";
    retry.type = "button";
    retry.textContent =
      status === "processing" ? "Working..." : status === "failed" ? "Retry" : "Process";
    retry.disabled = status === "processing";
    retry.addEventListener("click", () => processQueueItem(session));
    const remove = document.createElement("button");
    remove.className = "btn ghost small";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      confirmModal({
        title: "Remove Session",
        body: "<p>Remove this session from the queue?</p>",
        confirmLabel: "Remove",
        onConfirm: () => {
          removeFromQueue(session.id);
          renderQueue();
        }
      });
    });
    actions.appendChild(retry);
    actions.appendChild(remove);
    row.appendChild(summary);
    row.appendChild(statusPill);
    row.appendChild(actions);
    elements.queueList.appendChild(row);
  });
}

async function processQueueItem(session) {
  if (!session) return;
  session.status = "processing";
  session.lastError = "";
  if (typeof updateQueueItem === "function") {
    updateQueueItem(session);
  }
  renderQueue();
  state.activeSessionId = session.id;
  updateLogIndicator();
  const success = await processSession(session);
  if (success) {
    removeFromQueue(session.id);
  } else if (typeof updateQueueItem === "function") {
    updateQueueItem(session);
  }
  renderQueue();
}

function toggleQueue() {
  if (typeof closeOverflowMenu === "function") {
    closeOverflowMenu();
  }
  if (typeof closePdfMenu === "function") {
    closePdfMenu();
  }
  if (typeof closeSearchPanel === "function") {
    closeSearchPanel();
  }
  if (elements.settingsPanel?.classList.contains("open")) {
    elements.settingsPanel.classList.remove("open");
    elements.settingsScrim.classList.remove("active");
  }
  if (elements.logsPanel?.classList.contains("open")) {
    closeLogs();
  }
  const open = elements.queuePanel.classList.toggle("open");
  elements.queueScrim.classList.toggle("active", open);
  elements.queueToggle?.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) {
    renderQueue();
    elements.queuePanel?.focus();
  }
}

function closeQueue() {
  elements.queuePanel?.classList.remove("open");
  elements.queueScrim?.classList.remove("active");
  elements.queueToggle?.setAttribute("aria-expanded", "false");
}

function toggleLogs() {
  if (typeof closeOverflowMenu === "function") {
    closeOverflowMenu();
  }
  if (typeof closePdfMenu === "function") {
    closePdfMenu();
  }
  if (typeof closeSearchPanel === "function") {
    closeSearchPanel();
  }
  if (elements.settingsPanel?.classList.contains("open")) {
    elements.settingsPanel.classList.remove("open");
    elements.settingsScrim.classList.remove("active");
  }
  const open = elements.logsPanel.classList.toggle("open");
  elements.logsScrim.classList.toggle("active", open);
  elements.logsToggle?.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) {
    renderLogs();
    elements.logsPanel?.focus();
  }
}

function closeLogs() {
  elements.logsPanel.classList.remove("open");
  elements.logsScrim.classList.remove("active");
  elements.logsToggle?.setAttribute("aria-expanded", "false");
}

function logEvent({ title, detail = "", type = "info", sessionId }) {
  const entry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    title,
    type,
    sessionId: sessionId || state.activeSessionId,
    detail: typeof detail === "string" ? detail : JSON.stringify(detail, null, 2)
  };
  addLogEntry(entry);
}
