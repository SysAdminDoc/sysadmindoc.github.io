(function () {
  var form = document.getElementById('timelineFilters');
  var status = document.getElementById('timelineStatus');
  var reset = document.getElementById('timelineReset');
  var events = Array.from(document.querySelectorAll('[data-timeline-event]'));
  if (!form || !status || events.length === 0) return;

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

  function apply() {
    var filters = {
      year: getValue('year'),
      platform: getValue('platform'),
      category: getValue('category'),
      language: getValue('language'),
    };
    var visible = 0;
    events.forEach(function (event) {
      var show =
        (filters.year === 'all' || event.dataset.year === filters.year) &&
        (filters.platform === 'all' || event.dataset.platform === filters.platform) &&
        (filters.category === 'all' || event.dataset.category === filters.category) &&
        (filters.language === 'all' || event.dataset.language === filters.language);
      event.hidden = !show;
      if (show) visible += 1;
    });
    status.textContent = visible + ' of ' + events.length + ' timeline events shown.';
  }

  form.addEventListener('change', apply);
  if (reset) {
    reset.addEventListener('click', function () {
      Object.keys(controls).forEach(function (key) {
        setValue(key, 'all');
      });
      apply();
    });
  }
  apply();
})();
