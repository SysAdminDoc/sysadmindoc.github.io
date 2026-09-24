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
import { parse } from 'parse5';

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

// CSP Level 3 scheme-part matching, for a source that names its scheme: an
// `https:` source does not allow a `wss:` URL, while a `wss:` source allows
// `https:`. A source with no scheme keeps matching any, as it always has here.
function schemeAllows(sourceScheme, urlScheme) {
  if (!sourceScheme || sourceScheme === urlScheme) return true;
  if (sourceScheme === 'http') return urlScheme === 'https';
  if (sourceScheme === 'ws') return urlScheme === 'wss' || urlScheme === 'http' || urlScheme === 'https';
  if (sourceScheme === 'wss') return urlScheme === 'https';
  return false;
}

/** A host source such as `https://cdn.example.com` or `*.example.com`; null for keywords and schemes. */
export function parseHostSource(token) {
  if (token.startsWith("'") || /^[a-z][a-z0-9+.-]*:$/i.test(token) || token === '*') return null;
  const match = token.match(/^(?:([a-z][a-z0-9+.-]*):\/\/)?(\*\.)?([^/:*]+)(?::(?:\d+|\*))?(?:\/.*)?$/i);
  if (!match) return null;
  const scheme = match[1] ? match[1].toLowerCase() : null;
  const wildcard = Boolean(match[2]);
  const host = match[3].toLowerCase();
  return {
    token,
    matches: (hostname, urlScheme = 'https') =>
      schemeAllows(scheme, urlScheme) && (wildcard ? hostname.endsWith(`.${host}`) : hostname === host),
  };
}

/** The host and scheme of an absolute or protocol-relative URL (which takes https), or null. */
function absoluteTarget(value) {
  const url = String(value ?? '').trim();
  if (!/^(?:(?:https?|wss?):)?\/\//i.test(url)) return null;
  try {
    const parsed = new URL(url, 'https://self.invalid/');
    return { hostname: parsed.hostname.toLowerCase(), scheme: parsed.protocol.slice(0, -1).toLowerCase() };
  } catch {
    return null;
  }
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

/**
 * Every element of a parsed document, depth first. A template's contents live
 * apart from its children in parse5's tree and are left out: they load
 * nothing where they stand, a <script> among them included.
 */
function* elements(node) {
  for (const child of node.childNodes ?? []) {
    if (!child.tagName) continue;
    yield child;
    yield* elements(child);
  }
}

const textOf = (node) => (node.childNodes ?? []).map((child) => (child.nodeName === '#text' ? child.value : '')).join('');

/**
 * What a page loads, read from the tree a browser builds: parse5 tokenizes as
 * the HTML standard does, so comments end where a browser ends them (<!-->,
 * <!--->, --!>), a script's text ends by the script data states, raw-text
 * elements (style, textarea, title, xmp, noframes, noembed, iframe,
 * plaintext) hold text, a tag opener inside an attribute value opens nothing,
 * and nested templates nest. The hand-written tokenizer this replaced got each
 * of those wrong (eighth drain review). It parses with scripting off, so what
 * a <noscript> loads for a visitor without JavaScript counts.
 */
function htmlReferences(html) {
  const found = [];
  const add = (kind, url) => {
    const target = absoluteTarget(url);
    if (target) found.push({ kind, ...target });
  };
  for (const element of elements(parse(html, { scriptingEnabled: false }))) {
    const tag = element.tagName.toLowerCase();
    /** @type {Record<string, string>} */
    const attrs = {};
    for (const attr of element.attrs ?? []) attrs[attr.name.toLowerCase()] ??= attr.value;
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
      const type = String(attrs.type ?? '').toLowerCase();
      if (!type.includes('json')) found.push(...scriptReferences(textOf(element)));
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
    } else if (tag === 'style') {
      found.push(...cssReferences(textOf(element)));
    }
    if (attrs.style !== undefined) found.push(...cssReferences(attrs.style));
  }
  return found;
}

const CSS_URL = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi;

function cssReferences(css) {
  const found = [];
  const add = (kind, value) => {
    const target = absoluteTarget(value);
    if (target) found.push({ kind, ...target });
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
// URLs are ws: or wss:, which absoluteTarget accepts beside http(s).
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
      const target = absoluteTarget(match.at(-1));
      if (target) found.push({ kind, ...target });
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

/** Every resource reference with an absolute host in the built site, as { kind, hostname, scheme }. */
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
      const used = references.some(
        (reference) => (!kinds || kinds.includes(reference.kind)) && source.matches(reference.hostname, reference.scheme),
      );
      if (!used) unused.push({ directive, token });
    }
  }
  return unused;
}
