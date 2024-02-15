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
} from '~/core'
import {
  SerializedRequest,
  SerializedResponse,
  deserializeRequest,
  serializeResponse,
} from '~/core/utils/request/serializeUtils'
import { LifeCycleEventEmitter } from '~/core/sharedOptions'
import { devUtils } from '~/core/utils/internal/devUtils'
import {
  SerializedLifeCycleEventsMap,
  deserializeEventPayload,
} from '~/core/utils/internal/emitterUtils'

const syncServerSymbol = Symbol('mswSyncServer')

/**
 * Enables API mocking in a remote Node.js process.
 */
export function setupRemoteServer(...handlers: Array<RequestHandler>) {
  return new SetupRemoteServerApi(...handlers)
}

export interface SetupRemoteServerListenOptions {
  port: number
}

export interface SetupRemoteServer {
  events: LifeCycleEventEmitter<LifeCycleEventsMap>
  listen(options: SetupRemoteServerListenOptions): Promise<void>
  close(): Promise<void>
}

export interface SyncServerEventsMap {
  request(args: {
    serializedRequest: SerializedRequest
    requestId: string
  }): Promise<void> | void
  response(serializedResponse?: SerializedResponse): Promise<void> | void
  lifeCycleEventForward<EventName extends keyof SerializedLifeCycleEventsMap>(
    eventName: EventName,
    args: SerializedLifeCycleEventsMap[EventName],
  ): void
}

interface GlobalWith extends Global {
  [syncServerSymbol]: WebSocketServer<SyncServerEventsMap> | undefined
}
declare var globalThis: GlobalWith

export class SetupRemoteServerApi
  extends SetupApi<LifeCycleEventsMap>
  implements SetupRemoteServer
{
  constructor(...handlers: Array<RequestHandler>) {
    super(...handlers)
  }

  public async listen(options: SetupRemoteServerListenOptions): Promise<void> {
    const placeholderEmitter = new Emitter<LifeCycleEventsMap>()

    const url = createWebSocketServerUrl(options.port)
    const server = await createSyncServer(url)

    server.removeAllListeners()

    console.log('WS server created!')

    process
      .on('SIGTERM', () => closeSyncServer(server))
      .on('SIGINT', () => closeSyncServer(server))

    server.on('connection', (socket) => {
      socket.on('request', async ({ requestId, serializedRequest }) => {
        const request = deserializeRequest(serializedRequest)
        const response = await handleRequest(
          request,
          requestId,
          this.currentHandlers,
          /**
           * @todo Support resolve options from the `.listen()` call.
           */
          { onUnhandledRequest() {} },
          placeholderEmitter,
        )

        socket.emit(
          'response',
          response ? await serializeResponse(response) : undefined,
        )
      })

      socket.on('lifeCycleEventForward', async (eventName, args) => {
        const deserializedArgs = await deserializeEventPayload(args)
        this.emitter.emit(eventName, deserializedArgs as any)
      })
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
    const { [syncServerSymbol]: syncServer } = globalThis

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
  const existingSyncServer = globalThis[syncServerSymbol]

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
  ws.listen(httpServer)

  httpServer.listen(+url.port, url.hostname, () => {
    globalThis[syncServerSymbol] = ws
    serverReadyPromise.resolve(ws)
  })

  httpServer.on('error', (error: Error | NodeJS.ErrnoException) => {
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

    Reflect.deleteProperty(globalThis, syncServerSymbol)
    serverClosePromise.resolve()
  })

  return serverClosePromise
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
export async function createSyncClient(port: number) {
  const connectionPromise = new DeferredPromise<
    Socket<SyncServerEventsMap> | undefined
  >()
  const url = createWebSocketServerUrl(port)
  const socket = io(url.href, {
    // Keep a low timeout and no reconnection logic because
    // the user is expected to enable remote interception
    // before the actual application with "setupServer" uses
    // this function to try and connect to a potentially running server.
    timeout: 200,
    reconnection: false,
    extraHeaders: {
      // Mark all Socket.io requests with an internal header
      // so they are always bypassed in the remote request handler.
      // This has no effect on the user's traffic.
      'x-msw-request-type': 'internal-request',
    },
  })

  socket.on('connect', () => {
    console.log('[msw] setupRemoteServer, CONNECTION!')
    connectionPromise.resolve(socket)
  })

  socket.io.on('error', () => {
    connectionPromise.resolve(undefined)
  })

  return connectionPromise
}
