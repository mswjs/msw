import { AsyncLocalStorage } from 'node:async_hooks'
import type { HttpRequestEventMap, Interceptor } from '@mswjs/interceptors'
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { HandlersController } from '~/core/SetupApi'
import type { RequestHandler } from '~/core/handlers/RequestHandler'
import type { ListenOptions, SetupServer } from './glossary'
import type { WebSocketHandler } from '~/core/handlers/WebSocketHandler'
import { SetupServerCommonApi } from './SetupServerCommonApi'
import { RemoteRequestHandler } from '~/core/rpc/handlers/remote-request-handler'

const handlersStorage = new AsyncLocalStorage<RequestHandlersContext>()

type RequestHandlersContext = {
  initialHandlers: Array<RequestHandler | WebSocketHandler>
  handlers: Array<RequestHandler | WebSocketHandler>
}

/**
 * A handlers controller that utilizes `AsyncLocalStorage` in Node.js
 * to prevent the request handlers list from being a shared state
 * across multiple tests.
 */
export class AsyncHandlersController implements HandlersController {
  private storage: AsyncLocalStorage<RequestHandlersContext>
  private rootContext: RequestHandlersContext

  constructor(args: {
    storage: AsyncLocalStorage<RequestHandlersContext>
    initialHandlers: Array<RequestHandler | WebSocketHandler>
  }) {
    this.storage = args.storage
    this.rootContext = {
      initialHandlers: args.initialHandlers,
      handlers: [],
    }
  }

  get context(): RequestHandlersContext {
    const store = this.storage.getStore()

    if (store) {
      return store
    }

    return this.rootContext
  }

  public prepend(runtimeHandlers: Array<RequestHandler | WebSocketHandler>) {
    this.context.handlers.unshift(...runtimeHandlers)
  }

  public reset(nextHandlers: Array<RequestHandler | WebSocketHandler>) {
    const context = this.context
    context.handlers = []
    context.initialHandlers =
      nextHandlers.length > 0 ? nextHandlers : context.initialHandlers
  }

  public currentHandlers(): Array<RequestHandler | WebSocketHandler> {
    const { initialHandlers, handlers } = this.context
    return handlers.concat(initialHandlers)
  }
}

export class SetupServerApi
  extends SetupServerCommonApi
  implements SetupServer
{
  constructor(
    handlers: Array<RequestHandler | WebSocketHandler>,
    interceptors: Array<Interceptor<HttpRequestEventMap>> = [
      new ClientRequestInterceptor(),
      new XMLHttpRequestInterceptor(),
      new FetchInterceptor(),
    ],
  ) {
    super(interceptors, handlers)

    this.handlersController = new AsyncHandlersController({
      storage: handlersStorage,
      initialHandlers: handlers,
    })
  }

  public boundary<Args extends Array<any>, R>(
    callback: (...args: Args) => R,
  ): (...args: Args) => R {
    return (...args: Args): R => {
      return handlersStorage.run<any, any>(
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
    handlersStorage.disable()
  }

  public listen(options?: Partial<ListenOptions>): void {
    super.listen(options)

    // Support the remote interception mode.
    if (this.resolvedOptions.remote?.enabled) {
      const remoteHttpHandler = new RemoteRequestHandler({
        port: this.resolvedOptions.remote.port,
      })

      this.handlersController.currentHandlers = new Proxy(
        this.handlersController.currentHandlers,
        {
          apply(target, thisArg, argArray) {
            return [
              remoteHttpHandler,
              ...Reflect.apply(target, thisArg, argArray),
            ]
          },
        },
      )
    }
  }
}
