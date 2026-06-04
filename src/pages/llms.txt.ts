import type { APIContext } from 'astro';
import { endpointHeaders } from '../data/endpoint-headers';
import { featured, liveApps, catalog } from '../data/portfolio';

// Curated, AI-readable index following the llms.txt convention (llmstxt.org):
// an H1, a blockquote summary, then sectioned link lists pointing at the
// strongest work and key routes. Generated from the same project data that
// feeds the command palette and RSS so it never drifts.
export async function GET(context: APIContext) {
  const site = context.site?.toString().replace(/\/$/, '') || 'https://sysadmindoc.github.io';
  const clean = (s: string) => s.replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();

  const lines: string[] = [];
  lines.push('# Matt Parker — Portfolio');
  lines.push('');
  lines.push(
    '> Senior Technical Support Manager and builder with 15+ years in enterprise IT and six in medical imaging (DICOM/PACS). Open-source projects across PowerShell, Python, JavaScript, Kotlin, C#, and C++. Static, privacy-first site — no analytics, no cookies, no third-party scripts.',
  );
  lines.push('');

  lines.push('## Featured projects');
  for (const p of featured) {
    lines.push(`- [${p.name}](${site}/projects/${p.repo}/): ${clean(p.desc)}`);
  }
  lines.push('');

  lines.push('## Live apps');
  for (const a of liveApps) {
    lines.push(`- [${a.name}](${site}/projects/${a.slug}/): ${clean(a.desc)}`);
  }
  lines.push('');

  lines.push('## Pages');
  lines.push(`- [Now](${site}/now/): Current focus and short-range work queue.`);
  lines.push(`- [Uses](${site}/uses/): Development environment, tools, and conventions.`);
  lines.push(`- [Resume](${site}/resume/): Career summary, skills, and experience.`);
  lines.push(`- [Healthcare IT](${site}/healthcare-it/): Medical-imaging operations and tooling context.`);
  lines.push(`- [Timeline](${site}/timeline/): Year-by-year momentum across releases and pushes.`);
  lines.push(`- [Archive](${site}/archive/): Decisions on retired, held, and superseded projects.`);
  lines.push(`- [Full catalog](${site}/#catalog): All ${catalog.length}+ public projects with search and filters.`);
  lines.push('');

  lines.push('## Feeds');
  lines.push(`- [RSS](${site}/rss.xml): Recent projects feed.`);
  lines.push(`- [Atom](${site}/atom.xml): Standards-based XML project feed.`);
  lines.push(`- [Project index (JSON)](${site}/projects.json): Machine-readable project list.`);
  lines.push(`- [Release index (JSON)](${site}/releases.json): Machine-readable release list.`);
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: endpointHeaders('text/plain; charset=UTF-8'),
  });
}
