const CACHE='portfolio-v3';
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
    // Network-first for API calls, cache-first for static assets
    if(url.hostname==='api.github.com'||url.hostname==='i.scdn.co'||url.hostname==='opengraph.githubassets.com'){
        return;// Let API calls go through network normally
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
