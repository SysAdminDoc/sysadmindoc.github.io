# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

### P0

### P1

### P2

### P3

- [ ] P3: Read CSS strings and module imports the way the tokenizers do in the host audit
  Why: `stripCssComments` skips `\` plus one character, so an escaped CRLF inside a string ends the string at the LF and a `/*` after it hides a real url(), and a lone CR or form feed doesn't end a string there though it does in CSS. Its unquoted-url() test looks at 64 characters, so `url(` then 61 spaces then a quoted URL holding `)` is misread. `CSS_URL` ignores strings, so `content:"url("` swallows the url() after it. The static-import regex backtracks in cubic time on long whitespace (19 s for 5,000 spaces after `export`), misses a comment between `import` and `from` or a non-ASCII name, and counts `export ... from "..."` inside a string or a comment. `rel="preload prefetch" as=image` credits `img-src`, which Firefox doesn't honour for the prefetch.
  Evidence: twenty-third review, with Chromium 153 and Firefox 155 loading each hidden url(); `scripts/lib/css-output-check.mjs:49,56`, `scripts/lib/csp-host-usage.mjs:235,257,274`.
  Touches: `scripts/lib/css-output-check.mjs`, `scripts/lib/csp-host-usage.mjs`, their tests.
  Acceptance: CSS is preprocessed (CRLF, CR and form feed to LF) before comments are cut, url() is found at any distance and never inside a string, the import pattern runs in linear time with comments skipped, and each case has a test.
  Complexity: S

- [ ] P3: Keep lead retention running when one of its purges fails
  Why: `purgeExpired` runs the legacy purge only after the lead purge succeeds, so a lead purge that keeps failing also stops old records in `submissions.ndjson` from being deleted, and `/healthz` still reports the retention as in force.
  Evidence: twenty-third review; a directory at `leads.ndjson.purge` left a 2020 legacy record in place.
  Touches: `deploy/vps/contact-handler.mjs`, `test/contact-handler.test.mjs`.
  Acceptance: both purges run whatever the other does, a failure is logged, and `/healthz` says retention isn't being enforced after one, with a test.
  Complexity: S

- [ ] P3: Log every contact handler server error after it starts listening
  Why: `startServer` attaches `server.once('error', reject)` for the listen and never removes it, so the first later server error is swallowed and a second is an unhandled `'error'` event that ends the process.
  Evidence: twenty-third review, from the code (`deploy/vps/contact-handler.mjs:973`).
  Touches: `deploy/vps/contact-handler.mjs`, its test.
  Acceptance: the listen handler is removed once listening, a permanent handler logs later errors, and two emitted errors leave the server up, with a test.
  Complexity: S

- [ ] P3: Say so when a report-only flag is set outside the nightly runner
  Why: `README_COUNTS_REPORT_ONLY` and the other report-only flags turn a failing check into a skip. The nightly reports what it skipped after deploying, but a manual `deploy:preflight` then `deploy:vps` with the flag left in a shell ships the drift with nothing reporting it.
  Evidence: twenty-first review; with `--expected-releases` changed, the test fails without the flag and skips with it.
  Touches: `scripts/ensure-project-cwd.mjs` (or the preflight's first step), `scripts/refresh-and-deploy.mjs` (`REPORT_ONLY_FLAGS`), a test.
  Acceptance: any report-only flag set outside the runner prints a warning that names it, and the preflight fails unless the runner set it.
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
