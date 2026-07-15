import { endpointHeaders } from '../data/endpoint-headers';
import type { GeneratedRelease } from '../data/generated';
import { catalog, featured, liveApps } from '../data/portfolio';
import { GITHUB_OWNER, githubRepoUrl } from '../data/github';

export const prerender = true;

type Stats = {
  fetchedAt?: string | null;
};

let releases: GeneratedRelease[] = [];
try {
  const mod = await import('../data/_releases.json');
  releases = (mod.default ?? mod) as GeneratedRelease[];
} catch {}

let stats: Stats = {};
try {
  const mod = await import('../data/_stats.json');
  stats = (mod.default ?? mod) as Stats;
} catch {}

const schemaVersion = 1;
const owner = GITHUB_OWNER;
const projectNameMap = new Map<string, string>();
featured.forEach((project) => projectNameMap.set(project.repo, project.name));
liveApps.forEach((app) => projectNameMap.set(app.slug, app.name));
catalog.forEach((entry) => projectNameMap.set(entry.repo, entry.name));

function json(data: unknown) {
  return new Response(`${JSON.stringify(data, null, 2)}\n`, {
    headers: endpointHeaders('application/json; charset=UTF-8'),
  });
}

export async function GET() {
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
      provenance: release.provenance ?? 'unknown',
      summary: release.bodyFirst,
      urls: {
        release: release.url,
        repository: githubRepoUrl(release.repo),
        detail: githubRepoUrl(release.repo),
      },
    })),
  });
}
