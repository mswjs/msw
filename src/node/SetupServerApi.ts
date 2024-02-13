import { AsyncLocalStorage } from 'node:async_hooks'
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { HandlersController } from '~/core/SetupApi'
import type { RequestHandler } from '~/core/handlers/RequestHandler'
import type { SetupServer } from './glossary'
import { SetupServerCommonApi } from './SetupServerCommonApi'

const store = new AsyncLocalStorage<RequestHandlersContext>()

type RequestHandlersContext = {
  initialHandlers: Array<RequestHandler>
  handlers: Array<RequestHandler>
}

/**
 * A handlers controller that utilizes `AsyncLocalStorage` in Node.js
 * to prevent the request handlers list from being a shared state
 * across mutliple tests.
 */
class AsyncHandlersController implements HandlersController {
  private rootContext: RequestHandlersContext

  constructor(initialHandlers: Array<RequestHandler>) {
    this.rootContext = { initialHandlers, handlers: [] }
  }

  get context(): RequestHandlersContext {
    return store.getStore() || this.rootContext
  }

  public prepend(runtimeHandlers: Array<RequestHandler>) {
    this.context.handlers.unshift(...runtimeHandlers)
  }

  public reset(nextHandlers: Array<RequestHandler>) {
    const context = this.context
    context.handlers = []
    context.initialHandlers =
      nextHandlers.length > 0 ? nextHandlers : context.initialHandlers
  }

  public currentHandlers(): Array<RequestHandler> {
    const { initialHandlers, handlers } = this.context
    return handlers.concat(initialHandlers)
  }
}

export class SetupServerApi
  extends SetupServerCommonApi
  implements SetupServer
{
  constructor(handlers: Array<RequestHandler>) {
    super(
      [ClientRequestInterceptor, XMLHttpRequestInterceptor, FetchInterceptor],
      handlers,
    )

    this.handlersController = new AsyncHandlersController(handlers)
  }

  public boundary<Fn extends (...args: Array<any>) => unknown>(
    callback: Fn,
  ): (...args: Parameters<Fn>) => ReturnType<Fn> {
    return (...args: Parameters<Fn>): ReturnType<Fn> => {
      return store.run<any, any>(
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
    store.disable()
  }
}
