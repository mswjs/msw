import { AsyncLocalStorage } from 'node:async_hooks'
import { invariant } from 'outvariant'
import { Socket } from 'socket.io-client'
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { HandlersController } from '~/core/SetupApi'
import type { RequestHandler } from '~/core/handlers/RequestHandler'
import type { ListenOptions, SetupServer } from './glossary'
import type { WebSocketHandler } from '~/core/handlers/WebSocketHandler'
import { SetupServerCommonApi } from './SetupServerCommonApi'
import {
  MSW_REMOTE_SERVER_PORT,
  SyncServerEventsMap,
  createSyncClient,
} from './setupRemoteServer'
import { RemoteRequestHandler } from '~/core/handlers/RemoteRequestHandler'
import {
  onAnyEvent,
  serializeEventPayload,
} from '~/core/utils/internal/emitterUtils'
import { shouldBypassRequest } from '~/core/utils/internal/requestUtils'
import { remoteContext } from './remoteContext'

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
  private socketPromise?: Promise<Socket<SyncServerEventsMap>>

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
      console.log(
        'MSW REMOTE MODE OK! context:',
        process.env[remoteContext.variableName],
      )

      const remotePort =
        typeof this.resolvedOptions.remote === 'object'
          ? this.resolvedOptions.remote.port || MSW_REMOTE_SERVER_PORT
          : MSW_REMOTE_SERVER_PORT

      invariant(
        typeof remotePort === 'number',
        'Failed to enable request interception: expected the "remotePort" option to be a valid port number, but got "%s". Make sure it is the same port number you provide as the "port" option to "remote.listen()" in your tests.',
        remotePort,
      )

      // Create the WebSocket sync client immediately when starting the interception.
      this.socketPromise = createSyncClient({
        port: remotePort,
      })

      // Once the sync server connection is established, prepend the
      // remote request handler to be the first for this process.
      // This way, the remote process' handlers take priority.
      this.socketPromise.then((socket) => {
        this.handlersController.currentHandlers = new Proxy(
          this.handlersController.currentHandlers,
          {
            apply: (target, thisArg, args) => {
              console.log('.currentHandlers()...')

              return Array.prototype.concat(
                new RemoteRequestHandler({
                  socket,
                  // Get the remote boundary context ID from the environment.
                  // This way, the user doesn't have to explicitly drill it here.
                  contextId: process.env[remoteContext.variableName],
                }),
                Reflect.apply(target, thisArg, args),
              )
            },
          },
        )

        return socket
      })

      this.beforeRequest = async ({ request }) => {
        /**
         * @todo This technically shouldn't trigger but it does.
         */
        if (request.url.includes('/socket.io/')) {
          return
        }

        // Before the first request gets handled, await the sync server connection.
        // This way we ensure that all the requests go through the `RemoteRequestHandler`.
        await Promise.race([
          this.socketPromise,
          // Don't let the requests hang for long if the socket promise fails to resolve.
          new Promise((resolve) => {
            setTimeout(resolve, 1000)
          }),
        ])
      }

      // Forward all life-cycle events from this process to the remote.
      this.forwardLifeCycleEvents()
    }
  }

  private forwardLifeCycleEvents() {
    onAnyEvent(this.emitter, async (type, listenerArgs) => {
      const socket = await this.socketPromise

      if (socket && !shouldBypassRequest(listenerArgs.request)) {
        socket.emit(
          'lifeCycleEventForward',
          /**
           * @todo Annotating serialized/desirialized mirror channels is tough.
           */
          type,
          (await serializeEventPayload(listenerArgs)) as any,
        )
      }
    })
  }
}
