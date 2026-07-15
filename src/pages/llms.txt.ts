import type { APIContext } from 'astro';
import { interiorOgPages } from '../data/interior-og-pages';
import { endpointHeaders } from '../data/endpoint-headers';
import { featured, liveApps, catalog } from '../data/portfolio';
import { LANGS } from './lang/_langs';
import { githubRepoUrl } from '../data/github';

// Curated, AI-readable index following the llms.txt convention (llmstxt.org):
// an H1, a blockquote summary, then sectioned link lists pointing at the
// strongest work and key routes. Generated from the same project data that
// feeds the command palette and RSS so it never drifts.
export async function GET(context: APIContext) {
  const site = context.site?.toString().replace(/\/$/, '') || 'https://sysadmindoc.github.io';
  const clean = (s: string) => s.replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
  const firstSentence = (s: string) => {
    const text = clean(s);
    const [first] = text.split('. ');
    return first.endsWith('.') ? first : `${first}.`;
  };

  const pages = [
    {
      title: 'Portfolio home',
      route: '/',
      description: `${catalog.length} public projects, featured proof, live app previews, stack signals, and the filterable homepage catalog.`,
    },
    ...interiorOgPages.map((page) => ({
      title: page.title,
      route: page.route,
      description: page.description,
    })),
  ];

  const languageLanes = Object.entries(LANGS).map(([slug, lane]) => ({
    title: lane.label,
    route: `/lang/${slug}/`,
    description: firstSentence(lane.intro),
  }));

  const feeds = [
    { title: 'JSON Feed', route: '/feed.json', description: 'JSON Feed 1.1 project feed with absolute icon metadata.' },
    { title: 'Project RSS', route: '/rss.xml', description: 'RSS feed for recent public project activity.' },
    { title: 'Atom', route: '/atom.xml', description: 'Standards-based XML project feed with JSON Feed item parity.' },
    { title: 'Release RSS', route: '/releases.xml', description: 'RSS feed for GitHub release activity across represented projects.' },
  ];

  const machineReadable = [
    { title: 'Project index (JSON)', route: '/projects.json', description: 'Schema-versioned project list with repository, live, image, and freshness URLs.' },
    { title: 'Release index (JSON)', route: '/releases.json', description: 'Schema-versioned release list with project, tag, repository, and release URLs.' },
    { title: 'Resume data (JSON)', route: '/resume.json', description: 'Structured resume data for career, skills, and experience surfaces.' },
    { title: 'Command palette data (JS)', route: '/cmdk-data.js', description: 'Cached project and quick-link data used by the global command palette.' },
    { title: 'Sitemap index', route: '/sitemap-index.xml', description: 'Search-engine sitemap index for generated public routes.' },
    { title: 'llms.txt', route: '/llms.txt', description: 'This AI-readable site map and endpoint inventory.' },
  ];

  const lines: string[] = [];
  lines.push('# Matt Parker — Portfolio');
  lines.push('');
  lines.push(
    '> Senior Technical Support Manager with 15+ years in enterprise IT and systems administration, with recent healthcare technology support across customer systems, hosted workflows, migrations, documentation, vendor coordination, and escalation-heavy troubleshooting. Static, privacy-first site - no analytics, no cookies, no third-party scripts.',
  );
  lines.push('');

  lines.push('## Featured projects');
  for (const p of featured) {
    lines.push(`- [${p.name}](${githubRepoUrl(p.repo)}): ${clean(p.desc)}`);
  }
  lines.push('');

  lines.push('## Live apps');
  for (const a of liveApps) {
    lines.push(`- [${a.name}](${githubRepoUrl(a.slug)}): ${clean(a.desc)}`);
  }
  lines.push('');

  lines.push('## Pages');
  for (const page of pages) {
    lines.push(`- [${page.title}](${site}${page.route}): ${clean(page.description)}`);
  }
  lines.push(`- [Full catalog](${site}/#catalog): All ${catalog.length} public projects with search and filters.`);
  lines.push('');

  lines.push('## Language lanes');
  for (const lane of languageLanes) {
    lines.push(`- [${lane.title}](${site}${lane.route}): ${lane.description}`);
  }
  lines.push('');

  lines.push('## Feeds');
  for (const feed of feeds) {
    lines.push(`- [${feed.title}](${site}${feed.route}): ${feed.description}`);
  }
  lines.push('');

  lines.push('## Machine-readable endpoints');
  for (const endpoint of machineReadable) {
    lines.push(`- [${endpoint.title}](${site}${endpoint.route}): ${endpoint.description}`);
  }
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: endpointHeaders('text/plain; charset=UTF-8'),
  });
}
