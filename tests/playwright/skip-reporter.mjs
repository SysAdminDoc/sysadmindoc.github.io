/**
 * Reporter that makes data-conditional skips visible and pinned.
 *
 * Several interaction specs call `test.skip(true, '...')` when the current
 * generated data cannot produce the state under test (a single live-app
 * category, a timeline that fits above the fold, and so on). A summary line
 * reading "44 passed, 2 skipped" hides which path went dormant, and a path that
 * silently stops running stops protecting anything — the v0.27.0 audit found a
 * real defect on exactly such a skipped path.
 *
 * This reporter prints every skip with its reason and fails the run when the set
 * of skipped titles differs from EXPECTED_SKIPS, so a newly dormant spec is a
 * decision rather than an accident.
 */

/**
 * Titles expected to skip on the current generated data, with why.
 * Remove an entry once the data can exercise it again.
 */
const EXPECTED_SKIPS = new Map([
  [
    'screenshots gallery filters › category filter updates pressed state, URL, status, and reload state',
    'Every live app is currently one category, so the gallery facet is not rendered.',
  ],
]);

function testTitle(test) {
  // titlePath() is [root, project, file, ...describes, title]. Key on the
  // describe chain plus title only, so one entry covers every project the spec
  // runs under and the key survives a project rename.
  const segments = test.titlePath().filter(Boolean);
  const fileIndex = segments.findIndex((segment) => segment.endsWith('.mjs'));
  return (fileIndex >= 0 ? segments.slice(fileIndex + 1) : segments).join(' › ');
}

function skipReason(test, result) {
  const annotations = [...(result.annotations ?? []), ...(test.annotations ?? [])];
  const skip = annotations.find((annotation) => annotation.type === 'skip' || annotation.type === 'fixme');
  return skip?.description ?? 'no reason recorded';
}

export default class SkipReporter {
  constructor() {
    this.skips = new Map();
    // A pin can only be judged against specs this invocation actually selected.
    // `audit:sw` and any -g filter run a subset, and an unrelated pin is out of
    // scope there rather than stale.
    this.seen = new Set();
  }

  onTestEnd(test, result) {
    const title = testTitle(test);
    this.seen.add(title);
    if (result.status !== 'skipped') return;
    if (!this.skips.has(title)) this.skips.set(title, skipReason(test, result));
  }

  onEnd(result) {
    const inScope = [...EXPECTED_SKIPS.keys()].filter((title) => this.seen.has(title));
    if (this.skips.size === 0 && inScope.length === 0) return undefined;

    console.log('\nSkip audit');
    for (const [title, reason] of this.skips) {
      const status = EXPECTED_SKIPS.has(title) ? 'expected' : 'UNEXPECTED';
      console.log(`  [${status}] ${title}\n      reason: ${reason}`);
    }

    const unexpected = [...this.skips.keys()].filter((title) => !EXPECTED_SKIPS.has(title));
    // A pinned skip that starts running again is good news, but the pin is now
    // stale and would hide the next real regression. Only judge pins whose spec
    // was selected by this run.
    const resolved = inScope.filter((title) => !this.skips.has(title));

    for (const title of resolved) {
      console.log(`  [resolved] ${title}\n      This spec runs again — remove it from EXPECTED_SKIPS.`);
    }

    if (unexpected.length === 0 && resolved.length === 0) return undefined;

    console.error('\nSkip audit failed:');
    for (const title of unexpected) {
      console.error(`  - Unexpected skip: ${title}`);
    }
    for (const title of resolved) {
      console.error(`  - Stale pin (spec no longer skips): ${title}`);
    }
    console.error('  Update EXPECTED_SKIPS in tests/playwright/skip-reporter.mjs.');
    return { status: result.status === 'passed' ? 'failed' : result.status };
  }
}
