import { invariant } from 'outvariant'
import { Emitter, TypedEvent } from 'rettime'
import { parse, OperationTypeNode, type GraphQLError } from 'graphql'
import { resolveWebSocketUrl } from '@mswjs/interceptors'
import type {
  WebSocketClientConnectionProtocol,
  WebSocketConnectionData,
  WebSocketData,
  WebSocketServerConnectionProtocol,
} from '@mswjs/interceptors/WebSocket'
import { http } from '#core/http'
import { ws } from '#core/ws'
import {
  WebSocketHandler,
  kConnect,
  type WebSocketHandlerConnection,
  type WebSocketResolutionContext,
} from '#core/handlers/WebSocketHandler'
import { GraphQLSubscriptionEvent } from '#core/experimental/frames/websocket-frame'
import {
  matchRequestUrl,
  type Path,
  type PathParams,
} from '#core/utils/matching/matchRequestUrl'
import type { ResponseResolverFinalizeFunction } from '#core/handlers/RequestHandler'
import type { MaybePromise } from '#core/typeUtils'
import { attachSiblingHandlers } from '#core/utils/internal/attachSiblingHandlers'
import { jsonParse } from '#core/utils/internal/jsonParse'
import { devUtils } from '#core/utils/internal/devUtils'
import { getTimestamp } from '#core/utils/logging/getTimestamp'
import { toPublicUrl } from '#core/utils/request/toPublicUrl'
import { colors } from '#core/ws/utils/attachWebSocketLogger'
import {
  GraphQLHandler,
  isDocumentNode,
  type DocumentTypeDecoration,
  type GraphQLHandlerInfo,
  type GraphQLHandlerNameSelector,
  type GraphQLQuery,
  type GraphQLVariables,
} from './graphql-handler'
import {
  parseDocumentNode,
  type ParsedGraphQLQuery,
} from './parse-graphql-request'

/**
 * Messages of the `graphql-transport-ws` subprotocol.
 * @see https://github.com/graphql/graphql-over-http/blob/main/rfcs/GraphQLOverWebSocket.md
 */
export interface GraphQLWebSocketInitMessage {
  type: 'connection_init'
  payload?: Record<string, unknown>
}

export interface GraphQLWebSocketSubscribePayload<
  Variables extends GraphQLVariables = GraphQLVariables,
> {
  operationName?: string | null
  query: string
  variables?: Variables
  extensions?: Record<string, unknown>
}

export interface GraphQLWebSocketSubscribeMessage<
  Variables extends GraphQLVariables = GraphQLVariables,
> {
  type: 'subscribe'
  id: string
  payload: GraphQLWebSocketSubscribePayload<Variables>
}

export interface GraphQLWebSocketCompleteMessage {
  type: 'complete'
  id: string
}

export interface GraphQLWebSocketPingMessage {
  type: 'ping'
  payload?: Record<string, unknown>
}

export interface GraphQLWebSocketPongMessage {
  type: 'pong'
  payload?: Record<string, unknown>
}

export type GraphQLWebSocketClientMessage =
  | GraphQLWebSocketInitMessage
  | GraphQLWebSocketSubscribeMessage
  | GraphQLWebSocketCompleteMessage
  | GraphQLWebSocketPingMessage
  | GraphQLWebSocketPongMessage

export interface GraphQLWebSocketAcknowledgeMessage {
  type: 'connection_ack'
  payload?: Record<string, unknown>
}

export interface GraphQLWebSocketNextMessage {
  type: 'next'
  id: string
  payload: GraphQLSubscriptionPayload
}

export interface GraphQLWebSocketErrorMessage {
  type: 'error'
  id: string
  payload: ReadonlyArray<Partial<GraphQLError>>
}

export type GraphQLWebSocketServerMessage =
  | GraphQLWebSocketAcknowledgeMessage
  | GraphQLWebSocketNextMessage
  | GraphQLWebSocketErrorMessage
  | GraphQLWebSocketCompleteMessage
  | GraphQLWebSocketPingMessage
  | GraphQLWebSocketPongMessage

/**
 * A GraphQL execution result published to a subscription.
 */
export interface GraphQLSubscriptionPayload<
  Query extends GraphQLQuery = GraphQLQuery,
> {
  data?: Query | null
  errors?: ReadonlyArray<Partial<GraphQLError>> | null
  extensions?: Record<string, unknown>
}

function createInitMessage(payload?: Record<string, unknown>): string {
  return JSON.stringify({
    type: 'connection_init',
    payload,
  } satisfies GraphQLWebSocketInitMessage)
}

function createAcknowledgeMessage(): string {
  return JSON.stringify({
    type: 'connection_ack',
  } satisfies GraphQLWebSocketAcknowledgeMessage)
}

function createNextMessage(args: {
  id: string
  payload: GraphQLSubscriptionPayload
}): string {
  return JSON.stringify({
    id: args.id,
    type: 'next',
    payload: args.payload,
  } satisfies GraphQLWebSocketNextMessage)
}

function createErrorMessage(args: {
  id: string
  payload: ReadonlyArray<Partial<GraphQLError>>
}): string {
  return JSON.stringify({
    id: args.id,
    type: 'error',
    payload: args.payload,
  } satisfies GraphQLWebSocketErrorMessage)
}

function createCompleteMessage(args: { id: string }): string {
  return JSON.stringify({
    id: args.id,
    type: 'complete',
  } satisfies GraphQLWebSocketCompleteMessage)
}

function createPongMessage(): string {
  return JSON.stringify({
    type: 'pong',
  } satisfies GraphQLWebSocketPongMessage)
}

function parseGraphQLWebSocketMessage<MessageType extends { type: string }>(
  data: WebSocketData,
): MessageType | undefined {
  if (typeof data !== 'string') {
    return undefined
  }

  const message = jsonParse<MessageType>(data)

  if (!message || typeof message.type !== 'string') {
    return undefined
  }

  return message
}

/**
 * A subscriber provided by a `GraphQLSubscriptionHandler` for a particular
 * WebSocket connection. Returns true if the handler matched the parsed
 * subscribe operation and resolved it.
 */
type GraphQLSubscriptionSubscriber = (args: {
  node: ParsedGraphQLQuery
  message: GraphQLWebSocketSubscribeMessage
}) => boolean

interface GraphQLSubscriptionSubscriberEntry {
  transport: GraphQLSubscriptionTransportHandler
  subscriber: GraphQLSubscriptionSubscriber
}

type GraphQLSubscriptionCleanup = () => MaybePromise<void>

interface GraphQLSubscriptionConnection {
  client: WebSocketClientConnectionProtocol
  server: WebSocketServerConnectionProtocol
  subscribers: Map<WebSocketHandler, GraphQLSubscriptionSubscriberEntry>
  /**
   * The active subscriptions of this connection, mapped to the cleanups
   * scheduled for them via the resolver's `finalize()`.
   */
  subscriptions: Map<string, Array<GraphQLSubscriptionCleanup>>
  events?: WebSocketResolutionContext['events']
  /**
   * The payload of the client's `connection_init` message (i.e. the
   * `connectionParams` of the GraphQL client). Kept so it can be
   * replayed to the original server on passthrough.
   */
  connectionParams?: Record<string, unknown>
  /**
   * Resolves once the original server has acknowledged this connection.
   * The upstream session is established once per connection, no matter
   * how many subscriptions pass through it.
   */
  upstreamSession?: Promise<void>
}

/**
 * Connect to the original server and initialize the `graphql-transport-ws`
 * session for the given connection, at most once.
 *
 * @note The server connection is shared by every subscription of this
 * client. Initializing it more than once makes a compliant GraphQL server
 * close it ("Too many initialisation requests").
 */
function ensureUpstreamSession(
  connection: GraphQLSubscriptionConnection,
): Promise<void> {
  if (connection.upstreamSession) {
    return connection.upstreamSession
  }

  const { server } = connection

  connection.upstreamSession = new Promise<void>((resolve) => {
    server.addEventListener('message', (event) => {
      const message =
        parseGraphQLWebSocketMessage<GraphQLWebSocketServerMessage>(event.data)

      if (message?.type === 'connection_ack') {
        // Prevent the original acknowledgement from being forwarded to
        // the client: it has already received a mocked one on connect.
        event.preventDefault()
        resolve()
      }
    })

    server.addEventListener(
      'open',
      () => {
        server.send(createInitMessage(connection.connectionParams))
      },
      { once: true },
    )

    server.connect()
  })

  return connection.upstreamSession
}

/**
 * The `graphql-transport-ws` sessions of the intercepted WebSocket
 * connections, keyed by the client id.
 *
 * @note This registry is module-level, and not per-transport, on purpose.
 * Multiple `graphql.link()` calls to the same endpoint create multiple
 * transports, and all of them must share a single session per connection.
 * Otherwise, each transport binds its own protocol listeners to the same
 * client, which makes it receive duplicate `connection_ack`/`pong` frames
 * and resolves matching subscription handlers more than once.
 */
const connections = new Map<string, GraphQLSubscriptionConnection>()

/**
 * A WebSocket handler implementing the `graphql-transport-ws` protocol
 * session for a single GraphQL endpoint. One transport is shared across
 * all subscription handlers created from the same `graphql.link()` call
 * (attached to each of them as a sibling handler).
 *
 * The transport owns the protocol/session concerns: connection
 * acknowledgement, keep-alive, the per-connection registry of active
 * subscriptions, and dispatching parsed `subscribe` operations to the
 * matching subscription handler.
 */
export class GraphQLSubscriptionTransportHandler extends WebSocketHandler {
  /**
   * Register the given handler as a subscriber to the GraphQL
   * subscriptions on the given WebSocket connection. Subscribers are
   * dispatched in registration order, which follows the handlers
   * resolution order (runtime handlers take precedence).
   */
  public subscribe(
    connection: WebSocketHandlerConnection,
    handler: WebSocketHandler,
    subscriber: GraphQLSubscriptionSubscriber,
  ): void {
    const transportConnection = this.#getOrCreateConnection(connection)
    transportConnection.subscribers.set(handler, {
      transport: this,
      subscriber,
    })
  }

  public getConnection(
    clientId: string,
  ): GraphQLSubscriptionConnection | undefined {
    return connections.get(clientId)
  }

  public async run(
    connection: WebSocketConnectionData,
    resolutionContext?: WebSocketResolutionContext,
  ): Promise<WebSocketHandlerConnection | null> {
    const handlerConnection = await super.run(connection, resolutionContext)

    // Capture the network frame events reference for this connection.
    // The transport emits life-cycle events (e.g. "graphql:subscription")
    // long after the run: whenever the client sends a "subscribe" message.
    if (handlerConnection) {
      const transportConnection = this.#getOrCreateConnection(handlerConnection)

      // Never overwrite the events of a session shared with another
      // transport: only the frame that resolved it provides them.
      if (resolutionContext?.events) {
        transportConnection.events = resolutionContext.events
      }
    }

    return handlerConnection
  }

  /**
   * End the given subscription without notifying the client. Used when
   * the subscription has already been terminated over the wire (e.g. the
   * original server completed it and that frame reached the client).
   */
  public endSubscription(args: {
    clientId: string
    subscriptionId: string
  }): void {
    const connection = connections.get(args.clientId)

    if (connection) {
      this.#endSubscription(connection, args.subscriptionId)
    }
  }

  /**
   * Schedule a cleanup to run once the given subscription ends.
   *
   * @note If the subscription has already ended by the time this is
   * called, the cleanup runs immediately. The resolver can no longer
   * affect that subscription, so there is nothing left to wait for.
   */
  public finalize(args: {
    clientId: string
    subscriptionId: string
    cleanup: GraphQLSubscriptionCleanup
  }): void {
    const cleanups = connections
      .get(args.clientId)
      ?.subscriptions.get(args.subscriptionId)

    if (cleanups) {
      cleanups.push(args.cleanup)
      return
    }

    this.#exhaustCleanups([args.cleanup])
  }

  async #endAllSubscriptions(
    connection: GraphQLSubscriptionConnection,
  ): Promise<void> {
    const pendingCleanups: Array<Promise<void>> = []

    for (const subscriptionId of connection.subscriptions.keys()) {
      pendingCleanups.push(this.#endSubscription(connection, subscriptionId))
    }

    await Promise.all(pendingCleanups)
  }

  /**
   * End the given subscription and run the cleanups scheduled for it.
   *
   * This is the single exit point for every way a subscription can end:
   * completed by the mock, by the client, or by the original server;
   * terminated with errors; dropped when the client disconnects; or
   * detached from its resolver when the handlers are reset. Ending an
   * already-ended subscription is a no-op, so the cleanups are
   * guaranteed to run at most once.
   */
  #endSubscription(
    connection: GraphQLSubscriptionConnection,
    subscriptionId: string,
  ): Promise<void> {
    const cleanups = connection.subscriptions.get(subscriptionId)

    if (!cleanups) {
      return Promise.resolve()
    }

    connection.subscriptions.delete(subscriptionId)
    return this.#exhaustCleanups(cleanups)
  }

  /**
   * Run the given cleanups as LIFO, consistently with `finalize()` in
   * the request handlers. Cleanups are detached from the subscription
   * life-cycle: nothing awaits them, so this must never reject.
   */
  async #exhaustCleanups(
    cleanups: Array<GraphQLSubscriptionCleanup>,
  ): Promise<void> {
    const errors: Array<Error> = []

    for (let index = cleanups.length - 1; index >= 0; index--) {
      try {
        await cleanups[index]()
      } catch (error) {
        if (error instanceof Error) {
          errors.push(error)
        }
      }
    }

    if (errors.length > 0) {
      devUtils.error(
        'Failed to execute the cleanup for a GraphQL subscription to "%s". Please see the original error below.',
        this.url.toString(),
        new AggregateError(errors),
      )
    }
  }

  /**
   * Send a `next` message with the given payload to the subscription.
   */
  public publish(args: {
    clientId: string
    subscriptionId: string
    payload: GraphQLSubscriptionPayload
  }): void {
    const connection = this.#getConnectionForSubscription({
      clientId: args.clientId,
      subscriptionId: args.subscriptionId,
      intent: 'publish to',
    })

    if (!connection) {
      return
    }

    connection.client.send(
      createNextMessage({
        id: args.subscriptionId,
        payload: args.payload,
      }),
    )
  }

  /**
   * Send a terminal `error` message to the subscription and
   * removes it from the registry of active subscriptions.
   */
  public error(args: {
    clientId: string
    subscriptionId: string
    errors: ReadonlyArray<Partial<GraphQLError>>
  }): void {
    const connection = this.#getConnectionForSubscription({
      clientId: args.clientId,
      subscriptionId: args.subscriptionId,
      intent: 'error',
    })

    if (!connection) {
      return
    }

    connection.client.send(
      createErrorMessage({
        id: args.subscriptionId,
        payload: args.errors,
      }),
    )
    this.#endSubscription(connection, args.subscriptionId)
  }

  /**
   * Send a `complete` message to the subscription and removes it
   * from the registry of active subscriptions.
   */
  public complete(args: { clientId: string; subscriptionId: string }): void {
    const connection = this.#getConnectionForSubscription({
      clientId: args.clientId,
      subscriptionId: args.subscriptionId,
      intent: 'complete',
    })

    if (!connection) {
      return
    }

    connection.client.send(createCompleteMessage({ id: args.subscriptionId }))
    this.#endSubscription(connection, args.subscriptionId)
  }

  /**
   * Drop this transport's subscribers and active subscriptions from the
   * sessions it participates in. The sessions themselves are left intact:
   * they are shared with the other transports of the same connection and
   * own the protocol listeners for as long as the client stays connected.
   *
   * @note This method is invoked automatically when the handlers
   * controller resets the handlers (e.g. `server.resetHandlers()`).
   */
  public reset(): void {
    for (const connection of connections.values()) {
      let ownsConnection = false

      for (const [handler, entry] of connection.subscribers) {
        if (entry.transport === this) {
          connection.subscribers.delete(handler)
          ownsConnection = true
        }
      }

      // Resetting the handlers detaches the resolvers from their
      // subscriptions, so run their cleanups instead of dropping them.
      if (ownsConnection) {
        this.#endAllSubscriptions(connection)
      }
    }
  }

  /**
   * Forget the sessions of this transport, ending their subscriptions.
   * @note This method is invoked automatically when the network is
   * disabled (e.g. `server.close()`).
   */
  public dispose(): MaybePromise<void> {
    const pendingCleanups: Array<Promise<void>> = []

    for (const [clientId, connection] of connections) {
      for (const [handler, entry] of connection.subscribers) {
        if (entry.transport === this) {
          connection.subscribers.delete(handler)
        }
      }

      // A session is shared by all the transports of the same endpoint,
      // so it's only torn down once the last of them is disposed of.
      if (connection.subscribers.size === 0) {
        pendingCleanups.push(this.#endAllSubscriptions(connection))
        connections.delete(clientId)
      }
    }

    if (pendingCleanups.length > 0) {
      return Promise.all(pendingCleanups).then(() => {})
    }
  }

  /**
   * @note The transport is the sole owner of logging for GraphQL
   * subscription connections. It logs parsed `graphql-transport-ws`
   * frames instead of raw WebSocket messages.
   */
  public log(connection: WebSocketConnectionData): () => void {
    return attachGraphQLSubscriptionLogger(connection)
  }

  protected [kConnect](connection: WebSocketHandlerConnection): boolean {
    this.#getOrCreateConnection(connection)
    return true
  }

  #getOrCreateConnection(
    connection: WebSocketHandlerConnection,
  ): GraphQLSubscriptionConnection {
    const { client } = connection
    const existingConnection = connections.get(client.id)

    if (existingConnection) {
      return existingConnection
    }

    const transportConnection: GraphQLSubscriptionConnection = {
      client: connection.client,
      server: connection.server,
      subscribers: new Map(),
      subscriptions: new Map(),
    }
    connections.set(client.id, transportConnection)

    // Bind the protocol listeners alongside the session that owns them.
    // Creating the session and binding its listeners is a single step, so
    // they are guaranteed to be bound exactly once per connection no matter
    // how many transports end up sharing this session.
    client.addEventListener('message', (event) => {
      this.#handleClientMessage(client.id, event.data)
    })

    client.addEventListener('close', () => {
      // The resolvers can no longer affect any of the subscriptions
      // on this connection once the client disconnects.
      this.#endAllSubscriptions(transportConnection)
      connections.delete(client.id)
    })

    return transportConnection
  }

  #getConnectionForSubscription(args: {
    clientId: string
    subscriptionId: string
    intent: string
  }): GraphQLSubscriptionConnection | undefined {
    const connection = connections.get(args.clientId)

    if (!connection || !connection.subscriptions.has(args.subscriptionId)) {
      devUtils.warn(
        'Failed to %s the GraphQL subscription "%s": the subscription is no longer active.',
        args.intent,
        args.subscriptionId,
      )
      return undefined
    }

    return connection
  }

  #handleClientMessage(clientId: string, data: WebSocketData): void {
    const connection = connections.get(clientId)

    if (!connection) {
      return
    }

    const message =
      parseGraphQLWebSocketMessage<GraphQLWebSocketClientMessage>(data)

    if (!message) {
      return
    }

    switch (message.type) {
      case 'connection_init': {
        // Preserve the initialization payload (e.g. the client's
        // credentials) so passthrough can replay it to the server.
        connection.connectionParams = message.payload
        connection.client.send(createAcknowledgeMessage())
        break
      }

      case 'ping': {
        connection.client.send(createPongMessage())
        break
      }

      case 'subscribe': {
        this.#handleSubscribeMessage(connection, message)
        break
      }

      case 'complete': {
        this.#endSubscription(connection, message.id)
        break
      }
    }
  }

  #handleSubscribeMessage(
    connection: GraphQLSubscriptionConnection,
    message: GraphQLWebSocketSubscribeMessage,
  ): void {
    let node: ParsedGraphQLQuery

    try {
      node = parseDocumentNode(
        parse(message.payload.query),
        message.payload.operationName,
      )
    } catch (error) {
      devUtils.warn(
        'Failed to intercept a GraphQL subscription to "%s": the subscription query is not a valid GraphQL document.\n\n%s',
        toPublicUrl(connection.client.url),
        error,
      )
      return
    }

    if (node.operationType !== OperationTypeNode.SUBSCRIPTION) {
      devUtils.warn(
        'Intercepted a GraphQL %s "%s" over WebSocket: only subscription operations are supported over the WebSocket transport.',
        node.operationType,
        node.operationName || '(anonymous)',
      )
      return
    }

    // Register the subscription before dispatching it so the resolver
    // can publish to it synchronously.
    connection.subscriptions.set(message.id, [])

    for (const { subscriber } of connection.subscribers.values()) {
      if (subscriber({ node, message })) {
        this.#emitSubscriptionEvent(connection, node, message)
        return
      }
    }

    devUtils.warn(
      'Intercepted a GraphQL subscription "%s" to "%s" that has no matching subscription handler. If you wish to mock this subscription, create a subscription handler for it.',
      node.operationName || '(anonymous)',
      toPublicUrl(connection.client.url),
    )
  }

  /**
   * Emit the "graphql:subscription" life-cycle event on the network.
   * The event is emitted once the subscription has been established:
   * matched by a subscription handler and resolved.
   */
  #emitSubscriptionEvent(
    connection: GraphQLSubscriptionConnection,
    node: ParsedGraphQLQuery,
    message: GraphQLWebSocketSubscribeMessage,
  ): void {
    // Anonymous subscriptions can never match a subscription handler.
    if (!connection.events || !node.operationName) {
      return
    }

    connection.events.emit(
      new GraphQLSubscriptionEvent({
        operationName: node.operationName,
        query: message.payload.query,
        variables: { ...message.payload.variables },
        request: new Request(connection.client.url, {
          headers: {
            connection: 'upgrade',
            upgrade: 'websocket',
          },
        }),
      }),
    )
  }
}

export type GraphQLSubscriptionName<
  Query extends GraphQLQuery = GraphQLQuery,
  Variables extends GraphQLVariables = GraphQLVariables,
> = GraphQLHandlerNameSelector | DocumentTypeDecoration<Query, Variables>

export interface GraphQLSubscriptionResolverInfo<
  Query extends GraphQLQuery = GraphQLQuery,
  Variables extends GraphQLVariables = GraphQLVariables,
> {
  /**
   * Path parameters parsed from the WebSocket connection URL.
   */
  params: PathParams

  /**
   * The name of the intercepted operation.
   */
  operationName: string

  /**
   * Intercepted GraphQL subscription.
   */
  subscription: GraphQLSubscription<Query, Variables>

  /**
   * Schedule a cleanup to run once this subscription ends and the
   * resolver can no longer affect it: it has been completed (by the mock,
   * the client, or the original server), terminated with errors, or the
   * client has disconnected.
   *
   * @example
   * api.subscription('OnCommentAdded', ({ subscription, finalize }) => {
   *   const interval = setInterval(() => subscription.publish(payload), 1000)
   *   finalize(() => clearInterval(interval))
   * })
   */
  finalize: ResponseResolverFinalizeFunction
}

export type GraphQLSubscriptionResolver<
  Query extends GraphQLQuery = GraphQLQuery,
  Variables extends GraphQLVariables = GraphQLVariables,
> = (info: GraphQLSubscriptionResolverInfo<Query, Variables>) => void

export interface GraphQLSubscriptionHandlerOptions {
  /**
   * Mark this handler as used after its first match.
   * Used handlers do not match subsequent subscriptions.
   */
  once?: boolean
}

/**
 * A WebSocket handler intercepting GraphQL subscriptions by their
 * operation name. Matching and resolution are delegated to it by the
 * subscription transport (its sibling handler) so the first matching
 * handler wins, respecting runtime handler overrides.
 */
export class GraphQLSubscriptionHandler<
  Query extends GraphQLQuery = GraphQLQuery,
  Variables extends GraphQLVariables = GraphQLVariables,
> extends WebSocketHandler {
  public info: GraphQLHandlerInfo
  public isUsed: boolean

  readonly #operationName: string | RegExp
  readonly #transport: GraphQLSubscriptionTransportHandler
  readonly #resolver: GraphQLSubscriptionResolver<Query, Variables>
  readonly #options: GraphQLSubscriptionHandlerOptions

  constructor(args: {
    url: Path
    operationName: GraphQLSubscriptionName<Query, Variables>
    transport: GraphQLSubscriptionTransportHandler
    resolver: GraphQLSubscriptionResolver<Query, Variables>
    options?: GraphQLSubscriptionHandlerOptions
  }) {
    super(args.url)

    // Create the same GraphQL handler info as request-based GraphQL
    // handlers so this handler prints nicely during introspection
    // (e.g. `server.listHandlers()`). This also normalizes `DocumentNode`
    // and typed document predicates to plain operation names.
    this.info = GraphQLHandler.parseGraphQLRequestInfo({
      operationType: OperationTypeNode.SUBSCRIPTION,
      predicate: args.operationName,
      url: args.url,
    })

    const { operationName } = this.info

    invariant(
      typeof operationName !== 'function' && !isDocumentNode(operationName),
      'Failed to create a GraphQL subscription handler: custom predicates are not supported for subscriptions',
    )

    this.#operationName = operationName
    this.#transport = args.transport
    this.#resolver = args.resolver
    this.#options = args.options || {}
    this.isUsed = false
  }

  public reset(): void {
    this.isUsed = false
  }

  /**
   * @note Individual subscription handlers stay silent. The subscription
   * transport owns the GraphQL-aware logging for the entire connection
   * (a logger is attached once per matching handler otherwise).
   */
  public log(): () => void {
    return function detachLogger() {}
  }

  protected [kConnect](connection: WebSocketHandlerConnection): boolean {
    this.#transport.subscribe(connection, this, (args) => {
      return this.#handleSubscribe(connection, args)
    })

    return true
  }

  #handleSubscribe(
    connection: WebSocketHandlerConnection,
    args: {
      node: ParsedGraphQLQuery
      message: GraphQLWebSocketSubscribeMessage
    },
  ): boolean {
    if (this.#options.once && this.isUsed) {
      return false
    }

    const { operationName } = args.node

    if (!operationName || !this.#matchesOperationName(operationName)) {
      return false
    }

    this.isUsed = true

    const subscription = new GraphQLSubscription<Query, Variables>({
      message: args.message,
      clientId: connection.client.id,
      transport: this.#transport,
    })

    this.#resolver({
      params: connection.params,
      operationName,
      subscription,
      finalize: (cleanup) => {
        this.#transport.finalize({
          clientId: connection.client.id,
          subscriptionId: subscription.id,
          cleanup,
        })
      },
    })

    return true
  }

  #matchesOperationName(operationName: string): boolean {
    if (this.#operationName instanceof RegExp) {
      return this.#operationName.test(operationName)
    }

    return this.#operationName === operationName
  }
}

/**
 * Representation of the intercepted GraphQL subscription.
 */
export class GraphQLSubscription<
  Query extends GraphQLQuery = GraphQLQuery,
  Variables extends GraphQLVariables = GraphQLVariables,
> {
  public id: string
  public query: string
  public variables: Variables
  public extensions?: Record<string, unknown>

  readonly #message: GraphQLWebSocketSubscribeMessage
  readonly #clientId: string
  readonly #transport: GraphQLSubscriptionTransportHandler

  constructor(args: {
    message: GraphQLWebSocketSubscribeMessage
    clientId: string
    transport: GraphQLSubscriptionTransportHandler
  }) {
    this.id = args.message.id
    this.query = args.message.payload.query
    this.variables = (args.message.payload.variables || {}) as Variables
    this.extensions = args.message.payload.extensions

    this.#message = args.message
    this.#clientId = args.clientId
    this.#transport = args.transport
  }

  /**
   * Publish an execution result to the subscribed client.
   *
   * @example
   * subscription.publish({
   *   data: {
   *     postAdded: {
   *       id: 'abc-123'
   *     }
   *   }
   * })
   */
  public publish(payload: GraphQLSubscriptionPayload<Query>): void {
    this.#transport.publish({
      clientId: this.#clientId,
      subscriptionId: this.id,
      payload,
    })
  }

  /**
   * Use the given `Iterable` or `AsyncIterable` as the source
   * of data for this subscription. Whenever the iterable yields a
   * value, it gets published to this subscription.
   *
   * @example
   * subscription.from(async function* () {
   *   yield { text: 'hello world' }
   * })
   */
  public async from(
    source: Iterable<Query> | AsyncIterable<Query>,
  ): Promise<void> {
    for await (const data of source) {
      this.publish({ data })
    }
  }

  /**
   * Terminate this subscription with the given errors.
   *
   * @example
   * subscription.error([{ message: 'Something went wrong' }])
   */
  public error(errors: ReadonlyArray<Partial<GraphQLError>>): void {
    this.#transport.error({
      clientId: this.#clientId,
      subscriptionId: this.id,
      errors,
    })
  }

  /**
   * Marks this subscription as complete.
   *
   * @example
   * subscription.complete()
   */
  public complete(): void {
    this.#transport.complete({
      clientId: this.#clientId,
      subscriptionId: this.id,
    })
  }

  /**
   * Perform this GraphQL subscription as-is.
   * This establishes a connection to the actual server, replays
   * the intercepted subscription, and forwards the server payloads
   * to the GraphQL client. You can intercept, modify, or prevent
   * any of the original server messages.
   *
   * @example
   * const postAddedSubscription = subscription.passthrough()
   * postAddedSubscription.addEventListener('next', (event) => {
   *   event.preventDefault()
   *   event.data.payload.data.postAdded.id = 'mock-id'
   *   subscription.publish(event.data.payload)
   * })
   */
  public passthrough(): GraphQLPassthroughSubscription {
    const connection = this.#transport.getConnection(this.#clientId)

    /**
     * @note One can only call this method inside the GraphQL subscription
     * handler. By that point, the WebSocket connection has been established
     * and intercepted so the connection reference is guaranteed.
     */
    invariant(
      connection,
      'Failed to passthrough the GraphQL subscription ("%s"): the underlying WebSocket connection is closed',
      this.query,
    )

    return new GraphQLPassthroughSubscription({
      server: connection.server,
      message: this.#message,
      upstreamSession: ensureUpstreamSession(connection),
      onTerminate: () => {
        this.#transport.endSubscription({
          clientId: this.#clientId,
          subscriptionId: this.id,
        })
      },
    })
  }
}

export type GraphQLPassthroughSubscriptionEventMap = {
  connection_ack: TypedEvent
  next: TypedEvent<GraphQLWebSocketNextMessage>
  error: TypedEvent<GraphQLWebSocketErrorMessage>
  complete: TypedEvent<GraphQLWebSocketCompleteMessage>
}

/**
 * Representation of a GraphQL subscription to the actual server.
 * You interface with this object from the client's perspective.
 */
export class GraphQLPassthroughSubscription {
  readonly #server: WebSocketServerConnectionProtocol
  readonly #message: GraphQLWebSocketSubscribeMessage
  readonly #emitter: Emitter<GraphQLPassthroughSubscriptionEventMap>
  readonly #abortController: AbortController
  readonly #onTerminate: () => void

  constructor(args: {
    server: WebSocketServerConnectionProtocol
    message: GraphQLWebSocketSubscribeMessage
    upstreamSession: Promise<void>
    onTerminate: () => void
  }) {
    this.#server = args.server
    this.#message = args.message
    this.#onTerminate = args.onTerminate
    this.#emitter = new Emitter()

    // An abort controller responsible for removing the server event
    // listeners once the subscription is unsubscribed.
    this.#abortController = new AbortController()

    // Replay this subscription once the shared upstream session is
    // established, so the server can authorize this client first.
    args.upstreamSession.then(() => {
      if (!this.#abortController.signal.aborted) {
        this.#server.send(JSON.stringify(this.#message))
      }
    })

    this.#server.addEventListener(
      'message',
      (event) => {
        const message =
          parseGraphQLWebSocketMessage<GraphQLWebSocketServerMessage>(
            event.data,
          )

        if (!message) {
          return
        }

        switch (message.type) {
          case 'connection_ack': {
            event.preventDefault()
            this.#emitter.emit(new TypedEvent('connection_ack'))
            break
          }

          case 'next': {
            if (message.id !== this.#message.id) {
              break
            }

            const nextEvent = new TypedEvent('next', { data: message })
            this.#emitter.emit(nextEvent)

            if (nextEvent.defaultPrevented) {
              event.preventDefault()
            }

            break
          }

          case 'error': {
            if (message.id !== this.#message.id) {
              break
            }

            const errorEvent = new TypedEvent('error', { data: message })
            this.#emitter.emit(errorEvent)

            if (errorEvent.defaultPrevented) {
              event.preventDefault()
              break
            }

            // The original server terminated the subscription and that
            // frame reaches the client, so the subscription ends here.
            // A prevented frame means the mock took over instead.
            this.#onTerminate()
            break
          }

          case 'complete': {
            if (message.id !== this.#message.id) {
              break
            }

            const completeEvent = new TypedEvent('complete', { data: message })
            this.#emitter.emit(completeEvent)

            if (completeEvent.defaultPrevented) {
              event.preventDefault()
              break
            }

            this.#onTerminate()
            break
          }
        }
      },
      { signal: this.#abortController.signal },
    )
  }

  /**
   * Add an event listener to the given GraphQL subscription event.
   *
   * @example
   * const onPostAddedSubscription = subscription.passthrough()
   * onPostAddedSubscription.addEventListener('next', (event) => {
   *   console.log(event.data)
   *   // { id, payload, ... }
   * })
   */
  public addEventListener<
    EventType extends keyof GraphQLPassthroughSubscriptionEventMap & string,
  >(
    event: EventType,
    listener: Emitter.Listener<
      Emitter<GraphQLPassthroughSubscriptionEventMap>,
      EventType
    >,
  ): void {
    this.#emitter.on(event, listener, {
      signal: this.#abortController.signal,
    })
  }

  /**
   * Unsubscribe from this passthrough GraphQL subscription.
   * This stops this subscription on the original server.
   *
   * @note Unsubscribing from the original subscription has no
   * effect on the intercepted `subscription` object.
   *
   * @example
   * const onPostAddedSubscription = subscription.passthrough()
   * onPostAddedSubscription.unsubscribe()
   */
  public unsubscribe(): void {
    this.#abortController.abort()
    this.#emitter.removeAllListeners()

    /**
     * @note Complete this subscription instead of closing the server
     * connection. That connection is shared by every subscription of
     * this client, and closing it would terminate the unrelated ones.
     */
    this.#server.send(createCompleteMessage({ id: this.#message.id }))
  }
}

function logGraphQLFrame(args: {
  color: string
  label: string
  payload?: unknown
}): void {
  const timestamp = getTimestamp({ milliseconds: true })

  if (typeof args.payload === 'undefined') {
    // eslint-disable-next-line no-console
    console.log(
      devUtils.formatMessage(`${timestamp} %c${args.label}%c`),
      `color:${args.color}`,
      'color:inherit',
    )
    return
  }

  console.groupCollapsed(
    devUtils.formatMessage(`${timestamp} %c${args.label}%c`),
    `color:${args.color}`,
    'color:inherit',
  )
  // eslint-disable-next-line no-console
  console.log(args.payload)
  console.groupEnd()
}

/**
 * Attach a GraphQL-aware logger to the intercepted WebSocket connection.
 * Unlike the raw WebSocket logger, this logger prints parsed
 * `graphql-transport-ws` frames relevant to the subscription.
 */
function attachGraphQLSubscriptionLogger(
  connection: WebSocketConnectionData,
): () => void {
  const { client } = connection
  const abortController = new AbortController()

  logGraphQLFrame({
    color: colors.system,
    label: `GraphQL subscription connection ${toPublicUrl(client.url)}`,
  })

  client.addEventListener(
    'message',
    (event) => {
      const message =
        parseGraphQLWebSocketMessage<GraphQLWebSocketClientMessage>(event.data)

      if (!message) {
        return
      }

      switch (message.type) {
        case 'subscribe': {
          logGraphQLFrame({
            color: colors.outgoing,
            label: `subscribe (id: ${message.id})`,
            payload: message.payload,
          })
          break
        }

        case 'complete': {
          logGraphQLFrame({
            color: colors.outgoing,
            label: `complete (id: ${message.id})`,
          })
          break
        }
      }
    },
    { signal: abortController.signal },
  )

  // Proxy `client.send` to log the frames published to the client
  // (`client.send` does not dispatch any observable events).
  const originalClientSend = client.send

  client.send = new Proxy(client.send, {
    apply: (target, thisArg, args) => {
      const [data] = args
      const message =
        parseGraphQLWebSocketMessage<GraphQLWebSocketServerMessage>(data)

      if (message) {
        switch (message.type) {
          case 'next': {
            logGraphQLFrame({
              color: colors.mocked,
              label: `next (id: ${message.id})`,
              payload: message.payload,
            })
            break
          }

          case 'error': {
            logGraphQLFrame({
              color: colors.mocked,
              label: `error (id: ${message.id})`,
              payload: message.payload,
            })
            break
          }

          case 'complete': {
            logGraphQLFrame({
              color: colors.mocked,
              label: `complete (id: ${message.id})`,
            })
            break
          }
        }
      }

      return Reflect.apply(target, thisArg, args)
    },
  })

  return function detachLogger() {
    abortController.abort()
    client.send = originalClientSend
  }
}

export type GraphQLSubscriptionHandlerFactory = <
  Query extends GraphQLQuery = GraphQLQuery,
  Variables extends GraphQLVariables = GraphQLVariables,
>(
  operationName: GraphQLSubscriptionName<Query, Variables>,
  resolver: GraphQLSubscriptionResolver<Query, Variables>,
  options?: GraphQLSubscriptionHandlerOptions,
) => GraphQLSubscriptionHandler<Query, Variables>

/**
 * Create a `subscription()` handler factory bound to the given GraphQL
 * endpoint. All subscription handlers created by the factory share a single
 * subscription transport and a single WebSocket upgrade handler, both
 * attached to each handler as siblings.
 *
 * @example
 * const subscription = createGraphQLSubscriptionHandler('https://api.example.com/graphql')
 * subscription('OnPostAdded', ({ subscription }) => {
 *   subscription.publish({ data: { postAdded: { id: 'abc-123' } } })
 * })
 */
export function createGraphQLSubscriptionHandler(
  url: Path,
): GraphQLSubscriptionHandlerFactory {
  const webSocketUrl =
    typeof url === 'string' ? url.replace(/^http/, 'ws') : url

  const transport = new GraphQLSubscriptionTransportHandler(webSocketUrl)

  // The `upgrade` request handler enables WebSocket interception in Node.js.
  // The same handler instance is shared between all subscription handlers
  // of this endpoint (sibling handlers are deduped by reference).
  const upgradeHandler = http.get(({ request }) => {
    return (
      request.headers.get('upgrade')?.toLowerCase() === 'websocket' &&
      matchRequestUrl(new URL(resolveWebSocketUrl(request.url)), webSocketUrl)
        .matches
    )
  }, ws.onUpgrade)

  return (operationName, resolver, options) => {
    const handler = new GraphQLSubscriptionHandler({
      url: webSocketUrl,
      operationName,
      transport,
      resolver,
      options,
    })

    return attachSiblingHandlers(handler, [transport, upgradeHandler])
  }
}
