import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const distDir = path.resolve(root, process.argv.includes('--dist') ? process.argv[process.argv.indexOf('--dist') + 1] : 'dist');
const feedPath = path.join(distDir, 'feed.json');
const expectedVersion = 'https://jsonfeed.org/version/1.1';
const errors = [];

function fail(message) {
  errors.push(message);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireString(record, key, label) {
  const value = record?.[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${label}.${key} must be a non-empty string.`);
    return '';
  }
  return value;
}

function parseAbsoluteUrl(value, label) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') fail(`${label} must use https.`);
    return url;
  } catch {
    fail(`${label} must be an absolute URL, got "${value}".`);
    return null;
  }
}

async function requireDistAsset(url, label) {
  if (!url) return;
  const assetPath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (!assetPath || assetPath.includes('..')) {
    fail(`${label} points at an unsafe asset path ${url.pathname}.`);
    return;
  }
  try {
    const stat = await fs.stat(path.join(distDir, assetPath));
    if (!stat.isFile() || stat.size === 0) fail(`${label} asset ${url.pathname} must be a non-empty file in dist.`);
  } catch {
    fail(`${label} asset ${url.pathname} was not found in dist.`);
  }
}

let feed = null;
try {
  feed = JSON.parse(await fs.readFile(feedPath, 'utf8'));
} catch (error) {
  fail(`dist/feed.json is missing or invalid JSON: ${error.message}`);
}

if (!isObject(feed)) {
  fail('Feed root must be a JSON object.');
  feed = {};
}

if (feed.version !== expectedVersion) fail(`feed.version must be ${expectedVersion}.`);
requireString(feed, 'title', 'feed');
const homePageUrl = parseAbsoluteUrl(requireString(feed, 'home_page_url', 'feed'), 'feed.home_page_url');
const feedUrl = parseAbsoluteUrl(requireString(feed, 'feed_url', 'feed'), 'feed.feed_url');
const iconUrl = parseAbsoluteUrl(requireString(feed, 'icon', 'feed'), 'feed.icon');
const faviconUrl = parseAbsoluteUrl(requireString(feed, 'favicon', 'feed'), 'feed.favicon');
await requireDistAsset(iconUrl, 'feed.icon');
await requireDistAsset(faviconUrl, 'feed.favicon');

if (homePageUrl && homePageUrl.pathname !== '/') fail(`feed.home_page_url must point at the site root, got ${homePageUrl.pathname}.`);
if (feedUrl && feedUrl.pathname !== '/feed.json') fail(`feed.feed_url must point at /feed.json, got ${feedUrl.pathname}.`);

if (!Array.isArray(feed.items) || feed.items.length === 0) {
  fail('feed.items must be a non-empty array.');
}

const seenIds = new Set();
let contentTextCount = 0;
let contentHtmlCount = 0;
for (const [index, item] of Array.isArray(feed.items) ? feed.items.entries() : []) {
  const label = `feed.items[${index}]`;
  if (!isObject(item)) {
    fail(`${label} must be an object.`);
    continue;
  }
  const id = requireString(item, 'id', label);
  const itemUrl = requireString(item, 'url', label);
  if (id) {
    if (seenIds.has(id)) fail(`${label}.id duplicates an earlier item: ${id}.`);
    seenIds.add(id);
    parseAbsoluteUrl(id, `${label}.id`);
  }
  parseAbsoluteUrl(itemUrl, `${label}.url`);

  const hasContentHtml = typeof item.content_html === 'string' && item.content_html.trim().length > 0;
  const hasContentText = typeof item.content_text === 'string' && item.content_text.trim().length > 0;
  if (!hasContentHtml && !hasContentText) {
    fail(`${label} must include content_html or content_text.`);
  }
  if (hasContentHtml) contentHtmlCount += 1;
  if (hasContentText) contentTextCount += 1;

  if (item.date_published && Number.isNaN(new Date(item.date_published).getTime())) {
    fail(`${label}.date_published is not parseable as a date.`);
  }
  if (item.date_modified && Number.isNaN(new Date(item.date_modified).getTime())) {
    fail(`${label}.date_modified is not parseable as a date.`);
  }
}

if (errors.length > 0) {
  console.error('JSON Feed audit failed:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('JSON Feed audit');
console.log(`  items checked: ${feed.items.length}`);
console.log(`  content_text items: ${contentTextCount}`);
console.log(`  content_html items: ${contentHtmlCount}`);
console.log(`  icon: ${feed.icon}`);
console.log(`  favicon: ${feed.favicon}`);
console.log('JSON Feed audit passed.');
