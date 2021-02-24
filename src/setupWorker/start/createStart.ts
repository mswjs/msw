import { until } from '@open-draft/until'
import { getWorkerInstance } from './utils/getWorkerInstance'
import { activateMocking } from './utils/activateMocking'
import { SetupWorkerInternalContext, StartOptions } from '../glossary'
import { createRequestListener } from '../../utils/worker/createRequestListener'
import { requestIntegrityCheck } from '../../utils/internal/requestIntegrityCheck'
import { deferNetworkRequestsUntil } from '../../utils/deferNetworkRequestsUntil'
import { mergeRight } from '../../utils/internal/mergeRight'
import { createResponseListener } from '../../utils/worker/createResponseListener'

const DEFAULT_START_OPTIONS: DeepRequired<StartOptions> = {
  serviceWorker: {
    url: '/mockServiceWorker.js',
    options: null as any,
  },
  quiet: false,
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

    // Store the start options in the context so that other methods (like `stop`)
    // could reference them.
    context.startOptions = resolvedOptions

    const startWorkerInstance = async () => {
      if (!('serviceWorker' in navigator)) {
        throw new Error(
          `[MSW] Failed to register a Service Worker: this browser does not support Service Workers (see https://caniuse.com/serviceworkers), or your application is running on an insecure host (consider using HTTPS for custom hostnames).`,
        )
      }

      // Remove all previously existing event listeners.
      // This way none of the listeners persists between Fast refresh
      // of the application's code.
      context.events.removeAllListeners()

      // Handle requests signaled by the worker.
      context.workerChannel.on(
        'REQUEST',
        createRequestListener(context, resolvedOptions),
      )

      context.workerChannel.on('RESPONSE', createResponseListener(context))

      const instance = await getWorkerInstance(
        resolvedOptions.serviceWorker.url,
        resolvedOptions.serviceWorker.options,
        resolvedOptions.findWorker,
      )

      const [worker, registration] = instance

      if (!worker) {
        const missingWorkerMessage = options?.findWorker
          ? `[MSW] Failed to locate the Service Worker registration using a custom "findWorker" predicate.

Please ensure that the custom predicate properly locates the Service Worker registration at "${resolvedOptions.serviceWorker.url}".
More details: https://mswjs.io/docs/api/setup-worker/start#findworker
`
          : `[MSW] Failed to locate the Service Worker registration.

This most likely means that the worker script URL "${resolvedOptions.serviceWorker.url}" cannot resolve against the actual public hostname (${location.host}). This may happen if your application runs behind a proxy, or has a dynamic hostname.

Please consider using a custom "serviceWorker.url" option to point to the actual worker script location, or a custom "findWorker" option to resolve the Service Worker registration manually. More details: https://mswjs.io/docs/api/setup-worker/start`

        throw new Error(missingWorkerMessage)
      }

      context.worker = worker
      context.registration = registration

      context.events.addListener(window, 'beforeunload', () => {
        if (worker.state !== 'redundant') {
          // Notify the Service Worker that this client has closed.
          // Internally, it's similar to disabling the mocking, only
          // client close event has a handler that self-terminates
          // the Service Worker when there are no open clients.
          context.workerChannel.send('CLIENT_CLOSED')
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
      await activateMocking(context, options).catch((err) => {
        throw new Error(`Failed to enable mocking: ${err?.message}`)
      })

      context.keepAliveInterval = window.setInterval(
        () => context.workerChannel.send('KEEPALIVE_REQUEST'),
        5000,
      )

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
