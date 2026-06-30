import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('skill ring metrics derive from rendered catalog lane counts', async () => {
  const { buildSkillsWithMetrics, ringTargetForCount, RING_CIRCUMFERENCE, RING_MIN_OFFSET } = await import(
    '../src/data/skill-metrics.mjs'
  );
  const skills = [
    { code: 'PS', name: 'PowerShell', sub: 'Automation', ringTarget: 0, color: '--blue' },
    { code: 'Py', name: 'Python', sub: 'Tools', ringTarget: 0, color: '--grn' },
    { code: 'JS', name: 'JavaScript', sub: 'Extensions', ringTarget: 0, color: '--yel' },
  ];
  const catalog = [
    { repo: 'one', category: 'py' },
    { repo: 'two', category: 'py' },
    { repo: 'three', category: 'ps' },
    { repo: 'four', category: 'ext' },
  ];

  const withMetrics = buildSkillsWithMetrics(skills, catalog);
  const python = withMetrics.find((skill) => skill.name === 'Python');
  const powershell = withMetrics.find((skill) => skill.name === 'PowerShell');

  assert.equal(python.metric.count, 2);
  assert.equal(python.metric.total, 4);
  assert.equal(python.metric.percent, 50);
  assert.equal(python.ringTarget, RING_MIN_OFFSET);
  assert.equal(powershell.ringTarget, ringTargetForCount(1, 2));
  assert.equal(ringTargetForCount(0, 2), RING_CIRCUMFERENCE);
});

test('hydrated language donut uses portfolio language metadata instead of raw repo denominator', async () => {
  const cmdk = await fs.readFile(path.join(root, 'src', 'data', 'cmdk.ts'), 'utf8');
  const github = await fs.readFile(path.join(root, 'public', 'scripts', 'home-github.js'), 'utf8');

  assert.match(cmdk, /language\?: string \| null/);
  assert.match(cmdk, /language: repoMeta\[project\.repo\]\?\.language \?\? null/);
  assert.match(github, /function getPortfolioLanguageSummary\(\)/);
  assert.match(github, /renderLangDonut\(portfolioLangs\.langs,portfolioLangs\.total\)/);
  assert.match(github, /renderLangDonut\(langCount,countLanguageTotal\(langCount\)\|\|repoCount\)/);
  assert.doesNotMatch(github, /if\(langCount\)renderLangDonut\(langCount,repoCount\);/);
});
