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
for (const r of repos) {
  if (!r.fork && !r.archived && !r.private) {
    stars[r.name] = r.stargazers_count;
  }
}

mkdirSync(join(root, 'src', 'data'), { recursive: true });
const outPath = join(root, 'src', 'data', '_stars.json');
writeFileSync(outPath, JSON.stringify(stars, null, 2) + '\n');

const total = Object.values(stars).reduce((a, b) => a + b, 0);
console.log(`Wrote ${outPath}: ${Object.keys(stars).length} repos, ${total} stars total.`);
