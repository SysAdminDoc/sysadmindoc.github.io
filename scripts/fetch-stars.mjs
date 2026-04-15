#!/usr/bin/env node
// Build-time GitHub star fetcher.
// Writes src/data/_stars.json = { "<repo>": <stars>, ... }
// Used by src/pages/index.astro to bake star counts into static HTML.
//
// Auth: reads GITHUB_TOKEN from env (not required locally, but avoids rate limits in CI).

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const USER = 'SysAdminDoc';
const token = process.env.GITHUB_TOKEN;
const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'sysadmindoc-portfolio-build',
};
if (token) headers.Authorization = `Bearer ${token}`;

async function fetchAllRepos() {
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(
      `https://api.github.com/users/${USER}/repos?per_page=100&page=${page}&sort=pushed`,
      { headers }
    );
    if (!res.ok) {
      console.error(`GitHub API error: ${res.status} ${res.statusText}`);
      break;
    }
    const page_repos = await res.json();
    if (!Array.isArray(page_repos) || page_repos.length === 0) break;
    all.push(...page_repos);
    if (page_repos.length < 100) break;
  }
  return all;
}

const repos = await fetchAllRepos();
const stars = {};
const meta = {};
let totalRepos = 0;
let totalStars = 0;
let lastPushedAt = null;
let lastPushedRepo = null;
let latestRelease = null;

for (const r of repos) {
  if (r.fork || r.archived || r.private) continue;
  stars[r.name] = r.stargazers_count;
  meta[r.name] = {
    stars: r.stargazers_count,
    pushedAt: r.pushed_at,
    updatedAt: r.updated_at,
    language: r.language || null,
  };
  totalRepos += 1;
  totalStars += r.stargazers_count;
  if (!lastPushedAt || new Date(r.pushed_at) > new Date(lastPushedAt)) {
    lastPushedAt = r.pushed_at;
    lastPushedRepo = r.name;
  }
}

// Compute commit streak across the user's public event stream (last 90 days)
let streak = 0;
try {
  const res = await fetch(`https://api.github.com/users/${USER}/events/public?per_page=100`, { headers });
  if (res.ok) {
    const events = await res.json();
    const days = new Set();
    for (const ev of events) {
      if (ev.type === 'PushEvent') {
        const d = new Date(ev.created_at);
        days.add(`${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`);
      }
    }
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
      if (days.has(key)) streak += 1;
      else if (streak > 0) break;
    }
    // Latest release (if any) — use the first PushEvent tag-shaped ref
    const release = events.find(e => e.type === 'ReleaseEvent' || (e.type === 'CreateEvent' && e.payload?.ref_type === 'tag'));
    if (release) {
      latestRelease = {
        repo: release.repo.name.split('/')[1],
        tag: release.payload?.release?.tag_name || release.payload?.ref || null,
        at: release.created_at,
      };
    }
  }
} catch (e) {
  console.warn('events fetch failed:', e.message);
}

mkdirSync(join(root, 'src', 'data'), { recursive: true });
const outPath = join(root, 'src', 'data', '_stars.json');
writeFileSync(outPath, JSON.stringify(stars, null, 2) + '\n');

const statsPath = join(root, 'src', 'data', '_stats.json');
const stats = {
  totalRepos,
  totalStars,
  lastPushedAt,
  lastPushedRepo,
  streak,
  latestRelease,
  fetchedAt: new Date().toISOString(),
};
writeFileSync(statsPath, JSON.stringify(stats, null, 2) + '\n');

const metaPath = join(root, 'src', 'data', '_meta.json');
writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');

console.log(`Wrote ${outPath}: ${totalRepos} public repos, ${totalStars} stars total.`);
console.log(`Wrote ${statsPath}: last push ${lastPushedRepo} at ${lastPushedAt}, streak ${streak}d`);
console.log(`Wrote ${metaPath}: ${Object.keys(meta).length} repo metadata entries`);

// -------- Releases fetch: top 40 most-recently-pushed repos, 5 releases each --------
// Keeps API cost bounded even as the repo count grows.
const topPushed = repos
  .filter((r) => !r.fork && !r.archived && !r.private)
  .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
  .slice(0, 40);

const allReleases = [];
let releasesFetched = 0;
let releasesFailed = 0;
for (const r of topPushed) {
  try {
    const rr = await fetch(`https://api.github.com/repos/${USER}/${r.name}/releases?per_page=5`, { headers });
    if (!rr.ok) { releasesFailed += 1; continue; }
    const list = await rr.json();
    if (!Array.isArray(list)) continue;
    for (const rel of list) {
      if (rel.draft || rel.prerelease) continue;
      allReleases.push({
        repo: r.name,
        tag: rel.tag_name,
        name: rel.name || rel.tag_name,
        publishedAt: rel.published_at,
        url: rel.html_url,
        bodyFirst: (rel.body || '')
          .replace(/\r/g, '')
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#') && !/^[*-]\s*$/.test(l))
          .slice(0, 3)
          .join(' · ')
          .slice(0, 220),
      });
    }
    releasesFetched += 1;
  } catch (e) {
    releasesFailed += 1;
  }
}
allReleases.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

const releasesPath = join(root, 'src', 'data', '_releases.json');
writeFileSync(releasesPath, JSON.stringify(allReleases.slice(0, 60), null, 2) + '\n');
console.log(`Wrote ${releasesPath}: ${allReleases.length} releases from ${releasesFetched} repos (${releasesFailed} failed).`);
