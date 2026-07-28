import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

// The résumé and the homepage hero must show the same project/live-app totals.
// The hero derives them from the live catalog (catalog.length / liveApps.length),
// so the résumé proof counts must be derived from the same source and never
// hardcoded in the data layer, where they would silently drift.

test('career.ts never hardcodes project or live-app proof counts', async () => {
  const source = await fs.readFile(path.join(root, 'src', 'data', 'career.ts'), 'utf8');

  const shippedLiteral = source.match(/\d+\+?\s*shipped/);
  assert.equal(
    shippedLiteral,
    null,
    `career.ts hardcodes a "shipped" count (${shippedLiteral?.[0]}); derive it via buildCareerProof(projectCount, liveCount) instead`,
  );

  const liveLiteral = source.match(/\d+\s*live apps/);
  assert.equal(
    liveLiteral,
    null,
    `career.ts hardcodes a "live apps" count (${liveLiteral?.[0]}); derive it via buildCareerProof(projectCount, liveCount) instead`,
  );
});

test('buildCareerProof interpolates its count arguments', async () => {
  const source = await fs.readFile(path.join(root, 'src', 'data', 'career.ts'), 'utf8');
  assert.match(source, /export function buildCareerProof\(projectCount: number, liveCount: number\)/);
  assert.match(source, /\$\{projectCount\}\+ shipped/);
  assert.match(source, /\$\{liveCount\} live apps/);
});

test('resume.astro derives its proof counts from the live catalog', async () => {
  const source = await fs.readFile(path.join(root, 'src', 'pages', 'resume.astro'), 'utf8');
  assert.match(
    source,
    /buildCareerProof\(catalog\.length, liveApps\.length\)/,
    'resume.astro must build careerProof from catalog.length / liveApps.length',
  );
});
