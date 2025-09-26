/**
 * Checks if the Service Worker API is supproted and available
 * in the current browsing context.
 */
export function supportsServiceWorker(): boolean {
  return 'serviceWorker' in navigator && location.protocol !== 'file:'
}
