(function () {
  var buttons = document.querySelectorAll('.screenshots-filter-btn[data-filter]');
  var cards = document.querySelectorAll('[data-category]');
  var status = document.getElementById('screenshotsStatus');
  var empty = document.getElementById('screenshotsEmpty');
  if (!buttons.length || !cards.length) return;

  function findButton(filter) {
    return Array.from(buttons).find(function (button) {
      return button.getAttribute('data-filter') === filter;
    }) || buttons[0];
  }

  function syncUrl(filter) {
    try {
      var url = new URL(window.location.href);
      if (filter && filter !== 'all') url.searchParams.set('cat', filter);
      else url.searchParams.delete('cat');
      history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
    } catch (error) {}
  }

  function applyFilter(filter, options) {
    var activeButton = findButton(filter);
    var activeFilter = activeButton.getAttribute('data-filter') || 'all';
    var label = activeButton.getAttribute('data-label') || activeButton.textContent.trim();
    var visible = 0;

    buttons.forEach(function (button) {
      var active = button === activeButton;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    cards.forEach(function (card) {
      var show = activeFilter === 'all' || card.getAttribute('data-category') === activeFilter;
      card.hidden = !show;
      if (show) visible += 1;
    });

    if (status) {
      status.textContent = activeFilter === 'all'
        ? 'Showing all ' + visible + ' live-app screenshots.'
        : 'Showing ' + visible + ' ' + label + ' screenshot' + (visible === 1 ? '' : 's') + '.';
    }
    if (empty) empty.hidden = visible !== 0;
    if (!options || options.syncUrl !== false) syncUrl(activeFilter);
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyFilter(btn.getAttribute('data-filter') || 'all');
    });
  });

  try {
    var initial = new URLSearchParams(window.location.search).get('cat') || 'all';
    applyFilter(initial, { syncUrl: false });
  } catch (error) {
    applyFilter('all', { syncUrl: false });
  }
})();
