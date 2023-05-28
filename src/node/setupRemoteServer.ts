import * as http from 'http'
import { invariant } from 'outvariant'
import { Server as WebSocketServer } from 'socket.io'
import { Socket, io } from 'socket.io-client'
import { Emitter } from 'strict-event-emitter'
import { DeferredPromise } from '@open-draft/deferred-promise'
import {
  LifeCycleEventsMap,
  RequestHandler,
  SetupApi,
  handleRequest,
  rest,
} from '~/core'
import {
  SerializedRequest,
  SerializedResponse,
  deserializeRequest,
  deserializeResponse,
  serializeRequest,
  serializeResponse,
} from '~/core/utils/request/serializeUtils'
import { LifeCycleEventEmitter } from '~/core/sharedOptions'
import { devUtils } from '~/core/utils/internal/devUtils'

const SYNC_SERVER_PORT = +(process.env.MSW_INTERNAL_WEBSOCKET_PORT || 50222)
export const SYNC_SERVER_URL = new URL(`http://localhost:${SYNC_SERVER_PORT}`)

/**
 * Enables API mocking in a remote Node.js process.
 */
export function setupRemoteServer(...handlers: Array<RequestHandler>) {
  return new SetupRemoteServerApi(...handlers)
}

export interface SetupRemoteServer {
  listen(): Promise<void>
  close(): Promise<void>
  events: LifeCycleEventEmitter<LifeCycleEventsMap>
}

export interface SyncServerEventsMap {
  request(
    serializedRequest: SerializedRequest,
    requestId: string,
  ): Promise<void> | void
  response(serializedResponse?: SerializedResponse): Promise<void> | void
}

declare global {
  var syncServer: WebSocketServer<SyncServerEventsMap> | undefined
}

export class SetupRemoteServerApi
  extends SetupApi<LifeCycleEventsMap>
  implements SetupRemoteServer
{
  protected emitter: Emitter<LifeCycleEventsMap>

  constructor(...handlers: Array<RequestHandler>) {
    super(...handlers)

    this.emitter = new Emitter()
  }

  public async listen(): Promise<void> {
    const server = await createSyncServer()
    server.removeAllListeners()

    process
      .on('SIGTERM', () => closeSyncServer(server))
      .on('SIGINT', () => closeSyncServer(server))

    server.on('connection', (socket) => {
      socket.on('request', async (serializedRequest, requestId) => {
        const request = deserializeRequest(serializedRequest)
        const response = await handleRequest(
          request,
          requestId,
          this.currentHandlers,
          { onUnhandledRequest() {} },
          this.emitter,
        )

        socket.emit(
          'response',
          response ? await serializeResponse(response) : undefined,
        )
      })

      /**
       * @todo Have the socket signal back whichever response
       * was used for whichever request. Include request ID
       * and somehow let this API know whether the response was
       * the mocked one or note.
       */
      // socket.on('response', (serializedResponse) => {
      //   const response = deserializeResponse(serializedResponse)
      //   this.emitter.emit('response', response, requestId)
      // })
    })
  }

  public printHandlers() {
    const handlers = this.listHandlers()

    handlers.forEach((handler) => {
      const { header, callFrame } = handler.info

      const pragma = handler.info.hasOwnProperty('operationType')
        ? '[graphql]'
        : '[rest]'

      console.log(`\
${`${pragma} ${header}`}
  Declaration: ${callFrame}
`)
    })
  }

  public async close(): Promise<void> {
    const { syncServer } = globalThis

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
 * A request handler that resolves any outgoing HTTP requests
 * against any established `setupRemoteServer()` WebSocket instance.
 */
export function createRemoteServerResolver(options: {
  requestId: string
  socketPromise: Promise<Socket<SyncServerEventsMap> | undefined>
}) {
  return rest.all('*', async ({ request }) => {
    // Bypass the socket.io HTTP handshake so the sync WS server connection
    // doesn't hang forever. Check this as the first thing to unblock the handling.
    if (request.headers.get('x-msw-request-type') === 'internal-request') {
      return
    }

    const socket = await options.socketPromise

    // If the sync server hasn't been started or failed to connect,
    // skip this request handler altogether, it has no effect.
    if (socket == null) {
      return
    }

    socket.emit('request', await serializeRequest(request), options.requestId)

    const responsePromise = new DeferredPromise<Response | undefined>()

    /**
     * @todo Handle timeouts.
     * @todo Handle socket errors.
     */
    socket.on('response', (serializedResponse) => {
      responsePromise.resolve(
        serializedResponse
          ? deserializeResponse(serializedResponse)
          : undefined,
      )
    })

    return await responsePromise
  })
}

/**
 * Creates an internal WebSocket sync server.
 */
async function createSyncServer(): Promise<
  WebSocketServer<SyncServerEventsMap>
> {
  const existingSyncServer = globalThis.syncServer

  // Reuse the existing WebSocket server reference if it exists.
  // It persists on the global scope between hot updates.
  if (existingSyncServer) {
    return existingSyncServer
  }

  const serverReadyPromise = new DeferredPromise<
    WebSocketServer<SyncServerEventsMap>
  >()

  const httpServer = http.createServer()
  const ws = new WebSocketServer<SyncServerEventsMap>(httpServer, {
    cors: {
      origin: '*',
      methods: ['HEAD', 'GET', 'POST'],
    },
  })

  httpServer.listen(+SYNC_SERVER_URL.port, SYNC_SERVER_URL.hostname, () => {
    globalThis.syncServer = ws
    serverReadyPromise.resolve(ws)
  })

  httpServer.on('error', (error) => {
    serverReadyPromise.reject(error)
  })

  return serverReadyPromise
}

async function closeSyncServer(server: WebSocketServer): Promise<void> {
  const serverClosePromise = new DeferredPromise<void>()

  server.close((error) => {
    if (error) {
      return serverClosePromise.reject(error)
    }

    globalThis.syncServer = undefined
    serverClosePromise.resolve()
  })

  return serverClosePromise
}

/**
 * Creates a WebSocket client connected to the internal
 * WebSocket sync server of MSW.
 */
export async function createSyncClient(): Promise<
  Socket<SyncServerEventsMap> | undefined
> {
  const connectionPromise = new DeferredPromise<
    Socket<SyncServerEventsMap> | undefined
  >()

  const socket = io(SYNC_SERVER_URL.href, {
    // Keep a low timeout and no reconnection logic because
    // the user is expected to enable remote interception
    // before the actual application with "setupServer" uses
    // this function to try and connect to a potentially running server.
    timeout: 200,
    reconnection: false,
    extraHeaders: {
      // Mark all Socket.io requests with an internal header
      // so they are always bypassed in the remote request handler.
      'x-msw-request-type': 'internal-request',
    },
  })

  socket.on('connect', () => {
    connectionPromise.resolve(socket)
  })

  socket.io.on('error', () => {
    connectionPromise.resolve(undefined)
  })

  return connectionPromise
}
