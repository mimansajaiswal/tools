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
  const { type = "info", duration = 2400, force = false } = options;
  if (type !== "error" && !force) return;
  showToast(`${title}: ${message}`, type, duration);
}

function showToast(message, type = "info", duration = 2400) {
  const existing = elements.toastContainer.querySelectorAll(".toast");
  if (existing.length >= 3) {
    existing[0].remove();
  }
  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "error" : ""}`.trim();
  toast.textContent = message;
  toast.dataset.toastId = `${Date.now()}-${toastCounter++}`;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(6px)";
    setTimeout(() => toast.remove(), 200);
  }, duration);
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
  if (elements.logsPanel?.classList.contains("open")) {
    closeLogs();
  }
  const open = elements.settingsPanel.classList.toggle("open");
  elements.settingsScrim.classList.toggle("active", open);
}

function updateQueueIndicator() {
  const count = state.queue.length;
  elements.queueIndicator.innerHTML = `<i class="ph ph-stack"></i><span class="queue-count">${count}</span>`;
  elements.queueIndicator.classList.toggle("hidden", count === 0);
  elements.queueIndicator.title = count ? `${count} queued recordings` : "No queued recordings";
  if (elements.connectionLabel) {
    elements.connectionLabel.classList.toggle("sr-only", count > 0);
  }
}

function updateLogIndicator() {
  if (!elements.logsCount) return;
  const sessionId = state.activeSessionId;
  const count = sessionId
    ? state.logs.filter((log) => log.sessionId === sessionId).length
    : state.logs.length;
  elements.logsCount.textContent = `${count}`;
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
  const sessionId = state.activeSessionId;
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
      summary.innerHTML = `<span>${entry.title}</span><span>${time}</span>`;
      details.appendChild(summary);
      const pre = document.createElement("pre");
      pre.textContent = entry.detail || "";
      details.appendChild(pre);
      elements.logsList.appendChild(details);
    });
}

function toggleLogs() {
  if (typeof closeOverflowMenu === "function") {
    closeOverflowMenu();
  }
  if (typeof closePdfMenu === "function") {
    closePdfMenu();
  }
  if (elements.settingsPanel?.classList.contains("open")) {
    elements.settingsPanel.classList.remove("open");
    elements.settingsScrim.classList.remove("active");
  }
  const open = elements.logsPanel.classList.toggle("open");
  elements.logsScrim.classList.toggle("active", open);
  if (open) renderLogs();
}

function closeLogs() {
  elements.logsPanel.classList.remove("open");
  elements.logsScrim.classList.remove("active");
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
