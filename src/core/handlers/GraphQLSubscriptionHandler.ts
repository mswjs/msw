import { DocumentNode, OperationTypeNode } from 'graphql'
import type {
  GraphQLHandlerNameSelector,
  GraphQLQuery,
  GraphQLVariables,
} from './GraphQLHandler'
import type { Path } from '../utils/matching/matchRequestUrl'
import { parseDocumentNode } from '../utils/internal/parseGraphQLRequest'
import { WebSocketLink, ws } from '../ws'
import { WebSocketHandler } from './WebSocketHandler'
import { jsonParse } from '../utils/internal/jsonParse'
import type { TypedDocumentNode } from '../graphql'

export interface GraphQLPubsub {
  /**
   * A WebSocket handler to intercept GraphQL subscription events.
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

    /**
     * @fixme This isn't nice.
     * This is here to translate HTTP URLs from `graphql.link` to a WS URL.
     * Works for strings but won't work for RegExp.
     */
    const webSocketUrl =
      typeof url === 'string' ? url.replace(/^http/, 'ws') : url

    /**
     * @todo Support `log: false` not to print logs from the underlying WS handler.
     */
    this.webSocketLink = ws.link(webSocketUrl)

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
              client.send(JSON.stringify({ type: 'connection_ack' }))
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
              this.createSubscriptionMessage({
                id: subscription.id,
                payload,
              }),
            )
          }
        }
      },
    }
  }

  private createSubscriptionMessage(args: { id: string; payload: unknown }) {
    return JSON.stringify({
      id: args.id,
      type: 'next',
      payload: args.payload,
    })
  }
}

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
   * @param {Query} payload Data to publish.
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

export type GraphQLSubscriptionHandler = <
  Query extends GraphQLQuery = GraphQLQuery,
  Variables extends GraphQLVariables = GraphQLVariables,
>(
  operationName:
    | GraphQLHandlerNameSelector
    | DocumentNode
    | TypedDocumentNode<Query, Variables>,
  resolver: (info: GraphQLSubscriptionHandlerInfo<Query, Variables>) => void,
) => WebSocketHandler

export interface GraphQLSubscriptionHandlerInfo<
  Query extends GraphQLQuery,
  Variables extends GraphQLVariables,
> {
  operationName: string

  /**
   * An object representing the intercepted GraphQL subscription.
   */
  subscription: GraphQLSubscription<Query, Variables>
}

export function createGraphQLSubscriptionHandler(
  internalPubsub: GraphQLInternalPubsub,
): GraphQLSubscriptionHandler {
  return (operationName, resolver) => {
    const webSocketHandler = internalPubsub.webSocketLink.addEventListener(
      'connection',
      ({ client }) => {
        client.addEventListener('message', async (event) => {
          if (typeof event.data !== 'string') {
            return
          }

          const message = jsonParse<GraphQLWebSocketOutgoingMessage>(event.data)

          if (
            message != null &&
            'type' in message &&
            message.type === 'subscribe'
          ) {
            const { parse } = await import('graphql')
            const document = parse(message.payload.query)
            const node = parseDocumentNode(document)

            if (
              node.operationType === OperationTypeNode.SUBSCRIPTION &&
              node.operationName === operationName
            ) {
              const subscription = new GraphQLSubscription<any, any>({
                message,
                internalPubsub,
              })

              /**
               * @todo Add the path parameters from the pubsub URL.
               */
              resolver({
                operationName: node.operationName,
                subscription,
              })
            }
          }
        })
      },
    )

    return webSocketHandler
  }
}
