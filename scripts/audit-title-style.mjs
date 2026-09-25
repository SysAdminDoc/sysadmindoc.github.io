#!/usr/bin/env node
// Holds every name a reader sees for this site to its writing rule: each
// built page's <title>, the og:title, twitter:title and og:site_name that go
// with it, the feed names in each page's alternate links, each feed's own
// title and the item titles the site writes into it (catalog names, atom's
// "(live)" suffix, releases.xml's "project tag"), and the web app manifest's
// names. No em dash, en dash or other dash, and no hyphen or dash lookalike
// between spaces (scripts/lib/title-style.mjs). A feed's own title is also
// the name its links give it, so a reader subscribes to what the link said
// (eighteenth drain review).
//
//   --dist <path>   the build to read (default dist)
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { XMLParser } from 'fast-xml-parser';
import { parse } from 'parse5';
import { decodeReferences, titleStyleProblem } from './lib/title-style.mjs';

const root = process.cwd();
const distArg = process.argv.indexOf('--dist');
const distDir = path.resolve(root, distArg === -1 ? 'dist' : process.argv[distArg + 1]);
const HTML = 'http://www.w3.org/1999/xhtml';
const FEEDS = ['rss.xml', 'releases.xml', 'atom.xml', 'feed.json'];
const NAME_METAS = new Set(['og:title', 'twitter:title', 'og:site_name', 'application-name', 'apple-mobile-web-app-title']);

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error(`title-style audit: ${distDir}/index.html not found. Run the build first.`);
  process.exit(1);
}

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

function* elements(node) {
  for (const child of node.childNodes ?? []) {
    if (!child.tagName) continue;
    yield child;
    yield* elements(child);
  }
}

const attribute = (element, name) => element.attrs?.find((attr) => attr.name === name)?.value;
const textOf = (node) => (node.childNodes ?? []).map((child) => (child.nodeName === '#text' ? child.value : '')).join('');

/** Every reader-facing name in one built page, with where it sits, and the feed links' names by href. */
function pageNames(html) {
  const names = [];
  const links = [];
  for (const element of elements(parse(html, { scriptingEnabled: false }))) {
    if (element.namespaceURI !== HTML) continue;
    if (element.tagName === 'title') names.push({ where: '<title>', text: textOf(element) });
    if (element.tagName === 'meta') {
      const key = attribute(element, 'property') ?? attribute(element, 'name');
      if (key !== undefined && NAME_METAS.has(key)) names.push({ where: key, text: attribute(element, 'content') ?? '' });
    }
    if (element.tagName === 'link' && /(?:^|\s)alternate(?:\s|$)/i.test(attribute(element, 'rel') ?? '') && attribute(element, 'title') !== undefined) {
      const href = attribute(element, 'href') ?? '';
      names.push({ where: `the ${href} link`, text: attribute(element, 'title') ?? '' });
      links.push({ href, text: attribute(element, 'title') ?? '' });
    }
  }
  return { names, links };
}

const xml = new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: true });
const textValue = (value) => (typeof value === 'string' ? value : typeof value?.['#text'] === 'string' ? value['#text'] : '');
const list = (value) => (Array.isArray(value) ? value : value === undefined ? [] : [value]);
const read = (file) => {
  const full = path.join(distDir, file);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
};

/** Each feed's own name and its items' titles. */
function feedNames() {
  const feeds = [];
  for (const file of FEEDS) {
    const text = read(file);
    if (text === null) continue;
    if (file === 'feed.json') {
      const feed = JSON.parse(text);
      feeds.push({ file, title: String(feed?.title ?? ''), items: list(feed?.items).map((item) => String(item?.title ?? '')) });
    } else if (file === 'atom.xml') {
      const feed = xml.parse(text)?.feed;
      feeds.push({ file, title: textValue(feed?.title), items: list(feed?.entry).map((entry) => textValue(entry?.title)) });
    } else {
      const channel = xml.parse(text)?.rss?.channel;
      feeds.push({ file, title: textValue(channel?.title), items: list(channel?.item).map((item) => textValue(item?.title)) });
    }
  }
  return feeds;
}

/** The web app manifest's names, shortcuts included. */
function manifestNames() {
  const text = read('manifest.json');
  if (text === null) return [];
  const manifest = JSON.parse(text);
  const names = [];
  for (const key of ['name', 'short_name']) if (typeof manifest?.[key] === 'string') names.push({ where: key, text: manifest[key] });
  list(manifest?.shortcuts).forEach((shortcut, index) => {
    for (const key of ['name', 'short_name']) if (typeof shortcut?.[key] === 'string') names.push({ where: `shortcuts[${index}].${key}`, text: shortcut[key] });
  });
  return names;
}

const same = (text) => decodeReferences(text).replace(/\s+/g, ' ').trim();
const problems = [];
const feeds = feedNames();
const feedTitles = new Map(feeds.map((feed) => [`/${feed.file}`, feed.title]));
/** @type {Map<string, { href: string, text: string, own: string, pages: string[] }>} */
const mismatches = new Map();
const files = htmlFiles(distDir);
for (const file of files) {
  const rel = path.relative(distDir, file).replaceAll('\\', '/');
  const { names, links } = pageNames(fs.readFileSync(file, 'utf8'));
  for (const { where, text } of names) {
    const problem = titleStyleProblem(text);
    if (problem) problems.push(`${rel}: ${where} "${text.trim().slice(0, 100)}" has ${problem}`);
  }
  for (const { href, text } of links) {
    const own = feedTitles.get(href);
    if (own === undefined || same(own) === same(text)) continue;
    const key = `${href}\n${text}`;
    const entry = mismatches.get(key) ?? { href, text, own, pages: [] };
    entry.pages.push(rel);
    mismatches.set(key, entry);
  }
}
// The layout writes the same links on every page, so one mismatch is reported once.
for (const { href, text, own, pages } of mismatches.values()) {
  problems.push(`${pages[0]}${pages.length > 1 ? ` and ${pages.length - 1} more page(s)` : ''}: the ${href} link "${text.slice(0, 100)}" doesn't match the feed's own title "${own.slice(0, 100)}"`);
}
let items = 0;
for (const { file, title, items: titles } of feeds) {
  const problem = titleStyleProblem(title);
  if (problem) problems.push(`${file}: the feed's title "${title.slice(0, 100)}" has ${problem}`);
  for (const item of titles) {
    items += 1;
    const itemProblem = titleStyleProblem(item);
    if (itemProblem) problems.push(`${file}: the item title "${item.slice(0, 100)}" has ${itemProblem}`);
  }
}
const manifest = manifestNames();
for (const { where, text } of manifest) {
  const problem = titleStyleProblem(text);
  if (problem) problems.push(`manifest.json: ${where} "${text.slice(0, 100)}" has ${problem}`);
}

if (problems.length > 0) {
  console.error(`title-style audit: ${problems.length} name(s) break the writing rule (join parts with " | "):`);
  for (const problem of problems.slice(0, 20)) console.error(`  - ${problem}`);
  if (problems.length > 20) console.error(`  ...and ${problems.length - 20} more`);
  process.exit(1);
}
console.log(`title-style audit passed: ${files.length} pages, ${feeds.length} feeds with ${items} items and ${manifest.length} manifest names, no dash in any of them.`);
