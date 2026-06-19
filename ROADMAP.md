# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.18.6
Last normalized: 2026-06-19

## Research-Driven Additions

- [ ] P1 - Add conditional GitHub API cache and refresh telemetry
  Why: GitHub REST data refreshes currently refetch repo, release, event, and README payloads without ETag reuse, which raises rate-limit and stale-cache risk.
  Evidence: `scripts/fetch-stars.mjs`; `scripts/summarize-generated-data.mjs`; GitHub REST API conditional request guidance.
  Touches: `scripts/fetch-stars.mjs`, `scripts/summarize-generated-data.mjs`, `src/data/generated.d.ts`, `src/data/fixtures/generated/`, `test/generated-data-trust.test.mjs`.
  Acceptance: GitHub fetches persist ETags per endpoint, send `If-None-Match`, preserve cached payloads on `304 Not Modified`, report refreshed/reused/rate-limited counts, and include tests for fresh, reused, and failed refresh paths.
  Complexity: M

- [ ] P1 - Add light and system theme browser audit coverage
  Why: The rendered Playwright accessibility/visual suite runs only dark mode while the CSS contains extensive light-theme overrides that can regress independently.
  Evidence: `playwright.audits.config.mjs`; `src/styles/global.css`; `tests/playwright/portfolio-audits.spec.mjs`.
  Touches: `playwright.audits.config.mjs`, `tests/playwright/portfolio-audits.spec.mjs`, `tests/playwright/__screenshots__/`, `.github/workflows/ci.yml`.
  Acceptance: Representative homepage, search, archive, and project routes are audited under dark, light, and system preferences with axe, overflow, focus, and screenshot checks; CI fails on theme-specific regressions.
  Complexity: M

- [ ] P2 - Add a service-worker lifecycle browser smoke test
  Why: Static tests validate offline assets, but the main Playwright audit blocks service workers and does not verify installed offline fallback or update-prompt behavior in a browser.
  Evidence: `public/sw.js`; `public/offline.html`; `test/offline-fallback.test.mjs`; `playwright.audits.config.mjs`.
  Touches: `tests/playwright/`, `public/sw.js`, `public/scripts/main.js`, `package.json`, `.github/workflows/ci.yml`.
  Acceptance: A SW-enabled Playwright test installs the service worker, confirms offline navigation reaches `/offline.html`, simulates a waiting worker/update prompt path, and verifies no console errors or reload loops.
  Complexity: M

- [ ] P2 - Add live-app availability and screenshot drift reporting
  Why: The portfolio claims browser-ready live apps and requires screenshots to exist, but no scheduled gate verifies that external demo URLs still respond or that screenshots are fresh.
  Evidence: `src/data/projects.ts`; `src/components/LiveCard.astro`; `scripts/capture-screenshots.mjs`; `scripts/audit-assets.mjs`.
  Touches: `scripts/`, `src/data/projects.ts`, `.github/workflows/quality-gates.yml`, `IMAGE_PIPELINE.md`.
  Acceptance: A timeout-bounded audit checks every live-app URL, reports HTTP status/latency/failure reason, flags screenshot age or missing capture metadata, and publishes a concise quality-gate artifact without failing on one transient retry.
  Complexity: M

- [ ] P2 - Generate SBOM and Pages artifact provenance
  Why: The deploy pipeline has strong dependency and action pinning, but the built Pages artifact has no emitted SBOM or GitHub artifact attestation for provenance.
  Evidence: `.github/workflows/deploy.yml`; `.github/workflows/ci.yml`; GitHub Artifact Attestations documentation.
  Touches: `.github/workflows/deploy.yml`, `.github/workflows/ci.yml`, `package.json`, `README.md`.
  Acceptance: CI/deploy emits an npm SBOM or equivalent dependency inventory for the built artifact, creates a GitHub artifact attestation for the Pages upload, uploads both as artifacts, and documents the verification command.
  Complexity: M

- [ ] P2 - Normalize weekly quality-gate issue summaries
  Why: Scheduled failure issues currently paste long log tails, making the first actionable failure harder to identify.
  Evidence: `.github/workflows/quality-gates.yml`; `scripts/summarize-generated-data.mjs`; `scripts/summarize-performance-audit.mjs`.
  Touches: `.github/workflows/quality-gates.yml`, `scripts/`, `.github/workflows/ci.yml`.
  Acceptance: The quality-gate issue starts with a compact table of failing checks, exit codes, artifact names, and exact local reproduction commands, then links or collapses raw logs.
  Complexity: S

- [ ] P3 - Apply the Sharp 0.35.2 patch update
  Why: `npm view sharp version` reports `0.35.2` while the repo is pinned to `^0.35.1`; image generation and audit gates should validate the patch before it rides Dependabot.
  Evidence: `package.json`; `package-lock.json`; `npm view sharp version time --json`; Sharp release stream.
  Touches: `package.json`, `package-lock.json`, `scripts/audit-image-pipeline.mjs`, `scripts/generate-screenshot-thumbnails.mjs`, `src/pages/og/[slug].png.ts`.
  Acceptance: Sharp is updated to 0.35.2, `npm test`, `npm run images:audit`, OG generation, screenshot thumbnail generation, and `npm run build:ci` pass.
  Complexity: S

- [ ] P3 - Decide whether Node 24 can become the primary CI runtime
  Why: CI runs Node 22 as primary and Node 24 as non-blocking canary even though Node 24 is active LTS; runtime drift should be either promoted or explicitly deferred.
  Evidence: `.github/workflows/ci.yml`; `.github/workflows/deploy.yml`; `package.json` engines.
  Touches: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/workflows/data-refresh.yml`, `.github/workflows/quality-gates.yml`, `package.json`, `README.md`.
  Acceptance: A recorded trial runs the full Node 24 build, tests, browser audits, and deploy-equivalent checks; if green, workflows and docs promote Node 24, otherwise the canary failure reason stays actionable.
  Complexity: S
