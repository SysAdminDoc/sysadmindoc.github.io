/* Homepage core helpers. Loaded after shared.js and before feature scripts. */
(function(){
    'use strict';

    function safeText(s){return String(s==null?'':s)}
    function safeRepo(s){return String(s==null?'':s).replace(/[^A-Za-z0-9._-]/g,'')}

    var memCache={};
    var hasLS=(function(){try{var k='__ls_probe__';localStorage.setItem(k,'1');localStorage.removeItem(k);return true}catch(e){return false}})();

    function readJsonCache(key){
        if(!hasLS)return Object.prototype.hasOwnProperty.call(memCache,key)?memCache[key]:null;
        try{return JSON.parse(localStorage.getItem(key)||'null')}catch(e){return null}
    }

    function writeJsonCache(key,value){
        if(!hasLS){memCache[key]=value;return}
        try{localStorage.setItem(key,JSON.stringify(value))}catch(e){memCache[key]=value}
    }

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

    function getClosestTarget(target,selector){return target instanceof Element?target.closest(selector):null}

    const copyToast=document.createElement('div');
    copyToast.className='copy-toast';
    copyToast.textContent='Link copied';
    copyToast.setAttribute('role','status');
    copyToast.setAttribute('aria-live','polite');
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

    const footerYear=document.getElementById('footerYear');
    if(footerYear)footerYear.textContent=new Date().getFullYear();

    window.PortfolioHome=Object.assign(window.PortfolioHome||{},{
        safeText,
        safeRepo,
        readJsonCache,
        writeJsonCache,
        isFreshCache,
        scheduleIdle,
        fetchWithTimeout,
        getClosestTarget,
        showCopyToast
    });
})();
