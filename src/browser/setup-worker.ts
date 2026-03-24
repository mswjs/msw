import { invariant } from 'outvariant'
import { isNodeProcess } from 'is-node-process'
import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket'
import {
  defineNetwork,
  NetworkHandlersApi,
} from '#core/experimental/define-network'
import { type AnyHandler } from '#core/experimental/handlers-controller'
import { InterceptorSource } from '#core/experimental/sources/interceptor-source'
import { type UnhandledRequestStrategy } from '#core/utils/request/onUnhandledRequest'
import { fromLegacyOnUnhandledRequest } from '#core/experimental/compat'
import type { LifeCycleEventEmitter } from '#core/sharedOptions'
import type { HttpNetworkFrameEventMap } from '#core/experimental/frames/http-frame'
import type { WebSocketNetworkFrameEventMap } from '#core/experimental/frames/websocket-frame'
import { devUtils } from '#core/utils/internal/devUtils'
import { supportsServiceWorker } from './utils/supports'
import { ServiceWorkerSource } from './sources/service-worker-source'
import { FallbackHttpSource } from './sources/fallback-http-source'
import type { FindWorker, StartReturnType } from './glossary'

export interface SetupWorkerApi extends NetworkHandlersApi {
  start: (options?: SetupWorkerStartOptions) => StartReturnType
  stop: () => void
  events: LifeCycleEventEmitter<
    HttpNetworkFrameEventMap | WebSocketNetworkFrameEventMap
  >
}

interface SetupWorkerStartOptions {
  quiet?: boolean
  serviceWorker?: {
    url?: string | URL
    options?: RegistrationOptions
  }
  findWorker?: FindWorker
  onUnhandledRequest?: UnhandledRequestStrategy

  /**
   * @deprecated
   * Please use a proper browser integration instead.
   * @see https://mswjs.io/docs/integrations/browser
   */
  waitUntilReady?: boolean
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

  const network = defineNetwork<
    Array<ServiceWorkerSource | FallbackHttpSource | InterceptorSource>
  >({
    sources: [],
    handlers,
  })

  const webSocketSource = new InterceptorSource({
    interceptors: [new WebSocketInterceptor() as any],
  })

  let isStarted = false
  let currentRegistration: ServiceWorkerRegistration | undefined
  let currentStart: Promise<ServiceWorkerRegistration | undefined> | undefined
  let currentStop: Promise<void> | undefined
  let httpSource: ServiceWorkerSource | FallbackHttpSource | undefined

  const getHttpSource = (
    options?: SetupWorkerStartOptions,
  ): ServiceWorkerSource | FallbackHttpSource => {
    if (supportsServiceWorker()) {
      const nextOptions = {
        serviceWorker: {
          url: options?.serviceWorker?.url?.toString() || DEFAULT_WORKER_URL,
          options: options?.serviceWorker?.options,
        },
        findWorker: options?.findWorker,
        quiet: options?.quiet,
      }

      if (!(httpSource instanceof ServiceWorkerSource)) {
        httpSource = new ServiceWorkerSource(nextOptions)
      } else {
        httpSource.configure(nextOptions)
      }

      return httpSource
    }

    const nextOptions = {
      quiet: options?.quiet,
    }

    if (!(httpSource instanceof FallbackHttpSource)) {
      httpSource = new FallbackHttpSource(nextOptions)
    } else {
      httpSource.configure(nextOptions)
    }

    return httpSource
  }

  return {
    async start(options) {
      if (options?.waitUntilReady != null) {
        devUtils.warn(
          `The "waitUntilReady" option has been deprecated. Please remove it from this "worker.start()" call. Follow the recommended Browser integration (https://mswjs.io/docs/integrations/browser) to eliminate any race conditions between the Service Worker registration and any requests made by your application on initial render.`,
        )
      }

      /**
       * @todo @fixme
       * This is kept for backward-compatibility reasons. We don't really need this check anymore.
       */
      if (isStarted) {
        devUtils.warn(
          'Found a redundant "worker.start()" call. Note that starting the worker while mocking is already enabled will have no effect. Consider removing this "worker.start()" call.',
        )
        return currentStart || currentRegistration
      }

      if (currentStop) {
        await currentStop
      }

      const nextHttpSource = getHttpSource(options)

      network.configure({
        sources: [nextHttpSource, webSocketSource],
        onUnhandledFrame: fromLegacyOnUnhandledRequest(() => {
          return options?.onUnhandledRequest || 'warn'
        }),
        context: {
          quiet: options?.quiet,
        },
      })

      isStarted = true
      const startPromise = (async () => {
        await network.enable()

        if (!isStarted) {
          return undefined
        }

        if (nextHttpSource instanceof ServiceWorkerSource) {
          const [, registration] = await nextHttpSource.workerPromise

          if (!isStarted) {
            return undefined
          }

          currentRegistration = registration
          return registration
        }

        currentRegistration = undefined
        return undefined
      })()

      currentStart = startPromise

      try {
        return await startPromise
      } catch (error) {
        isStarted = false
        currentRegistration = undefined
        throw error
      } finally {
        if (currentStart === startPromise) {
          currentStart = undefined
        }
      }
    },
    stop() {
      if (!isStarted) {
        devUtils.warn(
          'Found a redundant "worker.stop()" call. Notice that stopping the worker after it has already been stopped has no effect. Consider removing this "worker.stop()" call.',
        )
        return
      }

      isStarted = false
      currentRegistration = undefined

      const stopPromise = network.disable().then(() => {
        window.postMessage({ type: 'msw/worker:stop' })
      })

      const stopTask = stopPromise.finally(() => {
        if (currentStop === stopTask) {
          currentStop = undefined
        }
      })

      currentStop = stopTask
    },
    events: network.events,
    use: network.use.bind(network),
    resetHandlers: network.resetHandlers.bind(network),
    restoreHandlers: network.restoreHandlers.bind(network),
    listHandlers: network.listHandlers.bind(network),
  }
}
