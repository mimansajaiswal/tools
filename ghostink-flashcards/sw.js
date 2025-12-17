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
        './icons/apple-touch-icon.png'
      ]).catch(() => {})
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

  // Ignore cross-origin requests (API calls, CDNs) to ensure we always get fresh data
  // and don't cache API errors.
  if (!request.url.startsWith(self.location.origin)) return;

  // Stale-While-Revalidate Strategy for app files:
  // 1. Serve from cache immediately if available (Offline First).
  // 2. Always fetch from network in background to update cache for next time.
  // 3. If cache is empty, wait for network.
  event.respondWith(
    caches.open('ghostink-cache-v2').then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          // Check if valid response before caching
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
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
