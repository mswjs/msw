import { until } from '@open-draft/until'
import { getWorkerInstance } from './utils/getWorkerInstance'
import { activateMocking } from './utils/activateMocking'
import {
  SetupWorkerInternalContext,
  ServiceWorkerInstanceTuple,
  StartOptions,
} from '../glossary'
import { handleRequestWith } from '../../utils/handleRequestWith'
import { requestIntegrityCheck } from '../../utils/internal/requestIntegrityCheck'
import { deferNetworkRequestsUntil } from '../../utils/deferNetworkRequestsUntil'

const DEFAULT_START_OPTIONS: DeepRequired<StartOptions> = {
  serviceWorker: {
    url: '/mockServiceWorker.js',
    options: null as any,
  },
  quiet: false,
  waitUntilReady: true,
  onUnhandledRequest: 'bypass',
}

export const createStart = (context: SetupWorkerInternalContext) => {
  /**
   * Registers and activates the mock Service Worker.
   */
  return function start(options?: StartOptions) {
    const resolvedOptions = Object.assign({}, DEFAULT_START_OPTIONS, options)

    const startWorkerInstance = async () => {
      if (!('serviceWorker' in navigator)) {
        console.error(
          `[MSW] Failed to register a Service Worker: this browser does not support Service Workers (see https://caniuse.com/serviceworkers), or your application is running on an insecure host (consider using HTTPS for custom hostnames).`,
        )
        return null
      }

      // Remove all previously existing event listeners.
      // This way none of the listeners persists between Fast refresh
      // of the application's code.
      context.events.removeAllListeners()

      context.events.addListener(
        navigator.serviceWorker,
        'message',
        handleRequestWith(context, resolvedOptions),
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

      context.events.addListener(window, 'beforeunload', () => {
        if (worker.state !== 'redundant') {
          // Notify the Service Worker that this client has closed.
          // Internally, it's similar to disabling the mocking, only
          // client close event has a handler that self-terminates
          // the Service Worker when there are no open clients.
          worker.postMessage('CLIENT_CLOSED')
        }
      })

      // Check if the active Service Worker is the latest published one
      const [integrityError] = await until(() =>
        requestIntegrityCheck(context, worker),
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

      // Signal the Service Worker to enable requests interception
      const [activationError] = await until(() =>
        activateMocking(context, options),
      )

      if (activationError) {
        console.error('Failed to enable mocking', activationError)
        return null
      }

      return registration
    }

    const workerRegistration = startWorkerInstance()

    // Defer any network requests until the Service Worker instance is ready.
    // This prevents a race condition between the Service Worker registration
    // and application's runtime requests (i.e. requests on mount).
    if (resolvedOptions.waitUntilReady) {
      deferNetworkRequestsUntil(workerRegistration)
    }

    return workerRegistration
  }
}
