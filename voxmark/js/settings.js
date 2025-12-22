function validateApiKey(provider, key) {
  if (!key) return false;
  if (provider === "openai") return key.startsWith("sk-");
  if (provider === "anthropic") return key.startsWith("sk-ant");
  if (provider === "gemini") return key.startsWith("AIza") || key.length > 20;
  return true;
}

function saveSettings() {
  const sttProvider = elements.sttProviderSelect.value;
  const settings = {
    sttProvider,
    sttModel: elements.sttModel.value.trim() || "whisper-1",
    sttKey: elements.sttKey.value.trim(),
    sttPrompt: elements.sttPrompt.value.trim(),
    aiProvider: elements.aiProvider.value,
    aiModel: elements.aiModel.value.trim() || "gpt-4o-mini",
    aiKey: elements.aiKey.value.trim(),
    customPrompt: elements.customPrompt.value.trim(),
    mockAI: elements.mockToggle.checked,
    tapFocus: state.settings.tapFocus,
    theme: state.settings.theme,
    ocrEnabled: elements.ocrToggle?.checked ?? false
  };

  if (settings.sttProvider !== "native" && !validateApiKey(settings.sttProvider, settings.sttKey)) {
    notify("Settings", "Invalid STT API key format.", { type: "error", duration: 4000 });
    return;
  }
  if (!validateApiKey(settings.aiProvider, settings.aiKey) && !settings.mockAI) {
    notify("Settings", "Invalid AI API key format.", { type: "error", duration: 4000 });
    return;
  }

  state.settings = settings;
  persistSettings();
  notify("Settings", "Settings saved.");
}

function loadSettings() {
  const stored = localStorage.getItem("voxmark-settings");
  if (stored) {
    try {
      state.settings = { ...state.settings, ...JSON.parse(stored) };
    } catch (err) {
      console.warn("Failed to parse settings", err);
    }
  }

  elements.sttProviderSelect.value = state.settings.sttProvider;
  elements.sttModel.value = state.settings.sttModel;
  elements.sttKey.value = state.settings.sttKey;
  elements.sttPrompt.value = state.settings.sttPrompt;
  elements.aiProvider.value = state.settings.aiProvider;
  elements.aiModel.value = state.settings.aiModel;
  elements.aiKey.value = state.settings.aiKey;
  elements.customPrompt.value = state.settings.customPrompt;
  elements.mockToggle.checked = state.settings.mockAI;
  if (elements.ocrToggle) {
    elements.ocrToggle.checked = !!state.settings.ocrEnabled;
  }
  setTapFocusButtonState(state.settings.tapFocus);
  applyTheme(state.settings.theme || "system");
  updateThemeToggleUI();
  bindSystemThemeListener();
}

function setMode(value) {
  state.mode = value;
  elements.processBatch.classList.toggle("hidden", value !== "batch");
  if (elements.processBatchMenu) {
    elements.processBatchMenu.classList.toggle("hidden", value !== "batch");
  }
  localStorage.setItem("voxmark-mode", value);
  saveSessionState({ mode: value });
  updateModeToggle();
}

function persistSettings() {
  localStorage.setItem("voxmark-settings", JSON.stringify(state.settings));
}

function setTapFocusButtonState(active) {
  elements.tapFocusButton.classList.toggle("toggle-active", active);
  elements.tapFocusButton.setAttribute("aria-pressed", active ? "true" : "false");
}

function applyTheme(mode) {
  const root = document.documentElement;
  const theme = mode || "system";
  if (theme === "system") {
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    return;
  }
  root.setAttribute("data-theme", theme);
}

function updateThemeToggleUI() {
  const theme = state.settings.theme || "system";
  const iconMap = {
    system: "ph-desktop",
    dark: "ph-moon-stars",
    light: "ph-sun"
  };
  const labelMap = {
    system: "System",
    dark: "Dark",
    light: "Light"
  };
  const iconClass = iconMap[theme] || iconMap.system;
  if (elements.themeToggleIcon) {
    elements.themeToggleIcon.className = `ph ${iconClass}`;
    elements.themeToggle.title = `Theme: ${labelMap[theme]}`;
    elements.themeToggle.setAttribute("aria-label", `Theme: ${labelMap[theme]}`);
  }
  if (elements.themeTogglePanelIcon) {
    elements.themeTogglePanelIcon.className = `ph ${iconClass}`;
  }
  if (elements.themeTogglePanelLabel) {
    elements.themeTogglePanelLabel.textContent = labelMap[theme];
  }
}

let themeMediaQuery;
function bindSystemThemeListener() {
  if (!window.matchMedia) return;
  if (!themeMediaQuery) {
    themeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  }
  const handler = () => {
    if ((state.settings.theme || "system") === "system") {
      applyTheme("system");
      updateThemeToggleUI();
    }
  };
  if (themeMediaQuery.addEventListener) {
    themeMediaQuery.addEventListener("change", handler);
  } else if (themeMediaQuery.addListener) {
    themeMediaQuery.addListener(handler);
  }
}

function cycleTheme() {
  const order = ["system", "dark", "light"];
  const current = state.settings.theme || "system";
  const next = order[(order.indexOf(current) + 1) % order.length];
  state.settings.theme = next;
  applyTheme(next);
  persistSettings();
  updateThemeToggleUI();
}

function updateModeToggle() {
  const isBatch = state.mode === "batch";
  if (elements.modeRealtime) {
    elements.modeRealtime.classList.toggle("toggle-active", !isBatch);
    elements.modeRealtime.setAttribute("aria-pressed", (!isBatch).toString());
  }
  if (elements.modeBatch) {
    elements.modeBatch.classList.toggle("toggle-active", isBatch);
    elements.modeBatch.setAttribute("aria-pressed", isBatch.toString());
  }
}
