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

/** `src/data/_catalog-drift.json`, written by `npm run catalog:audit`. */
type TrustCatalogDrift = {
  generatedAt?: NullableDate;
  complete?: boolean | null;
  uncataloged?: string[] | null;
  staleRefs?: string[] | null;
};

export const RELEASE_PROVENANCE_LEVELS = ['no-assets', 'unsigned', 'checksum', 'attested'] as const;

/**
 * The highest tier a release from this workspace can actually reach.
 *
 * `attested` needs a Sigstore bundle, and GitHub only issues those from a
 * workflow (`actions/attest-build-provenance`). This project builds and
 * publishes locally by policy, so that tier is out of reach by construction, not
 * because releases are neglected. Saying so keeps a permanent 0 from reading as
 * a failure — and stops it being quietly "fixed" by classifying a release note
 * that merely mentions attestation, which is how RcloneBrowserNG v2.0.2 came to
 * be reported as attested while its own notes said it had no attestations.
 */
export const RELEASE_PROVENANCE_CEILING = 'checksum' satisfies ReleaseProvenanceLevel;
export const RELEASE_PROVENANCE_CEILING_REASON =
  'Attested needs a Sigstore bundle from actions/attest-build-provenance; releases here are built and published locally, so checksum is the reachable ceiling.';

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
  catalogCompleteness: {
    measured: boolean;
    complete: boolean | null;
    checkedAt: string | null;
    uncataloged: string[];
    staleRefs: string[];
  };
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
  catalogDrift?: TrustCatalogDrift | null;
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
  // Clamp at 1: the generated caches can hold more repos than the rendered
  // catalog (private/archived repos still get fetched), and "102.3% coverage"
  // on /status/ and /status.json reads as a broken metric rather than as
  // complete data. The raw entry count is surfaced alongside the percentage.
  return total && total > 0 ? roundMetric(Math.min(entries / total, 1)) : null;
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

export type CatalogCompleteness = {
  measured: boolean;
  complete: boolean | null;
  checkedAt: string | null;
  uncataloged: string[];
  staleRefs: string[];
  /** A record exists but is older than the freshness window. */
  staleRecord: boolean;
};

/**
 * Decide what a catalog drift record is allowed to claim.
 *
 * Every surface that states the archive is complete has to agree on this, so the
 * rule lives here rather than being re-derived per page. Two things it must never
 * do: report `complete` from a record that is merely present (`catalog:audit`
 * runs in `deploy:preflight`, not in `npm run build`, and `deploy:vps` builds
 * again on its own, so a leftover file from an unrelated run is exactly what a
 * plain build reads), and throw on a malformed record (this runs while Astro
 * renders, so a TypeError fails the whole build instead of degrading).
 */
export function buildCatalogCompleteness(
  drift: TrustCatalogDrift | null | undefined,
  options: { now?: Date; maxAgeHours?: number } = {},
): CatalogCompleteness {
  const now = options.now ?? new Date();
  const maxAgeHours = options.maxAgeHours ?? GENERATED_DATA_MAX_AGE_HOURS;
  const checkedAt = isoOrNull(drift?.generatedAt);
  const age = ageHours(drift?.generatedAt, now);
  const fresh = age != null && age <= maxAgeHours;
  const hasVerdict = drift?.complete === true || drift?.complete === false;
  const measured = hasVerdict && fresh;
  const stringList = (value: unknown) =>
    Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0) : [];

  return {
    measured,
    complete: measured ? drift?.complete === true : null,
    checkedAt,
    uncataloged: measured ? stringList(drift?.uncataloged) : [],
    staleRefs: measured ? stringList(drift?.staleRefs) : [],
    staleRecord: hasVerdict && !fresh,
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
  // An absent drift record means the catalog was never checked for this build,
  // which is not the same as a complete catalog. Report it as unmeasured so the
  // page cannot imply a completeness it has no evidence for.
  const catalogCompleteness = buildCatalogCompleteness(input.catalogDrift, { now, maxAgeHours });
  const { measured: catalogMeasured, staleRecord: catalogStaleRecord } = catalogCompleteness;
  const catalogUncataloged = catalogCompleteness.uncataloged;
  const catalogStaleRefs = catalogCompleteness.staleRefs;
  const warnings: string[] = [];

  if (dataStale) warnings.push(`Generated GitHub data is stale or unavailable; refresh within ${maxAgeHours}h before deploy.`);
  if (!input.profileFeedInfo.active) warnings.push('Profile feed is in fallback mode.');
  if (profileStale) warnings.push(`Profile feed cache is stale or unavailable; refresh within ${maxAgeHours}h before deploy.`);
  if (!fixtureMode && readmeRefresh?.tokenPresent !== true) warnings.push('README refresh telemetry is not token-backed.');
  if (!fixtureMode && readmeRefresh?.rateLimited) warnings.push('README refresh telemetry reports GitHub rate limiting.');
  if (!fixtureMode && coverageBelowThreshold(starsCoverage)) warnings.push('Star cache coverage is below 80% of profile-feed projects.');
  if (!fixtureMode && coverageBelowThreshold(metadataCoverage)) warnings.push('Metadata cache coverage is below 80% of profile-feed projects.');
  if (!fixtureMode && coverageBelowThreshold(readmesCoverage)) warnings.push('README cache coverage is below 80% of profile-feed projects.');
  if (!fixtureMode && !catalogMeasured) {
    warnings.push(
      catalogStaleRecord
        ? `Catalog completeness was last measured over ${maxAgeHours}h ago; re-run npm run catalog:audit.`
        : 'Catalog completeness was not measured for this build; run npm run catalog:audit.',
    );
  }
  if (catalogUncataloged.length > 0) {
    warnings.push(
      `Catalog is incomplete: ${catalogUncataloged.length} public repo(s) are not cataloged (${catalogUncataloged.join(', ')}).`,
    );
  }
  if (catalogStaleRefs.length > 0) {
    warnings.push(`Catalog references ${catalogStaleRefs.length} repo(s) that are no longer active and public (${catalogStaleRefs.join(', ')}).`);
  }

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
    catalogCompleteness: {
      measured: catalogCompleteness.measured,
      complete: catalogCompleteness.complete,
      checkedAt: catalogCompleteness.checkedAt,
      uncataloged: catalogUncataloged,
      staleRefs: catalogStaleRefs,
    },
    warnings,
  };
}
