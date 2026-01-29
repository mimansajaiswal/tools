const CACHE_NAME = 'pet-tracker-v3';
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

// Handle share target
self.addEventListener('fetch', (event) => {
    if (event.request.method === 'POST' && event.request.url.includes('index.html')) {
        event.respondWith(
            (async () => {
                const formData = await event.request.formData();
                const files = formData.getAll('media');

                // Store shared files temporarily
                if (files.length > 0) {
                    const client = await self.clients.get(event.resultingClientId);
                    if (client) {
                        client.postMessage({
                            type: 'SHARE_TARGET',
                            files: files
                        });
                    }
                }

                return Response.redirect('./index.html?share=true', 303);
            })()
        );
    }
});
