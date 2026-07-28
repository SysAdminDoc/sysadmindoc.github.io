export interface ReviewedInteriorPage {
  slug: string;
  route: `/${string}/`;
  label: string;
  lastReviewed: string;
  schemaTypes: string[];
  visibleFreshness: boolean;
}

export const reviewedInteriorPages: ReviewedInteriorPage[] = [
  {
    slug: 'uses',
    route: '/uses/',
    label: 'Uses',
    lastReviewed: '2026-06-04',
    schemaTypes: ['WebPage'],
    visibleFreshness: true,
  },
  {
    slug: 'resume',
    route: '/resume/',
    label: 'Resume',
    lastReviewed: '2026-07-25',
    schemaTypes: ['ProfilePage', 'WebPage'],
    visibleFreshness: true,
  },
  {
    slug: 'search',
    route: '/search/',
    label: 'Search',
    lastReviewed: '2026-06-04',
    schemaTypes: ['SearchResultsPage', 'WebPage'],
    visibleFreshness: false,
  },
  {
    slug: 'timeline',
    route: '/timeline/',
    label: 'Timeline',
    lastReviewed: '2026-06-04',
    schemaTypes: ['CollectionPage', 'WebPage'],
    visibleFreshness: false,
  },
  {
    slug: 'status',
    route: '/status/',
    label: 'Status',
    lastReviewed: '2026-06-19',
    schemaTypes: ['WebPage'],
    visibleFreshness: false,
  },
  {
    slug: 'screenshots',
    route: '/screenshots/',
    label: 'Screenshots',
    lastReviewed: '2026-06-19',
    schemaTypes: ['CollectionPage', 'WebPage'],
    visibleFreshness: false,
  },
  {
    slug: 'archive',
    route: '/archive/',
    label: 'Archive Decisions',
    lastReviewed: '2026-06-04',
    schemaTypes: ['CollectionPage', 'WebPage'],
    visibleFreshness: false,
  },
  {
    slug: 'now',
    route: '/now/',
    label: 'Now',
    lastReviewed: '2026-06-04',
    schemaTypes: ['WebPage'],
    visibleFreshness: false,
  },
  {
    slug: 'healthcare-it',
    route: '/healthcare-it/',
    label: 'Healthcare IT',
    lastReviewed: '2026-07-25',
    schemaTypes: ['AboutPage', 'WebPage'],
    visibleFreshness: true,
  },
  {
    slug: 'ai',
    route: '/ai/',
    label: 'AI Services',
    lastReviewed: '2026-07-27',
    schemaTypes: ['AboutPage', 'WebPage'],
    visibleFreshness: true,
  },
  {
    slug: 'releases',
    route: '/releases/',
    label: 'Releases',
    lastReviewed: '2026-06-04',
    schemaTypes: ['CollectionPage', 'WebPage'],
    visibleFreshness: false,
  },
  {
    slug: 'catalog',
    route: '/catalog/',
    label: 'Project Catalog',
    lastReviewed: '2026-07-24',
    schemaTypes: ['CollectionPage', 'WebPage'],
    visibleFreshness: false,
  },
];

export const pageFreshnessBySlug = Object.fromEntries(
  reviewedInteriorPages.map((page) => [page.slug, page]),
) as Record<string, ReviewedInteriorPage>;

export function reviewedDateTime(lastReviewed: string) {
  return new Date(`${lastReviewed}T00:00:00Z`).toISOString();
}

export function formatReviewedDate(lastReviewed: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${lastReviewed}T00:00:00Z`));
}

export function reviewedWebPageJsonLd({
  siteUrl,
  route,
  title,
  description,
  lastReviewed,
  schemaTypes = ['WebPage'],
  extraNodes = [],
}: {
  siteUrl: string;
  route: string;
  title: string;
  description: string;
  lastReviewed: string;
  schemaTypes?: string[];
  /**
   * Additional schema.org nodes to publish alongside the page node. They are
   * emitted in the same `@graph` rather than a second `<script>` block, so a
   * route keeps exactly one JSON-LD element and page-level `@id` references
   * resolve without a second document.
   */
  extraNodes?: Record<string, unknown>[];
}) {
  const url = `${siteUrl}${route}`;
  const types = schemaTypes.length === 1 ? schemaTypes[0] : schemaTypes;
  const personId = `${siteUrl}/#matt-parker`;
  const node: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': types,
    '@id': `${url}#webpage`,
    url,
    name: title,
    description,
    dateModified: reviewedDateTime(lastReviewed),
    isPartOf: { '@id': `${siteUrl}/#website` },
    about: { '@id': personId },
    reviewedBy: { '@id': personId },
  };
  if (schemaTypes.includes('ProfilePage')) {
    node.mainEntity = { '@id': personId };
  }
  if (extraNodes.length === 0) return JSON.stringify(node);
  const { '@context': context, ...pageNode } = node;
  return JSON.stringify({ '@context': context, '@graph': [pageNode, ...extraNodes] });
}

/**
 * Build the `OfferCatalog` + `Service` nodes for a productized services track.
 *
 * Derived from the same array that renders the service cards, so the published
 * offer list cannot drift from the visible copy.
 */
export function serviceCatalogNodes({
  siteUrl,
  route,
  catalogName,
  services,
}: {
  siteUrl: string;
  route: string;
  catalogName: string;
  services: readonly { tag: string; name: string; desc: string }[];
}): Record<string, unknown>[] {
  const url = `${siteUrl}${route}`;
  const personId = `${siteUrl}/#matt-parker`;
  const areaServed = { '@type': 'Country', name: 'United States' };
  const serviceNodes = services.map((service) => ({
    '@type': 'Service',
    '@id': `${url}#service-${service.tag.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: service.name,
    description: service.desc,
    serviceType: service.tag,
    provider: { '@id': personId },
    areaServed,
  }));
  return [
    {
      '@type': 'OfferCatalog',
      '@id': `${url}#services`,
      name: catalogName,
      url,
      provider: { '@id': personId },
      itemListElement: serviceNodes.map((service) => ({
        '@type': 'Offer',
        itemOffered: { '@id': service['@id'] },
      })),
    },
    ...serviceNodes,
  ];
}

/**
 * Build the `FAQPage` node for a route's question/answer list.
 *
 * Derived from the same array that renders the visible FAQ, so an answer engine
 * reads exactly the questions and answers a visitor reads — no drift. Returns a
 * single node meant for `reviewedWebPageJsonLd`'s `extraNodes`, so the route
 * keeps one JSON-LD `<script>` block.
 */
export function faqPageNodes({
  siteUrl,
  route,
  faqs,
}: {
  siteUrl: string;
  route: string;
  faqs: readonly { q: string; a: string }[];
}): Record<string, unknown>[] {
  const url = `${siteUrl}${route}`;
  return [
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    },
  ];
}
