# Research Cycle 22 - T143/T144 style-attribute CSP hardening

Date: 2026-06-06
Scope: `sysadmindoc.github.io` style-attribute CSP migration, runtime style-write cleanup, and browser candidate-policy verification.

## Orientation

Cycle 21 removed style-element `unsafe-inline` by hashing the two intentional inline style blocks and externalizing Astro route styles with `build.inlineStylesheets: 'never'`. The remaining staged policy was:

```text
style-src 'self';
style-src-elem 'self' <critical CSS hash> <no-JS fallback hash>;
style-src-attr 'unsafe-inline';
```

Cycle 22 finished the attribute side of that migration.

## External References

- MDN documents `style-src-elem` as the CSP Level 3 directive for stylesheet `<style>` and `<link rel="stylesheet">` sources, with fallback through `style-src` and then `default-src`.
- MDN documents `style-src-attr` as the separate directive for inline styles applied to individual DOM elements.
- Astro's configuration reference documents `build.inlineStylesheets: 'never'`, which keeps route/component CSS emitted as same-origin assets instead of inline chunks.

References:

- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src-elem
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/style-src-attr
- https://v4.docs.astro.build/en/reference/configuration-reference/#buildinlinestylesheets

## Implemented

### Static style-attribute removal

Static `style=""` attributes were replaced with finite classes or existing SVG/CSS surfaces:

- `SkillCard.astro`: ring tone classes and `data-ring-target` replace inline custom properties and label color styles.
- `TagCloud.astro`: five finite font-size classes replace generated inline font sizes.
- `index.astro`: language legend tones and philosophy principle tones replace inline background/accent variables.
- `lang/[slug].astro`: lane accent classes replace inline `--accent` and stat color attributes.
- `projects/[slug].astro`: category dots and spacing helpers replace inline display/margin styles.

### Runtime style-write cleanup

Runtime `style.cssText` assignments were replaced:

- `cmdk.js`: command-palette dot tones and chord hints now use classes.
- `main.js`: video embeds, close buttons, copy buffers, and matrix overlays now use classes.

Direct style-property writes remain only where values are genuinely dynamic:

- `matrix-column` left position, animation duration, and animation delay.
- Skill ring `strokeDashoffset` draw value after intersection.

### Active policy

`Base.astro` now emits:

```text
style-src 'self';
style-src-elem 'self' <critical CSS hash> <no-JS fallback hash>;
style-src-attr 'none';
```

The source audit reports zero inline style attributes, zero `style.cssText` writes, and zero `setAttribute("style")` writes.

### Browser candidate-policy audit

`tests/playwright/csp-style-policy.spec.mjs` adds rendered verification for the final attribute policy:

- visits `/`, `/search/?q=python`, `/archive/`, `/lang/powershell/`, and `/projects/project-nomad-desktop/`;
- records `securitypolicyviolation` events from page start;
- serves stability CSS as a same-origin stylesheet;
- blocks GitHub API and YouTube iframe noise;
- exercises command palette, terminal, video close path, and project share fallback.

## Verification Plan

Required commands before commit:

```text
node --check scripts/audit-csp.mjs
node --test test/csp-audit.test.mjs
node scripts/audit-csp.mjs --candidate-style-src-attr "'none'" --strict
rg -n "style=|style\.cssText|setAttribute\(['\"]style" src public/scripts scripts test tests
rg -n "\.style\." public/scripts src scripts
npm test
npm run check
npm run build
node scripts/audit-csp.mjs --dist --candidate-style-src-attr "'none'" --strict
npm run csp:audit:browser
```

## Continuation State

T143 and T144 are complete once those gates pass. Continue with T145 visual-baseline stabilization, then audit whether CSP hash drift should be enforced as a build-time generated contract.
