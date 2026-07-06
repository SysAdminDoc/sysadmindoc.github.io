/* Homepage hash restoration, active section state, scroll progress, and nav indicator. */
(function(){
    'use strict';

    const HOMEPAGE_SCROLL_SECTION_SELECTOR='#live,#volume,#catalog,#skills,#career,#journey,#beyond,#connect';
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
                if(window.location.hash!==hash)return;
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

    const home=window.PortfolioHome=window.PortfolioHome||{};
    home.revealHomepageScrollSections=revealHomepageScrollSections;
    home.restoreHomepageHashTarget=restoreHomepageHashTarget;
    home.scheduleHomepageHashRestore=scheduleHomepageHashRestore;
    home.cancelHomepageHashRestore=cancelHomepageHashRestore;

    const secs=document.querySelectorAll('section[id]');
    const nla=document.querySelectorAll('.nk a');
    if('IntersectionObserver' in window&&secs.length&&nla.length){
        const so=new IntersectionObserver(e=>{e.forEach(en=>{if(en.isIntersecting){nla.forEach(a=>a.classList.remove('active'));const a=document.querySelector('.nk a[href="#'+en.target.id+'"]');if(a)a.classList.add('active');if(history.replaceState&&Date.now()>=(window.__PORTFOLIO_SECTION_HASH_LOCK_UNTIL||0)){try{const url=new URL(location.href);const nextHash='#'+en.target.id;if(url.hash!==nextHash){url.hash=nextHash;history.replaceState(null,'',url.pathname+url.search+url.hash)}}catch(err){}}}})},{rootMargin:'-40% 0px -60% 0px'});
        secs.forEach(s=>so.observe(s));
    }

    const scrollProg=document.getElementById('scrollProgress');
    const bttBtn=document.getElementById('backToTop');
    const navEl=document.getElementById('nav');
    let lastScrollY=0;
    let scrollRaf=0;

    if(scrollProg||bttBtn||navEl){
        window.addEventListener('scroll',()=>{
            if(scrollRaf)return;
            scrollRaf=requestAnimationFrame(()=>{
                scrollRaf=0;
                const sy=window.scrollY;
                if(bttBtn)bttBtn.classList.toggle('show',sy>600);
                const max=document.documentElement.scrollHeight-innerHeight;
                const pct=max>0?(sy/max)*100:0;
                if(scrollProg)scrollProg.style.width=pct+'%';
                if(navEl){
                    if(sy>120){
                        if(sy>lastScrollY+5){navEl.classList.add('hid');const navLinks=document.getElementById('navLinks');const mobileToggle=document.getElementById('mobileToggle');if(navLinks&&navLinks.classList.contains('open')){navLinks.classList.remove('open');if(mobileToggle)mobileToggle.setAttribute('aria-expanded','false')}}
                        else if(sy<lastScrollY-5)navEl.classList.remove('hid');
                    }else{navEl.classList.remove('hid')}
                }
                lastScrollY=sy;
            });
        },{passive:true});
    }

    if(bttBtn)bttBtn.addEventListener('click',()=>{window.scrollTo({top:0,behavior:prefersReducedMotion?'auto':'smooth'})});

    const indicator=document.getElementById('navIndicator');
    const navLinksContainer=document.getElementById('navLinks');
    if(!indicator||!navLinksContainer)return;
    navLinksContainer.style.position='relative';
    function moveIndicator(link){
        if(!link||window.innerWidth<=640){indicator.classList.remove('vis');return}
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
