// Which host sources in a CSP does a built site actually load from?
//
// CSP never complains about an allowance nothing uses. The portfolio kept five
// image CDNs, the GitHub API and YouTube frames in its policy for months after
// the last reference to them was gone, so each was an opening kept for nothing.
// This reads a built site and reports every host source that no built file
// loads a resource of the matching kind from.
//
// References are matched by kind, so a plain link to github.com doesn't keep
// `img-src https://github.com` alive, and a CSS font doesn't keep an image host
// alive. Scripts are read strictly: a host counts for connect, script, worker
// or child sources only where a script passes it as a string literal to a
// loading call (fetch, import, a Worker, an EventSource and so on). A host that
// a script only reaches through a URL it builds at run time reads as unused;
// name it in the call if the policy needs it. frame-ancestors can't be checked
// from the build (it names who may embed the site) and is skipped.
import fs from 'node:fs/promises';
import path from 'node:path';

const KINDS_BY_DIRECTIVE = {
  'img-src': ['img'],
  'media-src': ['media'],
  'font-src': ['font'],
  'style-src': ['style'],
  'style-src-elem': ['style'],
  'script-src': ['script', 'script-call'],
  'script-src-elem': ['script', 'script-call'],
  'connect-src': ['connect'],
  'worker-src': ['worker'],
  'child-src': ['frame', 'worker'],
  'frame-src': ['frame'],
  'object-src': ['object'],
  'manifest-src': ['manifest'],
  'form-action': ['form'],
  'base-uri': ['base'],
};

const TEXT_FILE = /\.(?:html?|css|m?js|json|webmanifest|svg|xml)$/i;

/** A host source such as `https://cdn.example.com` or `*.example.com`; null for keywords and schemes. */
export function parseHostSource(token) {
  if (token.startsWith("'") || /^[a-z][a-z0-9+.-]*:$/i.test(token) || token === '*') return null;
  const match = token.match(/^(?:[a-z][a-z0-9+.-]*:\/\/)?(\*\.)?([^/:*]+)(?::(?:\d+|\*))?(?:\/.*)?$/i);
  if (!match) return null;
  const wildcard = Boolean(match[1]);
  const host = match[2].toLowerCase();
  return { token, matches: (hostname) => (wildcard ? hostname.endsWith(`.${host}`) : hostname === host) };
}

function absoluteHostname(value) {
  const url = String(value ?? '').trim();
  if (!/^(?:(?:https?|wss?):)?\/\//i.test(url)) return null;
  try {
    return new URL(url, 'https://self.invalid/').hostname.toLowerCase();
  } catch {
    return null;
  }
}

function attributes(tagSource) {
  const attrs = {};
  for (const match of tagSource.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function srcsetUrls(value) {
  return String(value ?? '')
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean);
}

// A preload's `as` decides what it loads; an unknown value is not guessed at.
const PRELOAD_KIND = {
  image: 'img',
  font: 'font',
  style: 'style',
  script: 'script',
  fetch: 'connect',
  audio: 'media',
  video: 'media',
  track: 'media',
  worker: 'worker',
  sharedworker: 'worker',
  document: 'frame',
};

function htmlReferences(html) {
  const found = [];
  const add = (kind, url) => {
    const hostname = absoluteHostname(url);
    if (hostname) found.push({ kind, hostname });
  };
  const body = html
    .replace(/<!--[\s\S]*?-->/g, '')
    // Markup inside these is text, or inert until a script clones it, so it
    // loads nothing where it stands.
    .replace(/<(template|textarea|title)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?Content-Security-Policy["']?[^>]*>/gi, '');
  // A quoted attribute value may hold a '>', as in alt="a > b", so the tag runs
  // to the first '>' outside quotes.
  for (const match of body.matchAll(/<(img|source|input|button|video|audio|track|script|link|iframe|frame|embed|object|form|a|area|base)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)) {
    const tag = match[1].toLowerCase();
    const attrs = attributes(match[2]);
    if (tag === 'img' || tag === 'input') {
      add('img', attrs.src);
      for (const url of srcsetUrls(attrs.srcset)) add('img', url);
    }
    if (tag === 'input' || tag === 'button') add('form', attrs.formaction);
    if (tag === 'source') {
      for (const url of srcsetUrls(attrs.srcset)) add('img', url);
      add('media', attrs.src);
    } else if (tag === 'video') {
      add('img', attrs.poster);
      add('media', attrs.src);
    } else if (tag === 'audio' || tag === 'track') {
      add('media', attrs.src);
    } else if (tag === 'script') {
      add('script', attrs.src);
    } else if (tag === 'link') {
      const rel = String(attrs.rel ?? '').toLowerCase().split(/\s+/);
      if (rel.includes('stylesheet')) add('style', attrs.href);
      if (rel.some((value) => value === 'icon' || value === 'apple-touch-icon' || value === 'mask-icon')) add('img', attrs.href);
      if (rel.includes('manifest')) add('manifest', attrs.href);
      if (rel.includes('modulepreload')) add('script', attrs.href);
      if (rel.includes('preload') || rel.includes('prefetch')) {
        const kind = PRELOAD_KIND[String(attrs.as ?? '').toLowerCase()];
        if (kind) add(kind, attrs.href);
        if (kind === 'img') for (const url of srcsetUrls(attrs.imagesrcset)) add('img', url);
      }
    } else if (tag === 'iframe' || tag === 'frame') {
      add('frame', attrs.src);
    } else if (tag === 'embed' || tag === 'object') {
      add('object', attrs.src ?? attrs.data);
    } else if (tag === 'form') {
      add('form', attrs.action);
    } else if (tag === 'a' || tag === 'area') {
      // A hyperlink loads nothing into the page, but its ping is a connection.
      for (const url of String(attrs.ping ?? '').split(/\s+/)) add('connect', url);
    } else if (tag === 'base') {
      add('base', attrs.href);
    }
  }
  for (const match of body.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) found.push(...cssReferences(match[1]));
  for (const match of body.matchAll(/\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) found.push(...cssReferences(match[1] ?? match[2]));
  for (const match of body.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const type = String(attributes(match[1]).type ?? '').toLowerCase();
    if (!type.includes('json')) found.push(...scriptReferences(match[2]));
  }
  return found;
}

const CSS_URL = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi;

function cssReferences(css) {
  const found = [];
  const add = (kind, value) => {
    const hostname = absoluteHostname(value);
    if (hostname) found.push({ kind, hostname });
  };
  let rest = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
  // Fonts first, so a font's url() never counts as an image.
  rest = rest.replace(/@font-face\s*\{[^}]*\}/gi, (block) => {
    for (const match of block.matchAll(CSS_URL)) add('font', match[1] ?? match[2] ?? match[3]);
    return '';
  });
  // @import takes a quoted string or url(), and url() may leave its URL unquoted.
  rest = rest.replace(/@import\s+(?:url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)|"([^"]*)"|'([^']*)')/gi, (...args) => {
    add('style', args.slice(1, 6).find((value) => value !== undefined));
    return '';
  });
  for (const match of rest.matchAll(CSS_URL)) add('img', match[1] ?? match[2] ?? match[3]);
  // image-set() also takes bare quoted URLs, without url().
  for (const set of rest.matchAll(/image-set\(([^)]*(?:\([^)]*\)[^)]*)*)\)/gi)) {
    for (const quoted of set[1].matchAll(/(?<!url\(\s*)["']([^"']+)["']/gi)) add('img', quoted[1]);
  }
  return found;
}

// A string literal passed straight to a call that loads something. WebSocket
// URLs are ws: or wss:, which absoluteHostname accepts beside http(s).
/** @type {Array<[RegExp, string]>} */
const LOADING_CALLS = [
  [/\b(?:fetch|sendBeacon)\s*\(\s*(["'`])([^"'`]+)\1/g, 'connect'],
  [/\bnew\s+(?:EventSource|WebSocket)\s*\(\s*(["'`])([^"'`]+)\1/g, 'connect'],
  [/\.open\s*\(\s*(["'`])[A-Za-z]+\1\s*,\s*(["'`])([^"'`]+)\2/g, 'connect'],
  [/\bimport\s*\(\s*(["'`])([^"'`]+)\1/g, 'script-call'],
  [/\bimportScripts\s*\(\s*(["'`])([^"'`]+)\1/g, 'script-call'],
  [/\bnew\s+(?:Shared)?Worker\s*\(\s*(["'`])([^"'`]+)\1/g, 'worker'],
];

function scriptReferences(js) {
  const found = [];
  const text = String(js);
  for (const [pattern, kind] of LOADING_CALLS) {
    for (const match of text.matchAll(pattern)) {
      const hostname = absoluteHostname(match.at(-1));
      if (hostname) found.push({ kind, hostname });
    }
  }
  return found;
}

async function builtFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await builtFiles(full)));
    else if (TEXT_FILE.test(entry.name)) files.push(full);
  }
  return files;
}

/** Every resource reference with an absolute host in the built site, as { kind, hostname }. */
export async function collectHostReferences(distDir) {
  const references = [];
  for (const file of await builtFiles(distDir)) {
    const text = await fs.readFile(file, 'utf8');
    if (/\.html?$/i.test(file)) references.push(...htmlReferences(text));
    else if (/\.css$/i.test(file)) references.push(...cssReferences(text));
    else if (/\.m?js$/i.test(file)) references.push(...scriptReferences(text));
  }
  return references;
}

/**
 * Host sources in `directives` (a Map of directive name to tokens) that no
 * built reference of a matching kind uses. default-src hosts count as used by
 * a reference of any kind.
 */
export function unusedHostSources(directives, references) {
  const unused = [];
  for (const [directive, tokens] of directives) {
    const kinds = directive === 'default-src' ? null : KINDS_BY_DIRECTIVE[directive];
    if (kinds === undefined) continue;
    for (const token of tokens) {
      const source = parseHostSource(token);
      if (!source) continue;
      const used = references.some((reference) => (!kinds || kinds.includes(reference.kind)) && source.matches(reference.hostname));
      if (!used) unused.push({ directive, token });
    }
  }
  return unused;
}
