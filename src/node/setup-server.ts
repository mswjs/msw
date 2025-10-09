import { type Interceptor } from '@mswjs/interceptors'
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { type AnyHandler } from '~/core/new/handlers-controller'
import { SetupServerCommonApi } from './setup-server-common-api'
import {
  type AsyncHandlersController,
  asyncHandlersController,
} from './async-handler-controller'
import type { SetupServer } from './glossary'

export function setupServer(...handlers: Array<AnyHandler>): SetupServerApi {
  return new SetupServerApi(handlers)
}

export class SetupServerApi
  extends SetupServerCommonApi
  implements SetupServer
{
  protected handlersController: AsyncHandlersController<AnyHandler>

  constructor(
    handlers: Array<AnyHandler>,
    interceptors: Array<Interceptor<any>> = [
      new ClientRequestInterceptor(),
      new XMLHttpRequestInterceptor(),
      new FetchInterceptor(),
      new WebSocketInterceptor(),
    ],
  ) {
    const handlersController = asyncHandlersController(handlers)
    super(interceptors, handlers, handlersController)

    this.handlersController = handlersController
  }

  public listen(): void {
    super.listen()

    /** @todo Check for remote option. */
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
}
