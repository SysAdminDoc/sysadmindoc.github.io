#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const options = { distDir: 'dist' };

for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (arg === '--dist') {
    index += 1;
    options.distDir = process.argv[index] ?? 'dist';
  } else if (arg.startsWith('--dist=')) {
    options.distDir = arg.slice('--dist='.length);
  } else if (arg === '--help' || arg === '-h') {
    console.log('Usage: node scripts/audit-built-links.mjs [--dist <dir>]');
    process.exit(0);
  } else {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

const distDir = path.resolve(root, options.distDir);

async function collectHtmlFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectHtmlFiles(filePath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(filePath);
    }
  }
  return files;
}

/**
 * Extract all href attribute values from <a> tags in an HTML string.
 * Uses a two-pass regex: first find opening <a ...> tags, then extract href.
 */
function extractHrefs(html) {
  const hrefs = [];
  const tagPattern = /<a\b[^>]*>/gi;
  const hrefPattern = /\bhref=(["'])(.*?)\1/i;
  let tagMatch;
  while ((tagMatch = tagPattern.exec(html)) !== null) {
    const hrefMatch = hrefPattern.exec(tagMatch[0]);
    if (hrefMatch) hrefs.push(hrefMatch[2]);
  }
  return hrefs;
}

/**
 * Return true if the href is an internal link that should be validated:
 * starts with '/' but is NOT a protocol-relative URL ('//')
 */
function isInternalLink(href) {
  if (!href.startsWith('/')) return false;
  if (href.startsWith('//')) return false;
  return true;
}

/**
 * Normalise an internal href to a resolvable filesystem path within distDir.
 * Strips hash fragments and query strings, then returns the absolute fs path
 * we expect to find (either the literal file, or /path/ → /path/index.html).
 */
function resolveToFsPath(href) {
  // Strip fragment and query string
  let clean = href.split('#')[0].split('?')[0];
  if (!clean) return null; // fragment-only after stripping

  // Decode percent-encoding for the filesystem check
  try {
    clean = decodeURIComponent(clean);
  } catch {
    // Leave as-is if decoding fails
  }

  const resolvedBase = path.resolve(distDir);

  // Paths that end with '/' map to <dir>/index.html (Astro default)
  if (clean.endsWith('/')) {
    const resolved = path.resolve(resolvedBase, `.${clean}`, 'index.html');
    if (!isInsideDist(resolvedBase, resolved)) return null;
    return resolved;
  }

  // Direct file reference (e.g. /robots.txt, /manifest.json, /og/foo.png)
  const resolved = path.resolve(resolvedBase, `.${clean}`);
  if (!isInsideDist(resolvedBase, resolved)) return null;
  return resolved;
}

function isInsideDist(resolvedBase, resolvedPath) {
  const rel = path.relative(resolvedBase, resolvedPath);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

// ── Main ─────────────────────────────────────────────────────────────────────

let htmlFiles;
try {
  htmlFiles = await collectHtmlFiles(distDir);
} catch (error) {
  console.error(`Internal link audit: cannot read dist dir ${path.relative(root, distDir) || distDir}: ${error.message}`);
  process.exit(1);
}

if (htmlFiles.length === 0) {
  console.error(`Internal link audit: no HTML files found under ${path.relative(root, distDir) || distDir}`);
  process.exit(1);
}

const errors = [];
let totalLinks = 0;
let internalLinks = 0;
/** route -> the routes of the other pages that link to it */
const inbound = new Map();

/** The route a built HTML file serves, e.g. dist/uses/index.html -> /uses/. */
function routeOf(filePath) {
  const relative = path.relative(distDir, filePath).replaceAll(path.sep, '/');
  return `/${relative.replace(/(^|\/)index\.html$/, '$1')}`;
}

// Cache existence checks so we don't hit the filesystem repeatedly for common paths
const existenceCache = new Map();

async function fileExists(fsPath) {
  if (existenceCache.has(fsPath)) return existenceCache.get(fsPath);
  let result;
  try {
    await fs.access(fsPath);
    result = true;
  } catch {
    result = false;
  }
  existenceCache.set(fsPath, result);
  return result;
}

for (const filePath of htmlFiles) {
  const rel = path.relative(root, filePath).replaceAll(path.sep, '/');
  const source = routeOf(filePath);
  const html = await fs.readFile(filePath, 'utf8');
  const hrefs = extractHrefs(html);

  // /privacy/ promises it is one click from every page. The build checks the
  // pages it is about to ship; a unit test could only read the last build.
  const footer = html.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0];
  if (footer && source !== '/privacy/' && !/\bhref=(["'])\/privacy\/\1/.test(footer)) {
    errors.push(`  ${rel}: its footer has no link to /privacy/`);
  }

  for (const href of hrefs) {
    totalLinks += 1;

    // Skip non-internal and fragment-only links
    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:') ||
      href.startsWith('data:') ||
      href.startsWith('//')
    ) {
      continue;
    }

    if (!isInternalLink(href)) continue;

    internalLinks += 1;
    const target = href.split('#')[0].split('?')[0];
    if (target && target !== source) {
      if (!inbound.has(target)) inbound.set(target, new Set());
      inbound.get(target).add(source);
    }

    const fsPath = resolveToFsPath(href);
    if (!fsPath) {
      errors.push(`  ${rel} -> ${href}`);
      continue;
    }

    const exists = await fileExists(fsPath);
    if (!exists) {
      errors.push(`  ${rel} → ${href}`);
    }
  }
}

// A page nothing links to is reachable only through the sitemap or search.
// Six routes were in that state on 2026-09-22, the AI disclosure among them.
const sitemapRoutes = [];
for (const name of (await fs.readdir(distDir)).filter((file) => /^sitemap-\d+\.xml$/.test(file))) {
  const xml = await fs.readFile(path.join(distDir, name), 'utf8');
  for (const match of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) sitemapRoutes.push(new URL(match[1]).pathname);
}
if (sitemapRoutes.length === 0) errors.push('  no sitemap-<n>.xml routes found, so orphaned pages cannot be checked');
const orphans = sitemapRoutes.filter((route) => !inbound.has(route));
for (const route of orphans) errors.push(`  no page links to ${route}, which is in the sitemap`);

console.log('Internal link audit');
console.log(`  dist: ${path.relative(root, distDir) || distDir}`);
console.log(`  HTML files scanned: ${htmlFiles.length}`);
console.log(`  Total <a href> values: ${totalLinks}`);
console.log(`  Internal links checked: ${internalLinks}`);
console.log(`  sitemap routes with a link from another page: ${sitemapRoutes.length - orphans.length}/${sitemapRoutes.length}`);

if (errors.length > 0) {
  console.error(`Internal link audit failed: ${errors.length} broken link(s) or orphaned page(s):`);
  for (const error of errors) console.error(error);
  process.exit(1);
}

console.log('Internal link audit passed.');
