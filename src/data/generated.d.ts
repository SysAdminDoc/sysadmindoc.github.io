// Shape contracts for the build-time generated caches written by
// scripts/fetch-stars.mjs (src/data/_*.json). Consumers (index.astro,
// projects/[slug].astro, rss.xml.ts, releases.xml.ts, summarize-generated-data)
// can reference these so a producer field rename is a type error, not a silent
// undefined at runtime. The JSON files are gitignored; these types document the
// agreed shape regardless of whether a cache is present.

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
  pushedAt: string;
  updatedAt: string;
  language: string | null;
}

export interface GeneratedRelease {
  repo: string;
  tag: string;
  name: string;
  publishedAt: string;
  url: string;
  downloads?: number;
  bodyFirst: string;
}

/** _stars.json — repo slug → star count */
export type GeneratedStars = Record<string, number>;
/** _meta.json — repo slug → metadata */
export type GeneratedMeta = Record<string, GeneratedRepoMeta>;
/** _readmes.json — repo slug → raw README markdown */
export type GeneratedReadmes = Record<string, string>;
/** _releases.json — most recent releases across the archive */
export type GeneratedReleases = GeneratedRelease[];
