import { RequestHandler } from './handlers/requestHandler'
import { createIncomingRequestHandler } from './handleIncomingRequest'
import { reject } from 'ramda'

export type Mask = RegExp | string

interface PublicAPI {
  start(
    serviceWorkerURL?: string,
    options?: RegistrationOptions,
  ): Promise<ServiceWorkerRegistration>
  stop(): Promise<void>
}

const createStart = (
  worker: ServiceWorker,
  workerRegistration: ServiceWorkerRegistration,
): PublicAPI['start'] => {
  /**
   * Starts MockServiceWorker.
   */
  return (serviceWorkerUrl = './mockServiceWorker.js', options) => {
    if (workerRegistration) {
      return workerRegistration.update().then(() => workerRegistration)
    }

    window.addEventListener('beforeunload', () => {
      // Prevent Service Worker from serving page assets on initial load
      if (worker && worker.state !== 'redundant') {
        worker.postMessage('MOCK_DEACTIVATE')
      }
    })

    return navigator.serviceWorker
      .register(serviceWorkerUrl, options)
      .then((reg) => {
        const workerInstance = reg.active || reg.installing || reg.waiting

        // Signal Service Worker to enable interception of requests
        workerInstance.postMessage('MOCK_ACTIVATE')
        worker = workerInstance
        workerRegistration = reg

        return reg
      })
      .catch((error) => {
        console.error(
          '[MSW] Failed to register MockServiceWorker (%s). %o',
          serviceWorkerUrl,
          error,
        )

        return null
      })
  }
}

const createStop = (
  worker: ServiceWorker,
  workerRegistration: ServiceWorkerRegistration,
): PublicAPI['stop'] => {
  /**
   * Stops active running instance of MockServiceWorker.
   */
  return () => {
    if (!workerRegistration) {
      console.warn('[MSW] No active instance of MockServiceWorker is running.')
      return null
    }

    return workerRegistration
      .unregister()
      .then(() => {
        worker = null
        workerRegistration = null
      })
      .catch((error) => {
        console.error('[MSW] Failed to unregister MockServiceWorker. %o', error)
      })
  }
}

export const composeMocks = (
  ...requestHandlers: RequestHandler[]
): PublicAPI => {
  let worker: ServiceWorker
  let workerRegistration: ServiceWorkerRegistration

  navigator.serviceWorker.addEventListener(
    'message',
    createIncomingRequestHandler(requestHandlers),
  )

  return {
    start: createStart(worker, workerRegistration),
    stop: createStop(worker, workerRegistration),
  }
}
