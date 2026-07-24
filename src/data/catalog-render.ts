// Shared catalog rendering data — computed once at build time and consumed by
// both the homepage preview catalog (`index.astro`) and the full static catalog
// route (`catalog.astro`). Centralizing this keeps the two surfaces from
// drifting: the homepage renders a ranked top-N slice, the /catalog/ page renders
// the complete ranked list, and both derive ranking, freshness, and view-state
// from the same inputs.
import { catalog } from './portfolio';
import type { CatalogEntry } from './types';
import {
  computeProjectRankings,
  formatProjectRankingDisplayLabel,
  formatProjectRankingLabel,
  getReleaseDownloadTotals,
  rankCatalogEntries,
} from './project-ranking.mjs';
import { computeCatalogViewState } from './catalog-views.mjs';

type MetaRecord = Record<string, { stars: number; pushedAt: string; updatedAt: string; language: string | null }>;
type ReleaseRecord = { repo: string; tag: string; name: string; publishedAt: string; url: string; downloads?: number; bodyFirst: string };

let stars: Record<string, number> = {};
let meta: MetaRecord = {};
let stats: { fetchedAt: string | null; lastPushedAt: string | null } = { fetchedAt: null, lastPushedAt: null };
let releases: ReleaseRecord[] = [];
try {
  const mod = await import('./_stars.json');
  stars = (mod.default ?? mod) as Record<string, number>;
} catch {}
try {
  const mod = await import('./_meta.json');
  meta = (mod.default ?? mod) as MetaRecord;
} catch {}
try {
  const mod = await import('./_stats.json');
  stats = { ...stats, ...(mod.default ?? mod) };
} catch {}
try {
  const mod = await import('./_releases.json');
  releases = (mod.default ?? mod) as ReleaseRecord[];
} catch {}

const referenceDate = stats.fetchedAt ?? stats.lastPushedAt ?? Date.now();
const freshnessReference = new Date(referenceDate).getTime();
const releaseDownloadTotals = getReleaseDownloadTotals(releases);
const releaseDownloadRepos = new Set(
  [...releaseDownloadTotals.entries()].filter(([, downloads]) => downloads > 0).map(([repo]) => repo),
);

export const projectRankings = computeProjectRankings(catalog, {
  stars,
  meta,
  releaseDownloadTotals,
  referenceDate,
});
export const rankedCatalog: CatalogEntry[] = rankCatalogEntries(catalog, projectRankings);
export const catalogViewState = computeCatalogViewState(catalog, {
  meta,
  releaseDownloadRepos,
  referenceMs: freshnessReference,
});
export const catalogStars = stars;
export const catalogMeta = meta;
export const catalogTotal = catalog.length;

export { formatProjectRankingDisplayLabel, formatProjectRankingLabel };

// Category filter buttons shared by the catalog surfaces and the homepage hero
// signal strip. Keep in sync with the `data-f` categories in CLAUDE.md.
export const filterButtons = [
  { key: 'ps', label: 'PowerShell' },
  { key: 'py', label: 'Python' },
  { key: 'web', label: 'Web Apps' },
  { key: 'ext', label: 'Extensions' },
  { key: 'kt', label: 'Android' },
  { key: 'sec', label: 'Security' },
  { key: 'media', label: 'Media' },
  { key: 'cs', label: 'Desktop' },
  { key: 'cpp', label: 'C++' },
  { key: 'guide', label: 'Guides' },
] as const;

export const filterLabelByKey: Record<string, string> = Object.fromEntries(
  filterButtons.map((button) => [button.key, button.label]),
);

// How many ranked projects the homepage preview renders before delegating the
// full, filterable list to /catalog/. Kept comfortably below the homepage
// catalog DOM-node budget (see scripts/audit-dom-size.mjs).
export const HOMEPAGE_CATALOG_LIMIT = 84;
