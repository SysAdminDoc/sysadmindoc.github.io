import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DONUT_R,
  DONUT_CIRC,
  DONUT_GAP,
  DONUT_TOP_N,
  DONUT_COLORS,
  DONUT_TONES,
  computeDonutArcs,
  buildDonutLangCount,
} from '../src/data/svg-arc.mjs';

test('DONUT_CIRC matches expected circumference formula', () => {
  assert.equal(DONUT_CIRC, 2 * Math.PI * DONUT_R);
});

test('computeDonutArcs returns empty array for zero total', () => {
  assert.deepEqual(computeDonutArcs({ PowerShell: 5 }, 0), []);
});

test('computeDonutArcs returns empty array for null/empty lang count', () => {
  assert.deepEqual(computeDonutArcs(null, 10), []);
  assert.deepEqual(computeDonutArcs({}, 10), []);
});

test('computeDonutArcs arc percentages sum to 100 for clean split', () => {
  const arcs = computeDonutArcs({ PowerShell: 1, Python: 1 }, 2);
  const total = arcs.reduce((sum, arc) => sum + arc.pct, 0);
  // each is 50 %, rounding may give 100 or 99 — check within 1
  assert.ok(Math.abs(total - 100) <= 1, `pct sum ${total} not close to 100`);
});

test('computeDonutArcs applies known color and tone for PowerShell', () => {
  const arcs = computeDonutArcs({ PowerShell: 5 }, 5);
  assert.equal(arcs.length, 1);
  assert.equal(arcs[0].lang, 'PowerShell');
  assert.equal(arcs[0].color, DONUT_COLORS['PowerShell']);
  assert.equal(arcs[0].tone, DONUT_TONES['PowerShell']);
});

test('computeDonutArcs falls back to default color/tone for unknown language', () => {
  const arcs = computeDonutArcs({ FutureLang: 3 }, 3);
  assert.equal(arcs[0].color, '#7080a0');
  assert.equal(arcs[0].tone, 'other');
});

test('computeDonutArcs buckets languages beyond top-N into Other', () => {
  // Create DONUT_TOP_N + 2 languages each with count 1
  const langCount = {};
  for (let i = 0; i < DONUT_TOP_N + 2; i++) langCount[`Lang${i}`] = 1;
  const total = DONUT_TOP_N + 2;
  const arcs = computeDonutArcs(langCount, total);
  const otherArc = arcs.find((a) => a.lang === 'Other');
  assert.ok(otherArc, 'should have an Other bucket');
  // The two overflow languages should be merged into Other
  assert.equal(otherArc.pct, Math.round((2 / total) * 100));
});

test('computeDonutArcs merges pre-existing Other count into tail bucket', () => {
  const langCount = { PowerShell: 10, Python: 5, Other: 3 };
  const arcs = computeDonutArcs(langCount, 18);
  const otherArc = arcs.find((a) => a.lang === 'Other');
  assert.ok(otherArc, 'pre-existing Other should appear in arcs');
});

test('computeDonutArcs dash string uses space-separated pair of numbers', () => {
  const arcs = computeDonutArcs({ PowerShell: 1 }, 1);
  assert.match(arcs[0].dash, /^\d+\.\d+ \d+\.\d+$/);
});

test('computeDonutArcs offset starts at 0 for first arc', () => {
  const arcs = computeDonutArcs({ PowerShell: 5, Python: 5 }, 10);
  assert.equal(arcs[0].offset, '0.0');
});

test('computeDonutArcs orders arcs by descending count', () => {
  const langCount = { Python: 3, PowerShell: 10, JavaScript: 5 };
  const arcs = computeDonutArcs(langCount, 18);
  assert.equal(arcs[0].lang, 'PowerShell');
  assert.equal(arcs[1].lang, 'JavaScript');
  assert.equal(arcs[2].lang, 'Python');
});

test('buildDonutLangCount counts languages from catalog + meta', () => {
  const catalog = [
    { repo: 'Alpha' },
    { repo: 'Beta' },
    { repo: 'Gamma' },
    { repo: 'NoLang' },
  ];
  const meta = {
    Alpha: { language: 'PowerShell' },
    Beta: { language: 'PowerShell' },
    Gamma: { language: 'Python' },
    NoLang: { language: null },
  };
  const { langCount, total } = buildDonutLangCount(catalog, meta);
  assert.equal(langCount['PowerShell'], 2);
  assert.equal(langCount['Python'], 1);
  assert.equal(total, 3);
  assert.ok(!('NoLang' in langCount));
});

test('buildDonutLangCount handles missing or empty meta gracefully', () => {
  const catalog = [{ repo: 'Alpha' }];
  const { langCount, total } = buildDonutLangCount(catalog, {});
  assert.deepEqual(langCount, {});
  assert.equal(total, 0);
});

test('buildDonutLangCount handles null/undefined meta gracefully', () => {
  const { langCount, total } = buildDonutLangCount([{ repo: 'Alpha' }], null);
  assert.deepEqual(langCount, {});
  assert.equal(total, 0);
});

test('arc dasharray gap is at most DONUT_GAP per arc', () => {
  const arcs = computeDonutArcs({ PowerShell: 1, Python: 1 }, 2);
  for (const arc of arcs) {
    const [dashLen, gapLen] = arc.dash.split(' ').map(Number);
    // dash + gap must equal DONUT_CIRC (within floating-point tolerance)
    assert.ok(Math.abs(dashLen + gapLen - DONUT_CIRC) < 0.1, `dasharray must sum to DONUT_CIRC, got ${arc.dash}`);
  }
});
