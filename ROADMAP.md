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

- [ ] P2: Give secondary routes a sitewide link and fail the build on orphaned pages
  Why: Six of the 22 sitemap routes, including the AI disclosure, have no inbound link from any other page.
  Evidence: link count over `dist/` on 2026-09-22 (`/colophon/`, `/data/`, `/uses/`, `/lang/cs/`, `/lang/kotlin/`, `/lang/security/`); `src/components/Footer.astro` renders only per-route links; `a344b6f1` removed the last nav links to two of them.
  Touches: `src/components/Footer.astro`, `src/pages/ai.astro` (link the colophon's disclosure), `scripts/audit-built-links.mjs`, `scripts/audit-gate-selftest.mjs`.
  Acceptance: Every sitemap route has at least one inbound link from another built page. `links:audit` fails on an orphan, proven by a planted case in `gates:selftest`.
  Complexity: S

- [ ] P2: Redirect retired `/projects/<Repo>/` URLs and answer `/favicon.ico`
  Why: Old project URLs are the site's largest 404 class, with 92 hits since 2026-09-17 (36 from browser-like agents), and `/favicon.ico` returns 404 as well.
  Evidence: edge access-log aggregate 2026-09-23 (92 `/projects/` and 9 `/favicon.ico` 404s since 2026-09-17T15:44Z); the removed route used the repo name as its slug (`864d3451`).
  Touches: `deploy/vps/Caddyfile` (or a redirect map generated at build and shipped by `scripts/deploy-vps.mjs`), `public/favicon.ico`, `scripts/smoke-live-site.mjs`.
  Acceptance: A known repo slug answers 301 to its GitHub URL, an unknown one answers 302 to `/catalog/?q=<slug>`, and `/favicon.ico` answers 200. `smoke:live` checks one of each.
  Complexity: S

- [ ] P2: Minify the inlined critical CSS and load `cmdk-data.js` on demand, both under a budget
  Why: 42,121 bytes of unminified CSS make up 54% of the homepage HTML, and a 62,803-byte script blocks every page for a palette that loads lazily anyway. Neither counts against the bundle caps.
  Evidence: `dist/index.html` is 77,459 bytes; `src/layouts/Base.astro:159` and `:212`; `scripts/audit-bundle-size.mjs:104-111` scans only `scripts/` and `_assets/`.
  Touches: `src/layouts/Base.astro`, `public/scripts/cmdk-loader.js`, `scripts/audit-bundle-size.mjs`, `test/runtime-scripts.test.mjs`, `test/csp-audit.test.mjs`.
  Acceptance: The inlined critical CSS is minified with lightningcss before its CSP hash is computed, and `csp:audit:dist` still passes. `cmdk-data.js` is requested only when the palette first opens. The bundle audit counts both files, and the homepage HTML shrinks by at least 10 KB.
  Complexity: M

- [ ] P2: Re-baseline the visual snapshots for the v0.45 design and gate the key routes
  Why: The baselines predate the v0.45 redesign, preflight never compares screenshots, and nothing runs the Linux set.
  Evidence: baselines were last updated 2026-07-25 (Linux) and 2026-09-05 (win32), and 30 files under `src/pages`, `src/styles` and `src/components` have changed since; `/colophon/` has no baseline; `package.json:41` and `:69`.
  Touches: `tests/playwright/__screenshots__/`, `tests/playwright/portfolio-audits.spec.mjs`, `package.json`.
  Acceptance: win32 baselines are regenerated from fixtures for every route, including `/colophon/`, and the Linux baselines are deleted. A fixture-built visual comparison of `/`, `/ai/`, `/healthcare-it/`, `/resume/` and `/catalog/` runs in `deploy:preflight`.
  Complexity: M

- [ ] P2: Move the featured-release provenance check into the deploy gate
  Why: Its blocker is gone. On 2026-09-22 no featured downloadable release was missing a checksum.
  Evidence: `node scripts/summarize-generated-data.mjs --fail-on-unsigned-featured-releases` reported "Failing featured downloadable releases: 0"; the item had been parked in Roadmap_Blocked.md because of unsigned ClearCut releases.
  Touches: `package.json` (`data:summary:deploy`), `scripts/refresh-and-deploy.mjs`, `test/generated-data-trust.test.mjs`.
  Acceptance: `data:summary:deploy` passes `--fail-on-unsigned-featured-releases`. A planted unsigned featured release fails a manual preflight but only reports during `refresh:deploy`, the way catalog drift does, so another repo's release can't freeze the nightly.
  Complexity: S

- [ ] P2: Pin the GoAccess image and run it without a network
  Why: The daily cron pulls `allinurl/goaccess:latest` and pipes the raw access log, visitor IPs included, into it with networking on.
  Evidence: `deploy/vps/analytics-report.sh:23`, `:39`; the VPS cron entry `15 4 * * *`; v0.43.0's Caddy pin fixed the same floating-tag problem.
  Touches: `deploy/vps/analytics-report.sh`.
  Acceptance: The image is pinned by digest and runs with `--network none` and `--read-only`. The next morning's `analytics/cron.log` shows a successful run.
  Complexity: S

- [ ] P2: Make the CSP report stream readable, and check it every night
  Why: The sink recorded the avatar bug three weeks before anyone noticed, and 260 of its 303 reports can't be classified.
  Evidence: sink aggregates on 2026-09-23 (303 reports since 2026-08-20, 260 of them recorded as `(invalid-url)`); the policy in `src/layouts/Base.astro:75` has no `'report-sample'`.
  Touches: `src/layouts/Base.astro`, `deploy/vps/csp-report-server.mjs`, a new read-only `scripts/csp-report-summary.mjs`, `scripts/refresh-and-deploy.mjs`.
  Acceptance: `script-src` and `style-src` carry `'report-sample'`. The sink stores the 40-character sample and tags each report as synthetic, extension or first-party. The nightly prints the counts, and exits non-zero when a first-party document reports a blocked host or directive it hasn't reported before.
  Complexity: M

- [ ] P2: Correct the stale public facts
  Why: Several public texts contradict the current deployment or each other.
  Evidence: `public/humans.txt:11` ("Hosting: GitHub Pages"); `README.md:44` and the version-pinned examples at `:93-94`; `dist/llms.txt:3` ("…running. with 15+ years…", from `src/pages/llms.txt.ts:64`); `src/data/curated.ts:85` ("a colophon page in progress" and a hard-coded test count); the `/now/` sitemap date (2026-06-04, `src/data/page-freshness.ts`) against its structured-data date; `astro.config.mjs:11-16`, which describes removed incremental builds; the profile feed's own entry for this repo, which still says GitHub Pages; the v0.45.1 CHANGELOG, which counts three failed gates and lists four.
  Touches: the files above, and this repo's entry in the SysAdminDoc/SysAdminDoc catalog.
  Acceptance: `dist/` mentions GitHub Pages only as history, and `llms.txt` line 3 reads as one sentence. A test asserts that every reviewed route's sitemap `lastmod` equals its structured-data `dateModified`. `/now/` computes the test count or drops it.
  Complexity: S

### P3

- [ ] P3: One title and feed-name style, enforced by a test
  Why: Two routes use em dashes in `<title>`, the homepage uses a spaced hyphen, and six feed titles use em dashes, which breaks the site's own writing rule.
  Evidence: `src/pages/colophon.astro:11`, `src/pages/data.astro:73`, the homepage title, `src/layouts/Base.astro:169-174`, and the `&mdash;` in the ImgConverter description (`src/data/projects.ts:111`).
  Touches: those files, and a new assertion in `test/`.
  Acceptance: No built `<title>` or feed title contains an em dash, an en dash or a spaced hyphen, and a test enforces it.
  Complexity: S

- [ ] P3: Warn 60 days before `security.txt` expires
  Why: The endpoint audit fails only once `Expires` has passed, so the nightly will go red on a date nobody chose. That's the same timer failure that stopped deploys in September.
  Evidence: `public/.well-known/security.txt` expires 2027-06-16; `scripts/audit-public-endpoints.mjs:649-660`.
  Touches: `scripts/audit-public-endpoints.mjs` and its test.
  Acceptance: Within 60 days of expiry the audit prints a warning and the nightly status carries it. After expiry it fails, as it does today.
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
