import * as http from 'http'
import { Server as WebSocketServer } from 'socket.io'
import { Emitter } from 'strict-event-emitter'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { RequestHandler, handleRequest } from '~/core'

declare global {
  var syncServer: WebSocketServer | undefined
}

export async function useRemoteHandlers(
  ...handlers: Array<RequestHandler>
): Promise<void> {
  console.log('[useRemoteHandlers] call, creating a server...')

  /**
   * Phase 1: Create a sync WS server.
   */
  const ws = await createSyncServer()

  console.log('[useRemoteHandlers] created a WS server (*)!', typeof ws)

  const emitter = new Emitter<any>()

  /**
   * @todo Need to remove these listeners because hot updates
   * cause them to accumulate, resulting in a memory leak.
   */
  ws.on('connection', (socket) => {
    console.log('[useRemoteHandlers] incoming "connection"', socket.id)

    /**
     * Phase 2: Handle incoming requests from other processes.
     */
    socket.on(
      'request',
      async (requestInit: Record<string, any>, requestId: string) => {
        console.log('[useRemoteHandlers] incoming "request":', requestInit)

        const request = new Request(requestInit.url, requestInit)

        const response = await handleRequest(
          request,
          requestId,
          handlers,
          { onUnhandledRequest() {} },
          emitter,
        )

        console.log('[useRemoteHandlers] outgoing "response":', response)

        if (response) {
          socket.emit('response', {
            status: response.status,
            statusText: response.statusText,
            // headers: Object.fromEntries(response.headers.entries()),
            body: await response.arrayBuffer(),
          })
          return
        }

        socket.emit('response', undefined)
      },
    )
  })

  process.on('SIGTERM', () => closeSyncServer(ws))
  process.on('SIGINT', () => closeSyncServer(ws))

  return
}

async function createSyncServer(): Promise<WebSocketServer> {
  const existingSyncServer = globalThis.syncServer

  if (existingSyncServer) {
    console.log('[useRemoteHandlers] reusing existing sync server')
    return existingSyncServer
  }

  const serverReady = new DeferredPromise<WebSocketServer>()

  const httpServer = http.createServer()
  const ws =
    globalThis.syncServer ||
    new WebSocketServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    })

  // Assign the server instance on global scope
  // so it could survive hot updates.
  globalThis.syncServer = ws

  httpServer.listen(50222, 'localhost', () => {
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
