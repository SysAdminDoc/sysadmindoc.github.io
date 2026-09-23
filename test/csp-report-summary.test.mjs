import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { normalizeReport } from '../deploy/vps/csp-report-server.mjs';
import {
  ALERT_MIN_HOURS,
  ALERT_MIN_REPORTS,
  SMOKE_REPORT_SAMPLE,
  SMOKE_REPORT_SCRUBBED,
  parseStore,
  printable,
  smokeReportProblem,
  summarizeReports,
  summaryLine,
  violationKey,
} from '../scripts/lib/csp-report-summary.mjs';

const root = process.cwd();
const cli = path.join(root, 'scripts', 'csp-report-summary.mjs');
const site = 'https://portfolio.getparkerai.com';
const ESC = String.fromCharCode(27);
const RLO = String.fromCharCode(0x202e);

function report(fields) {
  return { type: 'csp-violation', document: `${site}/`, directive: 'script-src-elem', blocked: 'inline', category: 'first-party', ...fields };
}

// `count` reports spread one per `stepMinutes` from `start`.
function reportsOver(count, stepMinutes, fields, start = Date.parse('2026-09-24T01:10:00Z')) {
  return Array.from({ length: count }, (_, index) => report({ receivedAt: new Date(start + index * stepMinutes * 60_000).toISOString(), ...fields }));
}

test('the store parser keeps objects and counts every other line as unreadable', () => {
  const { reports, unreadable } = parseStore(['{"a":1}', '', 'not json', '[1,2]', '42', 'null', '{"b":2}', '   '].join('\n'));
  assert.deepEqual(reports, [{ a: 1 }, { b: 2 }]);
  assert.equal(unreadable, 4);
});

test('a violation is keyed on its directive and what it blocked', () => {
  assert.equal(violationKey(report({ blocked: 'https://avatars.githubusercontent.com/u/54586742', directive: 'img-src' })), 'img-src avatars.githubusercontent.com');
  assert.equal(violationKey(report({ blocked: 'https://cdn.example.test:8443/x.js' })), 'script-src-elem cdn.example.test:8443');
  assert.equal(violationKey(report({ blocked: 'INLINE', directive: 'Style-Src-Elem' })), 'style-src-elem inline');
  assert.equal(violationKey(report({ blocked: 'chrome-extension://(redacted)' })), 'script-src-elem chrome-extension:');
  assert.equal(violationKey(report({ blocked: '(invalid-url)' })), 'script-src-elem (unreadable)');
  assert.equal(violationKey(report({ blocked: undefined, directive: 'bad directive;' })), '(none) (none)');
});

test('printable strips control and direction characters and bounds the length', () => {
  assert.equal(printable(`a${ESC}[2Jb${RLO}c\nd`), 'a [2Jb c d');
  assert.equal(printable('x'.repeat(100), 10), 'xxxxxxx...');
  assert.equal(printable(42), '');
});

test('categories are counted, and reports from before the store had them count as legacy', () => {
  const summary = summarizeReports([
    report({ receivedAt: '2026-09-24T01:00:00Z' }),
    report({ category: 'extension' }),
    report({ category: 'synthetic' }),
    report({ category: 'other' }),
    report({ category: undefined, blocked: '(invalid-url)' }),
    report({ category: 'made-up' }),
  ]);
  assert.deepEqual(summary.counts, { synthetic: 1, extension: 1, 'first-party': 1, other: 1, legacy: 2 });
  assert.equal(summary.total, 6);
  assert.deepEqual(summary.firstParty.map((group) => group.key), ['script-src-elem inline']);
});

test('a new first-party violation needs repeated reports in separate hours before it counts', () => {
  assert.equal(ALERT_MIN_REPORTS, 3);
  assert.equal(ALERT_MIN_HOURS, 2);
  // Fifty forged reports in one burst stay under watch.
  const burst = summarizeReports(reportsOver(50, 0.01, { blocked: 'https://evil.example.test/x.js' }));
  assert.equal(burst.newViolations.length, 0);
  assert.deepEqual(burst.watching.map((group) => [group.key, group.count, group.hours]), [['script-src-elem evil.example.test', 50, 1]]);

  // Two reports an hour apart are not enough either.
  assert.equal(summarizeReports(reportsOver(2, 60, {})).newViolations.length, 0);

  // Three reports across two hours are.
  const real = summarizeReports(reportsOver(3, 30, { blocked: 'inline', directive: 'style-src-elem' }));
  assert.deepEqual(
    real.newViolations.map((group) => [group.key, group.count, group.hours]),
    [['style-src-elem inline', 3, 2]],
  );
  assert.equal(real.watching.length, 0);

  // Once reported, it's known, and it doesn't fail the run again.
  const later = summarizeReports(reportsOver(9, 45, { blocked: 'inline', directive: 'style-src-elem' }), { known: ['style-src-elem inline'] });
  assert.equal(later.newViolations.length, 0);
  assert.equal(later.watching.length, 0);
  assert.equal(later.firstParty[0].count, 9);
});

test('extension, synthetic and other reports never raise a first-party alert', () => {
  for (const category of ['extension', 'synthetic', 'other', undefined]) {
    const summary = summarizeReports(reportsOver(10, 40, { category }));
    assert.equal(summary.newViolations.length, 0, String(category));
    assert.equal(summary.firstParty.length, 0, String(category));
  }
});

test('the newest sample is shown, cleaned, and a report without a valid time still counts', () => {
  const summary = summarizeReports([
    report({ receivedAt: '2026-09-24T01:00:00Z', sample: 'older' }),
    report({ receivedAt: '2026-09-24T03:00:00Z', sample: `body{x:1}${ESC}[31m${RLO}` }),
    report({ receivedAt: 'yesterday', sample: 'undated' }),
  ]);
  const [group] = summary.firstParty;
  assert.equal(group.count, 3);
  assert.equal(group.hours, 2);
  assert.equal(group.lastAt, '2026-09-24T03:00:00.000Z');
  assert.equal(group.sample, 'body{x:1} [31m');
});

test('the summary line names new violations and says so when there are none', () => {
  const quiet = summarizeReports([report({ category: 'extension' })]);
  assert.equal(summaryLine(quiet), '1 report(s): 1 extension; no new first-party violation');
  // 01:10, 01:50, 02:30 and 03:10 fall in three clock hours.
  const loud = summarizeReports(reportsOver(4, 40, {}));
  assert.equal(summaryLine(loud, 2), '4 report(s): 4 first-party; 2 unreadable line(s); NEW first-party: script-src-elem inline (4 report(s) over 3 hour(s))');
});

test("the deploy's read-back accepts only the smoke report the current sink would store", () => {
  const since = Date.parse('2026-09-24T02:00:00Z') / 1000;
  // What the sink makes of the report scripts/smoke-live-site.mjs posts.
  const posted = (at) =>
    normalizeReport(
      {
        type: 'csp-violation',
        url: `${site}/__live-smoke-run1/?synthetic=1`,
        body: {
          documentURL: `${site}/__live-smoke-run1/?synthetic=1`,
          effectiveDirective: 'script-src',
          blockedURL: 'https://live-smoke.invalid/synthetic.js?synthetic=1',
          sample: SMOKE_REPORT_SAMPLE,
        },
      },
      new Date(at),
    );
  const stored = posted('2026-09-24T02:01:00Z');
  assert.equal(stored.sample, SMOKE_REPORT_SCRUBBED);
  const lines = (...entries) => entries.map((entry) => JSON.stringify(entry)).join('\n');

  assert.equal(smokeReportProblem(lines(report({ receivedAt: '2026-09-24T02:02:00Z' }), stored), { since }), null);
  assert.match(smokeReportProblem(lines(posted('2026-09-24T01:00:00Z')), { since }), /no smoke report from this deploy/);
  assert.match(smokeReportProblem('', { since }), /no smoke report from this deploy/);
  // The sink as it was before this change: no category, sample dropped.
  const { category, sample, ...old } = stored;
  assert.match(smokeReportProblem(lines(old), { since }), /stored as "\(no category\)", not "synthetic"/);
  assert.match(smokeReportProblem(lines({ ...stored, sample: SMOKE_REPORT_SAMPLE }), { since }), /sample was stored as "live-smoke uid=4815162342"/);
  assert.match(smokeReportProblem(lines({ ...stored, document: `${stored.document}?synthetic=1` }), { since }), /kept a query string/);
  assert.equal(category, 'synthetic');
  assert.equal(sample, SMOKE_REPORT_SCRUBBED);
});

test('every deploy posts the sample and reads the smoke report back after the smoke', async () => {
  const [deploy, smoke] = await Promise.all([
    fs.readFile(path.join(root, 'scripts', 'deploy-vps.mjs'), 'utf8'),
    fs.readFile(path.join(root, 'scripts', 'smoke-live-site.mjs'), 'utf8'),
  ]);
  assert.match(smoke, /blockedURL: 'https:\/\/live-smoke\.invalid\/synthetic\.js\?synthetic=1',\s*\/\/[^\n]*\n\s*sample: SMOKE_REPORT_SAMPLE,/);
  const logShape = deploy.indexOf('\n  verifyAccessLogShape(smokeStartedAt);');
  const reportShape = deploy.indexOf('\n  verifyCspReportShape(smokeStartedAt);');
  assert.ok(logShape > 0 && reportShape > logShape, 'the read-back runs after the smoke, beside the access-log check');
});

test('the command reads a store file, writes the summary, and records a violation only once with --record', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-csp-summary-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = path.join(dir, 'reports.ndjson');
  const lines = reportsOver(3, 40, { blocked: 'https://avatars.githubusercontent.com/u/1', directive: 'connect-src' }).map((entry) => JSON.stringify(entry));
  await fs.writeFile(store, `${lines.join('\n')}\nnot json\n`);
  const run = (...args) => spawnSync(process.execPath, [cli, '--file', store, ...args], { cwd: dir, encoding: 'utf8', windowsHide: true });

  // A plain run reports but remembers nothing.
  const look = run();
  assert.equal(look.status, 0, look.stderr);
  assert.match(look.stdout, /NEW first-party: connect-src avatars\.githubusercontent\.com \(3 report\(s\) over 2 hour\(s\)\)/);
  await assert.rejects(fs.access(path.join(dir, '.tmp', 'csp-report-state.json')));

  const first = run('--record');
  assert.equal(first.status, 0, first.stderr);
  const summary = JSON.parse(await fs.readFile(path.join(dir, '.tmp', 'csp-report-summary.json'), 'utf8'));
  assert.equal(summary.schema, 'sysadmindoc.csp-report-summary.v1');
  assert.equal(summary.unreadable, 1);
  assert.deepEqual(summary.newViolations.map((group) => group.key), ['connect-src avatars.githubusercontent.com']);

  const second = run('--record');
  assert.equal(second.status, 0, second.stderr);
  const again = JSON.parse(await fs.readFile(path.join(dir, '.tmp', 'csp-report-summary.json'), 'utf8'));
  assert.deepEqual(again.newViolations, []);
  assert.match(again.line, /no new first-party violation/);

  // No store and no server to read from is a failure, not an empty store.
  const missing = spawnSync(process.execPath, [cli], { cwd: dir, encoding: 'utf8', windowsHide: true, env: { ...process.env, PORTFOLIO_VPS_SSH: '' } });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /could not read the report store: set PORTFOLIO_VPS_SSH/);
});
