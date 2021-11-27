/**
 * Returns an absolute URL based on the given path.
 */
export function getAbsoluteUrl(path: string, baseUrl?: string): string {
  // Ignore absolute URLs.
  if (!path.startsWith('/')) {
    return path
  }

  // Resolve a relative request URL against a given custom "baseUrl"
  // or the document baseURI (in the case of browser/browser-like environments).
  const origin =
    baseUrl || (typeof document !== 'undefined' && document.baseURI)

  return origin
    ? // Encode and decode the path to preserve escaped characters.
      decodeURI(new URL(encodeURI(path), origin).href)
    : path
}
