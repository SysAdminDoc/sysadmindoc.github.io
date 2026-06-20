/* ===== SAFE DOM HELPERS (XSS-safe repo/text injection) ===== */
/* escapeHTML, isTextEntryTarget, prefersReducedMotion — loaded from shared.js */
function safeText(s){return String(s==null?'':s)}
// Only allow alphanumeric, dash, underscore, dot in repo slugs (GitHub's own rules)
function safeRepo(s){return String(s==null?'':s).replace(/[^A-Za-z0-9._-]/g,'')}
const GITHUB_CACHE_KEY='gh_cache';
const GITHUB_CACHE_TTL=21600000; // 6h — build-time stats are already baked; live fetch only freshens star counts
const LIVE_STATUS_CACHE_KEY='live_status_cache';
const LIVE_STATUS_CACHE_TTL=900000;
// localStorage may be unavailable (private mode, quota, disabled). Fall back to a
// module-scoped in-memory cache so the TTL still suppresses repeat fetches within
// a session (the exact users most likely to hit the GitHub rate limit).
var _memCache={};
var _hasLS=(function(){try{var k='__ls_probe__';localStorage.setItem(k,'1');localStorage.removeItem(k);return true}catch(e){return false}})();
function readJsonCache(key){
    if(!_hasLS)return Object.prototype.hasOwnProperty.call(_memCache,key)?_memCache[key]:null;
    try{return JSON.parse(localStorage.getItem(key)||'null')}catch(e){return null}
}
function writeJsonCache(key,value){
    if(!_hasLS){_memCache[key]=value;return}
    try{localStorage.setItem(key,JSON.stringify(value))}catch(e){_memCache[key]=value}
}
function isFreshCache(entry,ttl){return !!entry&&typeof entry.ts==='number'&&Date.now()-entry.ts<ttl}
function scheduleIdle(fn,timeout){
    const delay=typeof timeout==='number'?timeout:1200;
    if('requestIdleCallback' in window){requestIdleCallback(fn,{timeout:delay});return}
    setTimeout(fn,Math.min(delay,1000));
}
const HOMEPAGE_SCROLL_SECTION_SELECTOR='#live,#volume,#catalog,#skills,#about,#career,#philosophy,#journey,#beyond,#connect';
const HOMEPAGE_HASH_RESTORE_DELAYS=[0,250,750,1400,2400,3600];
const HOMEPAGE_INITIAL_HASH=window.location.hash;
let homepageHashRestoreToken=0;
function revealHomepageScrollSections(){
    document.querySelectorAll(HOMEPAGE_SCROLL_SECTION_SELECTOR).forEach(function(el){
        el.style.contentVisibility='visible';
    });
}
function restoreHomepageHashTarget(hashOverride){
    const hash=hashOverride||window.location.hash;
    if(!hash)return;
    var id='';
    try{id=decodeURIComponent(hash.replace(/^#/,''))}catch(e){id=hash.replace(/^#/,'')}
    if(!id)return;
    var target=document.getElementById(id);
    if(!(target instanceof HTMLElement))return;
    if(target.closest(HOMEPAGE_SCROLL_SECTION_SELECTOR)||target.matches(HOMEPAGE_SCROLL_SECTION_SELECTOR)){
        revealHomepageScrollSections();
    }
    window.__PORTFOLIO_SECTION_HASH_LOCK_UNTIL=Date.now()+1600;
    if(window.location.hash!==hash&&history.replaceState){
        history.replaceState(null,'',window.location.pathname+window.location.search+hash);
    }
    target.scrollIntoView({block:'start',behavior:'auto'});
    requestAnimationFrame(function(){
        const top=target.getBoundingClientRect().top;
        const expected=parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)||72;
        if(Math.abs(top-expected)>160)target.scrollIntoView({block:'start',behavior:'auto'});
    });
}
function scheduleHomepageHashRestore(hashOverride){
    const hash=hashOverride||window.location.hash;
    if(!hash)return;
    const token=++homepageHashRestoreToken;
    window.__PORTFOLIO_SECTION_HASH_LOCK_UNTIL=Date.now()+5200;
    HOMEPAGE_HASH_RESTORE_DELAYS.forEach(function(delay){
        setTimeout(function(){
            if(token!==homepageHashRestoreToken)return;
            restoreHomepageHashTarget(hash);
        },delay);
    });
}
function cancelHomepageHashRestore(){homepageHashRestoreToken++}
['wheel','touchstart','keydown'].forEach(function(type){
    window.addEventListener(type,cancelHomepageHashRestore,{passive:true});
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){scheduleHomepageHashRestore(HOMEPAGE_INITIAL_HASH||window.location.hash)},{once:true});
else scheduleHomepageHashRestore(HOMEPAGE_INITIAL_HASH||window.location.hash);
window.addEventListener('load',function(){scheduleHomepageHashRestore(HOMEPAGE_INITIAL_HASH||window.location.hash)},{once:true});
window.addEventListener('hashchange',function(){scheduleHomepageHashRestore(window.location.hash)});
function fetchWithTimeout(resource,options,timeoutMs){
    if(typeof AbortController==='undefined')return fetch(resource,options);
    const controller=new AbortController();
    const timeout=typeof timeoutMs==='number'?timeoutMs:10000;
    const timer=setTimeout(()=>controller.abort(),timeout);
    return fetch(resource,{...(options||{}),signal:controller.signal}).finally(()=>clearTimeout(timer));
}
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
function countLanguageTotal(langCount){
    if(!langCount)return 0;
    return Object.values(langCount).reduce(function(total,value){
        const count=Number(value);
        return total+(Number.isFinite(count)&&count>0?count:0);
    },0);
}
function getPortfolioLanguageSummary(){
    const projects=window.__PORTFOLIO_DATA&&Array.isArray(window.__PORTFOLIO_DATA.allProjects)?window.__PORTFOLIO_DATA.allProjects:[];
    if(!projects.length)return null;
    const langCount={};
    let total=0;
    projects.forEach(function(project){
        const lang=safeText(project&&project.language).trim();
        if(!lang)return;
        langCount[lang]=(langCount[lang]||0)+1;
        total+=1;
    });
    return total>0?{langs:langCount,total}:null;
}
/* ===== SHARED MOUSE STATE ===== */
const mouseState={x:-1000,y:-1000,moved:false};
document.addEventListener('mousemove',e=>{
    mouseState.x=e.clientX;mouseState.y=e.clientY;mouseState.moved=true;
},{passive:true});
document.addEventListener('mouseleave',()=>{mouseState.x=-1000;mouseState.y=-1000;mouseState.moved=false});

/* ===== COPY TOAST ===== */
const copyToast=document.createElement('div');copyToast.className='copy-toast';copyToast.textContent='Link copied';copyToast.setAttribute('role','status');copyToast.setAttribute('aria-live','polite');
if('popover' in HTMLElement.prototype){copyToast.setAttribute('popover','manual')}
document.body.appendChild(copyToast);
let copyToastTimer=0;
function showCopyToast(){
    clearTimeout(copyToastTimer);
    if(copyToast.showPopover){try{copyToast.showPopover()}catch(e){}}
    copyToast.classList.add('show');
    copyToastTimer=setTimeout(function(){
        copyToast.classList.remove('show');
        if(copyToast.hidePopover){try{copyToast.hidePopover()}catch(e){}}
    },1500);
}

/* ===== TERMINAL TYPING ===== */
const tl=[{prompt:true,path:'~/portfolio',cmd:'./profile'},{text:''},{key:'name',val:'Matt Parker'},{key:'role',val:'Sr. Systems Administrator'},{key:'projects',val:'…',vc:'tv',id:'termRepos'},{key:'stars',val:'…',vc:'tv',id:'termStars'},{key:'langs',val:'PS1, Python, JS, Kotlin, C#'},{key:'theme',val:'always dark'},{text:''},{prompt:true,path:'~/portfolio',cmd:'echo $PHILOSOPHY'},{text:'Download it, launch it, done.',color:'ts'},{text:''},{prompt:true,path:'~/portfolio',cmd:'',cursor:true}];
const tb=document.getElementById('termBody');let ti=0;
function rt(){if(ti>=tl.length||!tb)return;const l=tl[ti];const d=document.createElement('div');d.classList.add('tl');d.style.animationDelay=(ti*.08)+'s';
    if(l.prompt){d.innerHTML='<span class="tp">matt@sysadmin</span><span class="tcm">:</span><span class="tpa">'+escapeHTML(l.path)+'</span><span class="tcm">$ </span><span class="tc">'+escapeHTML(l.cmd)+'</span>'+(l.cursor?'<span class="tci"></span>':'')}
    else if(l.key){const idAttr=l.id?' id="'+escapeHTML(l.id)+'"':'';d.innerHTML='<span class="tk">'+escapeHTML(l.key)+'</span><span class="tcm">: </span><span class="'+(l.vc||'ts')+'"'+idAttr+'>'+escapeHTML(l.val)+'</span>'}
    else if(l.text!==undefined){d.innerHTML=l.text===''?'&nbsp;':'<span class="'+(l.color||'tc')+'">'+escapeHTML(l.text)+'</span>'}
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
async function fetchAllRepos(conditionalEtag){
    let allRepos=[];
    let firstEtag=null;
    for(let page=1;page<=10;page++){
        try{
            const opts=(page===1&&conditionalEtag)?{headers:{'If-None-Match':conditionalEtag}}:void 0;
            const r=await fetchWithTimeout('https://api.github.com/users/SysAdminDoc/repos?per_page=100&sort=updated&page='+page,opts,10000);
            if(page===1){
                if(r.status===304)return {notModified:true};
                firstEtag=r.headers.get('etag');
            }
            if(!r.ok)throw new Error('GitHub API error: '+r.status);
            const repos=await r.json();
            if(!Array.isArray(repos))throw new Error('Unexpected GitHub repo payload');
            if(repos.length===0)break;
            allRepos=allRepos.concat(repos);
            if(repos.length<100)break;
        }catch(e){
            if(page===1)throw e;
            break;
        }
    }
    return {repos:allRepos,etag:firstEtag};
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
        const projectCount=getFallbackRepoCount()||cached.displayTotal||cached.total;
        const skipAggregate=hasBaked&&baked.repos===projectCount&&baked.stars===cached.stars;
        applyGitHubData(projectCount,cached.stars,cached.langs||null,{skipAggregate});
        if(isFreshCache(cached,GITHUB_CACHE_TTL)||navigator.onLine===false)return;
    }else if(navigator.onLine===false){
        return;
    }

    try{
        const result=await fetchAllRepos(cached&&cached.etag?cached.etag:null);
        if(result.notModified){
            // Nothing changed since the cached fetch — refresh the timestamp so the
            // TTL resets without re-parsing, and keep the already-applied cached data.
            if(cached)writeJsonCache(GITHUB_CACHE_KEY,{...cached,ts:Date.now()});
            return;
        }
        const allRepos=result.repos;
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
        const projectCount=getFallbackRepoCount()||count;
        ghData=nextGhData;
        writeJsonCache(GITHUB_CACHE_KEY,{data:ghData,total:count,displayTotal:projectCount,stars:totalStars,langs:langCount,etag:result.etag,ts:Date.now()});
        // Only animate aggregates if new data actually differs (prevents useless repaint)
        const skipAggregate=hasBaked&&baked.repos===projectCount&&baked.stars===totalStars;
        applyGitHubData(projectCount,totalStars,langCount,{skipAggregate});
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

function fadeUpdateStat(el,value){
    if(!el)return;
    if(el.textContent===String(value))return;
    el.classList.add('stat-updating');
    setTimeout(function(){el.textContent=value;el.classList.remove('stat-updating')},200);
}
function setStatText(el,value,animate){
    if(!el)return;
    if(animate){fadeUpdateStat(el,value);return}
    if(el.textContent!==String(value))el.textContent=value;
}
function syncAggregateStats(repoCount,totalStars,animate){
    setStatText(document.getElementById('statRepos'),repoCount,animate);
    setStatText(document.getElementById('statStars'),totalStars,animate);
    setStatText(document.getElementById('termRepos'),repoCount,false);
    setStatText(document.getElementById('termStars'),totalStars,false);
    setStatText(document.getElementById('aboutRepos'),repoCount,animate);
    const art=document.getElementById('aboutReposText');if(art)art.textContent=repoCount+'+';
    setStatText(document.getElementById('philRepos'),repoCount,animate);
    setStatText(document.getElementById('journeyRepos'),repoCount,animate);
}
function applyGitHubData(repoCount,totalStars,langCount,opts){
    opts=opts||{};
    // Aggregate project count follows the rendered catalog, not the raw GitHub repo count.
    syncAggregateStats(repoCount,totalStars,!opts.skipAggregate);
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
                badge.innerHTML='<svg viewBox="0 0 16 16"><path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/></svg>'+escapeHTML(s);
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
    // Language donut: keep hydration aligned with the rendered portfolio, not the
    // raw public GitHub repo set, so the chart does not flicker to another basis.
    const portfolioLangs=getPortfolioLanguageSummary();
    if(portfolioLangs)renderLangDonut(portfolioLangs.langs,portfolioLangs.total);
    else if(langCount)renderLangDonut(langCount,countLanguageTotal(langCount)||repoCount);
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
    const colorClasses={'PowerShell':'powershell','Python':'python','JavaScript':'javascript','HTML':'html','Kotlin':'kotlin','C#':'csharp','C++':'cpp','Shell':'shell','TypeScript':'typescript','CSS':'css','Other':'other'};
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
        var pct=Math.round(count/total*100);
        var tone=colorClasses[lang]||'other';
        legend+='<div class="lang-legend-item"><span class="lang-legend-dot lang-tone-'+tone+'"></span>'+escapeHTML(lang)+'<span class="lang-legend-pct">'+pct+'%</span></div>';
    });
    const lead=top[0];
    const leadLang=lead?lead[0]:'Mixed';
    const leadPct=lead?Math.round(lead[1]/total*100):0;
    wrap.innerHTML='<div class="lang-donut-panel"><div class="lang-donut-head"><div class="lang-donut-kicker">Project Mix</div><p class="lang-donut-copy">'+escapeHTML(leadLang)+' leads the public archive at '+leadPct+'% of projects, with the rest spread across desktop, web, and Android tooling.</p></div><div class="lang-donut-shell"><div class="lang-donut"><svg viewBox="0 0 180 180">'+circles+'</svg><div class="lang-donut-center"><div class="donut-total">'+total+'</div><div class="donut-label">projects</div></div></div><div class="lang-legend">'+legend+'</div></div></div>';
}

// Skip the live GitHub refresh on metered/save-data connections — the baked
// build-time stats are already accurate enough.
(function(){
    const conn=navigator.connection||navigator.webkitConnection;
    const metered=conn&&(conn.saveData===true||/(^|\b)(slow-2g|2g)$/.test(conn.effectiveType||''));
    if(!metered)scheduleIdle(fetchGitHub,1200);
})();

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
        dot.setAttribute('aria-hidden','true');
        const srText=document.createElement('span');
        srText.className='sr-only';
        srText.textContent='Status: checking';
        badge.prepend(srText);
        badge.prepend(dot);
        const setStatus=function(up){
            dot.classList.add(up?'up':'down');
            srText.textContent='Status: '+(up?'reachable':'unreachable');
        };
        if(isFreshCache(cachedStatuses[url],LIVE_STATUS_CACHE_TTL)){
            setStatus(cachedStatuses[url].up);
            return;
        }
        try{
            const target=new URL(url,location.href);
            if(target.origin!==location.origin)return;
            queue.push({url:target.toString(),dot,setStatus});
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
            item.setStatus(isUp);
            cachedStatuses[item.url]={up:isUp,ts:Date.now()};
        }).catch(()=>{
            item.setStatus(false);
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
const so=new IntersectionObserver(e=>{e.forEach(en=>{if(en.isIntersecting){nla.forEach(a=>a.classList.remove('active'));const a=document.querySelector('.nk a[href="#'+en.target.id+'"]');if(a)a.classList.add('active');if(history.replaceState&&Date.now()>=(window.__PORTFOLIO_SECTION_HASH_LOCK_UNTIL||0)){try{const url=new URL(location.href);const nextHash='#'+en.target.id;if(url.hash!==nextHash){url.hash=nextHash;history.replaceState(null,'',url.pathname+url.search+url.hash)}}catch(err){}}}})},{rootMargin:'-40% 0px -60% 0px'});
secs.forEach(s=>so.observe(s));

/* ===== SCROLL PROGRESS BAR + NAV HIDE-ON-SCROLL-DOWN ===== */
const scrollProg=document.getElementById('scrollProgress');
let lastScrollY=0;

/* ===== BACK TO TOP ===== */
const bttBtn=document.getElementById('backToTop');
const navEl=document.getElementById('nav');
let _scrollRaf=0;
window.addEventListener('scroll',()=>{
    if(_scrollRaf)return;
    _scrollRaf=requestAnimationFrame(()=>{
        _scrollRaf=0;
        const sy=window.scrollY;
        if(bttBtn)bttBtn.classList.toggle('show',sy>600);
        const max=document.documentElement.scrollHeight-innerHeight;
        const pct=max>0?(sy/max)*100:0;
        if(scrollProg)scrollProg.style.width=pct+'%';
        if(navEl){
            if(sy>120){
                if(sy>lastScrollY+5){navEl.classList.add('hid');const _nl=document.getElementById('navLinks');const _mt=document.getElementById('mobileToggle');if(_nl&&_nl.classList.contains('open')){_nl.classList.remove('open');if(_mt)_mt.setAttribute('aria-expanded','false')}}
                else if(sy<lastScrollY-5)navEl.classList.remove('hid');
            }else{navEl.classList.remove('hid')}
        }
        lastScrollY=sy;
    });
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
    iframe.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?autoplay=1';
    iframe.title=trigger.querySelector('img')?.alt||'Video';
    iframe.frameBorder='0';
    iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen=true;
    iframe.className='video-embed';
    frameWrap.appendChild(iframe);
    // Keyboard-operable close button restores the thumbnail (escape from the embed).
    const closeBtn=document.createElement('button');
    closeBtn.type='button';
    closeBtn.className='video-close';
    closeBtn.setAttribute('aria-label','Close video and return to thumbnail');
    closeBtn.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>';
    closeBtn.addEventListener('click',(event)=>{
        event.preventDefault();
        event.stopPropagation();
        frameWrap.replaceWith(trigger);
        if(typeof trigger.focus==='function')trigger.focus();
    });
    frameWrap.appendChild(closeBtn);
    trigger.replaceWith(frameWrap);
    requestAnimationFrame(()=>{
        if(typeof closeBtn.focus==='function')closeBtn.focus();
    });
}
document.querySelectorAll('.video-thumb[data-yt]').forEach(thumb=>{
    if(!thumb.hasAttribute('tabindex'))thumb.setAttribute('tabindex','0');
    if(!thumb.hasAttribute('role'))thumb.setAttribute('role','button');
    if(!thumb.getAttribute('aria-label')){
        const alt=thumb.querySelector('img')?.alt;
        thumb.setAttribute('aria-label',alt?'Play video: '+alt:'Play video');
    }
    thumb.addEventListener('click',function(){playVideo(this)});
    thumb.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();playVideo(this)}});
});

/* ===== CATALOG: FILTER + SEARCH + SORT ===== */
const grid=document.getElementById('catalogGrid');
const allItems=grid?Array.from(grid.querySelectorAll('.ca')):[];
let currentFilter='all';
let currentView='all';
let currentSearch='';
let currentSort='default';
const catalogStatus=document.getElementById('catalogStatus');
const catalogReset=document.getElementById('catalogReset');
const catalogResetEmpty=document.getElementById('catalogResetEmpty');
const filterLabels={};
document.querySelectorAll('.fb[data-filter]').forEach(button=>{
    filterLabels[button.dataset.filter]=button.dataset.label||button.textContent.trim();
});
const viewLabels={};
document.querySelectorAll('.catalog-view[data-view]').forEach(button=>{
    viewLabels[button.dataset.view]=button.dataset.label||button.textContent.trim();
});

function getSortLabel(value){
    if(value==='default')return'Recommended';
    if(value==='stars')return'Most stars';
    if(value==='name')return'A-Z';
    if(value==='name-desc')return'Z-A';
    if(value==='recent')return'Recently updated';
    return'';
}

function updateCatalogFeedback(visible){
    const q=currentSearch.trim();
    const filterLabel=filterLabels[currentFilter]||'All projects';
    const viewLabel=viewLabels[currentView]||'All views';
    const sortLabel=getSortLabel(currentSort);
    const parts=[];
    if(currentFilter==='all'&&currentView==='all'&&!q){
        parts.push('Showing '+visible+' of '+allItems.length+' projects');
    }else{
        parts.push('Showing '+visible+' result'+(visible!==1?'s':''));
        if(currentView!=='all')parts.push('in '+viewLabel);
        if(currentFilter!=='all')parts.push('in '+filterLabel);
        if(q)parts.push('for "'+q+'"');
    }
    if(sortLabel)parts.push('sorted by '+sortLabel);
    if(catalogStatus)catalogStatus.textContent=parts.join(' ') + '.';
    const hasCustomState=currentFilter!=='all'||currentView!=='all'||!!q||currentSort!=='default';
    if(catalogReset)catalogReset.hidden=!hasCustomState;
    if(catalogResetEmpty)catalogResetEmpty.hidden=!hasCustomState;
}

function syncViewButtons(){
    document.querySelectorAll('.catalog-view').forEach(button=>{
        const active=button.dataset.view===currentView;
        button.classList.toggle('act',active);
        button.setAttribute('aria-pressed',active?'true':'false');
    });
}

function syncFilterButtons(){
    document.querySelectorAll('.fb').forEach(button=>{
        if(!button.dataset.filter)return;
        const active=button.dataset.filter===currentFilter;
        button.classList.toggle('act',active);
        button.setAttribute('aria-pressed',active?'true':'false');
    });
}

function resetCatalog(){
    currentFilter='all';
    currentView='all';
    currentSearch='';
    currentSort='default';
    const input=document.getElementById('searchInput');
    const select=document.getElementById('sortSelect');
    if(input)input.value='';
    if(select)select.value='default';
    syncViewButtons();
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
        const matchView=
            currentView==='all'||
            (currentView==='new'&&item.dataset.new==='true')||
            (currentView==='recent'&&item.dataset.recent==='true')||
            (currentView==='download'&&item.dataset.hasDownload==='true');
        const searchBody=(item.dataset.name+' '+item.dataset.desc+' '+(item.dataset.terms||'')).toLowerCase();
        const matchSearch=!q||searchBody.includes(q);
        const show=matchFilter&&matchView&&matchSearch;
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
        if(currentView&&currentView!=='all')url.searchParams.set('view',currentView);else url.searchParams.delete('view');
        if(currentFilter&&currentFilter!=='all')url.searchParams.set('cat',currentFilter);else url.searchParams.delete('cat');
        if(q)url.searchParams.set('q',currentSearch);else url.searchParams.delete('q');
        if(currentSort&&currentSort!=='default')url.searchParams.set('sort',currentSort);else url.searchParams.delete('sort');
        history.replaceState(null,'',url.pathname+(url.search?url.search:'')+url.hash);
    }catch(e){}
}

function sortCatalog(method){
    if(!grid)return;
    grid.dataset.sort=method||'default';
    const items=Array.from(grid.querySelectorAll('.ca'));
    const readNumber=(item,key)=>{
        const value=Number(item.dataset[key]);
        return Number.isFinite(value)?value:0;
    };
    items.sort((a,b)=>{
        if(method==='default'){
            const rankDelta=readNumber(b,'rank')-readNumber(a,'rank');
            if(Math.abs(rankDelta)>0.0001)return rankDelta;
            return(readNumber(a,'rankPosition')||readNumber(a,'index'))-(readNumber(b,'rankPosition')||readNumber(b,'index'));
        }
        if(method==='stars')return(parseInt(b.dataset.stars)||0)-(parseInt(a.dataset.stars)||0);
        if(method==='name')return(a.dataset.name||'').localeCompare(b.dataset.name||'');
        if(method==='name-desc')return(b.dataset.name||'').localeCompare(a.dataset.name||'');
        if(method==='recent')return(b.dataset.updated||'').localeCompare(a.dataset.updated||'');
        return 0;
    });
    const frag=document.createDocumentFragment();items.forEach(item=>frag.appendChild(item));grid.appendChild(frag);
}

document.querySelectorAll('.catalog-view').forEach(b=>{
    b.setAttribute('aria-pressed',b.classList.contains('act')?'true':'false');
    b.addEventListener('click',()=>{
        currentView=b.dataset.view;
        syncViewButtons();
        applyFilters();
    });
});

document.querySelectorAll('.fb[data-filter]').forEach(b=>{
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
const _catalogSearchForm=document.getElementById('catalogSearchForm');
if(_catalogSearchForm)_catalogSearchForm.addEventListener('submit',e=>{e.preventDefault();clearTimeout(_searchDebounce);if(_searchEl)currentSearch=_searchEl.value;applyFilters()});

const _sortEl=document.getElementById('sortSelect');
if(_sortEl)_sortEl.addEventListener('change',e=>{currentSort=e.target.value;sortCatalog(currentSort);applyFilters()});

// Hydrate filter/search state from URL on load
(function hydrateFromUrl(){
    try{
        const params=new URLSearchParams(location.search);
        const view=params.get('view');
        const cat=params.get('cat');
        const q=params.get('q');
        const sort=params.get('sort');
        if(view){
            const btn=document.querySelector('.catalog-view[data-view="'+view.replace(/[^a-z0-9-]/gi,'')+'"]');
            if(btn){
                currentView=btn.dataset.view;
                syncViewButtons();
            }
        }
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

// Initialize filter counts and apply any URL-backed state on load.
updateFilterCounts();
applyFilters();

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
    tbody.setAttribute('role','log');
    tbody.setAttribute('aria-live','polite');
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
    function terminalRoute(path,label){
        setTimeout(()=>window.location.assign(path),350);
        return '\u2192 <span class="cmd-val">'+escapeHTML(label||path)+'</span>';
    }
    function scrollToTerminalTarget(selector,label){
        setTimeout(function(){
            const target=document.querySelector(selector);
            if(!target)return;
            if(inputEl)inputEl.blur();
            window.__PORTFOLIO_SECTION_HASH_LOCK_UNTIL=Date.now()+1600;
            revealHomepageScrollSections();
            const jump=function(){target.scrollIntoView({block:'start',behavior:'auto'});};
            const syncHash=function(){if(selector.charAt(0)==='#')history.replaceState(null,'',selector);};
            jump();
            syncHash();
            setTimeout(function(){
                jump();
                syncHash();
            },350);
            setTimeout(function(){
                jump();
                syncHash();
            },900);
        },120);
        return '\u2192 <span class="cmd-val">'+escapeHTML(label||selector)+'</span>';
    }
    function runThemeCommand(args){
        const raw=Array.isArray(args)&&args.length?String(args[0]).toLowerCase():'';
        const root=document.documentElement;
        const btn=document.getElementById('themeToggle');
        const current=root.dataset.theme==='light'?'light':'dark';
        if(!raw){
            return 'Current theme: <span class="cmd-val">'+current+'</span>\nUsage: <span class="cmd-name">theme</span> light|dark|toggle';
        }
        if(raw!=='light'&&raw!=='dark'&&raw!=='toggle'){
            return 'Unknown theme: <span class="cmd-val">'+escapeHTML(raw)+'</span>. Use light, dark, or toggle.';
        }
        const next=raw==='toggle'?(current==='dark'?'light':'dark'):raw;
        if(btn&&current!==next)btn.click();
        return 'Theme set to <span class="cmd-val">'+next+'</span>';
    }
    const commands={
        help:()=>'<span class="cmd-name">help</span>      Available commands\n<span class="cmd-name">whoami</span>    Who is Matt Parker\n<span class="cmd-name">skills</span>    Languages & tools\n<span class="cmd-name">repos</span>     Project stats\n<span class="cmd-name">ls</span>        List featured projects\n<span class="cmd-name">open</span>      Open a project page\n<span class="cmd-name">contact</span>   Jump to Connect\n<span class="cmd-name">uses</span>      Open the setup page\n<span class="cmd-name">theme</span>     light | dark | toggle\n<span class="cmd-name">uptime</span>    Time on this page\n<span class="cmd-name">date</span>      Current date & time\n<span class="cmd-name">neofetch</span>  System info\n<span class="cmd-name">clear</span>     Clear terminal\n<span class="cmd-name">echo</span>      Echo text back',
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
        contact:()=>scrollToTerminalTarget('#connect','Connect section'),
        uses:()=>terminalRoute('/uses/','/uses/'),
        theme:runThemeCommand,
        dark:()=>runThemeCommand(['dark']),
        light:()=>runThemeCommand(['light']),
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
    var cmdHistory=[];
    var histIdx=-1;
    function completeInput(value){
        var trimmed=value.replace(/^\s+/,'');
        var openMatch=trimmed.match(/^(open)\s+(.+)$/i);
        if(openMatch){
            var matches=getProjectMatches(openMatch[2]);
            if(matches[0])return 'open '+matches[0].slug;
            return value;
        }
        if(!/\s/.test(trimmed)){
            var names=Object.keys(commands).concat(['echo']);
            var hit=names.filter(function(n){return n.indexOf(trimmed.toLowerCase())===0;});
            if(hit.length===1)return hit[0];
        }
        return value;
    }
    var TERM_MAX_LINES=200;
    function trimTerminal(){
        while(tbody.children.length>TERM_MAX_LINES){tbody.removeChild(tbody.firstChild)}
    }
    function addPrompt(){
        trimTerminal();
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
            if(e.key==='ArrowUp'){
                if(!cmdHistory.length)return;
                e.preventDefault();
                if(histIdx===-1)histIdx=cmdHistory.length;
                histIdx=Math.max(0,histIdx-1);
                inputEl.value=cmdHistory[histIdx]||'';
                inputEl.setSelectionRange(inputEl.value.length,inputEl.value.length);
                return;
            }
            if(e.key==='ArrowDown'){
                if(histIdx===-1)return;
                e.preventDefault();
                histIdx++;
                if(histIdx>=cmdHistory.length){histIdx=-1;inputEl.value='';}
                else inputEl.value=cmdHistory[histIdx];
                inputEl.setSelectionRange(inputEl.value.length,inputEl.value.length);
                return;
            }
            if(e.key==='Tab'){
                e.preventDefault();
                inputEl.value=completeInput(inputEl.value);
                inputEl.setSelectionRange(inputEl.value.length,inputEl.value.length);
                return;
            }
            if(e.key==='Enter'){
                const cmd=inputEl.value.trim();
                inputEl.disabled=true;
                if(cmd){
                    cmdHistory.push(cmd);
                    if(cmdHistory.length>50)cmdHistory.shift();
                    histIdx=-1;
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
                    outDiv.tabIndex=0;
                    outDiv.setAttribute('role','button');
                    outDiv.setAttribute('aria-label','Command output — press Enter to copy');
                    outDiv.innerHTML=output;
                    tbody.appendChild(outDiv);
                }
                tbody.scrollTop=tbody.scrollHeight;
                addPrompt();
            }
        });
    }
    // Copy terminal output — click or keyboard (Enter/Space on a focused line).
    function copyOutput(output){
        if(!output)return;
        const text=output.textContent.trim();
        if(!text)return;
        if(navigator.clipboard&&typeof navigator.clipboard.writeText==='function'){
            navigator.clipboard.writeText(text).then(showCopyToast).catch(function(){showCopyToast()});
        }else{
            try{var ta=document.createElement('textarea');ta.value=text;ta.className='copy-buffer';ta.setAttribute('aria-hidden','true');document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();showCopyToast()}catch(e){}
        }
    }
    tbody.addEventListener('click',function(e){
        copyOutput(getClosestTarget(e.target,'.term-output'));
    });
    tbody.addEventListener('keydown',function(e){
        if(e.key!=='Enter'&&e.key!==' ')return;
        const output=getClosestTarget(e.target,'.term-output');
        if(!output)return;
        e.preventDefault();
        copyOutput(output);
    });
    function activate(){
        if(active)return;active=true;
        const cursor=tbody.querySelector('.tci');
        if(cursor)cursor.remove();
        if(hint)hint.style.display='none';
        tbody.style.height='auto';
        tbody.style.maxHeight='400px';
        tbody.style.overflowY='auto';
        addPrompt();
    }
    term.addEventListener('click',activate);
    // Activation is scoped to the focused terminal (tabindex=0) so it never
    // hijacks global keystrokes / screen-reader browse-mode keys.
    term.addEventListener('keydown',e=>{
        if(active)return;
        if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();return}
        if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
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
        if(prefersReducedMotion)return;
        const overlay=document.createElement('div');
        overlay.className='matrix-overlay';
        document.body.appendChild(overlay);
        const chars='abcdefghijklmnopqrstuvwxyz0123456789@#$%&*<>/\\|{}[]';
        const cols=Math.floor(window.innerWidth/14);
        for(let i=0;i<cols;i++){
            const col=document.createElement('div');
            col.className='matrix-column';
            col.style.left=i*14+'px';
            col.style.animationDuration=(2+Math.random()*3)+'s';
            col.style.animationDelay=(Math.random()*2)+'s';
            let str='';for(let j=0;j<60;j++)str+=chars[Math.floor(Math.random()*chars.length)];
            col.textContent=str;
            overlay.appendChild(col);
        }
        setTimeout(()=>{overlay.remove()},6000);
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
                const fg=e.target.querySelector('.ring-fg');
                if(fg&&e.target.dataset.ringTarget)fg.style.strokeDashoffset=e.target.dataset.ringTarget;
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
        const existingThumb=card.querySelector('.lc2-thumb');
        if(existingThumb){
            thumbObs.observe(existingThumb);
            return;
        }
        const url=card.href;
        const repo=safeRepo((url.split('sysadmindoc.github.io/')[1]||'').replace(/\/.*$/,''));
        if(!repo)return;
        const thumb=document.createElement('div');
        thumb.className='lc2-thumb';
        thumb.setAttribute('aria-hidden','true');
        thumb.style.aspectRatio='16/10';
        const img=document.createElement('img');
        img.alt='';img.loading='lazy';img.decoding='async';
        img.width=640;img.height=400;
        // Prefer locally-compressed card thumbnail; fall back to opengraph image if missing.
        img.dataset.src='/screenshots/thumbs/'+repo+'.jpg';
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
    let serviceWorkerRefreshRequested=false;
    function showServiceWorkerUpdateToast(worker){
        if(!worker||document.querySelector('.sw-update-toast'))return;
        const toast=document.createElement('div');
        toast.className='sw-update-toast';
        toast.setAttribute('role','status');
        toast.setAttribute('aria-live','polite');
        const message=document.createElement('span');
        message.className='sw-update-message';
        message.innerHTML='<strong>Update ready</strong><span>Refresh to load the newest portfolio build.</span>';
        const actions=document.createElement('div');
        actions.className='sw-update-actions';
        const refresh=document.createElement('button');
        refresh.type='button';
        refresh.textContent='Refresh';
        const dismiss=document.createElement('button');
        dismiss.type='button';
        dismiss.textContent='Later';
        actions.append(refresh,dismiss);
        toast.append(message,actions);
        refresh.addEventListener('click',()=>{
            serviceWorkerRefreshRequested=true;
            refresh.disabled=true;
            message.innerHTML='<strong>Refreshing</strong><span>Loading the newest build now.</span>';
            worker.postMessage({type:'SKIP_WAITING'});
        });
        dismiss.addEventListener('click',()=>{
            toast.classList.remove('show');
            setTimeout(()=>toast.remove(),250);
        });
        document.body.appendChild(toast);
        requestAnimationFrame(()=>toast.classList.add('show'));
    }
    const registerServiceWorker=()=>navigator.serviceWorker.register('/sw.js').then(registration=>{
        if(registration.waiting&&navigator.serviceWorker.controller)showServiceWorkerUpdateToast(registration.waiting);
        registration.addEventListener('updatefound',()=>{
            const worker=registration.installing;
            if(!worker)return;
            worker.addEventListener('statechange',()=>{
                if(worker.state==='installed'&&navigator.serviceWorker.controller)showServiceWorkerUpdateToast(worker);
            });
        });
    }).catch(function(){});
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
        if(!serviceWorkerRefreshRequested)return;
        window.location.reload();
    });
    if(document.readyState==='complete')registerServiceWorker();
    else window.addEventListener('load',registerServiceWorker,{once:true});
}

/* ===== PWA INSTALL PROMPT ===== */
(function(){
    var DISMISS_KEY='pwa_install_dismissed';
    var deferredPrompt=null;
    function isIosDevice(){
        var ua=navigator.userAgent||'';
        return /iPad|iPhone|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    }
    function isStandalone(){
        return (window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;
    }
    function isIosSafari(){
        var ua=navigator.userAgent||'';
        return /Safari/i.test(ua)&&!/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
    }
    function dismissed(){try{return localStorage.getItem(DISMISS_KEY)==='1'}catch(e){return false}}
    function rememberDismiss(){try{localStorage.setItem(DISMISS_KEY,'1')}catch(e){}}
    function canShowInstallPrompt(){
        return !dismissed()&&!isStandalone()&&!document.querySelector('.sw-update-toast');
    }
    function showInstallChip(mode){
        if(!canShowInstallPrompt())return;
        var isIos=mode==='ios';
        var toast=document.createElement('div');
        toast.className='sw-update-toast';
        toast.dataset.kind=isIos?'ios-install':'pwa-install';
        toast.setAttribute('role','status');
        toast.setAttribute('aria-live','polite');
        var message=document.createElement('span');
        message.className='sw-update-message';
        message.innerHTML=isIos
            ? (isIosSafari()
                ? '<strong>Install from Safari</strong><span>Use Share, Add to Home Screen, then Open as Web App.</span>'
                : '<strong>Open in Safari to install</strong><span>Then use Share, Add to Home Screen, and Open as Web App.</span>')
            : '<strong>Install portfolio app</strong><span>Add this static portfolio to your app launcher.</span>';
        var actions=document.createElement('div');
        actions.className='sw-update-actions';
        var install=document.createElement('button');
        install.type='button';
        install.textContent=isIos?'Got it':'Install';
        var dismiss=document.createElement('button');
        dismiss.type='button';
        dismiss.textContent='Not now';
        actions.append(install,dismiss);
        toast.append(message,actions);
        function close(){toast.classList.remove('show');setTimeout(function(){toast.remove()},250)}
        install.addEventListener('click',function(){
            if(isIos){rememberDismiss();close();return}
            if(!deferredPrompt){close();return}
            deferredPrompt.prompt();
            deferredPrompt.userChoice.finally(function(){deferredPrompt=null;close()});
        });
        dismiss.addEventListener('click',function(){rememberDismiss();close()});
        document.body.appendChild(toast);
        requestAnimationFrame(function(){toast.classList.add('show')});
    }
    window.addEventListener('beforeinstallprompt',function(e){
        if(isStandalone())return;
        e.preventDefault();
        deferredPrompt=e;
        if(!dismissed())scheduleIdle(function(){showInstallChip('chromium')},3000);
    });
    window.addEventListener('appinstalled',function(){deferredPrompt=null;rememberDismiss();var t=document.querySelector('.sw-update-toast');if(t)t.remove()});
    function scheduleIosInstallHint(){
        if(!isIosDevice()||isStandalone()||dismissed())return;
        scheduleIdle(function(){showInstallChip('ios')},4500);
    }
    if(document.readyState==='complete')scheduleIosInstallHint();
    else window.addEventListener('load',scheduleIosInstallHint,{once:true});
})();
