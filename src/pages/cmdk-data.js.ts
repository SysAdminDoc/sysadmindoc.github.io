import type { APIContext } from 'astro';
import { cmdkProjects, cmdkQuickLinks } from '../data/cmdk';

// Serve the large, page-independent command-palette dataset as a single cached
// JS file instead of inlining ~44KB into every page's HTML. It merges into
// window.__PORTFOLIO_DATA (the layout inlines only the small page-specific
// `sections`). Loaded before main.js/cmdk.js so the data is available
// synchronously to both the palette and the hero terminal.
export async function GET(_context: APIContext) {
  const payload = JSON.stringify({ allProjects: cmdkProjects, quickLinks: cmdkQuickLinks });
  const body = `window.__PORTFOLIO_DATA=Object.assign(window.__PORTFOLIO_DATA||{},${payload});`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/javascript; charset=UTF-8' },
  });
}
