import * as http from 'node:http'
import { AsyncLocalStorage } from 'node:async_hooks'
import { invariant } from 'outvariant'
import { Server as WebSocketServer } from 'socket.io'
import { Socket, io } from 'socket.io-client'
import { Emitter } from 'strict-event-emitter'
import { createRequestId } from '@mswjs/interceptors'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { SetupApi } from '~/core/SetupApi'
import type { RequestHandler } from '~/core/handlers/RequestHandler'
import type { WebSocketHandler } from '~/core/handlers/WebSocketHandler'
import { handleRequest } from '~/core/utils/handleRequest'
import { isHandlerKind } from '~/core/utils/internal/isHandlerKind'
import {
  type SerializedRequest,
  type SerializedResponse,
  deserializeRequest,
  serializeResponse,
} from '~/core/utils/request/serializeUtils'
import type {
  LifeCycleEventEmitter,
  LifeCycleEventsMap,
} from '~/core/sharedOptions'
import { devUtils } from '~/core/utils/internal/devUtils'
import {
  type SerializedLifeCycleEventsMap,
  deserializeEventPayload,
} from '~/core/utils/internal/emitterUtils'
import { AsyncHandlersController } from './SetupServerApi'

/**
 * @todo Make the remote port random.
 * Consider getting it from the environment variable.
 */
export const MSW_REMOTE_SERVER_PORT = 56957

interface RemoteServerBoundaryContext {
  contextId: string
  initialHandlers: Array<RequestHandler | WebSocketHandler>
  handlers: Array<RequestHandler | WebSocketHandler>
}

const handlersStorage = new AsyncLocalStorage<RemoteServerBoundaryContext>()

const kSyncServer = Symbol('kSyncServer')
type SyncServerType = WebSocketServer<SyncServerEventsMap> | undefined

/**
 * Enables API mocking in a remote Node.js process.
 */
export function setupRemoteServer(
  ...handlers: Array<RequestHandler | WebSocketHandler>
): SetupRemoteServerApi {
  return new SetupRemoteServerApi(handlers)
}

export interface SetupRemoteServerListenOptions {
  /**
   * Custom port number to synchronize this this `setupRemoteServer`
   * with the regular `setupServer`.
   * @default 56957
   */
  port?: number
}

export interface SetupRemoteServer {
  events: LifeCycleEventEmitter<LifeCycleEventsMap>
  listen: (options: SetupRemoteServerListenOptions) => Promise<void>
  boundary: <Args extends Array<any>, R>(
    callback: (...args: Args) => R,
  ) => (...args: Args) => R
  get contextId(): string
  close: () => Promise<void>
}

export interface SyncServerEventsMap {
  request: (args: {
    serializedRequest: SerializedRequest
    requestId: string
    contextId?: string
  }) => Promise<void> | void

  response: (args: {
    serializedResponse?: SerializedResponse
  }) => Promise<void> | void

  lifeCycleEventForward: <Type extends keyof SerializedLifeCycleEventsMap>(
    type: Type,
    args: SerializedLifeCycleEventsMap[Type],
  ) => void
}

export class SetupRemoteServerApi
  extends SetupApi<LifeCycleEventsMap>
  implements SetupRemoteServer
{
  protected executionContexts: Map<string, () => RemoteServerBoundaryContext>

  constructor(handlers: Array<RequestHandler | WebSocketHandler>) {
    super(...handlers)

    this.handlersController = new AsyncHandlersController({
      storage: handlersStorage,
      initialHandlers: handlers,
    })

    this.executionContexts = new Map()
  }

  get contextId(): string {
    const context = handlersStorage.getStore()

    invariant(
      context != null,
      'Failed to get "contextId" on "SetupRemoteServerApi": no context found. Did you forget to wrap this closure in `remote.boundary()`?',
    )

    return context.contextId
  }

  public async listen(
    options: SetupRemoteServerListenOptions = {},
  ): Promise<void> {
    const port = options.port || MSW_REMOTE_SERVER_PORT

    invariant(
      typeof port === 'number',
      'Failed to initialize remote server: expected the "port" option to be a valid port number but got "%s". Make sure it is the same port number you provide as the "remotePort" option to "server.listen()" in your application.',
      port,
    )

    const dummyEmitter = new Emitter<LifeCycleEventsMap>()
    const wssUrl = createWebSocketServerUrl(port)
    const server = await createSyncServer(wssUrl)

    server.removeAllListeners()

    process
      .once('SIGTERM', () => closeSyncServer(server))
      .once('SIGINT', () => closeSyncServer(server))

    server.on('connection', async (socket) => {
      socket.on(
        'request',
        async ({ requestId, serializedRequest, contextId }) => {
          const request = deserializeRequest(serializedRequest)

          // By default, get the handlers from the current context.
          let allHandlers = this.handlersController.currentHandlers()

          // If the request event has a context associated with it,
          // look up the current state of that context to get the handlers.
          if (contextId) {
            invariant(
              this.executionContexts.has(contextId),
              'Failed to handle a remote request "%s %s": no context found by id "%s"',
              request.method,
              request.url,
              contextId,
            )

            const getContext = this.executionContexts.get(contextId)

            invariant(
              getContext != null,
              'Failed to handle a remote request "%s %s": the context by id "%s" is empty',
              request.method,
              request.url,
              contextId,
            )

            const context = getContext()
            allHandlers = context.handlers
          }

          const response = await handleRequest(
            request,
            requestId,
            allHandlers.filter(isHandlerKind('RequestHandler')),
            /**
             * @todo Support resolve options from the `.listen()` call.
             */
            { onUnhandledRequest() {} },
            dummyEmitter,
          )

          socket.emit('response', {
            serializedResponse: response
              ? await serializeResponse(response)
              : undefined,
          })
        },
      )

      socket.on('lifeCycleEventForward', async (type, args) => {
        const deserializedArgs = await deserializeEventPayload(args)
        this.emitter.emit(type, deserializedArgs as any)
      })
    })
  }

  public boundary<Args extends Array<any>, R>(
    callback: (...args: Args) => R,
  ): (...args: Args) => R {
    const contextId = createRequestId()

    return (...args: Args): R => {
      const context: RemoteServerBoundaryContext = {
        contextId,
        initialHandlers: this.handlersController.currentHandlers(),
        handlers: [],
      }

      this.executionContexts.set(contextId, () => context)
      return handlersStorage.run(context, callback, ...args)
    }
  }

  public async close(): Promise<void> {
    this.executionContexts.clear()
    handlersStorage.disable()

    const syncServer = Reflect.get(globalThis, kSyncServer) as SyncServerType

    invariant(
      syncServer,
      devUtils.formatMessage(
        'Failed to close a remote server: no server is running. Did you forget to call and await ".listen()"?',
      ),
    )

    await closeSyncServer(syncServer)
  }
}

/**
 * Creates an internal WebSocket sync server.
 */
async function createSyncServer(
  url: URL,
): Promise<WebSocketServer<SyncServerEventsMap>> {
  const syncServer = Reflect.get(globalThis, kSyncServer) as SyncServerType

  // Reuse the existing WebSocket server reference if it exists.
  // It persists on the global scope between hot updates.
  if (syncServer) {
    return syncServer
  }

  const serverReadyPromise = new DeferredPromise<
    WebSocketServer<SyncServerEventsMap>
  >()

  const httpServer = http.createServer()
  const ws = new WebSocketServer<SyncServerEventsMap>(httpServer, {
    transports: ['websocket'],
    cors: {
      /**
       * @todo Set the default `origin` to localhost for security reasons.
       * Allow overridding the default origin through the `setupRemoteServer` API.
       */
      origin: '*',
      methods: ['HEAD', 'GET', 'POST'],
    },
  })

  httpServer.listen(+url.port, url.hostname, () => {
    serverReadyPromise.resolve(ws)
  })

  httpServer.on('error', (error) => {
    serverReadyPromise.reject(error)
  })

  return serverReadyPromise.then((ws) => {
    Object.defineProperty(globalThis, kSyncServer, {
      value: ws,
    })
    return ws
  })
}

async function closeSyncServer(server: WebSocketServer): Promise<void> {
  const httpServer = Reflect.get(server, 'httpServer') as
    | http.Server
    | undefined

  /**
   * @note `socket.io` automatically closes the server if no clients
   * have responded to the ping request. Check if the underlying HTTP
   * server is still running before trying to close the WebSocket server.
   * Unfortunately, there's no means to check if the server is running
   * on the WebSocket server instance.
   */
  if (!httpServer?.listening) {
    return Promise.resolve()
  }

  const serverClosePromise = new DeferredPromise<void>()

  server.close((error) => {
    if (error) {
      return serverClosePromise.reject(error)
    }
    serverClosePromise.resolve()
  })

  await serverClosePromise.then(() => {
    Reflect.deleteProperty(globalThis, kSyncServer)
  })
}

function createWebSocketServerUrl(port: number): URL {
  const url = new URL('http://localhost')
  url.port = port.toString()
  return url
}

/**
 * Creates a WebSocket client connected to the internal
 * WebSocket sync server of MSW.
 */
export async function createSyncClient(args: { port: number }) {
  const connectionPromise = new DeferredPromise<Socket<SyncServerEventsMap>>()
  const url = createWebSocketServerUrl(args.port)
  const socket = io(url.href, {
    transports: ['websocket'],
    // Keep a low timeout and no retry logic because
    // the user is expected to enable remote interception
    // before the actual application with "setupServer".
    timeout: 500,
    reconnection: true,
    extraHeaders: {
      // Bypass the internal WebSocket connection requests
      // to exclude them from the request lookup altogether.
      // This prevents MSW from treating these requests as unhandled.
      accept: 'msw/passthrough',
    },
  })

  socket.on('connect', () => {
    connectionPromise.resolve(socket)
  })

  socket.io.once('error', (error) => {
    connectionPromise.reject(error)
  })

  return connectionPromise
}
