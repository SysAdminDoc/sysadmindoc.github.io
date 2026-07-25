# Research — sysadmindoc.github.io
Date: 2026-07-25 — replaces all prior research.
Repo version at time of research: v0.28.0. **Live site at time of research: v0.26.3.**

## Executive Summary

A static Astro 7.1.3 portfolio and public project archive for Matt Parker (SysAdminDoc), built locally and published to GitHub Pages via a `gh-pages` branch. Its engineering posture is unusually strong for a personal site: 20 `scripts/audit-*.mjs` gates, 196 passing node tests, Playwright interaction/visual/service-worker/search-corpus suites, `script-src 'self'` with Trusted Types, zero runtime frameworks, and `npm audit` clean on both prod and dev trees. Every direct dependency is on its latest published version except TypeScript (blocked on TS7) — there is no dependency-drift work to do this pass.

The previous research pass (2026-07-25, v0.27.0) read code. **This pass probed production, and that is where everything important came from.** The site's problem is no longer what is built — it is that what is built is not live. `https://sysadmindoc.github.io/status.json` reports `version: "0.26.3"`, commit `501cf88`, generated `2026-07-25T00:05:16Z`. Two complete release cycles — the v0.27.0 audit and the v0.28.0 roadmap drain — exist only on `main`. The live `/ai/` page has no `Service` schema. The live `/screenshots/` page has no footer, so it has no contact affordance. The live service worker is `portfolio-v0.26.3`. Eighteen commits across 64 files (+2,762 / −1,161) are invisible to actual visitors, and nothing in the repo surfaces that gap.

Top opportunities, priority order:

1. **The live site is two releases stale and nothing detects it.** Verified by probing `/status.json`, `/sw.js`, `/ai/`, and `/screenshots/`. (Verified)
2. **Verification only runs inside the publish path.** `scripts/publish-pages.mjs:248` runs `smoke-live-site.mjs` after pushing, with a correct auto-derived version contract — but there is no way to ask "is live current?" without publishing. (Verified)
3. **The published `resume.pdf` renders with screen styles.** The `/resume/` print block loses on specificity to `interior-quiet.css`, so the site's primary hiring artifact ships a desktop two-column grid squeezed onto Letter. (Verified by print-media probe)
4. **The CSP build gate prints two violation classes and exits 0 on both** — blocked style attributes and disallowed external script origins. Nothing violates either rule today; the gate simply cannot fail on them. (Verified by reproduction)
5. **`experimental.clientPrerender` is dead configuration that still costs bundle weight.** `astro.config.mjs:36-44` sets `prefetchAll: false` with `defaultStrategy: 'hover'`, and zero `data-astro-prefetch` attributes exist in `src/` or `dist/` — so no link ever prefetches. The 2,807-byte prefetch runtime (`dist/_assets/page.BcFG7dWc.js`) still loads on 13 routes, and the inline `<script type="speculationrules">` it injects would be blocked by `script-src 'self'` regardless. (Verified)
6. **The sitemap publishes no `lastmod`** while 12 built pages already carry `dateModified` sourced from `src/data/page-freshness.ts`. (Verified)
7. **Playwright baselines are platform-blind**, which is the root cause of the two "requires Linux-generated baselines" blockers in `Roadmap_Blocked.md` rather than a separate problem. (Verified)
8. **Releases v0.26.1 through v0.28.0 have no git tags and no GitHub Releases**; remote tags stop at `v0.26.0`. (Verified)
9. **The `wcag22aa` axe tag contributes zero rules**, so the error/recovery states covered only by axe have no WCAG 2.2 coverage. (Verified)
10. **README.md documents an architecture the code no longer has** — and it is the only doc tracked in git. (Verified)

## Product Map

**Core workflows**
- Scan credibility fast: hero proof strip → Greatest Hits (curated repos with story-driven "why") → live-app evidence rail.
- Browse the archive: homepage preview slice (84 ranked) → `/catalog/` (all 178, client-side search/sort/filter, `cat=`/`q=`/`sort=`/`view=` URL state, no-JS reachable).
- Evaluate momentum: `/releases/` (60 cached releases with provenance tiers), `/timeline/` (232 filterable events), `/now/`.
- Hire or engage: `/resume/` (HTML + PDF + JSON Resume), `/healthcare-it/`, `/ai/` (retainer pitch, four productized service lines).
- Verify the site itself: `/status/` + `/status.json` (build identity, data freshness, coverage, release provenance).

**Personas**
1. Hiring manager / recruiter — scans for judgment and evidence over repo counts. 2026 hiring-signal sources converge on shipped-and-used projects and case-study depth as the differentiators.
2. Prospective retainer client (SMB owner or ops lead) — arrives at `/ai/`, needs credibility then a low-friction next step.
3. Peer developer — arrives from GitHub, uses `/catalog/`, `/search/`, feeds.
4. Machine consumers — AI answer engines, IDE agents, feed readers. Served by `/llms.txt`, 4 feeds, 3 JSON endpoints, JSON-LD.

**Platforms and distribution**
Static output → `gh-pages` branch via `npm run publish:pages`, gated by `deploy:preflight` and followed by an automatic live smoke check. Node 24 / npm 11. PWA with offline shell and full-route precache. No GitHub Actions by project policy — every build, test, and audit is local. GitHub Pages soft limits: 1 GB site, 100 GB/month bandwidth, 10 builds/hour.

**Key integrations and data flows**
GitHub REST API (build-time via `scripts/fetch-stars.mjs` → gitignored `_*.json` caches; client-side refresh for live star counts) → `src/data/portfolio.ts` (narrows the 186-row profile feed to the 178-project reviewed catalog) → `src/data/catalog-render.ts` (shared ranking/freshness) → homepage preview + `/catalog/`. `src/data/page-freshness.ts` is the single source of per-page review dates. Pagefind indexes built HTML post-build.

## Competitive Landscape

**Astrofy / Simple Portfolio / astro-portfolio (OSS Astro portfolio templates)**
Do well: fast setup, blog + CV + projects in one, i18n and theme toggles out of the box.
Learn: nothing structural. This repo is several categories of maturity beyond the template tier.
Avoid: Tailwind plus hydrated islands. The zero-runtime-framework posture (~69 KB of minified first-party JS, no hydration) is the site's clearest technical differentiator — and, per the 2026 Astro CVE analysis below, its strongest security property.

**fractional.ai and the fractional-AI consultancy tier (commercial)**
Do well: every service line is backed by a named, outcome-shaped case study rather than a capability list; engagement model and phases are stated before contact.
Learn: `/ai/` already states the engagement model (Discovery → Pilot → Retainer), which is ahead of most solo consultants. What it lacks is per-service proof. This is the same content the blocked "Expand project proof records" item would produce — the two needs are one need.
Avoid: opaque "contact us for pricing" with no anchor at all. 2026 market data puts fractional AI retainers at roughly $5k–$30k/month and SMB implementations at $10k–$15k, so a range is publishable without committing to a number.

**Google Search / AI answer engines (the actual distribution channel)**
Do well: reward explicit entity markup, question-shaped headings, and direct answers placed near the top.
Learn: the arXiv GEO analysis (2603.09296) finds *retrieval* failures dominate *ranking* failures — being findable and unambiguous beats being ranked. The site's `Organization` + `Person` + `Service`/`OfferCatalog` graph is exactly the right shape; the gap is prose structure on `/ai/`, whose headings are all statements ("What I deliver", "How the engagement works").
Avoid: `FAQPage` schema. Google stopped showing FAQ rich results on 2026-05-07 and ends Search Console support in 2026; adding it now buys nothing.

**Cloudflare (as a proxy, not a host)**
Do well: `_headers`-style edge injection of Permissions-Policy, COOP, and COEP.
Learn: the proxy variant in front of the existing GitHub Pages origin remains the only realistic unblock for the standing Permissions-Policy P0, and it preserves `publish:pages` and the `gh-pages` contract entirely.
Avoid: a full migration, and the assumption that HSTS is part of the prize — see below, it is already served.

**Pagefind 1.5.2 (incumbent)**
Do well: BM25 ranking, metadata-aware ranking, accessible web-component UI, offline-capable.
Learn: 1.5.2 is the current release; there is no 1.6. No action.
Avoid: replacing the component UI with a bespoke renderer for cosmetic gains — correctly parked in `Roadmap_Blocked.md`.

## Security, Privacy, and Reliability

**Correction to a standing blocked item: HSTS is already served.** `curl -I https://sysadmindoc.github.io/` returns `Strict-Transport-Security: max-age=31556952`. GitHub Pages sets it on `*.github.io`. The Permissions-Policy P0 in `Roadmap_Blocked.md` lists HSTS among the headers it would unblock; that part of its rationale is wrong and should be narrowed to Permissions-Policy, COOP, and COEP only.

**The 2026 Astro CVE class still does not apply, and the reason is architectural.** CVE-2026-41067 (`define:vars` XSS), CVE-2026-25545 (`@astrojs/node` SSRF), CVE-2026-45028 (server-island parameter replay), and CVE-2026-50146 (`client:*` slot-name XSS) all require SSR, adapters, server islands, or client directives. This repo is `output: 'static'` with none of those. Re-verified this pass; recorded so it is not re-litigated.

**The sharp libvips advisory is already satisfied.** GHSA-f88m-g3jw-g9cj (CVE-2026-33327/33328/35590/35591, two rated High) affects sharp before 0.35.0. Installed: 0.35.3, which the advisory names as the fixed version. `npm audit` and `npm audit --omit=dev` both report 0 vulnerabilities.

**A CSP that silently defeats a shipped optimization.** `experimental.clientPrerender: true` is enabled and Astro's prefetch runtime creates its speculation rules as an inline `<script type="speculationrules">` (`dist/_assets/page.BcFG7dWc.js`). The built CSP is `script-src 'self'` with no `'inline-speculation-rules'`, so Chromium would refuse it. This is not currently exploitable or even reachable — no link opts in — but it means the config and the policy disagree, and enabling one without the other produces a console violation on every hover.

**Platform ceiling (narrowed).** GitHub Pages serves no custom response headers, so Permissions-Policy, COOP, and COEP remain unreachable — and so does the Reporting API, because `Reporting-Endpoints` is header-only and reporting directives are ignored in `<meta>`-delivered CSP. That settles the standing client-side observability gap: an uncaught error in `public/scripts/home-catalog.js` on a real visitor's browser is still invisible to the maintainer, and on this host there is no first-party way to change that. See Rejected Ideas.

**The CSP gate detects two violation classes and then exits 0 on both.** `csp:audit:dist:style:elem` runs inside `build:ci`. `scripts/audit-csp.mjs:595-603` computes whether a style attribute needs `unsafe-inline` under the active `style-src-attr` — production ships `'none'` — but the result reaches only `console.log` at `:684`; the sole style-attr failure at `:791` is gated on a flag `build:ci` never passes. Separately, `:532-534` collect third-party external scripts and `:662` prints the count, but there is no script-source equivalent of the `styleLinkAllowedByCandidate()` helper at `:248`, so no external script origin is ever checked against `script-src 'self'`. Both were reproduced against a synthetic dist: the audit printed the violation and exited 0. Nothing is violating either rule today, so this is gate integrity rather than an active exposure — but it is precisely the failure mode the tool exists to prevent.

**Related, lower severity:** the runtime HTML-sink scan that decides Trusted Types readiness reads only `public/scripts` (`:496`, hardcoded) and is skipped in `--dist` mode, so `public/sw.js` and Astro-bundled component scripts are never scanned; three regex-parsing defects (an unguarded `style` branch that mirrors the `on*` bare-word bug fixed in v0.28.0, `>` inside quoted attribute values truncating a tag, and HTML comments not being stripped) each cause a missed violation; and source mode fabricates the policy rather than reading `Base.astro`. All are latent on the current tree — verified across 26 `.astro` and 22 built HTML files with zero hits.

**Missing guardrail: nothing knows the live site is stale.** The version contract is enforced correctly, but only as a post-publish step inside `publish:pages`. Between publishes there is no signal. Two releases of hardening work have now sat undeployed with every local gate green.

**Deploy path recovery has one unhandled state.** `scripts/publish-pages.mjs:193-215` handles an existing worktree and a non-worktree directory, but not a registered-but-missing one. `.tmp/` is gitignored scratch; deleting it leaves `gh-pages` registered to a path that no longer exists, and `git worktree add` then fails permanently with no `prune` or `--force` anywhere in the script. Reproduced in a scratch repo. Everything else in that script held up under audit: no force-push, worktree path confined under `.tmp`, dirty-tree and Pages-API guards, no token reachable from the published branch, and the stale-dist hole closed by `src/data/build-identity.ts:44-58` falling back to `git rev-parse HEAD`.

**Recovery and rollback.** Unchanged and sound: `gh-pages` rollback is `git revert` plus republish; generated `_*.json` caches are gitignored and re-fetchable; service-worker rollback rides the versioned cache key plus the update toast.

## Architecture Assessment

**Root cause of two blocked P2s: `snapshotPathTemplate` has no `{platform}` segment.** `playwright.audits.config.mjs` stores baselines at `{testDir}/__screenshots__/{projectName}/`, so a Linux-generated PNG and a Windows-generated PNG collide on the same path. That is why both CSS refactors in `Roadmap_Blocked.md` are blocked on "Linux-generated baselines" — the blocker is a path template, not a machine. Adding `{platform}` lets both sets coexist and converts both items from blocked to doable.

**`scripts/` is the largest untyped surface in the repo.** `tsconfig.json` includes only `src/**/*` and `.astro/types.d.ts`. `scripts/` is 40 files and ~10,500 lines, gates the entire build, and is never seen by `astro check`. `test/` (51 files, ~3,900 lines) is likewise excluded.

**Dependency freshness is measured but not gated.** `scripts/audit-dependencies.mjs` correctly flattens `overrides` and reports `vite 8.1.3 → 8.1.5 (latest-update)` and `fast-uri 3.1.4 → 4.1.1 (major-available)`, but it exits 0 on both and `deps:audit` is not part of `deploy:preflight`. Exact-pinned overrides are invisible to `npm outdated`, so this script is the only thing that can see them. (Vite 8.1.4/8.1.5 contain no security fixes — dev/SSR fixes only — so this is hygiene, not urgency.)

**Documentation drift, verified line by line.** `README.md:23` claims homepage and interior jump links share `SectionJumpNav`; `src/pages/index.astro` does not import it (eight interior routes do). `README.md:163` lists a "tag cloud" component that does not exist. The `src/pages/` tree in README omits six shipped routes, including the flagship `/ai/` and `/catalog/`. `CLAUDE.md` is worse — it lists `FeaturedCard`, `TagCloud`, and `scripts/generate-data.mjs`, none of which exist; points `legacy.html` at the repo root instead of `docs/archive/`; and still documents four homepage sections (About, Philosophy, Journey, Volume) that were deleted. README is the only one of these tracked in git.

**Test coverage gap with a misleading label.** In axe-core 4.12.1, `wcag22aa` maps to exactly one rule, `target-size`, and that rule is `enabled: false` by default — `withTags()` selects rules, it does not enable disabled ones. `tests/playwright/portfolio-audits.spec.mjs` compensates with its own `collectTargetSizeViolations` across 14 routes × 2 viewports, so the public routes are genuinely covered. `tests/playwright/state-coverage.spec.mjs:50-57` uses the same tag list with no hand-rolled equivalent, so the 404 page, offline shell, and open command palette have no SC 2.5.8 coverage while appearing to.

**The published resume PDF renders with screen styles.** `src/pages/resume.astro:157-179` writes its `@media print` rules with bare class selectors (`.resume-role`, specificity 0,1,0) while `src/styles/interior-quiet.css:86-102` styles the same elements as `body.route-interior .resume-role` (0,2,1). Specificity decides, so nearly the whole print block loses; only the `!important` declarations and one heading rule survive. Confirmed with a Chromium print-media probe against built `dist/resume/index.html`: page padding stays `104px 32px 56px` against a requested `0`, `h1` stays 48px against 24pt, section headings stay `rgb(31,95,204)` against `#111`. Because `scripts/generate-resume-pdf.mjs` uses `page.pdf()`, which applies print media, this reaches the tracked `dist/resume.pdf` — the site's primary hiring artifact. A second print defect compounds it: `src/styles/global.css:3357` expands `a[href^="http"]::after` with the href, so the Links section prints each URL twice.

**Two endpoint contracts contradict each other.** `scripts/audit-public-endpoints.mjs:9,26` asserts `application/feed+json; charset=UTF-8` and `public, max-age=300` for `/feed.json`. Astro's static build discards endpoint `Response` headers, and GitHub Pages serves `application/json; charset=utf-8` with `max-age=600` — which `scripts/smoke-live-site.mjs:190-231` already encodes correctly. Eleven pinned expectations describe headers that cannot exist. The same script also never parses `dist/rss.xml`, `dist/releases.xml`, or `dist/resume.json`; for those routes it only checks that the source file imports the header helper, so an empty body would ship green.

**Data layer remains healthy.** `catalog-render.ts` (ranking/freshness), `github.ts` (URL construction), `release-summary.mjs` (idempotent normalization), `page-freshness.ts` (review dates), and the new `Footer.astro` / `identity.ts` consolidation are all single-source. The `.mjs`-in-`src/data/` pattern for logic shared between build scripts and Astro pages is sound and should stay the default.

**Entity modelling nit.** `Person.url` is `https://github.com/SysAdminDoc` while the node's `@id` is `https://sysadmindoc.github.io/#matt-parker` and GitHub already appears in `sameAs`. A knowledge-graph consumer resolves the entity's canonical page off-site.

## Rejected Ideas

- **Self-hosted analytics (Plausible CE / Matomo).** Contradicts the shipped `/status/` promise ("no runtime analytics") and would widen `connect-src`. If conversion measurement becomes necessary, change the promise deliberately first. *Source: repo philosophy; self-hosted-analytics research.*
- **Third-party form backend (Web3Forms / Formspree).** Requires relaxing `form-action 'self'` and adds a vendor to the trust boundary; the `mailto:` CTA works. *Source: static-form-service research.*
- **Client-side error monitoring SaaS (Sentry / TrackJS).** Same CSP and third-party objections as analytics. *Source: error-monitoring research.*
- **Reporting API / `ReportingObserver` for first-party error observability.** Reached Baseline in March 2026 and would be the privacy-clean answer, but `Reporting-Endpoints` is an HTTP response header and reporting directives are ignored in `<meta>`-delivered CSP — both unavailable on GitHub Pages. A `ReportingObserver` with no endpoint can only log to console. Blocked by the same ceiling as Permissions-Policy; do not re-investigate separately. *Source: MDN Reporting API.*
- **`FAQPage` structured data.** Google stopped serving FAQ rich results on 2026-05-07 and is retiring Search Console and Rich Results Test support through 2026. The vocabulary is not deprecated and harms nothing, but adding it now returns nothing. *Source: Google Search Central updates.*
- **`ProfessionalService` schema type.** Deprecated as a general local-business type due to confusion with `Service`; the current `Person` + `Service` + `OfferCatalog` shape with `provider` `@id` references is the recommended modern pattern. *Source: schema.org; 2026 B2B schema guidance.*
- **Cross-document view transitions work.** Already shipped — `@view-transition { navigation: auto; }` at `src/styles/global.css:10` with a `prefers-reduced-motion` guard. Firefox still ignores the at-rule; nothing to do. *Source: web.dev / CSS-Tricks cross-document VT.*
- **Upgrading Astro or Pagefind.** 7.1.3 and 1.5.2 are the current releases. No newer version exists. *Source: withastro/astro and Pagefind/pagefind releases.*
- **Full migration to Cloudflare Pages / Netlify / Vercel.** Discards `publish:pages`, the `gh-pages` contract, and the live smoke check to gain headers obtainable via a proxy. *Source: static-hosting comparison research.*
- **Blocking AI training crawlers in `robots.txt`.** For a discovery-oriented site whose second job is selling services, blanket `Allow: /` is correct. *Source: AI-crawler robots.txt research.*
- **`llms.txt` expansion.** Adoption is near 10% of top sites and AI search crawlers overwhelmingly parse HTML directly. The existing file already covers `/ai/`. Structured data and page structure are the higher-leverage investments. *Source: llms.txt adoption research.*
- **Hardening `publish-pages.mjs` against force-push, secret leakage, or stale-dist publishing.** All three were investigated and disproved: there is no `--force` anywhere, `ensureManagedWorktreePath` confines the worktree under `.tmp`, only `dist/` is copied, `GITHUB_TOKEN` is read solely for a read-only Pages API call, and `src/data/build-identity.ts:44-58` falls back to `git rev-parse HEAD` so `--skip-build` on an old dist trips the commit-equality check. The one real defect is the missing-worktree recovery path, which is on the roadmap. *Source: code audit, 2026-07-25.*
- **Print-chrome leakage on `/resume/`.** Probed under print media: `#nav`, `footer`, `.skip-link`, `.resume-actions`, `#cmdk`, and the nav backdrop are all `display:none`, `body` is `#fff`/`#000`, and `page-break-inside:avoid` survives on `.resume-role`. Those rules carry `!important`, which is why they alone won. The problem is the rest of the block, not the hiding. *Source: Chromium print-media probe.*
- **OG slug injection, unbounded text, or missing font glyphs.** `getStaticPaths` enumerates a static array, `cardForSlug` throws on unknown slugs, the longest description is 155 chars against a ~192-char clamp, and `interior-og-pages.ts` is pure ASCII so the single-family fallback never misses. Only the font-cache write is worth fixing. *Source: code audit.*
- **Inline scripts or event handlers escaping the strict CSP gate.** They do not — `executableAllowlist` and `eventHandlerAllowlist` are empty arrays, so any occurrence is "unknown" and fails. The gate's gaps are elsewhere. *Source: code audit.*
- **Deleting `Divider.astro`, `SectionJumpNav.astro`, or `StarSvg.astro` as dead code.** All three are imported by live routes (7, 8, and 4 files respectively). Flagged as stale by commit-age analysis; disproved by usage check. *Source: repo grep.*
- **Pinning more Playwright skips.** All seven `test.skip(true, …)` calls in `interaction-smoke.spec.mjs` sit behind runtime `if` guards, and the one that actually fires is already in `EXPECTED_SKIPS`. The reporter is correct. *Source: repo read.*
- **i18n / l10n; multi-user; plugin ecosystem; migration tooling.** Single-author English portfolio targeting a US market. Consciously excluded.
- **Mobile-specific and offline-specific work.** Both are already first-class: every route is audited at a 390px viewport with a 44px target-size floor, and the PWA ships an offline shell, full-route precache, and a dedicated `sw-lifecycle` Playwright suite. Nothing surfaced this pass. Consciously excluded rather than overlooked.
- **Webmention receiving / ActivityPub actor.** Both require a persistent server. *Source: IndieWeb research.*

## Sources

Framework, dependencies, and advisories
- https://github.com/withastro/astro/releases
- https://astro.build/blog/astro-7/
- https://docs.astro.build/en/guides/integrations-guide/sitemap/
- https://github.com/Pagefind/pagefind/releases
- https://github.com/advisories/GHSA-f88m-g3jw-g9cj
- https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj
- https://github.com/vitejs/vite/blob/main/packages/vite/CHANGELOG.md
- https://advisories.gitlab.com/npm/astro/CVE-2026-50146/
- https://advisories.gitlab.com/npm/astro/CVE-2026-45028/

Standards, platform, and performance
- https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API
- https://developer.chrome.com/docs/web-platform/prerender-pages
- https://developer.chrome.com/docs/web-platform/implementing-speculation-rules
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src
- https://content-security-policy.com/script-src/
- https://developer.mozilla.org/en-US/docs/Web/API/Reporting_API
- https://web.dev/baseline/2026
- https://web.dev/blog/baseline-digest-may-2026
- https://css-tricks.com/cross-document-view-transitions-part-1/
- https://www.corewebvitals.io/core-web-vitals
- https://www.corewebvitals.io/pagespeed/speculation-rules
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://github.com/orgs/community/discussions/54257

Discovery, schema, and AI answer engines
- https://arxiv.org/pdf/2603.09296
- https://developers.google.com/search/updates
- https://www.getpassionfruit.com/blog/what-changed-with-google-drops-faq-rich-results-and-what-to-do-now
- https://schema.org/ProfessionalService
- https://solvspot.com/blog/schema-org-b2b-agencies-2026
- https://www.frase.io/blog/what-is-generative-engine-optimization-geo
- https://nightwatch.io/blog/sitemap-best-practices/

Accessibility
- https://www.deque.com/axe/core-documentation/api-documentation/
- https://www.levelaccess.com/compliance-overview/european-accessibility-act-eaa/
- https://www.onetrust.com/blog/understanding-the-european-accessibility-act-and-wcag-22/

Competitive and positioning
- https://www.fractional.ai/case-studies
- https://www.gofractional.com/insights/rates/lead-ai-engineer
- https://boomdevs.com/blog/ai-consulting-cost/
- https://github.com/manuelernestog/astrofy
- https://github.com/topics/astro-portfolio

## Open Questions

1. **Is acquiring a custom domain acceptable?** Still the only path to Permissions-Policy, COOP, and COEP (Cloudflare proxy in front of GitHub Pages), and now also the only path to the Reporting API. HSTS is no longer part of the argument — GitHub Pages already serves it. Pure cost/preference decision.
2. **Should `/ai/` publish a price anchor?** `OfferCatalog` is materially more useful to answer engines with at least a range, and 2026 market data supports publishing one. Business decision.
3. **Is publishing meant to be manual?** The current cadence — build locally, publish on demand — is deliberate and consistent with the no-CI policy. What is not clear is whether "live lags main by two versions" is acceptable drift or an oversight. This changes whether the fix is a one-off deploy or a standing gate.
