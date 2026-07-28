(function () {
  var readyTimeoutMs = 4000;
  var retryDelayMs = 100;

  function now() {
    return window.performance && typeof window.performance.now === 'function'
      ? window.performance.now()
      : Date.now();
  }

  function getInitialQuery() {
    var params = new URLSearchParams(window.location.search);
    var initial = params.get('q');
    return initial && initial.trim() ? initial.trim() : '';
  }

  function getInstance() {
    try {
      var manager = window.PagefindComponents && window.PagefindComponents.getInstanceManager();
      return manager && manager.getInstance('default');
    } catch (error) {
      return null;
    }
  }

  function setSearchState(state) {
    var shell = document.querySelector('[data-pagefind-shell]');
    var loading = document.getElementById('pagefindLoading');
    var fallback = document.getElementById('pagefindFallback');
    if (shell) shell.setAttribute('data-pagefind-state', state);
    if (loading) loading.hidden = state !== 'loading';
    if (fallback) fallback.hidden = state !== 'degraded';
  }

  function triggerInitialSearch(instance, initial) {
    if (!initial) return;
    if (instance) instance.triggerSearch(initial);
  }

  // Warm the Pagefind index the moment the visitor shows intent to search
  // (focus or hover) rather than waiting for the first keystroke, so the first
  // query returns without the cold-load delay. Fires once; best-effort.
  function warmIndexOnIntent(instance) {
    if (!instance || typeof instance.triggerLoad !== 'function') return;
    var container = document.getElementById('pagefindSearch');
    var input = container && container.querySelector('input');
    if (!input) return;
    var warmed = false;
    function warm() {
      if (warmed) return;
      warmed = true;
      input.removeEventListener('focus', warm);
      input.removeEventListener('pointerenter', warm);
      try { instance.triggerLoad(); } catch (error) { /* warm-up is best-effort */ }
    }
    input.addEventListener('focus', warm, { once: true });
    input.addEventListener('pointerenter', warm, { once: true });
  }

  function waitForPagefind(startedAt) {
    var initial = getInitialQuery();
    var hasComponents = Boolean(window.PagefindComponents);
    var instance = hasComponents ? getInstance() : null;
    if (hasComponents && instance) {
      setSearchState('ready');
      if (initial) triggerInitialSearch(instance, initial);
      else warmIndexOnIntent(instance);
      return;
    }
    if (now() - startedAt >= readyTimeoutMs) {
      setSearchState('degraded');
      return;
    }
    window.setTimeout(function () {
      waitForPagefind(startedAt);
    }, retryDelayMs);
  }

  function init() {
    setSearchState('loading');
    waitForPagefind(now());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
