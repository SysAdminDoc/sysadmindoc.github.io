# Research — sysadmindoc.github.io

Date: 2026-09-04 — replaces all prior research.

## Executive Summary

A mature Astro 7 static portfolio and public software catalog for Matt Parker, self-hosted on a Contabo VPS behind Caddy since 2026-07-28. Its strongest shape is the audit apparatus: 60 test files (257 tests, all passing 2026-09-04), 46 build/deploy scripts, ~30 gates wired into `deploy:preflight`, a hash-pinned CSP with a first-party report sink, and generated-data trust surfaced publicly at `/status.json`. Zero TODO/FIXME markers exist anywhere in `src/`, `scripts/`, or `public/`. A full `npm run build` takes 18.5 seconds for 21 pages, so build performance is not a problem worth solving.

The highest-value direction is not new features. It is closing the gap between what the gates claim and what they do, because five separate mechanisms report health they are not actually measuring, and the deploy has been silently broken for a fourth time.

Top opportunities in priority order:

1. The nightly deploy has been failing since 2026-09-04T07:00Z and v0.42.3 has never shipped. Fourth occurrence of the same catalog-drift failure mode.
2. Accessibility is not gated on deploy. `a11y:audit`, `audit:playwright` (axe-core), `forced-colors:audit` and `audit:perf` are invoked by no chain, while a test named "a11y audit npm script is blocking by default" passes by checking a string in `package.json`.
3. The unattended deploy's live smoke runs `--status-only`, which returns before every security-header, CSP-report-sink and artifact-count assertion.
4. `experimental.incrementalBuild: true` is enabled but caches nothing, and on Astro 7.2.4 it forces `build.concurrency` to 1.
5. Both script-order guards in `scripts/fix-html-structure.mjs` are permanently inert because the file they key on was deleted.
6. `deps:audit --strict` passes while astro, satori, esbuild, sharp, postcss, svgo, playwright and axe are all behind.
7. Speculation Rules can be shipped through the response header the site already stamps, with no CSP change — the exact blocker that forced the 2026-07-28 revert no longer applies.
8. Caddy is pinned to a floating `2.11-alpine` tag that the deploy never pulls, and 2.11.3 carries CVE fixes beyond the 2.11.1 set already adopted.
9. No `frame-ancestors`, and no `.npmrc`, so clickjacking defence rests on `X-Frame-Options` alone and npm 11.13's `min-release-age` gate is off.
10. Release tags stop at v0.42.0, and the GoAccess log history resets on every deploy because the edge log lives inside a container the deploy recreates.

Confidence labels used below: **Verified** means reproduced on this machine or read from a primary source on 2026-09-04. **Needs live validation** is called out inline where it applies.

## Product Map

**Core workflows**

- Publish a curated portfolio: hero proof strip, Selected Work (`src/components/GreatestHits.astro`), 22 live GitHub Pages apps with screenshot-backed cards, and a 201-project catalog split between an 84-item homepage preview and the full static `/catalog/` route.
- Refresh public data unattended: `npm run refresh:deploy` chains `fetch-stars` → `profile-feed:sync` → `deploy:preflight` → `deploy:vps`, run daily at 03:00 local by a Windows scheduled task, failing closed with a verdict line in `.tmp/refresh-and-deploy.log`.
- Publish machine-readable surfaces: `/projects.json`, `/releases.json`, `/status.json`, `/resume.json`, `/feed.json`, `/rss.xml`, `/atom.xml`, `/releases.xml`, `/llms.txt`, `/cmdk-data.js`, plus per-route OG cards from `src/pages/og/[slug].png.ts`.
- Sell services: `/ai/` (fractional AI implementation) and `/healthcare-it/` track pages, both currently converting through `mailto:` only.
- Prove its own claims: `/status/` and `/status.json` publish generated-data mode, age, coverage, README telemetry and release-provenance distribution from `src/data/generated-trust.ts`.

**User personas**

- A hiring manager or prospective client scanning for evidence in well under a minute, often on a phone.
- A developer arriving from a GitHub repo, wanting the catalog and direct repo links.
- An agent or IDE crawler consuming `/llms.txt` and the JSON endpoints — explicitly invited by `public/robots.txt`.

**Platforms and distribution**

Canonical origin `https://portfolio.getparkerai.com`, a `caddy:2.11-alpine` container behind a shared edge Caddy on `161.97.118.191`. `sysadmindoc.github.io` is a path-preserving redirect stub. The 22 live apps stay on their own Pages repos. Distribution of the site itself is a tarball shipped over ssh by `scripts/deploy-vps.mjs`, plus a static-site ZIP attached to GitHub releases. PWA installable via `public/manifest.json` with a service worker at `public/sw.js`.

**Key integrations and data flows**

GitHub REST API (build-time, token-backed, `scripts/fetch-stars.mjs`) → `src/data/_stars.json`, `_meta.json`, `_readmes.json`, `_releases.json`, `_stats.json`. The `SysAdminDoc/SysAdminDoc` profile feed → `src/data/_profile-projects.json` via `scripts/sync-profile-feed.mjs`, consumed by `src/data/portfolio.ts` with `src/data/projects.ts` as fallback. Client runtime touches only `api.github.com` (per the live `connect-src`). CSP violations POST to `/csp-report`, reverse-proxied to the `deploy/vps/csp-report-server.mjs` sidecar. Traffic reporting is GoAccess over Caddy JSON logs, run by cron at 04:15, written outside `dist/`.

## Competitive Landscape

**Astrofy (`manuelernestog/astrofy`)** — the most-forked Astro portfolio template; ships blog, CV, projects, store and RSS out of the box. Learn: its CV route is a first-class page, not an afterthought. Avoid: TailwindCSS and a generic template look, both of which would discard this site's Technical Service Bureau design system and its hand-pinned CSS layer order.

**`simonw/tools` and its colophon** — Simon Willison publishes a per-tool colophon listing the commit messages and the AI transcripts behind every tool. Learn: this is the strongest available precedent for the AI-build colophon item sitting blocked in `Roadmap_Blocked.md`, and it works precisely because it is derived from git rather than written. Avoid: his tools site has essentially no design system or trust surface; the appeal is raw volume, which is a different bet from this site's curated-evidence bet.

**GitHub profile READMEs and `github-readme-stats`** — the default way developers publish a catalog. `github-readme-stats` deprecated itself on 2026-06-30 in favour of `stats-organization/github-stats-extended`, and the render-host model it popularised is being replaced by self-hosted mirrors and committed static assets. Learn: this repo already made the right call by committing generated data rather than hot-linking a render host. Avoid: reintroducing any hosted badge or metric card, which would break the zero-third-party posture the footer publicly claims.

**Reactive Resume and the JSON Resume ecosystem** — JSON Resume schema v1.0.0 is the de-facto machine-readable CV format, and Reactive Resume is pushing it as a portability standard. Learn: `/resume.json` already emits the v1.0.0 shape, which is genuinely ahead of most portfolios. Avoid: hand-rolled validation — the current `test/resume-schema.test.mjs` only asserts ISO date ordering, so a schema violation such as the non-standard `work[].keywords` field ships unnoticed.

**Pagefind (`CloudCannon/pagefind`)** — 1.5.2 is current as of 2026-04-12; 1.5.0 brought a web-components Component UI, ~45% smaller indexes via delta encoding, CJK segmentation, and metadata search with configurable field weights. Learn: the metadata weighting and `matchedMetaFields` are available if relevance ever becomes a complaint. Avoid: replacing the accessible Component UI with a custom `pagefind.search()` shell, which `Roadmap_Blocked.md` already rejects for want of any actual UX complaint.

**Astro's own `security.csp`** — the framework's answer to the problem this repo solves by hand. Re-verified 2026-09-04: it remains meta-tag-only with no HTTP header option and no way to suppress the meta tag, and only `script-src`/`style-src` are handled natively. Learn: nothing to adopt yet. Avoid: migrating — adopting it would inject a second policy that browsers intersect, exactly as the 2026-08-20 trial found.

**ALTCHA (`altcha-org/altcha`) and Cap (`trycap.dev`)** — self-hosted proof-of-work CAPTCHA alternatives. ALTCHA advertises GDPR, WCAG 2.2 AA and EAA compliance and is MIT-licensed with no data-processor relationship when self-hosted; Cap runs two layers (PoW plus instrumentation) in one container. Learn: either removes the third-party-form objection that originally blocked the intake form. Avoid: a managed service such as FriendlyCaptcha, which reintroduces the third party the site's own copy disclaims.

**GoAccess** — validated against Umami and Plausible for this workload. Learn: the choice is correct; it is C, needs only ncurses, requires no client JavaScript and no cookies, and parses Caddy logs. Avoid: assuming it retains history — the current deployment writes logs inside the edge container.

**WebMCP (W3C Web Machine Learning CG)** — lets a page expose declarative tools to browser agents; Chrome runs a public origin trial from Chrome 149 through 156. Learn: Lighthouse now ships an "Agentic browsing" audit category (llms.txt, registered WebMCP tools, declarative WebMCP on forms, schema validity, accessibility for agents, layout stability), which is a new scoreboard this site is well positioned on. Avoid: shipping it as anything but an experiment — as of July 2026 no mainstream agent product actually calls WebMCP tools, and the API surface still changes between drafts.

**Vercel Satori** — 0.33.4 (2026-08-24) against the pinned 0.29.1. Learn: 0.33.0 added HarfBuzz text shaping and 0.33.1 a ~12% render speedup with better font caching, both directly relevant to `src/data/og-card.ts`. Avoid: treating the version gap as urgent — the pinned 0.29.1 already carries the SSRF hardening, and the OG cards render in seconds.

## Reported Issues

The tracker is enabled and empty. `gh issue list --state open` returns zero issues as of 2026-09-04. Discussions are enabled and empty. Only two issues have ever been closed, both auto-filed and both titled "Portfolio quality gates need attention" (#16 closed 2026-06-08, #22 closed 2026-06-25). No open pull requests; the closed ones are Dependabot PRs (#19-#21, #23) correctly closed under repo policy, plus one merged self-authored PR (#18).

There is therefore no user-reported signal to prioritise against. Everything below is sourced from live behaviour, the code, and the ecosystem — and the absence of reports is itself meaningful: a single-stargazer personal site will never surface its defects through a tracker, so the gates and the live smoke are the only feedback loop that exists. That raises the priority of the three gates found to be measuring nothing.

Adjacent tracker facts worth recording: Dependabot vulnerability alerts are disabled (`GET .../vulnerability-alerts` returns 404), `.github/` does not exist so there are no workflows, and branch protection on `main` has `enforce_admins: true`. All three match documented policy.

## Security, Privacy, and Reliability

**Deploy is broken right now.** `.tmp/refresh-and-deploy.log` records `ABORT after 27s at step "deploy:preflight"` for the 2026-09-04T07:00:01Z run. Reproduced by hand: `npm run catalog:audit` exits 1 with "Unreviewed active public repos missing from portfolio data: GLP-Ultra, HubSpot-Ticket-Refined". Live `/status.json` serves version 0.42.2 from commit `1f9575eb`, generated 2026-09-03T18:36:34Z, while local `HEAD` is `838a72e` (v0.42.3). This is the fourth episode of the identical failure mode (2026-08-24 to 08-26, 2026-08-31 to 09-03, and now). The gate is behaving correctly; the process around it is the defect, because remediation requires a hand-written catalog entry per repo and nothing alerts when the nightly aborts.

**Five gates measure less than they claim.**

- `astro.config.mjs:17` sets `experimental: { incrementalBuild: true }`. Astro's documentation is explicit that "only pages from `getStaticPaths()` with a `cacheKey` are eligible for skipping"; `grep -rn cacheKey src/` returns nothing, and the two `getStaticPaths()` routes (`src/pages/og/[slug].png.ts:8`, `src/pages/lang/[slug].astro:13`) return bare `params` objects. Nothing is ever cached. On Astro 7.2.4 the flag additionally disables `build.concurrency > 1`; concurrent rendering under this flag only arrived in 7.3.0.
- `scripts/fix-html-structure.mjs` computes `mainBeforeShared` and `featureBeforeMain`, both gated on `mainIdx >= 0` where `mainIdx = html.indexOf('/scripts/main.js')`. `public/scripts/main.js` was deleted, and `test/homepage-runtime.test.mjs:11` asserts its absence. Both conditions are permanently false on every built page. The ordering constraint that does exist — `cmdk.js` needs `window.SafeDOM` from `shared.js` — is unguarded, and `public/scripts/cmdk.js:39` fails open with `const dom = window.SafeDOM || {}`.
- `npm run deps:audit -- --strict` reported PASS on 2026-09-04 while listing astro 7.2.4→7.3.1, satori 0.29.1→0.33.4, esbuild 0.28.1→0.28.2, sharp 0.35.3→0.35.4, postcss 8.5.23→8.5.28, svgo 4.0.2→4.1.0, `@playwright/test` 1.62.0→1.63.0, `@axe-core/playwright` 4.12.1→4.13.0, `@astrojs/sitemap` 3.7.3→3.7.4, `@astrojs/check` 0.9.9→0.9.10 and `fast-xml-parser` 5.10.1→5.11.1. Strict mode only fails on stale exact override pins, so the production dependencies drift indefinitely without ever reddening a gate.
- Accessibility is not gated on deploy at all. `a11y:audit` appears in no chain: `deploy:preflight` runs `data:summary:deploy`, `catalog:audit`, `liveapps:audit`, `verify:signatures`, `deps:audit --strict`, `test`, `check` and `build`, and none of those reach it. Neither `audit:playwright` (the real axe-core run), `audit:interactions`, `audit:cross-engine`, `forced-colors:audit`, `audit:perf`, `lhci:audit`, `audit:sw` nor `semantic:audit` is invoked automatically either. `test/a11y-gate.test.mjs:9` is named "a11y audit npm script is blocking by default" but only asserts that the string `node scripts/audit-a11y.mjs --strict` appears in `package.json`. Run by hand on 2026-09-04 the audit passes, and it is worth knowing what it covers: six static checks across 22 pages (lang, title, image alt, positive tabindex, aria-hidden-focusable, duplicate id). That is a useful floor, not an accessibility gate.
- The automated deploy's live smoke is far weaker than documented. `scripts/deploy-vps.mjs:157` invokes `smoke:live --status-only`, and `scripts/smoke-live-site.mjs:616` returns immediately after `checkDeployStatus()` in that mode. Every security-header assertion (HSTS, X-Frame-Options, Permissions-Policy, COOP, Referrer-Policy, X-Content-Type-Options at lines 214-275), the `Reporting-Endpoints` and `report-to`/`report-uri` checks, the synthetic CSP-report POST, and the artifact count checks all live in `checkLiveArtifacts()` at line 387 and never run on an unattended deploy. The documented claim that `smoke:live` gates the edge security headers holds only for a manual full run.

**Missing guardrails.**

- No `frame-ancestors` anywhere. `deploy/vps/caddy-block.txt:20` sets `X-Frame-Options: DENY` with a comment explaining that a `<meta>` CSP cannot deliver `frame-ancestors` — true, but `deploy/vps/Caddyfile:37` already stamps `header Content-Security-Policy "{$CSP_POLICY}"`, and a header-form CSP *can* carry it. Verified absent in the live response headers on 2026-09-04.
- No `.npmrc` in the repo. npm 11.10+ supports `min-release-age` but leaves it off, and `packageManager` pins npm 11.13.0. Successive Shai-Hulud waves (November 2025, then "Mini Shai-Hulud" from 2026-04-29 into May 2026) turned on immediate installation of freshly published versions, and V2 moved from `postinstall` to `preinstall` so even a failed install executes. The repo's `allowScripts` field in `package.json` is forward-preparation for npm v12 (pinned by `test/toolchain.test.mjs:57`) and does nothing under npm 11.
- Caddy is pinned to the floating `caddy:2.11-alpine` tag in `deploy/vps/docker-compose.yml:11`, and `scripts/deploy-vps.mjs` force-recreates the container without pulling. 2.11.1 fixed CVE-2026-27586 through CVE-2026-27590; 2.11.3 added fixes for rewrite placeholder re-expansion, an unbounded body-buffer DoS, and a `fileHidden` case-sensitivity bypass. The running image version is unverified.
- `sanitize-html` correction: the `apostrophecms/sanitize-html` repository was archived read-only on 2026-02-26 with a "Deprecated — see our monorepo" banner, but the package is *not* abandoned — it moved into the ApostropheCMS monorepo and 2.17.7 is current. Prior notes calling it dead upstream overstate the risk; no containment plan or DOMPurify migration is warranted.

**Recovery and rollback.**

`deploy:vps` keeps the previous tree as `dist.old`, which is a real rollback path, and `refresh:deploy` fails closed so a bad gate leaves the prior deployment live. Two gaps: the abort is silent (nothing writes to the Desktop `HEALTH-ALERT.txt` channel this machine already runs), and the GoAccess history resets whenever the edge Caddy container is recreated, which `deploy:vps` does on every deploy.

**Release provenance is structurally capped.** Live `/status.json` reports 60 releases: 31 checksum-backed, 29 unsigned, 0 attested. GitHub Artifact Attestations are free for public repos on Free/Pro plans but are produced by `actions/attest-build-provenance` inside a GitHub Actions workflow, which repo policy forbids. The `attested` tier the trust surface publishes is therefore unreachable by construction. The honest closure is checksums on the remaining 29, not attestation.

## Architecture Assessment

**Boundaries that hold.** The split between `src/data/catalog-render.ts` (shared ranking, freshness and view state) and the two rendering surfaces is sound and test-enforced; the homepage preview and `/catalog/` cannot drift. `src/data/identity.ts` as the single source for tenure and contact address, with a consistency test forbidding divergent literals, is the right pattern and is worth extending rather than replacing.

**Refactor candidates.**

- `scripts/fix-html-structure.mjs:62-89` — `inspectHtml()` should key its ordering guard on `/scripts/shared.js` (the real dependency) instead of the deleted `main.js`, and `public/scripts/cmdk.js:39` should fail loudly rather than degrading to `{}`.
- `scripts/audit-dependencies.mjs` — strict mode needs a second failure class for first-party production dependencies that are more than one minor behind, or the freshness report stays advisory for exactly the packages that matter.
- `scripts/audit-catalog.mjs` — the fail-closed behaviour is correct but conflates two questions: "is the catalog complete?" and "may we redeploy unchanged content with refreshed data?" Splitting those would end the recurring multi-day deploy freezes without weakening the completeness claim.
- `public/manifest.json:64` — the `Catalog` shortcut is described as "Open the full project catalog" but targets `/?source=pwa#catalog`, which since the v0.26.0 split is the 84-item preview slice. `/catalog/` is the full list.

**Documentation and metadata gaps.**

- GitHub repository metadata is stale: `description` reads "Personal portfolio and project showcase site hosted on GitHub Pages" and `homepageUrl` is `https://sysadmindoc.github.io/`, both superseded on 2026-07-28.
- `git tag` stops at v0.42.0. v0.42.1, v0.42.2 and v0.42.3 all shipped untagged, against the tagging rule the project wrote for itself after backfilling v0.31.0–v0.38.0 on 2026-08-20.
- `Roadmap_Blocked.md` still carries a P0 naming eleven uncataloged repos that were cataloged across v0.42.1–v0.42.3; the live blockers are `GLP-Ultra` and `HubSpot-Ticket-Refined`.

**Test gaps.** 257 tests pass and coverage is unusually broad, but nothing plants a violation and proves a gate can fail. All three inert mechanisms above pass their own tests: `test/html-structure.test.mjs` exercises `inspectHtml` with synthetic fixtures containing `main.js`, so the guard is green while being unreachable in production. A self-test that injects a real violation into a real built page is the missing layer. There is also no validation of `/resume.json` against the published `@jsonresume/schema` package, and no test asserting the PWA shortcut targets resolve to the routes their descriptions claim.

## Rejected Ideas

- **Migrate to Astro's native `security.csp`** (source: Astro configuration reference, re-verified 2026-09-04) — still meta-only, no header emission, no way to suppress the injected meta tag; adopting it produces a second intersecting policy. The 2026-08-20 decision stands.
- **Cross-document view transitions** (source: Interop 2026 focus areas) — already shipped; `src/styles/layers/foundation.css:9` declares `@view-transition { navigation: auto; }` with a reduced-motion guard.
- **Upgrade Pagefind** (source: `CloudCannon/pagefind` releases) — 1.5.2 is current; there is no 1.6 or 2.0.
- **Custom Pagefind result UI** (source: `Roadmap_Blocked.md` P3) — no UX complaint exists and the corpus tests already cover the relevance concern it was raised for.
- **i18n / l10n** (source: repo scope) — one author, one language, a US client base, and no evidence of non-English demand. Adding locale infrastructure would multiply every one of the ~30 gates for zero measured benefit.
- **Astro Actions, Sessions, or Server Islands** (source: Astro 7.x changelog) — all require SSR; the site is fully prerendered by design and its whole security posture depends on that.
- **JSON Resume migration** (source: jsonresume.org/schema) — `/resume.json` already emits the v1.0.0 shape with the correct `$schema` pin.
- **Third-party analytics of any kind** (source: `CLAUDE.md` traffic-reporting decision, GoAccess comparison) — the site publicly claims no analytics runtime; adding one would make its own copy false, and GoAccess already answers the question.
- **Hosted metric or badge cards** (source: `github-readme-stats` deprecation, 2026-06-30) — the render-host model is being abandoned upstream and contradicts the committed-static-asset approach that already won here.
- **`FAQPage` schema work** (source: Google retired FAQ rich results 2026-05-07) — the markup is now inert. Visible answer-first copy under question-form headings is what AI Overviews and AI Mode actually cite.
- **Blocking AI crawlers** (source: `public/robots.txt`) — deliberate policy, and the file already documents how to reverse it if that changes.
- **Optimising the build** (source: measured 2026-09-04) — `npm run build` completes in 18.5 seconds for 21 pages, with Astro rendering in 4.97s, on a warm `node_modules` and warm generated-data caches. A cold run costs the network fetch, not the render. There is nothing here to win.

**Categories consciously excluded, with reasoning.** *Plugin ecosystem*: the site has no third-party extension surface and adding one would contradict the zero-third-party posture. *Multi-user*: single author, no accounts, no writes; the only inbound write path under consideration is the intake form, which is one-way. *Mobile*: no defect found — the Playwright baselines cover mobile widths on every public route, the 2026-08-21 sweep covered 84 views across both themes and both target widths, and the responsive layout is already the constraint the design system is built around. *Offline and resilience*: `public/sw.js` with navigation preload, a hash-pinned `public/offline.html`, and `test/offline-fallback.test.mjs` plus `tests/playwright/sw-lifecycle.spec.mjs` already cover this; the SW update UX is a deliberate non-silent toast that `PERFORMANCE_AUDIT.md` names as a contract to preserve. *Migration paths*: not applicable — the site publishes no user data and stores nothing in a browser beyond a theme preference.

## Sources

Framework and dependencies
- https://github.com/withastro/astro/blob/main/packages/astro/CHANGELOG.md
- https://docs.astro.build/en/reference/configuration-reference/#experimentalcsp
- https://docs.astro.build/en/reference/experimental-flags/incremental-build/
- https://github.com/vercel/satori/releases
- https://github.com/CloudCannon/pagefind/releases
- https://github.com/apostrophecms/sanitize-html
- https://github.com/dequelabs/axe-core/releases
- https://nodejs.org/en/blog/vulnerability/july-2026-security-releases
- https://endoflife.date/nodejs

Web platform and standards
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Speculation-Rules
- https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API
- https://developer.chrome.com/docs/web-platform/implementing-speculation-rules
- https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt
- https://developer.chrome.com/blog/ai-webmcp-origin-trial
- https://www.infoq.com/news/2026/06/webmcp-web-agent-standard-chrome/
- https://www.spronta.com/blog/state-of-webmcp-july-2026/
- https://web.dev/blog/interop-2026
- https://webkit.org/blog/17818/announcing-interop-2026/
- https://github.com/web-platform-tests/interop/blob/main/2026/README.md

Security and supply chain
- https://github.com/caddyserver/caddy/releases
- https://github.com/caddyserver/caddy/security/advisories
- https://www.zscaler.com/blogs/security-research/shai-hulud-v2-poses-risk-npm-supply-chain
- https://unit42.paloaltonetworks.com/npm-supply-chain-attack/
- https://www.nodejs-security.com/blog/hardening-your-npm-pnpm-config-for-shai-hulud
- https://craigory.dev/blog/2026-05-29/package-manager-release-cooldown/
- https://docs.github.com/en/actions/concepts/security/artifact-attestations
- https://github.com/actions/attest-build-provenance

Comparables and ecosystem
- https://tools.simonwillison.net/
- https://github.com/manuelernestog/astrofy
- https://jsonresume.org/schema
- https://docs.rxresu.me/guides/json-resume-schema
- https://github.com/altcha-org/altcha
- https://trycap.dev/guide/alternatives/altcha
- https://privatecaptcha.com/blog/self-hosted-captcha-comparison/
- https://goaccess.io/
- https://opensource-analytics.com/log-file-analytics-with-goaccess/

Discovery and measurement
- https://www.corewebvitals.io/core-web-vitals
- https://citemetrix.com/state-of-ai-search-2026/
- https://www.5wpr.com/research/state-of-ai-citations-2026/

Live evidence gathered 2026-09-04
- https://portfolio.getparkerai.com/status.json
- https://portfolio.getparkerai.com/ (response headers)

## Open Questions

1. Should `catalog:audit` keep blocking the whole deploy, or block only the catalog-completeness claim while allowing a data-refresh redeploy of unchanged content? This is a policy call about what the site's own completeness claim means, and it decides whether the fourth deploy outage is the last one.
2. What notification channel should the intake form write to? The engineering options are settled (a self-hosted ntfy container, or an SMTP relay through the existing mailbox); the choice, and the response-time promise the page would then be making, are not.
3. Are the 29 unsigned releases worth backfilling with checksums, or should the `attested` tier simply be removed from the published provenance model given that repo policy forbids the only mechanism that produces it?
4. Is `GLP-Ultra` and `HubSpot-Ticket-Refined` portfolio material, or `catalog-policy.json` exclusions? Only the owner can decide how each is publicly framed.
