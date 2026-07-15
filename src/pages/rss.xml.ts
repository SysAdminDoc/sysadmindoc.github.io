import type { APIContext } from 'astro';
import rss from '@astrojs/rss';
import sanitizeHtml from 'sanitize-html';
import { featured, liveApps, catalog } from '../data/portfolio';
import { categoryLabels } from '../data/categories';
import { withEndpointCache } from '../data/endpoint-headers';
import { githubRepoUrl } from '../data/github';

let stats: { lastPushedAt?: string | null; fetchedAt?: string | null } = {};
try {
  const mod = await import('../data/_stats.json');
  stats = (mod.default ?? mod) as typeof stats;
} catch { /* no cache yet */ }
let meta: Record<string, { pushedAt?: string | null; updatedAt?: string | null }> = {};
try {
  const mod = await import('../data/_meta.json');
  meta = (mod.default ?? mod) as typeof meta;
} catch { /* no cache yet */ }

const getItemDate = (slug: string) =>
  meta[slug]?.pushedAt || meta[slug]?.updatedAt || stats.lastPushedAt || stats.fetchedAt || new Date().toISOString();
const cleanDesc = (s: string) => s.replace(/&[a-z]+;/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export async function GET(context: APIContext) {
  const site = context.site?.toString().replace(/\/$/, '') || 'https://sysadmindoc.github.io';

  const seen = new Set<string>();
  const raw: { title: string; slug: string; desc: string; cat: string }[] = [];
  for (const p of featured) {
    if (seen.has(p.repo)) continue;
    seen.add(p.repo);
    raw.push({ title: p.name, slug: p.repo, desc: p.desc, cat: 'Featured' });
  }
  for (const a of liveApps) {
    if (seen.has(a.slug)) continue;
    seen.add(a.slug);
    raw.push({ title: `${a.name} (live)`, slug: a.slug, desc: a.desc, cat: 'Live App' });
  }
  for (const c of catalog) {
    if (seen.has(c.repo)) continue;
    seen.add(c.repo);
    raw.push({ title: c.name, slug: c.repo, desc: c.desc, cat: categoryLabels[c.category] ?? c.category });
  }

  const items = raw
    .map((item) => ({ ...item, date: getItemDate(item.slug) }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((item) => {
      const link = githubRepoUrl(item.slug);
      const description = cleanDesc(item.desc);
      // Full-content body for readers that render content:encoded.
      const contentHtml = sanitizeHtml(
        `<p>${item.desc}</p><p><a href="${link}">View ${item.title} on GitHub →</a></p>`,
        { allowedTags: ['p', 'a', 'strong', 'em', 'code'], allowedAttributes: { a: ['href'] } },
      );
      return {
        title: item.title,
        link,
        pubDate: new Date(item.date),
        description,
        categories: [item.cat],
        content: contentHtml,
      };
    });

  return withEndpointCache(await rss({
    title: 'Matt Parker — Projects',
    description: `Public projects, live web apps, and the full catalog by Matt Parker - ${catalog.length}+ projects across ${Object.keys(categoryLabels).length} categories.`,
    site,
    items,
    xmlns: { content: 'http://purl.org/rss/1.0/modules/content/' },
    customData: '<language>en-us</language>',
    trailingSlash: false,
  }));
}
