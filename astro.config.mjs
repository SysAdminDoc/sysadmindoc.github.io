import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { reviewedInteriorPages } from './src/data/page-freshness.ts';
import { SITE_URL } from './site.config.mjs';
import { buildCspHeaderValue } from './scripts/lib/csp-header.mjs';
import { CSS_BROWSER_TARGETS, LIGHTNINGCSS_EXCLUDE } from './scripts/lib/minify-css.mjs';

const reviewedDateByRoute = new Map(
  reviewedInteriorPages.map((page) => [page.route, page.lastReviewed]),
);

// The Playwright preview sends the CSP response header the live server sends
// (tests/playwright/preview-server.mjs sets the flag). Without it the service
// worker runs under no policy at all locally, because a worker's CSP comes only
// from its own script's response headers. Only the preview asks: a build loads
// this file before dist/ exists.
const productionPreviewHeaders = process.env.PORTFOLIO_PREVIEW_PRODUCTION_HEADERS === '1'
  ? { 'Content-Security-Policy': buildCspHeaderValue(fileURLToPath(new URL('./dist/', import.meta.url))) }
  : null;

export default defineConfig({
  site: SITE_URL,
  integrations: [
    sitemap({
      // Keep machine endpoints (OG images, JSON indexes) and the contact form's
      // thank-you page out of the page sitemap.
      filter: (page) => !/(\/og\/|\.json$|\.png$|\/contact\/)/.test(page),
      serialize(item) {
        const reviewedDate = reviewedDateByRoute.get(new URL(item.url).pathname);
        if (reviewedDate) {
          item.lastmod = new Date(`${reviewedDate}T00:00:00Z`);
        }
        if (item.url === `${SITE_URL}/`) {
          item.priority = 1.0;
          item.changefreq = 'weekly';
        } else if (item.url.includes('/lang/')) {
          item.priority = 0.7;
          item.changefreq = 'monthly';
        } else {
          item.priority = 0.8;
          item.changefreq = 'weekly';
        }
        return item;
      },
    }),
  ],
  output: 'static',
  build: {
    inlineStylesheets: 'never',
    assets: '_assets',
  },
  vite: {
    build: {
      cssMinify: 'lightningcss',
      // Without targets lightningcss adds no prefixes, and it keeps only the
      // last of a property and its -webkit- twin, so Chromium lost every
      // backdrop blur. scripts/lib/minify-css.mjs explains both settings; the
      // inlined critical CSS is minified with the same ones.
      cssTarget: [...CSS_BROWSER_TARGETS],
    },
    css: {
      lightningcss: { exclude: LIGHTNINGCSS_EXCLUDE },
    },
  },
  compressHTML: true,
  ...(productionPreviewHeaders && { server: { headers: productionPreviewHeaders } }),
});
