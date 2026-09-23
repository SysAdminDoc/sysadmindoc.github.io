// The production Content-Security-Policy response header, built from the
// hash-pinned <meta> policy in dist/index.html.
//
// deploy-vps.mjs stamps this value into the compose env file for the live
// server, and the Playwright preview sends the same value (astro.config.mjs,
// PORTFOLIO_PREVIEW_PRODUCTION_HEADERS=1) so the browser suites run under the
// header the live site sends. The service worker is why that matters: a
// worker's CSP comes only from its own script's response headers, so a preview
// without the header runs the worker unrestricted and cannot see a request the
// live worker is refused.
import fs from 'node:fs';
import path from 'node:path';

export function decodeHtmlAttribute(value) {
  // &amp; goes last so an escaped entity such as `&amp;quot;` decodes once,
  // to `&quot;`, instead of twice.
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

export function buildCspHeaderValue(distDir) {
  const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  const cspMeta = html
    .match(/<meta\b[^>]*>/gi)
    ?.find((tag) => /\bhttp-equiv\s*=\s*(["'])Content-Security-Policy\1/i.test(tag));
  const contentMatch = cspMeta?.match(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i);
  if (!contentMatch?.[2]) {
    throw new Error('csp-header: dist/index.html is missing the production CSP meta policy.');
  }
  const policy = decodeHtmlAttribute(contentMatch[2]).replace(/[\r\n]+/g, ' ').trim();
  if (!policy.includes('report-to csp-endpoint')) {
    throw new Error('csp-header: built CSP policy is missing report-to csp-endpoint.');
  }
  if (policy.includes('"') || policy.includes('`') || policy.includes('\n')) {
    throw new Error('csp-header: built CSP policy contains unsupported env-file characters.');
  }
  // frame-ancestors and report-uri are header-only directives: a <meta> policy
  // ignores both, which is why the meta source policy carries neither and the
  // edge has been relying on X-Frame-Options alone for clickjacking. The header
  // form can carry frame-ancestors, which supersedes X-Frame-Options in every
  // browser that supports CSP, so it is added here rather than to the meta tag.
  if (policy.includes('frame-ancestors')) {
    throw new Error('csp-header: the meta policy already declares frame-ancestors, which browsers ignore there.');
  }
  return `${policy}; frame-ancestors 'none'; report-uri /csp-report`;
}
