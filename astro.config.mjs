import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://sysadmindoc.github.io',
  integrations: [sitemap()],
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
});
