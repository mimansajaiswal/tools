const CACHE_NAME = 'ghostink-cache-v6';
const CACHE_PREFIX = 'ghostink-cache-';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const localAssets = [
        './',
        './index.html',
        './sw.js',
        './manifest.webmanifest',
        './icons/icon-512.png',
        './icons/icon-192.png',
        './icons/icon-96.png',
        './icons/apple-touch-icon.png'
      ];
      await cache.addAll(localAssets);

      // Best-effort pre-cache of third-party assets so the app can boot offline
      // after the first successful online load.
      const cdnNoCorsAssets = [
        'https://cdn.tailwindcss.com',
        'https://unpkg.com/lucide@latest',
        'https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js',
        'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
        'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js',
        'https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css',
        'https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.js',
        'https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Sora:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap'
      ];
      const cdnCorsAssets = [
        // WASM must be fetched with CORS to be readable by JS (sql.js uses fetch/arrayBuffer).
        'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.wasm'
      ];

      await Promise.all([
        ...cdnNoCorsAssets.map((url) =>
          cache.add(new Request(url, { mode: 'no-cors' })).catch(() => { })
        ),
        ...cdnCorsAssets.map((url) => cache.add(new Request(url, { mode: 'cors' })).catch(() => { }))
      ]);
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k.startsWith(CACHE_PREFIX)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Ignore cross-origin requests (API calls) EXCEPT for trusted CDNs needed for offline use
  const isSameOrigin = request.url.startsWith(self.location.origin);
  const isTrustedCdn = [
    'cdn.jsdelivr.net',
    'unpkg.com',
    'cdnjs.cloudflare.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com'
  ].some(domain => request.url.includes(domain));

  if (!isSameOrigin && !isTrustedCdn) return;

  // Stale-While-Revalidate Strategy for app files:
  // 1. Serve from cache immediately if available (Offline First).
  // 2. Always fetch from network in background to update cache for next time.
  // 3. If cache is empty, wait for network.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          // Check if valid response before caching
          const cacheable = networkResponse &&
            (networkResponse.status === 200 || networkResponse.type === 'opaque' || networkResponse.type === 'cors');
          if (cacheable) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(async () => {
          // Network failed. If there's no cachedResponse, return an offline fallback Response.
          if (cachedResponse) return cachedResponse;
          // For navigations/documents, fall back to cached shell so the app can boot offline.
          if (request.mode === 'navigate' || request.destination === 'document') {
            return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
          }
          return new Response('', { status: 503, statusText: 'Offline' });
        });

        // Keep the SW alive long enough to update the cache in the background.
        event.waitUntil(fetchPromise.catch(() => { }));

        // Return cached response immediately if found, else wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});
