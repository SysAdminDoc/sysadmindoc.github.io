(function () {
  try {
    var theme = localStorage.getItem('theme-pref');
    var isLight = theme === 'light';
    document.documentElement.dataset.theme = isLight ? 'light' : 'dark';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isLight ? '#f5f1e8' : '#050913');
  } catch (error) {
    document.documentElement.dataset.theme = 'dark';
  }

  document.querySelectorAll('link[data-async-style]').forEach(function (link) {
    if (link instanceof HTMLLinkElement && link.media !== 'all') link.media = 'all';
  });
})();
