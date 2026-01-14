import { Emitter, type DefaultEventMap } from 'rettime'
import {
  type NetworkSource,
  type ExtractSourceEvents,
  type AnyNetworkFrame,
} from './sources/network-source'
import { type NetworkFrameResolutionContext } from './frames/network-frame'
import { onUnhandledFrame, UnhandledFrameHandle } from './on-unhandled-frame'
import { isHandlerKind } from '../utils/internal/isHandlerKind'
import {
  AnyHandler,
  HandlersController,
  InMemoryHandlersController,
} from './handlers-controller'
import { toReadonlyArray } from '../utils/internal/toReadonlyArray'

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never

type MergeEventMaps<Sources extends Array<NetworkSource<any>>> =
  UnionToIntersection<ExtractSourceEvents<Sources[number]>> extends infer R
    ? R extends Record<string, any>
      ? R
      : DefaultEventMap
    : DefaultEventMap

export interface DefineNetworkOptions<
  Sources extends Array<NetworkSource<any>>,
> {
  sources: Sources
  handlers?: Array<AnyHandler> | HandlersController
  context?: NetworkFrameResolutionContext
  onUnhandledFrame?: UnhandledFrameHandle
}

export interface NetworkApi<Sources extends Array<NetworkSource<any>>>
  extends NetworkHandlersApi {
  enable: () => Promise<void>
  disable: () => Promise<void>
  events: Emitter<MergeEventMaps<Sources>>
}

export interface NetworkHandlersApi {
  use: (...handlers: Array<AnyHandler>) => void
  resetHandlers: (...handlers: Array<AnyHandler>) => void
  restoreHandlers: () => void
  listHandlers: () => ReadonlyArray<AnyHandler>
}

export function defineNetwork<Sources extends Array<NetworkSource<any>>>(
  options: DefineNetworkOptions<Sources>,
): NetworkApi<Sources> {
  const events = new Emitter<MergeEventMaps<Sources>>()

  const handlersController =
    options.handlers instanceof HandlersController
      ? options.handlers
      : new InMemoryHandlersController(options.handlers || [])

  return {
    events,
    async enable() {
      await Promise.all(
        options.sources.map(async (source) => {
          source.on(
            'frame',
            async ({ data: frame }: { data: AnyNetworkFrame }) => {
              /**
               * @fixme This typeless listener makes it so all emits are treated as
               * having a listener. That makes it hard for the library to know whether
               * the user has actually defined any listeners.
               */
              frame.events.on((event) => {
                events.emit(event)
              })

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
                handlersController.currentHandlers.filter(handlerPredicate) ||
                []

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
            },
          )

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
