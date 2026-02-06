const CACHE_NAME = 'pet-tracker-v4';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './css/styles.css',
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
    './js/todoist.js',
    './js/calendar-export.js',
    './js/analytics.js',
    './js/contacts.js',
    './js/onboarding.js',
    './js/setup.js',
    './js/app.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Skip caching for API calls and external resources
    if (url.hostname !== location.hostname) {
        return;
    }

    event.respondWith(
        (async () => {
            const cached = await caches.match(event.request);
            try {
                const response = await fetch(event.request);
                if (response.ok) {
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
                if (event.request.mode === 'navigate' ||
                    (event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html'))) {
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
                    // Try to send to an active client first
                    const client = await self.clients.get(event.resultingClientId);
                    if (client) {
                        client.postMessage({
                            type: 'SHARE_TARGET',
                            files: files
                        });
                    } else {
                        // No active client - persist to IDB for later consumption
                        try {
                            const db = await openShareDB();
                            const tx = db.transaction('pendingShares', 'readwrite');
                            const store = tx.objectStore('pendingShares');

                            for (const file of files) {
                                const arrayBuffer = await file.arrayBuffer();
                                store.put({
                                    id: `share_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                                    name: file.name,
                                    type: file.type,
                                    data: arrayBuffer,
                                    timestamp: Date.now()
                                });
                            }

                            await new Promise((resolve, reject) => {
                                tx.oncomplete = resolve;
                                tx.onerror = () => reject(tx.error);
                            });
                        } catch (e) {
                            console.error('[SW] Failed to persist shared files:', e);
                        }
                    }
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
