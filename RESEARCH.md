# Research — SysAdminDoc Portfolio
Date: 2026-07-27 — replaces all prior research.

## Executive Summary

This is an unusually mature Astro 7 static portfolio (GitHub Pages, zero-runtime-JS, heavy build-time audit gates) that doubles as the shopfront for an independent technical practice: 186 reviewed projects, 22 live web apps, a résumé-backed operating model, an `/ai/` fractional-implementation offer, healthcare-IT positioning, Pagefind search, PWA/offline delivery, and machine-readable feeds. v0.35.0 (2026-07-26) rebuilt the homepage into a lean editorial sequence and cut the shared stylesheet 159.4→119.4 KB; v0.36.0 (2026-07-27) focused `/ai/` to 425 words. Those rebuilds are the reason this pass exists — prior research (v0.34-era: "84 archive cards", "3,232px hero") is now stale.

Verification this pass confirmed the site is further ahead than the last research assumed: cross-document **View Transitions are already shipped** (`foundation.css:9`, with reduced-motion handling), Pagefind is already **1.5.2**, structured data already uses the correct `Service`/`OfferCatalog`/`Person` types (not the deprecated `ProfessionalService`), the `Person` node already carries `sameAs`+`knowsAbout`, and the PWA manifest already has screenshots/shortcuts/maskable icon. So the highest-value remaining work is not modernization — it is (1) **closing the sales funnel** (`/ai/` and the homepage are mailto-only, no intake form, no FAQ, no pricing anchor), and (2) **fixing trust/consistency defects the rebuilds introduced**. Top opportunities, in order: derive résumé proof counts from live data so `/resume/` can't contradict the hero; add a JS-free progressive-enhancement intake form without loading third-party script; add Speculation-Rules prerender to pair with the shipped View Transitions; ship FAQPage/answer-first content for AI-Overview citation; repair the homepage active-nav blanking and remove the dead healthcare-repos branch.

## Product Map

- **Core workflows**: establish fit from the editorial hero; inspect 3 selected systems + 2 live previews; browse/filter the full 186-project `/catalog/`; evaluate `/ai/`, `/healthcare-it/`, `/resume/` context; consume `/status/`, feeds, Pagefind search, PDF/JSON résumé, and offline/PWA surfaces.
- **Personas**: hiring managers, technical leaders, prospective retainer clients, healthcare-IT peers, OSS users, and maintainer/future coding agents.
- **Platforms/distribution**: static GitHub Pages; responsive desktop/mobile; light (default)/dark/forced-colors/print/offline; installable PWA; RSS/Atom/JSON Feed, sitemap, JSON endpoints, social cards, downloadable résumé, `llms.txt`/`security.txt`/`humans.txt`.
- **Data flows**: reviewed local records + the SysAdminDoc profile feed → `src/data/portfolio.ts`; Astro-rendered routes; Pagefind over built HTML; generated screenshots/OG assets; version-stamped service worker; deployment lineage in `status.json`.

## Competitive Landscape

- **Brittany Chiang / reference dev portfolios** — do well: single-scroll, fast, tasteful motion, live source, 2–3 projects framed as mini case studies. Learn: the site's minimal/monospace direction is on-trend; keep leaning on the already-shipped View Transitions for polish. Avoid: adding a projects "wall" back — depth over breadth converts.
- **Fractional AI-consultancy sites (Head of AI, Iternal, ConsultingSuccess patterns)** — do well: a *named, productized entry offer* (e.g. fixed-price "AI Workflow Audit"), a pricing anchor, an FAQ answering commitment/timeline objections, and a discovery CTA repeated on every section. Learn: `/ai/` has the narrative (Map→Pilot→Harden→Hand off) but none of the conversion instruments. Avoid: collapsing into generic "AI transformation" language — the shipped-software proof is the differentiator.
- **ConsultingSuccess / Pertama (retainer benchmarking)** — do well: publish an engagement band (advisory $2–5K/mo, embedded $5–15K/mo) and a cost-vs-full-time comparison. Learn: even a "typical engagement" band reduces tire-kickers and signals seniority. Avoid: unsupported ROI claims — this repo's proof must stay source-grounded (FL FDUTPA risk noted in sibling repos).
- **GOV.UK Design System** — do well: typography/spacing/restrained color establish hierarchy before decoration. Learn: keep the publication-scale discipline; test it at real breakpoints. Avoid: copying institutional identity — borrow clarity, not branding.
- **AEO/AI-Overview citation research (Frase, O8)** — 68% of AI-Overview-cited pages use structured data; answer-first section intros (first 30–60 words) and FAQPage schema are top citation surfaces. Learn: cheap, high-leverage content changes for `/ai/` + `/healthcare-it/`. Avoid: over-investing in `llms.txt` — Google publicly rejected it; keep it as hygiene, not strategy.

## Security, Privacy, and Reliability

- **Verified strong**: production deps report no high/critical advisory; built CSP has `script-src 'self'`, `style-src 'self'`, `style-src-attr 'none'`, Trusted Types enforcement, no third-party scripts. No auth, no visitor data, no analytics runtime.
- **Data-integrity defect (new)**: `src/data/career.ts:37-38` hardcodes `careerProof` as `186+ shipped` / `22 live apps`; the hero (`index.astro:115,120`) derives the same facts live from the profile feed, while `/resume/` (`resume.astro:70-77`) renders the frozen strings — two public surfaces can disagree on the same count. `identity-facts.test.mjs` deliberately does not scan `src/data/`, so nothing guards it.
- **First-party HTML sink**: `LiveCard.astro:70` and `healthcare-it.astro:128` use `set:html` from feed/`portfolio.ts` data. Not exploitable today (Trusted Types `createHTML` is pass-through, source is reviewed), but it is the one pattern that would turn a poisoned feed entry into stored XSS — sanitize-on-ingest is the guardrail.
- **Structural header ceiling (unchanged)**: GitHub Pages serves no custom response headers, so Permissions-Policy / COOP / COEP / clickjacking protection and the Reporting API are unreachable without a Cloudflare-proxied custom domain. Confirmed still true 2025-2026; `Roadmap_Blocked.md` records the decision. Meta-CSP *can* still tighten `script-src`/`connect-src`/`form-action` — relevant if an intake form is added.
- **Recovery**: intentionally static — SW network-first navigation + cached-document fallback + offline shell + generated-data fallbacks + deploy lineage. Sound.

## Architecture Assessment

- **Homepage nav wiring drifted in the v0.35 rebuild** (`public/scripts/home-nav.js`): the active-section `IntersectionObserver` watches every `section[id]` (`hero`, `greatest-hits`, `live`, `skills`, `catalog`, `connect`) but the nav only ships hash links for `#greatest-hits`, `#skills`, `#connect`. When `#hero`/`#live`/`#catalog` intersect, the observer clears all `active` classes then returns with no match — the nav highlight and indicator blank out while scrolling those sections. No test pins nav↔section correspondence.
- **Dead render branch**: `src/data/curated.ts:91` sets `healthcareIT.repos: []`, so `hasRepos` in `healthcare-it.astro:44` is permanently false — the entire repo-grid block (`healthcare-it.astro:116-139`), the `StarSvg` import, and the `_stars.json` load never execute. `manifesto` (`curated.ts:72`) is exported with no consumer. `home-catalog.js` preview-surface paths are dead now that the homepage catalog is static handoff links.
- **Route-coupled CSS**: `404.astro:10` applies `class="search-page"`, but `.search-page` (min-height) is defined only inside `search.astro`'s `<style is:global>` and ships with that route bundle, not globally. `.page-shell` centering is global (`polish.css`/`refinement.css`), so 404 is only cosmetically short, not broken.
- **`careerProof` positional coupling** (`career.ts:35-39` / `index.astro:109-111`): the hero reads `careerProof[0]` positionally; reordering the flat array silently changes the hero metric with no pin.
- **Test gaps**: no pin for nav↔section correspondence, no guard for `careerProof` count drift, no Playwright spec driving cmdk open→type→arrow→enter→focus-return, and the v0.36 `/ai/` service arrays aren't asserted against the emitted JSON-LD `serviceCatalogNodes`.
- **CSS budget**: shared `global.css` now 119.4 KB against the 160 KB cap after the v0.35 −726-selector cut — healthy headroom; the remaining override debt is small.

## Rejected Ideas

- **Cross-document View Transitions** (research-agent flagship) — already shipped: `@view-transition { navigation: auto; }` at `foundation.css:9` with `prefers-reduced-motion` guard. Nothing to add.
- **"Confirm Pagefind ≥1.5.2 / adopt newer filter API"** — already on 1.5.2 (`node_modules/pagefind`). Only the `preload()` warm-up micro-opt remains (kept in roadmap as P3).
- **Drop deprecated `ProfessionalService` schema / add `Person.sameAs`** — not applicable: `page-freshness.ts:193` already emits `Service`/`OfferCatalog`, and `Base.astro:84-92` already emits `Person` with `sameAs` + `knowsAbout`.
- **Third-party lead-capture that loads script on page load** (Web3Forms JS SDK, Calendly embed, hosted analytics/RUM, chatbot) — rejected; punctures the no-third-party-script CSP posture that is the site's differentiator. A JS-free native-POST form (roadmap) preserves it; any embed must be click-to-load.
- **Full visual redesign / AI gradients / native mobile app / accounts / i18n rollout / hosting migration for previews** — all rejected in prior research and still correct; the v0.35/v0.36 rebuilds reinforce restraint. `/lang/*` is a technology taxonomy, not locale demand.
- **Service-worker COOP/COEP synthesis (`coi-serviceworker`)** — only worth it for SharedArrayBuffer/WASM isolation, which this site does not need.
- **`beforeinstallprompt` custom install button** — under consideration, not recommended now: the homepage was just decluttered in v0.35; an install affordance risks re-adding chrome for marginal benefit on a content site.

## Sources

### Project and deployed surface
https://sysadmindoc.github.io/
https://sysadmindoc.github.io/ai/
https://sysadmindoc.github.io/catalog/
https://sysadmindoc.github.io/status.json

### Web platform, PWA, performance
https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available
https://caniuse.com/cross-document-view-transitions
https://developer.chrome.com/blog/speculation-rules-improvements
https://docs.astro.build/en/reference/experimental-flags/client-prerender/
https://github.com/CloudCannon/pagefind/blob/main/CHANGELOG.md
https://www.corewebvitals.io/core-web-vitals
https://www.digitalapplied.com/blog/core-web-vitals-2026-inp-lcp-cls-optimization-guide

### Consultancy funnel and portfolio conversion
https://www.consultingsuccess.com/what-is-fractional-consulting-a-comprehensive-guide-for-consultants
https://www.pertamapartners.com/insights/ai-consulting-pricing-guide
https://headofai.ai/
https://dev.to/__be2942592/how-to-build-a-developer-portfolio-that-actually-gets-you-hired-2026-6kn
https://www.resumly.ai/blog/freelance-portfolio-that-wins-for-software-engineers-in-2026

### Lead capture, headers, structured data
https://forminit.com/blog/best-form-backend-services-2026/
https://dev.to/allenarduino/the-best-form-backend-for-static-sites-in-2026-1fae
https://github.com/orgs/community/discussions/13309
https://blog.tomayac.com/2025/03/08/setting-coop-coep-headers-on-static-hosting-like-github-pages/
https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
https://schema.org/ProfessionalService
https://www.frase.io/blog/what-is-answer-engine-optimization-the-complete-guide-to-getting-cited-by-ai
https://www.rankability.com/data/llms-txt-adoption/

## Open Questions

- **Pricing/productized offer decision (blocks the strongest funnel upgrade)**: is the owner willing to publish an engagement band or a named fixed-price entry offer (e.g. "AI Workflow Audit") on `/ai/`? Peers universally do; the copy change is trivial but the decision is the owner's. Not inferable from code.
- **Lead-data privacy tradeoff**: a native-POST intake form sends contact data to a third-party form backend (Formspree/Web3Forms) even without loading their script. Acceptable given the site's privacy-first stance, or keep mailto? This gates the intake-form item.
- **Case-study source material**: which 12–20 projects have first-person problem/decision/outcome material for public case studies? Largest content upside; tracked in `Roadmap_Blocked.md`; unchanged.
