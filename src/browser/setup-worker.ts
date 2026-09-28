import { invariant } from 'outvariant'
import { isNodeProcess } from 'is-node-process'
import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket'
import {
  defineNetwork,
  NetworkReadyState,
} from '#core/experimental/define-network'
import type { AnyHandler } from '#core/experimental/handlers-controller'
import { InterceptorSource } from '#core/experimental/sources/interceptor-source'
import { devUtils } from '#core/utils/internal/dev-utils'
import { supportsServiceWorker } from './utils/supports'
import { ServiceWorkerSource } from './sources/service-worker-source'
import { FallbackHttpSource } from './sources/fallback-http-source'
import type { SetupWorker } from './glossary'

const DEFAULT_WORKER_URL = '/mockServiceWorker.js'

/**
 * Sets up a requests interception in the browser with the given request handlers.
 * @param {Array<AnyHandler>} handlers List of request handlers.
 *
 * @see {@link https://mswjs.io/docs/api/setup-worker `setupWorker()` API reference}
 */
export function setupWorker(...handlers: Array<AnyHandler>): SetupWorker {
  invariant(
    !isNodeProcess(),
    devUtils.formatMessage(
      'Failed to execute `setupWorker` in a non-browser environment',
    ),
  )

  const network = defineNetwork<
    Array<ServiceWorkerSource | FallbackHttpSource | InterceptorSource>
  >({
    sources: [],
    handlers,
  })

  return {
    get readyState() {
      return network.readyState
    },
    async start(options) {
      invariant(
        network.readyState === NetworkReadyState.DISABLED,
        devUtils.formatMessage(
          'Failed to call "worker.start()": the worker is already started. Remove the redundant "worker.start()" call.',
        ),
      )

      const httpSource = supportsServiceWorker()
        ? await ServiceWorkerSource.from({
            serviceWorker: {
              url:
                options?.serviceWorker?.url?.toString() || DEFAULT_WORKER_URL,
              options: options?.serviceWorker?.options,
            },
            findWorker: options?.findWorker,
            quiet: options?.quiet,
          })
        : new FallbackHttpSource({
            quiet: options?.quiet,
          })

      network.configure({
        sources: [
          httpSource,
          new InterceptorSource({
            interceptors: [new WebSocketInterceptor()],
          }),
        ],
        onUnhandledFrame: options?.onUnhandledFrame ?? 'warn',
        context: {
          quiet: options?.quiet,
        },
      })

      await network.enable()

      if (httpSource instanceof ServiceWorkerSource) {
        const [, registration] = await httpSource.workerPromise
        return registration
      }
    },
    async stop() {
      await network.disable()
      window.postMessage({ type: 'msw/worker:stop' })
    },
    events: network.events,
    use: network.use.bind(network),
    resetHandlers: network.resetHandlers.bind(network),
    restoreHandlers: network.restoreHandlers.bind(network),
    listHandlers: network.listHandlers.bind(network),
  }
}
