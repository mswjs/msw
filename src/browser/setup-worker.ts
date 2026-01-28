import { invariant } from 'outvariant'
import { isNodeProcess } from 'is-node-process'
import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket'
import { defineNetwork, NetworkHandlersApi } from '#core/new/define-network'
import { type AnyHandler } from '#core/new/handlers-controller'
import { InterceptorSource } from '#core/new/sources/interceptor-source'
import { type UnhandledRequestStrategy } from '#core/utils/request/onUnhandledRequest'
import { fromLegacyOnUnhandledRequest } from '#core/new/compat'
import { devUtils } from '#core/utils/internal/devUtils'
import { supportsServiceWorker } from './utils/supports'
import { ServiceWorkerSource } from './sources/service-worker-source'
import { FallbackHttpSource } from './sources/fallback-http-source'
import { type FindWorker } from './glossary'

export interface SetupWorkerApi extends NetworkHandlersApi {
  start: (options?: SetupWorkerStartOptions) => Promise<void>
  stop: () => void
}

interface SetupWorkerStartOptions {
  quiet?: boolean
  serviceWorker?: {
    url?: string | URL
    options?: RegistrationOptions
  }
  findWorker?: FindWorker
  onUnhandledRequest?: UnhandledRequestStrategy
}

const DEFAULT_WORKER_URL = '/mockServiceWorker.js'

/**
 * Sets up a requests interception in the browser with the given request handlers.
 * @param {Array<AnyHandler>} handlers List of request handlers.
 *
 * @see {@link https://mswjs.io/docs/api/setup-worker `setupWorker()` API reference}
 */
export function setupWorker(...handlers: Array<AnyHandler>): SetupWorkerApi {
  invariant(
    !isNodeProcess(),
    devUtils.formatMessage(
      'Failed to execute `setupWorker` in a non-browser environment',
    ),
  )

  let hasStarted = false
  const network = defineNetwork<
    Array<ServiceWorkerSource | FallbackHttpSource | InterceptorSource>
  >({
    sources: [],
    handlers,
  })

  return {
    async start(options) {
      /**
       * @todo @fixme
       * This is kept for backward-compatibility reasons. We don't really need this check anymore.
       */
      if (hasStarted) {
        devUtils.warn(
          'Found a redundant "worker.start()" call. Note that starting the worker while mocking is already enabled will have no effect. Consider removing this "worker.start()" call.',
        )
        return
      }

      const httpSource = supportsServiceWorker()
        ? new ServiceWorkerSource({
            serviceWorker: {
              url:
                options?.serviceWorker?.url?.toString() || DEFAULT_WORKER_URL,
              options: options?.serviceWorker?.options,
            },
            findWorker: options?.findWorker,
          })
        : new FallbackHttpSource()

      network.configure({
        sources: [
          httpSource,
          new InterceptorSource({
            interceptors: [new WebSocketInterceptor() as any],
          }),
        ],
        onUnhandledFrame: fromLegacyOnUnhandledRequest(() => {
          return options?.onUnhandledRequest || 'warn'
        }),
        context: {
          quiet: options?.quiet,
        },
      })

      await network.enable()
      await httpSource.printStartMessage()
      hasStarted = true
    },
    stop() {
      network.disable()
    },
    use(...handlers) {
      return network.use(...handlers)
    },
    resetHandlers(...handlers) {
      return network.resetHandlers(...handlers)
    },
    restoreHandlers() {
      return network.restoreHandlers()
    },
    listHandlers() {
      return network.listHandlers()
    },
  }
}
