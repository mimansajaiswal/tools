self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('ghostink-cache-v1').then((cache) =>
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
      Promise.all(keys.filter((k) => k !== 'ghostink-cache-v1').map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((resp) => {
        const clone = resp.clone();
        caches.open('ghostink-cache-v1').then((cache) => cache.put(request, clone));
        return resp;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});
