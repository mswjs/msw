/**
 * Returns a relative URL if the given request URL is relative
 * to the current origin. Otherwise returns an absolute URL.
 */
export function toPublicUrl(url: string | URL): string {
  if (typeof location === 'undefined') {
    return url.toString()
  }

  const urlInstance = url instanceof URL ? url : new URL(url)

  const [, relativeUrl] = urlInstance.href.split(urlInstance.origin)

  return urlInstance.origin === location.origin
    ? relativeUrl
    : urlInstance.origin + urlInstance.pathname
}
