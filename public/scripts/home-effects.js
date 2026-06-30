/* Homepage visual effects: ripples, skill rings, and the hidden matrix overlay. */
(function(){
    'use strict';

    const home=window.PortfolioHome||{};
    const getClosestTarget=home.getClosestTarget||function(target,selector){return target instanceof Element?target.closest(selector):null};

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

    (function(){
        const rings=document.querySelectorAll('.sk-ring');
        if(!rings.length)return;
        if(!('IntersectionObserver' in window)){
            rings.forEach(r=>{
                const fg=r.querySelector('.ring-fg');
                if(fg&&r.dataset.ringTarget)fg.style.strokeDashoffset=r.dataset.ringTarget;
                r.classList.add('drawn');
            });
            return;
        }
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
})();
