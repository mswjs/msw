import * as http from 'node:http'
import { Readable } from 'node:stream'
import * as streamConsumers from 'node:stream/consumers'
import { AsyncLocalStorage } from 'node:async_hooks'
import type { RequiredDeep } from 'type-fest'
import { invariant } from 'outvariant'
import { createRequestId } from '@mswjs/interceptors'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { SetupApi } from '~/core/SetupApi'
import type { RequestHandler } from '~/core/handlers/RequestHandler'
import type { WebSocketHandler } from '~/core/handlers/WebSocketHandler'
import { getResponse } from '~/core/getResponse'
import { isHandlerKind } from '~/core/utils/internal/isHandlerKind'
import type {
  LifeCycleEventEmitter,
  LifeCycleEventsMap,
} from '~/core/sharedOptions'
import { devUtils } from '~/core/utils/internal/devUtils'
import { AsyncHandlersController } from './SetupServerApi'
import { ListenOptions } from './glossary'
import { mergeRight } from '~/core/utils/internal/mergeRight'
import { DEFAULT_LISTEN_OPTIONS } from './SetupServerCommonApi'
import { onUnhandledRequest } from '~/core/utils/request/onUnhandledRequest'
import {
  type ForwardedLifeCycleEventPayload,
  deserializeError,
  deserializeFetchRequest,
  deserializeFetchResponse,
} from '~/core/RemoteClient'

interface RemoteServerBoundaryContext {
  serverUrl: URL
  boundaryId: string
  initialHandlers: Array<RequestHandler | WebSocketHandler>
  handlers: Array<RequestHandler | WebSocketHandler>
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

  protected resolvedOptions!: RequiredDeep<ListenOptions>
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

  public async listen(options: Partial<ListenOptions> = {}): Promise<void> {
    this.resolvedOptions = mergeRight(
      DEFAULT_LISTEN_OPTIONS,
      options,
    ) as RequiredDeep<ListenOptions>

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
        // @ts-expect-error Missing Node.js types.
        duplex: 'half',
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

      const response = await getResponse(handlers, request)

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

    this.emitter.on('request:unhandled', async ({ request }) => {
      /**
       * @note React to unhandled requests in the "request:unhandled" listener.
       * This event will be forwarded from the remote process after neither has
       * handled the request.
       */
      await onUnhandledRequest(request, this.resolvedOptions.onUnhandledRequest)
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
