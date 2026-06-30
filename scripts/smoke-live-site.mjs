#!/usr/bin/env node
import fs from 'node:fs/promises';
import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function hasFlag(name) {
  return process.argv.includes(name);
}

function option(...names) {
  for (const name of names) {
    const index = process.argv.indexOf(name);
    if (index !== -1) return process.argv[index + 1];
  }
  return undefined;
}

function positiveInteger(value, label) {
  if (value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer, got "${value}".`);
  }
  return parsed;
}

function normalizeVersion(value) {
  const version = String(value ?? '').trim().replace(/^v/i, '');
  if (!version) throw new Error('Expected package version is empty.');
  return version;
}

function normalizeCommit(value, label = 'Expected commit') {
  const commit = String(value ?? '').trim();
  if (!commit) return null;
  if (commit.toLowerCase() === 'unknown') return 'unknown';
  if (!/^[0-9a-f]{7,40}$/i.test(commit)) {
    throw new Error(`${label} must be "unknown" or a 7-40 character hex commit, got "${value}".`);
  }
  return commit.toLowerCase();
}

function requireBuildCommit(value, label) {
  const commit = normalizeCommit(value, label);
  if (!commit) throw new Error(`${label} is missing.`);
  return commit;
}

function commitsMatch(actual, expected) {
  if (!expected) return true;
  if (actual === 'unknown' || expected === 'unknown') return actual === expected;
  return actual.startsWith(expected) || expected.startsWith(actual);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function requireCount(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return value;
}

async function emitContract() {
  const distDir = path.resolve(root, option('--dist') ?? 'dist');
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const projects = await readJson(path.join(distDir, 'projects.json'));
  const releases = await readJson(path.join(distDir, 'releases.json'));
  const feed = await readJson(path.join(distDir, 'feed.json'));
  const status = await readJson(path.join(distDir, 'status.json'));

  const contract = {
    package_version: normalizeVersion(pkg.version),
    build_commit: requireBuildCommit(status.build?.commit ?? 'unknown', 'dist/status.json build.commit'),
    projects_count: requireCount(Number(projects.counts?.projects ?? projects.projects?.length), 'dist/projects.json project count'),
    releases_count: requireCount(Number(releases.counts?.releases ?? releases.releases?.length), 'dist/releases.json release count'),
    feed_item_count: requireCount(Number(feed.items?.length), 'dist/feed.json item count'),
  };

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      Object.entries(contract)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n') + '\n',
    );
  }

  console.log('Live smoke contract');
  console.log(`  package version: ${contract.package_version}`);
  console.log(`  build commit: ${contract.build_commit}`);
  console.log(`  projects: ${contract.projects_count}`);
  console.log(`  releases: ${contract.releases_count}`);
  console.log(`  feed items: ${contract.feed_item_count}`);
}

function siteUrl(pathname, baseUrl) {
  const base = new URL(baseUrl);
  const prefix = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
  const cleanPath = pathname.replace(/^\/+/, '');
  const target = new URL(`${prefix}${cleanPath}`, base);
  target.searchParams.set('_live_smoke', runId);
  return target;
}

async function fetchText(baseUrl, pathname, accept) {
  const target = siteUrl(pathname, baseUrl);
  const response = await fetch(target, {
    headers: {
      Accept: accept,
      'User-Agent': `sysadmindoc-live-smoke/${runId}`,
    },
    redirect: 'follow',
  });
  const body = await response.text();
  if (response.status !== 200) {
    throw new Error(`${pathname} returned HTTP ${response.status} from ${target}`);
  }
  return {
    body,
    cacheControl: response.headers.get('cache-control') ?? '',
    contentType: response.headers.get('content-type') ?? '',
    status: response.status,
  };
}

function parseJson(body, label) {
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(`${label} returned invalid JSON: ${error.message}`);
  }
}

function requireAbsoluteUrl(value, label) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') throw new Error('URL must use HTTPS');
    return url;
  } catch {
    throw new Error(`${label} must be an absolute HTTPS URL.`);
  }
}

function requireDate(value, label) {
  if (Number.isNaN(new Date(value).getTime())) {
    throw new Error(`${label} must be a parseable date.`);
  }
}

function requireHeader(response, pathname, { contentTypes, cacheControl }) {
  if (contentTypes.length > 0 && !contentTypes.some((type) => response.contentType.toLowerCase().startsWith(type))) {
    throw new Error(`${pathname} returned Content-Type "${response.contentType || '(missing)'}"; expected one of ${contentTypes.join(', ')}.`);
  }
  if (cacheControl && !new RegExp(`\\b${cacheControl}\\b`, 'i').test(response.cacheControl)) {
    throw new Error(`${pathname} returned Cache-Control "${response.cacheControl || '(missing)'}"; expected ${cacheControl}.`);
  }
}

async function checkLiveArtifacts(baseUrl, expected) {
  const summary = [];

  const sw = await fetchText(baseUrl, '/sw.js', 'application/javascript,text/plain,*/*');
  requireHeader(sw, '/sw.js', { contentTypes: ['application/javascript', 'text/javascript', 'text/plain'], cacheControl: 'max-age=600' });
  const cacheName = `portfolio-v${expected.version}`;
  if (!sw.body.includes(cacheName)) throw new Error(`/sw.js does not contain ${cacheName}.`);
  if (sw.body.includes('__BUILD_VERSION__')) throw new Error('/sw.js still contains the unstamped __BUILD_VERSION__ placeholder.');
  summary.push(`service worker cache: ${cacheName}`);

  const statusResponse = await fetchText(baseUrl, '/status.json', 'application/json');
  requireHeader(statusResponse, '/status.json', { contentTypes: ['application/json'], cacheControl: 'max-age=600' });
  const status = parseJson(statusResponse.body, '/status.json');
  if (status.schema !== 'sysadmindoc.status.v1') throw new Error('/status.json schema drifted.');
  if (normalizeVersion(status.version) !== expected.version) {
    throw new Error(`/status.json version drifted: expected ${expected.version}, got ${status.version}.`);
  }
  requireDate(status.generatedAt, '/status.json generatedAt');
  const buildCommit = requireBuildCommit(status.build?.commit ?? 'unknown', '/status.json build.commit');
  if (!commitsMatch(buildCommit, expected.commit)) {
    throw new Error(`/status.json build.commit drifted: expected ${expected.commit}, got ${buildCommit}.`);
  }
  const statusProjectCount = Number(status.catalog?.count);
  if (statusProjectCount !== expected.projects) {
    throw new Error(`/status.json catalog count drifted: expected ${expected.projects}, got ${statusProjectCount}.`);
  }
  summary.push(`status: v${status.version} (${buildCommit})`);

  const projectsResponse = await fetchText(baseUrl, '/projects.json', 'application/json');
  requireHeader(projectsResponse, '/projects.json', { contentTypes: ['application/json'], cacheControl: 'max-age=600' });
  const projects = parseJson(projectsResponse.body, '/projects.json');
  if (projects.schemaVersion !== 1) throw new Error('/projects.json schemaVersion must be 1.');
  if (!projects.source?.profileFeedUrl) throw new Error('/projects.json source.profileFeedUrl is missing.');
  requireAbsoluteUrl(projects.source.profileFeedUrl, '/projects.json source.profileFeedUrl');
  requireDate(projects.generatedAt, '/projects.json generatedAt');
  const projectCount = Number(projects.counts?.projects);
  if (projectCount !== expected.projects) {
    throw new Error(`/projects.json count drifted: expected ${expected.projects}, got ${projectCount}.`);
  }
  if (!Array.isArray(projects.projects) || projects.projects.length !== expected.projects) {
    throw new Error(`/projects.json projects length drifted from ${expected.projects}.`);
  }
  summary.push(`projects: ${projectCount} (${projects.source.data})`);

  const releasesResponse = await fetchText(baseUrl, '/releases.json', 'application/json');
  requireHeader(releasesResponse, '/releases.json', { contentTypes: ['application/json'], cacheControl: 'max-age=600' });
  const releases = parseJson(releasesResponse.body, '/releases.json');
  if (releases.schemaVersion !== 1) throw new Error('/releases.json schemaVersion must be 1.');
  requireDate(releases.generatedAt, '/releases.json generatedAt');
  const releaseCount = Number(releases.counts?.releases);
  if (releaseCount !== expected.releases) {
    throw new Error(`/releases.json count drifted: expected ${expected.releases}, got ${releaseCount}.`);
  }
  if (!Array.isArray(releases.releases) || releases.releases.length !== expected.releases) {
    throw new Error(`/releases.json releases length drifted from ${expected.releases}.`);
  }
  summary.push(`releases: ${releaseCount}`);

  const feedResponse = await fetchText(baseUrl, '/feed.json', 'application/feed+json,application/json');
  requireHeader(feedResponse, '/feed.json', { contentTypes: ['application/feed+json', 'application/json'], cacheControl: 'max-age=600' });
  const feed = parseJson(feedResponse.body, '/feed.json');
  if (feed.version !== 'https://jsonfeed.org/version/1.1') throw new Error('/feed.json version must be JSON Feed 1.1.');
  requireAbsoluteUrl(feed.home_page_url, '/feed.json home_page_url');
  requireAbsoluteUrl(feed.feed_url, '/feed.json feed_url');
  const feedItems = Array.isArray(feed.items) ? feed.items : [];
  if (feedItems.length !== expected.feedItems) {
    throw new Error(`/feed.json item count drifted: expected ${expected.feedItems}, got ${feedItems.length}.`);
  }
  for (const [index, item] of feedItems.entries()) {
    if (!item?.id) throw new Error(`/feed.json item ${index + 1} is missing id.`);
    if (!item?.url) throw new Error(`/feed.json item ${index + 1} is missing url.`);
    if (!item.content_html && !item.content_text) throw new Error(`/feed.json item ${index + 1} is missing content.`);
  }
  summary.push(`JSON Feed items: ${feedItems.length}`);

  const releasesXml = await fetchText(baseUrl, '/releases.xml', 'application/rss+xml,application/xml,text/xml,*/*');
  requireHeader(releasesXml, '/releases.xml', { contentTypes: ['application/rss+xml', 'application/xml', 'text/xml'], cacheControl: 'max-age=600' });
  if (!/<rss\b/i.test(releasesXml.body)) throw new Error('/releases.xml did not return an RSS document.');
  summary.push('release RSS: 200');

  const rssXml = await fetchText(baseUrl, '/rss.xml', 'application/rss+xml,application/xml,text/xml,*/*');
  requireHeader(rssXml, '/rss.xml', { contentTypes: ['application/rss+xml', 'application/xml', 'text/xml'], cacheControl: 'max-age=600' });
  if (!/<rss\b/i.test(rssXml.body)) throw new Error('/rss.xml did not return an RSS document.');
  summary.push('project RSS: 200');

  const atomXml = await fetchText(baseUrl, '/atom.xml', 'application/atom+xml,application/xml,text/xml,*/*');
  requireHeader(atomXml, '/atom.xml', { contentTypes: ['application/atom+xml', 'application/xml', 'text/xml'], cacheControl: 'max-age=600' });
  if (!/<feed\b[^>]*\bxmlns=["']http:\/\/www\.w3\.org\/2005\/Atom["']/i.test(atomXml.body)) {
    throw new Error('/atom.xml did not return an Atom document.');
  }
  const atomEntries = atomXml.body.match(/<entry\b/gi)?.length ?? 0;
  if (atomEntries !== expected.feedItems) {
    throw new Error(`/atom.xml entry count drifted: expected ${expected.feedItems}, got ${atomEntries}.`);
  }
  summary.push(`project Atom entries: ${atomEntries}`);

  const llms = await fetchText(baseUrl, '/llms.txt', 'text/plain,*/*');
  requireHeader(llms, '/llms.txt', { contentTypes: ['text/plain'], cacheControl: 'max-age=600' });
  if (!llms.body.trimStart().startsWith('# ')) throw new Error('/llms.txt did not return the expected markdown H1.');
  summary.push('llms.txt: 200');

  const cmdk = await fetchText(baseUrl, '/cmdk-data.js', 'application/javascript,text/javascript,*/*');
  requireHeader(cmdk, '/cmdk-data.js', { contentTypes: ['application/javascript', 'text/javascript'], cacheControl: 'max-age=600' });
  if (!cmdk.body.startsWith('window.__PORTFOLIO_DATA=Object.assign(')) {
    throw new Error('/cmdk-data.js did not return the expected command-palette payload wrapper.');
  }
  summary.push('cmdk-data.js: 200');

  const sitemap = await fetchText(baseUrl, '/sitemap-index.xml', 'application/xml,text/xml,*/*');
  requireHeader(sitemap, '/sitemap-index.xml', { contentTypes: ['application/xml', 'text/xml'], cacheControl: 'max-age=600' });
  if (!/<sitemapindex\b/i.test(sitemap.body)) throw new Error('/sitemap-index.xml did not return a sitemap index document.');
  summary.push('sitemap index: 200');
  summary.push('live cache-control: max-age=600');

  return summary;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function smokeLiveSite() {
  const baseUrl = option('--base-url', '--base') ?? process.env.LIVE_SITE_URL;
  if (!baseUrl) throw new Error('Provide --base-url or LIVE_SITE_URL.');
  const parsedBase = new URL(baseUrl);
  if (!['http:', 'https:'].includes(parsedBase.protocol)) {
    throw new Error(`Base URL must be HTTP(S), got ${baseUrl}.`);
  }

  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const expected = {
    version: normalizeVersion(option('--expected-version') ?? process.env.EXPECTED_VERSION ?? pkg.version),
    commit: normalizeCommit(option('--expected-commit') ?? process.env.EXPECTED_COMMIT),
    projects: positiveInteger(option('--expected-projects'), '--expected-projects'),
    releases: positiveInteger(option('--expected-releases'), '--expected-releases'),
    feedItems: positiveInteger(option('--expected-feed-items'), '--expected-feed-items'),
  };
  if (!expected.projects || !expected.releases || !expected.feedItems) {
    throw new Error('Expected project, release, and feed item counts are required.');
  }

  const attempts = positiveInteger(option('--retries') ?? process.env.LIVE_SMOKE_RETRIES ?? '8', '--retries');
  const retryMs = positiveInteger(option('--retry-ms') ?? process.env.LIVE_SMOKE_RETRY_MS ?? '7500', '--retry-ms');
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const summary = await checkLiveArtifacts(parsedBase.toString(), expected);
      console.log('Live artifact smoke');
      console.log(`  base: ${parsedBase.toString()}`);
      for (const line of summary) console.log(`  ${line}`);
      console.log('Live artifact smoke passed.');
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        console.warn(`Live artifact smoke attempt ${attempt}/${attempts} failed: ${error.message}`);
        await sleep(retryMs);
      }
    }
  }

  console.error('Live artifact smoke failed:');
  console.error(`  - ${lastError?.message ?? 'unknown failure'}`);
  process.exit(1);
}

try {
  if (hasFlag('--emit-contract')) {
    await emitContract();
  } else {
    await smokeLiveSite();
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
