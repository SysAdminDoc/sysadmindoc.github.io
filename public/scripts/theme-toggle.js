/* Theme toggle — dark (default) vs light.
 * Dark is the intentional brand default; the OS prefers-color-scheme is NOT
 * auto-applied on first visit by design. Light is an explicit opt-in via the
 * toggle and is persisted to localStorage.
 *
 * CRITICAL: this script must execute before first paint (loaded in <head>
 * without defer/async) so the saved theme is applied before any content is
 * rendered, preventing a flash of the wrong theme. */
(function () {
  var KEY = 'theme-pref';
  var root = document.documentElement;

  function svgNode(tag, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (name) {
      var value = attrs[name];
      if (value == null || value === false) return;
      node.setAttribute(name, value === true ? '' : String(value));
    });
    return node;
  }

  function moonIcon() {
    var svg = svgNode('svg', { viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': 'true' });
    svg.appendChild(svgNode('path', { d: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z' }));
    return svg;
  }

  function sunIcon() {
    var svg = svgNode('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'aria-hidden': 'true' });
    svg.appendChild(svgNode('circle', { cx: '12', cy: '12', r: '4' }));
    svg.appendChild(svgNode('path', { d: 'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41' }));
    return svg;
  }

  function setIcon(btn, theme) {
    while (btn.firstChild) btn.removeChild(btn.firstChild);
    btn.appendChild(theme === 'dark' ? moonIcon() : sunIcon());
  }

  function apply(theme) {
    root.dataset.theme = theme;
    var nextTheme = theme === 'dark' ? 'light' : 'dark';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#050913' : '#f5f1e8');
    var btn = document.getElementById('themeToggle');
    if (btn) {
      btn.removeAttribute('aria-pressed');
      btn.setAttribute('aria-label', 'Switch to ' + nextTheme + ' theme');
      btn.setAttribute('title', 'Switch to ' + nextTheme + ' theme');
      setIcon(btn, nextTheme);
    }
  }

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  apply(saved === 'light' ? 'light' : 'dark');

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    apply(root.dataset.theme || 'dark');
    btn.addEventListener('click', function () {
      var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
    });
  });
})();
