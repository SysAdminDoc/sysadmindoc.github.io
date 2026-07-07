/* Homepage catalog filtering, sorting, URL state, and no-JS search enhancement. */
(function(){
    'use strict';

    const home=window.PortfolioHome=window.PortfolioHome||{};
    const grid=document.getElementById('catalogGrid');
    if(!grid)return;

    const allItems=Array.from(grid.querySelectorAll('.ca'));
    allItems.forEach(item=>{
        const desc=item.querySelector('.cds');
        item.dataset.searchText=(item.dataset.name+' '+(desc?desc.textContent:'')+' '+(item.dataset.terms||'')).toLowerCase();
    });
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
            const searchBody=item.dataset.searchText||'';
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
        const frag=document.createDocumentFragment();
        items.forEach(item=>frag.appendChild(item));
        grid.appendChild(frag);
    }

    function updateFilterCounts(){
        const catalogItems=Array.from(document.querySelectorAll('#catalogGrid .ca'));
        const counts={};
        catalogItems.forEach(item=>{
            const cat=item.dataset.f;
            counts[cat]=(counts[cat]||0)+1;
        });
        document.querySelectorAll('.fc[data-cat]').forEach(el=>{
            const cat=el.dataset.cat;
            if(counts[cat]!==undefined)el.textContent=counts[cat];
        });
        const countAll=document.getElementById('countAll');
        if(countAll)countAll.textContent=catalogItems.length;
    }

    home.updateFilterCounts=updateFilterCounts;
    home.applyCatalogFilters=applyFilters;

    document.querySelectorAll('.catalog-view').forEach(b=>{
        b.setAttribute('aria-pressed',b.classList.contains('act')?'true':'false');
        b.addEventListener('click',()=>{
            currentView=b.dataset.view;
            syncViewButtons();
            applyFilters();
        });
    });

    document.querySelectorAll('.fb[data-filter]').forEach(b=>{
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

    let searchDebounce=0;
    const searchEl=document.getElementById('searchInput');
    if(searchEl)searchEl.addEventListener('input',e=>{currentSearch=e.target.value;clearTimeout(searchDebounce);searchDebounce=setTimeout(applyFilters,80)});
    const catalogSearchForm=document.getElementById('catalogSearchForm');
    if(catalogSearchForm)catalogSearchForm.addEventListener('submit',e=>{e.preventDefault();clearTimeout(searchDebounce);if(searchEl)currentSearch=searchEl.value;applyFilters()});

    const sortEl=document.getElementById('sortSelect');
    if(sortEl)sortEl.addEventListener('change',e=>{currentSort=e.target.value;sortCatalog(currentSort);applyFilters()});

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

    updateFilterCounts();
    applyFilters();
})();
