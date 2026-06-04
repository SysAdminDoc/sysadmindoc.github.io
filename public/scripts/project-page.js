(function () {
  var project = document.querySelector('[data-project-slug]');
  var slug = project ? project.getAttribute('data-project-slug') : '';
  if (!slug) return;

  try {
    var key = 'recently_viewed';
    var list = JSON.parse(localStorage.getItem(key) || '[]');
    list = (Array.isArray(list) ? list : []).filter(function (item) {
      return item !== slug;
    });
    list.unshift(slug);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 8)));
  } catch (error) {
    /* Storage may be unavailable in hardened browser modes. */
  }
})();
