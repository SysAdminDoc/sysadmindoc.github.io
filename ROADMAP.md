# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

## Research-Driven Additions

Added 2026-09-04 from the research pass recorded in RESEARCH.md. The 2026-08-20 additions under this heading were all completed and have been removed per the ROADMAP hygiene rule.

### P0

### P1

- [ ] P1 — Enable npm min-release-age via a committed .npmrc
  Why: the repo has no `.npmrc`, so freshly published versions install immediately. npm 11.10+ supports `min-release-age` but leaves it off, and `packageManager` pins npm 11.13.0. Shai-Hulud V2 moved to the `preinstall` hook, so even a failed install executes the payload, and the "Mini Shai-Hulud" waves continued from 2026-04-29 into May 2026.
  Evidence: no `.npmrc` in the tree; `package.json` `packageManager: npm@11.13.0`; https://www.nodejs-security.com/blog/hardening-your-npm-pnpm-config-for-shai-hulud
  Touches: new `.npmrc`, `test/toolchain.test.mjs`, `README.md` setup notes.
  Acceptance: `.npmrc` sets a documented `min-release-age`, a test pins the value alongside the existing `packageManager` assertion, and `npm ci` still resolves the current lockfile.
  Complexity: S

- [ ] P1 — Point the PWA Catalog shortcut at /catalog/
  Why: `public/manifest.json` describes the shortcut as "Open the full project catalog" but targets `/?source=pwa#catalog`, which since the v0.26.0 split renders only the top-84 preview slice. The full list is the static `/catalog/` route.
  Evidence: `public/manifest.json` shortcuts entry; `CLAUDE.md` catalog-split architecture note; `src/pages/catalog.astro`.
  Touches: `public/manifest.json`, `test/pwa-manifest.test.mjs`.
  Acceptance: every manifest shortcut URL resolves to a built route whose content matches the shortcut description, asserted by a test against `dist/`.
  Complexity: S

- [ ] P1 — Tag v0.42.1, v0.42.2 and v0.42.3, and gate future releases on a tag
  Why: `git tag` stops at v0.42.0 while three versions have shipped since. This is the second lapse; v0.31.0 through v0.38.0 were backfilled on 2026-08-20 by locating each version-bump commit.
  Evidence: `git tag` output 2026-09-04; `CLAUDE.md` release-tagging section.
  Touches: git tags, `scripts/refresh-and-deploy.mjs` or `scripts/publish-pages.mjs`.
  Acceptance: each shipped version has an annotated tag on its version-bump commit, tags are pushed, and a deploy of a `package.json` version with no matching tag fails a gate.
  Complexity: S

- [ ] P1 — Clean dist/ before a build so stale artifacts cannot ship
  Why: `astro build` writes into an existing dist/ without removing files a previous build left behind, and `scripts/deploy-vps.mjs:155` tars the whole directory (`tar -czf ... -C distDir .`), so anything stale ships. Observed 2026-09-05: a leftover `dist/.prerender/chunks/server_*.mjs` from an interrupted build failed `csp:audit:dist:style:elem` on a `createContextualFragment` sink; a clean rebuild has no such directory. The audit caught it, but a stale file that happens to contain no sink would deploy silently.
  Evidence: `.tmp/b11.log` CSP preflight failure naming `dist/.prerender/chunks/server_BLci6zst.mjs`; `ls -a dist/` after a clean `npx astro build` shows no `.prerender`; `scripts/deploy-vps.mjs:155`.
  Touches: `package.json` (`build`/`build:ci`), `scripts/deploy-vps.mjs`, `test/toolchain.test.mjs`.
  Acceptance: a build removes dist/ first (or the deploy refuses a dist/ containing files the build did not write), proven by planting a stray file in dist/ and watching it be absent from the shipped tree.
  Complexity: S

- [ ] P1 — Fix the focus-obscured failure on /search/ in the light theme with fixture data
  Why: WCAG 2.2 AA 2.4.11 Focus Not Obscured. `tests/playwright/interaction-smoke.spec.mjs:887` fails with "A element obscured by sticky nav" on the brand link at the top of /search/. It fails only in the `chromium-light` project and only against fixture-backed data; the same suite passes on live data (46 passed, 2026-09-05), so it is data- or layout-dependent rather than a flat regression. `elementFromPoint` at the focused link centre returns a node that is neither the link nor a descendant, which points at a sticky-nav backdrop or pseudo-element painting over it in the light palette.
  Evidence: `.tmp/playwright-results/interaction-smoke-focus-no-9e8a4-isible-above-the-sticky-nav-chromium-light/test-failed-1.png` shows the brand link focused with its ring visible while the assertion reports it obscured; `tests/playwright/interaction-smoke.spec.mjs:854-889`.
  Touches: `src/styles/critical.css` and `src/styles/layers/unlayered.css` (`.ni` sticky header stacking), `tests/playwright/interaction-smoke.spec.mjs`.
  Acceptance: `npm run audit:interactions` passes in both `chromium` and `chromium-light` against fixture-backed data, and the assertion still fails when the nav is deliberately given a higher stacking context over the focused element.
  Complexity: M

### P2

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

- [ ] P2 — Refresh the GitHub repository description and homepage URL
  Why: `gh repo view` returns description "Personal portfolio and project showcase site hosted on GitHub Pages" and `homepageUrl` `https://sysadmindoc.github.io/`. Both were superseded on 2026-07-28 when the canonical origin moved to portfolio.getparkerai.com; the repo page is the first thing a visitor arriving from GitHub reads.
  Evidence: `gh repo view --json description,homepageUrl` on 2026-09-04; `CLAUDE.md` hosting section.
  Touches: repository settings only (no tracked files).
  Acceptance: `gh repo view` reports the current origin and a description that does not claim GitHub Pages hosting.
  Complexity: S

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
