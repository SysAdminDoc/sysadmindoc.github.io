/* ===== COMMAND PALETTE LOADER =====
 * Keeps the full command-palette controller off the initial parse path. */
(function(){
  const SCRIPT_SRC = '/scripts/cmdk.js';
  let loading = null;
  const toggle = document.getElementById('cmdkToggle');
  const defaultLabel = toggle?.getAttribute('aria-label') || 'Open command search';
  let feedback = null;

  function getApi() {
    return window.__PORTFOLIO_CMDK;
  }

  function setLoadingState(isLoading) {
    if (!toggle) return;
    if (isLoading) {
      toggle.setAttribute('aria-busy', 'true');
      toggle.setAttribute('aria-disabled', 'true');
      toggle.setAttribute('data-load-state', 'loading');
      toggle.setAttribute('aria-label', 'Loading command search');
      toggle.title = 'Loading command search';
    } else {
      toggle.removeAttribute('aria-busy');
      toggle.removeAttribute('aria-disabled');
      if (toggle.getAttribute('data-load-state') === 'loading') {
        toggle.removeAttribute('data-load-state');
        toggle.setAttribute('aria-label', defaultLabel);
        toggle.title = defaultLabel;
      }
    }
  }

  function setFeedback(message) {
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.className = 'cmdk-load-feedback';
      feedback.setAttribute('role', 'status');
      feedback.setAttribute('aria-live', 'polite');
      document.body.appendChild(feedback);
    }
    feedback.textContent = message || '';
  }

  function setErrorState() {
    if (toggle) {
      toggle.setAttribute('data-load-state', 'error');
      toggle.setAttribute('aria-label', 'Retry command search');
      toggle.title = 'Retry command search';
      toggle.focus({ preventScroll: true });
    }
    setFeedback("Command search couldn't load. Try again.");
  }

  function clearErrorState() {
    if (toggle) {
      toggle.removeAttribute('data-load-state');
      toggle.setAttribute('aria-label', defaultLabel);
      toggle.title = defaultLabel;
    }
    setFeedback('');
  }

  function loadPalette() {
    const api = getApi();
    if (api) return Promise.resolve(api);
    if (loading) return loading;
    setLoadingState(true);
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.addEventListener('load', () => {
        setLoadingState(false);
        const loadedApi = getApi();
        if (loadedApi) {
          clearErrorState();
          resolve(loadedApi);
        } else {
          loading = null;
          script.remove();
          reject(new Error('Command palette failed to initialize.'));
        }
      }, { once: true });
      script.addEventListener('error', () => {
        setLoadingState(false);
        loading = null;
        script.remove();
        reject(new Error('Command palette script failed to load.'));
      }, { once: true });
      document.head.appendChild(script);
    });
    return loading;
  }

  function openPalette() {
    const api = getApi();
    if (api) {
      api.open();
      return;
    }
    clearErrorState();
    loadPalette()
      .then(loadedApi => {
        if (loadedApi && typeof loadedApi.open === 'function') loadedApi.open();
      })
      .catch(error => {
        setLoadingState(false);
        setErrorState();
        console.warn('Command search failed to load.', error);
      });
  }

  toggle?.addEventListener('click', event => {
    if (toggle.getAttribute('aria-busy') === 'true') {
      event.preventDefault();
      return;
    }
    if (getApi()) return;
    event.preventDefault();
    openPalette();
  });
})();
