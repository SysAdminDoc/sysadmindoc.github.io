#!/usr/bin/env node
// Refuse to deploy a version that was never tagged.
//
// Release tagging has lapsed twice. v0.31.0 through v0.38.0 shipped untagged and
// were backfilled on 2026-08-20 by hunting each version-bump commit with
// `git log -S'"version": "X.Y.Z"' -- package.json`; v0.42.1 through v0.42.3 then
// did the same thing and were backfilled on 2026-09-05. A convention nothing
// enforces is a convention that lapses, so this is a gate rather than a note.
//
// It checks three things, because a tag that exists is not enough:
//   1. a tag named vX.Y.Z exists for the version in package.json,
//   2. it is annotated, so it carries an author and date,
//   3. it points at a commit that is an ancestor of HEAD, so the tag actually
//      describes the code about to ship rather than some other branch.
//
//   --skip-remote   do not require the tag to exist on the remote
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const skipRemote = process.argv.includes('--skip-remote');

function git(args, { allowFailure = false } = {}) {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    }).trim();
  } catch (error) {
    if (allowFailure) return null;
    throw new Error(`git ${args.join(' ')} failed: ${error.stderr?.toString().trim() || error.message}`);
  }
}

// Two versions matter and they are not the same thing. The deploy builds and
// ships the WORKING TREE, but a tag can only ever point at a commit. Reading
// only the working tree let a dirty checkout satisfy the gate: commit an
// untagged 0.43.0, edit package.json back down to the already-tagged 0.42.3,
// and the tag check passed while the commit being certified declared something
// else. Requiring the two to agree removes the ambiguity entirely.
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const headManifest = git(['show', 'HEAD:package.json'], { allowFailure: true });
if (!headManifest) {
  console.error('verify-release-tag: could not read package.json from HEAD.');
  process.exit(1);
}
let headVersion;
try {
  ({ version: headVersion } = JSON.parse(headManifest));
} catch (error) {
  console.error(`verify-release-tag: package.json at HEAD is not valid JSON: ${error.message}`);
  process.exit(1);
}
if (headVersion !== version) {
  console.error(
    `verify-release-tag: the working tree declares ${version} but HEAD declares ${headVersion}.`,
  );
  console.error('  The deploy ships the working tree; commit the version bump before tagging and deploying.');
  process.exit(1);
}

const tag = `v${version}`;

console.log('Release tag verification');
console.log(`  package version: ${version} (matches HEAD)`);

const objectType = git(['cat-file', '-t', tag], { allowFailure: true });
if (!objectType) {
  console.error(`verify-release-tag: no tag ${tag} exists for the version in package.json.`);
  console.error(`  Create it on the version-bump commit: git tag -a ${tag} -m "${tag}" && git push origin ${tag}`);
  process.exit(1);
}

if (objectType !== 'tag') {
  console.error(`verify-release-tag: ${tag} is a ${objectType}, not an annotated tag.`);
  console.error(`  Re-create it with -a so it carries an author and date: git tag -a -f ${tag} -m "${tag}"`);
  process.exit(1);
}

const tagged = git(['rev-list', '-n', '1', tag]);
if (git(['merge-base', '--is-ancestor', tagged, 'HEAD'], { allowFailure: true }) === null) {
  console.error(`verify-release-tag: ${tag} points at ${tagged.slice(0, 12)}, which is not an ancestor of HEAD.`);
  console.error('  The tag does not describe the code about to ship.');
  process.exit(1);
}
console.log(`  tag: ${tag} (annotated) at ${tagged.slice(0, 12)}`);

if (!skipRemote) {
  const remote = git(['ls-remote', '--tags', 'origin', `refs/tags/${tag}`], { allowFailure: true });
  if (!remote) {
    console.error(`verify-release-tag: ${tag} is not on origin. Push it: git push origin ${tag}`);
    process.exit(1);
  }
  console.log('  remote: present on origin');
}

console.log('Release tag verification passed.');
