import { until } from '@open-draft/until'
import { getWorkerInstance } from './utils/getWorkerInstance'
import { activateMocking } from './utils/activateMocking'
import {
  ComposeMocksInternalContext,
  ServiceWorkerInstanceTuple,
  StartOptions,
} from '../glossary'
import { handleRequestWith } from '../../handleRequestWith'
import { requestIntegrityCheck } from '../../requestIntegrityCheck'

const DEFAULT_START_OPTIONS: DeepRequired<StartOptions> = {
  serviceWorker: {
    url: './mockServiceWorker.js',
    options: null as any,
  },
  quiet: false,
}

export const createStart = (context: ComposeMocksInternalContext) => {
  /**
   * Registers and activates the mock Service Worker.
   */
  return async function start(options?: StartOptions) {
    const resolvedOptions = Object.assign({}, DEFAULT_START_OPTIONS, options)

    navigator.serviceWorker.addEventListener(
      'message',
      handleRequestWith(context.requestHandlers, resolvedOptions),
    )

    const [, instance] = await until<ServiceWorkerInstanceTuple | null>(() =>
      getWorkerInstance(
        resolvedOptions.serviceWorker.url,
        resolvedOptions.serviceWorker.options,
      ),
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
    const [activationError] = await until(() =>
      activateMocking(worker, options),
    )

    if (activationError) {
      console.error('Failed to enable mocking', activationError)
      return null
    }

    return registration
  }
}
