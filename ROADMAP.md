# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

## Research-Driven Additions

Added 2026-08-20 from the research pass recorded in RESEARCH.md.

### P0

### P1

- [ ] P1 — Add a first-party intake form + VPS endpoint (moved from Roadmap_Blocked; blocker dissolved)
  Why: Mailto-only CTAs forfeit the entire speed-to-lead advantage (~78% of B2B buyers choose the first responder); the July blocker — third-party form backends conflicting with the privacy posture — is obsolete now that the owned VPS can host the endpoint with zero third parties.
  Evidence: Roadmap_Blocked.md P1 (2026-07); `src/pages/ai.astro:164,273` and `index.astro` `#connect` are mailto-only; RESEARCH.md "Competitive Landscape" speed-to-lead sources; ALTCHA (https://altcha.org/) for third-party-free spam defense.
  Touches: a small single-binary handler (Go or Node) in `deploy/vps/` compose (POST validate → honeypot + minimum-time + ALTCHA → SMTP or ntfy notify), Caddy `handle /api/contact` route + `mholt/caddy-ratelimit` on that path only, a shared form component used on `/ai/` and `#connect` (native POST, degrades to mailto without JS), CSP `form-action` in `src/layouts/Base.astro` + `scripts/audit-csp.mjs`, qualification fields (multiple-choice budget/timeline, free-text problem, contact last), visible "reply within one business day" promise, tests (noscript fallback, CSP audits, endpoint smoke).
  Acceptance: Submitting the form on the live site with JS and without JS delivers the lead to the owner with no third-party request anywhere in the flow; CSP/bundle/csp:audit gates stay green; spam probes are dropped by honeypot/ALTCHA; rate limit returns 429 under abuse.
  Complexity: L

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

- [ ] P2 — Harden the sanitize-html call sites and settle its maintenance story
  Why: The upstream GitHub repo is archived, but patches still ship to npm (2.17.7 landed 2026-08-13, five months after the archive), so the package is neither healthy nor abandoned. It sits on the feed/README sanitization path and deserves a tightened allowlist plus a decision recorded once, rather than a re-investigation every audit.
  Evidence: `gh api repos/apostrophecms/sanitize-html` → `archived: true`, `pushed_at: 2026-02-26`; `npm view sanitize-html time` → `2.17.7: 2026-08-13`; usage in `src/pages/atom.xml.ts` and README excerpt sanitization; RESEARCH.md security section (corrected 2026-08-20).
  Touches: enumerate every call site and pin build-time-only usage in a test; tighten `allowedSchemes` and URI-carrying attributes (`href`, `src`, `action`, `formaction`, `poster`, `data`); establish who publishes the npm releases now; record the keep-or-migrate decision (DOMPurify+jsdom is the migration target if it comes to that).
  Acceptance: Call sites enumerated and asserted build-time-only; tightened allowlist ships with no output diff on current feed data; the maintenance decision is written down with its evidence so the next audit doesn't redo it.
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
