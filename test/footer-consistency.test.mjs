import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const pagesDir = path.join(root, 'src', 'pages');

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

async function routePages() {
  const files = await walk(pagesDir);
  return files.filter((file) => file.endsWith('.astro') && !path.basename(file).startsWith('_'));
}

test('every route renders the shared Footer component', async () => {
  const offenders = [];
  for (const file of await routePages()) {
    const text = await fs.readFile(file, 'utf8');
    if (!/<Footer\b/.test(text)) offenders.push(path.relative(root, file));
  }
  assert.deepEqual(
    offenders,
    [],
    `Routes must render <Footer /> so the contact affordance is present everywhere: ${offenders.join(', ')}`,
  );
});

test('no route hand-rolls a <footer> element', async () => {
  const offenders = [];
  for (const file of await routePages()) {
    const text = await fs.readFile(file, 'utf8');
    if (/<footer[\s>]/.test(text)) offenders.push(path.relative(root, file));
  }
  assert.deepEqual(
    offenders,
    [],
    `Footer markup belongs to src/components/Footer.astro, not: ${offenders.join(', ')}`,
  );
});

test('Footer pins the contact affordance to a consistent position', async () => {
  const source = await fs.readFile(path.join(root, 'src', 'components', 'Footer.astro'), 'utf8');
  assert.match(source, /contactMailto/, 'the contact href must come from src/data/identity.ts');
  assert.match(
    source,
    /\[contactLink,\s*\.\.\.links\]/,
    'WCAG 2.2 SC 3.2.6 needs the contact link in the same relative position on every page',
  );
});

test('the public email is declared once and never hardcoded in a route', async () => {
  const identity = await fs.readFile(path.join(root, 'src', 'data', 'identity.ts'), 'utf8');
  const declared = identity.match(/export const contactEmail\s*=\s*'([^']+)'/);
  assert.ok(declared, 'src/data/identity.ts must export contactEmail');

  const address = declared[1];
  const roots = [pagesDir, path.join(root, 'src', 'components'), path.join(root, 'src', 'layouts')];
  const offenders = [];
  for (const dir of roots) {
    for (const file of await walk(dir)) {
      if (!/\.(astro|ts|js)$/.test(file)) continue;
      const text = await fs.readFile(file, 'utf8');
      if (text.includes(address)) offenders.push(path.relative(root, file));
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `The contact address must come from src/data/identity.ts, not literals in: ${offenders.join(', ')}`,
  );
});
