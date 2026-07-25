import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { reviewedInteriorPages } from './src/data/page-freshness.ts';

const reviewedDateByRoute = new Map(
  reviewedInteriorPages.map((page) => [page.route, page.lastReviewed]),
);

export default defineConfig({
  site: 'https://sysadmindoc.github.io',
  integrations: [
    sitemap({
      // Keep machine endpoints (OG images, JSON indexes) out of the page sitemap.
      filter: (page) => !/(\/og\/|\.json$|\.png$)/.test(page),
      serialize(item) {
        const reviewedDate = reviewedDateByRoute.get(new URL(item.url).pathname);
        if (reviewedDate) {
          item.lastmod = new Date(`${reviewedDate}T00:00:00Z`);
        }
        if (item.url === 'https://sysadmindoc.github.io/') {
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
