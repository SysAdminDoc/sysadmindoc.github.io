# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.20.0
Last normalized: 2026-06-20

## Research-Driven Additions

### P0 — Trust and Security

- [ ] P0 — Add Permissions-Policy restrictive defaults
  Why: The site disables unused browser capabilities nowhere; an injected third-party script could access camera, microphone, geolocation, or payment APIs.
  Evidence: No `Permissions-Policy` meta tag or HTTP header found in `src/layouts/Base.astro`; MDN Permissions-Policy reference; GitHub Pages does not support custom HTTP headers.
  Touches: `src/layouts/Base.astro` (add `<meta http-equiv="Permissions-Policy">`), `scripts/audit-csp.mjs` (extend to verify the directive).
  Acceptance: Built pages include a Permissions-Policy meta restricting `camera=(), microphone=(), geolocation=(), payment=(), usb=()`, and `npm run csp:audit:dist` validates its presence.
  Complexity: S

- [ ] P0 — Add Trusted Types CSP directive
  Why: Trusted Types reached cross-browser baseline Feb 2026 and would add defense-in-depth against DOM XSS. The project already audits `innerHTML` usage, making adoption low-friction.
  Evidence: MDN Trusted Types reference; all `innerHTML` usage in `main.js` is already audited safe per CLAUDE.md; no dynamic `eval()` or `document.write()`.
  Touches: `src/layouts/Base.astro` (add `require-trusted-types-for 'script'` to CSP), `scripts/audit-csp.mjs`, `test/csp-audit.test.mjs`.
  Acceptance: CSP includes `require-trusted-types-for 'script'`; browser audit confirms no violations on representative routes; `npm run csp:audit:dist` gates the directive.
  Complexity: S

- [ ] P0 — Update satori to ^0.27.0
  Why: Fixes SVG fragment rendering errors in OG image generation and includes 10% core performance improvement from the 0.2x series.
  Evidence: satori changelog — 0.27.0 fixes React Fragments inside `<svg>`, 0.21.0 shipped 10% perf gain.
  Touches: `package.json`, `package-lock.json`.
  Acceptance: `npm run build:ci` passes with updated satori; OG images render without errors.
  Complexity: S

- [ ] P0 — Update sanitize-html to ^2.17.5
  Why: Bug fix release; keeps the dependency at the latest patch.
  Evidence: sanitize-html 2.17.5 released 2026-06-10.
  Touches: `package.json`, `package-lock.json`.
  Acceptance: `npm test` and `npm run build:ci` pass.
  Complexity: S

### P1 — Accessibility and Standards Compliance

- [ ] P1 — Add WCAG 2.2 target-size regression gate
  Why: WCAG 2.2 criterion 2.5.8 requires interactive targets >= 24×24 CSS pixels. Current targets are 42-44px (passing), but no automated gate catches regressions.
  Evidence: WCAG 2.2 became ISO/IEC 40500:2025; interactive elements in `global.css` use `min-height: 42px`/`44px` but this is not validated by any audit script.
  Touches: `scripts/audit-a11y.mjs` or new `scripts/audit-target-size.mjs`, `test/` unit test.
  Acceptance: A build-time or post-build audit scans representative routes for interactive elements below 24×24px and fails on violations.
  Complexity: S

- [ ] P1 — Add cross-document View Transition browser audit
  Why: The site enables MPA view transitions via `@view-transition { navigation: auto; }` but no browser test verifies the transition fires or causes regressions.
  Evidence: `src/styles/global.css` line 10; `tests/playwright/interaction-smoke.spec.mjs` does not exercise cross-page transitions; Chromium supports cross-document view transitions; Interop 2026 focus area.
  Touches: `tests/playwright/interaction-smoke.spec.mjs`, `playwright.interactions.config.mjs`.
  Acceptance: A Playwright test navigates between two pages in Chromium, confirms no console errors, and verifies the old page content is replaced (progressive enhancement — test should pass even if transition is not visually verified).
  Complexity: S

- [ ] P1 — Audit focus-not-obscured for sticky navigation
  Why: WCAG 2.2 criterion 2.4.11 (Focus Not Obscured, AA) requires focused elements not be fully covered by sticky headers. The site has a sticky nav on all pages.
  Evidence: WCAG 2.2 criterion 2.4.11; `src/styles/critical.css` and `global.css` define sticky/fixed nav; `scroll-padding-top` is set but not validated against focus states.
  Touches: `tests/playwright/portfolio-audits.spec.mjs` or `tests/playwright/interaction-smoke.spec.mjs`.
  Acceptance: A Playwright test tabs through representative pages and asserts no focused element has its bounding rect fully obscured by the sticky nav.
  Complexity: M

### P1 — CSS Modernization

- [ ] P1 — Adopt @starting-style for card entry animations
  Why: `@starting-style` is cross-browser baseline early 2026 and eliminates the need for JS-based entry animation timing for elements transitioning from `display: none`.
  Evidence: Chrome DevBlog CSS Wrapped 2025; Interop 2026; no `@starting-style` in `global.css`; project already uses scroll-driven reveal animations (`@keyframes reveal-in`).
  Touches: `src/styles/global.css` (add `@starting-style` blocks for `.rv`, card components, dialog transitions).
  Acceptance: Cards and dialogs (command palette, screenshot viewer) animate in from their initial state without JS timing; `prefers-reduced-motion: reduce` suppresses the animation.
  Complexity: S

- [ ] P1 — Adopt color-mix() for hover/active state tints
  Why: `color-mix()` is baseline since May 2023 and would replace manually-authored rgba hover/active tint values with computed relative colors, reducing maintenance overhead.
  Evidence: No `color-mix()` in `global.css`; 6272 lines include many hardcoded `rgba()` hover/active variants of theme tokens.
  Touches: `src/styles/global.css`.
  Acceptance: Hover/active states for buttons, cards, and links use `color-mix(in srgb, var(--token), transparent 85%)` instead of hardcoded rgba; visual baselines pass.
  Complexity: M

- [ ] P1 — Adopt :has() for conditional parent styling
  Why: `:has()` is baseline since Dec 2023 and would simplify conditional patterns (e.g., card styling when containing a live badge, section styling when containing an empty state).
  Evidence: No `:has()` usage in `global.css`; the 6272-line stylesheet has conditional parent-child styling patterns that use class toggles.
  Touches: `src/styles/global.css`.
  Acceptance: At least 3 existing class-toggle conditional styles are replaced with `:has()` selectors; `npm run audit:playwright` visual baselines pass.
  Complexity: S

### P1 — Testing and Reliability

- [ ] P1 — Add catalog URL-state persistence interaction smoke
  Why: Catalog view state (`cat=`, `q=`, `sort=`, `view=`) persists in URL query params, but no rendered browser test verifies that filtering updates the URL or that loading a URL with params restores the filter state.
  Evidence: `public/scripts/main.js` manages catalog URL state; `tests/playwright/interaction-smoke.spec.mjs` covers command palette, terminal, and search but not catalog filtering.
  Touches: `tests/playwright/interaction-smoke.spec.mjs`.
  Acceptance: A Playwright test selects a category filter, asserts the URL contains `cat=`, reloads, and verifies the filter is restored.
  Complexity: S

- [ ] P1 — Prepare for npm v12 install-script changes
  Why: npm v12 (July 2026) disables install scripts by default. Native dependencies (sharp, esbuild, lightningcss, playwright) will be blocked unless explicitly approved.
  Evidence: npm v12 changelog (July 2026); `sharp`, `esbuild`, `lightningcss`, and `@playwright/test` all have native components.
  Touches: `package.json` (add `approve-scripts` allowlist or equivalent), CI workflows.
  Acceptance: `npm install` with npm 12 succeeds without manual intervention; CI remains green.
  Complexity: S

### P2 — Progressive Enhancement

- [ ] P2 — Generate resume PDF at build time
  Why: 84% of employers want downloadable artifacts; the resume page has a print stylesheet and a "Print / Save PDF" button, but no pre-generated PDF is available for direct download.
  Evidence: Community research (Hakia 2026, Fueler); `src/pages/resume.astro` has `id="resumePrint"` button and print CSS; no `/resume.pdf` exists; JSON Resume export exists at `/resume.json`.
  Touches: `scripts/generate-resume-pdf.mjs` (new), `src/pages/resume.astro`, `package.json`.
  Acceptance: `npm run build:ci` generates `/resume.pdf` from the rendered resume HTML using Playwright; the resume page offers both "Print / Save PDF" and a direct PDF download link.
  Complexity: M

- [ ] P2 — Surface reading-time estimates in catalog and search
  Why: Reading-time metadata is already computed during README rendering but only displayed on project detail pages; surfacing it in catalog cards and Pagefind results would help visitors prioritize.
  Evidence: `src/data/readme-rendering.mjs` computes `readingTime` (words, minutes, label); `src/components/CatalogEntry.astro` does not display it; Pagefind result template does not include it.
  Touches: `src/components/CatalogEntry.astro`, `src/pages/search.astro` (Pagefind result template), `src/pages/projects/[slug].astro` (Pagefind metadata).
  Acceptance: Catalog cards show a reading-time badge for projects with README data; Pagefind results include reading-time in the metadata chips.
  Complexity: S

- [ ] P2 — Adopt CSS nesting in the most repetitive selector blocks
  Why: CSS nesting is baseline since Dec 2023 and would reduce selector repetition in the 6272-line stylesheet, improving maintainability.
  Evidence: No CSS nesting (`&` combinator) in `global.css`; lightningcss 1.32.0 supports nesting transformation; the `@layer` structure already groups related selectors.
  Touches: `src/styles/global.css`.
  Acceptance: The 10 most repetitive selector groups (catalog, search, project page, command palette, resume, timeline) use nested selectors; `npm run build:ci` passes; visual baselines pass.
  Complexity: M

- [ ] P2 — Adopt subgrid for card grid alignment
  Why: Subgrid is baseline since Sep 2023 and would ensure card content (title, description, badges) aligns across grid rows without fixed heights.
  Evidence: No `subgrid` in `global.css`; card grids (`.fg`, `.lg`, `.skg`) use `grid-template-columns` but inner card elements don't inherit track sizing.
  Touches: `src/styles/global.css` (card grid sections).
  Acceptance: Featured, live-app, and catalog card grids use `grid-template-rows: subgrid` so titles and descriptions align across rows; visual baselines pass.
  Complexity: S

### P2 — Architecture

- [ ] P2 — Split global.css along @layer boundaries
  Why: The 6272-line single file is hard to navigate despite `@layer` organization. Splitting into importable CSS modules behind the existing layer structure would improve maintainability without changing the cascade.
  Evidence: `global.css` declares `@layer site.critical, site.foundation, site.audit, site.homepage, site.secondary, site.polish, site.refinement, site.additions`; each layer section is a natural split boundary.
  Touches: `src/styles/global.css` (split into `src/styles/layers/*.css`), `src/styles/global.css` (becomes import aggregator), `astro.config.mjs`, `scripts/audit-css.mjs`.
  Acceptance: Each `@layer` section lives in its own file; `global.css` imports them in order; `npm run build:ci` passes; bundle size does not increase; visual baselines pass.
  Complexity: L

- [ ] P2 — Add Astro 6.2 getFontFileURL for OG image generation
  Why: Astro 6.2 added `getFontFileURL()` to resolve managed font files for Satori OG rendering, replacing manual font-file path resolution.
  Evidence: Astro 6.2 release notes; `src/pages/og/[slug].png.ts` currently resolves font files manually.
  Touches: `src/pages/og/[slug].png.ts`.
  Acceptance: OG image generation uses `getFontFileURL()` instead of manual path resolution; `npm run images:audit` passes.
  Complexity: S

### P3 — Future Preparation

- [ ] P3 — Add TypeScript 7 compatibility testing
  Why: TypeScript 7.0 RC published June 18, 2026 (stable ~July 2026). It rewrites the compiler in Go with 10x faster builds but has breaking changes (`strict: true` default, `target: es5` removed, `module` defaults to `esnext`).
  Evidence: TypeScript 7.0 RC announcement; `tsconfig.json` in this project; breaking changes require `tsconfig.json` audit.
  Touches: `tsconfig.json`, `package.json` (test with `typescript@rc` in a branch).
  Acceptance: A branch with TypeScript 7 RC builds and type-checks successfully; any required `tsconfig.json` changes are documented.
  Complexity: S

- [ ] P3 — Evaluate Astro 6.2 SVG optimizer API
  Why: Astro 6.2 added a pluggable SVG optimizer (ships with SVGO). The project uses inline SVGs in multiple components that could benefit from automated optimization.
  Evidence: Astro 6.2 release notes; `src/components/StarSvg.astro`, `src/components/SkillCard.astro`, `src/components/Heatmap.astro` contain inline SVGs.
  Touches: `astro.config.mjs`, SVG-containing components.
  Acceptance: A trial documents whether the SVG optimizer reduces payload without visual regressions; if beneficial, it is enabled in `astro.config.mjs`.
  Complexity: S

- [ ] P3 — Add Popover API for tooltips and lightweight overlays
  Why: The Popover API is baseline 2024-2025 and provides declarative popovers with light-dismiss behavior, replacing JS-based tooltip/overlay patterns.
  Evidence: No `popover` attribute usage in source; tooltips and status overlays in `main.js` use manual JS show/hide patterns.
  Touches: Relevant `.astro` components, `src/styles/global.css`, `public/scripts/main.js`.
  Acceptance: At least one tooltip or lightweight overlay (e.g., live-app status indicator, share confirmation) uses the Popover API with CSS-only styling; JS fallback remains for unsupporting browsers.
  Complexity: S
