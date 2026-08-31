import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(path, import.meta.url), "utf8");
}

function countFunctionDefinitions(source, name) {
  const regex = new RegExp(`\\bfunction\\s+${name}\\s*\\(`, "g");
  return (source.match(regex) || []).length;
}

test("critical functions are not duplicated", () => {
  const pdf = read("../js/pdf.js");
  const annotations = read("../js/annotations.js");
  assert.equal(countFunctionDefinitions(pdf, "runOcrOnVisiblePages"), 1);
  assert.equal(countFunctionDefinitions(annotations, "undoAnnotation"), 1);
});

test("external URL handling is sanitized", () => {
  const pdf = read("../js/pdf.js");
  assert.match(pdf, /function sanitizeExternalUrl\(/);
  assert.match(pdf, /window\.open\(safeUrl, "_blank", "noopener,noreferrer"\)/);
});

test("settings persistence strips API keys", () => {
  const settings = read("../js/settings.js");
  assert.match(settings, /function getPersistedSettings\(/);
  assert.match(settings, /safe\.sttKey = ""/);
  assert.match(settings, /safe\.aiKey = ""/);
});

test("search state always resets after search execution", () => {
  const pdf = read("../js/pdf.js");
  assert.match(
    pdf,
    /searchRunning = true;[\s\S]*finally\s*\{[\s\S]*searchRunning = false;[\s\S]*\}/
  );
});

test("service worker avoids html fallback for non-navigation asset fetches", () => {
  const sw = read("../sw.js");
  assert.match(sw, /if \(!isCacheableRequest\(request, url\)\) \{\s*return;\s*\}/);
  assert.doesNotMatch(sw, /catch\(\)\s*=>\s*caches\.match\("\.\/index\.html"\)/);
});

test("focus-visible styles are defined", () => {
  const css = read("../styles/main.css");
  assert.match(css, /:focus-visible\s*\{/);
  assert.match(css, /\.btn:focus-visible/);
});
