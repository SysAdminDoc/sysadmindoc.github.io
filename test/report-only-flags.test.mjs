import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { REPORT_ONLY_FLAGS, REPORT_ONLY_OWNER, runnerMark, strayReportOnlyFlags, withoutReportOnlyFlags } from '../scripts/lib/report-only-flags.mjs';

const root = process.cwd();
const check = path.join(root, 'scripts', 'check-report-only-flags.mjs');
const ensureCwd = path.join(root, 'scripts', 'ensure-project-cwd.mjs');

// Twenty-first review: a flag left in a shell turned the README count test into
// a skip, and a manual preflight then deploy shipped the drift unreported.
test('a report-only flag counts as stray unless the run going now set it', () => {
  const startedAt = '2026-10-09T07:00:00.000Z';
  const running = JSON.stringify({ status: 'running', pid: 4242, startedAt });
  const mark = { [REPORT_ONLY_OWNER]: runnerMark(4242, startedAt) };
  assert.equal(REPORT_ONLY_OWNER, 'PORTFOLIO_NIGHTLY_RUN');
  assert.ok(!REPORT_ONLY_FLAGS.includes(REPORT_ONLY_OWNER));

  assert.deepEqual(strayReportOnlyFlags({}, running), []);
  assert.deepEqual(strayReportOnlyFlags({ README_COUNTS_REPORT_ONLY: '0', PROVENANCE_REPORT_ONLY: '' }, null), [], 'off is off');
  assert.deepEqual(strayReportOnlyFlags({ README_COUNTS_REPORT_ONLY: '1' }, null), ['README_COUNTS_REPORT_ONLY']);
  assert.deepEqual(strayReportOnlyFlags({ CATALOG_AUDIT_REPORT_ONLY: 'TRUE', PROVENANCE_REPORT_ONLY: 'yes' }, null), ['CATALOG_AUDIT_REPORT_ONLY', 'PROVENANCE_REPORT_ONLY']);
  assert.deepEqual(strayReportOnlyFlags({ README_COUNTS_REPORT_ONLY: '1', ...mark }, running), [], "the runner's own");
  for (const [why, status, env] of [
    ['the run is over', JSON.stringify({ status: 'deployed', pid: 4242, startedAt }), mark],
    ['another run', running, { [REPORT_ONLY_OWNER]: runnerMark(4243, startedAt) }],
    ['no mark', running, {}],
    ['no status file', null, mark],
    ['a torn status file', '{"status":"runn', mark],
  ]) {
    assert.deepEqual(strayReportOnlyFlags({ README_COUNTS_REPORT_ONLY: '1', ...env }, status), ['README_COUNTS_REPORT_ONLY'], why);
  }
});

test('the check fails deploy:preflight on a stray flag, and npm test only warns', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'report-only-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'sysadmindoc-portfolio' }));
  await fs.mkdir(path.join(dir, 'test'));
  const run = (script, args, extra) =>
    spawnSync(process.execPath, [script, ...args], { cwd: dir, encoding: 'utf8', windowsHide: true, env: withoutReportOnlyFlags(process.env, extra) });

  const strict = run(check, ['--strict'], { PROVENANCE_REPORT_ONLY: '1' });
  assert.equal(strict.status, 1);
  assert.match(strict.stderr, /^report-only:check: PROVENANCE_REPORT_ONLY is set outside the nightly runner, and nothing would report what it lets through\./);

  const warned = run(check, [], { PROVENANCE_REPORT_ONLY: '1' });
  assert.equal(warned.status, 0);
  assert.match(warned.stderr, /^WARNING: PROVENANCE_REPORT_ONLY is set outside the nightly runner/);

  const tests = run(ensureCwd, [], { README_COUNTS_REPORT_ONLY: '1', CATALOG_AUDIT_REPORT_ONLY: '1' });
  assert.equal(tests.status, 0);
  assert.match(tests.stderr, /^ensure-project-cwd: WARNING: CATALOG_AUDIT_REPORT_ONLY, README_COUNTS_REPORT_ONLY are set outside the nightly runner/);

  for (const script of [check, ensureCwd]) {
    const quiet = run(script, script === check ? ['--strict'] : [], {});
    assert.equal(quiet.status, 0);
    assert.equal(quiet.stderr, '', 'nothing to say without a flag');
  }
});

test('deploy:preflight starts with the strict check', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['report-only:check'], 'node scripts/check-report-only-flags.mjs');
  assert.match(pkg.scripts['deploy:preflight'], /^npm run report-only:check -- --strict && /);
});
