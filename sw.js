const CACHE = 'portfolio-v0.21.21';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [
  "/",
  "/offline.html",
  "/styles/offline.css",
  "/search/",
  "/releases/",
  "/now/",
  "/manifest.json",
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/rss.xml",
  "/atom.xml",
  "/_assets/_slug_.DZTTMy9Y.css",
  "/_assets/_slug_.DdNNXZYx.css",
  "/_assets/global.Bic6u7kR.css",
  "/_assets/healthcare-it.03D11SDD.css",
  "/_assets/index.B7joCWaL.css",
  "/_assets/now.B0c5WDsd.css",
  "/_assets/page.ChryR_Se.js",
  "/_assets/releases.BBjkGsFM.css",
  "/_assets/resume.BnnTp-8W.css",
  "/_assets/screenshots.C3VDswOo.css",
  "/_assets/search.BDzNYI8t.css",
  "/_assets/status.DoPbb-8Y.css",
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
  "/scripts/project-page.js",
  "/scripts/relative-time.js",
  "/scripts/resume.js",
  "/scripts/screenshots-page.js",
  "/scripts/scroll-reveal.js",
  "/scripts/search-page.js",
  "/scripts/section-jump-nav.js",
  "/scripts/service-worker.js",
  "/scripts/shared.js",
  "/scripts/shot-viewer.js",
  "/scripts/theme-toggle.js",
  "/scripts/timeline.js",
  "/fonts/jetbrains-mono-latin-ext.woff2",
  "/fonts/jetbrains-mono-latin.woff2",
  "/fonts/outfit-latin-ext.woff2",
  "/fonts/outfit-latin.woff2",
  "/pagefind/filter/en_7152a64.pf_filter",
  "/pagefind/filter/en_ac385e9.pf_filter",
  "/pagefind/fragment/en_1053b62.pf_fragment",
  "/pagefind/fragment/en_118a597.pf_fragment",
  "/pagefind/fragment/en_14f2187.pf_fragment",
  "/pagefind/fragment/en_15391f8.pf_fragment",
  "/pagefind/fragment/en_1595e03.pf_fragment",
  "/pagefind/fragment/en_192dcc4.pf_fragment",
  "/pagefind/fragment/en_1a73e2e.pf_fragment",
  "/pagefind/fragment/en_1b3d3c1.pf_fragment",
  "/pagefind/fragment/en_1c5265d.pf_fragment",
  "/pagefind/fragment/en_1d4a40d.pf_fragment",
  "/pagefind/fragment/en_1d5a153.pf_fragment",
  "/pagefind/fragment/en_1e9b1a5.pf_fragment",
  "/pagefind/fragment/en_24902c9.pf_fragment",
  "/pagefind/fragment/en_27fa838.pf_fragment",
  "/pagefind/fragment/en_28961d8.pf_fragment",
  "/pagefind/fragment/en_29374d7.pf_fragment",
  "/pagefind/fragment/en_2ba296f.pf_fragment",
  "/pagefind/fragment/en_2c7d03a.pf_fragment",
  "/pagefind/fragment/en_2d5b317.pf_fragment",
  "/pagefind/fragment/en_30cdcf2.pf_fragment",
  "/pagefind/fragment/en_30fdd3a.pf_fragment",
  "/pagefind/fragment/en_324bf28.pf_fragment",
  "/pagefind/fragment/en_33d6f5f.pf_fragment",
  "/pagefind/fragment/en_34a6ad4.pf_fragment",
  "/pagefind/fragment/en_34dd159.pf_fragment",
  "/pagefind/fragment/en_34fa43f.pf_fragment",
  "/pagefind/fragment/en_367c187.pf_fragment",
  "/pagefind/fragment/en_36c8e49.pf_fragment",
  "/pagefind/fragment/en_37246ea.pf_fragment",
  "/pagefind/fragment/en_375636d.pf_fragment",
  "/pagefind/fragment/en_37dc8db.pf_fragment",
  "/pagefind/fragment/en_3b55cbf.pf_fragment",
  "/pagefind/fragment/en_3bca087.pf_fragment",
  "/pagefind/fragment/en_3cdaa7b.pf_fragment",
  "/pagefind/fragment/en_41b7a74.pf_fragment",
  "/pagefind/fragment/en_42ab30c.pf_fragment",
  "/pagefind/fragment/en_432c76c.pf_fragment",
  "/pagefind/fragment/en_43f715b.pf_fragment",
  "/pagefind/fragment/en_45785ed.pf_fragment",
  "/pagefind/fragment/en_482031f.pf_fragment",
  "/pagefind/fragment/en_48de5d2.pf_fragment",
  "/pagefind/fragment/en_4a3eb1c.pf_fragment",
  "/pagefind/fragment/en_4a407ec.pf_fragment",
  "/pagefind/fragment/en_4a44f0d.pf_fragment",
  "/pagefind/fragment/en_4a6446f.pf_fragment",
  "/pagefind/fragment/en_4a94a2d.pf_fragment",
  "/pagefind/fragment/en_4d4fe92.pf_fragment",
  "/pagefind/fragment/en_4d5a259.pf_fragment",
  "/pagefind/fragment/en_4e3cd1e.pf_fragment",
  "/pagefind/fragment/en_4fa2ce4.pf_fragment",
  "/pagefind/fragment/en_4fda485.pf_fragment",
  "/pagefind/fragment/en_505db37.pf_fragment",
  "/pagefind/fragment/en_50b5433.pf_fragment",
  "/pagefind/fragment/en_5265aa6.pf_fragment",
  "/pagefind/fragment/en_542c846.pf_fragment",
  "/pagefind/fragment/en_54758d5.pf_fragment",
  "/pagefind/fragment/en_54fb83d.pf_fragment",
  "/pagefind/fragment/en_5840d6c.pf_fragment",
  "/pagefind/fragment/en_58e481f.pf_fragment",
  "/pagefind/fragment/en_592b38c.pf_fragment",
  "/pagefind/fragment/en_59787ee.pf_fragment",
  "/pagefind/fragment/en_5a3667a.pf_fragment",
  "/pagefind/fragment/en_5a7c85c.pf_fragment",
  "/pagefind/fragment/en_5d28808.pf_fragment",
  "/pagefind/fragment/en_5d2b139.pf_fragment",
  "/pagefind/fragment/en_5d35c1c.pf_fragment",
  "/pagefind/fragment/en_61dd2fc.pf_fragment",
  "/pagefind/fragment/en_61fa21b.pf_fragment",
  "/pagefind/fragment/en_63bff98.pf_fragment",
  "/pagefind/fragment/en_64185bd.pf_fragment",
  "/pagefind/fragment/en_643e7d5.pf_fragment",
  "/pagefind/fragment/en_64b9db9.pf_fragment",
  "/pagefind/fragment/en_64f030f.pf_fragment",
  "/pagefind/fragment/en_651bfc8.pf_fragment",
  "/pagefind/fragment/en_654fdb7.pf_fragment",
  "/pagefind/fragment/en_69d4e08.pf_fragment",
  "/pagefind/fragment/en_6a682f8.pf_fragment",
  "/pagefind/fragment/en_6ce289c.pf_fragment",
  "/pagefind/fragment/en_6cf2441.pf_fragment",
  "/pagefind/fragment/en_6d22929.pf_fragment",
  "/pagefind/fragment/en_6ead98b.pf_fragment",
  "/pagefind/fragment/en_6fe5d34.pf_fragment",
  "/pagefind/fragment/en_753c184.pf_fragment",
  "/pagefind/fragment/en_78e7832.pf_fragment",
  "/pagefind/fragment/en_7b8ccd7.pf_fragment",
  "/pagefind/fragment/en_7b94fa8.pf_fragment",
  "/pagefind/fragment/en_7c42636.pf_fragment",
  "/pagefind/fragment/en_7d3eceb.pf_fragment",
  "/pagefind/fragment/en_80963f8.pf_fragment",
  "/pagefind/fragment/en_81b2ffd.pf_fragment",
  "/pagefind/fragment/en_81c415a.pf_fragment",
  "/pagefind/fragment/en_81e6d78.pf_fragment",
  "/pagefind/fragment/en_827f91b.pf_fragment",
  "/pagefind/fragment/en_8313747.pf_fragment",
  "/pagefind/fragment/en_8316e16.pf_fragment",
  "/pagefind/fragment/en_8390c27.pf_fragment",
  "/pagefind/fragment/en_83dcd55.pf_fragment",
  "/pagefind/fragment/en_846ab52.pf_fragment",
  "/pagefind/fragment/en_872a892.pf_fragment",
  "/pagefind/fragment/en_8794422.pf_fragment",
  "/pagefind/fragment/en_8d383c2.pf_fragment",
  "/pagefind/fragment/en_8ddd8f1.pf_fragment",
  "/pagefind/fragment/en_8e2d8dc.pf_fragment",
  "/pagefind/fragment/en_8ff4472.pf_fragment",
  "/pagefind/fragment/en_907f1d6.pf_fragment",
  "/pagefind/fragment/en_91aafef.pf_fragment",
  "/pagefind/fragment/en_928de6e.pf_fragment",
  "/pagefind/fragment/en_94855d9.pf_fragment",
  "/pagefind/fragment/en_949fc55.pf_fragment",
  "/pagefind/fragment/en_959dcb5.pf_fragment",
  "/pagefind/fragment/en_96fd339.pf_fragment",
  "/pagefind/fragment/en_976c194.pf_fragment",
  "/pagefind/fragment/en_9780548.pf_fragment",
  "/pagefind/fragment/en_991dc33.pf_fragment",
  "/pagefind/fragment/en_9b9d585.pf_fragment",
  "/pagefind/fragment/en_9ba9c09.pf_fragment",
  "/pagefind/fragment/en_9f49487.pf_fragment",
  "/pagefind/fragment/en_9f84978.pf_fragment",
  "/pagefind/fragment/en_a0656ad.pf_fragment",
  "/pagefind/fragment/en_a0edbd1.pf_fragment",
  "/pagefind/fragment/en_a0ee34b.pf_fragment",
  "/pagefind/fragment/en_a165809.pf_fragment",
  "/pagefind/fragment/en_a18e286.pf_fragment",
  "/pagefind/fragment/en_a24a4ce.pf_fragment",
  "/pagefind/fragment/en_a25cef7.pf_fragment",
  "/pagefind/fragment/en_a279ef2.pf_fragment",
  "/pagefind/fragment/en_a56a812.pf_fragment",
  "/pagefind/fragment/en_a658a5d.pf_fragment",
  "/pagefind/fragment/en_a6c80ec.pf_fragment",
  "/pagefind/fragment/en_a6d6989.pf_fragment",
  "/pagefind/fragment/en_a73d8d1.pf_fragment",
  "/pagefind/fragment/en_a7456cf.pf_fragment",
  "/pagefind/fragment/en_a9ec16a.pf_fragment",
  "/pagefind/fragment/en_a9f47e7.pf_fragment",
  "/pagefind/fragment/en_abc59cf.pf_fragment",
  "/pagefind/fragment/en_aeda106.pf_fragment",
  "/pagefind/fragment/en_af4ecbc.pf_fragment",
  "/pagefind/fragment/en_b026be9.pf_fragment",
  "/pagefind/fragment/en_b0ea209.pf_fragment",
  "/pagefind/fragment/en_b3b7e7e.pf_fragment",
  "/pagefind/fragment/en_b4a9eeb.pf_fragment",
  "/pagefind/fragment/en_b5cbd03.pf_fragment",
  "/pagefind/fragment/en_b6c9fec.pf_fragment",
  "/pagefind/fragment/en_b792ab3.pf_fragment",
  "/pagefind/fragment/en_b880f9c.pf_fragment",
  "/pagefind/fragment/en_b88260b.pf_fragment",
  "/pagefind/fragment/en_b8dfd4b.pf_fragment",
  "/pagefind/fragment/en_bd5942f.pf_fragment",
  "/pagefind/fragment/en_bdfb4db.pf_fragment",
  "/pagefind/fragment/en_bf2a9ac.pf_fragment",
  "/pagefind/fragment/en_bf810e9.pf_fragment",
  "/pagefind/fragment/en_bf8d25f.pf_fragment",
  "/pagefind/fragment/en_c028cb3.pf_fragment",
  "/pagefind/fragment/en_c0fbc61.pf_fragment",
  "/pagefind/fragment/en_c38f7b6.pf_fragment",
  "/pagefind/fragment/en_c46d2df.pf_fragment",
  "/pagefind/fragment/en_c576b78.pf_fragment",
  "/pagefind/fragment/en_c5f99dd.pf_fragment",
  "/pagefind/fragment/en_c8a6517.pf_fragment",
  "/pagefind/fragment/en_c8a6676.pf_fragment",
  "/pagefind/fragment/en_cb7e6fd.pf_fragment",
  "/pagefind/fragment/en_cca5743.pf_fragment",
  "/pagefind/fragment/en_ccf3523.pf_fragment",
  "/pagefind/fragment/en_cdf9474.pf_fragment",
  "/pagefind/fragment/en_d0233f0.pf_fragment",
  "/pagefind/fragment/en_d0653e5.pf_fragment",
  "/pagefind/fragment/en_d066728.pf_fragment",
  "/pagefind/fragment/en_d25db4e.pf_fragment",
  "/pagefind/fragment/en_d3299f2.pf_fragment",
  "/pagefind/fragment/en_d3a747e.pf_fragment",
  "/pagefind/fragment/en_d5cefdf.pf_fragment",
  "/pagefind/fragment/en_d74f74f.pf_fragment",
  "/pagefind/fragment/en_d773a1f.pf_fragment",
  "/pagefind/fragment/en_d859d18.pf_fragment",
  "/pagefind/fragment/en_d96e185.pf_fragment",
  "/pagefind/fragment/en_d985986.pf_fragment",
  "/pagefind/fragment/en_d9c9c93.pf_fragment",
  "/pagefind/fragment/en_db7b815.pf_fragment",
  "/pagefind/fragment/en_dbd5168.pf_fragment",
  "/pagefind/fragment/en_ddb0539.pf_fragment",
  "/pagefind/fragment/en_e19a37e.pf_fragment",
  "/pagefind/fragment/en_e2e49e4.pf_fragment",
  "/pagefind/fragment/en_e4b68fb.pf_fragment",
  "/pagefind/fragment/en_e79e856.pf_fragment",
  "/pagefind/fragment/en_eb9ec1c.pf_fragment",
  "/pagefind/fragment/en_ebff43d.pf_fragment",
  "/pagefind/fragment/en_ec6c78a.pf_fragment",
  "/pagefind/fragment/en_ee6f7f4.pf_fragment",
  "/pagefind/fragment/en_efc6a62.pf_fragment",
  "/pagefind/fragment/en_f1e25a7.pf_fragment",
  "/pagefind/fragment/en_f2177d2.pf_fragment",
  "/pagefind/fragment/en_f3b851f.pf_fragment",
  "/pagefind/fragment/en_f3ce592.pf_fragment",
  "/pagefind/fragment/en_f46ccd3.pf_fragment",
  "/pagefind/fragment/en_f4e6fec.pf_fragment",
  "/pagefind/fragment/en_f5f56ab.pf_fragment",
  "/pagefind/fragment/en_f6bd743.pf_fragment",
  "/pagefind/fragment/en_f6fa0e3.pf_fragment",
  "/pagefind/fragment/en_f81827e.pf_fragment",
  "/pagefind/fragment/en_f9fe932.pf_fragment",
  "/pagefind/fragment/en_fbde112.pf_fragment",
  "/pagefind/fragment/en_fc4e96f.pf_fragment",
  "/pagefind/fragment/en_fd1a40b.pf_fragment",
  "/pagefind/fragment/en_fe0b598.pf_fragment",
  "/pagefind/index/en_10e1cc4.pf_index",
  "/pagefind/index/en_22c6289.pf_index",
  "/pagefind/index/en_2c2d46b.pf_index",
  "/pagefind/index/en_3093d7d.pf_index",
  "/pagefind/index/en_3478586.pf_index",
  "/pagefind/index/en_35713dc.pf_index",
  "/pagefind/index/en_3d4312d.pf_index",
  "/pagefind/index/en_49d31e5.pf_index",
  "/pagefind/index/en_4bfd355.pf_index",
  "/pagefind/index/en_4ca64c3.pf_index",
  "/pagefind/index/en_4fcffa9.pf_index",
  "/pagefind/index/en_53ebd38.pf_index",
  "/pagefind/index/en_554652c.pf_index",
  "/pagefind/index/en_5c95f54.pf_index",
  "/pagefind/index/en_5e9e9c9.pf_index",
  "/pagefind/index/en_6c2cf7d.pf_index",
  "/pagefind/index/en_6d1a8c9.pf_index",
  "/pagefind/index/en_6d35132.pf_index",
  "/pagefind/index/en_6e87b83.pf_index",
  "/pagefind/index/en_6f2a43b.pf_index",
  "/pagefind/index/en_724fe57.pf_index",
  "/pagefind/index/en_80d2b7c.pf_index",
  "/pagefind/index/en_8127fbb.pf_index",
  "/pagefind/index/en_83413b7.pf_index",
  "/pagefind/index/en_8810a92.pf_index",
  "/pagefind/index/en_92ee5ce.pf_index",
  "/pagefind/index/en_9eddaff.pf_index",
  "/pagefind/index/en_a1c0a3c.pf_index",
  "/pagefind/index/en_b5464a8.pf_index",
  "/pagefind/index/en_b750fb2.pf_index",
  "/pagefind/index/en_bbd2133.pf_index",
  "/pagefind/index/en_da15e5f.pf_index",
  "/pagefind/index/en_ef58b29.pf_index",
  "/pagefind/index/en_ef9494f.pf_index",
  "/pagefind/index/en_f2a69dc.pf_index",
  "/pagefind/index/en_fbf99eb.pf_index",
  "/pagefind/index/en_fc54425.pf_index",
  "/pagefind/pagefind-component-ui.css",
  "/pagefind/pagefind-component-ui.js",
  "/pagefind/pagefind-entry.json",
  "/pagefind/pagefind-highlight.js",
  "/pagefind/pagefind-modular-ui.css",
  "/pagefind/pagefind-modular-ui.js",
  "/pagefind/pagefind-ui.css",
  "/pagefind/pagefind-ui.js",
  "/pagefind/pagefind-worker.js",
  "/pagefind/pagefind.en_6af33f4a74.pf_meta",
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
