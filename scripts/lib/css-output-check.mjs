// What a minifier can quietly break in built CSS. With no browser targets,
// lightningcss kept only the -webkit- twin of each backdrop-filter, which
// Chromium and Firefox don't read, and folded animation-timeline into the
// animation shorthand, which Chromium rejects (see scripts/lib/minify-css.mjs).
// CSS names are case-insensitive, and so is every match here: a file copied as
// is, like the offline page's, can spell them any way (twelfth drain review).
import { parse } from 'parse5';

/**
 * CSS text with its escapes resolved the way the tokenizer resolves them
 * (`\6b ` or `\k` is k), so `light-dar\6b(` reads as light-dark( (thirteenth
 * drain review). CSS preprocessing turns CRLF, CR and form feed into one
 * newline first, so a hex escape before CRLF eats both (fifteenth). An escaped
 * newline is dropped, as in a string.
 * @param {string} css
 */
export function unescapeCss(css) {
  return String(css)
    .replace(/\r\n?|\f/g, '\n')
    .replace(/\\(?:([0-9a-fA-F]{1,6})[ \t\n]?|(\n)|([^\n]))/g, (_, hex, newline, char) => {
      if (newline) return '';
      if (char) return char;
      const code = Number.parseInt(hex, 16);
      return code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff) ? String.fromCharCode(0xfffd) : String.fromCodePoint(code);
    });
}

/** A data: URI's body, decoded; bytes that aren't valid UTF-8 percent-escapes come through one by one. */
export function decodeDataUri(uri) {
  const comma = uri.indexOf(',');
  if (comma < 0 || !/^data:/i.test(uri)) return null;
  const meta = uri.slice(5, comma);
  const body = uri.slice(comma + 1);
  let text;
  try {
    text = decodeURIComponent(body);
  } catch {
    text = body.replace(/%([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
  }
  return /;base64$/i.test(meta) ? Buffer.from(text, 'base64').toString('utf8') : text;
}

/**
 * The stylesheets imported as data: URIs, decoded: with or without space or
 * a comment after the at-rule's name, as url() or a string, a quoted one
 * allowed to hold `)` (fifteenth drain review).
 */
function dataImports(css) {
  const found = [];
  const text = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const importRule = /@import\s*(?:url\(\s*(?:"(data:[^"]*)"|'(data:[^']*)'|(data:[^)\s]*))\s*\)|"(data:[^"]*)"|'(data:[^']*)')/gi;
  for (const match of text.matchAll(importRule)) {
    const decoded = decodeDataUri(match.slice(1).find((value) => value !== undefined) ?? '');
    if (decoded !== null) found.push(decoded);
  }
  return found;
}

/**
 * @param {string} css a built stylesheet
 * @returns {{ problems: string[], prefixed: number }} what's wrong, and how many
 *   rule blocks carry a prefixed blur (so a check that saw none can say so)
 */
export function cssOutputProblems(css) {
  const problems = [];
  let prefixed = 0;
  let unpaired = 0;
  const text = unescapeCss(css);
  for (const block of text.match(/\{[^{}]*\}/g) ?? []) {
    if (!/-webkit-backdrop-filter\s*:/i.test(block)) continue;
    prefixed += 1;
    if (!/(?<!-webkit-)backdrop-filter\s*:/i.test(block)) unpaired += 1;
  }
  if (unpaired > 0) {
    problems.push(`${unpaired} rule(s) with -webkit-backdrop-filter but no backdrop-filter, so Chromium and Firefox lose the blur`);
  }
  if (/animation\s*:[^;}]*\b(?:scroll|view)\(/i.test(text)) {
    problems.push('a scroll or view timeline folded into the animation shorthand, which Chromium rejects');
  }
  // The build targets browsers from before light-dark(), which drop it and
  // lose the accent it sets; the minifier lowers every one.
  if (/\blight-dark\(/i.test(text)) {
    problems.push('a light-dark() the minifier left in place, which Chrome and Edge before 123, Safari before 17.5 and Firefox before 120 drop');
  }
  for (const imported of dataImports(text)) {
    for (const problem of cssOutputProblems(imported).problems) problems.push(`in an @import of a data: URI, ${problem}`);
  }
  return { problems, prefixed };
}

/**
 * JavaScript text with its string escapes resolved (\x28, (, \u{28}),
 * so a script can't spell light-dark past the check.
 * @param {string} js
 */
export function unescapeJs(js) {
  return String(js).replace(/\\(?:x([0-9a-fA-F]{2})|u\{([0-9a-fA-F]{1,6})\}|u([0-9a-fA-F]{4}))/g, (whole, hex2, hexBraced, hex4) => {
    const code = Number.parseInt(hex2 ?? hexBraced ?? hex4, 16);
    return code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

/** Whether a script's text could put a light-dark() on the page. */
export function scriptCarriesLightDark(js) {
  return /light-dark/i.test(unescapeJs(js));
}

/** Every element in a parse5 tree, a template's contents included, since a script can clone them. */
function* elements(node) {
  for (const child of [...(node.childNodes ?? []), ...(node.content?.childNodes ?? [])]) {
    if (!child.tagName) continue;
    yield child;
    yield* elements(child);
  }
}

const textOf = (node) => (node.childNodes ?? []).map((child) => (child.nodeName === '#text' ? child.value : '')).join('');

/**
 * The CSS a built HTML or SVG file carries, read from the tree parse5 builds,
 * which tokenizes as the HTML standard does: each `<style>` element's text
 * (in SVG with character references and CDATA resolved), each `style`
 * attribute, and each stylesheet `<link>` whose href is a data: URI. Inline
 * scripts come back as `script` pieces, checked for light-dark() apart from
 * CSS. A hand-written scanner here missed cases a browser reads (fifteenth
 * drain review). It parses with scripting off, so <noscript> styles count.
 * @param {string} markup
 * @returns {{ label: string, css: string, script?: boolean }[]}
 */
export function embeddedCss(markup) {
  const styles = [];
  const attributes = [];
  const links = [];
  const scripts = [];
  for (const element of elements(parse(String(markup), { scriptingEnabled: false }))) {
    const tag = element.tagName.toLowerCase();
    /** @type {Record<string, string>} */
    const attrs = {};
    for (const attr of element.attrs ?? []) attrs[attr.name.toLowerCase()] ??= attr.value;
    if (tag === 'style') styles.push(textOf(element));
    if (attrs.style !== undefined) attributes.push(attrs.style);
    if (tag === 'link' && /(?:^|\s)stylesheet(?:\s|$)/i.test(attrs.rel ?? '') && /^\s*data:/i.test(attrs.href ?? '')) {
      const decoded = decodeDataUri(String(attrs.href).trim());
      if (decoded !== null) links.push(decoded);
    }
    if (tag === 'script' && !/json/i.test(attrs.type ?? '')) scripts.push(textOf(element));
  }
  return [
    ...styles.map((css, position) => ({ label: `<style> ${position + 1}`, css })),
    ...attributes.map((css, position) => ({ label: `style attribute ${position + 1}`, css })),
    ...links.map((css, position) => ({ label: `data: stylesheet link ${position + 1}`, css })),
    ...scripts.map((css, position) => ({ label: `inline script ${position + 1}`, css, script: true })),
  ];
}

/** Why an SVG file can't be read the way a browser would read it, or null. */
export function svgUnreadable(text) {
  // An internal DTD can define entities that only an XML parser expands.
  return /<!ENTITY/i.test(String(text)) ? 'it defines its own entities, which this audit can\'t expand' : null;
}
