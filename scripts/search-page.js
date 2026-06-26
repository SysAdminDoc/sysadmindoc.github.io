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

  function waitForPagefind(startedAt) {
    var initial = getInitialQuery();
    var hasComponents = Boolean(window.PagefindComponents);
    var instance = hasComponents ? getInstance() : null;
    if (hasComponents && (!initial || instance)) {
      setSearchState('ready');
      triggerInitialSearch(instance, initial);
      return;
    }
    if (now() - startedAt >= readyTimeoutMs) {
      setSearchState(hasComponents ? 'ready' : 'degraded');
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
