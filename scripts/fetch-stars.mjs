#!/usr/bin/env node
// Build-time GitHub data refresh.
// Writes generated data used across the site:
// - src/data/_stars.json
// - src/data/_stats.json
// - src/data/_meta.json
// - src/data/_releases.json
// - src/data/_readmes.json
//
// Auth: reads GITHUB_TOKEN from env. Repo and release refreshes can work without it,
// but full README refreshes are intentionally skipped unless a token is present.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dataDir = join(root, 'src', 'data');

const USER = 'SysAdminDoc';
const token = process.env.GITHUB_TOKEN;
const headers = {
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'sysadmindoc-portfolio-build',
};
if (token) headers.Authorization = `Bearer ${token}`;

const starsPath = join(dataDir, '_stars.json');
const statsPath = join(dataDir, '_stats.json');
const metaPath = join(dataDir, '_meta.json');
const releasesPath = join(dataDir, '_releases.json');
const readmesPath = join(dataDir, '_readmes.json');

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(path, value, pretty = true) {
  const body = pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value);
  writeFileSync(path, `${body}\n`);
}

function describeGitHubFailure(res) {
  const reset = res.headers.get('x-ratelimit-reset');
  if (res.status === 403 && reset) {
    const resetAt = new Date(Number(reset) * 1000).toISOString();
    return `${res.status} ${res.statusText} (rate limit resets at ${resetAt})`;
  }
  return `${res.status} ${res.statusText}`;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, options, context) {
  const res = await fetchWithTimeout(url, options);
  if (!res.ok) {
    throw new Error(`${context}: ${describeGitHubFailure(res)}`);
  }
  const data = await res.json();
  return data;
}

async function fetchText(url, options, context) {
  const res = await fetchWithTimeout(url, options);
  if (!res.ok) {
    throw new Error(`${context}: ${describeGitHubFailure(res)}`);
  }
  return await res.text();
}

function getUtcDayKey(value) {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
}

async function fetchAllRepos() {
  const all = [];
  for (let page = 1; page <= 10; page += 1) {
    const pageRepos = await fetchJson(
      `https://api.github.com/users/${USER}/repos?per_page=100&page=${page}&sort=pushed`,
      { headers },
      `repo list page ${page}`,
    );
    if (!Array.isArray(pageRepos)) {
      throw new Error(`repo list page ${page}: expected an array payload`);
    }
    if (pageRepos.length === 0) break;
    all.push(...pageRepos);
    if (pageRepos.length < 100) break;
  }
  return all;
}

async function main() {
  mkdirSync(dataDir, { recursive: true });

  const existingStars = readJson(starsPath, {});
  const existingStats = readJson(statsPath, {});
  const existingMeta = readJson(metaPath, {});
  const existingReleases = readJson(releasesPath, []);
  const existingReadmes = readJson(readmesPath, {});

  let repos;
  try {
    repos = await fetchAllRepos();
  } catch (error) {
    const hasExistingCoreCache =
      existingStats &&
      Object.keys(existingStars).length > 0 &&
      Object.keys(existingMeta).length > 0;
    if (!token && hasExistingCoreCache) {
      console.warn(`Unable to refresh repo metadata without GITHUB_TOKEN; preserving existing generated data. ${error.message}`);
      return;
    }
    throw error;
  }
  if (!Array.isArray(repos) || repos.length === 0) {
    throw new Error('GitHub returned no repositories. Refusing to overwrite generated data with empty output.');
  }

  const namedRepos = repos.filter((repo) => repo && typeof repo.name === 'string' && repo.name.trim());
  if (namedRepos.length !== repos.length) {
    console.warn(`Skipped ${repos.length - namedRepos.length} malformed repo payload entries with no usable name.`);
  }

  const publicRepos = namedRepos.filter((repo) => !repo.fork && !repo.archived && !repo.private);
  if (publicRepos.length === 0) {
    throw new Error('No public non-fork repositories were returned. Refusing to overwrite generated data.');
  }

  const stars = {};
  const meta = {};
  let totalRepos = 0;
  let totalStars = 0;
  let lastPushedAt = null;
  let lastPushedRepo = null;
  let streak = Number.isFinite(existingStats.streak) ? existingStats.streak : 0;
  let latestRelease = existingStats.latestRelease ?? null;

  for (const repo of publicRepos) {
    stars[repo.name] = repo.stargazers_count;
    meta[repo.name] = {
      stars: repo.stargazers_count,
      pushedAt: repo.pushed_at,
      updatedAt: repo.updated_at,
      language: repo.language || null,
    };
    totalRepos += 1;
    totalStars += repo.stargazers_count;
    if (!lastPushedAt || new Date(repo.pushed_at) > new Date(lastPushedAt)) {
      lastPushedAt = repo.pushed_at;
      lastPushedRepo = repo.name;
    }
  }

  try {
    const events = await fetchJson(
      `https://api.github.com/users/${USER}/events/public?per_page=100`,
      { headers },
      'public events',
    );
    if (Array.isArray(events)) {
      const pushDays = new Set();
      for (const event of events) {
        if (event?.type === 'PushEvent' && event.created_at) {
          pushDays.add(getUtcDayKey(event.created_at));
        }
      }
      streak = 0;
      for (let i = 0; i < 90; i += 1) {
        const day = new Date();
        day.setUTCDate(day.getUTCDate() - i);
        if (pushDays.has(getUtcDayKey(day))) streak += 1;
        else if (streak > 0) break;
      }
      const releaseEvent = events.find(
        (event) =>
          event?.type === 'ReleaseEvent' ||
          (event?.type === 'CreateEvent' && event.payload?.ref_type === 'tag'),
      );
      if (releaseEvent) {
        latestRelease = {
          repo: releaseEvent.repo.name.split('/')[1],
          tag: releaseEvent.payload?.release?.tag_name || releaseEvent.payload?.ref || null,
          at: releaseEvent.created_at,
        };
      }
    }
  } catch (error) {
    console.warn(`Unable to refresh GitHub events: ${error.message}`);
  }

  writeJson(starsPath, stars);
  writeJson(
    statsPath,
    {
      totalRepos,
      totalStars,
      lastPushedAt,
      lastPushedRepo,
      streak,
      latestRelease,
      fetchedAt: new Date().toISOString(),
    },
  );
  writeJson(metaPath, meta);

  console.log(`Wrote ${starsPath}: ${totalRepos} public repos, ${totalStars} stars total.`);
  console.log(`Wrote ${statsPath}: last push ${lastPushedRepo} at ${lastPushedAt}, streak ${streak}d`);
  console.log(`Wrote ${metaPath}: ${Object.keys(meta).length} repo metadata entries`);

  const topPushed = [...publicRepos]
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, 40);

  const allReleases = [];
  let releasesFetched = 0;
  let releasesFailed = 0;
  for (const repo of topPushed) {
    try {
      const list = await fetchJson(
        `https://api.github.com/repos/${USER}/${repo.name}/releases?per_page=5`,
        { headers },
        `releases for ${repo.name}`,
      );
      if (!Array.isArray(list)) {
        throw new Error('expected an array payload');
      }
      for (const release of list) {
        if (release.draft || release.prerelease) continue;
        allReleases.push({
          repo: repo.name,
          tag: release.tag_name,
          name: release.name || release.tag_name,
          publishedAt: release.published_at,
          url: release.html_url,
          bodyFirst: (release.body || '')
            .replace(/\r/g, '')
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#') && !/^[*-]\s*$/.test(line))
            .slice(0, 3)
            .join(' · ')
            .slice(0, 220),
        });
      }
      releasesFetched += 1;
    } catch (error) {
      releasesFailed += 1;
      console.warn(`Unable to refresh releases for ${repo.name}: ${error.message}`);
    }
  }
  allReleases.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  const releasesOutput =
    allReleases.length > 0 || releasesFetched > 0 || !Array.isArray(existingReleases) || existingReleases.length === 0
      ? allReleases.slice(0, 60)
      : existingReleases;
  writeJson(releasesPath, releasesOutput);
  console.log(
    `Wrote ${releasesPath}: ${releasesOutput.length} releases from ${releasesFetched} repos (${releasesFailed} failed).`,
  );

  const repoNames = new Set(publicRepos.map((repo) => repo.name));
  const readmes = Object.fromEntries(
    Object.entries(existingReadmes).filter(([name, value]) => repoNames.has(name) && typeof value === 'string'),
  );

  if (!token) {
    writeJson(readmesPath, readmes, false);
    console.log(`Wrote ${readmesPath}: preserved ${Object.keys(readmes).length} cached READMEs (skipped refresh without GITHUB_TOKEN).`);
    return;
  }

  let readmeOk = 0;
  let readmeMiss = 0;
  let readmeRateLimited = false;
  const readmeFailures = [];
  const CONCURRENCY = 8;
  let cursor = 0;

  async function worker() {
    while (cursor < publicRepos.length && !readmeRateLimited) {
      const index = cursor;
      cursor += 1;
      const repo = publicRepos[index];
      if (!repo) continue;
      try {
        const markdown = await fetchText(
          `https://api.github.com/repos/${USER}/${repo.name}/readme`,
          { headers: { ...headers, Accept: 'application/vnd.github.raw' } },
          `README for ${repo.name}`,
        );
        readmes[repo.name] = markdown.length > 120_000 ? `${markdown.slice(0, 120_000)}\n\n…` : markdown;
        readmeOk += 1;
      } catch (error) {
        readmeMiss += 1;
        if (/rate limit|too many requests/i.test(error.message)) {
          readmeRateLimited = true;
        }
        if (readmeFailures.length < 5) {
          readmeFailures.push(`${repo.name}: ${error.message}`);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  writeJson(readmesPath, readmes, false);
  const readmeSummary = readmeRateLimited
    ? `rate limit hit after ${readmeOk} refreshes; preserved cache for the remaining repos`
    : `${readmeMiss} misses, cache preserved for prior successes`;
  console.log(`Wrote ${readmesPath}: ${readmeOk} READMEs refreshed (${readmeSummary}).`);
  if (readmeFailures.length > 0) {
    console.warn(`README refresh issues: ${readmeFailures.join(' | ')}`);
  }
}

main().catch((error) => {
  console.error(`fetch-stars failed: ${error.message}`);
  process.exitCode = 1;
});
