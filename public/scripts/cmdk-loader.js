/* ===== COMMAND PALETTE LOADER =====
 * Keeps the palette off the initial parse path: its project dataset
 * (/cmdk-data.js, about 60 KB) and its controller load only when someone heads
 * for the search button, the dataset first because the controller reads it. */
(function(){
  const SCRIPT_SRC = '/scripts/cmdk.js';
  const DATA_SRC = '/cmdk-data.js';
  let loading = null;
  let dataLoading = null;
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

  function injectScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.addEventListener('load', () => resolve(script), { once: true });
      script.addEventListener('error', () => {
        script.remove();
        reject(new Error('Command palette script failed to load: ' + src));
      }, { once: true });
      document.head.appendChild(script);
    });
  }

  function hasData() {
    const data = window.__PORTFOLIO_DATA;
    return Boolean(data && Array.isArray(data.allProjects));
  }

  function loadData() {
    if (hasData()) return Promise.resolve();
    if (!dataLoading) {
      dataLoading = injectScript(DATA_SRC).then(() => undefined, (error) => {
        dataLoading = null;
        throw error;
      });
    }
    return dataLoading;
  }

  function loadPalette() {
    const api = getApi();
    if (api) return Promise.resolve(api);
    if (loading) return loading;
    setLoadingState(true);
    loading = loadData()
      .then(() => injectScript(SCRIPT_SRC))
      .then((script) => {
        setLoadingState(false);
        const loadedApi = getApi();
        if (loadedApi) {
          clearErrorState();
          return loadedApi;
        }
        loading = null;
        script.remove();
        throw new Error('Command palette failed to initialize.');
      }, (error) => {
        setLoadingState(false);
        loading = null;
        throw error;
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

  // Start on the dataset as soon as someone points at or tabs to the button, so
  // the first open rarely waits for it. A failure here is retried on click.
  function prefetchData() {
    loadData().catch(() => {});
  }
  toggle?.addEventListener('pointerenter', prefetchData, { once: true });
  toggle?.addEventListener('focus', prefetchData, { once: true });

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
