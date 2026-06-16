/**
 * Catalog view-state computation for the homepage catalog section.
 *
 * Determines per-entry flags (isNew / isRecent / hasDownload) and
 * the aggregate view-button counts without touching Astro or the DOM.
 *
 * All exports are pure functions — no side effects, no Astro imports.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Return the number of whole days between `iso` and `referenceMs`,
 * or null if either value is missing / invalid.
 *
 * @param {string | null | undefined} iso
 * @param {number} referenceMs
 * @returns {number | null}
 */
export function ageDaysFromReference(iso, referenceMs) {
  if (!iso) return null;
  const value = new Date(iso).getTime();
  if (!Number.isFinite(value) || !Number.isFinite(referenceMs)) return null;
  return Math.max(0, Math.floor((referenceMs - value) / DAY_MS));
}

/**
 * Compute per-entry view-state flags for every catalog entry.
 *
 * @param {Array<{repo: string, updatedAt?: string|null, pushedAt?: string|null, hasDownload?: boolean}>} catalog
 * @param {{
 *   meta?: Record<string,{updatedAt?: string; pushedAt?: string}>,
 *   releaseDownloadRepos?: Set<string>,
 *   referenceMs: number,
 * }} options
 * @returns {Map<string, {isNew: boolean, isRecent: boolean, hasDownload: boolean}>}
 */
export function computeCatalogViewState(catalog, options) {
  const { meta = {}, releaseDownloadRepos = new Set(), referenceMs } = options;
  return new Map(
    (Array.isArray(catalog) ? catalog : []).map((entry) => {
      const updatedAt =
        entry.updatedAt ??
        entry.pushedAt ??
        meta[entry.repo]?.updatedAt ??
        meta[entry.repo]?.pushedAt;
      const days = ageDaysFromReference(updatedAt, referenceMs);
      return [
        entry.repo,
        {
          isNew: days !== null && days <= 30,
          isRecent: days !== null && days <= 90,
          hasDownload: Boolean(entry.hasDownload || releaseDownloadRepos.has(entry.repo)),
        },
      ];
    }),
  );
}

/**
 * Count how many entries match each view-filter.
 *
 * @param {Map<string, {isNew: boolean, isRecent: boolean, hasDownload: boolean}>} viewStateMap
 * @returns {{ all: number, new: number, recent: number, download: number }}
 */
export function computeViewCounts(viewStateMap) {
  const values = [...viewStateMap.values()];
  return {
    all: viewStateMap.size,
    new: values.filter((s) => s.isNew).length,
    recent: values.filter((s) => s.isRecent).length,
    download: values.filter((s) => s.hasDownload).length,
  };
}

/**
 * Derive per-category counts from a catalog array.
 *
 * @param {Array<{category?: string}>} catalog
 * @returns {Record<string, number>}
 */
export function computeCategoryCounts(catalog) {
  const counts = {};
  for (const entry of Array.isArray(catalog) ? catalog : []) {
    if (entry.category) counts[entry.category] = (counts[entry.category] ?? 0) + 1;
  }
  return counts;
}
