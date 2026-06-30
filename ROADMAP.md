# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.20.9
Last normalized: 2026-06-29

## Research-Driven Additions

### P2

- [ ] P2 - Split homepage JavaScript into feature-scoped entry points
  Why: `public/scripts/main.js` mixes stats, visual effects, catalog interactions, dead terminal logic, live thumbnails, and PWA registration, making feature removal and route loading brittle.
  Evidence: `public/scripts/main.js`, `src/layouts/Base.astro`, `package.json` bundle audit scripts, Astrofy/GitProfile config-driven portfolio patterns.
  Touches: `public/scripts/main.js`, new feature scripts as needed, `src/pages/index.astro`, `src/layouts/Base.astro`, interaction tests.
  Acceptance: Homepage behavior is divided into small scripts loaded only when their DOM targets exist; PWA code is sitewide; bundle audit and interaction smoke still pass; removed sections no longer leave inert runtime code.
  Complexity: L
