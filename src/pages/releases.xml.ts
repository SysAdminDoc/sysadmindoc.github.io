import type { APIContext } from 'astro';
import { endpointHeaders } from '../data/endpoint-headers';
import { featured, liveApps, catalog } from '../data/portfolio';

// Dedicated feed of release EVENTS (distinct from rss.xml, which is a project
// feed). Sourced from the cached _releases.json so followers can subscribe to
// "what just shipped" across the archive.
let releases: { repo: string; tag: string; name: string; publishedAt: string; url: string; bodyFirst: string }[] = [];
try {
  const mod = await import('../data/_releases.json');
  releases = (mod.default ?? mod) as typeof releases;
} catch { /* no cache yet */ }

const nameMap = new Map<string, string>();
for (const p of featured) nameMap.set(p.repo, p.name);
for (const a of liveApps) nameMap.set(a.slug, a.name);
for (const c of catalog) nameMap.set(c.repo, c.name);

const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);

export async function GET(context: APIContext) {
  const site = context.site?.toString().replace(/\/$/, '') || 'https://sysadmindoc.github.io';
  const items = [...releases]
    .filter((r) => r.tag && r.url)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 50);
  const lastBuild = new Date(items[0]?.publishedAt || Date.now()).toUTCString();

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Matt Parker — Releases</title>
    <link>${site}/releases/</link>
    <description>Tagged releases across the public archive by Matt Parker.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${site}/releases.xml" rel="self" type="application/rss+xml" />
${items
  .map((r) => {
    const project = nameMap.get(r.repo) ?? r.repo;
    const title = `${project} ${r.tag}`;
    const desc = r.bodyFirst || r.name || `Release ${r.tag}`;
    return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(r.url)}</link>
      <description>${escapeXml(desc)}</description>
      <category>${escapeXml(project)}</category>
      <pubDate>${escapeXml(new Date(r.publishedAt).toUTCString())}</pubDate>
      <guid isPermaLink="true">${escapeXml(r.url)}</guid>
    </item>`;
  })
  .join('\n')}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: endpointHeaders('application/rss+xml; charset=UTF-8'),
  });
}
