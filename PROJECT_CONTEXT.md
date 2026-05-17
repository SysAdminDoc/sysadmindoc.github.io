# Project Context

Last consolidated: 2026-05-17
Repository: `SysAdminDoc/sysadmindoc.github.io`
Site: https://sysadmindoc.github.io
Current tracked version: v0.16.3

This is the canonical tracked project context for future work. Tool-specific and machine-local instruction files can point here, but this file should carry durable facts, current architecture, public/private boundaries, and roadmap state.

## Purpose

`sysadmindoc.github.io` is the public portfolio and project showcase for Matt Parker / SysAdminDoc. It presents public GitHub work, live app screenshots, project pages, generated README excerpts, releases, skills, curated highlights, and healthcare IT positioning.

The site must remain public-safe. It should not expose private repository names, internal employer details, unpublished medical-imaging work, or local machine memory beyond what is intentionally documented in the public repo.

## Current Architecture

- Static site built with Astro 6.
- TypeScript data layer under `src/data/`.
- Main pages under `src/pages/`, including homepage, catalog, project detail pages, OG image endpoints, RSS, releases, language pages, and healthcare IT pages.
- Shared layout in `src/layouts/Base.astro`.
- Components under `src/components/`.
- Global styling in `src/styles/global.css`.
- Browser behavior in `public/scripts/main.js`, `public/scripts/cmdk.js`, and `public/scripts/theme.js`.
- Service worker in `public/sw.js`.
- Generated GitHub metadata caches under `src/data/_*.json` are ignored.
- Project data validation is handled by `scripts/validate-project-data.mjs` and shared category labels live in `src/data/categories.ts`.
- Deployment target is GitHub Pages through GitHub Actions.

## Key Commands

- Install: `npm install`
- Type and Astro check: `npm run check`
- Build: `npm run build`
- Preview: `npm run preview`
- Refresh GitHub metadata: `GITHUB_TOKEN=... npm run fetch-stars`
- Capture screenshots: `npm run capture:screenshots` after installing Playwright browser dependencies
- Validate project data: `npm run data:validate`
- Audit public repo drift: `npm run catalog:audit`
- Audit production advisories: `npm run audit:prod`

Current verification baseline:

- `npm run check` passed.
- `npm run build` passed.
- `npm run data:validate` passed.
- `npm run audit:prod` passed with 0 production vulnerabilities.
- Live GitHub scan reported 178 active public repositories, including 170 active public non-forks and 8 active public forks.
- `npm run catalog:audit` passed with no unreviewed active public repo drift.

## Data Model

Primary catalog data is currently in `src/data/projects.ts`:

- `featured`: top project cards.
- `liveApps`: projects with screenshots/live demo style presentation.
- `catalog`: larger repository catalog.
- `skills`: skills surfaced on the site.

`npm run data:validate` parses the TypeScript data source and fails on invalid required fields, duplicate section slugs, unknown language/category enums, malformed URLs, missing live-app screenshots, public/private policy violations, route-count drift, or command palette coverage gaps. `npm run check` and `npm run build` run this validation before Astro's own checks/build.

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

`scripts/capture-screenshots.mjs` captures live app screenshots with Playwright and writes to `public/screenshots/`. Screenshots are tracked, so stale screenshots need explicit cleanup or archival.

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

1. Split generated data refresh from deployment.
2. Add stale screenshot and unused asset checks.

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
