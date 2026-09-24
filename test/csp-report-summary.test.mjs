import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { normalizeReport } from '../deploy/vps/csp-report-server.mjs';
import {
  ALERT_MIN_REPORTS,
  ALERT_MIN_SPAN_MS,
  NEW_VIOLATIONS_LIMIT,
  SMOKE_REPORT_SAMPLE,
  SMOKE_REPORT_STORED,
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
  // A keyword violation carries the start of its sample; a URL one doesn't.
  assert.equal(violationKey(report({ blocked: 'inline', directive: 'style-src-elem', sample: 'p{a:1}' })), 'style-src-elem inline "p{a:1}"');
  // Quoted JSON-style: turning " into ' merged these two (fifteenth drain review).
  assert.equal(violationKey(report({ blocked: 'inline', sample: 'x="y"' })), 'script-src-elem inline "x=\\"y\\""');
  assert.notEqual(violationKey(report({ blocked: 'inline', sample: 'getElementById("app")' })), violationKey(report({ blocked: 'inline', sample: "getElementById('app')" })));
  assert.equal(violationKey(report({ blocked: 'https://cdn.example.test/x.js', sample: 'p{a:1}' })), 'script-src-elem cdn.example.test');
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

test('a new first-party violation needs repeated reports an hour or more apart before it counts', () => {
  assert.equal(ALERT_MIN_REPORTS, 3);
  assert.equal(ALERT_MIN_SPAN_MS, 60 * 60_000);
  // Fifty forged reports in one burst stay under watch.
  const burst = summarizeReports(reportsOver(50, 0.01, { blocked: 'https://evil.example.test/x.js' }));
  assert.equal(burst.newViolations.length, 0);
  assert.deepEqual(burst.watching.map((group) => [group.key, group.count]), [['script-src-elem evil.example.test', 50]]);

  // So do three sent 110 ms apart across a change of hour, which the old bar,
  // counting clock-hour labels, took for two hours (tenth drain review).
  const straddle = summarizeReports(
    ['2026-09-24T16:59:59.900Z', '2026-09-24T16:59:59.950Z', '2026-09-24T17:00:00.010Z'].map((receivedAt) =>
      report({ receivedAt, blocked: 'https://evil.example.test/x.js' }),
    ),
  );
  assert.equal(straddle.newViolations.length, 0);

  // Two reports an hour apart are not enough, and neither are three that span 59 minutes.
  assert.equal(summarizeReports(reportsOver(2, 60, {})).newViolations.length, 0);
  assert.equal(summarizeReports(reportsOver(3, 29.5, {})).newViolations.length, 0);

  // Three whose first and last are an hour apart are.
  const real = summarizeReports(reportsOver(3, 30, { blocked: 'inline', directive: 'style-src-elem' }));
  assert.deepEqual(
    real.newViolations.map((group) => [group.key, group.count, group.spanMs]),
    [['style-src-elem inline', 3, 60 * 60_000]],
  );
  assert.equal(real.watching.length, 0);

  // Once reported, it's known, and it doesn't fail the run again.
  const later = summarizeReports(reportsOver(9, 45, { blocked: 'inline', directive: 'style-src-elem' }), { known: ['style-src-elem inline'] });
  assert.equal(later.newViolations.length, 0);
  assert.equal(later.watching.length, 0);
  assert.equal(later.firstParty[0].count, 9);
});

test('a burst that burns an inline key cannot hide a new block with a sample of its own', () => {
  // The tenth drain review: once `style-src-elem inline` was known, a real
  // unhashed block reported over two days raised nothing.
  const forged = reportsOver(3, 40, { blocked: 'inline', directive: 'style-src-elem', sample: 'x{}' });
  const burned = summarizeReports(forged).newViolations.map((group) => group.key);
  assert.deepEqual(burned, ['style-src-elem inline "x{}"']);
  const real = reportsOver(4, 720, { blocked: 'inline', directive: 'style-src-elem', sample: '.new-block{color:red}' });
  const later = summarizeReports([...forged, ...real], { known: burned });
  assert.deepEqual(later.newViolations.map((group) => group.key), ['style-src-elem inline ".new-block{color:red}"']);
});

test('only as many new violations are named as the limit allows, and the rest wait', () => {
  assert.equal(NEW_VIOLATIONS_LIMIT, 20);
  const reports = Array.from({ length: 22 }, (_, index) => reportsOver(3, 40, { blocked: `https://h${index}.example.test/x.js` })).flat();
  const first = summarizeReports(reports);
  assert.equal(first.newViolations.length, 20);
  assert.equal(first.deferred, 2);
  assert.match(summaryLine(first), /; 2 more wait for the next run$/);
  const second = summarizeReports(reports, { known: first.newViolations.map((group) => group.key) });
  assert.equal(second.newViolations.length, 2);
  assert.equal(second.deferred, 0);
});

test('extension, synthetic and other reports never raise a first-party alert', () => {
  for (const category of ['extension', 'synthetic', 'other', undefined]) {
    const summary = summarizeReports(reportsOver(10, 40, { category }));
    assert.equal(summary.newViolations.length, 0, String(category));
    assert.equal(summary.firstParty.length, 0, String(category));
  }
});

test('the newest sample is shown, cleaned, and a report without a valid time still counts', () => {
  // Blocked by URL, so the three are one violation; an inline one with three
  // different samples would be three.
  const blocked = 'https://cdn.example.test/x.js';
  const summary = summarizeReports([
    report({ receivedAt: '2026-09-24T01:00:00Z', blocked, sample: 'older' }),
    report({ receivedAt: '2026-09-24T03:00:00Z', blocked, sample: `body{x:1}${ESC}[31m${RLO}` }),
    report({ receivedAt: 'yesterday', blocked, sample: 'undated' }),
  ]);
  const [group] = summary.firstParty;
  assert.equal(group.count, 3);
  assert.equal(group.spanMs, 2 * 60 * 60_000);
  assert.equal(group.lastAt, '2026-09-24T03:00:00.000Z');
  assert.equal(group.sample, 'body{x:1} [31m');
});

test('the summary line names new violations and says so when there are none', () => {
  const quiet = summarizeReports([report({ category: 'extension' })]);
  assert.equal(summaryLine(quiet), '1 report(s): 1 extension; no new first-party violation');
  // 01:10 to 03:10 is two hours; under two, the span reads in minutes.
  const loud = summarizeReports(reportsOver(4, 40, {}));
  assert.equal(summaryLine(loud, 2), '4 report(s): 4 first-party; 2 unreadable line(s); NEW first-party: script-src-elem inline (4 report(s) over 2.0 h)');
  assert.match(summaryLine(summarizeReports(reportsOver(3, 40, {}))), /\(3 report\(s\) over 80 min\)$/);
});

// The eleventh drain review: keys kept 21 characters of the sample, so a
// forged block alerted once and silenced every real one that began the same.
test('two samples that differ only after the 21st character get two keys', () => {
  const first = violationKey(report({ blocked: 'inline', sample: 'window.dataLayer=window.dataLayer||[];a' }));
  const second = violationKey(report({ blocked: 'inline', sample: 'window.dataLayer=window.dataLayer||[];b' }));
  assert.notEqual(first, second);
  assert.match(first, /"window\.dataLayer=window\.dataLayer\|\|\[\];a"$/, 'the whole stored sample');
});

// The fifteenth drain review: the sink's marks can take a stored sample past
// the key's 64 characters, and the summary cut every key to 120.
test('samples that differ only past 64 or 120 characters keep two keys, through the summary too', () => {
  for (const length of [70, 130]) {
    const samples = ['a', 'b'].map((end) => `${'[email],'.repeat(20)}`.slice(0, length - 1) + end);
    assert.notEqual(violationKey(report({ sample: samples[0] })), violationKey(report({ sample: samples[1] })), `${length}`);
    const keys = summarizeReports(samples.map((sample) => report({ sample }))).firstParty.map((group) => group.key);
    assert.equal(new Set(keys).size, 2, `${length}`);
  }
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
  assert.match(String(stored.sample), SMOKE_REPORT_STORED, "the bare marker, since the smoke sample is none of the site's own code");
  const lines = (...entries) => entries.map((entry) => JSON.stringify(entry)).join('\n');
  const runId = 'run1';

  assert.equal(smokeReportProblem(lines(report({ receivedAt: '2026-09-24T02:02:00Z' }), stored), { since, runId }), null);
  assert.match(smokeReportProblem(lines(posted('2026-09-24T01:00:00Z')), { since, runId }), /no smoke report from this deploy/);
  assert.match(smokeReportProblem('', { since, runId }), /no smoke report from this deploy \(run run1\)/);
  // A smoke-looking row posted after ours, by anyone, doesn't stand in for it
  // (tenth drain review), and our row alone is judged.
  const forged = { ...stored, document: `${site}/__live-smoke-forged/`, category: 'first-party', sample: 'x' };
  assert.equal(smokeReportProblem(lines(stored, forged), { since, runId }), null);
  assert.match(smokeReportProblem(lines(forged), { since, runId }), /no smoke report from this deploy/);
  // The sink as it was before this change: no category, sample dropped.
  const { category, sample, ...old } = stored;
  assert.match(smokeReportProblem(lines(old), { since, runId }), /stored as "\(no category\)", not "synthetic"/);
  assert.match(smokeReportProblem(lines({ ...stored, sample: SMOKE_REPORT_SAMPLE }), { since, runId }), /sample was stored as "live-smoke uid=4815162342"/);
  assert.match(smokeReportProblem(lines({ ...stored, document: `${stored.document}?synthetic=1` }), { since, runId }), /kept a query string/);
  assert.equal(category, 'synthetic');
  assert.match(String(sample), SMOKE_REPORT_STORED);
  // The sink before the marker kept a scrubbed copy; a deploy that finds one is
  // talking to a stale container.
  assert.match(smokeReportProblem(lines({ ...stored, sample: 'live-smoke uid=[number]' }), { since, runId }), /not as the \[other\] marker/);
});

test('every deploy posts the sample and reads the smoke report back after the smoke', async () => {
  const [deploy, smoke] = await Promise.all([
    fs.readFile(path.join(root, 'scripts', 'deploy-vps.mjs'), 'utf8'),
    fs.readFile(path.join(root, 'scripts', 'smoke-live-site.mjs'), 'utf8'),
  ]);
  assert.match(smoke, /blockedURL: 'https:\/\/live-smoke\.invalid\/synthetic\.js\?synthetic=1',\s*\/\/[^\n]*\n\s*sample: SMOKE_REPORT_SAMPLE,/);
  const logShape = deploy.indexOf('\n  verifyAccessLogShape(smokeStartedAt);');
  const reportShape = deploy.indexOf('\n  verifyCspReportShape(smokeStartedAt, smokeRunId);');
  assert.ok(logShape > 0 && reportShape > logShape, 'the read-back runs after the smoke, beside the access-log check');
  // The deploy names the run, the smoke uses that name, and the read-back asks
  // the store for that run's rows alone.
  assert.match(deploy, /\], \{ env: \{ \.\.\.process\.env, LIVE_SMOKE_RUN_ID: smokeRunId \} \}\);/);
  assert.match(deploy, /grep -hF "\/__live-smoke-\$\{runId\}\/"/);
  // Flood evidence comes from the rotated file alone (fifteenth drain review).
  assert.match(deploy, /const oldest = captureRemote\("docker exec portfolio-csp-reporter sh -c 'head -n1 \/var\/lib\/csp-reports\/reports\.ndjson\.1 2>\/dev\/null; true'"\);/);
  assert.doesNotMatch(deploy, /head -n1 \/var\/lib\/csp-reports\/reports\.ndjson 2/);
  assert.match(smoke, /const runId = \/\^\[a-z0-9-\]\{8,64\}\$\/\.test\(process\.env\.LIVE_SMOKE_RUN_ID \?\? ''\)/);
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
  assert.match(look.stdout, /NEW first-party: connect-src avatars\.githubusercontent\.com \(3 report\(s\) over 80 min\)/);
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

  // --record remembers only what the summary names: with 21 due, the 21st is
  // left for the next run instead of being remembered unseen.
  const crowdDir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-csp-summary-'));
  t.after(() => fs.rm(crowdDir, { recursive: true, force: true }));
  const crowd = path.join(crowdDir, 'reports.ndjson');
  const crowdLines = Array.from({ length: 21 }, (_, index) => reportsOver(3, 40, { blocked: `https://h${index}.example.test/x.js` })).flat();
  await fs.writeFile(crowd, `${crowdLines.map((entry) => JSON.stringify(entry)).join('\n')}\n`);
  const crowdRun = () => spawnSync(process.execPath, [cli, '--file', crowd, '--record'], { cwd: crowdDir, encoding: 'utf8', windowsHide: true });
  assert.equal(crowdRun().status, 0);
  const named = JSON.parse(await fs.readFile(path.join(crowdDir, '.tmp', 'csp-report-summary.json'), 'utf8'));
  const state = JSON.parse(await fs.readFile(path.join(crowdDir, '.tmp', 'csp-report-state.json'), 'utf8'));
  assert.equal(named.newViolations.length, 20);
  assert.equal(named.deferred, 1);
  assert.deepEqual(Object.keys(state.known).sort(), named.newViolations.map((group) => group.key).sort());
  assert.equal(crowdRun().status, 0);
  const rest = JSON.parse(await fs.readFile(path.join(crowdDir, '.tmp', 'csp-report-summary.json'), 'utf8'));
  assert.equal(rest.newViolations.length, 1, 'the 21st is named the next time');

  // No store and no server to read from is a failure, not an empty store.
  const missing = spawnSync(process.execPath, [cli], { cwd: dir, encoding: 'utf8', windowsHide: true, env: { ...process.env, PORTFOLIO_VPS_SSH: '' } });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /could not read the report store: set PORTFOLIO_VPS_SSH/);
});
