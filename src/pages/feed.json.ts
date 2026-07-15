import type { APIContext } from 'astro';
import { featured, liveApps, catalog } from '../data/portfolio';
import { categoryLabels } from '../data/categories';
import { endpointHeaders } from '../data/endpoint-headers';
import { githubRepoUrl } from '../data/github';

// JSON Feed 1.1 (jsonfeed.org) mirror of the project feed for modern feed
// clients/automation. RSS (/rss.xml) remains the primary advertised feed.
let stats: { lastPushedAt?: string | null; fetchedAt?: string | null } = {};
try { const m = await import('../data/_stats.json'); stats = (m.default ?? m) as typeof stats; } catch {}
let meta: Record<string, { pushedAt?: string | null; updatedAt?: string | null }> = {};
try { const m = await import('../data/_meta.json'); meta = (m.default ?? m) as typeof meta; } catch {}

const clean = (s: string) => s.replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const dateFor = (slug: string) =>
  meta[slug]?.pushedAt || meta[slug]?.updatedAt || stats.lastPushedAt || stats.fetchedAt || new Date().toISOString();

export async function GET(context: APIContext) {
  const site = context.site?.toString().replace(/\/$/, '') || 'https://sysadmindoc.github.io';
  const seen = new Set<string>();
  const items: { id: string; url: string; title: string; summary: string; date: string; tags: string[] }[] = [];

  const add = (repo: string, name: string, summary: string, tag: string) => {
    if (seen.has(repo)) return;
    seen.add(repo);
    const date = dateFor(repo);
    const repositoryUrl = githubRepoUrl(repo);
    items.push({ id: repositoryUrl, url: repositoryUrl, title: name, summary: clean(summary), date, tags: [tag] });
  };
  for (const p of featured) add(p.repo, p.name, p.desc, 'Featured');
  for (const a of liveApps) add(a.slug, `${a.name} (live)`, a.desc, 'Live App');
  for (const c of catalog) add(c.repo, c.name, c.desc, categoryLabels[c.category] ?? c.category);

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'Matt Parker — Projects',
    home_page_url: `${site}/`,
    feed_url: `${site}/feed.json`,
    icon: `${site}/icon-512.png`,
    favicon: `${site}/favicon.svg`,
    description: `Public projects, live web apps, and the full catalog - ${catalog.length}+ projects.`,
    language: 'en-US',
    authors: [{ name: 'Matt Parker', url: 'https://github.com/SysAdminDoc' }],
    items: items.map((i) => ({
      id: i.id,
      url: i.url,
      title: i.title,
      content_text: i.summary,
      date_modified: new Date(i.date).toISOString(),
      tags: i.tags,
    })),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: endpointHeaders('application/feed+json; charset=UTF-8'),
  });
}
