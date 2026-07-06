/* Homepage GitHub freshness, live app status, catalog stars, and language donut. */
(function(){
    'use strict';

    if(!document.getElementById('statRepos')&&!document.getElementById('langDonut')&&!document.getElementById('live'))return;

    const home=window.PortfolioHome||{};
    const safeText=home.safeText||function(s){return String(s==null?'':s)};
    const readJsonCache=home.readJsonCache||function(){return null};
    const writeJsonCache=home.writeJsonCache||function(){};
    const isFreshCache=home.isFreshCache||function(){return false};
    const scheduleIdle=home.scheduleIdle||function(fn){setTimeout(fn,0)};
    const fetchWithTimeout=home.fetchWithTimeout||function(resource,options){return fetch(resource,options)};
    const updateFilterCounts=home.updateFilterCounts||function(){};
    const dom=window.SafeDOM||{};
    const replaceChildren=dom.replaceChildren||function(node){
        while(node.firstChild)node.removeChild(node.firstChild);
        for(let i=1;i<arguments.length;i++){if(arguments[i])node.appendChild(arguments[i])}
    };
    const svgNode=dom.svgNode||function(tag,attrs){
        const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
        Object.keys(attrs||{}).forEach(function(name){
            const value=attrs[name];
            if(value!=null&&value!==false)node.setAttribute(name,value===true?'':String(value));
        });
        return node;
    };

    const GITHUB_CACHE_KEY='gh_cache';
    const GITHUB_CACHE_TTL=21600000;
    const LIVE_STATUS_CACHE_KEY='live_status_cache';
    const LIVE_STATUS_CACHE_TTL=900000;
    let ghData={};

    function createStarIcon(){
        const svg=svgNode('svg',{viewBox:'0 0 16 16','aria-hidden':'true'});
        svg.appendChild(svgNode('path',{d:'M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z'}));
        return svg;
    }

    function getFallbackRepoCount(){
        const injected=window.__PORTFOLIO_DATA&&Array.isArray(window.__PORTFOLIO_DATA.allProjects)?window.__PORTFOLIO_DATA.allProjects.length:0;
        if(injected>0)return injected;
        const repos=new Set();
        document.querySelectorAll('[data-repo]').forEach(el=>{
            const repo=el instanceof HTMLElement&&home.safeRepo?home.safeRepo(el.dataset.repo):String(el.dataset.repo||'').replace(/[^A-Za-z0-9._-]/g,'');
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
                if(cached)writeJsonCache(GITHUB_CACHE_KEY,{...cached,ts:Date.now()});
                return;
            }
            const allRepos=result.repos;
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
            const skipAggregate=hasBaked&&baked.repos===projectCount&&baked.stars===totalStars;
            applyGitHubData(projectCount,totalStars,langCount,{skipAggregate});
        }catch(e){
            if(!cached&&!hasBaked){
                const sr=document.getElementById('statRepos');
                const fallbackCount=getFallbackRepoCount();
                if(sr&&sr.textContent==='--'&&fallbackCount>0)sr.textContent=String(fallbackCount);
            }
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
    }

    function applyGitHubData(repoCount,totalStars,langCount,opts){
        opts=opts||{};
        syncAggregateStats(repoCount,totalStars,!opts.skipAggregate);
        const liveApps=document.querySelectorAll('#live .lc2').length;
        const sl=document.getElementById('statLive');if(sl)sl.textContent=liveApps;
        document.querySelectorAll('.live-star').forEach(el=>{
            const card=el.closest('[data-repo]');
            if(card&&ghData[card.dataset.repo]){
                const s=ghData[card.dataset.repo].stars;
                const parent=el.closest('.ca-stars');
                el.textContent=s>0?s:'';
                if(parent)parent.classList.toggle('ca-stars-empty',s===0);
            }});
        document.querySelectorAll('.ca[data-repo]').forEach(el=>{
            if(ghData[el.dataset.repo]){
                const s=ghData[el.dataset.repo].stars;
                el.dataset.stars=s;
                el.dataset.updated=ghData[el.dataset.repo].updated;
                if(s>0&&!el.querySelector('.ca-stars')){
                    const badge=document.createElement('span');
                    badge.className='ca-stars';
                    replaceChildren(badge,createStarIcon(),document.createTextNode(String(s)));
                    el.appendChild(badge)}}});
        const countAll=document.getElementById('countAll');
        if(countAll){
            const totalCatalog=document.querySelectorAll('#catalogGrid .ca').length;
            countAll.textContent=totalCatalog;
        }
        updateFilterCounts();
        document.querySelectorAll('.shimmer-load').forEach(el=>el.classList.remove('shimmer-load'));
        document.querySelectorAll('.ca[data-repo]').forEach(el=>{
            if(parseInt(el.dataset.stars)>=5)el.classList.add('starred');
        });
        const portfolioLangs=getPortfolioLanguageSummary();
        if(portfolioLangs)renderLangDonut(portfolioLangs.langs,portfolioLangs.total);
        else if(langCount)renderLangDonut(langCount,countLanguageTotal(langCount)||repoCount);
    }

    function renderLangDonut(langCount,repoCount){
        const wrap=document.getElementById('langDonut');
        if(!wrap||!langCount)return;
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
        const svg=svgNode('svg',{viewBox:'0 0 180 180'});
        let offset=0;
        top.forEach(function(entry){
            var lang=entry[0],count=entry[1];
            var pct=count/total;
            var arcLen=Math.max(pct*circ-gap,0);
            var color=colors[lang]||'#7080a0';
            svg.appendChild(svgNode('circle',{
                cx:'90',
                cy:'90',
                r:String(radius),
                stroke:color,
                'stroke-dasharray':arcLen.toFixed(1)+' '+(circ-arcLen).toFixed(1),
                'stroke-dashoffset':(-offset).toFixed(1),
                opacity:'.85'
            }));
            offset+=pct*circ;
        });
        const legend=document.createElement('div');
        legend.className='lang-legend';
        top.forEach(function(entry){
            var lang=entry[0],count=entry[1];
            var pct=Math.round(count/total*100);
            var tone=colorClasses[lang]||'other';
            const item=document.createElement('div');
            item.className='lang-legend-item';
            const dot=document.createElement('span');
            dot.className='lang-legend-dot lang-tone-'+tone;
            const pctNode=document.createElement('span');
            pctNode.className='lang-legend-pct';
            pctNode.textContent=pct+'%';
            item.appendChild(dot);
            item.appendChild(document.createTextNode(String(lang)));
            item.appendChild(pctNode);
            legend.appendChild(item);
        });
        const lead=top[0];
        const leadLang=lead?lead[0]:'Mixed';
        const leadPct=lead?Math.round(lead[1]/total*100):0;
        const panel=document.createElement('div');
        panel.className='lang-donut-panel';
        const head=document.createElement('div');
        head.className='lang-donut-head';
        const kicker=document.createElement('div');
        kicker.className='lang-donut-kicker';
        kicker.textContent='Project Mix';
        const copy=document.createElement('p');
        copy.className='lang-donut-copy';
        copy.textContent=String(leadLang)+' leads the public archive at '+leadPct+'% of projects, with the rest spread across desktop, web, and Android tooling.';
        head.appendChild(kicker);
        head.appendChild(copy);
        const shell=document.createElement('div');
        shell.className='lang-donut-shell';
        const donut=document.createElement('div');
        donut.className='lang-donut';
        const center=document.createElement('div');
        center.className='lang-donut-center';
        const totalNode=document.createElement('div');
        totalNode.className='donut-total';
        totalNode.textContent=String(total);
        const label=document.createElement('div');
        label.className='donut-label';
        label.textContent='projects';
        center.appendChild(totalNode);
        center.appendChild(label);
        donut.appendChild(svg);
        donut.appendChild(center);
        shell.appendChild(donut);
        shell.appendChild(legend);
        panel.appendChild(head);
        panel.appendChild(shell);
        replaceChildren(wrap,panel);
    }

    (function(){
        const conn=navigator.connection||navigator.webkitConnection;
        const metered=conn&&(conn.saveData===true||/(^|\b)(slow-2g|2g)$/.test(conn.effectiveType||''));
        if(!metered)scheduleIdle(fetchGitHub,1200);
    })();

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
})();
