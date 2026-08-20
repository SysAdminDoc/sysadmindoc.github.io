import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';

const root = process.cwd();

function readScript(name) {
  return fs.readFileSync(path.join(root, 'public', 'scripts', name), 'utf8');
}

// A DOM stub faithful enough that a passing assertion means something: it models
// the handful of APIs these scripts actually touch (queries, classList, dataset,
// attributes, hidden, click listeners) and nothing else, so a script reaching
// for anything unmodelled throws instead of silently no-opping.
function makeElement(attributes = {}, text = '') {
  const classes = new Set((attributes.class || '').split(/\s+/).filter(Boolean));
  const element = {
    attributes: { ...attributes },
    textContent: text,
    hidden: false,
    listeners: {},
    dataset: {},
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
      toggle: (name, force) => {
        const on = force === undefined ? !classes.has(name) : Boolean(force);
        if (on) classes.add(name);
        else classes.delete(name);
        return on;
      },
      get value() {
        return [...classes].join(' ');
      },
    },
    getAttribute: (name) => (name in element.attributes ? element.attributes[name] : null),
    setAttribute: (name, value) => {
      element.attributes[name] = String(value);
    },
    addEventListener: (type, handler) => {
      (element.listeners[type] ||= []).push(handler);
    },
    click: () => (element.listeners.click || []).forEach((handler) => handler.call(element, {})),
  };
  // Mirror data-* into dataset the way the platform does.
  for (const [key, value] of Object.entries(attributes)) {
    if (!key.startsWith('data-')) continue;
    const camel = key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    element.dataset[camel] = value;
  }
  return element;
}

function makeSandbox({ elements = [], byId = {}, href = 'https://example.test/screenshots/' } = {}) {
  const matches = (element, selector) => {
    if (selector === '[data-rel],[data-rel-short]') {
      return 'data-rel' in element.attributes || 'data-rel-short' in element.attributes;
    }
    if (selector === '.screenshots-filter-btn[data-filter]') {
      return element.classList.contains('screenshots-filter-btn') && 'data-filter' in element.attributes;
    }
    if (selector === '[data-category]') return 'data-category' in element.attributes;
    return false;
  };
  const url = new URL(href);
  const replaced = [];
  return {
    console,
    Intl,
    Date,
    URL,
    URLSearchParams,
    Array,
    Math,
    Number,
    String,
    Object,
    replaced,
    document: {
      querySelectorAll: (selector) => elements.filter((element) => matches(element, selector)),
      querySelector: (selector) => elements.find((element) => matches(element, selector)) || null,
      getElementById: (id) => byId[id] || null,
      addEventListener: () => {},
      visibilityState: 'visible',
    },
    history: {
      replaceState: (_state, _title, next) => replaced.push(next),
    },
    window: {
      location: { href: url.href, search: url.search, pathname: url.pathname },
      setTimeout: (fn) => fn(),
      setInterval: () => 0,
      clearInterval: () => {},
    },
    setInterval: () => 0,
    clearInterval: () => {},
  };
}

test('relative-time renders short and long relative labels from data attributes', () => {
  const now = Date.now();
  const short = makeElement({ 'data-rel-short': new Date(now - 3 * 86400000).toISOString() });
  const long = makeElement({ 'data-rel': new Date(now - 2 * 3600000).toISOString() });
  const today = makeElement({ 'data-rel-short': new Date(now - 1000).toISOString() });
  const broken = makeElement({ 'data-rel-short': 'not-a-date' }, 'untouched');

  const sandbox = makeSandbox({ elements: [short, long, today, broken] });
  vm.createContext(sandbox);
  vm.runInContext(readScript('relative-time.js'), sandbox);

  assert.equal(short.textContent, '3d', 'a three-day-old timestamp renders as 3d');
  assert.equal(today.textContent, 'today', 'a timestamp from seconds ago renders as today');
  assert.match(long.textContent, /hour/, 'a long-form timestamp uses Intl relative units');
  assert.equal(broken.textContent, 'untouched', 'an unparseable date must be left alone, not blanked');
});

test('screenshots filtering hides non-matching cards and reports the count', () => {
  const all = makeElement({ class: 'screenshots-filter-btn active', 'data-filter': 'all', 'data-label': 'all live-app screenshots' });
  const web = makeElement({ class: 'screenshots-filter-btn', 'data-filter': 'web', 'data-label': 'Web Apps' });
  const ext = makeElement({ class: 'screenshots-filter-btn', 'data-filter': 'ext', 'data-label': 'Extensions' });
  const cardA = makeElement({ 'data-category': 'web' });
  const cardB = makeElement({ 'data-category': 'web' });
  const cardC = makeElement({ 'data-category': 'ext' });
  const status = makeElement();
  const empty = makeElement();
  empty.hidden = true;

  const sandbox = makeSandbox({
    elements: [all, web, ext, cardA, cardB, cardC],
    byId: { screenshotsStatus: status, screenshotsEmpty: empty },
  });
  vm.createContext(sandbox);
  vm.runInContext(readScript('screenshots-page.js'), sandbox);

  // Initial state: everything visible, and the URL is not rewritten for "all".
  assert.equal(status.textContent, 'Showing all 3 live-app screenshots.');
  assert.equal(cardC.hidden, false);

  ext.click();
  assert.equal(cardA.hidden, true, 'web cards hide when the extensions filter is active');
  assert.equal(cardC.hidden, false, 'extension cards stay visible');
  assert.equal(status.textContent, 'Showing 1 Extensions screenshot.', 'the count is singular for one match');
  assert.equal(ext.getAttribute('aria-pressed'), 'true');
  assert.equal(all.getAttribute('aria-pressed'), 'false');
  assert.equal(empty.hidden, true, 'the empty state stays hidden while results exist');
  assert.ok(
    sandbox.replaced.some((href) => href.includes('cat=ext')),
    'the active filter is reflected in the URL so it can be shared',
  );

  web.click();
  assert.equal(status.textContent, 'Showing 2 Web Apps screenshots.', 'the count is plural for several matches');
});

test('screenshots filtering no-ops when the page renders no filter buttons', () => {
  // All live apps currently share one category, so the page hides the filter
  // group entirely. The script must return before touching anything rather than
  // throwing on the absent status/empty nodes.
  const cardA = makeElement({ 'data-category': 'web' });
  const sandbox = makeSandbox({ elements: [cardA] });
  vm.createContext(sandbox);
  vm.runInContext(readScript('screenshots-page.js'), sandbox);

  assert.equal(cardA.hidden, false, 'cards stay visible when there is nothing to filter by');
  assert.deepEqual(sandbox.replaced, [], 'a dormant filter UI must not rewrite the URL');
});

test('the command palette dataset endpoint keeps its shape and stays within budget', (t) => {
  const built = path.join(root, 'dist', 'cmdk-data.js');
  if (!fs.existsSync(built)) {
    t.skip('dist/cmdk-data.js not built — run npm run build');
    return;
  }
  const source = fs.readFileSync(built, 'utf8');

  // It loads on every page, so a silent size regression is a sitewide cost.
  const sizeKb = Buffer.byteLength(source) / 1024;
  assert.ok(sizeKb < 80, `cmdk-data.js is ${sizeKb.toFixed(1)} KB; budget is 80 KB`);

  assert.match(source, /window\.__PORTFOLIO_DATA/, 'the palette dataset must publish window.__PORTFOLIO_DATA');

  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  const data = sandbox.window.__PORTFOLIO_DATA;
  assert.ok(data && typeof data === 'object', 'the endpoint must evaluate to an object');

  const collections = Object.entries(data).filter(([, value]) => Array.isArray(value));
  assert.ok(collections.length > 0, 'the dataset must expose at least one array collection');
  for (const [key, rows] of collections) {
    assert.ok(rows.length > 0, `${key} must not be empty`);
  }
});
