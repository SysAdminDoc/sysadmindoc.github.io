// Command-palette dataset shared by the layout (page-specific sections) and the
// /cmdk-data.js endpoint (the large, page-independent project + quick-link data
// served once and cached, instead of inlined on every page).
import { catalog, featured, liveApps } from './portfolio';
import { categoryLabels } from './categories';
import { githubRepoUrl } from './github';

type RepoMeta = Record<string, { language?: string | null }>;
let repoMeta: RepoMeta = {};
try {
  const mod = await import('./_meta.json');
  repoMeta = (mod.default ?? mod) as RepoMeta;
} catch {
  repoMeta = {};
}

export type CmdkSection = {
  label: string;
  href: string;
  desc?: string;
  badge?: string;
};

export type CmdkProject = {
  slug: string;
  name: string;
  desc: string;
  type: 'featured' | 'live' | 'catalog';
  url: string;
  category?: string;
  categoryLabel?: string;
  language?: string | null;
  searchTerms?: string[];
};

const normalizeCmdkDesc = (value: string) => value.replace(/&[a-z]+;/gi, ' ');

function buildCmdkProjects(): CmdkProject[] {
  const map = new Map<string, CmdkProject>();
  const upsert = (slug: string, next: CmdkProject) => {
    const existing = map.get(slug);
    const searchTerms = Array.from(
      new Set([...(existing?.searchTerms ?? []), ...(next.searchTerms ?? [])].filter(Boolean)),
    );
    map.set(slug, {
      ...existing,
      ...next,
      category: next.category ?? existing?.category,
      categoryLabel: next.categoryLabel ?? existing?.categoryLabel,
      language: next.language ?? existing?.language ?? null,
      searchTerms: searchTerms.length ? searchTerms : undefined,
    });
  };

  for (const project of catalog) {
    upsert(project.repo, {
      slug: project.repo,
      name: project.name,
      desc: normalizeCmdkDesc(project.desc),
      type: 'catalog',
      url: githubRepoUrl(project.repo),
      category: project.category,
      categoryLabel: categoryLabels[project.category] ?? project.category,
      language: repoMeta[project.repo]?.language ?? null,
      searchTerms: [project.category, categoryLabels[project.category] ?? project.category],
    });
  }
  for (const app of liveApps) {
    upsert(app.slug, {
      slug: app.slug,
      name: app.name,
      desc: normalizeCmdkDesc(app.desc),
      type: 'live',
      url: githubRepoUrl(app.slug),
      searchTerms: ['Live Apps', 'Live App', 'Browser'],
    });
  }
  for (const project of featured) {
    upsert(project.repo, {
      slug: project.repo,
      name: project.name,
      desc: normalizeCmdkDesc(project.desc),
      type: 'featured',
      url: githubRepoUrl(project.repo),
      searchTerms: project.tags,
    });
  }
  return Array.from(map.values());
}

export const cmdkProjects: CmdkProject[] = buildCmdkProjects();

export const cmdkQuickLinks = [
  {
    label: 'Full-Text Search',
    url: '/search/',
    desc: 'Search portfolio pages, language tracks, release history, and archive decisions.',
    badge: 'PAGE',
    tone: 'green',
    searchTerms: ['pagefind', 'full text', 'site search'],
  },
  {
    label: 'Releases',
    url: '/releases/',
    desc: 'Chronological release stream across the most active projects in the archive.',
    badge: 'PAGE',
    tone: 'blue',
    searchTerms: ['shipping', 'updates', 'release stream'],
  },
  {
    label: 'Timeline',
    url: '/timeline/',
    desc: 'Year-in-review view generated from releases and repository movement.',
    badge: 'PAGE',
    tone: 'blue',
    searchTerms: ['year in review', 'history', 'momentum', 'timeline'],
  },
  {
    label: 'Status',
    url: '/status/',
    desc: 'Portfolio build health, data freshness, live-app availability, and deployment version.',
    badge: 'PAGE',
    tone: 'green',
    searchTerms: ['health', 'build', 'version', 'deploy', 'uptime'],
  },
  {
    label: 'Screenshots',
    url: '/screenshots/',
    desc: 'Visual evidence gallery of live-app product surfaces captured from deployed builds.',
    badge: 'PAGE',
    tone: 'blue',
    searchTerms: ['gallery', 'images', 'visual proof', 'live apps', 'previews'],
  },
  {
    label: 'Archive Decisions',
    url: '/archive/',
    desc: 'Public-safe anti-portfolio notes for retired, moved, held, or superseded project surfaces.',
    badge: 'PAGE',
    tone: 'amber',
    searchTerms: ['archive', 'retired projects', 'anti portfolio', 'removed projects'],
  },
  {
    label: 'Now',
    url: '/now/',
    desc: 'Current build queue, focus areas, and the latest signals from the portfolio.',
    badge: 'PAGE',
    tone: 'green',
    searchTerms: ['current focus', 'working on now'],
  },
  {
    label: 'Uses',
    url: '/uses/',
    desc: 'Development environment, tools, languages, frameworks, and design conventions.',
    badge: 'PAGE',
    tone: 'blue',
    searchTerms: ['setup', 'tools', 'stack', 'environment', 'uses.tech'],
  },
  {
    label: 'Resume',
    url: '/resume/',
    desc: 'Printable career summary with skills, experience, and technology stacks.',
    badge: 'PAGE',
    tone: 'blue',
    searchTerms: ['cv', 'career', 'hire', 'experience', 'printable'],
  },
  {
    label: 'Healthcare IT Track',
    url: '/healthcare-it/',
    desc: 'Operational context for healthcare technology support, customer migrations, documentation, and escalation work.',
    badge: 'TRACK',
    tone: 'amber',
    searchTerms: ['healthcare', 'support', 'customer systems'],
  },
  {
    label: 'GitHub Workspace',
    url: 'https://github.com/SysAdminDoc',
    desc: 'Browse the source, issues, and project history directly in GitHub.',
    badge: 'SOURCE',
    tone: 'slate',
    external: true,
    searchTerms: ['source', 'github', 'issues'],
  },
] as const;
