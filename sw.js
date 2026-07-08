const CACHE = 'portfolio-v0.21.31';
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
  "/_assets/screenshots.CSiN0x1c.css",
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
  "/pagefind/filter/en_a746a5a.pf_filter",
  "/pagefind/filter/en_dcff1dd.pf_filter",
  "/pagefind/fragment/en_07c84df.pf_fragment",
  "/pagefind/fragment/en_0c5ebbb.pf_fragment",
  "/pagefind/fragment/en_1053b62.pf_fragment",
  "/pagefind/fragment/en_1073c8d.pf_fragment",
  "/pagefind/fragment/en_12f6e5d.pf_fragment",
  "/pagefind/fragment/en_15391f8.pf_fragment",
  "/pagefind/fragment/en_16f787a.pf_fragment",
  "/pagefind/fragment/en_1817d3c.pf_fragment",
  "/pagefind/fragment/en_19b435c.pf_fragment",
  "/pagefind/fragment/en_1b7f986.pf_fragment",
  "/pagefind/fragment/en_1bd96aa.pf_fragment",
  "/pagefind/fragment/en_1c4781e.pf_fragment",
  "/pagefind/fragment/en_1fb4b95.pf_fragment",
  "/pagefind/fragment/en_20ab94a.pf_fragment",
  "/pagefind/fragment/en_22345b7.pf_fragment",
  "/pagefind/fragment/en_22696af.pf_fragment",
  "/pagefind/fragment/en_23919b9.pf_fragment",
  "/pagefind/fragment/en_241c3a6.pf_fragment",
  "/pagefind/fragment/en_2545ec4.pf_fragment",
  "/pagefind/fragment/en_278635b.pf_fragment",
  "/pagefind/fragment/en_2813dff.pf_fragment",
  "/pagefind/fragment/en_284ccce.pf_fragment",
  "/pagefind/fragment/en_2a80347.pf_fragment",
  "/pagefind/fragment/en_2b69716.pf_fragment",
  "/pagefind/fragment/en_30ce7e3.pf_fragment",
  "/pagefind/fragment/en_32da615.pf_fragment",
  "/pagefind/fragment/en_3483419.pf_fragment",
  "/pagefind/fragment/en_3730af9.pf_fragment",
  "/pagefind/fragment/en_376b8fd.pf_fragment",
  "/pagefind/fragment/en_37a06a2.pf_fragment",
  "/pagefind/fragment/en_37c267e.pf_fragment",
  "/pagefind/fragment/en_37da872.pf_fragment",
  "/pagefind/fragment/en_389c9b5.pf_fragment",
  "/pagefind/fragment/en_38be9f8.pf_fragment",
  "/pagefind/fragment/en_39f2ef2.pf_fragment",
  "/pagefind/fragment/en_3a9dfba.pf_fragment",
  "/pagefind/fragment/en_3b1cb9a.pf_fragment",
  "/pagefind/fragment/en_3b61502.pf_fragment",
  "/pagefind/fragment/en_3c7cb4b.pf_fragment",
  "/pagefind/fragment/en_3cdc7bc.pf_fragment",
  "/pagefind/fragment/en_3e5a2c0.pf_fragment",
  "/pagefind/fragment/en_426182f.pf_fragment",
  "/pagefind/fragment/en_42a2859.pf_fragment",
  "/pagefind/fragment/en_43f715b.pf_fragment",
  "/pagefind/fragment/en_4598cc4.pf_fragment",
  "/pagefind/fragment/en_482031f.pf_fragment",
  "/pagefind/fragment/en_4a9f35c.pf_fragment",
  "/pagefind/fragment/en_4ba3917.pf_fragment",
  "/pagefind/fragment/en_4bfdeff.pf_fragment",
  "/pagefind/fragment/en_4dad6d6.pf_fragment",
  "/pagefind/fragment/en_4dceb02.pf_fragment",
  "/pagefind/fragment/en_5093d73.pf_fragment",
  "/pagefind/fragment/en_526148c.pf_fragment",
  "/pagefind/fragment/en_52f6b77.pf_fragment",
  "/pagefind/fragment/en_53c9cd3.pf_fragment",
  "/pagefind/fragment/en_53d598e.pf_fragment",
  "/pagefind/fragment/en_53e7aae.pf_fragment",
  "/pagefind/fragment/en_542c846.pf_fragment",
  "/pagefind/fragment/en_56d7b46.pf_fragment",
  "/pagefind/fragment/en_5793cd7.pf_fragment",
  "/pagefind/fragment/en_57dcb53.pf_fragment",
  "/pagefind/fragment/en_58ed18e.pf_fragment",
  "/pagefind/fragment/en_5ab0bca.pf_fragment",
  "/pagefind/fragment/en_5b23a86.pf_fragment",
  "/pagefind/fragment/en_5b84470.pf_fragment",
  "/pagefind/fragment/en_5e9dcd0.pf_fragment",
  "/pagefind/fragment/en_619bca7.pf_fragment",
  "/pagefind/fragment/en_61b74b4.pf_fragment",
  "/pagefind/fragment/en_61d7a6e.pf_fragment",
  "/pagefind/fragment/en_6648a44.pf_fragment",
  "/pagefind/fragment/en_66a1b64.pf_fragment",
  "/pagefind/fragment/en_6732c1b.pf_fragment",
  "/pagefind/fragment/en_67f61e7.pf_fragment",
  "/pagefind/fragment/en_689d2d4.pf_fragment",
  "/pagefind/fragment/en_6b70cc2.pf_fragment",
  "/pagefind/fragment/en_6b725f7.pf_fragment",
  "/pagefind/fragment/en_6ef3c67.pf_fragment",
  "/pagefind/fragment/en_6f46dbe.pf_fragment",
  "/pagefind/fragment/en_6fe5d34.pf_fragment",
  "/pagefind/fragment/en_70c739b.pf_fragment",
  "/pagefind/fragment/en_72b11db.pf_fragment",
  "/pagefind/fragment/en_72db4a8.pf_fragment",
  "/pagefind/fragment/en_753c184.pf_fragment",
  "/pagefind/fragment/en_7548eba.pf_fragment",
  "/pagefind/fragment/en_755ac3c.pf_fragment",
  "/pagefind/fragment/en_758b393.pf_fragment",
  "/pagefind/fragment/en_777e1e6.pf_fragment",
  "/pagefind/fragment/en_7badd2f.pf_fragment",
  "/pagefind/fragment/en_7dc1335.pf_fragment",
  "/pagefind/fragment/en_7dc2913.pf_fragment",
  "/pagefind/fragment/en_7e2ae37.pf_fragment",
  "/pagefind/fragment/en_7e6942c.pf_fragment",
  "/pagefind/fragment/en_7f97f29.pf_fragment",
  "/pagefind/fragment/en_81a78a4.pf_fragment",
  "/pagefind/fragment/en_83baff4.pf_fragment",
  "/pagefind/fragment/en_842ee41.pf_fragment",
  "/pagefind/fragment/en_84616e2.pf_fragment",
  "/pagefind/fragment/en_86479a5.pf_fragment",
  "/pagefind/fragment/en_88b6d89.pf_fragment",
  "/pagefind/fragment/en_898c67d.pf_fragment",
  "/pagefind/fragment/en_89f7ece.pf_fragment",
  "/pagefind/fragment/en_8b1b362.pf_fragment",
  "/pagefind/fragment/en_8b4723f.pf_fragment",
  "/pagefind/fragment/en_8bb6a9b.pf_fragment",
  "/pagefind/fragment/en_8eef329.pf_fragment",
  "/pagefind/fragment/en_8f6b2ab.pf_fragment",
  "/pagefind/fragment/en_90e7a28.pf_fragment",
  "/pagefind/fragment/en_927b141.pf_fragment",
  "/pagefind/fragment/en_93395f6.pf_fragment",
  "/pagefind/fragment/en_94cccd1.pf_fragment",
  "/pagefind/fragment/en_953f54e.pf_fragment",
  "/pagefind/fragment/en_95b7c8f.pf_fragment",
  "/pagefind/fragment/en_95d4cfb.pf_fragment",
  "/pagefind/fragment/en_992b5ed.pf_fragment",
  "/pagefind/fragment/en_99db1a2.pf_fragment",
  "/pagefind/fragment/en_9b4f246.pf_fragment",
  "/pagefind/fragment/en_9dc9855.pf_fragment",
  "/pagefind/fragment/en_a05311c.pf_fragment",
  "/pagefind/fragment/en_a078bf1.pf_fragment",
  "/pagefind/fragment/en_a11ffb8.pf_fragment",
  "/pagefind/fragment/en_a1a51eb.pf_fragment",
  "/pagefind/fragment/en_a24a4ce.pf_fragment",
  "/pagefind/fragment/en_a28f657.pf_fragment",
  "/pagefind/fragment/en_a4c09f8.pf_fragment",
  "/pagefind/fragment/en_a82124a.pf_fragment",
  "/pagefind/fragment/en_a8511b8.pf_fragment",
  "/pagefind/fragment/en_a8a296d.pf_fragment",
  "/pagefind/fragment/en_aae2839.pf_fragment",
  "/pagefind/fragment/en_ab8eb53.pf_fragment",
  "/pagefind/fragment/en_ac6974b.pf_fragment",
  "/pagefind/fragment/en_ae27669.pf_fragment",
  "/pagefind/fragment/en_ae3dfac.pf_fragment",
  "/pagefind/fragment/en_b026be9.pf_fragment",
  "/pagefind/fragment/en_b22d14b.pf_fragment",
  "/pagefind/fragment/en_b46e716.pf_fragment",
  "/pagefind/fragment/en_b47839a.pf_fragment",
  "/pagefind/fragment/en_b8acb43.pf_fragment",
  "/pagefind/fragment/en_b985e27.pf_fragment",
  "/pagefind/fragment/en_ba7bdb3.pf_fragment",
  "/pagefind/fragment/en_bb16b42.pf_fragment",
  "/pagefind/fragment/en_bb2451a.pf_fragment",
  "/pagefind/fragment/en_bb9d838.pf_fragment",
  "/pagefind/fragment/en_bd3992c.pf_fragment",
  "/pagefind/fragment/en_bd52afd.pf_fragment",
  "/pagefind/fragment/en_bd933a9.pf_fragment",
  "/pagefind/fragment/en_bdac114.pf_fragment",
  "/pagefind/fragment/en_bfbd1ea.pf_fragment",
  "/pagefind/fragment/en_c4ec13f.pf_fragment",
  "/pagefind/fragment/en_c659dfd.pf_fragment",
  "/pagefind/fragment/en_c665349.pf_fragment",
  "/pagefind/fragment/en_c7955d6.pf_fragment",
  "/pagefind/fragment/en_ca141d9.pf_fragment",
  "/pagefind/fragment/en_cc7581d.pf_fragment",
  "/pagefind/fragment/en_cd97699.pf_fragment",
  "/pagefind/fragment/en_cdf9474.pf_fragment",
  "/pagefind/fragment/en_cf8b1e3.pf_fragment",
  "/pagefind/fragment/en_d0e8f06.pf_fragment",
  "/pagefind/fragment/en_d3b258d.pf_fragment",
  "/pagefind/fragment/en_d44136d.pf_fragment",
  "/pagefind/fragment/en_d475bba.pf_fragment",
  "/pagefind/fragment/en_d5cefdf.pf_fragment",
  "/pagefind/fragment/en_d7df605.pf_fragment",
  "/pagefind/fragment/en_d859d18.pf_fragment",
  "/pagefind/fragment/en_d89b72a.pf_fragment",
  "/pagefind/fragment/en_d9b9d2d.pf_fragment",
  "/pagefind/fragment/en_dc215cb.pf_fragment",
  "/pagefind/fragment/en_dd69a76.pf_fragment",
  "/pagefind/fragment/en_de375ff.pf_fragment",
  "/pagefind/fragment/en_de79bf9.pf_fragment",
  "/pagefind/fragment/en_debeccc.pf_fragment",
  "/pagefind/fragment/en_df627c2.pf_fragment",
  "/pagefind/fragment/en_df62cbf.pf_fragment",
  "/pagefind/fragment/en_dfbbf83.pf_fragment",
  "/pagefind/fragment/en_dff8208.pf_fragment",
  "/pagefind/fragment/en_e06d27d.pf_fragment",
  "/pagefind/fragment/en_e16c0c0.pf_fragment",
  "/pagefind/fragment/en_e52a847.pf_fragment",
  "/pagefind/fragment/en_e7b74fb.pf_fragment",
  "/pagefind/fragment/en_e83866a.pf_fragment",
  "/pagefind/fragment/en_e86b5f3.pf_fragment",
  "/pagefind/fragment/en_e928ee7.pf_fragment",
  "/pagefind/fragment/en_ebbf1c4.pf_fragment",
  "/pagefind/fragment/en_ebeef31.pf_fragment",
  "/pagefind/fragment/en_eceb42f.pf_fragment",
  "/pagefind/fragment/en_ed9a86b.pf_fragment",
  "/pagefind/fragment/en_eee7ea3.pf_fragment",
  "/pagefind/fragment/en_ef5c733.pf_fragment",
  "/pagefind/fragment/en_efda474.pf_fragment",
  "/pagefind/fragment/en_f0a8c59.pf_fragment",
  "/pagefind/fragment/en_f14f8a4.pf_fragment",
  "/pagefind/fragment/en_f31e80a.pf_fragment",
  "/pagefind/fragment/en_f788608.pf_fragment",
  "/pagefind/fragment/en_f8fcff5.pf_fragment",
  "/pagefind/fragment/en_f92039b.pf_fragment",
  "/pagefind/fragment/en_f95ed2c.pf_fragment",
  "/pagefind/fragment/en_fa2f22c.pf_fragment",
  "/pagefind/fragment/en_fabe24e.pf_fragment",
  "/pagefind/fragment/en_fac2fe3.pf_fragment",
  "/pagefind/fragment/en_fc3e92a.pf_fragment",
  "/pagefind/fragment/en_feadfcf.pf_fragment",
  "/pagefind/fragment/en_ff6a58f.pf_fragment",
  "/pagefind/fragment/en_ffa4a5c.pf_fragment",
  "/pagefind/fragment/en_ffc14fa.pf_fragment",
  "/pagefind/fragment/en_ffeaa77.pf_fragment",
  "/pagefind/index/en_096787a.pf_index",
  "/pagefind/index/en_10666bf.pf_index",
  "/pagefind/index/en_1158292.pf_index",
  "/pagefind/index/en_194b7ef.pf_index",
  "/pagefind/index/en_1c243f7.pf_index",
  "/pagefind/index/en_2b20379.pf_index",
  "/pagefind/index/en_2d181e1.pf_index",
  "/pagefind/index/en_33c34f9.pf_index",
  "/pagefind/index/en_46dc91b.pf_index",
  "/pagefind/index/en_4e6b7bf.pf_index",
  "/pagefind/index/en_5102ea8.pf_index",
  "/pagefind/index/en_59b07b5.pf_index",
  "/pagefind/index/en_688cf97.pf_index",
  "/pagefind/index/en_6bf4345.pf_index",
  "/pagefind/index/en_70c450b.pf_index",
  "/pagefind/index/en_75c0747.pf_index",
  "/pagefind/index/en_7651f2a.pf_index",
  "/pagefind/index/en_776e60c.pf_index",
  "/pagefind/index/en_77f11cb.pf_index",
  "/pagefind/index/en_7997f6c.pf_index",
  "/pagefind/index/en_7effd45.pf_index",
  "/pagefind/index/en_853efcd.pf_index",
  "/pagefind/index/en_8bf7d8a.pf_index",
  "/pagefind/index/en_9e3a902.pf_index",
  "/pagefind/index/en_ab9e693.pf_index",
  "/pagefind/index/en_b1b5341.pf_index",
  "/pagefind/index/en_bf1ad12.pf_index",
  "/pagefind/index/en_c42663d.pf_index",
  "/pagefind/index/en_c7d08e3.pf_index",
  "/pagefind/index/en_cbfe2af.pf_index",
  "/pagefind/index/en_cd27beb.pf_index",
  "/pagefind/index/en_d6245e8.pf_index",
  "/pagefind/index/en_df20def.pf_index",
  "/pagefind/index/en_e3cfe2e.pf_index",
  "/pagefind/index/en_f690177.pf_index",
  "/pagefind/index/en_f926a9f.pf_index",
  "/pagefind/index/en_fc65ef7.pf_index",
  "/pagefind/pagefind-component-ui.css",
  "/pagefind/pagefind-component-ui.js",
  "/pagefind/pagefind-entry.json",
  "/pagefind/pagefind-highlight.js",
  "/pagefind/pagefind-modular-ui.css",
  "/pagefind/pagefind-modular-ui.js",
  "/pagefind/pagefind-ui.css",
  "/pagefind/pagefind-ui.js",
  "/pagefind/pagefind-worker.js",
  "/pagefind/pagefind.en_45b02c7cec.pf_meta",
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
