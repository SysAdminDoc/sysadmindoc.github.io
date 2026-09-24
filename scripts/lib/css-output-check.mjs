// What a minifier can quietly break in built CSS. With no browser targets,
// lightningcss kept only the -webkit- twin of each backdrop-filter, which
// Chromium and Firefox don't read, and folded animation-timeline into the
// animation shorthand, which Chromium rejects (see scripts/lib/minify-css.mjs).
// CSS names are case-insensitive, and so is every match here: a file copied as
// is, like the offline page's, can spell them any way (twelfth drain review).

/**
 * @param {string} css a built stylesheet
 * @returns {{ problems: string[], prefixed: number }} what's wrong, and how many
 *   rule blocks carry a prefixed blur (so a check that saw none can say so)
 */
export function cssOutputProblems(css) {
  const problems = [];
  let prefixed = 0;
  let unpaired = 0;
  for (const block of String(css).match(/\{[^{}]*\}/g) ?? []) {
    if (!/-webkit-backdrop-filter\s*:/i.test(block)) continue;
    prefixed += 1;
    if (!/(?<!-webkit-)backdrop-filter\s*:/i.test(block)) unpaired += 1;
  }
  if (unpaired > 0) {
    problems.push(`${unpaired} rule(s) with -webkit-backdrop-filter but no backdrop-filter, so Chromium and Firefox lose the blur`);
  }
  if (/animation\s*:[^;}]*\b(?:scroll|view)\(/i.test(String(css))) {
    problems.push('a scroll or view timeline folded into the animation shorthand, which Chromium rejects');
  }
  // The build targets browsers from before light-dark(), which drop it and
  // lose the accent it sets; the minifier lowers every one.
  if (/\blight-dark\(/i.test(String(css))) {
    problems.push('a light-dark() the minifier left in place, which Chrome and Edge before 123, Safari before 17.5 and Firefox before 120 drop');
  }
  return { problems, prefixed };
}

/**
 * The CSS a built HTML or SVG file carries: each `<style>` block, matched the
 * way a browser's parser matches it (any case, a closing tag with space before
 * its `>`), and each `style` attribute's value.
 * @param {string} markup
 * @returns {{ label: string, css: string }[]}
 */
export function embeddedCss(markup) {
  const found = [];
  for (const [index, match] of [...String(markup).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].entries()) {
    found.push({ label: `<style> ${index + 1}`, css: match[1] });
  }
  // `\s` before the name, so data-style and a style= inside a URL don't count.
  const attributes = [...String(markup).matchAll(/<[a-z][^\s/>]*[^>]*?\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)];
  for (const [index, match] of attributes.entries()) {
    found.push({ label: `style attribute ${index + 1}`, css: match[1] ?? match[2] ?? match[3] ?? '' });
  }
  return found;
}
