const CACHE_VERSION = 13;
const CACHE_NAME = `ghostink-cache-v${CACHE_VERSION}`;
const CACHE_PREFIX = 'ghostink-cache-';

const TRUSTED_CDNS = [
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.tailwindcss.com'
];

const isTrustedCdn = (url) => TRUSTED_CDNS.some(d => url.includes(d));

const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-512.png',
  './icons/icon-192.png',
  './icons/icon-96.png',
  './icons/apple-touch-icon.png',
  './css/styles.css',
  './js/app.js',
  './js/config.js',
  './js/storage.js',
  './js/api.js',
  './js/srs.js',
  './js/notion-mapper.js',
  './js/ui/index.js',
  './js/ui/toast.js',
  './js/ui/loading.js',
  './js/ui/tooltip.js',
  './js/ui/modal.js',
  './js/features/index.js',
  './js/features/media.js'
];

// Optional: CDN precache for first-load-offline after first successful install.
const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@0.562.0/dist/umd/lucide.min.js',
  'https://cdn.jsdelivr.net/npm/marked@17.0.1/lib/marked.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  'https://unpkg.com/sql.js@1.13.0/dist/sql-wasm.js',
  'https://unpkg.com/sql.js@1.13.0/dist/sql-wasm.wasm',
  'https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/katex.min.css',
  'https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/katex.min.js',
  'https://cdn.jsdelivr.net/npm/glightbox@3.3.1/dist/css/glightbox.min.css',
  'https://cdn.jsdelivr.net/npm/glightbox@3.3.1/dist/js/glightbox.min.js',
  'https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Sora:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Precache local shell so offline boot works.
    await cache.addAll(LOCAL_ASSETS);

    // Best-effort CDN precache; ignore failures.
    await Promise.all(CDN_ASSETS.map(async (url) => {
      try {
        // Try normal fetch first; if it fails, ignore.
        const res = await fetch(url, { mode: 'cors' }).catch(() => fetch(url, { mode: 'no-cors' }));
        if (res && (res.ok || (res.type === 'opaque' && isTrustedCdn(url)))) {
          await cache.put(new Request(url), res);
        }
      } catch { }
    }));
  })());

  // Activate new SW ASAP
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Delete old version caches
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
        .map(k => caches.delete(k))
    );

    // Take control immediately
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isCdn = isTrustedCdn(request.url);

  // Ignore non-same-origin requests except trusted CDNs (for offline boot).
  if (!isSameOrigin && !isCdn) return;

  // 1) Network-first for HTML navigations/documents (prevents stale deploy),
  //    but falls back to cached index.html for offline support.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        // no-store reduces the chance you get an HTTP-cached old HTML
        const fresh = await fetch(request, { cache: 'no-store' });

        // Cache the new HTML so subsequent offline works
        if (fresh && fresh.ok) {
          await cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        // Offline fallback: app shell
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  // 2) Cache-first for static assets (best offline UX).
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const res = await fetch(request);
      // Cache successful responses (including opaque CDN responses).
      if (res && (res.ok || (res.type === 'opaque' && isCdn))) {
        await cache.put(request, res.clone());
      }
      return res;
    } catch {
      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});

// Messages (optional utilities)
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data === 'clearCache') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    })());
  }
});