# Changelog

All notable changes to sysadmindoc.github.io will be documented in this file.

## [v0.13.0] - 2026-04-16

**Remove the `#featured` section — it duplicated Greatest Hits.**

Scrolling down the homepage showed the same story twice: Greatest Hits (8 curated repos with story-driven "why" descriptions) immediately followed by "Case studies worth opening first" (9 featured cards over the same repo slugs). Greatest Hits is the stronger frame.

Removed
- `<section id="featured">` block + its surrounding divider from [src/pages/index.astro](src/pages/index.astro).
- `Featured` entry from the command-palette section list.
- The `Projects` nav link (was pointing to `#featured`; Hits / Catalog / Live cover the same ground).
- `FeaturedCard` import from index.astro.
- [src/components/FeaturedCard.astro](src/components/FeaturedCard.astro) — fully orphaned, deleted.
- `#featuredGrid .pc[data-repo]` freshness-badge block in [public/scripts/main.js](public/scripts/main.js) — had no target after removal.
- `f:` → `/#featured` chord in [public/scripts/cmdk.js](public/scripts/cmdk.js).

Preserved
- The `featured` data array — still powers `heroSignatureProjects` (top-3 hero reel) and the global command-palette project index.
- Every `/projects/<slug>/` detail page — still built via `getStaticPaths()`.
- Greatest Hits section — untouched. It's the primary showcase now.

## [v0.12.2] - 2026-04-16

**Fix Connect-section card layout — description text was wrapping 1–2 words per line.**

- Root cause: `.cnc` cards had `display:flex` from the original v0.4 ruleset at line 317 (horizontal row) and the v0.9.0 override tuned alignment/gap but never added `flex-direction: column`. So `.cnc-top`, `.cnc-desc`, and `.cnc-foot` were trying to sit side-by-side inside the narrow card.
- Fix: added `flex-direction:column` to the v0.9.0 `.cnc` block and changed `justify-content:space-between` → `flex-start` (vertical content doesn't need the push-to-edges behavior). CTA row still sticks to the card base via `.cnc-foot { margin-top:auto }`.

## [v0.12.1] - 2026-04-16

**Remove `Scripts` and `ChanPrep` from the site.**

- `Scripts` dropped from catalog (`ps`).
- `ChanPrep` dropped from catalog (`web`, `live`) and from `liveApps`.
- Dedicated `/projects/Scripts/` and `/projects/ChanPrep/` pages no longer built. Build: 153 → 151 pages.
- `AmazonEnhanced` and `DuplicateFF` from the v0.12.0 pass stay.
- Both repos are still public on GitHub — they just aren't surfaced in the portfolio.

## [v0.12.0] - 2026-04-16

**Close the gap between GitHub repos and site catalog — every public project now has a dedicated page.**

Audit
- Diffed `src/data/projects.ts` against `src/data/_meta.json` (the daily-cron GitHub snapshot). 143 public repos in the cache, 138 were in the catalog. 6 unreferenced: 4 real projects + 2 intentional skips.

Added to catalog
- `AmazonEnhanced` (ext) — Chrome MV3 Amazon cleanup, 20 locales.
- `ChanPrep` (web, live) — in-browser file compressor + converter for 4chan boards, with Catbox upload.
- `DuplicateFF` (guide) — archived reference architecture for a duplicate-file finder.
- `Scripts` (ps) — grab-bag of PowerShell + userscripts.

Added to liveApps
- `ChanPrep` — live GitHub Pages build at `sysadmindoc.github.io/ChanPrep/` (200 OK).

Skipped (intentional)
- `SysAdminDoc` — the profile-README repo (no product content).
- `null` — empty placeholder repo, not a project.

Note: `GeneratorSpecs` is now 404 on the GitHub API (repo private/removed) but the live page at `sysadmindoc.github.io/GeneratorSpecs/` still serves. Kept in the catalog + Healthcare IT track because the working live app is the actual artifact.

Result
- 153 pages built (was 149). Every catalog/liveApp/featured entry resolves to its own `/projects/<slug>/` detail page via the existing `getStaticPaths()` in `src/pages/projects/[slug].astro`.
- `fallbackRepoCount` auto-derives from the arrays, so hero + about stats update without manual edits.

## [v0.11.2] - 2026-04-16

**Correction: the thing dominating the top of project pages was the README outline sidebar, not README Quick Start content.**

- Reverted the v0.11.1 `stripQuickStart()` markdown preprocessor. Quick Start sections are back in the rendered README where they belong.
- Removed the entire README outline sidebar feature instead: `.project-outline`, `.project-outline-nav`, `.project-outline-link`, the outline-aside markup, the scroll-synced active-heading JS, and the hover-to-reveal `.project-heading-anchor` icons tied to it.
- Simplified `.project-readme-layout` — no more `has-outline` grid variant or sticky sidebar at ≥1024px. The README article flows single-column at a comfortable reading width.
- Heading IDs are still generated so in-page anchor links (e.g. `/projects/<slug>/#features`) continue to resolve. The `readmeOutline` build-time array and the `[data-outline-link]` hooks are gone.

## [v0.11.1] - 2026-04-16

**Strip "Quick Start" sections from project-page README rendering.**

- On 8 project pages the README's `## Quick Start` / `### Quick Start` block was dominating the top of the page and duplicating what the GitHub/Live CTAs and Preview section already communicate.
- Added a `stripQuickStart()` markdown preprocessor in `src/pages/projects/[slug].astro` that removes any `Quick Start` heading + all content up to the next same-or-higher-level heading, before the markdown is passed to `marked`. Fence-aware so code blocks inside unrelated sections aren't affected.
- Outline sidebar also cleaned up — Quick Start no longer appears in the auto-generated TOC.
- Affected pages confirmed clean: StreamKeep, Aura, HostsFileGet, OpenCut, ZeusWatch, win11-nvme-driver-patcher, yt_livestream_downloader, npp-sc-scanner. Adjacent sections (Features, Installation, Requirements, etc.) all intact.

## [v0.11.0] - 2026-04-16

**Site claims upgraded from "trust me" to "here are the numbers."** Content pass sourced from a privacy-scrubbed mailbox scan.

Hard numbers replace soft language
- Maven Imaging career card: 10+ PACS migrations led, single largest moved 1M+ files, 54 cross-vendor cloud accounts restored.
- Stack chips expanded: DICOM C-Store, Voyance / VoyanceX, Patient Image Cloud, Rayence DR, Hyper-V, UniFi VPN.
- Period refined to `Feb 2021 — Present`.

International scope surfaced
- About signal "Reach" replaces generic "Experience" label — now calls out clinical support across the Caribbean, East Africa, and East Asia.
- Hero signal reframed as "Scope — 10+ PACS migrations" instead of bare tenure.
- Healthcare IT page swaps the `64k+ Studies` tile for three stronger tiles: `10+ PACS migrations led`, `54 Cloud accounts restored`, `3 continents clinical reach`.

Healthcare track intro
- `curated.ts` `healthcareIT.intro` now leads with concrete outcomes: 10+ PACS migrations, million-file Candelis transfer, 54-account cloud transition, 3-continent clinical support.

Greatest Hits refinement
- `DICOM-PACS-Migrator` why-line upgraded from "64k+ studies" to "1M+ DICOM files when the vendor tool gave up mid-job" — matches the highest-confidence number in the mining data.

About section rewrite
- New "when a vendor tool fails, I write the replacement" framing.
- Surfaces the in-house tooling portfolio (custom DICOM C-Store sender, PC-provisioning kit, acquisition-PC network scanner, service-watcher scripts) on top of the public GitHub archive.

/now update
- `building` list now leads with real current work: cross-border PACS data restoration, DR-panel + handheld X-ray training for a major OEM's field engineers, internal tooling kit.
- `thinking` trimmed: "When 'write the tool yourself' is cheaper than another vendor escalation" replaces the "single-file rule at scale" question.

Privacy
- Mining data moved to `resume/` (gitignored) to keep raw mailbox output out of the public repo.
- No customer/facility names, no PHI, no verbatim internal quotes published. All international references anonymized to continent-level ("Caribbean / East Africa / East Asia").

## [v0.10.0] - 2026-04-16

**Premium-polish UX pass — design tokens, unified focus system, and cross-surface coherence.**

Motion & design tokens
- New `:root` tokens: `--ease-out`, `--ease-spring`, `--ease-in-out`, `--dur-fast/base/slow` for consistent motion. `--selection-bg/--selection-fg` for theme-aware selection. `--focus-ring/--focus-outline` for a unified focus system.
- Replaced scattered hand-coded `.3s ease` / `cubic-bezier(.16,1,.3,1)` with token references across hero, career, catalog, buttons, pulse widget.

Unified focus-ring system
- All interactive elements now use a single recipe: `2px outline` + `3px offset` + (for cards) a soft `box-shadow` halo via `--focus-ring`. Previously drifted between 2px and 3px offsets. Search input / sort select / terminal now include the halo too.

Global selection + scrollbar styling
- New `::selection` rule (brand-green tint) so text highlighting stops using harsh browser defaults. Separate tint for light theme.
- Scrollbars redesigned: 10px track, rounded thumb with padding-box border, hover-intensity state. Firefox `scrollbar-color` set per theme. Feels native on premium OS builds.

Career section upgrade (#career)
- Swapped one-off colors for shared surface/radius/shadow tokens (`--surface-1/2`, `--radius-lg`, `--shadow-soft/strong`).
- Tag pills now pill-shaped with brand tint background (matches rest of site's badge language).
- Highlight bullets upgraded from `▸` to glowing colored dots (green for current role, blue for previous).
- Subtle gradient-border halo on hover (CSS mask trick, no extra DOM), plus spring easing on lift.
- Mobile: tighter spacing, smaller radius, flex-grow signals.

Hero polish
- `.htag` (availability pill) gets a triple-layer glow + backdrop-blur for a premium chip feel.
- Hero signals: hover state (border-strong, lift), surface tokens instead of raw rgba.
- Hero pulse widget: tightened gap, surface-2 background, lift-on-hover, tabular numerics.

Button system
- `.btn`: border-radius 10→12px, letter-spacing tighten, active-press scale, token-driven transitions. Icon micro-translate on hover.
- `.bp` primary: layered shadow with inset sheen line for dimension. Shimmer sweep now eases on `--ease-out`.
- `.bg2` secondary: now uses surface tokens, adapts correctly across themes.

Catalog controls
- Search input + sort select + filter buttons: `min-height: 38–42px` to ensure tap targets. Focus state now includes halo ring. Active filter button has inset ring instead of hard outer glow. Count chip is pill-shaped and tabular.
- Empty state: added magnifying-glass icon, tightened title to "No matches in this slice", refined copy, CTA renamed to "Reset filters".

Skip link
- Premium treatment: larger padding, proper brand shadow, halo ring on focus.

## [v0.9.0] - 2026-04-16

**Portfolio now reflects the real résumé — role, employer, tenure, career history.**

Career section (new)
- New `#career` section between About and Philosophy: three cards (Maven Imaging, ThinkTV, Dayton Technology Group) with role, period, location, summary, highlights, and stack chips.
- Current role card accented green; prior roles accented blue.
- Added to primary nav and command palette (`Career`).
- Source of truth: `careerRoles` array in `src/pages/index.astro`.

Bio refresh
- Hero tagline now leads with "Senior Technical Support Manager & systems administrator with 15+ years" instead of the generic "Senior systems administrator" line.
- Hero signals: Current role (Sr. Tech Support Mgr at Maven Imaging) + Tenure (15+ years) replace the more abstract operational descriptors.
- About copy names the current employer, the ThinkTV / MSP tenure, and calls out which side projects became production tools.
- `about.json` terminal panel adds `employer`, `location`, and `experience_years` keys.

SEO / structured data
- `Base.astro` default title → "Matt Parker — Senior Technical Support Manager & Builder".
- Description expanded with 15+ years + medical imaging (DICOM/PACS) context.
- JSON-LD `Person` now carries `jobTitle: Senior Technical Support Manager`, `worksFor: Maven Imaging`, `address: Sarasota, FL`, expanded `knowsAbout` (DICOM, PACS, Active Directory, Hyper-V, Cisco, HIPAA), and `sameAs` now includes LinkedIn.

Healthcare track
- `healthcareIT.intro` rewritten to name Maven Imaging directly and list the specific PACS/DR work (OpalRad → Candelis, RADinfo cloud, DR panels, DICOM routing, VPN).

/now
- Location updated Florida, USA → Sarasota, FL to match current residence.
- `updated` stamp refreshed to 2026-04-16.

Housekeeping
- `.gitignore`: added `resume/`, `*.docx`, `*.doc`, `*.pdf` patterns to keep personal résumé files from ever reaching the public repo.

## [v0.8.0] - 2026-04-15

**Project pages get real content. ROADMAP priority #1.**

README rendering
- Every project detail page now renders the repo's actual `README.md` — fetched at build time, parsed with `marked` (GFM), sanitized with `sanitize-html`. Relative links and images rewritten to resolve against `raw.githubusercontent.com`.
- Graceful fallback: pages without a cached README drop the section cleanly (no empty shell).
- Bundle bounded — any README >120KB is truncated to prevent pathological cases from inflating the build.

Per-project releases
- Up to 5 recent releases rendered inline per page — tag, date, notes excerpt. Sourced from the existing `_releases.json` cache.

Tech stack chips
- Header chip row now shows inferred stack: repo's primary language (from `_meta.json`) + human-readable category + existing tag list, deduped.

Related projects — ranked
- "Related" now sorts by stars → push freshness (not first-6-of-category). Clamped to 4, archived excluded via catalog curation.

Data layer
- `scripts/fetch-stars.mjs` extended to fetch `/readme` for every public non-fork repo with 8-way concurrency. Writes `src/data/_readmes.json` (gitignored, regenerated in CI). Daily cron picks up README edits automatically.

Styles
- New prose styles for markdown content: headers, code blocks, tables, blockquotes, details/summary. Matches the Catppuccin dark palette already in use.

## [v0.7.0] - 2026-04-15

**Data depth. Tier B from ROADMAP.**

New pages
- **`/releases`** — chronological stream of 71 releases across 40 most-recently-pushed repos, grouped by month. Each entry shows tag, date, first 3 lines of release notes. Auto-refreshed on the daily cron.
- **`/lang/<slug>`** — 7 per-language landing pages (PowerShell, Python, JavaScript, Web Apps, Kotlin/Android, C#/Desktop, Security). Intro copy explaining my *approach* in that ecosystem, stats, and every repo in that category sorted by featured → stars → freshness.
- Skill ring cards on the homepage now link to the matching `/lang/<slug>/` page.

Hero pulse widget
- Replaced the runtime "Active N days ago" text with a static **build-time pulse row**: streak · latest release · last push. Each item is a link (→ /now, → the release on GitHub, → the last-pushed repo). No API calls needed on page load.

Data layer
- `scripts/fetch-stars.mjs` now hits `/repos/<owner>/<repo>/releases` for the 40 most-recently-pushed repos, writes `_releases.json` with tag, timestamp, URL, and a 220-char slice of release notes.
- CI's daily cron will refresh releases automatically alongside stars.

Navigation
- Added Releases link to primary nav; dropped Beyond (still reachable via scroll anchor).

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
