/**
 * Returns a relative URL if the given request URL is relative to the current origin.
 * Otherwise returns an absolute URL.
 */
export function getPublicUrlFromRequest(request: Request): string {
  const url = new URL(request.url)

  return url.origin === origin
    ? url.pathname
    : new URL(url.pathname, `${url.protocol}//${url.host}`).href
}
