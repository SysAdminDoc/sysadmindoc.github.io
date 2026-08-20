# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

## Research-Driven Additions

Added 2026-08-20 from the research pass recorded in RESEARCH.md.

### P0

- [ ] P0 — Automate the generated-data refresh and VPS redeploy loop
  Why: The deployed site froze at 2026-07-28 — generated data is ~23 days old against the 36-hour contract because nothing schedules `fetch-stars`/`profile-feed:sync`/`deploy:vps`; the trust surface degrades silently whenever work pauses.
  Evidence: Live `status.json` shows `fetchedAt: 2026-07-28T03:02:45Z` on 2026-08-20; `src/data/generated-trust.ts:1` (`GENERATED_DATA_MAX_AGE_HOURS = 36`); no scheduler in repo or docs; RESEARCH.md "Security, Privacy, and Reliability".
  Touches: new `scripts/refresh-and-deploy.mjs` orchestrator (fetch-stars → profile-feed:sync → deploy:preflight → deploy:vps, with failure log + non-zero exit), a registered Windows Scheduled Task on the build machine (documented in CLAUDE.md), `package.json`.
  Acceptance: A scheduled run refreshes caches and redeploys unattended when preflight passes; a failed run leaves the last good deploy in place and records why; live `status.json` `fetchedAt` stays under 36h across a week without manual action.
  Complexity: M

- [ ] P0 — Compute /status/ staleness at view time, not build time
  Why: `status.astro` bakes `ageHours`/`stale` tones at build, so the live page reported "stale: false" while 23 days old — the trust surface lies exactly when it matters.
  Evidence: `src/pages/status.astro:75,110` (build-time `new Date()` and frozen `generatedData.ageHours`); live `status.json` observed 2026-08-20 with `ageHours: 11.07`.
  Touches: `src/pages/status.astro`, a small `public/scripts/` view-time age updater (CSP-clean, SafeDOM), `src/pages/status.json.ts` (document that consumers must derive age from `fetchedAt`/`generatedAt`, or add a `computedAt` field), `test/generated-data-trust.test.mjs`.
  Acceptance: With JS, `/status/` age and stale tones reflect the viewer's clock against `fetchedAt` (build-time values remain the no-JS fallback and are labeled "as of build"); a Playwright check with a mocked old build shows the stale tone.
  Complexity: S

- [ ] P0 — Gate live response status codes in smoke:live
  Why: A live probe on 2026-08-20 confirmed missing paths correctly return HTTP 404 today, but nothing in the suite asserts any response status code — a Caddy `handle_errors` config regression to soft-404s (a known footgun in rewrite-based error handling) would ship silently and hurt crawlers.
  Evidence: Live probe `curl -sI https://portfolio.getparkerai.com/definitely-not-a-real-page/` → 404 (2026-08-20); `scripts/smoke-live-site.mjs` contains no status-code assertion for missing paths; `tests/playwright/state-coverage.spec.mjs:94` checks rendering only.
  Touches: `scripts/smoke-live-site.mjs` (assert a nonsense path returns 404 with the 404 page body, and spot-check 200 on key routes), optionally `deploy/vps/Caddyfile` comment documenting why the handle_errors block preserves the status.
  Acceptance: `npm run smoke:live` fails if a missing path ever returns a non-404 status, and passes against the current live origin.
  Complexity: S

- [ ] P0 — Upgrade Caddy containers from 2.8-alpine to 2.11-alpine
  Why: 2.8-alpine is three minors behind; 2026 fixes it lacks include CVE-2026-27585 (path-matcher backslash bypass) and CVE-2026-27586 (mTLS fail-open), plus a header-injection escalation fixed in 2.11.2, and the frozen tag means an unpatched Alpine base.
  Evidence: `deploy/vps/docker-compose.yml` (`caddy:2.8-alpine`); https://github.com/caddyserver/caddy/releases (2.11.2, 2026-03-06); RESEARCH.md "Security, Privacy, and Reliability".
  Touches: `deploy/vps/docker-compose.yml`, VPS pull/restart via `deploy:vps` docs; flag the edge proxy Caddy (Contabo-VPS-Ops repo) for the same bump in that repo's notes.
  Acceptance: `docker image inspect` on the VPS shows a 2.11.x static container, `smoke:live` passes with all edge headers intact, and CLAUDE.md records the version.
  Complexity: S

- [ ] P0 — Bump satori to 0.29.1+ for the SSRF-guard security patch
  Why: Lockfile pins satori 0.29.0; 0.29.1 (2026-08-19) hardens the SSRF guard against trailing dots, redirects, and DNS rebinding — low exploitability at build time, but it is a security patch on a rendering dependency.
  Evidence: `package-lock.json` (`satori 0.29.0`); https://github.com/vercel/satori/releases (0.29.1–0.32.0, 2026-08-19/20).
  Touches: `package.json`, `package-lock.json`; rerun `og-cards:audit` + visual baselines to confirm identical output (or adopt 0.32.0 if card styling benefits).
  Acceptance: `npm ls satori` shows ≥0.29.1, `npm run build:ci` passes including the OG raster gate, `deps:audit` stays green.
  Complexity: S

### P1

- [ ] P1 — Add a first-party intake form + VPS endpoint (moved from Roadmap_Blocked; blocker dissolved)
  Why: Mailto-only CTAs forfeit the entire speed-to-lead advantage (~78% of B2B buyers choose the first responder); the July blocker — third-party form backends conflicting with the privacy posture — is obsolete now that the owned VPS can host the endpoint with zero third parties.
  Evidence: Roadmap_Blocked.md P1 (2026-07); `src/pages/ai.astro:164,273` and `index.astro` `#connect` are mailto-only; RESEARCH.md "Competitive Landscape" speed-to-lead sources; ALTCHA (https://altcha.org/) for third-party-free spam defense.
  Touches: a small single-binary handler (Go or Node) in `deploy/vps/` compose (POST validate → honeypot + minimum-time + ALTCHA → SMTP or ntfy notify), Caddy `handle /api/contact` route + `mholt/caddy-ratelimit` on that path only, a shared form component used on `/ai/` and `#connect` (native POST, degrades to mailto without JS), CSP `form-action` in `src/layouts/Base.astro` + `scripts/audit-csp.mjs`, qualification fields (multiple-choice budget/timeline, free-text problem, contact last), visible "reply within one business day" promise, tests (noscript fallback, CSP audits, endpoint smoke).
  Acceptance: Submitting the form on the live site with JS and without JS delivers the lead to the owner with no third-party request anywhere in the flow; CSP/bundle/csp:audit gates stay green; spam probes are dropped by honeypot/ALTCHA; rate limit returns 429 under abuse.
  Complexity: L

- [ ] P1 — Restore the cache headers lost in the Pages→VPS migration
  Why: `endpoint-headers.ts` declares `public, max-age=86400` for generated images, but static output drops endpoint headers and the internal Caddyfile's cache matcher covers only 12 machine endpoints — OG PNGs and hashed `/_assets/*` (where `immutable` is free) ship with no Cache-Control.
  Evidence: `src/data/endpoint-headers.ts:8`; `deploy/vps/Caddyfile` `@cache600` matcher list; live header probe 2026-08-20 (no Cache-Control on `/`).
  Touches: `deploy/vps/Caddyfile` (add `/og.png`, `/og/*` → max-age=86400; `/_assets/*` → `public, max-age=31536000, immutable`; decide an explicit HTML policy, e.g. `max-age=0, must-revalidate`), `scripts/smoke-live-site.mjs` (assert the new header contract), `test/endpoint-header-contract.test.mjs`.
  Acceptance: Live probes show the declared Cache-Control on OG images, hashed assets, and HTML; `smoke:live` gates all three classes.
  Complexity: S

- [ ] P1 — Diagnose and fix the README cache coverage collapse
  Why: The live `/status/` publicly warns "README cache coverage is below 80%" — only 18 of 182 repos have cached READMEs, while `_readme-refresh.json` simultaneously claims `attempted: 182, missRate: 0, rateLimited: false`, an internal contradiction pointing at a counting or cache-write bug in the fetcher.
  Evidence: Live `status.json` (`readmeEntries: 18`, `cacheCoverage: 0.0989`, warning array); `src/data/_readme-refresh.json`; `scripts/fetch-stars.mjs` README refresh path; also `_profile-projects.json` internal `generatedAt: 2026-06-01` despite a 2026-07-28 sync — verify `sync-profile-feed.mjs` surfaces upstream-feed staleness instead of silently reusing it.
  Touches: `scripts/fetch-stars.mjs`, `scripts/sync-profile-feed.mjs`, `scripts/summarize-generated-data.mjs`, `test/generated-data-trust.test.mjs` (add a fixture reproducing attempted≫entries with missRate 0).
  Acceptance: A token-backed `npm run fetch-stars` yields README coverage ≥80% (or the summarizer correctly attributes why not, with `missRate`/`attempted` arithmetic that adds up), and the live `/status/` warning clears after the next deploy; upstream profile-feed staleness is reported, not masked.
  Complexity: M

- [ ] P1 — Bring /healthcare-it/ conversion parity with /ai/ and add data-boundary trust language
  Why: The two pages that exist to convert are asymmetric — `/ai/` has two primary prefilled-mailto CTAs, `/healthcare-it/` one secondary-styled anchor to `/#connect`; and healthcare buyers now run formal AI-vendor risk reviews the page never pre-answers (BAA willingness, PHI boundaries, training-data use).
  Evidence: `src/pages/healthcare-it.astro:95` vs `src/pages/ai.astro:164,273`; HSCC Third-Party AI Risk guide (2026-04) and Censinet checklist in RESEARCH.md; Fisher Phillips warning against overstated compliance claims.
  Touches: `src/pages/healthcare-it.astro` (primary CTA with prefilled subject; a short "Data boundaries" block: signs BAAs, PHI stays in the client boundary, no client data in model training, no multi-tenant LLM APIs for PHI workloads — no certification claims), `src/data/curated.ts`, visual baselines, schema audit if FAQ answers change.
  Acceptance: `/healthcare-it/` has a primary CTA equivalent to `/ai/`'s and a visible data-boundary section making the four commitments above; axe/visual/schema audits stay green.
  Complexity: S

- [ ] P1 — AEO refresh: shift FAQ investment from schema to visible answer quality
  Why: Google retired FAQ rich results 2026-05-07 (Search Console API support ends 2026-08), so the v0.37 FAQPage markup is inert; citations now follow visible 50–150-word answers under question-form headings and passage-level specificity, with ranking no longer predicting citation (62% of AI Mode citations come from outside the top 10).
  Evidence: https://seoscore.tools/blog/faq-schema-markup/, https://www.quattr.com/blog/faq-schema-in-2026, https://www.shadow.inc/resources/google-ai-mode-citations; `src/pages/ai.astro` / `healthcare-it.astro` FAQ arrays.
  Touches: FAQ answer copy in `src/pages/ai.astro` and `src/pages/healthcare-it.astro` (audit each answer to 50–150 words, question-form H2/H3, answer-first first sentence; keep the existing schema — harmless), `page-freshness.ts` reviewed dates, schema audit expectations.
  Acceptance: Every published FAQ answer is 50–150 words with an answer-first opening sentence; schema audit passes unchanged; reviewed dates bump so freshness signals update.
  Complexity: S

### P2

- [ ] P2 — GoAccess over the edge Caddy JSON logs for first-party traffic visibility
  Why: The site has zero visibility into whether `/ai/` gets any traffic, which gates every funnel decision; the edge already writes JSON access logs, and GoAccess reads them server-side with no client script, no cookies, and IP anonymization — consistent with the no-analytics-runtime posture.
  Evidence: `deploy/vps/caddy-block.txt` (`log` → `/var/log/caddy/portfolio.log`); https://goaccess.io/ CADDY log-format support; analytics comparison in RESEARCH.md (Plausible/Umami rejected).
  Touches: VPS-side: GoAccess container or cron in `deploy/vps/` docs, log rotation check, output as a static HTML report served on an authenticated/obscured path (not linked publicly); repo-side: document the runbook in CLAUDE.md.
  Acceptance: A daily-refreshed GoAccess report over anonymized logs is reachable by the owner; no page payload, script, or cookie changes on the public site.
  Complexity: M

- [ ] P2 — Upgrade Astro 7.1.3 → 7.2.x and evaluate incremental builds
  Why: 7.2 (2026-08-06) adds `experimental.incrementalBuild` — a content site with mostly-unchanged prerendered routes is the ideal case and would cut the (soon-scheduled) rebuild loop's cost; staying current also keeps ahead of Astro's 2026 advisory cadence.
  Evidence: https://astro.build/blog/astro-720/; `package.json` (`astro ^7.1.3`).
  Touches: `package.json`/lockfile, `astro.config.mjs` (flag evaluation, measure with/without), `deps:audit` expectations.
  Acceptance: Build and full `build:ci` pass on 7.2.x; incremental build measured and either adopted (with timing noted in CLAUDE.md) or declined with the measured reason.
  Complexity: S

- [ ] P2 — Contain and plan the exit from archived sanitize-html
  Why: Upstream was archived 2026-02-26; installed 2.17.6 has all 2026 CVE fixes but will never get another patch, and it sits on the feed/README sanitization path.
  Evidence: https://github.com/apostrophecms/sanitize-html (read-only); usage in `src/pages/atom.xml.ts` and README excerpt sanitization; RESEARCH.md security section.
  Touches: audit every call site to confirm build-time-only over reviewed input; tighten `allowedSchemes` and URI-carrying attributes now; add a `deps:audit` note marking the package frozen-by-policy; document the DOMPurify+jsdom migration sketch in this item for when it's scheduled.
  Acceptance: Call sites enumerated and confirmed build-time-only in a test; tightened allowlist ships without output diffs on current data; `deps:audit` documents the hold so strict mode doesn't nag.
  Complexity: M

- [ ] P2 — AI-build colophon page (Willison pattern) scaffolded from public data
  Why: For a portfolio selling AI implementation, a colophon showing how the 22 live apps were actually built (commits, cadence, tooling, AI assistance disclosed) is proof-of-competence, marketing, and an honesty signal in one page — the strongest differentiator surfaced by the landscape research that isn't blocked on long-form human writing.
  Evidence: https://tools.simonwillison.net/colophon and https://simonwillison.net/2025/Mar/13/tools-colophon/; hiring-signal sources in RESEARCH.md (reviewers inspect commit history to distinguish real building from AI output).
  Touches: `npm run scaffold:route -- colophon` + the registration surfaces it names, a build-time generator deriving per-app records from existing `_meta.json`/`_releases.json`/`_stats.json` (first/last commit, release count, stack), a short `aiAssistance` note field in `src/data/projects.ts` per live app (one factual sentence each, owner-reviewable), Pagefind/sitemap/OG registration, tests.
  Acceptance: `/colophon/` renders a per-live-app provenance table from generated data plus the disclosure notes, passes all route audits, and is linked from the footer and `/ai/` proof block.
  Complexity: M

- [ ] P2 — Restore release tagging and tag the untagged releases
  Why: Git tags stop at v0.30.0 while v0.31–v0.39 shipped via CHANGELOG/package.json only — release archaeology and any tag-based tooling silently broke.
  Evidence: `git tag` output vs CHANGELOG.md v0.31.0–v0.39.0 entries; release commits f460da8 (v0.37.0), 27f6cfa (v0.38.0), 9baa2c6 (v0.39.0).
  Touches: annotated tags on the nine release commits (from CHANGELOG dates), push tags; add a tag step to the release routine in CLAUDE.md.
  Acceptance: `git tag` lists v0.31.0 through v0.39.0 on the correct commits, tags are pushed, and the release procedure documents tagging.
  Complexity: S

- [ ] P2 — Fix stale current-state claims in decision records
  Why: `IMAGE_PIPELINE.md` claims the v0.23-deleted `projects/[slug].astro` route still consumes masters and counts 10 interior OG pages (actual: 12); `PERFORMANCE_AUDIT.md` reports results for the removed `/projects/project-nomad-desktop/` — future agents will act on these as current.
  Evidence: `IMAGE_PIPELINE.md:30`, `PERFORMANCE_AUDIT.md:51`, `src/data/interior-og-pages.ts` (12 slugs).
  Touches: both decision records (mark historical claims as history, correct counts); re-run `audit:perf` to refresh the results table with current routes.
  Acceptance: No decision record describes a removed route in present tense; interior OG count matches source; performance table lists only live routes.
  Complexity: S

- [ ] P2 — Cover the untested runtime scripts and the cmdk-data endpoint
  Why: `scroll-reveal.js`, `relative-time.js`, and `screenshots-page.js` have zero test references, and `/cmdk-data.js` — the largest payload, loaded on every page — is referenced by one test; regressions there ship silently.
  Evidence: Recon cross-reference of `public/scripts/*` and endpoints vs `test/`/`tests/` (RESEARCH.md "Architecture Assessment"); `src/pages/cmdk-data.js.ts`.
  Touches: new `test/*.test.mjs` for relative-time formatting and cmdk-data shape/size budget; a Playwright assertion for scroll-reveal (reduced-motion honored) and screenshots-page filtering; also tie `public/offline.html`'s hardcoded style hashes to `Base.astro`'s in a test (drift trap).
  Acceptance: Each named script/endpoint has at least one meaningful assertion; offline-hash drift fails a test; suite time stays reasonable.
  Complexity: M

### P3

- [ ] P3 — Publish a deliberate AI-crawler policy in robots.txt
  Why: The current robots.txt is allow-all by default rather than by decision; a site selling AI services wants answer-engine and agent bots (citations) while the owner may want training-only bots excluded — either way the policy should be explicit and documented.
  Evidence: `public/robots.txt` (allow-all, 153 bytes); https://github.com/ai-robots-txt/ai.robots.txt taxonomy; llms.txt adoption evidence in RESEARCH.md.
  Touches: `public/robots.txt` (explicit sections: allow search/answer/agent bots; owner-decided stance on training-only crawlers), a sentence on the colophon page documenting the policy, `test/` robots assertion if one exists.
  Acceptance: robots.txt enumerates bot classes deliberately with a comment linking the policy rationale; the colophon states it in one line.
  Complexity: S

- [ ] P3 — Evaluate Astro native CSP against the hand-rolled meta-CSP pipeline
  Why: `security.csp` is stable and emits the same meta-tag-with-hashes the repo hand-builds, which could retire several bespoke audit scripts — but the current system works, is heavily test-pinned, and handles the CRLF subtlety, so this is an evaluation, not a migration mandate.
  Evidence: https://docs.astro.build/en/reference/experimental-flags/csp/ (stable guide); `scripts/audit-csp.mjs` + `test/csp-audit.test.mjs` (the largest test).
  Touches: a spike branch enabling `security.csp` with `styleDirective`/`scriptDirective` hashes for the hand-authored inline content; diff the emitted policy against the current one; write the adopt/decline decision into SEARCH_DECISION-style record or CLAUDE.md.
  Acceptance: A documented decision with the emitted-policy diff attached; if adopted, the bespoke hash-generation path is removed with all CSP tests green; if declined, the reason is recorded so it isn't re-investigated.
  Complexity: M

- [ ] P3 — Small hygiene sweep: dead export, vestigial build step, LHCI decision
  Why: `filterLabelByKey` has zero consumers; `scripts/fix-html-structure.mjs` is a self-described "Historical Astro 6 guard" still running every build; LHCI is advisory-only (all `warn`) sampling 2 of 16 routes while the a11y gate blocks — each is small, but all three are standing confusion for future agents.
  Evidence: `src/data/catalog-render.ts:87`; `scripts/fix-html-structure.mjs` header comment; `lighthouserc.cjs` (12 warn-only assertions, 2 URLs).
  Touches: delete the export (+ any type residue); either remove fix-html-structure with its test or re-comment it as a cheap permanent guard (decide once); either add 2–3 more LHCI routes and promote CWV assertions to `error`, or record in CLAUDE.md that LHCI is deliberately advisory; also give `public/offline.html` a dark `theme-color` alternate (`media="(prefers-color-scheme: dark)"`) so dark-mode users don't get a light flash on the offline fallback.
  Acceptance: No unused export; the vestigial step is removed-or-justified in place; the LHCI stance is explicit in config comments or CLAUDE.md; offline.html declares both theme-color variants and `offline-fallback.test.mjs` stays green.
  Complexity: S

- [ ] P3 — First-party CSP report endpoint on the VPS (rides the intake handler)
  Why: The Reporting API was parked because the static site had no report sink; the intake-form handler (P1) gives it one for near-zero marginal cost, turning silent CSP breakage in the field into a signal.
  Evidence: Roadmap_Blocked.md P0 resolution note (2026-07-28) parking `Reporting-Endpoints`/`report-to`; the P1 intake endpoint above.
  Touches: the P1 handler binary (accept `application/reports+json` on `/api/reports`, log-rotate to disk), edge `Reporting-Endpoints` header in `deploy/vps/caddy-block.txt`, CSP `report-to`/`report-uri` addition, `smoke:live` header assertion.
  Acceptance: A deliberate CSP violation in a test page produces a stored report on the VPS; headers verified by `smoke:live`; no third-party involved.
  Complexity: S (after P1 intake endpoint lands)
