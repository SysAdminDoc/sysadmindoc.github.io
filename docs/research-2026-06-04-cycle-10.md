# Project Research and Feature Plan

Cycle: 10
Date: 2026-06-04
Project: `SysAdminDoc/sysadmindoc.github.io`
Source of truth for open work: `TODO.md`
Current source version: `0.18.3`

## Executive Summary

Cycle 10 reviewed the forced-colors accessibility surface while the build machine was working on endpoint/cache follow-ups. The existing T103 item correctly names the data-visualization defect, but the repo still lacks a repeatable guard that can prove the heatmap, language donut, and skill rings remain perceivable when the browser forces the color palette.

Top opportunity:

1. **T134 P2** - Add a forced-colors browser audit for SVG data-visualization surfaces.

## Evidence Reviewed

Current repo state:

- Current head: `246abd0 ci: add post-deploy live smoke`.
- Latest deploy run `26962751614` completed successfully for `246abd0`.
- `git pull --rebase` could not run because implementer-owned unstaged changes were present; research edits avoided those files.
- The worktree currently has implementer-owned endpoint/cache changes under `scripts/`, `src/pages/`, and `src/data/endpoint-headers.ts`; those files were not edited.

Local files inspected:

- `TODO.md`
- `ROADMAP.md`
- `scripts/audit-a11y.mjs`
- `src/components/Heatmap.astro`
- `src/components/SkillCard.astro`
- `src/pages/index.astro`
- `src/styles/global.css`
- `src/styles/critical.css`
- `public/scripts/main.js`
- `package.json`
- `.github/workflows/quality-gates.yml`

External sources reviewed:

- MDN `forced-colors` CSS media feature: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors
- MDN `forced-color-adjust` CSS property: https://developer.mozilla.org/en-US/docs/Web/CSS/forced-color-adjust
- W3C WCAG 2.2 Understanding SC 1.4.11 Non-text Contrast: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- Playwright `page.emulateMedia()` API: https://playwright.dev/docs/api/class-page#page-emulate-media

## Current Product Map Delta

The site has three homepage data-visualization surfaces that are especially sensitive to forced-color behavior:

- Contribution heatmap: `Heatmap.astro` renders a role=`img` SVG grid. The intensity classes `.hm-0` through `.hm-4` are `rgba()` fills and swatch backgrounds in `global.css`.
- Language donut: `index.astro` renders SVG `<circle>` arcs with literal stroke colors, and `public/scripts/main.js` can re-render the same donut client-side with literal hex stroke colors.
- Skill rings: `SkillCard.astro` renders SVG background/foreground circles using `var(...)` stroke colors, then animates the foreground dash offset.

The current forced-colors block is targeted and intentionally small:

- `global.css` hides decorative overlays and adds real borders for controls under `@media(forced-colors:active)`.
- That block does not target `.heatmap-svg`, `.hm-*`, `.hm-swatch`, `.lang-donut`, `.lang-legend-dot`, `.sk-ring`, `.ring-bg`, or `.ring-fg`.
- `scripts/audit-a11y.mjs` is static HTML only; its own header says computed contrast, ARIA semantics, and Playwright coverage are a planned next upgrade.

## Highest-Value New Work

### T134 - Add a forced-colors browser audit for SVG data-visualization surfaces

- Priority: P2
- Impact: 3/5 because T103 is a real accessibility defect and data-viz surfaces can silently regress even when static HTML audits pass.
- Effort: 3/5 because the repo does not currently carry Playwright, but the audit can be narrow: one static preview, two viewport sizes, three regions.
- Risk: Medium if the test asserts exact colors; keep assertions focused on visibility, non-blank regions, discernible boundaries, and text equivalents.

Recommended implementation shape:

- Add a narrow browser audit script, for example `scripts/audit-forced-colors.mjs`.
- Use Playwright or an equivalent browser runner to serve/visit the built site and call `page.emulateMedia({ forcedColors: 'active' })`.
- Visit the homepage at representative desktop and mobile widths.
- Wait for the heatmap, language donut, and skill rings to render.
- Check that target regions are visible, have non-zero bounding boxes, and are not visually blank against the forced-color canvas. Prefer a small screenshot/pixel entropy or computed-style sanity check over exact color assertions.
- Confirm `matchMedia('(forced-colors: active)').matches` inside the page so the audit proves the emulation is active.
- Emit a compact summary listing each checked region and viewport.
- Wire as `npm run forced-colors:audit`, then include it in `npm run a11y:audit` or the weekly quality gate once stable.

## Reliability, Security, Privacy, and Data Safety

- The audit should run against local static output only and should not call GitHub or external services.
- Avoid runtime tool installation from the script itself. If Playwright is used, add it as an explicit dev dependency and document browser-install expectations.
- Do not assert exact system colors because user-selected palettes vary; assert perceivability and structural visibility.
- Do not use `forced-color-adjust:none` broadly. MDN cautions that it should only support user color/contrast requirements, not override user choices wholesale.

## Prioritized Roadmap

### Now

- [ ] P2 - Add forced-colors browser audit for homepage data visualization.
  - Evidence: Static a11y audit cannot catch computed forced-color/SVG paint regressions; current forced-colors CSS does not cover chart/ring selectors.
  - Verify: `npm run build && npm run forced-colors:audit`.

## Explicit Non-Goals

- Do not replace T103. T103 should fix the CSS/visual behavior; T134 should prove it keeps working.
- Do not create a separate high-contrast theme.
- Do not make exact color values the contract.
- Do not edit active endpoint/cache implementation work from this research lane.

## Appendix - Sources

Repository sources:

- `scripts/audit-a11y.mjs` - static HTML audit only; no browser/computed-color coverage.
- `src/styles/global.css:2620-2646` - existing forced-colors block for focus, decorative layers, and control borders.
- `src/components/Heatmap.astro:107-136` - heatmap SVG cells and accessible image label.
- `src/styles/global.css:3760-3824` - heatmap intensity fills and swatch backgrounds use `rgba()` color levels.
- `src/pages/index.astro:650-653` - static language donut SVG arcs use literal stroke colors.
- `public/scripts/main.js:266-277` - runtime language donut arcs use literal hex stroke colors.
- `src/components/SkillCard.astro:27-32` - skill-ring SVG foreground stroke uses custom-property colors.
- `package.json` - current `a11y:audit` maps only to the static audit script.
- `.github/workflows/quality-gates.yml` - weekly gate runs source/data/Astro checks but no browser forced-colors audit.

External sources:

- MDN `forced-colors` documents the media feature and notes that SVG `fill` and `stroke`, background images, and shadows are affected in forced-color mode: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors
- MDN `forced-color-adjust` cautions that the property should support user color/contrast requirements rather than bypass user choices: https://developer.mozilla.org/en-US/docs/Web/CSS/forced-color-adjust
- W3C WCAG 2.2 Understanding SC 1.4.11 explains that graph lines, chart slices, and other graphical objects required to understand data need sufficient non-text contrast or a conforming text equivalent: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- Playwright `page.emulateMedia()` supports `forcedColors: 'active'`/`'none'`, making a narrow browser audit practical: https://playwright.dev/docs/api/class-page#page-emulate-media
