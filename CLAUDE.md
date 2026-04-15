# sysadmindoc.github.io v0.4.0

## Overview
Personal portfolio and project showcase site, deployed to GitHub Pages.

## Tech Stack
- **Astro 5** static site generator (migrated from single-file HTML in v0.3.0)
- **TypeScript** for the data layer
- **Zero runtime JS frameworks** — vanilla JS (`public/scripts/main.js`) for all client interactivity
- **lightningcss** for CSS minification
- **GitHub Actions** for build + deploy (with daily cron to refresh stars)

## Build / Run
```bash
npm install
npm run fetch-stars    # refreshes src/data/_stars.json (needs network)
npm run dev            # Astro dev server on :4321
npm run build          # → dist/
npm run preview        # serve dist/
```

No build step needed to edit content — just edit `src/data/projects.ts`.

## Key Files
- `src/pages/index.astro` — main landing page, imports components + data
- `src/data/projects.ts` — **single source of truth** for all featured/live/catalog/skill entries
- `src/data/types.ts` — TS interfaces
- `src/data/_stars.json` — star counts from fetch-stars.mjs (gitignored, regenerated at build)
- `src/components/` — repeating-element components (FeaturedCard, LiveCard, CatalogEntry, SkillCard, Divider, StarSvg)
- `src/layouts/Base.astro` — HTML shell with meta/OG/schema
- `src/styles/global.css` — all CSS (extracted from legacy single-file)
- `public/scripts/main.js` — all client JS (particles, scroll, search/filter, stars, terminal)
- `public/` — og.png, manifest.json, sw.js, robots.txt (passthrough assets)
- `scripts/fetch-stars.mjs` — paginated GitHub API star fetcher (build-time)
- `scripts/generate-data.mjs` — one-off migration helper (JSON → projects.ts)
- `.github/workflows/deploy.yml` — CI: fetch stars, build, deploy to Pages (triggered on push + daily cron)
- `legacy.html` — **full backup** of the pre-Astro single-file site (200KB HTML)

## Architecture
- **Hero**: Animated terminal, live repo/star counts from GitHub API (client), last-active indicator
- **Featured**: 9-card bento grid, star counts baked in at build
- **Live Apps**: 23 GitHub Pages apps with LIVE badges
- **Catalog**: 138 repos, client-side search/sort/filter (counts auto-derived from data)
- **Skills**: 8 animated ring charts
- **About**: Bio + JSON terminal
- **Philosophy**: 4 principle cards
- **Journey**: 5-step timeline
- **Beyond Code**: 4 drone videos, Slunder music with 6 albums + Spotify embed
- **Connect**: GitHub link

## Data Editing Workflow
To add a project:
1. Open `src/data/projects.ts`
2. Add to the right array (featured/liveApps/catalog)
3. Commit + push → CI auto-deploys

Category filter counts, statLive, and stat badges all auto-compute from the data.

## Categories (data-f attribute)
`ps` (PowerShell) | `py` (Python) | `web` (Web Apps) | `ext` (Extensions) | `kt` (Android/Kotlin) | `sec` (Security) | `media` (Media) | `cs` (Desktop/C#) | `guide` (Guides) | `fork` (Forks) | `other`

## Gotchas
- Featured entries auto-get star counts from `_stars.json`; if a repo isn't in the fetch-stars response (private/archived/fork), `--` is shown until JS fetches live
- `src/scripts/main.js` doesn't exist — it lives at `public/scripts/main.js` so it's served verbatim without Vite bundling (preserves `document.write` + globals)
- sw.js cache name bumped to `portfolio-v3` on migration; any user with old SW gets fresh content
- `legacy.html` is the pre-migration single-file reference. Do not delete until v3 is battle-tested in production

## Version History
- **v0.4.0** (2026-04-14) — Audit-driven polish: XSS fixes, WCAG compliance, Ctrl+K command palette, light theme, per-project pages (138 static routes), RSS feed, real favicon, URL-persisted filters, search highlighting, font preload, CLS fixes, SW bug fix.
- **v0.3.1** (2026-04-14) — Auto-updating stats at build time
- **v0.3.0** (2026-04-14) — Astro 5 migration. Data-driven content, componentized, build-time star fetching, CI/CD, daily star refresh. Single-file HTML preserved as legacy.html.
- **v0.2.1** (2026-04-14) — Live section synced to canonical 23-app list, VIPTrack ?filter=vip
- **v0.2.0** (2026-04-13) — Live apps expansion, catalog cleanup
- **v0.1.0** — Initial single-file HTML portfolio

## Status
- Version: v0.3.0
- Last updated: 2026-04-14
- Branch: v3-astro (merge to main after visual parity verified in production)
