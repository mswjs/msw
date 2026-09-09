import { NetworkReadyState, type NetworkApi } from './define-network'
import type { InterceptorSource } from './sources/interceptor-source'
import { fromLegacyOnUnhandledRequest } from './compat'
import type { PartialDeep } from 'type-fest'
import type { HttpNetworkFrameEventMap } from './frames/http-frame'
import type { WebSocketNetworkFrameEventMap } from './frames/websocket-frame'
import type { AnyHandler } from './handlers-controller'
import type { LifeCycleEventEmitter, SharedOptions } from '../sharedOptions'

export interface ListenOptions extends SharedOptions {}

export interface SetupServerCommon {
  /**
   * Starts the request interception based on the previously provided request handlers.
   *
   * @see {@link https://mswjs.io/docs/api/setup-server/listen `server.listen()` API reference}
   */
  listen: (options?: PartialDeep<ListenOptions>) => void

  /**
   * Stops the request interception by restoring all augmented modules.
   *
   * @see {@link https://mswjs.io/docs/api/setup-server/close `server.close()` API reference}
   */
  close: () => void

  /**
   * Prepends given request handlers to the list of existing handlers.
   *
   * @see {@link https://mswjs.io/docs/api/setup-server/use `server.use()` API reference}
   */
  use: (...handlers: Array<AnyHandler>) => void

  /**
   * Marks all request handlers that respond using `res.once()` as unused.
   *
   * @see {@link https://mswjs.io/docs/api/setup-server/restore-handlers `server.restore-handlers()` API reference}
   */
  restoreHandlers: () => void

  /**
   * Resets request handlers to the initial list given to the `setupServer` call, or to the explicit next request handlers list, if given.
   *
   * @see {@link https://mswjs.io/docs/api/setup-server/reset-handlers `server.reset-handlers()` API reference}
   */
  resetHandlers: (...nextHandlers: Array<AnyHandler>) => void

  /**
   * Returns a readonly list of currently active request handlers.
   *
   * @see {@link https://mswjs.io/docs/api/setup-server/list-handlers `server.listHandlers()` API reference}
   */
  listHandlers: () => ReadonlyArray<AnyHandler>

  /**
   * Life-cycle events.
   * Life-cycle events allow you to subscribe to the internal library events occurring during the request/response handling.
   *
   * @see {@link https://mswjs.io/docs/api/life-cycle-events Life-cycle Events API reference}
   */
  events: LifeCycleEventEmitter<
    HttpNetworkFrameEventMap & WebSocketNetworkFrameEventMap
  >
}

/**
 * Define the common `setupServer` API around the given network.
 * This is used by both `msw/node` and `@msw/react-native` to implement the same
 * baseline setup methods, like `.use()`, `.resetHandlers()`, `.close()`, etc.
 */
export function defineSetupServerApi(
  network: NetworkApi<[InterceptorSource]>,
): SetupServerCommon {
  return {
    events: network.events,
    listen(options) {
      network.configure({
        onUnhandledFrame: fromLegacyOnUnhandledRequest(() => {
          return options?.onUnhandledRequest || 'warn'
        }),
      })

      network.enable()
    },
    use: network.use.bind(network),
    resetHandlers: network.resetHandlers.bind(network),
    restoreHandlers: network.restoreHandlers.bind(network),
    listHandlers: network.listHandlers.bind(network),
    close() {
      /**
       * @note Ignore closing after closed for backwards compatibility.
       */
      if (network.readyState === NetworkReadyState.DISABLED) {
        return
      }

      network.disable()
    },
  }
}
