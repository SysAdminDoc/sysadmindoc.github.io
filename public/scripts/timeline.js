(function () {
  var form = document.getElementById('timelineFilters');
  var status = document.getElementById('timelineStatus');
  var reset = document.getElementById('timelineReset');
  var showMoreWrap = document.getElementById('timelineShowMore');
  var showMoreBtn = document.getElementById('timelineShowMoreBtn');
  var events = Array.from(document.querySelectorAll('[data-timeline-event]'));
  if (!form || !status || events.length === 0) return;

  // Track whether the user has expanded the list beyond the initial fold.
  var expanded = false;

  var controls = {
    year: document.getElementById('timelineYear'),
    platform: document.getElementById('timelinePlatform'),
    category: document.getElementById('timelineCategory'),
    language: document.getElementById('timelineLanguage'),
  };

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

  function apply() {
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

    status.textContent = visible + ' of ' + events.length + ' timeline events shown.';

    // Show/hide the "Show more" button.
    if (showMoreWrap) {
      var shouldShowButton = !filterActive && !expanded && hiddenBeyondFold > 0;
      showMoreWrap.hidden = !shouldShowButton;
      if (showMoreBtn && shouldShowButton) {
        showMoreBtn.textContent = 'Show ' + hiddenBeyondFold + ' more events';
      }
    }
  }

  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', function () {
      expanded = true;
      apply();
    });
  }

  form.addEventListener('change', apply);
  if (reset) {
    reset.addEventListener('click', function () {
      Object.keys(controls).forEach(function (key) {
        setValue(key, 'all');
      });
      // Resetting filters collapses back to the fold.
      expanded = false;
      apply();
    });
  }
  apply();
})();
