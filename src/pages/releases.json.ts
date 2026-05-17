import type { APIContext } from 'astro';
import { catalog, featured, liveApps } from '../data/projects';

type Release = {
  repo: string;
  tag: string;
  name: string;
  publishedAt: string;
  url: string;
  bodyFirst: string;
};

type Stats = {
  fetchedAt?: string | null;
};

let releases: Release[] = [];
try {
  const mod = await import('../data/_releases.json');
  releases = (mod.default ?? mod) as Release[];
} catch {}

let stats: Stats = {};
try {
  const mod = await import('../data/_stats.json');
  stats = (mod.default ?? mod) as Stats;
} catch {}

const schemaVersion = 1;
const owner = 'SysAdminDoc';
const detailRepos = new Set([
  ...featured.map((project) => project.repo),
  ...liveApps.map((app) => app.slug),
  ...catalog.map((entry) => entry.repo),
]);
const projectNameMap = new Map<string, string>();
featured.forEach((project) => projectNameMap.set(project.repo, project.name));
liveApps.forEach((app) => projectNameMap.set(app.slug, app.name));
catalog.forEach((entry) => projectNameMap.set(entry.repo, entry.name));

function json(data: unknown) {
  return new Response(`${JSON.stringify(data, null, 2)}\n`, {
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

export async function GET(context: APIContext) {
  const site = context.site?.toString().replace(/\/$/, '') || 'https://sysadmindoc.github.io';
  const generatedAt = stats.fetchedAt || new Date().toISOString();
  const sorted = [...releases].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return json({
    schemaVersion,
    generatedAt,
    source: {
      repository: `${owner}/sysadmindoc.github.io`,
      data: 'src/data/_releases.json',
      githubMetadataFetchedAt: stats.fetchedAt ?? null,
    },
    counts: {
      releases: sorted.length,
      repositories: new Set(sorted.map((release) => release.repo)).size,
    },
    releases: sorted.map((release) => ({
      repo: release.repo,
      projectName: projectNameMap.get(release.repo) ?? release.repo,
      tag: release.tag,
      name: release.name,
      publishedAt: release.publishedAt,
      summary: release.bodyFirst,
      urls: {
        release: release.url,
        repository: `https://github.com/${owner}/${release.repo}`,
        detail: detailRepos.has(release.repo) ? `${site}/projects/${release.repo}/` : null,
      },
    })),
  });
}
