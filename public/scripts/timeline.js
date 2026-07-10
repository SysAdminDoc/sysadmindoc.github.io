(function () {
  var form = document.getElementById('timelineFilters');
  var status = document.getElementById('timelineStatus');
  var reset = document.getElementById('timelineReset');
  var empty = document.getElementById('timelineEmpty');
  var showMoreWrap = document.getElementById('timelineShowMore');
  var showMoreBtn = document.getElementById('timelineShowMoreBtn');
  var events = Array.from(document.querySelectorAll('[data-timeline-event]'));
  if (!form || !status) return;

  // Track whether the user has expanded the list beyond the initial fold.
  var expanded = false;

  var controls = {
    year: document.getElementById('timelineYear'),
    platform: document.getElementById('timelinePlatform'),
    category: document.getElementById('timelineCategory'),
    language: document.getElementById('timelineLanguage'),
  };
  var filterKeys = Object.keys(controls);

  if (events.length === 0) {
    filterKeys.forEach(function (key) {
      if (controls[key]) controls[key].disabled = true;
    });
    if (reset) reset.disabled = true;
    if (empty) empty.hidden = false;
    if (showMoreWrap) showMoreWrap.hidden = true;
    status.textContent = 'No timeline activity is available yet.';
    return;
  }

  function getValue(key) {
    return controls[key] && controls[key].value ? controls[key].value : 'all';
  }

  function setValue(key, value) {
    var control = controls[key];
    if (!control) return;
    var hasValue = Array.from(control.options).some(function (option) {
      return option.value === value;
    });
    control.value = hasValue ? value : 'all';
  }

  function isFiltered() {
    return (
      getValue('year') !== 'all' ||
      getValue('platform') !== 'all' ||
      getValue('category') !== 'all' ||
      getValue('language') !== 'all'
    );
  }

  function syncUrl(filters) {
    try {
      var url = new URL(window.location.href);
      filterKeys.forEach(function (key) {
        if (filters[key] && filters[key] !== 'all') {
          url.searchParams.set(key, filters[key]);
        } else {
          url.searchParams.delete(key);
        }
      });
      history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
    } catch (error) {}
  }

  function hydrateFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      filterKeys.forEach(function (key) {
        setValue(key, params.get(key) || 'all');
      });
    } catch (error) {}
  }

  function apply(options) {
    options = options || {};
    var filters = {
      year: getValue('year'),
      platform: getValue('platform'),
      category: getValue('category'),
      language: getValue('language'),
    };
    // When any filter is active, show all matching events regardless of fold.
    // When no filter is active and the list is not expanded, respect the fold.
    var filterActive = isFiltered();
    var visible = 0;
    var hiddenBeyondFold = 0;
    events.forEach(function (event) {
      var passesFilter =
        (filters.year === 'all' || event.dataset.year === filters.year) &&
        (filters.platform === 'all' || event.dataset.platform === filters.platform) &&
        (filters.category === 'all' || event.dataset.category === filters.category) &&
        (filters.language === 'all' || event.dataset.language === filters.language);
      var beyondFold = event.hasAttribute('data-beyond-fold');
      var show = passesFilter && (filterActive || expanded || !beyondFold);
      event.hidden = !show;
      if (show) visible += 1;
      if (!filterActive && !expanded && beyondFold && passesFilter) hiddenBeyondFold += 1;
    });

    status.textContent = visible === 0
      ? 'No timeline events match these filters.'
      : visible + ' of ' + events.length + ' timeline events shown.';
    if (empty) empty.hidden = visible !== 0;
    if (reset) reset.disabled = !filterActive && !expanded;
    if (options.syncUrl !== false) syncUrl(filters);

    // Keep the fold control mounted so keyboard focus is never discarded.
    if (showMoreWrap) {
      var hasFoldedEvents = events.some(function (event) {
        return event.hasAttribute('data-beyond-fold');
      });
      var shouldShowButton = !filterActive && hasFoldedEvents;
      showMoreWrap.hidden = !shouldShowButton;
      if (showMoreBtn && shouldShowButton) {
        showMoreBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        showMoreBtn.textContent = expanded
          ? 'Show fewer events'
          : 'Show ' + hiddenBeyondFold + ' more events';
      }
    }
  }

  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', function () {
      expanded = !expanded;
      apply();
    });
  }

  form.addEventListener('change', function () {
    apply();
  });
  if (reset) {
    reset.addEventListener('click', function () {
      filterKeys.forEach(function (key) {
        setValue(key, 'all');
      });
      // Resetting filters collapses back to the fold.
      expanded = false;
      apply();
    });
  }
  hydrateFromUrl();
  apply({ syncUrl: false });
})();
