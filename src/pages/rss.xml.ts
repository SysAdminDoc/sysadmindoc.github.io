import type { APIContext } from 'astro';
import { featured, liveApps } from '../data/projects';

let stats: { lastPushedAt?: string | null; fetchedAt?: string | null } = {};
try {
  const mod = await import('../data/_stats.json');
  stats = (mod.default ?? mod) as typeof stats;
} catch { /* no cache yet */ }

const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);

export async function GET(context: APIContext) {
  const site = context.site?.toString().replace(/\/$/, '') || 'https://sysadmindoc.github.io';
  const pubDate = new Date(stats.fetchedAt || Date.now()).toUTCString();

  const items = [
    ...featured.map((p) => ({
      title: p.name,
      link: `https://github.com/SysAdminDoc/${p.repo}`,
      desc: p.desc.replace(/&[a-z]+;/gi, ' '),
      cat: 'Featured',
    })),
    ...liveApps.map((a) => ({
      title: `${a.name} (live)`,
      link: a.url,
      desc: a.desc.replace(/&[a-z]+;/gi, ' '),
      cat: 'Live App',
    })),
  ];

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
