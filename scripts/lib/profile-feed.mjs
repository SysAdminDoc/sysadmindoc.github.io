export const DEFAULT_PROFILE_FEED_URL =
  'https://raw.githubusercontent.com/SysAdminDoc/SysAdminDoc/main/projects.json';

export function filterPortfolioProjects(projects) {
  if (!Array.isArray(projects)) return [];
  return projects.filter((project) => project?.includeInPortfolio !== false && project?.suppressed !== true);
}

export function validateProfileFeed(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('profile feed payload must be an object');
  }
  if (!Array.isArray(payload.projects)) {
    throw new Error('profile feed payload must contain a projects array');
  }

  const projects = filterPortfolioProjects(payload.projects);
  if (projects.length === 0) {
    throw new Error('profile feed contains no portfolio-visible projects');
  }

  const seen = new Set();
  for (const [index, project] of projects.entries()) {
    for (const key of ['repo', 'title', 'category', 'description', 'repoUrl']) {
      if (typeof project[key] !== 'string' || project[key].trim() === '') {
        throw new Error(`profile feed project ${index} is missing ${key}`);
      }
    }
    if (seen.has(project.repo)) {
      throw new Error(`profile feed contains duplicate repo ${project.repo}`);
    }
    seen.add(project.repo);
  }

  return projects;
}

export function buildCachedProfileFeed(payload, sourceUrl, fetchedAt = new Date().toISOString()) {
  const projects = validateProfileFeed(payload);
  return {
    ...payload,
    feedSourceUrl: sourceUrl,
    cachedAt: fetchedAt,
    projectCount: projects.length,
    projects,
  };
}
