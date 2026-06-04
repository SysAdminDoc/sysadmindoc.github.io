# Project Context

Last consolidated: 2026-06-04
Repository: `SysAdminDoc/sysadmindoc.github.io`
Site: https://sysadmindoc.github.io
Current tracked version: v0.18.3

This is the canonical tracked project context for future work. Tool-specific and machine-local instruction files can point here, but this file should carry durable facts, current architecture, public/private boundaries, and roadmap state.

## Purpose

`sysadmindoc.github.io` is the public portfolio and project showcase for Matt Parker / SysAdminDoc. It presents public GitHub work, live app screenshots, project pages, generated README excerpts, releases, skills, curated highlights, and healthcare IT positioning.

The site must remain public-safe. It should not expose private repository names, internal employer details, unpublished medical-imaging work, or local machine memory beyond what is intentionally documented in the public repo.

## Current Architecture

- Static site built with Astro 6.
- TypeScript data layer under `src/data/`.
- `src/data/portfolio.ts` is the rendered portfolio adapter. It consumes the ignored profile feed cache at `src/data/_profile-projects.json`, maps profile categories into site categories, excludes suppressed/non-portfolio rows, and preserves local curated featured/live-app overlays.
- Main pages under `src/pages/`, including homepage, catalog, search, project detail pages, OG image endpoints, RSS, releases, timeline, archive decisions, language pages, and healthcare IT pages.
- Shared layout in `src/layouts/Base.astro`.
- Components under `src/components/`.
- First-viewport critical styling lives in `src/styles/critical.css` and is inlined by `src/layouts/Base.astro`; the full `src/styles/global.css` bundle is emitted as a hashed asset, preloaded, and applied through a non-blocking print-media swap with `noscript` and `shared.js` media-swap fallbacks.
- Browser behavior in `public/scripts/main.js`, `public/scripts/cmdk.js`, and `public/scripts/theme.js`.
- Service worker in `public/sw.js`.
- Generated GitHub metadata caches under `src/data/_*.json` are ignored.
- `/timeline/` is generated from ignored GitHub release and metadata caches plus tracked changelog entries, then filtered client-side by year, platform, category, and language.
- Timeline filters update the current page in place; they intentionally avoid query-string state so static preview and GitHub Pages direct links remain stable.
- `/archive/` is a public-safe anti-portfolio generated from `src/data/archive.ts`. Sensitive entries are grouped without links; safe entries link only to current public project pages or reviewed public GitHub repositories.
- `/search/` is a Pagefind Component UI-backed full-text search page with Pagefind faceted mode enabled and the official Category filter pane visible beside results. `npm run build` runs Astro, `npm run search:index`, and `npm run search:audit`, which writes the static search bundle to `dist/pagefind` and verifies generated Category filters/results against rendered project/catalog data.
- The homepage catalog renders from the public SysAdminDoc profile `projects.json` feed when the build-time cache is available. URL-backed `view=` slices for all/new/recently updated/has-download derive from feed fields plus ignored `_meta.json` freshness and `_releases.json` release download totals.
- Project detail pages use the catalog category as the Pagefind Category source of truth, with featured-language data remaining presentation context only.
- The catalog's default `Recommended` order is computed at build time in `src/data/project-ranking.mjs`: log-normalized stars, 180-day freshness half-life, and release-download activity are blended into a deterministic score. Catalog cards render visible `Recommended #N` rationale text and attach it through `aria-describedby` while the default sort is active; non-Recommended sorts hide the visible rationale. Project detail related links use the same rank map and expose their own ranking rationale. Explicit Most stars, A-Z, Z-A, and Recently updated sorts remain client-side. `npm run data:summary` reports the top ranked rows and guards normalized weights, finite scores/score parts, usable project identities, unique contiguous ranks, profile-feed health, and README refresh quality.
- The homepage hero has a first-viewport proof strip sourced from `src/data/proof.ts`. `homepageProofHighlights` selects the current quantified outcomes for `win11-nvme-driver-patcher`, `Network_Security_Auditor`, and `NovaCut`; `projectProof` supplies the source text, and `npm run data:validate` enforces selected repos, source selectors, count bounds, duplicate highlights, and mobile-length copy. Matching `critical.css`/`global.css` rules keep first-paint layout stable.
- `/projects.json` and `/releases.json` are schema-versioned static JSON indexes generated from the same public feed-backed project and release data as the rendered pages.
- Rendered JSON-LD is audited from built `dist/**/*.html` by `npm run schema:audit`. The audit parses every `application/ld+json` block, requires schema.org context, confirms the Base WebSite/Person graph on every HTML page, and checks representative homepage, language, and project routes for expected graph types and stable anchors.
- Generated Pagefind output is audited from `dist/pagefind` by `npm run search:audit`. The audit loads the generated Pagefind API, requires the Category facet, compares Category counts against rendered project pages and homepage catalog cards, checks expected labels, and verifies filter-only Category searches return public project routes.
- `PERFORMANCE_AUDIT.md` records the current Core Web Vitals lab, bfcache, overflow, and service-worker update UX baseline. The service worker now waits on updates and lets the page prompt before refreshing.
- `IMAGE_PIPELINE.md` records the current social-card, screenshot-master, thumbnail, README image, and Astro image tooling decisions.
- Live-app card previews render Sharp-generated 640x400 thumbnail inputs from `src/assets/screenshots/thumbs/` through Astro `<Picture>` with AVIF/WebP srcsets and JPEG fallback. Stable public copies remain under `public/screenshots/thumbs/`, while the original `public/screenshots/*.jpg` masters remain available for detail contexts and public JSON URLs.
- `SEMANTIC_INDEX_DECISION.md` records the local semantic-indexing decision. User-facing search stays static through Pagefind; `npm run semantic:audit` is an offline advisory catalog-maintenance report.
- `NOTES_FEED_POLICY.md` is the current decision record for the conditional `/til` or notes feed. No notes route or notes RSS should be added until a tracked, reviewed, public-safe source corpus exists.
- Project data validation is handled by `scripts/validate-project-data.mjs` and shared category labels live in `src/data/categories.ts`.
- Deployment target is GitHub Pages through GitHub Actions.
- Dependabot is configured for weekly npm and GitHub Actions dependency updates.
- A weekly/manual quality-gates workflow reports production audit and catalog drift, uploads logs, and opens or updates a GitHub issue when either gate fails.
- `build:ci` runs Astro build, HTML repair, service-worker stamping, Pagefind indexing, the generated search audit, and the rendered JSON-LD audit. PR CI then runs an advisory Lighthouse CI budget after `build:ci`, uploads filesystem reports from `.tmp/lhci`, and does not fail the job on budget warnings.

## Key Commands

- Install: `npm install`
- Refresh profile feed cache: `npm run profile-feed:sync`
- Unit tests: `npm test`
- Type and Astro check: `npm run check`
- Build: `npm run build`
- Build search index only: `npm run search:index` after `astro build`
- Audit generated search index: `npm run search:audit` after `npm run search:index` or `npm run build`
- Local performance smoke audit after starting preview: `npm run audit:perf -- --base http://127.0.0.1:4321`
- Advisory Lighthouse CI budget against built `dist/` in CI/Linux: `npm run lhci:audit`
- Regenerate live-app card thumbnails: `npm run screenshots:thumbs`
- Audit image pipeline: `npm run images:audit`
- Audit local semantic project similarity: `npm run semantic:audit -- --limit 12`
- Preview: `npm run preview`
- Refresh GitHub metadata: `GITHUB_TOKEN=... npm run fetch-stars`
- Capture screenshots: `npm run capture-screenshots` after installing Playwright browser dependencies
- Validate project data: `npm run data:validate`
- Audit assets and source references: `npm run assets:audit`
- Audit first-viewport critical/full CSS selector parity: `npm run css:audit`
- Audit rendered JSON-LD in built HTML: `npm run schema:audit` after `npm run build:ci` or `npm run build`
- Summarize generated GitHub metadata, README refresh quality, profile-feed cache health, and Recommended ranking health: `npm run data:summary -- --out .tmp/data-refresh --max-age-hours 48 --fail-on-stale`
- Audit public repo drift: `npm run catalog:audit`
- Audit production advisories: `npm run audit:prod`

Current verification baseline:

- `npm run check` passed with 47 Astro files, 0 errors, 0 warnings, and 0 hints.
- `npm run images:audit` passed with 22 live apps, 1595.2 KB of full screenshot masters, 230.9 KB of thumbnails, 22 Astro thumbnail inputs, and 1200x630 PNG OG metadata checks.
- `npm run css:audit` passed and is now part of both `npm run check` and `npm run build`; it checked 24 shared first-viewport selectors and 11 mobile override selectors across `critical.css` and `global.css`. `npm run css:audit -- --self-test` also passed by proving a removed `.hero-proof-strip` selector is reported.
- `npm run build` passed, including profile feed sync, CSS parity auditing, image pipeline auditing, 22 Astro `<Picture>` live-card thumbnails, service-worker stamp v0.18.3, Pagefind index generation over 194 HTML pages, the generated search audit, and the rendered JSON-LD audit.
- `npm run search:audit` passed with 194 indexed HTML pages, 177 rendered project pages, 177 homepage catalog cards, 10 Category filters, and 177 filtered public project results checked. Category counts were Android 19, Desktop 19, Extension 23, Guide 4, Media 6, Other 5, PowerShell 30, Python 41, Security 3, and Web 27.
- `npm run schema:audit` passed with 194 HTML pages scanned, 378 JSON-LD blocks parsed, 757 graph nodes parsed, Base WebSite/Person graph coverage on 194 pages, and 3 representative routes checked.
- `npm test` passed with 16 node tests and an explicit repository-root guard.
- Focused Chrome CDP browser verification of the homepage catalog views passed: 177 all / 153 new / 177 recently updated / 129 has-download, feed source metadata in `/projects.json`, URL hydration for `view=recent&cat=web&q=Nuke`, `DuplicateFF` returning 404, and no mobile horizontal overflow at 390px.
- `npm run audit:perf -- --base http://127.0.0.1:4321` passed on 2026-06-04 after the critical-CSS split: mobile homepage LCP 668ms, CLS 0, max event 48ms, max long task 123ms, bfcache restored, and no overflow.
- Manual `ci.yml` workflow_dispatch run `26952960465` passed on 2026-06-04 after the Lighthouse CI addition. LHCI wrote two filesystem reports and uploaded `lighthouse-ci-reports`; advisory warnings were homepage performance score 0.7, homepage TBT 1988.5ms, and homepage third-party request count 3.
- In-app browser verification after the live-card thumbnail migration passed at 1280x720 and 390x844: 22 live cards rendered with `<picture>`, 22 AVIF/WebP source sets were present, the browser selected AVIF assets, no stale `/screenshots/thumbs/` card references remained in the fresh preview DOM, mobile had no horizontal overflow, and console warnings/errors were empty.
- In-app browser verification after the Pagefind facet pass passed at 1280px and 390px: anchored `/search/?q=python` set the search shell to `rv vis`/opacity 1, rendered 10 Category checkboxes, selecting the Python facet reduced results from 71 to 42, console logs were empty, and the mobile layout had no horizontal overflow.
- In-app Browser verification after the homepage proof-strip pass passed at 1280x720: the DOM order was `hn -> hero-proof-strip -> hr -> hd`, the proof strip bottom was 465px in the 720px viewport, console errors were empty, horizontal overflow was 0, and proof-link navigation reached `/projects/NovaCut/`. The follow-up data-driven proof-highlight pass kept the same 3 proof links and geometry after moving selection into `homepageProofHighlights`. `npm run audit:perf -- --base http://127.0.0.1:4326 --out .tmp/perf-t128.json` passed with Home mobile at 390px reporting LCP 972ms, CLS 0, bfcache yes, and no horizontal overflow.
- `npm run data:validate` passed.
- `npm run assets:audit` passed.
- `npm run images:audit` passed; 22 screenshot masters, 22 public thumbnails, and 22 Astro asset thumbnails were checked, full screenshot total was 1595.2 KB, thumbnail total was 230.9 KB, and OG output remained 1200x630 PNG through Satori + Resvg.
- `npm run semantic:audit -- --limit 12` passed; 173 projects and 165 usable cached README texts were checked locally without hosted inference or runtime tracking.
- `npm run data:summary -- --out .tmp/data-refresh-t117 --max-age-hours 36 --fail-on-stale` passed against the current generated cache and profile feed: profile status `active`, cache age 0h, 177 portfolio projects, and all profile-feed checks green. Manual workflow_dispatch run `26956410354` also passed on `ab7cb90` and uploaded the profile-feed summary fields/checks.
- Dependabot PR triage completed on 2026-06-04: GitHub Actions group merged as `78bbef5`, `marked` 18.0.4 merged as `3ab0f4a` after rebasing the stale PR #9 branch, Astro 6.4.4 was regenerated on current `main` and pushed as `460e04c` after PR #12 conflicted, PR #12 was closed as superseded, and no open Dependabot PRs remain.
- `npm run data:summary -- --out .tmp/data-refresh-t123 --max-age-hours 36 --fail-on-stale` passed on 2026-06-04 with 177 ranked projects, 12 top ranking explanation rows, normalized weights, finite scores/parts, usable repo/name identities, and unique contiguous ranks.
- `npm run data:summary -- --out .tmp/data-refresh-t118-token --max-age-hours 36 --fail-on-stale` passed on 2026-06-04 after a token-backed `npm run fetch-stars`: README Refresh status `refreshed`, attempted 176, refreshed 175, misses 1, cache coverage 99.4%, miss rate 0.6%, rate limited false, and all README refresh checks passing. A no-token preservation run also passed and reported status `skipped`, 167 preserved entries, 94.9% cache coverage, and missing-token reason.
- In-app Browser verification after the accessible Recommended-rationale pass passed at 1280x720 and 390x844: 177 catalog rank rationales rendered with valid `aria-describedby` targets, related cards rendered 4 rank rationales with valid descriptions, A-Z sort hid all rank labels, console warnings/errors were empty, the async global stylesheet promoted to `media=all`, and the 390px viewport kept catalog and related rank text inside cards with no horizontal overflow.
- `npm run audit:prod` passed with 0 production vulnerabilities.
- Live GitHub scan reported 178 active public repositories, including 170 active public non-forks and 8 active public forks.
- `npm run catalog:audit` passed with no unreviewed active public repo drift.

Windows/VMware local workflow:

- Run npm and Astro commands from a normal local clone or worktree path such as `C:\Users\--\repos\sysadmindoc.github.io`.
- Do not treat raw `\\vmware-host\Shared Folders\...` or mapped VMware shared-folder builds as canonical validation. Raw UNC execution can fall back to `C:\Windows`; mapped shared-folder execution has produced corrupted Astro/Vite paths.
- Editing through a shared folder is acceptable, but copy/sync the work to a normal local path before `npm test`, `npm run check`, `npm run build`, or deploy triage.

## Data Model

Rendered catalog data is currently exported from `src/data/portfolio.ts`:

- It uses the ignored `src/data/_profile-projects.json` cache generated by `npm run profile-feed:sync`.
- It excludes rows with `includeInPortfolio: false` or `suppressed: true`.
- It maps profile categories to local `Lang` categories and passes through feed freshness, release, download, topic, and primary-action fields.
- It keeps local curated featured/live-app records when they match visible feed rows, preserving screenshots and authored highlight copy.
- If the profile cache is missing or empty, it falls back to `src/data/projects.ts`.

The local fallback and curated overlay data live in `src/data/projects.ts`:

- `featured`: top project cards.
- `liveApps`: projects with screenshots/live demo style presentation.
- `catalog`: fallback repository catalog.
- `skills`: skills surfaced on the site.
- `src/data/proof.ts`: optional source-backed proof sections for project detail pages.
- `src/data/archive.ts`: public-safe archive decisions for retired, moved, held, removed, or superseded project surfaces.

`npm run data:validate` parses the TypeScript data source and the optional profile feed cache, then fails on invalid required fields, duplicate section slugs, unknown language/category enums, malformed URLs, missing live-app screenshots, public/private policy violations, route-count drift, command palette coverage gaps, malformed proof records, unsafe archive entries, or invalid profile-feed category mappings. `npm run check` and `npm run build` run this validation before Astro's own checks/build.
Homepage proof-highlight validation is part of `npm run data:validate`; it fails on invalid selected repos, duplicate proof highlights, missing `projectProof` records, unsupported source selectors, and label/value/copy lengths that exceed the mobile hero bounds.

Derived data in `src/data/derived.ts` computes fallback repository count from unique feed-backed project references. The count currently excludes suppressed/non-portfolio feed rows and can diverge from live GitHub if caches are stale.

Important current exclusions:

- `Scripts` and `ChanPrep` are public but intentionally not listed.
- `SysAdminDoc` is a public profile repository and is intentionally not listed.
- `null` is a public placeholder repository and is intentionally not listed.
- Private/internal repos must not be listed.
- Public medical-imaging or X-ray repos require explicit review before being linked or promoted. `RadAtlas` and removed medical-imaging artifacts are held in `catalog-policy.json` for that reason.

Catalog reconciliation from 2026-05-17 live GitHub scan:

- Added newly public active repos `OpenLumen`, `PhoneFork`, and `AI-Usage_Tracker`.
- Active public non-fork repos that are not represented in `projects.ts` are documented in `src/data/catalog-policy.json`.
- `RadAtlas` is public and X-ray-related, but it is excluded from the portfolio and blocked by `npm run catalog:audit`. Any GitHub visibility change remains an explicit owner action outside this site.
- The generated GitHub caches were refreshed locally with `GITHUB_TOKEN` on 2026-05-17: 170 public non-fork metadata entries, 220 stars, 60 releases, and 170 README entries. These generated files remain ignored.

## Generated Data and Automation

`scripts/fetch-stars.mjs` fetches public GitHub repo metadata, releases, README excerpts, and star counts. It preserves existing generated caches when unauthenticated rate limits would otherwise wipe data. Full README refreshes require a token. Each run writes ignored `_readme-refresh.json` telemetry so skipped, rate-limited, partial, or high-miss README refreshes are visible without changing the existing `_readmes.json` repo-to-markdown cache consumed by project pages and semantic audit.

`scripts/sync-profile-feed.mjs` fetches `https://raw.githubusercontent.com/SysAdminDoc/SysAdminDoc/main/projects.json` into the ignored `src/data/_profile-projects.json` cache. If the fetch fails and a valid cache exists, it preserves the cache. If no cache exists, it writes an empty fallback cache so Astro can use local `projects.ts` data.

`scripts/summarize-generated-data.mjs` reads the generated caches and writes a markdown/JSON freshness and integrity summary. The summary includes README refresh attempts, refreshed count, misses, preserved cache entries, unattempted repos, missing cache entries, coverage, miss rate, rate-limit status, skipped reason, and failure samples from `_readme-refresh.json`. The deploy workflow refreshes generated data for each push/manual deploy, then uploads `github-data-refresh-summary`. The separate `data-refresh.yml` workflow runs the same refresh and summary daily or on demand without deploying the site.

`scripts/capture-screenshots.mjs` captures live app screenshots with Playwright and writes full masters to `public/screenshots/`, stable public card thumbnails to `public/screenshots/thumbs/`, and Astro `<Picture>` thumbnail inputs to `src/assets/screenshots/thumbs/`. `npm run screenshots:thumbs` regenerates both thumbnail copies from existing masters. Screenshots are tracked, and `npm run assets:audit` now fails when a screenshot, public thumbnail, or Astro thumbnail input is missing for a live app or when any artifact is no longer tied to a live app slug.

Historical non-sensitive screenshots can be documented under `archive/screenshots/`; sensitive, private, medical-imaging, or internal screenshots should not be retained there.

Live-app thumbnails are derived assets. Run `npm run screenshots:thumbs` after changing screenshot masters, then run `npm run images:audit` and `npm run assets:audit` before committing. The public and `src/assets/` thumbnail copies must stay byte-identical.

`scripts/audit-semantic-index.mjs` builds a deterministic local token-similarity report from public project metadata and ignored cached README text. It is advisory only and is meant for category drift, duplicate positioning, and related-project review. It must not become hosted inference, visitor tracking, or a committed private text/embedding dump without a new reviewed decision.

## Security and Trust Boundaries

The project parses remote README content through `marked` and `sanitize-html`, so markdown parser and sanitizer advisories are high-priority even though the site is static.

Production dependency advisories found on 2026-05-17 were remediated:

- `sanitize-html` upgraded to 2.17.4.
- `marked` upgraded to 18.0.4.
- Astro upgraded to 6.4.4.
- Transitive `devalue` resolved to 5.8.1.
- Transitive `postcss` resolved to 8.5.14.
- CI now runs `npm run audit:prod`, which gates high/critical production advisories.

Full `npm audit --audit-level=moderate` is clean. The prior dev-only `yaml` advisory in the `@astrojs/check` language-server chain is mitigated with an npm override that keeps `yaml-language-server` on patched `yaml@2.8.3` without downgrading `@astrojs/check`.

The Lighthouse CI budget uses `scripts/run-lhci.mjs` to execute `npm exec --package=@lhci/cli@0.15.1` instead of a committed dev dependency. A direct `@lhci/cli` install currently pulls vulnerable/deprecated transitive packages into `package-lock.json`, so keep it transient until upstream resolves that dependency tree. Local Windows runs skip by default because Chrome launcher cleanup currently fails with `EPERM` after collection; set `LHCI_ALLOW_LOCAL_WINDOWS=1` only when explicitly testing that runner locally.

No hardcoded credential was found by the broad secret-pattern scan. Matches were expected source references such as `GITHUB_TOKEN` handling in `scripts/fetch-stars.mjs`, package names, or documentation text.

## Tooling and Local Instruction Files

The repo has ignored local `AGENTS.md`, `CLAUDE.md`, and `CODEX_CHANGELOG.md` files. They are useful for local workflow but not canonical public project state.

Current reconciliation:

- `CLAUDE.md` was stale at v0.16.0 during this pass.
- `README.md`, `CHANGELOG.md`, and `package.json` agreed on v0.16.1.
- The old `ROADMAP.md` reflected older v0.7-v0.9 planning and has been replaced by the 2026-05-17 evidence-backed roadmap.
- This `PROJECT_CONTEXT.md` is the canonical tracked project memory.

## Roadmap State

Canonical roadmap: `TODO.md`. `ROADMAP.md`, `RESEARCH_FEATURE_PLAN.md`, and dated research docs are retained as evidence/rationale archives keyed by TODO IDs.

Highest-priority workflow/research work after the T125 Pagefind search audit:

1. `T127` -- Add JSON Feed icon/favicon metadata and feed validation.
2. `T119` -- Add a post-deploy live artifact smoke check.
3. `T130` -- Add a pre-deploy machine-readable endpoint audit.

Next open checklist item in document order is `T41` README code syntax highlighting.

## Definition of Done for Future Changes

- Preserve public/private boundaries.
- Update `PROJECT_CONTEXT.md` when durable project facts change.
- Update `TODO.md` when roadmap items are completed, rejected, or reprioritized.
- Run `npm run check`.
- Run `npm run build` for source, data, routing, or rendering changes.
- For dependency or README rendering changes, run `npm audit --omit=dev` and inspect project page rendering.
- Commit the intended changes with a clear message.

## Progress Log

- 2026-05-17: Shipped Tier 0 production dependency remediation. Upgraded Astro, `marked`, and `sanitize-html`; refreshed transitive `devalue` and `postcss`; added `npm run audit:prod` to CI; verified production audit, Astro check, and full static build.
- 2026-05-17: Shipped catalog drift audit and reconciliation. Added `OpenLumen`, `PhoneFork`, and `AI-Usage_Tracker`; documented intentional public-repo exclusions in `catalog-policy.json`; refreshed ignored GitHub metadata caches with `GITHUB_TOKEN`; added `npm run catalog:audit` to CI.
- 2026-05-17: Shipped the portfolio-side medical-imaging boundary. `RadAtlas` remains excluded and blocked by `npm run catalog:audit`; stale `RadAtlas` and `GeneratorSpecs` screenshots were removed. GitHub visibility changes remain outside this repo.
- 2026-05-17: Shipped schema-checked project data. Added `npm run data:validate`, shared category labels, live-app screenshot coverage enforcement, command-palette coverage checks, and missing screenshots for `HurricaneMap` and `ApocalypseWatch`.
- 2026-05-17: Shipped split generated-data refresh reporting. Added `npm run data:summary`, a scheduled/manual `data-refresh.yml` workflow, deploy-time summary artifacts, and local ignored summary output folders.
- 2026-05-17: Shipped stale asset and reference auditing. Added `npm run assets:audit`, screenshot drift detection, public script/component/data-module reference checks, and `archive/screenshots/` policy documentation.
- 2026-05-17: Shipped modernized CI quality gates. Added Dependabot for npm/GitHub Actions and a weekly/manual quality-gates workflow that reports production audit and catalog drift, uploads logs, and opens or updates a GitHub issue on failures.
- 2026-05-17: Shipped proof-oriented project detail sections. Added `src/data/proof.ts`, ProjectProof types, conditional project-page rendering, and validator coverage for proof records and source URLs.
- 2026-05-17: Shipped the generated timeline/year-in-review layer. Added `/timeline/`, wired it into navigation and command palette, and generated year cards plus filterable release/project/changelog events from existing build-time evidence.
- 2026-05-17: Parked the conditional public notes feed behind a tracked decision record. Added `NOTES_FEED_POLICY.md` with source, review, privacy, validation, and RSS activation criteria instead of publishing planning or machine-memory artifacts as notes.
- 2026-05-17: Shipped archive decisions. Added `src/data/archive.ts`, `/archive/`, navigation/command-palette links, and validator coverage so retired or held-back project context can be explained without exposing unsafe links.
- 2026-05-17: Shipped static full-text search. Added Pagefind Component UI, `/search/`, `SEARCH_DECISION.md`, build-time `dist/pagefind` generation, and no-JS fallback links while preserving the command palette for keyboard route jumps.
- 2026-05-17: Audited performance, bfcache, and service-worker update UX. Added explicit update prompts, documented repeatable Chromium audit status in `PERFORMANCE_AUDIT.md`, reduced homepage layout shift, and fixed project-page README image/overflow issues found by the audit harness.
- 2026-05-17: Shipped image and OG pipeline hardening. Added Sharp-generated live-app thumbnail derivatives, `npm run images:audit`, thumbnail-aware asset auditing, thumbnail-first live cards, and explicit social-card PNG alt/type metadata.
- 2026-05-17: Shipped public machine-readable indexes. Added `/projects.json` and `/releases.json` with schema versions, freshness timestamps, counts, public URLs, and build-time GitHub metadata for future tooling.
- 2026-05-17: Evaluated local semantic indexing. Added `SEMANTIC_INDEX_DECISION.md` and `npm run semantic:audit` as an offline advisory project-similarity/category-drift report, while keeping Pagefind as the user-facing static search layer.
- 2026-06-04: Shipped feed-backed portfolio rendering. Added `profile-feed:sync`, `src/data/portfolio.ts`, profile feed validation, feed-backed catalog/project routes/feeds/language lanes/timeline/OG routes, suppressed-row exclusion, and local curated overlays/fallbacks.
- 2026-06-04: Shipped build-time project ranking. Added `src/data/project-ranking.mjs` plus unit coverage, changed the homepage default catalog sort to `Recommended`, and reused the same score map for project-page related links.
- 2026-06-04: Shipped visible Pagefind category facets. `/search/` now enables Pagefind faceted mode and renders the official Category filter pane beside full-text results while keeping the static index and no-JS fallbacks.
- 2026-06-04: Shipped the homepage proof strip. The hero now renders three source-backed quantified outcomes from `projectProof` above the long intro copy, links each proof to its project page, keeps first-paint/mobile layout covered by critical and full CSS, and declares its selected highlights through validated `homepageProofHighlights` data.
- 2026-06-04: Fixed the shared `.rv` reveal contract for interior pages. `theme.js` now always observes reveal blocks and `.rv.vis` cancels the CSS scroll-timeline animation so Chrome support detection cannot leave content opacity-zero.
- 2026-06-04: Shipped profile-feed coverage in the data-health path. The scheduled/manual data refresh now runs `profile-feed:sync`, and `data:summary` reports/fails on profile-feed missing/fallback/stale cache states alongside GitHub metadata freshness.
- 2026-06-04: Triaged stale Dependabot PRs against current `main`. Rebased and merged the GitHub Actions group and `marked` 18.0.4 updates after fresh CI, regenerated Astro 6.4.4 on current `main` after the Dependabot package-lock branch conflicted, and closed the superseded Astro PR with notes.
- 2026-06-04: Added generated Recommended ranking visibility and drift guards. `data:summary` now reports top ranked projects with score parts and checks ranking weights, row coverage, identities, finite scores, and unique contiguous ranks.
- 2026-06-04: Restored GitHub Pages deploy for v0.18.3 by syncing the profile-feed cache before Astro type checks, hardened `npm test` with an explicit cwd guard and test glob, and documented the safe Windows/VMware local-build workflow.
- 2026-06-04: Split the first-viewport CSS path. `critical.css` is inlined for nav/hero first paint, while the full hashed `global.css` bundle preloads and applies asynchronously; the local performance audit now passes with mobile homepage LCP at 668ms.
- 2026-06-04: Added an advisory Lighthouse CI budget with filesystem reports for PR CI. `lighthouserc.cjs` samples homepage and project-detail routes with warning-only category, metric, and resource-size assertions.
- 2026-06-04: Migrated Live Apps card thumbnails to Astro-managed `<Picture>` output. The build now emits AVIF/WebP srcsets from tracked `src/assets/screenshots/thumbs/` inputs while preserving stable public screenshot and thumbnail URLs.
- 2026-06-04: Added first-viewport CSS parity auditing. `npm run css:audit` now guards the shared nav/hero/proof/stage selectors and selected mobile overrides across `critical.css` and `global.css`, and the audit is part of both `npm run check` and `npm run build`.
- 2026-06-04: Added README refresh quality telemetry to generated-data health. `fetch-stars` now writes `_readme-refresh.json`, and `data:summary` reports/gates README refresh attempts, misses, preserved entries, cache coverage, miss rate, rate-limit state, skipped reason, and failure samples.
- 2026-06-04: Added rendered JSON-LD auditing to the build path. `schema:audit` parses built HTML schema blocks, verifies Base WebSite/Person graph coverage, and checks representative homepage/language/project route graph contracts before publish.
- 2026-06-04: Surfaced Recommended ranking rationale accessibly. Catalog and related cards now render visible rank explanations with valid `aria-describedby` wiring, non-Recommended catalog sorts hide the rationale, and `shared.js` includes a fallback that promotes the deferred global stylesheet to `media=all`.
- 2026-06-04: Added generated Pagefind search auditing to the build path. `search:audit` loads `dist/pagefind/pagefind.js`, verifies Category filters/counts against rendered project/catalog output, checks filter-only Category searches, and caught/fixed the `VideoSubtitleRemover` featured-language versus catalog-category drift.
