/* ===== SHARED UTILITIES =====
 * Loaded before main.js and cmdk.js — defines globals consumed by both. */
var _escMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHTML(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return _escMap[c]; }); }

document.querySelectorAll('link[data-async-style]').forEach(function (link) {
  if (link instanceof HTMLLinkElement && link.media !== 'all') link.media = 'all';
});

function isTextEntryTarget(el) {
  return !!el && (
    el.tagName === 'INPUT'
    || el.tagName === 'TEXTAREA'
    || el.tagName === 'SELECT'
    || el.isContentEditable
  );
}

var prefersReducedMotion = typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
