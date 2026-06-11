import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('performance audit warms routes before collecting route metrics', async () => {
  const script = await fs.readFile(path.join(root, 'scripts', 'audit-performance.mjs'), 'utf8');
  const readme = await fs.readFile(path.join(root, 'README.md'), 'utf8');

  assert.match(script, /const warmupEnabled = !process\.argv\.includes\('--no-warmup'\)/);
  assert.match(script, /async function warmAuditRoutes\(port\)/);
  assert.match(script, /await navigate\(client, new URL\(test\.path, baseUrl\)\.toString\(\), test\.waitMs\);/);
  assert.match(script, /await warmAuditRoutes\(port\);\s+const results = \[\];/);
  assert.match(script, /JSON\.stringify\(\{ generatedAt: new Date\(\)\.toISOString\(\), baseUrl, warmup: warmupEnabled, thresholds, results: resultsWithFailures \}/);
  assert.match(script, /console\.log\(`  Warmup: \$\{warmupEnabled \? 'enabled' : 'disabled'\}`\);/);
  assert.match(readme, /warms each sampled route once before measurement/);
  assert.match(readme, /-- --no-warmup/);
});
