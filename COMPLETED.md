# Completed Work Consolidation

Consolidated: 2026-06-01
Sources: ROADMAP.md, PROJECT_CONTEXT.md, .ai/research/2026-05-17/*.md, NOTES_FEED_POLICY.md, PERFORMANCE_AUDIT.md, IMAGE_PIPELINE.md, SEARCH_DECISION.md, SEMANTIC_INDEX_DECISION.md, FEATURE_BACKLOG.md, PRIORITIZATION_MATRIX.md

This file captures all completed and stale items from the 2026-05-17 research sprint (v0.16.1 to v0.16.15) and the subsequent 2026-06-01 catalog additions. It replaces the completed-item tracking that was previously spread across 10+ planning files.

---

## Shipped Features

### Tier 0: Correctness, Security, and Trust

- [x] **Fix production dependency advisories** -- Upgraded sanitize-html (2.17.2 to 2.17.4), marked (18.0.0 to 18.0.3), Astro (5.18.1 to 6.3.3). Resolved transitive devalue and postcss advisories. Added `npm run audit:prod` CI gate. _(Source: ROADMAP.md #1, SECURITY_AND_DEPENDENCY_REVIEW.md)_
- [x] **Remove script-side CSP unsafe-inline** -- Externalized first-paint theme/style initialization, command-palette section hydration, section jump navigation, recently viewed tracking, Pagefind query bootstrap, resume printing, and timeline filtering. Active CSP now uses `script-src 'self'`; `npm run csp:audit` strict candidate mode passes with zero executable inline scripts and zero inline event handlers. _(Source: TODO.md T95, ROADMAP.md CSP hardening)_
- [x] **Remove style-attribute CSP unsafe-inline** -- Converted finite inline style attributes and runtime `style.cssText` writes to classes, tone maps, SVG attributes, and direct dynamic style-property writes. Active CSP now uses `style-src-attr 'none'`; source, built, and browser candidate-policy audits pass without style-attribute violations. _(Source: TODO.md T143/T144, ROADMAP.md style-side CSP hardening)_
- [x] **Gate rendered style CSP hash drift** -- Added a strict build-output `style-src-elem` audit that derives tokens from the active CSP policy and runs inside `build:ci`, failing if rendered critical/no-JS style blocks drift from their hashes. _(Source: TODO.md T146, ROADMAP.md style-side CSP hardening)_
- [x] **Require rendered CSP metadata consistency** -- Strict dist CSP audits now fail when any built HTML page lacks a CSP meta tag, has duplicate CSP metas, or diverges from the active policy. _(Source: TODO.md T147, ROADMAP.md style-side CSP hardening)_
- [x] **Generate active style CSP hashes** -- `Base.astro` now computes active `style-src-elem` hashes from the same critical/no-JS CSS source strings that render the inline style blocks, with source and rendered audits resolving the generated policy. _(Source: TODO.md T148, ROADMAP.md style-side CSP hardening)_
- [x] **Add rendered interaction smoke coverage** -- Added `npm run audit:interactions`, a focused Playwright smoke over built `dist/` that checks generated active CSP, homepage command palette, terminal, catalog search, video close, mobile language-lane navigation, project share fallback, console errors, and horizontal overflow without screenshot assertions. _(Source: TODO.md T149, ROADMAP.md style-side CSP hardening)_
- [x] **Promote rendered interaction smoke to PR CI** -- Pull-request CI now runs `npm run audit:interactions` after Chromium installation and before the fixture-backed visual/axe Playwright suite, with source-contract coverage for the npm script and workflow order. _(Source: TODO.md T150, ROADMAP.md style-side CSP hardening)_
- [x] **Stabilize fixture-backed Playwright baselines** -- Made endpoint and DOM-size audits compatible with deterministic 16-project fixture builds while preserving live-scale ceilings, then refreshed the eight desktop/mobile visual baselines from fixture `build:ci` output. `PROFILE_PROJECTS_OFFLINE=1 npm run audit:playwright` now passes all CSP, axe, and visual checks. _(Source: TODO.md T145, ROADMAP.md style-side CSP hardening)_
- [x] **Reconcile live GitHub catalog against projects.ts** -- Added OpenLumen, PhoneFork, AI-Usage_Tracker. Documented intentional exclusions (Scripts, ChanPrep, SysAdminDoc, null). Added catalog-policy.json, `npm run catalog:audit`. Refreshed GitHub metadata caches. _(Source: ROADMAP.md #2)_
- [x] **Resolve medical-imaging public boundary** -- RadAtlas excluded from portfolio, blocked by catalog:audit. Removed stale RadAtlas and GeneratorSpecs screenshots. GitHub visibility changes remain owner-only outside this repo. _(Source: ROADMAP.md #3)_
- [x] **Make project memory canonical** -- Created PROJECT_CONTEXT.md as the tracked canonical project memory. Tool-specific files (AGENTS.md, CLAUDE.md) relegated to pointers/working notes. _(Source: ROADMAP.md #4)_

### Tier 1: Data Model and Build Reliability

- [x] **Schema-checked project data** -- Added validate-project-data.mjs, shared category labels in categories.ts, live-app screenshot coverage enforcement, command-palette coverage checks. Missing screenshots for HurricaneMap and ApocalypseWatch added. _(Source: ROADMAP.md #5, PRIORITIZATION_MATRIX.md P1-1)_
- [x] **Split generated data refresh from deployment** -- Created data-refresh.yml workflow (daily + manual), deploy-time summary artifacts, `npm run data:summary`. _(Source: ROADMAP.md #6, PRIORITIZATION_MATRIX.md P1-2)_
- [x] **Stale asset and dead-code checks** -- Added audit-assets.mjs, screenshot drift detection, public script/component/data-module reference checks, archive/screenshots/ policy. _(Source: ROADMAP.md #7, PRIORITIZATION_MATRIX.md P1-3)_
- [x] **Modernize CI quality gates** -- Added Dependabot for npm/GitHub Actions, weekly quality-gates.yml workflow, production audit + catalog drift reporting with auto-issue creation. _(Source: ROADMAP.md #8, PRIORITIZATION_MATRIX.md P1-4)_

### Tier 2: Portfolio Experience and Storytelling

- [x] **Proof-oriented project detail sections** -- Added src/data/proof.ts, ProjectProof types, conditional rendering on project pages, validator coverage for proof records. _(Source: ROADMAP.md #9, PRIORITIZATION_MATRIX.md P2-1)_
- [x] **Year-in-review / timeline layer** -- Added /timeline/ page with year cards, filterable release/project/changelog events. Wired into navigation and command palette. _(Source: ROADMAP.md #10, PRIORITIZATION_MATRIX.md P2-2)_
- [x] **Public-safe notes feed policy** -- Parked by policy. Created NOTES_FEED_POLICY.md with 7 activation criteria. No notes route or RSS until reviewed source corpus exists. _(Source: ROADMAP.md #11, PRIORITIZATION_MATRIX.md P2-3)_
- [x] **Archive / anti-portfolio section** -- Added src/data/archive.ts, /archive/ page, navigation/command-palette links, validator coverage. Sensitive entries grouped without links. _(Source: ROADMAP.md #12, PRIORITIZATION_MATRIX.md P2-4)_

### Tier 3: Discovery, Search, and Performance

- [x] **Static full-text search** -- Shipped Pagefind Component UI at /search/, build-time dist/pagefind generation, no-JS fallback links. Command palette preserved for keyboard nav. _(Source: ROADMAP.md #13, PRIORITIZATION_MATRIX.md P3-1, SEARCH_DECISION.md)_
- [x] **Core Web Vitals / bfcache audit** -- Added PERFORMANCE_AUDIT.md, audit-performance.mjs, explicit service-worker update prompts, repeatable Chromium CDP audit. Mobile homepage LCP (3156ms) documented as follow-up. _(Source: ROADMAP.md #14, PRIORITIZATION_MATRIX.md P3-2)_
- [x] **Image and OG pipeline review** -- Added Sharp thumbnails, IMAGE_PIPELINE.md, audit-image-pipeline.mjs, thumbnail-aware asset auditing, social-card PNG metadata. _(Source: ROADMAP.md #15, PRIORITIZATION_MATRIX.md P3-3)_

### Tier 4: Data, Automation, and Integrations

- [x] **Machine-readable project feeds** -- Added /projects.json and /releases.json with schema versions, freshness timestamps, public URLs. _(Source: ROADMAP.md #16, PRIORITIZATION_MATRIX.md P4-1)_
- [x] **Local semantic indexing evaluation** -- Added SEMANTIC_INDEX_DECISION.md, `npm run semantic:audit` for offline project similarity/category-drift review. No hosted inference or tracking. _(Source: ROADMAP.md #17, PRIORITIZATION_MATRIX.md P4-2)_

### Post-Sprint Additions (2026-05-26 to 2026-06-01)

- [x] **AI-scrub rewrite** -- Integrated via merge commit de2bcc5. _(Source: git log)_
- [x] **Add 9 missing repos to portfolio catalog** -- Commit 1d0d6b8, 2026-06-01. _(Source: git log)_
- [x] **Catalog freshness and download views** -- Added URL-backed New, Recently updated, and Has download catalog slices derived from cached GitHub metadata and release downloads; verified build, unit tests, and focused browser behavior. _(Source: SysAdminDoc ROADMAP NF6)_
- [x] **Profile feed-backed catalog rendering** -- Added build-time profile feed sync and rendered catalog, project routes, command palette, feeds, language lanes, timeline, OG routes, and JSON indexes from the public SysAdminDoc `projects.json` feed while preserving local curated overlays and fallback data. _(Source: SysAdminDoc ROADMAP P1)_
- [x] **Non-blocking global CSS and critical first paint** -- Added `src/styles/critical.css`, inlined it from `Base.astro`, and loaded the monolithic hashed `global.css` asset through preload plus a print-media swap. Re-baselined the performance audit with mobile homepage LCP at 668ms. _(Source: TODO T16/T102)_
- [x] **Advisory Lighthouse CI budget** -- Added `lighthouserc.cjs`, `npm run lhci:audit`, PR CI report upload, and warning-only budgets for sampled homepage/project-detail routes. _(Source: TODO T27)_
- [x] **Astro-managed live-card thumbnails** -- Added tracked `src/assets/screenshots/thumbs/` inputs, rendered Live Apps cards through Astro `<Picture>` with AVIF/WebP srcsets and JPEG fallback, and extended screenshot generation/audits to keep public and Astro thumbnail copies in lockstep. _(Source: TODO T28)_
- [x] **Build-time project ranking signal** -- Added a pure ranking helper plus unit coverage for the deterministic blend of stars, 180-day freshness decay, and release-download activity; homepage `Recommended` order and project related links now use the same rank map. _(Source: TODO T36)_
- [x] **Visible Pagefind category facets** -- Enabled Pagefind faceted mode on `/search/` and rendered the official filter pane so the static full-text search can be narrowed by indexed project category without custom client search code. _(Source: TODO T35)_
- [x] **Interior-page OG cards** -- Generalized the existing Satori/Resvg `/og/[slug].png` endpoint with shared interior-page metadata so key secondary pages publish differentiated 1200x630 PNG social cards. _(Source: TODO T42)_
- [x] **Interior freshness signals** -- Added a shared reviewed-date data source, visible `Last updated` rows, and reviewed `WebPage.dateModified` schema for `/uses/`, `/resume/`, and `/healthcare-it/`. _(Source: TODO T43)_
- [x] **Below-fold homepage render containment** -- Reintroduced guarded `content-visibility:auto` for ten below-fold homepage sections with intrinsic-size fallbacks and browser/performance verification. _(Source: TODO T79)_
- [x] **Project-page native sharing** -- Added a `Share project` action to every project detail page with Web Share API support, clipboard/execCommand fallback, and polite status feedback so desktop and mobile visitors can share or copy canonical project URLs. _(Source: TODO T138, docs/research-2026-06-05-cycle-14.md)_
- [x] **Installed-PWA shortcut metadata guard** -- Added useful descriptions to Catalog/Search/Releases/Now manifest shortcuts and a source test that preserves shortcut order, same-origin destinations, `source=pwa` tracking, and standalone launch metadata. _(Source: TODO T139, docs/research-2026-06-05-cycle-15.md)_
- [x] **Public loop-state path sanitization** -- Replaced exact local checkout paths in loop continuity docs with repository identity and generic UNC/root wording while preserving the Windows shared-folder test gotcha. _(Source: TODO T140, docs/research-2026-06-05-cycle-16.md)_

### Research Infrastructure (2026-05-17)

- [x] **Research log** -- 5-phase process documented (instruction intake, repo recon, verification/security baseline, live GitHub reconciliation, external ecosystem research). _(Source: RESEARCH_LOG.md)_
- [x] **Competitor matrix** -- Pattern analysis for 11 sites/templates. _(Source: COMPETITOR_MATRIX.md)_
- [x] **Feature backlog** -- Raw opportunity harvest organized by category. _(Source: FEATURE_BACKLOG.md)_
- [x] **Prioritization matrix** -- 16 candidates scored on Impact/Fit/Effort/Risk/Evidence. _(Source: PRIORITIZATION_MATRIX.md)_
- [x] **Source register** -- 30 local, 11 command, 35 external sources indexed. _(Source: SOURCE_REGISTER.md)_
- [x] **Security review** -- npm audit, dependency versions, secret scan, advisory remediation. _(Source: SECURITY_AND_DEPENDENCY_REVIEW.md)_
- [x] **Dataset/model/integration review** -- 4 opportunity areas evaluated. _(Source: DATASET_MODEL_INTEGRATION_REVIEW.md)_
- [x] **Memory consolidation** -- Instruction reconciliation, version state, canonicalization decision. _(Source: MEMORY_CONSOLIDATION.md)_
- [x] **State of repo snapshot** -- Git state, version surfaces, architecture, risk identification at v0.16.1. _(Source: STATE_OF_REPO.md)_
- [x] **Changeset summary** -- All files created/modified and verification results. _(Source: CHANGESET_SUMMARY.md)_

---

## Stale / Obsolete Items

Items that were completed but now have outdated references or assumptions.

### [STALE] CLAUDE.md (local, gitignored)
- Version says v0.16.0 -- actual version is v0.16.15
- Last updated says 2026-05-11 -- significant work done 2026-05-17 and 2026-06-01
- Tech stack says Astro 5 -- now Astro 6
- Missing Pagefind, /search/, /timeline/, /archive/, proof.ts, archive.ts, categories.ts, catalog-policy.json, and all audit scripts added in v0.16.2-v0.16.15
- Service worker cache says portfolio-v9 -- now portfolio-v10
- Key files list missing 18+ files added since v0.16.0
- _(Source: CLAUDE.md discovery data)_

### [STALE] STATE_OF_REPO.md
- Version references v0.16.1 -- project is now v0.16.15
- Local data state (167 repos, 204 stars from 2026-05-11) was superseded by 2026-05-17 refresh (170 non-fork repos, 220 stars) and 2026-06-01 additions (182+ catalog entries)
- npm audit findings were all remediated
- _(Source: .ai/research/2026-05-17/STATE_OF_REPO.md)_

### [STALE] MEMORY_CONSOLIDATION.md
- References v0.16.1 as current -- now v0.16.15
- Open conflict about RadAtlas was resolved (excluded, blocked by catalog:audit)
- Open conflict about fork policy was resolved (catalog-policy.json)
- Open conflict about stale CLAUDE.md -- still unresolved (CLAUDE.md remains at v0.16.0)
- _(Source: .ai/research/2026-05-17/MEMORY_CONSOLIDATION.md)_

### [STALE] SECURITY_AND_DEPENDENCY_REVIEW.md
- Direct dependency version table references Astro 5.18.1 -- now 6.3.3
- TypeScript 5.9.3 current, 6.0.3 latest -- upgrade status unclear
- Hardening backlog items not implemented: README sanitizer regression fixtures, CSP review, link-health checks
- _(Source: .ai/research/2026-05-17/SECURITY_AND_DEPENDENCY_REVIEW.md)_

### [STALE] PROJECT_CONTEXT.md
- Version surfaces section references v0.16.1 reconciliation -- version is now v0.16.15
- CLAUDE.md documented as stale at v0.16.0 but still not fixed
- GitHub stats (170 repos, 220 stars) are 15 days old after 9 repos added 2026-06-01
- _(Source: PROJECT_CONTEXT.md discovery data)_

### [STALE] Build-time stats (_stats.json)
- Last fetched 2026-05-17, reports totalRepos:170 -- now 182+ catalog entries
- lastPushedRepo, streak, and star counts are 15 days old
- _(Source: Feature Inventory findings)_

### [STALE] /now/ page content
- now.updated hardcoded to 2026-04-16 (46 days old)
- Building and thinking sections reference outdated projects
- Does not reflect v0.16.1-v0.16.15 sprint or 2026-06-01 additions
- _(Source: Feature Inventory findings, src/data/curated.ts)_

### [STALE] FEATURE_BACKLOG.md remaining items
The following items from the 2026-05-17 backlog were never implemented and remain as potential future work:
- README-rendering regression tests for sanitizer/markdown upgrades
- Generated evidence badges for build/check/release status
- Repo URL reachability validation through GitHub API
- Playwright smoke CI for homepage/catalog/project detail
- bfcache audit automation in CI
- `npm run verify` wrapper for check/build/audit/catalog
- Release timeline modules on project pages
- Related projects by tag/category/technology
- Screenshot freshness dates
- README excerpt quality controls
- Link health checks for live demos and project URLs
- "Why this exists" summaries for featured projects
- Project arcs page grouping related efforts
- /tools index for live utilities and web apps
- Category/language quick filters for search
- Search result highlighting beyond Pagefind defaults
- No-JS sitemap/catalog fallback for all filters
- Stale preconnect hints review
- Generated similarity links from descriptions/tags
- Search relevance evaluation set
- Category suggestions for newly public repos
- _(Source: .ai/research/2026-05-17/FEATURE_BACKLOG.md)_

### [STALE] DATASET_MODEL_INTEGRATION_REVIEW.md remaining items
- Search relevance evaluation set (not implemented)
- Category suggestions for newly public repos (not implemented)
- Near-duplicate description detection (semantic:audit is advisory only)
- Related projects as public feature (offline only)
- catalog-stats.json feed (not created, stats are in projects.json)
- _(Source: .ai/research/2026-05-17/DATASET_MODEL_INTEGRATION_REVIEW.md)_
