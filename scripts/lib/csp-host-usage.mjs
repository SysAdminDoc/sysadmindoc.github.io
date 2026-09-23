// Which host sources in a CSP does a built site actually load from?
//
// CSP never complains about an allowance nothing uses. The portfolio kept five
// image CDNs, the GitHub API and YouTube frames in its policy for months after
// the last reference to them was gone, so each was an opening kept for nothing.
// This reads a built site and reports every host source that no built file
// loads a matching resource from.
//
// References are matched by kind, so a plain link to github.com doesn't keep
// `img-src https://github.com` alive. JavaScript can't be read that precisely:
// an absolute URL in a script counts for the directives scripts use (connect,
// script, worker and child sources), not for images or frames, so a host that
// only script code turns into an <img> would read as unused here.
import fs from 'node:fs/promises';
import path from 'node:path';

const KINDS_BY_DIRECTIVE = {
  'img-src': ['img', 'css-url'],
  'media-src': ['media'],
  'font-src': ['font', 'css-url'],
  'style-src': ['style', 'css-url'],
  'style-src-elem': ['style', 'css-url'],
  'script-src': ['script', 'js-url'],
  'script-src-elem': ['script', 'js-url'],
  'connect-src': ['js-url'],
  'worker-src': ['js-url'],
  'child-src': ['frame', 'js-url'],
  'frame-src': ['frame'],
  'object-src': ['object'],
  'manifest-src': ['manifest'],
  'form-action': ['form'],
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
  if (!/^(?:https?:)?\/\//i.test(url)) return null;
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

const LINK_KIND_BY_AS = { image: 'img', font: 'font', style: 'style', script: 'script', fetch: 'js-url' };

function htmlReferences(html) {
  const found = [];
  const add = (kind, url) => {
    const hostname = absoluteHostname(url);
    if (hostname) found.push({ kind, hostname });
  };
  const body = html.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?Content-Security-Policy["']?[^>]*>/gi, '');
  for (const match of body.matchAll(/<(img|source|input|video|audio|track|script|link|iframe|frame|embed|object|form)\b([^>]*)>/gi)) {
    const tag = match[1].toLowerCase();
    const attrs = attributes(match[2]);
    if (tag === 'img' || tag === 'input') {
      add('img', attrs.src);
      for (const url of srcsetUrls(attrs.srcset)) add('img', url);
    } else if (tag === 'source') {
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
      if (rel.includes('preload') || rel.includes('modulepreload')) {
        add(rel.includes('modulepreload') ? 'script' : LINK_KIND_BY_AS[String(attrs.as ?? '').toLowerCase()] ?? 'js-url', attrs.href);
      }
    } else if (tag === 'iframe' || tag === 'frame') {
      add('frame', attrs.src);
    } else if (tag === 'embed' || tag === 'object') {
      add('object', attrs.src ?? attrs.data);
    } else if (tag === 'form') {
      add('form', attrs.action);
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

function cssReferences(css) {
  const found = [];
  for (const match of String(css).matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)|@import\s+(?:"([^"]*)"|'([^']*)')/gi)) {
    const hostname = absoluteHostname(match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5]);
    if (hostname) found.push({ kind: 'css-url', hostname });
  }
  return found;
}

function scriptReferences(js) {
  const found = [];
  for (const match of String(js).matchAll(/(?:https?:)?\/\/(?:[a-z0-9-]+\.)+[a-z]{2,}(?![a-z0-9-])/gi)) {
    const hostname = absoluteHostname(match[0]);
    if (hostname) found.push({ kind: 'js-url', hostname });
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
