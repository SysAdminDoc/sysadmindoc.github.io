# Changelog

All notable changes to sysadmindoc.github.io will be documented in this file.

## [v0.6.0] - 2026-04-14

**Narrative polish: shape the story, don't just list projects. Tier A + key Tier B from [ROADMAP.md](ROADMAP.md).**

New content surfaces
- **★ Greatest Hits** — 8 curated repos above Featured, each with a one-sentence *why* (impact/story), not *what* (features). Rank badges, category tags, optional star count. Inspired by jvns.ca and leerob.io.
- **Manifesto block** — the 7 rules every project here follows (*Turnkey · Single-file · Dark by default · No confirms · Async · Versioned · Open*). Short, numbered, personality-forward. Inspired by rauno.me and paco.me.
- **Tag cloud with weights** — "Where the work lives" section above Catalog with visual-weight sizes for each category. Clicking jumps to filtered catalog via URL-persisted state. Inspired by simonwillison.net.
- **`/now` page** — current focus, what's shipping, what I'm thinking about, what I'm deliberately *not* working on. Includes live activity pulse (location, last push, streak, repos/stars). Inspired by paco.me and sivers.org.
- **`/healthcare-it` track page** — named arc grouping PACS/DICOM/X-ray/medical-imaging work. The moat vs other sysadmin portfolios. Stats, toolkit grid, "why this track exists" narrative.

Catalog improvements
- **Last-updated age badges** on every catalog card — color-coded: green (<2wk hot), blue (<3mo warm), gray (<1yr cool), dashed (>1yr stale). Hover shows exact date.
- **Honest count** in catalog heading: "All 143 repositories" instead of "All Repositories".
- Nav restructured: new Hits/Now entries, renamed Live/Beyond for density.

Data layer
- `scripts/fetch-stars.mjs` extended to capture `pushed_at`, `updated_at`, primary language per repo → `_meta.json`.
- New aggregates in `_stats.json`: 90-day commit streak, latest release across all repos.
- `src/data/curated.ts` — hand-curated content (greatestHits, manifesto, now, healthcareIT). Edit this file to reshape the story.

## [v0.5.0] - 2026-04-14

**Rich media + power-user polish.**

- **Per-project OG cards** — 139 unique 1200×630 PNGs generated at build via [satori](https://github.com/vercel/satori) + [@resvg/resvg-js](https://github.com/yisibl/resvg-js). Each card shows project name, description, category badge, FEATURED/LIVE flags, and a subtle category-themed gradient. Served at `/og/<slug>.png` and wired into `og:image` / `twitter:image` on every project page.
- **Live app screenshots** — 23 real screenshots captured at 1280×800 via [scripts/capture-screenshots.mjs](scripts/capture-screenshots.mjs). Used as:
  - The hero preview on each `/projects/<slug>/` page (with live-open hover badge)
  - The LIVE card thumbnail on the homepage (replaces rate-limited opengraph.githubassets.com)
- **Vim-style keyboard nav** — press `g` followed by `f`/`l`/`c`/`s`/`a`/`p`/`j`/`b`/`n` to jump to Featured / Live / Catalog / Skills / About / Philosophy / Journey / Beyond / Connect. Live hint overlay. Existing `Ctrl+K` and `/` still work.
- **Footer freshness badge** — "Stats refreshed N days ago" with pulsing green dot, derived from `_stats.fetchedAt` (auto-refreshed by the daily CI cron).
- **Footer RSS link** — prominent link to `/rss.xml` added.
- **Manifest.json** — icons now reference `/favicon.svg` instead of the old data-URI.

## [v0.4.0] - 2026-04-14

**Audit-driven polish pass. 22 findings addressed across security, accessibility, UX, perf, and capabilities.**

**Security / accessibility**
- XSS: repo names from GitHub API activity feed no longer `innerHTML`-injected
- XSS: terminal `echo` output now escaped
- Focus indicators now visible across all interactive elements (WCAG 2.4.7)
- Skip link slides into view on focus (WCAG 2.4.1)
- Filter buttons expose `aria-pressed` for screen readers
- Activity ticker duplicate DOM marked `aria-hidden` to prevent double-announcement

**UX / behavior**
- **Command palette** (Ctrl/Cmd+K or `/`): fuzzy search across all projects, jump to sections, keyboard-navigable
- **Light theme toggle**: persists to localStorage, respects `prefers-color-scheme`
- **URL-persisted filter state**: `?cat=py&q=nvme` is shareable and hydrates on reload
- **Catalog search highlights** matched substrings with `<mark>`
- Build-time stats flicker fixed: client-side update skipped when baked value matches
- Terminal logo fixed (was `href="#"` jumping to top on body click)
- Mobile: push-chip ticker no longer overflows viewport
- Mobile: catalog now 2-column at 640px
- Mobile: hero meta row wraps cleanly at 375px

**Performance**
- Google Fonts made non-render-blocking via `preload`+`onload` swap (saves ~300ms FCP)
- LIVE preview images specify `width`/`height` to prevent CLS
- LIVE preview fallback gradient when opengraph.githubassets.com 429s
- `content-visibility:auto` on catalog (below-the-fold paint skip)
- Service worker properly hands off api.github.com to fetch (was returning undefined)
- Skill ring `IntersectionObserver` now `disconnect()`s when done

**New capabilities**
- **Per-project pages** (`/projects/<slug>`): 138 static pages, one per repo, with category, tags, GitHub link, live-demo link, star count, related projects
- **RSS feed** at `/rss.xml` for featured + live apps
- **Real favicon** (animated cursor SVG)
- Language donut de-dupes "Other" bucket (was showing twice)

**Misc**
- sw.js cache version bumped to `portfolio-v4`

## [v0.3.1] - 2026-04-14

- Auto-update all stats at build time — totalRepos, totalStars now injected from `_stats.json`
- Hero `statRepos`/`statStars`, about section, philosophy, journey all use live counts
- Removed hardcoded `134` sentinels

## [v0.3.0] - 2026-04-14

**Major: Astro 5 migration**

- Migrated single-file HTML (~1916 lines, 200KB) to Astro 5 static site
- Data layer: all projects now live in `src/data/projects.ts` — single source of truth
- Componentized: FeaturedCard, LiveCard, CatalogEntry, SkillCard, Divider, StarSvg
- Build-time GitHub API: star counts baked into static HTML (no runtime rate limits)
- GitHub Actions CI/CD: auto-deploy on push + daily cron to refresh stars
- Category filter counts, statLive, and stat badges now auto-compute from data
- Preserved `legacy.html` as full backup of pre-Astro single-file site
- CSS extracted to `src/styles/global.css`, JS to `public/scripts/main.js`
- sw.js cache version bumped to `portfolio-v3`
- All paths updated, Lighthouse-friendly output with Astro `compressHTML`

## [v0.2.1] - 2026-04-14

- Changed: Live Apps section reduced to canonical 23-app list, reordered to match portfolio priority
- Removed: NukeMap, MHTMLens, LogLens, CronScope from live showcase (still reachable via catalog)
- Added: GeneratorSpecs to live showcase
- Fixed: VIPTrack link now points to `/?filter=vip` default view
- Changed: statLive hero count 26 to 23

## [v0.2.0] - 2026-04-13

- Removed: 11 private/archived repos from catalog (bypassnro, Start-Menu-Manager, Mavenwinutil, uScriptStash, DiggSuite, gSearchTweaks, ScrollJumper, HNCC, DarkReaderLocal, NextDNSPanel, NeonNote)
- Added: Astra-Deck (featured + catalog), Discrub, StreamKeep, GifText to catalog
- Added: 13 missing live web apps (NukeMap, GifStudio, ClipForge, ConvertFlow, IconForge, Base64Converter, ImageXpert, MHTMLens, LogLens, CronScope, NATO_PHONETIC_TRAINING, RadAtlas, ChanPrep)
- Changed: Live Apps count 13 to 26
- Changed: Updated all category filter counts

## [v0.1.0] - %Y->- (HEAD -> main, origin/main, origin/HEAD)

- Added: Add DuplicateFF to portfolio catalog (unarchived)
- Added: Add 15 missing repos to portfolio catalog
- 10 creative enhancements: conic-gradient card borders, recently pushed ribbon, PWA manifest + service worker, animated avatar ring, color-tinted section backgrounds, button ripple, scroll milestone celebrations, animated SVG wave dividers, resource hints, footer build ticker
- 10 creative enhancements: language donut chart, film grain overlay, card spotlight effect, commit freshness badges, prefers-reduced-motion, URL hash sync, click-to-copy terminal, GitHub streak counter, typewriter headings, deferred particle init
- 10 improvements: nav auto-hide, consolidated API chain, aggressive caching, loading skeletons, bento orphan fix, HD video thumbs, JSON-LD schema, keyboard video play, mobile optimization, dead CSS cleanup
- 9 visual improvements: bento grid, skill rings, avatar, thumbnails, gradient hero, scroll bar, section glows, starred repos, now-building status
- Removed: Remove heatmap chart, keep last-active indicator
- 10 site improvements: SEO, performance, accessibility, UX
- Fixed: Fix stale fallback values missed in update
- Changed: Update portfolio: 108 → 134+ repos, add 17 new projects, remove 5 deleted
