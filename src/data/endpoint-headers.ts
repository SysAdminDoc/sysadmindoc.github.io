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
