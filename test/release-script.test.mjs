import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import zlib from 'node:zlib';
import { assetName, changelogSection, missingStage, releaseNotes, versionProblems, zipDirectory } from '../scripts/release.mjs';

const CHANGELOG = [
  '# Changelog',
  '',
  '## [Unreleased]',
  '',
  '## [v1.2.0] - 2026-10-09',
  '',
  '### Added',
  '- A thing.',
  '',
  '## [v1.1.0] - 2026-10-01',
  '',
  '### Fixed',
  '- Another thing.',
  '',
].join('\n');

/** Reads a ZIP back through its central directory, inflating every entry. @param {Buffer} zip */
function unzip(zip) {
  const end = zip.length - 22;
  assert.equal(zip.readUInt32LE(end), 0x06054b50, 'the archive ends with its directory record');
  const count = zip.readUInt16LE(end + 10);
  let at = zip.readUInt32LE(end + 16);
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    assert.equal(zip.readUInt32LE(at), 0x02014b50);
    const crc = zip.readUInt32LE(at + 16);
    const packedSize = zip.readUInt32LE(at + 20);
    const nameLength = zip.readUInt16LE(at + 28);
    const offset = zip.readUInt32LE(at + 42);
    const name = zip.toString('utf8', at + 46, at + 46 + nameLength);
    const dataAt = offset + 30 + zip.readUInt16LE(offset + 26) + zip.readUInt16LE(offset + 28);
    const data = zlib.inflateRawSync(zip.subarray(dataAt, dataAt + packedSize));
    assert.equal(zlib.crc32(data), crc, `${name} matches its checksum`);
    entries.set(name, data.toString('utf8'));
    at += 46 + nameLength;
  }
  return entries;
}

test('the notes are the whole CHANGELOG section for that version, plus the artifact line', () => {
  assert.equal(changelogSection(CHANGELOG, '1.2.0'), '### Added\n- A thing.');
  assert.equal(changelogSection(CHANGELOG, '1.1.0'), '### Fixed\n- Another thing.');
  assert.equal(changelogSection(CHANGELOG.replace(/\n/g, '\r\n'), '1.1.0'), '### Fixed\n- Another thing.');
  assert.equal(changelogSection(CHANGELOG, '1.0.0'), null);
  // An empty section is as good as none: there would be nothing to publish.
  assert.equal(changelogSection('## [v2.0.0] - 2026-10-09\n\n## [v1.2.0]\n- x\n', '2.0.0'), null);
  // 1.2.0 must not match a heading for 1.2.01 or similar.
  assert.equal(changelogSection('## [v1.2.01] - 2026-10-09\n- x\n', '1.2.0'), null);
  const notes = releaseNotes('v1.2.0', '### Added\n- A thing.', { name: assetName('v1.2.0'), sha256: 'ab'.repeat(32) });
  assert.equal(
    notes,
    `## v1.2.0\n\n### Added\n- A thing.\n\nArtifact: sysadmindoc-portfolio-v1.2.0.zip, the built static site (unsigned). SHA-256: ${'ab'.repeat(32)}\n`,
  );
});

test('preflight names every version string that disagrees with the tag', () => {
  const good = {
    packageJson: JSON.stringify({ version: '1.2.0' }),
    packageLock: JSON.stringify({ version: '1.2.0', packages: { '': { version: '1.2.0' } } }),
    readme: '![Version](https://img.shields.io/badge/version-1.2.0-blue)',
    changelog: CHANGELOG,
  };
  assert.deepEqual(versionProblems('1.2.0', good), []);
  const stale = versionProblems('1.2.0', {
    packageJson: JSON.stringify({ version: '1.1.0' }),
    packageLock: JSON.stringify({ version: '1.2.0', packages: { '': { version: '1.1.0' } } }),
    readme: '![Version](https://img.shields.io/badge/version-1.1.0-blue)',
    changelog: '## [Unreleased]\n- A thing.\n',
  });
  assert.equal(stale.length, 4);
  assert.match(stale[0], /package\.json says 1\.1\.0/);
  assert.match(stale[1], /package-lock\.json/);
  assert.match(stale[2], /README version badge/);
  assert.match(stale[3], /CHANGELOG\.md has no "## \[v1\.2\.0\]" section/);
});

test('each stage refuses to run before the one it needs, and a new commit starts over', () => {
  const commit = 'a'.repeat(40);
  assert.equal(missingStage('preflight', null, commit), null);
  assert.equal(missingStage('pack', null, commit), 'preflight');
  assert.equal(missingStage('pack', { commit, preflight: {} }, commit), null);
  assert.equal(missingStage('publish', { commit, preflight: {} }, commit), 'pack');
  assert.equal(missingStage('smoke', { commit, preflight: {}, pack: {} }, commit), 'publish');
  assert.equal(missingStage('smoke', { commit, preflight: {}, pack: {}, publish: {} }, commit), null);
  // A record from another commit is no record at all.
  assert.equal(missingStage('publish', { commit: 'b'.repeat(40), preflight: {}, pack: {} }, commit), 'preflight');
  assert.throws(() => missingStage('ship', null, commit), /unknown stage "ship"/);
});

test('pack gives the same bytes for the same dist/, and the ZIP holds every file at its path', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-release-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.mkdir(path.join(dir, 'b', 'deep'), { recursive: true });
  await fs.writeFile(path.join(dir, 'index.html'), '<!doctype html><title>x</title>'.repeat(50));
  await fs.writeFile(path.join(dir, 'b', 'deep', 'é.txt'), 'accented name');
  await fs.writeFile(path.join(dir, 'b', 'empty.txt'), '');
  const stamp = new Date('2026-10-09T12:34:56Z');
  const first = zipDirectory(dir, stamp);
  assert.deepEqual(first, zipDirectory(dir, stamp), 'same input, same bytes');
  const entries = unzip(first);
  assert.deepEqual([...entries.keys()], ['b/deep/é.txt', 'b/empty.txt', 'index.html']);
  assert.equal(entries.get('b/deep/é.txt'), 'accented name');
  assert.equal(entries.get('b/empty.txt'), '');
  assert.equal(entries.get('index.html'), '<!doctype html><title>x</title>'.repeat(50));
  // The DOS timestamp is the stamp given, not the files' own times.
  const time = first.readUInt16LE(10);
  assert.deepEqual([time >> 11, (time >> 5) & 63, (time & 31) * 2], [12, 34, 56]);
  const date = first.readUInt16LE(12);
  assert.deepEqual([(date >> 9) + 1980, (date >> 5) & 15, date & 31], [2026, 10, 9]);
});

test('the release script is reachable as an npm script', async () => {
  const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'));
  assert.equal(pkg.scripts.release, 'node scripts/release.mjs');
});
