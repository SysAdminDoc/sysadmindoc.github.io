# Project Research and Feature Plan

Cycle: 5
Date: 2026-06-04
Project: `SysAdminDoc/sysadmindoc.github.io`
Source of truth for open work: `TODO.md`
Current source version: `0.18.3`

## Executive Summary

The implementer lane shipped T117 after Cycle 4. `data-refresh.yml` now runs `profile-feed:sync`, the generated-data summary reports profile-feed status, and manual workflow run `26956410354` passed. The latest Pages deploy for `a5db9e2` also succeeded, and live artifacts are current: `sw.js`, `/projects.json`, `/releases.json`, `/feed.json`, and `/sitemap-index.xml` all returned 200 with June 4, 2026 14:02 UTC timestamps.

Cycle 5 focuses on public artifact and metadata trust. Two existing items need sharper scope: T109 should no longer treat `WebSite SearchAction` as a rich-result win because Google removed the sitelinks search box feature, and T119 should smoke-test more than `sw.js` plus `/projects.json`. One new audit should protect the growing JSON-LD surface before T98/T99 add even more schema. A small JSON Feed quality item is also worth queueing because the feed is valid but omits optional publisher metadata that helps feed readers avoid scraping.

Top opportunities:

1. **Refine T109** - Keep iOS PWA install and `prefers-contrast`; deprioritize SearchAction.
2. **Refine T119** - Broaden post-deploy smoke to JSON feeds and sitemap in addition to SW/projects.
3. **T126 P2** - Add a rendered JSON-LD extraction/audit step.
4. **T127 P3** - Add JSON Feed icon/favicon metadata and feed validation.

## Evidence Reviewed

Current repo state:

- `git pull --rebase` was up to date on `main`.
- Current head after fast-forward: `a5db9e2 docs: record data health run proof`.
- Latest relevant commits:
  - `d2ee823 feat: add Pagefind category facets`
  - `b788495 docs: add cycle 4 research queue`
  - `ab7cb90 ci: include profile feed in data health`
  - `a5db9e2 docs: record data health run proof`
- Worktree was clean except untracked local `AGENTS.md`.

GitHub/live evidence:

- Deploy run `26956526605` for `a5db9e2` completed successfully.
- Manual data-health run `26956410354` completed successfully on `ab7cb90`.
- Three Dependabot PR CI runs started after the T122 triage pass: content-safety `26956714047`, actions `26956714943`, Astro `26956716873`.
- Live artifact probes on June 4, 2026:
  - `https://sysadmindoc.github.io/sw.js` returned 200, `portfolio-v0.18.3`, `Last-Modified: Thu, 04 Jun 2026 14:02:04 GMT`.
  - `https://sysadmindoc.github.io/projects.json` returned 200, `schemaVersion: 1`, 177 projects, profile-feed URL set.
  - `https://sysadmindoc.github.io/releases.json` returned 200, `schemaVersion: 1`, 60 releases.
  - `https://sysadmindoc.github.io/feed.json` returned 200, JSON Feed 1.1, 177 items, content type `application/json; charset=utf-8`.
  - `https://sysadmindoc.github.io/sitemap-index.xml` returned 200.

Files inspected:

- `.github/workflows/data-refresh.yml`
- `scripts/summarize-generated-data.mjs`
- `src/data/generated.d.ts`
- `src/layouts/Base.astro`
- `src/pages/lang/[slug].astro`
- `src/pages/projects/[slug].astro`
- `src/pages/projects.json.ts`
- `src/pages/releases.json.ts`
- `src/pages/feed.json.ts`
- `scripts/validate-project-data.mjs`
- `TODO.md`
- `PROJECT_CONTEXT.md`

External sources reviewed:

- Google structured data general guidelines: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Google Search Central sitelinks search box removal: https://developers.google.com/search/blog/2024/10/sitelinks-search-box
- Google structured data introduction: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- Schema.org `SoftwareApplication`: https://schema.org/SoftwareApplication
- Schema.org `datePublished`: https://schema.org/datePublished
- JSON Feed 1.1 spec: https://www.jsonfeed.org/version/1.1

## Current Product Map Delta

The site now has a broad metadata surface:

- `Base.astro` emits a site-wide WebSite/Person graph and a homepage ProfilePage graph.
- Language lanes emit `CollectionPage`, `ItemList`, and `BreadcrumbList`.
- Project pages emit `SoftwareSourceCode` and `BreadcrumbList`.
- T98 and T99 are still open and will expand this surface to more interior pages and live-app project schemas.
- Public JSON endpoints are now important artifacts: `/projects.json`, `/releases.json`, and `/feed.json` are advertised in `<link rel="alternate">` tags and are live after each deploy.

The validation surface does not yet match that metadata surface. Existing checks validate source data, generated data freshness, assets/images, Pagefind, Lighthouse, a11y, and catalog drift, but no script parses rendered HTML JSON-LD across built routes or validates public feed contracts after deploy.

## Feature Inventory Delta

| Feature | Current state | Gap |
| --- | --- | --- |
| WebSite SearchAction planning | T109 still includes WebSite SearchAction | Google removed sitelinks search box from Search in November 2024; SearchAction no longer deserves equal priority with PWA/contrast work. |
| Live artifact smoke | T119 covers SW version and `/projects.json` profile-feed status | Live `/releases.json`, `/feed.json`, and sitemap are also public advertised artifacts and should be checked in the same post-deploy smoke. |
| JSON-LD | Base/lang/project pages emit manual JSON-LD; T98/T99 will add more | No rendered-page audit extracts all `application/ld+json`, parses it, checks required graph anchors, or compares markup to visible page content. |
| JSON Feed | `/feed.json` is JSON Feed 1.1 with 177 items and `application/feed+json` in source response headers | Feed omits optional `icon`/`favicon` metadata and has no explicit validation step; live GitHub Pages serves it as `application/json`, so feed readers rely on discovery markup. |

## Highest-Value New Work

### T126 - Add a rendered JSON-LD audit

- Priority: P2
- Why now: T98/T99 will add more structured data, and the current manual JSON-LD blocks can drift without any parser catching malformed JSON, duplicate/missing `@id`s, or markup that is not represented by visible page content.
- Impact: 3/5 because bad structured data can quietly reduce eligibility for rich results and erode metadata trust.
- Effort: 2/5 for a build-output script that scans representative `dist/**/*.html` pages and validates JSON shape/anchors.
- Risk: Low if it checks technical validity and core invariants without trying to replicate every Google rich-result rule.

Recommended implementation shape:

- Add `npm run schema:audit` or fold it into `data:validate` after `npm run build`.
- Parse every rendered `<script type="application/ld+json">` block from `dist`.
- Assert JSON parses, `@context` is schema.org, homepage graph has stable WebSite/Person IDs, project pages include SoftwareSourceCode plus BreadcrumbList, and language lanes include CollectionPage/ItemList.
- For T98/T99 follow-up, extend expected route/type coverage rather than leaving it manual.

### T127 - Add JSON Feed publisher metadata and validation

- Priority: P3
- Why now: The JSON Feed is already advertised and live, and JSON Feed 1.1 recommends publisher metadata such as `icon` and `favicon` so feed readers do not need to scrape the homepage.
- Impact: 2/5 because it improves feed-client ergonomics more than core site behavior.
- Effort: 1/5 to add `icon`/`favicon` and a small validator assertion for required top-level and item fields.
- Risk: Low.

Recommended implementation shape:

- Add `icon` and `favicon` absolute URLs to `src/pages/feed.json.ts` using existing icons.
- Add a lightweight `feed:audit` or include feed checks in T119 post-deploy smoke.
- Confirm `version`, `title`, `home_page_url`, `feed_url`, `items`, item `id`, item `url`, and one content field are present.
- Do not require `date_published`; JSON Feed 1.1 marks it optional and the site currently uses `date_modified`.

## Prioritized Roadmap

### Now

- [ ] P2 - Add rendered JSON-LD audit before expanding T98/T99.
  - Evidence: JSON-LD exists in `Base.astro`, language lanes, and project pages, but source/data validators do not parse rendered graph output.
  - Verify: `npm run build && npm run schema:audit`.

### Next

- [ ] P2 - Broaden T119 post-deploy smoke to all advertised public artifacts.
  - Evidence: Latest live checks show `/projects.json`, `/releases.json`, `/feed.json`, and `/sitemap-index.xml` are all shipped artifacts with real contracts.
  - Verify: Deploy post-check logs list SW cache version, projects profile-feed status/count, releases count, JSON Feed item count/content type, and sitemap 200.

- [ ] P3 - Add JSON Feed metadata/validation polish.
  - Evidence: `/feed.json` is live and valid-looking, but lacks `icon`/`favicon` and is not explicitly audited.
  - Verify: `npm run build`; fetch `dist/feed.json` or live `/feed.json` and validate JSON Feed 1.1 required fields plus icon/favicon URLs.

## Non-goals

- Do not add SearchAction just to satisfy old roadmap text; Google has removed the visual sitelinks search box feature.
- Do not make schema audit a replacement for T98/T99 content work. The audit should protect whatever structured data exists.
- Do not make JSON Feed `date_published` mandatory; the spec marks it optional.
- Do not broaden T119 into a full browser E2E suite. It should stay a fast live artifact smoke.

## Appendix - Sources

Repository sources:

- `src/layouts/Base.astro:42-70` and `138-141` - site-wide WebSite/Person/ProfilePage JSON-LD.
- `src/pages/lang/[slug].astro:83-114` - CollectionPage/ItemList/BreadcrumbList JSON-LD.
- `src/pages/projects/[slug].astro:303-323` - SoftwareSourceCode/BreadcrumbList JSON-LD.
- `src/pages/projects.json.ts:108-127` - public project index shape.
- `src/pages/releases.json.ts:58-75` - public release index shape.
- `src/pages/feed.json.ts:35-58` - JSON Feed 1.1 generation.
- `TODO.md:151` - T109 still includes WebSite SearchAction.
- `TODO.md:210-215` - T119 post-deploy smoke currently focuses on SW and projects.

External sources:

- Google structured data general guidelines: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Google Search Central sitelinks search box removal: https://developers.google.com/search/blog/2024/10/sitelinks-search-box
- Google structured data introduction: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- Schema.org `SoftwareApplication`: https://schema.org/SoftwareApplication
- Schema.org `datePublished`: https://schema.org/datePublished
- JSON Feed 1.1 spec: https://www.jsonfeed.org/version/1.1
