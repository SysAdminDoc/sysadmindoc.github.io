#!/usr/bin/env node
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultReportDir = path.join(repoRoot, '.tmp', 'lhci');
const reportDir = path.resolve(repoRoot, readArg('--dir') || defaultReportDir);
const outPath = readArg('--out');
const lhciConfig = require(path.join(repoRoot, 'lighthouserc.cjs'));
const assertions = lhciConfig?.ci?.assert?.assertions || {};

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] || null;
}

function formatRoute(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}` || '/';
  } catch {
    return url || '(unknown)';
  }
}

function formatScore(value) {
  return typeof value === 'number' ? value.toFixed(2) : 'n/a';
}

function formatNumeric(value, unit) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'n/a';
  if (unit === 'byte') return `${Math.round(value).toLocaleString('en-US')} bytes`;
  if (unit === 'millisecond') return `${Math.round(value).toLocaleString('en-US')} ms`;
  return Number.isInteger(value) ? value.toLocaleString('en-US') : value.toFixed(3);
}

function thresholdFor(options, unit) {
  if (typeof options?.minScore === 'number') return `>= ${options.minScore.toFixed(2)}`;
  if (typeof options?.maxNumericValue === 'number') {
    return `<= ${formatNumeric(options.maxNumericValue, unit)}`;
  }
  return JSON.stringify(options || {});
}

function resourceSummaryValue(report, resourceType, field) {
  const items = report.audits?.['resource-summary']?.details?.items || [];
  const item = items.find((entry) => entry.resourceType === resourceType);
  if (!item) return null;
  if (field === 'size') return { value: item.transferSize, unit: 'byte' };
  if (field === 'count') return { value: item.requestCount, unit: 'count' };
  return null;
}

function evaluateAssertion(report, assertionId, config) {
  const [, rawOptions] = Array.isArray(config) ? config : [config, {}];
  const options = rawOptions || {};

  if (assertionId.startsWith('categories:')) {
    const categoryId = assertionId.slice('categories:'.length);
    const value = report.categories?.[categoryId]?.score;
    const warn = typeof value !== 'number' || value < options.minScore;
    return {
      warn,
      observed: formatScore(value),
      threshold: thresholdFor(options),
    };
  }

  if (assertionId.startsWith('resource-summary:')) {
    const [, resourceType, field] = assertionId.split(':');
    const result = resourceSummaryValue(report, resourceType, field);
    const value = result?.value;
    const warn = typeof value !== 'number' || value > options.maxNumericValue;
    return {
      warn,
      observed: formatNumeric(value, result?.unit),
      threshold: thresholdFor(options, result?.unit),
    };
  }

  const audit = report.audits?.[assertionId];
  const value = audit?.numericValue;
  const unit = audit?.numericUnit;
  const warn = typeof value !== 'number' || value > options.maxNumericValue;
  return {
    warn,
    observed: formatNumeric(value, unit),
    threshold: thresholdFor(options, unit),
  };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function discoverReports() {
  const entries = await fs.readdir(reportDir).catch(() => []);
  const reportFiles = new Set(entries.filter((entry) => entry.endsWith('.report.json')));
  const manifestPath = path.join(reportDir, 'manifest.json');
  const manifest = await readJson(manifestPath).catch(() => null);
  if (!Array.isArray(manifest)) return [...reportFiles].sort().map((file) => ({ file }));

  return manifest
    .filter((entry) => entry.isRepresentativeRun !== false)
    .map((entry) => {
      const file = path.basename(entry.jsonPath || '');
      return {
        file: reportFiles.has(file) ? file : null,
        url: entry.url,
        summary: entry.summary,
      };
    })
    .filter((entry) => entry.file);
}

function buildMarkdown(warnings, reportCount) {
  const lines = [
    '### Lighthouse CI Budget',
    '',
    `Reports checked: ${reportCount}`,
    '',
  ];

  if (warnings.length === 0) {
    lines.push(reportCount === 0 ? 'No LHCI filesystem reports found.' : 'No LHCI budget warnings found.');
    lines.push('');
    lines.push('LHCI remains advisory; this summary is informational.');
    return `${lines.join('\n')}\n`;
  }

  lines.push(`Warnings: ${warnings.length}`);
  lines.push('');
  lines.push('| Route | Audit | Observed | Threshold |');
  lines.push('| --- | --- | ---: | ---: |');
  for (const warning of warnings) {
    lines.push(`| ${warning.route} | \`${warning.auditId}\` | ${warning.observed} | ${warning.threshold} |`);
  }
  lines.push('');
  lines.push('LHCI remains advisory; warnings do not fail CI.');
  return `${lines.join('\n')}\n`;
}

let markdown;
try {
  const reports = await discoverReports();
  const warnings = [];
  for (const entry of reports) {
    const report = await readJson(path.join(reportDir, entry.file));
    const route = formatRoute(report.finalUrl || report.requestedUrl || entry.url);
    for (const [assertionId, config] of Object.entries(assertions)) {
      const result = evaluateAssertion(report, assertionId, config);
      if (result.warn) warnings.push({ route, auditId: assertionId, ...result });
    }
  }
  markdown = buildMarkdown(warnings, reports.length);
} catch (error) {
  markdown = [
    '### Lighthouse CI Budget',
    '',
    `Unable to summarize LHCI reports: ${error.message}`,
    '',
    'LHCI remains advisory; inspect the uploaded artifact or LHCI step log.',
    '',
  ].join('\n');
}

if (outPath) {
  const resolvedOutPath = path.resolve(repoRoot, outPath);
  await fs.mkdir(path.dirname(resolvedOutPath), { recursive: true });
  await fs.writeFile(resolvedOutPath, markdown);
}

process.stdout.write(markdown);
