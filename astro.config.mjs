import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://sysadmindoc.github.io',
  integrations: [
    sitemap({
      // Keep machine endpoints (OG images, JSON indexes) out of the page sitemap.
      filter: (page) => !/(\/og\/|\.json$|\.png$)/.test(page),
      serialize(item) {
        if (item.url === 'https://sysadmindoc.github.io/') {
          item.priority = 1.0;
          item.changefreq = 'weekly';
        } else if (item.url.includes('/projects/')) {
          item.priority = 0.6;
          item.changefreq = 'monthly';
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
    inlineStylesheets: 'auto',
    assets: '_assets',
    concurrency: 1, // marked.use() mutates global state in [slug].astro; parallel builds race
  },
  vite: {
    build: {
      cssMinify: 'lightningcss',
    },
  },
  compressHTML: true,
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  // Upgrade hover-prefetch into Chromium Speculation-Rules prerendering for
  // near-instant navigation (progressive enhancement; ignored in other engines).
  experimental: {
    clientPrerender: true,
  },
});
