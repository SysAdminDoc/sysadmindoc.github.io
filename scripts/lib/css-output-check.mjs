// What a minifier can quietly break in built CSS. With no browser targets,
// lightningcss kept only the -webkit- twin of each backdrop-filter, which
// Chromium and Firefox don't read, and folded animation-timeline into the
// animation shorthand, which Chromium rejects (see scripts/lib/minify-css.mjs).

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
    if (!/-webkit-backdrop-filter\s*:/.test(block)) continue;
    prefixed += 1;
    if (!/(?<!-webkit-)backdrop-filter\s*:/.test(block)) unpaired += 1;
  }
  if (unpaired > 0) {
    problems.push(`${unpaired} rule(s) with -webkit-backdrop-filter but no backdrop-filter, so Chromium and Firefox lose the blur`);
  }
  if (/animation\s*:[^;}]*\b(?:scroll|view)\(/.test(String(css))) {
    problems.push('a scroll or view timeline folded into the animation shorthand, which Chromium rejects');
  }
  return { problems, prefixed };
}
