import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

test('identity module declares one experience-years constant', async () => {
  const source = await fs.readFile(path.join(root, 'src', 'data', 'identity.ts'), 'utf8');
  const match = source.match(/export const experienceYears\s*=\s*(\d+)/);
  assert.ok(match, 'src/data/identity.ts must export a numeric experienceYears');
  assert.match(source, /export const experienceLabel\s*=\s*`\$\{experienceYears\}\+ years`/);
  assert.match(source, /export const experienceShort\s*=\s*`\$\{experienceYears\}\+ yrs`/);
});

test('no public surface hardcodes a tenure figure', async () => {
  const roots = [path.join(root, 'src', 'pages'), path.join(root, 'src', 'layouts')];
  const offenders = [];
  for (const dir of roots) {
    for (const file of await walk(dir)) {
      if (!/\.(astro|ts|js)$/.test(file)) continue;
      const text = await fs.readFile(file, 'utf8');
      // A literal like "15+ years" or "12+ yrs" outside the identity module means
      // the figure was hardcoded instead of derived from src/data/identity.ts.
      if (/\d+\+\s?(?:years|yrs)\b/.test(text)) {
        offenders.push(path.relative(root, file));
      }
    }
  }
  assert.deepEqual(offenders, [], `Tenure figure must come from src/data/identity.ts, not literals in: ${offenders.join(', ')}`);
});
