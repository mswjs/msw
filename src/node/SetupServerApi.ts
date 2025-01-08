import { AsyncLocalStorage } from 'node:async_hooks'
import { invariant } from 'outvariant'
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { HandlersController } from '~/core/SetupApi'
import type { RequestHandler } from '~/core/handlers/RequestHandler'
import type { ListenOptions, SetupServer } from './glossary'
import type { WebSocketHandler } from '~/core/handlers/WebSocketHandler'
import { SetupServerCommonApi } from './SetupServerCommonApi'
import { RemoteClient } from './setupRemoteServer'
import { RemoteRequestHandler } from '~/core/handlers/RemoteRequestHandler'
import { shouldBypassRequest } from '~/core/utils/internal/requestUtils'
import { getRemoteContextFromEnvironment } from './remoteContext'
import { LifeCycleEventsMap } from '~/core/sharedOptions'
import { devUtils } from '~/core/utils/internal/devUtils'

const handlersStorage = new AsyncLocalStorage<RequestHandlersContext>()

type RequestHandlersContext = {
  initialHandlers: Array<RequestHandler | WebSocketHandler>
  handlers: Array<RequestHandler | WebSocketHandler>
}

/**
 * A handlers controller that utilizes `AsyncLocalStorage` in Node.js
 * to prevent the request handlers list from being a shared state
 * across mutliple tests.
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
  protected remoteClient?: RemoteClient

  constructor(handlers: Array<RequestHandler | WebSocketHandler>) {
    super(
      [ClientRequestInterceptor, XMLHttpRequestInterceptor, FetchInterceptor],
      handlers,
    )

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

    // If the "remotePort" option has been provided to the server,
    // run it in a special "remote" mode. That mode ensures that
    // an extraneous Node.js process can affect this process' traffic.
    if (this.resolvedOptions.remote?.enabled) {
      // Get the remote context from the environment since `server.listen()`
      // is called in a different process and cannot be wrapped in `remote.boundary()`.
      const remoteContext = getRemoteContextFromEnvironment()
      const remoteClient = new RemoteClient(remoteContext.serverUrl)
      this.remoteClient = remoteClient

      // Connect to the remote server early.
      const remoteConnectionPromise = remoteClient.connect().then(
        () => {
          // Forward the life-cycle events from this process to the remote.
          this.forwardLifeCycleEventsToRemote()

          this.handlersController.currentHandlers = new Proxy(
            this.handlersController.currentHandlers,
            {
              apply: (target, thisArg, args) => {
                return Array.prototype.concat(
                  new RemoteRequestHandler({
                    remoteClient,
                    // Get the remote boundary context ID from the environment.
                    // This way, the user doesn't have to explicitly drill it here.
                    boundaryId: remoteContext.boundary.id,
                  }),
                  Reflect.apply(target, thisArg, args),
                )
              },
            },
          )
        },
        () => {
          devUtils.error(
            'Failed to enable remote mode: could not connect to the remote server at "%s"',
            remoteContext.serverUrl,
          )
        },
      )

      this.beforeRequest = async ({ request }) => {
        if (shouldBypassRequest(request)) {
          return
        }

        // Once the sync server connection is established, prepend the
        // remote request handler to be the first for this process.
        // This way, the remote process' handlers take priority.
        await remoteConnectionPromise
      }
    }
  }

  private forwardLifeCycleEventsToRemote() {
    const { remoteClient } = this

    invariant(
      remoteClient,
      'Failed to initiate life-cycle events forwarding to the remote: remote client not found. This is likely an issue with MSW. Please report it on GitHub.',
    )

    const events: Array<keyof LifeCycleEventsMap> = [
      'request:start',
      'request:match',
      'request:unhandled',
      'request:end',
      'response:bypass',
      'response:mocked',
      'unhandledException',
    ]

    for (const event of events) {
      this.emitter.on(event, (args) => {
        if (
          !shouldBypassRequest(args.request) &&
          !args.request.headers.get('accept')?.includes('msw/internal')
        ) {
          remoteClient.handleLifeCycleEvent({
            type: event,
            args,
          })
        }
      })
    }
  }
}
