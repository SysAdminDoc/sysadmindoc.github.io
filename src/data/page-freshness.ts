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
    lastReviewed: '2026-06-04',
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
    lastReviewed: '2026-06-04',
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
}: {
  siteUrl: string;
  route: string;
  title: string;
  description: string;
  lastReviewed: string;
  schemaTypes?: string[];
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
  return JSON.stringify(node);
}
