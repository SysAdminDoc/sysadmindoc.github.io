#!/usr/bin/env node
// Scaffold a new interior route and patch every registration point.
//
// Adding an interior route touches roughly a dozen files that must agree, and
// the list only existed as prose in the working notes. A partial registration
// fails late and confusingly — usually as an audit error naming a file that has
// nothing to do with the change — so this script patches what it can and reports
// loudly on anything it could not, rather than silently half-registering.
//
// Usage:
//   node scripts/scaffold-route.mjs <slug> [--title "Title"] [--label "Nav label"] [--dry-run]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { dryRun: false };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--title') args.title = argv[++i];
    else if (arg === '--label') args.label = argv[++i];
    else if (arg === '--description') args.description = argv[++i];
    else rest.push(arg);
  }
  args.slug = rest[0];
  return args;
}

function titleCase(slug) {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function today() {
  // Callers can pin this for reproducible dry-runs.
  return process.env.SCAFFOLD_DATE ?? new Date().toISOString().slice(0, 10);
}

/**
 * Registration points. Each entry finds an anchor and inserts before it, so a
 * moved or renamed anchor surfaces as an explicit failure rather than a silent
 * no-op.
 */
function registrations(ctx) {
  const { slug, title, label, description, route, date } = ctx;
  return [
    {
      name: 'page stub',
      file: `src/pages/${slug}.astro`,
      create: () => `---
import Base from '../layouts/Base.astro';
import InteriorNav from '../components/InteriorNav.astro';
import Footer from '../components/Footer.astro';
import { interiorOgPageBySlug } from '../data/interior-og-pages';
import { pageFreshnessBySlug, reviewedWebPageJsonLd } from '../data/page-freshness';

const title = '${title} — Matt Parker';
const pageOg = interiorOgPageBySlug['${slug}'];
const pageFreshness = pageFreshnessBySlug['${slug}'];
const siteUrl = Astro.site?.toString().replace(/\\/$/, '') || 'https://sysadmindoc.github.io';
const pageJsonLd = reviewedWebPageJsonLd({
  siteUrl,
  route: pageFreshness.route,
  title,
  description: pageOg.description,
  lastReviewed: pageFreshness.lastReviewed,
  schemaTypes: pageFreshness.schemaTypes,
});
const cmdkSections = [
  { label: 'Overview', href: '#${slug}-overview', desc: '${description}', badge: 'PAGE' },
];
---
<Base title={title} description={pageOg.description} ogImage={pageOg.ogImage} ogImageAlt={pageOg.ogImageAlt} cmdkSections={cmdkSections}>
  <script is:inline type="application/ld+json" set:html={pageJsonLd} />
  <a href="#main" class="skip-link">Skip to content</a>
  <InteriorNav active="${slug}" contextLabel="${label}" contextTone="slate" />

  <main id="main" data-pagefind-body data-pagefind-filter="Scope:${title}">
    <span aria-hidden="true" data-pagefind-ignore data-pagefind-meta="route_type:${title}"></span>
    <span aria-hidden="true" data-pagefind-ignore data-pagefind-meta="category:Portfolio"></span>
    <div class="si page-shell" id="${slug}-overview">
      <div class="sh rv">
        <div class="sl">// ${title}</div>
        <h1 class="st">${title}</h1>
        <p class="sd">${description}</p>
      </div>
    </div>
  </main>

  <Footer
    summary="${description}"
    links={[
      { href: '/catalog/', label: 'Catalog' },
      { href: 'https://github.com/SysAdminDoc', label: 'GitHub', external: true },
    ]}
  />
</Base>
`,
    },
    {
      name: 'interior OG page',
      file: 'src/data/interior-og-pages.ts',
      anchor: '  {\n    slug: ',
      insert: `  {
    slug: '${slug}',
    route: '${route}',
    title: '${title}',
    description: '${description}',
    label: '${label}',
    accent: '#1f5fcc',
    command: 'cat ${slug}.md',
    ogImage: '/og/${slug}.png',
    ogImageAlt: '${title} page social preview card',
  },
`,
    },
    {
      name: 'page freshness',
      file: 'src/data/page-freshness.ts',
      anchor: '  {\n    slug: ',
      insert: `  {
    slug: '${slug}',
    route: '${route}',
    label: '${label}',
    lastReviewed: '${date}',
    schemaTypes: ['WebPage'],
    visibleFreshness: true,
  },
`,
    },
    {
      name: 'schema audit representative route',
      file: 'scripts/audit-schema.mjs',
      anchor: "  ['/uses/', {",
      insert: `  ['${route}', {
    types: ['WebSite', 'Person', 'WebPage'],
    checks: checkReviewedInteriorRoute,
  }],
`,
    },
    {
      name: 'InteriorNav ActiveRoute',
      file: 'src/components/InteriorNav.astro',
      anchor: "type ActiveRoute = ",
      replace: (text) =>
        text.replace(/type ActiveRoute = ([^;]+);/, (full, union) => `type ActiveRoute = ${union} | '${slug}';`),
    },
    {
      name: 'InteriorNav link',
      file: 'src/components/InteriorNav.astro',
      anchor: '      <a href="/ai/"',
      insert: `      <a href="${route}" class={isActive('${slug}') ? 'active' : undefined} aria-current={isActive('${slug}') ? 'page' : undefined}>${label}</a>\n`,
    },
    {
      name: 'Base cmdk section',
      file: 'src/layouts/Base.astro',
      anchor: "  { label: 'Healthcare IT'",
      insert: `  { label: '${title}', href: '${route}', desc: '${description}', badge: 'PAGE' },\n`,
    },
  ];
}

function applyRegistration(entry, dryRun) {
  const target = join(root, entry.file);

  if (entry.create) {
    if (existsSync(target)) return { ...entry, status: 'skipped', detail: 'file already exists' };
    if (!dryRun) writeFileSync(target, entry.create(), 'utf8');
    return { ...entry, status: 'created' };
  }

  if (!existsSync(target)) return { ...entry, status: 'failed', detail: 'file not found' };
  const text = readFileSync(target, 'utf8');

  if (entry.replace) {
    const next = entry.replace(text);
    if (next === text) return { ...entry, status: 'failed', detail: `anchor "${entry.anchor}" did not change the file` };
    if (!dryRun) writeFileSync(target, next, 'utf8');
    return { ...entry, status: 'patched' };
  }

  const index = text.indexOf(entry.anchor);
  if (index < 0) return { ...entry, status: 'failed', detail: `anchor "${entry.anchor}" not found` };
  if (text.includes(entry.insert.trim())) return { ...entry, status: 'skipped', detail: 'already registered' };
  const next = text.slice(0, index) + entry.insert + text.slice(index);
  if (!dryRun) writeFileSync(target, next, 'utf8');
  return { ...entry, status: 'patched' };
}

const args = parseArgs(process.argv.slice(2));
if (!args.slug || !/^[a-z][a-z0-9-]*$/.test(args.slug)) {
  console.error('Usage: node scripts/scaffold-route.mjs <slug> [--title "..."] [--label "..."] [--description "..."] [--dry-run]');
  console.error('  <slug> must be lowercase kebab-case.');
  process.exit(1);
}

const ctx = {
  slug: args.slug,
  route: `/${args.slug}/`,
  title: args.title ?? titleCase(args.slug),
  label: args.label ?? titleCase(args.slug),
  description: args.description ?? `${titleCase(args.slug)} overview.`,
  date: today(),
};

console.log(`Scaffolding ${ctx.route}${args.dryRun ? ' (dry run — no files written)' : ''}`);
const results = registrations(ctx).map((entry) => applyRegistration(entry, args.dryRun));

for (const result of results) {
  const detail = result.detail ? ` — ${result.detail}` : '';
  console.log(`  [${result.status}] ${result.name} (${result.file})${detail}`);
}

const failed = results.filter((result) => result.status === 'failed');

// Deliberately not patched: these are frozen expectation sets. Editing them is a
// review decision — a scaffold that silently widened them would disarm the very
// guards that catch a half-registered route. `npm test` names each one.
console.log('\nStill manual (npm test will fail until these are updated):');
console.log(`  - test/page-freshness.test.mjs — add '${ctx.slug}' to expectedSchemaSlugs`);
console.log(`      (and to expectedVisibleSlugs if the page shows a "last updated" line)`);
console.log(`  - test/interior-og.test.mjs — add '${ctx.slug}' to the covered secondary routes`);
console.log('  - test/csp-audit.test.mjs — pinned JSON-LD/style counts shift once the page has content');
console.log('  - tests/playwright/portfolio-audits.spec.mjs — add the route to the audited list');
console.log('\nOptional:');
console.log('  - scripts/audit-image-pipeline.mjs — requiredInteriorOgSlugs, to require the OG image');
console.log('  - src/data/cmdk.ts — a quick link, to surface the route in the command palette');
console.log('\nThen run: npm run check && npm run build && npm test');

if (failed.length > 0) {
  console.error(`\nScaffold incomplete: ${failed.length} registration point(s) could not be patched.`);
  for (const result of failed) console.error(`  - ${result.name} (${result.file}): ${result.detail}`);
  process.exit(1);
}
