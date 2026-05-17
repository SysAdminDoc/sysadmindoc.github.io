# Static Search Decision

Decision date: 2026-05-17

## Decision

Use Pagefind for full-text site search and keep the existing command palette for fast keyboard navigation.

Pagefind is the best fit for this portfolio because it indexes built static HTML after Astro, writes a static bundle under `dist/pagefind`, and does not require hosted search infrastructure. That means rendered project pages, sanitized README excerpts, language tracks, releases, timeline entries, and archive decisions can be searched without maintaining a separate JSON index by hand.

## Comparison

| Option | Fit | Tradeoff |
| --- | --- | --- |
| Pagefind | Best for this repo. It crawls the built static site and emits a static search bundle for GitHub Pages. | Adds a build-time binary wrapper and generated `dist/pagefind` output. |
| MiniSearch | Strong in-memory search engine for browser or Node data that can fit locally. | Would require a custom generated JSON document corpus for project pages and README excerpts. |
| Fuse.js | Useful fuzzy search for small client-side arrays. | The current catalog already covers this shape; scaling to rendered README/page content would require a large custom payload. |
| Lunr.js | Mature browser-side search index. | Would still require a custom index generation pipeline and client payload management. |
| Existing command palette | Best for known project names, categories, routes, and sections. | It does not index rendered README content or arbitrary page copy. |

## Implementation Shape

- `npm run build` runs Astro, then `npm run search:index`.
- `npm run search:index` runs `pagefind --site dist --glob "**/*.html"`.
- `/search/` loads the generated Pagefind Component UI bundle, composes a full-page search from the input, summary, results, and keyboard-hint components, and keeps a no-JS fallback link set.
- The command palette remains available through `Ctrl/Cmd+K` and the nav search button.

## Sources

- Pagefind getting started: https://pagefind.app/docs/
- Pagefind running/index output: https://pagefind.app/docs/running-pagefind/
- Pagefind Component UI: https://pagefind.app/docs/search-ui/
- Pagefind component system: https://pagefind.app/docs/components/
- Pagefind component configuration: https://pagefind.app/docs/components/config/
- MiniSearch: https://github.com/lucaong/minisearch
- Fuse.js: https://www.fusejs.io/
- Lunr.js: https://lunrjs.com/
