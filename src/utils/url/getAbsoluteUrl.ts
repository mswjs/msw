/**
 * Returns an absolute URL based on the given path.
 */
export function getAbsoluteUrl(path: string, baseUrl?: string): string {
  // Ignore absolute URLs.
  if (!path.startsWith('/')) {
    return path
  }

  // Resolve a relative request URL against a given custom "baseUrl"
  // or the current location (in the case of browser/browser-like environments).
  const origin = baseUrl || (typeof location !== 'undefined' && location.origin)

  return origin ? new URL(path, origin).href : path
}
