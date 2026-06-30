import type { APIContext } from 'astro';
import { buildIdentity } from '../data/build-identity';
import { endpointHeaders } from '../data/endpoint-headers';
import { buildGeneratedDataTrust } from '../data/generated-trust';
import type { GeneratedReadmeRefresh, GeneratedStats } from '../data/generated';
import { catalog, liveApps, profileFeedInfo } from '../data/portfolio';
import pkg from '../../package.json';

export const prerender = true;

let stats: Partial<GeneratedStats> = {};
try {
  const mod = await import('../data/_stats.json');
  stats = (mod.default ?? mod) as Partial<GeneratedStats>;
} catch {}

let starEntries = 0;
try {
  const mod = await import('../data/_stars.json');
  starEntries = Object.keys(mod.default ?? mod).length;
} catch {}

let metadataEntries = 0;
try {
  const mod = await import('../data/_meta.json');
  metadataEntries = Object.keys(mod.default ?? mod).length;
} catch {}

let readmeEntries = 0;
try {
  const mod = await import('../data/_readmes.json');
  readmeEntries = Object.keys(mod.default ?? mod).length;
} catch {}

let releaseEntries = 0;
try {
  const mod = await import('../data/_releases.json');
  releaseEntries = Array.isArray(mod.default ?? mod) ? (mod.default ?? mod).length : 0;
} catch {}

let readmeRefresh: Partial<GeneratedReadmeRefresh> | null = null;
try {
  const mod = await import('../data/_readme-refresh.json');
  readmeRefresh = (mod.default ?? mod) as Partial<GeneratedReadmeRefresh>;
} catch {}

export async function GET(_context: APIContext) {
  const generatedData = buildGeneratedDataTrust({
    stats,
    starEntries,
    metadataEntries,
    readmeEntries,
    releaseEntries,
    profileFeedInfo,
    readmeRefresh,
  });

  const status = {
    schema: 'sysadmindoc.status.v1',
    version: pkg.version,
    generatedAt: new Date().toISOString(),
    build: {
      commit: buildIdentity.commit,
      commitShort: buildIdentity.commitShort,
      source: buildIdentity.source,
    },
    catalog: { count: catalog.length, liveApps: liveApps.length },
    profileFeed: {
      source: profileFeedInfo.source ?? null,
      projectCount: profileFeedInfo.projectCount ?? catalog.length,
    },
    generatedData,
  };

  return new Response(JSON.stringify(status, null, 2) + '\n', {
    headers: endpointHeaders('application/json; charset=UTF-8'),
  });
}
