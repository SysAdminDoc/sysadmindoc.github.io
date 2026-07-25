import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildDependencyReport,
  dependencyAuditExitCode,
  formatDependencyReport,
  summarizeAudit,
} from '../scripts/audit-dependencies.mjs';

const manifest = {
  dependencies: {
    astro: '^7.0.6',
    shiki: '^4.3.1',
  },
  devDependencies: {
    '@playwright/test': '^1.61.1',
    sharp: '^0.35.3',
    typescript: '^6.0.3',
  },
  overrides: {
    vite: '8.1.3',
    'fast-uri': '^3.1.4',
  },
};

const lock = {
  packages: {
    'node_modules/astro': { version: '7.0.6' },
    'node_modules/shiki': { version: '4.3.1' },
    'node_modules/@playwright/test': { version: '1.61.1' },
    'node_modules/sharp': { version: '0.35.3' },
    'node_modules/typescript': { version: '6.0.3' },
    'node_modules/vite': { version: '8.1.3' },
    'node_modules/fast-uri': { version: '3.1.4' },
  },
};

test('dependency report records direct packages, overrides, and current Astro 7 floors', () => {
  const report = buildDependencyReport({
    manifest,
    lock,
    outdated: {
      astro: { current: '7.0.6', wanted: '7.0.6', latest: '7.0.6', location: '/repo/node_modules/astro' },
      vite: [
        { current: '8.1.3', wanted: '8.1.3', latest: '8.1.5', dependent: 'astro' },
        { current: '8.1.3', wanted: '8.1.3', latest: '8.1.5', dependent: 'vitefu' },
      ],
      'fast-uri': { current: '3.1.4', wanted: '3.1.4', latest: '4.1.1', dependent: 'ajv' },
      typescript: { current: '6.0.3', wanted: '6.0.3', latest: '7.0.2', location: '/repo/node_modules/typescript' },
      sharp: [
        { current: '0.34.5', wanted: '0.34.5', latest: '0.35.3', dependent: 'astro', location: '/repo/node_modules/astro/node_modules/sharp' },
        { current: '0.35.3', wanted: '0.35.3', latest: '0.35.3', dependent: 'sysadmindoc-portfolio', location: '/repo/node_modules/sharp' },
      ],
      shiki: { current: '4.3.1', wanted: '4.3.1', latest: '5.0.0', location: '/repo/node_modules/shiki' },
    },
    audit: { metadata: { vulnerabilities: { high: 0, critical: 0, total: 0 } }, vulnerabilities: {} },
  });

  const astro = report.packages.find((row) => row.name === 'astro');
  const shiki = report.packages.find((row) => row.name === 'shiki');
  const sharp = report.packages.find((row) => row.name === 'sharp');
  const typescript = report.packages.find((row) => row.name === 'typescript');
  const vite = report.packages.find((row) => row.name === 'vite');
  const output = formatDependencyReport(report);
  const strictOutput = formatDependencyReport(report, { strict: true });

  assert.equal(astro.status, 'current');
  assert.equal(vite.type, 'override');
  assert.equal(vite.status, 'latest-update');
  assert.equal(sharp.status, 'current');
  assert.equal(shiki.status, 'major-available');
  assert.equal(typescript.status, 'major-blocked');
  assert.equal(report.packages.find((row) => row.name === 'fast-uri').status, 'major-blocked');
  assert.equal(report.overrideFreshness.failureCount, 1);
  assert.match(output, /exact override freshness: ADVISORY/);
  assert.match(output, /Dependency freshness report passed/);
  assert.match(strictOutput, /exact override freshness: FAIL/);
  assert.match(strictOutput, /Blocking stale exact overrides/);
  assert.match(strictOutput, /Dependency freshness report failed/);
  assert.match(output, /Known blocked majors/);
  assert.equal(dependencyAuditExitCode(report), 0);
  assert.equal(dependencyAuditExitCode(report, { strict: true }), 1);
});

test('strict override freshness ignores documented major holds and passes current exact pins', () => {
  const currentManifest = {
    ...manifest,
    overrides: {
      ...manifest.overrides,
      vite: '8.1.5',
    },
  };
  const report = buildDependencyReport({
    manifest: currentManifest,
    lock: {
      packages: {
        ...lock.packages,
        'node_modules/vite': { version: '8.1.5' },
      },
    },
    outdated: {
      vite: { current: '8.1.5', wanted: '8.1.5', latest: '8.1.5', dependent: 'astro' },
      'fast-uri': { current: '3.1.4', wanted: '3.1.4', latest: '4.1.1', dependent: 'ajv' },
      typescript: { current: '6.0.3', wanted: '6.0.3', latest: '7.0.2', location: '/repo/node_modules/typescript' },
    },
    audit: { metadata: { vulnerabilities: { high: 0, critical: 0, total: 0 } }, vulnerabilities: {} },
  });

  assert.equal(report.overrideFreshness.ok, true);
  assert.equal(report.overrideFreshness.failureCount, 0);
  assert.equal(dependencyAuditExitCode(report, { strict: true }), 0);
  assert.match(formatDependencyReport(report, { strict: true }), /Dependency freshness report passed/);
  assert.match(formatDependencyReport(report, { strict: true }), /typescript 6\.0\.3 -> 7\.0\.2/);
  assert.match(formatDependencyReport(report, { strict: true }), /fast-uri 3\.1\.4 -> 4\.1\.1/);
});

test('dependency report default mode keeps exact override drift advisory', () => {
  const report = buildDependencyReport({
    manifest,
    lock,
    outdated: {
      vite: { current: '8.1.3', wanted: '8.1.3', latest: '8.1.5', dependent: 'astro' },
    },
    audit: { metadata: { vulnerabilities: { high: 0, critical: 0, total: 0 } }, vulnerabilities: {} },
  });

  const output = formatDependencyReport(report);
  assert.equal(report.overrideFreshness.ok, false);
  assert.match(output, /Stale exact overrides \(advisory\)/);
  assert.match(output, /Dependency freshness report passed/);
});

test('dependency audit fails only at the configured security threshold', () => {
  const audit = {
    metadata: {
      vulnerabilities: {
        moderate: 1,
        high: 1,
        critical: 0,
        total: 2,
      },
    },
    vulnerabilities: {
      demo: {
        severity: 'high',
        via: [{ title: 'demo advisory' }],
        fixAvailable: true,
      },
    },
  };

  assert.equal(summarizeAudit(audit, 'high').ok, false);
  assert.equal(summarizeAudit(audit, 'critical').ok, true);
  assert.equal(summarizeAudit(audit, 'none').ok, true);
});
