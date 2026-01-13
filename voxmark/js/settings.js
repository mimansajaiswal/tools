function validateApiKey(provider, key) {
  if (!key) return false;
  if (provider === "openai") return key.startsWith("sk-");
  if (provider === "anthropic") return key.startsWith("sk-ant");
  if (provider === "gemini") return key.length >= 30;
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
    colorPalette: getPaletteFromDOM(),
    mockAI: elements.mockToggle.checked,
    tapFocus: state.settings.tapFocus,
    theme: state.settings.theme,
    ocrEnabled: elements.ocrToggle?.checked ?? false,
    invertPdf: elements.invertPdfToggle?.checked ?? false
  };

  if (
    settings.sttProvider !== "native" &&
    settings.sttKey &&
    !validateApiKey(settings.sttProvider, settings.sttKey)
  ) {
    notify("Settings", "Invalid STT API key format.", { type: "error", duration: 4000 });
    return;
  }
  if (settings.aiKey && !validateApiKey(settings.aiProvider, settings.aiKey)) {
    notify("Settings", "Invalid AI API key format.", { type: "error", duration: 4000 });
    return;
  }

  state.settings = normalizeSettings(settings);
  persistSettings();
  updatePdfInvert();
  notify("Settings", "Settings saved.");
}

async function loadSettings() {
  const stored = await loadSettingsFromDB();
  if (stored) {
    state.settings = { ...DEFAULT_SETTINGS, ...normalizeSettings(stored) };
  } else {
    const legacy = localStorage.getItem("voxmark-settings");
    if (legacy) {
      try {
        state.settings = { ...DEFAULT_SETTINGS, ...normalizeSettings(JSON.parse(legacy)) };
        persistSettings();
      } catch (err) {
        console.warn("Failed to parse settings", err);
      }
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
  renderPaletteEditor();
  elements.mockToggle.checked = state.settings.mockAI;
  if (elements.ocrToggle) {
    elements.ocrToggle.checked = !!state.settings.ocrEnabled;
  }
  if (elements.invertPdfToggle) {
    elements.invertPdfToggle.checked = !!state.settings.invertPdf;
  }
  setTapFocusButtonState(state.settings.tapFocus);
  applyTheme(state.settings.theme || "system");
  updateThemeToggleUI();
  bindSystemThemeListener();
  updatePdfInvert();
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
  saveSettingsToDB(state.settings);
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
    updateThemeColor(prefersDark ? "dark" : "light");
    updatePdfInvert();
    return;
  }
  root.setAttribute("data-theme", theme);
  updateThemeColor(theme);
  updatePdfInvert();
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

function updatePdfInvert() {
  const root = document.documentElement;
  const isDark = root.getAttribute("data-theme") === "dark";
  const shouldInvert = Boolean(state.settings.invertPdf && isDark);
  root.classList.toggle("pdf-invert", shouldInvert);
  if (state.pdfs?.length) {
    state.pdfs.forEach((pdfState) => {
      if (!pdfState.annotations?.length) return;
      applyAllAnnotations(pdfState, { invertForView: shouldInvert });
    });
  }
}

function normalizeSettings(settings) {
  return {
    ...settings,
    colorPalette: normalizePalette(settings.colorPalette)
  };
}

function normalizePalette(value) {
  if (!value) return [...DEFAULT_SETTINGS.colorPalette];
  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => ({
        name: String(entry.name || "").trim() || "Color",
        color: String(entry.color || "").trim() || "#f9de6f"
      }))
      .filter((entry) => entry.color);
    return normalized.length ? normalized : [...DEFAULT_SETTINGS.colorPalette];
  }
  if (typeof value === "string") {
    const names = value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (!names.length) return [...DEFAULT_SETTINGS.colorPalette];
    return names.map((name) => ({
      name,
      color: "#f9de6f"
    }));
  }
  return [...DEFAULT_SETTINGS.colorPalette];
}

function renderPaletteEditor() {
  if (!elements.paletteList) return;
  elements.paletteList.innerHTML = "";
  const palette = normalizePalette(state.settings.colorPalette);
  state.settings.colorPalette = palette;
  palette.forEach((entry, index) => {
    const row = document.createElement("div");
    row.className = "palette-row";
    row.dataset.index = `${index}`;
    row.innerHTML = `
      <input type="color" value="${entry.color}" aria-label="Color swatch" />
      <input type="text" value="${entry.name}" placeholder="Name" aria-label="Color name" />
      <button class="btn icon ghost small palette-remove" type="button" aria-label="Remove color">
        <i class="ph ph-x"></i>
      </button>
    `;
    elements.paletteList.appendChild(row);
  });
}

function getPaletteFromDOM() {
  if (!elements.paletteList) return [...state.settings.colorPalette];
  const rows = Array.from(elements.paletteList.querySelectorAll(".palette-row"));
  const palette = rows
    .map((row) => {
      const inputs = row.querySelectorAll("input");
      const color = inputs[0]?.value || "#f9de6f";
      const name = inputs[1]?.value || "Color";
      return {
        color: color.toLowerCase(),
        name: name.trim() || "Color"
      };
    })
    .filter((entry) => entry.color);
  return palette.length ? palette : [...DEFAULT_SETTINGS.colorPalette];
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

function updateThemeColor(theme) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const colors = {
    light: "#7b6d8d",
    dark: "#141210"
  };
  meta.setAttribute("content", colors[theme] || colors.light);
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
