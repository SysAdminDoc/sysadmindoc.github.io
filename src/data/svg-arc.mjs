/**
 * SVG arc / donut chart math for the language-mix donut on the homepage.
 *
 * All exports are pure functions — no side effects, no Astro imports.
 */

export const DONUT_R = 70;
export const DONUT_CIRC = 2 * Math.PI * DONUT_R;
export const DONUT_GAP = 2;
export const DONUT_TOP_N = 7;

export const DONUT_COLORS = Object.freeze({
  PowerShell: '#58a6ff',
  Python: '#4ade80',
  JavaScript: '#facc15',
  HTML: '#fb923c',
  Kotlin: '#2dd4bf',
  'C#': '#c084fc',
  'C++': '#f87171',
  Shell: '#8b9cc0',
  TypeScript: '#3b82f6',
  CSS: '#a78bfa',
  Other: '#7080a0',
});

export const DONUT_TONES = Object.freeze({
  PowerShell: 'powershell',
  Python: 'python',
  JavaScript: 'javascript',
  HTML: 'html',
  Kotlin: 'kotlin',
  'C#': 'csharp',
  'C++': 'cpp',
  Shell: 'shell',
  TypeScript: 'typescript',
  CSS: 'css',
  Other: 'other',
});

/**
 * Given a raw language-count map and a total, return the sorted arc descriptors
 * ready to pass to the SVG template.
 *
 * @param {Record<string,number>} langCount  - e.g. { PowerShell: 14, Python: 8, … }
 * @param {number}                total      - total number of projects counted
 * @returns {{ lang: string, color: string, tone: string, dash: string, offset: string, pct: number }[]}
 */
export function computeDonutArcs(langCount, total) {
  if (!langCount || total <= 0) return [];

  // Sort named langs descending, keep top N, bucket the tail into "Other".
  const named = Object.entries(langCount)
    .filter(([k]) => k !== 'Other')
    .sort(([, a], [, b]) => b - a);

  const top = named.slice(0, DONUT_TOP_N);
  const tailCount =
    named.slice(DONUT_TOP_N).reduce((s, [, n]) => s + n, 0) + (langCount['Other'] ?? 0);
  if (tailCount > 0) top.push(['Other', tailCount]);

  let offset = 0;
  return top.map(([lang, count]) => {
    const pct = total ? count / total : 0;
    const arcLen = Math.max(pct * DONUT_CIRC - DONUT_GAP, 0);
    const arc = {
      lang,
      color: DONUT_COLORS[lang] ?? '#7080a0',
      tone: DONUT_TONES[lang] ?? 'other',
      dash: `${arcLen.toFixed(1)} ${(DONUT_CIRC - arcLen).toFixed(1)}`,
      offset: (-offset).toFixed(1),
      pct: Math.round(pct * 100),
    };
    offset += pct * DONUT_CIRC;
    return arc;
  });
}

/**
 * Build the per-project language count map from catalog entries + meta.
 *
 * @param {Array<{repo:string}>} catalog
 * @param {Record<string,{language?:string|null}>} meta
 * @returns {{ langCount: Record<string,number>, total: number }}
 */
export function buildDonutLangCount(catalog, meta) {
  const langCount = {};
  let total = 0;
  for (const entry of Array.isArray(catalog) ? catalog : []) {
    const lang = meta?.[entry.repo]?.language;
    if (!lang) continue;
    langCount[lang] = (langCount[lang] ?? 0) + 1;
    total += 1;
  }
  return { langCount, total };
}
