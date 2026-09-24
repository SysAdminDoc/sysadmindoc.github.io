// The start of each of the site's own inline blocks, for the CSP report sink
// (deploy/vps/csp-report-server.mjs). A violation report's sample is the first
// 40 characters of the inline script or style a browser refused; the sink
// keeps a sample only when it's one of these, which are public code, and
// stores a plain `[other]` marker for anything else.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';

// Trimmed and a little past a sample's 40 characters, the way the sink reads a
// sample (deploy/vps/csp-report-server.mjs, OWN_SAMPLE_LENGTH), so Chromium's
// trimmed samples still match a block that starts with whitespace.
const SAMPLE_LENGTH = 64;

function* elements(node) {
  for (const child of node.childNodes ?? []) {
    if (!child.tagName) continue;
    yield child;
    yield* elements(child);
  }
}

const textOf = (node) => (node.childNodes ?? []).map((child) => (child.nodeName === '#text' ? child.value : '')).join('');

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

/**
 * The start of every inline <style> and <script> in a page, trimmed,
 * read with scripting off so a <noscript> block's style counts.
 * @param {string} html
 * @returns {string[]}
 */
export function inlineSampleStarts(html) {
  const starts = [];
  for (const element of elements(parse(html, { scriptingEnabled: false }))) {
    const tag = element.tagName;
    if (tag !== 'style' && tag !== 'script') continue;
    if (tag === 'script' && (element.attrs ?? []).some((attr) => attr.name === 'src')) continue;
    const text = textOf(element).replace(/\r\n?/g, '\n').trim();
    if (text) starts.push(text.slice(0, SAMPLE_LENGTH));
  }
  return starts;
}

/** Every distinct inline block start in a built site. */
export function ownInlineSamples(distDir) {
  const starts = new Set();
  for (const file of htmlFiles(distDir)) {
    for (const start of inlineSampleStarts(fs.readFileSync(file, 'utf8'))) starts.add(start);
  }
  return [...starts].sort();
}

/** CSP_OWN_SAMPLES as the sink reads it: base64url JSON, safe in an env file. */
export function encodeOwnSamples(samples) {
  return Buffer.from(JSON.stringify(samples), 'utf8').toString('base64url');
}
