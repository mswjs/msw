import { until } from '@open-draft/until'
import { getWorkerInstance } from './utils/getWorkerInstance'
import { enableMocking } from './utils/enableMocking'
import { SetupWorkerInternalContext, StartHandler } from '../glossary'
import { createRequestListener } from '../../utils/worker/createRequestListener'
import { requestIntegrityCheck } from '../../utils/internal/requestIntegrityCheck'
import { deferNetworkRequestsUntil } from '../../utils/deferNetworkRequestsUntil'
import { createResponseListener } from '../../utils/worker/createResponseListener'
import { validateWorkerScope } from './utils/validateWorkerScope'
import { devUtils } from '../../utils/internal/devUtils'

export const createStartHandler = (
  context: SetupWorkerInternalContext,
): StartHandler => {
  return function start(options, customOptions) {
    const startWorkerInstance = async () => {
      // Remove all previously existing event listeners.
      // This way none of the listeners persists between Fast refresh
      // of the application's code.
      context.events.removeAllListeners()

      // Handle requests signaled by the worker.
      context.workerChannel.on(
        'REQUEST',
        createRequestListener(context, options),
      )

      context.workerChannel.on('RESPONSE', createResponseListener(context))

      const instance = await getWorkerInstance(
        options.serviceWorker.url,
        options.serviceWorker.options,
        options.findWorker,
      )

      const [worker, registration] = instance

      if (!worker) {
        const missingWorkerMessage = customOptions?.findWorker
          ? devUtils.formatMessage(
              `Failed to locate the Service Worker registration using a custom "findWorker" predicate.

Please ensure that the custom predicate properly locates the Service Worker registration at "%s".
More details: https://mswjs.io/docs/api/setup-worker/start#findworker
`,
              options.serviceWorker.url,
            )
          : devUtils.formatMessage(
              `Failed to locate the Service Worker registration.

This most likely means that the worker script URL "%s" cannot resolve against the actual public hostname (%s). This may happen if your application runs behind a proxy, or has a dynamic hostname.

Please consider using a custom "serviceWorker.url" option to point to the actual worker script location, or a custom "findWorker" option to resolve the Service Worker registration manually. More details: https://mswjs.io/docs/api/setup-worker/start`,
              options.serviceWorker.url,
              location.host,
            )

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
        devUtils.error(`\
Detected outdated Service Worker: ${integrityError.message}

The mocking is still enabled, but it's highly recommended that you update your Service Worker by running:

$ npx msw init <PUBLIC_DIR>

This is necessary to ensure that the Service Worker is in sync with the library to guarantee its stability.
If this message still persists after updating, please report an issue: https://github.com/open-draft/msw/issues\
      `)
      }

      context.keepAliveInterval = window.setInterval(
        () => context.workerChannel.send('KEEPALIVE_REQUEST'),
        5000,
      )

      // Warn the user when loading the page that lies outside
      // of the worker's scope.
      validateWorkerScope(registration, context.startOptions)

      return registration
    }

    const workerRegistration = startWorkerInstance().then(
      async (registration) => {
        const pendingInstance = registration.installing || registration.waiting

        // Wait until the worker is activated.
        // Assume the worker is already activated if there's no pending registration
        // (i.e. when reloading the page after a successful activation).
        if (pendingInstance) {
          await new Promise<void>((resolve) => {
            pendingInstance.addEventListener('statechange', () => {
              if (pendingInstance.state === 'activated') {
                return resolve()
              }
            })
          })
        }

        // Print the activation message only after the worker has been activated.
        await enableMocking(context, options).catch((error) => {
          throw new Error(`Failed to enable mocking: ${error?.message}`)
        })

        return registration
      },
    )

    // Defer any network requests until the Service Worker instance is ready.
    // This prevents a race condition between the Service Worker registration
    // and application's runtime requests (i.e. requests on mount).
    if (options.waitUntilReady) {
      deferNetworkRequestsUntil(workerRegistration)
    }

    return workerRegistration
  }
}
