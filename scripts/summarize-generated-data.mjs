import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  PROJECT_RANKING_HALF_LIFE_DAYS,
  PROJECT_RANKING_WEIGHTS,
  computeProjectRankings,
} from '../src/data/project-ranking.mjs';

const root = process.cwd();
const dataDir = path.join(root, 'src', 'data');

const options = {
  outDir: process.env.DATA_REFRESH_SUMMARY_DIR || 'data-refresh-summary',
  maxAgeHours: 36,
  failOnStale: false,
  rankingLimit: 12,
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
  } else if (arg.startsWith('--ranking-limit=')) {
    options.rankingLimit = Number(arg.split('=')[1]);
  } else if (arg === '--ranking-limit') {
    index += 1;
    options.rankingLimit = Number(process.argv[index]);
  } else {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

if (!Number.isFinite(options.maxAgeHours) || options.maxAgeHours <= 0) {
  throw new Error('--max-age-hours must be a positive number.');
}

if (!Number.isInteger(options.rankingLimit) || options.rankingLimit <= 0) {
  throw new Error('--ranking-limit must be a positive integer.');
}

async function readJson(fileName) {
  const filePath = path.join(dataDir, fileName);
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${path.relative(root, filePath)}: ${error.message}`);
  }
}

async function readJsonOptional(fileName) {
  const filePath = path.join(dataDir, fileName);
  try {
    return {
      value: JSON.parse(await fs.readFile(filePath, 'utf8')),
      error: null,
    };
  } catch (error) {
    return {
      value: null,
      error: `Unable to read ${path.relative(root, filePath)}: ${error.message}`,
    };
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

function roundMetric(value, digits = 2) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function formatMetric(value, digits = 2) {
  const rounded = roundMetric(value, digits);
  return rounded == null ? 'unknown' : String(rounded);
}

function normalizeRankingProject(project) {
  const repo = String(project?.repo ?? '').trim();
  const title = String(project?.title ?? project?.name ?? repo).trim();
  return {
    ...project,
    repo,
    name: title || repo,
    updatedAt: project?.updatedAt ?? project?.pushedAt ?? null,
    stars: Number.isFinite(Number(project?.stars)) ? Number(project.stars) : undefined,
    hasDownload: Boolean(project?.hasDownload || project?.downloadUrl || project?.primaryAction?.kind === 'release'),
  };
}

const [stars, stats, meta, releases, readmes] = await Promise.all([
  readJson('_stars.json'),
  readJson('_stats.json'),
  readJson('_meta.json'),
  readJson('_releases.json'),
  readJson('_readmes.json'),
]);
const profileFeedResult = await readJsonOptional('_profile-projects.json');
const profileFeed = profileFeedResult.value;

const starEntries = Object.keys(stars).length;
const metaEntries = Object.keys(meta).length;
const readmeEntries = Object.keys(readmes).length;
const releaseEntries = Array.isArray(releases) ? releases.length : 0;
const fetchedAgeHours = ageHours(stats.fetchedAt);
const fresh = fetchedAgeHours <= options.maxAgeHours;
const profileProjects = Array.isArray(profileFeed?.projects) ? profileFeed.projects : [];
const profileProjectCount = Number.isFinite(profileFeed?.projectCount)
  ? profileFeed.projectCount
  : profileProjects.length;
const profileCachedAgeHours = ageHours(profileFeed?.cachedAt);
const profileCacheFresh = profileCachedAgeHours <= options.maxAgeHours;
const profileSource = typeof profileFeed?.source === 'string' ? profileFeed.source : null;
const profileFeedStatus = !profileFeed
  ? 'missing'
  : profileProjects.length === 0 || profileSource?.startsWith('local fallback:')
    ? 'fallback'
    : 'active';
const rankingEntries = profileProjects.map(normalizeRankingProject).filter((project) => project.repo);
const rankingMap = computeProjectRankings(rankingEntries, {
  stars,
  meta,
  releases,
  halfLifeDays: PROJECT_RANKING_HALF_LIFE_DAYS,
});
const rankingRows = [...rankingMap.values()].sort((a, b) => a.rank - b.rank);
const rankingRanks = new Set(rankingRows.map((row) => row.rank));
const rankingWeightValues = Object.values(PROJECT_RANKING_WEIGHTS);
const rankingWeightTotal = rankingWeightValues.reduce((sum, value) => sum + value, 0);
const rankingWeightsValid = rankingWeightValues.every((value) => Number.isFinite(value) && value >= 0);
const rankingScoresFinite = rankingRows.every(
  (row) =>
    Number.isFinite(row.score) &&
    Number.isFinite(row.rank) &&
    Object.values(row.scoreParts ?? {}).every((value) => Number.isFinite(value)),
);
const rankingRanksContiguous =
  rankingRows.length > 0 &&
  rankingRanks.size === rankingRows.length &&
  rankingRows.every((row, index) => row.rank === index + 1);
const rankingIdentityUsable = rankingRows.every(
  (row) => typeof row.repo === 'string' && row.repo.trim() && typeof row.name === 'string' && row.name.trim(),
);
const rankingTopRows = rankingRows.slice(0, options.rankingLimit).map((row) => ({
  rank: row.rank,
  repo: row.repo,
  name: row.name,
  score: roundMetric(row.score, 4),
  scoreParts: {
    stars: roundMetric(row.scoreParts.stars, 4),
    recency: roundMetric(row.scoreParts.recency, 4),
    release: roundMetric(row.scoreParts.release, 4),
  },
  stars: row.stars,
  daysSinceUpdate: row.daysSinceUpdate,
  releaseDownloads: row.releaseDownloads,
  updatedAt: row.updatedAt ?? null,
  hasDownload: row.hasDownload,
}));

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
  {
    label: 'profile feed cache exists',
    ok: Boolean(profileFeed),
  },
  {
    label: 'profile feed cache is active',
    ok: profileFeedStatus === 'active',
  },
  {
    label: 'profile feed has portfolio projects',
    ok: profileProjects.length > 0,
  },
  {
    label: 'profile feed projectCount matches projects length',
    ok: Number.isFinite(profileFeed?.projectCount) && profileFeed.projectCount === profileProjects.length,
  },
  {
    label: 'profile feed source URL is set',
    ok: typeof profileFeed?.feedSourceUrl === 'string' && profileFeed.feedSourceUrl.length > 0,
  },
  {
    label: `profile feed cache age <= ${options.maxAgeHours}h`,
    ok: profileCacheFresh,
  },
  {
    label: 'ranking weights are normalized',
    ok: rankingWeightsValid && Math.abs(rankingWeightTotal - 1) < 0.0001,
  },
  {
    label: 'ranking report has portfolio rows',
    ok: rankingRows.length > 0 && rankingRows.length === rankingEntries.length,
  },
  {
    label: 'ranking records have usable names and repos',
    ok: rankingRows.length > 0 && rankingIdentityUsable,
  },
  {
    label: 'ranking scores and score parts are finite',
    ok: rankingRows.length > 0 && rankingScoresFinite,
  },
  {
    label: 'ranking ranks are unique and contiguous',
    ok: rankingRanksContiguous,
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
  profileFeed: {
    status: profileFeedStatus,
    error: profileFeedResult.error,
    schema: profileFeed?.schema ?? null,
    source: profileSource,
    feedSourceUrl: profileFeed?.feedSourceUrl ?? null,
    generatedAt: isoOrUnknown(profileFeed?.generatedAt),
    cachedAt: isoOrUnknown(profileFeed?.cachedAt),
    cachedAgeHours: Number.isFinite(profileCachedAgeHours) ? Number(profileCachedAgeHours.toFixed(2)) : null,
    publicRepoCount: profileFeed?.publicRepoCount ?? null,
    projectCount: profileProjectCount,
    projectsLength: profileProjects.length,
    suppressedCount: profileFeed?.suppressedCount ?? null,
  },
  ranking: {
    weightTotal: roundMetric(rankingWeightTotal, 4),
    weights: PROJECT_RANKING_WEIGHTS,
    halfLifeDays: PROJECT_RANKING_HALF_LIFE_DAYS,
    projectCount: rankingRows.length,
    topLimit: options.rankingLimit,
    top: rankingTopRows,
  },
  checks,
};

function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

const latestRelease = stats.latestRelease
  ? `${stats.latestRelease.repo ?? 'unknown'} ${stats.latestRelease.tag ?? 'untagged'} at ${isoOrUnknown(stats.latestRelease.at)}`
  : 'none';
const rankingLines = summary.ranking.top.length > 0
  ? summary.ranking.top.map(
      (row) =>
        `- #${row.rank} ${row.repo} (${row.name}) -- score ${formatMetric(row.score, 4)}; ` +
        `scoreParts stars=${formatMetric(row.scoreParts.stars, 4)}, ` +
        `recency=${formatMetric(row.scoreParts.recency, 4)}, ` +
        `release=${formatMetric(row.scoreParts.release, 4)}; ` +
        `stars=${row.stars}; daysSinceUpdate=${row.daysSinceUpdate ?? 'unknown'}; ` +
        `releaseDownloads=${row.releaseDownloads}`,
    )
  : ['- No ranking rows generated.'];

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
  '## Profile Feed',
  '',
  `- Status: ${summary.profileFeed.status}`,
  `- Source: ${summary.profileFeed.source ?? 'unknown'}`,
  `- Source URL: ${summary.profileFeed.feedSourceUrl ?? 'unknown'}`,
  `- Source generated: ${summary.profileFeed.generatedAt}`,
  `- Cache refreshed: ${summary.profileFeed.cachedAt}`,
  `- Cache age: ${summary.profileFeed.cachedAgeHours ?? 'unknown'} hours (limit ${options.maxAgeHours})`,
  `- Public repos upstream: ${summary.profileFeed.publicRepoCount ?? 'unknown'}`,
  `- Portfolio projects cached: ${summary.profileFeed.projectCount}`,
  `- Suppressed upstream rows: ${summary.profileFeed.suppressedCount ?? 'unknown'}`,
  ...(summary.profileFeed.error ? [`- Cache error: ${summary.profileFeed.error}`] : []),
  '',
  '## Recommended Ranking',
  '',
  `- Weight total: ${formatMetric(summary.ranking.weightTotal, 4)}`,
  `- Weights: stars=${formatMetric(summary.ranking.weights.stars, 4)}, recency=${formatMetric(summary.ranking.weights.recency, 4)}, release=${formatMetric(summary.ranking.weights.release, 4)}`,
  `- Recency half-life: ${summary.ranking.halfLifeDays} days`,
  `- Ranked projects: ${summary.ranking.projectCount}`,
  `- Top rows shown: ${summary.ranking.top.length}`,
  '',
  ...rankingLines,
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
