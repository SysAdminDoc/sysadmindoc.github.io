// What a minifier can quietly break in built CSS. With no browser targets,
// lightningcss kept only the -webkit- twin of each backdrop-filter, which
// Chromium and Firefox don't read, and folded animation-timeline into the
// animation shorthand, which Chromium rejects (see scripts/lib/minify-css.mjs).
// CSS names are case-insensitive, and so is every match here: a file copied as
// is, like the offline page's, can spell them any way (twelfth drain review).

/**
 * CSS text with its escapes resolved the way the tokenizer resolves them
 * (`\6b ` or `\k` is k), so `light-dar\6b(` reads as light-dark( (thirteenth
 * drain review). An escaped newline is dropped, as in a string.
 * @param {string} css
 */
export function unescapeCss(css) {
  return String(css).replace(/\\(?:([0-9a-fA-F]{1,6})[ \t\n\r\f]?|(\n)|([^\n]))/g, (_, hex, newline, char) => {
    if (newline) return '';
    if (char) return char;
    const code = Number.parseInt(hex, 16);
    return code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff) ? String.fromCharCode(0xfffd) : String.fromCodePoint(code);
  });
}

/** The stylesheets `@import`ed as data: URIs, decoded. */
function dataImports(css) {
  const found = [];
  for (const match of css.matchAll(/@import\s+(?:url\(\s*)?(["']?)(data:[^"')\s]*)\1/gi)) {
    const uri = match[2];
    const comma = uri.indexOf(',');
    if (comma < 0) continue;
    const meta = uri.slice(5, comma);
    const body = uri.slice(comma + 1);
    try {
      found.push(/;base64$/i.test(meta) ? Buffer.from(decodeURIComponent(body), 'base64').toString('utf8') : decodeURIComponent(body));
    } catch {
      found.push(body);
    }
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

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", lpar: '(', rpar: ')', hyphen: '-', dash: '-', colon: ':', semi: ';', lbrace: '{', rbrace: '}', num: '#' };

/** HTML character references resolved: numeric ones, and the named ones CSS syntax could hide behind. */
export function decodeEntities(text) {
  return String(text).replace(/&(?:#[xX]([0-9a-fA-F]+)|#(\d+)|([A-Za-z]+));?/g, (whole, hex, decimal, name) => {
    if (hex || decimal) {
      const code = Number.parseInt(hex ?? decimal, hex ? 16 : 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[name.toLowerCase()] ?? whole;
  });
}

/**
 * The CSS a built HTML or SVG file carries, found the way a browser's parser
 * finds it: each `<style>` element's text, closed by `</style` and anything up
 * to `>` in any case, and each `style` attribute, read with quoted values that
 * may hold a `>`. Character references are resolved in attributes, and in a
 * `<style>` inside SVG, which is foreign content and decodes them; an HTML
 * `<style>` is raw text and doesn't. A `<script>`'s text is skipped whole.
 * @param {string} markup
 * @param {{ svg?: boolean }} [options] svg: the file is an SVG document, where every <style> decodes
 * @returns {{ label: string, css: string }[]}
 */
export function embeddedCss(markup, { svg = false } = {}) {
  const text = String(markup);
  const styles = [];
  const attributes = [];
  let svgDepth = svg ? 1 : 0;
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf('<', index);
    if (open < 0) break;
    if (text.startsWith('<!--', open)) {
      const end = text.indexOf('-->', open + 4);
      index = end < 0 ? text.length : end + 3;
      continue;
    }
    const endTag = /^<\/([A-Za-z][^\s/>]*)[^>]*>/.exec(text.slice(open));
    if (endTag) {
      if (endTag[1].toLowerCase() === 'svg' && svgDepth > 0) svgDepth -= 1;
      index = open + endTag[0].length;
      continue;
    }
    const name = /^<([A-Za-z][^\s/>]*)/.exec(text.slice(open))?.[1];
    if (!name) {
      index = open + 1;
      continue;
    }
    // Attributes, with quoted values that may hold `>`.
    let at = open + 1 + name.length;
    let selfClosing = false;
    for (;;) {
      while (at < text.length && /[\s/]/.test(text[at])) {
        if (text[at] === '/') selfClosing = true;
        at += 1;
      }
      if (at >= text.length || text[at] === '>') break;
      selfClosing = false;
      const attribute = /^[^\s/>=]+/.exec(text.slice(at))?.[0] ?? text[at];
      at += attribute.length;
      while (at < text.length && /\s/.test(text[at])) at += 1;
      let value = null;
      if (text[at] === '=') {
        at += 1;
        while (at < text.length && /\s/.test(text[at])) at += 1;
        const quote = text[at];
        if (quote === '"' || quote === "'") {
          const close = text.indexOf(quote, at + 1);
          value = text.slice(at + 1, close < 0 ? text.length : close);
          at = close < 0 ? text.length : close + 1;
        } else {
          value = /^[^\s>]*/.exec(text.slice(at))?.[0] ?? '';
          at += value.length;
        }
      }
      if (attribute.toLowerCase() === 'style' && value !== null) attributes.push(decodeEntities(value));
    }
    index = at + 1;
    const lower = name.toLowerCase();
    if (lower === 'svg' && !selfClosing) svgDepth += 1;
    // HTML ignores a / on <style/> and <script/>; only SVG (XML) closes them.
    if ((lower === 'style' || lower === 'script') && !(selfClosing && svgDepth > 0)) {
      const close = new RegExp(`</${lower}(?=[\\s/>])[^>]*>`, 'i').exec(text.slice(index));
      const body = close ? text.slice(index, index + close.index) : text.slice(index);
      if (lower === 'style') {
        const css = body.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
        styles.push(svgDepth > 0 ? decodeEntities(css) : css);
      }
      index = close ? index + close.index + close[0].length : text.length;
    }
  }
  return [
    ...styles.map((css, position) => ({ label: `<style> ${position + 1}`, css })),
    ...attributes.map((css, position) => ({ label: `style attribute ${position + 1}`, css })),
  ];
}
