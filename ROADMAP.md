# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

### P0

### P1

### P2

### P3

- [ ] P3: Refuse a `style-src` looser than `style-src-elem` in the CSP audit
  Why: the fallback check added in 09034a67 only fails a `style-src` that blocks the site's own blocks. With `'unsafe-inline'`, `'unsafe-hashes'` or `*` in `style-src` it passes, and Firefox before 108 and Safari before 15.4 ignore `style-src-attr`, so they'd allow every style attribute again. Only `styleSrc = styleElemSrc` in `Base.astro` keeps that from happening.
  Evidence: twenty-first review, planted in all 26 pages of a dist copy; `audit-csp.mjs --dist --active-style-src-elem --strict` exits 0 for each.
  Touches: `scripts/audit-csp.mjs`, `test/csp-audit.test.mjs`, `scripts/audit-gate-selftest.mjs`.
  Acceptance: strict mode fails unless every `style-src` token is also in `style-src-elem`, with a test and a gate plant.
  Complexity: S

- [ ] P3: Fail on a corrupt README count input instead of reading it as missing
  Why: `readmeCountInputs` returns null on any error, so a truncated `_profile-projects.json` or `dist/projects.json` makes the README count test skip ("fixture files not installed") and the nightly skip its rendered-count check.
  Evidence: twenty-first review. Truncating `src/data/_profile-projects.json` to 200 bytes turns `test/project-count-source.test.mjs` into a skip; before a8ee7b75 the same input failed with a SyntaxError.
  Touches: `scripts/lib/readme-counts.mjs`, `test/project-count-source.test.mjs`.
  Acceptance: only a missing file reads as missing, and a file that doesn't parse fails the test and the nightly step, with a test for each.
  Complexity: S

- [ ] P3: Say so when a report-only flag is set outside the nightly runner
  Why: `README_COUNTS_REPORT_ONLY` and the other report-only flags turn a failing check into a skip. The nightly reports what it skipped after deploying, but a manual `deploy:preflight` then `deploy:vps` with the flag left in a shell ships the drift with nothing reporting it.
  Evidence: twenty-first review; with `--expected-releases` changed, the test fails without the flag and skips with it.
  Touches: `scripts/ensure-project-cwd.mjs` (or the preflight's first step), `scripts/refresh-and-deploy.mjs` (`REPORT_ONLY_FLAGS`), a test.
  Acceptance: any report-only flag set outside the runner prints a warning that names it, and the preflight fails unless the runner set it.
  Complexity: S

- [ ] P3: Count a force-killed planted audit as no verdict on Windows
  Why: `plantVerdict` counts any non-null exit as a rejection once the expected text is in the output. A Windows force-kill exits 4294967295, so an audit that printed its reason and then hung until something killed it still reads as rejected.
  Evidence: twenty-first review; a script that prints the og-cards reason and idles, killed with `Stop-Process -Force` after 2.5 s, gives `{status: 4294967295, timedOut: false}` and a null verdict.
  Touches: `scripts/lib/run-audit.mjs`, its test.
  Acceptance: a kill status (4294967295, or a signal) is no verdict, with a test.
  Complexity: S

- [ ] P3: Catch dash lookalikes, and read every name the site writes, in the title audit
  Why: 79c031f0's rule catches `\p{Pd}` and one spaced hyphen only, so `Home -- tools`, a spaced U+2212 minus, U+2796, a box horizontal and `&nbsp;-&nbsp;` in a feed title all pass (planted in a copied build, the audit passed). It never reads `manifest.json`'s `name`, the one the commit fixed, nor `og:site_name`, nor the feed item titles the site writes itself (catalog names, atom's `(live)` suffix, `releases.xml`'s `${project} ${tag}`). Each feed's own title is `Matt Parker | Projects` while its link says `Recent projects | Matt Parker`.
  Evidence: eighteenth drain review, 2026-09-24; `scripts/lib/title-style.mjs:25,32`, `scripts/audit-title-style.mjs:47-81`.
  Touches: `scripts/lib/title-style.mjs`, `scripts/audit-title-style.mjs`, `scripts/audit-gate-selftest.mjs`, the feed titles, their tests.
  Acceptance: any run of hyphen-like characters (dash punctuation, U+2212, U+2796, box horizontals) between spaces fails, the audit reads the manifest's `name` and `short_name`, `og:site_name` and the item titles the site writes, each with a gate plant, and a feed's own title matches its link's name.
  Complexity: S

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

## Research-Driven Additions

Added 2026-09-22 from the research recorded in RESEARCH.md. Items that need the owner's decision went to Roadmap_Blocked.md instead.

### P0

### P1

### P2

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

- [ ] P3: Match the CSP host audit to how browsers check a prefetch
  Why: `scripts/lib/csp-host-usage.mjs` counts a `rel=prefetch` against the directive its `as` names, but CSP Level 3 checks prefetches against `default-src`.
  Evidence: third drain review, from the spec; not yet tested in a browser.
  Touches: `scripts/lib/csp-host-usage.mjs`, `test/csp-host-usage.test.mjs`.
  Acceptance: A Chromium and a Firefox check show which directive governs a cross-origin prefetch, and the audit maps it the same way.
  Complexity: S
