# Research: sysadmindoc.github.io

Date: 2026-09-22. Replaces all prior research.

Baseline: v0.45.2 at `3c16a07d`. The only commit made during the pass was a CHANGELOG punctuation fix (`90538e86`), and no other session touched the tree. Live probes of `portfolio.getparkerai.com` and the VPS ran between 2026-09-23T00:45Z and 01:10Z. All VPS checks were read-only and printed aggregates, never submission contents.

Confidence labels: **Verified** means reproduced during this pass or read from a primary source. **Likely** means a secondary source or a partial read. **Needs live validation** marks what can't be checked from this machine.

## Executive Summary

This is Matt Parker's portfolio, a public catalog of 207 projects and a consulting front door. It's an Astro 7 static site, served from a Contabo VPS behind two Caddy hops since 2026-07-28. The build is still its strongest part. The last preflight (2026-09-21, at `3c16a07d`) passed 295 unit tests and 94 browser checks, `gates:selftest` proves 11 audits can fail, and every finding from the 2026-09-04 research was fixed in v0.43.0.

What's weak now is everything that happens after the build. The last pass found gates that measured nothing. This one finds the outward-facing channels failing the same way:

- The contact form tells visitors their message arrived, but the only copy sits in the memory of a notification server that no device subscribes to.
- The nightly refresh stopped on 2026-09-21 and nothing raised an alert.
- The service worker has broken the homepage photo for returning visitors since at least 2026-09-01.

About 30 gates pass and none of them caught these three. Each gate inspects `dist/` or a local preview, and these failures only exist in production.

Top opportunities, in priority order:

1. **P0.** Store every contact submission in full before replying, and stop putting visitor text in HTTP headers. A name typed as "O’Brien" on an iPhone makes the handler return 500 and drop the lead completely.
2. **P0.** Put ntfy behind authentication on its own HTTPS host and upgrade it out of a critical RCE range (v2.11.0 to v2.28.0). Then prove delivery with a synthetic lead in `smoke:live`.
3. **P0.** Commit the nightly task's definition, write a "running" marker, time out hung steps, and publish `staleAfter` in `/status.json`.
4. **P1.** Stop the service worker from intercepting cross-origin requests, and give the browser suites the production response headers so the worker's CSP gets tested at all.
5. **P1.** Serve the avatar from this origin and cut the CSP down to the one host the build actually uses, with a gate that fails on unused allowances.
6. **P1.** Harden `/api/contact` with a rate limit, a server-signed timestamp, a private network, a bounded log and a 303 for plain POSTs, and give it its first tests.
7. **P1.** Relock the dependency tree to clear the devalue (one of them high), satori, fflate and smol-toml advisories.
8. **P1/P2.** Add `/privacy/`, link the six orphaned routes, and redirect the retired `/projects/` URLs, which are the site's largest source of 404s.

## Product Map

**Core workflows**

- Show evidence fast. The homepage hero proof stack leads to eight Selected Work stories (`src/components/GreatestHits.astro`), six of the 22 live apps, and a handoff to `/catalog/`.
- Sell two services. `/ai/` covers fractional AI implementation, with the contact form at the bottom. `/healthcare-it/` covers imaging and PACS support, with a mailto CTA up top and the same form lower down.
- Take a lead. `src/components/ContactForm.astro` posts to `/api/contact`. The internal Caddy proxies that to `deploy/vps/contact-handler.mjs`, which publishes to a self-hosted ntfy container.
- Refresh itself. `scripts/refresh-and-deploy.mjs` chains `fetch-stars`, `profile-feed:sync`, `deploy:preflight` and `deploy:vps` from a Windows scheduled task on the owner's workstation.
- Prove its own claims on `/status/` and `/status.json`, `/data/` and `/colophon/`.

**Personas**

- **A hiring manager or recruiter** checking a resume they were sent, often on a phone. The site and the resume have to agree. People hiring in 2025-2026 describe a mismatch between the two as a sign of a fake applicant ([HN](https://news.ycombinator.com/item?id=43978405)).
- **A prospective client** for AI automation or healthcare IT support, deciding whether to write in.
- **A developer** arriving from a GitHub repo, who wants the catalog and direct repo links.
- **Answer engines and agents** reading `/llms.txt`, the JSON endpoints and the sitemap. `public/robots.txt` invites them on purpose.

**Platforms and distribution**

- The canonical origin is `https://portfolio.getparkerai.com`. It runs as a `caddy:2.11.4-alpine` container behind the shared edge Caddy.
- The compose project (`deploy/vps/docker-compose.yml`) has four containers: the static server, the CSP report sink, the contact handler and ntfy.
- `sysadmindoc.github.io` is a three-file redirect stub on `gh-pages` (`8003c640`, 2026-07-28).
- The site is also an installable PWA (`public/manifest.json`, `public/sw.js`).
- GitHub releases stop at v0.42.0 (2026-08-21), while tags run to v0.45.2.

**Integrations and data flows**

- **Build time:** the GitHub REST API writes `src/data/_*.json`, and the `SysAdminDoc/SysAdminDoc` profile feed writes `src/data/_profile-projects.json`.
- **Run time:** no client script calls a third party. The only runtime `fetch` is `public/scripts/contact-form.js:21`. The homepage still hot-links its avatar from `avatars.githubusercontent.com` (`src/pages/index.astro:11`, `:96`).
- **CSP reports** go to `/csp-report` and a redacting sidecar.
- **Contact submissions** go to `/api/contact` and on to ntfy.
- **Traffic reporting** is GoAccess over the edge access log. Cron runs it at 04:15 server time and writes the output outside the web root.

## Competitive Landscape

**Independent AI consultants (Justin McKelvey, Adriano Junior, Parlance Labs, Speedshop).** These are the sites a prospect compares `/ai/` against. What they publish:
- McKelvey sells a $2,500 two-week assessment, credited toward the build if it happens within 90 days. The offer promises a one-page scope within 48 hours, and the site shows three problem-to-outcome case studies.
- Adriano Junior prices fractional CTO work "From $5,499 a month", promises an answer "Within 24 hours, every working day, in writing" and uses no scheduler.
- Speedshop charges "$3,000 USD, monthly" on a six-month term and lists seven things the retainer includes.

Learn: buyers expect an engagement shape, a starting price, a reply promise and a few outcome stories. `/ai/` has phases with no durations, no prices and one proof story, which is this site. Avoid: unnamed-client metrics such as "95% cost cut". Also avoid the hosted schedulers and form tools these sites rely on (Calendly, SavvyCal, Typeform), since they'd contradict this site's first-party stance.

**Healthcare IT specialists (David Clunie, The PACSman).** Clunie's site proves expertise with tools and validators and has almost no sales copy. The PACSman sells named, fixed-scope reviews of upgrade proposals and contracts. Learn: a fixed-price imaging contract or upgrade review is a natural entry offer for `/healthcare-it/`. Adriano Junior's healthcare page says nothing about HIPAA or BAAs. That puts this site's data-boundaries section ahead once its fourth answer and the missing BAA position are fixed.

**AstroWind and AstroPaper, the most-starred Astro themes (5,989 and 5,067 stars).** AstroWind ships pricing, FAQ and testimonial widgets because consulting sites need those blocks. AstroPaper says it was tested with VoiceOver and TalkBack. Learn: say which accessibility tests the site runs. This one runs axe, WCAG 2.2 target-size, forced-colors and reduced-motion checks, and mentions them nowhere a visitor would look. Avoid: AstroWind's built-in Google Analytics and the generic template look.

**Simon Willison (tools colophon, disclosures, TIL).** The tools colophon covers 232 tools, the About page has a Disclosures section, and a 2026-03-01 post sets a one-line rule for which words on the site are written by hand. Learn: `/colophon/` follows the same pattern, but no page links to it, so the disclosure never reaches anyone. Avoid: per-commit model and transcript links. They'd clash with this repo's policy of no AI attribution in git.

**Brittany Chiang's archive.** A table of 58 projects with Year, Made at and Built with columns. It stops at 2023 because it's kept by hand. Learn: a "made for" column gives the catalog audience context. Avoid: hand-kept lists, which is the argument for this site's generated catalog.

**Julia Evans and Maggie Appleton (TIL, digital garden).** Short notes lower the bar for publishing. The pattern works, but `README.md` parks `/til` until a reviewed corpus exists. That's the owner's call, not a gap to fill with filler.

**slashpages.net and Molly White's /verify.** The slash-page convention reads `/ai` as "how I use AI". Here `/ai/` is a sales page, and the disclosure lives on the unlinked `/colophon/`. Learn: link the colophon from `/ai/` and from a sitewide footer instead of renaming a sales URL. A `/verify` page is optional, since `rel="me"` already ships on 23 built pages.

**MailForm and Formgate (small self-hosted form handlers).** Even these minimal projects redirect a plain HTML POST to a success or error page (`redirect.success` and `redirect.error`; `_redirect_success`). MailForm also rate-limits per target (`rateLimit.timespan` and `requests`). Learn: redirect-after-POST and a per-target limit are table stakes, and `contact-handler.mjs` has neither. Avoid: Formgate's email-only delivery with no stored copy. It's the same durability hole this site has.

**ntfy (v2.28.0, 2026-08-27).** It's the right tool once it's configured. Since 2.14.0 it supports declarative users, ACLs and tokens. It has a persistent `cache-file`, and since 2.16.0 scheduled-message updates, which can act as a dead-man's switch. Learn: run it deny-all, with a write-only token for the sidecar and a read-only token for the phone, on its own HTTPS host. Avoid: what runs in production today. It's the unconfigured v2.11.0, 17 minors behind and inside the range of a critical RCE (GHSA-pqhx-w72w-m393, fixed in 2.22.0).

**ALTCHA and Cap (self-hosted proof-of-work).**
- ALTCHA's widget (v3.2.3, 2026-09-20) and `altcha-lib` (v2.5.0) are MIT. The server side is plain Node that issues HMAC-signed challenges with an expiry. The widget needs `worker-src 'self' blob:` unless you use the `altcha/external` build (documented for the 2024 widget, Likely for v3).
- Cap fetches its WASM from jsDelivr by default.

Learn: keep ALTCHA in reserve. One real submission in five days doesn't justify a widget, and a server-signed timestamp plus a rate limit cover today's risk. Avoid: Cap's default CDN fetch.

## Reported Issues

The tracker is enabled and empty, with no open issues and no open pull requests (checked 2026-09-22).
- The only closed issues are two auto-filed "Portfolio quality gates need attention" reports: #16, closed 2026-06-08, and #22, closed 2026-06-25.
- The closed pull requests are Dependabot's, closed under repo policy.
- Discussions are on and empty.
- Private vulnerability reporting is enabled, so the advisory link in `public/.well-known/security.txt` works.

With one stargazer and no reporters, the tracker won't surface defects. Two streams on the VPS are the real bug tracker, and nobody reads either one:

- **The CSP report sink** held 303 reports on 2026-09-22, dating from 2026-08-20:
  - 24 are the deploy smoke's synthetic posts.
  - 19 are the service worker avatar bug described below.
  - 260 are blocks recorded as `(invalid-url)`: 126 `style-src-elem`, 84 `script-src-elem`, 33 `style-src`, 13 `style-src-attr` and 4 `img-src`. These are probably browser extensions injecting into the page, but the policy doesn't ask for `'report-sample'`, so they can't be told apart from a real regression.
- **The edge access log** (from 2026-09-17T15:44Z, 9,231 lines) shows the largest 404 class is `/projects/*`, with 92 hits. 36 of those came from browser-like user agents. Those URLs died when local project pages were removed on 2026-07-15 (`864d3451`), and people and crawlers still follow them.

## Security, Privacy, and Reliability

### The lead path loses leads (Verified on the VPS, 2026-09-23T00:45Z)

- **ntfy runs with no configuration.** It starts with `["serve","--listen-http=:80","--base-url=http://ntfy"]`. There's no `server.yml`, no published port and no route in the edge Caddyfile, so no phone or desktop app can subscribe from outside the Docker host. Android's ntfy app needs a server it can reach, and iOS instant delivery relays through ntfy.sh ([docs](https://docs.ntfy.sh/subscribe/phone/)).
- **Nothing is saved to disk.** The `./ntfy-cache` volume is mounted but empty. With no `cache-file`, ntfy keeps messages in memory for 12 hours and loses them on restart ([docs](https://docs.ntfy.sh/config/)). `/v1/stats` reported `{"messages":0}` after the container restart on 2026-09-21.
- **The handler never logs the message.** Its log keeps `name`, `email` and `messageLen`, never the message itself (`deploy/vps/contact-handler.mjs:80-91`).
- **The one outside inquiry is gone.** The VPS log holds three lines: the owner's test on 2026-09-17, a honeypot rejection, and a 2026-09-18T10:28:35Z submission that came from none of the owner's addresses and ran 842 characters. The edge log confirms that POST as the only `/api/contact` submission since 2026-09-17T15:44Z, answered 200. The sender was told "Message received. I will get back to you." (`contact-handler.mjs:123`). The text no longer exists.
- **A failed notification loses everything.** If the ntfy call throws, the handler answers 500 and writes nothing (`:121-127`). The sender's name and email are lost too.
- **Ordinary names crash the handler.** The submitted name goes into an HTTP `Title` header (`:66-74`). On Node 24, `new Headers({Title: "Portfolio lead: O’Brien"})` throws "Cannot convert argument to a ByteString". So does any CJK character or emoji (Verified 2026-09-22 on Node 24.19.0; the sidecars run 24.21.0 with the same fetch). The curly apostrophe is what iPhone keyboards type by default. ntfy's documented fixes are RFC 2047 encoding, query parameters, or JSON publishing to the root URL ([docs](https://docs.ntfy.sh/publish/)).
- **Long non-Latin messages fail too.** ntfy's 4 KB message limit turns larger bodies into attachments, and v2.11.0 with no attachment cache answers 400 (Verified in the v2.11.0 source). The handler caps messages at 2,000 characters, which is still over 4 KB for text that's mostly CJK.
- **A spam burst would block real leads.** ntfy limits each visitor to a burst of 60, then one request every 5 seconds. Every lead arrives from the same visitor, the handler, so a burst would get real leads a 429 (Likely).

### Contact endpoint weaknesses (Verified in code)

- **The minimum-time check is optional.** It runs only when `_t` is present and non-zero (`contact-handler.mjs:58`), and `_t` is filled in by client JavaScript. A bot that leaves it out skips the check.
- **The healthcare form has no script.** `/healthcare-it/` renders the form (`src/pages/healthcare-it.astro:211`), but `src/layouts/Base.astro:224` loads `contact-form.js` only where `hasContactForm` is set. The built `dist/healthcare-it/index.html` has the form without the script, so every submission there is a native POST that lands on a raw JSON page, with `_t` empty.
- **Plain POSTs get raw JSON.** The handler always answers JSON (`:93-96`), so a visitor without JavaScript sees `{"ok":true,...}` or `{"error":"honeypot filled"}` as the page. The client script also shows the server's error text word for word (`public/scripts/contact-form.js:34`).
- **The subject is lost.** The form's `data-subject` (`src/components/ContactForm.astro:9`) is never sent, and the handler ignores it anyway (`:42-50`), so a notification can't say which page a lead came from.
- **Nothing is limited or bounded.** There's no rate limit, no global cap and no rotation on `submissions.ndjson` (`:89`). The CSP sink next to it has all three. Rejected submissions are logged with the submitted name and email (`:116`).
- **The handler can't see client IPs.** Caddy v2.11.4 replaces `X-Forwarded-For` with the peer IP when the peer isn't trusted, so the handler only sees the edge container ([source](https://github.com/caddyserver/caddy/blob/v2.11.4/modules/caddyhttp/reverseproxy/reverseproxy.go)). A per-client limit needs `trusted_proxies` in the internal Caddy.
- **Any container can read or forge leads.** ntfy and the handler share the external `web` network with 20 other containers (22 members counted live; `deploy/vps/docker-compose.yml:95-96`, `:125-126`). ntfy's default access is open read and write ([docs](https://docs.ntfy.sh/config/#access-control)), and the topic name `portfolio-leads` is published in this public repo (`:111`).
- **Critical RCE in the pinned ntfy.** ntfy v2.11.0 (built 2024-05-13) is inside GHSA-pqhx-w72w-m393, a critical parseActions RCE fixed in 2.22.0. Nothing on the internet can reach it today. Every container on `web` can, and it has to be fixed before ntfy gets a public host.
- **No tests at all.** Nothing in `test/`, `tests/` or `scripts/` references the handler, the client script or the route, and `smoke:live` never probes `/api/contact`.

### The service worker breaks the homepage photo for returning visitors (Verified live)

- **The cause.** `public/sw.js:162-184` handles every cross-origin GET that isn't `api.github.com` or `opengraph.githubassets.com` with a stale-while-revalidate branch. A worker's own `fetch()` runs under the worker script's CSP, and `/sw.js` is served with `connect-src 'self' https://api.github.com`, so the fetch of `avatars.githubusercontent.com` is refused. Cross-origin responses are never cached (`:166`), so the catch returns a synthetic `503 Offline`.
- **The reproduction.** A headless Chromium run on 2026-09-23:
  - First visit: the avatar loads from the network (200, 460px wide).
  - Reload under the worker: 503 `fromServiceWorker`, `naturalWidth` 0.
- **The sink saw it; nobody read it.** The site's CSP sink has 19 matching reports from `/sw.js` since 2026-09-01, seven of them in the last two days.
- **Why no gate caught it.** A worker's CSP comes only from the headers on its own script response, never from the page's meta tag. Neither `astro.config.mjs` nor the Playwright preview server sets response headers, so every local run executes the worker with no CSP at all. The worker unit tests (`test/offline-fallback.test.mjs:507-642`) only exercise the `api.github.com` branch.

### The nightly stopped and nothing said so (Verified, 2026-09-22)

- **The last run was cut off.** It started 2026-09-21T10:55:26Z. Its `deploy:vps` step log stops at the first ssh command (10:57:45Z), with no `OK`, `DONE` or `ABORT` line. The remote deploy still finished: live `generatedAt` is 10:57:37Z and the containers were recreated. That fits the task's root process being ended mid-run while its child carried on.
- **A killed run looks like a good one.** `refresh-and-deploy.mjs` writes its status file only on terminal paths (`:150-166`), and no step has a timeout (`:86-144`). So a killed run leaves the previous day's `deployed` record in place.
- **The task is gone and can't be rebuilt from the repo.** No task named "Portfolio Refresh and Deploy" is visible to the owner's account, and the repo holds nothing that could recreate it. The README never mentions the nightly (Needs live validation from an administrator shell).
- **`/status.json` reports stale data as fresh.** It still says `"status":"fresh"`, `"stale":false` and `"ageHours":0.0348` for data fetched 2026-09-21T10:55:31Z. That data was 37.8 hours old when read, past the site's own 36-hour contract. The fields are computed at build time (`src/data/generated-trust.ts:70-73`, `:248-255`), and there's no `staleAfter` a machine could check. The HTML `/status/` page recomputes ages in the browser, so a person sees the truth and a script doesn't.

### Least privilege has drifted (Verified)

- **The CSP allows far more than the site uses.** `src/layouts/Base.astro:75` allows six third-party image hosts, `connect-src https://api.github.com` and `frame-src https://www.youtube-nocookie.com`. The built site uses exactly one of those hosts, for the avatar. `dist/` has no iframes, and no script calls the GitHub API.
- **Every page preconnects to GitHub for nothing.** `Base.astro:175-177` preconnects to `api.github.com` and prefetches DNS for two GitHub hosts, and no request follows.
- **The analytics job runs a floating image with network access.** `deploy/vps/analytics-report.sh:23` pulls `allinurl/goaccess:latest` at run time. Line 39 pipes the raw edge access log into it, visitor IPs included, with networking on. It's the same floating-tag problem v0.43.0 fixed for Caddy, plus a way for the log to leave the box.

### Dependencies (Verified 2026-09-22 against npm, GitHub advisories and `npm ls`)

- **devalue.** `devalue` 5.8.1 (through astro) sits inside the 2026-08-27 advisory and seven more published 2026-09-18, one of them high ("`stringify`/`uneval` serialize shared memory"). All are fixed in 5.9.3. astro 7.3.4 still asks for `^5.8.1`, so a relock picks up 5.9.4.
- **satori.** satori 0.33.4 is inside GHSA-wx4j-mvgx-mqwp (improper SVG escaping, published 2026-09-22, fixed in 0.33.5).
- **fflate.** satori pins `fflate` exactly at 0.7.3, and `@shuding/opentype.js` pins 0.7.4. Both are inside GHSA-px8p-9vwx-vf98. `fflate` 0.7.5 shipped 2026-07-20, so only a caret override reaches it. npm's suggested fix is a satori downgrade, which is wrong.
- **smol-toml.** `smol-toml` 1.8.0 is inside a medium advisory published 2026-09-22 (fixed in 1.9.0). astro accepts `^1.8.0`.
- **Why the gates stay green:**
  - All of these are build-time only, with no untrusted input, so the real risk is low.
  - `deps:audit` blocks only at `high` (`scripts/audit-dependencies.mjs:354`).
  - `npm audit` doesn't see the repository-level devalue and satori advisories yet.
  - `.npmrc` sets `min-release-age=3`, so the fixed versions published on 2026-09-22 can't install before about 2026-09-25.
- **Holds that still stand:**
  - `typescript` 6.0.3: TS 7.0 went GA on 2026-07-08, but `@astrojs/check` still peers on `^5 || ^6`, and astro 7.3.4 says `astro check` doesn't support TS 7.
  - `fast-uri` v3, for ajv.
  - `nanoid` v3, for postcss.
  - `@resvg/resvg-js` 2.6.2. It's the last stable release (2024-03-26) and still bundles resvg 0.34 while upstream is at 0.48.1.
- **Not applicable:** Caddy's GHSA-6365-7ppr-5r92 (`forward_auth` with `reverse_proxy`) doesn't apply. Neither the portfolio configs nor the edge mirror use `forward_auth`.
- **Node.** The VPS sidecars pull `node:24-alpine` on every deploy and run 24.21.0. The build workstation runs 24.19.0, which lacks the undici 7.29.1 and OpenSSL 3.5.8 updates in 24.21.0.

### Recovery and rollback

- **Rollback paths exist.** `deploy:vps` keeps `dist.old` on the server, and the gh-pages redirect stub is a clean fallback origin.
- **One command undoes the move off GitHub Pages.** `npm run publish:pages` is still documented (`README.md:88`, `:207`) and has no guard (`scripts/publish-pages.mjs`). Running it would overwrite the three-file redirect stub with a full duplicate of the site.

## Architecture Assessment

**Boundaries that hold.**
- `src/data/catalog-render.ts` still feeds both catalog surfaces from one computation.
- `src/data/identity.ts` is still the single source for contact details.
- `gates:selftest` plants real violations for 11 audits that read `dist/`.
- The v0.43.0 work that fixed every inert gate from the 2026-09-04 research is intact.

**Where the next failures come from.** Everything added on 2026-09-17 landed in one day: the contact form and its two sidecars, `/colophon/`, `/data/`, the data-boundaries copy and the redesign, in 32 commits and five releases. That's the part of the site no gate covers.

- **The handler can't be tested as written.** No test touches `deploy/vps/contact-handler.mjs`, and it's hard to test in its current shape: it calls `process.exit` and `listen` when imported and exports nothing.
- **The new routes are missing from the checks.** `/colophon/` and `/data/` aren't in the sitemap's required routes (`scripts/audit-sitemap.mjs:16-27`) or the llms.txt required URLs (`scripts/audit-public-endpoints.mjs:557-585`). The Playwright route list (`tests/playwright/portfolio-audits.spec.mjs:10-26`) has `/data/` but not `/colophon/`.
- **Six routes are orphaned.** Of the 22 sitemap routes, `/colophon/`, `/data/`, `/uses/`, `/lang/cs/`, `/lang/kotlin/` and `/lang/security/` have no inbound link from any other built page. The v0.45.0 nav trim (`a344b6f1`) removed the last links to the first two, and `src/components/Footer.astro` renders only per-route links, so secondary pages have no sitewide home. `links:audit` checks that links resolve, not that pages can be reached.
- **The visual baselines are out of date.** They were last updated on 2026-07-25 (Linux) and 2026-09-05 (win32). Thirty files under `src/pages`, `src/styles` and `src/components` have changed since, including the v0.45.0 two-column hero, and preflight runs only the axe and target-size checks. Nothing runs Playwright on Linux, so those PNGs are dead weight.
- **Self-test gaps.** `gates:selftest` has no planted-violation case for `csp:audit:dist` or `sw:stamp`.
- **A parked gate can now ship.** The featured-release provenance check sat in `Roadmap_Blocked.md` while ClearCut's downloadable releases were unsigned. On 2026-09-22, `node scripts/summarize-generated-data.mjs --fail-on-unsigned-featured-releases` reported "Failing featured downloadable releases: 0", so the flag can join `data:summary:deploy`, reporting rather than blocking during the nightly the way catalog drift does.

**Refactor candidates.**

- **`src/styles/layers/unlayered.css`** is 54,702 bytes. It holds ten labelled redesign blocks, from v0.18.4 at `:1` to the v0.45 composition pass at `:1687`, and redefines the `:root` tokens six times (`:706`, `:1259`, `:1393`, `:1595`, `:1611`, `:1691`). The existing P2 item counts seven blocks. The real number is ten, which makes the case stronger.
- **`src/styles/critical.css`** is 42,121 bytes over 1,238 lines, inlined unminified into every page (`src/layouts/Base.astro:159`). That's 54% of the homepage's 77,459-byte HTML, and it sits outside every CSS budget. `lightningcss` is already a dependency.
- **`/cmdk-data.js`** is 62,803 bytes and loads as a blocking script on every page (`Base.astro:212`), even though the palette controller itself lazy-loads (`:209-214`). `scripts/audit-bundle-size.mjs:104-111` scans only `scripts/` and `_assets/`, so this file is outside the JS budget. It would be 1,363 bytes over the per-file cap.
- **Dead code in the worker.** `public/sw.js:148-160` keeps a cross-origin cache path for `api.github.com` and `opengraph.githubassets.com`, which nothing requests any more.
- **Stale config comment.** `astro.config.mjs:11-16` still describes incremental-build caching that v0.43.0 removed.

**Documentation and copy that drifted.**

- **GitHub Pages is still named as the host.** `public/humans.txt:11` says "Hosting: GitHub Pages", and the portfolio's own entry in the profile feed says the same. `README.md:44` calls Pages a retained fallback, and `:207` says `publish:pages` still deploys it.
- **"No analytics" overstates it.** `humans.txt:12` and `dist/llms.txt:3` say it, but GoAccess reads the edge access log server-side. Only `/status/` words it precisely ("no runtime analytics").
- **A spliced sentence.** `dist/llms.txt:3` reads "…keep healthcare systems running. with 15+ years…". It happened when the headline in `src/data/career.ts` changed (`2d176fa1`) and `src/pages/llms.txt.ts:64` kept appending to it.
- **`/now/` is out of date.**
  - `src/data/curated.ts:85` still tells visitors the colophon is "in progress" and hard-codes "295 automated tests".
  - The page has two freshness dates: the sitemap uses `page-freshness.ts` (2026-06-04), while the structured data uses `now.updated`.
- **Titles break the house style.** `/colophon/` and `/data/` use an em dash (`colophon.astro:11`, `data.astro:73`) where every other route uses " | ". The homepage title uses a spaced hyphen, and the feed `<link rel="alternate">` titles use em dashes (`Base.astro:169-174`).
- **The healthcare trust copy has gaps.** The answer to "What stays on your systems?" (`src/pages/healthcare-it.astro:176-177`) describes the consultant's own "secured local environment", which answers a different question. The section also never states a BAA position.
- **One resume note needs the owner.** `src/data/career.ts:104` describes the current role's hours differently from the timeline the owner gave most recently. It needs the owner's call before the next hiring conversation.
- **A small CHANGELOG error.** The v0.45.1 entry says three gates failed, then lists four.

**Under consideration (not filed).**

- **Takumi** (`@takumi-rs/core` 2.14.0, 2026-09-15) could replace satori plus resvg-js, whose upstream has stalled. The OG cards work, so wait until resvg-js actually blocks something.
- **Invoker commands** (`command`/`commandfor`, Baseline 2025-12-12) plus popover could replace `mobile-nav.js` and `section-jump-nav.js`. It's worth doing when either is next touched.
- **Scroll-reveal fade-ins on the evidence pages.** Recruiter and hiring threads complain about fade-in gimmicks (Likely). `public/scripts/scroll-reveal.js` hides `.rv` content until it's scrolled into view. Worth a look during the next design pass.
- **A short accessibility statement** listing the checks the site runs, as AstroPaper does.
- **ALTCHA,** if spam starts getting past the P1 hardening.
- **The npm 12 move.** npm 12.0.0 blocks install scripts unless they're listed in `allowScripts` (esbuild already is) and makes unknown `.npmrc` keys fatal. Test `min-release-age` under 12 before switching.

## Rejected Ideas

- **Hosted schedulers, form backends, testimonial widgets and newsletters** (Calendly, SavvyCal, Typeform, testimonial.to, hosted newsletters). They break the no-third-party policy that `/status/` and the footer publish. The consultant comparables that use them are the source.
- **Restoring local `/projects/*` pages** (`864d3451`). They were removed on purpose. Redirecting the old URLs gets the same traffic back without bringing back a second project surface.
- **A client-side vitals beacon or any runtime analytics** (`/status/`, `analytics-report.sh`). It would make the "no runtime analytics" claim false, and GoAccess already answers the traffic question.
- **Registering the WebMCP origin-trial token now** ([spec](https://webmachinelearning.github.io/webmcp/), [OpenAI](https://learn.chatgpt.com/docs/webmcp), [WebKit](https://github.com/WebKit/standards-positions/issues/670)).
  - Chrome's trial ends with Chrome 157 (2026-11-03).
  - The API was just renamed to `document.modelContext`, and the spec's declarative section is still "entirely a TODO".
  - OpenAI says tools defined through HTML form attributes aren't available.
  - WebKit opposes it.
- **`Content-Signal` or AIPREF `Content-Usage` declarations** ([AIPREF](https://datatracker.ietf.org/wg/aipref/about/), [SER](https://www.seroundtable.com/google-cloudflare-content-signals-41631.html)). No RFC exists, the vocabulary draft says it doesn't reflect consensus, and no major crawler documents honouring either. Google says Content-Signal has no effect. The wildcard `Allow` in `robots.txt` already admits OAI-SearchBot and the other answer-engine search crawlers, which is what gets a site cited.
- **Expanding `llms.txt` or adding its v2 `describedby` header** ([Ahrefs](https://ahrefs.com/blog/llmstxt-study/)). 97% of 38,360 files got zero requests in May 2026. The current file is enough.
- **Enforcing Trusted Types or adding ProfilePage markup.** Both already ship: `require-trusted-types-for 'script'` is live, and the homepage ProfilePage points `mainEntity` at the Person node.
- **`Integrity-Policy`** ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Integrity-Policy)). It isn't Baseline (Firefox support is partial). Every script here is same-origin. And the worker's stale-while-revalidate cache could serve an old script against a new hash right after a deploy.
- **`prerender_until_script`, Document-Isolation-Policy and COEP.** The first is an origin trial ending with Chrome 155 on 2026-10-06. The other two exist only to enable cross-origin isolation, which nothing here needs.
- **FAQPage markup** for the data-boundaries answers ([Google](https://developers.google.com/search/updates)). Google retired FAQ rich results on 2026-05-07.
- **i18n** (single author, single language). What does matter is accepting non-Latin input, and that's covered by the P0 lead item.
- **Build-speed work.** It was measured at 18.5 seconds on 2026-09-04, and nothing since has changed the picture.
- **Categories covered elsewhere or excluded on purpose:**
  - Plugin ecosystem: there's no extension surface.
  - Multi-user: there's one author and no accounts.
  - Migration tooling: nothing is migrated, except ntfy's config and the retired `/projects/` URLs, which the P0 and P2 items cover.
  - Mobile: the WCAG 2.2 target-size gate runs in every preflight, and the re-baseline item refreshes the stale mobile snapshots.
  - Offline: the offline fallback and navigation preload work. The only offline-path defect is the cross-origin interception in the P1 service worker item.

## Sources

Lead path, forms and notification
- https://docs.ntfy.sh/config/
- https://docs.ntfy.sh/publish/
- https://docs.ntfy.sh/subscribe/phone/
- https://docs.ntfy.sh/releases/
- https://github.com/advisories/GHSA-pqhx-w72w-m393
- https://github.com/caddyserver/caddy/blob/v2.11.4/modules/caddyhttp/reverseproxy/reverseproxy.go
- https://caddyserver.com/docs/caddyfile/options#trusted-proxies
- https://github.com/mholt/caddy-ratelimit
- https://github.com/Feuerhamster/mailform
- https://github.com/formgate/formgate
- https://github.com/altcha-org/altcha-lib
- https://nodejs.org/api/fs.html
- https://www.sqlite.org/pragma.html#pragma_synchronous
- https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=22575
- https://www.ftc.gov/business-guidance/resources/protecting-personal-information-guide-business
- https://www.workato.com/the-connector/lead-response-time-study/
- https://6sense.com/science-of-b2b/buyer-experience-report-2025/

Dependencies and advisories
- https://github.com/withastro/astro/releases/tag/astro%407.3.4
- https://github.com/vercel/satori/security/advisories/GHSA-wx4j-mvgx-mqwp
- https://github.com/sveltejs/devalue/security/advisories
- https://github.com/advisories/GHSA-px8p-9vwx-vf98
- https://github.com/squirrelchat/smol-toml/security/advisories
- https://github.com/caddyserver/caddy/security/advisories/GHSA-6365-7ppr-5r92
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- https://github.com/npm/cli/releases/tag/v12.0.0
- https://github.com/nodejs/node/releases/tag/v24.21.0
- https://github.com/thx/resvg-js
- https://github.com/kane50613/takumi

Comparables
- https://justinmckelvey.com/blog/how-much-does-ai-consulting-cost
- https://www.adriano-junior.com/
- https://parlance-labs.com/services.html
- https://www.speedshop.co/retainer.html
- https://www.dclunie.com/
- https://github.com/arthelokyo/astrowind
- https://github.com/satnaing/astro-paper
- https://tools.simonwillison.net/colophon
- https://simonwillison.net/about/
- https://brittanychiang.com/archive
- https://jvns.ca/til/
- https://maggieappleton.com/garden
- https://slashpages.net/
- https://www.mollywhite.net/verify/

Standards, search and hiring signal
- https://datatracker.ietf.org/wg/aipref/about/
- https://blog.cloudflare.com/content-independence-day-ai-options/
- https://developers.openai.com/api/docs/bots
- https://llmstxt.org/changes.html
- https://ahrefs.com/blog/llmstxt-study/
- https://developer.chrome.com/docs/lighthouse/agentic-browsing/scoring
- https://webmachinelearning.github.io/webmcp/
- https://learn.chatgpt.com/docs/webmcp
- https://web-platform-dx.github.io/web-features-explorer/features/speculation-rules/
- https://wicg.github.io/nav-speculation/prerendering.html
- https://web-platform-dx.github.io/web-features-explorer/features/trusted-types/
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Integrity-Policy
- https://web-platform-dx.github.io/web-features-explorer/features/invoker-commands/
- https://developers.google.com/search/docs/appearance/structured-data/profile-page
- https://developers.google.com/search/docs/appearance/ai-features
- https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/
- https://news.ycombinator.com/item?id=43978405
- https://news.ycombinator.com/item?id=47409463

Live evidence gathered 2026-09-22 and 2026-09-23 (UTC)
- https://portfolio.getparkerai.com/status.json
- https://portfolio.getparkerai.com/ (response headers)
- https://portfolio.getparkerai.com/sw.js (response headers)

## Open Questions

1. **Which notification path should reach you, and how fast will you promise to reply?** The P0 item defaults to the ntfy Android app with a read-only token. iOS instant delivery would relay a message ID (not the content) through ntfy.sh. The reply promise on the form should be one you can keep, and "one working day" is what the comparables publish.
2. **How long should leads be kept?** `/privacy/` has to state a period, and the purge job has to enforce it.
3. **Do the shipped healthcare data-boundary answers match how you run engagements?** Also: what's your BAA position, and how should "What stays on your systems?" really be answered?
4. **Which description of the current role's hours is correct** (`src/data/career.ts:104`)? And may `/resume/` name the imaging systems and vendors you've supported, since healthcare recruiters search by those names?
5. **Should `/ai/` publish durations and starting prices?** If so, which numbers? getparkerai.com currently shows $950 and $1,500 packages, and the two sites should say the same thing.
6. **Were the workstation's scheduled tasks removed on purpose?** If so, where should the nightly run now?
