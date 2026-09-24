// Which server the Playwright audits run against, and what of theirs must
// never ship.
//
// The configs audit a preview they start themselves over this checkout's dist/
// (tests/playwright/preview-server.mjs), and prove it serves this build.
// PLAYWRIGHT_BASE_URL points them at someone else's server and skips all of
// that, so a copy left in an environment by another project, or spelled in
// another case (Windows reads environment names case-insensitively), audited
// the wrong site. It counts only alongside PLAYWRIGHT_OUTSIDE_SERVER=1, and the
// gate and the nightly deploy drop both however they're spelled (fifteenth
// drain review).
import process from 'node:process';

export const OUTSIDE_SERVER_NAMES = Object.freeze(['PLAYWRIGHT_BASE_URL', 'PLAYWRIGHT_OUTSIDE_SERVER']);

/** The file the preview setup writes into dist/ to prove who's serving it. */
export const SERVE_TOKEN_PREFIX = '__preview-check-';

/**
 * The outside server's URL when the run asked for one explicitly, else
 * undefined, so the config starts its own preview.
 * @param {Record<string, string | undefined>} [env]
 */
export function outsideServer(env = process.env) {
  if (env.PLAYWRIGHT_OUTSIDE_SERVER !== '1') return undefined;
  return env.PLAYWRIGHT_BASE_URL || undefined;
}

/**
 * `env` without either variable, in any case.
 * @param {Record<string, string | undefined>} [env]
 */
export function withoutOutsideServer(env = process.env) {
  return Object.fromEntries(Object.entries(env).filter(([name]) => !OUTSIDE_SERVER_NAMES.includes(name.toUpperCase())));
}

/**
 * The serve tokens in a `tar -t` listing, wherever they sit.
 * @param {string} listing
 */
export function packedServeTokens(listing) {
  return listing
    .split(/\r?\n/)
    .filter((entry) => (entry.split('/').pop() ?? '').startsWith(SERVE_TOKEN_PREFIX));
}
