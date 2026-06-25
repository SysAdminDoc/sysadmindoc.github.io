import type { APIContext } from 'astro';
import { endpointHeaders } from '../data/endpoint-headers';
import { catalog, liveApps, profileFeedInfo } from '../data/portfolio';
import pkg from '../../package.json';

export const prerender = true;

type Stats = { fetchedAt?: string | null; totalRepos?: number; totalStars?: number };
let stats: Stats = {};
try {
  const mod = await import('../data/_stats.json');
  stats = (mod.default ?? mod) as Stats;
} catch {}

let readmeEntries = 0;
try {
  const mod = await import('../data/_readmes.json');
  readmeEntries = Object.keys(mod.default ?? mod).length;
} catch {}

export async function GET(_context: APIContext) {
  const status = {
    schema: 'sysadmindoc.status.v1',
    version: pkg.version,
    generatedAt: new Date().toISOString(),
    catalog: { count: catalog.length, liveApps: liveApps.length },
    profileFeed: {
      source: profileFeedInfo.source ?? null,
      projectCount: profileFeedInfo.projectCount ?? catalog.length,
    },
    generatedData: {
      fetchedAt: stats.fetchedAt ?? null,
      totalRepos: stats.totalRepos ?? null,
      totalStars: stats.totalStars ?? null,
      readmeEntries,
    },
  };

  return new Response(JSON.stringify(status, null, 2) + '\n', {
    headers: endpointHeaders('application/json; charset=utf-8'),
  });
}
