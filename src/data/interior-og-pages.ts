export interface InteriorOgPage {
  slug: string;
  route: `/${string}/`;
  title: string;
  description: string;
  label: string;
  accent: string;
  command: string;
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
    accent: '#58a6ff',
    command: 'cat uses.md',
    ogImage: '/og/uses.png',
    ogImageAlt: 'Uses page social preview card',
  },
  {
    slug: 'resume',
    route: '/resume/',
    title: 'Resume',
    description: 'Printable resume for Matt Parker, spanning enterprise IT, healthcare imaging support, and public software projects.',
    label: 'Career',
    accent: '#4ade80',
    command: 'cat resume.md',
    ogImage: '/og/resume.png',
    ogImageAlt: 'Resume page social preview card',
  },
  {
    slug: 'search',
    route: '/search/',
    title: 'Search',
    description: 'Full-text static search across portfolio projects, rendered README excerpts, releases, timeline entries, and public pages.',
    label: 'Pagefind',
    accent: '#4ade80',
    command: 'pagefind --site dist',
    ogImage: '/og/search.png',
    ogImageAlt: 'Search page social preview card',
  },
  {
    slug: 'timeline',
    route: '/timeline/',
    title: 'Timeline',
    description: 'Year-in-review timeline generated from GitHub releases, project metadata, and portfolio changelog highlights.',
    label: 'History',
    accent: '#58a6ff',
    command: 'cat timeline.json',
    ogImage: '/og/timeline.png',
    ogImageAlt: 'Timeline page social preview card',
  },
  {
    slug: 'archive',
    route: '/archive/',
    title: 'Archive Decisions',
    description: 'Public-safe record of retired, moved, held, and superseded project decisions without exposing private work.',
    label: 'Boundary',
    accent: '#facc15',
    command: 'cat archive.md',
    ogImage: '/og/archive.png',
    ogImageAlt: 'Archive decisions page social preview card',
  },
  {
    slug: 'now',
    route: '/now/',
    title: 'Now',
    description: "What I'm currently building, thinking about, and deliberately not working on.",
    label: 'Current',
    accent: '#4ade80',
    command: 'cat now.md',
    ogImage: '/og/now.png',
    ogImageAlt: 'Now page social preview card',
  },
  {
    slug: 'healthcare-it',
    route: '/healthcare-it/',
    title: 'Healthcare IT',
    description: 'Tools built for healthcare facilities running medical imaging systems: PACS migration, support automation, and X-ray acquisition.',
    label: 'Clinical Track',
    accent: '#2dd4bf',
    command: 'cat healthcare-it.md',
    ogImage: '/og/healthcare-it.png',
    ogImageAlt: 'Healthcare IT page social preview card',
  },
  {
    slug: 'releases',
    route: '/releases/',
    title: 'Releases',
    description: 'Chronological release stream across the active public portfolio archive.',
    label: 'Shipping',
    accent: '#c084fc',
    command: 'cat releases.json',
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
