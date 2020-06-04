/**
 * Intercepts and defers any requests on the page
 * until the Service Worker instance is ready.
 */
export function deferNetworkRequests(
  workerReady: Promise<ServiceWorkerRegistration | null>,
) {
  // Defer `XMLHttpRequest` until the Service Worker is ready.
  const originalXhrSend = window.XMLHttpRequest.prototype.send
  const restoreXhrSend = function (
    this: XMLHttpRequest,
    ...args: Parameters<XMLHttpRequest['send']>
  ) {
    window.XMLHttpRequest.prototype.send = originalXhrSend
    this.send(...args)
  }

  window.XMLHttpRequest.prototype.send = function (
    ...args: Parameters<XMLHttpRequest['send']>
  ) {
    workerReady
      .then(() => restoreXhrSend.call(this, ...args))
      .catch(() => restoreXhrSend.call(this, ...args))
  }

  // Defer `fetch` requests until the Service Worker is ready.
  const originalFetch = window.fetch
  const restoreFetch = (...args: Parameters<typeof window.fetch>) => {
    window.fetch = originalFetch
    return window.fetch(...args)
  }

  window.fetch = async (...args) => {
    return workerReady
      .then(() => restoreFetch(...args))
      .catch(() => restoreFetch(...args))
  }
}
