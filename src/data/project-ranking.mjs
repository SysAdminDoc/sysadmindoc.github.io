const DAY_MS = 24 * 60 * 60 * 1000;

export const PROJECT_RANKING_HALF_LIFE_DAYS = 180;
export const PROJECT_RANKING_WEIGHTS = Object.freeze({
  stars: 0.45,
  recency: 0.35,
  release: 0.2,
});

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function getRecordValue(source, key) {
  if (!source || !key) return undefined;
  if (source instanceof Map) return source.get(key);
  return source[key];
}

function getRepoMeta(meta, repo) {
  const value = getRecordValue(meta, repo);
  return value && typeof value === 'object' ? value : {};
}

function toTime(value) {
  if (value == null) return null;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function logScore(value, max) {
  if (max <= 0 || value <= 0) return 0;
  return Math.min(1, Math.log1p(value) / Math.log1p(max));
}

function recencyScore(days, halfLifeDays) {
  if (days == null) return 0;
  return Math.pow(0.5, days / Math.max(1, halfLifeDays));
}

function releaseActivityScore(downloads, maxDownloads, hasDownload) {
  const downloadScore = logScore(downloads, maxDownloads);
  return Math.max(downloadScore, hasDownload ? 0.25 : 0);
}

function compareRows(a, b) {
  const scoreDelta = b.score - a.score;
  if (Math.abs(scoreDelta) > 0.0001) return scoreDelta;
  if (b.stars !== a.stars) return b.stars - a.stars;
  if ((a.daysSinceUpdate ?? Infinity) !== (b.daysSinceUpdate ?? Infinity)) {
    return (a.daysSinceUpdate ?? Infinity) - (b.daysSinceUpdate ?? Infinity);
  }
  if (b.releaseDownloads !== a.releaseDownloads) return b.releaseDownloads - a.releaseDownloads;
  if (a.sourceIndex !== b.sourceIndex) return a.sourceIndex - b.sourceIndex;
  return String(a.name || a.repo).localeCompare(String(b.name || b.repo));
}

export function getReleaseDownloadTotals(releases = []) {
  const totals = new Map();
  if (!Array.isArray(releases)) return totals;
  for (const release of releases) {
    const repo = String(release?.repo ?? '').trim();
    if (!repo) continue;
    const downloads = numberOrZero(release?.downloads);
    totals.set(repo, (totals.get(repo) ?? 0) + downloads);
  }
  return totals;
}

export function computeProjectRankings(entries = [], options = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const releaseDownloadTotals = options.releaseDownloadTotals ?? getReleaseDownloadTotals(options.releases);
  const referenceTime = toTime(options.referenceDate) ?? Date.now();
  const halfLifeDays = numberOrZero(options.halfLifeDays) || PROJECT_RANKING_HALF_LIFE_DAYS;
  const weights = { ...PROJECT_RANKING_WEIGHTS, ...(options.weights ?? {}) };

  const rows = list.map((entry, sourceIndex) => {
    const repo = String(entry?.repo ?? '');
    const meta = getRepoMeta(options.meta, repo);
    const stars = numberOrZero(getRecordValue(options.stars, repo) ?? meta.stars ?? entry?.stars);
    const updatedAt = entry?.updatedAt ?? entry?.pushedAt ?? meta.updatedAt ?? meta.pushedAt ?? null;
    const updatedTime = toTime(updatedAt);
    const daysSinceUpdate =
      updatedTime == null ? null : Math.max(0, Math.floor((referenceTime - updatedTime) / DAY_MS));
    const releaseDownloads = numberOrZero(getRecordValue(releaseDownloadTotals, repo));
    const hasDownload = Boolean(entry?.hasDownload || releaseDownloads > 0);

    return {
      repo,
      name: entry?.name ?? repo,
      sourceIndex,
      stars,
      updatedAt,
      daysSinceUpdate,
      releaseDownloads,
      hasDownload,
      rank: 0,
      score: 0,
      scoreParts: {
        stars: 0,
        recency: 0,
        release: 0,
      },
    };
  });

  const maxStars = Math.max(1, ...rows.map((row) => row.stars));
  const maxDownloads = Math.max(0, ...rows.map((row) => row.releaseDownloads));

  for (const row of rows) {
    row.scoreParts = {
      stars: logScore(row.stars, maxStars),
      recency: recencyScore(row.daysSinceUpdate, halfLifeDays),
      release: releaseActivityScore(row.releaseDownloads, maxDownloads, row.hasDownload),
    };
    row.score =
      100 *
      ((row.scoreParts.stars * weights.stars) +
        (row.scoreParts.recency * weights.recency) +
        (row.scoreParts.release * weights.release));
  }

  const sorted = [...rows].sort(compareRows);
  sorted.forEach((row, index) => {
    row.rank = index + 1;
  });

  return new Map(sorted.map((row) => [row.repo, Object.freeze(row)]));
}

export function rankCatalogEntries(entries = [], rankingMap) {
  const list = Array.isArray(entries) ? entries : [];
  return [...list].sort((a, b) => compareProjectRankingRecords(rankingMap?.get(a.repo), rankingMap?.get(b.repo), a, b));
}

export function compareProjectRankingRecords(a, b, aEntry = {}, bEntry = {}) {
  const aRank = a?.rank ?? Number.MAX_SAFE_INTEGER;
  const bRank = b?.rank ?? Number.MAX_SAFE_INTEGER;
  if (aRank !== bRank) return aRank - bRank;
  return String(aEntry.name ?? aEntry.repo ?? '').localeCompare(String(bEntry.name ?? bEntry.repo ?? ''));
}

export function formatProjectRankingLabel(ranking) {
  if (!ranking) return '';
  const parts = [];
  if (ranking.stars > 0) parts.push(`${ranking.stars} stars`);
  if (ranking.daysSinceUpdate != null) {
    if (ranking.daysSinceUpdate === 0) parts.push('updated today');
    else if (ranking.daysSinceUpdate < 30) parts.push(`updated ${ranking.daysSinceUpdate}d ago`);
    else if (ranking.daysSinceUpdate < 365) parts.push(`updated ${Math.floor(ranking.daysSinceUpdate / 30)}mo ago`);
    else parts.push(`updated ${Math.floor(ranking.daysSinceUpdate / 365)}y ago`);
  }
  if (ranking.releaseDownloads > 0) parts.push(`${ranking.releaseDownloads} release downloads`);
  else if (ranking.hasDownload) parts.push('downloadable release');
  return `Rank ${ranking.rank}: ${parts.join(', ') || 'baseline catalog signal'}`;
}

export function formatProjectRankingDisplayLabel(ranking) {
  if (!ranking) return '';
  const detail = formatProjectRankingLabel(ranking).replace(/^Rank\s+\d+:\s*/, '');
  return `Recommended #${ranking.rank}: ${detail || 'baseline catalog signal'}`;
}
