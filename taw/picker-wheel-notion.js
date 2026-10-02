/* Optional Notion connection. No network calls are made until the user connects. */
(function (root) {
  "use strict";
  const Core =
    typeof module !== "undefined" && module.exports
      ? require("./picker-wheel-core.js")
      : root.WheelCore;
  const DEFAULT_OAUTH =
    "https://notion-oauth-handler.mimansa-jaiswal.workers.dev";
  const SETTINGS_KEY = "pickerWheelNotionConnection";
  const MAX_BROWSE_ROWS = 10000;
  const MAX_RENDERED_ROWS = 200;
  const $ = (id) => document.getElementById(id);
  const richText = (value) =>
    (value || [])
      .map((part) => part.plain_text ?? part.text?.content ?? "")
      .join("");
  function property(page, id) {
    return (
      Object.values(page.properties || {}).find((value) => value.id === id) ||
      page.properties?.[id]
    );
  }
  function valueText(prop) {
    if (!prop) return "";
    const value = prop[prop.type];
    switch (prop.type) {
      case "title":
      case "rich_text":
        return richText(value);
      case "select":
      case "status":
        return value?.name || "";
      case "multi_select":
        return (value || []).map((item) => item.name).join(", ");
      case "checkbox":
        return value ? "Checked" : "Unchecked";
      case "number":
        return value === null ? "" : String(value);
      case "url":
      case "email":
      case "phone_number":
        return value || "";
      case "date":
        return value?.start || "";
      case "formula":
        return value ? valueText({ type: value.type, ...value }) : "";
      case "string":
        return value || "";
      case "boolean":
        return value ? "True" : "False";
      default:
        return "";
    }
  }
  function pageIcon(page) {
    const icon = page?.icon;
    if (!icon || typeof icon !== "object")
      return { type: "lucide", name: "file-text" };
    if (icon.type === "emoji" && typeof icon.emoji === "string")
      return { type: "notion", kind: "emoji", value: icon.emoji.slice(0, 16) };
    if (["custom_emoji", "external", "file"].includes(icon.type)) {
      const url = Core.safeLink(icon[icon.type]?.url);
      if (url && new URL(url).protocol === "https:")
        return { type: "notion", kind: icon.type, url: url.slice(0, 4000) };
    }
    return { type: "lucide", name: "file-text" };
  }
  function mapPage(page, mapping, sourceId) {
    return {
      id: `notion-${page.id}`,
      label:
        valueText(property(page, mapping.label)).trim().slice(0, 300) ||
        "Untitled",
      desc: valueText(property(page, mapping.description)).slice(0, 4000),
      weight: mapping.weight
        ? Core.weight(property(page, mapping.weight)?.number)
        : 1,
      link: Core.safeLink(
        mapping.link ? valueText(property(page, mapping.link)) : page.url,
      ),
      icon: pageIcon(page),
      notion: { pageId: page.id, sourceId },
    };
  }
  function filterPage(page, id, value) {
    if (!id || !value) return true;
    const prop = property(page, id);
    if (prop?.type === "multi_select")
      return (prop.multi_select || []).some((option) => option.name === value);
    return valueText(prop) === value;
  }
  function selectRows(rows, mode, count, random = Math.random) {
    if (!Array.isArray(rows)) return [];
    const limit = Math.min(
      Core.MAX_ITEMS,
      rows.length,
      Math.max(0, Math.floor(Number(count) || 0)),
    );
    if (mode === "first") return rows.slice(0, limit);
    if (mode !== "random" || !limit) return [];
    const sample = rows.slice();
    for (let index = 0; index < limit; index++) {
      const draw = Number(random());
      const normalized = Number.isFinite(draw)
        ? Math.min(1 - Number.EPSILON, Math.max(0, draw))
        : 0;
      const offset = Math.floor(normalized * (sample.length - index));
      const swapIndex = index + offset;
      [sample[index], sample[swapIndex]] = [sample[swapIndex], sample[index]];
    }
    return sample.slice(0, limit);
  }
  function validateProxy(value) {
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error("Enter your proxy Worker URL first.");
    }
    const local = ["localhost", "127.0.0.1"].includes(url.hostname);
    if (
      (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error(
        "Use an HTTPS proxy URL without credentials, query parameters or a fragment.",
      );
    return url.href.replace(/\/$/, "");
  }
  class WheelNotion {
    static validId(value) {
      return (
        typeof value === "string" &&
        /^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$/i.test(
          value,
        )
      );
    }
    static cleanMapping(raw) {
      return Object.fromEntries(
        ["label", "weight", "description", "link"].map((key) => [
          key,
          typeof raw?.[key] === "string" ? raw[key].slice(0, 200) : "",
        ]),
      );
    }
    constructor(app) {
      this.app = app;
      this.settings = {};
      this.sources = [];
      this.rows = [];
      this.selected = new Set();
      this.connected = false;
      this.busy = false;
      try {
        this.settings = JSON.parse(
          sessionStorage.getItem(SETTINGS_KEY) ||
          localStorage.getItem(SETTINGS_KEY) ||
          "{}",
        );
      } catch {
        /* Start disconnected if storage cannot be read. */
      }
      this.consumeOAuth();
      $("notionDialog").addEventListener("close", () => {
        if (this.busy) this.controller?.abort();
      });
      this.selectionModeChanged();
    }
    status(message, error = false) {
      $("notionStatus").textContent = message;
      $("notionStatus").dataset.error = String(error);
    }
    open() {
      if (this.app.isSpinning) return;
      $("notionProxy").value = this.settings.workerUrl || "";
      $("notionProxyToken").value = this.settings.proxyToken || "";
      $("notionToken").value = this.settings.authToken || "";
      $("notionRemember").checked = !!this.settings.remember;
      $("notionOAuth").value = this.settings.oauthUrl || DEFAULT_OAUTH;
      $("notionBrowser").disabled = !this.connected;
      $("notionBrowser").hidden = !this.connected;
      this.status(
        this.connected
          ? "Connected. Choose a database or adjust your selection."
          : "Share your database with the integration before connecting.",
      );
      this.app.openDialog("notionDialog");
    }
    readSettings() {
      return {
        workerUrl: validateProxy($("notionProxy").value.trim()),
        proxyToken: $("notionProxyToken").value.trim(),
        authToken: $("notionToken").value.trim(),
        oauthUrl: validateProxy($("notionOAuth").value.trim() || DEFAULT_OAUTH),
        remember: $("notionRemember").checked,
      };
    }
    storeSettings(settings) {
      // Never include this object in wheel drafts, exports, or links.
      const store = settings.remember ? localStorage : sessionStorage;
      store.setItem(SETTINGS_KEY, JSON.stringify(settings));
      (settings.remember ? sessionStorage : localStorage).removeItem(
        SETTINGS_KEY,
      );
      this.settings = settings;
    }
    async run(message, action, target = "notionStatus") {
      if (this.busy || this.app.isSpinning) return;
      this.busy = true;
      this.controller = new AbortController();
      const el = $(target);
      el.textContent = message;
      el.dataset.error = "false";
      const dialog =
        target === "notionEditStatus"
          ? $("notionEditDialog")
          : $("notionDialog");
      for (const child of dialog.children)
        if (!child.classList.contains("dialog-heading")) child.inert = true;
      this.app.setSpinLock(true);
      this.app.spinBtn.disabled = true;
      try {
        await action();
      } catch (error) {
        if (error.name !== "AbortError") {
          el.textContent = error.message;
          el.dataset.error = "true";
          if (!dialog.open) this.app.showToast(error.message);
        }
      } finally {
        this.busy = false;
        for (const child of dialog.children) child.inert = false;
        this.app.setSpinLock(false);
        this.app.renderState();
      }
    }
    async request(method, endpoint, body, settings = this.settings) {
      if (!settings.authToken) throw new Error("Connect Notion first.");
      // Pace paginated requests to respect Notion's average rate limit.
      const delay = Math.max(0, 350 - (Date.now() - (this.lastRequest || 0)));
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      this.controller?.signal.throwIfAborted();
      this.lastRequest = Date.now();
      const url = new URL(validateProxy(settings.workerUrl));
      url.searchParams.set("url", `https://api.notion.com/v1${endpoint}`);
      const headers = {
        Authorization: `Bearer ${settings.authToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2025-09-03",
      };
      if (settings.proxyToken) headers["X-Proxy-Token"] = settings.proxyToken;
      let response;
      try {
        response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.any(
            [this.controller?.signal, AbortSignal.timeout(30000)].filter(
              Boolean,
            ),
          ),
          credentials: "omit",
          referrerPolicy: "no-referrer",
        });
      } catch (error) {
        if (error.name === "AbortError") throw error;
        if (error.name === "TimeoutError")
          throw new Error(
            "Notion took too long to respond. Your wheel is unchanged.",
          );
        throw new Error(
          "Could not reach the Notion proxy. Check the Worker URL, allowed origin and your connection.",
        );
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const advice = {
          401: "Reconnect with a valid Notion token.",
          403: "Check the proxy token and integration permissions.",
          404: "Share this database with the Notion integration.",
          429: `Notion is rate limiting requests. Try again in ${response.headers.get("Retry-After") || "a few"} seconds.`,
        };
        throw new Error(
          `${advice[response.status] || `Notion request failed (${response.status}).`} ${data.message || ""}`.trim(),
        );
      }
      return data;
    }
    async paginate(
      endpoint,
      body = {},
      maxItems = Core.MAX_ITEMS,
      onProgress,
    ) {
      const results = [];
      let cursor;
      do {
        const data = await this.request("POST", endpoint, {
          ...body,
          page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {}),
        });
        if (!Array.isArray(data.results))
          throw new Error("The proxy returned an invalid Notion response.");
        results.push(...data.results);
        onProgress?.(results.length, Boolean(data.has_more));
        if (
          results.length > maxItems ||
          (results.length === maxItems && data.has_more)
        )
          throw new Error(
            `This source has more than ${maxItems} rows. Use a smaller data source; no partial results were added.`,
          );
        cursor = data.has_more ? data.next_cursor : null;
        if (data.has_more && !cursor)
          throw new Error(
            "Notion did not return the next page cursor. Try the request again.",
          );
      } while (cursor);
      return results;
    }
    async connect() {
      await this.run("Verifying connection…", async () => {
        const settings = this.readSettings();
        await this.request("GET", "/users/me", undefined, settings);
        this.storeSettings(settings);
        this.connected = true;
        $("notionBrowser").disabled = false;
        $("notionBrowser").hidden = false;
        $("connectionDetails").open = false;
        await this.findSources();
      });
    }
    async search() {
      await this.run("Searching databases…", () => this.findSources());
    }
    async findSources() {
      this.sources = await this.paginate("/search", {
        filter: { value: "data_source", property: "object" },
        query: $("notionDatabaseSearch").value.trim(),
      });
      const select = $("notionDatabase");
      select.replaceChildren(new Option("Choose a database", ""));
      this.sources.forEach((source) =>
        select.add(
          new Option(richText(source.title) || "Untitled database", source.id),
        ),
      );
      this.rows = [];
      this.schema = null;
      this.source = null;
      this.selected.clear();
      $("notionMapping").disabled = true;
      $("notionMapping").hidden = true;
      $("notionRows").replaceChildren();
      this.selectionModeChanged();
      this.status(
        this.sources.length
          ? `Found ${this.sources.length} data sources. Choose one to load its rows.`
          : "No databases found. Add this integration under the database’s Connections menu, then search again.",
      );
    }
    async chooseSource(id) {
      await this.run("Loading database properties and rows…", async () => {
        this.rows = [];
        this.selected.clear();
        this.schema = null;
        this.source = null;
        $("notionMapping").disabled = true;
        $("notionMapping").hidden = true;
        $("notionRows").replaceChildren();
        this.selectionModeChanged();
        if (!id) return;
        const source = await this.request(
          "GET",
          `/data_sources/${encodeURIComponent(id)}`,
        );
        const rows = await this.paginate(
          `/data_sources/${encodeURIComponent(id)}/query`,
          {},
          MAX_BROWSE_ROWS,
          (loaded, hasMore) =>
            this.status(
              `Loading rows… ${loaded.toLocaleString()}${hasMore ? " loaded" : ""}`,
            ),
        );
        this.source = source;
        this.schema = source.properties;
        this.rows = rows.filter((page) => !page.archived && !page.in_trash);
        this.selected = new Set(
          this.app.items
            .filter((item) => item.notion?.sourceId === id)
            .map((item) => item.notion.pageId),
        );
        this.fillMapping();
        $("notionMapping").disabled = false;
        $("notionMapping").hidden = false;
        $("notionRowSearch").value = "";
        this.renderRows();
        this.status(
          `Loaded ${this.rows.length} rows. Map properties and choose which rows to add.`,
        );
      });
    }
    fillSelect(id, props, first) {
      const select = $(id);
      select.replaceChildren();
      if (first) select.add(new Option(first, ""));
      props.forEach((prop) =>
        select.add(new Option(`${prop.name} (${prop.type})`, prop.id)),
      );
    }
    fillMapping() {
      const props = Object.entries(this.schema).map(([name, prop]) => ({
        ...prop,
        name: prop.name || name,
      }));
      this.fillSelect(
        "notionLabel",
        props.filter((prop) =>
          [
            "title",
            "rich_text",
            "select",
            "status",
            "number",
            "formula",
          ].includes(prop.type),
        ),
      );
      $("notionLabel").value =
        props.find((prop) => prop.type === "title")?.id || props[0]?.id || "";
      this.fillSelect(
        "notionWeight",
        props.filter((prop) => prop.type === "number"),
        "Equal chance (1)",
      );
      this.fillSelect(
        "notionDescription",
        props.filter((prop) =>
          [
            "rich_text",
            "select",
            "status",
            "formula",
            "url",
            "number",
          ].includes(prop.type),
        ),
        "No description",
      );
      this.fillSelect(
        "notionLink",
        props.filter((prop) => prop.type === "url"),
        "Notion page link",
      );
      this.fillSelect(
        "notionFilterProperty",
        props.filter((prop) =>
          ["select", "status", "multi_select", "checkbox"].includes(prop.type),
        ),
        "All rows",
      );
      if (this.app.source?.id === this.source.id) {
        for (const [key, suffix] of Object.entries({
          label: "Label",
          weight: "Weight",
          description: "Description",
          link: "Link",
        })) {
          const id = this.app.source.mapping[key];
          if (
            [...$("notion" + suffix).options].some(
              (option) => option.value === id,
            )
          )
            $("notion" + suffix).value = id;
        }
      }
      this.filterChanged();
    }
    mapping() {
      return Object.fromEntries(
        Object.entries({
          label: "Label",
          weight: "Weight",
          description: "Description",
          link: "Link",
        }).map(([key, suffix]) => [key, $("notion" + suffix).value]),
      );
    }
    filterChanged() {
      const prop = Object.values(this.schema || {}).find(
        (prop) => prop.id === $("notionFilterProperty").value,
      );
      const select = $("notionFilterValue");
      select.replaceChildren(new Option("Any value", ""));
      const options =
        prop?.type === "checkbox"
          ? ["Checked", "Unchecked"]
          : (prop?.[prop.type]?.options || []).map((option) => option.name);
      options.forEach((value) => select.add(new Option(value, value)));
      this.renderRows();
    }
    selectionModeChanged() {
      const mode = $("notionSelectionMode").value;
      const automatic = mode === "first" || mode === "random";
      $("notionSelectionLimitWrap").hidden = !automatic;
      $("notionApplySelection").disabled = !automatic || !this.rows.length;
      $("notionSelectionHint").textContent = automatic
        ? "The rule applies to rows matching the current filters."
        : "Check individual rows below, or use a selection rule.";
    }
    selectionLimit() {
      const input = $("notionSelectionLimit");
      const value = Math.floor(Number(input.value));
      if (!Number.isFinite(value) || value < 1) {
        throw new Error("Enter a number of rows between 1 and 1000.");
      }
      return Math.min(Core.MAX_ITEMS, value);
    }
    randomValue() {
      try {
        return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
      } catch {
        return Math.random();
      }
    }
    applySelection() {
      const mode = $("notionSelectionMode").value;
      if (!this.source || !["first", "random"].includes(mode)) return;
      let count;
      try {
        count = this.selectionLimit();
      } catch (error) {
        this.status(error.message, true);
        return;
      }
      const matching = this.visibleRows();
      if (!matching.length) {
        this.status("No matching rows are available for this selection.", true);
        return;
      }
      const chosen = selectRows(
        matching,
        mode,
        count,
        () => this.randomValue(),
      );
      this.selected = new Set(chosen.map((page) => page.id));
      this.renderRows();
      this.status(
        `${mode === "random" ? "Randomly" : "Automatically"} selected ${chosen.length} of ${matching.length.toLocaleString()} matching rows.`,
      );
    }
    visibleRows() {
      if (!this.source) return [];
      const query = $("notionRowSearch").value.trim().toLocaleLowerCase();
      return this.rows.filter((page) => {
        const item = mapPage(page, this.mapping(), this.source.id);
        return (
          (!query ||
            `${item.label} ${item.desc}`.toLocaleLowerCase().includes(query)) &&
          filterPage(
            page,
            $("notionFilterProperty").value,
            $("notionFilterValue").value,
          )
        );
      });
    }
    renderedRows() {
      return this.visibleRows().slice(0, MAX_RENDERED_ROWS);
    }
    renderRows() {
      const list = $("notionRows");
      list.replaceChildren();
      const matching = this.visibleRows();
      for (const page of matching.slice(0, MAX_RENDERED_ROWS)) {
        const item = mapPage(page, this.mapping(), this.source.id);
        const row = document.createElement("label");
        row.className = "notion-row";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = this.selected.has(page.id);
        checkbox.setAttribute("aria-label", `Select ${item.label}`);
        checkbox.onchange = () => {
          if (checkbox.checked) this.selected.add(page.id);
          else this.selected.delete(page.id);
          this.updateCount();
        };
        const icon = document.createElement("span");
        icon.className = "notion-row-icon";
        if (item.icon?.type === "notion" && item.icon.kind === "emoji") {
          icon.classList.add("item-icon-emoji");
          icon.textContent = item.icon.value;
          icon.setAttribute("aria-hidden", "true");
        } else if (item.icon?.type === "notion" && item.icon.url) {
          icon.classList.add("item-icon-image");
          const image = document.createElement("img");
          image.src = item.icon.url;
          image.alt = "";
          image.loading = "lazy";
          image.referrerPolicy = "no-referrer";
          const fallback = document.createElement("i");
          fallback.dataset.lucide = "file-text";
          fallback.setAttribute("aria-hidden", "true");
          fallback.hidden = true;
          image.addEventListener("error", () => {
            image.hidden = true;
            fallback.hidden = false;
            this.app.activateIcons();
          });
          icon.append(image, fallback);
        } else {
          const fallback = document.createElement("i");
          fallback.dataset.lucide = "file-text";
          fallback.setAttribute("aria-hidden", "true");
          icon.append(fallback);
        }
        const title = document.createElement("span");
        title.className = "notion-row-copy";
        title.textContent = item.label;
        const description = document.createElement("small");
        description.textContent = item.desc;
        title.append(description);
        const weight = document.createElement("em");
        weight.textContent = `×${item.weight}`;
        row.append(checkbox, icon, title, weight);
        list.append(row);
      }
      if (!list.children.length) {
        const empty = document.createElement("p");
        empty.className = "help";
        empty.textContent = "No matching rows.";
        list.append(empty);
      } else if (matching.length > MAX_RENDERED_ROWS) {
        const limit = document.createElement("p");
        limit.className = "help notion-row-limit";
        const previewIds = new Set(
          matching.slice(0, MAX_RENDERED_ROWS).map((page) => page.id),
        );
        const selectedOutsidePreview = matching.filter(
          (page) => this.selected.has(page.id) && !previewIds.has(page.id),
        ).length;
        limit.textContent = `Showing the first ${MAX_RENDERED_ROWS.toLocaleString()} of ${matching.length.toLocaleString()} matching rows. ${selectedOutsidePreview
            ? `${selectedOutsidePreview} selected row${selectedOutsidePreview === 1 ? " is" : "s are"} outside this preview. `
            : ""
          }Search, filter, or use a selection rule to narrow the list.`;
        list.append(limit);
      }
      this.app.activateIcons();
      this.updateCount();
      this.selectionModeChanged();
    }
    updateCount() {
      const all = this.rows.filter((page) => this.selected.has(page.id)).length;
      const visible = this.visibleRows().length;
      const shown = Math.min(visible, MAX_RENDERED_ROWS);
      $("notionSelectionCount").textContent =
        `${all} selected · ${visible.toLocaleString()} matching${visible > shown ? ` · ${shown.toLocaleString()} shown` : ""
        }`;
      $("notionAdd").disabled = !all;
    }
    selectVisible(selected) {
      for (const page of this.renderedRows()) {
        if (selected) this.selected.add(page.id);
        else this.selected.delete(page.id);
      }
      this.renderRows();
    }
    async addSelected() {
      if (!this.source || this.busy || this.app.isSpinning) return;
      const mapping = this.mapping();
      const items = this.rows
        .filter((page) => this.selected.has(page.id))
        .map((page) => mapPage(page, mapping, this.source.id));
      if (!items.length) return;
      const incoming = new Set(items.map((item) => item.notion.pageId));
      const kept = this.app.items.filter(
        (item) =>
          !item.notion ||
          item.notion.sourceId !== this.source.id ||
          !incoming.has(item.notion.pageId),
      );
      if (kept.length + items.length > Core.MAX_ITEMS) {
        this.status("A wheel can hold at most 1000 options.", true);
        return;
      }
      if (this.app.source && this.app.source.id !== this.source.id) {
        if (
          !(await this.app.confirmAction(
            "Switch the connected database? Existing options will stay as local copies.",
          ))
        )
          return;
        kept.forEach((item) => delete item.notion);
      }
      // A mapping belongs to the whole source. Re-map existing chosen rows
      // from the same response so a saved wheel never mixes mappings.
      const pageById = new Map(this.rows.map((page) => [page.id, page]));
      this.app.items = kept
        .map((item) =>
          item.notion?.sourceId === this.source.id &&
            pageById.has(item.notion.pageId)
            ? {
              ...mapPage(
                pageById.get(item.notion.pageId),
                mapping,
                this.source.id,
              ),
              id: item.id,
            }
            : item,
        )
        .concat(items);
      this.app.source = {
        id: this.source.id,
        name: richText(this.source.title) || "Notion database",
        mapping,
      };
      this.app.editingId = null;
      this.app.currentWinner = null;
      this.app.saveData();
      this.app.closeDialog("notionDialog");
      this.app.showToast(
        `Added or updated ${items.length} Notion options. Nothing was written to Notion.`,
      );
    }
    validateMapping(schema, mapping) {
      const props = Object.values(schema);
      for (const [key, id] of Object.entries(mapping)) {
        if (!id) continue;
        const prop = props.find((prop) => prop.id === id);
        if (
          !prop ||
          (key === "weight" && prop.type !== "number") ||
          (key === "link" && prop.type !== "url")
        )
          throw new Error(
            "A mapped Notion property changed. Open Notion and choose the properties again.",
          );
      }
    }
    async refresh() {
      if (!this.settings.authToken) {
        this.open();
        return;
      }
      if (!this.app.source) return;
      await this.run("Refreshing selected Notion rows…", async () => {
        const source = this.app.source;
        const schema = await this.request("GET", `/data_sources/${source.id}`);
        this.validateMapping(schema.properties, source.mapping);
        const rows = await this.paginate(
          `/data_sources/${source.id}/query`,
          {},
          MAX_BROWSE_ROWS,
        );
        const byId = new Map(
          rows
            .filter((page) => !page.archived && !page.in_trash)
            .map((page) => [page.id, page]),
        );
        let missing = 0;
        const items = this.app.items.map((item) => {
          if (!item.notion) return item;
          const page = byId.get(item.notion.pageId);
          if (!page) {
            missing++;
            return item;
          }
          return { ...mapPage(page, source.mapping, source.id), id: item.id };
        });
        this.controller.signal.throwIfAborted();
        this.app.items = items;
        this.app.saveData();
        this.app.showToast(
          missing
            ? `Refreshed. ${missing} unavailable rows kept their cached values; remove them from the wheel if needed.`
            : "Refreshed selected rows. Local options were kept.",
        );
      });
    }
    disconnect() {
      if (this.busy) return;
      try {
        localStorage.removeItem(SETTINGS_KEY);
        sessionStorage.removeItem(SETTINGS_KEY);
        sessionStorage.removeItem("pickerWheelOAuthPending");
      } catch {
        this.status(
          "Could not clear browser credentials. Clear site data in your browser settings.",
          true,
        );
        return;
      }
      this.settings = {};
      this.connected = false;
      this.sources = [];
      this.rows = [];
      this.selected.clear();
      $("notionToken").value = "";
      $("notionProxyToken").value = "";
      $("notionBrowser").disabled = true;
      $("notionBrowser").hidden = true;
      $("connectionDetails").open = true;
      this.status("Disconnected. Cached wheel options are still available.");
    }
    async oauth() {
      await this.run("Opening Notion sign-in…", async () => {
        const settings = this.readSettings();
        this.storeSettings(settings);
        if (!this.app.saveData())
          throw new Error(
            "Save or export the current wheel before leaving for sign-in.",
          );
        const login = new URL(`${settings.oauthUrl}/auth/login`);
        login.searchParams.set(
          "from",
          new URL(location.pathname, location.origin).href,
        );
        if (["localhost", "127.0.0.1"].includes(location.hostname)) {
          const password = $("notionDevPassword").value;
          if (!password)
            throw new Error(
              "Enter the local development unlock password under OAuth settings, or use an integration token.",
            );
          const response = await fetch(`${settings.oauthUrl}/auth/dev-unlock`, {
            method: "POST",
            headers: { "X-OAuth-Dev-Password": password },
            signal: this.controller.signal,
          });
          if (!response.ok)
            throw new Error(`Local OAuth unlock failed (${response.status}).`);
          const data = await response.json();
          if (!data.unlockToken)
            throw new Error("OAuth service did not return an unlock token.");
          login.searchParams.set("dev_unlock", data.unlockToken);
        }
        sessionStorage.setItem("pickerWheelOAuthPending", String(Date.now()));
        location.assign(login.href);
      });
    }
    consumeOAuth() {
      const url = new URL(location.href);
      const hash = new URLSearchParams(url.hash.slice(1));
      const token =
        hash.get("accessToken") || url.searchParams.get("accessToken");
      const error = hash.get("error") || url.searchParams.get("error");
      if (!token && !error) return;
      for (const key of [
        "accessToken",
        "botId",
        "workspaceName",
        "workspaceIcon",
        "error",
        "error_description",
      ]) {
        hash.delete(key);
        url.searchParams.delete(key);
      }
      url.hash = hash.toString();
      history.replaceState({}, "", url);
      try {
        const pending = Number(
          sessionStorage.getItem("pickerWheelOAuthPending"),
        );
        sessionStorage.removeItem("pickerWheelOAuthPending");
        if (!pending || Date.now() - pending > 15 * 60 * 1000)
          throw new Error(
            "Sign-in was not started in this tab or has expired. Connect Notion again.",
          );
        if (error)
          throw new Error(
            "Notion sign-in was cancelled or failed. You can keep using the wheel.",
          );
        this.storeSettings({ ...this.settings, authToken: token });
        // Wait until construction completes before opening the connection UI.
        queueMicrotask(() => {
          this.open();
          this.connect();
        });
      } catch (error) {
        this.app.showToast(error.message);
      }
    }
    async editPage(id) {
      if (this.busy || this.app.isSpinning) return;
      const item = this.app.items.find((item) => item.id === id);
      if (!item?.notion || !this.app.source) return;
      if ($("resultModal").open) this.app.closeModal();
      if (!this.settings.authToken) {
        this.open();
        return;
      }
      $("notionEditFields").replaceChildren();
      $("notionEditLabel").textContent = item.label;
      $("notionSavePage").disabled = true;
      this.app.openDialog("notionEditDialog");
      await this.run(
        "Loading current page properties…",
        async () => {
          const page = await this.request(
            "GET",
            `/pages/${item.notion.pageId}`,
          );
          if (page.parent?.data_source_id !== item.notion.sourceId)
            throw new Error(
              "This page moved to another data source. Select it again in Notion.",
            );
          const source = await this.request(
            "GET",
            `/data_sources/${item.notion.sourceId}`,
          );
          this.editing = {
            itemId: id,
            page,
            schema: source.properties,
            fields: [],
          };
          for (const [name, schema] of Object.entries(source.properties)) {
            if (
              ![
                "title",
                "rich_text",
                "number",
                "checkbox",
                "select",
                "status",
                "url",
                "date",
              ].includes(schema.type)
            )
              continue;
            const prop = property(page, schema.id);
            if (!prop) continue;
            const label = document.createElement("label");
            label.textContent = `${name} (${schema.type})`;
            let input;
            if (["select", "status"].includes(schema.type)) {
              input = document.createElement("select");
              if (schema.type === "select" || !prop[schema.type])
                input.add(new Option("Empty", ""));
              (schema[schema.type].options || []).forEach((option) =>
                input.add(new Option(option.name, option.id)),
              );
              input.value = prop[schema.type]?.id || "";
            } else {
              input = document.createElement("input");
              input.type =
                {
                  number: "number",
                  checkbox: "checkbox",
                  url: "url",
                  date: "date",
                }[schema.type] || "text";
              if (schema.type === "checkbox") input.checked = prop.checkbox;
              else
                input.value =
                  schema.type === "date"
                    ? prop.date?.start?.slice(0, 10) || ""
                    : valueText(prop);
              if (schema.type === "number") input.step = "any";
              if (["title", "rich_text"].includes(schema.type))
                input.maxLength = 2000;
            }
            input.setAttribute("aria-label", name);
            label.append(input);
            $("notionEditFields").append(label);
            this.editing.fields.push({
              schema,
              input,
              initial: schema.type === "checkbox" ? input.checked : input.value,
            });
          }
          $("notionSavePage").disabled = false;
          $("notionEditStatus").textContent =
            "Only changed properties will be sent to Notion.";
        },
        "notionEditStatus",
      );
    }
    async savePage(event) {
      event.preventDefault();
      if (!this.editing) return;
      await this.run(
        "Saving changes to Notion…",
        async () => {
          const properties = {};
          for (const { schema, input, initial } of this.editing.fields) {
            const value =
              schema.type === "checkbox" ? input.checked : input.value;
            if (value === initial) continue;
            let typed;
            switch (schema.type) {
              case "title":
              case "rich_text":
                typed = value
                  ? [{ type: "text", text: { content: value } }]
                  : [];
                break;
              case "number":
                typed = value === "" ? null : Number(value);
                if (typed !== null && !Number.isFinite(typed))
                  throw new Error("Enter a valid number.");
                break;
              case "select":
              case "status":
                typed = value ? { id: value } : null;
                break;
              case "url":
                if (value && !Core.safeLink(value))
                  throw new Error("Use an HTTP or HTTPS link.");
                typed = value || null;
                break;
              case "date":
                typed = value ? { start: value } : null;
                break;
              default:
                typed = value;
            }
            properties[schema.id] = { [schema.type]: typed };
          }
          if (!Object.keys(properties).length) {
            $("notionEditStatus").textContent = "No changes to save.";
            return;
          }
          // No automatic writes or retries. This is the one explicit save.
          const page = await this.request(
            "PATCH",
            `/pages/${this.editing.page.id}`,
            { properties },
          );
          const item = this.app.items.find(
            (item) => item.id === this.editing.itemId,
          );
          if (item && this.app.source)
            Object.assign(
              item,
              mapPage(page, this.app.source.mapping, this.app.source.id),
              { id: item.id },
            );
          this.rows = this.rows.map((row) => (row.id === page.id ? page : row));
          this.app.saveData();
          this.app.closeDialog("notionEditDialog");
          this.app.showToast(
            "Saved changes to Notion and refreshed this option.",
          );
        },
        "notionEditStatus",
      );
    }
  }
  if (typeof module !== "undefined" && module.exports)
    module.exports = {
      WheelNotion,
      mapPage,
      pageIcon,
      property,
      valueText,
      filterPage,
      selectRows,
      MAX_BROWSE_ROWS,
      validateProxy,
    };
  else root.WheelNotion = WheelNotion;
})(typeof window === "undefined" ? globalThis : window);
