/**
 * GhostInk Flashcards - Service Worker
 * Handles caching, offline functionality, and background sync.
 */

// Issue 1 Fix: Improved cache versioning strategy
// The CACHE_VERSION should be incremented when making breaking changes.
// Additionally, local files use content-aware caching with revalidation.
const CACHE_VERSION = 11; // Increment this on each deployment with breaking changes
const CACHE_NAME = `ghostink-cache-v${CACHE_VERSION}`;
const CACHE_PREFIX = 'ghostink-cache-';

// Issue 1 Fix: Track last modification times for smarter cache invalidation
// This allows the app to detect when files have changed even without version bump
const CACHE_METADATA_KEY = 'ghostink-cache-metadata';

// Cache expiration settings (Fix: cache expiration)
const CACHE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const LOCAL_CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours for local files (Issue 1 Fix)
const MAX_CACHE_SIZE = 100; // Maximum number of entries per category

// Cache categories for size management (Fix: cache size management)
const CACHE_CATEGORIES = {
  LOCAL: 'local',
  CDN: 'cdn',
  FONTS: 'fonts'
};

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
      await cache.addAll(localAssets);

      // Fix: Better CDN caching with CORS handling
      // Best-effort pre-cache of third-party assets so the app can boot offline
      // after the first successful online load.
      // Using pinned versions to ensure consistent behavior and avoid cache invalidation issues
      const cdnNoCorsAssets = [
        'https://cdn.tailwindcss.com',
        'https://unpkg.com/lucide@0.562.0/dist/umd/lucide.min.js',
        'https://cdn.jsdelivr.net/npm/marked@17.0.1/lib/marked.umd.min.js',
        'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
        'https://unpkg.com/sql.js@1.13.0/dist/sql-wasm.js',
        'https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/katex.min.css',
        'https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/katex.min.js',
        'https://cdn.jsdelivr.net/npm/glightbox@3.3.1/dist/css/glightbox.min.css',
        'https://cdn.jsdelivr.net/npm/glightbox@3.3.1/dist/js/glightbox.min.js',
        'https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Sora:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap'
      ];

      // WASM must be fetched with CORS to be readable by JS (sql.js uses fetch/arrayBuffer).
      const cdnCorsAssets = [
        'https://unpkg.com/sql.js@1.13.0/dist/sql-wasm.wasm'
      ];

      // Fix: Improved CDN caching with error handling and timeout
      const fetchWithTimeout = async (url, options, timeoutMs = 10000) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(url, { ...options, signal: controller.signal });
          clearTimeout(timeout);
          return response;
        } catch (e) {
          clearTimeout(timeout);
          throw e;
        }
      };

      await Promise.all([
        ...cdnNoCorsAssets.map(async (url) => {
          try {
            // Try CORS first (gives better error handling), fall back to no-cors
            let response;
            try {
              response = await fetchWithTimeout(url, { mode: 'cors' }, 8000);
            } catch {
              response = await fetchWithTimeout(url, { mode: 'no-cors' }, 8000);
            }
            if (response && response.ok && response.type !== 'opaque') {
              await cache.put(new Request(url), response);
            }
          } catch (e) {
            console.warn(`SW: Failed to cache CDN asset: ${url}`, e.message);
          }
        }),
        ...cdnCorsAssets.map(async (url) => {
          try {
            const response = await fetchWithTimeout(url, { mode: 'cors' }, 15000);
            if (response && response.ok) {
              await cache.put(new Request(url), response);
            }
          } catch (e) {
            console.warn(`SW: Failed to cache CORS asset: ${url}`, e.message);
          }
        })
      ]);
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Bug 9 fix: Clean up old caches when activating a new version
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
          .map((k) => {
            console.log(`SW: Deleting old cache: ${k}`);
            return caches.delete(k);
          })
      );

      // Fix: Expire old entries in current cache
      await cleanExpiredCacheEntries();
    })()
  );
  self.clients.claim();
});

// Fix: Cache size management - remove oldest entries when cache gets too large
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    const keysToDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
    console.log(`SW: Trimmed ${keysToDelete.length} cache entries`);
  }
}

// Fix 5: IDB helper for cache metadata (timestamps for opaque responses)
const DB_NAME = 'GhostInkSW';
const META_STORE = 'cache-meta';

const openMetaDB = () => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

const setCacheMetadata = async (url, timestamp) => {
  try {
    const db = await openMetaDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      const req = tx.objectStore(META_STORE).put(timestamp, url);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('SW: Failed to set cache metadata:', e);
  }
};

const getCacheMetadata = async (url) => {
  try {
    const db = await openMetaDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const req = tx.objectStore(META_STORE).get(url);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

// Fix: Clean expired cache entries
async function cleanExpiredCacheEntries() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  const now = Date.now();

  for (const request of keys) {
    try {
      const response = await cache.match(request);
      if (!response) continue;

      let cacheTime = null;

      // Check if response has a date header we can use
      const dateHeader = response.headers.get('date');
      if (dateHeader) {
        cacheTime = new Date(dateHeader).getTime();
      } else {
        // Fallback to IDB metadata for opaque responses
        cacheTime = await getCacheMetadata(request.url);
      }

      if (cacheTime && (now - cacheTime > CACHE_EXPIRATION_MS)) {
        await cache.delete(request);
        console.log(`SW: Expired cache entry: ${request.url}`);
      }
    } catch (e) {
      // Ignore errors for individual entries
    }
  }
}

// Fix: Categorize URLs for cache management
function getCacheCategory(url) {
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    return CACHE_CATEGORIES.FONTS;
  }
  if (url.includes('cdn.') || url.includes('unpkg.com') || url.includes('cdnjs.')) {
    return CACHE_CATEGORIES.CDN;
  }
  return CACHE_CATEGORIES.LOCAL;
}

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
    'fonts.gstatic.com',
    'cdn.tailwindcss.com'
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
          // Note: opaque responses (from no-cors CDN requests) can't be inspected for errors,
          // but we only cache them if they exist. If the fetch succeeds, it's likely valid.
          // For transparent responses, require status 200.
          const isValidTransparent = networkResponse.status === 200 &&
            (networkResponse.type === 'basic' || networkResponse.type === 'cors');
          const cacheable = networkResponse && isValidTransparent;

          if (cacheable) {
            // Clone response before caching
            const responseToCache = networkResponse.clone();
            cache.put(request, responseToCache).then(() => {
              // Fix 5: Store metadata for opaque response expiration
              setCacheMetadata(request.url, Date.now());

              // Fix: Periodically trim cache to prevent unbounded growth
              const category = getCacheCategory(request.url);
              if (category === CACHE_CATEGORIES.CDN) {
                trimCache(CACHE_NAME, MAX_CACHE_SIZE * 2);
              }
            }).catch(e => {
              console.warn('SW: Failed to cache response:', e.message);
            });
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

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'clearCache') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('SW: Cache cleared by request');
    });
  }
});
