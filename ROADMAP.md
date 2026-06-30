# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.21.4
Last normalized: 2026-06-29

## Research-Driven Additions

### P2

- [ ] P2 — Fill the desktop homepage hero with evidence content
  Why: Current desktop visual baselines show the header is full width but the hero leaves a large unused right side, while comparable portfolios put concrete project proof above the fold.
  Evidence: `tests/playwright/__screenshots__/chromium/home-desktop.png`, `tests/playwright/__screenshots__/chromium-light/home-desktop.png`, Magic Portfolio, AstroPaper, Peerlist, Contra.
  Touches: `src/pages/index.astro`, `src/styles/critical.css`, `src/styles/global.css`, `tests/playwright/portfolio-audits.spec.mjs`, `tests/playwright/__screenshots__`
  Acceptance: Desktop viewports at 980px and wider show a responsive evidence rail/card using existing proof/live screenshot data; mobile remains uncluttered; no horizontal overflow; dark and light visual baselines pass.
  Complexity: M

- [ ] P2 — Clear the `yaml` override range update
  Why: Manual dependency hygiene should keep the dependency audit clean when a maintained patch/minor update is available.
  Evidence: `npm run deps:audit` reports `yaml` override `2.8.3` with wanted/latest `2.9.0`.
  Touches: `package.json`, `package-lock.json`, `test/dependency-audit.test.mjs`
  Acceptance: The override or lock entry is updated to `yaml@2.9.0`; `npm run deps:audit`, `npm test`, and `npm run check` pass with no new advisories.
  Complexity: S

- [ ] P2 — Re-trial the Astro 7 and Vite 8 upgrade path
  Why: The blocked upgrade note says Astro 7 was not stable, but current dependency research reports Astro 7.0.3 and Vite 8.1.0 as latest majors, so the blocker needs fresh evidence.
  Evidence: `Roadmap_Blocked.md`, `npm run deps:audit`, Astro 7 upgrade guide.
  Touches: `package.json`, `package-lock.json`, `astro.config.mjs`, `scripts/*audit*.mjs`, `tests/playwright`, `Roadmap_Blocked.md`
  Acceptance: A local trial records pass/fail against `npm test`, `npm run check`, `npm run build:ci`, and interaction audits; compatible versions are adopted, or the blocked item is updated with the current concrete failure.
  Complexity: M
