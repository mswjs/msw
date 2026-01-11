import { Interceptor } from '@mswjs/interceptors'
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket'
import { SetupServer } from './glossary'
import { type AnyHandler } from '~/core/new/handlers-controller'
import { AsyncHandlersController } from './async-handlers-controller'
import { SetupServerCommonApi } from './setup-server-common'

/**
 * Enables request interception in Node.js with the given request handlers.
 * @see {@link https://mswjs.io/docs/api/setup-server `setupServer()` API reference}
 */
export function setupServer(...handlers: Array<AnyHandler>): SetupServerApi {
  return new SetupServerApi(handlers, [
    new ClientRequestInterceptor(),
    new XMLHttpRequestInterceptor(),
    new FetchInterceptor(),
    new WebSocketInterceptor(),
  ])
}

export class SetupServerApi
  extends SetupServerCommonApi
  implements SetupServer
{
  #handlersController: AsyncHandlersController

  constructor(
    handlers: Array<AnyHandler>,
    interceptors: Array<Interceptor<any>>,
  ) {
    const controller = new AsyncHandlersController(handlers)
    super(interceptors, handlers, controller)

    this.#handlersController = controller
  }

  public boundary<Args extends Array<any>, ReturnType>(
    callback: (...args: Args) => ReturnType,
  ): (...args: Args) => ReturnType {
    return (...args: Args): ReturnType => {
      return this.#handlersController.context.run<any, any>(
        {
          initialHandlers: this.#handlersController.currentHandlers,
          handlers: [],
        },
        callback,
        ...args,
      )
    }
  }
}
