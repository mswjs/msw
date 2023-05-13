import * as http from 'http'
import { Server as WebSocketServer } from 'socket.io'
import { Emitter } from 'strict-event-emitter'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { RequestHandler, handleRequest } from '~/core'
import {
  SerializedRequest,
  deserializeRequest,
  serializeResponse,
} from '~/core/utils/request/serializeUtils'

declare global {
  var syncServer: WebSocketServer | undefined
}

export async function useRemoteHandlers(
  ...handlers: Array<RequestHandler>
): Promise<void> {
  const ws = await createSyncServer()

  // Remove all the listeners from the persisted WS instance.
  // This ensures that there's no memory leak between hot updates
  // since the code below adds the socket listeners once again.
  ws.removeAllListeners()

  const emitter = new Emitter<any>()

  ws.on('connection', (socket) => {
    socket.on(
      'request',
      async (serializedRequest: SerializedRequest, requestId: string) => {
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
      },
    )
  })

  process.on('SIGTERM', () => closeSyncServer(ws))
  process.on('SIGINT', () => closeSyncServer(ws))

  return
}

async function createSyncServer(): Promise<WebSocketServer> {
  const existingSyncServer = globalThis.syncServer

  // Reuse the existing WebSocket server reference if it exists.
  // It persists on the global scope between hot updates.
  if (existingSyncServer) {
    return existingSyncServer
  }

  const serverReady = new DeferredPromise<WebSocketServer>()

  const httpServer = http.createServer()
  const ws = new WebSocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  httpServer.listen(50222, 'localhost', () => {
    globalThis.syncServer = ws
    serverReady.resolve(ws)
  })

  return serverReady
}

async function closeSyncServer(server: WebSocketServer): Promise<void> {
  console.log('[useRemoteHandlers] closing sync server...')

  const serverClosePromise = new DeferredPromise<void>()

  server.close((error) => {
    if (error) {
      console.log('[useRemoteHandlers] error closing sync server:', error)
      return serverClosePromise.reject(error)
    }

    console.log('[useRemoteHandlers] closed sync server!')
    globalThis.syncServer = undefined
    serverClosePromise.resolve()
  })

  return serverClosePromise
}
