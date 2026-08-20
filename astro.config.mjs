import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { reviewedInteriorPages } from './src/data/page-freshness.ts';
import { SITE_URL } from './site.config.mjs';

const reviewedDateByRoute = new Map(
  reviewedInteriorPages.map((page) => [page.route, page.lastReviewed]),
);

export default defineConfig({
  // Astro 7.2 hashes each route's module graph and reuses unchanged prerendered
  // output. Measured 2026-08-20: warm `astro build` 7.8s -> 4.8s. Verified safe
  // for this site's build-time data injection — mutating src/data/_stats.json
  // and rebuilding propagated the new value to both /status.json and the
  // rendered /status/ HTML, so the generated JSON caches are part of the key.
  // The cache lives in the gitignored .astro/ directory.
  experimental: { incrementalBuild: true },
  site: SITE_URL,
  integrations: [
    sitemap({
      // Keep machine endpoints (OG images, JSON indexes) out of the page sitemap.
      filter: (page) => !/(\/og\/|\.json$|\.png$)/.test(page),
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
    },
  },
  compressHTML: true,
});
