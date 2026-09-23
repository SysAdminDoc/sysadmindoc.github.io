# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

### P0

### P1

### P2

- Collapse the seven stacked redesign blocks in src/styles/layers/unlayered.css (v0.18.4 through v0.45) into one sheet. Each block overrides the last, so any layout change today has to fight rules from six earlier passes. Keep the css-layer contract test and the dead-selector audit green throughout.
  Research note (2026-09-22): the file holds ten labelled blocks, not seven, running from v0.18.4 at `:1` to the v0.45 composition pass at `:1687`, and it defines `:root` tokens in six separate blocks (`:706`, `:1259`, `:1393`, `:1595`, `:1611`, `:1691`). It's 54,702 bytes, and total built CSS has about 10% headroom under its cap (202,740 of 225,280 bytes), so the collapse buys budget as well as clarity.

### P3

## Research-Driven Additions

Added 2026-09-22 from the research recorded in RESEARCH.md. Items that need the owner's decision went to Roadmap_Blocked.md instead.

### P0

### P1

### P2

- [ ] P2: Minify the inlined critical CSS and load `cmdk-data.js` on demand, both under a budget
  Why: 42,121 bytes of unminified CSS make up 54% of the homepage HTML, and a 62,803-byte script blocks every page for a palette that loads lazily anyway. Neither counts against the bundle caps.
  Evidence: `dist/index.html` is 77,459 bytes; `src/layouts/Base.astro:159` and `:212`; `scripts/audit-bundle-size.mjs:104-111` scans only `scripts/` and `_assets/`.
  Touches: `src/layouts/Base.astro`, `public/scripts/cmdk-loader.js`, `scripts/audit-bundle-size.mjs`, `test/runtime-scripts.test.mjs`, `test/csp-audit.test.mjs`.
  Acceptance: The inlined critical CSS is minified with lightningcss before its CSP hash is computed, and `csp:audit:dist` still passes. `cmdk-data.js` is requested only when the palette first opens. The bundle audit counts both files, and the homepage HTML shrinks by at least 10 KB.
  Complexity: M

- [ ] P2: Re-baseline the visual snapshots for the v0.45 design and gate the key routes
  Why: The baselines predate the v0.45 redesign, preflight never compares screenshots, and nothing runs the Linux set.
  Evidence: baselines were last updated 2026-07-25 (Linux) and 2026-09-05 (win32), and 30 files under `src/pages`, `src/styles` and `src/components` have changed since; `/colophon/` has no baseline, and neither has `/privacy/`, so `npm run audit:playwright` fails its four privacy snapshots (third drain review); `package.json:41` and `:69`.
  Touches: `tests/playwright/__screenshots__/`, `tests/playwright/portfolio-audits.spec.mjs`, `package.json`.
  Acceptance: win32 baselines are regenerated from fixtures for every route, including `/colophon/` and `/privacy/`, and the Linux baselines are deleted. A fixture-built visual comparison of `/`, `/ai/`, `/healthcare-it/`, `/resume/` and `/catalog/` runs in `deploy:preflight`.
  Complexity: M

- [ ] P2: Make the CSP report stream readable, and check it every night
  Why: The sink recorded the avatar bug three weeks before anyone noticed, and 260 of its 303 reports can't be classified.
  Evidence: sink aggregates on 2026-09-23 (303 reports since 2026-08-20, 260 of them recorded as `(invalid-url)`); the policy in `src/layouts/Base.astro:75` has no `'report-sample'`.
  Touches: `src/layouts/Base.astro`, `deploy/vps/csp-report-server.mjs`, a new read-only `scripts/csp-report-summary.mjs`, `scripts/refresh-and-deploy.mjs`.
  Acceptance: `script-src` and `style-src` carry `'report-sample'`. The sink stores the 40-character sample and tags each report as synthetic, extension or first-party. The nightly prints the counts, and exits non-zero when a first-party document reports a blocked host or directive it hasn't reported before.
  Complexity: M

- [ ] P2: Trust only the edge proxy's address on the inner Caddy
  Why: `portfolio-app` shares the `web` network with 22 other containers. Since `7e6560df` it trusts every private address, so any of them can hand ntfy and the contact handler a forged `X-Forwarded-For`. That lets it slip the per-client limits or lock a chosen address, the owner's phone for one, out of ntfy with 30 bad tokens.
  Evidence: second drain review on 2026-09-23, reading ntfy v2.28.0 `server/util.go` (it drops trusted addresses and takes the right-most one left); `deploy/vps/Caddyfile` trusts `static private_ranges`; the edge is 172.18.0.2 on `web` today but has no fixed address.
  Touches: the shared proxy compose in Contabo-VPS-Ops (a fixed `ipv4_address` for the edge on `web`), `deploy/vps/Caddyfile`, `deploy/vps/docker-compose.yml` (`NTFY_PROXY_TRUSTED_HOSTS`), `test/endpoint-header-contract.test.mjs`.
  Acceptance: `portfolio-app` trusts and ntfy strips only the edge's fixed address. A request to `portfolio-app` from another container on `web` with a forged `X-Forwarded-For` is attributed to that container's own address, shown by one live probe from a throwaway container.
  Complexity: M

- [ ] P2: Log only what the traffic report needs, then list exactly that on /privacy/
  Why: Each access-log entry keeps the full URI with its query string, every request header (Accept-Language among them), TLS details and every response header, about 2.4 KB a request. The report uses the address, page, time, status, user agent and referrer.
  Evidence: field names of a live `portfolio.log` entry on 2026-09-23; `deploy/vps/caddy-block.txt` logs `format json` unfiltered; `/privacy/` was corrected the same day to describe the full entry.
  Touches: `deploy/vps/caddy-block.txt` (a `format filter` that drops the other request headers, `resp_headers` and `request>tls`, and perhaps the query string), the Contabo-VPS-Ops Caddyfile mirror, `src/pages/privacy.astro`, `test/privacy-retention.test.mjs`.
  Acceptance: A live entry holds only the fields /privacy/ names, a test holds the filter and the page to the same list, and the traffic report still renders.
  Complexity: M

- [ ] P2: Bound the edge container's error log, or say on /privacy/ what it keeps
  Why: Caddy logs a 5xx at ERROR with the visitor's address and headers to the edge container's own log, which Docker keeps by size (3 files of 10 MB) rather than by age, so at this volume it can hold months.
  Evidence: third drain review (Caddy 2.11.4 `server.go` logs 5xx at ERROR, the nightly recreate produces some); `/etc/docker/daemon.json` on the VPS sets `max-size 10m`, `max-file 3`; the `caddy` container log held 18,057 lines on 2026-09-23.
  Touches: `deploy/vps/caddy-block.txt` (a `handle_errors` or log level for the portfolio sites), or `src/pages/privacy.astro`.
  Acceptance: Either no portfolio request's address reaches the container log, or /privacy/ states how long it stays and a test ties the statement to the setting.
  Complexity: S

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
