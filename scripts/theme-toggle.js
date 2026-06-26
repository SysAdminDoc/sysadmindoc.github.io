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

  function apply(theme) {
    root.dataset.theme = theme;
    var nextTheme = theme === 'dark' ? 'light' : 'dark';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#050913' : '#f5f1e8');
    var btn = document.getElementById('themeToggle');
    if (btn) {
      btn.setAttribute('aria-pressed', String(theme === 'light'));
      btn.setAttribute('aria-label', 'Switch to ' + nextTheme + ' theme');
      btn.setAttribute('title', 'Switch to ' + nextTheme + ' theme');
      btn.innerHTML = theme === 'dark'
        ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
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
