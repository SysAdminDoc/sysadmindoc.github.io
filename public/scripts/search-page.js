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

  function syncQueryToUrl(value) {
    var url = new URL(window.location.href);
    var query = value.trim();
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }

  function connectSearchState(instance, initial) {
    var shell = document.querySelector('[data-pagefind-shell]');
    var container = document.getElementById('pagefindSearch');
    var empty = document.getElementById('pagefindEmpty');
    var reset = document.getElementById('pagefindEmptyReset');
    var input = null;
    var initialPending = initial;
    if (!shell || !container || !empty) return;

    function handleInput(event) {
      input = event.currentTarget;
      initialPending = '';
      syncQueryToUrl(input.value);
      updateEmptyState();
    }

    function bindInput() {
      var nextInput = container.querySelector('input');
      if (nextInput && nextInput !== input) {
        input = nextInput;
        input.addEventListener('input', handleInput);
      }
      if (input && initialPending && input.value !== initialPending) input.value = initialPending;
      return input;
    }

    function updateEmptyState() {
      var currentInput = bindInput();
      var summary = container.querySelector('pagefind-summary');
      var isEmpty = Boolean(currentInput && currentInput.value.trim() && summary && /^No results\b/i.test(summary.textContent.trim()));
      shell.setAttribute('data-pagefind-empty', isEmpty ? 'true' : 'false');
      empty.hidden = !isEmpty;
    }

    if (reset) {
      reset.addEventListener('click', function () {
        var currentInput = bindInput();
        if (!currentInput) return;
        initialPending = '';
        currentInput.value = '';
        syncQueryToUrl('');
        if (instance) instance.triggerSearch('');
        updateEmptyState();
        currentInput.focus();
      });
    }

    var observer = new MutationObserver(updateEmptyState);
    observer.observe(container, { childList: true, subtree: true, characterData: true });
    updateEmptyState();
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
      connectSearchState(instance, initial);
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
