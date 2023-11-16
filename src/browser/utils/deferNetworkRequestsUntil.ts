import { until } from '@open-draft/until'

/**
 * Intercepts and defers any requests on the page
 * until the Service Worker instance is ready.
 * Must only be used in a browser.
 */
export function deferNetworkRequestsUntil(predicatePromise: Promise<any>) {
  // Defer any `XMLHttpRequest` requests until the Service Worker is ready.
  const originalXhrSend = globalThis.XMLHttpRequest.prototype.send

  const restoreXMLHttpRequest = () => {
    globalThis.XMLHttpRequest.prototype.send = originalXhrSend
  }

  globalThis.XMLHttpRequest.prototype.send = function deferredSend(
    ...args: Parameters<XMLHttpRequest['send']>
  ) {
    // Keep this function synchronous to comply with `XMLHttpRequest.prototype.send`,
    // because that method is always synchronous.
    until(() => predicatePromise)
      /**
       * @note That this will only be called if there has been a `send()` method
       * invoked on the page.
       */
      .then(restoreXMLHttpRequest)
      .finally(() => {
        globalThis.XMLHttpRequest.prototype.send.apply(this, args)
      })
  }

  // Defer any `fetch` requests until the Service Worker is ready.
  const originalFetch = globalThis.fetch

  const restoreFetch = () => {
    globalThis.fetch = originalFetch
  }

  globalThis.fetch = async function deferredFetch(...args) {
    await until(() => predicatePromise).then(restoreFetch)
    return globalThis.fetch(...args)
  }

  predicatePromise.finally(() => {
    restoreXMLHttpRequest()
    restoreFetch()
  })
}
