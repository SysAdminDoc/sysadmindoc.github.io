import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const distDir = path.resolve(root, process.argv.includes('--dist') ? process.argv[process.argv.indexOf('--dist') + 1] : 'dist');
const siteUrl = 'https://sysadmindoc.github.io';
const errors = [];
const generatedEndpointCacheControl = 'public, max-age=300';
const generatedImageCacheControl = 'public, max-age=86400';

const discoveryLinks = [
  { href: '/rss.xml', type: 'application/rss+xml', label: 'recent projects RSS' },
  { href: '/releases.xml', type: 'application/rss+xml', label: 'releases RSS' },
  { href: '/atom.xml', type: 'application/atom+xml', label: 'projects Atom feed' },
  { href: '/feed.json', type: 'application/feed+json', label: 'JSON Feed' },
  { href: '/projects.json', type: 'application/json', label: 'project index JSON' },
  { href: '/releases.json', type: 'application/json', label: 'release index JSON' },
];
const endpointHeaderSources = [
  { route: '/projects.json', file: 'src/pages/projects.json.ts', helper: 'endpointHeaders', contentType: 'application/json; charset=UTF-8', cacheControl: generatedEndpointCacheControl },
  { route: '/releases.json', file: 'src/pages/releases.json.ts', helper: 'endpointHeaders', contentType: 'application/json; charset=UTF-8', cacheControl: generatedEndpointCacheControl },
  { route: '/resume.json', file: 'src/pages/resume.json.ts', helper: 'endpointHeaders', contentType: 'application/json; charset=UTF-8', cacheControl: generatedEndpointCacheControl },
  { route: '/status.json', file: 'src/pages/status.json.ts', helper: 'endpointHeaders', contentType: 'application/json; charset=UTF-8', cacheControl: generatedEndpointCacheControl },
  { route: '/feed.json', file: 'src/pages/feed.json.ts', helper: 'endpointHeaders', contentType: 'application/feed+json; charset=UTF-8', cacheControl: generatedEndpointCacheControl },
  { route: '/atom.xml', file: 'src/pages/atom.xml.ts', helper: 'endpointHeaders', contentType: 'application/atom+xml; charset=UTF-8', cacheControl: generatedEndpointCacheControl },
  { route: '/releases.xml', file: 'src/pages/releases.xml.ts', helper: 'endpointHeaders', contentType: 'application/rss+xml; charset=UTF-8', cacheControl: generatedEndpointCacheControl },
  { route: '/llms.txt', file: 'src/pages/llms.txt.ts', helper: 'endpointHeaders', contentType: 'text/plain; charset=UTF-8', cacheControl: generatedEndpointCacheControl },
  { route: '/cmdk-data.js', file: 'src/pages/cmdk-data.js.ts', helper: 'endpointHeaders', contentType: 'text/javascript; charset=UTF-8', cacheControl: generatedEndpointCacheControl },
  { route: '/rss.xml', file: 'src/pages/rss.xml.ts', helper: 'withEndpointCache', cacheControl: generatedEndpointCacheControl },
  { route: '/og/[slug].png', file: 'src/pages/og/[slug].png.ts', helper: 'imageEndpointHeaders', contentType: 'image/png', cacheControl: generatedImageCacheControl },
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

function requireNullableNumber(record, key, label) {
  const value = record?.[key];
  if (value === null) return null;
  if (!Number.isFinite(value)) {
    fail(`${label}.${key} must be a finite number or null.`);
    return null;
  }
  return value;
}

function requireBoolean(record, key, label) {
  const value = record?.[key];
  if (typeof value !== 'boolean') {
    fail(`${label}.${key} must be a boolean.`);
    return false;
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

function auditStatusEndpoint(statusIndex, { projectCount }) {
  if (!isObject(statusIndex)) {
    fail('status.json root must be an object.');
    return { buildCommit: 'unknown', dataMode: 'unknown' };
  }
  if (statusIndex.schema !== 'sysadmindoc.status.v1') fail('status.json schema drifted.');
  requireString(statusIndex, 'version', 'status.json');
  requireDate(statusIndex.generatedAt, 'status.json generatedAt');
  if (!isObject(statusIndex.build)) {
    fail('status.json build must be an object.');
  } else {
    const commit = requireString(statusIndex.build, 'commit', 'status.json build');
    requireString(statusIndex.build, 'commitShort', 'status.json build');
    requireString(statusIndex.build, 'source', 'status.json build');
    if (commit && !/^(unknown|[0-9a-f]{7,40})$/i.test(commit)) {
      fail('status.json build.commit must be unknown or a 7-40 character hex commit.');
    }
  }
  if (Number(statusIndex.catalog?.count) !== projectCount) {
    fail(`status.json catalog.count must match projects.json projects (${projectCount}).`);
  }
  if (!Number.isSafeInteger(Number(statusIndex.catalog?.liveApps)) || Number(statusIndex.catalog?.liveApps) < 1) {
    fail('status.json catalog.liveApps must be a positive integer.');
  }
  const generatedData = statusIndex.generatedData;
  if (!isObject(generatedData)) {
    fail('status.json generatedData must be an object.');
    return { buildCommit: String(statusIndex.build?.commit ?? 'unknown'), dataMode: 'unknown' };
  }

  const allowedStatuses = new Set(['fresh', 'attention-required']);
  const allowedModes = new Set(['fixture', 'unauthenticated-partial', 'production-fresh', 'production-attention']);
  const dataStatus = requireString(generatedData, 'status', 'status.json generatedData');
  const dataMode = requireString(generatedData, 'mode', 'status.json generatedData');
  if (dataStatus && !allowedStatuses.has(dataStatus)) fail(`status.json generatedData.status "${dataStatus}" is not recognized.`);
  if (dataMode && !allowedModes.has(dataMode)) fail(`status.json generatedData.mode "${dataMode}" is not recognized.`);
  requireNumber(generatedData, 'maxAgeHours', 'status.json generatedData');
  requireNullableNumber(generatedData, 'ageHours', 'status.json generatedData');
  requireBoolean(generatedData, 'stale', 'status.json generatedData');
  requireNullableNumber(generatedData, 'totalRepos', 'status.json generatedData');
  requireNullableNumber(generatedData, 'totalStars', 'status.json generatedData');
  requireNumber(generatedData, 'readmeEntries', 'status.json generatedData');

  const profileFeed = generatedData.profileFeed;
  if (!isObject(profileFeed)) {
    fail('status.json generatedData.profileFeed must be an object.');
  } else {
    requireBoolean(profileFeed, 'active', 'status.json generatedData.profileFeed');
    requireNullableNumber(profileFeed, 'projectCount', 'status.json generatedData.profileFeed');
    requireNullableNumber(profileFeed, 'cachedAgeHours', 'status.json generatedData.profileFeed');
    requireBoolean(profileFeed, 'stale', 'status.json generatedData.profileFeed');
  }

  const coverage = generatedData.coverage;
  if (!isObject(coverage)) {
    fail('status.json generatedData.coverage must be an object.');
  } else {
    requireNumber(coverage, 'threshold', 'status.json generatedData.coverage');
    requireNullableNumber(coverage, 'profileProjectCount', 'status.json generatedData.coverage');
    for (const key of ['stars', 'metadata', 'readmes', 'releases']) {
      requireNullableNumber(coverage, key, 'status.json generatedData.coverage');
    }
    for (const key of ['starEntries', 'metadataEntries', 'readmeEntries', 'releaseEntries']) {
      requireNumber(coverage, key, 'status.json generatedData.coverage');
    }
  }

  const readmeRefresh = generatedData.readmeRefresh;
  if (!isObject(readmeRefresh)) {
    fail('status.json generatedData.readmeRefresh must be an object.');
  } else {
    if (readmeRefresh.tokenPresent !== null && typeof readmeRefresh.tokenPresent !== 'boolean') {
      fail('status.json generatedData.readmeRefresh.tokenPresent must be a boolean or null.');
    }
    requireNullableNumber(readmeRefresh, 'targetRepos', 'status.json generatedData.readmeRefresh');
    requireNullableNumber(readmeRefresh, 'attempted', 'status.json generatedData.readmeRefresh');
    requireNullableNumber(readmeRefresh, 'cacheEntries', 'status.json generatedData.readmeRefresh');
    requireNullableNumber(readmeRefresh, 'cacheCoverage', 'status.json generatedData.readmeRefresh');
    requireNullableNumber(readmeRefresh, 'missRate', 'status.json generatedData.readmeRefresh');
    if (readmeRefresh.rateLimited !== null && typeof readmeRefresh.rateLimited !== 'boolean') {
      fail('status.json generatedData.readmeRefresh.rateLimited must be a boolean or null.');
    }
  }

  if (!Array.isArray(generatedData.warnings) || generatedData.warnings.some((warning) => typeof warning !== 'string')) {
    fail('status.json generatedData.warnings must be an array of strings.');
  }

  return { buildCommit: String(statusIndex.build?.commit ?? 'unknown'), dataMode };
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

function minimumUsefulLinkCount(projectCount, requiredUrlCount) {
  const fixtureAwareFloor = requiredUrlCount + Math.min(projectCount, 24);
  return Math.min(50, fixtureAwareFloor);
}

function auditLlmsTxt(text, { projectCount }) {
  const lines = text.split(/\r?\n/);
  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  if (!nonEmpty[0]?.startsWith('# ')) fail('llms.txt first non-empty line must be an H1.');
  if (!nonEmpty.some((line) => line.startsWith('> '))) fail('llms.txt must include a blockquote summary.');

  const requiredSections = ['Featured projects', 'Live apps', 'Pages', 'Language lanes', 'Feeds', 'Machine-readable endpoints'];
  for (const section of requiredSections) {
    if (!lines.some((line) => line.trim() === `## ${section}`)) {
      fail(`llms.txt is missing "## ${section}".`);
    }
  }

  const linkPattern = /^- \[([^\]]+)\]\(([^)]+)\):\s+(.+)$/;
  let linkCount = 0;
  const urls = new Set();
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
    urls.add(url);
    linkCount += 1;
  }
  const requiredUrls = [
    '/',
    '/search/',
    '/releases/',
    '/now/',
    '/uses/',
    '/resume/',
    '/healthcare-it/',
    '/timeline/',
    '/archive/',
    '/lang/powershell/',
    '/lang/python/',
    '/lang/javascript/',
    '/lang/web/',
    '/lang/kotlin/',
    '/lang/cs/',
    '/lang/security/',
    '/feed.json',
    '/rss.xml',
    '/atom.xml',
    '/releases.xml',
    '/projects.json',
    '/releases.json',
    '/resume.json',
    '/cmdk-data.js',
    '/sitemap-index.xml',
    '/llms.txt',
  ].map((url) => `${siteUrl}${url}`);
  for (const url of requiredUrls) {
    if (!urls.has(url)) fail(`llms.txt is missing required link ${url}.`);
  }
  if (/All\s+\d+\+\s+public projects/i.test(text)) {
    fail('llms.txt catalog count must be exact, not plus-suffixed.');
  }
  const minimumUsefulLinks = minimumUsefulLinkCount(projectCount, requiredUrls.length);
  if (linkCount < minimumUsefulLinks) {
    fail(`llms.txt should expose at least ${minimumUsefulLinks} useful links, found ${linkCount}.`);
  }
  return { llmsLinks: linkCount, minimumUsefulLinks };
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

function auditSecurityTxt(text) {
  if (!text.trim()) {
    fail('dist/.well-known/security.txt is empty.');
    return { contacts: [], hasCanonical: false, expires: null };
  }

  const lines = text.split(/\r?\n/);
  const contacts = [];
  let hasCanonical = false;
  let expires = null;
  let hasPreferredLanguages = false;

  for (const line of lines) {
    if (line.startsWith('#') || !line.trim()) continue;
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const field = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    if (field === 'Contact') {
      parseUrl(value, 'security.txt Contact');
      contacts.push(value);
    } else if (field === 'Canonical') {
      const expectedCanonical = `${siteUrl}/.well-known/security.txt`;
      if (value !== expectedCanonical) {
        fail(`security.txt Canonical must be "${expectedCanonical}", got "${value}".`);
      }
      hasCanonical = true;
    } else if (field === 'Expires') {
      requireDate(value, 'security.txt Expires');
      const expiresDate = new Date(value);
      if (!Number.isNaN(expiresDate.getTime())) {
        const now = new Date();
        if (expiresDate <= now) {
          fail(`security.txt Expires date "${value}" is in the past.`);
        }
        const oneYearFromNow = new Date(now);
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        if (expiresDate > oneYearFromNow) {
          fail(`security.txt Expires date "${value}" is more than 1 year from now (RFC 9116 guidance).`);
        }
      }
      expires = value;
    } else if (field === 'Preferred-Languages') {
      hasPreferredLanguages = true;
    }
  }

  if (contacts.length === 0) fail('security.txt must have at least one Contact: field with an HTTPS URL.');
  if (!hasCanonical) fail('security.txt must have a Canonical: field.');
  if (expires === null) fail('security.txt must have an Expires: field.');
  if (!hasPreferredLanguages) fail('security.txt must have a Preferred-Languages: field.');

  return { contacts, hasCanonical, expires };
}

function auditRobotsTxt(text) {
  if (!text.trim()) {
    fail('dist/robots.txt is empty.');
    return { userAgents: [], sitemapUrl: null };
  }

  const lines = text.split(/\r?\n/);
  const userAgents = [];
  let sitemapUrl = null;

  for (const line of lines) {
    if (line.startsWith('#') || !line.trim()) continue;
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const field = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    if (field === 'User-agent') {
      userAgents.push(value);
    } else if (field === 'Sitemap') {
      sitemapUrl = value;
    }
  }

  if (userAgents.length === 0) fail('robots.txt must have at least one User-agent: directive.');

  const expectedSitemap = `${siteUrl}/sitemap-index.xml`;
  if (sitemapUrl !== expectedSitemap) {
    fail(`robots.txt Sitemap must be "${expectedSitemap}", got "${sitemapUrl ?? '(missing)'}".`);
  }

  return { userAgents, sitemapUrl };
}

function auditHumansTxt(text) {
  if (!text.trim()) {
    fail('dist/humans.txt is empty.');
    return { present: false };
  }
  return { present: true };
}

async function auditSourceHeaderPolicies() {
  const helperSource = await fs.readFile(path.join(root, 'src', 'data', 'endpoint-headers.ts'), 'utf8').catch((error) => {
    fail(`src/data/endpoint-headers.ts is missing or unreadable: ${error.message}`);
    return '';
  });
  if (!helperSource.includes(`GENERATED_ENDPOINT_CACHE_CONTROL = '${generatedEndpointCacheControl}'`)) {
    fail(`GENERATED_ENDPOINT_CACHE_CONTROL must be ${generatedEndpointCacheControl}.`);
  }
  if (!helperSource.includes(`GENERATED_IMAGE_CACHE_CONTROL = '${generatedImageCacheControl}'`)) {
    fail(`GENERATED_IMAGE_CACHE_CONTROL must be ${generatedImageCacheControl}.`);
  }

  let checked = 0;
  for (const expectation of endpointHeaderSources) {
    const source = await fs.readFile(path.join(root, expectation.file), 'utf8').catch((error) => {
      fail(`${expectation.file} is missing or unreadable: ${error.message}`);
      return '';
    });
    if (!source.includes("../data/endpoint-headers") && !source.includes('../../data/endpoint-headers')) {
      fail(`${expectation.file} must import the shared endpoint header policy for ${expectation.route}.`);
    }
    if (expectation.contentType) {
      const escaped = expectation.contentType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`${expectation.helper}\\(['"]${escaped}['"]\\)`);
      if (!pattern.test(source)) {
        fail(`${expectation.file} must declare ${expectation.route} as ${expectation.contentType} through ${expectation.helper}().`);
      }
    } else if (!source.includes(`${expectation.helper}(`)) {
      fail(`${expectation.file} must apply ${expectation.helper}() to ${expectation.route}.`);
    }
    if (/max-age=31536000|immutable/i.test(source)) {
      fail(`${expectation.file} must not use long immutable caching for unhashed generated endpoint ${expectation.route}.`);
    }
    checked += 1;
  }
  return { sourceHeaderPolicies: checked };
}

const projectsIndex = await readJson('projects.json');
const releasesIndex = await readJson('releases.json');
const statusIndex = await readJson('status.json');
const cmdkSource = await readText('cmdk-data.js');
const llmsText = await readText('llms.txt');
const indexHtml = await readText('index.html');

const projectsSummary = auditProjectsIndex(projectsIndex);
const releasesSummary = auditReleasesIndex(releasesIndex);
const statusSummary = auditStatusEndpoint(statusIndex, projectsSummary);
const cmdkSummary = auditCmdkData(cmdkSource);
const llmsSummary = auditLlmsTxt(llmsText, { projectCount: projectsSummary.projectCount });
const discoverySummary = auditDiscoveryLinks(indexHtml);
const headerSummary = await auditSourceHeaderPolicies();

const securityTxt = await readText('.well-known/security.txt');
const robotsTxt = await readText('robots.txt');
const humansTxt = await readText('humans.txt');

const securitySummary = auditSecurityTxt(securityTxt);
const robotsSummary = auditRobotsTxt(robotsTxt);
const humansSummary = auditHumansTxt(humansTxt);

if (errors.length > 0) {
  console.error('Public endpoint audit failed:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('Public endpoint audit');
console.log(`  projects.json projects: ${projectsSummary.projectCount}`);
console.log(`  releases.json releases: ${releasesSummary.releaseCount}`);
console.log(`  releases.json repositories: ${releasesSummary.releaseRepoCount}`);
console.log(`  status.json build commit: ${statusSummary.buildCommit}`);
console.log(`  status.json generated data mode: ${statusSummary.dataMode}`);
console.log(`  cmdk-data.js projects: ${cmdkSummary.cmdkProjects}`);
console.log(`  cmdk-data.js quick links: ${cmdkSummary.quickLinks}`);
console.log(`  llms.txt links: ${llmsSummary.llmsLinks} / ${llmsSummary.minimumUsefulLinks} minimum`);
console.log(`  alternate discovery links: ${discoverySummary.discoveryCount}`);
console.log(`  source header policies: ${headerSummary.sourceHeaderPolicies}`);
console.log(`  security.txt contacts: ${securitySummary.contacts.length}, expires: ${securitySummary.expires}`);
console.log(`  robots.txt user-agents: ${robotsSummary.userAgents.length}, sitemap: ${robotsSummary.sitemapUrl}`);
console.log(`  humans.txt: ${humansSummary.present ? 'present' : 'missing'}`);
console.log('Public endpoint audit passed.');
