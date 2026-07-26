import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const aiPagePath = path.join(root, 'src', 'pages', 'ai.astro');

/**
 * The /ai/ track sells four productized service lines. The offer list must be
 * derived from the same array that renders the cards, or the structured data an
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

test('the /ai/ service and engagement cards lead with prospect questions', async () => {
  const source = await fs.readFile(aiPagePath, 'utf8');
  const questions = [...source.matchAll(/\bquestion:\s*'([^']+)'/g)].map((match) => match[1]);

  assert.equal(questions.length, 7, 'expected four service questions and three engagement questions');
  assert.ok(questions.every((question) => question.endsWith('?')), 'every card question should be explicit');
  assert.match(source, /services\.map[\s\S]*?<h3[^>]*>\{s\.question\}<\/h3>/);
  assert.match(source, /engagementSteps\.map[\s\S]*?<h3[^>]*>\{s\.question\}<\/h3>/);
});

test('the /ai/ track exposes public operating proof without naming private repositories', async () => {
  const source = await fs.readFile(aiPagePath, 'utf8');
  const proofItems = [...source.matchAll(/\bcode:\s*'([^']+)'/g)].map((match) => match[1]);

  assert.deepEqual(proofItems, [
    'PUBLIC SYSTEM',
    'DELIVERY CONTRACT',
    'DATA BOUNDARY',
    'PRODUCTION OPS',
  ]);
  assert.match(source, /href:\s*'https:\/\/getparkerai\.com'/);
  assert.match(source, /operatingProof\.map[\s\S]*?rel="noopener"/);
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
