# Project Context

Last consolidated: 2026-06-04
Repository: `SysAdminDoc/sysadmindoc.github.io`
Site: https://sysadmindoc.github.io
Current tracked version: v0.18.2

This is the canonical tracked project context for future work. Tool-specific and machine-local instruction files can point here, but this file should carry durable facts, current architecture, public/private boundaries, and roadmap state.

## Purpose

`sysadmindoc.github.io` is the public portfolio and project showcase for Matt Parker / SysAdminDoc. It presents public GitHub work, live app screenshots, project pages, generated README excerpts, releases, skills, curated highlights, and healthcare IT positioning.

The site must remain public-safe. It should not expose private repository names, internal employer details, unpublished medical-imaging work, or local machine memory beyond what is intentionally documented in the public repo.

## Current Architecture

- Static site built with Astro 6.
- TypeScript data layer under `src/data/`.
- Main pages under `src/pages/`, including homepage, catalog, search, project detail pages, OG image endpoints, RSS, releases, timeline, archive decisions, language pages, and healthcare IT pages.
- Shared layout in `src/layouts/Base.astro`.
- Components under `src/components/`.
- Global styling in `src/styles/global.css`.
- Browser behavior in `public/scripts/main.js`, `public/scripts/cmdk.js`, and `public/scripts/theme.js`.
- Service worker in `public/sw.js`.
- Generated GitHub metadata caches under `src/data/_*.json` are ignored.
- `/timeline/` is generated from ignored GitHub release and metadata caches plus tracked changelog entries, then filtered client-side by year, platform, category, and language.
- Timeline filters update the current page in place; they intentionally avoid query-string state so static preview and GitHub Pages direct links remain stable.
- `/archive/` is a public-safe anti-portfolio generated from `src/data/archive.ts`. Sensitive entries are grouped without links; safe entries link only to current public project pages or reviewed public GitHub repositories.
- `/search/` is a Pagefind Component UI-backed full-text search page. `npm run build` runs Astro and then `npm run search:index`, which writes the static search bundle to `dist/pagefind`.
- The homepage catalog has URL-backed `view=` slices for all/new/recently updated/has-download. New/recent derive from ignored `_meta.json` freshness against the generated stats timestamp; has-download derives from ignored `_releases.json` download totals.
- `/projects.json` and `/releases.json` are schema-versioned static JSON indexes generated from the same public project and release data as the rendered pages.
- `PERFORMANCE_AUDIT.md` records the current Core Web Vitals lab, bfcache, overflow, and service-worker update UX baseline. The service worker now waits on updates and lets the page prompt before refreshing.
- `IMAGE_PIPELINE.md` records the current social-card, screenshot-master, thumbnail, README image, and Astro image tooling decisions.
- Live-app card previews use Sharp-generated 640x400 thumbnails under `public/screenshots/thumbs/`, while the original `public/screenshots/*.jpg` masters remain available for detail contexts.
- `SEMANTIC_INDEX_DECISION.md` records the local semantic-indexing decision. User-facing search stays static through Pagefind; `npm run semantic:audit` is an offline advisory catalog-maintenance report.
- `NOTES_FEED_POLICY.md` is the current decision record for the conditional `/til` or notes feed. No notes route or notes RSS should be added until a tracked, reviewed, public-safe source corpus exists.
- Project data validation is handled by `scripts/validate-project-data.mjs` and shared category labels live in `src/data/categories.ts`.
- Deployment target is GitHub Pages through GitHub Actions.
- Dependabot is configured for weekly npm and GitHub Actions dependency updates.
- A weekly/manual quality-gates workflow reports production audit and catalog drift, uploads logs, and opens or updates a GitHub issue when either gate fails.

## Key Commands

- Install: `npm install`
- Type and Astro check: `npm run check`
- Build: `npm run build`
- Build search index only: `npm run search:index` after `astro build`
- Local performance smoke audit after starting preview: `npm run audit:perf -- --base http://127.0.0.1:4321`
- Regenerate live-app card thumbnails: `npm run screenshots:thumbs`
- Audit image pipeline: `npm run images:audit`
- Audit local semantic project similarity: `npm run semantic:audit -- --limit 12`
- Preview: `npm run preview`
- Refresh GitHub metadata: `GITHUB_TOKEN=... npm run fetch-stars`
- Capture screenshots: `npm run capture-screenshots` after installing Playwright browser dependencies
- Validate project data: `npm run data:validate`
- Audit assets and source references: `npm run assets:audit`
- Summarize generated GitHub metadata: `npm run data:summary -- --out .tmp/data-refresh --max-age-hours 48 --fail-on-stale`
- Audit public repo drift: `npm run catalog:audit`
- Audit production advisories: `npm run audit:prod`

Current verification baseline:

- `npm run check` passed with 45 Astro files, 0 errors, 0 warnings, and 0 hints.
- `npm run images:audit` passed with 22 live apps, 1595.2 KB of full screenshot masters, 230.9 KB of thumbnails, and 1200x630 PNG OG metadata checks.
- `npm run build` passed, including image pipeline auditing and Pagefind index generation over 198 HTML pages.
- `npm test` passed with 9 node tests.
- Focused Chrome CDP browser verification of the homepage catalog views passed: 181 all / 147 new / 173 recently updated / 20 has-download, URL hydration for `view=recent&cat=web&q=Nuke`, and no mobile horizontal overflow at 390px.
- `npm run audit:perf` ran against local preview for `/`, `/search/?q=NukeMap`, `/archive/`, `/projects/project-nomad-desktop/`, and desktop `/`; all samples restored from bfcache and had no horizontal overflow or console/network errors. Search, archive, project, and desktop homepage samples stayed under LCP/CLS/lab event-timing thresholds; mobile homepage LCP is the remaining warning.
- `npm run data:validate` passed.
- `npm run assets:audit` passed.
- `npm run images:audit` passed; 22 screenshot masters and 22 thumbnails were checked, full screenshot total was 1595.2 KB, thumbnail total was 230.9 KB, and OG output remained 1200x630 PNG through Satori + Resvg.
- `npm run semantic:audit -- --limit 12` passed; 173 projects and 165 usable cached README texts were checked locally without hosted inference or runtime tracking.
- `npm run data:summary -- --out .tmp/data-refresh --max-age-hours 48 --fail-on-stale` passed against the current generated cache.
- `npm run audit:prod` passed with 0 production vulnerabilities.
- Live GitHub scan reported 178 active public repositories, including 170 active public non-forks and 8 active public forks.
- `npm run catalog:audit` passed with no unreviewed active public repo drift.

## Data Model

Primary catalog data is currently in `src/data/projects.ts`:

- `featured`: top project cards.
- `liveApps`: projects with screenshots/live demo style presentation.
- `catalog`: larger repository catalog.
- `skills`: skills surfaced on the site.
- `src/data/proof.ts`: optional source-backed proof sections for project detail pages.
- `src/data/archive.ts`: public-safe archive decisions for retired, moved, held, removed, or superseded project surfaces.

`npm run data:validate` parses the TypeScript data source and fails on invalid required fields, duplicate section slugs, unknown language/category enums, malformed URLs, missing live-app screenshots, public/private policy violations, route-count drift, command palette coverage gaps, malformed proof records, or unsafe archive entries. `npm run check` and `npm run build` run this validation before Astro's own checks/build.

Derived data in `src/data/derived.ts` computes fallback repository count from unique project references. The count currently excludes several intentionally skipped repos and can diverge from live GitHub if caches are stale.

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

`scripts/fetch-stars.mjs` fetches public GitHub repo metadata, releases, README excerpts, and star counts. It preserves existing generated caches when unauthenticated rate limits would otherwise wipe data. Full README refreshes require a token.

`scripts/summarize-generated-data.mjs` reads the generated caches and writes a markdown/JSON freshness and integrity summary. The deploy workflow refreshes generated data for each push/manual deploy, then uploads `github-data-refresh-summary`. The separate `data-refresh.yml` workflow runs the same refresh and summary daily or on demand without deploying the site.

`scripts/capture-screenshots.mjs` captures live app screenshots with Playwright and writes full masters to `public/screenshots/` plus card thumbnails to `public/screenshots/thumbs/`. `npm run screenshots:thumbs` regenerates thumbnails from existing masters. Screenshots are tracked, and `npm run assets:audit` now fails when a screenshot or thumbnail is missing for a live app or when either artifact is no longer tied to a live app slug.

Historical non-sensitive screenshots can be documented under `archive/screenshots/`; sensitive, private, medical-imaging, or internal screenshots should not be retained there.

Live-app thumbnails are derived assets. Run `npm run screenshots:thumbs` after changing screenshot masters, then run `npm run images:audit` and `npm run assets:audit` before committing.

`scripts/audit-semantic-index.mjs` builds a deterministic local token-similarity report from public project metadata and ignored cached README text. It is advisory only and is meant for category drift, duplicate positioning, and related-project review. It must not become hosted inference, visitor tracking, or a committed private text/embedding dump without a new reviewed decision.

## Security and Trust Boundaries

The project parses remote README content through `marked` and `sanitize-html`, so markdown parser and sanitizer advisories are high-priority even though the site is static.

Production dependency advisories found on 2026-05-17 were remediated:

- `sanitize-html` upgraded to 2.17.4.
- `marked` upgraded to 18.0.3.
- Astro upgraded to 6.3.3.
- Transitive `devalue` resolved to 5.8.1.
- Transitive `postcss` resolved to 8.5.14.
- CI now runs `npm run audit:prod`, which gates high/critical production advisories.

Full `npm audit` still reports dev-only moderate findings in the `@astrojs/check` language-server chain. That is documented but does not affect production dependencies.

No hardcoded credential was found by the broad secret-pattern scan. Matches were expected source references such as `GITHUB_TOKEN` handling in `scripts/fetch-stars.mjs`, package names, or documentation text.

## Tooling and Local Instruction Files

The repo has ignored local `AGENTS.md`, `CLAUDE.md`, and `CODEX_CHANGELOG.md` files. They are useful for local workflow but not canonical public project state.

Current reconciliation:

- `CLAUDE.md` was stale at v0.16.0 during this pass.
- `README.md`, `CHANGELOG.md`, and `package.json` agreed on v0.16.1.
- The old `ROADMAP.md` reflected older v0.7-v0.9 planning and has been replaced by the 2026-05-17 evidence-backed roadmap.
- This `PROJECT_CONTEXT.md` is the canonical tracked project memory.

## Roadmap State

Canonical roadmap: `ROADMAP.md`.

Highest-priority work after this research pass:

1. No active unchecked roadmap items remain.
2. Continue future roadmap from the parked/rejected section only if new evidence changes scope.

## Definition of Done for Future Changes

- Preserve public/private boundaries.
- Update `PROJECT_CONTEXT.md` when durable project facts change.
- Update `ROADMAP.md` when roadmap items are completed, rejected, or reprioritized.
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
