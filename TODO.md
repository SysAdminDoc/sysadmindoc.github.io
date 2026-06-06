# TODO — Single Source of Truth

> **This is the consolidated open-work list.** It merges and de-duplicates the v0.18.0 audit (formerly in [ROADMAP.md](ROADMAP.md)) and the net-new research opportunities (formerly in [RESEARCH_FEATURE_PLAN.md](RESEARCH_FEATURE_PLAN.md)). Those two files are retained as **evidence/rationale archives** — full "Why/Evidence/Verify" detail lives there, keyed by the IDs below (`R…` = roadmap item, `NF-…` = research-plan item).
>
> Completed work moves to [COMPLETED.md](COMPLETED.md) and is summarized in [CHANGELOG.md](CHANGELOG.md). Do not re-add shipped items here.
>
> Last consolidated: 2026-06-04 · Baseline: `npm test`, `npm run check`, `npm run build`, and `npm run a11y:audit` green.

Legend: `[ ]` open · `[x]` done this cycle · S/M/L complexity · sources in parentheses.

---

## Already shipped (verified during consolidation — see COMPLETED.md)
- [x] robots.txt with sitemap reference (R/NF) — `public/robots.txt` exists.
- [x] Divider infinite-animation / `will-change` perf (R) — `a534de0`, now `animation-play-state` gated on `.dv.vis`.
- [x] Catalog view slices for New / Recently updated / Has download (SysAdminDoc profile ROADMAP NF6) — shipped v0.18.2 with URL-backed `view=` state and browser verification.
- [x] Profile feed-backed catalog rendering (SysAdminDoc profile ROADMAP P1) — shipped v0.18.3 with raw GitHub feed sync, suppressed-row exclusion, local fallback/overlays, and browser verification.

---

## P0 — Trust & correctness (do first)
- [x] **T1** Fix contribution-streak algorithm (NF-1, S) — strict consecutive-day walk from latest push; 0 when latest push >1 day old. Accept: unit test passes; `_stats.json` recomputed.
- [x] **T2** `forced-colors` / Windows High Contrast support (NF-28, M) — `@media (forced-colors: active)` block: outline focus, bordered controls, hidden decoration. Accept: controls visible under emulated forced-colors.
- [x] **T3** Automated a11y gate — axe-core WCAG 2.2 AA (NF-33, M) — `scripts/audit-a11y.mjs` + `a11y:audit` script; advisory in CI. Accept: `npm run a11y:audit` runs, exit-codes on violations.

## P1 — High-value features, SEO/AEO, resilience, CI
### Features / content
- [x] **T4** Contact/hire funnel — email + LinkedIn in Connect + footer (NF-8 + R LinkedIn, S). Accept: working mailto/LinkedIn surfaced; hero pill scrolls to #connect.
- [x] **T5** Render dead `featured` content (NF-2, M) — surface authored desc/tags beyond hero reel, or prune. Accept: no orphaned authored data.
- [x] **T6** Build-time language-donut fallback (NF-6, M) — bake language mix from `_meta.json`; JS enhances. Accept: donut renders with JS disabled.
- [x] **T7** Data-layer test runner — `node:test` (NF-12, M) — cover streak/cosine/release-trim/getUtcDayKey; wire `npm test`. Accept: `npm test` green; CI step.
### SEO / AEO
- [x] **T8** `/llms.txt` build endpoint (NF-27, S) — curated markdown index from projects data; reference in robots.txt.
- [x] **T9** BreadcrumbList JSON-LD on project/lang/interior pages (R, M).
- [x] **T10** Connected `@graph`: ProfilePage + CollectionPage/ItemList + Person `@id` linking (R + NF-29, M); CollectionPage on lang lanes.
- [x] **T11** Enrich project `SoftwareSourceCode` JSON-LD: image/dateModified/keywords (NF-24, S).
- [x] **T12** `experimental.clientPrerender` (Speculation Rules) (R + NF-32, S).
- [x] **T13** Sitemap config: lastmod/priority/changefreq + exclude json/og routes (NF, M).
### Performance
- [x] **T14** Extract 44KB inline `__PORTFOLIO_DATA` to external JSON (R, M).
- [x] **T15** Gate film-grain overlay behind capability media query (R, S).
- [x] **T16** Split / non-block monolithic CSS (R, L) — `Base.astro` now inlines first-viewport `critical.css`, preloads the hashed `global.css` asset, loads it through a print-media swap, and keeps a `noscript` stylesheet fallback.
### Accessibility
- [x] **T17** Wrap CSS scroll-driven animations in `prefers-reduced-motion` guard (R, S).
- [x] **T18** Accessible labels + aria-live on hero stat counters (R, S).
- [x] **T19** Command-palette listbox ARIA: `<a role=option>` → valid pattern (R, M).
### Nav / content
- [x] **T20** Remove duplicate InteriorNav `/#catalog` link (R, S).
- [x] **T21** Add `/uses/` + `/resume/` to InteriorNav + homepage footer (R, S).
### Build / CI / docs
- [x] **T22** Deduplicate pre-build validation in deploy.yml (R, S).
- [x] **T23** Finish TS-AST helper migration to `scripts/lib/` (R, M).
- [x] **T24** Sync `package-lock.json` version → 0.17.0 (R, S).
- [x] **T25** PR build gate — `ci.yml` on `pull_request` (NF-36, S).
- [x] **T26** Doc/version reconciliation: CHANGELOG v0.17.0, CLAUDE.md Astro 6 + CSS size, version strings (NF, S).
- [x] **T27** Lighthouse CI advisory budget (NF-34, M) — `lighthouserc.cjs` samples homepage and project-detail routes, applies advisory Lighthouse/category/resource budgets, stores filesystem reports, and PR CI uploads them without blocking the job.
- [x] **T28** Migrate `public/` raster art → `astro:assets <Picture>` AVIF/srcset (NF-22, L) — Live Apps card thumbnails now have tracked `src/assets/screenshots/thumbs/` inputs rendered through Astro `<Picture>` with AVIF/WebP/srcset and JPEG fallback; public screenshot/thumb URLs remain for API/project-detail compatibility.

## P2 — Depth, polish, hardening
### Features
- [x] **T29** Live Apps overview + status a11y text (NF-5, M).
- [x] **T30** Case-study teasers on homepage Greatest Hits (NF-3, S).
- [x] **T31** Resolve "music/Slunder" broken promise — static cards or remove copy (NF-4, M) *(privacy decision)*.
- [x] **T32** Terminal history + Tab completion (NF-16, S).
- [x] **T33** Conditional GitHub requests (ETag→304) (NF-18, M).
- [x] **T34** SW stale-while-revalidate navigation (NF-20, M).
- [x] **T35** Pagefind facets/metadata (NF-26, M) — `/search/` now runs Pagefind in faceted mode and renders the official `<pagefind-filter-pane>` with an open Category filter, preserving static Pagefind results and README excerpt search.
- [x] **T36** Build-time project ranking signal (NF-13, M) — default catalog order now uses a deterministic build-time blend of stars, 180-day freshness decay, and release-download activity; project-page related links use the same rank map, with explicit star/name/recent sorts preserved.
### Data / scripts
- [x] **T37** fetch-stars atomic writes + integrity checks + release-body fallback (R + NF-11, M).
- [x] **T38** `@astrojs/rss` migration + content:encoded (NF-25, M).
- [x] **T39** Content-drift + featured⊆catalog validator extensions (NF-14/15, S).
### SEO/feeds
- [x] **T40** Dedicated releases feed `/releases.xml` (NF-9, S).
- [x] **T41** README code syntax highlighting (Shiki) (NF-23, M).
  - Done: Project README rendering now uses `src/data/readme-rendering.mjs`, a dedicated `Marked` instance, `sanitize-html`, and Shiki `github-dark-default` tokenization for common README fence languages. Shiki token colors are converted to fixed CSS classes in `global.css`; sanitized README output keeps `pre`/`code`/`span` classes but does not allow README-sourced `style` or event-handler attributes.
  - Verify: `node --check src/data/readme-rendering.mjs`; `npm test`; `npm run check`; `npm run build`; generated HTML probe on `dist/projects/UserScriptHunt/index.html` found 8 README code blocks, 18 Shiki token spans, and 0 README article style/event attributes; `npm run a11y:audit`; `npm audit --omit=dev`; `npm run csp:audit`; Browser preview on `http://127.0.0.1:4321/projects/UserScriptHunt/#project-readme` found 2 highlighted Shiki blocks, 2 plain fallback blocks, visible token colors, 0 horizontal overflow, 0 README style/event attributes, and 0 console errors.
- [x] **T42** OG images for interior pages (R, M).
  - Done: Added `src/data/interior-og-pages.ts` as the shared interior-page social-card registry and generalized `src/pages/og/[slug].png.ts` so the existing Satori/Resvg endpoint emits differentiated 1200x630 PNG cards for `/uses/`, `/resume/`, `/search/`, `/timeline/`, `/archive/`, `/now/`, `/healthcare-it/`, and `/releases/` while preserving project OG routes. Each routed page now passes its generated `ogImage` and `ogImageAlt` through `Base`.
  - Verify: `npm test` includes interior OG source-contract coverage; `npm run images:audit` now checks the eight interior slugs, route metadata wiring, and project-slug collision guard; full build generated `dist/og/{uses,resume,search,timeline,archive,now,healthcare-it,releases}.png`; PNG probes confirmed 1200x630 output; visual inspection covered `dist/og/search.png` and `dist/og/healthcare-it.png`; Browser preview verified `/search/` and `/healthcare-it/` publish the new absolute OG/Twitter image URLs, return `image/png` 200 for their PNG routes, have no horizontal overflow, and emit no console warnings/errors.
- [x] **T43** Last-updated timestamps on /uses, /resume, /healthcare-it (R, S).
  - Done: Added `src/data/page-freshness.ts` as the shared `lastReviewed` source for the three target interior pages. `/uses/`, `/resume/`, and `/healthcare-it/` now render visible `Last updated` timestamps from that data and emit reviewed `WebPage` JSON-LD with `dateModified`, `isPartOf`, `about`, and `reviewedBy` references.
  - Verify: `npm test` covers the freshness data and page source wiring; `schema:audit` now treats `/uses/`, `/resume/`, and `/healthcare-it/` as representative routes and requires parseable `WebPage.dateModified`; Browser preview verified visible timestamps and matching built JSON-LD dateModified values.
### Security / privacy
- [x] **T44** Remove dns-prefetch for www.youtube.com (R, S).
- [x] **T45** Escape star count innerHTML in catalog badge (R, S).
- [x] **T46** Verify/clean i.scdn.co preconnect (R, S).
- [x] **T47** Strip Google Fonts/analytics from docs/archive/legacy.html (R, S).
- [x] **T48** Cross-origin SW cache TTL (R, M).
- [x] **T49** `.well-known/security.txt` + `humans.txt` (NF, S).
### Accessibility (P2 cluster)
- [x] **T50** Section `aria-labelledby` on homepage (R, S).
- [x] **T51** Heatmap zero/future cells aria-hidden + enrich streak/peak (R + NF-7, S).
- [x] **T52** Journey cards whole-card link / remove dead focus CSS (R + improvement, S).
- [x] **T53** Interior footer `div`→`nav` landmark (R, S).
- [x] **T54** Remove duplicate catalog aria-live (R, S).
- [x] **T55** Visible labels for catalog form controls (R, S).
- [x] **T56** Mobile-nav focus-trap tab order (R, S).
- [x] **T57** Terminal a11y: role=log, keystroke gating, copy keyboard, video close (R + NF-17, M).
- [x] **T58** Theme toggle respects prefers-color-scheme first visit + fix misleading comment (R, S).
### Nav / content (P2 cluster)
- [x] **T59** 404 page footer (R, S).
- [x] **T60** Healthcare-IT empty-state (R, S).
- [x] **T61** Expand homepage footer nav (R, S).
- [x] **T62** Extract shared career data (R, M) *(prereq for JSON Resume)*.
- [x] **T63** InteriorNav active state for /uses, /resume, /healthcare-it (R, S).
- [x] **T64** Clarify ThinkTV/Maven date overlap (R, S) — added "Concurrent with the start of the Maven Imaging role." note to ThinkTV (career card + resume).
- [x] **T65** Resume contact info (R, S) *(folds into T4 data)*.
- [x] **T66** SectionJumpNav on releases + Timeline cross-link (R, S).
- [x] **T67** Verify TagCloud quick-pick filter activation (R, S).
### Build/CI (P2 cluster)
- [x] **T68** `sw:stamp` → ESM script (R, S).
- [x] **T69** `.nvmrc` + engines field (R, S).
- [x] **T70** Add `.claude/` to .gitignore (R, S).
- [x] **T71** `semantic:audit` in quality-gates.yml (R, S).
- [x] **T72** README layout-tree refresh (R, S) *(folds into T26)*.
### Perf (P2 cluster)
- [x] **T73** shared.js in SW precache (R, S).
- [x] **T74** Gate JS scroll-reveal observer vs CSS (R + improvement, S).
- [x] **T75** GitHub API cache TTL increase / metered skip (R, S).
- [x] **T76** Bound non-essential infinite CSS animations (R, S).
- [x] **T77** font-display:optional for JetBrains Mono (R, S).
- [x] **T78** Remove duplicate `.skip-link` CSS (R, S).
- [x] **T79** content-visibility:auto below-fold (R, M).
  - Done: Reintroduced `content-visibility:auto` behind `@supports` for ten homepage sections below the first follow-up surface: `#live`, `#volume`, `#catalog`, `#skills`, `#about`, `#career`, `#philosophy`, `#journey`, `#beyond`, and `#connect`. Each section has a per-section `--cv-intrinsic-size` fallback; print output disables containment; `#hero` and `#greatest-hits` intentionally stay eager.
  - Verify: `npm test` covers the CSS contract; `npm run check`; `npm run build`; headless Chrome CDP probe verified desktop/mobile homepage identity, computed containment styles, nonblank sections after explicit fast scroll, no horizontal overflow, clean console logs, and screenshots under `%TEMP%\sysadmindoc-t79`; local `npm run audit:perf` passed with bfcache restored and no overflow.
- [x] **T80** INP hygiene on cmdk keystroke filter (NF-30, M).
- [x] **T81** accent-color token (NF-31, S).
- [x] **T82** Cache-shape contract types `generated.d.ts` (NF, S).

## P3 — Nice-to-have
- [x] **T83** JSON Resume export `/resume.json` + optional PDF (NF-10, M).
- [x] **T84** Custom PWA install prompt (NF-19, M).
- [x] **T85** localStorage resilience / in-memory fallback (NF-21, S).
- [x] **T86** manifest launch_handler/id/scope (NF, S).
- [x] **T87** JSON Feed `/feed.json` (NF, S).
- [x] **T88** client-local "recently viewed" (NF, M).
- [x] **T89** Pin GitHub Actions to SHAs (NF-36, S).
- [x] **T90** Resolve unused `cpp` category (R, S).
- [x] **T91** Dependabot labels (R, S).
- [x] **T92** deploy.yml cancel-in-progress:true (R, S).
- [x] **T93** Document Playwright optional dep (R, S).
- [x] **T94** data-refresh.yml lightweight health probe (R, S).
- [x] **T95** Migrate inline scripts off CSP `unsafe-inline` (R, L).
  - Done: Removed `script-src 'unsafe-inline'` from the active CSP and externalized the seven executable inline/script-handler surfaces named by T135: first-paint theme/init plus async stylesheet media swap, page-specific command-palette section hydration, section jump navigation, recent-project tracking, Pagefind query bootstrap, resume printing, and timeline filtering.
  - Implementation: `public/scripts/head-init.js` runs synchronously in `<head>` for no-FOUC theme selection and the global stylesheet media swap; route helpers live in `public/scripts/section-jump-nav.js`, `project-page.js`, `search-page.js`, `resume.js`, and `timeline.js`; page-specific command-palette sections now render as inert `application/json` and are merged by `public/scripts/cmdk.js`.
  - Verify: `npm run csp:audit` reports zero executable inline scripts, zero inline event handlers, seven JSON-LD/data script blocks, and active `script-src 'self'`; strict candidate mode with `script-src 'self'` passes. `npm test`, `npm run check`, `npm run build`, `npm run a11y:audit`, `npm run audit:perf -- --base http://127.0.0.1:4322 --strict --lcp 60000 --event 500 --out .tmp/perf-t95.json`, source/built HTML inline-script probes, and a focused Chrome CDP route interaction probe passed.

---

## Post-v0.18.0 research (2026-06-02) — see [RESEARCH_2026-06-02.md](RESEARCH_2026-06-02.md) for full evidence

- [x] **T96** P0 — homepage interactivity dead (main.js ran before shared.js → ReferenceError). Fixed v0.18.1: main.js homepage-only after shared.js + build guard + SW cache bump. **Verified live.**
- [x] **T97** P1 — above-the-fold proof strip of quantified outcomes from proof.ts (NF-A1).
  - Done: Homepage hero now imports `projectProof` and renders a first-viewport `hero-proof-strip` with source-backed quantified outcomes for the NVMe driver path, Network Security Auditor, and NovaCut. The strip links to the corresponding project pages, exposes proof source text through labels/titles, and has matching critical/full CSS with stable desktop and mobile layouts.
  - Verify: `npm test`; `npm run check`; `npm run build`; `npm run a11y:audit`; Browser preview at `http://127.0.0.1:4326/` showed the body order `hn -> hero-proof-strip -> hr -> hd`, proof strip bottom at 465px in a 720px viewport, no horizontal overflow, no console errors, and proof-link navigation to `/projects/NovaCut/`; `npm run audit:perf -- --base http://127.0.0.1:4326 --out .tmp/perf-t97.json` passed Home mobile at 390px with LCP 696ms, CLS 0, bfcache yes, and no horizontal overflow.
- [x] **T98** P1 — page-level JSON-LD on the 8 interior routes (ProfilePage on /resume etc.) (NF-A2).
  - Done: `src/data/page-freshness.ts` now acts as the shared page-level schema registry for `/uses/`, `/resume/`, `/search/`, `/timeline/`, `/archive/`, `/now/`, `/healthcare-it/`, and `/releases/`. Each route emits reviewed page-level JSON-LD with `dateModified`, stable `@id`s, `isPartOf`, `about`, and `reviewedBy`; `/resume/` also emits `ProfilePage` with `mainEntity`, `/search/` emits `SearchResultsPage`, archive/timeline/releases emit `CollectionPage`, and `/healthcare-it/` emits `AboutPage`. Visible `Last updated` rows remain scoped to `/uses/`, `/resume/`, and `/healthcare-it/`.
  - Verify: `npm test`; `npm run csp:audit`; `node scripts/audit-csp.mjs --candidate-script-src "'self'" --strict`; `npm run check`; `npm run build`; `npm run a11y:audit`; `rtk git diff --check`. The rendered schema audit now checks 11 representative routes, including all eight interior routes, and the CSP audit classifies 12 JSON-LD/data script blocks with zero executable inline scripts and zero inline event handlers.
- [x] **T99** P1 — SoftwareApplication node + license/datePublished for live-app project pages (NF-A3).
  - Done: Project pages now emit stable `SoftwareSourceCode` `@id`s with generated `datePublished` and SPDX `license` when `_meta.json` has `createdAt` and `licenseSpdx`. Live-app project pages also emit a linked `SoftwareApplication` node with `operatingSystem: "Web"`, category-derived `applicationCategory`, `isAccessibleForFree: true`, free `Offer` pricing in USD, matching license/date fields, and a `targetProduct` link from source code to the live app node. `fetch-stars` now captures `createdAt` and normalized `licenseSpdx`; generated fixtures and fixture validation cover the new metadata contract.
  - Verify: `node --check scripts/fetch-stars.mjs`; `node --check scripts/install-generated-fixtures.mjs`; `node --check scripts/audit-schema.mjs`; `npm run generated:fixtures:check`; unauthenticated `npm run fetch-stars` refreshed local ignored `_meta.json` with `createdAt`/`licenseSpdx`; `npm test`; `npm run check`; `npm run build`; direct rendered JSON-LD probe on `/projects/StormviewRadar/` found `SoftwareApplication`, price `0` USD, MIT SPDX license, matching `datePublished`, and source `targetProduct`; `npm run a11y:audit`; `rtk git diff --check`. The rendered schema audit now parses 386 JSON-LD blocks, 787 graph nodes, and 12 representative routes including source-only and live-app project samples.
- [x] **T100** P1 — Greatest Hits case-study coverage 3/8 → parity + validator (IMP-4).
  - Done: Expanded `projectProof` so all 8 Greatest Hits entries have source-backed case-study blocks. Added case studies for `UniversalConverterX`, `HostShield`, `OpenCut`, `project-nomad-desktop`, and `Astra-Deck`, then extended `npm run data:validate` to parse `greatestHits`, validate required fields, require a matching proof record, and fail if any Greatest Hits repo lacks a `caseStudy` with context, decisions, and outcomes.
  - Verify: `node --check scripts/validate-project-data.mjs`; `npm run data:validate` reported 9 proof records and Greatest Hits case studies 8/8; `npm test`; `npm run check`; `npm run build`; direct built HTML probe found 8 homepage Greatest Hits case-study badges and Case Study/Key Decisions/Outcomes sections on all five newly filled project pages; `npm run a11y:audit`; `npm run csp:audit`; `rtk git diff --check`.
- [x] **T101** P1 — reconcile hero "176+" vs catalog "181" headline count (IMP-1).
  - Done: Homepage public project counts now use the rendered catalog count (`catalog.length`) as the single visible source of truth instead of `_stats.totalRepos`. Hero stats, journey/about/philosophy copy, about JSON, catalog filter totals, `/projects.json`, and `/cmdk-data.js` now align with the active profile-feed-backed catalog count. The live GitHub refresh still updates stars and per-card metadata, but it preserves the rendered catalog count instead of replacing it with the raw public non-fork repo API total.
  - Verify: `node --check public/scripts/main.js`; `npm test`; `npm run data:validate`; `npm run check`; `npm run build`; direct built HTML/JSON probe confirmed `projects.json`, `cmdk-data.js`, hero `statRepos`, catalog `countAll`, `aboutRepos`, and `aboutReposText` all report 177 with no stale `176+` or `181 public projects` copy; Browser plugin fresh-tab attach failed, so `npm run audit:perf -- --base http://127.0.0.1:4327 --strict --lcp 60000 --event 500 --out .tmp/perf-t101.json` supplied headless Chrome/CDP rendered verification with all route samples passing bfcache, overflow, CLS, and console checks.
- [x] **T102** P1 — critical-CSS inline for hero (the real mobile-LCP lever, NOT @layer) + re-baseline stale PERFORMANCE_AUDIT.md (v0.16.12). Done with T16; 2026-06-04 audit shows mobile homepage LCP 668ms.
- [x] **T103** P1 — forced-colors gap: SVG data-viz (heatmap/donut/skill rings) unreadable in WHCM.
  - Done: Forced-colors overrides now map the heatmap cells/month labels, heatmap legend swatches, language donut segments/legend markers, and skill-ring foreground/background strokes to system palette colors with visible boundaries and readable labels.
  - Verify: `npm run build`; `npm run forced-colors:audit` passed with desktop and mobile heatmap cells, donut segments, and skill rings visibly painted under emulated `forced-colors: active`.
- [x] **T104** P2 — CI gate stubs empty data; commit src/data/_fixtures and render real shapes pre-merge.
  - Research note: After the T118/T126 passes, PR CI still starts from ad hoc `{}` / `[]` generated-cache stubs before `npm run check` and `npm run build:ci`; keep this item focused on schema-valid fixture caches that exercise profile feed, README cache, release rows, ranking, and rendered JSON-LD with realistic shapes instead of adding another empty-stub variant.
  - Done: Superseded by T137. PR CI now installs audited schema-valid generated-data fixtures instead of writing empty inline stubs.
- [x] **T105** P2 — promote a11y audit to blocking --strict subset; mirror test + a11y into deploy.yml.
  - Done: `npm run a11y:audit` now runs `scripts/audit-a11y.mjs --strict` and fails on the conservative static HTML rule subset; `npm run a11y:audit:advisory` remains available for inventory-only local runs. PR CI no longer swallows a11y failures, and `deploy.yml` now runs `npm test` plus the strict a11y audit before uploading the Pages artifact.
  - Verify: `node --check scripts/audit-a11y.mjs`; `npm test` includes workflow/source-contract coverage; `npm run a11y:audit`; `npm run a11y:audit:advisory`; `npm run check`; `npm run build`; fresh-build `npm run a11y:audit`; `rtk git diff --check`.
- [x] **T106** P2 — axe-core/Playwright a11y job + Playwright visual-regression baselines for future visual-regression-sensitive CSS/image changes.
  - Done: Added `@axe-core/playwright` and `@playwright/test`, `playwright.audits.config.mjs`, and `tests/playwright/portfolio-audits.spec.mjs`. The suite serves built `dist/`, runs axe over `/`, `/search/?q=python`, `/archive/`, and `/projects/project-nomad-desktop/`, exercises hydrated command-palette and terminal states, and compares desktop/mobile viewport baselines for those four routes. PR CI now installs Chromium, runs `npm run audit:playwright` after the strict static a11y gate, and uploads Playwright reports on every run.
  - Follow-up fix: The new axe pass caught a serious `target-size` violation on the hydrated terminal input; `.term-input-line` and `.term-input` now use 32px minimum target height in both critical and full CSS.
  - Verify: `node --check playwright.audits.config.mjs`; `node --check tests/playwright/portfolio-audits.spec.mjs`; `npm test`; `npm run generated:fixtures`; `PROFILE_PROJECTS_OFFLINE=1 npm run check`; `npm run build:ci`; local `npm run audit:playwright:update` passed 14/14; Docker `mcr.microsoft.com/playwright:v1.60.0-noble` regenerated Linux baselines and then `npm run audit:playwright` passed 14/14; baseline PNG probe confirmed 8 screenshots at 1365x900 or 390x900 with nonblank variance; contact-sheet visual inspection passed.
- [x] **T107** P2 — README TOC + reading-time on project pages (heading IDs already generated, orphaned) (NF-A4).
  - Done: `src/data/readme-rendering.mjs` now returns sanitized README HTML plus heading outline and reading-time metadata while preserving the existing HTML-only wrapper. Project pages render a compact README summary, word count, and collapsible Contents block when a cached README has 3+ headings; tracked generated-data fixtures now include a nested `project-nomad-desktop` README outline so PR-CI renders the real TOC branch.
  - Verify: `node --check src/data/readme-rendering.mjs`; `node --check test/readme-rendering.test.mjs`; `npm run generated:fixtures`; `npm test`; `PROFILE_PROJECTS_OFFLINE=1 npm run check`; `npm run build:ci`; built HTML probe confirmed `project-nomad-desktop` renders `1 min read`, `70 words`, `4 sections`, matching `href="#offline-use"`/`id="offline-use"` anchors, and no TOC on short `OpenCut`; `npm run a11y:audit`; local Windows Playwright axe passed and visual baselines differed from Linux snapshots as expected; Docker `mcr.microsoft.com/playwright:v1.60.0-noble` ran generated fixtures, offline check, `build:ci`, and `npm run audit:playwright` with 14/14 passing.
- [x] **T108** P2 — homepage SectionJumpNav (reuse existing component + cmdkSections) (NF-A5).
  - Done: Homepage now renders the shared `SectionJumpNav` immediately after the hero from the existing `cmdkSections` data. The section map was reordered to match homepage DOM order, gained `Project Mix` / `#volume`, and still keeps `/search/` plus `/archive/` as command-palette entries while `SectionJumpNav` filters non-fragment links out of the in-page nav.
  - Follow-up fix: Scoped the fixed top navigation CSS from bare `nav` selectors to `#nav` in both `critical.css` and `global.css`, so semantic section/footer/interior navs stay in normal flow.
  - Verify: `npm test`; `PROFILE_PROJECTS_OFFLINE=1 npm run check`; `npm run build:ci`; built homepage probe found 11 in-page section links, `#volume`, and no `/search/` or `/archive/` jump buttons; `npm run a11y:audit`; node_repl Playwright screenshot confirmed the homepage jump nav is static/in-flow with 11 links and no horizontal overflow; Docker `mcr.microsoft.com/playwright:v1.60.0-noble` ran generated fixtures, offline check, `build:ci`, `audit:playwright:update`, and `audit:playwright` with 14/14 passing.
- [x] **T109** P2 — iOS PWA install path (NF-A6) + prefers-contrast block; drop/deprioritize WebSite SearchAction (NF-A7) unless there is a non-Google consumer, because Google removed the sitelinks search box feature in November 2024.
  - Done: `Base.astro` now emits standalone-capable mobile/Apple web app metadata, and the homepage PWA install prompt handles both Chromium `beforeinstallprompt` and iOS Safari manual install guidance (`Share`, `Add to Home Screen`, `Open as Web App`, `Add`). `critical.css` and `global.css` now include `@media(prefers-contrast:more)` token/surface overrides for stronger text, borders, focus halos, cards, jump links, install/update toasts, and the fixed top nav.
  - Decision: Do not add `WebSite` `SearchAction` only for Google sitelinks. Google Search Central says the sitelinks search box visual was removed globally starting 2024-11-21; the existing base `WebSite` node remains for supported site-name semantics, and `test/pwa-contrast.test.mjs` guards against adding `SearchAction` / `potentialAction` without a new non-Google consumer.
  - Verify: Official docs checked: Google Search Central sitelinks removal, Apple iPhone Add to Home Screen instructions, Apple Safari web app metadata, and MDN `prefers-contrast` / `forced-colors`; `node --check public/scripts/main.js`; `npm test` (45 tests); `$env:PROFILE_PROJECTS_OFFLINE='1'; npm run check`; `npm run build:ci`; `npm run a11y:audit`; `npm run forced-colors:audit`; `git diff --check`; local Playwright iPhone/Safari + `prefers-contrast: more` probe confirmed the `ios-install` toast, Add to Home Screen/Open as Web App copy, Apple metadata, strong contrast nav border, and 0 mobile overflow.
- [x] **T110** P2 — language-donut population parity (build vs JS flicker) (IMP-2) + skill rings vs real distribution (IMP-3).
  - Done: `/cmdk-data.js` project rows now carry primary language metadata from `_meta.json`, and the hydrated homepage language donut reads the rendered portfolio project set before falling back to raw GitHub language counts. The raw fallback denominator now sums language counts instead of assuming the public repo count matches the chart population.
  - Done: Skill rings now derive from rendered catalog lane counts through `src/data/skill-metrics.mjs`; skill cards expose the derived lane count and catalog percent in visible copy and an SVG ring `aria-label`, with ring targets scaled against the largest rendered lane.
  - Verify: `node --check public/scripts/main.js`; `npm test` (47 tests); `$env:PROFILE_PROJECTS_OFFLINE='1'; npm run check`; `npm run build:ci`; `npm run a11y:audit`; `npm run forced-colors:audit`; `git diff --check`; local Playwright bad-cache probe confirmed a deliberately wrong cached `gh_cache.langs` payload did not replace the rendered portfolio donut, 16/16 rendered projects had language data, skill stats/ring targets matched lane counts, and mobile overflow stayed 0; official Docker/Linux `mcr.microsoft.com/playwright:v1.60.0-noble` ran generated fixtures, offline check, `build:ci`, and `audit:playwright` with 14/14 passing.
- [x] **T111** P2 — root-cause Astro 6 `</html>` emission now that Astro 6.4.4 is on `main` (compressHTML bisect); convert `fix-html-structure` to assert-or-noop on a fixed Astro version.
  - Done: Root cause traced to the older layout emitting JSON-LD between `</head>` and `<body>`; commit `b4b39bf` moved that JSON-LD to the top of `<body>` while adding the repair script. Re-ran both fixture-backed and live profile-feed builds on current Astro 6.4.4 with `compressHTML:true`; both emitted valid `</body></html>` order and `fix-html-structure` repaired 0 files. The old 194-file repair note is stale against the current layout/build output.
  - Done: Converted `scripts/fix-html-structure.mjs` into a default no-write verifier that fails on early `</html>`, missing final `</html>`, or homepage script-order regressions. An explicit `--repair` mode remains only for legacy-output recovery, and `--dist` supports isolated test/audit directories.
  - Verify: `node --check scripts/fix-html-structure.mjs`; `node --test test/html-structure.test.mjs`; `node scripts/fix-html-structure.mjs` scanned 194 files and repaired 0; non-offline `npm run profile-feed:sync && npx astro build && node scripts/fix-html-structure.mjs` rendered 177 profile projects / 194 pages and repaired 0; `npm test` (51 tests); `$env:PROFILE_PROJECTS_OFFLINE='1'; npm run check`; `npm run build:ci` passed with verifier output `verify OK; scanned 194 file(s); repaired 0 file(s); script order OK`.
- [x] **T112** P3 — cluster: terminal contact/uses/theme cmds; `/atom.xml`; catalog no-JS `<form>`; minify public JS; `llms.txt` completeness; Beyond Code enrich + CLAUDE.md sync; `style-src` `unsafe-inline` follow-up; catalog DOM-size budget gate.
  - [x] Terminal `contact`, `uses`, and `theme` commands.
    - Done: Homepage terminal help now advertises `contact`, `uses`, and `theme light|dark|toggle`. `contact` jumps to `#connect` and reveals below-fold `content-visibility:auto` sections before scrolling so deep sections land accurately; the section observer temporarily suppresses hash rewrites during terminal-driven jumps. `uses` routes to `/uses/`, and `theme` delegates to the existing theme toggle so labels, meta color, and `theme-pref` persistence stay centralized.
    - Verify: `node --check public/scripts/main.js`; `node --test test/terminal-commands.test.mjs`; `npm run build:ci`; headless browser probes confirmed `contact` ends at `#connect` with visible Connect geometry, `uses` navigates to `/uses/`, `theme light` persists `theme-pref=light`, console warnings/errors stay empty, and horizontal overflow stays 0.
  - [x] `/atom.xml`.
    - Done: Added an Atom 1.0 project feed at `/atom.xml`, advertised it from Base alternate links and `llms.txt`, precached it beside `/rss.xml`, and extended endpoint, feed, smoke, and source-contract audits to validate Atom discovery, cache/content type policy, item-count parity with JSON Feed, self-link metadata, entry URLs, dates, and content.
    - Verify: `node --check src/pages/atom.xml.ts`; `node --check scripts/audit-feed.mjs`; `node --check scripts/audit-public-endpoints.mjs`; `node --check scripts/smoke-live-site.mjs`; `node --test test/atom-feed.test.mjs`.
  - [x] Catalog no-JS `<form>`.
    - Done: The homepage catalog search is now a real `GET` form targeting `/search/` with the query field named `q`. JavaScript intercepts submit for in-page filtering and immediately syncs the current input value before applying filters; no-JS users get a `<noscript>` submit button that lands on `/search/?q=...`.
    - Verify: `node --check public/scripts/main.js`; `node --test test/catalog-noscript-form.test.mjs`; `npm test`; `$env:PROFILE_PROJECTS_OFFLINE='1'; npm run check`; `npm run build:ci`; `npm run a11y:audit`; `git diff --check`; local Playwright fallback checks after the in-app Browser attach timed out confirmed JS submit stays on `/` with URL-backed `q=` state and no console warnings, while JavaScript-disabled submit navigates to `/search/?q=python` with no horizontal overflow.
  - [x] Minify public JS.
    - Done: Added `scripts/minify-public-scripts.mjs` and wired `npm run scripts:minify` into `build:ci` after Astro copies `public/scripts` into `dist/scripts`. The minifier uses esbuild syntax/whitespace minification only, preserving identifier names so cross-file globals stay stable while source files remain readable. Current built output shrinks 10 scripts from 93.3 KB to 69.6 KB.
    - Verify: `node --check scripts/minify-public-scripts.mjs`; `node --test test/public-script-minify.test.mjs`; `npm run scripts:minify`; `npm test`; `$env:PROFILE_PROJECTS_OFFLINE='1'; npm run check`; `npm run build:ci`; minified `dist/scripts/*.js` parse check; `npm run a11y:audit`; `git diff --check`; local Playwright fallback smoke after the in-app Browser attach timed out confirmed minified home/search/project/resume/timeline routes loaded without console warnings, framework overlays, or horizontal overflow; homepage catalog search, theme toggle, command palette, and timeline filter interactions worked.
  - [x] `llms.txt` completeness.
    - Done: Expanded `/llms.txt` into a fuller AI-readable site map generated from shared project/page data. It now covers featured projects, live apps, reviewed pages from `interiorOgPages`, exact-count catalog access, language lanes from `LANGS`, feed endpoints, and machine-readable endpoint routes including `resume.json`, `cmdk-data.js`, sitemap, and self-link. The public endpoint audit now requires the expanded sections, required URLs, exact catalog count copy, and at least 50 useful links.
    - Verify: `node --check scripts/audit-public-endpoints.mjs`; `node --test test/llms-completeness.test.mjs`; `node --test test/atom-feed.test.mjs`; `npm run build:ci` passed with `llms.txt links: 59`.
  - [x] Beyond Code enrich + CLAUDE.md sync.
    - Done: Added a static Beyond Code overview row above the drone videos using the existing `beyond-card` styles. The cards summarize the 4 click-to-play aerial clips, route music-generation context to the internal `/projects/SlunderStudio/` page, and document the lightweight media boundary without restoring the removed Spotify iframe/embed. Homepage hash restoration now reveals contained below-fold sections and repeats the fragment scroll so direct `/#beyond` and section-jump links survive late catalog rendering. Synced the ignored local `CLAUDE.md` architecture notes to the current Beyond Code behavior and source-size counts.
    - Verify: `node --test test/beyond-code.test.mjs`; `node --check public/scripts/main.js`; `npm test`; `$env:PROFILE_PROJECTS_OFFLINE='1'; npm run check`; `npm run build:ci`; `npm run a11y:audit`; `git diff --check`; browser smoke for `/#beyond`, responsive Beyond cards, and the SlunderStudio card link.
  - [x] `style-src` `unsafe-inline` follow-up.
    - Done: Extended `scripts/audit-csp.mjs` with `--candidate-style-src` and `--dist` modes, added `npm run csp:audit:style` and `npm run csp:audit:dist`, and regression-tested the current style-side posture. The active policy still keeps `style-src 'unsafe-inline'`; source candidate mode reports 31 blockers, and built `dist/` candidate mode reports 1,012 rendered inline style surfaces, so removal is now explicitly gated instead of implied by script-side CSP hardening.
    - Verify: `node --check scripts/audit-csp.mjs`; `npm run csp:audit`; `npm run csp:audit:style`; `npm run csp:audit:dist`; `node scripts/audit-csp.mjs --dist --candidate-style-src "'self'"`; `node --test test/csp-audit.test.mjs`.
  - [x] Catalog DOM-size budget gate.
    - Done: Added `scripts/audit-dom-size.mjs`, exposed it as `npm run dom:audit`, and wired it into `build:ci` after feed auditing and before service-worker stamping. The gate compares the rendered homepage catalog against `dist/projects.json` and enforces bounded homepage HTML, catalog section bytes, catalog card count, total catalog DOM nodes, average/max card nodes, and average/max card bytes.
    - Current budget: homepage HTML 391.1 KB / 450.0 KB, catalog section 224.2 KB / 260.0 KB, catalog cards 177 / 220, catalog DOM nodes 2037 / 2300, average card nodes 11.13 / 13, max card nodes 16 / 18, average card bytes 1.2 KB / 1.5 KB, max card bytes 2.1 KB / 2.5 KB.
    - Verify: `node --check scripts/audit-dom-size.mjs`; `npm run dom:audit`; `node --test test/dom-size-budget.test.mjs test/public-script-minify.test.mjs`.

---

## 🔬 Researcher Queue (Cycle 1 — 2026-06-04) — see [docs/research-2026-06-04-cycle-1.md](docs/research-2026-06-04-cycle-1.md)

- [x] **T113** 🤖 P0 — Restore v0.18.3 deploy by generating the profile-feed cache before Astro type checks.
  - Why: `main` currently contains v0.18.3 source, but the latest GitHub Pages deploy failed before build, leaving the public site on v0.18.2 artifacts.
  - Evidence: Deploy run `26941334995` failed at `npx astro check` with `src/data/portfolio.ts:60:28 Cannot find module './_profile-projects.json'`; `.github/workflows/deploy.yml:35-57` runs `data:validate`, `fetch-stars`, then `npx astro check`/`build:ci`, while `package.json:12-15` only runs `profile-feed:sync` in local `build`/`check`; live `https://sysadmindoc.github.io/sw.js` still says `portfolio-v0.18.2` and live `projects.json` has `profileFeedUrl: null`.
  - Touches: `.github/workflows/deploy.yml`; possibly `src/data/generated.d.ts`, a committed fixture, or a CI-only cache-generation/stub policy.
  - Done: `deploy.yml` now runs `npm run profile-feed:sync` after `fetch-stars` and before `npx astro check`, matching the local `npm run check` setup path.
  - Verify: `npm run check`; post-push `Deploy portfolio` run on `main`; `Invoke-WebRequest https://sysadmindoc.github.io/sw.js`; `Invoke-RestMethod https://sysadmindoc.github.io/projects.json`.

- [x] **T114** 🤖 P1 — Make `npm test` explicit and current-working-directory safe.
  - Why: The bare `node --test` script can silently test the wrong directory when npm is invoked from an unsafe Windows UNC context, producing a false green build signal.
  - Evidence: `package.json:18` is `"test": "node --test"`; Node's test runner discovers files from its active working directory when no explicit glob is supplied; on this machine, running npm directly from a raw UNC shared-folder checkout fell back to `C:\Windows` and executed unrelated Windows tests, while a directory-aware invocation from the repo root ran the 12 repo tests correctly.
  - Touches: `package.json`; optionally a small `scripts/ensure-project-cwd.mjs` guard or an explicit `node --test "test/**/*.test.mjs"` pattern.
  - Done: `npm test` now runs `scripts/ensure-project-cwd.mjs` before an explicit `node --test "test/**/*.test.mjs"` target.
  - Verify: Valid repo run still reports 12 tests; running `scripts/ensure-project-cwd.mjs` from `C:\Windows` fails fast instead of allowing ambient discovery.

- [x] **T115** 🤖 P2 — Document or guard the Windows/VMware shared-folder build workflow.
  - Why: The repository can be edited from the VMware shared folder, but local npm/Astro execution from that path is unreliable enough to confuse validation and build triage.
  - Evidence: Direct npm execution from the raw UNC path produced the Windows UNC current-directory fallback; temporary `cmd pushd` mapping fixed smaller scripts, but `npm run build` from the mapped shared-folder path failed in Vite/Astro with a corrupted path like `Z:\repos\sysadmindoc.github.io\ Folders\repos\sysadmindoc.github.io\src\pages\404.astro`.
  - Touches: `README.md`, `CLAUDE.md`, or `PROJECT_CONTEXT.md`; optionally a non-invasive script guard that warns when `process.cwd()` is a VMware shared-folder/mapped-drive path.
  - Done: `README.md` and `PROJECT_CONTEXT.md` now document the safe local-build workflow: edit through a shared folder if needed, but run npm/Astro validation from a normal local clone/worktree path.
  - Verify: Follow the documented local path workflow and run `npm test`, `npm run check`, and `npm run build`; the T114 cwd guard documents/fails the raw UNC fallback mode.

- [x] **T116** 🤖 P2 — Resolve the dev-only `yaml` advisory in the Astro check dependency chain.
  - Why: Production dependency audit is clean, but the full dev audit still reports five moderate vulnerabilities through the type-checking stack, which will keep audit-driven workflows noisy.
  - Evidence: `npm audit --omit=dev --audit-level=high` returned 0 vulnerabilities; `npm audit --audit-level=moderate` reported `GHSA-48c2-rrv3-qjmp` because `@astrojs/check@0.9.9 -> @astrojs/language-server@2.16.8 -> volar-service-yaml@0.0.70 -> yaml-language-server@1.20.0 -> yaml@2.7.1`; GitHub Advisory says `yaml` is patched at `2.8.3`; `yaml-language-server@1.23.0` depends on `yaml@2.8.3`, but current `volar-service-yaml` pins `~1.20.0`.
  - Touches: `package.json`, `package-lock.json`; possibly an npm override or a wait-for-upstream note if the override conflicts with Astro language-server behavior.
  - Done: Added an npm override so `yaml-language-server` resolves nested `yaml` to patched `2.8.3` without downgrading `@astrojs/check`.
  - Verify: `npm run check`; `npm audit --audit-level=moderate`; `npm ls yaml @astrojs/check @astrojs/language-server yaml-language-server volar-service-yaml`.

---

## 🔬 Researcher Queue (Cycle 2 — 2026-06-04) — see [docs/research-2026-06-04-cycle-2.md](docs/research-2026-06-04-cycle-2.md)

- [x] **T117** 🤖 P1 — Make the scheduled GitHub data health check exercise the profile-feed path.
  - Why: v0.18.3 moved the catalog to the external profile feed, but the daily data-health workflow still only refreshes GitHub stars/metadata, so it no longer exercises the full production data path it claims to cover.
  - Evidence: `.github/workflows/deploy.yml:42-45` now runs `fetch-stars` and `profile-feed:sync`; `.github/workflows/data-refresh.yml:8-13` says the scheduled job exercises the exact production data path, but `.github/workflows/data-refresh.yml:39-43` runs only `fetch-stars` before `data:summary`; live `/projects.json` now reports `source.profileFeedUrl = https://raw.githubusercontent.com/SysAdminDoc/SysAdminDoc/main/projects.json`.
  - Touches: `.github/workflows/data-refresh.yml`, `scripts/summarize-generated-data.mjs`, possibly `scripts/sync-profile-feed.mjs` output/schema.
  - Done: `data-refresh.yml` now runs `npm run profile-feed:sync`, and `data:summary` reports/gates profile-feed active/fallback state, source URL, source-generated timestamp, cache-refreshed timestamp, cache age, portfolio project count, and suppressed upstream rows.
  - Verify: Local `npm run fetch-stars && npm run profile-feed:sync && npm run data:summary -- --out .tmp/data-refresh-t117 --max-age-hours 36 --fail-on-stale` passed with profile feed status `active`, cache age 0h, 177 portfolio projects, and all profile-feed checks green. Manual workflow_dispatch run `26956410354` passed on `ab7cb90` and its uploaded summary artifact showed the same profile-feed fields/checks.

- [x] **T118** 🤖 P2 — Add README-cache refresh quality signals to the generated data summary.
  - Why: Project detail pages and semantic search depend on cached README text, but the health summary only checks that the README cache is non-empty; stale preserved entries, miss spikes, or rate-limit fallback can pass silently.
  - Evidence: `scripts/fetch-stars.mjs:288-338` preserves existing README cache entries when no token, read misses, or rate-limit fallback occur; `scripts/summarize-generated-data.mjs:71-95` only checks `readmeEntries > 0`; project detail pages import `_readmes.json` at `src/pages/projects/[slug].astro:65-71`, and semantic indexing weights cached README text at `scripts/audit-semantic-index.mjs:108-115`.
  - Touches: `scripts/fetch-stars.mjs`, `scripts/summarize-generated-data.mjs`, `src/data/generated.d.ts`; possibly `PROJECT_CONTEXT.md` for the generated-data contract.
  - Done: `fetch-stars` now writes ignored `_readme-refresh.json` telemetry alongside `_readmes.json`, preserving the existing repo-to-markdown README cache shape for page and semantic consumers. `data:summary` now emits a README Refresh section in `summary.md`/`summary.json` with attempted, refreshed, miss, preserved, unattempted, missing, cache coverage, miss-rate, rate-limit, skipped, and failure-sample fields, plus integrity checks for telemetry presence, schema, cache-entry parity, rate-limit avoidance, token-backed full-attempt coverage, broad cache coverage, and miss-rate bounds.
  - Acceptance: The generated summary records README refresh attempts, successes, misses, preserved-cache count, and rate-limit status; deploy/data-health summaries make stale or degraded README refresh visible instead of only reporting total entries.
  - Verify: No-token `npm run fetch-stars` preserved 167 cached READMEs and `npm run data:summary -- --out .tmp/data-refresh-t118-no-token --max-age-hours 36 --fail-on-stale` reported README Refresh status `skipped`, target repos 176, coverage 94.9%, and no rate limit. Token-backed `npm run fetch-stars` via `gh auth token` refreshed 175 of 176 READMEs, recorded the one `IMDb_Enhanced` 404 miss, and `npm run data:summary -- --out .tmp/data-refresh-t118-token --max-age-hours 36 --fail-on-stale` reported status `fresh`, attempted 176, miss rate 0.6%, coverage 99.4%, and all README refresh checks passing. `npm test`; `npm run check`; `npm run build`; `npm run a11y:audit`.

- [x] **T119** 🤖 P2 — Add a post-deploy live artifact smoke check.
  - Why: The v0.18.3 deploy failure was caught before publish, but release confidence still depends on manual checks that live `sw.js` and `projects.json` reflect the just-built source after Pages deployment.
  - Evidence: `.github/workflows/deploy.yml:65-74` ends after `actions/deploy-pages`; manual checks verified `https://sysadmindoc.github.io/sw.js` changed to `portfolio-v0.18.3` and live `/projects.json` became profile-feed backed with 177 projects after T113/T114 landed; Cycle 5 live probes also confirmed `/releases.json` has 60 releases, `/feed.json` has 177 JSON Feed items, and `/sitemap-index.xml` returns 200 after deploy run `26956526605`; GitHub's Pages deploy action exposes the deployed `page_url` for follow-up checks.
  - Touches: `.github/workflows/deploy.yml`; optionally `scripts/smoke-live-site.mjs`.
  - Done: Added `scripts/smoke-live-site.mjs` and `npm run smoke:live`. The script can emit the expected live contract from built `dist` and can retry live checks against a Pages URL. `deploy.yml` now captures package version, project count, release count, and feed item count after `build:ci`, then runs the live smoke after `actions/deploy-pages` against `steps.deployment.outputs.page_url`.
  - Acceptance: A post-deploy job fetches the deployed Pages URL and asserts the service worker cache version matches `package.json`, `/projects.json` has `source.profileFeedUrl` and a non-zero/expected project count, `/releases.json` has `schemaVersion` and release count, `/feed.json` has JSON Feed 1.1 shape and item count, and `/sitemap-index.xml` returns 200.
  - Verify: `node scripts/smoke-live-site.mjs --emit-contract --dist dist` reported version `0.18.3`, 177 projects, 60 releases, and 177 feed items. `npm run smoke:live -- --base-url https://sysadmindoc.github.io/ --expected-version 0.18.3 --expected-projects 177 --expected-releases 60 --expected-feed-items 177 --retries 2 --retry-ms 5000` passed against live Pages with `portfolio-v0.18.3`, profile-feed projects, releases, JSON Feed, and sitemap checks. Post-push deploy run `26962751614` completed successfully, including the `Smoke deployed artifacts` step.

---

## 🔬 Researcher Queue (Cycle 3 — 2026-06-04) — see [docs/research-2026-06-04-cycle-3.md](docs/research-2026-06-04-cycle-3.md)

- [x] **T120** 🤖 P2 — Publish Lighthouse CI warning summaries in PR/job output, not only artifacts.
  - Why: T27 added an advisory LHCI budget, but the current CI job is `continue-on-error` and uploads filesystem reports without surfacing the warning list in the GitHub job summary, so regressions can be missed unless someone downloads the artifact.
  - Evidence: `.github/workflows/ci.yml:46-55` runs `npm run lhci:audit` with `continue-on-error: true` and uploads `.tmp/lhci`; `lighthouserc.cjs:17-34` uses warning assertions plus `target: 'filesystem'`; `PROJECT_CONTEXT.md:75` records real warnings from run `26952960465` (homepage performance score 0.7, TBT 1988.5ms, third-party count 3) that are not visible in the workflow summary.
  - Touches: `.github/workflows/ci.yml`, `scripts/run-lhci.mjs` or a small `scripts/summarize-lhci.mjs`.
  - Done: Added `scripts/summarize-lhci.mjs` and `npm run lhci:summary`, which load `lighthouserc.cjs`, read LHCI filesystem `manifest.json`/`*.report.json` output, recompute warning assertions per representative route, and emit a Markdown table with route, audit id, observed value, and threshold. PR/manual CI now runs that summary after advisory LHCI, appends it to `GITHUB_STEP_SUMMARY`, and keeps `.tmp/lhci/summary.md` in the existing `lighthouse-ci-reports` artifact.
  - Acceptance: PR/manual CI job summaries list each LHCI warning with route, audit id, observed value, and threshold while preserving the advisory/non-blocking behavior.
  - Verify: `npm run lhci:summary -- --dir .tmp/downloaded-lhci-reports --out .tmp/lhci-summary-test.md` produced the historical three-warning table for `/` (`categories:performance`, `total-blocking-time`, and `resource-summary:third-party:count`); `npm run lhci:summary -- --dir .tmp/no-such-lhci-dir --out .tmp/lhci-summary-empty.md` produced an explicit no-report summary; `npm test`; `npm run check`; `npm run build`. Manual `ci.yml` workflow_dispatch run `26969407853` passed on `f7d6f2a` and the LHCI summary step published 4 warning rows for `/`: performance 0.71, first-contentful-paint 2527ms, total-blocking-time 806ms, and third-party request count 3. Artifact `lighthouse-ci-reports` uploaded as ID `7418959957`.

- [x] **T121** 🤖 P2 — Include semantic-audit status in weekly quality summaries and issues.
  - Why: `semantic:audit` is intentionally advisory, but the weekly workflow currently runs it and then hides the result from the summary, issue body, and fail-condition logic.
  - Evidence: `.github/workflows/quality-gates.yml:51-63` captures `semantic_audit.exit_code`; `.github/workflows/quality-gates.yml:68-87` summarizes production/catalog/local checks only; `.github/workflows/quality-gates.yml:92-139` opens issues only for production/catalog drift; `.github/workflows/quality-gates.yml:140-141` ignores the semantic result in the fail gate; `PROJECT_CONTEXT.md:144` says semantic audit is advisory catalog-maintenance signal.
  - Touches: `.github/workflows/quality-gates.yml`; optionally `scripts/audit-semantic-index.mjs` if a compact machine-readable summary is useful.
  - Done: Weekly quality summaries now show semantic-audit PASS/ATTENTION, and any quality-gate issue body includes the latest semantic-audit log as an advisory-only section while the fail gate still ignores semantic advisory status.
  - Acceptance: Weekly quality summaries show semantic-audit PASS/ATTENTION, artifacts remain uploaded, and any quality-gate issue body includes semantic candidates when present without turning advisory catalog-maintenance hints into automatic failures.
  - Verify: Manual `quality-gates.yml` workflow_dispatch run `26964197962` passed on `7a71c5e`; `quality-gate-reports` included `semantic-audit.log` with advisory output.

- [x] **T122** 🤖 P1 — Triage stale Dependabot PRs against current `main` before merge.
  - Why: One open Dependabot PR is based on an old v0.17.0 package surface and failing checks; blindly merging it can revert newer scripts, overrides, or version metadata.
  - Evidence: PR #9 (`dependabot/npm_and_yarn/content-safety-1c56996e79`) is open, last updated 2026-06-01, and its branch `package.json` says `"version": "0.17.0"` while `main` is `0.18.3`; PR #9 check `verify` failed in run `26789217704`; PR #12 (Astro 6.4.4) and PR #13 (GitHub Actions group) are current/mergeable with passing checks.
  - Touches: GitHub PR triage, Dependabot config only if stale branch recreation needs policy changes; no source edits unless the build machine chooses to merge/update a verified PR.
  - Done: PR #13 was rebased to current `main`, passed CI run `26956714943`, and merged as `78bbef5`; PR #9 was inspected to confirm the stale `0.17.0` branch surface, rebased to current `main` and then the post-#13 base, passed CI runs `26956714047` and `26956895664`, and merged as `3ab0f4a`; PR #12 was rebased and passed CI run `26956897052`, then conflicted after the marked/package-lock merge, so the Astro 6.4.4 upgrade was regenerated on current `main`, validated locally, pushed as `460e04c`, and PR #12 was closed as superseded with notes.
  - Acceptance: PR #9 is closed/recreated or rebased from current `main` before consideration; PR #12/#13 are either merged after full validation or intentionally deferred with notes; no dependency PR is merged from a branch that would regress `package.json` version/scripts/overrides.
  - Verify: `gh pr list --repo SysAdminDoc/sysadmindoc.github.io --author app/dependabot --state open` returned `[]`; `npm test`, `npm run check`, `npm run build`, and `npm run a11y:audit` passed on the combined dependency state with `marked` 18.0.4, Astro 6.4.4, the current profile-feed scripts, and the `yaml-language-server` override intact.

---

## 🔬 Researcher Queue (Cycle 4 — 2026-06-04) — see [docs/research-2026-06-04-cycle-4.md](docs/research-2026-06-04-cycle-4.md)

- [x] **T123** 🤖 P1 — Add a generated ranking report and drift guard for the `Recommended` catalog order.
  - Why: The homepage default order and project-page related links now depend on a build-time ranking algorithm whose behavior is otherwise visible only by inspecting rendered card order.
  - Evidence: `src/data/project-ranking.mjs` blends stars, 180-day freshness, and release downloads; `test/project-ranking.test.mjs` covers small fixtures only; `scripts/summarize-generated-data.mjs` does not report ranking distribution over the generated 177-project catalog.
  - Touches: `scripts/summarize-generated-data.mjs` or a small `ranking:audit` script; possibly `package.json` and `PROJECT_CONTEXT.md` for the generated-data contract.
  - Done: `scripts/summarize-generated-data.mjs` now imports the shared project-ranking helper, computes rankings over profile-feed projects with generated stars/meta/releases, writes `summary.json.ranking`, emits a `Recommended Ranking` markdown section with top rows and score parts, and adds integrity checks for normalized weights, portfolio row coverage, usable identities, finite scores/parts, and unique contiguous ranks.
  - Acceptance: The generated data summary or dedicated audit emits top-N rank rows with repo, rank, score parts, stars, days since update, and release downloads; it asserts normalized weights, finite scores, unique ranks, and usable names/repos without pinning a brittle full-order snapshot.
  - Verify: `npm run profile-feed:sync`, `npm run fetch-stars`, and `npm run data:summary -- --out .tmp/data-refresh-t123 --max-age-hours 36 --fail-on-stale` passed with status `fresh`, 177 ranked projects, top 12 ranking rows, and all ranking checks green. `npm test`, `npm run check`, `npm run build`, and `npm run a11y:audit` also passed.

- [x] **T124** 🤖 P2 — Surface the `Recommended` ranking rationale accessibly in catalog and related-link UI.
  - Why: `Recommended` is now the default sort, but the UI does not explain why a specific card is high in the list for keyboard, screen-reader, or trust-oriented browsing.
  - Evidence: `formatProjectRankingLabel()` already builds useful explanations; `CatalogEntry.astro` stores that label as `data-rank-label`; related links in `src/pages/projects/[slug].astro` use the same ranking map but expose no comparable rank context.
  - Touches: `src/components/CatalogEntry.astro`, `src/pages/index.astro`, `src/pages/projects/[slug].astro`, `public/scripts/main.js`, and CSS/docs as needed.
  - Done: Catalog cards now render a `Recommended #N` rationale when the default sort is active and attach it through `aria-describedby`; non-Recommended sorts hide the visible rationale through `#catalogGrid[data-sort]`; project detail related cards render the same rationale with their own accessible description IDs. `shared.js` also promotes deferred `global.css` links to `media=all` as a runtime fallback so below-fold catalog layout is not stuck on critical-only CSS if the link `onload` swap does not fire.
  - Acceptance: The existing rank label is exposed through visible or accessible card context when `Recommended` is active; related-link ranking context is not a silent algorithm; desktop and 390px mobile layouts do not overflow or become noisy.
  - Verify: In-app Browser preview on `http://127.0.0.1:4327/` passed at 1280x720: 177 visible catalog rank rationales, 177 valid `aria-describedby` links, A-Z sort set `data-sort="name"` and hid all rank labels, related cards exposed 4 visible ranking rationales with valid descriptions, console warnings/errors were empty, and no horizontal overflow was detected. Browser viewport `390x844` passed with 375px document width, catalog and related rank text inside cards, and A-Z hiding all mobile rank labels. `git diff --check`, `npm test`, `npm run check`, `npm run build`, and `npm run a11y:audit` passed.

- [x] **T125** 🤖 P2 — Add a Pagefind facet/index contract audit after static search generation.
  - Why: Visible facets depend on generated Pagefind index metadata, not only Astro source, so source-only checks can pass even if the built search bundle stops exposing Category filters.
  - Evidence: Project pages tag `data-pagefind-filter="Category:..."`; `/search/` renders the official filter pane; Pagefind's filter docs state that `data-pagefind-filter` associates pages with filter keys/values and can capture inline values; `package.json` has `search:index` but no script asserting `dist/pagefind` exposes the expected Category values or faceted results.
  - Touches: `package.json`, a new or existing script under `scripts/`, and possibly `PROJECT_CONTEXT.md`.
  - Done: Added `scripts/audit-search-index.mjs` and `npm run search:audit`, then wired it into `build:ci` immediately after `search:index`. The audit loads the generated Pagefind JS API from `dist/pagefind`, verifies the Category facet exists, compares filter counts against rendered project pages and homepage catalog cards, checks expected labels, and runs filter-only Category searches that must return public project routes. Project detail pages now prefer `catalogMatch.category` over featured language for the Pagefind Category source of truth, fixing the `VideoSubtitleRemover` Media/Python drift the audit exposed.
  - Acceptance: A post-build `search:audit` proves the Category facet exists, has expected category labels, and faceted empty-term search returns public project pages; counts are compared against rendered/catalog category data with only intentional tolerance.
  - Verify: `npm test`; `npm run check`; `npm run build`; standalone `npm run search:audit`. The build-integrated and standalone audits passed with 194 indexed HTML pages, 177 rendered project pages, 177 homepage catalog cards, 10 Category filters, and 177 filtered project results checked.

---

## 🔬 Researcher Queue (Cycle 5 — 2026-06-04) — see [docs/research-2026-06-04-cycle-5.md](docs/research-2026-06-04-cycle-5.md)

- [x] **T126** 🤖 P2 — Add a rendered JSON-LD audit before expanding T98/T99.
  - Why: Base, language, and project pages already emit manual JSON-LD, and T98/T99 will expand that surface; no current validator parses rendered graph output or catches malformed JSON, missing stable `@id`s, or route/type coverage drift.
  - Evidence: `src/layouts/Base.astro` emits WebSite/Person/ProfilePage JSON-LD; `src/pages/lang/[slug].astro` emits CollectionPage/ItemList/BreadcrumbList; `src/pages/projects/[slug].astro` emits SoftwareSourceCode/BreadcrumbList; existing source/data validators do not inspect built `application/ld+json` blocks.
  - Touches: New `schema:audit` script or equivalent build-output validator; possibly `package.json`, `PROJECT_CONTEXT.md`, and CI wiring.
  - Done: Added `scripts/audit-schema.mjs` and `npm run schema:audit`. `build:ci` now runs the audit after Astro build, HTML repair, service-worker stamping, and Pagefind indexing. The audit parses every built HTML `application/ld+json` block, requires `https://schema.org` context, verifies every page keeps the Base WebSite/Person graph, and checks representative homepage, `/lang/powershell/`, and `/projects/win11-nvme-driver-patcher/` graphs for expected types, stable `@id` anchors, route URLs, item-list positions, and project breadcrumb/code-repository shape.
  - Acceptance: Built HTML JSON-LD blocks parse successfully, use schema.org context, and representative homepage/language/project routes expose expected graph types and stable anchors without overfitting every rich-result rule.
  - Verify: `npm run schema:audit` passed on the current build with 194 HTML pages, 378 JSON-LD blocks, 757 graph nodes, 194 pages carrying the Base WebSite/Person graph, and 3 representative routes checked. `npm test`; `npm run check`; `npm run build` passed with `schema:audit` inside `build:ci`; `npm run a11y:audit`.

- [x] **T127** 🤖 P3 — Add JSON Feed icon/favicon metadata and feed validation.
  - Why: `/feed.json` is advertised and live, but omits optional JSON Feed publisher metadata that helps feed readers avoid scraping the homepage, and no explicit feed validator protects required top-level/item fields.
  - Evidence: Cycle 5 live checks showed `/feed.json` returns JSON Feed 1.1 with 177 items, but `src/pages/feed.json.ts` does not emit `icon` or `favicon`; the JSON Feed 1.1 spec defines `icon` and `favicon` as feed-level image URLs and requires stable item `id` plus at least one content field per item.
  - Touches: `src/pages/feed.json.ts`; optionally a `feed:audit` script or T119 smoke assertions.
  - Done: `/feed.json` now emits absolute `icon` and `favicon` URLs using the shipped `icon-512.png` and `favicon.svg` assets. Added `scripts/audit-feed.mjs` and `npm run feed:audit`; `build:ci` runs the audit after HTML repair and before service-worker stamping. The audit parses built `dist/feed.json`, checks JSON Feed version/root URLs/icon assets, requires non-empty unique items, verifies item IDs/URLs, and requires each item to expose `content_html` or `content_text` without requiring `date_published`.
  - Acceptance: JSON Feed includes absolute `icon` and `favicon` URLs, and validation checks `version`, `title`, `home_page_url`, `feed_url`, non-empty `items`, item `id`, item `url`, and one content field without requiring optional `date_published`.
  - Verify: `npm test`; `npm run check`; `npm run build`; standalone `npm run feed:audit`; `git diff --check`; `npm run a11y:audit`. The build-integrated and standalone feed audits passed with 177 feed items, 177 `content_text` items, `https://sysadmindoc.github.io/icon-512.png`, and `https://sysadmindoc.github.io/favicon.svg`.

## 🔬 Researcher Queue (Cycle 6 — 2026-06-04) — see [docs/research-2026-06-04-cycle-6.md](docs/research-2026-06-04-cycle-6.md)

- [x] **T128** 🤖 P2 — Move homepage proof-strip highlight selection into validated data.
  - Why: T97 now renders from `projectProof`, but the selected homepage metrics/copy are page-local constants, which makes trust-sensitive proof claims easier to drift from source-backed project proof records.
  - Evidence: Before T128, T97 defined local `heroProofItems` in `src/pages/index.astro` with `80% IOPS`, `67 checks`, and `40+ effects`; `scripts/validate-project-data.mjs` validated generic `projectProof` records and source URLs but not homepage highlight slugs, short metrics, mobile-length copy, or source resolution.
  - Touches: `src/data/proof.ts`, `src/data/types.ts`, `scripts/validate-project-data.mjs`, and `src/pages/index.astro` after T97 lands.
  - Done: Added typed `homepageProofHighlights` data with source selectors in `src/data/proof.ts`; `src/pages/index.astro` now renders the proof strip from that data and resolves source text from `projectProof`; `scripts/validate-project-data.mjs` now validates selected repos, duplicate highlights, count bounds, label/value/copy mobile-length bounds, and source selector resolution.
  - Acceptance: Homepage proof highlights are declared in typed data, each selected repo resolves to a valid `projectProof` record, each metric/copy/source is non-empty and bounded for mobile layout, and the homepage render loop consumes the validated data instead of hardcoded local constants.
  - Verify: `npm run data:validate`; `npm test`; `npm run check`; `npm run build`; `npm run a11y:audit`; Browser preview at `http://127.0.0.1:4326/?proof-data=1` showed 3 data-driven proof links, `hn -> hero-proof-strip -> hr -> hd`, proof strip bottom at 465px in a 720px viewport, no horizontal overflow, and no console errors; `npm run audit:perf -- --base http://127.0.0.1:4326 --out .tmp/perf-t128.json` passed Home mobile at 390px with LCP 972ms, CLS 0, bfcache yes, and no horizontal overflow.

- [x] **T129** 🤖 P2 — Add a critical/global CSS parity audit for first-viewport selectors.
  - Why: The first-viewport CSS split now requires shared hero/proof selectors to be represented in both `critical.css` and `global.css`; missing one side can create first-paint layout shifts or async-style behavior that only appears after the full stylesheet loads.
  - Evidence: Current proof-strip styles duplicate `.hero-proof-strip`, `.hero-proof`, `.hero-proof-label`, `.hero-proof-value`, and `.hero-proof-copy` in both `src/styles/critical.css` and `src/styles/global.css`, including mobile overrides, but no script audits selector parity after T16 split the first-viewport CSS path.
  - Touches: `scripts/audit-assets.mjs` or a new `scripts/audit-css.mjs`, `package.json`, `src/styles/critical.css`, and `src/styles/global.css`.
  - Done: Added `scripts/audit-css.mjs` and wired `npm run css:audit` into both `npm run check` and `npm run build`. The audit extracts selector lists from `critical.css` and `global.css`, checks the shared first-viewport nav/hero/proof/stage selectors plus selected mobile overrides, and includes `--self-test` coverage that proves a removed shared selector is reported.
  - Acceptance: A CSS audit extracts expected first-viewport class selectors, allows intentional critical-only/global-only exceptions, and fails when a shared hero/first-viewport selector or selected mobile override is missing from either stylesheet without requiring byte-for-byte declaration equality.
  - Verify: `npm run css:audit`; `npm run css:audit -- --self-test`; `npm test`; `npm run check`; `npm run build`; `npm run a11y:audit`.

---

## 🔬 Researcher Queue (Cycle 7 — 2026-06-04) — see [docs/research-2026-06-04-cycle-7.md](docs/research-2026-06-04-cycle-7.md)

- [x] **T130** 🤖 P2 — Add a build-output contract audit for public machine-readable endpoints.
  - Why: The project now audits generated data and rendered JSON-LD, but public consumers also depend on `/projects.json`, `/releases.json`, `/cmdk-data.js`, `/llms.txt`, and the feed/index discovery links in rendered HTML; today those contracts are protected mainly by manual live checks and T119's proposed post-deploy smoke.
  - Evidence: `src/pages/projects.json.ts` and `src/pages/releases.json.ts` expose custom `schemaVersion: 1` JSON APIs; `src/pages/cmdk-data.js.ts` emits a JavaScript assignment consumed synchronously by `Base.astro`; `src/pages/llms.txt.ts` claims the llms.txt convention; `src/layouts/Base.astro` advertises RSS, release RSS, JSON Feed, project index, and release index alternates; `package.json` has `schema:audit` for HTML JSON-LD but no pre-deploy audit for these machine-readable endpoint files.
  - Touches: A new `scripts/audit-public-endpoints.mjs` or an expanded build-output audit, `package.json`, and possibly `PROJECT_CONTEXT.md`.
  - Done: Added `scripts/audit-public-endpoints.mjs` and `npm run endpoints:audit`; `build:ci` runs it after HTML repair and before feed/SW/search/schema audits. The audit validates built `projects.json`, `releases.json`, `cmdk-data.js`, `llms.txt`, and representative `index.html` alternate discovery links without executing built command-palette JavaScript.
  - Acceptance: After `astro build`, the audit parses `dist/projects.json` and `dist/releases.json` for schema version, generated timestamp, counts, absolute URLs, and non-empty rows; parses `/cmdk-data.js` enough to prove `allProjects` and `quickLinks` are populated; validates `/llms.txt` has the expected H1, blockquote, H2 file-list shape and useful links; and confirms representative HTML exposes the alternate feed/index discovery links.
  - Verify: `npm run endpoints:audit` passed with 177 project-index rows, 60 release-index rows, 20 release repositories, 177 command-palette project rows, 9 quick links, 42 `llms.txt` links, and 5 alternate discovery links. Full verification: `npm test`; `npm run check`; `npm run build`; standalone `npm run endpoints:audit`; `git diff --check`; `npm run a11y:audit`.

- [x] **T131** 🤖 P2 — Bring build-output audits into the weekly quality-gates workflow.
  - Why: T126 moved rendered JSON-LD validation into `build:ci`, and T125/T130 will add more build-output checks, but the scheduled weekly quality workflow still stops at source/data/Astro checks and will not catch built HTML/search/API drift until a deploy or PR build runs.
  - Evidence: `.github/workflows/quality-gates.yml` runs production audit, catalog audit, semantic audit, `data:validate`, `assets:audit`, and `npm run check`; `package.json` runs `schema:audit` only inside `build:ci` after `astro build`, HTML repair, service-worker stamping, and Pagefind indexing; GitHub Actions job summaries can present compact Markdown results through `GITHUB_STEP_SUMMARY`.
  - Touches: `.github/workflows/quality-gates.yml`; optionally compact machine-readable summaries from `schema:audit`, `search:audit`, or `endpoints:audit`.
  - Done: Weekly quality gates now refresh generated metadata and sync the profile-feed cache before local checks, run `npm run build:ci` without deploying, then re-run endpoint, JSON Feed, Pagefind search, and rendered JSON-LD audits into dedicated logs. Job summaries publish generated-data, local-check, build path, endpoint, feed, search, and schema status; artifacts include every relevant log; quality-gate issues include generated-data, local validation, and build-output failures plus advisory semantic context; and the final fail gate treats generated-data, local validation, and build-output failures as blocking.
  - Acceptance: Weekly `workflow_dispatch`/schedule runs the build-output audit path without deploying, publishes schema/search/endpoint status in the job summary, uploads the relevant logs, and includes build-output failures in the issue/update body and fail gate without hiding advisory semantic-audit context from T121.
  - Verify: Manual `quality-gates.yml` workflow_dispatch run `26964197962` passed on `7a71c5e`; the `quality-gate-reports` artifact included generated-data, local-check, endpoint, feed, search, schema, and semantic logs. Downloaded artifact logs confirmed `endpoints:audit`, `feed:audit`, `search:audit`, `schema:audit`, and Astro check passed. The issue-update failure path is covered by the workflow condition/body but was not forced live to avoid opening a false alert.

---

## 🔬 Researcher Queue (Cycle 8 — 2026-06-04) — see [docs/research-2026-06-04-cycle-8.md](docs/research-2026-06-04-cycle-8.md)

- [x] **T132** 🤖 P2 — Scope Pagefind indexing to intentional content regions.
  - Why: The built search index currently starts at every `<body>` because no page declares `data-pagefind-body`, so repeated global UI such as the command palette dialog and layout copy can be indexed alongside actual project/page content.
  - Evidence: Deploy run `26960045875` logged `Did not find a data-pagefind-body element on the site`, then indexed 194 pages, 21,262 words, and 1 filter; `Base.astro` renders the command-palette dialog and quick-link copy on every page; Pagefind's indexing docs say it starts at `<body>` by default and narrows to tagged `data-pagefind-body` regions when present.
  - Touches: `src/layouts/Base.astro`, project/interior page templates, possibly `src/pages/search.astro`, and T125's future `search:audit` expectations.
  - Done: Added `data-pagefind-body` to the meaningful `<main>` region on every searchable rendered route while leaving `/404.html` untagged. The global Base command-palette dialog and quick-link controls remain outside the tagged regions, so Pagefind no longer indexes that repeated UI by falling back to whole-body indexing. `search:audit` now enforces that every non-404 HTML route exposes a tagged body region, that `/404.html` does not, and that the generated Pagefind page count equals the intentional tagged route set before it checks Category facets and filtered project results.
  - Acceptance: Every route intended for search has one or more meaningful `data-pagefind-body` regions, repeated global UI is excluded or outside those regions, Pagefind no longer logs the whole-body fallback, intended project/language/interior pages remain indexed, and Category filters still work after T125.
  - Verify: `npm run build` passed with Pagefind detecting `data-pagefind-body`, ignoring untagged pages, and indexing 193 of 194 built HTML routes. The integrated `search:audit` passed with 194 scanned HTML pages, 193 tagged Pagefind body pages indexed, 177 rendered project pages, 177 homepage catalog cards, 10 Category filters, and 177 filtered public project results checked.

---

## 🔬 Researcher Queue (Cycle 9 — 2026-06-04) — see [docs/research-2026-06-04-cycle-9.md](docs/research-2026-06-04-cycle-9.md)

- [x] **T133** 🤖 P2 — Normalize cache headers for generated public endpoint artifacts.
  - Why: The site now exposes multiple public machine-readable endpoints, but only some set explicit cache policy; inconsistent defaults make freshness expectations unclear for feed readers, command-palette data, and machine consumers.
  - Evidence: `src/pages/projects.json.ts` and `src/pages/releases.json.ts` return `Cache-Control: public, max-age=300`; `src/pages/feed.json.ts`, `src/pages/releases.xml.ts`, `src/pages/llms.txt.ts`, and `src/pages/cmdk-data.js.ts` return content without explicit cache headers; `Base.astro` comments describe `/cmdk-data.js` as cached page-independent data; MDN documents `max-age` freshness, `no-cache` revalidation, and recommends explicit `Cache-Control` when caching behavior matters; Astro endpoints return `Response` objects where headers can be set.
  - Touches: Feed/text/script endpoint files under `src/pages/`, optionally a shared endpoint response helper, and T130's future endpoint audit.
  - Done: Added shared endpoint header helpers in `src/data/endpoint-headers.ts`. Generated JSON/feed/text/script endpoints now declare `Cache-Control: public, max-age=300`; generated OG images use a bounded `public, max-age=86400` policy instead of long immutable caching on unhashed `/og/*.png` routes. `endpoints:audit` now verifies the source-declared content type/cache policy for 9 endpoint sources, and `smoke:live` verifies the effective GitHub Pages content type/cache headers for the live generated artifacts it fetches.
  - Acceptance: Public generated endpoints have a documented cache policy: short bounded freshness or revalidation for data/feed/text files that can change each deploy, long immutable policy only for hashed/static assets, and the endpoint audit verifies expected `Content-Type` plus cache policy from built artifacts or live smoke.
  - Verify: `npm run endpoints:audit` passed with 9 source header policies checked. `npm run images:audit` passed after the OG header helper change. `npm run smoke:live -- --base-url https://sysadmindoc.github.io/ --expected-version 0.18.3 --expected-projects 177 --expected-releases 60 --expected-feed-items 177 --retries 2 --retry-ms 5000` passed and confirmed live GitHub Pages serves generated artifacts with `max-age=600`. Full verification: `npm test`; `npm run check`; `npm run build`; standalone `npm run endpoints:audit`; `git diff --check`; `npm run a11y:audit`.

---

## 🔬 Researcher Queue (Cycle 10 — 2026-06-04) — see [docs/research-2026-06-04-cycle-10.md](docs/research-2026-06-04-cycle-10.md)

- [x] **T134** 🤖 P2 — Add a forced-colors browser audit for SVG data-visualization surfaces.
  - Why: T103 names the forced-colors visual defect, but the current a11y gate is static HTML only and cannot detect computed forced-color paint, SVG fill/stroke collapse, missing outlines, or chart-region visibility regressions in Windows High Contrast style modes.
  - Evidence: `scripts/audit-a11y.mjs` only checks static HTML rules and explicitly defers computed contrast/Playwright coverage; `src/styles/global.css` has a targeted `@media(forced-colors:active)` block for focus, decorative layers, and control borders but no overrides for `.heatmap-svg`, `.hm-*`, `.lang-donut`, or `.sk-ring`; the heatmap uses `rgba()` SVG fills/background swatches, the language donut emits literal SVG `stroke` colors, and skill rings use custom-property SVG strokes. MDN documents that forced colors affect SVG `fill` and `stroke`, background images, and shadows; W3C WCAG 2.2 explains that chart lines/shapes/slices needed to understand a graph are graphical objects with non-text contrast requirements; Playwright can emulate `forcedColors: 'active'`.
  - Touches: A new browser-based audit script such as `scripts/audit-forced-colors.mjs`, `package.json`, and optionally `.github/workflows/quality-gates.yml`; pair with T103 CSS fixes rather than replacing them.
  - Done: Added `scripts/audit-forced-colors.mjs` and `npm run forced-colors:audit`, using Chrome/Edge CDP to serve built `dist/`, emulate `forced-colors: active`, visit the homepage at desktop and mobile widths, and fail with compact region summaries when the heatmap, language donut, or skill rings are collapsed, transparent, missing text equivalents, or missing painted boundaries. Weekly quality gates now run the audit after `build:ci`, upload `forced-colors-audit.log`, summarize PASS/FAIL, and include failures in the build-output issue body.
  - Acceptance: The audit builds or serves the static output, emulates `forcedColors: 'active'`, visits the homepage data-viz sections at desktop and mobile widths, verifies the heatmap, language donut, and skill rings remain visible/non-blank with discernible boundaries or text equivalents, and fails with a compact region-level summary when a target is transparent, collapsed into the canvas, or hidden by forced palette rules.
  - Verify: `npm run build`; `npm run forced-colors:audit` passed with 364/364 heatmap cells, 8/8 donut segments, and 8 skill rings painted at both desktop and mobile widths. Manual `quality-gates.yml` workflow_dispatch run `26967664484` passed on `cdf87fd`; the forced-colors build-output step reported PASS for desktop and mobile and uploaded `quality-gate-reports` artifact ID `7418247524`.

---

## 🔬 Researcher Queue (Cycle 11 — 2026-06-04) — see [docs/research-2026-06-04-cycle-11.md](docs/research-2026-06-04-cycle-11.md)

- [x] **T135** 🤖 P2 — Add a CSP preflight audit before removing `script-src 'unsafe-inline'`.
  - Why: T95 is still the largest deferred security item, and the current inline-script surface has shifted enough that removing `unsafe-inline` without an inventory can break theme initialization, async stylesheet loading, section navigation, search bootstrapping, recent-view tracking, resume printing, and timeline filtering.
  - Evidence: `src/layouts/Base.astro:86` still emits a CSP meta tag with `script-src 'self' 'unsafe-inline'`; `src/layouts/Base.astro:111` uses an inline `onload` handler for the async stylesheet swap; executable inline script blocks remain in `src/layouts/Base.astro:132`, `src/layouts/Base.astro:161-163`, `src/components/SectionJumpNav.astro:31-118`, `src/pages/projects/[slug].astro:341-351`, `src/pages/search.astro:110-127`, `src/pages/resume.astro:91-95`, and `src/pages/timeline.astro:388+`; JSON-LD blocks in `Base.astro`, `lang/[slug].astro`, and `projects/[slug].astro` need to be classified separately from executable JavaScript; `rg` found no `csp` audit script in `package.json`, `scripts/`, or workflows. MDN documents that `script-src` covers inline scripts and inline event handlers, and that hashes for inline script blocks do not automatically allow event handlers; web.dev recommends hash-based CSP for statically served HTML.
  - Touches: A new audit such as `scripts/audit-csp.mjs`, `package.json`, possibly `PROJECT_CONTEXT.md`, and later T95 implementation files once the inventory is stable.
  - Done: Added `scripts/audit-csp.mjs`, `npm run csp:audit`, and regression tests for the pre-T95 source inventory. The initial audit reported the active CSP meta policy, seven executable inline scripts, one inline event handler, six JSON-LD/data script blocks, six self-hosted external scripts, 15 inline style blocks, 16 style attributes, stable SHA-256 hashes for hashable inline script blocks, and dynamic decisions for `define:vars` blocks. Strict candidate mode failed on the eight then-current `script-src 'unsafe-inline'` blockers instead of silently greenlighting T95; after T95, strict candidate mode passes with zero executable inline scripts and zero inline event handlers.
  - Acceptance: The audit parses source or built HTML, reports the active CSP policy, inventories executable inline scripts, inline event handlers, external self-hosted scripts, JSON-LD blocks, inline styles/style attributes, and current `unsafe-inline` dependencies; computes SHA-256 hashes for stable hashable inline script blocks; separates dynamic blocks that need externalization or a nonce/hash decision; and can fail in strict mode when a new executable inline block or inline event handler appears outside an allowlist.
  - Verify: `node --check scripts/audit-csp.mjs`; `npm run csp:audit`; `node scripts/audit-csp.mjs --candidate-script-src "'self'" --strict` failed as expected with eight current inline blockers before the wrapper treated that failure as success; `npm test`; `npm run check`; `npm run build`; `npm run a11y:audit`; `rtk git diff --check`.

---

## 🔬 Researcher Queue (Cycle 12 — 2026-06-04) — see [docs/research-2026-06-04-cycle-12.md](docs/research-2026-06-04-cycle-12.md)

- [x] **T136** 🤖 P2 — Run the custom performance/bfcache audit in an automated quality workflow.
  - Why: `npm run audit:perf` is the only current guard for bfcache restore, mobile horizontal overflow, route-level console/network failures, lab event timing, and local CDP probes, but it is documented as a local preview command and is not exercised by PR CI or weekly quality gates.
  - Evidence: `PERFORMANCE_AUDIT.md` defines `npm run audit:perf` as the canonical local Chromium audit and records that it previously caught project-page README image/overflow regressions; `scripts/audit-performance.mjs` samples `/`, `/search/?q=NukeMap`, `/archive/`, `/projects/project-nomad-desktop/`, and desktop `/`, records LCP/CLS/event/longtask/bfcache/overflow/console/network data, writes JSON, and supports `--strict`; `package.json` exposes `audit:perf`, but `.github/workflows/ci.yml` runs only advisory LHCI plus static a11y after `build:ci`, and `.github/workflows/quality-gates.yml` does not run `audit:perf` or upload `.tmp/performance-audit.json`. T120 only covers LHCI warning visibility, while web.dev treats Core Web Vitals and bfcache as separate user-experience surfaces.
  - Touches: `.github/workflows/quality-gates.yml` or `.github/workflows/ci.yml`, possibly `scripts/audit-performance.mjs` for CI-friendly summary output, and `PROJECT_CONTEXT.md`/`README.md` if the command contract changes.
  - Done: Weekly quality gates now start a local Astro preview after `build:ci`, wait for readiness, run `npm run audit:perf -- --strict --lcp 60000 --event 500 --out .tmp/performance-audit-ci.json`, upload the JSON/log artifacts, and publish compact route rows through a reusable performance-summary script. The first wiring is advisory: nonzero strict output is visible in the summary/artifact and quality-gate issue body without failing the workflow gate until CI baselines settle. LCP remains recorded in this report, but LHCI remains the active LCP budget signal until the custom audit has a stable CI baseline.
  - Acceptance: A workflow starts a local preview/static server after `build:ci`, waits for readiness, runs `npm run audit:perf -- --base <local-url> --strict --out .tmp/performance-audit-ci.json`, uploads the JSON artifact, and publishes a compact job summary with route, viewport, LCP, CLS, max event, max long task, bfcache, overflow, and issue count. Keep the first CI wiring advisory if needed, but the weekly/manual quality workflow should make regressions visible without relying on local notes.
  - Verify: `node scripts/summarize-performance-audit.mjs .tmp/performance-audit-ci.json`; `npm test`; `npm run check`; `npm run build`; `npm run a11y:audit`; local preview plus `npm run audit:perf -- --base http://127.0.0.1:4321 --strict --lcp 60000 --event 500 --out .tmp/performance-audit-ci.json` passed all 5 route samples with bfcache restored and no overflow. Default and 5s-LCP local runs produced advisory baseline warnings because LCP samples fluctuated while bfcache/overflow stayed clean, so the first workflow wiring records LCP and lets LHCI own LCP budgets. Manual `quality-gates.yml` workflow_dispatch run `26966906202` passed on `0820ec9`; the new performance step reported PASS on all 5 route samples, wrote `.tmp/performance-audit-ci.json`, published the advisory summary, and uploaded `quality-gate-reports` artifact ID `7417914733`.

---

## 🔬 Researcher Queue (Cycle 13 — 2026-06-04) — see [docs/research-2026-06-04-cycle-13.md](docs/research-2026-06-04-cycle-13.md)

- [x] **T137** 🤖 P2 — Replace PR CI empty generated-cache stubs with schema-valid fixtures.
  - Why: T104 captured the older duplicate problem: PR CI satisfied generated-data imports with empty `{}` / `[]` files, so pull requests could pass without exercising README rendering, release pages, language metadata, ranking inputs, feed dates, project detail metadata, or realistic public endpoint shapes.
  - Evidence: `.github/workflows/ci.yml:32-39` writes `{}` to `_stars.json`, `_meta.json`, `_readmes.json`, and `_stats.json`, plus `[]` to `_releases.json`; `src/data/generated.d.ts` documents richer cache contracts for stats, repo metadata, releases, readmes, readme-refresh telemetry, and the profile-feed cache; consumers in `index.astro`, project pages, releases/timeline pages, `projects.json`, `releases.json`, and `feed.json` all branch on those caches; `scripts/summarize-generated-data.mjs` has checks that would reject empty stars/meta/readmes/release-refresh/profile/ranking data, but PR CI does not run a realistic generated-data summary before `build:ci`. GitHub Actions security guidance supports least-privilege token use, so tracked public-safe fixtures are a better PR path than giving fork PRs live metadata credentials.
  - Touches: `.github/workflows/ci.yml`, a tracked fixture directory such as `src/data/fixtures/generated/`, a fixture install/audit script, `package.json`, and possibly `.gitignore`/`PROJECT_CONTEXT.md`.
  - Acceptance: PR CI stops using inline `printf` empty cache stubs and instead installs tracked schema-valid fixture caches for `_stars.json`, `_meta.json`, `_readmes.json`, `_releases.json`, `_stats.json`, `_readme-refresh.json`, and `_profile-projects.json`; a fixture audit verifies non-empty counts, matching stats/star/meta/readme cardinality, at least one release, at least one rendered README excerpt, valid profile-feed metadata, and deterministic ranking inputs; `npm run check` and `npm run build:ci` pass without `GITHUB_TOKEN` while rendering realistic generated-data branches.
  - Done: Added `src/data/fixtures/generated/` with 16 public-safe generated cache fixtures covering all Pagefind categories, 9 releases, README excerpts, README-refresh telemetry, profile-feed metadata, release downloads, ranking inputs, and the `win11-nvme-driver-patcher` JSON-LD representative route. Added `scripts/install-generated-fixtures.mjs`, `npm run generated:fixtures`, `npm run generated:fixtures:check`, unit coverage, `PROFILE_PROJECTS_OFFLINE=1` profile-feed preservation, and PR CI wiring that installs fixtures instead of writing inline empty stubs.
  - Verify: From a backed-up clean generated-cache state, `npm run generated:fixtures:check`; `npm run generated:fixtures`; `PROFILE_PROJECTS_OFFLINE=1 npm run check`; `npm test`; `npm run build:ci`; standalone `npm run endpoints:audit`; `npm run feed:audit`; `npm run search:audit`; `npm run schema:audit`; `npm run a11y:audit`; `rtk git diff --check`. Manual `ci.yml` workflow_dispatch run `26969407853` passed on `f7d6f2a`; logs show `Install generated-data fixtures`, `Generated-data fixtures installed: 16 repos, 9 releases, 16 README excerpts, 16 profile projects`, offline profile preservation for 16 cached projects, build-output audits for 16 projects/9 releases/10 Category filters, and no `Stub generated caches` or empty `printf` lines.

---

## 🔬 Researcher Queue (Cycle 14 — 2026-06-05) — see [docs/research-2026-06-05-cycle-14.md](docs/research-2026-06-05-cycle-14.md)

- [x] **T138** 🤖 P2 — Add project-page native sharing with a copy-link fallback.
  - Why: Project detail pages exposed source/live/lane actions but no first-party way to share the current project URL. The Web Share API is useful on supported devices but remains limited-availability, so project sharing needs a clipboard fallback for desktop and unsupported browsers.
  - Evidence: `src/pages/projects/[slug].astro` had GitHub/live/lane actions only; `public/scripts/project-page.js` handled recently viewed projects but no `navigator.share` or clipboard fallback; MDN marks Web Share as limited availability and secure-context-only; web.dev app-shortcuts guidance confirmed installed-PWA shortcuts are already present but best-effort and do not replace in-page sharing.
  - Touches: `src/pages/projects/[slug].astro`, `public/scripts/project-page.js`, `src/styles/global.css`, `test/project-share.test.mjs`, and loop continuity docs.
  - Done: Added a `Share project` action to every project detail page, wired build-time title/text/URL data attributes, used `navigator.share` when available, fell back to `navigator.clipboard.writeText` or `document.execCommand('copy')`, and added an `aria-live` status for shared/copied/failure feedback.
  - Acceptance: Project pages expose a keyboard-focusable share action beside the existing primary actions; native share receives the project title, description, and canonical URL when supported; unsupported or failed native share attempts copy the canonical project URL; status feedback is announced without adding inline executable scripts.
  - Verify: `node --test test/project-share.test.mjs`; `npm test`; `npm run check`; `npm run build`; Browser preview on a project route confirmed page identity, visible share control, no console errors, desktop/mobile layout, and copy fallback status.

---

## 🔬 Researcher Queue (Cycle 15 — 2026-06-05) — see [docs/research-2026-06-05-cycle-15.md](docs/research-2026-06-05-cycle-15.md)

- [x] **T139** 🤖 P3 — Guard installed-PWA shortcut metadata.
  - Why: `public/manifest.json` already had Catalog/Search/Releases/Now shortcuts, but they had no descriptions and no regression test. Installed-app shortcut menus are a small but useful deep-link surface, and the manifest should preserve useful names, destinations, and PWA tracking URLs across future edits.
  - Evidence: web.dev documents manifest shortcuts as installed-app deep links, ordered by priority, and MDN documents shortcut `description` as a supported string field; `rg` found no source test covering `public/manifest.json` shortcuts.
  - Touches: `public/manifest.json`, `test/pwa-manifest.test.mjs`, and loop continuity docs.
  - Done: Added descriptions to the four existing PWA shortcuts and a node:test contract that validates manifest identity, standalone launch behavior, shortcut order, descriptions, rooted URLs, and `source=pwa` tracking.
  - Acceptance: Manifest shortcuts remain bounded to the intended four high-priority routes, each shortcut carries useful description copy, every shortcut URL remains same-origin/rooted with `source=pwa`, and the contract fails if future edits drop the installed-app affordance.
  - Verify: `node --test test/pwa-manifest.test.mjs`; `npm test`; `npm run check`; `npm run build`.

---

## 🔬 Researcher Queue (Cycle 16 — 2026-06-05) — see [docs/research-2026-06-05-cycle-16.md](docs/research-2026-06-05-cycle-16.md)

- [x] **T140** 🤖 P2 — Sanitize exact local checkout paths from public loop docs.
  - Why: The portfolio is public-safe by design. Loop continuity should identify the repository and reusable workflow lessons without preserving exact machine-local checkout paths in newly tracked public docs.
  - Evidence: `AUTONOMOUS-LOOP-STATE.md` introduced the exact delegated UNC checkout path; an older T111 note in `TODO.md` already contained a raw UNC example and a redacted local Windows checkout example.
  - Touches: `AUTONOMOUS-LOOP-STATE.md`, `TODO.md`, `docs/research-2026-06-05-cycle-16.md`, and completion docs.
  - Done: Replaced exact local checkout paths with `SysAdminDoc/sysadmindoc.github.io`, "raw UNC shared-folder checkout", and repo-root wording while preserving the build/test gotcha and delegated same-project continuity.
  - Acceptance: Public docs retain the Windows/UNC test-run lesson and same-project continuation rule without publishing the exact assigned local path.
  - Verify: A path-sensitive `rg` scan over the edited continuity docs found no exact local checkout paths; `git diff --check`.

---

## Researcher Queue (Cycle 17 - 2026-06-06) - see [docs/research-2026-06-06-cycle-17.md](docs/research-2026-06-06-cycle-17.md)

- [x] **T141** P1 - Split CSP style auditing by `style-src-elem` and `style-src-attr`.
  - Why: The current CSP audit treats all style blockers as one `style-src` candidate, but CSP Level 3 separates stylesheet/style-element sources from inline style attributes. That lets the site remove style-element `unsafe-inline` before every dynamic attribute is migrated.
  - Evidence: `node scripts/audit-csp.mjs --candidate-style-src "'self'"` reports 31 source blockers: 15 style blocks and 16 style attributes. `node scripts/audit-csp.mjs --dist --candidate-style-src "'self'"` reports 1,012 rendered blockers across 194 HTML files. MDN documents `style-src-elem` for `<style>`/stylesheet links and `style-src-attr` for inline attributes and `cssText`.
  - Touches: `scripts/audit-csp.mjs`, `test/csp-audit.test.mjs`, `package.json`, `README.md`, `PROJECT_CONTEXT.md`.
  - Acceptance: Audit output and tests classify style elements, stylesheet links, inline style attributes, `cssText` writes, and direct property writes separately; candidate modes exist for `style-src-elem` and `style-src-attr`; a new inline style surface fails tests unless classified.
  - Cycle 18 blueprint: preserve `--candidate-style-src` as the aggregate legacy mode; add `--candidate-style-src-elem` and `--candidate-style-src-attr`; print effective fallback chains for `style-src`, `style-src-elem`, and `style-src-attr`; add inventory for stylesheet/preload links, six runtime `style.cssText` writes, zero `setAttribute("style")` writes, and direct `.style.property` references as informational.
  - Done: `scripts/audit-csp.mjs` now keeps the legacy aggregate `--candidate-style-src` check, adds split `--candidate-style-src-elem` and `--candidate-style-src-attr` candidate modes, prints effective directive fallback lines, inventories 4 stylesheet/preload link surfaces, 6 runtime `style.cssText` writes, 0 runtime `setAttribute("style")` writes, and 27 direct style property references. `test/csp-audit.test.mjs` guards the default inventory, aggregate candidate, split candidate blockers, and strict split failures. `package.json` and `README.md` expose the new split audit commands.
  - Verify: `node --check scripts/audit-csp.mjs`; `node --test test/csp-audit.test.mjs`; `node scripts/audit-csp.mjs --candidate-style-src "'self'"`; `node scripts/audit-csp.mjs --candidate-style-src-elem "'self'"`; `node scripts/audit-csp.mjs --candidate-style-src-attr "'none'"`.

- [x] **T142** P1 - Remove or hash inline style blocks so `style-src-elem` can drop `unsafe-inline`.
  - Why: Style blocks account for 394 rendered blockers, mostly repeated critical CSS plus route/component-local Astro styles. This is a smaller, safer first stage than eliminating all dynamic attributes at once.
  - Evidence: `src/layouts/Base.astro:113` inlines `critical.css`, `src/layouts/Base.astro:134` inlines the no-JS reveal fallback, and 13 page/component style blocks remain across `src/pages/*` and `src/components/*`. Astro docs state `is:inline` leaves styles in final HTML while normal component styles are processed and bundled.
  - Touches: `src/layouts/Base.astro`, `src/styles/critical.css`, `src/styles/global.css`, route/component style blocks, `scripts/audit-csp.mjs`.
  - Acceptance: Component/page style blocks are bundled or hashed intentionally; the critical CSS block is either covered by a generated SHA-256 CSP hash or replaced by a first-paint strategy with no LCP regression; built HTML candidate `style-src-elem` passes without `unsafe-inline`.
  - Cycle 19 blueprint: current built output repeats two intentional style blocks on nearly every page: critical CSS (`sha256-IgolL9OcCAAkbJBdeHMz7R8+koltdJ8QZkkoG6h27v4=`) and no-JS reveal fallback (`sha256-fhXEzLRL2WG8EuNEefYBMuJw0UHROgxh4zJA9nteUUA=`). Only six built routes currently have a third auto-inlined CSS chunk under Astro `inlineStylesheets: 'auto'`. After T141, test `style-src-elem 'self' <critical-hash> <noscript-hash>` while keeping `style-src-attr 'unsafe-inline'`, and separately experiment with `build.inlineStylesheets: 'never'` to externalize the six small chunks if performance/visual audits stay clean.
  - Done: `astro.config.mjs` now uses `build.inlineStylesheets: 'never'`, so the six route-local CSS chunks that Astro previously auto-inlined are emitted as external same-origin CSS assets. `src/layouts/Base.astro` now stages style CSP as `style-src 'self'; style-src-elem 'self' <critical hash> <no-JS hash>; style-src-attr 'unsafe-inline'`, removing style-element `unsafe-inline` while leaving T143's attribute surface explicit. `test/csp-audit.test.mjs` guards the active split policy, the two style hashes, and the `inlineStylesheets` setting.
  - Verify: `node --check scripts/audit-csp.mjs`; `node --test test/csp-audit.test.mjs`; source split audits; normal local `npm test`; normal local `npm run build`; strict built CSP audit. Full rendered build changed from 394 style blocks and 770 style/preload links to 388 style blocks, 776 style/preload links, zero routes with more than two style blocks, and the staged `style-src-elem` candidate passed. `npm run audit:perf -- --strict --lcp 60000 --event 500` passed with no issues. Playwright axe coverage passed after the harness switched its stability stylesheet to a same-origin URL and blocked service workers; screenshot baselines remain a separate T145 drift item.

- [x] **T143** P2 - Convert inline style attributes to class, data, SVG, or finite-token styling.
  - Why: Inline style attributes account for 16 source blockers and 618 rendered blockers. Most values are finite presentation choices, not arbitrary user content, so they can move to classes, `data-*` attributes, SVG attributes, or generated stylesheet rules.
  - Evidence: Current blockers include `SkillCard.astro` ring/color variables, `TagCloud.astro` font-size scaling, `index.astro` legend dots and principle accents, `lang/[slug].astro` lane accent variables, and `projects/[slug].astro` margin/category-dot styles. Runtime `style.cssText` writes remain in `public/scripts/main.js` and `public/scripts/cmdk.js`.
  - Touches: `src/components/SkillCard.astro`, `src/components/TagCloud.astro`, `src/pages/index.astro`, `src/pages/lang/[slug].astro`, `src/pages/projects/[slug].astro`, `public/scripts/main.js`, `public/scripts/cmdk.js`, `src/styles/global.css`.
  - Acceptance: Static Astro `style=""` attributes are removed; `style.cssText` writes are replaced with classes plus direct property writes where dynamic coordinates are required; the CSP audit reports zero source style attributes or only explicitly accepted dynamic cases.
  - Verify: Candidate `style-src-attr 'none'` audit; build; browser probes for homepage charts, language pages, project pages, video overlay, command-palette toast, terminal effects, and copy fallback.
  - Done: Static Astro style attributes now use finite classes, data attributes, category/tone classes, or existing SVG attributes. Runtime `style.cssText` writes in `main.js` and `cmdk.js` were replaced with shared CSS classes plus direct style properties only for dynamic animation offsets and ring draw values. Active CSP now uses `style-src-attr 'none'`.
  - Verify: source grep and CSP audit found no static style attributes, no `cssText` writes, and no `setAttribute("style")` writes; remaining direct `.style.property` writes are limited to dynamic animation coordinates and ring draw offsets. `node scripts/audit-csp.mjs --candidate-style-src-attr "'none'" --strict` passes with zero style-attribute blockers; the new browser candidate audit covers homepage, search, archive, language, project, command palette, terminal, video, and share fallback paths.

- [x] **T144** P2 - Add candidate-policy browser verification before removing style `unsafe-inline`.
  - Why: Static inventory will not prove hydrated UI still works under the new policy. The final policy change needs a browser pass that detects CSP violations, hidden critical content, and route-specific regressions.
  - Evidence: Existing Playwright audits cover visual/axe behavior, and `scripts/audit-csp.mjs` covers source/built inventories, but no current test runs a candidate style CSP and listens for `securitypolicyviolation` across representative routes.
  - Touches: `tests/playwright/portfolio-audits.spec.mjs` or a new CSP-specific browser script, `package.json`, `playwright.audits.config.mjs`, `README.md`.
  - Acceptance: A candidate CSP browser audit visits `/`, `/search/`, `/archive/`, a language page, and a project page; triggers command palette, theme/nav/share/copy/video paths where applicable; fails on CSP violations, console errors, blank critical content, or visual breakage.
  - Verify: New CSP browser audit plus existing `npm run audit:playwright` and `npm run a11y:audit`.
  - Done: Added `tests/playwright/csp-style-policy.spec.mjs` plus `npm run csp:audit:browser`. The audit rewrites rendered documents to the final `style-src-attr 'none'` policy, records `securitypolicyviolation` events, blocks nondeterministic external surfaces, serves the stability stylesheet from a same-origin URL, and exercises representative route and interaction coverage.
  - Verify: `npm run csp:audit:browser` passes after a built `dist/` is available.

- [x] **T145** P2 - Stabilize Playwright visual baselines for current feed-backed output and strict CSP.
  - Why: T142 made the Playwright harness CSP-compatible, and the axe subset now passes under the stricter style policy, but the eight screenshot comparisons fail against stale baselines. The actual pages are coherent; observed differences include current profile-feed project ordering and focus-state drift rather than missing CSS.
  - Evidence: `npx playwright test --config=playwright.audits.config.mjs -g "axe accessibility audit"` passed six route/hydration tests after the harness switched from inline `page.addStyleTag({ content })` to a same-origin fulfilled stylesheet URL. Full `npm run audit:playwright` still fails all eight screenshot comparisons at roughly 2-13% pixel deltas.
  - Touches: `tests/playwright/portfolio-audits.spec.mjs`, `playwright.audits.config.mjs`, screenshot baselines under `tests/playwright/__screenshots__/chromium/`, and possibly fixture/profile-feed setup for deterministic visual data.
  - Acceptance: Visual baseline runs use deterministic data, blocked service workers, stable focus state, and a CSP-compatible stability stylesheet; either refreshed baselines are committed intentionally or the test masks/normalizes the dynamic regions causing false positives.
  - Verify: `npm run generated:fixtures`; deterministic build; `npm run audit:playwright` passes in the same environment used to generate the baselines.
  - Done: Endpoint and DOM-size audits now account for the 16-project generated fixture build without weakening live-scale ceilings: `/llms.txt` keeps a 50-link live floor but derives a fixture floor from required URLs plus project count, and `dom:audit` uses a bounded small-catalog average-card budget for fixture output. Visual baselines were refreshed from the fixture-backed Playwright run.
  - Verify: `npm run generated:fixtures`; `$env:PROFILE_PROJECTS_OFFLINE='1'; npm run check`; `$env:PROFILE_PROJECTS_OFFLINE='1'; npm test`; `$env:PROFILE_PROJECTS_OFFLINE='1'; npm run build:ci`; `$env:PROFILE_PROJECTS_OFFLINE='1'; npm run audit:playwright`.

- [x] **T146** P2 - Promote active style CSP hash drift checks into the build-output audit path.
  - Why: The current unit test guards the `critical.css` and no-JS fallback hashes in `Base.astro`, and the built CSP audit can prove the final policy works. A build-time audit should connect those pieces so future first-paint CSS edits cannot accidentally ship a stale `style-src-elem` hash outside the normal unit-test path.
  - Evidence: Active CSP depends on two SHA-256 hashes (`critical.css` and the no-JS reveal fallback). `test/csp-audit.test.mjs` checks them in source, while `build:ci` currently runs endpoint/feed/DOM/search/schema audits but not a strict rendered style-element candidate audit.
  - Touches: `scripts/audit-csp.mjs`, `package.json`, `test/csp-audit.test.mjs`, `README.md`, and `PROJECT_CONTEXT.md`.
  - Acceptance: `build:ci` or a dedicated build-output script verifies the active rendered `style-src-elem` policy against the generated `dist/` HTML, fails on hash drift, and keeps the source hash test as the faster unit guard.
  - Verify: `npm test`; `npm run build`; strict built CSP style-element audit.
  - Done: Added `--active-style-src-elem` to the CSP audit so strict rendered checks derive the candidate tokens from the active policy instead of duplicating hashes in package scripts. Added `npm run csp:audit:dist:style:elem` and wired it into `build:ci` after HTML repair and public script minification.
  - Verify: `node --check scripts/audit-csp.mjs`; `node --test test/csp-audit.test.mjs test/public-script-minify.test.mjs`; `npm run build:ci`; `npm test`; `npm run check`; `git diff --check`. The build-integrated CSP gate scanned 194 built pages, 388 inline style blocks, and 776 stylesheet/preload links, then passed against the active `style-src-elem` hashes.

- [x] **T147** P2 - Require consistent CSP metadata across rendered pages.
  - Why: The active-policy audit now proves the first rendered CSP contract allows the built style surfaces, but the script still uses the first CSP meta tag as the active policy. A future route with a missing or divergent CSP meta could weaken a single page without changing the first scanned page.
  - Evidence: Current `npm run csp:audit:dist:style:elem` reports 194 CSP meta tags across 194 built HTML files, but it does not yet assert that every rendered CSP meta has identical directive text before deriving active tokens.
  - Touches: `scripts/audit-csp.mjs`, `test/csp-audit.test.mjs`, `package.json`, `README.md`, and `PROJECT_CONTEXT.md`.
  - Acceptance: Strict dist CSP audits fail when any built HTML page lacks a CSP meta tag or has a policy that diverges from the active policy; reporting should identify the first few divergent files without making normal source inventory mode noisy.
  - Verify: `node --check scripts/audit-csp.mjs`; `node --test test/csp-audit.test.mjs`; `npm run build:ci`.
  - Done: Strict dist CSP audits now count files with exactly one CSP meta, count unique rendered CSP policies, and fail when any built page lacks a CSP meta, has multiple CSP metas, or differs from the active policy. Failure output includes representative affected paths.
  - Verify: `node --check scripts/audit-csp.mjs`; `node --test test/csp-audit.test.mjs`; `npm run csp:audit:dist:style:elem`; `npm run build:ci`; `npm test`; `npm run check`; `git diff --check`. Current rendered output reports 194/194 files with one CSP meta and one unique CSP policy.

- [ ] **T148** P2 - Generate active style CSP hashes from source inputs.
  - Why: The source test and rendered dist gate now catch stale `style-src-elem` hashes, but the policy still stores the critical/no-JS hashes as string literals in `Base.astro`. Generating the policy tokens from the CSS source values would make intentional first-paint CSS edits less manual.
  - Evidence: T146/T147 prove the current hashes are correct and consistently rendered, but the next maintainer still has to update the CSP string when `critical.css` or the no-JS fallback style changes.
  - Touches: `src/layouts/Base.astro`, `src/styles/critical.css`, `test/csp-audit.test.mjs`, and possibly a small source helper.
  - Acceptance: The active `style-src-elem` hash tokens are derived from the same source strings that render the inline critical/no-JS style blocks; tests prove the rendered CSP still contains the computed hashes.
  - Verify: `node --check scripts/audit-csp.mjs`; `node --test test/csp-audit.test.mjs`; `npm run build:ci`.

---

## Remaining open — deferred with rationale (need design decision, heavy deps, or input)

These survived the v0.18.0 drain because they need a judgment call I shouldn't make unilaterally, a dependency/CI surface I can't fully verify headlessly, or your input. Each is scoped and ready to pick up.

- Older deferred queue: none currently. Cycle 17 adds the next active style-side CSP hardening items above.

## Parked / rejected (carry-forward — see ROADMAP.md "Rejected or Parked")
Hosted backend search; analytics/visitor tracking; private-repo listing; auto GitHub visibility changes; Notes/TIL feed (NOTES_FEED_POLICY gates unmet); full CSS redesign; client-side embeddings; dependency-graph viz; project comparison tables; CSP data: URI in img-src (accepted); Spotify cookie-setting iframe (privacy — T31 uses static cards only).
