const CACHE = 'portfolio-v0.26.2';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [
  "/",
  "/offline.html",
  "/styles/offline.css",
  "/404.html",
  "/ai/",
  "/archive/",
  "/catalog/",
  "/healthcare-it/",
  "/lang/cs/",
  "/lang/javascript/",
  "/lang/kotlin/",
  "/lang/powershell/",
  "/lang/python/",
  "/lang/security/",
  "/lang/web/",
  "/now/",
  "/releases/",
  "/resume/",
  "/screenshots/",
  "/search/",
  "/status/",
  "/timeline/",
  "/uses/",
  "/manifest.json",
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/rss.xml",
  "/atom.xml",
  "/_assets/_slug_.DZTTMy9Y.css",
  "/_assets/ai.DakrrUoc.css",
  "/_assets/catalog.CA--t_VP.css",
  "/_assets/global.CFq-RYk-.css",
  "/_assets/healthcare-it.03D11SDD.css",
  "/_assets/index.BgPzmJHS.css",
  "/_assets/interior-quiet.xrEerpNK.css",
  "/_assets/now.CawLgQCg.css",
  "/_assets/page.BcFG7dWc.js",
  "/_assets/releases.BPY79pXl.css",
  "/_assets/resume.G_zNejAj.css",
  "/_assets/screenshots.CSiN0x1c.css",
  "/_assets/search.NwDIztzZ.css",
  "/_assets/status.BPMEZC6S.css",
  "/_assets/uses.D1QuwVMe.css",
  "/scripts/cmdk-loader.js",
  "/scripts/cmdk.js",
  "/scripts/head-init.js",
  "/scripts/home-catalog.js",
  "/scripts/home-effects.js",
  "/scripts/home-github.js",
  "/scripts/home-media.js",
  "/scripts/home-nav.js",
  "/scripts/main.js",
  "/scripts/mobile-nav.js",
  "/scripts/relative-time.js",
  "/scripts/resume.js",
  "/scripts/screenshots-page.js",
  "/scripts/scroll-reveal.js",
  "/scripts/search-page.js",
  "/scripts/section-jump-nav.js",
  "/scripts/service-worker.js",
  "/scripts/shared.js",
  "/scripts/theme-toggle.js",
  "/scripts/timeline.js",
  "/scripts/trusted-types.js",
  "/fonts/jetbrains-mono-latin-ext.woff2",
  "/fonts/jetbrains-mono-latin.woff2",
  "/fonts/outfit-latin-ext.woff2",
  "/fonts/outfit-latin.woff2",
  "/pagefind/filter/en_4488951.pf_filter",
  "/pagefind/fragment/en_1528e86.pf_fragment",
  "/pagefind/fragment/en_25d55dc.pf_fragment",
  "/pagefind/fragment/en_31a3861.pf_fragment",
  "/pagefind/fragment/en_46bb76b.pf_fragment",
  "/pagefind/fragment/en_50ff48b.pf_fragment",
  "/pagefind/fragment/en_57d2b17.pf_fragment",
  "/pagefind/fragment/en_6362be6.pf_fragment",
  "/pagefind/fragment/en_755ac3c.pf_fragment",
  "/pagefind/fragment/en_764d36b.pf_fragment",
  "/pagefind/fragment/en_84672a6.pf_fragment",
  "/pagefind/fragment/en_89d7176.pf_fragment",
  "/pagefind/fragment/en_9017d27.pf_fragment",
  "/pagefind/fragment/en_9767679.pf_fragment",
  "/pagefind/fragment/en_99db1a2.pf_fragment",
  "/pagefind/fragment/en_9d46343.pf_fragment",
  "/pagefind/fragment/en_9dd031d.pf_fragment",
  "/pagefind/fragment/en_c13d12d.pf_fragment",
  "/pagefind/fragment/en_c3445e3.pf_fragment",
  "/pagefind/fragment/en_e5bd303.pf_fragment",
  "/pagefind/fragment/en_f148274.pf_fragment",
  "/pagefind/index/en_395957b.pf_index",
  "/pagefind/index/en_47cf356.pf_index",
  "/pagefind/index/en_4a86be3.pf_index",
  "/pagefind/pagefind-component-ui.css",
  "/pagefind/pagefind-component-ui.js",
  "/pagefind/pagefind-entry.json",
  "/pagefind/pagefind-highlight.js",
  "/pagefind/pagefind-modular-ui.css",
  "/pagefind/pagefind-modular-ui.js",
  "/pagefind/pagefind-ui.css",
  "/pagefind/pagefind-ui.js",
  "/pagefind/pagefind-worker.js",
  "/pagefind/pagefind.en_92eaca7955.pf_meta",
  "/pagefind/pagefind.js",
  "/pagefind/wasm.en.pagefind",
  "/pagefind/wasm.unknown.pagefind"
];
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

async function handleNavigation(request, preloadResponsePromise, event) {
    const cached = await caches.match(request);
    const network = navigationNetworkResponse(request, preloadResponsePromise, cached);
    if (cached) {
        // Serve the cached shell immediately but keep the background refresh (and
        // its awaited cache write) alive past the response via the event lifetime.
        if (event && typeof event.waitUntil === 'function') event.waitUntil(network.catch(() => {}));
        return cached;
    }
    return network;
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
    const sameOrigin = url.origin === self.location.origin;
    const isNavigation = e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html');

    if (isNavigation && sameOrigin) {
        // Stale-while-revalidate: paint the cached shell instantly for repeat
        // visits, refresh the cache in the background. A new deploy still surfaces
        // via the SW update toast (controllerchange reload in main.js).
        e.respondWith(handleNavigation(e.request, e.preloadResponse, e));
        return;
    }

    // Cross-origin API/CDN: network-first with cache fallback.
    // Cache successful responses so offline fallback actually works.
    if (url.hostname === 'api.github.com' || url.hostname === 'opengraph.githubassets.com') {
        e.respondWith(
            timedFetch(e.request)
                .then((response) => {
                    // Extend the event lifetime so the timestamped cache write is not
                    // terminated after the response is returned to the page.
                    if (response.ok) e.waitUntil(putTimestamped(e.request, response.clone()));
                    return response;
                })
                .catch(() => freshCachedOrOffline(e.request))
        );
        return;
    }

    e.respondWith(
        caches.match(e.request).then((cached) => {
            const fetchPromise = timedFetch(e.request)
                .then(async (response) => {
                    if (response.ok && sameOrigin) {
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
