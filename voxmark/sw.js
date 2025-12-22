const CACHE_NAME = "voxmark-cache-v2";
const CORE_ASSETS = [
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

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
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

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
