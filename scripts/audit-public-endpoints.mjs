import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const distDir = path.resolve(root, process.argv.includes('--dist') ? process.argv[process.argv.indexOf('--dist') + 1] : 'dist');
const siteUrl = 'https://sysadmindoc.github.io';
const errors = [];

const discoveryLinks = [
  { href: '/rss.xml', type: 'application/rss+xml', label: 'recent projects RSS' },
  { href: '/releases.xml', type: 'application/rss+xml', label: 'releases RSS' },
  { href: '/feed.json', type: 'application/feed+json', label: 'JSON Feed' },
  { href: '/projects.json', type: 'application/json', label: 'project index JSON' },
  { href: '/releases.json', type: 'application/json', label: 'release index JSON' },
];

function fail(message) {
  errors.push(message);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function readText(relativePath) {
  try {
    return await fs.readFile(path.join(distDir, relativePath), 'utf8');
  } catch (error) {
    fail(`dist/${relativePath} is missing or unreadable: ${error.message}`);
    return '';
  }
}

async function readJson(relativePath) {
  const text = await readText(relativePath);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`dist/${relativePath} is invalid JSON: ${error.message}`);
    return {};
  }
}

function requireString(record, key, label) {
  const value = record?.[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${label}.${key} must be a non-empty string.`);
    return '';
  }
  return value;
}

function requireNumber(record, key, label) {
  const value = record?.[key];
  if (!Number.isFinite(value)) {
    fail(`${label}.${key} must be a finite number.`);
    return null;
  }
  return value;
}

function requireDate(value, label) {
  if (typeof value !== 'string' || Number.isNaN(new Date(value).getTime())) {
    fail(`${label} must be a parseable date string.`);
  }
}

function parseUrl(value, label, { siteOnly = false, allowNull = false } = {}) {
  if (value === null && allowNull) return null;
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${label} must be a non-empty absolute URL.`);
    return null;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') fail(`${label} must use HTTPS.`);
    if (siteOnly && url.origin !== siteUrl) fail(`${label} must use ${siteUrl}.`);
    return url;
  } catch {
    fail(`${label} must be an absolute URL, got "${value}".`);
    return null;
  }
}

function compareCount(label, count, rows) {
  if (!Number.isSafeInteger(count) || count < 1) {
    fail(`${label} count must be a positive integer.`);
    return;
  }
  if (!Array.isArray(rows) || rows.length !== count) {
    fail(`${label} count is ${count}, but row length is ${Array.isArray(rows) ? rows.length : 'not an array'}.`);
  }
}

function decodeHtmlAttribute(value) {
  return String(value ?? '').replace(/&(#x[0-9a-f]+|#\d+|amp|apos|quot|lt|gt);/gi, (match, entity) => {
    const normalized = entity.toLowerCase();
    if (normalized === 'amp') return '&';
    if (normalized === 'apos') return "'";
    if (normalized === 'quot') return '"';
    if (normalized === 'lt') return '<';
    if (normalized === 'gt') return '>';
    if (normalized.startsWith('#x')) return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
    if (normalized.startsWith('#')) return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
    return match;
  });
}

function extractAttribute(tag, name) {
  const pattern = new RegExp(`\\b${name}=("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = pattern.exec(tag);
  return match ? decodeHtmlAttribute(match[2] ?? match[3] ?? match[4] ?? '') : null;
}

function auditProjectsIndex(projectsIndex) {
  if (!isObject(projectsIndex)) {
    fail('projects.json root must be an object.');
    return { projectCount: 0 };
  }
  if (projectsIndex.schemaVersion !== 1) fail('projects.json schemaVersion must be 1.');
  requireDate(projectsIndex.generatedAt, 'projects.json generatedAt');
  if (projectsIndex.source?.repository !== 'SysAdminDoc/sysadmindoc.github.io') {
    fail('projects.json source.repository drifted.');
  }
  parseUrl(projectsIndex.source?.profileFeedUrl, 'projects.json source.profileFeedUrl');
  compareCount('projects.json projects', Number(projectsIndex.counts?.projects), projectsIndex.projects);

  const seenSlugs = new Set();
  for (const [index, project] of Array.isArray(projectsIndex.projects) ? projectsIndex.projects.entries() : []) {
    const label = `projects.json projects[${index}]`;
    if (!isObject(project)) {
      fail(`${label} must be an object.`);
      continue;
    }
    const slug = requireString(project, 'slug', label);
    requireString(project, 'name', label);
    requireString(project, 'description', label);
    requireString(project, 'category', label);
    requireString(project, 'categoryLabel', label);
    if (slug) {
      if (seenSlugs.has(slug)) fail(`${label}.slug duplicates ${slug}.`);
      seenSlugs.add(slug);
    }
    const detailUrl = parseUrl(project.urls?.detail, `${label}.urls.detail`, { siteOnly: true });
    if (detailUrl && slug && detailUrl.pathname !== `/projects/${slug}/`) {
      fail(`${label}.urls.detail must point at /projects/${slug}/.`);
    }
    parseUrl(project.urls?.repository, `${label}.urls.repository`);
    parseUrl(project.urls?.source, `${label}.urls.source`);
    parseUrl(project.urls?.live, `${label}.urls.live`, { allowNull: true });
    parseUrl(project.urls?.ogImage, `${label}.urls.ogImage`, { siteOnly: true });
    parseUrl(project.urls?.screenshot, `${label}.urls.screenshot`, { siteOnly: true, allowNull: true });
    parseUrl(project.urls?.thumbnail, `${label}.urls.thumbnail`, { siteOnly: true, allowNull: true });
    const stars = project.metrics?.stars;
    if (stars !== null && (!Number.isFinite(stars) || stars < 0)) {
      fail(`${label}.metrics.stars must be null or a non-negative number.`);
    }
    for (const key of ['pushedAt', 'updatedAt']) {
      const value = project.freshness?.[key];
      if (value !== null && value !== undefined) requireDate(value, `${label}.freshness.${key}`);
    }
  }
  return { projectCount: seenSlugs.size };
}

function auditReleasesIndex(releasesIndex) {
  if (!isObject(releasesIndex)) {
    fail('releases.json root must be an object.');
    return { releaseCount: 0, releaseRepoCount: 0 };
  }
  if (releasesIndex.schemaVersion !== 1) fail('releases.json schemaVersion must be 1.');
  requireDate(releasesIndex.generatedAt, 'releases.json generatedAt');
  compareCount('releases.json releases', Number(releasesIndex.counts?.releases), releasesIndex.releases);

  const repos = new Set();
  let previousTime = Number.POSITIVE_INFINITY;
  for (const [index, release] of Array.isArray(releasesIndex.releases) ? releasesIndex.releases.entries() : []) {
    const label = `releases.json releases[${index}]`;
    if (!isObject(release)) {
      fail(`${label} must be an object.`);
      continue;
    }
    const repo = requireString(release, 'repo', label);
    requireString(release, 'projectName', label);
    requireString(release, 'tag', label);
    requireString(release, 'name', label);
    if (typeof release.summary !== 'string') fail(`${label}.summary must be a string.`);
    if (repo) repos.add(repo);
    requireDate(release.publishedAt, `${label}.publishedAt`);
    const time = new Date(release.publishedAt).getTime();
    if (Number.isFinite(time) && time > previousTime) {
      fail(`${label}.publishedAt is newer than the previous release; releases must be newest-first.`);
    }
    if (Number.isFinite(time)) previousTime = time;
    parseUrl(release.urls?.release, `${label}.urls.release`);
    parseUrl(release.urls?.repository, `${label}.urls.repository`);
    const detailUrl = parseUrl(release.urls?.detail, `${label}.urls.detail`, { siteOnly: true, allowNull: true });
    if (detailUrl && repo && detailUrl.pathname !== `/projects/${repo}/`) {
      fail(`${label}.urls.detail must point at /projects/${repo}/ when present.`);
    }
  }

  const expectedRepoCount = requireNumber(releasesIndex.counts, 'repositories', 'releases.json counts');
  if (expectedRepoCount !== null && repos.size !== expectedRepoCount) {
    fail(`releases.json counts.repositories is ${expectedRepoCount}; expected ${repos.size}.`);
  }
  return { releaseCount: Array.isArray(releasesIndex.releases) ? releasesIndex.releases.length : 0, releaseRepoCount: repos.size };
}

function parseCmdkPayload(source) {
  const match = /^window\.__PORTFOLIO_DATA=Object\.assign\(window\.__PORTFOLIO_DATA\|\|\{},([\s\S]+)\);\s*$/.exec(source.trim());
  if (!match) {
    fail('cmdk-data.js does not match the expected Object.assign payload wrapper.');
    return {};
  }
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    fail(`cmdk-data.js payload is not valid JSON: ${error.message}`);
    return {};
  }
}

function auditCmdkData(source) {
  const payload = parseCmdkPayload(source);
  if (!isObject(payload)) return { cmdkProjects: 0, quickLinks: 0 };
  if (!Array.isArray(payload.allProjects) || payload.allProjects.length === 0) {
    fail('cmdk-data.js allProjects must be a non-empty array.');
  }
  if (!Array.isArray(payload.quickLinks) || payload.quickLinks.length === 0) {
    fail('cmdk-data.js quickLinks must be a non-empty array.');
  }

  const seenSlugs = new Set();
  for (const [index, project] of Array.isArray(payload.allProjects) ? payload.allProjects.entries() : []) {
    const label = `cmdk-data.js allProjects[${index}]`;
    const slug = requireString(project, 'slug', label);
    requireString(project, 'name', label);
    requireString(project, 'desc', label);
    requireString(project, 'type', label);
    const url = requireString(project, 'url', label);
    if (slug) {
      if (seenSlugs.has(slug)) fail(`${label}.slug duplicates ${slug}.`);
      seenSlugs.add(slug);
    }
    if (url && !/^\/projects\/[^/]+\/$/.test(url)) fail(`${label}.url must be a project detail route.`);
  }

  for (const [index, link] of Array.isArray(payload.quickLinks) ? payload.quickLinks.entries() : []) {
    const label = `cmdk-data.js quickLinks[${index}]`;
    requireString(link, 'label', label);
    requireString(link, 'desc', label);
    const url = requireString(link, 'url', label);
    if (url && !(url.startsWith('/') || /^https:\/\//.test(url))) {
      fail(`${label}.url must be root-relative or HTTPS.`);
    }
  }
  return {
    cmdkProjects: Array.isArray(payload.allProjects) ? payload.allProjects.length : 0,
    quickLinks: Array.isArray(payload.quickLinks) ? payload.quickLinks.length : 0,
  };
}

function auditLlmsTxt(text) {
  const lines = text.split(/\r?\n/);
  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  if (!nonEmpty[0]?.startsWith('# ')) fail('llms.txt first non-empty line must be an H1.');
  if (!nonEmpty.some((line) => line.startsWith('> '))) fail('llms.txt must include a blockquote summary.');

  const requiredSections = ['Featured projects', 'Live apps', 'Pages', 'Feeds'];
  for (const section of requiredSections) {
    if (!lines.some((line) => line.trim() === `## ${section}`)) {
      fail(`llms.txt is missing "## ${section}".`);
    }
  }

  const linkPattern = /^- \[([^\]]+)\]\(([^)]+)\):\s+(.+)$/;
  let linkCount = 0;
  for (const [index, line] of lines.entries()) {
    if (!line.startsWith('- ')) continue;
    const match = linkPattern.exec(line);
    if (!match) {
      fail(`llms.txt list item on line ${index + 1} must use "- [label](url): description".`);
      continue;
    }
    const [, label, url, desc] = match;
    if (!label.trim()) fail(`llms.txt list item on line ${index + 1} has an empty label.`);
    if (!desc.trim()) fail(`llms.txt list item on line ${index + 1} has an empty description.`);
    parseUrl(url, `llms.txt link on line ${index + 1}`);
    linkCount += 1;
  }
  if (linkCount < 20) fail(`llms.txt should expose at least 20 useful links, found ${linkCount}.`);
  return { llmsLinks: linkCount };
}

function auditDiscoveryLinks(html) {
  const alternates = [];
  for (const match of html.matchAll(/<link\b[^>]*\brel=(["'])alternate\1[^>]*>/gi)) {
    const tag = match[0];
    alternates.push({
      href: extractAttribute(tag, 'href'),
      type: extractAttribute(tag, 'type'),
      title: extractAttribute(tag, 'title'),
    });
  }

  for (const expected of discoveryLinks) {
    const found = alternates.find((link) => link.href === expected.href && link.type === expected.type);
    if (!found) {
      fail(`index.html is missing alternate discovery link for ${expected.label} (${expected.type} ${expected.href}).`);
    } else if (!found.title) {
      fail(`index.html alternate discovery link for ${expected.label} must include a title.`);
    }
  }
  return { discoveryCount: alternates.length };
}

const projectsIndex = await readJson('projects.json');
const releasesIndex = await readJson('releases.json');
const cmdkSource = await readText('cmdk-data.js');
const llmsText = await readText('llms.txt');
const indexHtml = await readText('index.html');

const projectsSummary = auditProjectsIndex(projectsIndex);
const releasesSummary = auditReleasesIndex(releasesIndex);
const cmdkSummary = auditCmdkData(cmdkSource);
const llmsSummary = auditLlmsTxt(llmsText);
const discoverySummary = auditDiscoveryLinks(indexHtml);

if (errors.length > 0) {
  console.error('Public endpoint audit failed:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('Public endpoint audit');
console.log(`  projects.json projects: ${projectsSummary.projectCount}`);
console.log(`  releases.json releases: ${releasesSummary.releaseCount}`);
console.log(`  releases.json repositories: ${releasesSummary.releaseRepoCount}`);
console.log(`  cmdk-data.js projects: ${cmdkSummary.cmdkProjects}`);
console.log(`  cmdk-data.js quick links: ${cmdkSummary.quickLinks}`);
console.log(`  llms.txt links: ${llmsSummary.llmsLinks}`);
console.log(`  alternate discovery links: ${discoverySummary.discoveryCount}`);
console.log('Public endpoint audit passed.');
