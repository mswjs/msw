import * as http from 'http'
import { Emitter } from 'strict-event-emitter'
import { Server as WebSocketServer } from 'socket.io'
import { Socket } from 'socket.io-client'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { RequestHandler, handleRequest, rest } from '~/core'
import {
  SerializedRequest,
  SerializedResponse,
  deserializeRequest,
  deserializeResponse,
  serializeRequest,
  serializeResponse,
} from '~/core/utils/request/serializeUtils'

declare global {
  var syncServer: WebSocketServer | undefined
}

export const SYNC_SERVER_URL = new URL('http://localhost:50222')

export interface SyncServerEventsMap {
  request(
    serializedRequest: SerializedRequest,
    requestId: string,
  ): Promise<void> | void
  response(serializedResponse?: SerializedResponse): Promise<void> | void
}

export async function useRemoteHandlers(
  ...handlers: Array<RequestHandler>
): Promise<void> {
  const ws = await createSyncServer()

  // Remove all the listeners from the persisted WS instance.
  // This ensures that there's no memory leak between hot updates
  // since the code below adds the socket listeners once again.
  ws.removeAllListeners()

  /**
   * @todo Decide if remote handlers expose life-cycle events API.
   */
  const emitter = new Emitter<any>()

  ws.on('connection', (socket) => {
    socket.on('request', async (serializedRequest, requestId) => {
      const request = deserializeRequest(serializedRequest)
      const response = await handleRequest(
        request,
        requestId,
        handlers,
        { onUnhandledRequest() {} },
        emitter,
      )

      socket.emit(
        'response',
        response ? await serializeResponse(response) : undefined,
      )
    })
  })

  process.on('SIGTERM', () => closeSyncServer(ws))
  process.on('SIGINT', () => closeSyncServer(ws))

  return
}

async function createSyncServer(): Promise<
  WebSocketServer<SyncServerEventsMap>
> {
  const existingSyncServer = globalThis.syncServer

  // Reuse the existing WebSocket server reference if it exists.
  // It persists on the global scope between hot updates.
  if (existingSyncServer) {
    return existingSyncServer
  }

  const serverReady = new DeferredPromise<
    WebSocketServer<SyncServerEventsMap>
  >()

  const httpServer = http.createServer()
  const ws = new WebSocketServer<SyncServerEventsMap>(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  httpServer.listen(+SYNC_SERVER_URL.port, SYNC_SERVER_URL.hostname, () => {
    globalThis.syncServer = ws
    serverReady.resolve(ws)
  })

  return serverReady
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

export function syncServerResolver(options: {
  requestId: string
  socketPromise: Promise<Socket<SyncServerEventsMap> | null>
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
