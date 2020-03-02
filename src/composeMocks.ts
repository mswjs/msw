import { RequestHandler } from './handlers/requestHandler'
import { createIncomingRequestHandler } from './handleIncomingRequest'

export type Mask = RegExp | string

interface PublicAPI {
  start(serviceWorkerURL?: string, options?: RegistrationOptions): void
  stop(): void
}

const createStart = (
  worker: ServiceWorker,
  workerRegistration: ServiceWorkerRegistration,
) => {
  /**
   * Starts MockServiceWorker.
   */
  return (
    serviceWorkerUrl: string = './mockServiceWorker.js',
    options?: RegistrationOptions,
  ) => {
    if (workerRegistration) {
      return workerRegistration.update()
    }

    window.addEventListener('beforeunload', () => {
      // Deactivate requests interception before page unload.
      // Initial page load requests client assets (HTML, CSS, JS),
      // which, if passed through the interception handler, may result
      // into a broken page.
      if (worker && worker.state !== 'redundant') {
        worker.postMessage('MOCK_DEACTIVATE')
      }
    })

    navigator.serviceWorker
      .register(serviceWorkerUrl, options)
      .then((reg) => {
        const workerInstance = reg.active || reg.installing || reg.waiting

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
      })
  }
}

const createStop = (
  worker: ServiceWorker,
  workerRegistration: ServiceWorkerRegistration,
) => {
  /**
   * Stops active running instance of MockServiceWorker.
   */
  return () => {
    if (!workerRegistration) {
      return console.warn(
        '[MSW] No active instance of MockServiceWorker is running.',
      )
    }

    workerRegistration
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
