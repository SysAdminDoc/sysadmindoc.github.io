# Source Register

Date: 2026-05-17

This register lists the local, command, and external sources used for the research pass. Roadmap items cite these IDs.

## Local Sources

| ID | Source | Use |
|---|---|---|
| L01 | `README.md` | Current version badge, build/deploy docs, source tree, public positioning. |
| L02 | `CHANGELOG.md` | Version history, removals, catalog refresh history, design and release context. |
| L03 | `package.json` | Version, scripts, direct dependencies. |
| L04 | `package-lock.json` | Installed dependency graph for audit/outdated review. |
| L05 | previous `ROADMAP.md` | Stale roadmap ideas and old source structure. |
| L06 | ignored `AGENTS.md` | Repo-local agent instruction pointer. |
| L07 | ignored `CLAUDE.md` | Repo-local architecture, commands, gotchas, stale v0.16.0 facts. |
| L08 | ignored `CODEX_CHANGELOG.md` | Prior local agent handoff and completed polish history. |
| L09 | ignored local portfolio memory | Intentional exclusions and v0.15.0-era project memory, summarized without committing private path details. |
| L10 | `astro.config.mjs` | Static output, site URL, sitemap, compression, prefetch. |
| L11 | `src/data/projects.ts` | Featured/live/catalog/skills data and repo references. |
| L12 | `src/data/curated.ts` | Greatest hits, now page, manifesto, healthcare narrative. |
| L13 | `src/data/derived.ts` | Derived counts and project lookups. |
| L14 | `src/data/types.ts` | Data contracts and language/category unions. |
| L15 | ignored `src/data/_stats.json` | Stale generated count/star/freshness evidence. |
| L16 | ignored `src/data/_readmes.json` | README corpus and parser surface. |
| L17 | ignored `src/data/_releases.json` | Release metadata corpus. |
| L18 | ignored `src/data/_stars.json` | Star metadata cache. |
| L19 | ignored `src/data/_meta.json` | Repo metadata cache. |
| L20 | `src/layouts/Base.astro` | SEO, command palette data, structured data, preconnects. |
| L21 | `src/pages/projects/[slug].astro` | README rendering and sanitization path. |
| L22 | `src/pages/og/[slug].png.ts` | OG image generation pipeline. |
| L23 | `public/scripts/main.js` | Runtime interactions, GitHub API enhancement, service worker registration. |
| L24 | `public/scripts/cmdk.js` | Command palette rendering and escaping. |
| L25 | `public/sw.js` | Service-worker caching behavior. |
| L26 | `scripts/fetch-stars.mjs` | GitHub metadata fetch and stale-cache behavior. |
| L27 | `scripts/capture-screenshots.mjs` | Screenshot capture workflow. |
| L28 | `.github/workflows/deploy.yml` | Build and deploy automation. |
| L29 | `public/screenshots/*.jpg` | Tracked visual asset inventory. |
| L30 | `legacy.html` | Historical static implementation and false-positive secret scan context. |

## Command Sources

| ID | Command | Result used |
|---|---|---|
| C01 | `rtk git log -10` | Failed because `rtk` was not available in this shell. |
| C02 | `git status --short --branch` | Confirmed clean `main...origin/main` before edits. |
| C03 | `git log -10 --oneline --decorate` | Recent release and privacy cleanup history. |
| C04 | `rg --files` | Repository file inventory. |
| C05 | `npm run check` | Passed baseline Astro/TypeScript checks. |
| C06 | `npm audit --omit=dev --json` | Production vulnerability evidence. |
| C07 | `npm outdated --json` | Current/wanted/latest package delta evidence. |
| C08 | `gh repo list SysAdminDoc --limit 300 --visibility public ...` | Live public repo and star counts; missing repo detection. |
| C09 | `gh repo view SysAdminDoc/RadAtlas ...` | Confirmed `RadAtlas` public, non-fork, X-ray-related description. |
| C10 | `gh repo view` for apparent stale entries | Confirmed several apparent stale catalog names were public forks. |
| C11 | `rg` broad secret-pattern scan | Found no hardcoded credential; only expected code/docs/package matches. |

## External Sources

| ID | Source | Use |
|---|---|---|
| E01 | https://docs.astro.build/en/guides/content-collections/ | Schema/content-collection migration option. |
| E02 | https://docs.astro.build/en/guides/upgrade-to/v6/ | Astro 6 migration planning. |
| E03 | https://docs.astro.build/en/guides/images/ | Image pipeline review. |
| E04 | https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages | GitHub Pages deploy workflow validation. |
| E05 | https://docs.github.com/en/code-security/concepts/supply-chain-security/about-dependabot-alerts | Dependency alert and Dependabot planning. |
| E06 | https://docs.astro.build/en/guides/view-transitions/ | Navigation enhancement option. |
| E07 | https://docs.astro.build/en/guides/prefetch/ | Prefetch behavior validation. |
| E08 | https://github.com/advisories/GHSA-j687-52p2-xcff | Astro define:vars XSS advisory. |
| E09 | https://github.com/advisories/GHSA-xr5h-phrj-8vxv | Astro server islands advisory. |
| E10 | https://github.com/advisories/GHSA-77vg-94rm-hx3p | devalue sparse array DoS advisory. |
| E11 | https://github.com/advisories/GHSA-6v9c-7cg6-27q7 | marked tokenizer OOM DoS advisory. |
| E12 | https://github.com/advisories/GHSA-qx2v-qp2m-jg93 | postcss XSS advisory. |
| E13 | https://github.com/advisories/GHSA-9mrh-v2v3-xpfm | sanitize-html allowedTags advisory. |
| E14 | https://github.com/advisories/GHSA-rpr9-rxv7-x643 | sanitize-html raw-text advisory. |
| E15 | https://pagefind.app/docs/ | Static search option. |
| E16 | https://github.com/lucaong/minisearch | Client-side search option. |
| E17 | https://www.fusejs.io/ | Fuzzy search option. |
| E18 | https://lunrjs.com/ | Client-side search option. |
| E19 | https://leerob.com/ | Personal site competitor pattern. |
| E20 | https://simonwillison.net/ | TIL, tools, release, and public worklog pattern. |
| E21 | https://jvns.ca/ | Writing-first developer site pattern. |
| E22 | https://fasterthanli.me/ | Long-form technical series and progress pattern. |
| E23 | https://rauno.me/ | Portfolio positioning and interaction craft pattern. |
| E24 | https://paco.me/ | Concise work/projects/now structure pattern. |
| E25 | https://maggieappleton.com/ | Digital garden, notes, library, now pattern. |
| E26 | https://brittanychiang.com/ | Accessible portfolio and project/experience structure pattern. |
| E27 | https://github.com/manuelernestog/astrofy | Astro portfolio template reference. |
| E28 | https://github.com/ixartz/Astro-boilerplate | Astro boilerplate and quality-gate reference. |
| E29 | https://github.com/zeon-studio/astroplate | Astro template reference. |
| E30 | https://casraf.dev/2024/08/create-an-automated-portfolio-using-github-and-astro/ | Automated GitHub portfolio reference. |
| E31 | https://www.w3.org/TR/WCAG22/ | Accessibility criteria reference. |
| E32 | https://web.dev/articles/vitals | Core Web Vitals reference. |
| E33 | https://web.dev/articles/bfcache | bfcache performance reference. |
| E34 | https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/updatefound_event | Service-worker update detection. |
| E35 | https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting | Service-worker activation behavior. |

## Evidence Gaps

- Competitor sites were used for pattern harvesting, not exact feature parity requirements.
- No live browser visual QA was needed because this pass changed documentation and planning files, not rendered UI code.
- GitHub public/private decisions for individual repositories must be confirmed by the repository owner before changing visibility or adding sensitive projects.
