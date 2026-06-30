# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.20.2
Last normalized: 2026-06-29

## Research-Driven Additions

### P0

- [ ] P0 — Move PWA registration and update recovery to the sitewide runtime
  Why: Direct visits to interior pages currently skip service-worker registration and update recovery because `/scripts/main.js` only loads on the homepage.
  Evidence: `src/layouts/Base.astro`, `public/scripts/main.js`, MDN service-worker lifecycle guidance.
  Touches: `src/layouts/Base.astro`, `public/scripts/main.js`, `public/scripts/shared.js` or a new focused service-worker script, `tests/playwright/sw-lifecycle.spec.mjs`.
  Acceptance: Loading `/search/`, `/projects/<slug>/`, and `/status/` directly registers `/sw.js`; an available waiting worker shows the same refresh/later recovery UI on every route; the SW lifecycle Playwright spec covers a direct interior-page first visit.
  Complexity: M

### P1

- [ ] P1 — Make service-worker install resilient to single precache failures
  Why: `cache.addAll(PRECACHE)` rejects the full install when one precache URL fails, which can break offline support because of one stale generated asset.
  Evidence: `public/sw.js`, `scripts/stamp-sw.mjs`, MDN `Cache.addAll()` rejection behavior.
  Touches: `public/sw.js`, `scripts/stamp-sw.mjs`, `test/offline-fallback.test.mjs`, `tests/playwright/sw-lifecycle.spec.mjs`.
  Acceptance: The install path caches valid precache entries even if one URL fails, logs or records failed entries without throwing away the whole worker, and tests simulate one missing precache URL.
  Complexity: M

- [ ] P1 — Remove orphaned homepage terminal runtime, styles, and tests
  Why: The visible terminal was removed, but terminal command code, `.hero-terminal-*` CSS, and terminal tests still ship or gate maintenance.
  Evidence: `public/scripts/main.js`, `src/styles/global.css`, `src/styles/critical.css`, `test/terminal-commands.test.mjs`; no `id="heroTerm"` or `id="termBody"` remains under `src/`.
  Touches: `public/scripts/main.js`, `src/styles/global.css`, `src/styles/critical.css`, `test/terminal-commands.test.mjs`, `test/content-visibility.test.mjs` if selector expectations change.
  Acceptance: No `heroTerm`, `termBody`, interactive terminal command handlers, or `.hero-terminal-*` selectors remain; tests cover the current homepage sections instead of removed terminal behavior; bundle and CSS audits still pass.
  Complexity: M

- [ ] P1 — Add a WCAG 2.2 target-size regression gate
  Why: The site has strong axe/static checks, but no browser gate enforces the WCAG 2.2 2.5.8 24x24px minimum for links, buttons, and controls.
  Evidence: `scripts/audit-a11y.mjs`, `tests/playwright/portfolio-audits.spec.mjs`, W3C WCAG 2.2 target-size criterion.
  Touches: `tests/playwright/portfolio-audits.spec.mjs` or a new focused Playwright audit, `scripts/audit-a11y.mjs` docs, relevant CSS fixes found by the gate.
  Acceptance: A Playwright audit measures visible interactive targets across desktop and mobile viewports, fails below 24x24px unless an allowed WCAG exception is encoded, and passes on current pages.
  Complexity: S

### P2

- [ ] P2 — Expose build commit identity through status and live smoke checks
  Why: `status.json` reports version and counts, but live smoke cannot prove GitHub Pages is serving the exact commit that was pushed.
  Evidence: `src/pages/status.json.ts`, `scripts/smoke-live-site.mjs`, local-build/no-remote-CI repository policy.
  Touches: `src/pages/status.json.ts`, `scripts/smoke-live-site.mjs`, build environment variables or a local stamp script, `test/status-endpoint.test.mjs`.
  Acceptance: `status.json` includes a commit SHA/build identity when available; live smoke accepts an expected commit and fails if the live endpoint serves a different build; local builds without git metadata degrade to an explicit `unknown` value.
  Complexity: M

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
