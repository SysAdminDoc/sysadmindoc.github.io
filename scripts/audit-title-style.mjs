#!/usr/bin/env node
// Holds every name a reader sees for this site to its writing rule: each
// built page's <title> and the og:title and twitter:title that repeat it, the
// feed names in each page's alternate links, and each feed's own title. No em
// dash, en dash or other dash, and no hyphen between spaces
// (scripts/lib/title-style.mjs). Item titles inside the feeds are left out:
// they're the names of GitHub releases and repos, which the site doesn't write.
//
//   --dist <path>   the build to read (default dist)
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { XMLParser } from 'fast-xml-parser';
import { parse } from 'parse5';
import { titleStyleProblem } from './lib/title-style.mjs';

const root = process.cwd();
const distArg = process.argv.indexOf('--dist');
const distDir = path.resolve(root, distArg === -1 ? 'dist' : process.argv[distArg + 1]);
const HTML = 'http://www.w3.org/1999/xhtml';

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

/** Every reader-facing name in one built page, with where it sits. */
function pageNames(html) {
  const names = [];
  for (const element of elements(parse(html, { scriptingEnabled: false }))) {
    if (element.namespaceURI !== HTML) continue;
    if (element.tagName === 'title') names.push({ where: '<title>', text: textOf(element) });
    if (element.tagName === 'meta') {
      const key = attribute(element, 'property') ?? attribute(element, 'name');
      if (key === 'og:title' || key === 'twitter:title') names.push({ where: key, text: attribute(element, 'content') ?? '' });
    }
    if (element.tagName === 'link' && /(?:^|\s)alternate(?:\s|$)/i.test(attribute(element, 'rel') ?? '') && attribute(element, 'title') !== undefined) {
      names.push({ where: `the ${attribute(element, 'href')} link`, text: attribute(element, 'title') ?? '' });
    }
  }
  return names;
}

const xml = new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: true });
const textValue = (value) => (typeof value === 'string' ? value : typeof value?.['#text'] === 'string' ? value['#text'] : '');

/** Each feed's own name. */
function feedNames() {
  const names = [];
  const read = (file) => {
    const full = path.join(distDir, file);
    return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
  };
  for (const file of ['rss.xml', 'releases.xml']) {
    const text = read(file);
    if (text !== null) names.push({ file, text: textValue(xml.parse(text)?.rss?.channel?.title) });
  }
  const atom = read('atom.xml');
  if (atom !== null) names.push({ file: 'atom.xml', text: textValue(xml.parse(atom)?.feed?.title) });
  const json = read('feed.json');
  if (json !== null) names.push({ file: 'feed.json', text: String(JSON.parse(json)?.title ?? '') });
  return names;
}

const problems = [];
const files = htmlFiles(distDir);
for (const file of files) {
  const rel = path.relative(distDir, file).replaceAll('\\', '/');
  for (const { where, text } of pageNames(fs.readFileSync(file, 'utf8'))) {
    const problem = titleStyleProblem(text);
    if (problem) problems.push(`${rel}: ${where} "${text.trim().slice(0, 100)}" has ${problem}`);
  }
}
const feeds = feedNames();
for (const { file, text } of feeds) {
  const problem = titleStyleProblem(text);
  if (problem) problems.push(`${file}: the feed's title "${text.slice(0, 100)}" has ${problem}`);
}

if (problems.length > 0) {
  console.error(`title-style audit: ${problems.length} name(s) break the writing rule (join parts with " | "):`);
  for (const problem of problems.slice(0, 20)) console.error(`  - ${problem}`);
  if (problems.length > 20) console.error(`  ...and ${problems.length - 20} more`);
  process.exit(1);
}
console.log(`title-style audit passed: ${files.length} pages and ${feeds.length} feeds, no dash in any title or feed name.`);
