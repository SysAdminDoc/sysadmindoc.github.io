/* Homepage video activation and live-app thumbnail hydration. */
(function(){
    'use strict';

    const home=window.PortfolioHome||{};
    const safeRepo=home.safeRepo||function(s){return String(s==null?'':s).replace(/[^A-Za-z0-9._-]/g,'')};
    const svgNode=(window.SafeDOM&&window.SafeDOM.svgNode)||function(tag,attrs){
        const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
        Object.keys(attrs||{}).forEach(function(name){
            const value=attrs[name];
            if(value!=null&&value!==false)node.setAttribute(name,value===true?'':String(value));
        });
        return node;
    };

    function closeIcon(){
        const svg=svgNode('svg',{viewBox:'0 0 24 24',width:'18',height:'18',fill:'none',stroke:'currentColor','stroke-width':'2.2','stroke-linecap':'round','aria-hidden':'true'});
        svg.appendChild(svgNode('line',{x1:'6',y1:'6',x2:'18',y2:'18'}));
        svg.appendChild(svgNode('line',{x1:'6',y1:'18',x2:'18',y2:'6'}));
        return svg;
    }

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
        const closeBtn=document.createElement('button');
        closeBtn.type='button';
        closeBtn.className='video-close';
        closeBtn.setAttribute('aria-label','Close video and return to thumbnail');
        closeBtn.appendChild(closeIcon());
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

    const liveCards=document.querySelectorAll('#live .lc2');
    if(!liveCards.length)return;

    function hydrateThumb(target){
        const img=target.querySelector('img');
        if(img&&img.dataset.src){img.src=img.dataset.src;delete img.dataset.src}
    }

    const thumbObs='IntersectionObserver' in window?new IntersectionObserver(entries=>{
        entries.forEach(e=>{
            if(!e.isIntersecting)return;
            thumbObs.unobserve(e.target);
            hydrateThumb(e.target);
        });
    },{rootMargin:'200px'}):null;

    liveCards.forEach(card=>{
        const existingThumb=card.querySelector('.lc2-thumb');
        if(existingThumb){
            if(thumbObs)thumbObs.observe(existingThumb);else hydrateThumb(existingThumb);
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
        img.alt='';
        img.loading='lazy';
        img.decoding='async';
        img.width=640;
        img.height=400;
        img.dataset.src='/screenshots/thumbs/'+repo+'.jpg';
        img.onerror=function(){
            img.onerror=function(){thumb.classList.add('thumb-fallback');img.remove()};
            img.src='https://opengraph.githubassets.com/1/SysAdminDoc/'+repo;
        };
        thumb.appendChild(img);
        card.insertBefore(thumb,card.firstChild);
        if(thumbObs)thumbObs.observe(thumb);else hydrateThumb(thumb);
    });
})();
