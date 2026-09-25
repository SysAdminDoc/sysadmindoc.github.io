// What a minifier can quietly break in built CSS. With no browser targets,
// lightningcss kept only the -webkit- twin of each backdrop-filter, which
// Chromium and Firefox don't read, and folded animation-timeline into the
// animation shorthand, which Chromium rejects (see scripts/lib/minify-css.mjs).
// CSS names are case-insensitive, and so is every match here: a file copied as
// is, like the offline page's, can spell them any way (twelfth drain review).
import { XMLParser } from 'fast-xml-parser';
import { parse } from 'parse5';
import { cssTokens } from './css-tokens.mjs';

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

/**
 * A data: URI's body, decoded; bytes that aren't valid UTF-8 percent-escapes
 * come through one by one. Read as the URL parser and the fetch standard's
 * data: URL processor read it: spaces and controls at either end go, tabs and
 * newlines anywhere go, and `;base64` may have spaces before it (seventeenth
 * drain review).
 */
export function decodeDataUri(uri) {
  const url = String(uri).replace(/^[\x00-\x20]+|[\x00-\x20]+$/g, '').replace(/[\t\n\r]/g, '');
  const comma = url.indexOf(',');
  if (comma < 0 || !/^data:/i.test(url)) return null;
  const meta = url.slice(5, comma).trim();
  const body = url.slice(comma + 1);
  let text;
  try {
    text = decodeURIComponent(body);
  } catch {
    text = body.replace(/%([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
  }
  return /; *base64$/i.test(meta) ? Buffer.from(text.replace(/[\t\n\f\r ]/g, ''), 'base64').toString('utf8') : text;
}

/** Whether a data: URI says it holds CSS. */
const isCssDataUri = (uri) => /^data:\s*text\/css\b/i.test(String(uri).replace(/^[\x00-\x20]+/, ''));

/**
 * The stylesheets imported as data: URIs, decoded, found in the stylesheet's
 * tokens (scripts/lib/css-tokens.mjs): an import rule's url() or string,
 * wherever comments stand and whatever a string escapes, `\"` included. A
 * regex over text with comments cut out lost the import after one whose
 * string held `/*` (seventeenth drain review).
 */
function dataImports(css) {
  const found = [];
  const tokens = cssTokens(css).filter((token) => token.type !== 'whitespace');
  tokens.forEach((token, index) => {
    if (token.type !== 'at-keyword' || token.value.toLowerCase() !== 'import') return;
    const next = tokens[index + 1];
    const value = next?.type === 'url' || next?.type === 'string'
      ? next.value
      : next?.type === 'function' && next.value.toLowerCase() === 'url' && tokens[index + 2]?.type === 'string'
        ? tokens[index + 2].value
        : null;
    const decoded = value === null ? null : decodeDataUri(value);
    if (decoded !== null) found.push(decoded);
  });
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
  for (const imported of dataImports(css)) {
    for (const problem of cssOutputProblems(imported).problems) problems.push(`in an @import of a data: URI, ${problem}`);
  }
  return { problems, prefixed };
}

/**
 * JavaScript text with its string escapes resolved, so a script can't spell
 * light-dark past the check: \x28, ( and \u{28}, a legacy octal escape
 * (\154 is l), a line continuation (a backslash before a line break, which
 * vanishes) and any other escaped character, which stands for itself
 * (seventeenth drain review).
 * @param {string} js
 */
export function unescapeJs(js) {
  return String(js).replace(
    /\\(?:x([0-9a-fA-F]{2})|u\{([0-9a-fA-F]{1,6})\}|u([0-9a-fA-F]{4})|([0-3][0-7]{0,2}|[4-7][0-7]?)|(\r\n|[\n\r\p{Zl}\p{Zp}])|(.))/gsu,
    (whole, hex2, hexBraced, hex4, octal, lineBreak, other) => {
      if (octal !== undefined) return String.fromCharCode(Number.parseInt(octal, 8));
      if (lineBreak !== undefined) return '';
      if (other !== undefined) return other;
      const code = Number.parseInt(hex2 ?? hexBraced ?? hex4, 16);
      return code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    },
  );
}

/**
 * Whether a script's text could put a light-dark() on the page, escapes
 * resolved and string literals joined by `+` read as one, so
 * `'light-'+'dark('` counts too (seventeenth drain review).
 */
export function scriptCarriesLightDark(js) {
  return /light-dark/i.test(unescapeJs(js).replace(/["'`]\s*\+\s*["'`]/g, ''));
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
 * Whether a <link> puts its href on the page as a stylesheet: rel=stylesheet,
 * or a preload of a style or of a data: URI of CSS, which one line of script
 * (`onload="this.rel='stylesheet'"`) turns into a stylesheet (seventeenth
 * drain review).
 */
const linksStylesheet = (attrs) =>
  /(?:^|\s)stylesheet(?:\s|$)/i.test(attrs.rel ?? '') || String(attrs.as ?? '').toLowerCase() === 'style' || isCssDataUri(attrs.href ?? '');

/** The pieces embeddedCss returns, from the lists it gathered. */
function pieces({ styles, attributes, links, scripts, handlers }) {
  return [
    ...styles.map((css, position) => ({ label: `<style> ${position + 1}`, css })),
    ...attributes.map((css, position) => ({ label: `style attribute ${position + 1}`, css })),
    ...links.map((css, position) => ({ label: `data: stylesheet link ${position + 1}`, css })),
    ...scripts.map((css, position) => ({ label: `inline script ${position + 1}`, css, script: true })),
    ...handlers.map((css, position) => ({ label: `event handler ${position + 1}`, css, script: true })),
  ];
}

const svgParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  preserveOrder: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
  cdataPropName: '#cdata',
  processEntities: true,
  htmlEntities: true,
});
const localName = (name) => name.slice(name.lastIndexOf(':') + 1).toLowerCase();
const xmlText = (children) =>
  (Array.isArray(children) ? children : []).map((child) => (typeof child['#text'] === 'string' ? child['#text'] : child['#cdata'] ? xmlText(child['#cdata']) : '')).join('');

/**
 * An SVG file's pieces, read as a browser reads an SVG file: as XML, so a
 * character reference in a <style> is resolved wherever it stands. parse5
 * reads by HTML's rules, where `<p/>` ends foreign content and a <style>
 * after it keeps `light-dar&#x6b;(` as written (seventeenth drain review).
 */
function svgPieces(text) {
  const found = { styles: [], attributes: [], links: [], scripts: [], handlers: [] };
  const walk = (nodes) => {
    for (const node of Array.isArray(nodes) ? nodes : []) {
      const tag = Object.keys(node).find((key) => key !== ':@');
      if (!tag || tag.startsWith('#') || tag.startsWith('?')) continue;
      const name = localName(tag);
      if (name === 'style') found.styles.push(xmlText(node[tag]));
      if (name === 'script') found.scripts.push(xmlText(node[tag]));
      for (const [attribute, value] of Object.entries(node[':@'] ?? {})) {
        const attributeName = localName(attribute);
        if (attributeName === 'style') found.attributes.push(String(value));
        else if (attributeName.startsWith('on')) found.handlers.push(String(value));
      }
      walk(node[tag]);
    }
  };
  walk(svgParser.parse(String(text)));
  return pieces(found);
}

/**
 * The CSS a built HTML or SVG file carries. HTML is read from the tree parse5
 * builds, which tokenizes as the HTML standard does: each `<style>` element's
 * text (in inline SVG with character references and CDATA resolved), each
 * `style` attribute, and each `<link>` that puts a data: URI on the page as a
 * stylesheet. An SVG file is read as XML (svgPieces). Inline scripts and
 * event handler attributes come back as `script` pieces, checked for
 * light-dark() apart from CSS. A hand-written scanner here missed cases a
 * browser reads (fifteenth drain review). HTML parses with scripting off, so
 * <noscript> styles count.
 * @param {string} markup
 * @param {{ svg?: boolean }} [options] svg: the markup is an SVG file
 * @returns {{ label: string, css: string, script?: boolean }[]}
 */
export function embeddedCss(markup, { svg = false } = {}) {
  if (svg) return svgPieces(markup);
  const found = { styles: [], attributes: [], links: [], scripts: [], handlers: [] };
  for (const element of elements(parse(String(markup), { scriptingEnabled: false }))) {
    const tag = element.tagName.toLowerCase();
    /** @type {Record<string, string>} */
    const attrs = {};
    for (const attr of element.attrs ?? []) attrs[attr.name.toLowerCase()] ??= attr.value;
    if (tag === 'style') found.styles.push(textOf(element));
    if (attrs.style !== undefined) found.attributes.push(attrs.style);
    if (tag === 'link' && /^[\x00-\x20]*data:/i.test(attrs.href ?? '') && linksStylesheet(attrs)) {
      const decoded = decodeDataUri(String(attrs.href));
      if (decoded !== null) found.links.push(decoded);
    }
    if (tag === 'script' && !/json/i.test(attrs.type ?? '')) found.scripts.push(textOf(element));
    for (const [name, value] of Object.entries(attrs)) if (name.startsWith('on')) found.handlers.push(value);
  }
  return pieces(found);
}

/** Why an SVG file can't be read the way a browser would read it, or null. */
export function svgUnreadable(text) {
  // An internal DTD can define entities that only an XML parser expands.
  return /<!ENTITY/i.test(String(text)) ? 'it defines its own entities, which this audit can\'t expand' : null;
}
