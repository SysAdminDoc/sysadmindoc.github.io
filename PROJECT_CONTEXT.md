# Project Context

Last consolidated: 2026-05-17
Repository: `SysAdminDoc/sysadmindoc.github.io`
Site: https://sysadmindoc.github.io
Current tracked version: v0.16.1

This is the canonical tracked project context for future work. Tool-specific and machine-local instruction files can point here, but this file should carry durable facts, current architecture, public/private boundaries, and roadmap state.

## Purpose

`sysadmindoc.github.io` is the public portfolio and project showcase for Matt Parker / SysAdminDoc. It presents public GitHub work, live app screenshots, project pages, generated README excerpts, releases, skills, curated highlights, and healthcare IT positioning.

The site must remain public-safe. It should not expose private repository names, internal employer details, unpublished medical-imaging work, or local machine memory beyond what is intentionally documented in the public repo.

## Current Architecture

- Static site built with Astro 5.
- TypeScript data layer under `src/data/`.
- Main pages under `src/pages/`, including homepage, catalog, project detail pages, OG image endpoints, RSS, releases, language pages, and healthcare IT pages.
- Shared layout in `src/layouts/Base.astro`.
- Components under `src/components/`.
- Global styling in `src/styles/global.css`.
- Browser behavior in `public/scripts/main.js`, `public/scripts/cmdk.js`, and `public/scripts/theme.js`.
- Service worker in `public/sw.js`.
- Generated GitHub metadata caches under `src/data/_*.json` are ignored.
- Deployment target is GitHub Pages through GitHub Actions.

## Key Commands

- Install: `npm install`
- Type and Astro check: `npm run check`
- Build: `npm run build`
- Preview: `npm run preview`
- Refresh GitHub metadata: `GITHUB_TOKEN=... npm run fetch:stars`
- Capture screenshots: `npm run capture:screenshots` after installing Playwright browser dependencies

Baseline during the 2026-05-17 research pass:

- `npm run check` passed.
- `npm audit --omit=dev` reported production advisories requiring remediation.
- Live GitHub scan reported 178 active public repositories, including 170 active public non-forks, 8 active public forks, and 220 public stars.

## Data Model

Primary catalog data is currently in `src/data/projects.ts`:

- `featured`: top project cards.
- `liveApps`: projects with screenshots/live demo style presentation.
- `catalog`: larger repository catalog.
- `skills`: skills surfaced on the site.

Derived data in `src/data/derived.ts` computes fallback repository count from unique project references. The count currently excludes several intentionally skipped repos and can diverge from live GitHub if caches are stale.

Important current exclusions:

- `Scripts` and `ChanPrep` are public but intentionally not listed.
- Private/internal repos must not be listed.
- Public medical-imaging or X-ray repos require explicit review before being linked or promoted.

Known drift from 2026-05-17 live GitHub scan:

- Newly public active repos not represented in `projects.ts`: `OpenLumen`, `PhoneFork`, `AI-Usage_Tracker`.
- `RadAtlas` is public and X-ray-related, but was removed from the portfolio. Its visibility should be reviewed outside this site before any listing.
- The generated `_stats.json` cache was stale, reporting 167 non-fork repos and 204 stars from 2026-05-11.

## Generated Data and Automation

`scripts/fetch-stars.mjs` fetches public GitHub repo metadata, releases, README excerpts, and star counts. It preserves existing generated caches when unauthenticated rate limits would otherwise wipe data. Full README refreshes require a token.

`scripts/capture-screenshots.mjs` captures live app screenshots with Playwright and writes to `public/screenshots/`. Screenshots are tracked, so stale screenshots need explicit cleanup or archival.

## Security and Trust Boundaries

The project parses remote README content through `marked` and `sanitize-html`, so markdown parser and sanitizer advisories are high-priority even though the site is static.

Production dependency advisories found on 2026-05-17:

- `sanitize-html` critical advisory range covering 2.17.2.
- `marked` high advisory range covering 18.0.0.
- Astro moderate advisories remediated upstream through Astro 6.
- Transitive `devalue` and `postcss` advisories through the current dependency tree.

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

1. Remediate production dependency advisories.
2. Add catalog drift automation and reconcile new public repos.
3. Resolve the public/private boundary for medical-imaging projects.
4. Move project data toward schema validation.
5. Add stale screenshot and unused asset checks.

## Definition of Done for Future Changes

- Preserve public/private boundaries.
- Update `PROJECT_CONTEXT.md` when durable project facts change.
- Update `ROADMAP.md` when roadmap items are completed, rejected, or reprioritized.
- Run `npm run check`.
- Run `npm run build` for source, data, routing, or rendering changes.
- For dependency or README rendering changes, run `npm audit --omit=dev` and inspect project page rendering.
- Commit the intended changes with a clear message.
