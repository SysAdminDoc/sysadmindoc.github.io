# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

### P0

### P1

### P2

- [ ] P2: Keep a new upstream repo from failing the nightly deploy on a README count
  Why: `test/project-count-source.test.mjs` holds the README's "catalog (N feed-backed / ...)" to the profile feed the nightly has just synced, so the day a new public repo reaches the feed, `deploy:preflight` fails in `npm test` and nothing deploys (2026-09-24 23:01Z: 206 in the feed, 205 in the README). The number is documentation; it shouldn't stop a deploy of everything else.
  Evidence: `.tmp/refresh-and-deploy.log` 2026-09-24T23:01:14Z; `test/project-count-source.test.mjs:30-46`.
  Touches: `test/project-count-source.test.mjs`, `scripts/refresh-and-deploy.mjs` or the README sentence.
  Acceptance: a feed that gains or loses a project doesn't fail the nightly's tests, the README count is still checked against something stable (the committed fixtures) or reported as drift the way catalog drift is, and a test shows both.
  Complexity: S

- [ ] P2: Recognise every engine's sample of the site's own inline blocks
  Why: Firefox appends "…" to a 40-character sample, so both of the site's real blocks (41 characters with it) are stored as markers; Chromium trims whitespace at both ends, so a block that starts with whitespace, or a short one ending in a space, never matches. WebKit matches.
  Evidence: nineteenth drain review, 2026-09-24 (headless Chromium, Firefox and WebKit probes); `deploy/vps/csp-report-server.mjs:187`, `scripts/lib/csp-own-samples.mjs:43`.
  Touches: `deploy/vps/csp-report-server.mjs`, `scripts/lib/csp-own-samples.mjs`, their tests.
  Acceptance: each engine's real sample of every built inline block is kept as the site's own: a trailing "…" is dropped and whitespace is trimmed at both ends before comparing, with a test per engine's shape.
  Complexity: S

- [ ] P2: Count a planted audit as rejected only when it says why
  Why: On Windows an audit killed from outside exits 1 (taskkill, `process.kill`) or 4294967295 (Stop-Process), never a null status, so `noVerdict` misses it and the self-test still prints "rejects ..." for the eleven cases without an `expect`; the test used a hand-made `{ status: null }`. `build:ci` also runs `og-cards:audit` directly with no time limit.
  Evidence: nineteenth drain review, 2026-09-24; `scripts/lib/run-audit.mjs:25,34`, `scripts/audit-gate-selftest.mjs:515`.
  Touches: `scripts/audit-gate-selftest.mjs`, `scripts/lib/run-audit.mjs`, `test/toolchain.test.mjs`.
  Acceptance: every case carries an `expect` its audit's rejection must match, a planted run counts as rejected only when it does, a real external kill on win32 is tested, and the direct `og-cards:audit` step in `build:ci` can't hang the build.
  Complexity: S

### P3

- [ ] P3: Read SVG hrefs, scheme-only URLs and SVG scripts as browsers do in the CSP host audit
  Why: parse5 names `xlink:href` and `href` both `href`, and the first kept wins, so `<image xlink:href="A" href="B">` counts A while browsers load B (`feImage` too). `http:noslash.example/a.png` and `http:/oneslash...` load in Chromium but the `//` check misses them. `<svg><script href>` loads in both engines and is missed. Comments are stripped before CSS escapes are read, so `\/*` hides a real url(). Older misses: `<table background>` and a static `import` in a module script.
  Evidence: nineteenth drain review, 2026-09-24; `scripts/lib/csp-host-usage.mjs:79,159,173,194,222`.
  Touches: `scripts/lib/csp-host-usage.mjs`, `test/csp-host-usage.test.mjs`.
  Acceptance: `href` wins over `xlink:href`, every value is resolved with `new URL(value, pageUrl)` and any origin but the site's counts, SVG script href counts, escapes are read before comments, and the two older misses are found, each with a test.
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

- [ ] P3: Match the CSP host audit to how browsers check a prefetch
  Why: `scripts/lib/csp-host-usage.mjs` counts a `rel=prefetch` against the directive its `as` names, but CSP Level 3 checks prefetches against `default-src`.
  Evidence: third drain review, from the spec; not yet tested in a browser.
  Touches: `scripts/lib/csp-host-usage.mjs`, `test/csp-host-usage.test.mjs`.
  Acceptance: A Chromium and a Firefox check show which directive governs a cross-origin prefetch, and the audit maps it the same way.
  Complexity: S
