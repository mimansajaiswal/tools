self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('ghostink-cache-v2').then((cache) =>
      cache.addAll([
        './',
        './index.html',
        './manifest.webmanifest',
        './icons/icon-512.png',
        './icons/icon-192.png',
        './icons/icon-96.png',
        './icons/apple-touch-icon.png',
        'https://cdn.tailwindcss.com',
        'https://unpkg.com/lucide@latest',
        'https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js',
        'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
        'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js',
        'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.wasm',
        'https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css',
        'https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.js'
      ]).catch(() => { })
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== 'ghostink-cache-v2').map((k) => caches.delete(k)))
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
    caches.open('ghostink-cache-v2').then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          // Check if valid response before caching
          const cacheable = networkResponse &&
            (networkResponse.status === 200 || networkResponse.type === 'opaque' || networkResponse.type === 'cors');
          if (cacheable) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Network failed; doing nothing (cache already served or will handle fallback)
        });

        // Return cached response immediately if found, else wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});
