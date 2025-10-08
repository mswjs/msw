import { NetworkSource } from './sources'
import {
  AnyHandler,
  HandlersController,
  inMemoryHandlersController,
} from './handlers-controller'
import { toReadonlyArray } from '../utils/internal/toReadonlyArray'

interface DefineNetworkOptions<Handler extends AnyHandler> {
  /**
   * A list of network sources.
   */
  sources: Array<NetworkSource>

  /**
   * A list of the initial handlers.
   */
  handlers?: Array<Handler>

  /**
   * A custom handlers controller to use.
   * Use this to customize how handlers are storeded (e.g. in memory, `AsyncLocalStorage`, etc).
   */
  handlersController?: HandlersController<Handler>
}

interface NetworkApi<Handler extends AnyHandler> {
  /**
   * Enables the network interception.
   */
  enable: () => Promise<void>

  /**
   * Disables the network interception.
   */
  disable: () => Promise<void>

  use: (...handlers: Array<Handler>) => void
  resetHandlers: (...nextHandlers: Array<Handler>) => void
  restoreHandlers: () => void
  listHandlers: () => ReadonlyArray<Handler>
}

export function defineNetwork<Handler extends AnyHandler>(
  options: DefineNetworkOptions<Handler>,
): NetworkApi<Handler> {
  const source = NetworkSource.from(options.sources)

  const handlersController =
    options.handlersController ||
    inMemoryHandlersController(options.handlers || [])

  return {
    async enable() {
      await source.enable()

      source.on('frame', (event) => {
        const frame = event.data
        const handlers = handlersController.currentHandlers()

        /** @todo */
        /** @todo */
        /** @todo */
        /** @todo */
        /** @todo */
      })
    },
    async disable() {
      this.resetHandlers()
      await source.disable()
    },
    use(...handlers) {
      handlersController.prepend(handlers)
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
  }
}
