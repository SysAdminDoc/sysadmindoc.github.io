/* Recompute /status/ ages against the viewer's clock.
   A static page bakes its ages at build time, so a deployment that stops being
   rebuilt keeps reporting the age it had when it was published. Every value
   here is derived from a build-stamped ISO timestamp already in the markup —
   nothing is fetched. */
(function () {
  const cards = document.querySelectorAll('[data-freshness-iso]');
  if (!cards.length) return;

  const stalePanel = document.getElementById('status-stale-now');
  const TONES = ['green', 'amber', 'blue'];
  let timer = 0;

  function formatAge(hours) {
    if (hours < 0) return '0.0h';
    if (hours < 48) return hours.toFixed(1) + 'h';
    const days = hours / 24;
    if (days < 60) return days.toFixed(1) + 'd';
    return (days / 30.44).toFixed(1) + 'mo';
  }

  function setTone(card, tone, label) {
    const dot = card.querySelector('.status-dot');
    if (dot) {
      TONES.forEach((t) => dot.classList.remove('status-dot-' + t));
      dot.classList.add('status-dot-' + tone);
    }
    const sr = card.querySelector('.sr-only');
    if (sr) sr.textContent = label;
  }

  function render() {
    let anyStale = false;

    cards.forEach((card) => {
      const parsed = new Date(card.dataset.freshnessIso || '');
      if (Number.isNaN(parsed.getTime())) return;

      const value = card.querySelector('.status-value');
      if (!value) return;

      const hours = (Date.now() - parsed.getTime()) / 3600000;
      const max = Number(card.dataset.freshnessMax || 0);
      const stale = max > 0 && hours > max;

      if (card.dataset.freshness === 'age') {
        value.textContent = formatAge(hours);
        setTone(card, stale ? 'amber' : 'green', stale ? 'Needs attention' : 'Healthy');
        if (stale) anyStale = true;
        return;
      }

      // 'built': keep the calendar date, append how long ago it was published.
      value.textContent = card.dataset.freshnessIso.slice(0, 10) + ' (' + formatAge(hours) + ' ago)';
    });

    if (stalePanel) stalePanel.hidden = !anyStale;
    return anyStale;
  }

  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = 0;
  }

  function start() {
    if (timer || document.visibilityState === 'hidden') return;
    timer = setInterval(render, 60000);
  }

  render();
  start();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      stop();
      return;
    }
    render();
    start();
  });
})();
