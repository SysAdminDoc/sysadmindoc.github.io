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

- [ ] P0: Store every contact submission in full before replying, and keep visitor text out of HTTP headers
  Why: The only external inquiry so far (2026-09-18, 842 characters) was told "Message received" and its text now exists nowhere. A name typed as "O’Brien" on an iPhone makes the handler answer 500 and drop the lead with no log line at all.
  Evidence: VPS probe 2026-09-23T00:45Z (ntfy has no `cache-file`, `/v1/stats` showed 0 messages after a restart); `deploy/vps/contact-handler.mjs:80-91` logs `messageLen`, not the message; `:66-74` puts the name in a `Title` header, and Node 24 throws "Cannot convert argument to a ByteString" for U+2019, CJK and emoji (verified 2026-09-22); `:121-127` answers 500 without logging when ntfy fails; ntfy docs (4 KB message limit, 12-hour in-memory cache by default).
  Touches: `deploy/vps/contact-handler.mjs`, `deploy/vps/docker-compose.yml`, new `test/contact-handler.test.mjs`.
  Acceptance: Each accepted submission is written (id, received time, name, email, message, subject, page, status) to durable storage with an fsync (`appendFile` with `flush: true`, or `node:sqlite` in WAL mode with `synchronous=FULL`) before any notification is attempted. Notification runs from that record, publishes JSON to ntfy's root URL, and stays under ntfy's 4 KB message limit (an excerpt plus the record id). A failure leaves the record `pending` for retry instead of returning 500. Tests prove "O’Brien", "李雷", an emoji name and a 2,000-character CJK message each produce a stored record and a 2xx. No message body appears in container stdout.
  Complexity: M

- [ ] P0: Deliver leads to a subscribed device through an authenticated, current ntfy, and prove delivery in `smoke:live`
  Why: ntfy has no route, no auth and no subscriber, so no person is ever told a lead arrived. Version 2.11.0 is also inside a critical RCE range.
  Evidence: VPS probe 2026-09-23 (no published port, no edge route, no `server.yml`); GHSA-pqhx-w72w-m393 (critical, fixed in 2.22.0); ntfy v2.28.0 shipped 2026-08-27, with declarative users and tokens since 2.14.0; wildcard DNS already sends any `*.getparkerai.com` name to the VPS (checked 2026-09-22), so a new host needs only an edge Caddy block.
  Touches: `deploy/vps/docker-compose.yml` (image pin, a `server.yml` with `auth-default-access: deny-all`, `cache-file` and declared users and tokens, and a private network shared only with the handler), `deploy/vps/caddy-block.txt` and its Contabo-VPS-Ops mirror (a notification host), `deploy/vps/contact-handler.mjs` (token), `scripts/deploy-vps.mjs` (assert the running ntfy version the way it asserts the Caddy pin), `scripts/smoke-live-site.mjs`.
  Acceptance: ntfy 2.28.0 or later answers 401 or 403 to anonymous publish and subscribe on its public host. The handler holds a write-only token and the phone a read-only one. `smoke:live` sends a synthetic lead marked by a secret header, reads it back through the read-only token within 60 seconds, and fails otherwise. Titles stay under ntfy 2.28's 1 KB limit. Owner step: subscribe the Android app, then record the date in the repo's working notes.
  Complexity: M

- [ ] P0: Recreate the nightly refresh from a committed definition and make a killed run visible
  Why: The last run was cut off on 2026-09-21 and nothing has run since, so the live data passed its 36-hour contract without an alert.
  Evidence: `.tmp/refresh-and-deploy-step-deploy-vps.log` ends at the first ssh call (2026-09-21T10:57:45Z) with no `DONE` or `ABORT`; the status file still reads `deployed` at 2026-09-20T21:14:48Z; no "Portfolio Refresh and Deploy" task was visible on 2026-09-22; `scripts/refresh-and-deploy.mjs:150-166` writes status only on terminal paths, and `:86-144` gives no step a timeout; the README never mentions the task.
  Touches: new `scripts/register-nightly-task.ps1`, `scripts/refresh-and-deploy.mjs`, `README.md` (Deploy section), `test/refresh-and-deploy.test.mjs`.
  Acceptance: Running the register script twice leaves exactly one task. The task starts hidden, uses a version-independent pwsh or node path, starts when available, and has no battery conditions. The script's `-Check` mode exits non-zero when the task is missing or disabled. `refresh-and-deploy.mjs` writes `running` with its pid and start time before the first step, and kills any step that exceeds its timeout, recording `aborted` with the step name. A test kills a fake step and asserts the status record.
  Complexity: M

### P1

- [ ] P1: Stop the service worker from intercepting cross-origin requests, and run the browser suites with production headers
  Why: Returning visitors get a broken homepage photo. The worker answers the avatar with a synthetic 503 after its own fetch is refused by `connect-src`. Local tests can't see this, because the preview sends no CSP header and a worker's CSP comes only from its own script's response headers.
  Evidence: headless run 2026-09-23 (200 on the first visit, then 503 `fromServiceWorker` and `naturalWidth` 0 on reload); 19 CSP reports from `/sw.js` since 2026-09-01; `public/sw.js:162-184`; `/sw.js` is served with `connect-src 'self' https://api.github.com`; `test/offline-fallback.test.mjs:507-642` covers only the `api.github.com` branch.
  Touches: `public/sw.js`, `test/offline-fallback.test.mjs`, `tests/playwright/preview-server.mjs` (send the built CSP as a response header the way `scripts/deploy-vps.mjs` stamps it), `tests/playwright/sw-lifecycle.spec.mjs`.
  Acceptance: The fetch handler returns without calling `respondWith` for every cross-origin request, and the dead `api.github.com`/`opengraph` branch is gone. A Playwright spec loads `/` twice under the worker with production headers and asserts every image has `naturalWidth > 0` and nothing returns 503. After the next deploy, no new `/sw.js` CSP reports arrive.
  Complexity: S

- [ ] P1: Serve the avatar from this origin and cut the CSP to what the build uses
  Why: The hero avatar is the site's last third-party request. The policy still allows five unused image hosts plus the GitHub API and YouTube frames, and every page preconnects to GitHub for nothing.
  Evidence: `src/layouts/Base.astro:75` and `:175-177`; `src/pages/index.astro:11`, `:96`; on 2026-09-22 `dist/` referenced one third-party media host and had zero iframes, and no script called `api.github.com`.
  Touches: `src/pages/index.astro` (commit a local copy of the avatar, or fetch it during `fetch-stars`), `src/layouts/Base.astro`, `scripts/audit-csp.mjs`, `scripts/audit-gate-selftest.mjs`, `test/csp-audit.test.mjs`.
  Acceptance: The policy ends up as `img-src 'self' data:`, `connect-src 'self'` and no `frame-src`, with no third-party preconnect or dns-prefetch. `csp:audit:dist` fails when an allowed host is referenced by no built file, proven by a planted case in `gates:selftest`. A Playwright request log shows zero third-party requests on `/`.
  Complexity: M

- [ ] P1: Harden `/api/contact` and put its first tests around it
  Why: The minimum-time check is skipped whenever `_t` is missing, and nothing limits volume. The log never rotates, rejections store names and emails, and the handler can't see client IPs behind two Caddy hops.
  Evidence: `deploy/vps/contact-handler.mjs:58`, `:89`, `:116`; Caddy v2.11.4 replaces `X-Forwarded-For` for untrusted peers (`reverseproxy.go`); `deploy/vps/csp-report-server.mjs` already bounds and rotates its log; MailForm's per-target `rateLimit`.
  Touches: `deploy/vps/contact-handler.mjs` (export a `createServer` for tests; issue an HMAC-signed timestamp token that `contact-form.js` fetches), `deploy/vps/Caddyfile` (`trusted_proxies` for the edge, `header_up X-Real-IP {client_ip}`), `public/scripts/contact-form.js`, new `test/contact-handler.test.mjs`.
  Acceptance: Tests cover the honeypot, a missing, forged, replayed or expired token, a per-client limit, a global hourly cap, and log rotation. The 422 text is generic ("Please check the form and try again") and doesn't name the honeypot. Rejections store no name or email. A request with no token is accepted only on the plain-POST path, under a stricter limit.
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
