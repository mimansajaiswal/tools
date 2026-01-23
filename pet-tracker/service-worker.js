const CACHE_NAME = 'pet-tracker-v1';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest'
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

    // Skip caching for API calls
    if (url.hostname !== location.hostname) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            const fetched = fetch(event.request).then((response) => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            }).catch(() => cached);

            return cached || fetched;
        })
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
