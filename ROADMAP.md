# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.28.0
Last normalized: 2026-07-25

## Research-Driven Additions

### P0

- [ ] P0 — Publish the two undeployed releases and verify the live artifact
  Why: `https://sysadmindoc.github.io/status.json` reports `version: "0.26.3"` (commit `501cf88`, generated 2026-07-25T00:05:16Z) while `main` is at v0.28.0. Every fix from the v0.27.0 audit and the v0.28.0 drain is invisible to real visitors — the live `/ai/` page has no `Service` schema, live `/screenshots/` has no footer (so no contact affordance), and the live service worker is still `portfolio-v0.26.3`.
  Evidence: live `/status.json`, `/sw.js`, `/ai/`, `/screenshots/` probed 2026-07-25; `git log origin/gh-pages` newest entry is `08702b4 deploy: publish portfolio v0.26.3` (2026-07-24 20:05 -0400); RESEARCH.md Executive Summary.
  Touches: no source changes — `npm run deploy:preflight`, `npm run publish:pages`, then the automatic live smoke inside `scripts/publish-pages.mjs:248`.
  Acceptance: `curl -s https://sysadmindoc.github.io/status.json` reports version `0.28.0` and the `main` HEAD commit; live `/ai/` contains `"@type":"Service"`; live `/screenshots/` contains a `<footer>`; live `/sw.js` contains `portfolio-v0.28.0`.
  Complexity: S

- [ ] P0 — Add a standalone live-vs-HEAD deploy drift check
  Why: The version contract is enforced correctly, but only as a post-publish step. Between publishes nothing reports that the live site is behind, which is how two full releases shipped to `main` and never reached visitors with every local gate green.
  Evidence: `scripts/publish-pages.mjs:248` (`runLiveSmoke`) is the only caller of the contract; `scripts/smoke-live-site.mjs:317` requires `--expected-version` to be passed in; `package.json` `smoke:live` takes no defaults; nothing in `deploy:preflight` touches the live origin.
  Touches: `scripts/smoke-live-site.mjs` (default the contract from `package.json` + `git rev-parse HEAD` when flags are omitted), `package.json` (a `deploy:status` entry), `README.md`.
  Acceptance: `npm run deploy:status` fetches `/status.json` and exits non-zero with a clear message naming both versions when live lags `package.json`; exits 0 when they match; requires no arguments.
  Complexity: S

- [ ] P0 — Fix the `/resume/` print stylesheet, which loses to interior-quiet.css on specificity
  Why: The published `resume.pdf` is the site's primary hiring artifact and it renders with screen styles. Almost every declaration in the print block uses a bare class selector and is outranked by `body.route-interior …`, so the PDF ships a 1320px two-column grid with 104px of dead top padding squeezed onto Letter, 48px headings instead of 24pt, blue section headings instead of black, and screen-sized body text.
  Evidence: `src/pages/resume.astro:157-179` uses `.resume-role` (0,1,0) etc.; `src/styles/interior-quiet.css:86-102` uses `body.route-interior .resume-role` (0,2,1) and is loaded on `/resume/` (17 `route-interior`/`interior-quiet` occurrences in `dist/resume/index.html`). Confirmed by Chromium `emulateMedia({media:'print'})` against built `dist/resume/index.html`: `.resume-page` padding stays `104px 32px 56px` against a requested `0`, `h1` stays 48px against 24pt, `h2` stays `rgb(31,95,204)` against `#111`. Only the `!important` rules and `.resume-section h2` survive. `scripts/generate-resume-pdf.mjs` uses `page.pdf()`, which applies print media, so this reaches the tracked `dist/resume.pdf`. Separately, `src/styles/global.css:3357` (`a[href^="http"]::after{content:" (" attr(href) ")"}`) applies in print, so the Links section renders `linkedin.com/in/matthewryanparker (https://www.linkedin.com/in/matthewryanparker)`.
  Touches: `src/pages/resume.astro`, `src/styles/interior-quiet.css`, `src/styles/global.css`, `scripts/generate-resume-pdf.mjs`, `tests/playwright/`.
  Acceptance: Under print media every declaration in the resume print block wins (scope the print rules to `body.route-interior` or move them into `interior-quiet.css`, rather than blanket `!important`); the `::after` URL expansion is suppressed for links whose text already is the URL; a Playwright spec asserts the computed print values for at least page padding, `h1` size, and `h2` color; `dist/resume.pdf` is regenerated and visually checked.
  Complexity: M

### P1

- [ ] P1 — Close the CSP audit's advisory-only failure paths
  Why: `csp:audit:dist:style:elem` runs inside `build:ci` and is the gate that is supposed to catch exactly two things it cannot currently fail on: a style attribute that production blocks, and a third-party script origin that `script-src 'self'` blocks. In both cases the audit detects the condition, prints it, and exits 0. The tool's whole premise is catching these before they ship.
  Evidence: `scripts/audit-csp.mjs:595-603` computes `activeStyleAttrUnsafeInlineRequired` / `activeStyleSrcUnsafeInlineRequired`; both appear only in `console.log` at `:682` and `:684` and in no `failures.push`. The sole style-attr failure at `:791` is gated on `candidateStyleAttr`, which only `--candidate-style-src-attr` sets — a flag `build:ci` never passes. Production ships `style-src-attr 'none'` (`src/layouts/Base.astro:60`). Separately, `:532-534` collect `externalScripts`/`thirdPartyScripts` and `:662` prints the count, but there is no `scriptLinkAllowedByCandidate()` counterpart to the `styleLinkAllowedByCandidate()` at `:248`, so no external script source is ever checked against `script-src`. Both reproduced against a synthetic dist: the audit printed `style-src-attr unsafe-inline required today: yes` and `third-party external scripts: 1` and still exited 0.
  Touches: `scripts/audit-csp.mjs`, `test/csp-audit.test.mjs`.
  Acceptance: In `--dist --strict` mode a style attribute that the active `style-src-attr` blocks fails the audit, and an external script whose origin the active `script-src` does not allow fails the audit; `test/csp-audit.test.mjs` covers both with fixtures; `npm run build:ci` stays green on the current tree.
  Complexity: M

- [ ] P1 — Make `publish:pages` recover from a deleted worktree directory
  Why: `.tmp/` is gitignored scratch that any cleanup will remove, and removing it permanently breaks the deploy path until repaired by hand. `gh-pages` is checked out in a linked worktree, so once the directory is gone git treats it as registered-but-missing.
  Evidence: `scripts/publish-pages.mjs:193-215` — `ensurePagesWorktree` handles "worktree exists" (`:197`) and "path exists but is not a worktree" (`:205`) but not registered-but-missing; `:211` then runs `git worktree add <dir> gh-pages`, which fails with `fatal: '<dir>' is a missing but already registered worktree; use 'add -f' to override, or 'prune' or 'remove' to clear`. No `git worktree prune` or `--force` appears anywhere in the script. Reproduced in a scratch repo. Secondary: the fresh-worktree branch (`:209-214`) checks out the local `gh-pages` without the `pull --ff-only` its sibling path performs at `:201`, so a stale local branch produces a non-fast-forward rejection at `:245` after the worktree has already been wiped and recommitted.
  Touches: `scripts/publish-pages.mjs`.
  Acceptance: Deleting `.tmp/gh-pages-publish` and re-running `publish:pages` succeeds (prune-then-add, or `add -f`); the fresh-worktree path fast-forwards from `origin/gh-pages` before committing, so a stale local branch cannot reach the push step.
  Complexity: S

- [ ] P1 — Resolve the dead prefetch / clientPrerender configuration
  Why: `experimental.clientPrerender: true` is enabled with `prefetchAll: false`, and zero `data-astro-prefetch` attributes exist in `src/` or the built HTML — so no link ever prefetches or prerenders. The 2,807-byte prefetch runtime still loads on 13 routes doing nothing, and the inline `<script type="speculationrules">` it injects would be refused by `script-src 'self'` even if a link did opt in. Config, CSP, and markup currently disagree three ways.
  Evidence: `astro.config.mjs:36-44`; `dist/_assets/page.BcFG7dWc.js` (contains `type="speculationrules"` + `JSON.stringify({prerender:[...]})`, referenced from 13 built pages); `grep -c data-astro-prefetch dist/` returns 0; built CSP is `script-src 'self'`. Chrome reports p75 LCP of 320 ms for prerendered navigations vs 1,800 ms without.
  Touches: `astro.config.mjs`, `src/components/InteriorNav.astro`, `src/components/CatalogSection.astro`, `src/layouts/Base.astro` (CSP `scriptSrc`), `scripts/audit-csp.mjs`, `test/csp-audit.test.mjs`.
  Acceptance: Either (a) nav and catalog links carry `data-astro-prefetch`, `script-src` gains `'inline-speculation-rules'` (which permits only `type="speculationrules"`, not general inline JS), `csp:audit` accepts the keyword, and a Playwright assertion confirms a speculation-rules script is injected with no CSP violation; or (b) the `prefetch` and `experimental.clientPrerender` config is removed and `dist/_assets/page.*.js` no longer ships. Bundle budget stays green either way.
  Complexity: M

- [ ] P1 — Emit per-page `lastmod` in the sitemap from existing review dates
  Why: The sitemap publishes `changefreq` and `priority` but no `lastmod`, while 12 built pages already carry a `dateModified` sourced from `src/data/page-freshness.ts`. Accurate, human-reviewed dates are exactly the kind Google treats as trustworthy; the data exists and is simply not exposed.
  Evidence: `grep -c lastmod dist/sitemap-0.xml` returns 0; `grep -rlo dateModified dist/*/index.html` returns 12; `astro.config.mjs:11-24` `serialize()` sets only priority/changefreq; `@astrojs/sitemap` supports `item.lastmod` in `serialize()`; `scripts/audit-sitemap.mjs` contains no `lastmod` assertion.
  Touches: `astro.config.mjs`, `src/data/page-freshness.ts`, `scripts/audit-sitemap.mjs`, `test/`.
  Acceptance: Every sitemap entry with a reviewed date carries a matching `<lastmod>`; the value comes from `page-freshness.ts` rather than build time (no all-dates-move-on-every-build); `sitemap:audit` fails if a reviewed route loses its `lastmod`.
  Complexity: S

- [ ] P1 — Backfill git tags and GitHub Releases for v0.26.1 through v0.28.0
  Why: Remote tags stop at `v0.26.0` and the newest GitHub Release is v0.26.0, but CHANGELOG.md documents v0.26.1, v0.26.2, v0.26.3, v0.27.0, and v0.28.0. The v0.27.0 audit and v0.28.0 drain are the two largest bodies of work in the project's recent history and neither is tagged, so there is no way to check out or diff a shipped version.
  Evidence: `git ls-remote --tags origin` newest is `v0.26.0`; `gh release list` newest is `v0.26.0` (2026-07-24T22:26:31Z); `CHANGELOG.md` headings for all five versions.
  Touches: git tags, GitHub Releases, `CHANGELOG.md` if any entry needs a date correction.
  Acceptance: Tags `v0.26.1`…`v0.28.0` exist on the correct commits and are pushed; each has a GitHub Release whose notes come from its CHANGELOG section; `gh release list` shows v0.28.0 as latest.
  Complexity: S

### P2

- [ ] P2 — Reconcile the two contradictory endpoint header contracts
  Why: The repo asserts two different, mutually exclusive header contracts for the same routes, and the one enforced at build time describes headers that a static build physically cannot produce. Astro's static output writes each endpoint's body to disk and discards its `Response` headers; GitHub Pages then serves its own. So ~35 lines of the endpoint audit give false assurance about content types and caching.
  Evidence: `scripts/audit-public-endpoints.mjs:9,26` assert `application/feed+json; charset=UTF-8` and `public, max-age=300` for `/feed.json`; `curl -sI https://sysadmindoc.github.io/feed.json` returns `application/json; charset=utf-8` and `max-age=600`; `scripts/smoke-live-site.mjs:190-231` already encodes the real values. `astro.config.mjs` is `output: 'static'`. 11 pinned expectations are affected.
  Touches: `scripts/audit-public-endpoints.mjs`, `src/data/endpoint-headers.ts`, `test/`.
  Acceptance: The endpoint audit either drops the served-header assertions (keeping the source-level check that each route still calls the header helper, documented as intent-only) or asserts the values GitHub Pages actually serves; no route is covered by two contradictory expectations; `endpoints:audit` and `smoke:live` agree.
  Complexity: S

- [ ] P2 — Validate built feed and endpoint bodies, not just their source imports
  Why: `endpoints:audit` and `feed:audit` between them never parse `dist/rss.xml`, `dist/releases.xml`, or `dist/resume.json`. For those routes the audit only checks that the *source* file imports the header helper, so an empty or malformed body ships with both gates green.
  Evidence: `scripts/audit-public-endpoints.mjs` performs no parse for those three routes; `scripts/audit-feed.mjs` covers `feed.json` and `atom.xml` only; `test/resume-schema.test.mjs` validates `src/data/career.ts` and source greps rather than built output.
  Touches: `scripts/audit-feed.mjs`, `scripts/audit-public-endpoints.mjs`, `test/`.
  Acceptance: `rss.xml` and `releases.xml` are parsed as XML with a non-zero item count and required channel fields; `resume.json` is parsed and validated against the JSON Resume shape already asserted for the source data; truncating any of the three fails the build.
  Complexity: S

- [ ] P2 — Widen the CSP runtime-sink scan beyond `public/scripts`
  Why: The scan that decides "Trusted Types trial ready" and "style-src-attr unsafe-inline required" only reads `public/scripts`, and is skipped entirely in `--dist` mode — the mode `build:ci` actually runs. The site enforces `require-trusted-types-for 'script'` and `style-src-attr 'none'` in production, so an HTML-sink or inline-style write in `public/sw.js`, an Astro-bundled component script, or `/cmdk-data.js` would break at runtime with a green audit.
  Evidence: `scripts/audit-csp.mjs:496` — `runtimeStyleRoots = [path.resolve(root, 'public', 'scripts')]`, hardcoded; `src/layouts/Base.astro:66` enforces Trusted Types; `dist/_assets/page.BcFG7dWc.js` is an Astro-bundled script that exists today and is never scanned. Currently latent: grepping `public/sw.js`, `src/**`, and `dist/_assets/*.js` for `innerHTML|outerHTML|insertAdjacentHTML|createContextualFragment|cssText|setAttribute('style'` returns zero hits, and `test/trusted-types.test.mjs` only asserts source strings in `Base.astro`.
  Touches: `scripts/audit-csp.mjs`, `test/csp-audit.test.mjs`.
  Acceptance: The sink scan covers `public/**/*.js` (including `sw.js`) and, in `--dist` mode, `dist/**/*.js`; a fixture containing `innerHTML =` in a bundled script fails the strict audit.
  Complexity: S

- [ ] P2 — Make Playwright snapshot paths platform-aware
  Why: This is the root cause of both "requires Linux-generated visual baselines" blockers in `Roadmap_Blocked.md`, not a separate problem. Baselines are stored per project only, so a Linux PNG and a Windows PNG collide on one path and the two CSS refactors cannot be verified from this worktree.
  Evidence: `playwright.audits.config.mjs` `snapshotPathTemplate` is `{testDir}/__screenshots__/{projectName}/…` with no `{platform}`; `playwright.interactions.config.mjs` spreads it unchanged; 104 baselines across 2 projects; `Roadmap_Blocked.md` P2 entries for the `@layer` split and CSS nesting both cite the same blocker.
  Touches: `playwright.audits.config.mjs`, `tests/playwright/__screenshots__/` (relocate existing baselines), `README.md`, `Roadmap_Blocked.md` (move both P2 items back once verified).
  Acceptance: `snapshotPathTemplate` includes `{platform}`; existing Linux baselines are relocated rather than deleted; a Windows baseline set can be generated with `audit:playwright:update` without overwriting them; both blocked CSS items move back to ROADMAP.md.
  Complexity: M

- [ ] P2 — Give the error/recovery states real WCAG 2.2 target-size coverage
  Why: In axe-core 4.12.1 the `wcag22aa` tag maps to exactly one rule, `target-size`, and that rule is `enabled: false` by default — `withTags()` selects rules, it does not enable disabled ones. `portfolio-audits.spec.mjs` compensates with its own `collectTargetSizeViolations` across 14 routes, but `state-coverage.spec.mjs` does not, so the 404 page, offline shell, and open command palette have no SC 2.5.8 coverage while the tag list implies they do.
  Evidence: `tests/playwright/state-coverage.spec.mjs:50-57`; `tests/playwright/portfolio-audits.spec.mjs:141` and `:345-361`; enumerated locally — `axe.getRules()` returns `target-size` as the only `wcag22aa` rule and it appears in axe's disabled-by-default set.
  Touches: `tests/playwright/state-coverage.spec.mjs`, possibly a shared helper extracted from `portfolio-audits.spec.mjs`.
  Acceptance: The error/recovery states are checked for SC 2.5.8 — either via `.options({ rules: { 'target-size': { enabled: true } } })` or the existing hand-rolled collector — and the suite fails if a state regresses; any state deliberately exempt is documented in the spec.
  Complexity: S

- [ ] P2 — Correct the architecture claims in README.md
  Why: README.md is the only documentation tracked in git and it describes components and a route tree the code no longer has. Its `src/pages/` listing omits `/ai/` and `/catalog/` — the flagship v0.23.0 and v0.26.0 features the same README describes elsewhere.
  Evidence: `README.md:23` claims homepage and interior jump links share `SectionJumpNav`, but `src/pages/index.astro` does not import it (eight interior routes do); `README.md:163` lists a "tag cloud" component with no counterpart in `src/components/`; the `src/pages/` tree omits `ai.astro`, `catalog.astro`, `status.astro`, `status.json.ts`, `resume.json.ts`, `cmdk-data.js.ts`.
  Touches: `README.md`.
  Acceptance: Every component and route named in README.md exists; every shipped route appears in the tree; the `SectionJumpNav` claim is scoped to interior routes.
  Complexity: S

- [ ] P2 — Type-check `scripts/` and `test/`
  Why: `scripts/` is 40 files and ~10,500 lines, gates the entire build, and is never seen by `astro check`. It is the largest surface in the repo with no static analysis at all, and the v0.27.0 audit found two real defects inside it by reading rather than by tooling.
  Evidence: `tsconfig.json` includes only `src/**/*` and `.astro/types.d.ts`; `scripts/` and `test/` (51 files, ~3,900 lines) are outside it.
  Touches: `tsconfig.json` (or a second `tsconfig.scripts.json`), `package.json` (`check`), possibly JSDoc type annotations in the noisiest scripts.
  Acceptance: `npm run check` type-checks `scripts/` and `test/` in `checkJs` mode; the run is clean; a deliberately broken call signature in any audit script fails the check.
  Complexity: M

- [ ] P2 — Point the `Person` entity's canonical `url` at the site
  Why: `Person.url` resolves the entity's canonical page to GitHub while the node's `@id` is on this site and GitHub is already listed in `sameAs`. Entity consolidation is the strongest structured-data lever for AI answer engines, and this splits it.
  Evidence: built `/ai/` and `/` JSON-LD — `"@id": "https://sysadmindoc.github.io/#matt-parker"` with `"url": "https://github.com/SysAdminDoc"` and `sameAs` already containing the same GitHub URL.
  Touches: `src/layouts/Base.astro` (or wherever the Person node is built), `scripts/audit-schema.mjs`, `test/`.
  Acceptance: `Person.url` is `https://sysadmindoc.github.io/`; `sameAs` still carries GitHub and LinkedIn; `schema:audit` passes and asserts the `url`/`@id` origin match.
  Complexity: S

### P3

- [ ] P3 — Harden the CSP audit's HTML/attribute parsing
  Why: The audit parses HTML and Astro source with regex, and three known parse defects each cause it to miss a real violation. All are latent on the current tree, but the v0.28.0 fix for the `on*` bare-word bug fixed only one of the two identical branches.
  Evidence: `scripts/audit-csp.mjs:321` — the `style` branch never got the `typeof value === 'string'` guard that `:311` received, so `parseAttrs(" title={\`house style guide\`}")` yields `{title:'{', house:true, style:true, guide:true}` and records a phantom style attribute. `:270,:332,:355` — a `>` inside a quoted attribute truncates the tag, so `<a href="/x" title="a > b" onclick="alert(1)">` parses to `{href:'/x', title:true, a:true}` and the handler is invisible; `<script data-x="a>b">alert(1)</script>` yields the wrong content hash. HTML comments are not stripped, so a commented-out `<script>` is counted. All three currently affect 0 of 26 `src/**/*.astro` and 0 of 22 `dist/**/*.html`, but the `>`-in-attribute case is reachable from an arrow function in an attribute expression (`class:list={a.map((x) => x)}`), which source mode reads verbatim.
  Touches: `scripts/audit-csp.mjs`, `test/csp-audit.test.mjs`.
  Acceptance: The `style` branch carries the same value-type guard as the `on*` branch; quoted attribute values containing `>` no longer truncate the tag; HTML comments are stripped before scanning; each case has a regression fixture.
  Complexity: M

- [ ] P3 — Stop fabricating the active policy in the CSP audit's source mode
  Why: `resolveGeneratedCsp` hardcodes the values it is supposed to be reading, so source-mode runs report a policy that may not match `Base.astro`. If the production branch ever gained `'unsafe-inline'`, `node scripts/audit-csp.mjs --strict` would still print `script-src: 'self'` and the `unsafe-inline` check would not fire.
  Evidence: `scripts/audit-csp.mjs:132-150` substitutes `'self'` for `${scriptSrc}`/`${styleSrc}` and `'none'` for `${styleAttrSrc}` rather than parsing `src/layouts/Base.astro`, and never substitutes `${trustedTypes}` (the literal template string appears in the printed active CSP). Mitigated because `--dist` mode reads real rendered HTML and that is what `build:ci` runs, so this is source-mode-advisory only.
  Touches: `scripts/audit-csp.mjs`, `test/csp-audit.test.mjs`.
  Acceptance: Source mode derives the directive values from `Base.astro` or fails loudly when it cannot; the printed active CSP contains no unsubstituted `${…}`; a fixture that adds `'unsafe-inline'` to the production branch fails `--strict` in source mode.
  Complexity: M

- [ ] P3 — Make the OG font cache write atomic and validated
  Why: `loadFont` trusts any file already at the cache path and writes it non-atomically, so an interrupted build or a 200-with-HTML response permanently poisons `.astro/fonts/` and every subsequent build fails inside satori with an opaque font-parse error.
  Evidence: `src/pages/og/[slug].png.ts:17-31` — `existsSync(cachePath)` short-circuits with no validation; the download path checks only `res.ok` and calls `writeFileSync` directly with no temp-and-rename and no length or magic-byte check. The rest of the file is clean: `getStaticPaths` enumerates a static array so slug injection is impossible, `cardForSlug` throws on unknown slugs, all 12 cards render, and the longest description is 155 chars against a ~192-char clamp.
  Touches: `src/pages/og/[slug].png.ts`.
  Acceptance: The font is written to a temp path and renamed only after a successful download; a cached file failing a size or `wOFF`/`OTTO`/`\x00\x01\x00\x00` magic-byte check is discarded and re-fetched; a truncated cache file self-heals on the next build instead of failing it.
  Complexity: S

- [ ] P3 — Restructure `/ai/` around question-shaped headings and direct answers
  Why: The page's four headings are all statements ("What I deliver", "How the engagement works"). GEO research finds retrieval failures dominate ranking failures, and that pages answering a query explicitly near the top — with the question as the heading — are cited materially more often by AI answer engines. This is the site's only commercial surface and its structured data is already correct, so page structure is the remaining lever.
  Evidence: built `/ai/` headings (791 words total); arXiv 2603.09296 on citation failure modes; 2026 GEO/AEO guidance in RESEARCH.md Sources. Note: this is content structure, not `FAQPage` schema — Google dropped FAQ rich results on 2026-05-07.
  Touches: `src/pages/ai.astro`.
  Acceptance: Each service line and engagement stage is introduced by a question a prospect would actually type, answered in the first sentence beneath it; the `Service`/`OfferCatalog` graph still matches the rendered lines; `schema:audit` and the Pagefind relevance corpus stay green.
  Complexity: M

- [ ] P3 — Correct the architecture section of CLAUDE.md
  Why: CLAUDE.md is the working contract every agent session reads first, and several of its claims are false, which costs a session's context to discover. It is gitignored, so this is a local-only fix.
  Evidence: it lists `FeaturedCard` and `TagCloud` components (neither exists anywhere in the repo) and omits `CatalogSection`, `Footer`, `InteriorNav`, `SectionJumpNav`; names `scripts/generate-data.mjs`, which does not exist; points `legacy.html` at the repo root when the file is at `docs/archive/legacy.html`; states `global.css` is "~5700 lines" when it is 5,899; cites a "v1.0 premium polish pass" block at line ~1908 when the label is at 1360; and still documents the removed About, Philosophy, Journey, and Volume homepage sections.
  Touches: `CLAUDE.md`.
  Acceptance: Every path, component, script, and line reference in CLAUDE.md resolves; the homepage section list matches the `<h2>` elements actually in `src/pages/index.astro`.
  Complexity: S

- [ ] P3 — Gate dependency freshness in the deploy preflight
  Why: `deps:audit` correctly flattens `overrides` — which `npm outdated` cannot see, because they are exact pins — and reports `vite 8.1.3 → 8.1.5` and `fast-uri 3.1.4 → 4.1.1`, but it exits 0 and is not part of `deploy:preflight`. The only tool that can see pinned-override drift never blocks anything.
  Evidence: `scripts/audit-dependencies.mjs:64,98` (`flattenOverridePackages`); its output reports both as `latest-update` / `major-available` while printing "Dependency freshness report passed"; `package.json` `deploy:preflight` does not call it. (Vite 8.1.4/8.1.5 contain no security fixes, so this is hygiene rather than urgency.)
  Touches: `package.json`, `scripts/audit-dependencies.mjs`.
  Acceptance: `deps:audit` gains a strict mode that exits non-zero on patch/minor drift in pinned overrides, `deploy:preflight` runs it, and the `vite` pin is moved to 8.1.5; documented major-version holds (TypeScript, `fast-uri`) do not fail the gate.
  Complexity: S

- [ ] P3 — Clear stale local build debris
  Why: The project rule is to delete previous build artifacts before producing new ones. The repo root holds a two-versions-stale 5.8 MB release zip alongside current output, plus a leftover scratch file and an empty directory from the GitHub Actions removal.
  Evidence: `sysadmindoc-portfolio-v0.26.0.zip` (5,816,068 bytes), `_extracted.json` (35,559 bytes), and an empty `.github/` directory. All three are gitignored, so this is local hygiene only.
  Touches: repo root working tree; optionally a clean step in the release path.
  Acceptance: The stale zip, `_extracted.json`, and the empty `.github/` directory are gone; if release zips are still produced, the release path deletes the previous one first.
  Complexity: S

## Not audited as of 2026-07-25

These areas remain unexercised and may still hold defects:

- Playwright visual-regression baselines — Linux-generated and not comparable on this
  Windows worktree. The P2 item above addresses the cause rather than the symptom.
- `scripts/publish-pages.mjs` end-to-end execution — the script was read and one recovery
  defect reproduced in a scratch repo, but a real publish has never been run from here.
- `src/pages/og/[slug].png.ts` visual output — the code path was traced and all 12 cards
  render, but the images were not inspected. A redesign is already tracked as P0 in
  `Roadmap_Blocked.md`.
- `scripts/audit-performance.mjs`, `scripts/run-lhci.mjs`, and the Lighthouse path — never
  run in any pass.
- `scripts/fetch-stars.mjs` failure modes (rate limiting, partial responses, ETag drift)
  under live conditions.
