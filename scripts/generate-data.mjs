#!/usr/bin/env node
// Generate src/data/projects.ts from _extracted.json
// Run once during migration; after that, edit projects.ts directly.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = JSON.parse(readFileSync(join(root, '_extracted.json'), 'utf8'));

const q = (s) => JSON.stringify(s);

const featured = src.featured
  .map((f) => `  { repo: ${q(f.repo)}, name: ${q(f.name)}, lang: ${q(f.lang)}, langLabel: ${q(f.langLabel)}, desc: ${q(f.desc)}, tags: ${JSON.stringify(f.tags)}${f.bento === 'hero' ? ', bento: "hero"' : ''} }`)
  .join(',\n');

const live = src.liveApps
  .map((a) => `  { slug: ${q(a.slug)}, name: ${q(a.name)}, url: ${q(a.url)}, desc: ${q(a.desc)} }`)
  .join(',\n');

const catalog = src.catalog
  .map((c) => `  { repo: ${q(c.repo)}, name: ${q(c.name)}, url: ${q(c.url)}, category: ${q(c.category)}, desc: ${q(c.desc)}${c.live ? ', live: true' : ''} }`)
  .join(',\n');

const skills = src.skills
  .map((s) => `  { code: ${q(s.label)}, name: ${q(s.name)}, sub: ${q(s.sub)}, ringTarget: ${s.pct}, color: ${q('--' + s.color)} }`)
  .join(',\n');

const out = `// AUTO-GENERATED from _extracted.json by scripts/generate-data.mjs
// After initial migration, edit this file directly.
import type { Featured, LiveApp, CatalogEntry, Skill } from './types';

export const featured: Featured[] = [
${featured}
];

export const liveApps: LiveApp[] = [
${live}
];

export const catalog: CatalogEntry[] = [
${catalog}
];

export const skills: Skill[] = [
${skills}
];
`;

writeFileSync(join(root, 'src', 'data', 'projects.ts'), out);
console.log(`Generated projects.ts: ${src.featured.length} featured, ${src.liveApps.length} live, ${src.catalog.length} catalog, ${src.skills.length} skills`);
