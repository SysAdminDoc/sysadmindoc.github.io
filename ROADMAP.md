# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.21.22
Last normalized: 2026-06-29

## Research-Driven Additions

### P1

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
