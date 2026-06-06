# Research Cycle 20 - T141 split CSP style audit implementation

Date: 2026-06-06
Scope: `sysadmindoc.github.io` CSP audit script, split style directive candidates, runtime style-write inventory, tests, and command documentation.

## Orientation

Cycle 19 made the next CSP stage clear: implement T141 first so T142 and T143 can be measured independently. This cycle implemented T141 directly.

## Implemented

### `scripts/audit-csp.mjs`

Added split style candidate support while preserving the existing aggregate behavior:

- Existing `--candidate-style-src <tokens>` remains the legacy aggregate mode.
- New `--candidate-style-src-elem <tokens>` checks `<style>` blocks plus stylesheet/preload links.
- New `--candidate-style-src-attr <tokens>` checks static `style=""` attributes plus runtime style-attribute writes.
- Output now prints effective directive fallback chains for:
  - `style-src`
  - `style-src-elem` inheriting from `style-src` or `default-src`
  - `style-src-attr` inheriting from `style-src` or `default-src`
- Style element inventory now includes stylesheet/preload link surfaces.
- Runtime style inventory scans `public/scripts` for:
  - `style.cssText` writes
  - `setAttribute("style", ...)` writes
  - direct `.style.property` references, listed as informational because they are not treated the same as `cssText`/style attributes by CSP.

### `test/csp-audit.test.mjs`

Expanded tests to cover:

- default split directive output and inventory counts;
- legacy aggregate `style-src` candidate behavior;
- `style-src-elem 'self'` blockers separate from style attributes;
- `style-src-attr 'none'` blockers including runtime `style.cssText` writes;
- strict split-candidate failures until each surface is migrated.

### `package.json` and `README.md`

Added command surfaces:

```text
npm run csp:audit:style:elem
npm run csp:audit:style:attr
```

The raw UNC checkout still cannot reliably run `npm run ...` because `cmd.exe` falls back to `C:\Windows`; direct Node commands were used for verification.

## Current measured inventory

Source mode:

- Source files scanned: 23.
- CSP meta tags: 1.
- Executable inline scripts: 0.
- Inline event handlers: 0.
- Inline style blocks: 15.
- Inline style attributes: 16.
- Stylesheet/preload links: 4.
- Runtime `style.cssText` writes: 6.
- Runtime `setAttribute("style")` writes: 0.
- Runtime direct style property references: 27.

Candidate results:

- `--candidate-style-src "'self'"`: 31 aggregate inline style blockers.
- `--candidate-style-src-elem "'self'"`: 15 style element/link blockers. The current stylesheet/preload links are allowed by `'self'`; the blockers are the 15 inline style blocks.
- `--candidate-style-src-attr "'none'"`: 22 style attribute blockers: 16 static `style=""` attributes plus six runtime `style.cssText` writes.

## Verification

Completed from the raw shared-folder checkout using direct Node commands:

```text
node --check scripts/audit-csp.mjs
node --test test/csp-audit.test.mjs
node scripts/audit-csp.mjs --candidate-style-src "'self'"
node scripts/audit-csp.mjs --candidate-style-src-elem "'self'"
node scripts/audit-csp.mjs --candidate-style-src-attr "'none'"
```

All targeted checks passed.

## Roadmap changes

- Marked T141 complete in `TODO.md`.
- Updated `ROADMAP.md` T141 and Continuation State.
- Updated `README.md` command list.
- Updated `PROJECT_CONTEXT.md` with the new split audit posture.
- Updated `AUTONOMOUS-LOOP-STATE.md` to seed T142/T143 next.

## Continuation state

### Last completed cycle

Cycle 20: T141 split CSP style audit implementation.

### Current focus

Continue with T142 and T143 using the new split audit output.

### Important findings so far

- The split audit gives a clean staged path:
  - T142 should reduce `style-src-elem` blockers first.
  - T143 should remove `style-src-attr` blockers after static and runtime attribute-style writes are migrated.
- Current T142 surface is 15 source style blocks in source mode, with built output mostly dominated by the repeated critical CSS and no-JS fallback blocks.
- Current T143 surface is 22 source/runtime blockers: 16 static attributes plus six `style.cssText` writes.

### Next best actions

1. Test a T142 staged candidate policy using the critical/no-JS hashes recorded in Cycle 19.
2. Experiment with `build.inlineStylesheets: 'never'` from a normal local checkout/worktree path and compare built style-block counts.
3. Classify T143 static attributes and runtime `cssText` writes into migration groups.

### Files still to inspect

- `src/layouts/Base.astro`
- `astro.config.mjs`
- `src/components/SkillCard.astro`
- `src/components/TagCloud.astro`
- `src/pages/index.astro`
- `src/pages/lang/[slug].astro`
- `src/pages/projects/[slug].astro`
- `public/scripts/main.js`
- `public/scripts/cmdk.js`

### Searches still to run

- `node scripts/audit-csp.mjs --candidate-style-src-elem "'self'"`
- `node scripts/audit-csp.mjs --candidate-style-src-attr "'none'"`
- `rg -n "style=|style\\.cssText" src public/scripts`
