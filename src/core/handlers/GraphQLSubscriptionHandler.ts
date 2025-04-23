import { OperationTypeNode } from 'graphql'
import type {
  GraphQLHandlerNameSelector,
  GraphQLQuery,
  GraphQLVariables,
} from './GraphQLHandler'
import type { Path, PathParams } from '../utils/matching/matchRequestUrl'
import { parseDocumentNode } from '../utils/internal/parseGraphQLRequest'
import { WebSocketLink, ws } from '../ws'
import { WebSocketHandler } from './WebSocketHandler'
import { jsonParse } from '../utils/internal/jsonParse'
import type { TypedDocumentNode } from '../graphql'
import { BatchHandler } from './BatchHandler'
import { createRequestId } from '@mswjs/interceptors'

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

const kPubSubHandlerAdded = Symbol('pubsubHandlerAdded')

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
  params: PathParams
  operationName: string

  /**
   * Intercepted GraphQL subscription.
   */
  subscription: GraphQLSubscription<Query, Variables>
}

interface GraphQLSubscriptionHandlerArgs<
  Query extends GraphQLQuery,
  Variables extends GraphQLVariables,
> {
  info: GraphQLSubscriptionHandlerInfo<Query, Variables>
  pubsub: GraphQLInternalPubsub
  resolver: GraphQLSubscriptionResolver<any, any>
}

interface GraphQLSubscriptionHandlerInfo<
  Query extends GraphQLQuery,
  Variables extends GraphQLVariables,
> {
  header: string
  operationName: GraphQLSubscriptionName<Query, Variables>
}

export class GraphQLSubscriptionHandler<
  Query extends GraphQLQuery,
  Variables extends GraphQLVariables,
  /**
   * @fixme This CANNOT be a batch handler.
   * I'm not sure a batch handler is a good concept overall.
   * It "unfolds" its entries, making it super unclear who
   * actually originated them. Consider "fallthrough" WebSocket handler here.
   */
> extends BatchHandler {
  public id: string
  public info: GraphQLSubscriptionHandlerInfo<Query, Variables>

  constructor(
    private readonly args: GraphQLSubscriptionHandlerArgs<Query, Variables>,
  ) {
    const subscriptionHandler = args.pubsub.webSocketLink.addEventListener(
      'connection',
      ({ params, client }) => {
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
              node.operationName === args.info.operationName
            ) {
              const subscription = new GraphQLSubscription<any, any>({
                message,
                internalPubsub: args.pubsub,
              })

              args.resolver({
                params,
                operationName: node.operationName,
                subscription,
              })
            }
          }
        })
      },
    )

    const isPubsubHandlerAdded = Reflect.get(
      args.pubsub.pubsub.handler,
      kPubsubHandlerAdded,
    )

    // Skip adding the internal pubsub WebSocket handler if it was already added.
    //  We only need that handler once, and there's no need to pollute the handlers.
    if (isPubsubHandlerAdded) {
      super([subscriptionHandler])
    } else {
      super([args.pubsub.pubsub.handler, subscriptionHandler])

      /**
       * @todo @fixme This will NOT reset on `.resetHandlers()`,
       * breaking the subscriptions interception.
       */
      Reflect.set(args.pubsub.pubsub.handler, kPubSubHandlerAdded, true)
    }

    this.id = createRequestId()
    this.info = args.info
  }
}

function getDisplayOperationName(
  _operationName: GraphQLSubscriptionName<any, any>,
): string {
  /**
   * @todo
   */
  return '???'
}

const kPubsubHandlerAdded = Symbol('pubsubHandlerAdded')

export function createGraphQLSubscriptionHandler(
  internalPubsub: GraphQLInternalPubsub,
): GraphQLSubscriptionHandlerFactory {
  return (operationName, resolver) => {
    return new GraphQLSubscriptionHandler({
      /**
       * @fixme Remove this and instead add `info` support to
       * BatchHandler. Fill in the values in GraphQLSubscriptionHandler.
       */
      info: {
        header: getDisplayOperationName(operationName),
        operationName,
      },
      pubsub: internalPubsub,
      resolver,
    })
  }
}
