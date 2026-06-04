# Project Research and Feature Plan

Cycle: 11
Date: 2026-06-04
Project: `SysAdminDoc/sysadmindoc.github.io`
Source of truth for open work: `TODO.md`
Current source version: `0.18.3`

## Executive Summary

Cycle 11 reviewed the deferred CSP hardening item after the quality-gate build-output path was verified. T95 remains the right security direction, but the current repo still has multiple executable inline scripts plus an inline stylesheet `onload` handler. The next valuable step is a small CSP preflight audit that inventories blockers and produces hashes/classifications before any implementation removes `script-src 'unsafe-inline'`.

Top opportunity:

1. **T135 P2** - Add a CSP preflight audit before removing `script-src 'unsafe-inline'`.

## Evidence Reviewed

Current repo state:

- Current head: `1eb3d04 docs: record quality gate verification`.
- Manual weekly quality-gates run `26964197962` passed on `7a71c5e`, including generated-data refresh, local checks, build-output audits, artifacts, and summary publication.
- Deploy run `26964196179` for `7a71c5e` completed successfully.
- Deploy run `26964430309` for `1eb3d04` completed successfully; both the build job and the post-deploy live smoke passed.
- The worktree has implementer-owned source/search changes in progress. This research cycle avoided those files and updated only planning docs.

Local files inspected:

- `TODO.md`
- `ROADMAP.md`
- `src/layouts/Base.astro`
- `src/components/SectionJumpNav.astro`
- `src/pages/projects/[slug].astro`
- `src/pages/search.astro`
- `src/pages/resume.astro`
- `src/pages/timeline.astro`
- `src/pages/lang/[slug].astro`
- `scripts/`
- `package.json`
- `.github/workflows/`

External sources reviewed:

- MDN `Content-Security-Policy: script-src` directive: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src
- web.dev strict CSP guide: https://web.dev/articles/strict-csp

## Current Product Map Delta

The active CSP is still delivered as an HTML meta tag in `Base.astro`:

- `default-src 'self'`
- `script-src 'self' 'unsafe-inline'`
- `style-src 'self' 'unsafe-inline'`
- `object-src 'none'`
- `base-uri 'self'`

The inline-script surface is not limited to the old FOUC theme bootstrap:

- `src/layouts/Base.astro:111` uses an inline `onload` handler on the async stylesheet link. MDN documents that `script-src` covers inline event handlers, and normal inline script hashes do not allow event handlers unless an unsafe-hashes path is chosen.
- `src/layouts/Base.astro:132` still contains the early theme-init script, which is FOUC-sensitive.
- `src/layouts/Base.astro:161-163` injects page command-palette section data with `define:vars`.
- `src/components/SectionJumpNav.astro:31-118` owns in-page jump-nav behavior.
- `src/pages/projects/[slug].astro:341-351` records recently viewed projects in `localStorage`.
- `src/pages/search.astro:110-127` bootstraps Pagefind from the query string.
- `src/pages/resume.astro:91-95` wires the print button.
- `src/pages/timeline.astro:388+` wires timeline filtering.
- JSON-LD blocks exist in `Base.astro`, `lang/[slug].astro`, and `projects/[slug].astro`; those should be classified as data blocks rather than executable script blockers.
- External self-hosted scripts such as `/cmdk-data.js`, `/scripts/shared.js`, `/scripts/cmdk.js`, `/scripts/theme.js`, `/scripts/main.js`, and `/pagefind/pagefind-component-ui.js` are currently source-allowed by `'self'`.

No existing audit covers this inventory. A repository search for `csp`, `Content-Security-Policy`, `unsafe-inline`, `script-src`, and inline handler patterns found the CSP meta tag and implementation usages, but no package script, workflow step, or `scripts/` audit that would prevent CSP regressions.

## Highest-Value New Work

### T135 - Add a CSP preflight audit before removing `script-src 'unsafe-inline'`

- Priority: P2
- Impact: 4/5 because this turns a deferred security item into a tractable implementation queue and reduces the risk of breaking core navigation/theme/search behavior.
- Effort: 2/5 for an inventory-first script; higher only if it is bundled with the actual T95 CSP migration.
- Risk: Low if the first pass is read-only/reporting and strict mode is introduced as an allowlist-based gate.

Recommended implementation shape:

- Add a focused `scripts/audit-csp.mjs`.
- Parse source templates and/or built `dist/**/*.html`.
- Report the current CSP policy and the exact directives that still contain `unsafe-inline`.
- Inventory inline executable `<script>` blocks, inline event-handler attributes, external self-hosted scripts, JSON-LD script blocks, inline `<style>` blocks, and style attributes separately.
- Compute SHA-256 hashes for stable inline script blocks, matching CSP's base64 hash-source format.
- Mark dynamic blocks that probably need externalization, a nonce-capable serving path, or an explicit hash decision.
- Add a strict/candidate mode that can fail if `script-src 'self'` would block existing behavior, or if new executable inline blocks/handlers appear outside a checked allowlist.

## Reliability, Security, Privacy, and Data Safety

- Keep the first pass read-only. Do not remove `unsafe-inline` inside the audit task.
- Treat inline event handlers as first-class blockers; they are easy to miss if the audit only searches for `<script>`.
- Keep JSON-LD classification separate so structured-data scripts do not inflate the executable-script count.
- A hash-based path is likely a better fit for this static GitHub Pages site than nonces, because web.dev recommends hash-based CSP for statically served HTML while nonce-based CSP needs a fresh runtime value per response.
- Report-only validation cannot be tested through the current meta-tag-only policy because web.dev notes CSP meta tags do not support report-only mode; production report-only exploration would need response headers.

## Prioritized Roadmap

### Now

- [ ] P2 - Add CSP preflight audit and strict/candidate mode.
  - Evidence: Current CSP still allows all inline script execution and the source tree has multiple executable inline blocks plus one inline event handler.
  - Verify: `npm run csp:audit`; `npm run csp:audit -- --candidate-script-src "'self'" --strict`.

## Explicit Non-Goals

- Do not implement T95 in the research pass.
- Do not remove the theme-init script without proving first-paint behavior.
- Do not use hashes to allow inline event handlers as the default path; prefer replacing handlers with `addEventListener` unless a documented exception is chosen.
- Do not rewrite the command-palette, Pagefind, recent-view, resume, or timeline behavior in this audit task.
- Do not edit active implementer-owned source/search changes from this research lane.

## Appendix - Sources

Repository sources:

- `src/layouts/Base.astro:86` - active CSP meta tag still includes `script-src 'self' 'unsafe-inline'` and `style-src 'self' 'unsafe-inline'`.
- `src/layouts/Base.astro:109` - inline critical CSS block.
- `src/layouts/Base.astro:111` - inline `onload` handler for async stylesheet media swap.
- `src/layouts/Base.astro:132` - early theme initialization script.
- `src/layouts/Base.astro:138-141` - Base JSON-LD block.
- `src/layouts/Base.astro:161-163` - inline `define:vars` command-palette section data.
- `src/layouts/Base.astro:164-172` - external self-hosted script includes that should remain allowed by `'self'`.
- `src/components/SectionJumpNav.astro:31-118` - executable inline section-jump behavior.
- `src/pages/projects/[slug].astro:340-351` - project JSON-LD and recent-view executable inline behavior.
- `src/pages/search.astro:13` - external Pagefind module include.
- `src/pages/search.astro:110-127` - executable inline search query bootstrap.
- `src/pages/resume.astro:91-95` - executable inline print-button behavior.
- `src/pages/timeline.astro:388+` - executable inline timeline filtering behavior.
- `src/pages/lang/[slug].astro:114` - language JSON-LD block.
- `package.json`, `scripts/`, `.github/workflows/` - no existing CSP audit script or gate found.

External sources:

- MDN `script-src` documents that the directive covers script URLs, inline scripts, and inline event handlers; it also documents nonce/hash paths and notes that normal inline script hashes do not automatically allow event handlers: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src
- web.dev strict CSP guide recommends nonce-based or hash-based strict CSPs, recommends hash-based CSP for statically served HTML, and notes CSP meta tags do not support report-only mode: https://web.dev/articles/strict-csp
