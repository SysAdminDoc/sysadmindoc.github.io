/* ===== SHARED UTILITIES =====
 * Loaded before main.js and cmdk.js — defines globals consumed by both. */
var _escMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHTML(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return _escMap[c]; }); }

function safeAppend(parent) {
  if (!parent) return;
  for (var i = 1; i < arguments.length; i++) {
    var child = arguments[i];
    if (child == null || child === false) continue;
    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

function safeReplaceChildren(parent) {
  if (!parent) return;
  while (parent.firstChild) parent.removeChild(parent.firstChild);
  var children = Array.prototype.slice.call(arguments, 1);
  safeAppend.apply(null, [parent].concat(children));
}

function appendHighlightedText(parent, text, query) {
  if (!parent) return;
  var value = String(text == null ? '' : text);
  var needle = String(query == null ? '' : query).trim();
  if (!needle) {
    parent.appendChild(document.createTextNode(value));
    return;
  }
  var index = value.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) {
    parent.appendChild(document.createTextNode(value));
    return;
  }
  parent.appendChild(document.createTextNode(value.slice(0, index)));
  var mark = document.createElement('mark');
  mark.textContent = value.slice(index, index + needle.length);
  parent.appendChild(mark);
  parent.appendChild(document.createTextNode(value.slice(index + needle.length)));
}

function svgNode(tag, attrs) {
  var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.keys(attrs || {}).forEach(function (name) {
    var value = attrs[name];
    if (value == null || value === false) return;
    node.setAttribute(name, value === true ? '' : String(value));
  });
  return node;
}

window.SafeDOM = Object.assign(window.SafeDOM || {}, {
  append: safeAppend,
  replaceChildren: safeReplaceChildren,
  appendHighlightedText,
  svgNode,
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
