/* ===== SAFE DOM HELPERS (XSS-safe repo/text injection) ===== */
function safeText(s){return String(s==null?'':s)}
const _escMap={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
function escapeHTML(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>_escMap[c])}
// Only allow alphanumeric, dash, underscore, dot in repo slugs (GitHub's own rules)
function safeRepo(s){return String(s==null?'':s).replace(/[^A-Za-z0-9._-]/g,'')}
const GITHUB_CACHE_KEY='gh_cache';
const GITHUB_CACHE_TTL=1800000;
const LIVE_STATUS_CACHE_KEY='live_status_cache';
const LIVE_STATUS_CACHE_TTL=900000;
function readJsonCache(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch(e){return null}}
function writeJsonCache(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
function isFreshCache(entry,ttl){return !!entry&&typeof entry.ts==='number'&&Date.now()-entry.ts<ttl}
function scheduleIdle(fn,timeout){
    const delay=typeof timeout==='number'?timeout:1200;
    if('requestIdleCallback' in window){requestIdleCallback(fn,{timeout:delay});return}
    setTimeout(fn,Math.min(delay,1000));
}
function fetchWithTimeout(resource,options,timeoutMs){
    if(typeof AbortController==='undefined')return fetch(resource,options);
    const controller=new AbortController();
    const timeout=typeof timeoutMs==='number'?timeoutMs:10000;
    const timer=setTimeout(()=>controller.abort(),timeout);
    return fetch(resource,{...(options||{}),signal:controller.signal}).finally(()=>clearTimeout(timer));
}
const prefersReducedMotion=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function getClosestTarget(target,selector){return target instanceof Element?target.closest(selector):null}
function getFallbackRepoCount(){
    const injected=window.__PORTFOLIO_DATA&&Array.isArray(window.__PORTFOLIO_DATA.allProjects)?window.__PORTFOLIO_DATA.allProjects.length:0;
    if(injected>0)return injected;
    const repos=new Set();
    document.querySelectorAll('[data-repo]').forEach(el=>{
        const repo=el instanceof HTMLElement?safeRepo(el.dataset.repo):'';
        if(repo)repos.add(repo);
    });
    return repos.size;
}
function isTextEntryTarget(el){
    return !!el&&(
        el.tagName==='INPUT'||
        el.tagName==='TEXTAREA'||
        el.tagName==='SELECT'||
        el.isContentEditable
    );
}

/* ===== SHARED MOUSE STATE ===== */
const isMobile=innerWidth<768;
const mouseState={x:-1000,y:-1000,moved:false};
if(!isMobile){
    document.addEventListener('mousemove',e=>{
        mouseState.x=e.clientX;mouseState.y=e.clientY;mouseState.moved=true;
    },{passive:true});
    document.addEventListener('mouseleave',()=>{mouseState.x=-1000;mouseState.y=-1000;mouseState.moved=false});
}

/* ===== PARTICLE CONSTELLATION SYSTEM ===== */
(function(){
    const c=document.getElementById('particles');
    if(!c||prefersReducedMotion)return;
    const ctx=c.getContext('2d');
    if(!ctx)return;
    let w,h,particles=[],particleFrame=0;
    const CFG={count:isMobile?10:24,speed:.18,size:1.2,connectDist:isMobile?84:118,connectDist2:0,mouseDist:150,mouseDist2:0,color:[88,166,255],mouseColor:[74,222,128]};
    CFG.connectDist2=CFG.connectDist*CFG.connectDist;
    CFG.mouseDist2=CFG.mouseDist*CFG.mouseDist;
    function resize(){w=c.width=innerWidth;h=c.height=innerHeight}
    function init(){resize();particles=[];for(let i=0;i<CFG.count;i++)particles.push({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*CFG.speed,vy:(Math.random()-.5)*CFG.speed,s:Math.random()*CFG.size+.5,a:Math.random()*.5+.2})}
    function draw(){particleFrame=0;ctx.clearRect(0,0,w,h);
        const cStr=CFG.color[0]+','+CFG.color[1]+','+CFG.color[2];
        const mStr=CFG.mouseColor[0]+','+CFG.mouseColor[1]+','+CFG.mouseColor[2];
        for(let i=0;i<particles.length;i++){const p=particles[i];
            p.x+=p.vx;p.y+=p.vy;
            if(p.x<0)p.x=w;if(p.x>w)p.x=0;if(p.y<0)p.y=h;if(p.y>h)p.y=0;
            ctx.beginPath();ctx.arc(p.x,p.y,p.s,0,Math.PI*2);
            ctx.fillStyle='rgba('+cStr+','+p.a+')';ctx.fill();
            for(let j=i+1;j<particles.length;j++){const q=particles[j];
                const dx=p.x-q.x,dy=p.y-q.y,dist2=dx*dx+dy*dy;
                if(dist2<CFG.connectDist2){const dist=Math.sqrt(dist2);const alpha=(1-dist/CFG.connectDist)*.15;
                    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);
                    ctx.strokeStyle='rgba('+cStr+','+alpha+')';ctx.lineWidth=.5;ctx.stroke()}}
            if(!isMobile){
                const mdx=p.x-mouseState.x,mdy=p.y-mouseState.y,md2=mdx*mdx+mdy*mdy;
                if(md2<CFG.mouseDist2){const md=Math.sqrt(md2);const ma=(1-md/CFG.mouseDist)*.4;
                    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(mouseState.x,mouseState.y);
                    ctx.strokeStyle='rgba('+mStr+','+ma+')';ctx.lineWidth=.8;ctx.stroke();
                    p.vx+=mdx/md*.01;p.vy+=mdy/md*.01}}
            p.vx*=.999;p.vy*=.999;const spd2=p.vx*p.vx+p.vy*p.vy;if(spd2<.01){p.vx=(Math.random()-.5)*CFG.speed;p.vy=(Math.random()-.5)*CFG.speed}}
        if(!document.hidden&&!particleFrame)particleFrame=requestAnimationFrame(draw)}
    function start(){if(document.hidden||particleFrame)return;particleFrame=requestAnimationFrame(draw)}
    function stop(){if(!particleFrame)return;cancelAnimationFrame(particleFrame);particleFrame=0}
    window.addEventListener('resize',resize);
    document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();return;}start()});
    (window.requestIdleCallback||(cb=>setTimeout(cb,80)))(()=>{init();start()})
})();

/* ===== COPY TOAST ===== */
const copyToast=document.createElement('div');copyToast.className='copy-toast';copyToast.textContent='Copied to clipboard';copyToast.setAttribute('role','status');copyToast.setAttribute('aria-live','polite');document.body.appendChild(copyToast);
let copyToastTimer=0;
function showCopyToast(){clearTimeout(copyToastTimer);copyToast.classList.add('show');copyToastTimer=setTimeout(()=>copyToast.classList.remove('show'),1500)}

/* ===== TERMINAL TYPING ===== */
const tl=[{prompt:true,path:'~/portfolio',cmd:'./profile'},{text:''},{key:'name',val:'Matt Parker'},{key:'role',val:'Sr. Systems Administrator'},{key:'projects',val:'…',vc:'tv',id:'termRepos'},{key:'stars',val:'…',vc:'tv',id:'termStars'},{key:'langs',val:'PS1, Python, JS, Kotlin, C#'},{key:'theme',val:'always dark'},{text:''},{prompt:true,path:'~/portfolio',cmd:'echo $PHILOSOPHY'},{text:'Download it, launch it, done.',color:'ts'},{text:''},{prompt:true,path:'~/portfolio',cmd:'',cursor:true}];
const tb=document.getElementById('termBody');let ti=0;
function rt(){if(ti>=tl.length||!tb)return;const l=tl[ti];const d=document.createElement('div');d.classList.add('tl');d.style.animationDelay=(ti*.08)+'s';
    if(l.prompt){d.innerHTML='<span class="tp">matt@sysadmin</span><span class="tcm">:</span><span class="tpa">'+l.path+'</span><span class="tcm">$ </span><span class="tc">'+l.cmd+'</span>'+(l.cursor?'<span class="tci"></span>':'')}
    else if(l.key){const idAttr=l.id?' id="'+l.id+'"':'';d.innerHTML='<span class="tk">'+l.key+'</span><span class="tcm">: </span><span class="'+(l.vc||'ts')+'"'+idAttr+'>'+l.val+'</span>'}
    else if(l.text!==undefined){d.innerHTML=l.text===''?'&nbsp;':'<span class="'+(l.color||'tc')+'">'+l.text+'</span>'}
    tb.appendChild(d);ti++;if(ti<tl.length)setTimeout(rt,80+Math.random()*40);else if(typeof onTermReady==='function')setTimeout(onTermReady,1500)}
if(prefersReducedMotion){
    while(ti<tl.length)rt();
    if(typeof onTermReady==='function')setTimeout(onTermReady,0);
}else{
    setTimeout(rt,700);
}

/* ===== DYNAMIC FOOTER YEAR ===== */
const footerYear=document.getElementById('footerYear');
if(footerYear)footerYear.textContent=new Date().getFullYear();

/* ===== BUTTON RIPPLE ===== */
document.addEventListener('click',function(e){
    const btn=getClosestTarget(e.target,'.btn[data-ripple]');
    if(!btn||prefersReducedMotion)return;
    const r=btn.getBoundingClientRect();
    const ripple=document.createElement('span');
    ripple.className='ripple';
    const size=Math.max(r.width,r.height);
    ripple.style.width=ripple.style.height=size+'px';
    ripple.style.left=(e.clientX-r.left-size/2)+'px';
    ripple.style.top=(e.clientY-r.top-size/2)+'px';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend',function(){ripple.remove()});
});

/* ===== LIVE GITHUB API WITH CACHING & PAGINATION ===== */
let ghData={};
async function fetchAllRepos(){
    let allRepos=[];
    for(let page=1;page<=10;page++){
        const r=await fetchWithTimeout('https://api.github.com/users/SysAdminDoc/repos?per_page=100&sort=updated&page='+page,void 0,10000);
        if(!r.ok)throw new Error('GitHub API error: '+r.status);
        const repos=await r.json();
        if(!Array.isArray(repos))throw new Error('Unexpected GitHub repo payload');
        if(repos.length===0)break;
        allRepos=allRepos.concat(repos);
        if(repos.length<100)break;
    }
    return allRepos;
}

async function fetchGitHub(){
    // If stats are already baked into the DOM (build-time), don't flash cached values.
    // Still fetch fresh data (for live-star updates, freshness badges, language donut, etc.)
    // but only update the aggregate hero stats if the new value differs from what's rendered.
    const baked={
        repos:parseInt((document.getElementById('statRepos')||{}).textContent,10),
        stars:parseInt((document.getElementById('statStars')||{}).textContent,10)
    };
    const hasBaked=!isNaN(baked.repos)&&!isNaN(baked.stars);
    const cached=readJsonCache(GITHUB_CACHE_KEY);
    if(cached&&cached.data){
        ghData=cached.data;
        const skipAggregate=hasBaked&&baked.repos===cached.total&&baked.stars===cached.stars;
        applyGitHubData(cached.total,cached.stars,cached.langs||null,{skipAggregate});
        if(isFreshCache(cached,GITHUB_CACHE_TTL)||navigator.onLine===false)return;
    }else if(navigator.onLine===false){
        return;
    }

    try{
        const allRepos=await fetchAllRepos();
        // Match build-time filter: only public, non-fork, non-archived
        const repos=allRepos.filter(r=>!r.fork&&!r.archived&&!r.private);
        let totalStars=0;
        const langCount={};
        const nextGhData={};
        repos.forEach(repo=>{
            nextGhData[repo.name]={stars:repo.stargazers_count,updated:repo.updated_at};
            totalStars+=repo.stargazers_count;
            const l=repo.language||'Other';
            langCount[l]=(langCount[l]||0)+1;
        });
        const count=repos.length;
        ghData=nextGhData;
        writeJsonCache(GITHUB_CACHE_KEY,{data:ghData,total:count,stars:totalStars,langs:langCount,ts:Date.now()});
        // Only update aggregates if new data actually differs (prevents useless repaint)
        const skipAggregate=hasBaked&&baked.repos===count&&baked.stars===totalStars;
        applyGitHubData(count,totalStars,langCount,{skipAggregate});
    }catch(e){
        // If API fails and nothing was baked, try cache fallback once more
        if(!cached&&!hasBaked){
            const sr=document.getElementById('statRepos');
            const fallbackCount=getFallbackRepoCount();
            if(sr&&sr.textContent==='--'&&fallbackCount>0)sr.textContent=String(fallbackCount);
        }
        // Build-time stars are still there; silently no-op for aggregate.
    }
}

function applyGitHubData(repoCount,totalStars,langCount,opts){
    opts=opts||{};
    // Hero stats — skip if build-time value is identical (prevents flicker)
    if(!opts.skipAggregate){
        const sr=document.getElementById('statRepos');if(sr)sr.textContent=repoCount;
        const ss=document.getElementById('statStars');if(ss)ss.textContent=totalStars;
        // Terminal
        const tr=document.getElementById('termRepos');if(tr)tr.textContent=repoCount;
        const ts2=document.getElementById('termStars');if(ts2)ts2.textContent=totalStars;
        // About
        const ar=document.getElementById('aboutRepos');if(ar)ar.textContent=repoCount;
        const art=document.getElementById('aboutReposText');if(art)art.textContent=repoCount+'+';
        // Philosophy & Journey
        const pr=document.getElementById('philRepos');if(pr)pr.textContent=repoCount;
        const jr=document.getElementById('journeyRepos');if(jr)jr.textContent=repoCount;
    }
    // Live apps count
    const liveApps=document.querySelectorAll('#live .lc2').length;
    const sl=document.getElementById('statLive');if(sl)sl.textContent=liveApps;
    // Update all live star displays
    document.querySelectorAll('.live-star').forEach(el=>{
        const card=el.closest('[data-repo]');
        if(card&&ghData[card.dataset.repo]){
            const s=ghData[card.dataset.repo].stars;
            const parent=el.closest('.cs2')||el.closest('.ca-stars');
            el.textContent=s>0?s:'';
            if(parent)parent.style.display=s===0?'none':'';
        }});
    // Store update times for sorting + inject catalog star badges
    document.querySelectorAll('.ca[data-repo]').forEach(el=>{
        if(ghData[el.dataset.repo]){
            const s=ghData[el.dataset.repo].stars;
            el.dataset.stars=s;
            el.dataset.updated=ghData[el.dataset.repo].updated;
            if(s>0&&!el.querySelector('.ca-stars')){
                const badge=document.createElement('span');
                badge.className='ca-stars';
                badge.innerHTML='<svg viewBox="0 0 16 16"><path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/></svg>'+s;
                el.appendChild(badge)}}});
    // Update "All" filter count
    const countAll=document.getElementById('countAll');
    if(countAll){
        const totalCatalog=document.querySelectorAll('#catalogGrid .ca').length;
        countAll.textContent=totalCatalog;
    }
    // Update category filter counts dynamically
    updateFilterCounts();
    // Remove shimmer loading state
    document.querySelectorAll('.shimmer-load').forEach(el=>el.classList.remove('shimmer-load'));
    // Starred repos glow
    document.querySelectorAll('.ca[data-repo]').forEach(el=>{
        if(parseInt(el.dataset.stars)>=5)el.classList.add('starred');
    });
    // Commit freshness on featured cards
    document.querySelectorAll('#featuredGrid .pc[data-repo]').forEach(card=>{
        if(ghData[card.dataset.repo]){
            const updated=new Date(ghData[card.dataset.repo].updated);
            const days=Math.floor((Date.now()-updated)/86400000);
            let text;
            if(days===0)text='Updated today';
            else if(days===1)text='Updated yesterday';
            else if(days<30)text='Updated '+days+'d ago';
            else if(days<365)text='Updated '+Math.floor(days/30)+'mo ago';
            else text='Updated '+Math.floor(days/365)+'y ago';
            const badge=card.querySelector('.pc-fresh')||document.createElement('div');
            badge.className='pc-fresh';
            badge.textContent=text;
            if(!badge.parentNode)card.appendChild(badge);
        }
    });
    // Language donut
    if(langCount)renderLangDonut(langCount,repoCount);
}

function updateFilterCounts(){
    const allItems=Array.from(document.querySelectorAll('#catalogGrid .ca'));
    const counts={};
    allItems.forEach(item=>{
        const cat=item.dataset.f;
        counts[cat]=(counts[cat]||0)+1;
    });
    document.querySelectorAll('.fc[data-cat]').forEach(el=>{
        const cat=el.dataset.cat;
        if(counts[cat]!==undefined)el.textContent=counts[cat];
    });
    const countAll=document.getElementById('countAll');
    if(countAll)countAll.textContent=allItems.length;
}

function renderLangDonut(langCount,repoCount){
    const wrap=document.getElementById('langDonut');
    if(!wrap||!langCount)return;
    // Dedupe: 'Other' comes from both `||'Other'` fallback AND from tail rollup.
    // Split named languages from the fallback bucket first, then pack the rest into "Other".
    const fallback=langCount['Other']||0;
    const named=Object.entries(langCount).filter(([k])=>k!=='Other').sort((a,b)=>b[1]-a[1]);
    const top=named.slice(0,7);
    const tailCount=named.slice(7).reduce((s,e)=>s+e[1],0)+fallback;
    if(tailCount>0)top.push(['Other',tailCount]);
    const total=repoCount;
    if(!total)return;
    const colors={'PowerShell':'#58a6ff','Python':'#4ade80','JavaScript':'#facc15','HTML':'#fb923c','Kotlin':'#2dd4bf','C#':'#c084fc','C++':'#f87171','Shell':'#8b9cc0','TypeScript':'#3b82f6','CSS':'#a78bfa','Other':'#7080a0'};
    const radius=70;
    const circ=2*Math.PI*radius;
    const gap=2;
    let circles='';
    let offset=0;
    top.forEach(function(entry){
        var lang=entry[0],count=entry[1];
        var pct=count/total;
        var arcLen=Math.max(pct*circ-gap,0);
        var color=colors[lang]||'#7080a0';
        circles+='<circle cx="90" cy="90" r="'+radius+'" stroke="'+color+'" stroke-dasharray="'+arcLen.toFixed(1)+' '+(circ-arcLen).toFixed(1)+'" stroke-dashoffset="'+(-offset).toFixed(1)+'" opacity=".85"/>';
        offset+=pct*circ;
    });
    let legend='';
    top.forEach(function(entry){
        var lang=entry[0],count=entry[1];
        var color=colors[lang]||'#7080a0';
        var pct=Math.round(count/total*100);
        legend+='<div class="lang-legend-item"><span class="lang-legend-dot" style="background:'+color+'"></span>'+escapeHTML(lang)+'<span class="lang-legend-pct">'+pct+'%</span></div>';
    });
    const lead=top[0];
    const leadLang=lead?lead[0]:'Mixed';
    const leadPct=lead?Math.round(lead[1]/total*100):0;
    wrap.innerHTML='<div class="lang-donut-panel"><div class="lang-donut-head"><div class="lang-donut-kicker">Project Mix</div><p class="lang-donut-copy">'+escapeHTML(leadLang)+' leads the public archive at '+leadPct+'% of projects, with the rest spread across desktop, web, and Android tooling.</p></div><div class="lang-donut-shell"><div class="lang-donut"><svg viewBox="0 0 180 180">'+circles+'</svg><div class="lang-donut-center"><div class="donut-total">'+total+'</div><div class="donut-label">projects</div></div></div><div class="lang-legend">'+legend+'</div></div></div>';
}

scheduleIdle(fetchGitHub,1200);

/* ===== LIVE APP STATUS CHECKS ===== */
(function(){
    const cachedStatuses=readJsonCache(LIVE_STATUS_CACHE_KEY)||{};
    const queue=[];
    document.querySelectorAll('#live .lc2').forEach(card=>{
        const url=card.href;
        if(!url)return;
        const badge=card.querySelector('.lb2');
        if(!badge)return;
        const dot=document.createElement('span');
        dot.className='status-dot';
        badge.prepend(dot);
        if(isFreshCache(cachedStatuses[url],LIVE_STATUS_CACHE_TTL)){
            dot.classList.add(cachedStatuses[url].up?'up':'down');
            return;
        }
        try{
            const target=new URL(url,location.href);
            if(target.origin!==location.origin)return;
            queue.push({url:target.toString(),dot});
        }catch(e){}
    });
    if(!queue.length||navigator.onLine===false)return;
    function runNext(){
        const item=queue.shift();
        if(!item)return;
        const controller=typeof AbortController==='function'?new AbortController():null;
        const timer=controller?setTimeout(()=>controller.abort(),5000):0;
        fetch(item.url,{method:'HEAD',cache:'no-cache',credentials:'same-origin',redirect:'follow',signal:controller?controller.signal:void 0}).then(response=>{
            const isUp=response.ok;
            item.dot.classList.add(isUp?'up':'down');
            cachedStatuses[item.url]={up:isUp,ts:Date.now()};
        }).catch(()=>{
            item.dot.classList.add('down');
            cachedStatuses[item.url]={up:false,ts:Date.now()};
        }).finally(()=>{
            if(timer)clearTimeout(timer);
            writeJsonCache(LIVE_STATUS_CACHE_KEY,cachedStatuses);
            setTimeout(runNext,150);
        });
    }
    scheduleIdle(runNext,1800);
})();

/* ===== NAV ===== */
const secs=document.querySelectorAll('section[id]');const nla=document.querySelectorAll('.nk a');
const so=new IntersectionObserver(e=>{e.forEach(en=>{if(en.isIntersecting){nla.forEach(a=>a.classList.remove('active'));const a=document.querySelector('.nk a[href="#'+en.target.id+'"]');if(a)a.classList.add('active');if(history.replaceState){try{const url=new URL(location.href);const nextHash='#'+en.target.id;if(url.hash!==nextHash){url.hash=nextHash;history.replaceState(null,'',url.pathname+url.search+url.hash)}}catch(err){}}}})},{rootMargin:'-40% 0px -60% 0px'});
secs.forEach(s=>so.observe(s));

/* ===== SCROLL PROGRESS BAR + NAV HIDE-ON-SCROLL-DOWN ===== */
const scrollProg=document.getElementById('scrollProgress');
let lastScrollY=0;

/* ===== BACK TO TOP ===== */
const bttBtn=document.getElementById('backToTop');
const navEl=document.getElementById('nav');
window.addEventListener('scroll',()=>{
    const sy=window.scrollY;
    if(bttBtn)bttBtn.classList.toggle('show',sy>600);
    const max=document.documentElement.scrollHeight-innerHeight;
    const pct=max>0?(sy/max)*100:0;
    if(scrollProg)scrollProg.style.width=pct+'%';
    // Nav hide on scroll down, show on scroll up
    if(navEl){
        if(sy>120){
            if(sy>lastScrollY+5){navEl.classList.add('hid');const _nl=document.getElementById('navLinks');const _mt=document.getElementById('mobileToggle');if(_nl&&_nl.classList.contains('open')){_nl.classList.remove('open');if(_mt)_mt.setAttribute('aria-expanded','false')}}
            else if(sy<lastScrollY-5)navEl.classList.remove('hid');
        }else{navEl.classList.remove('hid')}
    }
    lastScrollY=sy;
},{passive:true});
if(bttBtn)bttBtn.addEventListener('click',()=>{window.scrollTo({top:0,behavior:prefersReducedMotion?'auto':'smooth'})});

/* ===== YOUTUBE CLICK-TO-PLAY (keyboard accessible) ===== */
function playVideo(trigger){
    const id=trigger.dataset.yt;
    if(!id)return;
    const frameWrap=document.createElement('div');
    frameWrap.className='video-thumb video-thumb-playing';
    frameWrap.dataset.yt=id;
    frameWrap.tabIndex=-1;
    const iframe=document.createElement('iframe');
    iframe.src='https://www.youtube.com/embed/'+encodeURIComponent(id)+'?autoplay=1';
    iframe.title=trigger.querySelector('img')?.alt||'Video';
    iframe.frameBorder='0';
    iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen=true;
    iframe.style.cssText='width:100%;height:100%;position:absolute;inset:0';
    frameWrap.appendChild(iframe);
    trigger.replaceWith(frameWrap);
    requestAnimationFrame(()=>{
        if(typeof iframe.focus==='function')iframe.focus();
        else frameWrap.focus();
    });
}
document.querySelectorAll('.video-thumb[data-yt]').forEach(thumb=>{
    thumb.addEventListener('click',function(){playVideo(this)});
});

/* ===== LAZY-LOAD SPOTIFY EMBED ===== */
(function(){
    const wrap=document.getElementById('spotifyWrap');
    if(!wrap||!wrap.dataset.src)return;
    const io=new IntersectionObserver(entries=>{
        if(!entries[0].isIntersecting)return;
        io.disconnect();
        const iframe=document.createElement('iframe');
        iframe.src=wrap.dataset.src;
        iframe.title='Slunder Spotify profile';
        iframe.style.cssText='border-radius:16px;border:none';
        iframe.width='100%';iframe.height='740';
        iframe.allowFullscreen=true;
        iframe.allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
        iframe.loading='lazy';
        wrap.appendChild(iframe);
    },{rootMargin:'200px'});
    io.observe(wrap);
})();

/* ===== CATALOG: FILTER + SEARCH + SORT ===== */
const grid=document.getElementById('catalogGrid');
const allItems=grid?Array.from(grid.querySelectorAll('.ca')):[];
let currentFilter='all';
let currentSearch='';
let currentSort='default';
const catalogStatus=document.getElementById('catalogStatus');
const catalogReset=document.getElementById('catalogReset');
const catalogResetEmpty=document.getElementById('catalogResetEmpty');
const filterLabels={};
document.querySelectorAll('.fb[data-filter]').forEach(button=>{
    filterLabels[button.dataset.filter]=button.dataset.label||button.textContent.trim();
});

function getSortLabel(value){
    if(value==='stars')return'Most stars';
    if(value==='name')return'A-Z';
    if(value==='name-desc')return'Z-A';
    if(value==='recent')return'Recently updated';
    return'';
}

function updateCatalogFeedback(visible){
    const q=currentSearch.trim();
    const filterLabel=filterLabels[currentFilter]||'All projects';
    const sortLabel=getSortLabel(currentSort);
    const parts=[];
    if(currentFilter==='all'&&!q){
        parts.push('Showing '+visible+' of '+allItems.length+' projects');
    }else{
        parts.push('Showing '+visible+' result'+(visible!==1?'s':''));
        if(currentFilter!=='all')parts.push('in '+filterLabel);
        if(q)parts.push('for "'+q+'"');
    }
    if(sortLabel)parts.push('sorted by '+sortLabel);
    if(catalogStatus)catalogStatus.textContent=parts.join(' ') + '.';
    const hasCustomState=currentFilter!=='all'||!!q||currentSort!=='default';
    if(catalogReset)catalogReset.hidden=!hasCustomState;
    if(catalogResetEmpty)catalogResetEmpty.hidden=!hasCustomState;
}

function syncFilterButtons(){
    document.querySelectorAll('.fb').forEach(button=>{
        const active=button.dataset.filter===currentFilter;
        button.classList.toggle('act',active);
        button.setAttribute('aria-pressed',active?'true':'false');
    });
}

function resetCatalog(){
    currentFilter='all';
    currentSearch='';
    currentSort='default';
    const input=document.getElementById('searchInput');
    const select=document.getElementById('sortSelect');
    if(input)input.value='';
    if(select)select.value='default';
    syncFilterButtons();
    sortCatalog('default');
    applyFilters();
}

function highlight(node,q){
    // Clear any previous highlight then rewrap matched substring in <mark>
    const txt=node.dataset.originalText||(node.dataset.originalText=node.textContent);
    if(!q){node.textContent=txt;return}
    const idx=txt.toLowerCase().indexOf(q);
    if(idx<0){node.textContent=txt;return}
    node.textContent='';
    node.appendChild(document.createTextNode(txt.slice(0,idx)));
    const mark=document.createElement('mark');
    mark.textContent=txt.slice(idx,idx+q.length);
    node.appendChild(mark);
    node.appendChild(document.createTextNode(txt.slice(idx+q.length)));
}

function applyFilters(){
    const q=currentSearch.toLowerCase().trim();
    let visible=0;
    allItems.forEach(item=>{
        const matchFilter=currentFilter==='all'||item.dataset.f===currentFilter;
        const searchBody=(item.dataset.name+' '+item.dataset.desc+' '+(item.dataset.terms||'')).toLowerCase();
        const matchSearch=!q||searchBody.includes(q);
        const show=matchFilter&&matchSearch;
        item.classList.toggle('hid',!show);
        const nameEl=item.querySelector('.cna');
        const descEl=item.querySelector('.cds');
        if(nameEl)highlight(nameEl,show?q:'');
        if(descEl)highlight(descEl,show?q:'');
        if(show)visible++;
    });
    const nr=document.getElementById('noResults');if(nr)nr.hidden=visible!==0;
    updateCatalogFeedback(visible);
    // Sync filter state to URL for shareability
    try{
        const url=new URL(location.href);
        if(currentFilter&&currentFilter!=='all')url.searchParams.set('cat',currentFilter);else url.searchParams.delete('cat');
        if(q)url.searchParams.set('q',currentSearch);else url.searchParams.delete('q');
        if(currentSort&&currentSort!=='default')url.searchParams.set('sort',currentSort);else url.searchParams.delete('sort');
        history.replaceState(null,'',url.pathname+(url.search?url.search:'')+url.hash);
    }catch(e){}
}

function sortCatalog(method){
    if(!grid)return;
    const items=Array.from(grid.querySelectorAll('.ca'));
    items.sort((a,b)=>{
        if(method==='default')return(parseInt(a.dataset.index,10)||0)-(parseInt(b.dataset.index,10)||0);
        if(method==='stars')return(parseInt(b.dataset.stars)||0)-(parseInt(a.dataset.stars)||0);
        if(method==='name')return a.dataset.name.localeCompare(b.dataset.name);
        if(method==='name-desc')return b.dataset.name.localeCompare(a.dataset.name);
        if(method==='recent')return(b.dataset.updated||'').localeCompare(a.dataset.updated||'');
        return 0;
    });
    items.forEach(item=>grid.appendChild(item));
}

document.querySelectorAll('.fb').forEach(b=>{
    // a11y: filter buttons should expose pressed state for screen readers
    b.setAttribute('aria-pressed',b.classList.contains('act')?'true':'false');
    b.addEventListener('click',()=>{
        currentFilter=b.dataset.filter;
        syncFilterButtons();
        applyFilters();
    });
});

[catalogReset,catalogResetEmpty].forEach(button=>{
    if(!button)return;
    button.addEventListener('click',()=>{
        resetCatalog();
        const input=document.getElementById('searchInput');
        if(input)input.focus();
    });
});

let _searchDebounce=0;
const _searchEl=document.getElementById('searchInput');
if(_searchEl)_searchEl.addEventListener('input',e=>{currentSearch=e.target.value;clearTimeout(_searchDebounce);_searchDebounce=setTimeout(applyFilters,80)});

const _sortEl=document.getElementById('sortSelect');
if(_sortEl)_sortEl.addEventListener('change',e=>{currentSort=e.target.value;sortCatalog(currentSort);applyFilters()});

// Hydrate filter/search state from URL on load
(function hydrateFromUrl(){
    try{
        const params=new URLSearchParams(location.search);
        const cat=params.get('cat');
        const q=params.get('q');
        const sort=params.get('sort');
        if(cat){
            const btn=document.querySelector('.fb[data-filter="'+cat.replace(/[^a-z0-9]/gi,'')+'"]');
            if(btn)btn.click();
        }
        if(q){
            const input=document.getElementById('searchInput');
            if(input){input.value=q;currentSearch=q;applyFilters()}
        }
        if(sort){
            const select=document.getElementById('sortSelect');
            if(select&&Array.from(select.options).some(option=>option.value===sort)){
                select.value=sort;
                currentSort=sort;
                sortCatalog(sort);
            }
        }
    }catch(e){}
})();

// Initialize filter counts on load
updateFilterCounts();
updateCatalogFeedback(allItems.length);

/* ===== ANIMATED SLIDING NAV INDICATOR ===== */
(function(){
    const indicator=document.getElementById('navIndicator');
    const navLinksContainer=document.getElementById('navLinks');
    if(!indicator||!navLinksContainer)return;
    navLinksContainer.style.position='relative';
    function moveIndicator(link){
        if(!link||window.innerWidth<=640){indicator.classList.remove('vis');return;}
        const containerRect=navLinksContainer.getBoundingClientRect();
        const linkRect=link.getBoundingClientRect();
        indicator.style.left=(linkRect.left-containerRect.left)+'px';
        indicator.style.width=linkRect.width+'px';
        indicator.classList.add('vis');
    }
    document.querySelectorAll('.nk a:not(.nav-indicator)').forEach(a=>{
        a.addEventListener('mouseenter',()=>moveIndicator(a));
    });
    navLinksContainer.addEventListener('mouseleave',()=>{
        const active=navLinksContainer.querySelector('a.active');
        if(active)moveIndicator(active);else indicator.classList.remove('vis');
    });
    const navMO=new MutationObserver(()=>{
        const active=navLinksContainer.querySelector('a.active');
        if(active)moveIndicator(active);
    });
    document.querySelectorAll('.nk a').forEach(a=>{
        navMO.observe(a,{attributes:true,attributeFilter:['class']});
    });
})();

/* ===== INTERACTIVE TERMINAL ===== */
const pageLoadTime=Date.now();
const terminalDateFormatter=new Intl.DateTimeFormat(undefined,{
    dateStyle:'medium',
    timeStyle:'short'
});
function onTermReady(){
    const term=document.getElementById('heroTerm');
    const tbody=document.getElementById('termBody');
    const hint=document.getElementById('termHint');
    if(!term||!tbody)return;
    term.classList.add('interactive');
    if(hint)term.setAttribute('aria-describedby','termHint');
    let active=false;
    let inputLine=null;
    let inputEl=null;
    function normalizeProjectQuery(value){
        return String(value==null?'':value).trim().toLowerCase().replace(/[_\s]+/g,'-');
    }
    function getProjectMatches(value){
        const normalized=normalizeProjectQuery(value);
        if(!normalized)return [];
        const projects=window.__PORTFOLIO_DATA&&Array.isArray(window.__PORTFOLIO_DATA.allProjects)?window.__PORTFOLIO_DATA.allProjects:[];
        const seen=new Set();
        const exact=[];
        const partial=[];
        projects.forEach(project=>{
            const slug=safeRepo(project&&project.slug?project.slug:'');
            if(!slug||seen.has(slug))return;
            const nameKey=normalizeProjectQuery(project&&project.name?project.name:slug);
            const slugKey=normalizeProjectQuery(slug);
            if(normalized===slugKey||normalized===nameKey){
                seen.add(slug);
                exact.push({slug,name:project&&project.name?project.name:slug});
                return;
            }
            if(slugKey.includes(normalized)||nameKey.includes(normalized)){
                seen.add(slug);
                partial.push({slug,name:project&&project.name?project.name:slug});
            }
        });
        return exact.concat(partial).slice(0,3);
    }
    const commands={
        help:()=>'<span class="cmd-name">help</span>      Available commands\n<span class="cmd-name">whoami</span>    Who is Matt Parker\n<span class="cmd-name">skills</span>    Languages & tools\n<span class="cmd-name">repos</span>     Project stats\n<span class="cmd-name">ls</span>        List featured projects\n<span class="cmd-name">open</span>      Open a project page\n<span class="cmd-name">uptime</span>    Time on this page\n<span class="cmd-name">date</span>      Current date & time\n<span class="cmd-name">neofetch</span>  System info\n<span class="cmd-name">clear</span>     Clear terminal\n<span class="cmd-name">echo</span>      Echo text back',
        whoami:()=>'<span class="cmd-val">Matt Parker</span> - Sr. Systems Administrator & Builder\nHealthcare IT | Medical Imaging | Open Source\nPhilosophy: Dark theme. Works on first launch.',
        skills:()=>'<span class="cmd-name">PowerShell</span>  WPF, Automation\n<span class="cmd-name">Python</span>      PyQt6, CLI Tools\n<span class="cmd-name">JavaScript</span>  Userscripts, Web Apps\n<span class="cmd-name">Kotlin</span>      Android Apps\n<span class="cmd-name">C#</span>          WinForms, .NET\n<span class="cmd-name">C++</span>         Desktop Apps\n<span class="cmd-name">HTML/CSS</span>    Single-file Apps',
        repos:()=>{const r=document.getElementById('statRepos');const s=document.getElementById('statStars');return'<span class="cmd-val">'+(r?r.textContent:'--')+'</span> public projects\n<span class="cmd-val">'+(s?s.textContent:'--')+'</span> total stars'},
        ls:()=>'<span class="cmd-name">win11-nvme-driver-patcher</span>  NVMe driver patcher\n<span class="cmd-name">project-nomad-desktop</span>      Offline survival command center\n<span class="cmd-name">Astra-Deck</span>                 YouTube enhancement extension\n<span class="cmd-name">LibreSpot</span>                  Spotify customization\n<span class="cmd-name">Network_Security_Auditor</span>   67 security checks\n<span class="cmd-name">OpenCut</span>                    AI video editing for Premiere',
        uptime:()=>{const d=Date.now()-pageLoadTime;const m=Math.floor(d/60000);const s=Math.floor((d%60000)/1000);return'Page uptime: <span class="cmd-val">'+m+'m '+s+'s</span>'},
        date:()=>'<span class="cmd-val">'+terminalDateFormatter.format(new Date())+'</span>',
        neofetch:()=>'<span class="cmd-name">matt@sysadmin</span>\n--------------\n<span class="cmd-name">OS:</span>        <span class="cmd-val">Portfolio v3.0</span>\n<span class="cmd-name">Host:</span>      <span class="cmd-val">GitHub Pages</span>\n<span class="cmd-name">Shell:</span>     <span class="cmd-val">HTML/CSS/JS</span>\n<span class="cmd-name">Theme:</span>     <span class="cmd-val">Dark by default, light available</span>\n<span class="cmd-name">Projects:</span>  <span class="cmd-val">'+(document.getElementById('statRepos')?document.getElementById('statRepos').textContent:'--')+'</span>\n<span class="cmd-name">Stars:</span>     <span class="cmd-val">'+(document.getElementById('statStars')?document.getElementById('statStars').textContent:'--')+'</span>\n<span class="cmd-name">Uptime:</span>    <span class="cmd-val">Always on</span>',
        clear:()=>'__CLEAR__',
        cd:()=>'There is only one workspace here.',
        sudo:()=>'No elevated mode in the browser.',
        'rm':()=>'Disabled.',
        exit:()=>'Use the navigation to keep exploring.',
        cat:()=>'Try <span class="cmd-name">neofetch</span>, <span class="cmd-name">whoami</span>, or <span class="cmd-name">open</span> &lt;project-name&gt;.',
        pwd:()=>'/home/matt/portfolio',
        git:()=>'<span class="cmd-val">github.com/SysAdminDoc</span> \u2014 '+(document.getElementById('statRepos')?document.getElementById('statRepos').textContent:'--')+' projects',
        open:(args)=>{
            const query=Array.isArray(args)?args.join(' ').trim():'';
            if(!query)return'Usage: open &lt;project-name&gt;';
            const matches=getProjectMatches(query);
            const match=matches[0];
            if(!match){
                return'Project not found. Try <span class="cmd-name">ls</span> or use the command palette.';
            }
            setTimeout(()=>window.location.assign('/projects/'+encodeURIComponent(match.slug)+'/'),350);
            return'\u2192 /projects/<span class="cmd-val">'+escapeHTML(match.slug)+'/</span>';
        }
    };
    function addPrompt(){
        inputLine=document.createElement('div');
        inputLine.className='term-input-line';
        inputLine.innerHTML='<span class="tp">matt@sysadmin</span><span class="tcm">:</span><span class="tpa">~/portfolio</span><span class="tcm">$ </span>';
        inputEl=document.createElement('input');
        inputEl.type='text';
        inputEl.className='term-input';
        inputEl.setAttribute('autocomplete','off');
        inputEl.setAttribute('spellcheck','false');
        inputEl.setAttribute('autocapitalize','off');
        inputEl.setAttribute('enterkeyhint','go');
        inputEl.setAttribute('aria-label','Terminal command input');
        inputLine.appendChild(inputEl);
        tbody.appendChild(inputLine);
        inputEl.focus();
        inputEl.addEventListener('keydown',e=>{
            if(e.key==='Enter'){
                const cmd=inputEl.value.trim();
                inputEl.disabled=true;
                if(cmd){
                    const parts=cmd.split(/\s+/);
                    const base=parts[0].toLowerCase();
                    const args=parts.slice(1);
                    const handler=commands[base];
                    let output;
                    if(base==='echo'){output='<span class="cmd-val">'+escapeHTML(args.join(' '))+'</span>'}
                    else if(handler){output=typeof handler==='function'?handler(args,cmd):handler}
                    else{output='command not found: <span class="cmd-val">'+escapeHTML(base)+'</span>. Type <span class="cmd-name">help</span> for commands.'}
                    if(output==='__CLEAR__'){tbody.innerHTML='';addPrompt();return}
                    const outDiv=document.createElement('div');
                    outDiv.className='term-output';
                    outDiv.innerHTML=output;
                    tbody.appendChild(outDiv);
                }
                tbody.scrollTop=tbody.scrollHeight;
                addPrompt();
            }
        });
    }
    // Click-to-copy terminal output
    tbody.addEventListener('click',function(e){
        const output=getClosestTarget(e.target,'.term-output');
        if(!output)return;
        const text=output.textContent.trim();
        if(!text)return;
        navigator.clipboard.writeText(text).then(showCopyToast).catch(function(){});
    });
    function activate(){
        if(active)return;active=true;
        const cursor=tbody.querySelector('.tci');
        if(cursor)cursor.remove();
        if(hint)hint.style.display='none';
        tbody.style.maxHeight='400px';
        tbody.style.overflowY='auto';
        addPrompt();
    }
    term.addEventListener('click',activate);
    term.addEventListener('keydown',e=>{if(e.key==='Enter'&&!active)activate()});
    document.addEventListener('keydown',e=>{
        if(!active&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key.length===1){
            const focused=document.activeElement;
            if(focused&&isTextEntryTarget(focused))return;
            activate();
            if(inputEl)inputEl.value=e.key;
        }
    });
}

/* ===== EASTER EGG - KONAMI CODE ===== */
(function(){
    const code=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let pos=0;
    document.addEventListener('keydown',e=>{
        if(e.key===code[pos]){pos++;if(pos===code.length){pos=0;triggerEasterEgg()}}else{pos=0}
    });
    function triggerEasterEgg(){
        const overlay=document.createElement('div');
        overlay.style.cssText='position:fixed;inset:0;z-index:100000;pointer-events:none;overflow:hidden';
        document.body.appendChild(overlay);
        const chars='abcdefghijklmnopqrstuvwxyz0123456789@#$%&*<>/\\|{}[]';
        const cols=Math.floor(window.innerWidth/14);
        for(let i=0;i<cols;i++){
            const col=document.createElement('div');
            col.style.cssText='position:absolute;top:-100%;left:'+i*14+'px;font-family:var(--mono);font-size:13px;color:var(--grn);text-shadow:0 0 8px var(--grn-glow);line-height:1.2;writing-mode:vertical-lr;white-space:nowrap;animation:matrixFall '+(2+Math.random()*3)+'s linear '+(Math.random()*2)+'s forwards';
            let str='';for(let j=0;j<60;j++)str+=chars[Math.floor(Math.random()*chars.length)];
            col.textContent=str;
            overlay.appendChild(col);
        }
        const style=document.createElement('style');
        style.textContent='@keyframes matrixFall{0%{transform:translateY(0);opacity:.8}100%{transform:translateY('+(window.innerHeight+200)+'px);opacity:0}}';
        document.head.appendChild(style);
        setTimeout(()=>{overlay.remove();style.remove()},6000);
    }
})();

/* ===== HERO AVATAR (cached 30 min) ===== */
(function(){
    const CACHE_KEY='gh_avatar_cache';const TTL=1800000;
    const cached=readJsonCache(CACHE_KEY);
    const av=document.getElementById('heroAvatar');
    if(!av)return;
    function showAvatar(url){if(url){av.src=url;requestAnimationFrame(()=>av.classList.add('loaded'))}}
    if(cached&&Date.now()-cached.ts<TTL&&cached.url){showAvatar(cached.url)}
    else if(navigator.onLine!==false){
        fetchWithTimeout('https://api.github.com/users/SysAdminDoc',void 0,10000).then(r=>{
            if(!r.ok)throw new Error('GitHub profile unavailable');
            return r.json();
        }).then(d=>{
            if(d.avatar_url){
                writeJsonCache(CACHE_KEY,{url:d.avatar_url,ts:Date.now()});
                showAvatar(d.avatar_url);
            }
        }).catch(()=>{});
    }
})();

/* ===== SKILL RING ANIMATION ===== */
(function(){
    const rings=document.querySelectorAll('.sk-ring');
    if(!rings.length)return;
    let drawn=0;
    const ringObs=new IntersectionObserver(entries=>{
        entries.forEach(e=>{
            if(e.isIntersecting){
                e.target.classList.add('drawn');
                ringObs.unobserve(e.target);
                drawn++;
                if(drawn>=rings.length)ringObs.disconnect();
            }
        });
    },{threshold:.3});
    rings.forEach(r=>ringObs.observe(r));
})();

/* ===== LIVE APP THUMBNAILS ===== */
(function(){
    const thumbObs=new IntersectionObserver(entries=>{
        entries.forEach(e=>{
            if(!e.isIntersecting)return;
            thumbObs.unobserve(e.target);
            const img=e.target.querySelector('img');
            if(img&&img.dataset.src){img.src=img.dataset.src;delete img.dataset.src}
        });
    },{rootMargin:'200px'});
    document.querySelectorAll('#live .lc2').forEach(card=>{
        const url=card.href;
        const repo=safeRepo((url.split('sysadmindoc.github.io/')[1]||'').replace(/\/.*$/,''));
        if(!repo)return;
        const thumb=document.createElement('div');
        thumb.className='lc2-thumb';
        thumb.setAttribute('aria-hidden','true');
        thumb.style.aspectRatio='16/10';
        const img=document.createElement('img');
        img.alt='';img.loading='lazy';img.decoding='async';
        img.width=1280;img.height=800;
        // Prefer locally-captured screenshot; fall back to opengraph image if missing.
        img.dataset.src='/screenshots/'+repo+'.jpg';
        img.onerror=function(){
            img.onerror=function(){thumb.classList.add('thumb-fallback');img.remove()};
            img.src='https://opengraph.githubassets.com/1/SysAdminDoc/'+repo;
        };
        thumb.appendChild(img);
        card.insertBefore(thumb,card.firstChild);
        thumbObs.observe(thumb);
    });
})();

/* Starred catalog glow wired into applyGitHubData directly */

/* ===== PWA SERVICE WORKER ===== */
if('serviceWorker' in navigator){
    const registerServiceWorker=()=>navigator.serviceWorker.register('/sw.js').catch(function(){});
    if(document.readyState==='complete')registerServiceWorker();
    else window.addEventListener('load',registerServiceWorker,{once:true});
}
