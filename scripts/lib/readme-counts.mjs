// The README states how big the catalog and the release list are, and a test
// holds those numbers to the generated data. The nightly syncs that data from
// GitHub first, so the day a new public repo reaches the profile feed, the
// test failed the deploy of everything else over a line of documentation
// (2026-09-24 23:01Z). The nightly sets README_COUNTS_REPORT_ONLY, the test
// steps aside, and the run reports the gap as drift after it deploys, as it
// does for an uncataloged repo.
import fs from 'node:fs';
import path from 'node:path';

/**
 * What in the README disagrees with the data, one line each.
 * @param {string} readme
 * @param {{ feedCount: number, fallbackCount: number, releaseCount: number, renderedCount?: number | null }} counts
 *   renderedCount is what the built /projects.json lists, which the live smoke
 *   compares --expected-projects and --expected-feed-items against
 * @returns {string[]}
 */
export function readmeCountDrift(readme, { feedCount, fallbackCount, releaseCount, renderedCount = null }) {
  const drift = [];
  const catalog = readme.match(/catalog \((\d+) feed-backed \/ (\d+) local fallback\)/);
  if (!catalog) drift.push('the README no longer states the catalog counts');
  else {
    if (Number(catalog[1]) !== feedCount) drift.push(`the README says ${catalog[1]} feed-backed projects, the profile feed has ${feedCount}`);
    if (Number(catalog[2]) !== fallbackCount) drift.push(`the README says ${catalog[2]} local fallback projects, src/data/projects.ts has ${fallbackCount}`);
  }
  const releases = readme.match(/--expected-releases (\d+)/);
  if (!releases) drift.push('the README no longer states --expected-releases');
  else if (Number(releases[1]) !== releaseCount) drift.push(`the README says --expected-releases ${releases[1]}, the release cache has ${releaseCount}`);
  if (renderedCount !== null) {
    for (const flag of ['--expected-projects', '--expected-feed-items']) {
      const stated = readme.match(new RegExp(`${flag} (\\d+)`))?.[1];
      if (Number(stated) !== renderedCount) drift.push(`the README says ${flag} ${stated ?? '(nothing)'}, the build lists ${renderedCount}`);
    }
  }
  return drift;
}

/** A file's text, or null when it isn't there. Any other error is thrown. */
function readIfPresent(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

/** JSON that has to parse: one that doesn't is corrupt, not missing. */
function parsed(text, name) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${name} doesn't parse: ${error.message}`);
  }
}

/**
 * The counts the README describes, from a checkout's generated data, or null
 * when that data isn't installed. Only a missing file reads as not installed:
 * one that doesn't parse throws, so a truncated file can't turn the check
 * into a skip (twenty-first drain review).
 * @param {string} root
 */
export function readmeCountInputs(root) {
  const profileText = readIfPresent(path.join(root, 'src', 'data', '_profile-projects.json'));
  const releasesText = readIfPresent(path.join(root, 'src', 'data', '_releases.json'));
  if (profileText === null || releasesText === null) return null;
  const profile = parsed(profileText, 'src/data/_profile-projects.json');
  const releases = parsed(releasesText, 'src/data/_releases.json');
  const projects = fs.readFileSync(path.join(root, 'src', 'data', 'projects.ts'), 'utf8');
  const builtText = readIfPresent(path.join(root, 'dist', 'projects.json'));
  let renderedCount = null;
  if (builtText !== null) {
    const built = parsed(builtText, 'dist/projects.json');
    if (!Array.isArray(built?.projects)) throw new Error('dist/projects.json has no projects list');
    renderedCount = built.projects.length;
  }
  const catalog = projects.match(/export const catalog: CatalogEntry\[] = \[[\s\S]*?\n\];/)?.[0] ?? '';
  return {
    readme: fs.readFileSync(path.join(root, 'README.md'), 'utf8'),
    counts: { feedCount: Number(profile.projectCount), fallbackCount: catalog.match(/\{ repo: /g)?.length ?? 0, releaseCount: Array.isArray(releases) ? releases.length : NaN, renderedCount },
  };
}
