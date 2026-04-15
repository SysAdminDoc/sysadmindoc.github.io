import type { APIContext } from 'astro';
import { featured, liveApps } from '../data/projects';

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

  const items = [
    ...featured.map((p) => ({
      title: p.name,
      link: `${site}/projects/${p.repo}/`,
      desc: p.desc.replace(/&[a-z]+;/gi, ' '),
      cat: 'Featured',
      slug: p.repo,
    })),
    ...liveApps.map((a) => ({
      title: `${a.name} (live)`,
      link: `${site}/projects/${a.slug}/`,
      desc: a.desc.replace(/&[a-z]+;/gi, ' '),
      cat: 'Live App',
      slug: a.slug,
    })),
  ].map((item) => {
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
    <description>Featured open-source projects and live web apps by Matt Parker.</description>
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
      <guid isPermaLink="false">${escapeXml(i.link)}</guid>
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
