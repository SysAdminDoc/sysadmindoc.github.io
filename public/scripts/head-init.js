(function () {
  document.documentElement.classList.add('js');
  try {
    var theme = localStorage.getItem('theme-pref');
    var isLight = theme !== 'dark';
    document.documentElement.dataset.theme = isLight ? 'light' : 'dark';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isLight ? '#f4f0e7' : '#071421');
  } catch (error) {
    document.documentElement.dataset.theme = 'light';
  }

  document.querySelectorAll('link[data-async-style]').forEach(function (link) {
    if (link instanceof HTMLLinkElement && link.media !== 'all') link.media = 'all';
  });
})();
