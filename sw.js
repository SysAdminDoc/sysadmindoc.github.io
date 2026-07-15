const CACHE = 'portfolio-v0.22.0';
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
  "/_assets/_slug_.DZyICMMz.css",
  "/_assets/global.BcB9115b.css",
  "/_assets/healthcare-it.03D11SDD.css",
  "/_assets/index.Dgw3HUY7.css",
  "/_assets/now.CawLgQCg.css",
  "/_assets/page.ChryR_Se.js",
  "/_assets/releases.BPY79pXl.css",
  "/_assets/resume.G_zNejAj.css",
  "/_assets/screenshots.CSiN0x1c.css",
  "/_assets/search.NwDIztzZ.css",
  "/_assets/status.CY99lP4s.css",
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
  "/pagefind/filter/en_647df9e.pf_filter",
  "/pagefind/filter/en_a3a4bc9.pf_filter",
  "/pagefind/fragment/en_1022a18.pf_fragment",
  "/pagefind/fragment/en_1053b62.pf_fragment",
  "/pagefind/fragment/en_1178175.pf_fragment",
  "/pagefind/fragment/en_11a66b5.pf_fragment",
  "/pagefind/fragment/en_126fd77.pf_fragment",
  "/pagefind/fragment/en_1288fcb.pf_fragment",
  "/pagefind/fragment/en_13d5481.pf_fragment",
  "/pagefind/fragment/en_141b748.pf_fragment",
  "/pagefind/fragment/en_15a7aaa.pf_fragment",
  "/pagefind/fragment/en_15e78ae.pf_fragment",
  "/pagefind/fragment/en_19ace2d.pf_fragment",
  "/pagefind/fragment/en_19bd57a.pf_fragment",
  "/pagefind/fragment/en_1a7c42e.pf_fragment",
  "/pagefind/fragment/en_1c5131b.pf_fragment",
  "/pagefind/fragment/en_204bc86.pf_fragment",
  "/pagefind/fragment/en_21595c6.pf_fragment",
  "/pagefind/fragment/en_25b6694.pf_fragment",
  "/pagefind/fragment/en_268e54c.pf_fragment",
  "/pagefind/fragment/en_26fb2d7.pf_fragment",
  "/pagefind/fragment/en_290b1f7.pf_fragment",
  "/pagefind/fragment/en_2a31919.pf_fragment",
  "/pagefind/fragment/en_2a505c4.pf_fragment",
  "/pagefind/fragment/en_2adda38.pf_fragment",
  "/pagefind/fragment/en_2c205bb.pf_fragment",
  "/pagefind/fragment/en_2d94b56.pf_fragment",
  "/pagefind/fragment/en_2e14e59.pf_fragment",
  "/pagefind/fragment/en_2fff936.pf_fragment",
  "/pagefind/fragment/en_333640a.pf_fragment",
  "/pagefind/fragment/en_339d1ac.pf_fragment",
  "/pagefind/fragment/en_33e5723.pf_fragment",
  "/pagefind/fragment/en_342e856.pf_fragment",
  "/pagefind/fragment/en_35dd48c.pf_fragment",
  "/pagefind/fragment/en_3672623.pf_fragment",
  "/pagefind/fragment/en_37da872.pf_fragment",
  "/pagefind/fragment/en_3c71c08.pf_fragment",
  "/pagefind/fragment/en_3e5e814.pf_fragment",
  "/pagefind/fragment/en_3f196f9.pf_fragment",
  "/pagefind/fragment/en_3f49d3f.pf_fragment",
  "/pagefind/fragment/en_412a144.pf_fragment",
  "/pagefind/fragment/en_4389e09.pf_fragment",
  "/pagefind/fragment/en_45e8a51.pf_fragment",
  "/pagefind/fragment/en_48675fa.pf_fragment",
  "/pagefind/fragment/en_48d7909.pf_fragment",
  "/pagefind/fragment/en_49efdfc.pf_fragment",
  "/pagefind/fragment/en_4a9386e.pf_fragment",
  "/pagefind/fragment/en_4aa7e01.pf_fragment",
  "/pagefind/fragment/en_4d7bc6d.pf_fragment",
  "/pagefind/fragment/en_4f76938.pf_fragment",
  "/pagefind/fragment/en_50e6466.pf_fragment",
  "/pagefind/fragment/en_51937df.pf_fragment",
  "/pagefind/fragment/en_51d8887.pf_fragment",
  "/pagefind/fragment/en_5216cef.pf_fragment",
  "/pagefind/fragment/en_5342f1b.pf_fragment",
  "/pagefind/fragment/en_55b5483.pf_fragment",
  "/pagefind/fragment/en_5652f5b.pf_fragment",
  "/pagefind/fragment/en_56598ae.pf_fragment",
  "/pagefind/fragment/en_57bb226.pf_fragment",
  "/pagefind/fragment/en_5914d59.pf_fragment",
  "/pagefind/fragment/en_597ec18.pf_fragment",
  "/pagefind/fragment/en_5a87dc6.pf_fragment",
  "/pagefind/fragment/en_5aeb726.pf_fragment",
  "/pagefind/fragment/en_5e4f7e1.pf_fragment",
  "/pagefind/fragment/en_601044e.pf_fragment",
  "/pagefind/fragment/en_60ba25b.pf_fragment",
  "/pagefind/fragment/en_60e7de7.pf_fragment",
  "/pagefind/fragment/en_616be2c.pf_fragment",
  "/pagefind/fragment/en_63aee32.pf_fragment",
  "/pagefind/fragment/en_63e6476.pf_fragment",
  "/pagefind/fragment/en_65b0d7f.pf_fragment",
  "/pagefind/fragment/en_6672a8a.pf_fragment",
  "/pagefind/fragment/en_68ad913.pf_fragment",
  "/pagefind/fragment/en_6a10e35.pf_fragment",
  "/pagefind/fragment/en_6fc1dbc.pf_fragment",
  "/pagefind/fragment/en_715b2d2.pf_fragment",
  "/pagefind/fragment/en_717bbb1.pf_fragment",
  "/pagefind/fragment/en_72196bb.pf_fragment",
  "/pagefind/fragment/en_72c430f.pf_fragment",
  "/pagefind/fragment/en_74265ab.pf_fragment",
  "/pagefind/fragment/en_7542983.pf_fragment",
  "/pagefind/fragment/en_755ac3c.pf_fragment",
  "/pagefind/fragment/en_759ce87.pf_fragment",
  "/pagefind/fragment/en_76f8bb9.pf_fragment",
  "/pagefind/fragment/en_77d1caa.pf_fragment",
  "/pagefind/fragment/en_77f9fbf.pf_fragment",
  "/pagefind/fragment/en_7b39725.pf_fragment",
  "/pagefind/fragment/en_81e2c92.pf_fragment",
  "/pagefind/fragment/en_8365913.pf_fragment",
  "/pagefind/fragment/en_838be28.pf_fragment",
  "/pagefind/fragment/en_868785b.pf_fragment",
  "/pagefind/fragment/en_86a7384.pf_fragment",
  "/pagefind/fragment/en_873fe4a.pf_fragment",
  "/pagefind/fragment/en_885477a.pf_fragment",
  "/pagefind/fragment/en_893a9cd.pf_fragment",
  "/pagefind/fragment/en_89d4955.pf_fragment",
  "/pagefind/fragment/en_89ec5e6.pf_fragment",
  "/pagefind/fragment/en_8a62b8a.pf_fragment",
  "/pagefind/fragment/en_8c32917.pf_fragment",
  "/pagefind/fragment/en_8ea22bc.pf_fragment",
  "/pagefind/fragment/en_8fbdcc9.pf_fragment",
  "/pagefind/fragment/en_8ffdab6.pf_fragment",
  "/pagefind/fragment/en_93d320c.pf_fragment",
  "/pagefind/fragment/en_95f4349.pf_fragment",
  "/pagefind/fragment/en_9633f8e.pf_fragment",
  "/pagefind/fragment/en_965833d.pf_fragment",
  "/pagefind/fragment/en_9748e83.pf_fragment",
  "/pagefind/fragment/en_97ae4d6.pf_fragment",
  "/pagefind/fragment/en_98c854f.pf_fragment",
  "/pagefind/fragment/en_9915cd3.pf_fragment",
  "/pagefind/fragment/en_99db1a2.pf_fragment",
  "/pagefind/fragment/en_9d12814.pf_fragment",
  "/pagefind/fragment/en_9dbc1f5.pf_fragment",
  "/pagefind/fragment/en_9de3ddf.pf_fragment",
  "/pagefind/fragment/en_9fdbfc3.pf_fragment",
  "/pagefind/fragment/en_a15b951.pf_fragment",
  "/pagefind/fragment/en_a1baaab.pf_fragment",
  "/pagefind/fragment/en_a31b744.pf_fragment",
  "/pagefind/fragment/en_a3b2328.pf_fragment",
  "/pagefind/fragment/en_a6cb835.pf_fragment",
  "/pagefind/fragment/en_a76ce7c.pf_fragment",
  "/pagefind/fragment/en_a8234bc.pf_fragment",
  "/pagefind/fragment/en_aa4b55e.pf_fragment",
  "/pagefind/fragment/en_ab569d6.pf_fragment",
  "/pagefind/fragment/en_ab83bf5.pf_fragment",
  "/pagefind/fragment/en_ac83b6b.pf_fragment",
  "/pagefind/fragment/en_ad239ac.pf_fragment",
  "/pagefind/fragment/en_ad5c968.pf_fragment",
  "/pagefind/fragment/en_ada22e0.pf_fragment",
  "/pagefind/fragment/en_af56389.pf_fragment",
  "/pagefind/fragment/en_b026be9.pf_fragment",
  "/pagefind/fragment/en_b1f2e46.pf_fragment",
  "/pagefind/fragment/en_b2858e9.pf_fragment",
  "/pagefind/fragment/en_b2a5884.pf_fragment",
  "/pagefind/fragment/en_b2d8587.pf_fragment",
  "/pagefind/fragment/en_b33764f.pf_fragment",
  "/pagefind/fragment/en_b421cf2.pf_fragment",
  "/pagefind/fragment/en_b49f6af.pf_fragment",
  "/pagefind/fragment/en_b6824a4.pf_fragment",
  "/pagefind/fragment/en_b7321bc.pf_fragment",
  "/pagefind/fragment/en_b97954f.pf_fragment",
  "/pagefind/fragment/en_bc55f72.pf_fragment",
  "/pagefind/fragment/en_bc7195f.pf_fragment",
  "/pagefind/fragment/en_bdb6777.pf_fragment",
  "/pagefind/fragment/en_be37307.pf_fragment",
  "/pagefind/fragment/en_c032a43.pf_fragment",
  "/pagefind/fragment/en_c146ce1.pf_fragment",
  "/pagefind/fragment/en_c295136.pf_fragment",
  "/pagefind/fragment/en_c3f25d0.pf_fragment",
  "/pagefind/fragment/en_c6a097b.pf_fragment",
  "/pagefind/fragment/en_c8d83db.pf_fragment",
  "/pagefind/fragment/en_c945951.pf_fragment",
  "/pagefind/fragment/en_cac268d.pf_fragment",
  "/pagefind/fragment/en_cadd63e.pf_fragment",
  "/pagefind/fragment/en_cbf4fee.pf_fragment",
  "/pagefind/fragment/en_ce9d73c.pf_fragment",
  "/pagefind/fragment/en_d06c9ab.pf_fragment",
  "/pagefind/fragment/en_d099f7f.pf_fragment",
  "/pagefind/fragment/en_d0facfe.pf_fragment",
  "/pagefind/fragment/en_d132a81.pf_fragment",
  "/pagefind/fragment/en_d26e298.pf_fragment",
  "/pagefind/fragment/en_d2bd93a.pf_fragment",
  "/pagefind/fragment/en_d3adb88.pf_fragment",
  "/pagefind/fragment/en_d625cd6.pf_fragment",
  "/pagefind/fragment/en_d63c5d6.pf_fragment",
  "/pagefind/fragment/en_d655669.pf_fragment",
  "/pagefind/fragment/en_d7404fb.pf_fragment",
  "/pagefind/fragment/en_dbe2bcf.pf_fragment",
  "/pagefind/fragment/en_dd57741.pf_fragment",
  "/pagefind/fragment/en_de21b6e.pf_fragment",
  "/pagefind/fragment/en_e0b9072.pf_fragment",
  "/pagefind/fragment/en_e1c8c84.pf_fragment",
  "/pagefind/fragment/en_e1e66e1.pf_fragment",
  "/pagefind/fragment/en_e221c48.pf_fragment",
  "/pagefind/fragment/en_e3716f3.pf_fragment",
  "/pagefind/fragment/en_e496763.pf_fragment",
  "/pagefind/fragment/en_e4a619a.pf_fragment",
  "/pagefind/fragment/en_e57895a.pf_fragment",
  "/pagefind/fragment/en_e6ecc27.pf_fragment",
  "/pagefind/fragment/en_e875191.pf_fragment",
  "/pagefind/fragment/en_e936a54.pf_fragment",
  "/pagefind/fragment/en_eb40d47.pf_fragment",
  "/pagefind/fragment/en_ec446b8.pf_fragment",
  "/pagefind/fragment/en_ec5164b.pf_fragment",
  "/pagefind/fragment/en_ec5a121.pf_fragment",
  "/pagefind/fragment/en_ec9c647.pf_fragment",
  "/pagefind/fragment/en_ecaf31f.pf_fragment",
  "/pagefind/fragment/en_edfa0f8.pf_fragment",
  "/pagefind/fragment/en_ee99e0e.pf_fragment",
  "/pagefind/fragment/en_ef19b36.pf_fragment",
  "/pagefind/fragment/en_ef5d2d5.pf_fragment",
  "/pagefind/fragment/en_efdeb1c.pf_fragment",
  "/pagefind/fragment/en_f011944.pf_fragment",
  "/pagefind/fragment/en_f06fdec.pf_fragment",
  "/pagefind/fragment/en_f0b34f3.pf_fragment",
  "/pagefind/fragment/en_f2ba152.pf_fragment",
  "/pagefind/fragment/en_f6cb66d.pf_fragment",
  "/pagefind/fragment/en_f6d8d17.pf_fragment",
  "/pagefind/fragment/en_f7b2915.pf_fragment",
  "/pagefind/fragment/en_f7f5f9a.pf_fragment",
  "/pagefind/fragment/en_f9ef42a.pf_fragment",
  "/pagefind/fragment/en_fa1c1a3.pf_fragment",
  "/pagefind/fragment/en_fbf14cd.pf_fragment",
  "/pagefind/fragment/en_fc2180c.pf_fragment",
  "/pagefind/fragment/en_fe84b49.pf_fragment",
  "/pagefind/fragment/en_ff893f1.pf_fragment",
  "/pagefind/index/en_1b6c471.pf_index",
  "/pagefind/index/en_1d62d51.pf_index",
  "/pagefind/index/en_1fd518d.pf_index",
  "/pagefind/index/en_2078274.pf_index",
  "/pagefind/index/en_2233480.pf_index",
  "/pagefind/index/en_2d8a985.pf_index",
  "/pagefind/index/en_34d4b5c.pf_index",
  "/pagefind/index/en_3514af3.pf_index",
  "/pagefind/index/en_42acd9d.pf_index",
  "/pagefind/index/en_565345c.pf_index",
  "/pagefind/index/en_62bee4b.pf_index",
  "/pagefind/index/en_6316edf.pf_index",
  "/pagefind/index/en_64a1e9c.pf_index",
  "/pagefind/index/en_64d87b3.pf_index",
  "/pagefind/index/en_7aa78d4.pf_index",
  "/pagefind/index/en_7cb568b.pf_index",
  "/pagefind/index/en_8418f6c.pf_index",
  "/pagefind/index/en_8443f7a.pf_index",
  "/pagefind/index/en_84626ae.pf_index",
  "/pagefind/index/en_8ac998a.pf_index",
  "/pagefind/index/en_8eb390e.pf_index",
  "/pagefind/index/en_943d042.pf_index",
  "/pagefind/index/en_9b4612f.pf_index",
  "/pagefind/index/en_9e7e48c.pf_index",
  "/pagefind/index/en_a0e8a7c.pf_index",
  "/pagefind/index/en_a14148b.pf_index",
  "/pagefind/index/en_a2e1b1c.pf_index",
  "/pagefind/index/en_a5b0c04.pf_index",
  "/pagefind/index/en_a97dd7b.pf_index",
  "/pagefind/index/en_b4d19df.pf_index",
  "/pagefind/index/en_c72d7e6.pf_index",
  "/pagefind/index/en_d0b252c.pf_index",
  "/pagefind/index/en_d446d6c.pf_index",
  "/pagefind/index/en_d4f2a8a.pf_index",
  "/pagefind/index/en_e7c436e.pf_index",
  "/pagefind/index/en_e8e3c67.pf_index",
  "/pagefind/index/en_ee77441.pf_index",
  "/pagefind/index/en_eecfb7e.pf_index",
  "/pagefind/pagefind-component-ui.css",
  "/pagefind/pagefind-component-ui.js",
  "/pagefind/pagefind-entry.json",
  "/pagefind/pagefind-highlight.js",
  "/pagefind/pagefind-modular-ui.css",
  "/pagefind/pagefind-modular-ui.js",
  "/pagefind/pagefind-ui.css",
  "/pagefind/pagefind-ui.js",
  "/pagefind/pagefind-worker.js",
  "/pagefind/pagefind.en_7cb8728fbe.pf_meta",
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
