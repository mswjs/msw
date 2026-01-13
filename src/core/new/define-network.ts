import { Emitter } from 'rettime'
import { type NetworkSource } from './sources/network-source'
import { type NetworkFrameResolutionContext } from './frames/network-frame'
import { onUnhandledFrame, UnhandledFrameHandle } from './on-unhandled-frame'
import { isHandlerKind } from '../utils/internal/isHandlerKind'
import {
  AnyHandler,
  type HandlersController,
  InMemoryHandlersController,
} from './handlers-controller'
import { toReadonlyArray } from '../utils/internal/toReadonlyArray'

export interface DefineNetworkOptions {
  sources: Array<NetworkSource>
  handlers?: Array<AnyHandler>
  context?: NetworkFrameResolutionContext
  controller?: HandlersController
  onUnhandledFrame?: UnhandledFrameHandle
}

export interface NetworkApi extends NetworkHandlersApi {
  enable: () => Promise<void>
  disable: () => Promise<void>
  events: Emitter<any> /** @fixme Infer event maps from sources */
}

export interface NetworkHandlersApi {
  use: (...handlers: Array<AnyHandler>) => void
  resetHandlers: (...handlers: Array<AnyHandler>) => void
  restoreHandlers: () => void
  listHandlers: () => ReadonlyArray<AnyHandler>
}

export function defineNetwork(options: DefineNetworkOptions): NetworkApi {
  const events = new Emitter()
  const handlersController =
    options.controller || new InMemoryHandlersController(options.handlers || [])

  return {
    events,
    async enable() {
      await Promise.all(
        options.sources.map(async (source) => {
          source.on('frame', async ({ data: frame }) => {
            frame.events.on((event) => events.emit(event))

            /**
             * @fixme Handler filtering on each frame is expensive.
             * Refactor the way we store handlers into a Map<HandlerKind, Array<Handler>>.
             */
            const handlerPredicate =
              frame.protocol === 'http'
                ? isHandlerKind('RequestHandler')
                : frame.protocol === 'ws'
                  ? isHandlerKind('EventHandler')
                  : () => false

            const handlers =
              handlersController.currentHandlers.filter(handlerPredicate) || []

            const isHandledFrame = await frame.resolve(
              handlers,
              options.context,
            )

            if (isHandledFrame === false) {
              await onUnhandledFrame(
                frame,
                options.onUnhandledFrame || 'warn',
              ).catch((error) => {
                frame.errorWith(error)
              })
            }
          })

          await source.enable()
        }),
      )
    },
    async disable() {
      await Promise.all(
        options.sources.map(async (source) => {
          await source.disable()
        }),
      )
    },
    use(...handlers) {
      handlersController.use(handlers)
    },
    resetHandlers(...handlers) {
      handlersController.reset(handlers)
    },
    restoreHandlers() {
      for (const handler of handlersController.currentHandlers) {
        if ('isUsed' in handler) {
          handler.isUsed = false
        }
      }
    },
    listHandlers() {
      return toReadonlyArray(handlersController.currentHandlers)
    },
  }
}
