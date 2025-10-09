import type { HttpHandler, WebSocketHandler } from '~/core'
import {
  defineNetwork,
  type NetworkHandlersApi,
  type NetworkApi,
} from '~/core/new/define-network'
import { ServiceWorkerSource } from './service-worker-source'

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
      const source = new ServiceWorkerSource({
        quiet: options?.quiet,
        serviceWorker: {
          url: options?.serviceWorker?.url?.toString() || DEFAULT_WORKER_URL,
          options: options?.serviceWorker?.options,
        },
        findWorker: options?.findWorker,
      })

      network = defineNetwork({
        sources: [source],
        handlers,
        onUnhandledFrame({ frame }) {
          if (frame.protocol === 'http') {
            //
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
