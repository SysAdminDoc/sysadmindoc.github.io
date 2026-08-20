/**
 * Source-level response defaults for endpoint execution. Astro static builds
 * serialize endpoint bodies without these headers, so the deployed contract
 * lives in Caddy: the site container (deploy/vps/Caddyfile) sets Cache-Control
 * for machine endpoints, social cards, hashed assets, and HTML, while the edge
 * adds the security headers. scripts/smoke-live-site.mjs asserts both against
 * the live origin, so GENERATED_IMAGE_CACHE_CONTROL below and the @ogimages
 * rule in the Caddyfile must be kept in step.
 */
export const GENERATED_ENDPOINT_CACHE_CONTROL = 'public, max-age=300';
export const GENERATED_IMAGE_CACHE_CONTROL = 'public, max-age=86400';

export function endpointHeaders(contentType: string): Record<string, string> {
  return {
    'Content-Type': contentType,
    'Cache-Control': GENERATED_ENDPOINT_CACHE_CONTROL,
  };
}

export function imageEndpointHeaders(contentType: string): Record<string, string> {
  return {
    'Content-Type': contentType,
    'Cache-Control': GENERATED_IMAGE_CACHE_CONTROL,
  };
}

export function withEndpointCache(response: Response, cacheControl = GENERATED_ENDPOINT_CACHE_CONTROL): Response {
  response.headers.set('Cache-Control', cacheControl);
  return response;
}
