# Research — SysAdminDoc Portfolio
Date: 2026-08-20 — replaces all prior research.

## Executive Summary

An unusually mature Astro 7 static portfolio (186 reviewed projects, 22 live apps, Pagefind search, PWA/offline, strict meta-CSP, ~30 build-time audit gates) that since 2026-07-28 (v0.38.0) is self-hosted on the Contabo VPS at `portfolio.getparkerai.com` behind an edge Caddy — a move that delivered the security headers GitHub Pages never could and, crucially, **dissolved the hosting blockers behind several long-parked items** (first-party intake endpoint, edge-delivered CSP, report sink, server-side analytics). Every defect from the 2026-07-27 research pass was fixed within a day (v0.37.0); since 2026-08-10 the repo has been idle, and that idleness exposed the top new finding: **the deployed site is frozen at 2026-07-28 — generated data is ~23 days old against a 36-hour freshness contract, and the live `/status/` page still reports "stale: false" because staleness is computed at build time.** The refresh pipeline is entirely manual, so the site's own trust surface lies the moment deploys stop.

Top opportunities in priority order: (1) automate the data-refresh-and-deploy loop and make `/status/` staleness honest at view time; (2) gate live response status codes in the smoke (404 behavior is correct today but unprotected); (3) upgrade `caddy:2.8-alpine` → 2.11.2 (four 2026 CVEs fixed since 2.8 plus a frozen Alpine base) and satori 0.29.0 → 0.29.1+ (SSRF-guard security patch, 2026-08-19); (4) ship the intake form as a **first-party** VPS endpoint (ALTCHA + honeypot) now that no third-party backend is needed; (5) restore the OG-image/`/_assets/` cache headers lost in the Pages→VPS migration; (6) diagnose the README cache coverage collapse (18/182 repos, publicly visible warning on `/status/`); (7) refresh the AEO posture — Google retired FAQ rich results 2026-05-07, so the v0.37 FAQPage schema is now inert and visible answer quality is what earns AI citations; (8) bring `/healthcare-it/` conversion parity with `/ai/` plus healthcare data-boundary trust language.

## Product Map

- **Core workflows**: establish fit from the editorial hero; inspect 3 selected systems + 2 live previews; browse the full 186-project `/catalog/`; evaluate `/ai/`, `/healthcare-it/`, `/resume/`; consume `/status/`, feeds, Pagefind search, PDF/JSON résumé, offline/PWA surfaces.
- **Personas**: hiring managers, technical leaders, prospective retainer clients (healthcare-flavored), OSS users, maintainer/future coding agents.
- **Platforms/distribution**: static site on Contabo VPS (edge Caddy, TLS, HSTS/XFO/Permissions-Policy/COOP at edge; CSP via `<meta>`); `sysadmindoc.github.io` is a path-preserving redirect stub; the 22 live apps stay on `sysadmindoc.github.io/<app>/` (separate repos' Pages) with a self-hosted mirror at `apps.getparkerai.com`; installable PWA; RSS/Atom/JSON Feed, machine JSON endpoints, llms.txt, résumé PDF/JSON.
- **Data flows**: reviewed local records + SysAdminDoc profile feed → `src/data/portfolio.ts`; generated `_*.json` caches from `scripts/fetch-stars.mjs` (GitHub API); Astro build → 16 HTML routes + 13 endpoints; Pagefind over built HTML; satori/resvg OG cards; version-stamped service worker; deploy via `npm run deploy:vps` (manual only — no scheduler anywhere).

## Competitive Landscape

- **OSS portfolio templates (brittanychiang/v4 ~8.3k★, once-ui magic-portfolio, astrofy, Astro Nano)** — the site is ahead of all of them on engineering (search, PWA, CSP, audit gates). The only template features that beat it are already shipped here (per-page OG generation, JSON-LD from the content model, CV timeline). Learn: nothing structural. Avoid: re-adding density; the 2026 winning aesthetic is exactly the v0.35 restrained editorial direction.
- **Simon Willison's tools.simonwillison.net colophon** — 224 tools, each with commit links and the AI transcripts that built them. For someone *selling AI implementation*, an AI-build colophon is portfolio, marketing, and proof-of-competence in one page. Learn: derive per-app build provenance from public commit history; label AI assistance honestly. Avoid: fabricating narrative — derived data plus short owner notes.
- **Hiring-signal consensus (Hyperskill 2026, HN "portfolios lack text", Teamblind HM thread)** — reviewers spend seconds, inspect commit history and READMEs to distinguish real building from AI/tutorial output, and value 3-5 explained projects over volume. The 186-card catalog is the anti-pattern unless the curation rail ("Selected work") stays in front — it does. Learn: written case-study depth is the single strongest differentiator (unchanged from July; still blocked on human content). Avoid: animation spectacle, project-wall regressions.
- **Fractional AI consultancy sites (Riverborn, Salt, Petronella, Digital Applied benchmarks)** — mid-2026 norm is a *published fixed-price* entry audit ($3-15K, named deliverables, honest exclusions block) gating into retainers (advisory $2-5K/mo, embedded $5-15K/mo, fractional-leader $15K+/mo), a booking CTA, and a stated response-time promise. Learn: Riverborn's page anatomy (price + timeline + six named deliverables + exclusions + free 30-min fit call) is the closest template for `/ai/`. Avoid: unsupported ROI claims; "HIPAA certified" badges (legal red flag per Fisher Phillips — precise data-boundary language beats badges).
- **Speed-to-lead research (Aloware, LeadResponse, Artemis 2026)** — ~78% of B2B buyers choose the first responder; <5-min responders qualify 21x better; mailto-only CTAs inherit the visitor's own email latency and give the site no response-time story. Learn: intake form + "reply within one business day" promise is the cheapest real conversion lever. Avoid: third-party form SDKs — the VPS makes first-party strictly better.
- **Healthcare AI procurement (HSCC Third-Party AI Risk guide 2026-04, Censinet checklist)** — hospital buyers now run formal AI vendor risk processes asking: PHI exposure, BAA willingness, training-data use, supply chain. A services page that pre-answers these removes procurement friction. Learn: "move the intelligence to the PHI, not PHI to the intelligence" framing fits the existing Harden stage. Avoid: compliance-certification claims.
- **IndieWeb/personal-site patterns (indieweb.org, awesome-dev-websites, HN Jan 2026 thread)** — /now, /uses, rel=me, h-card, RSS: all already shipped here. The remaining praised patterns are a colophon page and human-curation signals (blogroll, writing cadence — human content, not code). Learn: "last tended" freshness signals matter; the stale deployed data undermines exactly this. Avoid: guestbooks/webrings nostalgia — absent from 2026 praise.
- **AI-crawler posture (ai.robots.txt, Cloudflare pay-per-crawl, llms.txt adoption data)** — Google ignores llms.txt (~408 fetches in 500M bot visits); only IDE agents read it — the site already ships it, correctly scoped as hygiene. Someone selling AI services wants to be *cited*, not blocked; a deliberate documented robots policy (allow search/agent bots, optionally block training-only bots) is the right posture, implemented at Caddy/robots.txt.

## Security, Privacy, and Reliability

- **Deployed staleness defect (Verified, live)**: `src/data/generated-trust.ts:1` sets a 36-hour freshness contract, but the newest cache is 2026-07-28 (~550 hours old on 2026-08-20). Live `status.json` reports `ageHours: 11.07, stale: false` — frozen at build (`src/pages/status.astro:75,110` uses build-time values). The trust surface cannot report its own staleness once deploys stop. Nothing schedules `fetch-stars`/`profile-feed:sync`/`deploy:vps`. Also `deploy:preflight` fails red today on `--fail-on-stale`.
- **404 status codes are correct but ungated (Verified live 2026-08-20)**: a probe of a missing path returned HTTP 404 — the `handle_errors` chain in `deploy/vps/Caddyfile` behaves correctly despite reading ambiguously. The gap is that no smoke or Playwright test asserts any response status code, so a Caddy config regression to soft-404s (a known footgun in `handle_errors` rewrites) would ship unnoticed.
- **Caddy image drift (Resolved 2026-08-20)**: `deploy/vps/docker-compose.yml` pinned `caddy:2.8-alpine`; 2026 CVEs fixed since 2.8 include CVE-2026-27585 (path-matcher backslash bypass), CVE-2026-27586 (mTLS fail-open), CVE-2026-27589 (admin API), CVE-2026-27590 (FastCGI), and a header-injection escalation (2.11.2), and the frozen tag stopped receiving Alpine base rebuilds. Now on `caddy:2.11-alpine` (v2.11.4), deployed and verified live. **Correction:** the edge proxy was *not* exposed — it runs the floating `caddy:2` tag, already on v2.11.3. The one container still on 2.8-alpine is `apps-app` (the 22 live-app mirror at `apps.getparkerai.com`), which belongs to the Contabo-VPS-Ops repo, not this one.
- **satori SSRF patch missing (Verified)**: lockfile pins 0.29.0; 0.29.1 (2026-08-19) hardens the SSRF guard (trailing dots, redirects, DNS rebinding). OG rendering is build-time with local content, so exploitability is low — upgrade anyway; 0.32.0 adds `backdrop-filter`/`corner-shape` for cards.
- **sanitize-html upstream archived but still shipping patches (Verified 2026-08-20, corrects an earlier claim)**: the GitHub repo `apostrophecms/sanitize-html` is archived (`archived: true`, last push 2026-02-26), yet **2.17.7 was published to npm on 2026-08-13** — five months after the archive. So "will never receive another patch" was wrong; releases continue from somewhere outside the archived repo. Now on 2.17.7. The risk is reduced but not zero (an archived repo means no public issue tracker or visible review), and usage here is build-time over reviewed/feed content, which bounds it further. Worth understanding who publishes now before planning any migration.
- **README cache coverage collapse (Verified, publicly visible)**: live `status.json` shows `readmeEntries: 18` of 182 (9.7% vs the 80% threshold), warning "README cache coverage is below 80%" rendered on `/status/`. `_readme-refresh.json` claims `attempted: 182, missRate: 0, rateLimited: false` yet only 18 entries — internally inconsistent; either the counter or the cache write path is wrong. Separately, `_profile-projects.json` has mtime 2026-07-28 but internal `generatedAt: 2026-06-01` — the upstream profile feed itself has not regenerated since June.
- **Cache headers lost in migration (Verified)**: `src/data/endpoint-headers.ts:8` declares `GENERATED_IMAGE_CACHE_CONTROL = 'public, max-age=86400'`, but static output discards endpoint Response headers and the internal Caddyfile's `@cache600` matcher covers only 12 machine endpoints — `/og.png`, `/og/*.png`, and hashed `/_assets/*` (the one place `immutable` is free) ship with no Cache-Control at all.
- **Verified strong**: no debt markers in tracked source (a real zero, not a grep artifact); working tree clean; edge headers live-verified (HSTS, XFO DENY, Permissions-Policy, COOP, Referrer-Policy, XCTO) and regression-gated by `smoke:live`; CSP meta with hash-pinned styles; Trusted Types; hardened container (128 MB / 0.25 CPU / no-new-privileges / read-only mounts); vite 8.1.5 and sharp 0.35.3 postdate all 2026 CVE fixes; esbuild 0.28.1 has the Windows dev-server fix (watch for 0.28.2 rebuilding with patched Go per esbuild#4464).
- **Recovery**: SW network-first + offline shell + generated-data fallbacks + deploy lineage — sound. One drift trap: `public/offline.html` hardcodes two style hashes that must match `Base.astro` by hand, with no test tying them; it also declares only a light `theme-color` (dark-mode users get a light flash).

## Architecture Assessment

- **No scheduler exists anywhere in the pipeline** — the deepest structural gap. Every gate assumes a human runs `fetch-stars` → `deploy:preflight` → `deploy:vps`. The repo's history shows bursty drain sessions separated by idle weeks; the architecture should tolerate idleness (honest staleness display) and remove it (scheduled refresh, consistent with the no-GitHub-Actions rule via a local scheduled task).
- **`/status/` computes trust state at build time** (`src/pages/status.astro`, `src/data/generated-trust.ts`) — age/stale tones need view-time computation (client-side from `fetchedAt`, with build-time values as no-JS fallback).
- **`publish-pages.mjs` still points at the old origin** (`DEFAULT_BASE_URL = 'https://sysadmindoc.github.io/'`, gh-pages branch) — intentional fallback, but re-running it would overwrite the redirect stub; the script deserves a loud warning banner.
- **Conversion asymmetry**: `/ai/` gets two primary prefilled-mailto CTAs (`ai.astro:164,273`); `/healthcare-it/` gets one secondary-styled anchor to `/#connect` (`healthcare-it.astro:95`) — on the two pages that exist to convert. No form, no booking link, no response-time promise anywhere.
- **Refactor candidates**: dead export `filterLabelByKey` (`src/data/catalog-render.ts:87`, zero consumers); `scripts/fix-html-structure.mjs` self-describes as a "Historical Astro 6 guard" still running on every Astro 7 build; six over-exported module internals (see recon: `build-identity.ts`, `og-font-cache.ts`, `endpoint-headers.ts` etc.) widen surface with no coverage.
- **Test gaps**: `public/scripts/scroll-reveal.js`, `relative-time.js`, `screenshots-page.js` untested; `/cmdk-data.js` (largest payload, every page) referenced by one test; no HTTP status-code assertions anywhere; offline.html hash-drift untested. LHCI is advisory-only (all 12 assertions `warn`) and samples 2 of 16 routes while the a11y gate blocks — an undocumented asymmetry.
- **Doc staleness**: `IMAGE_PIPELINE.md:30` claims the v0.23-deleted `projects/[slug].astro` route "continues to use" masters; `PERFORMANCE_AUDIT.md:51` reports results for the removed `/projects/project-nomad-desktop/`; `IMAGE_PIPELINE.md` says 10 interior OG pages vs actual 12.
- **Release hygiene**: git tags stop at v0.30.0 — v0.31 through v0.39 shipped untagged.
- **Dependency posture**: Astro 7.1.3 → 7.2.1 available (7.2 adds `experimental.incrementalBuild`, ideal for a mostly-unchanged content site); Pagefind 1.5.2 still latest; lightningcss/sharp/resvg/Playwright current; TS7 and fast-uri holds unchanged.

## Rejected Ideas

- **Cross-document View Transitions, navigation preload, h-card, llms.txt, /now, /uses, per-page OG images, JSON-LD Person/Service, RSS** (landscape-research suggestions) — all already shipped; verified in source this pass (`foundation.css:9`, `sw.js:73-75`, `index.astro:94-97`, `llms.txt.ts`, etc.).
- **Astro Fonts API / responsive-image migration** — the site already self-hosts subset woff2 with preload and uses `<Picture>` for thumbs; churn without user-visible gain.
- **Plausible CE / Umami analytics** — Plausible wants 2-4 GB RAM (oversized for the shared VPS); Umami adds a client script, puncturing the no-third-party/no-runtime-analytics posture. GoAccess over existing Caddy JSON logs achieves visibility with zero page impact (roadmap).
- **Self-hosted Cal.com** — full Next.js+Postgres stack to host one person's calendar; hosted Cal.com is a third-party embed decision for the owner (open question), not an engineering item.
- **Third-party form backends (Formspree/Web3Forms/Formbricks)** — the July blocker is obsolete; a first-party endpoint on the owned VPS is strictly better on privacy, cost, and maintenance (Formbricks alone wants 2 GB RAM for one contact form).
- **HSTS preload token** — requires an apex-wide (`getparkerai.com` + all subdomains) semi-irreversible commitment beyond this repo's scope.
- **COEP / coi-serviceworker** — unchanged: breaks cross-origin GitHub images, needed only for SharedArrayBuffer isolation the site doesn't use.
- **Blocking AI crawlers wholesale (Cloudflare pay-per-crawl pattern)** — counterproductive for someone selling AI services who wants answer-engine citations; a documented allow-mostly policy is the fit (roadmap P3).
- **Guestbooks/webrings, blog platform build-out, i18n, visitor accounts, full redesign** — nostalgia features absent from 2026 praise; writing cadence is human content, not code; the rest re-rejected per prior research, reinforced by the v0.35 restraint.
- **Custom Pagefind result UI** — still gated on a UX complaint that does not exist (Roadmap_Blocked P3, unchanged).
- **FAQPage schema expansion** — Google retired FAQ rich results 2026-05-07 and drops Search Console API support 2026-08; existing markup is harmless (keep), but no new schema investment — visible answer quality is the citation lever now.
- **Rewriting the FAQ answers for length (was a P1 roadmap item, closed 2026-08-20)** — the AEO guidance is to lead answer-first with visible 50-150-word answers under question-form headings. Inspection shows `/ai/` and `/healthcare-it/` already do the substantive part: the answers are visible, answer-first by construction (`src/pages/ai.astro:45`, "Answer-first questions a prospective client actually asks"), and the FAQPage schema is generated from the same array that renders, so an answer engine reads exactly what a visitor reads. The only gap is length — answers run 35-42 words against a 50-word floor — and closing it means adding substantive claims about how engagements actually run. Padding to hit a word count would produce filler the repo's own writing rules forbid, so this needs the owner's substance, not an editing pass. No schema or structural work remains.

## Sources

### Project and deployed surface
https://portfolio.getparkerai.com/
https://portfolio.getparkerai.com/status.json
https://sysadmindoc.github.io/
https://apps.getparkerai.com/

### Stack, security advisories, platform
https://astro.build/blog/astro-720/
https://docs.astro.build/en/reference/experimental-flags/csp/
https://github.com/vercel/satori/releases
https://github.com/apostrophecms/sanitize-html
https://github.com/advisories/GHSA-rpr9-rxv7-x643
https://advisories.gitlab.com/npm/sharp/GHSA-f88m-g3jw-g9cj/
https://github.com/advisories/GHSA-p9ff-h696-f583
https://github.com/caddyserver/caddy/releases
https://nodejs.org/en/blog/vulnerability/july-2026-security-releases
https://github.com/evanw/esbuild/issues/4464
https://github.com/Pagefind/pagefind/blob/main/CHANGELOG.md
https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API
https://github.com/mholt/caddy-ratelimit
https://goaccess.io/
https://valebyte.com/en/blog/plausible-vs-umami-vs-matomo-2026-self-hosted-analytics-compared/

### Consultancy funnel, AEO, healthcare trust
https://www.pertamapartners.com/insights/ai-consulting-pricing-guide
https://www.digitalapplied.com/blog/ai-agency-services-pricing-strategies-2026
https://riverborn.com/packages/ai-readiness-audit
https://ariesconsultinggroup.com/blog/ai-readiness-audit-cost/
https://aloware.com/blog/lead-response-time-benchmarks
https://leadresponse.co/blog/speed-to-lead-statistics
https://www.schmidtconsulting.group/blog/consulting-website-conversion/
https://www.weavely.ai/blog/the-complete-guide-to-client-intake-forms
https://altcha.org/
https://www.staticforms.dev/docs/forms/security/altcha
https://seoscore.tools/blog/faq-schema-markup/
https://www.quattr.com/blog/faq-schema-in-2026
https://www.shadow.inc/resources/google-ai-mode-citations
https://www.digitalapplied.com/blog/llms-txt-in-practice-adoption-evidence-2026
https://healthsectorcouncil.org/wp-content/uploads/2026/04/AI-Third-Party-Risk-Guide.pdf
https://censinet.com/perspectives/ai-vendor-compliance-checklist-healthcare
https://www.fisherphillips.com/en/insights/insights/how-healthcare-organizations-must-vet-ai-vendors-that-overstate-their-compliance
https://proofmap.com/insights/how-to-write-anonymous-case-studies

### Portfolio landscape, IndieWeb, AI-crawler posture
https://github.com/bchiang7/v4
https://github.com/once-ui-system/magic-portfolio
https://tools.simonwillison.net/colophon
https://simonwillison.net/2025/Mar/13/tools-colophon/
https://hyperskill.org/blog/post/building-a-developer-portfolio-in-2026-what-actually-gets-attention
https://news.ycombinator.com/item?id=32113545
https://news.ycombinator.com/item?id=46618714
https://www.teamblind.com/post/do-you-look-at-candidates-portfolio-zlbuydfd
https://indieweb.org/now
https://github.com/ai-robots-txt/ai.robots.txt
https://blog.cloudflare.com/introducing-pay-per-crawl/
https://codersera.com/blog/llms-txt-complete-guide-2026/

## Open Questions

- **Pricing/productized offer (blocks the strongest funnel upgrade)**: will the owner publish an engagement band or a named fixed-price entry audit on `/ai/`? Evidence strengthened since July — $3-15K fixed-price audits with published prices are now the mid-2026 norm (Riverborn, Salt, Petronella, Aries). Copy is trivial; the pricing decision is the owner's.
- **Booking link**: hosted Cal.com (third-party embed, click-to-load) vs none. Self-hosting rejected on maintenance weight. Owner call on the third-party tradeoff; the first-party intake form (now unblocked) covers most of the value either way.
- **Case-study source material**: which projects have first-person problem/decision/outcome material? Unchanged since July; still the largest content upside (`Roadmap_Blocked.md` P2). The AI colophon (roadmap P2) partially substitutes with derived public data.
- **Edge-delivered CSP**: moving CSP from `<meta>` to the edge Caddy header would unblock Speculation Rules and enable `frame-ancestors`/reporting, at the cost of the single-source meta design and the build-time hash-pinning audits (`Roadmap_Blocked.md` P2 records the tradeoff). Design decision, not research.
