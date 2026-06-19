// Shape contracts for the build-time generated caches written by
// scripts/fetch-stars.mjs and scripts/sync-profile-feed.mjs (src/data/_*.json).
// Consumers (index.astro, projects/[slug].astro, rss.xml.ts, releases.xml.ts,
// summarize-generated-data) can reference these so a producer field rename is a
// type error, not a silent undefined at runtime. The JSON files are gitignored;
// these types document the agreed shape regardless of whether a cache is present.

export interface GeneratedStats {
  totalRepos: number;
  totalStars: number;
  lastPushedAt: string | null;
  lastPushedRepo: string | null;
  streak: number;
  latestRelease: { repo: string; tag: string | null; at: string } | null;
  avatarUrl: string | null;
  pushDays: string[];
  fetchedAt: string | null;
}

export interface GeneratedRepoMeta {
  stars: number;
  createdAt: string;
  pushedAt: string;
  updatedAt: string;
  language: string | null;
  licenseSpdx: string | null;
}

export interface GeneratedRelease {
  repo: string;
  tag: string;
  name: string;
  publishedAt: string;
  url: string;
  downloads?: number;
  bodyFirst: string;
  provenance?: 'no-assets' | 'unsigned' | 'checksum' | 'attested';
}

export interface GeneratedProfileProject {
  repo: string;
  title: string;
  category: string;
  description: string;
  repoUrl: string;
  includeInPortfolio?: boolean;
  suppressed?: boolean;
  [key: string]: unknown;
}

export interface GeneratedProfileFeedCache {
  schema: string | null;
  generatedAt: string | null;
  source: string | null;
  feedSourceUrl: string;
  cachedAt: string;
  publicRepoCount: number | null;
  projectCount: number;
  suppressedCount: number | null;
  projects: GeneratedProfileProject[];
  suppressed?: GeneratedProfileProject[];
}

export interface GeneratedReadmeRefresh {
  schema: string;
  generatedAt: string;
  source: string;
  tokenPresent: boolean;
  totalPublicRepos: number;
  attempted: number;
  refreshed: number;
  reused: number;
  misses: number;
  preserved: number;
  unattempted: number;
  missing: number;
  rateLimited: boolean;
  failureSamples: string[];
  skippedReason: string | null;
  cacheEntries: number;
  trimmed: number;
}

/** _stars.json — repo slug → star count */
export type GeneratedStars = Record<string, number>;
/** _meta.json — repo slug → metadata */
export type GeneratedMeta = Record<string, GeneratedRepoMeta>;
/** _readmes.json — repo slug → raw README markdown */
export type GeneratedReadmes = Record<string, string>;
/** _readme-refresh.json — README refresh quality telemetry */
export type GeneratedReadmeRefreshSummary = GeneratedReadmeRefresh;
/** _releases.json — most recent releases across the archive */
export type GeneratedReleases = GeneratedRelease[];
/** _profile-projects.json — public profile feed cache for rendered portfolio rows */
export type GeneratedProfileFeed = GeneratedProfileFeedCache;
