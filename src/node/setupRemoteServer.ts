import * as http from 'node:http'
import { Readable } from 'node:stream'
import { AsyncLocalStorage } from 'node:async_hooks'
import { invariant } from 'outvariant'
import { Emitter } from 'strict-event-emitter'
import { createRequestId } from '@mswjs/interceptors'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { SetupApi } from '~/core/SetupApi'
import { delay } from '~/core/delay'
import type { RequestHandler } from '~/core/handlers/RequestHandler'
import type { WebSocketHandler } from '~/core/handlers/WebSocketHandler'
import { handleRequest } from '~/core/utils/handleRequest'
import { isHandlerKind } from '~/core/utils/internal/isHandlerKind'
import type {
  LifeCycleEventEmitter,
  LifeCycleEventsMap,
} from '~/core/sharedOptions'
import { devUtils } from '~/core/utils/internal/devUtils'
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

export const remoteHandlersContext =
  new AsyncLocalStorage<RemoteServerBoundaryContext>()

const kRemoteServer = Symbol('kRemoteServer')

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
  get contextId(): string

  listen: (options: SetupRemoteServerListenOptions) => Promise<void>

  boundary: <Args extends Array<any>, R>(
    callback: (...args: Args) => R,
  ) => (...args: Args) => R

  close: () => Promise<void>
}

export class SetupRemoteServerApi
  extends SetupApi<LifeCycleEventsMap>
  implements SetupRemoteServer
{
  protected executionContexts: Map<string, () => RemoteServerBoundaryContext>

  constructor(handlers: Array<RequestHandler | WebSocketHandler>) {
    super(...handlers)

    this.handlersController = new AsyncHandlersController({
      storage: remoteHandlersContext,
      initialHandlers: handlers,
    })

    this.executionContexts = new Map()
  }

  get contextId(): string {
    const context = remoteHandlersContext.getStore()

    invariant(
      context != null,
      'Failed to get "contextId" on "SetupRemoteServerApi": no context found. Did you forget to wrap this closure in `remote.boundary()`?',
    )

    return context.contextId
  }

  public async listen(
    options: SetupRemoteServerListenOptions = {},
  ): Promise<void> {
    const resolvedPort = options.port || MSW_REMOTE_SERVER_PORT

    invariant(
      typeof resolvedPort === 'number',
      'Failed to initialize remote server: expected the "port" option to be a valid port number but got "%s". Make sure it is the same port number you provide as the "remotePort" option to "server.listen()" in your application.',
      resolvedPort,
    )

    const dummyEmitter = new Emitter<LifeCycleEventsMap>()
    const server = await createSyncServer(resolvedPort)

    process
      .once('SIGTERM', () => closeSyncServer(server))
      .once('SIGINT', () => closeSyncServer(server))

    server.on('request', async (incoming, outgoing) => {
      if (!incoming.method) {
        return
      }

      // Handle the handshake request from the client.
      if (incoming.method === 'HEAD') {
        outgoing.writeHead(200).end()
        return
      }

      const requestId = incoming.headers['x-msw-request-id']
      const requestUrl = incoming.headers['x-msw-request-url']
      const contextId = incoming.headers['x-msw-context-id']

      if (typeof requestId !== 'string') {
        outgoing.writeHead(400)
        outgoing.end('Expected the "x-msw-request-id" header to be a string')
        return
      }

      if (typeof requestUrl !== 'string') {
        outgoing.writeHead(400)
        outgoing.end('Expected the "x-msw-request-url" header to be a string')
        return
      }

      // Validate remote context id.
      if (contextId != null && typeof contextId !== 'string') {
        outgoing.writeHead(400)
        outgoing.end(
          `Expected the "contextId" value to be a string but got ${typeof contextId}`,
        )
        return
      }

      const request = new Request(requestUrl, {
        method: incoming.method,
        body:
          incoming.method !== 'HEAD' && incoming.method !== 'GET'
            ? (Readable.toWeb(incoming) as ReadableStream<unknown>)
            : null,
      })

      for (const headerName in incoming.headersDistinct) {
        const headerValue = incoming.headersDistinct[headerName]
        if (headerValue) {
          headerValue.forEach((value) => {
            request.headers.append(headerName, value)
          })
        }
      }

      const handlers = this.resolveHandlers({ contextId }).filter(
        /** @todo Eventually allow all handler types */
        isHandlerKind('RequestHandler'),
      )
      const response = await handleRequest(
        request,
        requestId,
        handlers,
        /** @todo Support listen options */
        { onUnhandledRequest() {} },
        dummyEmitter,
      )

      if (response) {
        outgoing.writeHead(
          response.status,
          response.statusText,
          Array.from(response.headers),
        )

        if (response.body) {
          Readable.fromWeb(response.body as any).pipe(outgoing)
        } else {
          outgoing.end()
        }

        return
      }

      outgoing.writeHead(404).end()
    })

    /** @todo Decide on life-cycle events forwarding */
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
      return remoteHandlersContext.run(context, callback, ...args)
    }
  }

  public async close(): Promise<void> {
    this.executionContexts.clear()
    remoteHandlersContext.disable()

    const syncServer = Reflect.get(globalThis, kRemoteServer)

    invariant(
      syncServer,
      devUtils.formatMessage(
        'Failed to close a remote server: no server is running. Did you forget to call and await ".listen()"?',
      ),
    )

    await closeSyncServer(syncServer)
  }

  private resolveHandlers(args: {
    contextId: string | undefined
  }): Array<RequestHandler | WebSocketHandler> {
    const defaultHandlers = this.handlersController.currentHandlers()

    // Request that are not bound to a remote context id
    // cannot be affected by the handlers from that context.
    // Return the list of current process handlers instead.
    if (!args.contextId) {
      return defaultHandlers
    }

    invariant(
      this.executionContexts.has(args.contextId),
      'Failed to handle a remote request: no context found by id "%s"',
      args.contextId,
    )

    // If the request event has a context associated with it,
    // look up the current state of that context to get the handlers.
    const getContext = this.executionContexts.get(args.contextId)

    invariant(
      getContext != null,
      'Failed to handle a remote request: the context by id "%s" is empty',
      args.contextId,
    )

    return getContext().handlers
  }
}

/**
 * Creates an internal HTTP server.
 */
async function createSyncServer(port: number): Promise<http.Server> {
  const syncServer = Reflect.get(globalThis, kRemoteServer)

  // Reuse the existing WebSocket server reference if it exists.
  // It persists on the global scope between hot updates.
  if (syncServer) {
    return syncServer
  }

  const serverReadyPromise = new DeferredPromise<http.Server>()
  const server = http.createServer()

  server.listen(port, 'localhost', async () => {
    serverReadyPromise.resolve(server)
  })

  server.once('error', (error) => {
    serverReadyPromise.reject(error)
    Reflect.deleteProperty(globalThis, kRemoteServer)
  })

  Object.defineProperty(globalThis, kRemoteServer, {
    value: server,
  })

  return serverReadyPromise
}

async function closeSyncServer(server: http.Server): Promise<void> {
  if (!server.listening) {
    return Promise.resolve()
  }

  const serverClosePromise = new DeferredPromise<void>()

  server.close((error) => {
    if (error) {
      serverClosePromise.reject(error)
      return
    }

    serverClosePromise.resolve()
  })

  await serverClosePromise.then(() => {
    Reflect.deleteProperty(globalThis, kRemoteServer)
  })
}

export class RemoteClient {
  public connected: boolean
  private port: number

  constructor(readonly args: { port: number }) {
    this.connected = false
    this.port = args.port
  }

  get url(): string {
    return `http://localhost:${this.port}`
  }

  public async connect(): Promise<void> {
    if (this.connected) {
      return
    }

    const maxRetries = 4
    let retries = 0

    const tryConnect = (): Promise<void> => {
      return fetch(this.url, {
        method: 'HEAD',
        headers: {
          accept: 'msw/passthrough',
        },
        cache: 'no-cache',
      }).then(
        (response) => {
          invariant(response.ok, '')
          this.connected = true
        },
        async () => {
          if (retries === maxRetries) {
            throw new Error(
              `Failed to connect to remote server after ${maxRetries} retries`,
            )
          }

          retries++
          await delay(500)
          return tryConnect()
        },
      )
    }

    return tryConnect()
  }

  public async handleRequest(args: {
    requestId: string
    contextId?: string
    request: Request
  }): Promise<Response | undefined> {
    const request = args.request.clone()

    request.headers.set('accept', 'msw/passthrough')
    request.headers.set('x-msw-request-url', args.request.url)
    request.headers.set('x-msw-request-id', args.requestId)
    request.headers.set('x-msw-context-id', args.contextId || '')

    const response = await fetch(this.url, request).catch(() => undefined)

    if (!response || !response.ok) {
      return
    }

    return response
  }
}
