# Changelog

All notable changes to sysadmindoc.github.io will be documented in this file.

## [v0.18.3] - 2026-06-04

- Added `npm run profile-feed:sync`, a build-time raw GitHub cache for `SysAdminDoc/SysAdminDoc` `projects.json` with local fallback preservation.
- Rendered catalog, project routes, command palette, feeds, language lanes, timeline, OG routes, and JSON indexes through `src/data/portfolio.ts`, with curated featured/live-app overlays from local data.
- Suppressed and non-portfolio feed rows are excluded from generated routes; feed-omitted local-only rows no longer render, and the `DuplicateFF` archive entry now links to GitHub instead of a removed project page.
- Fixed the GitHub Pages deploy path so it generates the profile-feed cache before `astro check`; clean CI runners no longer fail on missing `src/data/_profile-projects.json`.
- Verified `npm run check`, `npm run build`, `npm test`, and a focused Chrome CDP browser check: 177 cards, 129 download rows, feed source metadata, no suppressed or local-only cards, `DuplicateFF` 404, and no mobile overflow at 390px.

## [v0.18.2] - 2026-06-04

- Added catalog view buttons for All, New, Recently updated, and Has download. Counts derive from the tracked catalog, cached GitHub metadata, and release download totals.
- Added `NEW` and `DOWNLOAD` catalog chips plus URL-backed `view=` state that combines with category filters, search, and sort.
- Fixed initial catalog URL hydration feedback so deep links apply filters immediately instead of overwriting the filtered result count.
- Verified `npm run check`, `npm run build`, `npm test`, and a focused Chrome CDP browser check: 181 all / 147 new / 173 recent / 20 downloads, with no mobile horizontal overflow at 390px.

## [v0.18.1] - 2026-06-02

**Critical fix:** the homepage interactive layer was completely dead. `public/scripts/main.js` loaded from the page slot — i.e. *before* `public/scripts/shared.js` — so its top-level `if (prefersReducedMotion)` (a global defined in shared.js) threw a `ReferenceError` and halted everything below it: the interactive terminal, catalog search/filter/sort, live GitHub star refresh + ETag requests, scroll progress / nav-hide / back-to-top, the language-donut JS enhancement, live-status dots, the PWA install prompt, and service-worker registration. Server-rendered catalog + build-time baked stats masked the failure, so the page looked healthy.

- Load `main.js` homepage-only from the end of the Base layout body, after `shared.js` + `cmdk-data.js`, so its dependencies are defined first.
- Add a post-build guard in `scripts/fix-html-structure.mjs` that fails the build if `main.js` ever precedes `shared.js` in any page.
- Bump version so the service-worker cache name changes and repeat visitors evict the broken cached `main.js`.

## [v0.18.0] - 2026-06-01

Roadmap-drain sprint. Open work is now consolidated in [TODO.md](TODO.md).

### Reliability & data
- Corrected the contribution-streak algorithm (was reporting a positive streak with no recent push); extracted pure helpers and added a `node:test` unit suite (`npm test`).
- Atomic generated-cache writes (temp-then-rename) in `fetch-stars`.
- Build-time language-mix donut so the Stack section renders real data with no JS / offline / rate-limited.
- Shared `generated.d.ts` cache contracts; advisory validator warning when a featured repo has no catalog entry.

### Accessibility
- `@media (forced-colors: active)` support for Windows High Contrast; reduced-motion guard on CSS scroll-driven reveals and the JS reveal observer.
- Command palette uses `div[role=option]` (valid listbox); hero stats labelled live region; homepage section landmarks; catalog form labels; live-status dots expose reachable/unreachable; mobile-nav focus order; footer `<nav>` landmarks across interior pages.
- Static a11y audit (`npm run a11y:audit`) wired into CI.

### SEO / AEO / feeds
- Connected JSON-LD `@graph` (Person `@id`, ProfilePage, BreadcrumbList, lang CollectionPage); richer project schema.
- `/llms.txt`, `/releases.xml`, `/feed.json` (JSON Feed 1.1); sitemap priority/changefreq + machine-route exclusions; Speculation-Rules prerendering.
- `/.well-known/security.txt`, `humans.txt`.

### Features & UX
- Contact funnel (email + LinkedIn) in Connect + footer; expanded footer nav; Uses/Resume in InteriorNav.
- Terminal command history + Tab completion; case-study markers on Greatest Hits; heatmap streak/peak + 4th intensity bucket.
- Service worker stale-while-revalidate navigation; richer PWA manifest (id/scope/shortcuts/launch_handler); 6h GitHub cache TTL + metered-connection skip.

### Build / CI
- PR build+test+a11y gate (`ci.yml`); deduplicated deploy validation via `build:ci`; ESM `sw:stamp`; `.nvmrc` + `engines`; Dependabot labels/grouping; `semantic:audit` in quality gates.
- **Deploy fixes:** removed `VaultBox` from the catalog after it was made private on GitHub (the public-only catalog audit was failing the deploy); added `scripts/fix-html-structure.mjs` to repair an Astro 6 build quirk that placed the single `</html>` after `</head>` — invalid HTML that made Pagefind index 0 pages and fail the build. Search now indexes all pages again.

## [v0.17.0] - 2026-06-01

Drained the 42-item v0.17.0 roadmap across 13 commits: CSP + sanitize-html hardening, focus/heading/ARIA accessibility fixes, self-hosted fonts and service-worker hygiene, custom 404, View Transitions, JSON-LD, `/uses` and `/resume` pages, case studies, contribution heatmap, native command-palette dialog, expanded RSS, complete light theme, and a premium design-token polish pass. See [COMPLETED.md](COMPLETED.md) and [ROADMAP.md](ROADMAP.md).

## [v0.16.15] - 2026-05-17

**Evaluate local semantic indexing.**

- Added `SEMANTIC_INDEX_DECISION.md` to document why the portfolio is not adding hosted semantic search, client-side embeddings, or visitor tracking right now.
- Added `npm run semantic:audit`, a local advisory project-similarity report over public project metadata and cached README text.
- The audit currently checks 173 projects and 165 usable cached README texts, then reports similar-project and cross-category review candidates for catalog maintenance.
- Kept Pagefind as the user-facing static search layer and limited semantic work to offline maintainability guidance.
- Updated roadmap, README, project context, and package version for v0.16.15.

## [v0.16.14] - 2026-05-17

**Add public portfolio JSON indexes.**

- Added `/projects.json`, a schema-versioned static project index generated from `src/data/projects.ts` and build-time GitHub metadata.
- Added `/releases.json`, a schema-versioned static release index generated from the cached GitHub release data.
- Included freshness timestamps, counts, public project URLs, repository URLs, live URLs, OG image URLs, screenshot/thumbnail URLs, star counts, and pushed/updated metadata where available.
- Advertised both JSON indexes through `<link rel="alternate" type="application/json">` in the shared layout.
- Updated roadmap, README, changelog, and project context for v0.16.14.

## [v0.16.13] - 2026-05-17

**Review image and OG generation pipeline.**

- Added Sharp-backed `npm run screenshots:thumbs` to regenerate 640x400 JPEG thumbnail derivatives from the tracked live-app screenshot masters.
- Added [IMAGE_PIPELINE.md](IMAGE_PIPELINE.md) as the operating record for social cards, live-app screenshots, thumbnail derivatives, README image handling, and the Astro image tooling decision.
- Added `npm run images:audit` and [scripts/audit-image-pipeline.mjs](scripts/audit-image-pipeline.mjs) to validate screenshot master coverage, thumbnail coverage, image dimensions, size budgets, and OG PNG generation constraints.
- Updated live app cards and lazy client thumbnail fallback code to prefer `public/screenshots/thumbs/*.jpg` for compact card previews while keeping full screenshots for detail contexts.
- Extended asset auditing so missing or stale thumbnail derivatives fail alongside missing or stale screenshot masters.
- Added Open Graph/Twitter image type and alt metadata to the shared layout while keeping project OG output as 1200x630 PNG through Satori and Resvg.

## [v0.16.12] - 2026-05-17

**Audit performance, bfcache, and service-worker update UX.**

- Added [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md) with repeatable local Chromium results for homepage, search, archive, and project-page samples plus bfcache status.
- Added `npm run audit:perf` and [scripts/audit-performance.mjs](scripts/audit-performance.mjs) to measure LCP, CLS, lab event timing, long tasks, horizontal overflow, console/network errors, and bfcache restore against a local preview.
- Changed the service worker update flow so new workers wait, show an accessible update toast, and refresh only after the visitor chooses the refresh action.
- Reserved stable homepage terminal and hero text space to reduce desktop layout shift during the animated first viewport.
- Fixed project-detail README rendering so raw relative image HTML resolves to GitHub raw assets instead of missing same-origin files.
- Tightened project-detail mobile layout so README/code/table/header content cannot widen the viewport.

## [v0.16.11] - 2026-05-17

**Add static full-text search.**

- Added Pagefind as the static search indexer and wired `npm run build` to generate `dist/pagefind` after Astro builds.
- Added [src/pages/search.astro](src/pages/search.astro), a Pagefind Component UI search page for rendered project pages, README excerpts, route copy, releases, timeline entries, and archive decisions.
- Added [SEARCH_DECISION.md](SEARCH_DECISION.md) comparing Pagefind, MiniSearch, Fuse.js, Lunr.js, and the existing command palette against GitHub Pages constraints.
- Wired Search into homepage navigation, interior navigation, command palette defaults, quick links, and Connect entry points.
- Kept `Ctrl/Cmd+K` for keyboard command navigation and added no-JS fallback links on `/search/`.

## [v0.16.10] - 2026-05-17

**Add public-safe archive decisions.**

- Added [src/data/archive.ts](src/data/archive.ts) with typed archive-decision entries for moved, archived, held, removed, and superseded project surfaces.
- Added [src/pages/archive.astro](src/pages/archive.astro), a static anti-portfolio page that explains retired project decisions without exposing unsafe links.
- Wired Archive into the homepage nav, interior nav, command palette, quick links, and Connect section.
- Extended `npm run data:validate` to validate archive entry IDs, statuses, source notes, safe links, and no-link sensitive holds.
- Updated roadmap, README, project context, and package version so the next active roadmap item is upgraded search.

## [v0.16.9] - 2026-05-17

**Document the public notes-feed decision.**

- Added [NOTES_FEED_POLICY.md](NOTES_FEED_POLICY.md) as the source-of-truth decision record for the conditional `/til` or notes feed roadmap item.
- Documented why changelog history, generated GitHub metadata, research logs, and local memory are not durable public note sources.
- Added activation criteria for any future public-safe notes feed and RSS implementation.
- Updated roadmap, README, and project context so the next active roadmap item is the retired-project archive.

## [v0.16.8] - 2026-05-17

**Add generated year-in-review timeline.**

- Added [src/pages/timeline.astro](src/pages/timeline.astro), a static timeline generated from cached GitHub releases, project push metadata, and tracked changelog highlights.
- Added year-review cards plus timeline filters for year, platform, category, and language.
- Wired Timeline into the homepage nav, interior nav, command palette, and connect entry points.
- Kept filter state in-page instead of query-string URLs so static preview and GitHub Pages direct links stay reliable.
- Limited Astro build route concurrency to one to keep the large generated OG route set deterministic during local and CI builds.
- Updated roadmap and project context so the next visible roadmap item is the public-safe notes feed decision.

## [v0.16.7] - 2026-05-17

**Add proof-oriented project detail sections.**

- Added [src/data/proof.ts](src/data/proof.ts) with source-backed optional proof records for high-signal projects.
- Added `ProjectProof` and `ProjectProofSource` types.
- Project detail pages now render a conditional Proof section covering problem, build evidence, platform support, install path, known limitations, and sources.
- `npm run data:validate` now validates proof records and source URL shape.

## [v0.16.6] - 2026-05-17

**Modernize CI quality gates.**

- Added [.github/dependabot.yml](.github/dependabot.yml) for weekly npm and GitHub Actions dependency updates.
- Added [.github/workflows/quality-gates.yml](.github/workflows/quality-gates.yml) for weekly/manual production audit, catalog drift, data validation, asset/reference audit, and Astro check reporting.
- The quality-gates workflow uploads command logs as `quality-gate-reports`.
- When production audit or public catalog drift fails, the workflow opens or updates a GitHub issue with the failing logs.

## [v0.16.5] - 2026-05-17

**Add stale asset and source-reference checks.**

- Added [scripts/audit-assets.mjs](scripts/audit-assets.mjs) and `npm run assets:audit`.
- `npm run check` and `npm run build` now run the asset/reference audit after project data validation.
- The audit compares `public/screenshots/*.jpg` against live app slugs and fails on missing or stale thumbnails.
- The audit also checks public script references, Astro component imports, and non-generated data module references as a lightweight dead-code guard.
- Added [archive/screenshots/README.md](archive/screenshots/README.md) as the explicit policy for stale or historical screenshots outside `public/`.
- Wired the asset/reference audit into the deploy workflow.

## [v0.16.4] - 2026-05-17

**Split generated GitHub data refresh from deployment.**

- Added [scripts/summarize-generated-data.mjs](scripts/summarize-generated-data.mjs) and `npm run data:summary` to report generated metadata freshness and integrity.
- Added [.github/workflows/data-refresh.yml](.github/workflows/data-refresh.yml) for scheduled/manual GitHub metadata refresh without deploying.
- Removed the daily schedule trigger from the deploy workflow; pushes and manual dispatches still refresh generated data before building.
- Deploy and data-refresh workflows now require `GITHUB_TOKEN`, summarize generated metadata, publish the summary to the job summary, and upload `github-data-refresh-summary`.
- Ignored local summary output folders with `.tmp/` and `data-refresh-summary/`.

## [v0.16.3] - 2026-05-17

**Schema-check the project data layer.**

- Added `npm run data:validate` via [scripts/validate-project-data.mjs](scripts/validate-project-data.mjs).
- `npm run check` and `npm run build` now validate project data before Astro check/build.
- The validator checks required fields, unique section slugs, category/language enums, HTTPS URL shape, live app screenshot coverage, public/private policy exceptions, derived route counts, and command palette coverage.
- Added shared category labels in [src/data/categories.ts](src/data/categories.ts) and typed featured project language IDs against the `Lang` enum.
- Added missing tracked screenshots for `HurricaneMap` and `ApocalypseWatch` so every live app has a validation-backed thumbnail.
- Wired project data validation into the GitHub Pages workflow.
- Corrected the current catalog count surfaced in README/docs to the schema-validated 173 entries.

## [v0.16.2] - 2026-05-17

**Security remediation, catalog drift audit, and three new public repos.**

Security and CI
- Upgraded Astro to 6.3.3, `marked` to 18.0.3, and `sanitize-html` to 2.17.4.
- Refreshed vulnerable transitive production dependencies: `devalue` 5.8.1 and `postcss` 8.5.14.
- Added `npm run audit:prod` and wired it into the GitHub Pages deploy workflow.
- Added `npm run catalog:audit` to compare active public GitHub repos against the portfolio data.

Catalog
- Added `OpenLumen` (Kotlin/Android), `PhoneFork` (C# desktop), and `AI-Usage_Tracker` (extension/userscript) to [src/data/projects.ts](src/data/projects.ts).
- Added [src/data/catalog-policy.json](src/data/catalog-policy.json) to document intentional public-repo exclusions and the `RadAtlas` privacy-review hold.
- Strengthened [scripts/audit-catalog.mjs](scripts/audit-catalog.mjs) so privacy-review repos fail the audit if they reappear in project data or public screenshot artifacts.
- Removed stale `RadAtlas` and `GeneratorSpecs` screenshots.
- Catalog count: 155 -> 158.

## [v0.16.1] - 2026-05-11

**Drop TeamStation — repo went PRIVATE on GitHub.**

The catalog entry was 404'ing for visitors. Removed from [src/data/projects.ts](src/data/projects.ts) (catalog 156 → 155). Caught during the matching profile-README cleanup pass.

## [v0.16.0] - 2026-05-11

**Remove the Spotify / Slunder music section + tighten experience claims.**

The Spotify portion of "Beyond Code" added noise without telling visitors anything actionable about the work. Pulled the embed, album grid, Listen-on-Spotify CTA, and the matching Beyond-card kicker. Aerial Footage subsection stays.

Removed
- The entire `<h3 id="beyond-music">` block from [src/pages/index.astro](src/pages/index.astro), the `<a href="#beyond-music">` Beyond card, and the `albums` / `earliestAlbumYear` / `latestAlbumYear` / `latestAlbumName` constants.
- Spotify URL from the `Person.sameAs` array in [src/layouts/Base.astro](src/layouts/Base.astro) JSON-LD.
- The lazy-load Spotify embed IIFE from [public/scripts/main.js](public/scripts/main.js).
- All `.music-*`, `.album-*`, `.spotify-*` rules + joint-selector references in [src/styles/global.css](src/styles/global.css) (the `/* Music */` block plus the responsive + light-theme compounds).
- Slunder/Suno reference in the `/now` `listening` line ([src/data/curated.ts](src/data/curated.ts)) — replaced with neutral copy.

Honesty pass
- Hero title under "Matt Parker": no longer claims 15+ years in DICOM/PACS. Now: "15+ years in enterprise IT, the last six in medical imaging".
- `<meta description>` in `Base.astro` aligned to the same split (15+ IT / 6 imaging).
- Healthcare-IT origin-point narrative in the Journey section rewritten so it doesn't imply 15 straight years of imaging.

## [v0.15.0] - 2026-05-11

**Catalog refresh — add 9 new public repos shipped since v0.14.x.**

Added to [src/data/projects.ts](src/data/projects.ts):
- `HurricaneMap` — live + catalog (web). Leaflet map of every U.S. hurricane landfall from NOAA HURDAT2.
- `ApocalypseWatch` — live + catalog (web). Realtime business-jet tracker dashboard.
- `Devicer` (cs) — Windows toolkit for rooted Android, .NET 10 WPF.
- `Snapture` (cs) — all-in-one Windows screenshot utility, .NET 10 WPF.
- `OrganizeContacts` (cs) — local-first contact deduper.
- `OpenSwift` (kt) — SwiftKey-style Android keyboard.
- `SwiftFloris` (kt) — SwiftKey-style FlorisBoard fork.
- `OpenTasker` (kt) — FOSS Tasker alternative for Android.
- `android-debloat-list` (guide) — curated Android debloat list with vulnerability notes.

Live apps 20 → 22. Catalog 147 → 156. `fallbackRepoCount` auto-updates.

Star cache also refreshed against current GitHub state.

## [v0.14.2] - 2026-05-01

**Remove the last private-repo references from the site.**

`DICOM-PACS-Migrator` and `XRayAcquisition` are private/non-public — visitors hitting their detail pages or following their cards from the catalog were getting dead links into GitHub. Stripped every reference so the site reflects only public, openable work.

Removed
- `DICOM-PACS-Migrator` catalog entry from [src/data/projects.ts](src/data/projects.ts).
- `DICOM-PACS-Migrator` and `XRayAcquisition` from `healthcareIT.repos` in [src/data/curated.ts](src/data/curated.ts) (now an empty array with an explanatory comment).
- The `clinicalLane` lookup in [src/pages/healthcare-it.astro](src/pages/healthcare-it.astro) that hand-mapped both private slugs.

Replaced
- `DICOM-PACS-Migrator` in [Greatest Hits](src/data/curated.ts) → `UniversalConverterX` ("1000+ format desktop converter — WinUI 3 shell with sidecar engines for media, docs, archives, PDFs, subtitles, fonts, ebooks, OCR. The Wondershare alternative that doesn't phone home.").

Refined
- Healthcare IT page now hides the entire "Projects in this track" section when no public showcases exist; "Why this track exists" still narrates the lane.
- About-section narrative on the index now says "the DICOM migration toolchain and the acquisition-PC network scanner" instead of naming the private repo directly.

`fallbackRepoCount` auto-updates from the new catalog size.

## [v0.14.1] - 2026-05-01

**Removed RadAtlas and GeneratorSpecs from the portfolio.**

- Removed from `liveApps` and `catalog` in [src/data/projects.ts](src/data/projects.ts).
- Removed from `healthcareIT.repos` in [src/data/curated.ts](src/data/curated.ts) — Healthcare IT track now lists DICOM-PACS-Migrator + XRayAcquisition only.
- Removed `clinicalLane` mappings from [src/pages/healthcare-it.astro](src/pages/healthcare-it.astro) and updated the page description (no longer mentions technique charts / generator specs).
- Updated narrative in [src/pages/index.astro](src/pages/index.astro) — "production tooling adopted company-wide" line and About paragraph no longer reference RadAtlas or Generator Specs.
- Removed both LIVE cards and the RadAtlas catalog entry from `legacy.html`.
- README content-collection counts: live apps 22 → 20, catalog 150 → 148.

## [v0.14.0] - 2026-04-30

**Catalog refresh — add 12 missing public repos and refine HEICShift description.**

Added to [src/data/projects.ts](src/data/projects.ts):
- **PowerShell**: AdapterLock (per-adapter IP lockdown, registry-ACL TCP/IP freeze), LTSC-MicrosoftStore (add MS Store to Win11 24H2 LTSC).
- **Python**: mnamer (media file renaming/organizing), TagStudio (photo & file management).
- **Extensions**: Vantage (Chromium MV3 new-tab dashboard with RSS, news, weather, quick links).
- **Kotlin / Android**: AppManagerNG (power-user package manager, continuation of MuntashirAkon/AppManager), CallShield (spam call/text blocker with GitHub-hosted spam DB).
- **C# / Desktop**: Vigil (lean ungoogled-chromium browser), TabExplorer (tabbed file manager), RcloneBrowser (cross-platform rclone GUI).
- **Other**: improve-repo (automated repo improvement pipeline), project-nomad (the original NOMAD spec/concept repo, sibling to project-nomad-desktop).

Refined
- **HEICShift** description: "HEIC/HEIF batch converter" → "Universal image batch converter — HEIC/HEIF/AVIF/WEBP/JPG/PNG, PyQt6" (matches the v2.8.0 scope).

`fallbackRepoCount` (used in `/now` and `derived.ts`) auto-recalculates from the new catalog size, so visible repo numbers update with no further edits. Build cache refreshed via `fetch-stars`.

## [v0.13.1] - 2026-04-25

**Catalog refresh — add 12 missing public repos.**

Added to [src/data/projects.ts](src/data/projects.ts):
- **C# / Desktop**: MyPortfolio, LocalChromeStore, LocalDesktopStore, TeamStation, Images
- **Kotlin / Android**: LocalAndroidStore, one-ui-home-clone
- **Python**: Tunerize, Vertigo, PromptCompanion, SunoJump
- **PowerShell**: DisableDefender
- **Other**: octopus-factory

`fallbackRepoCount` (used in `/now` and `derived.ts`) auto-recalculates from the new catalog size, so visible repo numbers update with no further edits.

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
