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
  ): Promise<ServiceWorkerRegistration | null>
  stop(): Promise<void>
}

interface InternalContext {
  worker: ServiceWorker | null
  registration: ServiceWorkerRegistration | null
}

type InstanceTuple = [ServiceWorker | null, ServiceWorkerRegistration]

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

/**
 * Returns an active Service Worker instance.
 * When not found, registers a new Service Worker.
 */
const getWorkerInstance = async (
  url: string,
  options?: RegistrationOptions,
): Promise<InstanceTuple | null> => {
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

  const [error, instance] = await until<InstanceTuple>(async () => {
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
    const [, instance] = await until<InstanceTuple | null>(() =>
      getWorkerInstance(serviceWorkerUrl, options),
    )

    if (!instance) {
      return null
    }

    const [worker, registration] = instance

    if (!worker) {
      return null
    }

    context.worker = worker
    context.registration = registration

    // Reload the page when new Service Worker has been installed
    registration.addEventListener('updatefound', () => {
      const nextWorker = registration.installing

      nextWorker?.addEventListener('statechange', () => {
        if (
          nextWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          location.reload()
        }
      })
    })

    window.addEventListener('beforeunload', () => {
      if (worker.state !== 'redundant') {
        // Notify the Service Worker that this client has closed.
        // Internally, it's similar to disabling the mocking, only
        // client close event has a handler that self-terminates
        // the Service Worker when there are no open clients.
        worker.postMessage('CLIENT_CLOSED')
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
      return null
    }

    return registration
  }
}

const createStop = (context: InternalContext): PublicAPI['stop'] => {
  /**
   * Stop the active running instance of the Service Worker.
   */
  return async () => {
    // Signal the Service Worker to disable mocking for this client.
    // Use this an an explicit way to stop the mocking, while preserving
    // the worker-client relation. Does not affect the worker's lifecycle.
    context.worker?.postMessage('MOCK_DEACTIVATE')
  }
}

export const composeMocks = (
  ...requestHandlers: RequestHandler<any, any>[]
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
