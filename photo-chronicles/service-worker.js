const CACHE_NAME = 'photo-chronicles-cache-v4';
const OFFLINE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@0.561.0/dist/umd/lucide.min.js',
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@300;400;500;600&display=swap'
];

const CDN_ORIGINS = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const asset of OFFLINE_ASSETS) {
      try {
        await cache.add(asset);
      } catch (err) {
        console.warn('SW: skipping asset cache', asset, err);
      }
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('photo-chronicles-cache') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension')) return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isAllowedCdn = CDN_ORIGINS.some((origin) => url.origin === origin);

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const network = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, network.clone());
        return network;
      } catch (err) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        const fallback = (await cache.match('./index.html')) || (await cache.match('./'));
        if (fallback) return fallback;
        throw err;
      }
    })());
    return;
  }

  if (isSameOrigin || isAllowedCdn) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      } catch (err) {
        if (cached) return cached;
        throw err;
      }
    })());
  }
});
