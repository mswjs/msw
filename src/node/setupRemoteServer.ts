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
import { deserializeEventPayload } from '~/core/utils/internal/emitterUtils'

const SYNC_SERVER_DEFAULT_PORT = 50222
const SYNC_SERVER_ENV_VARIABLE_NAME = 'MSW_INTERNAL_WEBSOCKET_PORT'
const SYNC_SERVER_PORT =
  Number.parseInt(process.env[SYNC_SERVER_ENV_VARIABLE_NAME] || '') ||
  SYNC_SERVER_DEFAULT_PORT

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

export type SerializedLifeCycleEventsMap = {
  'request:start': [request: SerializedRequest, requestId: string]
  'request:match': [request: SerializedRequest, requestId: string]
  'request:unhandled': [request: SerializedRequest, requestId: string]
  'request:end': [request: SerializedRequest, requestId: string]
  'response:mocked': [
    response: SerializedResponse,
    request: SerializedRequest,
    requestId: string,
  ]
  'response:bypass': [
    response: SerializedResponse,
    request: SerializedRequest,
    requestId: string,
  ]
  unhandledException: [
    error: Error,
    request: SerializedRequest,
    requestId: string,
  ]
}

export interface SyncServerEventsMap {
  request(
    serializedRequest: SerializedRequest,
    requestId: string,
  ): Promise<void> | void
  response(serializedResponse?: SerializedResponse): Promise<void> | void
  lifeCycleEventForward<EventName extends keyof SerializedLifeCycleEventsMap>(
    eventName: EventName,
    ...data: SerializedLifeCycleEventsMap[EventName]
  ): void
}

declare global {
  var syncServer: WebSocketServer<SyncServerEventsMap> | undefined
}

export class SetupRemoteServerApi
  extends SetupApi<LifeCycleEventsMap>
  implements SetupRemoteServer
{
  constructor(...handlers: Array<RequestHandler>) {
    super(...handlers)
  }

  public async listen(): Promise<void> {
    const placeholderEmitter = new Emitter<LifeCycleEventsMap>()
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

      socket.on('lifeCycleEventForward', async (eventName, ...data) => {
        const deserializedData: any = await deserializeEventPayload(data)
        this.emitter.emit(eventName, ...deserializedData)
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

  httpServer.listen(
    Number.parseInt(SYNC_SERVER_URL.port),
    SYNC_SERVER_URL.hostname,
    () => {
      globalThis.syncServer = ws
      serverReadyPromise.resolve(ws)
    },
  )

  httpServer.on('error', (error: Error | NodeJS.ErrnoException) => {
    if (
      'code' in error &&
      error.code === 'EADDRINUSE' &&
      Number.parseInt(SYNC_SERVER_URL.port) === SYNC_SERVER_DEFAULT_PORT
    ) {
      devUtils.warn(
        'The default internal WebSocket server port (%d) is in use. Please consider freeing the port or specifying a different port using the "%s" environment variable.',
        SYNC_SERVER_DEFAULT_PORT,
        SYNC_SERVER_ENV_VARIABLE_NAME,
      )
    }

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
