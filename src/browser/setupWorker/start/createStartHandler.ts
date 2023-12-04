import { until } from '@open-draft/until'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { devUtils } from '~/core/utils/internal/devUtils'
import { getWorkerInstance } from './utils/getWorkerInstance'
import { enableMocking } from './utils/enableMocking'
import { SetupWorkerInternalContext, StartHandler } from '../glossary'
import { createRequestListener } from './createRequestListener'
import { requestIntegrityCheck } from '../../utils/requestIntegrityCheck'
import { deferNetworkRequestsUntil } from '../../utils/deferNetworkRequestsUntil'
import { createResponseListener } from './createResponseListener'
import { validateWorkerScope } from './utils/validateWorkerScope'

export const createStartHandler = (
  context: SetupWorkerInternalContext,
): StartHandler => {
  return function start(options, customOptions) {
    const workerActivationPromise =
      new DeferredPromise<ServiceWorkerRegistration>()

    context.state = 'activating'

    const registerWorker =
      async (): Promise<ServiceWorkerRegistration | null> => {
        // Remove all previously existing event listeners.
        // This way none of the listeners persists between Fast refresh
        // of the application's code.
        context.events.removeAllListeners()

        // Handle requests signaled by the worker.
        context.workerChannel.on(
          'REQUEST',
          createRequestListener(context, options),
        )

        // Handle responses signaled by the worker.
        context.workerChannel.on('RESPONSE', createResponseListener(context))

        const instance = await getWorkerInstance(
          options.serviceWorker.url,
          options.serviceWorker.options,
          options.findWorker,
        )

        const [worker, registration] = instance

        if (!worker) {
          // If the activation was cancelled while waiting for the registration instance,
          // that's okay: no instance to return so return null.
          if (context.state === 'cancelled') {
            return null
          }

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
        const integrityCheckResult = await until(() =>
          requestIntegrityCheck(context, worker),
        )

        if (integrityCheckResult.error) {
          devUtils.error(`\
Detected outdated Service Worker: ${integrityCheckResult.error.message}

The mocking is still enabled, but it's highly recommended that you update your Service Worker by running:

$ npx msw init <PUBLIC_DIR>

This is necessary to ensure that the Service Worker is in sync with the library to guarantee its stability.
If this message still persists after updating, please report an issue: https://github.com/mswjs/msw/issues\
      `)
        }

        context.keepAliveInterval = window.setInterval(
          () => context.workerChannel.send('KEEPALIVE_REQUEST'),
          5000,
        )

        // Warn the user when loading the page that's outside
        // of the worker's scope.
        validateWorkerScope(registration, context.startOptions)

        return registration
      }

    registerWorker().then(async (pendingWorkerRegistration) => {
      // If the activation was cancelled (e.g. by calling "worker.stop()"),
      // short-circuit: nothing to return.
      if (pendingWorkerRegistration == null) {
        return
      }

      const pendingWorker =
        pendingWorkerRegistration.installing ||
        pendingWorkerRegistration.waiting

      // Wait until the worker is activated.
      // Assume the worker is already activated if there's no pending registration
      // (i.e. when reloading the page after a successful activation).
      if (pendingWorker) {
        await new Promise<void>((resolve) => {
          const stateChangeListener = () => {
            if (pendingWorker.state === 'activated') {
              resolve()
            }
          }

          pendingWorker.addEventListener('statechange', stateChangeListener, {
            once: true,
          })
        })
      }

      workerActivationPromise.resolve(pendingWorkerRegistration)
    })

    workerActivationPromise.then(async () => {
      // Print the activation message once the worker has been activated.
      await enableMocking(context, options)
        .then(() => {
          context.state = 'activated'
        })
        .catch((error) => {
          throw new Error(`Failed to enable mocking: ${error?.message}`)
        })
    })

    // Defer any network requests until the Service Worker is activated.
    // This prevents a race condition between the Service Worker registration
    // and application's runtime requests (e.g. requests on mount).
    if (options.waitUntilReady) {
      deferNetworkRequestsUntil(workerActivationPromise)
    }

    return workerActivationPromise
  }
}
