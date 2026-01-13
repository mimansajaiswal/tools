const CACHE_NAME = "voxmark-cache-v7";
const LOCAL_ASSETS = [
  "./index.html",
  "./styles/main.css",
  "./js/core.js",
  "./js/ui.js",
  "./js/settings.js",
  "./js/storage.js",
  "./js/pdf.js",
  "./js/annotations.js",
  "./js/ai.js",
  "./js/batch.js",
  "./js/stt.js",
  "./js/export.js",
  "./js/interactions.js",
  "./js/pwa.js",
  "./js/app.js",
  "./manifest.json",
  "./assets/icon-192.svg",
  "./assets/icon-512.svg"
];
const REMOTE_ASSETS = [
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf_viewer.min.css",
  "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",
  "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",
  "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
  "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
  "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js",
  "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm",
  "https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz",
  "https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css"
];

const FONT_CSS_URL = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Manrope:wght@400;500;600;700&display=swap";

async function cacheFonts(cache) {
  try {
    const cssResponse = await fetch(FONT_CSS_URL);
    if (!cssResponse.ok) return;
    const cssText = await cssResponse.text();
    await cache.put(FONT_CSS_URL, new Response(cssText, {
      headers: { "Content-Type": "text/css" }
    }));
    const fontUrls = cssText.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g) || [];
    const uniqueUrls = [...new Set(fontUrls.map(u => u.slice(4, -1)))];
    await Promise.all(uniqueUrls.map(async (url) => {
      try {
        const fontResponse = await fetch(url);
        if (fontResponse.ok) {
          await cache.put(url, fontResponse);
        }
      } catch (e) { /* ignore font fetch errors */ }
    }));
  } catch (e) { /* ignore font caching errors */ }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(LOCAL_ASSETS);
      await Promise.all(
        REMOTE_ASSETS.map(async (url) => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
            }
          } catch (error) {
            try {
              const fallback = await fetch(url, { mode: "no-cors" });
              if (fallback) await cache.put(url, fallback);
            } catch (e) { /* ignore */ }
          }
        })
      );
      await cacheFonts(cache);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const isHtml =
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");
  const isLocalAsset =
    url.origin === self.location.origin &&
    (request.destination === "script" || request.destination === "style");

  event.respondWith(
    (isHtml || isLocalAsset
      ? fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
      : caches.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request)
            .then((response) => {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
              return response;
            })
            .catch(() => caches.match("./index.html"));
        }))
  );
});
