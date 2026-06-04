(function () {
  window.addEventListener('DOMContentLoaded', function () {
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
      manager.getInstance('default').triggerSearch(initial.trim());
    }
  });
})();
