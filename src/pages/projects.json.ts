import type { APIContext } from 'astro';
import { categoryLabels } from '../data/categories';
import { catalog, featured, liveApps, profileFeedInfo } from '../data/portfolio';

export const prerender = true;

type Stats = {
  fetchedAt?: string | null;
  lastPushedAt?: string | null;
};

type Meta = Record<string, { stars?: number; pushedAt?: string | null; updatedAt?: string | null; language?: string | null }>;

let stats: Stats = {};
try {
  const mod = await import('../data/_stats.json');
  stats = (mod.default ?? mod) as Stats;
} catch {}

let meta: Meta = {};
try {
  const mod = await import('../data/_meta.json');
  meta = (mod.default ?? mod) as Meta;
} catch {}

let stars: Record<string, number> = {};
try {
  const mod = await import('../data/_stars.json');
  stars = (mod.default ?? mod) as Record<string, number>;
} catch {}

const schemaVersion = 1;
const owner = 'SysAdminDoc';
const featuredBySlug = new Map(featured.map((project) => [project.repo, project]));
const liveBySlug = new Map(liveApps.map((app) => [app.slug, app]));
const catalogBySlug = new Map(catalog.map((entry) => [entry.repo, entry]));
const slugs = Array.from(
  new Set([
    ...featured.map((project) => project.repo),
    ...liveApps.map((app) => app.slug),
    ...catalog.map((entry) => entry.repo),
  ]),
);

function json(data: unknown) {
  return new Response(`${JSON.stringify(data, null, 2)}\n`, {
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

function plain(value: string | undefined) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&mdash;|&#8212;/gi, '-')
    .replace(/&ndash;|&#8211;/gi, '-')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET(context: APIContext) {
  const site = context.site?.toString().replace(/\/$/, '') || 'https://sysadmindoc.github.io';
  const generatedAt = stats.fetchedAt || new Date().toISOString();
  const projects = slugs.map((slug) => {
    const featuredProject = featuredBySlug.get(slug);
    const liveApp = liveBySlug.get(slug);
    const catalogEntry = catalogBySlug.get(slug);
    const category = catalogEntry?.category ?? featuredProject?.lang ?? 'other';
    const isLive = Boolean(liveApp || catalogEntry?.live);
    const description = plain(featuredProject?.desc ?? liveApp?.desc ?? catalogEntry?.desc);
    const repoUrl = `https://github.com/${owner}/${slug}`;

    return {
      slug,
      name: featuredProject?.name ?? liveApp?.name ?? catalogEntry?.name ?? slug,
      description,
      category,
      categoryLabel: categoryLabels[category] ?? category,
      language: meta[slug]?.language ?? null,
      featured: Boolean(featuredProject),
      live: isLive,
      tags: featuredProject?.tags ?? [],
      urls: {
        detail: `${site}/projects/${slug}/`,
        repository: repoUrl,
        source: catalogEntry?.url?.startsWith('https://github.com/') ? catalogEntry.url : repoUrl,
        live: liveApp?.url ?? (catalogEntry?.live ? catalogEntry.url : null),
        ogImage: `${site}/og/${slug}.png`,
        screenshot: isLive ? `${site}/screenshots/${slug}.jpg` : null,
        thumbnail: isLive ? `${site}/screenshots/thumbs/${slug}.jpg` : null,
      },
      metrics: {
        stars: stars[slug] ?? meta[slug]?.stars ?? null,
      },
      freshness: {
        pushedAt: meta[slug]?.pushedAt ?? null,
        updatedAt: meta[slug]?.updatedAt ?? null,
      },
    };
  });

  return json({
    schemaVersion,
    generatedAt,
    source: {
      repository: `${owner}/sysadmindoc.github.io`,
      data: profileFeedInfo.active ? 'SysAdminDoc/SysAdminDoc projects.json' : 'src/data/projects.ts',
      profileFeedUrl: profileFeedInfo.feedSourceUrl,
      profileFeedGeneratedAt: profileFeedInfo.generatedAt,
      profileFeedCachedAt: profileFeedInfo.cachedAt,
      githubMetadataFetchedAt: stats.fetchedAt ?? null,
      githubLastPushedAt: stats.lastPushedAt ?? null,
    },
    counts: {
      projects: projects.length,
      featured: featured.length,
      liveApps: liveApps.length,
      catalog: catalog.length,
    },
    projects,
  });
}
