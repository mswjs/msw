import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket'
import type { HttpHandler, WebSocketHandler } from '~/core'
import {
  defineNetwork,
  type NetworkHandlersApi,
  type NetworkApi,
} from '~/core/new/define-network'
import {
  onUnhandledFrame,
  UnhandledFrameStrategy,
} from '~/core/new/on-unhandled-frame'
import { UnhandledRequestCallback } from '~/core/utils/request/onUnhandledRequest'
import { NetworkSource } from '~/core/new/sources'
import { ServiceWorkerSource } from './service-worker-source'
import { SetupWorkerFallbackSource } from './setup-worker-fallback-source'
import { supportsServiceWorker } from './utils/supports'
import { InterceptorSource } from '~/core/new/sources/interceptor-source'

const DEFAULT_WORKER_URL = '/mockServiceWorker.js'

export interface SetupWorkerApi
  extends NetworkHandlersApi<HttpHandler | WebSocketHandler> {
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
  let network: NetworkApi<HttpHandler | WebSocketHandler>

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
            interceptors: [new WebSocketInterceptor()],
          }),
        ],
        handlers,
        async onUnhandledFrame({ frame, defaults }) {
          /**
           * @note `setupWorker` does not handle unhandled WebSocket events.
           * This will be a new API in 3.0, most likely. We can remove this
           * mapping then.
           */
          if (
            frame.protocol === 'http' &&
            options?.onUnhandledRequest !== undefined
          ) {
            if (typeof options.onUnhandledRequest === 'function') {
              options.onUnhandledRequest(frame.data.request, {
                warning: defaults.warn,
                error: defaults.error,
              })
            } else {
              await onUnhandledFrame(frame, 'warn')
            }
          }
        },
      })

      await network.enable()
    },
    listHandlers() {
      return network.listHandlers()
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
    stop() {
      network.disable()
    },
  }
}
