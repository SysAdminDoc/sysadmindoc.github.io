/* Relative time rendering for footer freshness + any [data-rel] */
(function(){
  const rel=document.querySelectorAll('[data-rel]');
  if(!rel.length)return;
  const rtf=new Intl.RelativeTimeFormat('en',{numeric:'auto'});
  const units=[['year',31536000],['month',2592000],['day',86400],['hour',3600],['minute',60]];
  rel.forEach(el=>{
    const d=new Date(el.dataset.rel);
    const diff=(d-Date.now())/1000;
    for(const [u,s] of units){
      if(Math.abs(diff)>=s){el.textContent=rtf.format(Math.round(diff/s),u);return}
    }
    el.textContent=rtf.format(Math.round(diff/60),'minute');
  });
})();

/* Theme toggle — dark (default) vs light.
 * Persists to localStorage. Respects prefers-color-scheme only on first visit. */
(function () {
  const KEY = 'theme-pref';
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  const root = document.documentElement;

  function apply(theme) {
    root.dataset.theme = theme;
    btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
    btn.innerHTML = theme === 'dark'
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
  }

  const saved = localStorage.getItem(KEY);
  const initial = saved || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  apply(initial);

  btn.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem(KEY, next); } catch (e) {}
  });
})();
