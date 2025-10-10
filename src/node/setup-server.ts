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
import { SetupServerCommonApi } from './setup-server-common'
import {
  type AsyncHandlersController,
  asyncHandlersController,
} from './async-handler-controller'
import type { ListenOptions, SetupServer } from './glossary'
import { HandlersController } from '~/core/SetupApi'

/**
 * Enables request interception in Node.js with the given request handlers.
 *
 * @see {@link https://mswjs.io/docs/api/setup-server `setupServer()` API reference}
 */
export function setupServer(...handlers: Array<AnyHandler>): SetupServerApi {
  return new SetupServerApi(handlers)
}

export class SetupServerApi
  extends SetupServerCommonApi
  implements SetupServer
{
  #currentHandlersProxy?: ReversibleProxy<HandlersController['currentHandlers']>

  protected handlersController: AsyncHandlersController<AnyHandler>

  constructor(
    handlers: Array<AnyHandler>,
    interceptors: Array<Interceptor<any>> = [
      new ClientRequestInterceptor(),
      new XMLHttpRequestInterceptor(),
      new FetchInterceptor(),
      new WebSocketInterceptor() as any,
    ],
  ) {
    const handlersController = asyncHandlersController(handlers)
    super(interceptors, handlers, handlersController)

    this.handlersController = handlersController
  }

  public listen(options: Partial<ListenOptions>): void {
    super.listen()

    if (options.remote?.enabled) {
      const remoteRequestHandler = new RemoteRequestHandler({
        port: options.remote.port,
      })

      this.#currentHandlersProxy = reversibleProxy(
        this.handlersController.currentHandlers,
        {
          apply(target, thisArg, argArray) {
            return [
              remoteRequestHandler,
              ...Reflect.apply(target, thisArg, argArray),
            ]
          },
        },
      )

      this.handlersController.currentHandlers = this.#currentHandlersProxy.proxy
    }
  }

  public boundary<Args extends Array<any>, R>(
    callback: (...args: Args) => R,
  ): (...args: Args) => R {
    return (...args: Args): R => {
      return this.handlersController.context.run<any, any>(
        {
          initialHandlers: this.handlersController.currentHandlers(),
          handlers: [],
        },
        callback,
        ...args,
      )
    }
  }

  public close(): void {
    super.close()
    this.#currentHandlersProxy?.reverse()
  }
}
