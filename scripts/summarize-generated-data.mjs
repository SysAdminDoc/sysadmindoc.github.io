import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const dataDir = path.join(root, 'src', 'data');

const options = {
  outDir: process.env.DATA_REFRESH_SUMMARY_DIR || 'data-refresh-summary',
  maxAgeHours: 36,
  failOnStale: false,
};

for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (arg === '--fail-on-stale') {
    options.failOnStale = true;
  } else if (arg.startsWith('--max-age-hours=')) {
    options.maxAgeHours = Number(arg.split('=')[1]);
  } else if (arg === '--max-age-hours') {
    index += 1;
    options.maxAgeHours = Number(process.argv[index]);
  } else if (arg.startsWith('--out=')) {
    options.outDir = arg.split('=')[1];
  } else if (arg === '--out') {
    index += 1;
    options.outDir = process.argv[index];
  } else {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

if (!Number.isFinite(options.maxAgeHours) || options.maxAgeHours <= 0) {
  throw new Error('--max-age-hours must be a positive number.');
}

async function readJson(fileName) {
  const filePath = path.join(dataDir, fileName);
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${path.relative(root, filePath)}: ${error.message}`);
  }
}

function isoOrUnknown(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'unknown' : date.toISOString();
}

function ageHours(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return (Date.now() - date.getTime()) / 3_600_000;
}

function passFail(value) {
  return value ? 'PASS' : 'FAIL';
}

const [stars, stats, meta, releases, readmes] = await Promise.all([
  readJson('_stars.json'),
  readJson('_stats.json'),
  readJson('_meta.json'),
  readJson('_releases.json'),
  readJson('_readmes.json'),
]);

const starEntries = Object.keys(stars).length;
const metaEntries = Object.keys(meta).length;
const readmeEntries = Object.keys(readmes).length;
const releaseEntries = Array.isArray(releases) ? releases.length : 0;
const fetchedAgeHours = ageHours(stats.fetchedAt);
const fresh = fetchedAgeHours <= options.maxAgeHours;

const checks = [
  {
    label: 'stars entries match totalRepos',
    ok: Number.isFinite(stats.totalRepos) && starEntries === stats.totalRepos,
  },
  {
    label: 'metadata entries match totalRepos',
    ok: Number.isFinite(stats.totalRepos) && metaEntries === stats.totalRepos,
  },
  {
    label: 'stars total is numeric',
    ok: Number.isFinite(stats.totalStars),
  },
  {
    label: 'last pushed repo has metadata',
    ok: typeof stats.lastPushedRepo === 'string' && hasOwn(meta, stats.lastPushedRepo),
  },
  {
    label: 'README cache is non-empty',
    ok: readmeEntries > 0,
  },
  {
    label: `generated data age <= ${options.maxAgeHours}h`,
    ok: fresh,
  },
];

const failedChecks = checks.filter((check) => !check.ok);
const status = failedChecks.length === 0 ? 'fresh' : 'attention-required';
const outDir = path.resolve(root, options.outDir);
await fs.mkdir(outDir, { recursive: true });

const summary = {
  status,
  generatedAt: new Date().toISOString(),
  fetchedAt: isoOrUnknown(stats.fetchedAt),
  ageHours: Number.isFinite(fetchedAgeHours) ? Number(fetchedAgeHours.toFixed(2)) : null,
  maxAgeHours: options.maxAgeHours,
  totalRepos: stats.totalRepos,
  starEntries,
  metaEntries,
  readmeEntries,
  releaseEntries,
  totalStars: stats.totalStars,
  lastPushedRepo: stats.lastPushedRepo ?? null,
  lastPushedAt: isoOrUnknown(stats.lastPushedAt),
  latestRelease: stats.latestRelease ?? null,
  checks,
};

function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

const latestRelease = stats.latestRelease
  ? `${stats.latestRelease.repo ?? 'unknown'} ${stats.latestRelease.tag ?? 'untagged'} at ${isoOrUnknown(stats.latestRelease.at)}`
  : 'none';

const markdown = [
  '# GitHub Data Refresh Summary',
  '',
  `Status: ${status}`,
  `Summary generated: ${summary.generatedAt}`,
  `Data fetched: ${summary.fetchedAt}`,
  `Data age: ${summary.ageHours ?? 'unknown'} hours (limit ${options.maxAgeHours})`,
  '',
  '## Totals',
  '',
  `- Public non-fork repos: ${stats.totalRepos}`,
  `- Stars: ${stats.totalStars}`,
  `- Star entries: ${starEntries}`,
  `- Metadata entries: ${metaEntries}`,
  `- README entries: ${readmeEntries}`,
  `- Release entries: ${releaseEntries}`,
  '',
  '## Freshness Signals',
  '',
  `- Last pushed repo: ${stats.lastPushedRepo ?? 'unknown'} at ${summary.lastPushedAt}`,
  `- Latest release signal: ${latestRelease}`,
  '',
  '## Integrity Checks',
  '',
  ...checks.map((check) => `- ${passFail(check.ok)} - ${check.label}`),
  '',
].join('\n');

await Promise.all([
  fs.writeFile(path.join(outDir, 'summary.md'), markdown),
  fs.writeFile(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`),
]);

console.log(markdown);

if (options.failOnStale && failedChecks.length > 0) {
  console.error(`Generated data summary failed ${failedChecks.length} check(s).`);
  process.exit(1);
}
