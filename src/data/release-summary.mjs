/**
 * Release-note summarization shared by the generator and every render surface.
 *
 * GitHub release bodies are Markdown. The generated `bodyFirst` field used to be
 * the raw first lines joined with " · ", so `/releases/`, `/timeline/`,
 * `/releases.xml`, and `/releases.json` all rendered literal `**bold**`,
 * backticked code, and leading `- ` bullets as prose — and cut mid-word at a
 * fixed character count.
 *
 * These helpers are deliberately idempotent: running them over an already
 * summarized string is a no-op, so render surfaces can normalize a cached value
 * that predates this module without waiting for a data refresh.
 *
 * All exports are pure — no Astro, DOM, or filesystem access.
 */

const DEFAULT_MAX_LENGTH = 220;
const ELLIPSIS = '…';

/**
 * Convert a single line of Markdown to plain prose.
 *
 * Emphasis handling is conservative on purpose: `**bold**` and `__bold__` are
 * unwrapped, but lone `_underscores_` are left alone so snake_case identifiers
 * common in release notes survive intact.
 *
 * @param {string} line
 * @returns {string}
 */
export function markdownLineToText(line) {
  return String(line ?? '')
    // Images first, so their alt text survives the link pass below.
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(?<![A-Za-z0-9_])__([^_]+)__(?![A-Za-z0-9_])/g, '$1')
    .replace(/(?<![*\w])\*([^*\n]+)\*(?![*\w])/g, '$1')
    // A legacy summary could be hard-cut mid-emphasis, leaving an opening marker
    // with no partner for the paired passes above to match. Anything still
    // standing here is an orphan, so drop it rather than print it as prose.
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    // Leading list marker, blockquote, or heading prefix.
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '')
    .replace(/^\s*>+\s*/, '')
    .replace(/^\s*#+\s*/, '')
    // Cached summaries written before this module already joined their lines
    // with " · ", so their list markers sit mid-string rather than at line start.
    .replace(/(·\s*)(?:[-*+]|\d+[.)])\s+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Truncate without splitting a word, appending an ellipsis when text was cut.
 *
 * @param {string} value
 * @param {number} maxLength
 * @returns {string}
 */
export function truncateOnWord(value, maxLength = DEFAULT_MAX_LENGTH) {
  const text = String(value ?? '').trim();
  if (!Number.isFinite(maxLength) || maxLength <= 0) return text;
  if (text.length <= maxLength) return text;
  // Reserve one character for the ellipsis.
  const clipped = text.slice(0, maxLength - 1);
  const lastSpace = clipped.lastIndexOf(' ');
  // Only fall back to a hard cut when the first "word" is longer than the budget.
  const base = lastSpace > maxLength * 0.5 ? clipped.slice(0, lastSpace) : clipped;
  return `${base.replace(/[\s,;:.·-]+$/, '')}${ELLIPSIS}`;
}

/**
 * Drop a trailing word that a hard character cut may have severed, and mark it.
 *
 * @param {string} text
 * @returns {string}
 */
function dropTrailingPartialWord(text) {
  const trimmed = text.trimEnd();
  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace <= 0) return trimmed;
  return `${trimmed.slice(0, lastSpace).replace(/[\s,;:.·-]+$/, '')}${ELLIPSIS}`;
}

/**
 * Detect a summary produced by the pre-word-boundary generator.
 *
 * Those values were `.slice(0, 220)` of already-joined text: a single line, at
 * the length cap, with no ellipsis. A freshly generated summary at the same
 * length always ends in an ellipsis, and a raw Markdown body contains newlines,
 * so neither is mistaken for one. `fetch-stars` reuses cached release rows whose
 * repo has published nothing new, so these persist indefinitely rather than
 * clearing on the next refresh.
 *
 * @param {string} raw
 * @param {number} maxLength
 * @returns {boolean}
 */
function isHardCutSummary(raw, maxLength) {
  return !raw.includes('\n') && raw.length >= maxLength && !raw.trimEnd().endsWith(ELLIPSIS);
}

/**
 * Build the short prose summary shown for a release.
 *
 * @param {string | null | undefined} body Raw Markdown release body.
 * @param {{ maxLength?: number, maxLines?: number }} [options]
 * @returns {string}
 */
export function summarizeReleaseBody(body, options = {}) {
  const { maxLength = DEFAULT_MAX_LENGTH, maxLines = 3 } = options;
  const raw = String(body ?? '');
  const hardCut = isHardCutSummary(raw, maxLength);
  const lines = raw
    .replace(/\r/g, '')
    // Drop fenced code blocks wholesale — they are never useful as a one-line summary.
    .replace(/```[\s\S]*?```/g, ' ')
    .split('\n')
    .map((line) => markdownLineToText(line))
    .filter(Boolean)
    .slice(0, maxLines);
  const summary = truncateOnWord(lines.join(' · '), maxLength);
  // Stripping Markdown shortens a legacy value below the cap, so truncateOnWord
  // no longer trims it — the severed word has to be dropped explicitly.
  return hardCut && !summary.endsWith(ELLIPSIS) ? dropTrailingPartialWord(summary) : summary;
}
