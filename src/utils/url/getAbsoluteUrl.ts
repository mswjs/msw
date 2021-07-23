/**
 * Returns an absolute URL based on the given relative URL, if possible.
 */
export function getAbsoluteUrl(url: string, baseUrl?: string): string {
  // Ignore absolute URLs.
  if (!url.startsWith('/')) {
    return url
  }

  // Resolve a relative request URL against a given custom "baseUrl"
  // or the current location (in the case of browser/browser-like environments).
  const origin = baseUrl || (typeof location !== 'undefined' && location.origin)

  return origin ? new URL(url, origin).href : url
}
