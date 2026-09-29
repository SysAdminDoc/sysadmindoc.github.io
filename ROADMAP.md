# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

### P0

### P1

### P2

- [ ] P2: Fold the stacked stylesheet layers into one design system
  Why: v0.46.0's Studio block sits on top of seven earlier redesigns (foundation through additions, then unlayered), so a rule often has three or four older copies below it. The override audit only catches repeats of one selector inside one file, and changing a component still means chasing specificity across files. The scroll-reveal transform and the old `section::before` sweep both bit during the redesign.
  Evidence: v0.46.0 redesign, 2026-09-29; `src/styles/global.css` imports eight layers plus `layers/unlayered.css`.
  Touches: `src/styles/**`, `scripts/audit-css.mjs`, `test/css-layer.test.mjs`, the visual baselines.
  Acceptance: one token file and one component sheet per surface, no rule overridden across files, and the visual gate unchanged.
  Complexity: L

### P3

- [ ] P3: Read repeated and mixed-case CSP directives the way browsers do
  Why: `parseCsp` keeps the last copy of a repeated directive, but browsers use the first, so `style-src 'self' 'unsafe-inline'; style-src 'self'` passes. `directiveAllowsUnsafeInline` compares case-sensitively while `cspTokenKey` doesn't, so `'UNSAFE-INLINE'` in `style-src-elem` hides. A policy with neither `style-src` nor `default-src` passes when a page has no inline block. The subset check fails `'SHA256-'` against `'sha256-'`, base64url hashes, hosts with a trailing slash, and `'report-sample'` or `'unsafe-eval'`.
  Evidence: twenty-fifth drain review, 2026-09-24; `scripts/audit-csp.mjs:226` and `:250`.
  Touches: `scripts/audit-csp.mjs`, its tests.
  Acceptance: each case comes out as a browser reads it, with a planted test apiece.
  Complexity: S

- [ ] P3: Fail the README count check on a corrupt profile feed even when releases is missing
  Why: `readmeCountInputs` returns null, which the test reads as "not installed" and skips, when `_releases.json` is missing, even if `_profile-projects.json` is present and doesn't parse.
  Evidence: twenty-fifth drain review, 2026-09-24; `scripts/lib/readme-counts.mjs:65`.
  Touches: `scripts/lib/readme-counts.mjs`, `test/project-count-source.test.mjs`.
  Acceptance: a corrupt file fails whatever else is missing, and only a clean absence skips.
  Complexity: S

- [ ] P3: Count a crashed planted audit as no verdict on Windows
  Why: `noVerdict` treats a timeout and a kill as no verdict, but not exit code 134 or a Windows status at or above 0xC0000000 (access violation, stack overflow), so a planted audit that crashes counts as rejected.
  Evidence: twenty-fifth drain review, 2026-09-24; `scripts/lib/run-audit.mjs:46`.
  Touches: `scripts/lib/run-audit.mjs`, its test.
  Acceptance: both come back as no verdict, with a test apiece.
  Complexity: S

- [ ] P3: Purge a torn or undatable lead line even when nothing else expires
  Why: when no dated lead has expired, the purge leaves a torn or undatable line in place and `/healthz` still reports `retentionEnforced: true`.
  Evidence: twenty-sixth drain review, 2026-09-24; `deploy/vps/contact-handler.mjs:626` and `:957`.
  Touches: `deploy/vps/contact-handler.mjs`, `test/contact-handler.test.mjs`.
  Acceptance: the line goes (or health reports false) on a purge with nothing else to drop, with a test.
  Complexity: S

- [ ] P3: Never requeue expired leads after a failed start-up purge
  Why: `restorePending` sends leads past their retention to ntfy when the start-up purge failed, so a message that should be gone gets delivered.
  Evidence: twenty-sixth drain review, 2026-09-24; `deploy/vps/contact-handler.mjs:722`.
  Touches: `deploy/vps/contact-handler.mjs`, `test/contact-handler.test.mjs`.
  Acceptance: an expired lead is never queued whether or not the purge worked, with a test.
  Complexity: S

- [ ] P3: Answer 400 to a request path `new URL` can't parse
  Why: a request for `//%%%/x` throws inside `new URL`, which both servers turn into a 500 and an error log line.
  Evidence: twenty-sixth drain review, 2026-09-24; `deploy/vps/contact-handler.mjs:758`, `deploy/vps/csp-report-server.mjs:400`.
  Touches: both servers and their tests.
  Acceptance: both answer 400 without logging an error, with a test apiece.
  Complexity: S

- [ ] P3: Rerun the twenty-fourth review
  Why: it covered titles, `staleAfter`, the report sink's byte splitter and the Caddy core, and it was stopped before it finished on 2026-09-24.
  Evidence: drain notes for 2026-09-24.
  Touches: whatever it finds.
  Acceptance: the review runs to the end without another running beside it, and its findings are filed here.
  Complexity: M

- [ ] P3: Keep the catalog filters to one row each on phones
  Why: at 390px the Show and Category filters wrap to six rows of chips, about 3 1/2 inches of scrolling before the first project.
  Evidence: v0.46.0 phone captures of `/catalog/`, 2026-09-29.
  Touches: `src/components/CatalogSection.astro`, `src/styles/layers/unlayered.css`.
  Acceptance: each filter group is one horizontally scrollable row (or a menu) under 640px, every chip stays reachable by keyboard, and the phone gutter check passes.
  Complexity: S

- [ ] P3: Say so when a report-only flag is set outside the nightly runner
  Why: `README_COUNTS_REPORT_ONLY` and the other report-only flags turn a failing check into a skip. The nightly reports what it skipped after deploying, but a manual `deploy:preflight` then `deploy:vps` with the flag left in a shell ships the drift with nothing reporting it.
  Evidence: twenty-first review; with `--expected-releases` changed, the test fails without the flag and skips with it.
  Touches: `scripts/ensure-project-cwd.mjs` (or the preflight's first step), `scripts/refresh-and-deploy.mjs` (`REPORT_ONLY_FLAGS`), a test.
  Acceptance: any report-only flag set outside the runner prints a warning that names it, and the preflight fails unless the runner set it.
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

- [ ] P3: Publish GitHub releases for v0.43.0 through v0.45.x
  Why: Releases stop at v0.42.0 while tags reach v0.45.2, and the README still runs `smoke:release` against a v0.43.0 asset that doesn't exist.
  Evidence: `gh release list` on 2026-09-22; `README.md:94`.
  Touches: the release steps in `README.md`, `scripts/smoke-release-artifact.mjs`.
  Acceptance: Each minor version from v0.43.0 has a release with the static-site ZIP and its SHA-256, and `smoke:release` passes against the newest one.
  Complexity: S
