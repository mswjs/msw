import * as http from 'node:http'
import { Readable } from 'node:stream'
import * as streamConsumers from 'node:stream/consumers'
import { AsyncLocalStorage } from 'node:async_hooks'
import { invariant } from 'outvariant'
import { createRequestId, FetchResponse } from '@mswjs/interceptors'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { Emitter } from 'strict-event-emitter'
import { SetupApi } from '~/core/SetupApi'
import { delay } from '~/core/delay'
import { bypass } from '~/core/bypass'
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

interface RemoteServerBoundaryContext {
  serverUrl: URL
  boundaryId: string
  initialHandlers: Array<RequestHandler | WebSocketHandler>
  handlers: Array<RequestHandler | WebSocketHandler>
}

export type ForwardedLifeCycleEventPayload = {
  type: keyof LifeCycleEventsMap
  args: {
    requestId: string
    request: {
      method: string
      url: string
      headers: Array<[string, string]>
      body: Uint8Array | null
    }
    response?: {
      status: number
      statusText: string
      headers: Array<[string, string]>
      body: Uint8Array | null
    }
    error?: {
      name: string
      message: string
      stack?: string
    }
  }
}

export const remoteHandlersContext =
  new AsyncLocalStorage<RemoteServerBoundaryContext>()

const REMOTE_SERVER_HOSTNAME = 'localhost'

const kRemoteServer = Symbol('kRemoteServer')

/**
 * Enables API mocking in a remote Node.js process.
 *
 * @see {@link https://mswjs.io/docs/api/setup-remote-server `setupRemoteServer()` API reference}
 */
export function setupRemoteServer(
  ...handlers: Array<RequestHandler | WebSocketHandler>
): SetupRemoteServerApi {
  return new SetupRemoteServerApi(handlers)
}

export interface SetupRemoteServer {
  events: LifeCycleEventEmitter<LifeCycleEventsMap>
  get boundaryId(): string

  listen: () => Promise<void>

  boundary: <Args extends Array<any>, R>(
    callback: (...args: Args) => R,
  ) => (...args: Args) => R

  close: () => Promise<void>
}

const kServerUrl = Symbol('kServerUrl')

export class SetupRemoteServerApi
  extends SetupApi<LifeCycleEventsMap>
  implements SetupRemoteServer
{
  [kServerUrl]: URL | undefined

  protected executionContexts: Map<string, () => RemoteServerBoundaryContext>

  constructor(handlers: Array<RequestHandler | WebSocketHandler>) {
    super(...handlers)

    this.handlersController = new AsyncHandlersController({
      storage: remoteHandlersContext,
      initialHandlers: handlers,
    })

    this.executionContexts = new Map()
  }

  get serverUrl(): URL {
    invariant(
      this[kServerUrl],
      'Failed to get a remote port in `setupRemoteServer`. Did you forget to `await remote.listen()`?',
    )

    return this[kServerUrl]
  }

  get boundaryId(): string {
    const context = remoteHandlersContext.getStore()

    invariant(
      context != null,
      'Failed to get "contextId" on "SetupRemoteServerApi": no context found. Did you forget to wrap this closure in `remote.boundary()`?',
    )

    return context.boundaryId
  }

  public async listen(): Promise<void> {
    const dummyEmitter = new Emitter<LifeCycleEventsMap>()

    const server = await createSyncServer()
    this[kServerUrl] = getServerUrl(server)

    process
      .once('SIGTERM', () => closeSyncServer(server))
      .once('SIGINT', () => closeSyncServer(server))

    // Close the server if the setup API is disposed.
    this.subscriptions.push(() => closeSyncServer(server))

    server.on('request', async (incoming, outgoing) => {
      if (!incoming.method) {
        return
      }

      // Handle the handshake request from the client.
      if (incoming.method === 'HEAD') {
        outgoing.writeHead(200).end()
        return
      }

      // Handle life-cycle event requests forwarded from `setupServer`.
      if (incoming.url === '/life-cycle-events') {
        this.handleLifeCycleEventRequest(incoming, outgoing)
        return
      }

      const requestId = incoming.headers['x-msw-request-id']
      const requestUrl = incoming.headers['x-msw-request-url']
      const contextId = incoming.headers['x-msw-boundary-id']

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
        /**
         * @note Use a dummy emitter because this context
         * is only one layer that can resolve a request. For example,
         * request can be resolved in the remote process and not here.
         */
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
  }

  public boundary<Args extends Array<any>, R>(
    callback: (...args: Args) => R,
  ): (...args: Args) => R {
    const boundaryId = createRequestId()

    return (...args: Args): R => {
      const context = {
        serverUrl: this.serverUrl,
        boundaryId,
        initialHandlers: this.handlersController.currentHandlers(),
        handlers: [],
      } satisfies RemoteServerBoundaryContext

      this.executionContexts.set(boundaryId, () => context)
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

  private async handleLifeCycleEventRequest(
    incoming: http.IncomingMessage,
    outgoing: http.ServerResponse<http.IncomingMessage> & {
      req: http.IncomingMessage
    },
  ) {
    const event = (await streamConsumers.json(
      incoming,
    )) as ForwardedLifeCycleEventPayload

    invariant(
      event.type,
      'Failed to emit a forwarded life-cycle event: request payload corrupted',
    )

    // Emit the forwarded life-cycle event on this emitter.
    this.emitter.emit(event.type as any, {
      requestId: event.args.requestId,
      request: deserializeFetchRequest(event.args.request),
      response:
        event.args.response != null
          ? deserializeFetchResponse(event.args.response)
          : undefined,
      error:
        event.args.error != null
          ? deserializeError(event.args.error)
          : undefined,
    })

    outgoing.writeHead(200).end()
  }
}

/**
 * Creates an internal HTTP server.
 */
async function createSyncServer(): Promise<http.Server> {
  const syncServer = Reflect.get(globalThis, kRemoteServer)

  // Reuse the existing WebSocket server reference if it exists.
  // It persists on the global scope between hot updates.
  if (syncServer) {
    return syncServer
  }

  const serverReadyPromise = new DeferredPromise<http.Server>()
  const server = http.createServer()

  server.listen(0, REMOTE_SERVER_HOSTNAME, async () => {
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

function getServerUrl(server: http.Server): URL {
  const address = server.address()

  invariant(address, 'Failed to get server URL: server address is not defined')

  if (typeof address === 'string') {
    return new URL(address)
  }

  return new URL(`http://${REMOTE_SERVER_HOSTNAME}:${address.port}`)
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

  protected agent: http.Agent

  constructor(private readonly url: URL) {
    this.agent = new http.Agent({
      // Reuse the same socket between requests so we can communicate
      // request's life-cycle events via HTTP more efficiently.
      keepAlive: true,
    })
    this.connected = false
  }

  public async connect(): Promise<void> {
    if (this.connected) {
      return
    }

    const maxRetries = 4
    let retries = 0

    const tryConnect = (): Promise<void> => {
      const connectionPromise = new DeferredPromise<void>()

      const request = http
        .request(this.url, {
          agent: this.agent,
          method: 'HEAD',
          headers: {
            accept: 'msw/passthrough',
          },
          timeout: 1000,
        })
        .end()

      request
        .once('response', (response) => {
          if (response.statusCode === 200) {
            connectionPromise.resolve()
          } else {
            connectionPromise.reject()
          }
        })
        .once('error', () => {
          connectionPromise.reject()
        })
        .once('timeout', () => {
          connectionPromise.reject()
        })

      return connectionPromise.then(
        () => {
          this.connected = true
        },
        async () => {
          invariant(
            retries < maxRetries,
            'Failed to connect to the remote server after %s retries',
            maxRetries,
          )

          retries++
          request.removeAllListeners()
          return delay(500).then(() => tryConnect())
        },
      )
    }

    return tryConnect()
  }

  public async handleRequest(args: {
    requestId: string
    boundaryId: string
    request: Request
  }): Promise<Response | undefined> {
    invariant(
      this.connected,
      'Failed to handle request "%s %s": client is not connected',
      args.request.method,
      args.request.url,
    )

    const fetchRequest = bypass(args.request, {
      headers: {
        accept: 'msw/internal',
        'x-msw-request-url': args.request.url,
        'x-msw-request-id': args.requestId,
        'x-msw-boundary-id': args.boundaryId,
      },
    })
    const request = http.request(this.url, {
      method: fetchRequest.method,
      headers: Object.fromEntries(fetchRequest.headers),
    })

    if (fetchRequest.body) {
      Readable.fromWeb(fetchRequest.body as any).pipe(request, { end: true })
    } else {
      request.end()
    }

    const responsePromise = new DeferredPromise<Response | undefined>()

    request
      .once('response', (response) => {
        if (response.statusCode === 404) {
          responsePromise.resolve(undefined)
          return
        }

        const fetchResponse = new FetchResponse(
          /** @fixme Node.js types incompatibility */
          Readable.toWeb(response) as ReadableStream<any>,
          {
            url: fetchRequest.url,
            status: response.statusCode,
            statusText: response.statusMessage,
            headers: FetchResponse.parseRawHeaders(response.rawHeaders),
          },
        )
        responsePromise.resolve(fetchResponse)
      })
      .once('error', () => {
        responsePromise.resolve(undefined)
      })
      .once('timeout', () => {
        responsePromise.resolve(undefined)
      })

    return responsePromise
  }

  public async handleLifeCycleEvent<
    EventType extends keyof LifeCycleEventsMap,
  >(event: {
    type: EventType
    args: LifeCycleEventsMap[EventType][0]
  }): Promise<void> {
    invariant(
      this.connected,
      'Failed to forward life-cycle events for "%s %s": remote client not connected',
      event.args.request.method,
      event.args.request.url,
    )

    const url = new URL('/life-cycle-events', this.url)
    const payload = JSON.stringify({
      type: event.type,
      args: {
        requestId: event.args.requestId,
        request: await serializeFetchRequest(event.args.request),
        response:
          'response' in event.args
            ? await serializeFetchResponse(event.args.response)
            : undefined,
        error:
          'error' in event.args ? serializeError(event.args.error) : undefined,
      },
    } satisfies ForwardedLifeCycleEventPayload)

    invariant(
      payload,
      'Failed to serialize a life-cycle event "%s" for request "%s %s"',
      event.type,
      event.args.request.method,
      event.args.request.url,
    )

    const donePromise = new DeferredPromise<void>()

    http
      .request(
        url,
        {
          method: 'POST',
          headers: {
            accept: 'msw/passthrough, msw/internal',
            'content-type': 'application/json',
          },
        },
        (response) => {
          if (response.statusCode === 200) {
            donePromise.resolve()
          } else {
            donePromise.reject(
              new Error(
                `Failed to forward life-cycle event "${event.type}" for request "${event.args.request.method} ${event.args.request.url}": expected a 200 response but got ${response.statusCode}`,
              ),
            )
          }
        },
      )
      .end(payload)
      .once('error', (error) => {
        // eslint-disable-next-line no-console
        console.error(error)
        donePromise.reject(
          new Error(
            `Failed to forward life-cycle event "${event.type}" for request "${event.args.request.method} ${event.args.request.url}": unexpected error. There's likely additional information above.`,
          ),
        )
      })

    return donePromise
  }
}

async function serializeFetchRequest(
  request: Request,
): Promise<ForwardedLifeCycleEventPayload['args']['request']> {
  return {
    url: request.url,
    method: request.method,
    headers: Array.from(request.headers),
    body: request.body
      ? new Uint8Array(await request.clone().arrayBuffer())
      : null,
  }
}

function deserializeFetchRequest(
  value: NonNullable<ForwardedLifeCycleEventPayload['args']['request']>,
): Request {
  return new Request(value.url, {
    method: value.method,
    headers: value.headers,
    body: value.body,
  })
}

async function serializeFetchResponse(
  response: Response,
): Promise<ForwardedLifeCycleEventPayload['args']['response']> {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: Array.from(response.headers),
    body: response.body
      ? new Uint8Array(await response.clone().arrayBuffer())
      : null,
  }
}

function deserializeFetchResponse(
  value: NonNullable<ForwardedLifeCycleEventPayload['args']['response']>,
): Response {
  return new FetchResponse(
    value.body ? new Uint8Array(Object.values(value.body)) : null,
    {
      status: value.status,
      statusText: value.statusText,
      headers: value.headers,
    },
  )
}

function serializeError(
  error: Error,
): ForwardedLifeCycleEventPayload['args']['error'] {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  }
}

function deserializeError(
  value: NonNullable<ForwardedLifeCycleEventPayload['args']['error']>,
): Error {
  const error = new Error(value.message)
  error.name = value.name
  error.stack = value.stack
  return error
}
