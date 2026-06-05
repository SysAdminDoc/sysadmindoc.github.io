# Research Cycle 14 - Project-page sharing

Date: 2026-06-05
Scope: `sysadmindoc.github.io` project detail UX, PWA/install-adjacent flows, and low-risk correctness checks.

## Orientation

- `TODO.md` remains the single source of truth for open work. It was fully drained after T137, so this cycle looked for a fresh, testable improvement rather than reviving stale unchecked `ROADMAP.md` archive rows.
- `npm view` checks showed the direct Astro/Pagefind/Playwright package versions in `package.json` are current as of this pass: Astro 6.4.4, `@astrojs/check` 0.9.9, Pagefind 1.5.2, and `@playwright/test` 1.60.0.
- `npm audit --omit=dev --audit-level=high` reported 0 production vulnerabilities.
- The existing PWA manifest already includes basic shortcuts for Catalog, Search, Releases, and Now, so no duplicate manifest-shortcut item was promoted.

## External evidence

- MDN Web Share API marks Web Share as limited availability and secure-context-only. That makes native sharing useful but not sufficient on its own, especially for desktop browsers.
  Source: https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API
- web.dev PWA app-shortcuts guidance treats installed-app shortcuts as static, best-effort deep links that only appear after installation and should be ordered by priority. This supports keeping shortcuts but does not replace an in-page share/copy action.
  Source: https://web.dev/learn/pwa/enhancements
- web.dev's app-shortcut pattern describes shortcuts as a manifest-level installed-PWA affordance, while project sharing is an immediate page-level action.
  Source: https://web.dev/patterns/web-apps/shortcuts/

## Finding

Project detail pages had no share action:

- `src/pages/projects/[slug].astro` exposed GitHub, live-build, related-lane, and star surfaces.
- `public/scripts/project-page.js` handled recently viewed projects but had no share or copy-link flow.
- The site already has install/PWA affordances, but installed-app shortcuts are not visible to ordinary non-installed page visitors and do not help someone share the current project URL.

## Implemented

T138 adds:

- A `Share project` button in the project action row.
- Build-time `data-share-title`, `data-share-text`, and `data-share-url` attributes from the current project name, plain description, and canonical project URL.
- `navigator.share()` support when available.
- Clipboard fallback through `navigator.clipboard.writeText()`, then `document.execCommand('copy')` for older browser paths.
- A polite `aria-live` status for "Project shared.", "Project link copied.", and copy failure feedback.
- A source contract test in `test/project-share.test.mjs`.

## Verification

Completed verification for the cycle:

- `node --test test/project-share.test.mjs`
- `npm test`
- `npm run check`
- `npm run build`
- Browser preview at `http://127.0.0.1:4321/projects/project-nomad-desktop/`: desktop page identity matched, the `Share project` button was visible, clicking it produced `Project link copied.`, the browser clipboard contained `https://sysadmindoc.github.io/projects/project-nomad-desktop/`, console warnings/errors were empty, and a 390px mobile viewport showed the action row without horizontal overflow.

## Next queue

No new open work is being left in `TODO.md` from this pass. The remaining larger candidate that still needs a future design-heavy pass is style-side CSP hardening (`style-src 'unsafe-inline'` removal), which remains intentionally separate because source and built-output audits still report many inline style surfaces.
