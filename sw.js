const CACHE = 'portfolio-v0.21.26';
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
  "/_assets/releases.BPY79pXl.css",
  "/_assets/resume.BnnTp-8W.css",
  "/_assets/screenshots.C3VDswOo.css",
  "/_assets/search.BDzNYI8t.css",
  "/_assets/status.BZg0EpmN.css",
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
  "/pagefind/filter/en_b796e2a.pf_filter",
  "/pagefind/filter/en_dab423b.pf_filter",
  "/pagefind/fragment/en_0c1aded.pf_fragment",
  "/pagefind/fragment/en_102a1df.pf_fragment",
  "/pagefind/fragment/en_1053b62.pf_fragment",
  "/pagefind/fragment/en_118a597.pf_fragment",
  "/pagefind/fragment/en_147e2ed.pf_fragment",
  "/pagefind/fragment/en_1484364.pf_fragment",
  "/pagefind/fragment/en_14d7b89.pf_fragment",
  "/pagefind/fragment/en_15391f8.pf_fragment",
  "/pagefind/fragment/en_1a73e2e.pf_fragment",
  "/pagefind/fragment/en_1acdf52.pf_fragment",
  "/pagefind/fragment/en_1c5265d.pf_fragment",
  "/pagefind/fragment/en_1d73e39.pf_fragment",
  "/pagefind/fragment/en_1ffe47b.pf_fragment",
  "/pagefind/fragment/en_2211c6b.pf_fragment",
  "/pagefind/fragment/en_24902c9.pf_fragment",
  "/pagefind/fragment/en_24aaa9f.pf_fragment",
  "/pagefind/fragment/en_27ce9d8.pf_fragment",
  "/pagefind/fragment/en_27dceac.pf_fragment",
  "/pagefind/fragment/en_297f3d7.pf_fragment",
  "/pagefind/fragment/en_2aaf837.pf_fragment",
  "/pagefind/fragment/en_30cdcf2.pf_fragment",
  "/pagefind/fragment/en_317af41.pf_fragment",
  "/pagefind/fragment/en_34a6ad4.pf_fragment",
  "/pagefind/fragment/en_352b305.pf_fragment",
  "/pagefind/fragment/en_367aa0d.pf_fragment",
  "/pagefind/fragment/en_37246ea.pf_fragment",
  "/pagefind/fragment/en_375636d.pf_fragment",
  "/pagefind/fragment/en_37da872.pf_fragment",
  "/pagefind/fragment/en_389f093.pf_fragment",
  "/pagefind/fragment/en_38d954c.pf_fragment",
  "/pagefind/fragment/en_3d10d52.pf_fragment",
  "/pagefind/fragment/en_3ffbd8e.pf_fragment",
  "/pagefind/fragment/en_4329e6f.pf_fragment",
  "/pagefind/fragment/en_4349245.pf_fragment",
  "/pagefind/fragment/en_4396a7c.pf_fragment",
  "/pagefind/fragment/en_43f715b.pf_fragment",
  "/pagefind/fragment/en_4475c35.pf_fragment",
  "/pagefind/fragment/en_45f2325.pf_fragment",
  "/pagefind/fragment/en_47777fb.pf_fragment",
  "/pagefind/fragment/en_482031f.pf_fragment",
  "/pagefind/fragment/en_49b6f06.pf_fragment",
  "/pagefind/fragment/en_4a407ec.pf_fragment",
  "/pagefind/fragment/en_4a44f0d.pf_fragment",
  "/pagefind/fragment/en_4eaf18c.pf_fragment",
  "/pagefind/fragment/en_505db37.pf_fragment",
  "/pagefind/fragment/en_50b5433.pf_fragment",
  "/pagefind/fragment/en_5227de8.pf_fragment",
  "/pagefind/fragment/en_5293bf3.pf_fragment",
  "/pagefind/fragment/en_53731da.pf_fragment",
  "/pagefind/fragment/en_53f9cf1.pf_fragment",
  "/pagefind/fragment/en_542c846.pf_fragment",
  "/pagefind/fragment/en_561f2eb.pf_fragment",
  "/pagefind/fragment/en_5788e55.pf_fragment",
  "/pagefind/fragment/en_57dcb53.pf_fragment",
  "/pagefind/fragment/en_581ae88.pf_fragment",
  "/pagefind/fragment/en_5840d6c.pf_fragment",
  "/pagefind/fragment/en_5a7c85c.pf_fragment",
  "/pagefind/fragment/en_5d28808.pf_fragment",
  "/pagefind/fragment/en_5d2b139.pf_fragment",
  "/pagefind/fragment/en_5fcf622.pf_fragment",
  "/pagefind/fragment/en_6350a3d.pf_fragment",
  "/pagefind/fragment/en_63bff98.pf_fragment",
  "/pagefind/fragment/en_64416e5.pf_fragment",
  "/pagefind/fragment/en_6666f4c.pf_fragment",
  "/pagefind/fragment/en_67e4426.pf_fragment",
  "/pagefind/fragment/en_68f0d1b.pf_fragment",
  "/pagefind/fragment/en_68f37df.pf_fragment",
  "/pagefind/fragment/en_6a682f8.pf_fragment",
  "/pagefind/fragment/en_6a8d56a.pf_fragment",
  "/pagefind/fragment/en_6b725f7.pf_fragment",
  "/pagefind/fragment/en_6bbc303.pf_fragment",
  "/pagefind/fragment/en_6c442da.pf_fragment",
  "/pagefind/fragment/en_6ce289c.pf_fragment",
  "/pagefind/fragment/en_6cf2441.pf_fragment",
  "/pagefind/fragment/en_6d4f8e3.pf_fragment",
  "/pagefind/fragment/en_6e799a6.pf_fragment",
  "/pagefind/fragment/en_6fe5d34.pf_fragment",
  "/pagefind/fragment/en_717bfab.pf_fragment",
  "/pagefind/fragment/en_72b11db.pf_fragment",
  "/pagefind/fragment/en_751d232.pf_fragment",
  "/pagefind/fragment/en_7528a90.pf_fragment",
  "/pagefind/fragment/en_753c184.pf_fragment",
  "/pagefind/fragment/en_7559346.pf_fragment",
  "/pagefind/fragment/en_755ac3c.pf_fragment",
  "/pagefind/fragment/en_764ff2d.pf_fragment",
  "/pagefind/fragment/en_7665550.pf_fragment",
  "/pagefind/fragment/en_777e1e6.pf_fragment",
  "/pagefind/fragment/en_78b8ed1.pf_fragment",
  "/pagefind/fragment/en_795881c.pf_fragment",
  "/pagefind/fragment/en_7aa9236.pf_fragment",
  "/pagefind/fragment/en_7b4e5a9.pf_fragment",
  "/pagefind/fragment/en_7b8ccd7.pf_fragment",
  "/pagefind/fragment/en_7c42636.pf_fragment",
  "/pagefind/fragment/en_7dbad44.pf_fragment",
  "/pagefind/fragment/en_7ea3999.pf_fragment",
  "/pagefind/fragment/en_811a142.pf_fragment",
  "/pagefind/fragment/en_88515f2.pf_fragment",
  "/pagefind/fragment/en_8c842d1.pf_fragment",
  "/pagefind/fragment/en_8e629ed.pf_fragment",
  "/pagefind/fragment/en_8f755eb.pf_fragment",
  "/pagefind/fragment/en_907f1d6.pf_fragment",
  "/pagefind/fragment/en_91815b1.pf_fragment",
  "/pagefind/fragment/en_91aafef.pf_fragment",
  "/pagefind/fragment/en_92485e8.pf_fragment",
  "/pagefind/fragment/en_949fc55.pf_fragment",
  "/pagefind/fragment/en_953f54e.pf_fragment",
  "/pagefind/fragment/en_957b82a.pf_fragment",
  "/pagefind/fragment/en_95b08f1.pf_fragment",
  "/pagefind/fragment/en_9624728.pf_fragment",
  "/pagefind/fragment/en_976c194.pf_fragment",
  "/pagefind/fragment/en_99db1a2.pf_fragment",
  "/pagefind/fragment/en_9f4cac7.pf_fragment",
  "/pagefind/fragment/en_9f84978.pf_fragment",
  "/pagefind/fragment/en_a0656ad.pf_fragment",
  "/pagefind/fragment/en_a24a4ce.pf_fragment",
  "/pagefind/fragment/en_a279ef2.pf_fragment",
  "/pagefind/fragment/en_a56a812.pf_fragment",
  "/pagefind/fragment/en_a5fc35c.pf_fragment",
  "/pagefind/fragment/en_a6d2907.pf_fragment",
  "/pagefind/fragment/en_a6d6989.pf_fragment",
  "/pagefind/fragment/en_a6e8fb8.pf_fragment",
  "/pagefind/fragment/en_a73d8d1.pf_fragment",
  "/pagefind/fragment/en_a78dae4.pf_fragment",
  "/pagefind/fragment/en_a813727.pf_fragment",
  "/pagefind/fragment/en_a93a209.pf_fragment",
  "/pagefind/fragment/en_a9ec16a.pf_fragment",
  "/pagefind/fragment/en_a9f47e7.pf_fragment",
  "/pagefind/fragment/en_aaf9a2d.pf_fragment",
  "/pagefind/fragment/en_abb446a.pf_fragment",
  "/pagefind/fragment/en_abc59cf.pf_fragment",
  "/pagefind/fragment/en_ad59b12.pf_fragment",
  "/pagefind/fragment/en_ad5f3cb.pf_fragment",
  "/pagefind/fragment/en_b026be9.pf_fragment",
  "/pagefind/fragment/en_b08e972.pf_fragment",
  "/pagefind/fragment/en_b277186.pf_fragment",
  "/pagefind/fragment/en_b4a9eeb.pf_fragment",
  "/pagefind/fragment/en_b61d8f8.pf_fragment",
  "/pagefind/fragment/en_b67c62f.pf_fragment",
  "/pagefind/fragment/en_b6c9fec.pf_fragment",
  "/pagefind/fragment/en_b6eeaa4.pf_fragment",
  "/pagefind/fragment/en_b792ab3.pf_fragment",
  "/pagefind/fragment/en_b88260b.pf_fragment",
  "/pagefind/fragment/en_ba390e8.pf_fragment",
  "/pagefind/fragment/en_bd92ccf.pf_fragment",
  "/pagefind/fragment/en_bd979dc.pf_fragment",
  "/pagefind/fragment/en_bf2a9ac.pf_fragment",
  "/pagefind/fragment/en_bf9a9ff.pf_fragment",
  "/pagefind/fragment/en_c04fae3.pf_fragment",
  "/pagefind/fragment/en_c0fbc61.pf_fragment",
  "/pagefind/fragment/en_c1c018e.pf_fragment",
  "/pagefind/fragment/en_c424f81.pf_fragment",
  "/pagefind/fragment/en_c7c3fef.pf_fragment",
  "/pagefind/fragment/en_c7f4b02.pf_fragment",
  "/pagefind/fragment/en_c7ffcbe.pf_fragment",
  "/pagefind/fragment/en_cb248fd.pf_fragment",
  "/pagefind/fragment/en_ccf3523.pf_fragment",
  "/pagefind/fragment/en_cdf9474.pf_fragment",
  "/pagefind/fragment/en_cf0728b.pf_fragment",
  "/pagefind/fragment/en_cf14ec7.pf_fragment",
  "/pagefind/fragment/en_d063c4e.pf_fragment",
  "/pagefind/fragment/en_d1fe223.pf_fragment",
  "/pagefind/fragment/en_d25db4e.pf_fragment",
  "/pagefind/fragment/en_d2d3427.pf_fragment",
  "/pagefind/fragment/en_d3299f2.pf_fragment",
  "/pagefind/fragment/en_d3a747e.pf_fragment",
  "/pagefind/fragment/en_d5cefdf.pf_fragment",
  "/pagefind/fragment/en_d71bf3b.pf_fragment",
  "/pagefind/fragment/en_d859d18.pf_fragment",
  "/pagefind/fragment/en_d9f0151.pf_fragment",
  "/pagefind/fragment/en_db12a66.pf_fragment",
  "/pagefind/fragment/en_db3f5a8.pf_fragment",
  "/pagefind/fragment/en_dbd5168.pf_fragment",
  "/pagefind/fragment/en_dd7fe6b.pf_fragment",
  "/pagefind/fragment/en_e11f41a.pf_fragment",
  "/pagefind/fragment/en_e13636d.pf_fragment",
  "/pagefind/fragment/en_e19a37e.pf_fragment",
  "/pagefind/fragment/en_e2782e8.pf_fragment",
  "/pagefind/fragment/en_e2cdc9a.pf_fragment",
  "/pagefind/fragment/en_e3482b7.pf_fragment",
  "/pagefind/fragment/en_e37b53f.pf_fragment",
  "/pagefind/fragment/en_e4b68fb.pf_fragment",
  "/pagefind/fragment/en_e79e856.pf_fragment",
  "/pagefind/fragment/en_e965718.pf_fragment",
  "/pagefind/fragment/en_ea4845b.pf_fragment",
  "/pagefind/fragment/en_ec7b6d1.pf_fragment",
  "/pagefind/fragment/en_ecdbab7.pf_fragment",
  "/pagefind/fragment/en_edd216c.pf_fragment",
  "/pagefind/fragment/en_ee6f7f4.pf_fragment",
  "/pagefind/fragment/en_ee78cee.pf_fragment",
  "/pagefind/fragment/en_eebc797.pf_fragment",
  "/pagefind/fragment/en_efd5657.pf_fragment",
  "/pagefind/fragment/en_f0da315.pf_fragment",
  "/pagefind/fragment/en_f2177d2.pf_fragment",
  "/pagefind/fragment/en_f44ee1b.pf_fragment",
  "/pagefind/fragment/en_f4e6fec.pf_fragment",
  "/pagefind/fragment/en_f4f6935.pf_fragment",
  "/pagefind/fragment/en_f5193ba.pf_fragment",
  "/pagefind/fragment/en_f590fdb.pf_fragment",
  "/pagefind/fragment/en_f5f56ab.pf_fragment",
  "/pagefind/fragment/en_f6a8425.pf_fragment",
  "/pagefind/fragment/en_f949268.pf_fragment",
  "/pagefind/fragment/en_f964f45.pf_fragment",
  "/pagefind/fragment/en_f9fe932.pf_fragment",
  "/pagefind/fragment/en_fe0b598.pf_fragment",
  "/pagefind/index/en_1324678.pf_index",
  "/pagefind/index/en_13cc81b.pf_index",
  "/pagefind/index/en_1d20672.pf_index",
  "/pagefind/index/en_2067735.pf_index",
  "/pagefind/index/en_22fa3e5.pf_index",
  "/pagefind/index/en_29184da.pf_index",
  "/pagefind/index/en_2c870cc.pf_index",
  "/pagefind/index/en_38af6d3.pf_index",
  "/pagefind/index/en_3e4465a.pf_index",
  "/pagefind/index/en_462fd55.pf_index",
  "/pagefind/index/en_4ea8401.pf_index",
  "/pagefind/index/en_51a9ba6.pf_index",
  "/pagefind/index/en_53f91a5.pf_index",
  "/pagefind/index/en_63279e8.pf_index",
  "/pagefind/index/en_6dc2e03.pf_index",
  "/pagefind/index/en_6e972a4.pf_index",
  "/pagefind/index/en_7533821.pf_index",
  "/pagefind/index/en_793571a.pf_index",
  "/pagefind/index/en_8919ab5.pf_index",
  "/pagefind/index/en_9416b68.pf_index",
  "/pagefind/index/en_9e5ba87.pf_index",
  "/pagefind/index/en_a22b2ec.pf_index",
  "/pagefind/index/en_a3e2252.pf_index",
  "/pagefind/index/en_a47c82c.pf_index",
  "/pagefind/index/en_a4e4e86.pf_index",
  "/pagefind/index/en_b13c92d.pf_index",
  "/pagefind/index/en_b3ce6f7.pf_index",
  "/pagefind/index/en_b3f1e86.pf_index",
  "/pagefind/index/en_db44fd9.pf_index",
  "/pagefind/index/en_dd8f2a9.pf_index",
  "/pagefind/index/en_e918adf.pf_index",
  "/pagefind/index/en_ecb4797.pf_index",
  "/pagefind/index/en_ed45c0a.pf_index",
  "/pagefind/index/en_f147dad.pf_index",
  "/pagefind/index/en_f4879ed.pf_index",
  "/pagefind/index/en_f75a551.pf_index",
  "/pagefind/index/en_f83b254.pf_index",
  "/pagefind/pagefind-component-ui.css",
  "/pagefind/pagefind-component-ui.js",
  "/pagefind/pagefind-entry.json",
  "/pagefind/pagefind-highlight.js",
  "/pagefind/pagefind-modular-ui.css",
  "/pagefind/pagefind-modular-ui.js",
  "/pagefind/pagefind-ui.css",
  "/pagefind/pagefind-ui.js",
  "/pagefind/pagefind-worker.js",
  "/pagefind/pagefind.en_c51e591d62.pf_meta",
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
