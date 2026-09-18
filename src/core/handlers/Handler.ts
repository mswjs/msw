import type { MaybePromise } from '../typeUtils'

export type HandlerKind = 'request' | 'websocket'

/**
 * The base class for all the handlers.
 */
export abstract class Handler {
  /**
   * The kind of the network frame this handler handles.
   */
  abstract readonly kind: HandlerKind

  /**
   * Reset the runtime state this handler accumulated while handling
   * the network (e.g. generator resolver progress).
   *
   * @note This method is invoked automatically when the handlers are
   * reset (e.g. `server.resetHandlers()`).
   */
  public reset(): void {}

  /**
   * Restore this handler so it can handle the network again after
   * being exhausted (e.g. via `{ once: true }`).
   *
   * @note This method is invoked automatically when the handlers are
   * restored (e.g. `server.restoreHandlers()`).
   */
  public restore(): void {}

  /**
   * Release the resources held by this handler.
   *
   * @note This method is invoked automatically when the network is
   * disabled (e.g. `server.close()`). Override it in the handlers that
   * hold onto anything beyond a single frame, like timers, connections,
   * or event listeners. Returning a promise makes the network await
   * this handler's disposal before it tears itself down.
   */
  public dispose(): MaybePromise<void> {}
}
