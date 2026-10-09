#!/usr/bin/env node
// Cuts the GitHub release of the built site in four stages. Each one is its own
// command, records what it did in .tmp/release/<tag>.json, and refuses to run
// before the stage it needs, so a slip stops the release in seconds instead of
// after the gate:
//
//   preflight  the tag sits on HEAD, every version string agrees, the CHANGELOG
//              has the section, the tree is clean and gh is signed in (seconds)
//   pack       ZIPs dist/ (the gate's build of that commit) and records its
//              size and SHA-256
//   publish    gh release create with the CHANGELOG section as the notes
//   smoke      smoke:release against the published asset
//
//   npm run release -- <stage> [--tag vX.Y.Z] [--root <checkout>]
//
// --root reads the version, CHANGELOG, dist/ and commit from another checkout,
// such as a worktree at an older tag that is getting its release late. Running
// a finished stage again redoes it; publish leaves a release that already
// carries the same ZIP alone.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import zlib from 'node:zlib';
import { builtDataProblem } from './lib/built-data-mode.mjs';

export const RELEASE_REPO = 'SysAdminDoc/sysadmindoc.github.io';
export const STAGES = ['preflight', 'pack', 'publish', 'smoke'];
const here = process.cwd();
const recordDir = path.join(here, '.tmp', 'release');

/** @param {string} tag */
export function assetName(tag) {
  return `sysadmindoc-portfolio-${tag}.zip`;
}

/**
 * The body of one version's CHANGELOG section, without its heading, or null.
 * @param {string} changelog @param {string} version  e.g. 0.47.0
 */
export function changelogSection(changelog, version) {
  const lines = changelog.replace(/\r\n/g, '\n').split('\n');
  const heading = `## [v${version}]`;
  const start = lines.findIndex((line) => line === heading || line.startsWith(`${heading} `));
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  const body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
  return body || null;
}

/** @param {string} tag @param {string} section @param {{ name: string, sha256: string }} artifact */
export function releaseNotes(tag, section, artifact) {
  return `## ${tag}\n\n${section}\n\nArtifact: ${artifact.name}, the built static site (unsigned). SHA-256: ${artifact.sha256}\n`;
}

/**
 * Why the version strings in a checkout disagree with the tag, one line each.
 * @param {string} version
 * @param {{ packageJson: string, packageLock: string, readme: string, changelog: string }} files
 */
export function versionProblems(version, files) {
  const problems = [];
  const pkg = JSON.parse(files.packageJson);
  if (pkg.version !== version) problems.push(`package.json says ${pkg.version}, not ${version}`);
  const lock = JSON.parse(files.packageLock);
  if (lock.version !== version || lock.packages?.['']?.version !== version) {
    problems.push(`package-lock.json says ${lock.version} / ${lock.packages?.['']?.version}, not ${version}`);
  }
  if (!files.readme.includes(`img.shields.io/badge/version-${version}-`)) problems.push(`the README version badge doesn't say ${version}`);
  if (!changelogSection(files.changelog, version)) problems.push(`CHANGELOG.md has no "## [v${version}]" section with anything in it`);
  return problems;
}

/** @param {Date} date */
function dosDateTime(date) {
  const year = Math.max(1980, date.getUTCFullYear());
  return {
    time: (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate(),
  };
}

/** @param {string} dir @returns {string[]} paths relative to dir, with forward slashes, sorted */
export function listFiles(dir) {
  /** @type {string[]} */
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) files.push(path.relative(dir, full).split(path.sep).join('/'));
    }
  };
  walk(dir);
  return files.sort();
}

/**
 * A ZIP of every file under dir, entries in sorted order and stamped with one
 * time, so the same dist/ always gives the same bytes and the same SHA-256.
 * @param {string} dir @param {Date} stamp
 */
export function zipDirectory(dir, stamp) {
  const { time, date } = dosDateTime(stamp);
  /** @type {Buffer[]} */
  const parts = [];
  /** @type {Buffer[]} */
  const central = [];
  let offset = 0;
  const names = listFiles(dir);
  if (names.length > 0xffff) throw new Error(`${names.length} files is more than a ZIP without ZIP64 holds`);
  for (const name of names) {
    const data = fs.readFileSync(path.join(dir, ...name.split('/')));
    const packed = zlib.deflateRawSync(data, { level: 9 });
    const crc = zlib.crc32(data);
    const nameBytes = Buffer.from(name, 'utf8');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // names are UTF-8
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(8, 10);
    header.writeUInt16LE(time, 12);
    header.writeUInt16LE(date, 14);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(packed.length, 20);
    header.writeUInt32LE(data.length, 24);
    header.writeUInt16LE(nameBytes.length, 28);
    header.writeUInt32LE(offset, 42);
    parts.push(local, nameBytes, packed);
    central.push(header, nameBytes);
    offset += local.length + nameBytes.length + packed.length;
    if (offset > 0xffffffff) throw new Error('dist/ is past 4 GB, more than a ZIP without ZIP64 holds');
  }
  const centralBytes = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(names.length, 8);
  end.writeUInt16LE(names.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, centralBytes, end]);
}

/**
 * The stage that has to come first, or null when stage can run on record.
 * @param {string} stage @param {any} record @param {string} commit
 */
export function missingStage(stage, record, commit) {
  const index = STAGES.indexOf(stage);
  if (index === -1) throw new Error(`unknown stage "${stage}"; the stages are ${STAGES.join(', ')}`);
  if (index === 0) return null;
  if (!record || record.commit !== commit) return STAGES[0];
  for (const earlier of STAGES.slice(0, index)) {
    if (!record[earlier]) return earlier;
  }
  return null;
}

/** @param {string} cwd @param {string[]} args */
function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }).trim();
}

/** @param {string[]} args */
function gh(args) {
  return spawnSync('gh', args, { encoding: 'utf8', windowsHide: true });
}

/** @param {string} message */
function fail(message) {
  console.error(`release: ${message}`);
  process.exit(1);
}

/** @param {string} tag */
function readRecord(tag) {
  try {
    return JSON.parse(fs.readFileSync(path.join(recordDir, `${tag}.json`), 'utf8'));
  } catch {
    return null;
  }
}

/** @param {any} record */
function writeRecord(record) {
  fs.mkdirSync(recordDir, { recursive: true });
  fs.writeFileSync(path.join(recordDir, `${record.tag}.json`), `${JSON.stringify(record, null, 2)}\n`);
}

/** @param {string} file */
function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/** @param {string} root @param {string} name */
function read(root, name) {
  return fs.readFileSync(path.join(root, name), 'utf8');
}

function main() {
  const argv = process.argv.slice(2);
  const option = (name) => {
    const index = argv.indexOf(name);
    return index === -1 ? undefined : argv[index + 1];
  };
  const stage = argv[0];
  if (!STAGES.includes(stage)) fail(`usage: npm run release -- <${STAGES.join('|')}> [--tag vX.Y.Z] [--root <checkout>]`);
  const root = path.resolve(option('--root') ?? here);
  const version = JSON.parse(read(root, 'package.json')).version;
  const tag = option('--tag') ?? `v${version}`;
  if (tag !== `v${version}`) fail(`${root} declares ${version}, so it can't cut ${tag}; point --root at a checkout of ${tag}`);
  const commit = git(root, ['rev-parse', 'HEAD']);
  let record = readRecord(tag);
  const missing = missingStage(stage, record, commit);
  if (missing) fail(`run the ${missing} stage for ${tag} at ${commit.slice(0, 12)} first`);
  const name = assetName(tag);
  const zipPath = path.join(recordDir, name);

  if (stage === 'preflight') {
    const problems = [];
    let tagged = '';
    try {
      tagged = git(root, ['rev-list', '-n', '1', tag]);
    } catch {
      problems.push(`there's no tag ${tag}; tag the version-bump commit: git tag -a ${tag} -m "${tag}"`);
    }
    if (tagged && tagged !== commit) problems.push(`${tag} points at ${tagged.slice(0, 12)}, but ${root} is at ${commit.slice(0, 12)}`);
    if (tagged && git(root, ['cat-file', '-t', tag]) !== 'tag') problems.push(`${tag} isn't an annotated tag`);
    if (git(root, ['status', '--porcelain', '--untracked-files=no'])) problems.push(`${root} has uncommitted changes`);
    problems.push(
      ...versionProblems(version, {
        packageJson: read(root, 'package.json'),
        packageLock: read(root, 'package-lock.json'),
        readme: read(root, 'README.md'),
        changelog: read(root, 'CHANGELOG.md'),
      }),
    );
    if (gh(['auth', 'status']).status !== 0) problems.push('gh is not signed in, so publish would stop');
    if (problems.length > 0) fail(`preflight for ${tag} found:\n  ${problems.join('\n  ')}`);
    record = { tag, commit, preflight: { at: new Date().toISOString() } };
    writeRecord(record);
    console.log(`release: preflight passed for ${tag} at ${commit.slice(0, 12)}. Next: the gate's build, then pack.`);
    return;
  }

  if (stage === 'pack') {
    const dist = path.join(root, 'dist');
    const statusFile = path.join(dist, 'status.json');
    const statusText = fs.existsSync(statusFile) ? fs.readFileSync(statusFile, 'utf8') : '';
    const dataProblem = builtDataProblem(statusText);
    if (dataProblem) fail(dataProblem);
    const built = JSON.parse(statusText);
    if (built.version !== version) fail(`dist/ was built as ${built.version}, not ${version}; build ${tag} first`);
    const builtCommit = built.build?.commit;
    if (builtCommit && builtCommit !== 'unknown' && !commit.startsWith(builtCommit)) {
      fail(`dist/ was built from ${String(builtCommit).slice(0, 12)}, not ${commit.slice(0, 12)}; build ${tag} first`);
    }
    const stamp = new Date(git(root, ['show', '-s', '--format=%cI', commit]));
    const zip = zipDirectory(dist, stamp);
    const digest = createHash('sha256').update(zip).digest('hex');
    if (record.publish && record.pack?.sha256 !== digest) {
      fail(`${tag} is already published with SHA-256 ${record.pack.sha256}; this dist/ gives ${digest}`);
    }
    fs.mkdirSync(recordDir, { recursive: true });
    fs.writeFileSync(zipPath, zip);
    record.pack = { at: new Date().toISOString(), name, size: zip.length, sha256: digest };
    writeRecord(record);
    console.log(`release: packed ${path.relative(here, zipPath)} (${zip.length} bytes, SHA-256 ${digest}). Next: publish.`);
    return;
  }

  if (stage === 'publish') {
    if (!fs.existsSync(zipPath) || sha256(zipPath) !== record.pack.sha256) fail(`${path.relative(here, zipPath)} is missing or changed since pack; run pack again`);
    const existing = gh(['release', 'view', tag, '--repo', RELEASE_REPO, '--json', 'url,assets']);
    if (existing.status === 0) {
      const release = JSON.parse(existing.stdout);
      const asset = release.assets?.find((candidate) => candidate.name === name);
      if (asset?.digest !== `sha256:${record.pack.sha256}`) {
        fail(`${tag} already has a release (${release.url}) without this ZIP; fix it by hand rather than letting this overwrite it`);
      }
      console.log(`release: ${release.url} already carries this ZIP.`);
      record.publish = { at: new Date().toISOString(), url: release.url };
      writeRecord(record);
      return;
    }
    const notesFile = path.join(recordDir, `${tag}-notes.md`);
    fs.writeFileSync(notesFile, releaseNotes(tag, changelogSection(read(root, 'CHANGELOG.md'), version) ?? '', record.pack));
    // A late release for an older tag must not take "Latest" from the current one.
    const current = JSON.parse(read(here, 'package.json')).version;
    const args = ['release', 'create', tag, zipPath, '--repo', RELEASE_REPO, '--title', tag, '--notes-file', notesFile, '--verify-tag'];
    if (tag !== `v${current}`) args.push('--latest=false');
    const created = spawnSync('gh', args, { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'inherit'] });
    if (created.status !== 0) fail(`gh release create ${tag} failed`);
    record.publish = { at: new Date().toISOString(), url: created.stdout.trim() };
    writeRecord(record);
    console.log(`release: published ${record.publish.url}. Next: smoke.`);
    return;
  }

  const smoke = spawnSync(
    process.execPath,
    [
      path.join(here, 'scripts', 'smoke-release-artifact.mjs'),
      '--tag', tag,
      '--asset', name,
      '--expected-size', String(record.pack.size),
      '--expected-digest', `sha256:${record.pack.sha256}`,
    ],
    { stdio: 'inherit', windowsHide: true },
  );
  if (smoke.status !== 0) fail(`smoke:release failed for ${tag}`);
  record.smoke = { at: new Date().toISOString() };
  writeRecord(record);
  console.log(`release: ${tag} is published and its ZIP checks out.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
