const CACHE_NAME = 'flashrevise-v2-cleanup';

self.addEventListener('install', (event) => {
    // Force this new SW to become the active one, kicking out the old one
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Claim any clients immediately, so they start using this SW (or network)
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            // Delete ALL old caches to be safe
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
            })
        ])
    );
});

// A simple fetch handler that just goes to network (network-first/network-only)
// This ensures we always get the fresh index.html from Vite build
self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});
