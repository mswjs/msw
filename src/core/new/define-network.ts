import { Emitter } from 'strict-event-emitter'
import { NetworkSource } from './sources/index'
import {
  type AnyHandler,
  type HandlersController,
  inMemoryHandlersController,
} from './handlers-controller'
import { toReadonlyArray } from '../utils/internal/toReadonlyArray'
import { resolveNetworkFrame } from './resolve-network-frame'
import {
  onUnhandledFrame,
  type UnhandledFrameCallback,
  type UnhandledFrameStrategy,
} from './on-unhandled-frame'
import { pipeEvents } from '../utils/internal/pipeEvents'

export interface DefineNetworkOptions<Handler extends AnyHandler> {
  /**
   * A list of network sources.
   */
  sources: Array<NetworkSource>

  /**
   * A list of the initial handlers.
   */
  handlers: Array<Handler>

  /**
   * A custom handlers controller to use.
   * Use this to customize how handlers are storeded (e.g. in memory, `AsyncLocalStorage`, etc).
   */
  handlersController?: HandlersController

  /**
   * A fixed strategy or a custom callback for dealing with unhandled frames.
   */
  onUnhandledFrame?: UnhandledFrameStrategy | UnhandledFrameCallback

  quiet?: boolean
}

export interface NetworkApi<Handler extends AnyHandler>
  extends NetworkHandlersApi<Handler> {
  /**
   * Enables the network interception.
   */
  enable(): Promise<void>

  /**
   * Disables the network interception.
   */
  disable(): Promise<void>

  /**
   * @fixme Infer the EventMap type from the sources passed to this network.
   */
  events: Emitter<any>
}

export interface NetworkHandlersApi<Handler extends AnyHandler> {
  use(...handlers: Array<Handler>): void
  resetHandlers(...nextHandlers: Array<Handler>): void
  restoreHandlers(): void
  listHandlers(): ReadonlyArray<Handler>
}

export function defineNetwork<Handler extends AnyHandler>(
  options: DefineNetworkOptions<Handler>,
): NetworkApi<Handler> {
  const source = NetworkSource.from(...options.sources)
  const events = new Emitter()

  const handlersController =
    options.handlersController || inMemoryHandlersController(options.handlers)

  return {
    async enable() {
      source.on('frame', async (event) => {
        const frame = event.data
        pipeEvents<any>(frame.events, events)

        await resolveNetworkFrame(frame, handlersController.currentHandlers(), {
          quiet: options?.quiet,
          async unhandled() {
            await onUnhandledFrame(
              frame,
              options.onUnhandledFrame || 'bypass',
            ).catch((error) => {
              /**
               * @fixme `.errorWith()` should exist on WebSocket frames too
               * since you can error the connection by dispatching the "error" event.
               */
              if (frame.protocol === 'http') {
                frame.errorWith(error)
              }
            })
          },
        })
      })

      await source.enable()
    },
    async disable() {
      await source.disable()
    },
    use(...handlers) {
      handlersController.use(handlers)
    },
    resetHandlers(...nextHandlers) {
      handlersController.reset(nextHandlers)
    },
    restoreHandlers() {
      for (const handler of handlersController.currentHandlers()) {
        if ('isUsed' in handler) {
          handler.isUsed = false
        }
      }
    },
    listHandlers() {
      return toReadonlyArray(handlersController.currentHandlers())
    },
    events,
  }
}
