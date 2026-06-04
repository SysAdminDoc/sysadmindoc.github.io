export interface ReviewedInteriorPage {
  slug: string;
  route: `/${string}/`;
  label: string;
  lastReviewed: string;
}

export const reviewedInteriorPages: ReviewedInteriorPage[] = [
  {
    slug: 'uses',
    route: '/uses/',
    label: 'Uses',
    lastReviewed: '2026-06-04',
  },
  {
    slug: 'resume',
    route: '/resume/',
    label: 'Resume',
    lastReviewed: '2026-06-04',
  },
  {
    slug: 'healthcare-it',
    route: '/healthcare-it/',
    label: 'Healthcare IT',
    lastReviewed: '2026-06-04',
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
}: {
  siteUrl: string;
  route: string;
  title: string;
  description: string;
  lastReviewed: string;
}) {
  const url = `${siteUrl}${route}`;
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: title,
    description,
    dateModified: reviewedDateTime(lastReviewed),
    isPartOf: { '@id': `${siteUrl}/#website` },
    about: { '@id': `${siteUrl}/#matt-parker` },
    reviewedBy: { '@id': `${siteUrl}/#matt-parker` },
  });
}
