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

- [ ] P1: Serve the avatar from this origin and cut the CSP to what the build uses
  Why: The hero avatar is the site's last third-party request. The policy still allows five unused image hosts plus the GitHub API and YouTube frames, and every page preconnects to GitHub for nothing.
  Evidence: `src/layouts/Base.astro:75` and `:175-177`; `src/pages/index.astro:11`, `:96`; on 2026-09-22 `dist/` referenced one third-party media host and had zero iframes, and no script called `api.github.com`.
  Touches: `src/pages/index.astro` (commit a local copy of the avatar, or fetch it during `fetch-stars`), `src/layouts/Base.astro`, `scripts/audit-csp.mjs`, `scripts/audit-gate-selftest.mjs`, `test/csp-audit.test.mjs`.
  Acceptance: The policy ends up as `img-src 'self' data:`, `connect-src 'self'` and no `frame-src`, with no third-party preconnect or dns-prefetch. `csp:audit:dist` fails when an allowed host is referenced by no built file, proven by a planted case in `gates:selftest`. A Playwright request log shows zero third-party requests on `/`.
  Complexity: M

- [ ] P1: Harden `/api/contact` against volume and replace the browser-clock timing check
  Why: The minimum-time check is skipped whenever `_t` is missing, and it trusts the visitor's clock: a device running a minute or two fast can still land in the "submitted too quickly" window. Nothing limits volume, so spam grows the lead store without bound, and the handler streams that store at every start inside a 64 MB container.
  Evidence: `validateSubmission` and `handleRequest` in `deploy/vps/contact-handler.mjs`; the 2026-09-23 review measured about 39 MB of extra peak memory restoring 1,000 maximum-size leads before the store was streamed; the inner Caddy now trusts the edge, so `X-Forwarded-For` reaches the handler as "client, edge"; MailForm's per-target `rateLimit`.
  Touches: `deploy/vps/contact-handler.mjs` (issue an HMAC-signed server timestamp token that `contact-form.js` fetches; take the client from the right-most untrusted `X-Forwarded-For` address), `public/scripts/contact-form.js`, `test/contact-handler.test.mjs`.
  Acceptance: Tests cover a missing, forged, replayed or expired token, a device clock ten minutes fast, a per-client limit and a global hourly cap. The 422 text is generic ("Please check the form and try again") and doesn't name the honeypot. A request with no token is accepted only on the plain-POST path, under a stricter limit.
  Complexity: M

- [ ] P1: Fix the three contact-form surface defects
  Why: Healthcare visitors submit a form with no script and land on raw JSON. No visitor without JavaScript gets a real page back, and every notification loses which page it came from.
  Evidence: `src/pages/healthcare-it.astro:211` renders the form, but `src/layouts/Base.astro:224` loads `contact-form.js` only where `hasContactForm` is set, and the built healthcare page has no script; `deploy/vps/contact-handler.mjs:93-96` always answers JSON; `src/components/ContactForm.astro:9` keeps `data-subject` out of the form data, and the handler ignores it (`:42-50`); MailForm and Formgate both redirect plain POSTs.
  Touches: `src/layouts/Base.astro`, `src/pages/healthcare-it.astro`, `src/components/ContactForm.astro`, `deploy/vps/contact-handler.mjs`, a small `/contact/sent/` page (through `npm run scaffold:route`), `tests/playwright/interaction-smoke.spec.mjs`.
  Acceptance: Every page that renders the form loads its script, derived from the component rather than a per-route flag. A plain POST gets a 303 to a thank-you page, or back to the form with a readable error. The subject travels as a hidden field and reaches the stored record. Playwright submits the form on `/`, `/ai/` and `/healthcare-it/` against a stub handler, with and without JavaScript.
  Complexity: S

- [ ] P1: Publish `staleAfter` in `/status.json` and fail `smoke:live` when live data is past its contract
  Why: On 2026-09-23 the live file told machines `"status":"fresh"` for data that was 37.8 hours old, because its freshness fields are frozen at build time.
  Evidence: live `/status.json` read 2026-09-23T00:45Z (`fetchedAt` 2026-09-21T10:55:31Z, `ageHours` 0.0348); `src/data/generated-trust.ts:70-73`, `:248-255`.
  Touches: `src/data/generated-trust.ts`, `src/pages/status.json.ts`, `scripts/smoke-live-site.mjs`, `test/generated-data-trust.test.mjs`.
  Acceptance: `generatedData.staleAfter` equals `fetchedAt` plus `maxAgeHours`, and the JSON states that `status` and `stale` were evaluated at `generatedAt`. `smoke:live` exits non-zero once the live `staleAfter` has passed. Tests cover both.
  Complexity: S

- [ ] P1: Relock to clear the devalue, satori, fflate and smol-toml advisories
  Why: The build tree ships eight devalue advisories (one of them high), a satori SVG-escaping advisory, an fflate infinite loop and a smol-toml DoS, and `npm audit` sees only some of them.
  Evidence: `npm ls` on 2026-09-22 (devalue 5.8.1, satori 0.33.4, fflate 0.7.3 and 0.7.4, smol-toml 1.8.0); the sveltejs/devalue advisories of 2026-09-18 (fixed in 5.9.3); GHSA-wx4j-mvgx-mqwp (fixed in 0.33.5); GHSA-px8p-9vwx-vf98 (fixed in 0.7.5, which satori's exact pin blocks); the smol-toml advisory of 2026-09-22 (fixed in 1.9.0); astro 7.3.4 accepts devalue `^5.8.1` and smol-toml `^1.8.0`.
  Touches: `package.json` (satori `^0.33.5`; overrides `fflate: ^0.7.5` and a `js-yaml` floor of `^4.3.2`), `package-lock.json`.
  Acceptance: After 2026-09-25, once the `.npmrc` three-day window has passed, `npm ls` shows devalue 5.9.3 or later, smol-toml 1.9.0 or later, fflate 0.7.5 or later, satori 0.33.5 or later and astro 7.3.4 or later. `npm audit --omit=dev` reports nothing, `deploy:preflight` passes, and the OG cards render unchanged.
  Complexity: S

- [ ] P1: Retire `publish:pages` before it overwrites the redirect stub
  Why: The documented command would replace the three-file redirect on `gh-pages` with a full duplicate of the site, undoing the move to the VPS.
  Evidence: `origin/gh-pages` holds `.nojekyll`, `404.html` and `index.html` (`8003c640`, 2026-07-28); `scripts/publish-pages.mjs` has no guard; `README.md:88` and `:207` still document it.
  Touches: `package.json`, `scripts/publish-pages.mjs`, `README.md`, any test that references the script.
  Acceptance: `npm run publish:pages` is gone, or exits 1 naming the redirect stub. The README's Deploy section lists only `deploy:vps` and `refresh:deploy`, and the tests pass.
  Complexity: S

- [ ] P1: Add a `/privacy/` page that says what the site actually stores
  Why: The form collects names and emails and the site has no privacy statement. California requires commercial sites that collect personal information from its residents to post a conspicuous policy.
  Evidence: `/privacy/` returned 404 on 2026-09-22 and no source file mentions a policy; Cal. Bus. & Prof. Code 22575; FTC guidance to keep personal data only as long as it's needed.
  Touches: `src/pages/privacy.astro` (through `npm run scaffold:route`), `src/components/ContactForm.astro` (a one-line notice with a link), `src/components/Footer.astro`, `public/humans.txt:12` and `src/pages/llms.txt.ts:64` (say "no client-side analytics").
  Acceptance: The page covers what the form stores and for how long, the edge access log and its anonymised GoAccess report, the redacted CSP reports, and the absence of cookies and client analytics. It carries an effective date and a deletion contact. Every retention period it states is enforced by a purge job. Owner step: confirm the lead retention period.
  Complexity: S

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
