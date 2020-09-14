/**
 * Returns an absolute Service Worker URL based on the given
 * relative URL (known during the registration).
 */
export function getAbsoluteWorkerUrl(relativeUrl: string): string {
  let origin = location.origin
  if (process.env.PUBLIC_URL) {
    origin = origin + process.env.PUBLIC_URL
  }
  return new URL(relativeUrl, origin).href
}
