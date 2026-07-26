export interface InteriorOgPage {
  slug: string;
  route: `/${string}/`;
  title: string;
  description: string;
  label: string;
  accent: string;
  ogImage: `/og/${string}.png`;
  ogImageAlt: string;
}

export const interiorOgPages: InteriorOgPage[] = [
  {
    slug: 'uses',
    route: '/uses/',
    title: 'Uses',
    description: 'Development environment, tools, languages, frameworks, and design preferences behind the portfolio.',
    label: 'Toolkit',
    accent: '#1648dc',
    ogImage: '/og/uses.png',
    ogImageAlt: 'Uses page social preview card',
  },
  {
    slug: 'resume',
    route: '/resume/',
    title: 'Resume',
    description: 'Printable resume for Matt Parker, spanning enterprise IT, systems administration, healthcare technology support, and customer-facing escalation work.',
    label: 'Career',
    accent: '#587400',
    ogImage: '/og/resume.png',
    ogImageAlt: 'Resume page social preview card',
  },
  {
    slug: 'search',
    route: '/search/',
    title: 'Search',
    description: 'Full-text static search across portfolio routes, language lanes, releases, timeline entries, and archive decisions.',
    label: 'Pagefind',
    accent: '#08786a',
    ogImage: '/og/search.png',
    ogImageAlt: 'Search page social preview card',
  },
  {
    slug: 'timeline',
    route: '/timeline/',
    title: 'Timeline',
    description: 'Year-in-review timeline generated from GitHub releases and project metadata.',
    label: 'History',
    accent: '#1648dc',
    ogImage: '/og/timeline.png',
    ogImageAlt: 'Timeline page social preview card',
  },
  {
    slug: 'archive',
    route: '/archive/',
    title: 'Archive Decisions',
    description: 'Public-safe record of retired, moved, held, and superseded project decisions without exposing private work.',
    label: 'Boundary',
    accent: '#d84b2d',
    ogImage: '/og/archive.png',
    ogImageAlt: 'Archive decisions page social preview card',
  },
  {
    slug: 'now',
    route: '/now/',
    title: 'Now',
    description: "What I'm currently building, thinking about, and deliberately not working on.",
    label: 'Current',
    accent: '#587400',
    ogImage: '/og/now.png',
    ogImageAlt: 'Now page social preview card',
  },
  {
    slug: 'ai',
    route: '/ai/',
    title: 'AI Services',
    description: 'AI tool rollout, workflow automation, workforce enablement, and custom software backed by explicit delivery controls.',
    label: 'AI Track',
    accent: '#1648dc',
    ogImage: '/og/ai.png',
    ogImageAlt: 'AI services page social preview card',
  },
  {
    slug: 'catalog',
    route: '/catalog/',
    title: 'Project Catalog',
    description: 'The complete public project archive: every repository in one searchable, sortable, filterable list with direct GitHub links.',
    label: 'Archive',
    accent: '#1648dc',
    ogImage: '/og/catalog.png',
    ogImageAlt: 'Project catalog page social preview card',
  },
  {
    slug: 'healthcare-it',
    route: '/healthcare-it/',
    title: 'Healthcare IT',
    description: 'Healthcare IT context for customer support, hosted workflows, migrations, vendor coordination, and support documentation.',
    label: 'Healthcare Track',
    accent: '#08786a',
    ogImage: '/og/healthcare-it.png',
    ogImageAlt: 'Healthcare IT page social preview card',
  },
  {
    slug: 'status',
    route: '/status/',
    title: 'Status',
    description: 'Portfolio build health, data freshness, live-app availability, and deployment version.',
    label: 'Health',
    accent: '#587400',
    ogImage: '/og/status.png',
    ogImageAlt: 'Status page social preview card',
  },
  {
    slug: 'screenshots',
    route: '/screenshots/',
    title: 'Screenshots',
    description: 'Visual evidence gallery of live-app product surfaces captured from deployed builds.',
    label: 'Visual Proof',
    accent: '#1648dc',
    ogImage: '/og/screenshots.png',
    ogImageAlt: 'Screenshots gallery page social preview card',
  },
  {
    slug: 'releases',
    route: '/releases/',
    title: 'Releases',
    description: 'Chronological release stream across the active public portfolio archive.',
    label: 'Shipping',
    accent: '#d84b2d',
    ogImage: '/og/releases.png',
    ogImageAlt: 'Releases page social preview card',
  },
];

export const interiorOgPageBySlug = Object.fromEntries(
  interiorOgPages.map((page) => [page.slug, page]),
) as Record<string, InteriorOgPage>;

export function getInteriorOgPage(slug: string) {
  return interiorOgPageBySlug[slug];
}
