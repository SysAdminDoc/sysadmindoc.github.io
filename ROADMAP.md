# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.20.7
Last normalized: 2026-06-29

## Research-Driven Additions

### P2

- [ ] P2 — Add a local dependency freshness and upgrade-readiness report
  Why: Dependency updates are manual; `npm outdated` already shows Astro 7.0.3 available while the project remains on Astro 6.4.8, and registry latests also include Vite 8.1.0 and Shiki 4.3.0.
  Evidence: `package.json`, `package-lock.json`, `npm audit --omit=dev --audit-level=high`, `npm outdated --json`, Astro 7 upgrade docs.
  Touches: `package.json`, a dependency audit script, `test/` coverage for report parsing, `Roadmap_Blocked.md` references only if an upgrade stays blocked.
  Acceptance: A local npm script prints direct dependency current/wanted/latest, flags high/critical advisories, records known blocked majors without failing normal builds, and fails only on configured security thresholds.
  Complexity: S

- [ ] P2 — Add source-level dead selector and runtime surface auditing
  Why: Dist bundle budgets pass, but source drift allowed removed terminal selectors and handlers to remain after the homepage UI changed.
  Evidence: `public/scripts/main.js`, `src/styles/global.css`, `src/styles/critical.css`, `scripts/audit-bundle-size.mjs`, removed-terminal git history.
  Touches: `scripts/audit-css.mjs`, `scripts/audit-public-source-hygiene.mjs`, `test/` fixtures for orphaned selector detection.
  Acceptance: Local audits flag selectors and DOM-targeted runtime blocks that have no matching route markup, with an allowlist for intentionally generated or third-party selectors.
  Complexity: M

- [ ] P2 — Split homepage JavaScript into feature-scoped entry points
  Why: `public/scripts/main.js` mixes stats, visual effects, catalog interactions, dead terminal logic, live thumbnails, and PWA registration, making feature removal and route loading brittle.
  Evidence: `public/scripts/main.js`, `src/layouts/Base.astro`, `package.json` bundle audit scripts, Astrofy/GitProfile config-driven portfolio patterns.
  Touches: `public/scripts/main.js`, new feature scripts as needed, `src/pages/index.astro`, `src/layouts/Base.astro`, interaction tests.
  Acceptance: Homepage behavior is divided into small scripts loaded only when their DOM targets exist; PWA code is sitewide; bundle audit and interaction smoke still pass; removed sections no longer leave inert runtime code.
  Complexity: L
