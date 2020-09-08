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
import { mergeRight } from '../../utils/internal/mergeRight'

const DEFAULT_START_OPTIONS: DeepRequired<StartOptions> = {
  serviceWorker: {
    url: '/mockServiceWorker.js',
    options: null as any,
  },
  quiet: false,
  keepAlive: 10000,
  waitUntilReady: true,
  onUnhandledRequest: 'bypass',
  findWorker: (scriptURL, mockServiceWorkerUrl) =>
    scriptURL === mockServiceWorkerUrl,
}

export const createStart = (context: SetupWorkerInternalContext) => {
  /**
   * Registers and activates the mock Service Worker.
   */
  return function start(options?: StartOptions) {
    const resolvedOptions = mergeRight(DEFAULT_START_OPTIONS, options || {})

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
          resolvedOptions.findWorker,
        ),
      )

      if (!instance) {
        return null
      }

      const [worker, registration] = instance

      if (!worker) {
        if (options?.findWorker) {
          console.error(`\
[MSW] Failed to locate the Service Worker registration using a custom "findWorker" predicate.

Please ensure that the custom predicate properly locates the Service Worker registration at "${resolvedOptions.serviceWorker.url}".
More details: https://mswjs.io/docs/api/setup-worker/start#findworker
`)
        } else {
          console.error(`\
[MSW] Failed to locate the Service Worker registration.

This most likely means that the worker script URL "${resolvedOptions.serviceWorker.url}" cannot resolve against the actual public hostname (${location.host}). This may happen if your application runs behind a proxy, or has a dynamic hostname.

Please consider using a custom "serviceWorker.url" option to point to the actual worker script location, or a custom "findWorker" option to resolve the Service Worker registration manually. More details: https://mswjs.io/docs/api/setup-worker/start`)
        }

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
        // Make sure we're always clearing the interval - there are reports that not doing this can
        // cause memory leaks in headless browser environments.
        window.clearInterval(context.keepAliveInterval)
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

      if (resolvedOptions.keepAlive) {
        context.keepAliveInterval = window.setInterval(
          () => worker.postMessage('KEEPALIVE_REQUEST'),
          resolvedOptions.keepAlive,
        )
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
