import { until } from '@open-draft/until'

/**
 * Intercepts and defers any requests on the page
 * until the Service Worker instance is ready.
 * Must only be used in a browser.
 */
export function deferNetworkRequests(
  workerReady: Promise<ServiceWorkerRegistration | null>,
) {
  // Defer `XMLHttpRequest` until the Service Worker is ready.
  const originalXhrSend = window.XMLHttpRequest.prototype.send

  window.XMLHttpRequest.prototype.send = function (
    ...args: Parameters<XMLHttpRequest['send']>
  ) {
    until(() => workerReady).then(() => {
      window.XMLHttpRequest.prototype.send = originalXhrSend
      this.send(...args)
    })
  }

  // Defer `fetch` requests until the Service Worker is ready.
  const originalFetch = window.fetch

  window.fetch = async (...args) => {
    await until(() => workerReady)
    window.fetch = originalFetch
    return window.fetch(...args)
  }
}
