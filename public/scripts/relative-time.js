/* Relative time rendering for footer freshness + any [data-rel] */
(function(){
  const rtf=new Intl.RelativeTimeFormat('en',{numeric:'auto'});
  const units=[['year',31536000],['month',2592000],['day',86400],['hour',3600],['minute',60]];
  let timer=0;

  function formatShort(date){
    const diffMs=Date.now()-date.getTime();
    const days=Math.floor(diffMs/86400000);
    if(days<=0)return 'today';
    if(days===1)return '1d';
    if(days<30)return days+'d';
    const months=Math.floor(days/30);
    if(months<12)return months+'mo';
    return Math.floor(days/365)+'y';
  }

  function render(){
    const rel=document.querySelectorAll('[data-rel],[data-rel-short]');
    if(!rel.length)return false;
    rel.forEach(el=>{
      const iso=el.dataset.relShort||el.dataset.rel;
      const d=new Date(iso);
      if(Number.isNaN(d.getTime())) return;
      if(el.dataset.relShort){
        el.textContent=formatShort(d);
        return;
      }
      const diff=(d-Date.now())/1000;
      for(const [u,s] of units){
        if(Math.abs(diff)>=s){el.textContent=rtf.format(Math.round(diff/s),u);return}
      }
      el.textContent=rtf.format(Math.round(diff/60),'minute');
    });
    return true;
  }

  function stop(){
    if(!timer)return;
    clearInterval(timer);
    timer=0;
  }

  function start(){
    if(timer||document.visibilityState==='hidden')return;
    if(!document.querySelector('[data-rel],[data-rel-short]'))return;
    timer=setInterval(render,60000);
  }

  render();
  start();
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'){stop();return;}
    render();
    start();
  });
})();
