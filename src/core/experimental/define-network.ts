import { invariant } from 'outvariant'
import { Emitter, type DefaultEventMap } from 'rettime'
import type {
  NetworkSource,
  ExtractSourceEvents,
} from './sources/network-source'
import type { NetworkFrameResolutionContext } from './frames/network-frame'
import type { UnhandledFrameHandle } from './on-unhandled-frame'
import {
  HandlersController,
  InMemoryHandlersController,
  type AnyHandler,
} from './handlers-controller'
import { toReadonlyArray } from '../utils/internal/toReadonlyArray'
import { Disposable } from '../utils/internal/Disposable'
import type { HandlerKind } from '../handlers/Handler'
import { NetworkSourceRegistry } from './network-source-registry'

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

type MaybePromise<T> =
  Extract<T, Promise<unknown>> extends never ? void : Promise<void>

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

export interface NetworkApi<
  Sources extends Array<NetworkSource<any>>,
> extends NetworkHandlersApi {
  readyState: NetworkReadyState
  /**
   * Enable the network interception and handling.
   */
  enable: () => MaybePromise<ReturnType<Sources[number]['enable']>>
  /**
   * Disable the network interception and handling.
   */
  disable: () => MaybePromise<ReturnType<Sources[number]['disable']>>
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

export enum NetworkReadyState {
  DISABLED,
  ENABLED,
}

/**
 * Define a network instance with the given configuration.
 * @example
 * import { InterceptorSource } from 'msw/experimental'
 * import { handlers } from './handlers'
 *
 * const network = defineNetwork({
 *   sources: [new InterceptorSource({ interceptors })],
 *   handlers,
 * })
 * await network.enable()
 */
export function defineNetwork<Sources extends Array<NetworkSource<any>>>(
  options: DefineNetworkOptions<Sources>,
): NetworkApi<Sources> {
  let readyState: NetworkReadyState = NetworkReadyState.DISABLED
  const events = new Emitter<MergeEventMaps<Sources>>()
  const disposable = new Disposable()
  let sourceRegistry: NetworkSourceRegistry | undefined

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
   * certain setup APIs, like `setupServer`, don't await `.enable` (`.listen`).
   */
  let handlersController = deriveHandlersController(resolvedOptions.handlers)

  return {
    get readyState() {
      return readyState
    },
    events,
    configure(options) {
      invariant(
        readyState === NetworkReadyState.DISABLED,
        'Failed to call "configure()" on the network: cannot configure an already enabled network.',
      )

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
    enable() {
      invariant(
        readyState === NetworkReadyState.DISABLED,
        'Failed to call "enable" on the network: already enabled',
      )

      readyState = NetworkReadyState.ENABLED

      /**
       * @note Use a session object scoped to the current "enable()"
       * to prevent "frame.events" listeners from surviving across enable/disable cycles.
       * @see The note about `AbortController` below.
       */
      const session = { active: true }
      disposable['subscriptions'].push(() => {
        session.active = false
      })

      const registry = (sourceRegistry = new NetworkSourceRegistry(
        resolvedOptions.sources,
      ))

      for (const source of resolvedOptions.sources) {
        source.on('frame', async ({ frame }) => {
          await registry.idle

          if (!session.active) {
            frame.passthrough()
            return
          }

          frame.events.on('*', (event) => {
            /**
             * @note Prevent event forwarding manually and not via an AbortController
             * because certain runtimes, like Cloudflare, throw when referencing an
             * AbortController created in a different context. Bear in mind that the frame
             * events run in the patched request client context while the AbortController
             * is created outside, in the "defineNetwork" closure, which is a test context.
             */
            if (!session.active) {
              return
            }

            events.emit(event)
          })

          const handlers = frame.getHandlers(handlersController)

          await frame.resolve(
            handlers,
            resolvedOptions.onUnhandledFrame || 'warn',
            resolvedOptions.context,
          )
        })
      }

      const { handlers } = handlersController.use([])

      return registry.accept(
        Object.keys(handlers) as Array<HandlerKind>,
      ) as MaybePromise<ReturnType<Sources[number]['enable']>>
    },
    disable() {
      invariant(
        readyState === NetworkReadyState.ENABLED,
        'Failed to call "disable" on the network: already disabled',
      )

      readyState = NetworkReadyState.DISABLED

      // Let the handlers release the resources they hold before
      // tearing down the network itself. Handlers may still need the
      // network while disposing of themselves (e.g. to close the
      // connections they own).
      const handlersDisposal = handlersController.dispose()
      disposable.dispose()

      // Remove listeners immediately, even if source shutdown is asynchronous.
      // The registry starts teardown synchronously where possible and serializes
      // it with other registries using the same sources.
      for (const source of resolvedOptions.sources) {
        source.removeAllListeners()
      }

      const sourcesDisposal = sourceRegistry?.dispose()

      /**
       * @note Await both disposals so neither rejection goes unobserved.
       * Chaining them would leave the source disposal floating whenever
       * the handlers disposal rejects.
       */
      return (
        handlersDisposal instanceof Promise
          ? Promise.all([handlersDisposal, sourcesDisposal]).then(() => {})
          : sourcesDisposal
      ) as MaybePromise<ReturnType<Sources[number]['disable']>>
    },
    use(...handlers) {
      const state = handlersController.use(handlers)

      if (readyState === NetworkReadyState.ENABLED) {
        sourceRegistry?.accept(
          Object.keys(state.handlers) as Array<HandlerKind>,
        )
      }
    },
    resetHandlers(...handlers) {
      const state = handlersController.reset(handlers)

      if (readyState === NetworkReadyState.ENABLED) {
        sourceRegistry?.accept(
          Object.keys(state.handlers) as Array<HandlerKind>,
        )
      }
    },
    restoreHandlers() {
      handlersController.restore()
    },
    listHandlers() {
      return toReadonlyArray(handlersController.listHandlers())
    },
  }
}
