#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const DEFAULT_REPO = 'SysAdminDoc/sysadmindoc.github.io';
const DEFAULT_MIN_SIZE = 1024 * 1024;
const DEFAULT_CONTENT_TYPE = 'application/zip';

function option(argv, ...names) {
  for (const name of names) {
    const index = argv.indexOf(name);
    if (index !== -1) return argv[index + 1];
  }
  return undefined;
}

function hasFlag(argv, name) {
  return argv.includes(name);
}

function usage() {
  return `Usage: node scripts/smoke-release-artifact.mjs [--tag vX.Y.Z] [--repo owner/repo] [--asset name.zip] [--min-size bytes] [--expected-size bytes] [--expected-digest sha256:...]

Verifies that a GitHub Release exists and contains the expected static-site ZIP artifact with size, digest, and upload metadata.`;
}

function readPackageVersion() {
  return JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version;
}

export function normalizeTag(value) {
  const tag = String(value ?? '').trim();
  if (!tag) throw new Error('Release tag is required.');
  const normalized = tag.startsWith('v') ? tag : `v${tag}`;
  if (!/^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(normalized)) {
    throw new Error(`Release tag must look like vX.Y.Z, got "${value}".`);
  }
  return normalized;
}

function normalizeRepo(value) {
  const repo = String(value ?? DEFAULT_REPO).trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new Error(`Repository must look like owner/repo, got "${value}".`);
  }
  return repo;
}

function positiveInteger(value, label) {
  if (value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer, got "${value}".`);
  }
  return parsed;
}

export function normalizeDigest(value) {
  if (value === undefined || value === '') return null;
  const digest = String(value).trim().toLowerCase();
  if (/^[0-9a-f]{64}$/.test(digest)) return `sha256:${digest}`;
  if (/^sha256:[0-9a-f]{64}$/.test(digest)) return digest;
  throw new Error(`Expected digest must be sha256:<64 hex chars>, got "${value}".`);
}

function defaultAssetName(tag) {
  return `sysadmindoc-portfolio-${tag}.zip`;
}

export function parseArgs(argv = process.argv.slice(2), packageVersion = readPackageVersion()) {
  const tag = normalizeTag(option(argv, '--tag', '--release') ?? packageVersion);
  return {
    help: hasFlag(argv, '--help') || hasFlag(argv, '-h'),
    repo: normalizeRepo(option(argv, '--repo') ?? DEFAULT_REPO),
    tag,
    assetName: option(argv, '--asset', '--asset-name') ?? defaultAssetName(tag),
    minSize: positiveInteger(option(argv, '--min-size'), '--min-size') ?? DEFAULT_MIN_SIZE,
    expectedSize: positiveInteger(option(argv, '--expected-size'), '--expected-size'),
    expectedDigest: normalizeDigest(option(argv, '--expected-digest', '--digest')),
    contentType: option(argv, '--content-type') ?? DEFAULT_CONTENT_TYPE,
    token: option(argv, '--token') ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? null,
  };
}

function requireDate(value, label, errors) {
  if (Number.isNaN(new Date(value).getTime())) errors.push(`${label} must be a parseable timestamp`);
}

function normalizeAssetDigest(asset) {
  const digest = typeof asset.digest === 'string' ? asset.digest.toLowerCase() : '';
  return /^sha256:[0-9a-f]{64}$/.test(digest) ? digest : null;
}

function assetDownloadPathMatches(asset, tag) {
  try {
    const url = new URL(asset.browser_download_url);
    return decodeURIComponent(url.pathname).endsWith(`/releases/download/${tag}/${asset.name}`);
  } catch {
    return false;
  }
}

export function validateReleaseArtifact(release, expected) {
  const errors = [];
  if (!release || typeof release !== 'object') throw new Error('GitHub release response was empty.');
  if (release.tag_name !== expected.tag) errors.push(`release tag drifted: expected ${expected.tag}, got ${release.tag_name ?? '(missing)'}`);
  if (release.draft) errors.push(`${expected.tag} is still a draft release`);
  if (release.prerelease) errors.push(`${expected.tag} is marked prerelease`);
  requireDate(release.published_at, 'release.published_at', errors);

  const assets = Array.isArray(release.assets) ? release.assets : [];
  const asset = assets.find((candidate) => candidate?.name === expected.assetName);
  if (!asset) {
    const found = assets.map((candidate) => candidate?.name).filter(Boolean).join(', ') || 'none';
    errors.push(`release is missing expected asset ${expected.assetName}; found: ${found}`);
  } else {
    if (asset.state !== 'uploaded') errors.push(`${asset.name} state must be uploaded, got ${asset.state ?? '(missing)'}`);
    if (asset.content_type !== expected.contentType) {
      errors.push(`${asset.name} content_type must be ${expected.contentType}, got ${asset.content_type ?? '(missing)'}`);
    }
    if (!Number.isSafeInteger(asset.size) || asset.size < expected.minSize) {
      errors.push(`${asset.name} size ${asset.size ?? '(missing)'} is below minimum ${expected.minSize}`);
    }
    if (expected.expectedSize && asset.size !== expected.expectedSize) {
      errors.push(`${asset.name} size is stale: expected ${expected.expectedSize}, got ${asset.size ?? '(missing)'}`);
    }
    const digest = normalizeAssetDigest(asset);
    if (!digest) {
      errors.push(`${asset.name} is missing sha256 digest metadata`);
    } else if (expected.expectedDigest && digest !== expected.expectedDigest) {
      errors.push(`${asset.name} digest is stale: expected ${expected.expectedDigest}, got ${digest}`);
    }
    requireDate(asset.created_at, `${asset.name}.created_at`, errors);
    requireDate(asset.updated_at, `${asset.name}.updated_at`, errors);
    if (!assetDownloadPathMatches(asset, expected.tag)) {
      errors.push(`${asset.name} browser_download_url does not match ${expected.tag}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Release artifact smoke failed:\n  - ${errors.join('\n  - ')}`);
  }

  return {
    repo: expected.repo,
    tag: expected.tag,
    releaseName: release.name || release.tag_name,
    target: release.target_commitish ?? 'unknown',
    publishedAt: release.published_at,
    asset: {
      name: asset.name,
      size: asset.size,
      digest: normalizeAssetDigest(asset),
      contentType: asset.content_type,
      downloadCount: asset.download_count ?? 0,
      createdAt: asset.created_at,
      updatedAt: asset.updated_at,
      url: asset.browser_download_url,
    },
  };
}

async function fetchJson(url, { token, fetchImpl = fetch }) {
  const response = await fetchImpl(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'sysadmindoc-release-artifact-smoke',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = await response.text();
  if (response.status === 404) throw new Error(`Release was not found at ${url}.`);
  if (!response.ok) throw new Error(`GitHub API returned HTTP ${response.status}: ${body.slice(0, 240)}`);
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(`GitHub API returned invalid JSON: ${error.message}`);
  }
}

export async function smokeReleaseArtifact(options) {
  const url = `https://api.github.com/repos/${options.repo}/releases/tags/${encodeURIComponent(options.tag)}`;
  const release = await fetchJson(url, options);
  return validateReleaseArtifact(release, options);
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB (${bytes} bytes)`;
}

function printSummary(result) {
  console.log('Release artifact smoke');
  console.log(`  repo: ${result.repo}`);
  console.log(`  release: ${result.releaseName} (${result.tag})`);
  console.log(`  target: ${result.target}`);
  console.log(`  published: ${result.publishedAt}`);
  console.log(`  asset: ${result.asset.name}`);
  console.log(`  size: ${formatBytes(result.asset.size)}`);
  console.log(`  digest: ${result.asset.digest}`);
  console.log(`  content type: ${result.asset.contentType}`);
  console.log(`  uploaded: ${result.asset.createdAt} -> ${result.asset.updatedAt}`);
  console.log(`  downloads: ${result.asset.downloadCount}`);
  console.log(`  url: ${result.asset.url}`);
  console.log('Release artifact smoke passed.');
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    console.log(usage());
    return;
  }
  printSummary(await smokeReleaseArtifact(options));
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
