# State of Repo

Date: 2026-05-17
Repository: `SysAdminDoc/sysadmindoc.github.io`
Branch: `main` tracking `origin/main`
Baseline commit before this research pass: `7817ea7`

## Git State

Initial status was clean:

```text
## main...origin/main
```

Recent commits:

```text
7817ea7 v0.16.1: drop TeamStation - repo went PRIVATE on GitHub
e94f984 Release v0.16.0 - remove Spotify section + tighten experience claims
1495fee Release v0.15.0 - catalog refresh, 9 new public repos
becfff0 v0.14.2: scrub remaining private-repo references
87402df Release v0.14.1 - remove RadAtlas and GeneratorSpecs from portfolio
1ec444a v0.14.0: catalog refresh - add 12 missing public repos
d1b4c79 Polish portfolio UX surfaces
6eb9926 v0.13.1: catalog refresh - add 12 missing public repos
f8a153a Sync ROADMAP, branding cleanup, README polish
b56c520 v0.13.0: remove #featured section - it duplicated Greatest Hits
```

`rtk git log -10` was required by local instructions but `rtk` was not installed in this shell, so plain `git log -10 --oneline --decorate` was used.

## Version Surfaces

Aligned:

- `package.json`: v0.16.1
- `README.md`: v0.16.1 badge
- `CHANGELOG.md`: v0.16.1 entry

Stale/local:

- Ignored `CLAUDE.md`: still says v0.16.0.
- Ignored local memory for this portfolio described v0.15.0-era state.
- Previous `ROADMAP.md` was still organized around v0.7-v0.9 era planning.

## Architecture

The site is an Astro static site deployed to GitHub Pages.

Important files:

- `astro.config.mjs`: site URL, sitemap integration, static output, asset naming, compression, prefetch.
- `src/layouts/Base.astro`: page shell, SEO metadata, command palette data, structured data, preconnect hints.
- `src/pages/index.astro`: homepage.
- `src/pages/projects/[slug].astro`: generated project pages with sanitized README rendering.
- `src/pages/og/[slug].png.ts`: generated social images with `satori` and `@resvg/resvg-js`.
- `src/data/projects.ts`: primary project catalog.
- `src/data/curated.ts`: greatest hits, now page, manifesto, healthcare narrative data.
- `src/data/derived.ts`: derived counts and lookups.
- `public/scripts/main.js`: runtime interactions, GitHub API enhancement, service worker registration.
- `public/scripts/cmdk.js`: command palette.
- `public/sw.js`: static shell caching and stale-while-revalidate behavior.
- `scripts/fetch-stars.mjs`: GitHub metadata, README, release, and star cache generation.
- `scripts/capture-screenshots.mjs`: Playwright screenshot capture for live apps.

## Local Data State

Generated files under `src/data/_*.json` are ignored. At research time, `_stats.json` reported:

- `totalRepos`: 167
- `totalStars`: 204
- `fetchedAt`: 2026-05-11T15:18:22Z
- `lastPushedAt`: 2026-05-11T09:13:43Z

Live GitHub scan on 2026-05-17 reported:

- Active public repos: 178
- Active public non-forks: 170
- Active public forks: 8
- Public stars: 220

Newly observed active public repos missing from `src/data/projects.ts`:

- `OpenLumen`
- `PhoneFork`
- `AI-Usage_Tracker`

Known intentional exclusions from local memory:

- `Scripts`
- `ChanPrep`

Privacy-sensitive observation:

- `RadAtlas` is public and X-ray-related, but it was removed from the portfolio in v0.14.1. It should not be listed unless a visibility/public-safety review says otherwise.

## Verification

Completed before writing the roadmap artifacts:

```text
npm run check
```

Result: passed, 24 files checked, 0 errors, 0 warnings, 0 hints.

Security scan:

```text
npm audit --omit=dev --json
```

Result: failed with production advisory buckets for `astro`, `devalue`, `marked`, `postcss`, and `sanitize-html`.

Outdated dependency scan:

```text
npm outdated --json
```

Important current/latest deltas:

- `astro`: current 5.18.1, latest 6.3.3
- `marked`: current 18.0.0, latest 18.0.3
- `sanitize-html`: current 2.17.2, latest 2.17.4
- `@astrojs/check`: current 0.9.8, latest 0.9.9
- `typescript`: current 5.9.3, latest 6.0.3

Broad secret-pattern scan:

```text
rg -n "(ghp_|github_pat_|AIza|AKIA|secret|password|PRIVATE KEY|api[_-]?key|token)" ...
```

Result: no hardcoded credential found. Matches were expected source references, package names, or documentation text.

## Main Risks

1. Production dependency advisories affect exactly the markdown sanitization/rendering path that handles remote README content.
2. Portfolio catalog can drift as GitHub repos become public/private.
3. Privacy-sensitive public repos need an explicit review process before appearing on the site.
4. Tracked screenshots can persist after projects are removed.
5. Tool-local memory and repo version surfaces can drift unless `PROJECT_CONTEXT.md` is maintained.

## Self-Audit Result

Local reconnaissance covered repository instructions, git history, package state, source architecture, ignored generated data, GitHub live state, roadmap history, and dependency/security state. The roadmap now prioritizes issues found in live evidence rather than carrying forward stale feature ideas unchanged.
