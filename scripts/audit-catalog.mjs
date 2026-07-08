import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { collectPortfolioRepos } from './lib/ts-data-utils.mjs';

const root = process.cwd();
const projectsPath = path.join(root, 'src', 'data', 'projects.ts');
const policyPath = path.join(root, 'src', 'data', 'catalog-policy.json');
const execFileAsync = promisify(execFile);

async function resolveGithubToken() {
  const envToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  if (envToken.trim()) return envToken.trim();
  try {
    const { stdout } = await execFileAsync('gh', ['auth', 'token'], {
      timeout: 10_000,
      windowsHide: true,
    });
    return stdout.trim();
  } catch {
    return '';
  }
}

async function fetchPublicRepos(owner, token) {
  const repos = [];
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'sysadmindoc-portfolio-catalog-audit',
  };
  if (token) headers.authorization = `Bearer ${token}`;

  for (let page = 1; page < 20; page += 1) {
    const url = `https://api.github.com/users/${encodeURIComponent(owner)}/repos?per_page=100&page=${page}&type=owner&sort=updated`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API returned ${response.status} for ${url}: ${body.slice(0, 300)}`);
    }
    const batch = await response.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    repos.push(...batch);
    if (batch.length < 100) break;
  }

  return repos;
}

function exceptionMap(entries = []) {
  return new Map(entries.map((entry) => [entry.repo, entry.reason ?? 'Reviewed exception']));
}

function formatList(items, mapper = (item) => item) {
  return items.length === 0 ? '  none' : items.map((item) => `  - ${mapper(item)}`).join('\n');
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

const sourceText = await fs.readFile(projectsPath, 'utf8');
const policy = JSON.parse(await fs.readFile(policyPath, 'utf8'));
const portfolioRefs = collectPortfolioRepos(projectsPath, sourceText);
const skipped = exceptionMap(policy.intentionallySkippedPublicRepos);
const privacyReview = exceptionMap(policy.privacyReviewRequired);
const reviewedExceptions = new Map([...skipped, ...privacyReview]);
const token = await resolveGithubToken();

const repos = await fetchPublicRepos(policy.owner, token);
const activePublic = repos.filter((repo) => !repo.private && !repo.archived);
const activePublicNonFork = activePublic.filter((repo) => !repo.fork);
const auditScope = policy.includeForksInMissingAudit ? activePublic : activePublicNonFork;
const activeNames = new Set(activePublic.map((repo) => repo.name));

const missing = auditScope
  .filter((repo) => !portfolioRefs.has(repo.name))
  .filter((repo) => !reviewedExceptions.has(repo.name))
  .sort((a, b) => a.name.localeCompare(b.name));

const stale = [...portfolioRefs.keys()]
  .filter((repo) => !activeNames.has(repo))
  .filter((repo) => !reviewedExceptions.has(repo))
  .sort((a, b) => a.localeCompare(b));

const reviewedMissing = auditScope
  .filter((repo) => !portfolioRefs.has(repo.name))
  .filter((repo) => reviewedExceptions.has(repo.name))
  .sort((a, b) => a.name.localeCompare(b.name));
const privacyListed = (policy.privacyReviewRequired ?? [])
  .filter((entry) => portfolioRefs.has(entry.repo))
  .sort((a, b) => a.repo.localeCompare(b.repo));
const privacyScreenshots = [];
for (const entry of policy.privacyReviewRequired ?? []) {
  const screenshotPath = path.join(root, 'public', 'screenshots', `${entry.repo}.jpg`);
  if (await exists(screenshotPath)) privacyScreenshots.push(entry);
}
privacyScreenshots.sort((a, b) => a.repo.localeCompare(b.repo));

console.log('Catalog audit');
console.log(`  owner: ${policy.owner}`);
console.log(`  github auth: ${token ? 'authenticated' : 'anonymous'}`);
console.log(`  active public repos: ${activePublic.length}`);
console.log(`  active public non-forks: ${activePublicNonFork.length}`);
console.log(`  portfolio repo refs: ${portfolioRefs.size}`);
console.log(`  missing audit scope: ${policy.includeForksInMissingAudit ? 'active public repos including forks' : 'active public non-forks'}`);
console.log('');
console.log('Reviewed public repos not cataloged:');
console.log(formatList(reviewedMissing, (repo) => `${repo.name} - ${reviewedExceptions.get(repo.name)}`));
console.log('');

if (missing.length > 0 || stale.length > 0 || privacyListed.length > 0 || privacyScreenshots.length > 0) {
  if (missing.length > 0) {
    console.error('Unreviewed active public repos missing from portfolio data:');
    console.error(formatList(missing, (repo) => `${repo.name} (${repo.html_url})`));
  }
  if (stale.length > 0) {
    console.error('Portfolio repo refs not found as active public repositories:');
    console.error(formatList(stale));
  }
  if (privacyListed.length > 0) {
    console.error('Privacy-review repos must not appear in portfolio data:');
    console.error(formatList(privacyListed, (entry) => `${entry.repo} - ${entry.reason}`));
  }
  if (privacyScreenshots.length > 0) {
    console.error('Privacy-review repos must not have public screenshot artifacts:');
    console.error(formatList(privacyScreenshots, (entry) => `${entry.repo} - public/screenshots/${entry.repo}.jpg`));
  }
  process.exitCode = 1;
} else {
  console.log('Catalog audit passed: no unreviewed active public repo drift found.');
}
