/**
 * Returns a relative URL if the given request URL is relative to the current origin.
 * Otherwise returns an absolute URL.
 */
export function getPublicUrlFromRequest(request: Request): string {
  const url = new URL(request.url)

  if (typeof origin === 'undefined') {
    return url.href
  }

  return url.origin === origin ? url.pathname : url.href
}
