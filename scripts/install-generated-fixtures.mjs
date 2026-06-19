#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  PROJECT_RANKING_HALF_LIFE_DAYS,
  PROJECT_RANKING_WEIGHTS,
  computeProjectRankings,
} from '../src/data/project-ranking.mjs';
import { validateProfileFeed } from './lib/profile-feed.mjs';

const root = process.cwd();
const dataDir = path.join(root, 'src', 'data');
const defaultFixturesDir = path.join(dataDir, 'fixtures', 'generated');
const requiredFiles = [
  '_stars.json',
  '_meta.json',
  '_readmes.json',
  '_releases.json',
  '_stats.json',
  '_readme-refresh.json',
  '_profile-projects.json',
];

const options = {
  checkOnly: false,
  fixturesDir: defaultFixturesDir,
};

for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (arg === '--check') {
    options.checkOnly = true;
  } else if (arg === '--fixtures') {
    index += 1;
    options.fixturesDir = path.resolve(root, process.argv[index]);
  } else if (arg.startsWith('--fixtures=')) {
    options.fixturesDir = path.resolve(root, arg.slice('--fixtures='.length));
  } else if (arg === '--help' || arg === '-h') {
    console.log('Usage: node scripts/install-generated-fixtures.mjs [--check] [--fixtures <dir>]');
    process.exit(0);
  } else {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function parseableDate(value) {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

function finiteNonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function sameKeys(a, b) {
  return a.length === b.length && a.every((key, index) => key === b[index]);
}

async function readFixtureJson(fixturesDir, fileName) {
  const filePath = path.join(fixturesDir, fileName);
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${path.relative(root, filePath)}: ${error.message}`);
  }
}

async function readFixtureSet(fixturesDir) {
  const entries = await Promise.all(requiredFiles.map(async (fileName) => [fileName, await readFixtureJson(fixturesDir, fileName)]));
  return Object.fromEntries(entries);
}

function auditFixtureSet(fixtures) {
  const errors = [];
  const fail = (message) => errors.push(message);

  const stars = fixtures['_stars.json'];
  const meta = fixtures['_meta.json'];
  const readmes = fixtures['_readmes.json'];
  const releases = fixtures['_releases.json'];
  const stats = fixtures['_stats.json'];
  const readmeRefresh = fixtures['_readme-refresh.json'];
  const profileFeed = fixtures['_profile-projects.json'];

  if (!isPlainObject(stars) || Object.keys(stars).length === 0) fail('_stars.json must be a non-empty object.');
  if (!isPlainObject(meta) || Object.keys(meta).length === 0) fail('_meta.json must be a non-empty object.');
  if (!isPlainObject(readmes) || Object.keys(readmes).length === 0) fail('_readmes.json must be a non-empty object.');
  if (!Array.isArray(releases) || releases.length === 0) fail('_releases.json must be a non-empty array.');
  if (!isPlainObject(stats)) fail('_stats.json must be an object.');
  if (!isPlainObject(readmeRefresh)) fail('_readme-refresh.json must be an object.');
  if (!isPlainObject(profileFeed)) fail('_profile-projects.json must be an object.');
  if (errors.length > 0) return { errors, counts: {} };

  const starKeys = Object.keys(stars).sort();
  const metaKeys = Object.keys(meta).sort();
  const readmeKeys = Object.keys(readmes).sort();
  if (!sameKeys(starKeys, metaKeys)) fail('_stars.json and _meta.json must contain the same repo keys.');
  if (!sameKeys(starKeys, readmeKeys)) fail('_stars.json and _readmes.json must contain the same repo keys.');

  const totalStars = starKeys.reduce((sum, repo) => sum + Number(stars[repo]), 0);
  if (stats.totalRepos !== starKeys.length) fail(`_stats.json totalRepos must be ${starKeys.length}.`);
  if (stats.totalStars !== totalStars) fail(`_stats.json totalStars must be ${totalStars}.`);
  if (!hasOwn(meta, stats.lastPushedRepo)) fail('_stats.json lastPushedRepo must exist in _meta.json.');
  if (!parseableDate(stats.lastPushedAt)) fail('_stats.json lastPushedAt must be a parseable date.');
  if (!parseableDate(stats.fetchedAt)) fail('_stats.json fetchedAt must be a parseable date.');
  if (!Array.isArray(stats.pushDays) || stats.pushDays.length === 0) fail('_stats.json pushDays must be a non-empty array.');
  if (!stats.latestRelease || !hasOwn(stars, stats.latestRelease.repo)) {
    fail('_stats.json latestRelease.repo must exist in fixture repos.');
  } else if (!parseableDate(stats.latestRelease.at)) {
    fail('_stats.json latestRelease.at must be a parseable date.');
  }

  for (const repo of starKeys) {
    if (!finiteNonNegative(stars[repo])) fail(`_stars.json ${repo} must be a non-negative number.`);
    const repoMeta = meta[repo];
    if (!isPlainObject(repoMeta)) {
      fail(`_meta.json ${repo} must be an object.`);
      continue;
    }
    if (repoMeta.stars !== stars[repo]) fail(`_meta.json ${repo}.stars must match _stars.json.`);
    if (!parseableDate(repoMeta.createdAt)) fail(`_meta.json ${repo}.createdAt must be a parseable date.`);
    if (!parseableDate(repoMeta.pushedAt)) fail(`_meta.json ${repo}.pushedAt must be a parseable date.`);
    if (!parseableDate(repoMeta.updatedAt)) fail(`_meta.json ${repo}.updatedAt must be a parseable date.`);
    if (!(repoMeta.language === null || nonEmptyString(repoMeta.language))) {
      fail(`_meta.json ${repo}.language must be null or a non-empty string.`);
    }
    if (!(repoMeta.licenseSpdx === null || (nonEmptyString(repoMeta.licenseSpdx) && /^[A-Za-z0-9+.-]+$/.test(repoMeta.licenseSpdx)))) {
      fail(`_meta.json ${repo}.licenseSpdx must be null or an SPDX-like identifier.`);
    }
    if (!nonEmptyString(readmes[repo])) fail(`_readmes.json ${repo} must be a non-empty string.`);
  }

  if (!Object.values(readmes).some((value) => /(^|\n)\s*#\s+/.test(value) || /<h1\b/i.test(value))) {
    fail('_readmes.json must include at least one rendered README heading excerpt.');
  }

  let previousReleaseTime = Number.POSITIVE_INFINITY;
  let releaseDownloads = 0;
  for (const [index, release] of releases.entries()) {
    const label = `_releases.json[${index}]`;
    if (!isPlainObject(release)) {
      fail(`${label} must be an object.`);
      continue;
    }
    for (const key of ['repo', 'tag', 'name', 'publishedAt', 'url', 'bodyFirst']) {
      if (!nonEmptyString(release[key])) fail(`${label}.${key} must be a non-empty string.`);
    }
    if (!hasOwn(stars, release.repo)) fail(`${label}.repo must exist in fixture repos.`);
    if (!parseableDate(release.publishedAt)) fail(`${label}.publishedAt must be a parseable date.`);
    const time = new Date(release.publishedAt).getTime();
    if (Number.isFinite(time) && time > previousReleaseTime) fail('_releases.json must be newest-first.');
    if (Number.isFinite(time)) previousReleaseTime = time;
    try {
      const url = new URL(release.url);
      if (url.protocol !== 'https:') fail(`${label}.url must use HTTPS.`);
    } catch {
      fail(`${label}.url must be an absolute URL.`);
    }
    if (release.downloads !== undefined) {
      if (!finiteNonNegative(release.downloads)) fail(`${label}.downloads must be a non-negative number.`);
      releaseDownloads += release.downloads;
    }
  }
  if (releaseDownloads <= 0) fail('_releases.json must include at least one positive download count for ranking inputs.');

  if (readmeRefresh.schema !== 'sysadmindoc.readme-refresh.v1' && readmeRefresh.schema !== 'sysadmindoc.readme-refresh.v2') fail('_readme-refresh.json schema is invalid.');
  if (!parseableDate(readmeRefresh.generatedAt)) fail('_readme-refresh.json generatedAt must be a parseable date.');
  if (!nonEmptyString(readmeRefresh.source)) fail('_readme-refresh.json source must be a non-empty string.');
  if (typeof readmeRefresh.tokenPresent !== 'boolean') fail('_readme-refresh.json tokenPresent must be boolean.');
  if (readmeRefresh.totalPublicRepos !== starKeys.length) fail('_readme-refresh.json totalPublicRepos must match fixture repos.');
  if (readmeRefresh.attempted !== starKeys.length) fail('_readme-refresh.json attempted must match fixture repos.');
  if (readmeRefresh.refreshed !== readmeKeys.length) fail('_readme-refresh.json refreshed must match README entries.');
  if (readmeRefresh.cacheEntries !== readmeKeys.length) fail('_readme-refresh.json cacheEntries must match README entries.');
  for (const key of ['misses', 'preserved', 'unattempted', 'missing', 'trimmed']) {
    if (!finiteNonNegative(readmeRefresh[key])) fail(`_readme-refresh.json ${key} must be a non-negative number.`);
  }
  if (readmeRefresh.rateLimited !== false) fail('_readme-refresh.json rateLimited must be false.');
  if (!Array.isArray(readmeRefresh.failureSamples)) fail('_readme-refresh.json failureSamples must be an array.');

  let profileProjects = [];
  try {
    profileProjects = validateProfileFeed(profileFeed);
  } catch (error) {
    fail(`_profile-projects.json failed validation: ${error.message}`);
  }
  if (profileFeed.projectCount !== profileProjects.length) fail('_profile-projects.json projectCount must match visible projects.');
  if (profileFeed.publicRepoCount !== starKeys.length) fail('_profile-projects.json publicRepoCount must match fixture repos.');
  if (!parseableDate(profileFeed.generatedAt)) fail('_profile-projects.json generatedAt must be a parseable date.');
  if (!parseableDate(profileFeed.cachedAt)) fail('_profile-projects.json cachedAt must be a parseable date.');
  if (!nonEmptyString(profileFeed.source)) fail('_profile-projects.json source must be a non-empty string.');
  try {
    const url = new URL(profileFeed.feedSourceUrl);
    if (url.protocol !== 'https:') fail('_profile-projects.json feedSourceUrl must use HTTPS.');
  } catch {
    fail('_profile-projects.json feedSourceUrl must be an absolute URL.');
  }
  for (const [index, project] of profileProjects.entries()) {
    if (!hasOwn(stars, project.repo)) fail(`_profile-projects.json projects[${index}].repo must exist in fixture repos.`);
  }

  const rankingWeightTotal = Object.values(PROJECT_RANKING_WEIGHTS).reduce((sum, value) => sum + value, 0);
  const rankingEntries = profileProjects.map((project) => ({
    repo: project.repo,
    name: project.title,
    updatedAt: project.updatedAt ?? project.pushedAt ?? null,
    stars: project.stars,
    hasDownload: Boolean(project.hasDownload || project.downloadUrl || project.primaryAction?.kind === 'release'),
  }));
  const rankings = computeProjectRankings(rankingEntries, {
    stars,
    meta,
    releases,
    halfLifeDays: PROJECT_RANKING_HALF_LIFE_DAYS,
    referenceDate: stats.fetchedAt,
  });
  const rankingRows = [...rankings.values()].sort((a, b) => a.rank - b.rank);
  const ranks = new Set(rankingRows.map((row) => row.rank));
  const scoresFinite = rankingRows.every(
    (row) =>
      Number.isFinite(row.score) &&
      Number.isFinite(row.rank) &&
      Object.values(row.scoreParts ?? {}).every((value) => Number.isFinite(value)),
  );
  if (Math.abs(rankingWeightTotal - 1) > 0.0001) fail('Project ranking weights must stay normalized.');
  if (rankingRows.length !== profileProjects.length || rankingRows.length === 0) fail('Fixture ranking must cover profile projects.');
  if (!scoresFinite) fail('Fixture ranking scores and score parts must be finite.');
  if (ranks.size !== rankingRows.length || !rankingRows.every((row, index) => row.rank === index + 1)) {
    fail('Fixture ranking ranks must be unique and contiguous.');
  }
  if (!rankingRows.some((row) => row.stars > 0)) fail('Fixture ranking needs at least one positive star signal.');
  if (!rankingRows.some((row) => row.releaseDownloads > 0)) {
    fail('Fixture ranking needs at least one positive release-download signal.');
  }

  return {
    errors,
    counts: {
      repos: starKeys.length,
      releases: releases.length,
      readmes: readmeKeys.length,
      profileProjects: profileProjects.length,
    },
  };
}

async function installFixtures(fixturesDir) {
  await fs.mkdir(dataDir, { recursive: true });
  await Promise.all(requiredFiles.map((fileName) => fs.copyFile(path.join(fixturesDir, fileName), path.join(dataDir, fileName))));
}

const fixturesDir = path.resolve(options.fixturesDir);
const fixtures = await readFixtureSet(fixturesDir);
const result = auditFixtureSet(fixtures);

if (result.errors.length > 0) {
  console.error('Generated-data fixture audit failed:');
  for (const error of result.errors) console.error(`  - ${error}`);
  process.exit(1);
}

if (!options.checkOnly) {
  await installFixtures(fixturesDir);
}

const action = options.checkOnly ? 'checked' : 'installed';
console.log(
  `Generated-data fixtures ${action}: ` +
    `${result.counts.repos} repos, ${result.counts.releases} releases, ` +
    `${result.counts.readmes} README excerpts, ${result.counts.profileProjects} profile projects.`,
);
