import { Emitter, type DefaultEventMap } from 'rettime'
import {
  type NetworkSource,
  type ExtractSourceEvents,
  getHandlerKindByFrame,
} from './sources/network-source'
import { type NetworkFrameResolutionContext } from './frames/network-frame'
import { type UnhandledFrameHandle } from './on-unhandled-frame'
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
  /**
   * List of the network sources.
   * Every network source emits frames, and every frame describes how
   * to handle the various network scenarios, like mocking a response,
   * erroring the request, or performing it as-is.
   */
  sources: Sources
  /**
   * List of handlers to describe the network.
   */
  handlers?: Array<AnyHandler> | HandlersController
  context?: NetworkFrameResolutionContext
  onUnhandledFrame?: UnhandledFrameHandle
}

export interface NetworkApi<Sources extends Array<NetworkSource<any>>>
  extends NetworkHandlersApi {
  /**
   * Enable the network interception and handling.
   */
  enable: () => Promise<void>
  /**
   * Disable the network interception and handling.
   */
  disable: () => Promise<void>
  /**
   * Configure the network instance with additional options.
   * The options provided in the `.configure()` call will override the same
   * options in the `defineNetwork()` call.
   */
  configure: (options: Partial<DefineNetworkOptions<Sources>>) => void
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

  const deriveHandlersController = (
    handlers: DefineNetworkOptions<Sources>['handlers'],
  ) => {
    return handlers instanceof HandlersController
      ? handlers
      : new InMemoryHandlersController(handlers || [])
  }

  let resolvedOptions: DefineNetworkOptions<Sources> = {
    ...options,
  }

  /**
   * @note Create the handlers controller immediately because
   * certain setup API, like `setupServer`, don't await `.enable` (`.listen`).
   */
  let handlersController = deriveHandlersController(resolvedOptions.handlers)

  return {
    events,
    configure(options) {
      if (
        options.handlers &&
        !Object.is(options.handlers, resolvedOptions.handlers)
      ) {
        handlersController = deriveHandlersController(options.handlers)
      }

      resolvedOptions = {
        ...resolvedOptions,
        ...options,
      }
    },
    async enable() {
      await Promise.all(
        resolvedOptions.sources.map(async (source) => {
          source.on('frame', async ({ frame }) => {
            frame.events.on('*', (event) => events.emit(event))

            const matchingHandlers = handlersController.getHandlersByKind(
              getHandlerKindByFrame(frame),
            )

            await frame.resolve(
              matchingHandlers,
              resolvedOptions.onUnhandledFrame || 'warn',
              resolvedOptions.context,
            )
          })

          await source.enable()
        }),
      )
    },
    async disable() {
      await Promise.all(
        resolvedOptions.sources.map((source) => source.disable()),
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
