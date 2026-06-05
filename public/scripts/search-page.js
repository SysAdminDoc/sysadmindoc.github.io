(function () {
  function init() {
    var loading = document.getElementById('pagefindLoading');
    if (!window.PagefindComponents) {
      if (loading) {
        loading.textContent = 'Full-text search is available after the static index is generated. Use the fallback links below for now.';
      }
      return;
    }
    if (loading) loading.hidden = true;
    var params = new URLSearchParams(window.location.search);
    var initial = params.get('q');
    if (initial && initial.trim()) {
      var manager = window.PagefindComponents.getInstanceManager();
      var instance = manager && manager.getInstance('default');
      if (instance) instance.triggerSearch(initial.trim());
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
