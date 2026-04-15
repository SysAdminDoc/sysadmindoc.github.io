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

/* Theme toggle — dark (default) vs light.
 * Persists to localStorage. Respects prefers-color-scheme only on first visit. */
(function () {
  const KEY = 'theme-pref';
  const btn = document.getElementById('themeToggle');
  const root = document.documentElement;
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');

  function apply(theme) {
    root.dataset.theme = theme;
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    if (themeColorMeta) themeColorMeta.setAttribute('content', theme === 'dark' ? '#050913' : '#f5f1e8');
    if (btn) {
      btn.setAttribute('aria-pressed', String(theme === 'light'));
      btn.setAttribute('aria-label', `Switch to ${nextTheme} theme`);
      btn.setAttribute('title', `Switch to ${nextTheme} theme`);
      btn.innerHTML = theme === 'dark'
        ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
    }
  }

  // Always default to dark. Only honor explicit opt-in via toggle (persisted in localStorage).
  // Respecting prefers-color-scheme would flip users with OS light mode into our
  // incomplete light palette on first paint — visibly broken.
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  apply(saved === 'light' ? 'light' : 'dark');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem(KEY, next); } catch (e) {}
  });
})();

/* Shared mobile nav toggle for homepage + secondary routes */
(function(){
  const mobileToggle = document.getElementById('mobileToggle');
  const navLinks = document.getElementById('navLinks');
  if(!mobileToggle || !navLinks) return;

  function setMobileNav(open){
    navLinks.classList.toggle('open', open);
    mobileToggle.setAttribute('aria-expanded', String(open));
  }

  setMobileNav(false);

  mobileToggle.addEventListener('click', () => {
    setMobileNav(!navLinks.classList.contains('open'));
  });

  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => setMobileNav(false));
  });

  document.addEventListener('click', e => {
    const target = e.target;
    if(!(target instanceof Element)) return;
    if(navLinks.classList.contains('open') && !target.closest('#navLinks') && !target.closest('#mobileToggle')){
      setMobileNav(false);
    }
  });

  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && navLinks.classList.contains('open')) setMobileNav(false);
  });
})();
