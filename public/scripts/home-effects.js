/* Homepage visual effects: pointer feedback and skill-ring progress. */
(function(){
    'use strict';

    const home=window.PortfolioHome||{};
    const getClosestTarget=home.getClosestTarget||function(target,selector){return target instanceof Element?target.closest(selector):null};

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
