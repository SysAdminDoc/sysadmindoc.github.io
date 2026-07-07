# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.21.23
Last normalized: 2026-06-29

## Research-Driven Additions

### P2

- [ ] P2 - Add mid-wide and short-height rendered layout regression coverage
  Why: Current rendered route audits cover 1365x900 and 390x900, plus a homepage 980px hero check, but comparable portfolio projects report desktop overlap failures in the 1280-1410px band.
  Evidence: `tests/playwright/portfolio-audits.spec.mjs`, `tests/playwright/interaction-smoke.spec.mjs`, RyanFitzgerald/devportfolio issues #298 and #299.
  Touches: `tests/playwright/portfolio-audits.spec.mjs`, Playwright visual baselines, `src/styles/global.css` only if the new audit exposes real overlap.
  Acceptance: The Playwright audit matrix covers representative 1000px, 1280px, 1440px, and one short-height desktop viewport for home, search, archive, status, releases, screenshots, and one project detail route; each route passes no-overflow, no-console-error, target-size, and visual-baseline checks.
  Complexity: M
