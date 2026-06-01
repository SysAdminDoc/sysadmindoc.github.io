# Feature Backlog

Date: 2026-05-17

This is the raw harvested opportunity list before final prioritization.

## Security and Trust

- Upgrade `sanitize-html` and `marked`.
- Evaluate and plan Astro 6 migration.
- Add production audit gate after remediation.
- Add Dependabot for npm and GitHub Actions.
- Add README-rendering regression tests for sanitizer/markdown upgrades.
- Add public/private safety checklist for portfolio catalog changes.
- Add explicit medical-imaging repository review rule.
- Add generated evidence badges for build/check/release status where public-safe.

## Catalog and Data Integrity

- Add catalog audit script comparing live GitHub public repos with `src/data/projects.ts`.
- Add intentionally skipped public repo exception list.
- Add fork inclusion/exclusion policy.
- Add schema validation for project records.
- Add duplicate slug/name/url checks.
- Validate screenshot presence for `liveApps`.
- Validate repo URL reachability through GitHub API.
- Surface generated data freshness in a local report.
- Refresh generated GitHub caches with token in automation.
- Reconcile `OpenLumen`, `PhoneFork`, and `AI-Usage_Tracker`.
- Review `RadAtlas` visibility and asset traces.

## Build, CI, and Automation

- Split metadata refresh workflow from deploy workflow.
- Add scheduled catalog drift issue creation.
- Add stale screenshot checker.
- Add unused data/asset check.
- Add Playwright smoke pass for homepage/catalog/project detail pages.
- Add Lighthouse or PageSpeed reporting for representative pages.
- Add service-worker update notification.
- Add bfcache audit after runtime script changes.
- Add `npm run verify` wrapper for check/build/audit/catalog.

## Project Detail Experience

- Add structured fields for problem, proof, install path, platform support, limitations, and test/build evidence.
- Add release timeline modules on project pages.
- Add related projects by tag/category/technology.
- Add screenshot freshness dates.
- Add README excerpt quality controls.
- Add link health checks for live demos and project URLs.
- Add "why this exists" summaries for featured projects.

## Site Sections

- Year-in-review page generated from releases/changelog/GitHub metadata.
- Project arcs page grouping related efforts.
- Public-safe anti-portfolio/archive for retired, renamed, or privatized projects.
- `/til` or notes only after a maintainable content source is chosen.
- `/tools` index for live utilities and web apps.
- Project update RSS/JSON feeds.
- Machine-readable `projects.json`.

## Search and Discovery

- Compare Pagefind against MiniSearch, Fuse.js, and current command palette.
- Index README excerpts and project page content.
- Add category/language quick filters to search.
- Add search result highlighting.
- Add no-JS sitemap/catalog fallback for all important filters.

## Visual and Performance

- Compress screenshots and internal thumbnails.
- Keep OG PNG output but review size and cache behavior.
- Evaluate Astro image pipeline for static GitHub Pages.
- Audit high-radius legacy UI elements if a future UI pass touches styles.
- Review preconnect hints, including stale Spotify preconnect after Spotify section removal.
- Measure Core Web Vitals on homepage, catalog, and project pages.

## Dataset, Model, and Integration Ideas

- Treat public repo metadata, README excerpts, releases, and screenshots as a managed dataset.
- Add generated similarity links from descriptions/tags.
- Experiment with offline embeddings for duplicate category detection.
- Add a small evaluation set for search relevance.
- Generate category suggestions for newly public repos.
- Avoid hosted model inference and visitor tracking.

## Parked or Rejected

- Hosted backend search: parked.
- Heavy analytics: rejected for now.
- Listing private/internal repos: rejected.
- Auto-changing GitHub repository visibility from this repo: rejected.
- Broad redesign before trust/correctness work: parked.
