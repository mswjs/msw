import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket'
import {
  defineNetwork,
  NetworkApi,
  NetworkHandlersApi,
} from '~/core/new/define-network'
import { type AnyHandler } from '~/core/new/handlers-controller'
import { InterceptorSource } from '~/core/new/sources/interceptor-source'
import { fromLegacyOnUnhandledRequest } from '~/core/new/compat'
import { supportsServiceWorker } from './utils/supports'
import { ServiceWorkerSource } from './sources/service-worker-source'
import { FallbackHttpSource } from './sources/fallback-http-source'
import { type FindWorker } from './setupWorker/glossary'
import { type UnhandledRequestStrategy } from '~/core/utils/request/onUnhandledRequest'

interface SetupWorkerApi extends NetworkHandlersApi {
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
  let network: NetworkApi

  return {
    async start(options) {
      const httpSource = supportsServiceWorker()
        ? new ServiceWorkerSource({
            serviceWorker: {
              url: DEFAULT_WORKER_URL,
            },
            findWorker: undefined,
          })
        : new FallbackHttpSource()

      network = defineNetwork({
        sources: [
          httpSource,
          new InterceptorSource({
            interceptors: [new WebSocketInterceptor()],
          }),
        ],
        handlers,
        onUnhandledFrame: fromLegacyOnUnhandledRequest(() => {
          return options?.onUnhandledRequest || 'warn'
        }),
      })

      await network.enable()
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
