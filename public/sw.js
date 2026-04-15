const CACHE = 'portfolio-v8';
const PRECACHE = ['/', '/manifest.json', '/favicon.svg', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/rss.xml'];

function offlineResponse(status = 503, statusText = 'Offline') {
    return new Response(statusText, {
        status,
        statusText,
        headers: { 'Content-Type': 'text/plain; charset=UTF-8' },
    });
}

async function cachedOrOffline(request, fallbackPath) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackPath) {
        const fallback = await caches.match(fallbackPath);
        if (fallback) return fallback;
    }
    return offlineResponse();
}

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    const url = new URL(e.request.url);
    const sameOrigin = url.origin === self.location.origin;
    const isNavigation = e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html');

    if (isNavigation && sameOrigin) {
        e.respondWith(
            fetch(e.request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE).then((c) => c.put(e.request, clone));
                    }
                    return response;
                })
                .catch(() => cachedOrOffline(e.request, '/'))
        );
        return;
    }

    if (url.hostname === 'api.github.com' || url.hostname === 'i.scdn.co' || url.hostname === 'opengraph.githubassets.com') {
        e.respondWith(fetch(e.request).catch(() => cachedOrOffline(e.request)));
        return;
    }

    e.respondWith(
        caches.match(e.request).then((cached) => {
            const fetchPromise = fetch(e.request)
                .then((response) => {
                    if (response.ok && sameOrigin) {
                        const clone = response.clone();
                        caches.open(CACHE).then((c) => c.put(e.request, clone));
                    }
                    return response;
                })
                .catch(() => cached || offlineResponse());
            return cached || fetchPromise;
        })
    );
});
