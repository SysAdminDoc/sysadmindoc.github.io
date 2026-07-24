/* Trusted Types default policy.
 *
 * Loaded first in <head> so it exists before any script sink fires. The site
 * ships `require-trusted-types-for 'script'`, which requires TrustedHTML /
 * TrustedScriptURL at DOM script sinks. First-party runtime code builds DOM via
 * SafeDOM/textContent and has ZERO HTML sinks (enforced by `npm run csp:audit`),
 * so this default policy only backstops:
 *   - createScriptURL: the service-worker registration (/sw.js) and the on-demand
 *     command-palette loader (/scripts/cmdk.js). Constrained to same-origin, so an
 *     injected cross-origin script URL is blocked.
 *   - createHTML: the vendored Pagefind component UI, which renders its own search
 *     result HTML on /search/. Pass-through — its input is Pagefind's own output,
 *     never attacker-controlled first-party data.
 */
(function () {
  if (!window.trustedTypes || typeof window.trustedTypes.createPolicy !== 'function') return;
  try {
    window.trustedTypes.createPolicy('default', {
      createHTML: function (input) {
        return input;
      },
      createScriptURL: function (input) {
        var url = new URL(input, document.baseURI);
        if (url.origin !== window.location.origin) {
          throw new TypeError('Trusted Types default policy blocked a cross-origin script URL: ' + input);
        }
        return input;
      },
      createScript: function (input) {
        return input;
      },
    });
  } catch (error) {
    /* A default policy already exists, or Trusted Types is unavailable. */
  }
})();
