import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const reportPath = path.resolve(process.cwd(), process.argv[2] || path.join('.tmp', 'performance-audit-ci.json'));

function escapeCell(value) {
  return String(value ?? '')
    .replaceAll('|', '\\|')
    .replaceAll('\r', ' ')
    .replaceAll('\n', ' ');
}

function issueCount(result) {
  if (Array.isArray(result.failures)) return result.failures.length;
  return Array.isArray(result.issues) ? result.issues.length : 0;
}

function formatNumber(value, suffix = '') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'n/a';
  return `${value}${suffix}`;
}

let parsed;
try {
  parsed = JSON.parse(await fs.readFile(reportPath, 'utf8'));
} catch (error) {
  console.log('## Performance/bfcache audit');
  console.log('');
  console.log(`Unable to read ${path.relative(process.cwd(), reportPath)}: ${error.message}`);
  process.exitCode = 1;
  process.exit();
}

const results = Array.isArray(parsed.results) ? parsed.results : [];
const totalIssues = results.reduce((sum, result) => sum + issueCount(result), 0);

console.log('## Performance/bfcache audit');
console.log('');
console.log(`Status: ${totalIssues === 0 ? 'PASS' : 'ATTENTION'} (${totalIssues} issue${totalIssues === 1 ? '' : 's'})`);
console.log(`Base URL: ${parsed.baseUrl || 'unknown'}`);
if (parsed.generatedAt) console.log(`Generated: ${parsed.generatedAt}`);
if (parsed.thresholds) {
  const { lcpMs, cls, eventMs } = parsed.thresholds;
  console.log(`Thresholds: LCP <= ${formatNumber(lcpMs, 'ms')}, CLS <= ${formatNumber(cls)}, event <= ${formatNumber(eventMs, 'ms')}`);
}
console.log('');

if (results.length === 0) {
  console.log('No route results were recorded.');
  process.exit();
}

console.log('| Route | Viewport | LCP | CLS | Max event | Max long task | bfcache | Overflow | Issues |');
console.log('|---|---:|---:|---:|---:|---:|---|---|---:|');
for (const result of results) {
  console.log(
    [
      escapeCell(result.label),
      escapeCell(result.viewport),
      escapeCell(formatNumber(result.lcpMs, 'ms')),
      escapeCell(formatNumber(result.cls)),
      escapeCell(formatNumber(result.maxEventMs, 'ms')),
      escapeCell(formatNumber(result.maxLongTaskMs, 'ms')),
      result.bfcacheRestored ? 'yes' : 'no',
      result.overflow ? 'yes' : 'no',
      String(issueCount(result)),
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'),
  );
}
