const { test } = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../picker-wheel-core.js");
const {
  WheelNotion,
  mapPage,
  pageIcon,
  valueText,
  filterPage,
  selectRows,
  MAX_BROWSE_ROWS,
  validateProxy,
} = require("../picker-wheel-notion.js");
const sourceId = "12345678-1234-1234-1234-123456789abc";
const page = {
  id: sourceId,
  url: "https://notion.so/example",
  icon: { type: "emoji", emoji: "📚" },
  properties: {
    Name: {
      id: "title",
      type: "title",
      title: [{ plain_text: "पढ़ना & 100%" }],
    },
    Weight: { id: "weight", type: "number", number: 2.5 },
    Notes: {
      id: "notes",
      type: "rich_text",
      rich_text: [{ text: { content: "<img src=x onerror=alert(1)>" } }],
    },
    URL: { id: "url", type: "url", url: "javascript:alert(1)" },
    Status: {
      id: "status",
      type: "status",
      status: { id: "todo", name: "To do" },
    },
    Tags: {
      id: "tags",
      type: "multi_select",
      multi_select: [{ name: "Read" }, { name: "Work" }],
    },
  },
};

test("weighted landing matches winner at varied starting angles and all refresh rates", () => {
  const wheels = [
    [1],
    [0, 1, 0],
    [1, 2, 7],
    [0.1, 1000, 0, 0.0001],
    Array.from({ length: 1000 }, (_, i) => i + 1),
  ];
  for (const weights of wheels)
    for (let i = 0; i < 500; i++) {
      const items = weights.map((weight) => ({ weight }));
      const start = i * 1.879 - 100;
      const draws = [i / 500, (i % 100) / 100, 0.4];
      const plan = Core.spinPlan(items, start, () => draws.shift());
      assert.equal(Core.indexAtNeedle(items, plan.target), plan.winner);
      assert.ok(items[plan.winner].weight > 0);
      for (const hz of [30, 60, 144]) {
        let previous = start;
        for (let ms = 0; ms < plan.duration; ms += 1000 / hz) {
          const angle =
            start + plan.distance * Core.spinProgress(ms / plan.duration);
          assert.ok(angle >= previous - 1e-10);
          previous = angle;
        }
        const end = Core.normalizeAngle(
          start + plan.distance * Core.spinProgress(1),
        );
        assert.ok(Math.abs(end - plan.target) < 1e-10);
      }
    }
});
test("weighted sampling follows probabilities, including zero and decimal weights", () => {
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < 10000; i++) {
    let index = 0;
    const draws = [i / 10000, 0.5, 0.5];
    counts[
      Core.spinPlan(
        [{ weight: 0 }, { weight: 0.5 }, { weight: 1.5 }, { weight: 3 }],
        0,
        () => draws[index++],
      ).winner
    ]++;
  }
  assert.deepEqual(counts, [0, 1000, 3000, 6000]);
  assert.equal(Core.spinPlan([{ weight: 0 }], 0), null);
  assert.equal(Core.indexAtNeedle([], 0), -1);
});
test("weight display can spread exact chances into interleaved virtual slices", () => {
  const items = [
    { label: "Two chances", weight: 2 },
    { label: "One chance", weight: 1 },
    { label: "No chance", weight: 0 },
  ];
  const proportional = Core.visualSegments(items, "proportional");
  assert.deepEqual(
    proportional.map((segment) => segment.itemIndex),
    [0, 1],
  );
  assert.deepEqual(
    proportional.map((segment) => segment.weight),
    [2, 1],
  );
  const dispersed = Core.visualSegments(items, "dispersed");
  assert.deepEqual(
    dispersed.map((segment) => segment.itemIndex),
    [0, 1, 0],
  );
  assert.deepEqual(
    dispersed.map((segment) => segment.weight),
    [1, 1, 1],
  );
  assert.equal(dispersed.filter((segment) => segment.firstForItem).length, 2);
  assert.equal(
    dispersed.reduce((sum, segment) => sum + segment.weight, 0),
    proportional.reduce((sum, segment) => sum + segment.weight, 0),
  );
});
test("spin trajectory starts and ends at rest without a velocity jump", () => {
  const h = 1e-6;
  assert.equal(Core.spinProgress(0), 0);
  assert.ok(Math.abs(Core.spinProgress(1) - 1) < 1e-12);
  assert.ok(Core.spinProgress(h) / h < 0.001);
  assert.ok((1 - Core.spinProgress(1 - h)) / h < 0.001);
  const left = (Core.spinProgress(0.08) - Core.spinProgress(0.08 - h)) / h;
  const right = (Core.spinProgress(0.08 + h) - Core.spinProgress(0.08)) / h;
  assert.ok(Math.abs(left - right) < 0.0001);
});
test("portable snapshots exclude credentials and bindings; Unicode, percentages and empty wheels round-trip", () => {
  const snapshot = Core.snapshot({
    name: "Books 100% पढ़ना",
    authToken: "DO-NOT-SHARE",
    source: { id: sourceId },
    items: [
      {
        ...mapPage(
          page,
          {
            label: "title",
            weight: "weight",
            description: "notes",
            link: "url",
          },
          sourceId,
        ),
        authToken: "DO-NOT-SHARE",
      },
    ],
  });
  const url = new URL("https://example.com/wheel");
  url.hash = new URLSearchParams({ wheel: JSON.stringify(snapshot) });
  const restored = Core.parseWheel(
    JSON.parse(new URLSearchParams(url.hash.slice(1)).get("wheel")),
  );
  assert.equal(restored.name, "Books 100% पढ़ना");
  assert.equal(restored.items[0].label, "पढ़ना & 100%");
  assert.equal(restored.items[0].weight, 2.5);
  assert.equal(restored.items[0].link, null);
  assert.ok(!JSON.stringify(snapshot).includes("DO-NOT-SHARE"));
  assert.ok(!JSON.stringify(snapshot).includes("pageId"));
  assert.equal(
    Core.parseWheel({ version: 2, name: "Empty", items: [] }).items.length,
    0,
  );
  assert.equal(
    Core.parseWheel([{ label: "Old format", weight: 2 }]).items[0].weight,
    2,
  );
});
test("invalid imports and unsafe links are rejected or normalized safely", () => {
  assert.throws(() => Core.parseWheel({ version: 3, items: [] }));
  assert.throws(() => Core.normalizeItems([{ label: "" }]));
  assert.throws(() =>
    Core.normalizeItems(Array.from({ length: 1001 }, () => ({ label: "x" }))),
  );
  assert.equal(Core.safeLink("data:text/html,x"), null);
  assert.equal(Core.safeLink("https://user:pass@example.com"), null);
  assert.equal(
    Core.safeLink("https://example.com/?q=100%25"),
    "https://example.com/?q=100%25",
  );
  const items = Core.normalizeItems([
    { id: 'bad\" onclick=alert(1)', label: "safe" },
    { id: 'bad\" onclick=alert(1)', label: "safe2", weight: 0 },
  ]);
  assert.notEqual(items[0].id, items[1].id);
  assert.equal(items[1].weight, 0);
});
test("icons stay portable and reject unsafe or oversized values", () => {
  assert.deepEqual(Core.normalizeIcon({ type: "lucide", name: "droplets" }), {
    type: "lucide",
    name: "droplets",
  });
  assert.deepEqual(Core.normalizeIcon({ type: "emoji", value: "📚" }), {
    type: "emoji",
    value: "📚",
  });
  assert.equal(Core.normalizeIcon({ type: "lucide", name: "<svg>" }), null);
  const emojiItems = Core.normalizeItems([
    { label: "Books", icon: { type: "emoji", value: "📚" } },
  ]);
  assert.deepEqual(emojiItems[0].icon, { type: "emoji", value: "📚" });
  const external = Core.snapshot({
    name: "Notion copy",
    items: [
      {
        label: "Signed image",
        icon: {
          type: "notion",
          kind: "external",
          url: "https://files.example/signed.png?token=secret",
        },
      },
    ],
  });
  assert.deepEqual(external.items[0].icon, Core.DEFAULT_ICON);
  assert.ok(!JSON.stringify(external).includes("token=secret"));
});
test("Notion mapping uses property IDs and filters status and multi-select", () => {
  const item = mapPage(
    page,
    { label: "title", weight: "weight", description: "notes", link: "url" },
    sourceId,
  );
  assert.equal(item.weight, 2.5);
  assert.equal(item.link, null);
  assert.equal(item.label, "पढ़ना & 100%");
  assert.deepEqual(item.icon, {
    type: "notion",
    kind: "emoji",
    value: "📚",
  });
  assert.ok(filterPage(page, "tags", "Read"));
  assert.ok(!filterPage(page, "tags", "Rest"));
  assert.ok(filterPage(page, "status", "To do"));
  assert.ok(!filterPage(page, "status", "Done"));
  assert.equal(
    valueText({
      type: "formula",
      formula: { type: "string", string: "Result" },
    }),
    "Result",
  );
  assert.equal(mapPage(page, { label: "title" }, sourceId).weight, 1);
});
test("Notion row selection supports first and random samples without duplicates", () => {
  const rows = Array.from({ length: 50 }, (_, index) => ({ id: `row-${index}` }));
  assert.deepEqual(
    selectRows(rows, "first", 3).map((row) => row.id),
    ["row-0", "row-1", "row-2"],
  );
  const random = selectRows(rows, "random", 10, () => 0.25);
  assert.equal(random.length, 10);
  assert.equal(new Set(random.map((row) => row.id)).size, 10);
  assert.ok(random.every((row) => rows.includes(row)));
  assert.equal(selectRows(rows, "random", 1001).length, 50);
  assert.equal(selectRows(rows, "manual", 5).length, 0);
  assert.equal(MAX_BROWSE_ROWS, 10000);
});
test("Notion page icons use emoji or safe HTTPS image URLs", () => {
  assert.deepEqual(pageIcon({ icon: { type: "emoji", emoji: "🧠" } }), {
    type: "notion",
    kind: "emoji",
    value: "🧠",
  });
  assert.deepEqual(
    pageIcon({
      icon: { type: "external", external: { url: "https://example.com/icon.png" } },
    }),
    {
      type: "notion",
      kind: "external",
      url: "https://example.com/icon.png",
    },
  );
  assert.deepEqual(
    pageIcon({ icon: { type: "external", external: { url: "http://example.com/icon.png" } } }),
    { type: "lucide", name: "file-text" },
  );
  assert.deepEqual(pageIcon({}), { type: "lucide", name: "file-text" });
});
test("pagination requests every page and fails instead of returning a partial source", async () => {
  const client = Object.create(WheelNotion.prototype);
  const calls = [];
  client.request = async (method, path, body) => {
    calls.push(body);
    return calls.length === 1
      ? { results: [page], has_more: true, next_cursor: "next" }
      : { results: [{ ...page, id: "second" }], has_more: false };
  };
  assert.equal((await client.paginate("/search")).length, 2);
  assert.equal(calls[1].start_cursor, "next");
  client.request = async () => ({
    results: Array(1000).fill(page),
    has_more: true,
    next_cursor: "next",
  });
  await assert.rejects(() => client.paginate("/search"), /more than 1000/);
  let largePage = 0;
  client.request = async () =>
    largePage++ === 0
      ? { results: Array(1000).fill(page), has_more: true, next_cursor: "large-next" }
      : { results: Array(100).fill(page), has_more: false };
  assert.equal(
    (await client.paginate("/search", {}, MAX_BROWSE_ROWS)).length,
    1100,
  );
});
test("proxy URL validation never accepts a credential-bearing or insecure remote URL", () => {
  assert.equal(validateProxy("http://127.0.0.1:8766"), "http://127.0.0.1:8766");
  for (const url of [
    "http://example.com",
    "https://user:pass@example.com",
    "javascript:alert(1)",
    "https://example.com?token=secret",
  ])
    assert.throws(() => validateProxy(url));
});
test("Notion schema changes stop refresh instead of silently replacing weights", () => {
  const client = Object.create(WheelNotion.prototype);
  assert.throws(
    () =>
      client.validateMapping(
        { Weight: { id: "weight", type: "rich_text" } },
        { weight: "weight" },
      ),
    /property changed/,
  );
});
test("proxy only forwards approved Notion requests and keeps tokens out of URL and cookies", async () => {
  const worker = (await import("../picker-wheel-notion-worker.mjs")).default;
  const env = {
    ALLOWED_ORIGINS: "https://wheel.example",
    PROXY_TOKEN: "proxy-test",
  };
  const headers = {
    Origin: "https://wheel.example",
    Authorization: "Bearer fake-token",
    "X-Proxy-Token": "proxy-test",
    "Content-Type": "application/json",
    Cookie: "private-cookie",
  };
  const make = (target, method = "GET", body) =>
    new Request(`https://proxy.example/?url=${encodeURIComponent(target)}`, {
      method,
      headers,
      body: body && JSON.stringify(body),
    });
  assert.equal(
    (await worker.fetch(make("https://evil.example/v1/users/me"), env)).status,
    400,
  );
  assert.equal(
    (
      await worker.fetch(
        make(`https://api.notion.com/v1/pages/${sourceId}`, "PATCH", {
          archived: true,
        }),
        env,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await worker.fetch(
        make(`https://api.notion.com/v1/pages/${sourceId}`, "DELETE"),
        env,
      )
    ).status,
    405,
  );
  const oldFetch = global.fetch;
  let forwarded;
  global.fetch = async (url, options) => {
    forwarded = { url, options };
    return new Response(JSON.stringify({ id: "bot" }), { status: 200 });
  };
  try {
    const response = await worker.fetch(
      make("https://api.notion.com/v1/users/me"),
      env,
    );
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("Access-Control-Allow-Origin"),
      "https://wheel.example",
    );
    assert.equal(forwarded.options.headers.Cookie, undefined);
    assert.equal(forwarded.options.headers["X-Proxy-Token"], undefined);
    assert.equal(forwarded.options.redirect, "error");
    assert.ok(!forwarded.url.includes("fake-token"));
  } finally {
    global.fetch = oldFetch;
  }
});

test("explicit Notion saves send only changed, typed properties", async () => {
  const client = Object.create(WheelNotion.prototype);
  const edits = [
    {
      schema: { id: "title", type: "title" },
      input: { value: "पढ़ना" },
      initial: "Old title",
    },
    {
      schema: { id: "weight", type: "number" },
      input: { value: "4.5" },
      initial: "2.5",
    },
    {
      schema: { id: "done", type: "checkbox" },
      input: { checked: true },
      initial: false,
    },
    {
      schema: { id: "status", type: "status" },
      input: { value: "done" },
      initial: "todo",
    },
    {
      schema: { id: "notes", type: "rich_text" },
      input: { value: "Unchanged" },
      initial: "Unchanged",
    },
  ];
  client.editing = { itemId: "local-id", page, fields: edits };
  client.rows = [page];
  const item = {
    ...mapPage(page, { label: "title", weight: "weight" }, sourceId),
    id: "local-id",
  };
  client.app = {
    items: [item],
    source: { id: sourceId, mapping: { label: "title", weight: "weight" } },
    saveData() { },
    closeDialog() { },
    showToast() { },
  };
  client.run = async (_, action) => action();
  let sent;
  client.request = async (method, path, body) => {
    sent = { method, path, body };
    return {
      ...page,
      properties: {
        ...page.properties,
        Weight: { id: "weight", type: "number", number: 4.5 },
      },
    };
  };
  await client.savePage({ preventDefault() { } });
  assert.equal(sent.method, "PATCH");
  assert.deepEqual(sent.body, {
    properties: {
      title: { title: [{ type: "text", text: { content: "पढ़ना" } }] },
      weight: { number: 4.5 },
      done: { checkbox: true },
      status: { status: { id: "done" } },
    },
  });
  assert.equal(item.id, "local-id");
  assert.equal(item.weight, 4.5);
});

test("failed Notion writes preserve the cached option and do not retry", async () => {
  const client = Object.create(WheelNotion.prototype);
  const item = { id: "local", weight: 2.5 };
  let calls = 0;
  client.editing = {
    itemId: "local",
    page,
    fields: [
      {
        schema: { id: "weight", type: "number" },
        input: { value: "10" },
        initial: "2.5",
      },
    ],
  };
  client.app = { items: [item] };
  client.run = async (_, action) => action();
  client.request = async () => {
    calls++;
    throw new Error("permission denied");
  };
  await assert.rejects(
    () => client.savePage({ preventDefault() { } }),
    /permission denied/,
  );
  assert.equal(calls, 1);
  assert.equal(item.weight, 2.5);
});

function appHarness() {
  const vm = require("node:vm");
  const fs = require("node:fs");
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id))
        elements.set(id, {
          style: {},
          setAttribute() { },
          textContent: "",
          hidden: false,
          value: "",
        });
      return elements.get(id);
    },
  };
  const store = new Map();
  const localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  };
  const context = {
    WheelCore: Core,
    WheelNotion,
    localStorage,
    document,
    performance,
    requestAnimationFrame: () => 1,
    crypto: require("node:crypto").webcrypto,
    console,
    URLSearchParams,
    URL,
  };
  vm.createContext(context);
  let code = fs
    .readFileSync(require.resolve("../picker-wheel-app.js"), "utf8")
    .split("const app = new PickerApp();")[0];
  vm.runInContext(code + "\nglobalThis.PickerAppClass = PickerApp;", context);
  const app = Object.create(context.PickerAppClass.prototype);
  Object.assign(app, {
    items: [],
    library: [],
    name: "Test",
    savedId: null,
    source: null,
    isSpinning: false,
    showToast() { },
    renderState() { },
  });
  return { app, store, elements };
}

test("named wheel saves update in place; copies preserve the original and exclude credentials", () => {
  const { app, store } = appHarness();
  app.items = [{ id: "one", label: "One", desc: "", link: null, weight: 1 }];
  app.authToken = "DO-NOT-SAVE";
  app.saveWheel();
  const firstId = app.savedId;
  assert.equal(app.library.length, 1);
  app.items[0].weight = 3;
  app.saveWheel();
  assert.equal(app.library.length, 1);
  assert.equal(app.library[0].wheel.items[0].weight, 3);
  app.savedId = null;
  app.name = "Copy";
  app.saveWheel();
  assert.equal(app.library.length, 2);
  assert.notEqual(app.savedId, firstId);
  assert.ok(!store.get("pickerWheelLibrary").includes("DO-NOT-SAVE"));
});

test("empty drafts and Notion bindings survive local loading; portable loads detach", () => {
  const { app, store } = appHarness();
  app.applyWheel({ version: 2, name: "Empty", items: [] }, true);
  app.saveData();
  app.applyWheel(JSON.parse(store.get("pickerWheelDraft")), true);
  assert.equal(app.items.length, 0);
  assert.equal(app.name, "Empty");
  const linked = {
    version: 2,
    name: "Linked",
    source: {
      id: sourceId,
      name: "Reading",
      mapping: { label: "title", weight: "weight" },
    },
    items: [mapPage(page, { label: "title", weight: "weight" }, sourceId)],
  };
  app.applyWheel(linked, true);
  assert.equal(app.items[0].notion.sourceId, sourceId);
  app.applyWheel(linked, false);
  assert.equal(app.items[0].notion, undefined);
  assert.equal(app.source, null);
});

test("a saved wheel is a snapshot, not a reference to later draft edits", () => {
  const { app } = appHarness();
  app.items = [{ id: "one", label: "Before", desc: "", link: null, weight: 1 }];
  app.saveWheel();
  app.items[0].label = "After";
  assert.equal(app.library[0].wheel.items[0].label, "Before");
});

test("gentle motion always schedules a visible spin and lands on the same winner", () => {
  const { app } = appHarness();
  app.motionMode = "gentle";
  app.angle = 0;
  app.items = [{ id: "a", label: "One", weight: 1 }];
  app.spinBtn = {};
  app.setSpinLock = () => { };
  app.spin();
  assert.equal(app.isSpinning, true);
  assert.equal(app.frame, 1);
  assert.equal(app.plan.duration, 1800);
  assert.ok(app.plan.distance >= Math.PI);
  for (let i = 0; i < 100; i++) {
    const target = (i / 100) * Math.PI * 2;
    const distance = Core.gentleDistance(0, target);
    assert.ok(distance >= Math.PI && distance < Math.PI * 3);
    assert.ok(Math.abs(Core.normalizeAngle(distance) - target) < 1e-12);
  }
});

test("file imports honor confirmation and preserve data on failure", async () => {
  const { app } = appHarness();
  app.applyWheel({
    version: 2,
    name: "Original",
    items: [{ label: "Keep", weight: 1 }],
  });
  let accepted = false;
  app.confirmAction = async () => accepted;
  const fs = require("node:fs");
  const source = fs.readFileSync(
    require.resolve("../picker-wheel-app.js"),
    "utf8",
  );
  // Exercise the app's async import method with a parser contract, without a browser dependency.
  const vm = require("node:vm");
  const environment = {
    jsyaml: { load: JSON.parse, JSON_SCHEMA: {} },
    WheelCore: Core,
  };
  vm.createContext(environment);
  const start = source.indexOf("  async importYAML(");
  const end = source.indexOf("\n  // --- Visual Rendering", start);
  const importMethod = vm.runInContext(
    "({" + source.slice(start, end).trim() + "})",
    environment,
  ).importYAML;
  const event = () => ({
    target: {
      files: [
        {
          size: 50,
          text: async () =>
            JSON.stringify({
              version: 2,
              name: "Imported",
              items: [{ label: "100% पढ़ना", weight: 0.5 }],
            }),
        },
      ],
      value: "file",
    },
  });
  await importMethod.call(app, event());
  assert.equal(app.name, "Original");
  accepted = true;
  await importMethod.call(app, event());
  assert.equal(app.name, "Imported");
  assert.equal(app.items[0].weight, 0.5);
  await importMethod.call(app, {
    target: {
      files: [{ size: 5, text: async () => "{bad json" }],
      value: "bad",
    },
  });
  assert.equal(app.name, "Imported");
});
