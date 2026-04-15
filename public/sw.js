const CACHE='portfolio-v4';
const PRECACHE=['/'];

self.addEventListener('install',e=>{
    e.waitUntil(caches.open(CACHE).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
    e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',e=>{
    if(e.request.method!=='GET')return;
    const url=new URL(e.request.url);
    // Network-first for API/image calls (do NOT return undefined — that leaves the
    // fetchevent unhandled but still "respondWith has not been called" in some browsers).
    // Explicitly handing off to fetch() is correct.
    if(url.hostname==='api.github.com'||url.hostname==='i.scdn.co'||url.hostname==='opengraph.githubassets.com'){
        e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
        return;
    }
    e.respondWith(
        caches.match(e.request).then(cached=>{
            const fetchPromise=fetch(e.request).then(response=>{
                if(response.ok){
                    const clone=response.clone();
                    caches.open(CACHE).then(c=>c.put(e.request,clone));
                }
                return response;
            }).catch(()=>cached);
            return cached||fetchPromise;
        })
    );
});
