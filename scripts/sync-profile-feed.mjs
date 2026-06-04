#!/usr/bin/env node
// Fetch the public SysAdminDoc profile projects feed into an ignored build-time
// cache. Astro pages consume the cache through src/data/portfolio.ts and fall
// back to src/data/projects.ts when the cache is unavailable.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_PROFILE_FEED_URL,
  buildCachedProfileFeed,
  validateProfileFeed,
} from './lib/profile-feed.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dataDir = join(root, 'src', 'data');
const cachePath = join(dataDir, '_profile-projects.json');
const feedUrl = process.env.PROFILE_PROJECTS_FEED_URL || DEFAULT_PROFILE_FEED_URL;
const offlineMode = process.env.PROFILE_PROJECTS_OFFLINE === '1';

function writeJsonAtomic(filePath, value) {
  const tmp = `${filePath}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(tmp, filePath);
}

async function fetchJsonWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'sysadmindoc-portfolio-profile-feed',
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function readExistingCache() {
  if (!existsSync(cachePath)) return null;
  const payload = JSON.parse(readFileSync(cachePath, 'utf8'));
  if (Array.isArray(payload.projects) && payload.projects.length === 0) return null;
  validateProfileFeed(payload);
  return payload;
}

function writeEmptyFallback(reason) {
  writeJsonAtomic(cachePath, {
    schema: null,
    generatedAt: null,
    feedSourceUrl: feedUrl,
    cachedAt: new Date().toISOString(),
    source: `local fallback: ${reason}`,
    publicRepoCount: null,
    projectCount: 0,
    suppressedCount: null,
    projects: [],
  });
}

mkdirSync(dataDir, { recursive: true });

if (offlineMode) {
  let existing = null;
  try {
    existing = readExistingCache();
  } catch (cacheError) {
    console.warn(`profile-feed: offline cache is invalid; replacing with fallback cache. ${cacheError.message}`);
  }
  if (existing) {
    console.log(`profile-feed: offline mode; preserving ${existing.projects.length} cached portfolio projects.`);
  } else {
    writeEmptyFallback('offline mode requested and no valid cache exists');
    console.warn('profile-feed: offline mode requested and no cache exists; Astro will use local fallback data.');
  }
  process.exit(0);
}

try {
  const payload = await fetchJsonWithTimeout(feedUrl);
  const cached = buildCachedProfileFeed(payload, feedUrl);
  writeJsonAtomic(cachePath, cached);
  console.log(
    `profile-feed: cached ${cached.projects.length} portfolio projects from ${feedUrl}` +
      ` (${cached.suppressedCount ?? 0} suppressed counted upstream)`,
  );
} catch (error) {
  let existing = null;
  try {
    existing = readExistingCache();
  } catch (cacheError) {
    console.warn(`profile-feed: existing cache is invalid; replacing with fallback cache. ${cacheError.message}`);
  }
  if (existing) {
    console.warn(`profile-feed: refresh failed; preserving existing cache. ${error.message}`);
  } else {
    writeEmptyFallback(error.message);
    console.warn(`profile-feed: refresh failed and no cache exists; Astro will use local fallback data. ${error.message}`);
  }
}
