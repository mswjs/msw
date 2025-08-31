import { invariant } from 'outvariant'
import { Emitter } from 'rettime'
import { OperationTypeNode } from 'graphql'
import type { WebSocketServerConnectionProtocol } from '@mswjs/interceptors/WebSocket'
import {
  GraphQLHandler,
  type GraphQLHandlerInfo,
  type GraphQLHandlerNameSelector,
  type GraphQLQuery,
  type GraphQLVariables,
} from './GraphQLHandler'
import type { Path, PathParams } from '../utils/matching/matchRequestUrl'
import { parseDocumentNode } from '../utils/internal/parseGraphQLRequest'
import { type WebSocketLink, ws } from '../ws'
import {
  WebSocketHandler,
  WebSocketHandlerConnection,
  WebSocketResolutionContext,
} from './WebSocketHandler'
import { jsonParse } from '../utils/internal/jsonParse'
import type { TypedDocumentNode } from '../graphql'
import { isObject } from '../utils/internal/isObject'

export interface GraphQLPubSub {
  /**
   * A WebSocket handler associated with this pubsub.
   */
  handler: WebSocketHandler

  /**
   * Publishes the given payload to all GraphQL subscriptions.
   */
  publish: (
    payload: { data?: Record<string, unknown> | null },
    predicate?: (args: {
      subscription: GraphQLWebSocketSubscribeMessage
    }) => boolean,
  ) => void
}

type GraphQLWebSocketInitMessage = {
  type: 'connection_init'
}

type GraphQLWebSocketSubscribeMessage = {
  type: 'subscribe'
  id: string
  payload: GraphQLWebSocketSubscribeMessagePayload
}

type GraphQLWebSocketCompleteMessage = {
  type: 'complete'
  id: string
}

type GraphQLWebSocketOutgoingMessage =
  | GraphQLWebSocketInitMessage
  | GraphQLWebSocketSubscribeMessage
  | GraphQLWebSocketCompleteMessage

type GraphQLWebSocketAcknowledgeMessage = {
  type: 'connection_ack'
}

type GraphQLWebSocketNextMessage = {
  type: 'next'
  id: string
  payload: unknown
}

type GraphQLSubscriptionIncomingMessage =
  | GraphQLWebSocketAcknowledgeMessage
  | GraphQLWebSocketNextMessage

interface GraphQLWebSocketSubscribeMessagePayload<
  Variables extends GraphQLVariables = GraphQLVariables,
> {
  query: string
  variables: Variables
  extensions: Array<unknown>
}

export class GraphQLInternalPubSub {
  public pubsub: GraphQLPubSub
  public webSocketLink: WebSocketLink
  public server?: WebSocketServerConnectionProtocol

  private subscriptions: Map<string, GraphQLWebSocketSubscribeMessage>

  constructor(public readonly url: Path) {
    this.subscriptions = new Map()

    // Translate the HTTP predicate from `graphql.link()` to a WebSocket URL.
    // Preserve regular expressions.
    const webSocketUrl =
      typeof url === 'string' ? url.replace(/^http/, 'ws') : url

    this.webSocketLink = ws.link(webSocketUrl, {
      quiet: true,
    })

    const webSocketHandler = this.webSocketLink.addEventListener(
      'connection',
      ({ client, server }) => {
        this.server = server

        client.addEventListener('message', (event) => {
          if (typeof event.data !== 'string') {
            return
          }

          const message = jsonParse<GraphQLWebSocketOutgoingMessage>(event.data)

          if (!message) {
            return
          }

          switch (message.type) {
            case 'connection_init': {
              client.send(this.createAcknowledgeMessage())
              break
            }

            case 'subscribe': {
              this.subscriptions.set(message.id, message)
              break
            }

            case 'complete': {
              this.subscriptions.delete(message.id)
              break
            }
          }
        })
      },
    )

    this.pubsub = {
      handler: webSocketHandler,
      publish: (payload, predicate = () => true) => {
        for (const [, subscription] of this.subscriptions) {
          if (predicate({ subscription })) {
            this.webSocketLink.broadcast(
              this.createSubscribeMessage({
                id: subscription.id,
                payload,
              }),
            )
          }
        }
      },
    }
  }

  protected createAcknowledgeMessage() {
    return JSON.stringify({
      type: 'connection_ack',
    } satisfies GraphQLWebSocketAcknowledgeMessage)
  }

  protected createSubscribeMessage(args: { id: string; payload: unknown }) {
    return JSON.stringify({
      id: args.id,
      type: 'next',
      payload: args.payload,
    } satisfies GraphQLWebSocketNextMessage)
  }
}

/**
 * Representation of the intercepted GraphQL subscription.
 */
export class GraphQLSubscription<
  Query extends GraphQLQuery,
  Variables extends GraphQLVariables,
> {
  public id: string
  public query: string
  public variables: Variables
  public extensions: Array<unknown>

  constructor(
    private readonly args: {
      message: GraphQLWebSocketSubscribeMessage
      internalPubsub: GraphQLInternalPubSub
    },
  ) {
    this.id = args.message.id
    this.query = args.message.payload.query
    this.variables = args.message.payload.variables as Variables
    this.extensions = args.message.payload.extensions
  }

  /**
   * Uses the given `Iterable` or `AsyncIterable` as the source
   * of data for this subscription. Whenever the iterable yields
   * value, it gets published to this subscription.
   *
   * @example
   * subscription.from(async function*() {
   *   yield { text: 'hello world' }
   * })
   */
  public async from(source: Iterable<any> | AsyncIterable<any>): Promise<void> {
    for await (const data of source) {
      this.publish({ data })
    }
  }

  /**
   * Publishes data to all subscribed GraphQL clients.
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
  public publish(payload: { data?: Query }): void {
    this.args.internalPubsub.pubsub.publish(payload, ({ subscription }) => {
      return subscription.id === this.id
    })
  }

  /**
   * Marks this subscription as complete.
   *
   * @example
   * subscription.complete()
   */
  public complete(): void {
    this.args.internalPubsub.webSocketLink.broadcast(
      JSON.stringify({
        type: 'complete',
        id: this.args.message.id,
      } satisfies GraphQLWebSocketCompleteMessage),
    )
  }

  /**
   * Performs this GraphQL subscription as-is.
   * This establishes a connection to the actual server, replays
   * the intercepted subscription, and forwards the server payload
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
  public passthrough() {
    const { server } = this.args.internalPubsub

    /**
     * @note One can only call this method inside the
     * GraphQL subscription handler. By that point, the WebSocket connection
     * has been established and intercepted so the `server` reference
     * is guaranteed.
     */
    invariant(
      server,
      'Failed to passthrough GraphQL subscription ("%s") to the actual server ("%s"): `subscription.subscribe()` was called outside the subscription handler',
      this.args.message.payload.query,
      this.args.internalPubsub.url,
    )

    return new GraphQLPassthroughSubscription({
      server,
      message: this.args.message,
    })
  }
}

export type GraphQLSubscriptionName<
  Query extends GraphQLQuery,
  Variables extends GraphQLVariables,
> = GraphQLHandlerNameSelector | TypedDocumentNode<Query, Variables>

export type GraphQLSubscriptionResolver<
  Query extends GraphQLQuery = GraphQLQuery,
  Variables extends GraphQLVariables = GraphQLVariables,
> = (info: GraphQLSubscriptionResolverInfo<Query, Variables>) => void

export type GraphQLSubscriptionHandlerFactory = <
  Query extends GraphQLQuery = GraphQLQuery,
  Variables extends GraphQLVariables = GraphQLVariables,
>(
  operationName: GraphQLSubscriptionName<Query, Variables>,
  resolver: GraphQLSubscriptionResolver<Query, Variables>,
) => GraphQLSubscriptionHandler<Query, Variables>

export interface GraphQLSubscriptionResolverInfo<
  Query extends GraphQLQuery,
  Variables extends GraphQLVariables,
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
}

export class GraphQLSubscriptionHandler<
  Query extends GraphQLQuery,
  Variables extends GraphQLVariables,
> extends WebSocketHandler {
  public info: GraphQLHandlerInfo

  protected subscriptionHandler: WebSocketHandler

  constructor(
    readonly operationName: GraphQLSubscriptionName<Query, Variables>,
    protected readonly pubsub: GraphQLInternalPubSub,
    protected readonly resolver: GraphQLSubscriptionResolver<Query, Variables>,
  ) {
    super(pubsub.webSocketLink.url, {
      /**
       * @todo ???
       */
    })

    // Create the same GraphQL handler info from the subscription.
    // This will help with printing this handler in the console when debugging.
    // We would otherwise extend the `GraphQLHandler` class, but subscriptions
    // are WebSockets, not HTTP requests.
    this.info = GraphQLHandler.parseGraphQLRequestInfo({
      operationType: OperationTypeNode.SUBSCRIPTION,
      predicate: operationName,
      url: this.url,
    })

    this.subscriptionHandler = this.pubsub.webSocketLink.addEventListener(
      'connection',
      ({ params, client }) => {
        client.addEventListener('message', async (event) => {
          if (typeof event.data !== 'string') {
            return
          }

          const message = jsonParse<GraphQLWebSocketOutgoingMessage>(event.data)

          if (
            isObject(message) &&
            'type' in message &&
            message.type === 'subscribe'
          ) {
            const { parse } = await import('graphql')
            const document = parse(message.payload.query)
            const node = parseDocumentNode(document)

            if (
              node.operationType === OperationTypeNode.SUBSCRIPTION &&
              node.operationName === this.operationName
            ) {
              const subscription = new GraphQLSubscription<any, any>({
                message,
                internalPubsub: this.pubsub,
              })

              this.resolver({
                params,
                operationName: node.operationName,
                subscription,
              })
            }
          }
        })
      },
    )
  }

  public async run(
    connection: Omit<WebSocketHandlerConnection, 'params'>,
    resolutionContext?: WebSocketResolutionContext,
  ): Promise<boolean> {
    /**
     * @note `GraphQLSubscriptionHandler` is a WebSocket handler that
     * inherits the URL from the underlying WebSocket link. This inheritance
     * makes it of the correct "__kind" to participate in WebSocket interception
     *
     * Once MSW matches a WebSocket connection against it,
     * instead of executing the handler itself, propagate the connection
     * to the WebSocket link and the subscription handler.
     */
    const pubsubResult = await this.pubsub.pubsub.handler.run(
      connection,
      resolutionContext,
    )
    const handlerResult = await this.subscriptionHandler.run(
      connection,
      resolutionContext,
    )

    return pubsubResult && handlerResult
  }

  // async [kDispatchEvent](
  //   event: MessageEvent<WebSocketConnectionData>,
  // ): Promise<void> {}
}

export function createGraphQLSubscriptionHandler(
  internalPubsub: GraphQLInternalPubSub,
): GraphQLSubscriptionHandlerFactory {
  return (operationName, resolver) => {
    return new GraphQLSubscriptionHandler(
      operationName,
      internalPubsub,
      resolver,
    )
  }
}

type GraphQLPassthroughSubscriptionEventMap = {
  connection_ack: never
  next: [GraphQLWebSocketNextMessage]
}

/**
 * Representation of a GraphQL subscription to the actual server.
 * You interface with this object from the client's perspective.
 */
class GraphQLPassthroughSubscription {
  protected readonly server: WebSocketServerConnectionProtocol

  private emitter: Emitter<GraphQLPassthroughSubscriptionEventMap>
  private abortController: AbortController

  constructor(
    readonly args: {
      server: WebSocketServerConnectionProtocol
      message: GraphQLWebSocketSubscribeMessage
    },
  ) {
    this.emitter = new Emitter()

    // An abort controller responsible for removing the server event listeners
    // once the subscription is unsubscribed.
    this.abortController = new AbortController()
    this.server = args.server

    this.server.connect()
    this.server.addEventListener(
      'open',
      () => {
        // Once the WebSocket server connection is established, send the
        // client connection prompt to the server. This lets the server
        // connect and authorize this client.
        this.server.send(
          JSON.stringify({
            type: 'connection_init',
          } satisfies GraphQLWebSocketInitMessage),
        )
      },
      { signal: this.abortController.signal },
    )

    this.server.addEventListener(
      'message',
      (event) => {
        if (typeof event.data !== 'string') {
          return
        }

        const message = jsonParse<GraphQLSubscriptionIncomingMessage>(
          event.data,
        )
        if (!message) {
          return
        }

        switch (message.type) {
          case 'connection_ack': {
            this.emitter.emit('connection_ack')

            // Once the GraphQL server acknowledges the connection, send the
            // subscription intent message. This is the same message as
            // was sent from the GraphQL client.
            this.server.send(JSON.stringify(args.message))
            break
          }

          case 'next': {
            const nextEvent = this.emitter.createEvent('next', message)
            this.emitter.emit(nextEvent)

            if (nextEvent.defaultPrevented) {
              event.preventDefault()
            }

            break
          }
        }
      },
      {
        signal: this.abortController.signal,
      },
    )
  }

  /**
   * Adds event listener to the given GraphQL subscription event.
   *
   * @example
   * const onPostAddedSubscription = subscription.passthrough()
   * onPostAddedSubscription.addEventListener('next', (event) => {
   *   console.log(event.data)
   *   // { id, payload, ... }
   * })
   */
  public addEventListener<
    Type extends keyof GraphQLPassthroughSubscriptionEventMap & string,
  >(
    event: Type,
    listener: Emitter.ListenerType<
      typeof this.emitter,
      Type,
      GraphQLPassthroughSubscriptionEventMap
    >,
  ) {
    this.emitter.on(event, listener, {
      signal: this.abortController.signal,
    })
  }

  /**
   * Unsubscribes from this passthrough GraphQL subscription.
   * This closes the underlying server connection.
   *
   * @note Unsubscribing from the original subscription has no
   * effect on the intercepted `subscription` object.
   *
   * @example
   * const onPostAddedSubscription = subscription.passthrough()
   * onPostAddedSubscription.unsubscribe()
   */
  public unsubscribe(): void {
    // Remove internal listeners on the server object.
    this.abortController.abort()

    // Remove user-defined listeners.
    this.emitter.removeAllListeners()

    // Serve the WebSocket connection.
    this.server.close()
  }
}
