# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

### P0

- [ ] P0: Recapture the 22 live-app screenshots so the nightly deploys again, and warn before the 90-day line
  Why: `Portfolio Refresh and Deploy` aborted at `deploy:preflight` every night from 2026-10-02 to 2026-10-09, so the last deploy is 2026-10-01 and the live site has missed every star, release and profile-feed change since. The cause is a time bomb, not a regression. 22 manifest captures taken around 2026-07-08 crossed `STALE_DAYS = 90` together, and the audit has no earlier warning.
  Evidence: `.tmp/refresh-and-deploy.log` (eight `ABORT ... at step "deploy:preflight"` lines, last `OK deploy:vps` on 2026-10-01). `.tmp/refresh-and-deploy-step-deploy-preflight.log` ("Live app availability audit failed: 44 issue(s)": 22 "manifest capture is 91-93d old" plus 22 stale screenshots, among them IconForge, SPECTRE, ImageXpert, ConvertFlow, ClipForge, Text-Filter-Editor, HurricaneMap, ApocalypseWatch and BetterTTS). `scripts/audit-live-apps.mjs:15` and `:161-171`. Found during the SysAdminDoc profile research pass.
  Touches: `scripts/capture-screenshots.mjs` (recapture), the capture manifest it writes, `scripts/audit-live-apps.mjs` (a warning band, for example from 75 days, that the nightly's summary surfaces before the hard fail), its tests, `CLAUDE.md`.
  Acceptance: `deploy:preflight` passes the live-app audit, the next 03:00 run logs `OK deploy:vps`, and a test proves a capture 76 days old warns without failing while one 91 days old still fails. The capture job is heavy browser work, so it runs through the build queue after hours.
  Complexity: S

### P1

### P2

- [ ] P2: Time the gate and the nightly, then parse dist/ once across the build audits
  Why: the build-pipeline rule asks for numbers before and after, and none exist for this repo. `build:ci` runs about twenty audits that each read and parse the built HTML on their own (`dom:audit`, `schema:audit`, `a11y:audit`, `links:audit`, `title-style:audit`, `search:audit`, `csp:audit:dist:style:elem` and more), so the same pages are parsed many times per build.
  Evidence: the `build:ci` chain in `package.json`; the queue and single-build change of 2026-10-09 has no timing yet.
  Touches: the build audits under `scripts/`, a shared parsed-page cache under `scripts/lib/`, `CLAUDE.md` (timings).
  Acceptance: `deploy:preflight` and each `build:ci` step are timed once before the change and once after, the numbers go in `CLAUDE.md`, and each built page is parsed once per build with every audit's verdict unchanged. Needs a build run, so it waits for one to be asked for.
  Complexity: M

- [ ] P2: Fold the stacked stylesheet layers into one design system
  Why: v0.46.0's Studio block sits on top of seven earlier redesigns (foundation through additions, then unlayered), so a rule often has three or four older copies below it. The override audit only catches repeats of one selector inside one file, and changing a component still means chasing specificity across files. The scroll-reveal transform and the old `section::before` sweep both bit during the redesign.
  Evidence: v0.46.0 redesign, 2026-09-29; `src/styles/global.css` imports eight layers plus `layers/unlayered.css`.
  Touches: `src/styles/**`, `scripts/audit-css.mjs`, `test/css-layer.test.mjs`, the visual baselines.
  Acceptance: one token file and one component sheet per surface, no rule overridden across files, and the visual gate unchanged.
  Complexity: L

### P3

- [ ] P3: Keep page titles within what search results show, and make the title audit check more than dashes
  Why: the default `<title>` (and `og:title`) is the 92-character headline from `src/data/career.ts`, past the roughly 60 characters a result shows. `scripts/audit-title-style.mjs` checks only for dashes, so a long, duplicated or h1-disagreeing title passes the gate (`audit-a11y.mjs` catches an empty one). `src/pages/lang/[slug].astro:61` says "1 projects" for a lane with one repo, in the title and the description. `public/offline.html` calls the site "SysAdminDoc Portfolio", which no other page does.
  Evidence: twenty-fourth review rerun, 2026-10-09; `src/layouts/Base.astro:40`.
  Touches: `src/layouts/Base.astro`, `src/pages/lang/[slug].astro`, `public/offline.html`, `scripts/audit-title-style.mjs`, `test/title-style.test.mjs` (or wherever its test lives).
  Acceptance: every built title is 70 characters or fewer, no title says "1 projects", the offline page names the site the way the others do, and the audit fails a planted long title and a planted title that disagrees with its og:title.
  Complexity: S

- [ ] P3: Read a generated timestamp with no zone as UTC
  Why: `staleAfterIso` (`src/data/generated-trust.ts:155`) parses with `new Date(string)`, so a timestamp without a `Z` or offset is read in the build host's zone. Every writer uses `toISOString()`, so only a hand-edited file gets there, but the status page would then be wrong by the host's offset.
  Evidence: twenty-fourth review rerun, 2026-10-09.
  Touches: `src/data/generated-trust.ts`, `test/status-freshness.test.mjs`.
  Acceptance: a zone-less timestamp parses as UTC, or counts as already past, and a test says which.
  Complexity: S

- [ ] P3: Give the CSP report store back its final newline after a crash mid-append
  Why: `restoreFile` in `deploy/vps/csp-report-server.mjs` returns early when it changed no row, so a store whose last line was cut without a newline keeps it that way, and the next `appendFile` glues two reports into one line that `parseStore` counts as two unreadable ones. The contact handler got the same fix for its lead store on 2026-10-09.
  Evidence: twenty-fourth review rerun, 2026-10-09.
  Touches: `deploy/vps/csp-report-server.mjs`, `test/csp-report-server.test.mjs`.
  Acceptance: a store ending mid-line gets its newline before the next append, the dropped-line count reaches the nightly summary rather than only the startup log, and a test plants both.
  Complexity: S

- [ ] P3: Read Caddyfile heredocs the way Caddy does
  Why: the parser in `scripts/lib/caddyfile.mjs` closes a heredoc on `EOF trailing text` (Caddy refuses it), doesn't strip the closing marker's indentation from the body, and only sees a heredoc at a token's start. The trust check reads the file through this parser, so a heredoc Caddy reads differently could carry a header line past it.
  Evidence: twenty-fourth review rerun, 2026-10-09; `scripts/lib/caddyfile.mjs` around line 95.
  Touches: `scripts/lib/caddyfile.mjs`, `test/caddyfile.test.mjs` (or the contract test).
  Acceptance: a heredoc closes only on its marker alone on a line, the body loses the marker's indentation, and a planted heredoc hiding a `header_up X-Forwarded-For` line fails the trust check.
  Complexity: S

- [ ] P3: Keep the catalog filters to one row each on phones
  Why: at 390px the Show and Category filters wrap to six rows of chips, about 3 1/2 inches of scrolling before the first project.
  Evidence: v0.46.0 phone captures of `/catalog/`, 2026-09-29.
  Touches: `src/components/CatalogSection.astro`, `src/styles/layers/unlayered.css`.
  Acceptance: each filter group is one horizontally scrollable row (or a menu) under 640px, every chip stays reachable by keyboard, and the phone gutter check passes.
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

- [ ] P3: Publish GitHub releases for v0.43.0 through v0.45.x
  Why: v0.46.0 and v0.47.0 have releases, but between them and v0.42.0 the tags v0.43.0 to v0.45.2 have none.
  Evidence: `gh release list` on 2026-09-29.
  Touches: a build from each tag, `scripts/smoke-release-artifact.mjs`.
  Acceptance: Each minor version from v0.43.0 to v0.45.x has a release with the static-site ZIP built from its tag and its SHA-256, and `smoke:release` passes against each.
  Complexity: S
