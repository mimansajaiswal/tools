/**
 * Color Palette - Pastel "Dull" Tones
 */
const PALETTE = [
  "#FFB7B2", // Pastel Red/Rose
  "#FFDAC1", // Peach
  "#E2F0CB", // Pale Green
  "#B5EAD7", // Mint
  "#C7CEEA", // Periwinkle
  "#F0E6EF", // Lavender
  "#D4F1F4", // Sky
  "#F4D4D4", // Tea Rose
  "#FFD6A5", // Apricot
  "#FDFFB6", // Butter
  "#CAFFBF", // Spring
  "#9BF6FF", // Aqua
  "#A0C4FF", // Powder blue
  "#BDB2FF", // Violet blue
  "#FFC6FF", // Pink lilac
  "#E4C1F9", // Orchid
  "#FAD2E1", // Blush
  "#CDEAC0", // Sage
  "#B8E0D2", // Seafoam
  "#D6EADF", // Pale jade
  "#D0D1FF", // Periwinkle light
  "#E7D8C9", // Sand
  "#F6BD60", // Marigold
  "#A8DADC", // Sea glass
];

// Keep colors distinct beyond the curated palette without making them
// dependent on random state. The golden-angle hue step avoids adjacent
// options collapsing into the same color when a very large wheel is loaded.
const sliceColor = (index) => {
  if (PALETTE[index]) return PALETTE[index];
  const hue = (index * 137.508) % 360;
  return `hsl(${hue.toFixed(1)} 48% 78%)`;
};

const ICON_CHOICES = [
  ["droplets", "Droplets"],
  ["sparkles", "Sparkles"],
  ["bookmark", "Bookmark"],
  ["book-open", "Book"],
  ["file-text", "Document"],
  ["eye", "Eye"],
  ["scale", "Scale"],
  ["cloud", "Cloud"],
  ["cat", "Cat"],
  ["target", "Target"],
  ["heart", "Heart"],
  ["flag", "Flag"],
  ["map-pin", "Pin"],
  ["calendar", "Calendar"],
  ["star", "Star"],
];

const DEFAULT_ITEMS = [
  {
    id: "1",
    label: "Attention Is All You Need",
    weight: 1,
    desc: "The foundational paper introducing the Transformer architecture.",
    link: "https://arxiv.org/abs/1706.03762",
    icon: { type: "lucide", name: "eye" },
  },
  {
    id: "2",
    label: "GPT-4 Technical Report",
    weight: 1,
    desc: "OpenAI's report on the capabilities and safety of GPT-4.",
    link: "https://arxiv.org/abs/2303.08774",
    icon: { type: "lucide", name: "file-text" },
  },
  {
    id: "3",
    label: "Chain-of-Thought",
    weight: 1,
    desc: "Eliciting reasoning in large language models.",
    link: "https://arxiv.org/abs/2201.11903",
    icon: { type: "lucide", name: "cloud" },
  },
  {
    id: "4",
    label: "Llama 3",
    weight: 1,
    desc: "The latest open-weights model from Meta.",
    link: "https://ai.meta.com/blog/meta-llama-3/",
    icon: { type: "lucide", name: "cat" },
  },
  {
    id: "5",
    label: "Scaling Laws",
    weight: 1,
    desc: "Kaplan et al. on neural language model scaling.",
    link: "https://arxiv.org/abs/2001.08361",
    icon: { type: "lucide", name: "scale" },
  },
  {
    id: "6",
    label: "RLHF",
    weight: 1,
    desc: "Training language models to follow instructions.",
    link: "https://arxiv.org/abs/2203.02155",
    icon: { type: "lucide", name: "book-open" },
  },
];

class PickerApp {
  constructor() {
    this.canvas = document.getElementById("wheelCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.spinBtn = document.getElementById("spinBtn");
    this.currentWinnerDisplay = document.getElementById("current-winner"); // Get the display element
    this.items = [];
    this.angle = 0;
    this.isSpinning = false;
    this.spinVelocity = 0;
    this.name = "Reading list";
    this.source = null;
    this.savedId = null;
    this.library = [];
    this.frame = null;
    this.lastTickIndex = -1;
    this.iconImages = new Map();
    this.iconLoading = new Set();
    this.iconFailed = new Set();
    this.visualSegmentsCache = null;
    this.visualSegmentsRevision = 0;
    this.visualSegmentsCacheRevision = -1;
    this.visualSegmentsCacheMode = null;

    // Edit state
    this.editingId = null;
    this.idCounter = 0;

    // Audio State
    this.isMuted = this.readPreference("destinyDialMuted") === "true";
    this.audioCtx = null;
    this.showWheelIcons = this.readPreference("pickerWheelShowIcons") !== "false";
    this.weightVisualMode =
      this.readPreference("pickerWheelWeightVisual") === "dispersed"
        ? "dispersed"
        : "proportional";
    this.denseLabelMode =
      this.readPreference("pickerWheelDenseLabels") === "text"
        ? "text"
        : "numbers";

    // Theme State
    this.motionMode =
      this.readPreference("pickerWheelMotion") ||
      (matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "gentle"
        : "full");
    this.updateMotionButton();
    this.themeMode = this.readPreference("destinyDialTheme") || "system"; // light, dark, system

    this.resizeCanvas();

    // Init
    this.initTheme();
    this.updateMuteIcon();
    this.updateWheelIconsControl();
    this.updateWeightVisualControl();
    this.updateDenseLabelControl();
    this.loadData();
    this.initEvents();

    this.notion = new WheelNotion(this);
  }

  readPreference(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  // --- Theme Logic ---
  initTheme() {
    this.applyTheme();
    // Watch for system changes if in system mode
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        if (this.themeMode === "system") {
          this.applyTheme();
        }
      });
  }

  cycleTheme() {
    if (this.themeMode === "light") this.themeMode = "dark";
    else if (this.themeMode === "dark") this.themeMode = "system";
    else this.themeMode = "light";

    try {
      localStorage.setItem("destinyDialTheme", this.themeMode);
    } catch {
      /* The preference still applies in this tab. */
    }
    this.applyTheme();
  }

  applyTheme() {
    const root = document.documentElement;
    let isDark = false;

    if (this.themeMode === "dark") {
      isDark = true;
    } else if (this.themeMode === "light") {
      isDark = false;
    } else {
      // System
      isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    this.updateThemeIcon();
    this.drawWheel(); // Redraw canvas to pick up new background color
  }

  updateThemeIcon() {
    const btn = document.getElementById("themeBtn");
    // Sun Icon
    const sun = `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    // Moon Icon
    const moon = `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    // System Icon
    const system = `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;

    if (this.themeMode === "light") btn.innerHTML = sun;
    else if (this.themeMode === "dark") btn.innerHTML = moon;
    else btn.innerHTML = system;
  }

  // --- Data Management ---

  loadData() {
    try {
      this.library = JSON.parse(
        localStorage.getItem("pickerWheelLibrary") || "[]",
      );
      if (!Array.isArray(this.library)) throw new Error();
    } catch {
      this.library = [];
      this.showToast("Saved wheel library could not be read.");
    }
    const query = new URLSearchParams(location.search);
    const fragment = new URLSearchParams(location.hash.slice(1));
    const shared = fragment.get("wheel") || query.get("data");
    // Keep the last private draft intact when a shared copy is opened.
    try {
      const draft = localStorage.getItem("pickerWheelDraft");
      const legacy = localStorage.getItem("destinyWheelItems");
      this.applyWheel(
        draft
          ? JSON.parse(draft)
          : {
            version: 2,
            name: "Reading list",
            items: legacy ? JSON.parse(legacy) : DEFAULT_ITEMS,
          },
        true,
      );
    } catch {
      this.applyWheel({
        version: 2,
        name: "Reading list",
        items: DEFAULT_ITEMS,
      });
      this.showToast("The saved draft could not be read.");
    }
    if (shared) {
      try {
        const wheel = WheelCore.parseWheel(JSON.parse(shared));
        this.applyWheel(wheel);
        this.showToast(
          "Shared copy opened. Save it to keep it on this device.",
        );
      } catch (error) {
        this.showToast("Could not open shared wheel: " + error.message);
      }
      const clean = new URL(location.href);
      clean.searchParams.delete("data");
      fragment.delete("wheel");
      clean.hash = fragment.toString();
      history.replaceState({}, "", clean);
    }
    this.renderState();
  }

  applyWheel(raw, local = false) {
    const wheel = WheelCore.parseWheel(raw);
    this.items = wheel.items;
    this.invalidateVisualSegments();
    this.name = wheel.name;
    this.source = null;
    this.savedId =
      local && typeof raw.savedId === "string" ? raw.savedId : null;
    if (local && raw.source && WheelNotion.validId(raw.source.id)) {
      this.source = {
        id: raw.source.id,
        name: String(raw.source.name || "Notion database").slice(0, 300),
        mapping: WheelNotion.cleanMapping(raw.source.mapping),
      };
      this.items.forEach((item, index) => {
        const origin = raw.items[index]?.notion;
        if (
          origin &&
          WheelNotion.validId(origin.pageId) &&
          origin.sourceId === this.source.id
        )
          item.notion = { pageId: origin.pageId, sourceId: this.source.id };
      });
    }
    this.angle = 0;
    this.currentWinner = null;
    this.editingId = null;
    document.getElementById("current-winner").textContent = "";
    document.getElementById("idleCaption").hidden = false;
    document.getElementById("needleTip").setAttribute("fill", "#AB6153");
  }

  localWheel() {
    return {
      version: 2,
      name: this.name,
      items: this.items,
      source: this.source,
      savedId: this.savedId,
    };
  }

  renderState() {
    this.invalidateVisualSegments();
    document.getElementById("wheelName").value = this.name;
    document.getElementById("sourceBar").hidden = !this.source;
    document.getElementById("notionInvitation").hidden = !!this.source;
    document.getElementById("sourceLabel").textContent = this.source
      ? this.source.name
      : "";
    this.renderList();
    this.resizeCanvas();
    this.drawWheel();
    if (!this.currentWinner || !this.items.includes(this.currentWinner)) {
      document.getElementById("current-winner").textContent = "";
      document.getElementById("idleCaption").hidden = false;
    }
    this.spinBtn.disabled = !this.items.some((item) => item.weight > 0);
    this.updateIdleCaption();
  }

  updateIdleCaption() {
    const caption = document.getElementById("idleCaption");
    if (!caption) return;
    const activeCount = this.items.filter((item) => item.weight > 0).length;
    let message = "Spin to pick an option.";
    if (!this.items.length) message = "Add an option to begin.";
    else if (this.spinBtn.disabled) message = "Set a weight above 0 to spin.";
    else if (activeCount > 16) {
      message =
        this.denseLabelMode === "text"
          ? "Spin to pick. Dense labels are clipped to fit."
          : "Spin to pick. Numbers match the Options list.";
    }
    caption.textContent = message;
  }

  saveData() {
    const saved = this.persistDraft();
    this.renderState();
    return saved;
  }

  persistDraft() {
    let saved = true;
    try {
      localStorage.setItem(
        "pickerWheelDraft",
        JSON.stringify(this.localWheel()),
      );
    } catch {
      saved = false;
      this.showToast(
        "Storage is full or unavailable. Export your wheel to keep these changes.",
      );
    }
    document.getElementById("saveStatus").textContent = saved
      ? "Changes saved on this device"
      : "Not saved. Export a backup.";
    return saved;
  }

  renameDraft(value) {
    if (this.isSpinning) return;
    this.name = value.slice(0, 100);
    // Do not re-render the name input while typing.
    try {
      localStorage.setItem(
        "pickerWheelDraft",
        JSON.stringify(this.localWheel()),
      );
      document.getElementById("saveStatus").textContent =
        "Changes saved on this device";
    } catch {
      document.getElementById("saveStatus").textContent =
        "Not saved. Export a backup.";
    }
  }

  async newWheel() {
    if (
      this.isSpinning ||
      !(await this.confirmAction(
        "Start an empty wheel? Save this wheel first if you want to keep it in My wheels.",
      ))
    )
      return;
    this.applyWheel({ version: 2, name: "Untitled wheel", items: [] });
    this.saveData();
    this.openDialog("addDialog");
  }

  saveWheel() {
    if (this.isSpinning) return;
    this.name = this.name.trim() || "Untitled wheel";
    const id = this.savedId || this.generateId();
    const record = {
      id,
      updatedAt: new Date().toISOString(),
      wheel: JSON.parse(JSON.stringify({ ...this.localWheel(), savedId: id })),
    };
    const library = this.library
      .filter((entry) => entry.id !== id)
      .concat(record);
    try {
      localStorage.setItem("pickerWheelLibrary", JSON.stringify(library));
    } catch {
      this.showToast("Could not save this wheel. Export a file to keep it.");
      return;
    }
    this.library = library;
    this.savedId = id;
    this.saveData();
    document.getElementById("saveStatus").textContent = "Saved in My wheels";
    this.showToast("Saved to My wheels");
  }

  confirmAction(message) {
    if (this.pendingConfirmation) return Promise.resolve(false);
    document.getElementById("confirmTitle").textContent = message.startsWith(
      "Delete",
    )
      ? "Delete this saved wheel?"
      : "Replace this draft?";
    document.getElementById("confirmMessage").textContent = message;
    document.getElementById("confirmAccept").textContent = message.startsWith(
      "Delete",
    )
      ? "Delete wheel"
      : "Continue";
    return new Promise((resolve) => {
      this.pendingConfirmation = resolve;
      this.openDialog("confirmDialog");
    });
  }

  resolveConfirmation(accepted) {
    const resolve = this.pendingConfirmation;
    this.pendingConfirmation = null;
    this.closeDialog("confirmDialog");
    resolve?.(accepted);
  }

  openDialog(id) {
    const dialog = document.getElementById(id);
    this.dialogFocus ||= new Map();
    this.dialogFocus.set(id, document.activeElement);
    dialog.showModal();
  }

  closeDialog(id) {
    document.getElementById(id).close();
    this.dialogFocus?.get(id)?.focus();
  }

  openLibrary() {
    if (this.isSpinning) return;
    const list = document.getElementById("savedWheels");
    list.replaceChildren();
    if (!this.library.length)
      list.textContent = "No saved wheels yet. Name your wheel and press Save.";
    for (const entry of [...this.library].reverse()) {
      const row = document.createElement("div");
      row.className = "saved-wheel";
      const title = document.createElement("h3");
      title.textContent = entry.wheel?.name || "Untitled wheel";
      const info = document.createElement("p");
      info.textContent = `${entry.wheel?.items?.length || 0} options · ${entry.wheel?.source ? "Notion connected" : "Local wheel"} · ${new Date(entry.updatedAt).toLocaleDateString()}`;
      row.append(title, info);
      for (const [label, action] of [
        [
          "Load",
          async () => {
            if (
              !(await this.confirmAction(
                "Load this saved wheel? Current draft changes will be replaced.",
              ))
            )
              return;
            try {
              this.applyWheel(entry.wheel, true);
              this.saveData();
              this.closeDialog("libraryDialog");
            } catch (error) {
              this.showToast(error.message);
            }
          },
        ],
        [
          "Load as copy",
          async () => {
            if (
              !(await this.confirmAction(
                "Open a copy? Current draft changes will be replaced.",
              ))
            )
              return;
            try {
              this.applyWheel(entry.wheel, true);
              this.savedId = null;
              this.name = (this.name + " copy").slice(0, 100);
              this.saveData();
              this.closeDialog("libraryDialog");
            } catch (error) {
              this.showToast(error.message);
            }
          },
        ],
        [
          "Delete",
          async () => {
            if (
              !(await this.confirmAction(
                `Delete saved wheel “${entry.wheel?.name}”? The current draft will stay.`,
              ))
            )
              return;
            const next = this.library.filter((item) => item.id !== entry.id);
            try {
              localStorage.setItem("pickerWheelLibrary", JSON.stringify(next));
            } catch {
              this.showToast("Could not delete saved wheel.");
              return;
            }
            this.library = next;
            if (this.savedId === entry.id) {
              this.savedId = null;
              this.saveData();
            }
            this.closeDialog("libraryDialog");
            this.openLibrary();
          },
        ],
      ]) {
        const button = document.createElement("button");
        button.className = "btn-secondary";
        button.textContent = label;
        button.onclick = action;
        row.append(button);
      }
      list.append(row);
    }
    this.openDialog("libraryDialog");
  }

  detachNotion() {
    if (this.isSpinning) return;
    this.items.forEach((item) => delete item.notion);
    this.source = null;
    this.saveData();
    this.showToast("Wheel kept as a local copy.");
  }

  requestReset() {
    if (!this.isSpinning) this.openDialog("resetModal");
  }

  confirmReset() {
    if (this.isSpinning) return;
    this.applyWheel({ version: 2, name: "Reading list", items: DEFAULT_ITEMS });
    this.saveData();
    this.closeResetModal();
  }

  closeResetModal() {
    this.closeDialog("resetModal");
  }

  // --- Validation & Helpers ---

  sanitizeWeight(value) {
    if (
      String(value).trim() === "" ||
      !Number.isFinite(Number(value)) ||
      Number(value) < 0
    )
      return null;
    return WheelCore.weight(value);
  }

  normalizeItems(rawItems) {
    return WheelCore.normalizeItems(rawItems);
  }

  generateId() {
    return `item-${crypto.randomUUID()}`;
  }

  addItem(e) {
    e.preventDefault();
    if (this.isSpinning) return;
    const nameInput = document.getElementById("newItemName");
    const weightInput = document.getElementById("newItemWeight");
    const descInput = document.getElementById("newItemDesc");
    const linkInput = document.getElementById("newItemLink");
    const iconInput = document.getElementById("newItemIcon");

    if (!nameInput.value.trim()) return;
    if (this.items.length >= WheelCore.MAX_ITEMS) {
      this.showToast("A wheel can hold at most 1000 options.");
      return;
    }

    const sanitizedWeight = this.sanitizeWeight(weightInput.value);
    const newItem = {
      id: this.generateId(),
      label: nameInput.value.trim(),
      weight: sanitizedWeight ?? 1,
      desc: descInput.value.trim(),
      link: WheelCore.safeLink(linkInput.value.trim()),
      icon: WheelCore.normalizeIcon({
        type: "lucide",
        name: iconInput.value,
      }),
    };

    this.items.push(newItem);
    this.saveData();

    nameInput.value = "";
    descInput.value = "";
    linkInput.value = "";
    weightInput.value = 1;
    iconInput.value = "droplets";
    this.closeDialog("addDialog");
    this.showToast("Option added");
  }

  removeItem(id, e) {
    if (this.isSpinning) {
      return;
    }
    if (e) e.stopPropagation();
    this.items = this.items.filter((i) => i.id !== id);
    this.saveData();
  }

  updateWeight(id, newWeight, commit = true) {
    if (this.isSpinning) {
      return;
    }
    const item = this.items.find((i) => i.id === id);
    if (item) {
      const sanitized = this.sanitizeWeight(newWeight);
      if (sanitized === null) {
        // A blank intermediate input is allowed while typing.
        if (commit) this.renderList();
        return;
      }
      item.weight = sanitized;
      this.invalidateVisualSegments();
      if (commit) this.saveData();
      else {
        this.persistDraft();
        this.drawWheel();
        const total = this.items.reduce(
          (sum, option) => sum + option.weight,
          0,
        );
        document.getElementById("total-weight").textContent = Number(
          total.toFixed(3),
        );
        document.querySelectorAll("[data-chance-id]").forEach((el) => {
          const option = this.items.find(
            (option) => option.id === el.dataset.chanceId,
          );
          el.textContent = `${total ? ((option.weight / total) * 100).toFixed(1) : 0}% chance ${option.notion ? "· Notion" : ""}`;
        });
        this.spinBtn.disabled = !total;
      }
    }
  }

  // --- Inline Editing ---

  toggleEdit(id) {
    if (this.isSpinning) {
      return;
    }
    if (this.editingId === id) {
      this.editingId = null;
    } else {
      this.editingId = id;
    }
    this.renderList();
  }

  saveEdit(id) {
    if (this.isSpinning) {
      return;
    }
    const nameVal = document.getElementById(`edit-name-${id}`).value;
    const descVal = document.getElementById(`edit-desc-${id}`).value;
    const linkVal = document.getElementById(`edit-link-${id}`).value;
    const iconVal = document.getElementById(`edit-icon-${id}`)?.value;

    if (!nameVal.trim()) return;

    const item = this.items.find((i) => i.id === id);
    if (item) {
      item.label = nameVal.trim();
      item.desc = descVal.trim();
      item.link = WheelCore.safeLink(linkVal.trim());
      if (iconVal)
        item.icon = WheelCore.normalizeIcon({
          type: "lucide",
          name: iconVal,
        });

      this.saveData(); // Re-renders list and closes edit because renderList reads from data
      this.editingId = null;
      this.renderList();
    }
  }

  removeWinner() {
    if (this.currentWinner) {
      this.removeItem(this.currentWinner.id);
      this.closeModal();
    }
  }

  // --- Tools ---

  copyShareLink() {
    const data = WheelCore.snapshot({ name: this.name, items: this.items });
    const url = new URL(location.pathname, location.origin);
    url.hash = new URLSearchParams({ wheel: JSON.stringify(data) }).toString();
    document.getElementById("shareUrl").value = url.href;
    document.getElementById("shareWheelName").textContent =
      this.name || "Untitled wheel";
    document.getElementById("shareWheelCount").textContent =
      `${this.items.length} options · weighted wheel`;
    document.getElementById("copyShareButton").innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 8V4H4v11h4"/></svg>Copy link';
    document.getElementById("shareHint").textContent =
      url.href.length > 12000
        ? "This wheel makes a long link. A downloaded file may be easier to send."
        : "";
    this.openDialog("shareDialog");
  }

  async copyShareUrl() {
    try {
      await navigator.clipboard.writeText(
        document.getElementById("shareUrl").value,
      );
      document.getElementById("copyShareButton").textContent = "Link copied";
    } catch {
      document.querySelector(".share-link-details").open = true;
      document.getElementById("shareUrl").select();
      document.getElementById("shareHint").textContent =
        "Clipboard access is blocked. Copy the link below.";
    }
  }

  exportYAML() {
    const data = WheelCore.snapshot({ name: this.name, items: this.items });
    const blob = new Blob([jsyaml.dump(data)], { type: "application/yaml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${this.name.replace(/[^a-z0-9_-]/gi, "-").slice(0, 80) || "picker-wheel"}.yaml`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.showToast(
      "Exported a copy without Notion credentials or live connections.",
    );
  }

  async importYAML(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file || this.isSpinning) return;
    if (file.size > 5 * 1024 * 1024) {
      this.showToast("Choose a file smaller than 5 MB.");
      return;
    }
    try {
      const wheel = WheelCore.parseWheel(
        jsyaml.load(await file.text(), { schema: jsyaml.JSON_SCHEMA }),
      );
      if (
        this.isSpinning ||
        !(await this.confirmAction(
          "Import this wheel? Current draft changes will be replaced.",
        ))
      )
        return;
      this.applyWheel(wheel);
      this.saveData();
      this.showToast("Wheel imported");
    } catch (error) {
      this.showToast(`Could not import: ${error.message}`);
    }
  }

  // --- Visual Rendering ---

  iconDescriptor(item) {
    const icon = item?.icon;
    if (icon?.type === "emoji" || icon?.type === "notion") return icon;
    if (icon?.type === "lucide") return icon;
    return { type: "lucide", name: "droplets" };
  }

  iconOptions(selected = "droplets") {
    const choices = ICON_CHOICES.some(([name]) => name === selected)
      ? ICON_CHOICES
      : [[selected, this.iconLabel(selected)], ...ICON_CHOICES];
    return choices.map(
      ([name, label]) =>
        `<option value="${name}"${name === selected ? " selected" : ""}>${label}</option>`,
    ).join("");
  }

  iconLabel(name) {
    return String(name)
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  iconMarkup(item, extraClass = "") {
    const icon = this.iconDescriptor(item);
    const classes = `item-icon ${extraClass}`.trim();
    if (
      icon.type === "emoji" ||
      (icon.type === "notion" && icon.kind === "emoji")
    )
      return `<span class="${classes} item-icon-emoji" aria-hidden="true">${this.escapeHTML(icon.value)}</span>`;
    if (icon.type === "notion" && icon.url)
      return `<span class="${classes} item-icon-image"><img src="${this.escapeHTML(icon.url)}" alt="" loading="lazy" referrerpolicy="no-referrer"><i data-lucide="file-text" aria-hidden="true" hidden></i></span>`;
    const name = icon.type === "lucide" ? icon.name : "file-text";
    return `<span class="${classes} item-icon-lucide" aria-hidden="true"><i data-lucide="${this.escapeHTML(name)}"></i></span>`;
  }

  activateIcons() {
    if (typeof window === "undefined" || !window.lucide?.createIcons) return;
    try {
      window.lucide.createIcons();
    } catch {
      /* The wheel remains usable if the optional icon library is unavailable. */
    }
  }

  bindIconFallbacks(root) {
    root.querySelectorAll?.(".item-icon-image img").forEach((image) => {
      image.addEventListener("error", () => {
        image.hidden = true;
        const fallback = image.nextElementSibling;
        if (fallback) {
          fallback.hidden = false;
          this.activateIcons();
        }
      });
    });
  }

  iconNameToPascal(name) {
    return String(name)
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
  }

  canvasIconImage(icon) {
    const isNotionImage = icon?.type === "notion" && icon.url;
    const name =
      icon?.type === "lucide" && icon.name ? icon.name : "file-text";
    const key = isNotionImage ? `notion:${icon.url}` : `lucide:${name}`;
    if (this.iconImages.has(key)) return this.iconImages.get(key);
    if (this.iconFailed.has(key) || this.iconLoading.has(key)) return null;
    if (typeof window === "undefined") return null;
    if (isNotionImage) {
      const image = new window.Image();
      image.crossOrigin = "anonymous";
      this.iconLoading.add(key);
      image.onload = () => {
        this.iconLoading.delete(key);
        this.iconImages.set(key, image);
        this.drawWheel();
      };
      image.onerror = () => {
        this.iconLoading.delete(key);
        this.iconFailed.add(key);
        this.drawWheel();
      };
      image.src = icon.url;
      return null;
    }
    if (typeof XMLSerializer === "undefined" || !window.lucide?.icons)
      return null;
    const definition = window.lucide.icons[this.iconNameToPascal(name)];
    if (!definition) return null;
    let svg;
    try {
      svg = window.lucide.createElement(definition);
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      svg.setAttribute("width", "96");
      svg.setAttribute("height", "96");
      svg.setAttribute("stroke", "#4d174b");
      svg.setAttribute("stroke-width", "1.8");
      svg.setAttribute("fill", "none");
    } catch {
      return null;
    }
    const image = new window.Image();
    this.iconLoading.add(key);
    image.onload = () => {
      this.iconLoading.delete(key);
      this.iconImages.set(key, image);
      this.drawWheel();
    };
    image.onerror = () => {
      this.iconLoading.delete(key);
      this.iconFailed.add(key);
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
    return null;
  }

  drawCanvasIcon(icon, x, y, size) {
    const ctx = this.ctx;
    if (icon?.type === "emoji" || (icon?.type === "notion" && icon.kind === "emoji")) {
      ctx.save();
      ctx.font = `${Math.round(size)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(icon.value, x, y);
      ctx.restore();
      return true;
    }
    const image = this.canvasIconImage(icon);
    if (!image) return false;
    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
    ctx.restore();
    return true;
  }

  renderList() {
    const list = document.getElementById("itemList");
    const total = this.items.reduce((sum, item) => sum + item.weight, 0);
    list.replaceChildren();
    if (!this.items.length)
      list.innerHTML =
        '<p class="empty-list">Start with a few options.<br>Add your own or bring a list from Notion.</p>';
    this.items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "option-row";
      const chance = total ? ((item.weight / total) * 100).toFixed(1) : 0;
      row.innerHTML = `
                <div class="option-main">
                    <span class="option-index" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
                    <span class="option-swatch" style="background:${sliceColor(index)}" aria-hidden="true"></span>
                    ${this.iconMarkup(item, "option-icon")}
                    <button class="option-info" onclick="app.toggleEdit('${item.id}')" aria-label="Edit ${this.escapeHTML(item.label)}" aria-expanded="${this.editingId === item.id}">
                        <strong>${this.escapeHTML(item.label)}</strong>
                        <small>${this.escapeHTML(item.desc || (item.notion ? "From Notion" : "Click to add details"))}</small>
                    </button>
                    <span class="option-chance" aria-label="${chance}% chance">${chance}%</span>
                    <input class="option-weight" aria-label="Weight for ${this.escapeHTML(item.label)}" title="${chance}% chance" type="number" min="0" max="1000000" step="any" value="${item.weight}" oninput="app.updateWeight('${item.id}',this.value,false)" onchange="app.updateWeight('${item.id}',this.value)">
                    <button class="icon-button remove-option" aria-label="Remove ${this.escapeHTML(item.label)}" onclick="app.removeItem('${item.id}',event)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
                </div>`;
      if (this.editingId === item.id) {
        const edit = document.createElement("div");
        edit.className = "option-edit";
        const iconControl = item.notion
          ? `<div class="icon-source-note">${this.iconMarkup(item, "edit-icon")}<span>Notion page icon</span></div>`
          : `<label>Icon<select id="edit-icon-${item.id}" aria-label="Edit icon">${this.iconOptions(item.icon?.name || "droplets")}</select></label>`;
        edit.innerHTML = `
                    <label>Label<input id="edit-name-${item.id}" maxlength="300" aria-label="Edit label" value="${this.escapeHTML(item.label)}"></label>
                    <label>Description<input id="edit-desc-${item.id}" maxlength="4000" aria-label="Edit description" value="${this.escapeHTML(item.desc || "")}"></label>
                    <label>Link<input id="edit-link-${item.id}" type="url" aria-label="Edit link" value="${this.escapeHTML(item.link || "")}"></label>
                    ${iconControl}
                    <p data-chance-id="${item.id}" class="help">${chance}% chance${item.notion ? " · Local edits are replaced on refresh." : ""}</p>
                    <div class="button-row"><button class="btn-primary" onclick="app.saveEdit('${item.id}')">Save option</button><button class="btn-secondary" onclick="app.toggleEdit('${item.id}')">Cancel</button>${item.notion ? `<button class="text-button" onclick="app.notion.editPage('${item.id}')">Update in Notion</button>` : ""}</div>`;
        row.append(edit);
      }
      list.append(row);
    });
    document.getElementById("total-items").textContent = this.items.length;
    document.getElementById("total-weight").textContent = Number(
      total.toFixed(3),
    );
    this.bindIconFallbacks(list);
    this.activateIcons();
  }

  // --- Canvas Handling ---

  resizeCanvas() {
    if (!this.canvas) return;
    const container = this.canvas.parentElement;
    if (!container) return;
    const activeCount = this.items.filter((item) => item.weight > 0).length;
    container.dataset.density =
      activeCount > 16 ? "dense" : activeCount > 10 ? "compact" : "";
    const rect = container.getBoundingClientRect();
    const targetSize = Math.min(rect.width, rect.height || rect.width);
    if (!targetSize) return;
    const dpr = window.devicePixelRatio || 1;
    const pixelSize = Math.floor(targetSize * dpr);
    if (this.canvas.width !== pixelSize || this.canvas.height !== pixelSize) {
      this.canvas.width = pixelSize;
      this.canvas.height = pixelSize;
    }
    this.canvas.style.width = `${targetSize}px`;
    this.canvas.style.height = `${targetSize}px`;
  }

  handleResize() {
    this.resizeCanvas();
    this.drawWheel();
  }

  invalidateVisualSegments() {
    this.visualSegmentsRevision = (this.visualSegmentsRevision || 0) + 1;
  }

  getVisualSegments() {
    const mode = this.weightVisualMode === "dispersed" ? "dispersed" : "proportional";
    if (
      this.visualSegmentsCache &&
      this.visualSegmentsCacheRevision === this.visualSegmentsRevision &&
      this.visualSegmentsCacheMode === mode
    )
      return this.visualSegmentsCache;
    this.visualSegmentsCache = WheelCore.visualSegments(this.items, mode);
    this.visualSegmentsCacheRevision = this.visualSegmentsRevision;
    this.visualSegmentsCacheMode = mode;
    return this.visualSegmentsCache;
  }

  drawWheel() {
    const ctx = this.ctx;
    const size = this.canvas.width;
    const center = size / 2;
    const radius = center - 3;
    ctx.clearRect(0, 0, size, size);
    const segments = this.getVisualSegments();
    const total = segments.reduce((sum, segment) => sum + segment.weight, 0);
    if (!total) {
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#eeeae5";
      ctx.fill();
      return;
    }
    const activeCount = this.items.filter((item) => item.weight > 0).length;
    let start = this.angle;
    segments.forEach((segment) => {
      const item = segment.item;
      const index = segment.itemIndex;
      if (!segment.weight) return;
      const slice = (segment.weight / total) * Math.PI * 2;
      const end = start + slice;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = sliceColor(index);
      ctx.fill();
      ctx.strokeStyle = "#ffffffc9";
      ctx.lineWidth = size / 280;
      ctx.stroke();
      const mid = start + slice / 2;
      const labelRadius = radius * (activeCount === 1 ? 0.58 : 0.64);
      const crowded = activeCount > 12;
      const veryCrowded = activeCount > 24;
      const indexOnly = activeCount > 16 && this.denseLabelMode === "numbers";
      const clippedDense = activeCount > 16 && this.denseLabelMode === "text";
      const showLabel =
        this.weightVisualMode !== "dispersed" || segment.firstForItem;
      if (showLabel && indexOnly && slice * radius > size * 0.02) {
        ctx.save();
        ctx.translate(
          center + Math.cos(mid) * radius * 0.7,
          center + Math.sin(mid) * radius * 0.7,
        );
        const icon = this.iconDescriptor(item);
        const iconImageReady =
          this.showWheelIcons && icon.type === "notion" && icon.url
            ? !!this.canvasIconImage(icon)
            : false;
        const iconToDraw = iconImageReady
          ? icon
          : icon.type === "notion" && icon.url
            ? { type: "lucide", name: "file-text" }
            : icon;
        const iconReady =
          this.showWheelIcons &&
          (icon.type === "emoji" ||
            (icon.type === "notion" && icon.kind === "emoji") ||
            !!this.canvasIconImage(iconToDraw));
        const iconSize = Math.min(size / 24, Math.max(size / 34, 18));
        const gap = 4;
        const numberSize = Math.max(14, size / 32);
        const blockHeight = iconReady ? iconSize + gap + numberSize : numberSize;
        if (iconReady)
          this.drawCanvasIcon(iconToDraw, 0, -blockHeight / 2 + iconSize / 2, iconSize);
        ctx.font = `600 ${numberSize}px "DM Sans", sans-serif`;
        ctx.fillStyle = "#4d174b";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          String(index + 1).padStart(2, "0"),
          0,
          iconReady
            ? -blockHeight / 2 + iconSize + gap + numberSize / 2
            : 0,
        );
        ctx.restore();
      } else if (
        showLabel &&
        clippedDense &&
        slice * radius > size * 0.015
      ) {
        // Dense text mode keeps one short, upright line per segment. The
        // ellipsis makes the mapping readable without rotating or stacking
        // long titles into the neighboring slice.
        ctx.save();
        ctx.translate(
          center + Math.cos(mid) * radius * 0.7,
          center + Math.sin(mid) * radius * 0.7,
        );
        const fontSize = Math.max(
          14,
          Math.min(size / 44, slice * radius * 0.11),
        );
        ctx.font = `500 ${fontSize}px Fraunces, Georgia, serif`;
        ctx.fillStyle = "#30342f";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const maxWidth = Math.max(
          26,
          Math.min(radius * 0.48, slice * radius * 0.82),
        );
        const fullLabel = String(item.label || "")
          .replace(/\s+/g, " ")
          .trim();
        let label = fullLabel;
        while (
          label.length > 1 &&
          ctx.measureText(`${label}…`).width > maxWidth
        )
          label = label.slice(0, -1);

        const icon = this.iconDescriptor(item);
        const iconImageReady =
          this.showWheelIcons && icon.type === "notion" && icon.url
            ? !!this.canvasIconImage(icon)
            : false;
        const iconToDraw = iconImageReady
          ? icon
          : icon.type === "notion" && icon.url
            ? { type: "lucide", name: "file-text" }
            : icon;
        const iconReady =
          this.showWheelIcons &&
          (icon.type === "emoji" ||
            (icon.type === "notion" && icon.kind === "emoji") ||
            !!this.canvasIconImage(iconToDraw));
        const iconSize = Math.min(size / 34, Math.max(size / 54, fontSize));
        const iconGap = Math.max(2, fontSize * 0.12);
        const textHeight = fontSize * 1.1;
        const blockHeight = iconReady
          ? iconSize + iconGap + textHeight
          : textHeight;
        if (iconReady)
          this.drawCanvasIcon(
            iconToDraw,
            0,
            -blockHeight / 2 + iconSize / 2,
            iconSize,
          );
        ctx.fillText(
          label === fullLabel ? label : `${label}…`,
          0,
          iconReady
            ? -blockHeight / 2 + iconSize + iconGap + textHeight / 2
            : 0,
          maxWidth,
        );
        ctx.restore();
      } else if (
        showLabel &&
        !clippedDense &&
        slice * radius > size * (crowded ? 0.032 : 0.055)
      ) {
        ctx.save();
        ctx.translate(
          center + Math.cos(mid) * radius * (crowded ? 0.7 : labelRadius / radius),
          center + Math.sin(mid) * radius * (crowded ? 0.7 : labelRadius / radius),
        );
        if (crowded) {
          let rotation = mid + Math.PI / 2;
          if (Math.sin(mid) > 0) rotation += Math.PI;
          ctx.rotate(rotation);
        }
        const fontSize = Math.max(
          size / (veryCrowded ? 86 : crowded ? 70 : 55),
          Math.min(
            size / (crowded ? 40 : 29),
            slice * radius * (crowded ? 0.12 : 0.18),
          ),
        );
        ctx.font = `500 ${fontSize}px Fraunces, Georgia, serif`;
        ctx.fillStyle = "#30342f";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const maxWidth = Math.min(
          radius * (crowded ? 0.44 : 0.58),
          slice * radius * (crowded ? 0.7 : 0.64),
        );
        let lines;
        if (crowded) {
          let label = item.label;
          while (label.length > 1 && ctx.measureText(`${label}…`).width > maxWidth)
            label = label.slice(0, -1);
          lines = [label === item.label ? label : `${label}…`];
        } else {
          const words = item.label.split(/\s+/);
          lines = [];
          let line = "";
          for (const word of words) {
            const next = line ? line + " " + word : word;
            if (line && ctx.measureText(next).width > maxWidth) {
              lines.push(line);
              line = word;
            } else line = next;
          }
          if (line) lines.push(line);
          const truncated = lines.length > 3;
          lines = lines.slice(0, 3);
          if (truncated)
            lines[2] += "…";
        }
        const lineHeight = fontSize * 1.25;
        const icon = this.iconDescriptor(item);
        const iconImageReady = this.showWheelIcons && icon.type === "notion" && icon.url
          ? !!this.canvasIconImage(icon)
          : false;
        const iconToDraw = iconImageReady
          ? icon
          : icon.type === "notion" && icon.url
            ? { type: "lucide", name: "file-text" }
            : icon;
        const iconReady = this.showWheelIcons &&
          (icon.type === "emoji" ||
            (icon.type === "notion" && icon.kind === "emoji") ||
            !!this.canvasIconImage(iconToDraw));
        const iconSize = Math.max(
          size / (crowded ? 60 : 38),
          Math.min(size / (crowded ? 42 : 22), fontSize * 1.25),
        );
        const iconGap = Math.max(3, fontSize * 0.14);
        const textBlock = lines.length * lineHeight;
        const totalBlock = iconReady ? iconSize + iconGap + textBlock : textBlock;
        if (iconReady)
          this.drawCanvasIcon(
            iconToDraw,
            0,
            -totalBlock / 2 + iconSize / 2,
            iconSize,
          );
        const textTop = iconReady
          ? -totalBlock / 2 + iconSize + iconGap
          : -textBlock / 2;
        lines.forEach((text, i) =>
          ctx.fillText(
            text,
            0,
            textTop + lineHeight / 2 + i * lineHeight,
            maxWidth,
          ),
        );
        ctx.restore();
      }
      start = end;
    });
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#AB6153";
    ctx.lineWidth = Math.max(1.5, size / 280);
    ctx.stroke();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem("destinyDialMuted", this.isMuted);
    } catch {
      /* The preference still applies in this tab. */
    }
    this.updateMuteIcon();
  }

  toggleWheelIcons() {
    this.showWheelIcons = !this.showWheelIcons;
    try {
      localStorage.setItem("pickerWheelShowIcons", String(this.showWheelIcons));
    } catch {
      /* The preference still applies in memory. */
    }
    this.updateWheelIconsControl();
    this.drawWheel();
  }

  updateWheelIconsControl() {
    const button = document.getElementById("wheelIconsBtn");
    if (!button) return;
    button.textContent = this.showWheelIcons ? "Hide icons" : "Show icons";
    button.setAttribute("aria-pressed", String(this.showWheelIcons));
    button.setAttribute(
      "aria-label",
      this.showWheelIcons ? "Hide icons from the wheel" : "Show icons on the wheel",
    );
  }

  setWeightVisual(mode) {
    if (this.isSpinning || !["proportional", "dispersed"].includes(mode)) return;
    this.weightVisualMode = mode;
    try {
      localStorage.setItem("pickerWheelWeightVisual", mode);
    } catch {
      /* The preference still applies in memory. */
    }
    this.angle = 0;
    this.invalidateVisualSegments();
    this.updateWeightVisualControl();
    this.drawWheel();
  }

  updateWeightVisualControl() {
    const proportional = document.getElementById("weightVisualProportional");
    const dispersed = document.getElementById("weightVisualDispersed");
    if (!proportional || !dispersed) return;
    const isDispersed = this.weightVisualMode === "dispersed";
    proportional.setAttribute("aria-pressed", String(!isDispersed));
    dispersed.setAttribute("aria-pressed", String(isDispersed));
    proportional.title = "Show a larger slice for a heavier option";
    dispersed.title = "Spread a heavier option into multiple chances";
  }

  setDenseLabelMode(mode) {
    if (this.isSpinning || !["numbers", "text"].includes(mode)) return;
    this.denseLabelMode = mode;
    try {
      localStorage.setItem("pickerWheelDenseLabels", mode);
    } catch {
      /* The preference still applies in memory. */
    }
    this.updateDenseLabelControl();
    this.updateIdleCaption();
    this.drawWheel();
  }

  updateDenseLabelControl() {
    const numbers = document.getElementById("denseLabelsNumbers");
    const text = document.getElementById("denseLabelsText");
    if (!numbers || !text) return;
    const isText = this.denseLabelMode === "text";
    numbers.setAttribute("aria-pressed", String(!isText));
    text.setAttribute("aria-pressed", String(isText));
    numbers.title = "Use numbered segments when the wheel is dense";
    text.title = "Show a clipped label when the wheel is dense";
  }

  updateMuteIcon() {
    const button = document.getElementById("muteBtn");
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4Z"/>${this.isMuted ? '<path d="m17 9 5 6m0-6-5 6"/>' : '<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'}</svg>${this.isMuted ? "Sound off" : "Sound on"}`;
    button.setAttribute("aria-pressed", String(!this.isMuted));
  }

  playTick() {
    if (this.isMuted || !this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      100,
      this.audioCtx.currentTime + 0.05,
    );
    gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioCtx.currentTime + 0.05,
    );
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.05);
  }

  playDing() {
    if (this.isMuted || !this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      523.25,
      this.audioCtx.currentTime + 1,
    );
    gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.audioCtx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioCtx.currentTime + 1.5,
    );
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 1.5);
  }

  initEvents() {
    document
      .getElementById("confirmDialog")
      .addEventListener("cancel", (event) => {
        event.preventDefault();
        this.resolveConfirmation(false);
      });
    document.querySelectorAll("dialog").forEach((dialog) => {
      dialog.addEventListener("close", () =>
        this.dialogFocus?.get(dialog.id)?.focus(),
      );
    });
    // Fonts can load after the first canvas draw.
    document.fonts?.ready.then(() => {
      if (!this.isSpinning) this.drawWheel();
    });
  }

  spin() {
    if (this.isSpinning) return;
    const random = () =>
      crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
    const visualSegments = this.getVisualSegments();
    const plan = WheelCore.spinPlan(visualSegments, this.angle, random);
    if (!plan) {
      this.showToast("Add an option with weight greater than zero.");
      return;
    }
    try {
      if (!this.audioCtx) this.audioCtx = new AudioContext();
      this.audioCtx.resume().catch(() => { });
    } catch {
      /* Wheel motion does not require audio access. */
    }
    this.isSpinning = true;
    this.spinBtn.disabled = true;
    this.spinBtn.textContent = "Spinning";
    this.setSpinLock(true);
    this.currentWinner = null;
    this.plan = {
      ...plan,
      visualSegments,
      winnerItemIndex: visualSegments[plan.winner].itemIndex,
      startAngle: this.angle,
      startedAt: performance.now(),
    };
    this.lastTickIndex = WheelCore.indexAtNeedle(visualSegments, this.angle);
    document.getElementById("current-winner").textContent = "";
    document.getElementById("idleCaption").hidden = false;
    if (this.motionMode === "gentle") {
      this.plan.distance = WheelCore.gentleDistance(this.angle, plan.target);
      this.plan.duration = 1800;
    }
    this.frame = requestAnimationFrame((timestamp) => this.loop(timestamp));
  }

  toggleMotion() {
    this.setMotion(this.motionMode === "full" ? "gentle" : "full");
  }

  setMotion(mode) {
    if (this.isSpinning || !["full", "gentle"].includes(mode)) return;
    this.motionMode = mode;
    try {
      localStorage.setItem("pickerWheelMotion", this.motionMode);
    } catch {
      /* This preference still applies in memory. */
    }
    this.updateMotionButton();
  }

  updateMotionButton() {
    const gentle = document.getElementById("motionGentle");
    const full = document.getElementById("motionFull");
    if (gentle && full) {
      gentle.setAttribute("aria-pressed", String(this.motionMode === "gentle"));
      full.setAttribute("aria-pressed", String(this.motionMode === "full"));
      gentle.title = "A short, calm turn";
      full.title = "A longer, more dramatic spin";
      return;
    }
    // Keeps older embedded copies of the page usable during an update.
    const button = document.getElementById("motionBtn");
    if (button) {
      button.textContent =
        this.motionMode === "full" ? "Full spin" : "Gentle spin";
      button.setAttribute(
        "aria-label",
        this.motionMode === "full"
          ? "Full spin. Switch to gentle spin"
          : "Gentle spin. Switch to full spin",
      );
    }
  }

  setSpinLock(locked) {
    document.getElementById("wheelToolbar").inert = locked;
    document.getElementById("sourceBar").inert = locked;
    document.querySelector("main > section:last-child").inert = locked;
  }

  loop(timestamp) {
    if (!this.isSpinning) return;
    const progress = Math.min(
      1,
      (timestamp - this.plan.startedAt) / this.plan.duration,
    );
    const previous = this.angle;
    this.angle =
      this.plan.startAngle +
      this.plan.distance * WheelCore.spinProgress(progress);
    const segmentIndex = WheelCore.indexAtNeedle(
      this.plan.visualSegments,
      this.angle,
    );
    if (segmentIndex !== this.lastTickIndex && segmentIndex >= 0) {
      this.playTick();
      const itemIndex = this.plan.visualSegments[segmentIndex].itemIndex;
      document
        .getElementById("needleTip")
        .setAttribute("fill", sliceColor(itemIndex));
      this.needleAnimation?.cancel();
      const flex = Math.min(22, 6 + Math.abs(this.angle - previous) * 35);
      this.needleAnimation = document
        .getElementById("needle")
        .animate(
          [
            { transform: "translateX(-50%) rotate(0deg)" },
            { transform: `translateX(-50%) rotate(-${flex}deg)`, offset: 0.2 },
            { transform: "translateX(-50%) rotate(4deg)", offset: 0.65 },
            { transform: "translateX(-50%) rotate(0deg)" },
          ],
          { duration: 160, easing: "ease-out" },
        );
      this.lastTickIndex = segmentIndex;
    }
    if (progress >= 1) {
      this.angle = this.plan.target;
      this.drawWheel();
      this.finishSpin(this.plan.winnerItemIndex);
      return;
    }
    this.drawWheel();
    this.frame = requestAnimationFrame((time) => this.loop(time));
  }

  finishSpin(winningIndex) {
    this.isSpinning = false;
    this.frame = null;
    this.setSpinLock(false);
    this.spinBtn.textContent = "SPIN";
    document
      .getElementById("needleTip")
      .setAttribute("fill", sliceColor(winningIndex));
    this.spinBtn.disabled = false;
    this.spinBtn.style.opacity = "1";
    this.playDing();

    const winner = this.items[winningIndex];
    this.currentWinner = winner;
    document.getElementById("winnerNotion").hidden = !winner.notion;
    const winnerSymbol = document.getElementById("winnerSymbol");
    winnerSymbol.innerHTML = this.iconMarkup(winner, "winner-item-icon");
    this.bindIconFallbacks(winnerSymbol);
    this.activateIcons();

    // Show the text below the wheel now
    const feedback = document.getElementById("current-winner");
    feedback.innerText = winner.label;
    feedback.style.opacity = "1";
    document.getElementById("idleCaption").hidden = true;

    document.getElementById("winnerName").innerText = winner.label;
    document.getElementById("winnerDesc").innerText = winner.desc || "";

    const wLink = document.getElementById("winnerLink");

    wLink.hidden = !winner.link;
    if (winner.link) wLink.href = winner.link;

    this.openDialog("resultModal");
  }

  closeModal() {
    this.closeDialog("resultModal");
  }

  escapeHTML(value) {
    return String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }

  showToast(msg) {
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove("show"), 5500);
  }
}

const app = new PickerApp();
window.addEventListener("resize", () => app.handleResize());
