import { OperationTypeNode } from 'graphql'
import type { WebSocketConnectionData } from '@mswjs/interceptors/WebSocket'
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
import { kDispatchEvent, WebSocketHandler } from './WebSocketHandler'
import { jsonParse } from '../utils/internal/jsonParse'
import type { TypedDocumentNode } from '../graphql'
import { isObject } from '../utils/internal/isObject'

export interface GraphQLPubsub {
  /**
   * A WebSocket handler associated with this pubsub.
   */
  handler: WebSocketHandler

  /**
   * Publishes the given payload to all GraphQL subscriptions.
   */
  publish: (
    payload: { data?: Record<string, unknown> },
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

interface GraphQLWebSocketSubscribeMessagePayload<
  Variables extends GraphQLVariables = GraphQLVariables,
> {
  query: string
  variables: Variables
  extensions: Array<unknown>
}

export class GraphQLInternalPubsub {
  public pubsub: GraphQLPubsub
  public webSocketLink: WebSocketLink
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
      ({ client }) => {
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

  private createAcknowledgeMessage() {
    return JSON.stringify({
      type: 'connection_ack',
    } satisfies GraphQLWebSocketAcknowledgeMessage)
  }

  private createSubscribeMessage(args: { id: string; payload: unknown }) {
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
      internalPubsub: GraphQLInternalPubsub
    },
  ) {
    this.id = args.message.id
    this.query = args.message.payload.query
    this.variables = args.message.payload.variables as Variables
    this.extensions = args.message.payload.extensions
  }

  /**
   * Publishes data to this subscription.
   */
  public publish(payload: { data?: Query }): void {
    this.args.internalPubsub.pubsub.publish(payload, ({ subscription }) => {
      return subscription.id === this.id
    })
  }

  /**
   * Marks this subscription as complete.
   */
  public complete(): void {
    this.args.internalPubsub.webSocketLink.broadcast(
      JSON.stringify({
        type: 'complete',
        id: this.args.message.id,
      } satisfies GraphQLWebSocketCompleteMessage),
    )
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
    protected readonly pubsub: GraphQLInternalPubsub,
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
    this.info = GraphQLHandler.parseGraphQLRequestInfo(
      operationName,
      OperationTypeNode.SUBSCRIPTION,
      this.url,
    )

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

  async [kDispatchEvent](
    event: MessageEvent<WebSocketConnectionData>,
  ): Promise<void> {
    /**
     * @note `GraphQLSubscriptionHandler` is a WebSocket handler that
     * inherits the URL from the underlying WebSocket link. This inheritance
     * makes it of the correct "__kind" to participate in WebSocket interception
     *
     * Once MSW matches a WebSocket connection against it,
     * instead of executing the handler itself, propagate the connection
     * to the WebSocket link and the subscription handler.
     */
    await this.pubsub.pubsub.handler[kDispatchEvent](event)
    await this.subscriptionHandler[kDispatchEvent](event)
  }
}

export function createGraphQLSubscriptionHandler(
  internalPubsub: GraphQLInternalPubsub,
): GraphQLSubscriptionHandlerFactory {
  return (operationName, resolver) => {
    return new GraphQLSubscriptionHandler(
      operationName,
      internalPubsub,
      resolver,
    )
  }
}
