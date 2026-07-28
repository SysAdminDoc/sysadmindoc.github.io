import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const aiPagePath = path.join(root, 'src', 'pages', 'ai.astro');

/**
 * The /ai/ track sells three focused service lines. The offer list must be
 * derived from the same array that renders the page, or the structured data an
 * answer engine reads drifts from the copy a visitor reads.
 */
test('the /ai/ services track publishes its offer list as structured data', async () => {
  const source = await fs.readFile(aiPagePath, 'utf8');

  assert.match(source, /serviceCatalogNodes/, 'ai.astro should build the offer catalog');
  assert.match(
    source,
    /extraNodes:\s*serviceCatalogNodes\(\{/s,
    'the offer catalog should ride the page JSON-LD graph, not a second script block',
  );
  assert.match(
    source,
    /serviceCatalogNodes\(\{[^}]*services,/s,
    'the catalog must be derived from the rendered `services` array, not a duplicate list',
  );
});

test('the /ai/ page keeps a focused offer set and an end-to-end delivery path', async () => {
  const source = await fs.readFile(aiPagePath, 'utf8');
  const servicesBlock = source.match(/const services = \[([\s\S]*?)\] as const;/)?.[1] || '';
  const engagementBlock = source.match(/const engagementSteps = \[([\s\S]*?)\] as const;/)?.[1] || '';
  const serviceTitles = [...servicesBlock.matchAll(/\btitle:\s*'([^']+)'/g)].map((match) => match[1]);
  const engagementStages = [...engagementBlock.matchAll(/\bname:\s*'([^']+)'/g)].map((match) => match[1]);

  assert.equal(serviceTitles.length, 3, 'expected three distinct service offers');
  assert.deepEqual(engagementStages, ['Map', 'Pilot', 'Harden', 'Hand off']);
  assert.match(source, /services\.map[\s\S]*?<h3>\{service\.title\}<\/h3>/);
  assert.match(source, /engagementSteps\.map[\s\S]*?<h3>\{item\.title\}<\/h3>/);
});

test('the /ai/ page avoids a redundant jump band and reveal-hidden card wall', async () => {
  const source = await fs.readFile(aiPagePath, 'utf8');

  assert.doesNotMatch(source, /SectionJumpNav|card-enter|aisvc-stats/);
  assert.match(source, /aria-label="Delivery standards"/);
  assert.match(source, /class="aisvc-proof-grid"/);
});

test('the /ai/ track exposes inspectable public proof without naming private repositories', async () => {
  const source = await fs.readFile(aiPagePath, 'utf8');

  assert.match(source, /Public system \/ Parker AI/);
  assert.match(source, /client-owned delivery/i);
  assert.match(source, /data boundaries, human review, logging, recovery/i);
  assert.match(source, /projectCount/);
  assert.match(source, /liveAppCount/);
  assert.match(source, /href="https:\/\/getparkerai\.com"[\s\S]*?rel="noopener"/);
  assert.doesNotMatch(
    source,
    /\b(?:JobSeek|AI-LLC|LLC-TODO|Contabo-VPS-Ops)\b/,
    'public copy should describe the evidence without exposing private repository names',
  );
});

test('the schema audit pins the services-track types and provider references', async () => {
  const audit = await fs.readFile(path.join(root, 'scripts', 'audit-schema.mjs'), 'utf8');

  assert.match(audit, /checkServicesTrackRoute/);
  assert.match(
    audit,
    /'\/ai\/',\s*\{\s*types:\s*\[[^\]]*'OfferCatalog'[^\]]*'Service'/s,
    '/ai/ should require both OfferCatalog and Service types',
  );
  assert.match(audit, /OfferCatalog provider must reference/);
  assert.match(audit, /does not resolve to a Service node/);
  assert.match(audit, /is missing areaServed/);
});

test('serviceCatalogNodes emits one Service per offer with resolvable ids', async () => {
  const { serviceCatalogNodes } = await import('../src/data/page-freshness.ts');
  const nodes = serviceCatalogNodes({
    siteUrl: 'https://example.test',
    route: '/ai/',
    catalogName: 'Test catalog',
    services: [
      { tag: 'Adoption', name: 'Rollout', desc: 'Roll it out.' },
      { tag: 'Retainer', name: 'Standing work', desc: 'Keep it working.' },
    ],
  });

  const catalog = nodes.find((node) => node['@type'] === 'OfferCatalog');
  const services = nodes.filter((node) => node['@type'] === 'Service');
  assert.ok(catalog, 'expected an OfferCatalog node');
  assert.equal(services.length, 2);
  assert.ok(Array.isArray(catalog.itemListElement));
  assert.equal(catalog.itemListElement.length, 2);

  const serviceIds = new Set(services.map((service) => service['@id']));
  for (const offer of catalog.itemListElement) {
    assert.equal(offer['@type'], 'Offer');
    assert.ok(serviceIds.has(offer.itemOffered['@id']), 'every offer must resolve to a Service node');
  }
  assert.equal(services[0]['@id'], 'https://example.test/ai/#service-adoption');
  for (const service of services) {
    const provider = /** @type {Record<string, unknown>} */ (service.provider);
    assert.equal(provider['@id'], 'https://example.test/#matt-parker');
    assert.ok(service.description);
    assert.ok(service.areaServed);
  }
});
