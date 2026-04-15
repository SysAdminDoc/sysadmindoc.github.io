import { catalog, featured, liveApps } from './projects';

const repoSlugs = new Set<string>([
  ...featured.map((project) => project.repo),
  ...liveApps.map((app) => app.slug),
  ...catalog.map((entry) => entry.repo),
]);

export const fallbackRepoCount = repoSlugs.size;
