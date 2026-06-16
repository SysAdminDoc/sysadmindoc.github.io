/* Shared mobile nav toggle for homepage + secondary routes */
(function(){
  const mobileToggle = document.getElementById('mobileToggle');
  const navLinks = document.getElementById('navLinks');
  const navBackdrop = document.getElementById('navBackdrop');
  if(!mobileToggle || !navLinks) return;
  let previousBodyOverflow = '';
  let previousHtmlOverflow = '';

  var focusableSelector = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';
  function setMobileNav(open){
    navLinks.classList.toggle('open', open);
    if(navBackdrop) navBackdrop.classList.toggle('show', open);
    mobileToggle.setAttribute('aria-expanded', String(open));
    mobileToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    mobileToggle.setAttribute('title', open ? 'Close navigation menu' : 'Open navigation menu');
    if(open){
      previousBodyOverflow = document.body.style.overflow;
      previousHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      var firstLink = navLinks.querySelector('a');
      if(firstLink) firstLink.focus();
      return;
    }
    document.body.style.overflow = previousBodyOverflow;
    document.documentElement.style.overflow = previousHtmlOverflow;
    mobileToggle.focus();
  }

  setMobileNav(false);

  mobileToggle.addEventListener('click', () => {
    setMobileNav(!navLinks.classList.contains('open'));
  });

  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => setMobileNav(false));
  });

  if(navBackdrop){
    navBackdrop.addEventListener('click', () => setMobileNav(false));
  }

  document.addEventListener('click', e => {
    const target = e.target;
    if(!(target instanceof Element)) return;
    if(navLinks.classList.contains('open') && !target.closest('#navLinks') && !target.closest('#mobileToggle') && !target.closest('#navBackdrop')){
      setMobileNav(false);
    }
  });

  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && navLinks.classList.contains('open')){ setMobileNav(false); return; }
    if(e.key === 'Tab' && navLinks.classList.contains('open')){
      // Toggle button sits visually at the top, so it is the first focus stop.
      var focusable = [mobileToggle].concat(Array.from(navLinks.querySelectorAll(focusableSelector)));
      if(!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  });

  window.addEventListener('resize', () => {
    if(window.innerWidth > 900 && navLinks.classList.contains('open')) setMobileNav(false);
  });
})();
