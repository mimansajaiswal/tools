const CACHE_NAME = 'pet-tracker-v21';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './css/styles.css',
    '../components/quick-add/quick-add-component.js',
    '../components/quick-add/quick-add-component.css',
    './js/storage.js',
    './js/ui.js',
    './js/api.js',
    './js/sync.js',
    './js/pets.js',
    './js/events.js',
    './js/calendar.js',
    './js/care.js',
    './js/media.js',
    './js/ai.js',
    './js/quick-add-modal.js',
    './js/todoist.js',
    './js/calendar-export.js',
    './js/analytics.js',
    './js/contacts.js',
    './js/onboarding.js',
    './js/setup.js',
    './js/app.js'
];
const CROSS_ORIGIN_PRECACHE = [
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@0.561.0/dist/umd/lucide.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
    'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap'
];
const CACHEABLE_CROSS_ORIGIN_HOSTS = new Set([
    'cdn.tailwindcss.com',
    'unpkg.com',
    'cdn.jsdelivr.net',
    'fonts.googleapis.com',
    'fonts.gstatic.com'
]);

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            await cache.addAll(STATIC_ASSETS);

            // Best-effort prefetch for critical CDN assets used by the shell.
            await Promise.allSettled(
                CROSS_ORIGIN_PRECACHE.map(async (url) => {
                    const request = new Request(url, { mode: 'no-cors' });
                    const response = await fetch(request);
                    await cache.put(request, response);
                })
            );
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key.startsWith('pet-tracker-v') && key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    const isSameOrigin = url.origin === location.origin;
    const isAllowedCrossOrigin = CACHEABLE_CROSS_ORIGIN_HOSTS.has(url.hostname);
    if (!isSameOrigin && !isAllowedCrossOrigin) {
        return;
    }

    event.respondWith(
        (async () => {
            const cached = await caches.match(event.request);
            try {
                const response = await fetch(event.request);
                if (response.ok || response.type === 'opaque') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            } catch (e) {
                // Network failed, return cached or offline fallback
                if (cached) {
                    return cached;
                }

                // For navigation requests (HTML pages), return cached index.html for SPA fallback
                if (isSameOrigin && (event.request.mode === 'navigate' ||
                    (event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html')))) {
                    const indexCache = await caches.match('./index.html');
                    if (indexCache) {
                        return indexCache;
                    }
                }

                // Return a proper offline response
                return new Response('Offline - content not cached', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'text/plain' }
                });
            }
        })()
    );
});

// Handle share target - persist files to IDB if no active client
self.addEventListener('fetch', (event) => {
    if (event.request.method === 'POST' && event.request.url.includes('index.html')) {
        event.respondWith(
            (async () => {
                const formData = await event.request.formData();
                const files = formData.getAll('media');

                if (files.length > 0) {
                    const records = await Promise.all(files.map(async file => ({
                        id: crypto.randomUUID(), name: file.name, type: file.type,
                        data: await file.arrayBuffer(), timestamp: Date.now()
                    })));
                    const db = await openShareDB();
                    const tx = db.transaction('pendingShares', 'readwrite');
                    const store = tx.objectStore('pendingShares');
                    const committed = new Promise((resolve, reject) => {
                        tx.oncomplete = resolve;
                        tx.onerror = () => reject(tx.error);
                        tx.onabort = () => reject(tx.error);
                    });
                    records.forEach(record => store.put(record));
                    await committed;
                    db.close();
                }

                return Response.redirect('./index.html?share=true', 303);
            })()
        );
    }
});

// FIX #4: Helper to open share DB with unified schema (keyPath: 'id')
function openShareDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('PetTracker_ShareDB', 2);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // Delete old store with incompatible schema if it exists
            if (db.objectStoreNames.contains('pendingShares')) {
                db.deleteObjectStore('pendingShares');
            }
            db.createObjectStore('pendingShares', { keyPath: 'id' });
        };
    });
}
