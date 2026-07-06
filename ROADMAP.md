# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.21.7
Last normalized: 2026-06-29

## Research-Driven Additions

### P0

- [ ] P0 — Fix resume PDF artifact generation and built-link gating
  Why: The current built site contains a broken `/resume.pdf` download link, and the normal build does not generate the PDF or run the link audit.
  Evidence: `npm run links:audit`, `src/pages/resume.astro`, `scripts/generate-resume-pdf.mjs`, `package.json`.
  Touches: `package.json`, `scripts/generate-resume-pdf.mjs`, `scripts/audit-built-links.mjs`, `src/pages/resume.astro`, `test/`, `tests/playwright/`.
  Acceptance: A clean production build either emits `dist/resume.pdf` before link validation or removes the dead download path; `npm run links:audit` runs in the release/build gate and passes.
  Complexity: M

### P1

- [ ] P1 — Expand rendered accessibility and visual regression coverage to all major public routes
  Why: Current Playwright axe/target-size/visual baselines cover home, search, archive, and one project route, leaving secondary pages vulnerable to theme, overflow, and accessibility regressions.
  Evidence: `tests/playwright/portfolio-audits.spec.mjs`, `src/pages/status.astro`, `src/pages/timeline.astro`, `src/pages/releases.astro`, `src/pages/screenshots.astro`, `src/pages/resume.astro`, WCAG 2.2.
  Touches: `tests/playwright/portfolio-audits.spec.mjs`, `tests/playwright/__screenshots__/`, `playwright.audits.config.mjs`, major `src/pages/*.astro` surfaces as fixes require.
  Acceptance: `npm run audit:playwright` exercises desktop and mobile dark/light coverage for status, timeline, releases, screenshots, resume, uses, now, healthcare, language lane, and representative project/search/archive/home routes with no axe, target-size, overflow, or visual failures.
  Complexity: L

- [ ] P1 — Add PWA manifest screenshots and install metadata audit
  Why: The manifest has icons and shortcuts but no screenshot previews, even though public screenshot assets already exist and install UIs use screenshots for richer app presentation.
  Evidence: `public/manifest.json`, `public/screenshots/`, MDN Web App Manifest screenshots, web.dev richer install UI.
  Touches: `public/manifest.json`, `scripts/audit-assets.mjs` or new manifest audit inside existing scripts, `README.md` if install verification commands change.
  Acceptance: Manifest includes valid wide/narrow screenshot entries with `src`, `sizes`, `type`, `form_factor`, and `label`; local audit verifies referenced assets exist, dimensions meet install UI constraints, and the manifest remains valid JSON.
  Complexity: M

- [ ] P1 — Add portfolio release artifact smoke verification
  Why: The site exposes build identity and status data, but there is no local smoke command proving the tagged portfolio release has the expected downloadable artifact, size, and digest.
  Evidence: `src/pages/status.json.ts`, `scripts/smoke-live-site.mjs`, `CHANGELOG.md`, GitHub Releases API.
  Touches: `scripts/smoke-live-site.mjs` or a focused release-smoke script, `package.json`, `README.md`, `CHANGELOG.md`.
  Acceptance: A local command verifies a requested `vX.Y.Z` release exists for `SysAdminDoc/sysadmindoc.github.io`, has the expected site artifact(s), reports size/digest/upload metadata, and fails clearly when missing or stale.
  Complexity: M

- [ ] P1 — Refresh direct dependency and override floors after Astro 7 adoption
  Why: Dependency audit is security-clean but reports range/latest updates for Astro, Vite override, Shiki, sharp, and `@astrojs/rss`; Vite and sanitizer advisories make freshness a trust concern on this Windows-first repo.
  Evidence: `npm run deps:audit`, `package.json`, `package-lock.json`, GHSA-fx2h-pf6j-xcff, GHSA-rpr9-rxv7-x643.
  Touches: `package.json`, `package-lock.json`, `scripts/audit-dependencies.mjs` if policy needs refinement.
  Acceptance: `npm run deps:audit`, `npm run audit:prod`, `npm test`, `npm run check`, and `npm run build` pass with current supported package floors or with explicit policy for any intentionally held range.
  Complexity: M

### P2

- [ ] P2 — Precache the actual Pagefind component runtime after search indexing
  Why: `sw:stamp` runs before `search:index` and only looks for `pagefind.js`/`pagefind-ui.js`, while `/search/` loads `pagefind-component-ui.css` and `pagefind-component-ui.js`.
  Evidence: `scripts/stamp-sw.mjs`, `src/pages/search.astro`, `dist/pagefind/`, Pagefind docs.
  Touches: `package.json`, `scripts/stamp-sw.mjs`, `public/sw.js`, `test/offline-fallback.test.mjs`, `tests/playwright/sw-lifecycle.spec.mjs`.
  Acceptance: A clean build stamps Pagefind component CSS/JS, worker, wasm/index assets needed for first-install offline search or documents a deliberate bounded subset; service-worker tests prove `/search/` behaves correctly offline after install.
  Complexity: M

- [ ] P2 — Make contribution heatmap semantics match available source data
  Why: Homepage source data only records binary push-day presence, but the rendered legend exposes five activity intensity levels and every active day is forced to level 4.
  Evidence: `src/data/_stats.json`, `src/pages/index.astro`, `src/styles/global.css`, GitHub-style contribution heatmap conventions.
  Touches: `scripts/fetch-stars.mjs`, `src/data/generated.d.ts`, `src/pages/index.astro`, `src/styles/global.css`, `tests/playwright/portfolio-audits.spec.mjs`.
  Acceptance: The heatmap either fetches and renders real per-day activity counts into meaningful intensity buckets, or the UI/legend is simplified to an active/inactive push-day calendar with matching accessible text.
  Complexity: M

- [ ] P2 — Continue source-level CSP style hardening
  Why: Dist CSP gates pass, but the source CSP audit still reports 15 style blocks blocking a stricter source-level `style-src-elem` posture.
  Evidence: `node scripts/audit-csp.mjs --strict --active-style-src-elem --candidate-style-src-attr "'none'"`, `src/components/*.astro`, `src/pages/*.astro`, `src/styles/global.css`.
  Touches: `src/styles/global.css`, `src/components/GreatestHits.astro`, `src/components/SkillCard.astro`, `src/components/TagCloud.astro`, major route-level Astro styles, `scripts/audit-csp.mjs`.
  Acceptance: Route/component styling is externalized or otherwise accounted for so the source-level CSP audit can pass without widening the active policy; visual baselines remain stable.
  Complexity: L

- [ ] P2 — Synchronize ignored maintainer docs and version metadata
  Why: Maintainer-facing ignored docs still mention older versions/status while package and README are at v0.21.8, which can mislead future autonomous runs.
  Evidence: `ROADMAP.md`, `CLAUDE.md`, `PERFORMANCE_AUDIT.md`, `IMAGE_PIPELINE.md`, `package.json`, `README.md`.
  Touches: `CLAUDE.md`, `ROADMAP.md`, `PERFORMANCE_AUDIT.md`, `IMAGE_PIPELINE.md`, `README.md` only if public setup text changes.
  Acceptance: Maintainer docs reflect the current shipped version, Astro 7/Vite 8 state, current audit commands, and no stale "blocked Astro 7" or mismatched status claims remain.
  Complexity: S
