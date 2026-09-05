# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

## Research-Driven Additions

Added 2026-09-04 from the research pass recorded in RESEARCH.md. The 2026-08-20 additions under this heading were all completed and have been removed per the ROADMAP hygiene rule.

### P0

### P1

### P2

- [ ] P2 — Stabilise the flaky Pagefind degraded-state interaction test
  Why: tests/playwright/interaction-smoke.spec.mjs:276 waits 6s for [data-pagefind-shell] to reach data-pagefind-state="degraded" after a simulated missing bundle. Under a loaded machine it stayed "loading" and failed; the same test passes in isolation (2 passed, 2026-09-05). A fixed timeout on a machine-speed-dependent transition is the wrong shape of assertion.
  Evidence: a full `npm run audit:interactions` run on 2026-09-05 failed this test in the chromium project while 45 others passed; re-running it alone with `playwright test --config=playwright.interactions.config.mjs -g "search missing bundle exposes fallback recovery"` passed both projects.
  Touches: tests/playwright/interaction-smoke.spec.mjs, public/scripts/search-page.js.
  Acceptance: the test asserts the degraded state is reached without a hand-tuned millisecond budget (poll on the state the page reports, or drive the failure deterministically), and ten consecutive full audit:interactions runs show no flake.
  Complexity: S


- [ ] P2 — Ship Speculation Rules through the response header instead of an inline script
  Why: the 2026-07-28 revert (`57b9be1`) happened because `'inline-speculation-rules'` in a meta CSP made WebKit log console errors, breaking the zero-console-error contract. The `Speculation-Rules` response header points at an external JSON file, so the inline keyword is never needed and no CSP-delivery redesign is required. The internal Caddy already stamps headers. This supersedes the "Prerender same-origin navigations via Speculation Rules" item in `Roadmap_Blocked.md`, whose stated blocker no longer applies.
  Evidence: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Speculation-Rules (external rules must be served as `application/speculationrules+json`); https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API (the `'inline-speculation-rules'` requirement is documented against the `<script>` form only); `deploy/vps/Caddyfile:37`; the 2026-07-28 revert `57b9be1`. Needs live validation: MDN does not state which directive governs the external rules fetch, so confirm under the shipped `script-src 'self'` before relying on it.
  Touches: new `public/speculation-rules.json`, `deploy/vps/Caddyfile` (header plus MIME type), `scripts/smoke-live-site.mjs`, `scripts/audit-public-endpoints.mjs`.
  Acceptance: the live response carries a `Speculation-Rules` header, the referenced file serves `application/speculationrules+json`, Chromium prerenders a same-origin navigation, and a WebKit run through `audit:cross-engine` logs zero console errors. Confirm via the existing `/csp-report` sink that the external fetch raises no violation under `script-src 'self'`.
  Complexity: M

- [ ] P2 — Persist the edge access log outside the container
  Why: `deploy/vps/caddy-block.txt` writes to `/var/log/caddy/portfolio.log` inside the edge container, and `deploy:vps` recreates containers on every deploy, so the GoAccess report loses its history each time the site ships. The report itself is correct and correctly kept outside `dist/`.
  Evidence: `deploy/vps/caddy-block.txt` log block; `scripts/deploy-vps.mjs` force-recreate; `CLAUDE.md` traffic-reporting caveat.
  Touches: `deploy/vps/docker-compose.yml` or the edge compose in the ops repo, `deploy/vps/analytics-report.sh`.
  Acceptance: a deploy leaves the previous days' log entries intact and the GoAccess report spans more than one deploy cycle, verified by comparing the report's date range before and after a deploy.
  Complexity: S

- [ ] P2 — Validate /resume.json against the published JSON Resume schema
  Why: `src/pages/resume.json.ts` pins `$schema` to jsonresume v1.0.0, but `test/resume-schema.test.mjs` only asserts ISO date format and ordering. `work[].keywords` is emitted and is not a field in the v1.0.0 schema, so the export already deviates from the contract it advertises.
  Evidence: `src/pages/resume.json.ts:9` and its `work` mapping; `test/resume-schema.test.mjs`; https://jsonresume.org/schema
  Touches: `test/resume-schema.test.mjs`, `package.json` devDependency on `@jsonresume/schema`, `src/pages/resume.json.ts`.
  Acceptance: the built `dist/resume.json` validates against `@jsonresume/schema` in the test run, and a deliberately invalid field makes the test fail.
  Complexity: S

- [ ] P2 — Close the release-provenance gap or retire the unreachable attested tier
  Why: live `/status.json` reports 60 releases as 31 checksum, 29 unsigned, 0 attested. GitHub Artifact Attestations are produced by `actions/attest-build-provenance` inside a GitHub Actions workflow, which repo policy forbids, so the `attested` tier the trust surface publishes cannot ever be non-zero. Publishing a tier that is unreachable by construction weakens the surface's credibility.
  Evidence: https://portfolio.getparkerai.com/status.json ; https://docs.github.com/en/actions/concepts/security/artifact-attestations ; `src/data/generated-trust.ts`. Distinct from the `Roadmap_Blocked.md` P0 provenance item, which is scoped to enabling `--fail-on-unsigned-featured-releases` for *featured* repos and is blocked on ClearCut; this item is about the whole 60-release distribution and the reachability of the tier itself, and is not blocked.
  Touches: `src/data/generated-trust.ts`, `src/pages/status.astro`, `scripts/summarize-generated-data.mjs`, `test/generated-data-trust.test.mjs`.
  Acceptance: either the 29 unsigned releases carry SHA-256 checksums and the distribution reflects it, or the provenance model documents that `attested` is out of reach under local-build policy and stops reporting it as an achievable tier.
  Complexity: M

- [ ] P2 — Prove each audit gate can fail by planting a real violation
  Why: three separate mechanisms were found measuring nothing while their own tests stayed green, because those tests exercise helper functions against synthetic fixtures rather than the production path. `test/html-structure.test.mjs` passes `main.js` into `inspectHtml` directly, so the guard looks healthy while being unreachable on every real page.
  Evidence: `scripts/fix-html-structure.mjs:75-88` vs `test/html-structure.test.mjs:22`; `astro.config.mjs:17` vs the absent `cacheKey`; `scripts/audit-dependencies.mjs` strict PASS on a drifted tree.
  Touches: `test/` (new self-test coverage), `scripts/` audits that currently lack a negative control.
  Acceptance: for each build-time audit, a test injects a violation into the real artifact the audit inspects and asserts a non-zero exit; a gate that cannot be made to fail is either fixed or removed.
  Complexity: M

### P3

- [ ] P3 — Publish a single derived data page and cite it from /ai/
  Why: 2026 citation studies consistently find that pages carrying dense original statistics earn substantially more AI-search citations than prose, and that owned content is otherwise rarely cited. This site already computes 201 project records, language metrics, release-provenance distributions and freshness telemetry, so the data exists and needs no invented content.
  Evidence: https://citemetrix.com/state-of-ai-search-2026/ ; https://www.5wpr.com/research/state-of-ai-citations-2026/ ; `src/data/generated-trust.ts`, `src/pages/status.json.ts`.
  Touches: new route under `src/pages/`, `src/data/interior-og-pages.ts`, `src/pages/llms.txt.ts`, sitemap/schema/endpoint/search/image audits, `scripts/scaffold-route.mjs` registration surfaces.
  Acceptance: the route renders only figures derived from existing generated data with no hand-written claims, passes every registration audit named by `npm run scaffold:route -- --dry-run`, and appears in `/llms.txt` and the sitemap.
  Complexity: M

- [ ] P3 — Evaluate declarative WebMCP on the search form during the Chrome origin trial
  Why: Lighthouse now ships an Agentic browsing audit category covering llms.txt, registered WebMCP tools, declarative WebMCP on forms and agent accessibility. A site that sells AI implementation and already invites agent crawlers in `robots.txt` is the natural place to dogfood it. Chrome runs the public origin trial from Chrome 149 to 156.
  Evidence: https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt ; https://developer.chrome.com/blog/ai-webmcp-origin-trial ; https://www.spronta.com/blog/state-of-webmcp-july-2026/ (no mainstream agent consumes WebMCP tools yet, and the API surface still changes between drafts).
  Touches: `src/pages/search.astro`, `src/layouts/Base.astro` (origin-trial token), `deploy/vps/Caddyfile`, `scripts/audit-public-endpoints.mjs`.
  Acceptance: the search form exposes a declarative tool that Chrome's WebMCP surface registers, the origin-trial token is scoped and dated, no runtime JavaScript is added to non-search routes, and the change is reverted cleanly if the trial lapses without adoption.
  Complexity: M
