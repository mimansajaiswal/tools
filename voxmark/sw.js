const CACHE_NAME = "voxmark-cache-v9";
const MAX_CACHE_ENTRIES = 220;
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
  "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",
  "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",
  "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
  "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
  "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js",
  "https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz",
  "https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css"
];

const FONT_CSS_URL = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Manrope:wght@400;500;600;700&display=swap";
const PHOSPHOR_CSS_URL = "https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css";
const CACHEABLE_DESTINATIONS = new Set([
  "script",
  "style",
  "font",
  "image",
  "manifest",
  "worker"
]);
const REMOTE_CACHE_PREFIXES = [
  "https://cdnjs.cloudflare.com/",
  "https://cdn.jsdelivr.net/",
  "https://fonts.googleapis.com/",
  "https://fonts.gstatic.com/",
  "https://unpkg.com/",
  "https://tessdata.projectnaptha.com/"
];

function isKnownRemote(url) {
  return REMOTE_ASSETS.includes(url.href) || REMOTE_CACHE_PREFIXES.some((prefix) => url.href.startsWith(prefix));
}

function isCacheableRequest(request, url) {
  if (request.method !== "GET") return false;
  const isNavigation = request.mode === "navigate";
  if (isNavigation) return true;
  if (url.origin === self.location.origin) {
    const pathname = url.pathname;
    const isListedLocal = LOCAL_ASSETS.some((asset) => pathname.endsWith(asset.replace("./", "/")));
    return isListedLocal || CACHEABLE_DESTINATIONS.has(request.destination);
  }
  return isKnownRemote(url);
}

async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_CACHE_ENTRIES) return;
  const overflow = keys.length - MAX_CACHE_ENTRIES;
  for (let i = 0; i < overflow; i += 1) {
    await cache.delete(keys[i]);
  }
}

async function putInCache(cache, request, response) {
  if (!response) return;
  if (!(response.ok || response.type === "opaque")) return;
  await cache.put(request, response.clone());
  await trimCache(cache);
}

async function cacheFonts(cache) {
  try {
    const cssResponse = await fetch(FONT_CSS_URL);
    if (!cssResponse.ok) return;
    const cssText = await cssResponse.text();
    await cache.put(FONT_CSS_URL, new Response(cssText, {
      headers: { "Content-Type": "text/css" }
    }));
    const fontUrls = cssText.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g) || [];
    const uniqueUrls = [...new Set(fontUrls.map((u) => u.slice(4, -1)))];
    await Promise.all(uniqueUrls.map(async (url) => {
      try {
        const fontResponse = await fetch(url);
        if (fontResponse.ok) {
          await cache.put(url, fontResponse);
        }
      } catch (e) {
        // Ignore font fetch errors.
      }
    }));
  } catch (e) {
    // Ignore font caching errors.
  }
}

async function cachePhosphorIcons(cache) {
  try {
    const cssResponse = await fetch(PHOSPHOR_CSS_URL);
    if (!cssResponse.ok) return;
    const cssText = await cssResponse.text();
    await cache.put(PHOSPHOR_CSS_URL, new Response(cssText, {
      headers: { "Content-Type": "text/css" }
    }));
    const fontUrls = cssText.match(/url\(['"]?([^'")]+\.woff2?)['"]?\)/g) || [];
    const baseUrl = PHOSPHOR_CSS_URL.replace(/\/[^/]+$/, "/");
    await Promise.all(fontUrls.map(async (match) => {
      try {
        const path = match.replace(/url\(['"]?/, "").replace(/['"]?\)/, "");
        const url = path.startsWith("http") ? path : new URL(path, baseUrl).href;
        const fontResponse = await fetch(url);
        if (fontResponse.ok) {
          await cache.put(url, fontResponse);
        }
      } catch (e) {
        // Ignore icon font fetch errors.
      }
    }));
  } catch (e) {
    // Ignore icon caching errors.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(LOCAL_ASSETS);
      await Promise.all(
        REMOTE_ASSETS.map(async (url) => {
          try {
            const response = await fetch(url);
            if (response.ok || response.type === "opaque") {
              await cache.put(url, response);
            }
          } catch (error) {
            try {
              const fallback = await fetch(url, { mode: "no-cors" });
              if (fallback) await cache.put(url, fallback);
            } catch (e) {
              // Ignore remote asset cache failures.
            }
          }
        })
      );
      await cacheFonts(cache);
      await cachePhosphorIcons(cache);
      await trimCache(cache);
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

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    await putInCache(cache, request, response);
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const fallback = await cache.match("./index.html");
    if (fallback) return fallback;
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    fetch(request)
      .then((response) => putInCache(cache, request, response))
      .catch(() => { });
    return cached;
  }
  try {
    const response = await fetch(request);
    await putInCache(cache, request, response);
    return response;
  } catch (error) {
    return new Response("", { status: 504, statusText: "Gateway Timeout" });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const isHtml =
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");

  if (isHtml) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (!isCacheableRequest(request, url)) {
    return;
  }

  event.respondWith(cacheFirstAsset(request));
});
