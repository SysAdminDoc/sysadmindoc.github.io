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
  "/_assets/global.DsBilBnu.css",
  "/_assets/healthcare-it.03D11SDD.css",
  "/_assets/index.BGV2wSOz.css",
  "/_assets/now.CawLgQCg.css",
  "/_assets/page.ChryR_Se.js",
  "/_assets/releases.BPY79pXl.css",
  "/_assets/resume.G_zNejAj.css",
  "/_assets/screenshots.CSiN0x1c.css",
  "/_assets/search.CCOAf1v-.css",
  "/_assets/status.CQ15-04f.css",
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
  "/pagefind/filter/en_3156d3c.pf_filter",
  "/pagefind/filter/en_aeffa8a.pf_filter",
  "/pagefind/fragment/en_10453af.pf_fragment",
  "/pagefind/fragment/en_1053b62.pf_fragment",
  "/pagefind/fragment/en_12b20e3.pf_fragment",
  "/pagefind/fragment/en_131ad55.pf_fragment",
  "/pagefind/fragment/en_1334839.pf_fragment",
  "/pagefind/fragment/en_13b07c8.pf_fragment",
  "/pagefind/fragment/en_1614d1c.pf_fragment",
  "/pagefind/fragment/en_195a10d.pf_fragment",
  "/pagefind/fragment/en_1b4f7a4.pf_fragment",
  "/pagefind/fragment/en_1bc9f0f.pf_fragment",
  "/pagefind/fragment/en_1c7d2f1.pf_fragment",
  "/pagefind/fragment/en_1dc4cfc.pf_fragment",
  "/pagefind/fragment/en_1de1984.pf_fragment",
  "/pagefind/fragment/en_1e82f74.pf_fragment",
  "/pagefind/fragment/en_1ffb7b2.pf_fragment",
  "/pagefind/fragment/en_2076f0b.pf_fragment",
  "/pagefind/fragment/en_20b89dd.pf_fragment",
  "/pagefind/fragment/en_22a172c.pf_fragment",
  "/pagefind/fragment/en_24363cb.pf_fragment",
  "/pagefind/fragment/en_24c3e5c.pf_fragment",
  "/pagefind/fragment/en_25b7c17.pf_fragment",
  "/pagefind/fragment/en_25eae75.pf_fragment",
  "/pagefind/fragment/en_264e63c.pf_fragment",
  "/pagefind/fragment/en_2760ff1.pf_fragment",
  "/pagefind/fragment/en_283bb8f.pf_fragment",
  "/pagefind/fragment/en_2b795ca.pf_fragment",
  "/pagefind/fragment/en_2bc2e8d.pf_fragment",
  "/pagefind/fragment/en_2d2a2f9.pf_fragment",
  "/pagefind/fragment/en_2d991de.pf_fragment",
  "/pagefind/fragment/en_301e79b.pf_fragment",
  "/pagefind/fragment/en_30f0277.pf_fragment",
  "/pagefind/fragment/en_30ff234.pf_fragment",
  "/pagefind/fragment/en_31832b1.pf_fragment",
  "/pagefind/fragment/en_3185eb3.pf_fragment",
  "/pagefind/fragment/en_342ce96.pf_fragment",
  "/pagefind/fragment/en_34fc3af.pf_fragment",
  "/pagefind/fragment/en_3724e26.pf_fragment",
  "/pagefind/fragment/en_37a6669.pf_fragment",
  "/pagefind/fragment/en_37da872.pf_fragment",
  "/pagefind/fragment/en_3926721.pf_fragment",
  "/pagefind/fragment/en_3aa7a59.pf_fragment",
  "/pagefind/fragment/en_3af7ffc.pf_fragment",
  "/pagefind/fragment/en_3cc1a14.pf_fragment",
  "/pagefind/fragment/en_3ea7dd3.pf_fragment",
  "/pagefind/fragment/en_4271c93.pf_fragment",
  "/pagefind/fragment/en_42bbeab.pf_fragment",
  "/pagefind/fragment/en_44e465b.pf_fragment",
  "/pagefind/fragment/en_4b44d95.pf_fragment",
  "/pagefind/fragment/en_4c19c66.pf_fragment",
  "/pagefind/fragment/en_4f48eee.pf_fragment",
  "/pagefind/fragment/en_539aa78.pf_fragment",
  "/pagefind/fragment/en_54c559f.pf_fragment",
  "/pagefind/fragment/en_565e270.pf_fragment",
  "/pagefind/fragment/en_57855b1.pf_fragment",
  "/pagefind/fragment/en_5790159.pf_fragment",
  "/pagefind/fragment/en_5813e27.pf_fragment",
  "/pagefind/fragment/en_582c156.pf_fragment",
  "/pagefind/fragment/en_583b6d1.pf_fragment",
  "/pagefind/fragment/en_589c4f2.pf_fragment",
  "/pagefind/fragment/en_592aa2a.pf_fragment",
  "/pagefind/fragment/en_5ae7720.pf_fragment",
  "/pagefind/fragment/en_5b747c7.pf_fragment",
  "/pagefind/fragment/en_5c3e969.pf_fragment",
  "/pagefind/fragment/en_5ea7613.pf_fragment",
  "/pagefind/fragment/en_5f50a1f.pf_fragment",
  "/pagefind/fragment/en_61c9c1e.pf_fragment",
  "/pagefind/fragment/en_62ced95.pf_fragment",
  "/pagefind/fragment/en_62d43c3.pf_fragment",
  "/pagefind/fragment/en_652116f.pf_fragment",
  "/pagefind/fragment/en_65b12e7.pf_fragment",
  "/pagefind/fragment/en_65d06fd.pf_fragment",
  "/pagefind/fragment/en_6b3d466.pf_fragment",
  "/pagefind/fragment/en_6bb8d58.pf_fragment",
  "/pagefind/fragment/en_6c34b54.pf_fragment",
  "/pagefind/fragment/en_6c8aebd.pf_fragment",
  "/pagefind/fragment/en_6d25403.pf_fragment",
  "/pagefind/fragment/en_6eda8a2.pf_fragment",
  "/pagefind/fragment/en_70d65b4.pf_fragment",
  "/pagefind/fragment/en_716e411.pf_fragment",
  "/pagefind/fragment/en_723e44e.pf_fragment",
  "/pagefind/fragment/en_7423993.pf_fragment",
  "/pagefind/fragment/en_743a614.pf_fragment",
  "/pagefind/fragment/en_755ac3c.pf_fragment",
  "/pagefind/fragment/en_75c88a4.pf_fragment",
  "/pagefind/fragment/en_78439ed.pf_fragment",
  "/pagefind/fragment/en_78871c8.pf_fragment",
  "/pagefind/fragment/en_7ac4f7f.pf_fragment",
  "/pagefind/fragment/en_7b1f73c.pf_fragment",
  "/pagefind/fragment/en_7c5de2f.pf_fragment",
  "/pagefind/fragment/en_7ccd883.pf_fragment",
  "/pagefind/fragment/en_7d533a9.pf_fragment",
  "/pagefind/fragment/en_7f927cf.pf_fragment",
  "/pagefind/fragment/en_7faece9.pf_fragment",
  "/pagefind/fragment/en_804e3cb.pf_fragment",
  "/pagefind/fragment/en_832559b.pf_fragment",
  "/pagefind/fragment/en_8332504.pf_fragment",
  "/pagefind/fragment/en_846b3b5.pf_fragment",
  "/pagefind/fragment/en_86c66f8.pf_fragment",
  "/pagefind/fragment/en_87ba41f.pf_fragment",
  "/pagefind/fragment/en_88ac363.pf_fragment",
  "/pagefind/fragment/en_89102ed.pf_fragment",
  "/pagefind/fragment/en_8991724.pf_fragment",
  "/pagefind/fragment/en_89b8e22.pf_fragment",
  "/pagefind/fragment/en_89cf9e3.pf_fragment",
  "/pagefind/fragment/en_8b3c5b7.pf_fragment",
  "/pagefind/fragment/en_8b7b477.pf_fragment",
  "/pagefind/fragment/en_8c1d962.pf_fragment",
  "/pagefind/fragment/en_8c8ed1a.pf_fragment",
  "/pagefind/fragment/en_8d37114.pf_fragment",
  "/pagefind/fragment/en_8dfd8d2.pf_fragment",
  "/pagefind/fragment/en_9040a1c.pf_fragment",
  "/pagefind/fragment/en_92209ee.pf_fragment",
  "/pagefind/fragment/en_92397ab.pf_fragment",
  "/pagefind/fragment/en_92fa77c.pf_fragment",
  "/pagefind/fragment/en_937ef25.pf_fragment",
  "/pagefind/fragment/en_93d016b.pf_fragment",
  "/pagefind/fragment/en_949efbd.pf_fragment",
  "/pagefind/fragment/en_94a9d90.pf_fragment",
  "/pagefind/fragment/en_952b71c.pf_fragment",
  "/pagefind/fragment/en_95b97ef.pf_fragment",
  "/pagefind/fragment/en_98b4b93.pf_fragment",
  "/pagefind/fragment/en_99db1a2.pf_fragment",
  "/pagefind/fragment/en_9c5ab07.pf_fragment",
  "/pagefind/fragment/en_9e7a4ae.pf_fragment",
  "/pagefind/fragment/en_9f53f9f.pf_fragment",
  "/pagefind/fragment/en_9faafcb.pf_fragment",
  "/pagefind/fragment/en_a062cb9.pf_fragment",
  "/pagefind/fragment/en_a1ed68c.pf_fragment",
  "/pagefind/fragment/en_a2392b5.pf_fragment",
  "/pagefind/fragment/en_a49e814.pf_fragment",
  "/pagefind/fragment/en_a5319f0.pf_fragment",
  "/pagefind/fragment/en_a54165e.pf_fragment",
  "/pagefind/fragment/en_a840d0e.pf_fragment",
  "/pagefind/fragment/en_a9428ae.pf_fragment",
  "/pagefind/fragment/en_a98113a.pf_fragment",
  "/pagefind/fragment/en_aa35f23.pf_fragment",
  "/pagefind/fragment/en_aa5f63d.pf_fragment",
  "/pagefind/fragment/en_acf044e.pf_fragment",
  "/pagefind/fragment/en_ae83ca4.pf_fragment",
  "/pagefind/fragment/en_aeded26.pf_fragment",
  "/pagefind/fragment/en_b026be9.pf_fragment",
  "/pagefind/fragment/en_b37b862.pf_fragment",
  "/pagefind/fragment/en_b4541c7.pf_fragment",
  "/pagefind/fragment/en_b4aeabd.pf_fragment",
  "/pagefind/fragment/en_b4af467.pf_fragment",
  "/pagefind/fragment/en_b53575e.pf_fragment",
  "/pagefind/fragment/en_b5e1d93.pf_fragment",
  "/pagefind/fragment/en_b62eeaf.pf_fragment",
  "/pagefind/fragment/en_b68a2e7.pf_fragment",
  "/pagefind/fragment/en_b6fde42.pf_fragment",
  "/pagefind/fragment/en_bed09b4.pf_fragment",
  "/pagefind/fragment/en_bf422e5.pf_fragment",
  "/pagefind/fragment/en_bfba753.pf_fragment",
  "/pagefind/fragment/en_c63e42d.pf_fragment",
  "/pagefind/fragment/en_c6d9421.pf_fragment",
  "/pagefind/fragment/en_c73494e.pf_fragment",
  "/pagefind/fragment/en_c782f2e.pf_fragment",
  "/pagefind/fragment/en_c7c9b9f.pf_fragment",
  "/pagefind/fragment/en_c94b9ca.pf_fragment",
  "/pagefind/fragment/en_ca96d3f.pf_fragment",
  "/pagefind/fragment/en_ca97b0f.pf_fragment",
  "/pagefind/fragment/en_cc4834b.pf_fragment",
  "/pagefind/fragment/en_ccba805.pf_fragment",
  "/pagefind/fragment/en_cd6cf86.pf_fragment",
  "/pagefind/fragment/en_ce8be69.pf_fragment",
  "/pagefind/fragment/en_cf39d21.pf_fragment",
  "/pagefind/fragment/en_cf8d3f8.pf_fragment",
  "/pagefind/fragment/en_cfdca4f.pf_fragment",
  "/pagefind/fragment/en_d3717d6.pf_fragment",
  "/pagefind/fragment/en_d5d45c8.pf_fragment",
  "/pagefind/fragment/en_d866309.pf_fragment",
  "/pagefind/fragment/en_da7921e.pf_fragment",
  "/pagefind/fragment/en_db16de4.pf_fragment",
  "/pagefind/fragment/en_db608c7.pf_fragment",
  "/pagefind/fragment/en_dd3b8b2.pf_fragment",
  "/pagefind/fragment/en_df9ff6b.pf_fragment",
  "/pagefind/fragment/en_e07c53c.pf_fragment",
  "/pagefind/fragment/en_e1c8c84.pf_fragment",
  "/pagefind/fragment/en_e3c2371.pf_fragment",
  "/pagefind/fragment/en_e62cebd.pf_fragment",
  "/pagefind/fragment/en_e632ffd.pf_fragment",
  "/pagefind/fragment/en_e64c6fb.pf_fragment",
  "/pagefind/fragment/en_e713d0c.pf_fragment",
  "/pagefind/fragment/en_e7fe246.pf_fragment",
  "/pagefind/fragment/en_e9393df.pf_fragment",
  "/pagefind/fragment/en_e99a22d.pf_fragment",
  "/pagefind/fragment/en_ea92ff3.pf_fragment",
  "/pagefind/fragment/en_ec4e4cb.pf_fragment",
  "/pagefind/fragment/en_edf567d.pf_fragment",
  "/pagefind/fragment/en_eea67ac.pf_fragment",
  "/pagefind/fragment/en_ef8ad22.pf_fragment",
  "/pagefind/fragment/en_f030508.pf_fragment",
  "/pagefind/fragment/en_f0664c6.pf_fragment",
  "/pagefind/fragment/en_f42f6d3.pf_fragment",
  "/pagefind/fragment/en_f657cab.pf_fragment",
  "/pagefind/fragment/en_f715914.pf_fragment",
  "/pagefind/fragment/en_f84dfee.pf_fragment",
  "/pagefind/fragment/en_f95da51.pf_fragment",
  "/pagefind/fragment/en_fae49f4.pf_fragment",
  "/pagefind/fragment/en_fb2659f.pf_fragment",
  "/pagefind/fragment/en_fcef795.pf_fragment",
  "/pagefind/fragment/en_fd563ba.pf_fragment",
  "/pagefind/fragment/en_fdac7ec.pf_fragment",
  "/pagefind/fragment/en_fe0a7a1.pf_fragment",
  "/pagefind/index/en_193b0cc.pf_index",
  "/pagefind/index/en_1a79fe9.pf_index",
  "/pagefind/index/en_202fede.pf_index",
  "/pagefind/index/en_21485e3.pf_index",
  "/pagefind/index/en_2353f41.pf_index",
  "/pagefind/index/en_2d8dfb2.pf_index",
  "/pagefind/index/en_32eccda.pf_index",
  "/pagefind/index/en_38f7b80.pf_index",
  "/pagefind/index/en_4117b0a.pf_index",
  "/pagefind/index/en_43261bc.pf_index",
  "/pagefind/index/en_45fa722.pf_index",
  "/pagefind/index/en_481288e.pf_index",
  "/pagefind/index/en_4c678e6.pf_index",
  "/pagefind/index/en_51f71eb.pf_index",
  "/pagefind/index/en_53f513c.pf_index",
  "/pagefind/index/en_61a65df.pf_index",
  "/pagefind/index/en_6442720.pf_index",
  "/pagefind/index/en_6fef6ce.pf_index",
  "/pagefind/index/en_745fd8e.pf_index",
  "/pagefind/index/en_7be6124.pf_index",
  "/pagefind/index/en_7ff358d.pf_index",
  "/pagefind/index/en_815fc65.pf_index",
  "/pagefind/index/en_83703e9.pf_index",
  "/pagefind/index/en_896bb31.pf_index",
  "/pagefind/index/en_90fb995.pf_index",
  "/pagefind/index/en_a2f65e5.pf_index",
  "/pagefind/index/en_a999a46.pf_index",
  "/pagefind/index/en_b19ad83.pf_index",
  "/pagefind/index/en_b3f6ca5.pf_index",
  "/pagefind/index/en_c289b0a.pf_index",
  "/pagefind/index/en_c58751d.pf_index",
  "/pagefind/index/en_d11c0d5.pf_index",
  "/pagefind/index/en_d258512.pf_index",
  "/pagefind/index/en_d5cf5d6.pf_index",
  "/pagefind/index/en_e3f0bbc.pf_index",
  "/pagefind/index/en_ed2098a.pf_index",
  "/pagefind/index/en_fce539b.pf_index",
  "/pagefind/pagefind-component-ui.css",
  "/pagefind/pagefind-component-ui.js",
  "/pagefind/pagefind-entry.json",
  "/pagefind/pagefind-highlight.js",
  "/pagefind/pagefind-modular-ui.css",
  "/pagefind/pagefind-modular-ui.js",
  "/pagefind/pagefind-ui.css",
  "/pagefind/pagefind-ui.js",
  "/pagefind/pagefind-worker.js",
  "/pagefind/pagefind.en_2ad92d524d.pf_meta",
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
