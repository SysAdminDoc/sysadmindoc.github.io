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
    try {
        const cache = await caches.open(CACHE);
        await cache.put(request, clone);
    } catch (e) { /* ignore cache write failures */ }
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
    // Documents are the portfolio's source of truth. Prefer the preloaded/fresh
    // network response so a returning visitor cannot open a newly navigated tab
    // and receive a previous deploy. The cached document remains the offline
    // fallback, preserving installed-PWA resilience.
    return navigationNetworkResponse(request, preloadResponsePromise, cached);
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
    if (e.data && e.data.type === 'GET_VERSION' && e.ports && e.ports[0]) {
        // Lets the page key its "Not now" dismissal on this exact build, so a
        // newer waiting worker (different CACHE version) re-prompts.
        e.ports[0].postMessage({ version: CACHE });
    }
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    const url = new URL(e.request.url);
    // Cross-origin requests are the browser's to make. The worker's own fetch()
    // runs under the CSP delivered with /sw.js, whose connect-src lists no image
    // hosts, so answering them here turned the cross-origin homepage avatar into
    // a synthetic 503 for every returning visitor from at least 2026-09-01.
    if (url.origin !== self.location.origin) return;
    // The API answers each request once: a form token is good for one message.
    // Stale-while-revalidate handed the cached token to the next message, which
    // the handler refused as a replay.
    if (url.pathname.startsWith('/api/')) return;
    const isNavigation = e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html');

    if (isNavigation) {
        // Network-first navigation keeps deploys truthful while navigation
        // preload avoids serial service-worker startup latency. Cached pages and
        // the dedicated offline shell remain available when the network fails.
        e.respondWith(handleNavigation(e.request, e.preloadResponse));
        return;
    }

    e.respondWith(
        caches.match(e.request).then((cached) => {
            const fetchPromise = timedFetch(e.request)
                .then(async (response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        try {
                            const c = await caches.open(CACHE);
                            await c.put(e.request, clone);
                        } catch (err) { /* ignore cache write failures */ }
                    }
                    return response;
                })
                .catch(() => cached || offlineResponse());
            if (cached) {
                // Stale-while-revalidate: return cache now, but keep the awaited
                // background write alive via the fetch event's lifetime.
                e.waitUntil(fetchPromise.catch(() => {}));
                return cached;
            }
            return fetchPromise;
        })
    );
});
