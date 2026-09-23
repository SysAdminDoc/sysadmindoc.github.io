# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

### P0

### P1

### P2

### P3

## Research-Driven Additions

Added 2026-09-22 from the research recorded in RESEARCH.md. Items that need the owner's decision went to Roadmap_Blocked.md instead.

### P0

### P1

### P2

- [ ] P2: Make the colours work in every browser the build targets
  Why: The build declares Chrome and Edge 111, Safari 16.4 and Firefox 114 as targets, but every colour token is a custom property set with `light-dark()`, which those browsers before Chrome 123, Safari 17.5 and Firefox 120 don't know. A custom property takes any value and the last declaration wins, so the plain value written before each one (`--grn:#4ade80;--grn:light-dark(…)`) is no fallback, and every `var()` that reads a token is invalid there.
  Evidence: sixth drain review, 2026-09-23 (in Chromium, `--c:red;--c:nosuchfn()` gives black, not red); all 50 `light-dark()` uses in `src/styles` set a custom property; `CSS_BROWSER_TARGETS` in `scripts/lib/minify-css.mjs`.
  Touches: `scripts/lib/minify-css.mjs` (let lightningcss lower `light-dark()`, which it does with `--lightningcss-light`/`--lightningcss-dark` switched by `color-scheme`), or `CSS_BROWSER_TARGETS` if the older browsers are dropped instead; the `color-scheme` rules the theme toggle sets; `test/css-minify.test.mjs`.
  Acceptance: Chrome for Testing 122, headless, renders the homepage and `/catalog/` in both themes with the same colours as the current Chromium, shown by screenshots, or the declared targets start at the versions that support `light-dark()` and the README says which browsers are supported.
  Complexity: M

- [ ] P2: Make the CSP report stream readable, and check it every night
  Why: The sink recorded the avatar bug three weeks before anyone noticed, and 260 of its 303 reports can't be classified.
  Evidence: sink aggregates on 2026-09-23 (303 reports since 2026-08-20, 260 of them recorded as `(invalid-url)`); the policy in `src/layouts/Base.astro:75` has no `'report-sample'`.
  Touches: `src/layouts/Base.astro`, `deploy/vps/csp-report-server.mjs`, a new read-only `scripts/csp-report-summary.mjs`, `scripts/refresh-and-deploy.mjs`.
  Acceptance: `script-src` and `style-src` carry `'report-sample'`. The sink stores the 40-character sample and tags each report as synthetic, extension or first-party. The nightly prints the counts, and exits non-zero when a first-party document reports a blocked host or directive it hasn't reported before.
  Note (seventh drain review): anyone on the internet can post to the sink, so a report's document URL and sample are claims. The nightly has to hold up against a burst of forged first-party reports, for example by needing the same new violation from several distinct reports before it fails.
  Complexity: M

### P3

- [ ] P3: Send `'wasm-unsafe-eval'` only with the Pagefind worker
  Why: Every page's policy allows WebAssembly compilation, but only the Pagefind worker behind `/search/` uses it, and a worker takes its policy from its own response header.
  Evidence: second drain review, 2026-09-23; `scriptSrc` in `src/layouts/Base.astro`; `/pagefind/pagefind-worker.js`.
  Touches: `deploy/vps/Caddyfile` (a route for the worker script that adds the keyword to the stamped header), `src/layouts/Base.astro`, `public/offline.html`, `astro.config.mjs`, `scripts/lib/csp-header.mjs`.
  Acceptance: Page policies drop `'wasm-unsafe-eval'` and the worker's header keeps it. The 11 search-corpus specs pass under production headers, and a `WebAssembly.compile` on an ordinary page is refused.
  Complexity: M

- [ ] P3: Show a readable page when a no-JavaScript form post meets a handler that is down
  Why: With the handler down, Caddy's `handle_errors` serves the 404 page, with a 502 status, to a visitor who posted without JavaScript, and their message is gone.
  Evidence: second drain review, 2026-09-23; the `handle_errors` block in `deploy/vps/Caddyfile`.
  Touches: `deploy/vps/Caddyfile`, a not-sent page under `src/pages/contact/`, `test/endpoint-header-contract.test.mjs`.
  Acceptance: A 5xx from `/api/contact` on a navigation shows a page saying the message wasn't sent and giving the email address, and a test pins the route.
  Complexity: S

- [ ] P3: One title and feed-name style, enforced by a test
  Why: Two routes use em dashes in `<title>`, the homepage uses a spaced hyphen, and six feed titles use em dashes, which breaks the site's own writing rule.
  Evidence: `src/pages/colophon.astro:11`, `src/pages/data.astro:73`, the homepage title, `src/layouts/Base.astro:169-174`, and the `&mdash;` in the ImgConverter description (`src/data/projects.ts:111`).
  Touches: those files, and a new assertion in `test/`.
  Acceptance: No built `<title>` or feed title contains an em dash, an en dash or a spaced hyphen, and a test enforces it.
  Complexity: S

- [ ] P3: Publish GitHub releases for v0.43.0 through v0.45.x
  Why: Releases stop at v0.42.0 while tags reach v0.45.2, and the README still runs `smoke:release` against a v0.43.0 asset that doesn't exist.
  Evidence: `gh release list` on 2026-09-22; `README.md:94`.
  Touches: the release steps in `README.md`, `scripts/smoke-release-artifact.mjs`.
  Acceptance: Each minor version from v0.43.0 has a release with the static-site ZIP and its SHA-256, and `smoke:release` passes against the newest one.
  Complexity: S

- [ ] P3: Plant violations for the two unguarded dist audits
  Why: `gates:selftest` proves 11 audits can fail, but covers neither `csp:audit:dist` nor `sw:stamp`.
  Evidence: `scripts/audit-gate-selftest.mjs` has no case for either (checked 2026-09-22).
  Touches: `scripts/audit-gate-selftest.mjs`.
  Acceptance: Each audit rejects a planted violation in the self-test copy and accepts the unmodified build.
  Complexity: S

- [ ] P3: Check the server's own contact settings and backups against /privacy/
  Why: `CONTACT_RETENTION_DAYS` set in the server-side `contact-secrets.env` would override the default the page is built from, and the privacy test can't see that file. A backup of the `contact-data` volume would outlive the 365-day purge.
  Evidence: third drain review; `test/privacy-retention.test.mjs` reads only the committed compose file.
  Touches: `scripts/deploy-vps.mjs` (refuse to deploy when the live env file sets a retention the page doesn't state), the VPS backup scripts in Contabo-VPS-Ops.
  Acceptance: A deploy fails on a mismatched retention in the live env, and no backup keeps a lead longer than the page says.
  Complexity: S

- [ ] P3: Serve the token's minimum age with the token
  Why: `public/scripts/contact-form.js` and the lead-delivery smoke wait a hard-coded 3.5 s, while the handler's minimum is `CONTACT_MIN_TIME`. Raising that past 3.5 s would make every scripted send fail its first try.
  Evidence: third drain review; `contact-form.js` `MIN_TOKEN_AGE_MS`, `scripts/lib/lead-delivery-check.mjs`.
  Touches: `deploy/vps/contact-handler.mjs` (return `minAgeMs` beside the token), `public/scripts/contact-form.js`, `scripts/lib/lead-delivery-check.mjs`.
  Acceptance: With `CONTACT_MIN_TIME=5` the page script and the smoke both send on the first try.
  Complexity: S

- [ ] P3: Make `staleAfter` the earliest of the data's own deadlines
  Why: `/status.json` `staleAfter` follows `_stats.json` `fetchedAt` only, while the profile feed and the catalog check keep their own 36-hour clocks.
  Evidence: third drain review; `src/data/generated-trust.ts`.
  Touches: `src/data/generated-trust.ts`, `src/pages/status.json.ts`, `test/generated-data-trust.test.mjs`.
  Acceptance: `staleAfter` is the earliest expiry of the three, and a test with a stale feed but fresh stars shows it.
  Complexity: S

- [ ] P3: Match the CSP host audit to how browsers check a prefetch
  Why: `scripts/lib/csp-host-usage.mjs` counts a `rel=prefetch` against the directive its `as` names, but CSP Level 3 checks prefetches against `default-src`.
  Evidence: third drain review, from the spec; not yet tested in a browser.
  Touches: `scripts/lib/csp-host-usage.mjs`, `test/csp-host-usage.test.mjs`.
  Acceptance: A Chromium and a Firefox check show which directive governs a cross-origin prefetch, and the audit maps it the same way.
  Complexity: S

- [ ] P3: Send the bare `/projects/` path to the catalog
  Why: The retired-route redirects cover `/projects/<repo>/`, but `/projects/` itself still answers 404.
  Evidence: fourth drain review.
  Touches: `deploy/vps/Caddyfile`, `scripts/smoke-live-site.mjs`.
  Acceptance: `/projects/` answers 301 to `/catalog/`, and `smoke:live` checks it.
  Complexity: S
