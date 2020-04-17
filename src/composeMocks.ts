import { until } from '@open-draft/until'
import { RequestHandler } from './handlers/requestHandler'
import { handleRequestWith } from './handleRequest'
import { requestIntegrityCheck } from './requestIntegrityCheck'
import { addMessageListener } from './utils/createBroadcastChannel'

export type Mask = RegExp | string

interface InternalContext {
  worker: ServiceWorker
  registration: ServiceWorkerRegistration
}

interface PublicAPI {
  start(
    serviceWorkerURL?: string,
    options?: RegistrationOptions,
  ): Promise<ServiceWorkerRegistration>
  stop(): Promise<void>
}

const activateMocking = (worker: ServiceWorker) => {
  worker.postMessage('MOCK_ACTIVATE')

  return new Promise((resolve, reject) => {
    // Wait until the mocking is enabled to resolve the start Promise
    addMessageListener(
      'MOCKING_ENABLED',
      () => {
        console.groupCollapsed(
          '%c[MSW] Mocking enabled.',
          'color:orangered;font-weight:bold;',
        )
        console.log(
          '%cDocumentation: %chttps://redd.gitbook.io/msw',
          'font-weight:bold',
          'font-weight:normal',
        )
        console.log('Found an issue? https://github.com/open-draft/msw/issues')
        console.groupEnd()

        return resolve()
      },
      reject,
    )
  })
}

const getWorkerByRegistration = (registration: ServiceWorkerRegistration) => {
  return registration.active || registration.installing || registration.waiting
}

const getWorkerInstance = async (
  url: string,
  options: RegistrationOptions,
): Promise<[ServiceWorker, ServiceWorkerRegistration]> => {
  const [, existingRegistration] = await until(() => {
    return navigator.serviceWorker.getRegistration(url)
  })

  if (existingRegistration) {
    // Update existing service worker to ensure it's up-to-date
    return existingRegistration.update().then(() => {
      return [
        getWorkerByRegistration(existingRegistration),
        existingRegistration,
      ]
    })
  }

  const [error, instance] = await until<
    [ServiceWorker, ServiceWorkerRegistration]
  >(async () => {
    const registration = await navigator.serviceWorker.register(url, options)
    return [getWorkerByRegistration(registration), registration]
  })

  if (error) {
    console.error(
      '[MSW] Failed to register Service Worker (%s). %o',
      url,
      error,
    )
    return null
  }

  return instance
}

const createStart = (context: InternalContext): PublicAPI['start'] => {
  /**
   * Register and activate the mock Service Worker.
   */
  return async (serviceWorkerUrl = './mockServiceWorker.js', options) => {
    const [worker, registration] = await getWorkerInstance(
      serviceWorkerUrl,
      options,
    )
    context.worker = worker
    context.registration = registration

    // Reload the page when new Service Worker has been installed
    registration.addEventListener('updatefound', () => {
      const nextWorker = registration.installing

      nextWorker.addEventListener('statechange', () => {
        if (
          nextWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          location.reload()
        }
      })
    })

    // Deactivate mocking and unregister the active Service Worker
    // when the window unloads.
    window.addEventListener('beforeunload', () => {
      if (worker?.state !== 'redundant') {
        // Deactivating the mocking prevents the Service Worker
        // from serving page assets on initial load. Otherwise
        // it would expect the MSW to resolve a mock for assets,
        // which would result into an infinite promise.
        worker.postMessage('MOCK_DEACTIVATE')
      }
    })

    // Check if the active Service Worker is the latest published one
    const [integrityError] = await until(() => requestIntegrityCheck(worker))

    if (integrityError) {
      console.error(`\
[MSW] Detected outdated Service Worker: ${integrityError.message}

The mocking is still enabled, but it's highly recommended that you update your Service Worker by running:

$ npx msw init <PUBLIC_DIR>

This is necessary to ensure that the Service Worker is in sync with the library to guarantee its stability.
If this message still persists after updating, please report an issue: https://github.com/open-draft/msw/issues\
      `)
    }

    // Signal the Service Worker to enable requests interception
    const [activationError] = await until(() => activateMocking(worker))

    if (activationError) {
      console.error('Failed to enable mocking', activationError)
      return
    }

    return registration
  }
}

const createStop = (context: InternalContext): PublicAPI['stop'] => {
  /**
   * Stop the active running instance of the Service Worker.
   */
  return async () => {
    context.worker.postMessage('MOCK_DEACTIVATE')
  }
}

export const composeMocks = (
  ...requestHandlers: RequestHandler<any>[]
): PublicAPI => {
  const context: InternalContext = {
    worker: null,
    registration: null,
  }

  navigator.serviceWorker.addEventListener(
    'message',
    handleRequestWith(requestHandlers),
  )

  return {
    start: createStart(context),
    stop: createStop(context),
  }
}
