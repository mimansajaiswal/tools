/**
 * GhostInk Flashcards - Service Worker
 * Handles caching, offline functionality, and background sync.
 */

const CACHE_VERSION = 11; // Increment this on each deployment with breaking changes
const CACHE_NAME = `ghostink-cache-v${CACHE_VERSION}`;
const CACHE_PREFIX = 'ghostink-cache-';
const CACHE_METADATA_KEY = 'ghostink-cache-metadata';

// Cache expiration settings (Fix: cache expiration)
const CACHE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const LOCAL_CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours for local files
const MAX_CACHE_SIZE = 100; // Maximum number of entries per category

// Cache categories for size management (Fix: cache size management)
const CACHE_CATEGORIES = {
  LOCAL: 'local',
  CDN: 'cdn',
  FONTS: 'fonts'
};

const isTrustedCdn = (url) => {
  return [
    'cdn.jsdelivr.net',
    'unpkg.com',
    'cdnjs.cloudflare.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.tailwindcss.com'
  ].some(domain => url.includes(domain));
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
      await Promise.all(localAssets.map(async (url) => {
        try {
          const res = await fetch(url);
          if (res.ok) await cache.put(url, res);
          else console.warn(`SW: Failed to fetch local asset ${url}: ${res.status}`);
        } catch (e) {
          console.warn(`SW: Failed to cache local asset ${url}:`, e);
        }
      }));

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
            if (response && (response.ok || (response.type === 'opaque' && isTrustedCdn(url)))) {
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

const clearMetaDB = () => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
    req.onblocked = () => console.warn('SW: DB delete blocked');
  });
};

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      let clearedOld = false;
      await Promise.all(
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
          .map((k) => {
            console.log(`SW: Deleting old cache: ${k}`);
            clearedOld = true;
            return caches.delete(k);
          })
      );

      if (clearedOld) {
        await clearMetaDB().catch(e => console.warn('SW: Failed to clear meta DB:', e));
      }

      await cleanExpiredCacheEntries();
    })()
  );
  self.clients.claim();
});

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    const keysToDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
    console.log(`SW: Trimmed ${keysToDelete.length} cache entries`);
  }
}

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
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
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
      req.onsuccess = () => { db.close(); resolve(req.result); };
      req.onerror = () => { db.close(); resolve(null); };
    });
  } catch (e) {
    return null;
  }
};

// Optimization: Get all metadata in one transaction
const getAllCacheMetadata = async () => {
  try {
    const db = await openMetaDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      // We need keys (URLs) and values (timestamps).
      // Using openCursor to map them.
      const map = new Map();
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          map.set(cursor.key, cursor.value); // key is url, value is timestamp
          cursor.continue();
        } else {
          db.close();
          resolve(map);
        }
      };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  } catch (e) {
    console.warn('SW: Failed to get all cache metadata:', e);
    return new Map();
  }
};

async function cleanExpiredCacheEntries() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  const now = Date.now();

  // Fetch all IDB metadata at once
  const metadataMap = await getAllCacheMetadata();

  for (const request of keys) {
    try {
      let cacheTime = null;

      // 1. Try Date header (fastest, no IDB)
      const response = await cache.match(request);
      if (response) {
        const dateHeader = response.headers.get('date');
        if (dateHeader) {
          cacheTime = new Date(dateHeader).getTime();
        }
      }

      // 2. Fallback to IDB metadata map (in-memory lookup)
      if (!cacheTime) {
        cacheTime = metadataMap.get(request.url);
      }

      // Use shorter expiration for local assets vs CDN
      const isLocal = getCacheCategory(request.url) === CACHE_CATEGORIES.LOCAL;
      const expirationMs = isLocal ? LOCAL_CACHE_EXPIRATION_MS : CACHE_EXPIRATION_MS;
      if (cacheTime && (now - cacheTime > expirationMs)) {
        await cache.delete(request);
        console.log(`SW: Expired cache entry: ${request.url}`);
      }
    } catch (e) {
      // Ignore errors for individual entries
    }
  }
}

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

  // Optimization: Cache First strategy for static assets
  // Load instantly from disk (0ms latency), check network in background only if needed/expired.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      if (Math.random() < 0.01) {
        cleanExpiredCacheEntries().catch(() => { });
      }
      return cache.match(request).then((cachedResponse) => {
        // 1. Cache Hit: Return immediately
        if (cachedResponse) {
          // Optional: If we want to revalidate occasionally, we could do it here, 
          // but for "Cache First" reliability we assume the cache is good until specific events.
          // Note: Since we have manual versioning (CACHE_VERSION), we trust local assets matching that version.
          return cachedResponse;
        }

        // 2. Cache Miss: Fetch from network
        return fetch(request).then((networkResponse) => {
          // Check if valid response before caching
          const isValidTransparent = networkResponse.status === 200 &&
            (networkResponse.type === 'basic' || networkResponse.type === 'cors');
          const isOpaqueCdn = networkResponse.type === 'opaque' && isTrustedCdn;
          const cacheable = networkResponse && (isValidTransparent || isOpaqueCdn);

          if (cacheable) {
            const responseToCache = networkResponse.clone();
            cache.put(request, responseToCache).then(() => {
              setCacheMetadata(request.url, Date.now());

              // Trim cache if needed
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
          // 3. Offline Fallback
          // For navigations/documents, fall back to cached shell.
          if (request.mode === 'navigate' || request.destination === 'document') {
            return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
          }
          return new Response('', { status: 503, statusText: 'Offline' });
        });
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
    event.waitUntil(
      caches.delete(CACHE_NAME)
        .then(() => clearMetaDB())
        .then(() => console.log('SW: Cache cleared by request'))
    );
  }
});
