# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.21.19
Last normalized: 2026-06-29

## Research-Driven Additions

### P0

- [ ] P0 - Reconcile public catalog drift for RES-Slim
  Why: `npm run catalog:audit` currently fails because `RES-Slim` is an active public non-fork repo but is absent from both catalog data and catalog-policy exceptions.
  Evidence: `scripts/audit-catalog.mjs`, `src/data/catalog-policy.json`, `rtk npm run catalog:audit`, GitHub API metadata for `SysAdminDoc/RES-Slim`.
  Touches: `src/data/projects.ts`, `src/data/catalog-policy.json`, `src/data/archive.ts` if intentionally held, `package.json`, generated data fixtures if needed.
  Acceptance: `RES-Slim` is either cataloged with reviewed public copy or explicitly skipped/held with a policy reason; `npm run catalog:audit` passes; deploy preflight runs the catalog audit.
  Complexity: S

- [ ] P0 - Add a verified GitHub Pages publish command
  Why: GitHub Pages serves the `gh-pages` branch, not `main`; a source push can leave the live site unchanged, and Astro `_assets` plus Pagefind assets require root `.nojekyll` on the published branch.
  Evidence: GitHub Pages API source `{branch:"gh-pages", path:"/"}`, `CHANGELOG.md` v0.21.19 `.nojekyll` deployment fix, recent live-site stale deploy.
  Touches: `package.json`, `scripts/publish-pages.mjs`, `scripts/smoke-live-site.mjs`, `README.md`.
  Acceptance: One local command builds, copies `dist/` to `gh-pages`, guarantees root `.nojekyll`, commits/pushes the deploy branch, then verifies live `/status.json` reports the new version/commit and at least one `_assets` CSS plus one Pagefind asset return HTTP 200.
  Complexity: M

### P1

- [ ] P1 - Restore and enforce live-app screenshot capture provenance
  Why: `npm run liveapps:audit` reports `manifest provenance: 0/22` while still passing, so screenshot freshness is inferred from file mtimes instead of the capture manifest that the capture script already writes.
  Evidence: `scripts/capture-screenshots.mjs`, `scripts/audit-live-apps.mjs`, missing `public/screenshots/manifest.json`, `rtk npm run liveapps:audit`.
  Touches: `scripts/capture-screenshots.mjs`, `scripts/audit-live-apps.mjs`, `public/screenshots/manifest.json`, `public/screenshots/*.jpg`, `src/assets/screenshots/thumbs/*.jpg`.
  Acceptance: `npm run capture-screenshots` produces a committed manifest with one current `ok` entry per live app; `npm run liveapps:audit` fails when the manifest is missing or incomplete; a healthy run reports 22/22 provenance and zero stale/missing captures.
  Complexity: M

- [ ] P1 - Expose release provenance on status and release pages
  Why: Generated release data classifies artifact trust, but visitors cannot see that the current cache has 60 releases, 0 attested, 19 checksum-backed, and 41 unsigned.
  Evidence: `scripts/fetch-stars.mjs`, `scripts/summarize-generated-data.mjs`, `src/pages/status.astro`, `src/pages/status.json.ts`, `src/pages/releases.astro`, GitHub artifact-attestation docs, SLSA provenance spec.
  Touches: `src/data/generated-trust.ts`, `src/pages/status.astro`, `src/pages/status.json.ts`, `src/pages/releases.astro`, `scripts/summarize-generated-data.mjs`, endpoint/feed tests.
  Acceptance: `/status/` and `/status.json` expose the provenance distribution; `/releases/` badges each release as attested/checksum/unsigned/no-assets; deploy summary can fail on featured downloadable releases without checksum or attestation when strict mode requests it.
  Complexity: M

### P2

- [ ] P2 — Synchronize ignored maintainer docs and version metadata
  Why: Maintainer-facing ignored docs still mention older versions/status while package and README are at v0.21.8, which can mislead future autonomous runs.
  Evidence: `ROADMAP.md`, maintainer notes, `PERFORMANCE_AUDIT.md`, `IMAGE_PIPELINE.md`, `package.json`, `README.md`.
  Touches: maintainer notes, `ROADMAP.md`, `PERFORMANCE_AUDIT.md`, `IMAGE_PIPELINE.md`, `README.md` only if public setup text changes.
  Acceptance: Maintainer docs reflect the current shipped version, Astro 7/Vite 8 state, current audit commands, and no stale "blocked Astro 7" or mismatched status claims remain.
  Complexity: S

- [ ] P2 - Add mid-wide and short-height rendered layout regression coverage
  Why: Current rendered route audits cover 1365x900 and 390x900, plus a homepage 980px hero check, but comparable portfolio projects report desktop overlap failures in the 1280-1410px band.
  Evidence: `tests/playwright/portfolio-audits.spec.mjs`, `tests/playwright/interaction-smoke.spec.mjs`, RyanFitzgerald/devportfolio issues #298 and #299.
  Touches: `tests/playwright/portfolio-audits.spec.mjs`, Playwright visual baselines, `src/styles/global.css` only if the new audit exposes real overlap.
  Acceptance: The Playwright audit matrix covers representative 1000px, 1280px, 1440px, and one short-height desktop viewport for home, search, archive, status, releases, screenshots, and one project detail route; each route passes no-overflow, no-console-error, target-size, and visual-baseline checks.
  Complexity: M
