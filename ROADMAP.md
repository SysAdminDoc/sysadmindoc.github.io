# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

### P0

### P1

### P2

- [ ] P2: Count every writer that can reach a Caddy container's output
  Why: A `net` writer with `soft_start` falls back to stderr; a file writer aimed at `/dev/stderr` or `/proc/self/fd/1` writes to the container log; the include/exclude reading isn't Caddy's longest-match rule (an include of `http` and `http.log.error.portfolio` with an exclude of `http.log.error` still logs portfolio errors); and a logger that names only another site's log can still receive portfolio requests through a catch-all site, a mixed-case Host or `log_name`. `exclude ["*"]` reads as a leak though Caddy drops every module log with it.
  Evidence: fifteenth drain review, 2026-09-24; Caddy logging.go:94-113,549-591, netwriter.go:199-211, httptype.go:914-917; `scripts/lib/edge-log-check.mjs`.
  Touches: `scripts/lib/edge-log-check.mjs`, `test/edge-log-check.test.mjs`.
  Acceptance: only a file writer to a real file is exempt, every other logger is held to the filter whatever it includes, include and exclude follow Caddy's loggerAllowed, and each case has a test.
  Complexity: S

### P3

- [ ] P3: Tighten the holder test's budget
  Why: It allows 10 s plus three npm starts, so at normal speed a runner that releases 8 s late, or waits 8 s after logging OK or START, passes at about 10.25 s against 10.7 s; slowed by 5 s per start, the budget reaches 55.9 s and the 30 s mutants pass at 47.3 s.
  Evidence: fifteenth drain review, 2026-09-24; `test/refresh-and-deploy.test.mjs:252`.
  Touches: `test/refresh-and-deploy.test.mjs`.
  Acceptance: the 8 s and 30 s mutants fail at normal speed and the 30 s ones slowed, while the unchanged runner passes both ways.
  Complexity: S

- [ ] P3: Narrow the gutter check's off-screen skip, and stop two false alarms
  Why: Text is skipped when wholly off-screen and any ancestor is positioned, so a `<p>` moved off by a transform or a negative margin inside a positioned card passes. `aria-hidden` text at `opacity: 0` near the edge fails though it isn't drawn, and an ellipsis-truncated line fails on text it hides.
  Evidence: fifteenth drain review, 2026-09-24; `tests/playwright/portfolio-audits.spec.mjs:494-500,519`.
  Touches: `tests/playwright/portfolio-audits.spec.mjs`.
  Acceptance: only text whose own positioned box sits off-screen is skipped, fully transparent text is skipped, text is clipped by its overflow-hiding ancestors before it's measured, and each case is checked planted.
  Complexity: S

- [ ] P3: Complete css:audit's list of syntax newer than the targets, and let var() values kill
  Why: `allow-discrete` transitions, the `lh` unit, `linear()` easing, `pow()`, `abs()`, unprefixed `image-set()` and two-value `display` are each dropped by a target, so the value before one is a live fallback, but the audit calls it dead. The other way, a value with `var()` always parses (then computes to unset), so `color:#888` before `rgb(from var(--accent) ...)` is dead, not a fallback.
  Evidence: fifteenth drain review, 2026-09-24; `scripts/lib/css-overrides.mjs:43,55`.
  Touches: `scripts/lib/css-overrides.mjs`, `test/css-overrides.test.mjs`.
  Acceptance: each case comes out right, with a test apiece.
  Complexity: S

- [ ] P3: Close the CSP sink's scrub regressions and cut-off gaps
  Why: The cut rule measures the sample after whitespace is collapsed, so a browser-cut sample with a newline or indentation never counts as cut; a cut-off ID after `{`, `[` or `/` survives; a whole ID joined to a word by a hyphen (`--<id>-root`) now passes, and so does `+33 6 12 34 56 78` (one single-digit group), both of which the previous version scrubbed; `\x40`, `%2540`, a full-width at sign and `@` hide an email. Keys still collide once a scrubbed sample passes 64 characters, and the `"` to `'` swap merges `getElementById("app")` with `getElementById('app')`. A store younger than the smoke's five-minute margin reads a missing smoke row as a flood.
  Evidence: fifteenth drain review, 2026-09-24; `deploy/vps/csp-report-server.mjs:168-182`, `scripts/lib/csp-report-summary.mjs:68`.
  Touches: those files and their tests.
  Acceptance: each leaking case is scrubbed, each regression is back to `[id]` or `[number]`, keys don't collide on either case, and a young store with no smoke row says the row is missing.
  Complexity: S

- [ ] P3: Check the preflight's browser audit on a busy PC
  Why: `a11y:audit:browser` runs with a 90-second test timeout, a 10-second expect timeout and no retries, so the load that stopped the runner tests on 2026-09-23 could stop it too. Nobody has tried it under load.
  Evidence: ninth drain review, 2026-09-23; `playwright.audits.config.mjs:14,16,25`.
  Touches: `playwright.audits.config.mjs`.
  Acceptance: the audit passes with every process start slowed by 5 s, or its limits change until it does.
  Complexity: S

## Research-Driven Additions

Added 2026-09-22 from the research recorded in RESEARCH.md. Items that need the owner's decision went to Roadmap_Blocked.md instead.

### P0

### P1

### P2

### P3

- [ ] P3: Let browsers without `style-src-elem` apply the site's own inline CSS
  Why: Browsers that don't know `style-src-elem` (Firefox before 108, Safari before 15.4) check an inline `<style>` against `style-src`, which is `'self'` alone, without the two hashes `style-src-elem` carries. So they refuse the critical CSS and the no-JS reveal block and draw the page unstyled until the stylesheet lands.
  Evidence: 33 stored reports with effective directive `style-src` and the site's own page as their source, 2026-08-20 to 2026-09-23. Samples from the 2026-09-23 sink change will show whether they're the critical CSS.
  Touches: `src/layouts/Base.astro` (`styleSrc`), `public/offline.html`, `scripts/audit-csp.mjs`, `test/csp-audit.test.mjs`.
  Acceptance: `style-src` carries the same hashes as `style-src-elem`, which changes nothing for browsers that use `style-src-elem`, and the samples of any new `style-src` reports are no longer the site's own blocks.
  Complexity: S

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
