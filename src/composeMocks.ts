import { until } from '@open-draft/until'
import { RequestHandler } from './handlers/requestHandler'
import { handleRequestWith } from './handleRequest'
import { requestIntegrityCheck } from './requestIntegrityCheck'
import { addMessageListener } from './utils/createBroadcastChannel'

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
   * Registers and activates the MockServiceWorker at the given URL.
   */
  return async (serviceWorkerUrl = './mockServiceWorker.js', options) => {
    if (workerRegistration) {
      return workerRegistration.update().then(() => workerRegistration)
    }

    window.addEventListener('beforeunload', () => {
      // Prevent Service Worker from serving page assets on initial load
      if (worker && worker.state !== 'redundant') {
        worker.postMessage('MOCK_DEACTIVATE')
      }
    })

    const [error, data] = await until<
      [ServiceWorker, ServiceWorkerRegistration]
    >(() =>
      navigator.serviceWorker
        .register(serviceWorkerUrl, options)
        .then((registration) => {
          const instance =
            registration.active ||
            registration.installing ||
            registration.waiting
          return [instance, registration]
        }),
    )

    if (error) {
      console.error(
        '[MSW] Failed to register Service Worker (%s). %o',
        serviceWorkerUrl,
        error,
      )
      return
    }

    const [serviceWorker, registration] = data

    const [integrityError] = await until(() =>
      requestIntegrityCheck(serviceWorker),
    )

    if (integrityError) {
      console.error(`\
[MSW] Detected outdated Service Worker: ${integrityError.message}

The mocking is still enabled, but it's highly recommended that you update your Service Worker by running:

$ npx msw init <PUBLIC_DIR>

This is necessary to ensure that the Service Worker is in sync with the library to guarantee its stability.
If this message still persists after updating, please report an issue: https://github.com/open-draft/msw/issues\
      `)
    }

    // Signal Service Worker to enable requests interception
    serviceWorker.postMessage('MOCK_ACTIVATE')
    worker = serviceWorker
    workerRegistration = registration

    return new Promise((resolve, reject) => {
      // Wait until the mocking is enabled to resolve the start Promise
      addMessageListener(
        'MOCKING_ENABLED',
        () => {
          resolve(workerRegistration)
        },
        reject,
      )
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
  return async () => {
    if (!workerRegistration) {
      console.warn('[MSW] No active instance of Service Worker is running.')
      return null
    }

    const [error] = await until(workerRegistration.unregister)

    if (error) {
      console.error('[MSW] Failed to unregister Service Worker. %o', error)
      return
    }

    worker = null
    workerRegistration = null
  }
}

export const composeMocks = (
  ...requestHandlers: RequestHandler<any>[]
): PublicAPI => {
  let worker: ServiceWorker
  let workerRegistration: ServiceWorkerRegistration

  navigator.serviceWorker.addEventListener(
    'message',
    handleRequestWith(requestHandlers),
  )

  return {
    start: createStart(worker, workerRegistration),
    stop: createStop(worker, workerRegistration),
  }
}
