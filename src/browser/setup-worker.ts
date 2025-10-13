import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket'
import type { HttpHandler, WebSocketHandler } from '~/core'
import {
  defineNetwork,
  type NetworkHandlersApi,
  type NetworkApi,
} from '~/core/new/define-network'
import {
  fromLegacyOnUnhandledRequest,
  UnhandledFrameStrategy,
} from '~/core/new/on-unhandled-frame'
import { UnhandledRequestCallback } from '~/core/utils/request/onUnhandledRequest'
import { NetworkSource } from '~/core/new/sources/index'
import { ServiceWorkerSource } from './sources/service-worker-source'
import { SetupWorkerFallbackSource } from './sources/setup-worker-fallback-source'
import { supportsServiceWorker } from './utils/supports'
import { InterceptorSource } from '~/core/new/sources/interceptor-source'

const DEFAULT_WORKER_URL = '/mockServiceWorker.js'

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
  onUnhandledRequest?: UnhandledFrameStrategy | UnhandledRequestCallback
}

export type FindWorker = (
  scriptUrl: string,
  mockServiceWorkerUrl: string,
) => boolean

/**
 * Sets up a requests interception in the browser with the given request handlers.
 * @param {Array<HttpHandler | WebSocketHandler>} handlers List of request handlers.
 *
 * @see {@link https://mswjs.io/docs/api/setup-worker `setupWorker()` API reference}
 */
export function setupWorker(
  ...handlers: Array<HttpHandler | WebSocketHandler>
): SetupWorkerApi {
  let network: NetworkApi

  return {
    async start(options) {
      const httpSource: NetworkSource = supportsServiceWorker()
        ? new ServiceWorkerSource({
            quiet: options?.quiet,
            serviceWorker: {
              url:
                options?.serviceWorker?.url?.toString() || DEFAULT_WORKER_URL,
              options: options?.serviceWorker?.options,
            },
            findWorker: options?.findWorker,
          })
        : new SetupWorkerFallbackSource()

      network = defineNetwork({
        sources: [
          httpSource,
          /**
           * @note Get WebSocket connections from the interceptor because
           * Service Workers do not intercept WebSocket connections.
           */
          new InterceptorSource({
            interceptors: [new WebSocketInterceptor() as any],
          }),
        ],
        handlers,
        onUnhandledFrame: fromLegacyOnUnhandledRequest(
          () => options?.onUnhandledRequest,
        ),
      })

      await network.enable()
    },
    stop() {
      network.disable()
    },
    get listHandlers() {
      return network.listHandlers.bind(network)
    },
    get use() {
      return network.use.bind(network)
    },
    get resetHandlers() {
      return network.resetHandlers.bind(network)
    },
    get restoreHandlers() {
      return network.restoreHandlers.bind(network)
    },
  }
}
