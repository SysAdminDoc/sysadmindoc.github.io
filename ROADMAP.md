# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

### P0

### P1

### P2

- [ ] P2: Store only the site's own samples in the CSP sink, and a marker for the rest
  Why: Four rounds of scrub rules still leak. The seventeenth review got through `jane.doe&commat;example.com`, the JS octal `jane.doe\100example.com`, `(at)` and `[at]` spellings, standard base64 keys (`+` and `/` split the run; 28% of random 12-byte tokens survived whole), IPv4 and IPv6 addresses, a MAC address and a dotted session ID. The sample exists to tell the site's own inline code from an extension's, and the site knows its own inline blocks.
  Evidence: seventeenth drain review, 2026-09-24; `deploy/vps/csp-report-server.mjs:169-203`.
  Touches: `deploy/vps/csp-report-server.mjs`, `scripts/deploy-vps.mjs` (ship the site's own sample prefixes), `scripts/lib/csp-report-summary.mjs`, their tests.
  Acceptance: a sample that starts like one of the built site's inline scripts or styles is stored as it came (it's public code); any other is stored as a fixed marker plus a short keyed hash that groups repeats, so no visitor text is kept whatever it holds; every sample from the review is stored as the marker.
  Complexity: M

- [ ] P2: Read noscript both ways and declarative shadow roots in the CSP host audit
  Why: 62d90dc1 parses with `scriptingEnabled: false`, so `<noscript><style></noscript><img src="https://ns-style.example/a.png"></style></noscript>`, which loads in a browser with scripting on, is missed where the old scanner found it. `<template shadowrootmode="open">` contents load with no script in Chrome 111 and Safari 16.4 and are skipped, while the CSS audit does walk templates. `<svg><image href>`, `<iframe srcdoc>`, `src="https:\\host/"` and `url(https\3a //...)` were missed before and after.
  Evidence: seventeenth drain review, 2026-09-24; `scripts/lib/csp-host-usage.mjs:106-132`.
  Touches: `scripts/lib/csp-host-usage.mjs`, `test/csp-host-usage.test.mjs`.
  Acceptance: the page is read with scripting on and off and hosts from both count, a `shadowrootmode` template's contents count, and each missed reference above is found, with a test apiece.
  Complexity: S

### P3

- [ ] P3: Close the CSS output audit's foreign-content, comment and script-escape gaps
  Why: 371502dd regressed two cases: an `.svg` whose `<style>` sits after `<p/>` keeps `light-dar&#x6b;(` undecoded because parse5 leaves foreign content there, and `@import "data:text/css,/*";...` hides a later import because comments are stripped inside strings. JS spellings still pass: `'light\-dark('`, octal `'\154ight-dark('`, a line continuation, `'light-'+'dark('`, an `onerror=` handler, and `<link rel=preload onload="this.rel='stylesheet'" href="data:...">`; `@import` data URIs with `\"`, a leading space or `; base64` are missed.
  Evidence: seventeenth drain review, 2026-09-24; `scripts/audit-css-output.mjs:57`, `scripts/lib/css-output-check.mjs:40-106`.
  Touches: `scripts/lib/css-output-check.mjs`, `scripts/audit-css-output.mjs`, `test/css-output-check.test.mjs`.
  Acceptance: SVG is read by an XML parser, comments are stripped outside strings only, and each spelling above fails the audit, with a test apiece.
  Complexity: S

- [ ] P3: Teach css:audit five more late features, unknown properties and exact var()
  Why: c4de5ded calls live fallbacks dead before `grid-template-rows:subgrid` (Chrome 117), `linear-gradient(in oklch, ...)` (Firefox 127), the `cap` unit (Chrome 118), `clip-path:xywh()` (Chrome 119) and unprefixed `background-clip:text` (Chrome 120). The other way, `transition-behavior:allow-discrete` before `transition-behavior:normal` is spared though a target without the property drops both, and `color:--my-var()` counts as var().
  Evidence: seventeenth drain review, 2026-09-24; `scripts/lib/css-overrides.mjs:43`.
  Touches: `scripts/lib/css-overrides.mjs`, `test/css-overrides.test.mjs`.
  Acceptance: each case comes out right, a property the targets don't know doesn't spare the declaration before it, and var() is matched as a whole function name, with a test apiece.
  Complexity: S

- [ ] P3: Clip the gutter check the way CSS does, and skip transparent and vertically hidden text
  Why: d109412f treats only transform and position as containing blocks and only `overflow: hidden|clip` as clipping, so text in a positioned box inside an `overflow: hidden` parent with `filter`, `translate` or `contain: paint`, or inside `overflow: auto`, is flagged though it's cut off; `color: transparent` text is flagged; a box at `top: -9999px; left: 0` is flagged because only horizontal off-screen counts. Option text, textarea text, input values and CSS `content` text are never measured.
  Evidence: seventeenth drain review, 2026-09-24; `tests/playwright/portfolio-audits.spec.mjs:510-554`.
  Touches: `tests/playwright/portfolio-audits.spec.mjs`.
  Acceptance: containing blocks follow CSS (transform, translate, filter, contain, will-change), every scroll container clips, fully transparent text colour is skipped, a box off-screen in any direction is skipped, form-control and generated text are measured, and each case is planted on the check's page.
  Complexity: S

- [ ] P3: Load the browser too when checking the preflight's audit on a busy PC
  Why: b8a38227's run slowed only node process starts; Chromium and its renderers ran at full speed, and the slowdown fell in global setup, outside the 90 s and 10 s limits, so the limits never met the load.
  Evidence: seventeenth drain review, 2026-09-24; `playwright.audits.config.mjs:14,16,25`.
  Touches: `playwright.audits.config.mjs`.
  Acceptance: the audit runs with the CPU starved (a busy loop on every core, or the browser processes slowed), the longest test time is reported against 90 s, and the limits change if it doesn't pass.
  Complexity: S

- [ ] P3: Refuse a Caddy logger level with a placeholder in it
  Why: `scripts/lib/edge-log-check.mjs:91` compares the level literally, but Caddy fills placeholders first, so `level: "{env.LVL}"` with `LVL=debug` passes and logs debug entries.
  Evidence: seventeenth drain review, 2026-09-24.
  Touches: `scripts/lib/edge-log-check.mjs`, `test/edge-log-check.test.mjs`.
  Acceptance: a level containing `{` is refused, with a test.
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

- [ ] P3: Take the em dashes out of the project descriptions
  Why: 41 descriptions in `src/data/projects.ts` join their halves with `&mdash;` (ImgConverter's among them), and they reach every catalog card, `rss.xml`, `atom.xml` and `feed.json`, which breaks the site's own writing rule. `title-style:audit` checks names only, not descriptions.
  Evidence: `git grep -c '&mdash;' src/data/projects.ts` gives 41 on 2026-09-24; 18 in `rss.xml`, 18 in `atom.xml` and 9 in `feed.json` in that day's build.
  Touches: `src/data/projects.ts`, a check over built descriptions (the feed audit or the title-style audit).
  Acceptance: No project description in `src/data` or in any built feed has an em dash or en dash, each rewritten as a sentence rather than a mechanical swap, and a build check keeps it that way.
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

- [ ] P3: Match the CSP host audit to how browsers check a prefetch
  Why: `scripts/lib/csp-host-usage.mjs` counts a `rel=prefetch` against the directive its `as` names, but CSP Level 3 checks prefetches against `default-src`.
  Evidence: third drain review, from the spec; not yet tested in a browser.
  Touches: `scripts/lib/csp-host-usage.mjs`, `test/csp-host-usage.test.mjs`.
  Acceptance: A Chromium and a Firefox check show which directive governs a cross-origin prefetch, and the audit maps it the same way.
  Complexity: S
