// How the site's CSS is minified, shared by the Vite build (astro.config.mjs,
// for global.css and the route styles), by Base.astro (for the critical CSS it
// inlines and hashes) and by the source CSP audit, which must hash the same text.
import { Features, transform } from 'lightningcss';

// Vite 8's 'baseline-widely-available' targets. They are used for vendor
// prefixes only: lightningcss adds -webkit- where one of these browsers needs
// it, so the source writes standard properties alone. Given `backdrop-filter`
// and then `-webkit-backdrop-filter`, lightningcss keeps only the last, which
// cost Chromium and Firefox every backdrop blur on the site.
export const CSS_BROWSER_TARGETS = Object.freeze(['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4']);

// Every other feature lightningcss could lower for those targets stays as
// written: the source carries its own fallbacks (light-dark() among them), and
// lowering it would change what browsers render.
const everyFeature = Object.values(Features).filter(Number.isInteger).reduce((mask, flag) => mask | flag, 0);
export const LIGHTNINGCSS_EXCLUDE = everyFeature & ~Features.VendorPrefixes;

const LIGHTNINGCSS_BROWSER = { chrome: 'chrome', edge: 'edge', firefox: 'firefox', safari: 'safari', ios: 'ios_saf' };

/** esbuild-style targets ('safari16.4') as lightningcss wants them. */
function lightningcssTargets(list) {
  const targets = {};
  for (const entry of list) {
    const match = /^([a-z]+)(\d+)(?:\.(\d+))?$/.exec(entry);
    if (!match || !LIGHTNINGCSS_BROWSER[match[1]]) throw new Error(`minify-css: unsupported target ${entry}`);
    targets[LIGHTNINGCSS_BROWSER[match[1]]] = (Number(match[2]) << 16) | (Number(match[3] ?? 0) << 8);
  }
  return targets;
}
const targets = lightningcssTargets(CSS_BROWSER_TARGETS);

/**
 * @param {string} code
 * @returns {string}
 */
export function minifyCss(code) {
  return transform({
    filename: 'inline.css',
    code: Buffer.from(String(code)),
    minify: true,
    targets,
    exclude: LIGHTNINGCSS_EXCLUDE,
  }).code.toString();
}
