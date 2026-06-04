import type { APIContext } from 'astro';
import sanitizeHtml from 'sanitize-html';
import { featured, liveApps, catalog } from '../data/portfolio';
import { categoryLabels } from '../data/categories';
import { endpointHeaders } from '../data/endpoint-headers';

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
const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);

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
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const updated = new Date(items[0]?.date || Date.now()).toISOString();

  const entries = items
    .map((item) => {
      const link = `${site}/projects/${item.slug}/`;
      const date = new Date(item.date).toISOString();
      const description = cleanDesc(item.desc);
      const contentHtml = sanitizeHtml(
        `<p>${item.desc}</p><p><a href="${link}">View ${item.title} on the portfolio</a></p>`,
        { allowedTags: ['p', 'a', 'strong', 'em', 'code'], allowedAttributes: { a: ['href'] } },
      );
      return `  <entry>
    <title>${escapeXml(item.title)}</title>
    <link href="${escapeXml(link)}" />
    <id>${escapeXml(link)}</id>
    <updated>${escapeXml(date)}</updated>
    <category term="${escapeXml(item.cat)}" />
    <summary type="text">${escapeXml(description)}</summary>
    <content type="html">${escapeXml(contentHtml)}</content>
  </entry>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en-US">
  <title>Matt Parker - Projects</title>
  <subtitle>Open-source projects, live web apps, and the full catalog by Matt Parker.</subtitle>
  <link href="${site}/" />
  <link href="${site}/atom.xml" rel="self" type="application/atom+xml" />
  <id>${site}/</id>
  <updated>${escapeXml(updated)}</updated>
  <author>
    <name>Matt Parker</name>
    <uri>https://github.com/SysAdminDoc</uri>
  </author>
  <logo>${site}/icon-512.png</logo>
${entries}
</feed>
`;

  return new Response(body, {
    headers: endpointHeaders('application/atom+xml; charset=UTF-8'),
  });
}
