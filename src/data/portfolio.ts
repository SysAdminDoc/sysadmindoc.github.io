import { categoryLabels } from './categories';
import { buildSkillsWithMetrics } from './skill-metrics.mjs';
import sanitizeHtml from 'sanitize-html';
import {
  catalog as localCatalog,
  featured as localFeatured,
  liveApps as localLiveApps,
  skills as localSkills,
} from './projects';
import type { CatalogEntry, Featured, Lang, LiveApp } from './types';

type ProfilePrimaryAction = {
  kind?: string | null;
  label?: string | null;
  url?: string | null;
};

type ProfileProject = {
  repo?: string;
  title?: string;
  category?: string;
  includeInPortfolio?: boolean;
  suppressed?: boolean;
  description?: string;
  repoUrl?: string;
  liveUrl?: string | null;
  downloadUrl?: string | null;
  downloadKind?: string | null;
  primaryAction?: ProfilePrimaryAction | null;
  hasDownload?: boolean;
  hasLiveDemo?: boolean;
  language?: string | null;
  stars?: number | null;
  latestReleaseTag?: string | null;
  latestReleaseUrl?: string | null;
  releaseAssetKinds?: string[];
  pushedAt?: string | null;
  updatedAt?: string | null;
  topics?: string[];
  featured?: boolean;
  featuredRank?: number | null;
};

type ProfileFeed = {
  schema?: string;
  generatedAt?: string;
  cachedAt?: string;
  feedSourceUrl?: string;
  source?: string;
  publicRepoCount?: number;
  projectCount?: number;
  suppressedCount?: number;
  projects?: ProfileProject[];
};

const owner = 'SysAdminDoc';

let profileFeed: ProfileFeed | null = null;
try {
  const mod = await import('./_profile-projects.json');
  profileFeed = (mod.default ?? mod) as ProfileFeed;
} catch {
  profileFeed = null;
}

const categoryMap: Record<string, Lang> = {
  powershell: 'ps',
  python: 'py',
  web: 'web',
  extensions: 'ext',
  android: 'kt',
  security: 'sec',
  media: 'media',
  desktop: 'cs',
  guides: 'guide',
  misc: 'other',
};

const langLabels: Record<Lang, string> = {
  ps: 'PS',
  py: 'Py',
  web: 'Web',
  ext: 'JS',
  kt: 'Kt',
  sec: 'Sec',
  media: 'Media',
  cs: 'C#',
  guide: 'Guide',
  fork: 'Fork',
  other: 'Other',
  cpp: 'C++',
};

const repoRenames: Record<string, string> = {
  NovaCut: 'ClearCut',
};

const visibleFeedProjects = (profileFeed?.projects ?? []).filter(
  (project) => project?.includeInPortfolio !== false && project?.suppressed !== true && typeof project.repo === 'string',
).map((project) => {
  const renamed = repoRenames[project.repo!];
  if (!renamed) return project;
  const repoUrl = project.repoUrl?.includes(`/${project.repo}`)
    ? `https://github.com/${owner}/${renamed}`
    : project.repoUrl;
  const action = project.primaryAction?.url?.includes(`/${project.repo}`)
    ? { ...project.primaryAction, url: `https://github.com/${owner}/${renamed}` }
    : project.primaryAction;
  return {
    ...project,
    repo: renamed,
    title: project.title === project.repo ? renamed : project.title,
    repoUrl,
    primaryAction: action,
  };
});
const feedBacked = visibleFeedProjects.length > 0;

const localCatalogByRepo = new Map(localCatalog.map((entry) => [entry.repo, entry]));
const localFeaturedByRepo = new Map(localFeatured.map((entry) => [entry.repo, entry]));
const reviewedFeedProjects = visibleFeedProjects.filter((project) => localCatalogByRepo.has(project.repo!));
const reviewedFeedRepos = new Set(reviewedFeedProjects.map((project) => project.repo));
const localLiveFeedFallbacks = localCatalog.filter(
  (entry) => entry.live && !reviewedFeedRepos.has(entry.repo),
);

function mapCategory(value?: string): Lang {
  if (!value) return 'other';
  return categoryMap[value] ?? (value as Lang);
}

function cleanDescription(value?: string | null) {
  return sanitizeHtml(String(value ?? '').trim(), {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  }).replace(/\s+/g, ' ').trim();
}

function githubUrl(repo: string) {
  return `https://github.com/${owner}/${repo}`;
}

function primaryAction(project: ProfileProject) {
  if (!project.primaryAction?.kind || !project.primaryAction.label || !project.primaryAction.url) return null;
  return {
    kind: project.primaryAction.kind,
    label: project.primaryAction.label,
    url: project.primaryAction.url,
  };
}

function projectToCatalog(project: ProfileProject): CatalogEntry | null {
  const repo = project.repo?.trim();
  if (!repo) return null;
  const local = localCatalogByRepo.get(repo);
  const category = mapCategory(project.category) ?? local?.category ?? 'other';
  const live = Boolean(project.hasLiveDemo && project.liveUrl);
  return {
    repo,
    name: project.title ?? local?.name ?? repo,
    url: live ? String(project.liveUrl) : project.repoUrl ?? local?.url ?? githubUrl(repo),
    category,
    desc: cleanDescription(project.description) || local?.desc || repo,
    live,
    hasDownload: Boolean(project.hasDownload || project.downloadUrl || project.primaryAction?.kind === 'release'),
    pushedAt: project.pushedAt ?? local?.pushedAt ?? null,
    updatedAt: project.updatedAt ?? project.pushedAt ?? local?.updatedAt ?? null,
    latestReleaseTag: project.latestReleaseTag ?? null,
    latestReleaseUrl: project.latestReleaseUrl ?? null,
    releaseAssetKinds: Array.isArray(project.releaseAssetKinds) ? project.releaseAssetKinds : [],
    topics: Array.isArray(project.topics) ? project.topics : [],
    primaryAction: primaryAction(project),
  };
}

function projectToFeatured(project: ProfileProject): Featured | null {
  const repo = project.repo?.trim();
  if (!repo) return null;
  const local = localFeaturedByRepo.get(repo);
  if (local) return local;
  const category = mapCategory(project.category);
  const topicTags = Array.isArray(project.topics) ? project.topics.slice(0, 3) : [];
  return {
    repo,
    name: project.title ?? repo,
    lang: category,
    langLabel: langLabels[category] ?? categoryLabels[category] ?? category,
    desc: cleanDescription(project.description) || repo,
    tags: topicTags.length > 0 ? topicTags : [categoryLabels[category] ?? category],
  };
}

function buildFeatured(): Featured[] {
  if (!feedBacked) return localFeatured;
  const projects = reviewedFeedProjects
    .filter((project) => project.featured)
    .sort((a, b) => (a.featuredRank ?? 9999) - (b.featuredRank ?? 9999));
  const mapped = projects.map(projectToFeatured).filter(Boolean) as Featured[];
  return mapped.length > 0 ? mapped : localFeatured;
}

function buildLiveApps(): LiveApp[] {
  if (!feedBacked) return localLiveApps;
  const liveFeedSlugs = new Set(
    reviewedFeedProjects
      .filter((project) => project.hasLiveDemo && project.liveUrl)
      .map((project) => project.repo),
  );
  const fallbackSlugs = new Set(localLiveFeedFallbacks.map((entry) => entry.repo));
  return localLiveApps.filter((app) => liveFeedSlugs.has(app.slug) || fallbackSlugs.has(app.slug));
}

function buildCatalog(): CatalogEntry[] {
  if (!feedBacked) return localCatalog;
  const mapped = reviewedFeedProjects.map(projectToCatalog).filter(Boolean) as CatalogEntry[];
  return [...mapped, ...localLiveFeedFallbacks];
}

export const profileFeedInfo = {
  active: feedBacked,
  generatedAt: profileFeed?.generatedAt ?? null,
  cachedAt: profileFeed?.cachedAt ?? null,
  feedSourceUrl: profileFeed?.feedSourceUrl ?? null,
  source: profileFeed?.source ?? null,
  publicRepoCount: profileFeed?.publicRepoCount ?? null,
  projectCount: feedBacked ? reviewedFeedProjects.length + localLiveFeedFallbacks.length : localCatalog.length,
  suppressedCount: profileFeed?.suppressedCount ?? null,
};

export const catalog: CatalogEntry[] = buildCatalog();
export const featured: Featured[] = buildFeatured();
export const liveApps: LiveApp[] = buildLiveApps();
export const skills = buildSkillsWithMetrics(localSkills, catalog);
