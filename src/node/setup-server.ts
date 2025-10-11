import { type Interceptor } from '@mswjs/interceptors'
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { type AnyHandler } from '~/core/new/handlers-controller'
import { RemoteRequestHandler } from '~/core/rpc/handlers/remote-request-handler'
import {
  ReversibleProxy,
  reversibleProxy,
} from '~/core/utils/internal/reversibleProxy'
import {
  type AsyncHandlersController,
  asyncHandlersController,
} from './async-handler-controller'
import type { ListenOptions, SetupServer, SetupServerCommon } from './glossary'
import { HandlersController } from '~/core/SetupApi'
import { defineNetwork, NetworkApi } from '~/core/new/define-network'
import { InterceptorSource } from '~/core/new/sources/interceptor-source'
import { fromLegacyOnUnhandledRequest } from '~/core/new/on-unhandled-frame'

/**
 * Enables request interception in Node.js with the given request handlers.
 *
 * @see {@link https://mswjs.io/docs/api/setup-server `setupServer()` API reference}
 */
export function setupServer(...handlers: Array<AnyHandler>): SetupServerApi {
  return new SetupServerApi(handlers, [
    new ClientRequestInterceptor(),
    new XMLHttpRequestInterceptor(),
    new FetchInterceptor(),
    new WebSocketInterceptor() as any,
  ])
}

export class SetupServerApi implements SetupServer {
  public events: SetupServerCommon['events']
  public use: SetupServerCommon['use']
  public resetHandlers: SetupServerCommon['resetHandlers']
  public restoreHandlers: SetupServerCommon['restoreHandlers']
  public listHandlers: SetupServerCommon['listHandlers']

  #network: NetworkApi<AnyHandler>
  #handlersController: AsyncHandlersController
  #currentHandlersProxy?: ReversibleProxy<HandlersController['currentHandlers']>
  #listenOptions?: Partial<ListenOptions>

  constructor(
    handlers: Array<AnyHandler>,
    interceptors: Array<Interceptor<any>> = [],
  ) {
    this.#handlersController = asyncHandlersController(handlers)

    this.#network = defineNetwork({
      sources: [
        new InterceptorSource({
          interceptors,
        }),
      ],
      handlers,
      handlersController: this.#handlersController,
      onUnhandledFrame: fromLegacyOnUnhandledRequest(() => {
        return this.#listenOptions?.onUnhandledRequest || 'warn'
      }),
    })

    /**
     * @fixme This expects a readonly emitter (subset of methods).
     */
    this.events = this.#network.events as any
    this.use = this.#network.use.bind(this.#network)
    this.resetHandlers = this.#network.resetHandlers.bind(this.#network)
    this.restoreHandlers = this.#network.restoreHandlers.bind(this.#network)
    this.listHandlers = this.#network.listHandlers.bind(this.#network)
  }

  public listen(options?: Partial<ListenOptions>): void {
    this.#listenOptions = options
    this.#network.enable()

    if (options?.remote?.enabled) {
      const remoteRequestHandler = new RemoteRequestHandler({
        port: options.remote.port,
      })

      this.#currentHandlersProxy = reversibleProxy(
        this.#handlersController.currentHandlers,
        {
          apply(target, thisArg, argArray) {
            return [
              remoteRequestHandler,
              ...Reflect.apply(target, thisArg, argArray),
            ]
          },
        },
      )

      this.#handlersController.currentHandlers =
        this.#currentHandlersProxy.proxy
    }
  }

  public boundary<Args extends Array<any>, R>(
    callback: (...args: Args) => R,
  ): (...args: Args) => R {
    return (...args: Args): R => {
      return this.#handlersController.context.run<any, any>(
        {
          initialHandlers: this.#handlersController.currentHandlers(),
          handlers: [],
        },
        callback,
        ...args,
      )
    }
  }

  public close(): void {
    this.#network.disable()
    this.#currentHandlersProxy?.reverse()
  }
}
