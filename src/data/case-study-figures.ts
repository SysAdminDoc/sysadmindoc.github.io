// Build-time figures for the case studies: GitHub stars, release downloads and
// the latest release, read from the same generated caches that feed /data/
// and /releases/. The caches are gitignored and refreshed by `fetch-stars`, so
// every figure on /work/ carries the same fetch time the rest of the site does.
//
// `_releases.json` holds the most recent releases across the archive, not a
// lifetime history, so a download total here covers the releases listed on
// /releases/ and the page says so.
import type { CaseStudy } from './case-studies';

type ReleaseRecord = {
  repo: string;
  tag: string;
  name: string;
  publishedAt: string;
  url: string;
  downloads?: number;
  bodyFirst?: string;
};
type StatsRecord = { fetchedAt?: string | null; totalStars?: number; totalRepos?: number };

let stars: Record<string, number> = {};
let releases: ReleaseRecord[] = [];
let stats: StatsRecord = {};
try {
  const mod = await import('./_stars.json');
  stars = (mod.default ?? mod) as Record<string, number>;
} catch {}
try {
  const mod = await import('./_releases.json');
  releases = (mod.default ?? mod) as ReleaseRecord[];
} catch {}
try {
  const mod = await import('./_stats.json');
  stats = (mod.default ?? mod) as StatsRecord;
} catch {}

export interface CaseStudyLatestRelease {
  repo: string;
  tag: string;
  publishedAt: string;
  url: string;
}

export interface CaseStudyFigures {
  stars: number;
  downloads: number;
  releaseCount: number;
  latest: CaseStudyLatestRelease | null;
  /** Patch count parsed from the newest release note of the first repo, when it states one. */
  patches: number | null;
}

const byDateDesc = (a: ReleaseRecord, b: ReleaseRecord) =>
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

export function caseStudyFigures(study: CaseStudy): CaseStudyFigures {
  const repoSet = new Set(study.repos);
  const own = releases.filter((release) => repoSet.has(release.repo)).sort(byDateDesc);
  const newest = own[0];
  const primaryNewest = own.find((release) => release.repo === study.repos[0]);
  const patchMatch = primaryNewest?.bodyFirst?.match(/\bhas (\d+) patches\b/i);
  return {
    stars: study.repos.reduce((sum, repo) => sum + (stars[repo] ?? 0), 0),
    downloads: own.reduce((sum, release) => sum + (release.downloads ?? 0), 0),
    releaseCount: own.length,
    latest: newest
      ? { repo: newest.repo, tag: newest.tag, publishedAt: newest.publishedAt, url: newest.url }
      : null,
    patches: patchMatch ? Number(patchMatch[1]) : null,
  };
}

/** Site-wide totals for the hero card, from the same caches. */
export const publicWorkTotals = {
  stars: stats.totalStars ?? Object.values(stars).reduce((sum, value) => sum + value, 0),
  downloads: releases.reduce((sum, release) => sum + (release.downloads ?? 0), 0),
  releasesIndexed: releases.length,
  reposWithReleases: new Set(releases.map((release) => release.repo)).size,
};

export const dataFetchedAt: string | null = stats.fetchedAt ?? null;

const numberFormat = new Intl.NumberFormat('en-US');
export const formatFigure = (value: number) => numberFormat.format(value);

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
export const formatFigureDate = (iso: string) => dateFormat.format(new Date(iso));
