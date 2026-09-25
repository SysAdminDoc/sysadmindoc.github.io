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
import { cssTokens } from './css-tokens.mjs';

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

// Where a relative reference lands: the site itself, which 'self' covers.
const PAGE_BASE = 'https://self.invalid/page/';
const PAGE_ORIGIN = new URL(PAGE_BASE).origin;
const HOST_SCHEMES = new Set(['http', 'https', 'ws', 'wss']);

/**
 * The host and scheme a reference loads from, or null for the page's own
 * origin or a scheme with no host (data:, blob:, javascript:). Resolved against
 * an https page by the URL parser browsers use, which trims spaces and control
 * characters, drops tabs and newlines, reads a backslash as a slash
 * (seventeenth drain review), and reads `http:host/a.png` or `http:/host/`
 * as http://host/ while `https:host/a.png` stays on the page (nineteenth).
 */
function absoluteTarget(value) {
  let parsed;
  try {
    parsed = new URL(String(value ?? ''), PAGE_BASE);
  } catch {
    return null;
  }
  const scheme = parsed.protocol.slice(0, -1).toLowerCase();
  if (!HOST_SCHEMES.has(scheme) || parsed.origin === PAGE_ORIGIN) return null;
  return { hostname: parsed.hostname.toLowerCase(), scheme };
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

const DECLARATIVE_SHADOW_ROOT = new Set(['shadowrootmode', 'shadowroot']);
const SVG = 'http://www.w3.org/2000/svg';
const XLINK = 'http://www.w3.org/1999/xlink';
// The legacy background attribute browsers still load as an image.
const BACKGROUND_TAGS = new Set(['body', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th']);

/**
 * Every element of a parsed document, depth first. A template's contents live
 * apart from its children in parse5's tree and are left out: they load
 * nothing where they stand, a <script> among them included. The exception is
 * a declarative shadow root (`shadowrootmode`, or `shadowroot` before Chrome
 * 112), which the parser attaches as the host's shadow tree with no script,
 * so what it holds loads (seventeenth drain review).
 */
function* elements(node) {
  for (const child of node.childNodes ?? []) {
    if (!child.tagName) continue;
    yield child;
    yield* elements(child);
    if (child.tagName === 'template' && child.content && (child.attrs ?? []).some((attr) => DECLARATIVE_SHADOW_ROOT.has(attr.name.toLowerCase()))) {
      yield* elements(child.content);
    }
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
 * of those wrong (eighth drain review). A page reads differently with
 * scripting on and off (a <noscript> is raw text to one and markup to the
 * other), and a visitor may have either, so it's read both ways and what
 * either loads counts (seventeenth drain review).
 */
function htmlReferences(html) {
  return [false, true].flatMap((scriptingEnabled) => treeReferences(parse(html, { scriptingEnabled })));
}

function treeReferences(tree) {
  const found = [];
  const add = (kind, url) => {
    const target = absoluteTarget(url);
    if (target) found.push({ kind, ...target });
  };
  for (const element of elements(tree)) {
    const tag = element.tagName.toLowerCase();
    /** @type {Record<string, string>} */
    const attrs = {};
    let xlinkHref;
    for (const attr of element.attrs ?? []) {
      // parse5 names xlink:href `href` in the xlink namespace; kept apart,
      // since SVG loads a plain href over it wherever they stand (nineteenth
      // drain review).
      if (attr.namespace === XLINK && attr.name === 'href') xlinkHref ??= attr.value;
      else attrs[attr.name.toLowerCase()] ??= attr.value;
    }
    const svgHref = element.namespaceURI === SVG ? (attrs.href ?? xlinkHref) : undefined;
    if (BACKGROUND_TAGS.has(tag)) add('img', attrs.background);
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
      // An SVG script loads its href, as HTML's loads src.
      add('script', element.namespaceURI === SVG ? svgHref : attrs.src);
      const type = String(attrs.type ?? '').toLowerCase();
      if (!type.includes('json')) found.push(...scriptReferences(textOf(element)));
    } else if (tag === 'link') {
      const rel = String(attrs.rel ?? '').toLowerCase().split(/\s+/);
      if (rel.includes('stylesheet')) add('style', attrs.href);
      if (rel.some((value) => value === 'icon' || value === 'apple-touch-icon' || value === 'mask-icon')) add('img', attrs.href);
      if (rel.includes('manifest')) add('manifest', attrs.href);
      if (rel.includes('modulepreload')) add('script', attrs.href);
      // Beside prefetch, Firefox treats the link as a prefetch alone
      // (twenty-third drain review), so its `as` counts only for a preload.
      if (rel.includes('preload') && !rel.includes('prefetch')) {
        const kind = PRELOAD_KIND[String(attrs.as ?? '').toLowerCase()];
        if (kind) add(kind, attrs.href);
        if (kind === 'img') for (const url of srcsetUrls(attrs.imagesrcset)) add('img', url);
      }
      // A prefetch ignores its `as`: Firefox 155 checks it against default-src
      // alone, and Chromium 153 lets it through when any directive names the
      // host, so only a default-src host serves both (probed 2026-09-24). No
      // directive lists this kind, so it keeps only default-src hosts in use.
      if (rel.includes('prefetch')) add('prefetch', attrs.href);
    } else if (tag === 'iframe' || tag === 'frame') {
      add('frame', attrs.src);
      // A srcdoc document inherits this page's policy, so what it loads counts here.
      if (attrs.srcdoc !== undefined) found.push(...htmlReferences(attrs.srcdoc));
    } else if ((tag === 'image' || tag === 'feimage') && element.namespaceURI === SVG) {
      add('img', svgHref);
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


const IMAGE_SETS = new Set(['image-set', '-webkit-image-set']);

/**
 * What a stylesheet loads, read from its tokens (scripts/lib/css-tokens.mjs):
 * a url() or its string is a font inside a font-face rule, a stylesheet in
 * an import rule's prelude and an image anywhere else, and image-set() also
 * takes bare strings. The tokenizer resolves escapes, so `url(https\3a //x)` loads from x
 * (seventeenth drain review), and it keeps strings, url() and comments apart
 * as browsers do, which the regexes this replaced didn't (nineteenth and
 * twenty-third).
 */
function cssReferences(css) {
  const found = [];
  const add = (kind, value) => {
    const target = absoluteTarget(value);
    if (target) found.push({ kind, ...target });
  };
  const tokens = cssTokens(css).filter((token) => token.type !== 'whitespace');
  let depth = 0;
  /** @type {number | null} the block depth an @font-face block opened at */
  let fontDepth = null;
  let fontFacePrelude = false;
  let importPrelude = false;
  /** @type {string[]} the functions and brackets open around each token */
  const open = [];
  const kindHere = () => (importPrelude ? 'style' : fontDepth !== null ? 'font' : 'img');
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === 'at-keyword') {
      const name = token.value.toLowerCase();
      fontFacePrelude = name === 'font-face';
      importPrelude = name === 'import';
    } else if (token.type === '{') {
      depth += 1;
      if (fontFacePrelude) fontDepth = depth;
      fontFacePrelude = false;
      importPrelude = false;
    } else if (token.type === '}') {
      if (fontDepth === depth) fontDepth = null;
      depth = Math.max(0, depth - 1);
    } else if (token.type === ';') {
      fontFacePrelude = false;
      importPrelude = false;
    } else if (token.type === 'function') {
      const name = token.value.toLowerCase();
      open.push(name);
      if (name === 'url' && tokens[index + 1]?.type === 'string') add(kindHere(), tokens[index + 1].value);
    } else if (token.type === '(' || token.type === '[') {
      open.push('');
    } else if (token.type === ')' || token.type === ']') {
      open.pop();
    } else if (token.type === 'url') {
      add(kindHere(), token.value);
    } else if (token.type === 'string') {
      if (importPrelude && open.length === 0) add('style', token.value);
      else if (IMAGE_SETS.has(open.at(-1) ?? '')) add(kindHere(), token.value);
    }
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
  // A static import or re-export in a module loads its specifier too. Only
  // where a statement can start (the text's start, a newline, `;`, a brace or
  // a comment's end), so a string or a // comment that reads like one doesn't
  // count, and with a bounded middle that may hold comments and any names, so
  // it runs in linear time: the unbounded one took 19 s over 5,000 spaces
  // (twenty-third drain review).
  [/(?:^|[\n;{}]|\*\/)[\t ]*(?:import|export)\b[^;'"`]{0,500}?\bfrom[\t\n ]*(["'])([^"'\n]+)\1/g, 'script-call'],
  [/(?:^|[\n;{}]|\*\/)[\t ]*import[\t\n ]*(["'])([^"'\n]+)\1/g, 'script-call'],
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
