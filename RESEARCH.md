# Research — sysadmindoc.github.io
Date: 2026-07-25 — replaces all prior research.
Site version at time of research: v0.27.0.

## Executive Summary

A static Astro 7 portfolio and public project archive for Matt Parker (SysAdminDoc), deployed to GitHub Pages from local builds. Its strongest current shape is **verification infrastructure**: 20 audit scripts under `scripts/audit-*.mjs`, wired into 34 npm audit entries, gate the build (CSP, DOM size, bundle budgets, dead CSS selectors, links, sitemap, schema, feeds, endpoints, image pipeline, live-app health, catalog drift, forced-colors, a11y), backed by 183 node tests plus Playwright interaction, visual, service-worker, and search-corpus suites. Zero runtime JS frameworks, `script-src 'self'` with Trusted Types, and a light-first "Operational Clarity" design system. `npm audit --omit=dev` reports 0 vulnerabilities; there are no TODO/FIXME/HACK markers anywhere in source.

The site is now doing two jobs: career portfolio *and* a commercial pitch for fractional AI implementation on retainer (`/ai/`, added v0.23.0). The engineering quality of the first job is far ahead of the conversion instrumentation of the second. **The highest-value direction is closing that gap — making the services track machine-legible and reachable — not adding more audit surface.**

Top opportunities, priority order:

1. `/ai/` pitches four productized service lines but publishes no `Service`/`Offer` structured data — it is typed identically to `/healthcare-it/` (`AboutPage` + `WebPage`). (Verified)
2. Contact exists on only 3 of 8 sampled routes; a visitor landing on `/catalog/` or `/releases/` from search has no path to contact. Also a WCAG 2.2 SC 3.2.6 gap. (Verified)
3. Twelve hand-rolled `<footer>` blocks with twelve different link sets and no shared component — the root cause of #2, not a separate problem. (Verified)
4. No `rel="me"` and no microformats2 anywhere — blocks Mastodon link verification and IndieWeb/fediverse discovery. (Verified)
5. Astro 7 shipped agent-oriented dev tooling (`astro dev --background`, structured JSON logs, `/_astro/status`) that this agent-driven repo does not use. (Verified)
6. The four 2026 Astro CVEs do not apply to this architecture — worth documenting so it is not re-litigated each pass. (Verified)
7. Routine dependency drift: satori 0.26→0.29, Playwright 1.61→1.62, lightningcss 1.32→1.33, sanitize-html 2.17.5→2.17.6. (Verified)

## Product Map

**Core workflows**
- Scan credibility fast: hero proof strip → Greatest Hits (8 curated repos with story-driven "why") → live-app evidence rail.
- Browse the archive: homepage preview slice (84 ranked) → `/catalog/` (all 178, client-side search/sort/filter, `cat=`/`q=`/`sort=`/`view=` URL state, no-JS reachable).
- Evaluate momentum: `/releases/` (60 cached releases with provenance tiers), `/timeline/` (232 filterable events), `/now/`.
- Hire or engage: `/resume/` (HTML + PDF + JSON Resume), `/healthcare-it/`, `/ai/` (retainer pitch).
- Verify the site itself: `/status/` + `/status.json` (build identity, data freshness, coverage, release provenance).

**Personas**
1. Hiring manager / recruiter — scans for judgment and evidence, not repo counts.
2. Prospective retainer client (SMB owner or ops lead) — arrives at `/ai/`, needs credibility then a low-friction next step.
3. Peer developer — arrives from GitHub, uses `/catalog/`, `/search/`, feeds.
4. Machine consumers — AI crawlers, IDE agents, feed readers. Served by `/llms.txt`, 4 feeds, 3 JSON endpoints, JSON-LD.

**Platforms and distribution**
Static output → `gh-pages` branch via `npm run publish:pages`, gated by `deploy:preflight`. Node 24 / npm 11. PWA with offline shell and full-route precache. No GitHub Actions by project policy — all builds, tests, and audits are local.

**Key integrations and data flows**
GitHub REST API (build-time via `scripts/fetch-stars.mjs` → gitignored `_*.json` caches; client-side refresh for live star counts) → `src/data/portfolio.ts` (narrows the 186-row profile feed to the 178-project reviewed catalog) → `src/data/catalog-render.ts` (shared ranking/freshness) → homepage preview + `/catalog/`. Pagefind indexes the built HTML post-build.

## Competitive Landscape

**Astrofy / AstroPaper / astro-resume (OSS Astro portfolio templates)**
Do well: fast setup, blog + CV + projects in one, JSON Resume support, command palette with hotkeys.
Learn: `astro-resume` ships a hotkey-driven command palette. This site's `cmdk` is click-only by explicit project rule — a deliberate choice, not an oversight — so palette discoverability has to come from the visible nav affordance instead.
Avoid: Tailwind-based, framework-hydrated templates. The zero-runtime-framework posture (69 KB of minified first-party JS across `dist/scripts/`, no hydration) is this site's clearest technical differentiator.

**Plausible CE / Matomo (self-hosted analytics)**
Do well: cookieless daily-salt hashing; no consent banner needed under legitimate interest.
Learn: nothing to adopt directly (see Rejected). The transferable lesson is that "we measure nothing" is defensible only while the site is not also a sales asset — and it now is.
Avoid: adding any third-party origin to `connect-src`, currently `'self' https://api.github.com`.

**Web3Forms / StaticForms / Formspree (static-site form backends)**
Do well: zero-backend form handling with Turnstile/Altcha spam control.
Learn: Altcha is the only option that is self-hostable, cookieless, and GDPR-clean — relevant only if the existing Contabo VPS + Caddy stack documented on `/uses/` is ever used as a first-party endpoint.
Avoid: third-party form endpoints. They require relaxing `form-action 'self'` and add a vendor that can disappear; the `mailto:` CTA already works.

**Pagefind 1.5 (incumbent dependency)**
Do well: BM25 ranking, metadata-only matches, web-component UI, per-language indexes with zero config.
Learn: metadata-aware ranking is already live and corpus-verified here.
Avoid: replacing the accessible, offline-capable component UI with a bespoke renderer for cosmetic gains — already correctly downgraded to P3 in ROADMAP.md.

**Cloudflare Pages (hosting alternative)**
Do well: a `_headers` file activates HSTS, CSP, Permissions-Policy, COOP/COEP at the edge.
Learn: the *proxy* variant — Cloudflare in front of GitHub Pages via a custom domain — is the only realistic unblock for the Permissions-Policy P0 in `Roadmap_Blocked.md`, and it preserves the entire existing build and deploy pipeline.
Avoid: a full migration. `publish:pages`, the `gh-pages` branch contract, and the live smoke check are all built around GitHub Pages.

**IndieWeb / Bridgy Fed**
Do well: `rel="me"` identity verification, h-card portable profile, feed-to-fediverse bridging.
Learn: `rel="me"` and h-card are near-zero-cost additions already justified by the site's four feeds.
Avoid: Webmention receiving or ActivityPub actor hosting — both need a persistent server.

## Security, Privacy, and Reliability

**Verified: the 2026 Astro CVE class does not apply.** All four — CVE-2026-41067 (`define:vars` XSS), CVE-2026-25545 (`@astrojs/node` SSRF), CVE-2026-45028 (server-island parameter replay), CVE-2026-50146 (`client:*` slot-name XSS) — require SSR, adapters, server islands, or client directives. This repo is `output: 'static'` on Astro 7.1.3 with zero `define:vars`, zero `client:*`, and zero islands (verified by grep across `src/`). The zero-framework architecture is doing real security work, not just performance work.

**Platform ceiling (unchanged).** GitHub Pages serves no custom response headers, so Permissions-Policy, HSTS, COOP, and COEP are unreachable. Tracked as P0 in `Roadmap_Blocked.md`. The Cloudflare-proxy path is the unblock; it requires a custom domain, which is a purchasing decision rather than an engineering one.

**Missing guardrail: no client-side error signal.** `public/scripts/service-worker.js` and `public/scripts/cmdk-loader.js` degrade visibly, but an uncaught error in `public/scripts/home-catalog.js` or `home-github.js` on a real visitor's browser is invisible to the maintainer. The Playwright suites assert `runtimeErrors` is empty, which catches regressions but not field conditions (older Safari, extensions, blocked requests). Genuine observability gap; see Rejected for why third-party error services are still the wrong answer here.

**Recovery and rollback.** `publish:pages` pushes to a `gh-pages` branch, so rollback is `git revert` plus republish. Generated `_*.json` caches are gitignored, so a bad fetch is recoverable by re-running `fetch-stars`. Service-worker rollback is handled by the versioned cache key (`portfolio-v0.27.0`) plus the update toast, which gained a bounded fallback reload in v0.27.0.

**Supply chain.** `npm run verify:signatures` runs inside `deploy:preflight`, `allowScripts` pins the esbuild install-script allowlist for npm v12, and `overrides` pin transitive `vite`/`yaml`/`svgo`/`postcss`/`fast-uri`. Stronger than typical for a personal site. satori v0.28 shipped an OIDC publish-integrity fix worth taking with the version bump.

## Architecture Assessment

**Boundary improvement: no shared footer.** Twelve routes each hand-roll `<footer>` markup (`src/pages/*.astro`, `src/pages/lang/[slug].astro`), producing twelve different link sets. `src/components/InteriorNav.astro` already establishes the pattern for shared chrome; there is no `Footer.astro` counterpart. Fixing this is the correct root-cause fix for the inconsistent-contact finding.

**Refactor candidate: `src/styles/global.css`.** ~5,800 lines. Already tracked as two P2 items in `Roadmap_Blocked.md` (layer split, CSS nesting), both blocked on Linux-generated Playwright visual baselines. The blocker is real; no new recommendation.

**Data layer is healthy.** `src/data/catalog-render.ts` is the single source for ranking/freshness (test-enforced since v0.27.0), `src/data/github.ts` the canonical URL helper, `src/data/release-summary.mjs` an idempotent normalizer shared by the generator and four render surfaces. The `.mjs`-in-`src/data/` pattern for logic shared between build scripts and Astro pages is sound and should be the default for future shared helpers.

**Test and documentation gaps.**
- `tests/playwright/interaction-smoke.spec.mjs` `test.skip`s the screenshots-gallery facet whenever live-app data has a single category, which is the current state. The path is covered by a unit test added in v0.27.0, but the skip is easy to miss in summary output.
- `AGENTS.md` states README.md is "the ONLY .md tracked in git". Actually tracked: `CHANGELOG.md`, `README.md`, `RESEARCH.md`, `ROADMAP.md`, `archive/screenshots/README.md`. The doc is wrong and has already misled at least one session into treating these deliverables as gitignored.
- Adding an interior route requires ~12 coordinated edits (enumerated in CLAUDE.md). No scaffold script exists; this is the most likely source of a future partial-registration bug.

## Rejected Ideas

- **Self-hosted analytics (Plausible CE / Matomo).** Contradicts the shipped promise on `/status/` — "Generated at build time; no runtime analytics or uptime service" — and commit `6c07f7c`, which removed pre-click YouTube/Google requests specifically for privacy. Would also require widening `connect-src`. If conversion measurement becomes necessary, change the stated promise deliberately first. *Source: repo philosophy + self-hosted-analytics research.*
- **Third-party form backend (Web3Forms / Formspree / StaticForms).** Requires relaxing `form-action 'self'`, adds a vendor to the trust boundary, and `/ai/` already ships a working `mailto:` CTA. *Source: static-form-service research.*
- **Client-side error monitoring SaaS (Sentry / TrackJS / Bugsnag).** Same CSP and third-party objections as analytics; every such tool ships a beacon indistinguishable from tracking to a privacy-minded visitor. *Source: error-monitoring research.*
- **`/til/` or `/notes/` feed.** Explicitly parked in `NOTES_FEED_POLICY.md` (decision date 2026-05-17) with seven activation criteria, none currently met. *Source: NOTES_FEED_POLICY.md.*
- **Adopting an Astro portfolio template (Astrofy et al.).** Tailwind plus hydrated islands would forfeit the zero-framework, 69 KB-JS posture. *Source: Astro template landscape research.*
- **Full migration to Cloudflare Pages / Netlify / Vercel.** Discards `publish:pages`, the `gh-pages` contract, and the live smoke check to gain headers obtainable via a proxy instead. *Source: static-hosting comparison research.*
- **Blocking AI training crawlers in `robots.txt`.** Each blocked bot costs an estimated 18–34% of potential AI citations on that engine; for a discovery-oriented site, blanket `Allow: /` is correct. *Source: AI-crawler robots.txt research.*
- **`llms.txt` expansion work.** Adoption sits near 10% of top sites and AI *search* crawlers overwhelmingly skip the file and parse HTML directly; IDE agents are the real consumer, and the existing file already serves them. Structured data is the higher-leverage investment. *Source: llms.txt adoption research.*
- **i18n / l10n.** Single-author English portfolio targeting a US market (Sarasota, FL; healthcare IT; US retainer clients). No evidence of non-English demand. Consciously excluded.
- **Multi-user, plugin ecosystem, migration tooling.** Not applicable to a single-author static portfolio. Consciously excluded.
- **Webmention receiving / ActivityPub actor.** Both require a persistent server; static-only constraint. *Source: IndieWeb research.*

## Sources

Framework and dependencies
- https://astro.build/blog/astro-7/
- https://github.com/advisories/GHSA-j687-52p2-xcff
- https://advisories.gitlab.com/npm/astro/CVE-2026-50146/
- https://advisories.gitlab.com/npm/astro/CVE-2026-45028/
- https://github.com/vercel/satori/releases
- https://github.com/Pagefind/pagefind/releases/tag/v1.5.0
- https://pagefind.app/docs/search-ui/

Standards, platform, and discovery
- https://schema.org/ProfessionalService
- https://www.schemaapp.com/schema-markup/services-schema-markup-schema-org-services/
- https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API
- https://developer.chrome.com/docs/web-platform/prerender-pages
- https://webkit.org/blog/17818/announcing-interop-2026/
- https://indieweb.org/discovery
- https://fed.brid.gy/docs
- https://www.rankability.com/data/llms-txt-adoption/
- https://presenc.ai/research/state-of-llms-txt-2026

Accessibility and performance
- https://www.onetrust.com/blog/understanding-the-european-accessibility-act-and-wcag-22/
- https://www.levelaccess.com/compliance-overview/european-accessibility-act-eaa/
- https://webhelpagency.com/blog/core-web-vitals-2026/amp/

Hosting, forms, analytics, monitoring
- https://github.com/orgs/community/discussions/142836
- https://zeriflow.com/blog/cloudflare-pages-security-guide
- https://litlyx.com/blog/best-self-hosted-web-analytics-gdpr-compliant-2026
- https://web3forms.com/
- https://openalternative.co/alternatives/cloudflare-turnstile
- https://www.inspectlet.com/guides/best-javascript-error-tracking-tools

Competitive and positioning
- https://github.com/manuelernestog/astrofy
- https://github.com/topics/astro-portfolio
- https://www.anagram.ai/blog/ai-crawlers-explained-gptbot-claudebot-perplexitybot-and-how-to-let-them-in-2026
- https://www.jobscan.co/blog/20-ats-friendly-resume-templates/

## Open Questions

1. **Is acquiring a custom domain acceptable?** It is the only path to Permissions-Policy/HSTS (Cloudflare proxy in front of GitHub Pages) and would unblock a standing P0 in `Roadmap_Blocked.md`. Pure cost/preference decision; cannot be resolved by inspection or further research.
2. **Should `/ai/` publish price anchors?** `Service`/`Offer` schema is materially more useful to AI answer engines when it carries an `OfferCatalog` with at least a price range. Whether to publish retainer pricing publicly is a business decision.
3. **Is "no runtime analytics" a hard commitment or a current default?** It is stated as fact on `/status/`. If the services track needs conversion data, that promise must change first — deliberately, not incidentally.
