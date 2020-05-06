/**
 * Returns an absolute Service Worker URL based on the given
 * relative URL (known during the registration).
 */
export function getAbsoluteWorkerUrl(relativeUrl: string): string {
  return (location.origin + relativeUrl).replace(/(?<!:)(\/*\.\/|\/{2,})/g, '/')
}
