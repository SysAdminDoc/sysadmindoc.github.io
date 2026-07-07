# Research - sysadmindoc.github.io

Date: 2026-07-07

## Executive Summary
Verified: `sysadmindoc.github.io` v0.21.19 is an Astro 7, Node 24+, GitHub Pages portfolio/PWA for Matt Parker's public project archive. Its strongest current shape is a static, privacy-first proof-of-work system: generated GitHub/profile data, Pagefind search, release/status feeds, audited screenshots, JSON Resume export, local Playwright/accessibility/CSP gates, and no runtime backend. The highest-value direction is trust and delivery reliability, not more template features. Top opportunities: fix the live catalog drift around `RES-Slim`; make GitHub Pages publishing a one-command, live-verified path for the `gh-pages` source branch and `.nojekyll` assets; restore/enforce screenshot capture provenance; expose release artifact provenance publicly; add mid-wide layout regression coverage; keep current dependency/security audits active; leave full i18n, social networking, CMS, analytics, and multi-user features rejected until there is actual product need.

## Product Map
- Core workflows: scan homepage proof, filter/search the catalog, inspect project detail/README/release evidence, browse screenshots/timeline/releases/status/resume/uses/now/healthcare pages, consume static JSON/RSS/Atom/llms endpoints, and install the PWA.
- User personas: hiring/recruiting reviewers, technical peers validating source quality, the maintainer running local deploy gates, crawlers/search tools, and mobile/offline visitors.
- Platforms and distribution: static Astro output, GitHub Pages legacy branch publishing from `gh-pages`, Windows-first local Node 24 tooling, local Playwright/Chromium QA, no hosted analytics, no backend.
- Key integrations and data flows: SysAdminDoc GitHub/profile feeds into `src/data/_*.json`, sanitized README Markdown through `marked`/`sanitize-html`, Pagefind generated index, Satori/resvg OG PNG generation, screenshot capture/thumbnail pipeline, service-worker offline/update layer, JSON Resume/PDF export, and static status/release feeds.

## Competitive Landscape
- AstroPaper: strong Astro content hygiene, dark/light theming, RSS/sitemap/search, and community issue signal around email privacy and media support. Learn from its small static-site discipline; avoid turning this portfolio into a generic blog theme.
- Magic Portfolio / Once UI: strong portfolio/CV/gallery defaults and content separation. Learn from its crisp proof surfaces; avoid importing a heavier React/design-system stack.
- Astrofy, Gothsec Astro Portfolio, RyanFitzgerald devportfolio: table-stakes portfolio structure, timeline/project sections, responsive templates, and visible issue signal around overlap bugs at desktop breakpoints. Learn from their route/breakpoint coverage; avoid template sameness.
- Pagefind: still the right no-backend static search layer, especially after v1.5 metadata relevance improvements. Keep it; improve generated-index and offline/runtime verification before considering hosted or vector search.
- JSON Resume, OpenResume, Reactive Resume: strong structured career portability and export expectations. Learn from schema/export reliability; avoid building a resume editor.
- lowlighter/metrics: strong deterministic GitHub-data generation and reproducible artifacts. Learn from report/provenance patterns; avoid badge-wall presentation.
- Peerlist and Contra: strong proof-of-work aggregation, verified work framing, inquiries, and profile-to-portfolio positioning. Learn from credibility signals and source aggregation; avoid feeds, accounts, payments, messaging, or marketplace mechanics.
- Webflow/Framer: strong commercial packaging around CMS, localization, analytics, staging, deployment confidence, and install/SEO presentation. Learn from deployment-health and localization economics; avoid paid-platform/CMS/analytics workflows that contradict the static privacy model.

## Security, Privacy, and Reliability
- Verified: `npm run catalog:audit` currently fails because `RES-Slim` is an active public non-fork repo missing from both portfolio data and `src/data/catalog-policy.json`; `deploy:preflight` also does not run `catalog:audit`.
- Verified: the GitHub Pages API reports legacy publishing from `gh-pages`; a source-only push to `main` can leave the live site unchanged, and Astro's `_assets`/Pagefind output require `.nojekyll` on the published branch.
- Verified: `scripts/capture-screenshots.mjs` writes `public/screenshots/manifest.json`, but that manifest is absent and `scripts/audit-live-apps.mjs` only reports `manifest provenance: 0/22` while still passing.
- Verified: generated release data already classifies provenance, and `npm run data:summary` reports 60 releases with 0 attested, 19 checksum-backed, and 41 unsigned, but `/status/`, `/status.json`, and `/releases/` do not expose those trust tiers.
- Verified: `npm run audit:prod` and `npm run deps:audit` are clean on 2026-07-07; Vite 8.1.3 is on a supported Vite line and `sanitize-html@2.17.5` is the current installed sanitizer.
- Verified: public contact email appears in `src/pages/index.astro`, `src/pages/resume.astro`, and `src/pages/resume.json.ts`; keep it accessible because the resume/contact workflow depends on it, but avoid adding hidden tracking/forms.
- Blocked but tracked: `Roadmap_Blocked.md` already covers Permissions-Policy and Trusted Types; GitHub Pages custom-header limits and Trusted Types refactor cost make them unsuitable as duplicate active roadmap items.
- Missing guardrails: live catalog drift in deploy preflight, deterministic Pages publish verification, screenshot provenance enforcement, release provenance display/gating, and breakpoint coverage for mid-wide/short-height UI states.

## Architecture Assessment
- Build/deploy boundary: `package.json` has strong local gates, but no single script owns build -> `gh-pages` publish -> live status/CSS/Pagefind verification. This is the root cause of "pushed but site did not change" failures.
- Data boundary: `scripts/audit-catalog.mjs` and `src/data/catalog-policy.json` are the right model, but the failing `RES-Slim` row proves catalog policy must be part of deploy readiness.
- Evidence boundary: screenshot masters/thumbs are audited, and the capture script writes rich provenance, but the absence of a committed/enforced manifest weakens freshness and replayability.
- Trust boundary: release provenance is already computed in `scripts/fetch-stars.mjs` and summarized in `scripts/summarize-generated-data.mjs`; surfacing it in public status/release views is a low-bloat extension of existing data.
- UI boundary: Playwright covers major public routes at 1365x900 and 390x900, with a homepage 980px hero check. External portfolio issues show overlap at 1280-1410px bands, so add a mid-wide/short-height matrix before more hero/catalog polish.
- Testing/docs boundary: existing README commands are broad and current; the stale maintainer-doc/version sync task already exists in `ROADMAP.md` and should not be duplicated.
- Upgrade strategy: keep `deps:audit`, `audit:prod`, and Astro/Vite/Pagefind release checks; no new framework migration is justified because Astro 7 and Pagefind match the static GitHub Pages target.

## Rejected Ideas
- Hosted analytics, A/B testing, forms, CRM, payments, or marketplace workflows from Webflow/Contra: rejected because this site is intentionally static, privacy-first, and backend-free.
- Peerlist-style social feed, jobs, messaging, endorsements, or community mechanics: rejected because the portfolio's value is source-backed proof, not a network product.
- Full CMS/editor workflow from Webflow/Framer: rejected because project data and copy are curated source files with audited generated data, not multi-author content.
- Full i18n/localization rollout from commercial site builders: rejected until translated resume/project content exists; adding locale plumbing without content would create stale surfaces.
- Hosted/vector search: rejected because Pagefind already fits the no-backend model and v1.5 metadata relevance makes the current search stack stronger.
- Email obfuscation as a default: considered from AstroPaper issue signal, but rejected for now because the email is intentionally public for resume/contact access and obfuscation can reduce accessibility/ATS reliability.
- Native app-store packaging: rejected because the correct distribution surface is the existing PWA manifest and GitHub Pages site.
- Multi-user permissions/plugin ecosystem: rejected because there is no backend, account model, or maintainer workflow requiring extensibility.
- GitHub Actions deploy/build/test workflows: rejected by repo rules; local scripts should provide the missing automation instead.
- Permissions-Policy and Trusted Types as active additions: rejected here because they are already documented in `Roadmap_Blocked.md` with concrete blockers.

## Sources
Direct OSS and analogs:
- https://github.com/satnaing/astro-paper
- https://github.com/once-ui-system/magic-portfolio
- https://github.com/manuelernestog/astrofy
- https://github.com/Gothsec/Astro-portfolio
- https://github.com/RyanFitzgerald/devportfolio
- https://github.com/Pagefind/pagefind
- https://github.com/lowlighter/metrics
- https://github.com/jsonresume/jsonresume.org
- https://github.com/AmruthPillai/Reactive-Resume
- https://github.com/xitanggg/open-resume

Commercial and community:
- https://peerlist.io/
- https://contra.com/portfolios
- https://webflow.com/
- https://github.com/emmabostian/developer-portfolios
- https://news.ycombinator.com/item?id=19784907
- https://www.reddit.com/r/webdev/comments/1sf7jrm/what_do_hiring_managers_look_for_in_portfolio/

Standards and platform APIs:
- https://astro.build/blog/astro-7/
- https://pagefind.app/docs/metadata/
- https://github.com/Pagefind/pagefind/releases
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/screenshots
- https://github.blog/changelog/2024-07-08-pages-legacy-worker-sunset/
- https://docs.github.com/en/actions/concepts/security/artifact-attestations
- https://slsa.dev/spec/v1.0/provenance
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/require-trusted-types-for
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

Dependencies and security:
- https://vite.dev/releases
- https://vite.dev/blog/announcing-vite8-1
- https://github.com/apostrophecms/sanitize-html/blob/main/CHANGELOG.md
- https://github.com/markedjs/marked/releases

## Open Questions
None.
