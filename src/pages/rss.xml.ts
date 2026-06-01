import type { APIContext } from 'astro';
import { featured, liveApps, catalog } from '../data/projects';
import { categoryLabels } from '../data/categories';

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

const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
const getItemDate = (slug: string) =>
  meta[slug]?.pushedAt || meta[slug]?.updatedAt || stats.lastPushedAt || stats.fetchedAt || new Date().toISOString();

export async function GET(context: APIContext) {
  const site = context.site?.toString().replace(/\/$/, '') || 'https://sysadmindoc.github.io';
  const pubDate = new Date(stats.fetchedAt || Date.now()).toUTCString();

  const seen = new Set<string>();
  const rawItems: { title: string; link: string; desc: string; cat: string; slug: string }[] = [];

  for (const p of featured) {
    if (seen.has(p.repo)) continue;
    seen.add(p.repo);
    rawItems.push({
      title: p.name,
      link: `${site}/projects/${p.repo}/`,
      desc: p.desc.replace(/&[a-z]+;/gi, ' '),
      cat: 'Featured',
      slug: p.repo,
    });
  }
  for (const a of liveApps) {
    if (seen.has(a.slug)) continue;
    seen.add(a.slug);
    rawItems.push({
      title: `${a.name} (live)`,
      link: `${site}/projects/${a.slug}/`,
      desc: a.desc.replace(/&[a-z]+;/gi, ' '),
      cat: 'Live App',
      slug: a.slug,
    });
  }
  for (const c of catalog) {
    if (seen.has(c.repo)) continue;
    seen.add(c.repo);
    rawItems.push({
      title: c.name,
      link: `${site}/projects/${c.repo}/`,
      desc: c.desc.replace(/&[a-z]+;/gi, ' '),
      cat: categoryLabels[c.category] ?? c.category,
      slug: c.repo,
    });
  }

  const items = rawItems.map((item) => {
    const itemDate = getItemDate(item.slug);
    return {
      ...item,
      itemDate,
      pubDate: new Date(itemDate).toUTCString(),
    };
  }).sort((a, b) => new Date(b.itemDate).getTime() - new Date(a.itemDate).getTime());

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Matt Parker — Projects</title>
    <link>${site}</link>
    <description>Open-source projects, live web apps, and the full catalog by Matt Parker — ${catalog.length}+ projects across ${Object.keys(categoryLabels).length} categories.</description>
    <language>en-us</language>
    <lastBuildDate>${pubDate}</lastBuildDate>
    <atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml" />
${items
  .map(
    (i) => `    <item>
      <title>${escapeXml(i.title)}</title>
      <link>${escapeXml(i.link)}</link>
      <description>${escapeXml(i.desc)}</description>
      <category>${escapeXml(i.cat)}</category>
      <pubDate>${escapeXml(i.pubDate)}</pubDate>
      <guid isPermaLink="true">${escapeXml(i.link)}</guid>
    </item>`
  )
  .join('\n')}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/rss+xml; charset=UTF-8' },
  });
}
