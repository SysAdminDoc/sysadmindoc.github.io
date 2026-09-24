# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

### P0

### P1

### P2

- [ ] P2: Close the three ways past the proxy trust checks
  Why: The live check compares header names literally, but Caddy expands placeholders in them, so `vars fwd X-Forwarded-For` with `header_up {vars.fwd} {http.request.header.X-Real-IP}` let a local client's forged address through a real Caddy 2.11.4 while the check passed. The static check's `expandEnvDefaults` only knows `[A-Za-z0-9_]+` names, where Caddy replaces any `{$...}`, so `{$ "x:}` hides a following `header_up` in a false quote. The ntfy config probe greps for key text, which a YAML escape (`"proxy\x2dforwarded\x2dheader"`) gets past.
  Evidence: fourteenth drain review, 2026-09-24, `rv14-live-walker.mjs`; `scripts/lib/proxy-trust-check.mjs:26,30`, `scripts/lib/caddyfile.mjs` `expandEnvDefaults`, the config probe in `verifyProxyTrust`.
  Touches: those files, `test/proxy-trust-check.test.mjs`, `test/endpoint-header-contract.test.mjs`.
  Acceptance: a request header whose name holds a placeholder fails the live check, any `{$...}` expands the way Caddy's replaceEnvVars does, and ntfy fails the deploy if it has any config file at all.
  Complexity: S

- [ ] P2: Keep a stalled claimant from being overtaken, and leave nothing behind
  Why: A claimant that stalls more than 60 s between its re-check and its rename (a sleep, a debugger) has its claim judged stale by age and taken over, and then renames over the new holder's lock: two holders, reproduced with real processes and with a clock 61 s ahead. After 300 random kills, 274 drafts and claims were left that nothing removes, and a chain of nine dead claims locks everyone out for good, since the depth limit returns null.
  Evidence: fourteenth drain review, 2026-09-24, `rv14-stall.mjs` and `rv14-kill.mjs`; `scripts/visual-gate.mjs` `claimInstance`, `tryLock`.
  Touches: `scripts/visual-gate.mjs`, `test/visual-gate.test.mjs`.
  Acceptance: a claim whose process is alive stands for ten minutes, not one; leftovers older than that are swept; a stale claim at the depth limit is removed rather than blocking; the paced and six-worker races still show one holder.
  Complexity: S

### P3

- [ ] P3: Read the last few log-size forms as Go does
  Why: `sizeMb` rejects `1_0m` and hex floats like `0x1p24`, which Go's ParseFloat reads, measures the suffix after lowercasing and in UTF-16 where Go measures bytes first (a Kelvin sign in `10KB`), and reads `max-file` with `Number()` where Docker uses Atoi. Each fails safe: the deploy stops rather than passes.
  Evidence: fourteenth drain review, 2026-09-24, `rv14-sizes.mjs`; `scripts/lib/log-retention.mjs:33-37,76,81`.
  Touches: `scripts/lib/log-retention.mjs`, `test/log-retention.test.mjs`.
  Acceptance: each of those reads as Go and Docker read it, with a test apiece.
  Complexity: S

- [ ] P3: Mask IPv6 addresses in both Caddy servers' error text, and drop `remote`
  Why: The `error` filter masks IPv4 only, and whether the edge ever sees a visitor's IPv6 address is unverified. certmagic's "served key authentication" INFO entries carry a top-level `remote` (address and port), normally the CA's validator, which neither filter deletes.
  Evidence: fourteenth drain review, 2026-09-24; certmagic `handshake.go`, `httphandlers.go`; both Caddyfiles' `error regexp`.
  Touches: `deploy/vps/Caddyfile`, the edge Caddyfile in Contabo-VPS-Ops, `scripts/lib/edge-log-check.mjs`, its test.
  Acceptance: an IPv6 address in `error` text is masked on both servers, `remote` is deleted, and the deploy fails on a filter without either.
  Complexity: S

- [ ] P3: Check every logger that writes to the edge container's log
  Why: The deploy reads back only the edge's `default` logger. A second logger with stderr or stdout output would pass the check while it writes visitors' addresses.
  Evidence: eighth drain review, 2026-09-23; `verifyEdgeLogging` in `scripts/deploy-vps.mjs`.
  Touches: `scripts/lib/edge-log-check.mjs`, `scripts/deploy-vps.mjs`.
  Acceptance: the deploy reads the whole `logging.logs` config and fails on any logger other than the site loggers that writes to the container's output unfiltered.
  Complexity: S

- [ ] P3: Tokenize built HTML the way a browser does in the corner cases
  Why: `splitHtml` lets `<!-->` and `<!--->` hide the markup after them, counts hosts inside double-escaped script text, nested `<template>`, `<xmp>` and `<noframes>`, and lets a tag opener inside an attribute value swallow the rest of the page. No built page has any of these today.
  Evidence: eighth drain review, 2026-09-23; `scripts/lib/csp-host-usage.mjs:123-150`.
  Touches: `scripts/lib/csp-host-usage.mjs`, `test/csp-host-usage.test.mjs`.
  Acceptance: each case has a test and reads the way the HTML standard's tokenizer reads it.
  Complexity: S

- [ ] P3: Send `/projects/index.html` to the catalog
  Why: The per-repo matcher takes `index.html` for a repo name, so `/projects/index.html` answers 302 to `/catalog/?q=index.html`.
  Evidence: ninth drain review, 2026-09-23.
  Touches: `deploy/vps/Caddyfile`, `test/retired-urls.test.mjs`, `scripts/smoke-live-site.mjs`.
  Acceptance: `/projects/index.html` answers 301 to `/catalog/`.
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
