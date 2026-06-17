/* ===== COMMAND PALETTE LOADER =====
 * Keeps the full command-palette controller off the initial parse path. */
(function(){
  const SCRIPT_SRC = '/scripts/cmdk.js';
  let loading = null;

  function getApi() {
    return window.__PORTFOLIO_CMDK;
  }

  function setLoadingState(isLoading) {
    const toggle = document.getElementById('cmdkToggle');
    if (!toggle) return;
    if (isLoading) {
      toggle.setAttribute('aria-busy', 'true');
    } else {
      toggle.removeAttribute('aria-busy');
    }
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
          resolve(loadedApi);
        } else {
          reject(new Error('Command palette failed to initialize.'));
        }
      }, { once: true });
      script.addEventListener('error', () => {
        setLoadingState(false);
        loading = null;
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
    loadPalette()
      .then(loadedApi => {
        if (loadedApi && typeof loadedApi.open === 'function') loadedApi.open();
      })
      .catch(() => setLoadingState(false));
  }

  const toggle = document.getElementById('cmdkToggle');
  toggle?.addEventListener('click', event => {
    if (getApi()) return;
    event.preventDefault();
    openPalette();
  });
})();
