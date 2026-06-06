# Research Cycle 17 - Style-side CSP hardening path

Date: 2026-06-06
Scope: `sysadmindoc.github.io` CSP, Astro style delivery, runtime style mutation, and browser-verification planning.

## Orientation

- The repo is on `main` at `5bce094` (`fix: harden client JS - crash guards, XSS defense, a11y, perf`).
- `git status --short --branch` showed only the existing untracked `AGENTS.md` before this roadmap pass.
- `ROADMAP.md` was last researched on Cycle 16 and `AUTONOMOUS-LOOP-STATE.md` seeded style-side CSP hardening as the next substantial candidate.
- `TODO.md` had no open checklist items before this pass; the script-side CSP item T95 is complete and active CSP already uses `script-src 'self'`.

## Local evidence

Source audit:

```text
node scripts/audit-csp.mjs --candidate-style-src "'self'"
```

Result:

- 23 source files scanned.
- Active policy: `script-src 'self'`; `style-src 'self' 'unsafe-inline'`.
- Executable inline scripts: 0.
- Inline event handlers: 0.
- JSON-LD/data blocks: 12.
- Source style blockers for `style-src 'self'`: 31 total.
- Source style blocks: 15.
- Source style attributes: 16.

Built-output audit:

```text
node scripts/audit-csp.mjs --dist --candidate-style-src "'self'"
```

Result:

- 194 built HTML files scanned from existing `dist/`.
- Built style blockers for `style-src 'self'`: 1,012 total.
- Built inline style blocks: 394.
- Built inline style attributes: 618.

Important local surfaces:

- `src/layouts/Base.astro:113` inlines `critical.css`.
- `src/layouts/Base.astro:134` inlines the no-JS reveal fallback.
- Route/component style blocks remain in `src/components/GreatestHits.astro`, `src/components/SkillCard.astro`, `src/components/TagCloud.astro`, and eight interior/project routes.
- Inline style attributes remain in `SkillCard.astro`, `TagCloud.astro`, `index.astro`, `lang/[slug].astro`, and `projects/[slug].astro`.
- Runtime `style.cssText` writes remain in `public/scripts/main.js` and `public/scripts/cmdk.js`; direct property writes also exist and need classification because MDN distinguishes direct safe property manipulation from setting `style` or `cssText`.

Environment note:

- Running `npm run csp:audit:style` from the raw UNC shared-folder checkout failed because `cmd.exe` fell back to `C:\Windows` and could not find `scripts/audit-csp.mjs`.
- Running the direct Node command from the same repo succeeded. Future build/test verification should still run from a normal local checkout/worktree path, matching the repo's Windows/VMware note.

## External evidence

- MDN `style-src` documents that inline `<style>` blocks, inline `style` attributes, and JavaScript `style.cssText`/`setAttribute("style", ...)` are blocked when inline styles are disallowed. Direct element style property assignments are treated differently and are not blocked by the same rule. Source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src
- MDN `style-src-elem` applies to `<style>` and stylesheet links, not inline style attributes. It is a CSP Level 3 directive and is marked newly available across latest browsers since December 2025. Source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src-elem
- MDN `style-src-attr` applies to inline style attributes and JavaScript `style`/`cssText` attribute writes, and can be used with `style-src`. Source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src-attr
- Astro directives docs state `is:inline` leaves `<style>`/`<script>` tags as authored in final HTML and does not bundle or deduplicate them. Source: https://docs.astro.build/en/reference/directives-reference/
- Astro styling docs state normal component `<style>` tags are processed by Astro and scoped automatically unless global/inline behavior is requested. Source: https://docs.astro.build/en/guides/styling/
- web.dev strict CSP guidance reinforces hashes/nonces as the durable strategy for trusted inline execution on static output. Source: https://web.dev/articles/strict-csp

## Findings

### F1 - The next useful CSP step is directive separation, not immediate policy removal

The repo can likely reduce style-element risk before fully removing all style-attribute risk. The current audit cannot model that staged path because it only accepts one `style-src` candidate. A new audit mode should classify:

- `style-src-elem` blockers: inline `<style>` and stylesheet link sources.
- `style-src-attr` blockers: static `style=""`, `setAttribute("style", ...)`, and `style.cssText`.
- Direct style property writes: generally allowed by CSP style attribute restrictions but still worth inventorying for maintainability.

### F2 - Critical CSS is the largest intentional inline style block

The first-viewport critical CSS path is intentional because it fixed the mobile LCP warning. Removing it blindly would regress performance. The safer paths are:

- Generate a stable SHA-256 CSP hash for the inlined critical CSS per build and include it in the CSP.
- Or replace the inline block with an external first-paint strategy only after performance and visual verification prove no FOUC/LCP regression.

### F3 - Most source style attributes are finite presentation tokens

The current attribute blockers are not unbounded user input. They mostly encode known colors, category dots, spacing, ring targets, and lane accents. Implementation should prefer:

- Class maps for finite category/lane/principle colors.
- SVG presentation attributes where appropriate.
- `data-*` attributes plus CSS selectors for finite scales.
- Small generated CSS/token maps only when dynamic values cannot reasonably be enumerated.

### F4 - Static inventory should be followed by candidate-policy browser verification

The repo already has Playwright visual/axe coverage and a static CSP inventory, but the final policy change should also run representative pages under a candidate policy and listen for `securitypolicyviolation`. That catches runtime style writes, hydrated UI paths, and visual blanking that static parsing can miss.

## Roadmap changes

Added to `ROADMAP.md` and `TODO.md`:

- T141 P1 - Split CSP style auditing by `style-src-elem` and `style-src-attr`.
- T142 P1 - Remove or hash inline style blocks so `style-src-elem` can drop `unsafe-inline`.
- T143 P2 - Convert inline style attributes to class, data, SVG, or finite-token styling.
- T144 P2 - Add candidate-policy browser verification before removing style `unsafe-inline`.

## Suggested implementation order

1. Implement T141 first so the project has separate blocker counts and candidate-policy modes.
2. Implement T142 next to remove/hash style blocks while preserving critical CSS performance.
3. Implement T144 early enough to protect the policy migration with real browser evidence.
4. Implement T143 in smaller sub-passes, starting with easy static margins/category dots and then moving to dynamic lane/skill/chart styling.

## Continuation state

### Last completed cycle

Cycle 17: style-side CSP hardening research and roadmap expansion.

### Current focus

Prepare Cycle 18 around the first implementable follow-up: T141 audit splitting, or a deeper source-to-implementation plan for T142 if the next pass remains research-only.

### Important findings so far

- Current source CSP style candidate has 31 blockers: 15 style blocks and 16 style attributes.
- Existing built `dist/` has 1,012 blockers: 394 style blocks and 618 style attributes.
- Direct Node script execution works from the raw UNC shared-folder checkout, but `npm run ...` does not; full build verification should run from a normal local checkout/worktree path.
- `style-src-elem` and `style-src-attr` create a staged path: reduce style-element inline risk first, then migrate attributes and runtime `cssText`.

### Next best actions

1. Inspect `scripts/audit-csp.mjs` and `test/csp-audit.test.mjs` for the smallest T141 implementation plan.
2. Draft exact candidate command names and expected output for `style-src-elem` and `style-src-attr`.
3. Inspect `src/layouts/Base.astro` critical CSS hashing feasibility before choosing T142 implementation details.

### Files still to inspect

- `test/csp-audit.test.mjs`
- `src/styles/critical.css`
- `public/scripts/main.js`
- `public/scripts/cmdk.js`
- `playwright.audits.config.mjs`
- `tests/playwright/portfolio-audits.spec.mjs`

### Searches still to run

- `rg -n "style\\.cssText|setAttribute\\(['\\\"]style|\\.style\\." public/scripts src scripts`
- `rg -n "style=|<style" src/pages src/components src/layouts`
- `rg -n "Content-Security-Policy|style-src" src scripts test tests`
