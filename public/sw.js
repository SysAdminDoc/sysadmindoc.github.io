const CACHE = 'portfolio-v__BUILD_VERSION__';
const OFFLINE_URL = '/offline.html';
const PRECACHE = __PRECACHE_PLACEHOLDER__;
const FETCH_TIMEOUT = 10000;

function offlineResponse(status = 503, statusText = 'Offline') {
    return new Response(statusText, {
        status,
        statusText,
        headers: { 'Content-Type': 'text/plain; charset=UTF-8' },
    });
}

function timedFetch(request, timeoutMs) {
    if (typeof AbortController === 'undefined') return fetch(request);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs || FETCH_TIMEOUT);
    return fetch(request instanceof Request ? new Request(request, { signal: controller.signal }) : request, { signal: controller.signal })
        .finally(() => clearTimeout(timer));
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

const CROSS_ORIGIN_TTL = 24 * 60 * 60 * 1000; // 24h — bound staleness of cached API/CDN responses.

// Cache a cross-origin response stamped with the time it was stored.
async function putTimestamped(request, response) {
    try {
        const cache = await caches.open(CACHE);
        const headers = new Headers(response.headers);
        headers.set('sw-cached-at', String(Date.now()));
        const body = await response.blob();
        await cache.put(request, new Response(body, { status: response.status, statusText: response.statusText, headers }));
    } catch (e) { /* ignore cache write failures */ }
}

// Serve a cached cross-origin response only if it is within the TTL.
async function freshCachedOrOffline(request) {
    const cached = await caches.match(request);
    if (cached) {
        const at = Number(cached.headers.get('sw-cached-at') || 0);
        if (Number.isFinite(at) && at > 0 && Date.now() - at < CROSS_ORIGIN_TTL) return cached;
    }
    return offlineResponse();
}

async function resilientPrecache(cache, urls) {
    const failures = [];
    await Promise.all(urls.map(async (url) => {
        try {
            await cache.add(url);
        } catch (error) {
            failures.push(url);
        }
    }));
    if (failures.length) {
        console.warn('Service worker precache skipped failed entries:', failures.join(', '));
    }
    if (urls.length > 0 && failures.length === urls.length) {
        throw new Error('Service worker precache failed for every entry.');
    }
}

async function enableNavigationPreload() {
    if (!self.registration || !self.registration.navigationPreload) return;
    try {
        await self.registration.navigationPreload.enable();
    } catch (error) {
        console.warn('Service worker navigation preload unavailable:', error);
    }
}

async function cacheNavigationResponse(request, response) {
    if (!response.ok) return;
    const clone = response.clone();
    caches.open(CACHE).then((c) => c.put(request, clone)).catch(() => {});
}

async function navigationNetworkResponse(request, preloadResponsePromise, cached) {
    try {
        const preloadResponse = await preloadResponsePromise;
        const response = preloadResponse || await timedFetch(request);
        await cacheNavigationResponse(request, response);
        return response;
    } catch (error) {
        return cached || cachedOrOffline(request, OFFLINE_URL);
    }
}

async function handleNavigation(request, preloadResponsePromise) {
    const cached = await caches.match(request);
    const network = navigationNetworkResponse(request, preloadResponsePromise, cached);
    return cached || network;
}

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => resilientPrecache(c, PRECACHE)));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        Promise.all([
            enableNavigationPreload(),
            caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
        ]).then(() => self.clients.claim())
    );
});

self.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    const url = new URL(e.request.url);
    const sameOrigin = url.origin === self.location.origin;
    const isNavigation = e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html');

    if (isNavigation && sameOrigin) {
        // Stale-while-revalidate: paint the cached shell instantly for repeat
        // visits, refresh the cache in the background. A new deploy still surfaces
        // via the SW update toast (controllerchange reload in main.js).
        e.respondWith(handleNavigation(e.request, e.preloadResponse));
        return;
    }

    // Cross-origin API/CDN: network-first with cache fallback.
    // Cache successful responses so offline fallback actually works.
    if (url.hostname === 'api.github.com' || url.hostname === 'opengraph.githubassets.com') {
        e.respondWith(
            timedFetch(e.request)
                .then((response) => {
                    if (response.ok) putTimestamped(e.request, response.clone());
                    return response;
                })
                .catch(() => freshCachedOrOffline(e.request))
        );
        return;
    }

    e.respondWith(
        caches.match(e.request).then((cached) => {
            const fetchPromise = timedFetch(e.request)
                .then((response) => {
                    if (response.ok && sameOrigin) {
                        const clone = response.clone();
                        caches.open(CACHE).then((c) => c.put(e.request, clone)).catch(() => {});
                    }
                    return response;
                })
                .catch(() => cached || offlineResponse());
            return cached || fetchPromise;
        })
    );
});
