import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const scriptPath = path.join(repoRoot, 'scripts', 'summarize-lhci.mjs');
const require = createRequire(import.meta.url);
const lhciConfig = require(path.join(repoRoot, 'lighthouserc.cjs'));

function runSummary(args) {
  return execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

function writeReportFixture(dir) {
  const reportPath = path.join(dir, 'home.report.json');
  const report = {
    finalUrl: 'http://localhost:4321/',
    categories: {
      performance: { score: 0.7 },
      accessibility: { score: 1 },
      'best-practices': { score: 1 },
      seo: { score: 1 },
    },
    audits: {
      'first-contentful-paint': { numericValue: 1200, numericUnit: 'millisecond' },
      'largest-contentful-paint': { numericValue: 2100, numericUnit: 'millisecond' },
      'cumulative-layout-shift': { numericValue: 0 },
      'total-blocking-time': { numericValue: 450, numericUnit: 'millisecond' },
      'resource-summary': {
        details: {
          items: [
            { resourceType: 'document', requestCount: 1, transferSize: 42000 },
            { resourceType: 'script', requestCount: 4, transferSize: 90000 },
            { resourceType: 'stylesheet', requestCount: 2, transferSize: 30000 },
            { resourceType: 'third-party', requestCount: 2, transferSize: 15000 },
          ],
        },
      },
    },
  };
  fs.writeFileSync(reportPath, JSON.stringify(report));
  fs.writeFileSync(
    path.join(dir, 'manifest.json'),
    JSON.stringify([{ url: report.finalUrl, isRepresentativeRun: true, jsonPath: reportPath }]),
  );
}

test('summarize-lhci reports configured LHCI warnings by route', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lhci-summary-test-'));
  try {
    writeReportFixture(dir);
    const output = runSummary(['--dir', dir]);

    assert.match(output, /Reports checked: 1/);
    assert.match(output, /Warnings: 3/);
    assert.match(output, /\| \/ \| `categories:performance` \| 0\.70 \| >= 0\.80 \|/);
    assert.match(output, /\| \/ \| `total-blocking-time` \| 450 ms \| <= 200 ms \|/);
    assert.match(output, /\| \/ \| `resource-summary:third-party:count` \| 2 \| <= 0 \|/);
    assert.doesNotMatch(output, /largest-contentful-paint/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('lighthouse budget thresholds track current web vitals lab guidance', () => {
  const assertions = lhciConfig.ci.assert.assertions;

  assert.equal(assertions['first-contentful-paint'][1].maxNumericValue, 1800);
  assert.equal(assertions['largest-contentful-paint'][1].maxNumericValue, 2500);
  assert.equal(assertions['cumulative-layout-shift'][1].maxNumericValue, 0.1);
  assert.equal(assertions['total-blocking-time'][1].maxNumericValue, 200);
});

test('summarize-lhci writes an explicit no-report summary', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lhci-empty-test-'));
  const outPath = path.join(dir, 'summary.md');
  try {
    const output = runSummary(['--dir', path.join(dir, 'missing'), '--out', outPath]);
    const written = fs.readFileSync(outPath, 'utf8');

    assert.equal(output, written);
    assert.match(output, /Reports checked: 0/);
    assert.match(output, /No LHCI filesystem reports found/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
