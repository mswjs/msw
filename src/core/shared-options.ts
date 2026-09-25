import type { Emitter, DefaultEventMap } from 'rettime'
import type { UnhandledFrameHandle } from './experimental/on-unhandled-frame'

export interface SharedOptions {
  /**
   * Specifies how to react to a network frame (e.g. a request or
   * a WebSocket connection) that has no corresponding handler.
   * Warns on unhandled frames by default.
   *
   * @example worker.start({ onUnhandledFrame: 'bypass' })
   * @example worker.start({ onUnhandledFrame: 'warn' })
   * @example server.listen({ onUnhandledFrame: 'error' })
   * @example server.listen({ onUnhandledFrame({ frame, defaults }) { defaults.warn() } })
   */
  onUnhandledFrame?: UnhandledFrameHandle
}

export type LifeCycleEventEmitter<EventMap extends DefaultEventMap> = Pick<
  Emitter<EventMap>,
  'on' | 'removeListener' | 'removeAllListeners'
>
