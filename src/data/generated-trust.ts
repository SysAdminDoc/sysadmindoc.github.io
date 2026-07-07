export const GENERATED_DATA_MAX_AGE_HOURS = 36;
export const GENERATED_DATA_COVERAGE_THRESHOLD = 0.8;

type NullableDate = string | null | undefined;

type TrustStats = {
  fetchedAt?: NullableDate;
  totalRepos?: number | null;
  totalStars?: number | null;
};

type TrustProfileFeedInfo = {
  active?: boolean;
  source?: string | null;
  projectCount?: number | null;
  cachedAt?: NullableDate;
};

type TrustReadmeRefresh = {
  generatedAt?: NullableDate;
  source?: string | null;
  tokenPresent?: boolean | null;
  totalPublicRepos?: number | null;
  attempted?: number | null;
  misses?: number | null;
  cacheEntries?: number | null;
  rateLimited?: boolean | null;
  skippedReason?: string | null;
};

type TrustRelease = {
  provenance?: string | null;
};

export const RELEASE_PROVENANCE_LEVELS = ['no-assets', 'unsigned', 'checksum', 'attested'] as const;

export type ReleaseProvenanceLevel = (typeof RELEASE_PROVENANCE_LEVELS)[number];

export type ReleaseProvenanceDistribution = Record<ReleaseProvenanceLevel | 'unknown', number> & {
  total: number;
  trusted: number;
};

export type GeneratedDataTrust = {
  status: 'fresh' | 'attention-required';
  mode: 'fixture' | 'unauthenticated-partial' | 'production-fresh' | 'production-attention';
  maxAgeHours: number;
  fetchedAt: string | null;
  ageHours: number | null;
  stale: boolean;
  totalRepos: number | null;
  totalStars: number | null;
  readmeEntries: number;
  profileFeed: {
    active: boolean;
    source: string | null;
    projectCount: number | null;
    cachedAt: string | null;
    cachedAgeHours: number | null;
    stale: boolean;
  };
  coverage: {
    threshold: number;
    profileProjectCount: number | null;
    stars: number | null;
    metadata: number | null;
    readmes: number | null;
    releases: number | null;
    starEntries: number;
    metadataEntries: number;
    readmeEntries: number;
    releaseEntries: number;
  };
  readmeRefresh: {
    source: string | null;
    generatedAt: string | null;
    tokenPresent: boolean | null;
    targetRepos: number | null;
    attempted: number | null;
    cacheEntries: number | null;
    cacheCoverage: number | null;
    missRate: number | null;
    rateLimited: boolean | null;
    skippedReason: string | null;
  };
  releaseProvenance: ReleaseProvenanceDistribution;
  warnings: string[];
};

export type GeneratedDataTrustInput = {
  stats?: TrustStats | null;
  starEntries: number;
  metadataEntries: number;
  readmeEntries: number;
  releaseEntries: number;
  releases?: TrustRelease[] | null;
  profileFeedInfo: TrustProfileFeedInfo;
  readmeRefresh?: TrustReadmeRefresh | null;
  now?: Date;
  maxAgeHours?: number;
};

function isoOrNull(value: NullableDate) {
  const date = new Date(value ?? '');
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function ageHours(value: NullableDate, now: Date) {
  const date = new Date(value ?? '');
  if (Number.isNaN(date.getTime())) return null;
  return roundMetric((now.getTime() - date.getTime()) / 3_600_000);
}

function roundMetric(value: number | null | undefined, digits = 4) {
  return typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function finiteNumberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function coverage(entries: number, total: number | null) {
  return total && total > 0 ? roundMetric(entries / total) : null;
}

function coverageBelowThreshold(value: number | null) {
  return value != null && value < GENERATED_DATA_COVERAGE_THRESHOLD;
}

export function buildReleaseProvenanceDistribution(
  releases: TrustRelease[] | null | undefined,
  fallbackTotal = 0,
): ReleaseProvenanceDistribution {
  const counts = Object.fromEntries(RELEASE_PROVENANCE_LEVELS.map((level) => [level, 0])) as Record<
    ReleaseProvenanceLevel,
    number
  >;
  let unknown = 0;

  if (Array.isArray(releases)) {
    for (const release of releases) {
      const provenance = release?.provenance;
      if (RELEASE_PROVENANCE_LEVELS.includes(provenance as ReleaseProvenanceLevel)) {
        counts[provenance as ReleaseProvenanceLevel] += 1;
      } else {
        unknown += 1;
      }
    }
  } else if (fallbackTotal > 0) {
    unknown = fallbackTotal;
  }

  const total = Array.isArray(releases)
    ? RELEASE_PROVENANCE_LEVELS.reduce((sum, level) => sum + counts[level], unknown)
    : fallbackTotal;

  return {
    ...counts,
    unknown,
    total,
    trusted: counts.checksum + counts.attested,
  };
}

export function buildGeneratedDataTrust(input: GeneratedDataTrustInput): GeneratedDataTrust {
  const now = input.now ?? new Date();
  const maxAgeHours = input.maxAgeHours ?? GENERATED_DATA_MAX_AGE_HOURS;
  const stats = input.stats ?? {};
  const readmeRefresh = input.readmeRefresh ?? null;
  const profileProjectCount = finiteNumberOrNull(input.profileFeedInfo.projectCount);
  const dataAgeHours = ageHours(stats.fetchedAt, now);
  const profileAgeHours = ageHours(input.profileFeedInfo.cachedAt, now);
  const dataStale = dataAgeHours == null || dataAgeHours > maxAgeHours;
  const profileStale = profileAgeHours == null || profileAgeHours > maxAgeHours;
  const fixtureMode = input.profileFeedInfo.source === 'fixture' || readmeRefresh?.source === 'fixture';
  const starsCoverage = coverage(input.starEntries, profileProjectCount);
  const metadataCoverage = coverage(input.metadataEntries, profileProjectCount);
  const readmesCoverage = coverage(input.readmeEntries, profileProjectCount);
  const releasesCoverage = coverage(input.releaseEntries, profileProjectCount);
  const targetRepos = finiteNumberOrNull(readmeRefresh?.totalPublicRepos);
  const readmeRefreshCacheEntries = finiteNumberOrNull(readmeRefresh?.cacheEntries);
  const readmeRefreshMisses = finiteNumberOrNull(readmeRefresh?.misses);
  const readmeRefreshAttempted = finiteNumberOrNull(readmeRefresh?.attempted);
  const cacheCoverage = targetRepos && targetRepos > 0 ? roundMetric(input.readmeEntries / targetRepos) : null;
  const missRate =
    readmeRefreshAttempted && readmeRefreshAttempted > 0 && readmeRefreshMisses != null
      ? roundMetric(readmeRefreshMisses / readmeRefreshAttempted)
      : null;
  const releaseProvenance = buildReleaseProvenanceDistribution(input.releases, input.releaseEntries);
  const warnings: string[] = [];

  if (dataStale) warnings.push(`Generated GitHub data is stale or unavailable; refresh within ${maxAgeHours}h before deploy.`);
  if (!input.profileFeedInfo.active) warnings.push('Profile feed is in fallback mode.');
  if (profileStale) warnings.push(`Profile feed cache is stale or unavailable; refresh within ${maxAgeHours}h before deploy.`);
  if (!fixtureMode && readmeRefresh?.tokenPresent !== true) warnings.push('README refresh telemetry is not token-backed.');
  if (!fixtureMode && readmeRefresh?.rateLimited) warnings.push('README refresh telemetry reports GitHub rate limiting.');
  if (!fixtureMode && coverageBelowThreshold(starsCoverage)) warnings.push('Star cache coverage is below 80% of profile-feed projects.');
  if (!fixtureMode && coverageBelowThreshold(metadataCoverage)) warnings.push('Metadata cache coverage is below 80% of profile-feed projects.');
  if (!fixtureMode && coverageBelowThreshold(readmesCoverage)) warnings.push('README cache coverage is below 80% of profile-feed projects.');

  const status = warnings.length === 0 ? 'fresh' : 'attention-required';
  const mode = fixtureMode
    ? 'fixture'
    : readmeRefresh?.tokenPresent === false || readmeRefresh?.skippedReason === 'missing-token'
      ? 'unauthenticated-partial'
      : status === 'fresh'
        ? 'production-fresh'
        : 'production-attention';

  return {
    status,
    mode,
    maxAgeHours,
    fetchedAt: isoOrNull(stats.fetchedAt),
    ageHours: dataAgeHours,
    stale: dataStale,
    totalRepos: finiteNumberOrNull(stats.totalRepos),
    totalStars: finiteNumberOrNull(stats.totalStars),
    readmeEntries: input.readmeEntries,
    profileFeed: {
      active: Boolean(input.profileFeedInfo.active),
      source: input.profileFeedInfo.source ?? null,
      projectCount: profileProjectCount,
      cachedAt: isoOrNull(input.profileFeedInfo.cachedAt),
      cachedAgeHours: profileAgeHours,
      stale: profileStale,
    },
    coverage: {
      threshold: GENERATED_DATA_COVERAGE_THRESHOLD,
      profileProjectCount,
      stars: starsCoverage,
      metadata: metadataCoverage,
      readmes: readmesCoverage,
      releases: releasesCoverage,
      starEntries: input.starEntries,
      metadataEntries: input.metadataEntries,
      readmeEntries: input.readmeEntries,
      releaseEntries: input.releaseEntries,
    },
    readmeRefresh: {
      source: readmeRefresh?.source ?? null,
      generatedAt: isoOrNull(readmeRefresh?.generatedAt),
      tokenPresent: typeof readmeRefresh?.tokenPresent === 'boolean' ? readmeRefresh.tokenPresent : null,
      targetRepos,
      attempted: readmeRefreshAttempted,
      cacheEntries: readmeRefreshCacheEntries,
      cacheCoverage,
      missRate,
      rateLimited: typeof readmeRefresh?.rateLimited === 'boolean' ? readmeRefresh.rateLimited : null,
      skippedReason: readmeRefresh?.skippedReason ?? null,
    },
    releaseProvenance,
    warnings,
  };
}
