# Project Research and Feature Plan

Cycle: 9
Date: 2026-06-04
Project: `SysAdminDoc/sysadmindoc.github.io`
Source of truth for open work: `TODO.md`
Current source version: `0.18.3`

## Executive Summary

Cycle 9 reviewed the public endpoint layer while the build machine was working on T125 search auditing. T130 already covers endpoint shape contracts, but a separate cache-policy gap remains: some public generated endpoints set explicit `Cache-Control`, while other feeds/text/script endpoints do not. That matters because these outputs are integration surfaces for feed readers, automation, the command palette, and LLM-friendly discovery.

Top opportunity:

1. **T133 P2** - Normalize cache headers for generated public endpoint artifacts.

## Evidence Reviewed

Current repo state:

- Current head: `3dc35e7 feat: surface ranking rationale`.
- Deploy run `26961516043` for `3dc35e7` completed successfully.
- The worktree currently has implementer-owned T125 changes in `package.json` and untracked `scripts/audit-search-index.mjs`; those files were read but not staged.

Local files inspected:

- `src/pages/projects.json.ts`
- `src/pages/releases.json.ts`
- `src/pages/feed.json.ts`
- `src/pages/rss.xml.ts`
- `src/pages/releases.xml.ts`
- `src/pages/llms.txt.ts`
- `src/pages/cmdk-data.js.ts`
- `src/layouts/Base.astro`
- `src/pages/og/[slug].png.ts`
- `package.json`
- `scripts/audit-search-index.mjs` (implementer-owned in-progress T125 context only)

External sources reviewed:

- MDN `Cache-Control` header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
- Astro endpoint docs: https://docs.astro.build/en/guides/endpoints/

## Current Product Map Delta

The site has several generated machine-readable endpoints:

- `/projects.json`
- `/releases.json`
- `/feed.json`
- `/rss.xml`
- `/releases.xml`
- `/llms.txt`
- `/cmdk-data.js`

Cache policy is inconsistent:

- `projects.json.ts` and `releases.json.ts` explicitly set `Cache-Control: public, max-age=300`.
- `feed.json.ts`, `releases.xml.ts`, `llms.txt.ts`, and `cmdk-data.js.ts` return content without an explicit cache header.
- `rss.xml.ts` delegates to `@astrojs/rss`; its resulting header policy is not asserted in repo checks.
- `og/[slug].png.ts` uses a long immutable cache policy, which is appropriate for generated image assets if URLs are stable by content/deploy policy.
- `Base.astro` describes `/cmdk-data.js` as cached page-independent command-palette data, but the endpoint itself only sets `Content-Type`.

## Highest-Value New Work

### T133 - Normalize cache headers for generated public endpoints

- Priority: P2
- Impact: 3/5 because these endpoint artifacts are consumed by clients outside normal page navigation, and stale/over-eager revalidation behavior affects trust and perceived freshness.
- Effort: 2/5 because endpoints already return `Response` objects and several already show the local header pattern.
- Risk: Low if the policy is conservative: short max-age or revalidation for frequently updated data, immutable only for hashed/static assets.

Recommended implementation shape:

- Define a small local helper or constants for endpoint headers, for example short-lived generated data, revalidate-on-use text/feed files, and immutable generated image assets where applicable.
- Keep `/projects.json` and `/releases.json` short-lived unless T119 live smoke and endpoint audits prove a longer policy is safe.
- Add explicit headers to `/feed.json`, `/releases.xml`, `/llms.txt`, and `/cmdk-data.js`.
- Decide whether `/rss.xml` needs a wrapper or a documented exception due to `@astrojs/rss`.
- Extend T130's future endpoint audit to check `Content-Type` and expected cache policy for built or live endpoint artifacts.

## Reliability, Security, Privacy, and Data Safety

- Do not set long immutable caching on unhashed endpoints such as `/feed.json`, `/projects.json`, `/releases.json`, `/llms.txt`, or `/cmdk-data.js`; their URLs do not change when content changes.
- A short `max-age` or `no-cache`/revalidation policy is safer for public generated data that changes at deploy time.
- No analytics or runtime service is needed.

## Prioritized Roadmap

### Now

- [ ] P2 - Normalize cache headers for generated endpoints.
  - Evidence: Cache-Control exists for `projects.json`/`releases.json` but not for JSON Feed, release RSS, llms.txt, or cmdk data.
  - Verify: `npm run build && npm run endpoints:audit`, then inspect live headers after deploy.

## Explicit Non-Goals

- Do not replace T130. T130 validates endpoint shape; T133 defines and enforces endpoint cache policy.
- Do not change GitHub Pages infrastructure or add a server.
- Do not make unversioned JSON/text/feed endpoints immutable.
- Do not edit active T125 search-audit implementation from this research lane.

## Appendix - Sources

Repository sources:

- `src/pages/projects.json.ts` - explicit `Cache-Control: public, max-age=300`.
- `src/pages/releases.json.ts` - explicit `Cache-Control: public, max-age=300`.
- `src/pages/feed.json.ts` - JSON Feed response currently sets only content type.
- `src/pages/releases.xml.ts` - release RSS response currently sets only content type.
- `src/pages/llms.txt.ts` - text response currently sets only content type.
- `src/pages/cmdk-data.js.ts` - command-palette data script currently sets only content type.
- `src/layouts/Base.astro` - `/cmdk-data.js` is loaded as shared page-independent data.
- `src/pages/og/[slug].png.ts` - example of explicit immutable generated-asset cache policy.

External sources:

- MDN `Cache-Control` header reference for `max-age`, `no-cache`, `public`, and `immutable`: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
- Astro endpoint docs showing build-time static endpoints and `Response` headers: https://docs.astro.build/en/guides/endpoints/
