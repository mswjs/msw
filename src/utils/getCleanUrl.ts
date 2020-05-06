/**
 * Given a URL returns a URL string without query parameters and hashes.
 */
export function getCleanUrl(url: URL): string {
  return url.origin + url.pathname
}
