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
  publish: (payload: { data?: Record<string, unknown> }) => void
}

export class GraphQLInternalPubsub {
  public pubsub: GraphQLPubsub
  public webSocketLink: WebSocketLink
  private subscriptions: Set<string>

  constructor(public readonly url: Path) {
    this.subscriptions = new Set()

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

          const message = jsonParse(event.data)

          if (!message) {
            return
          }

          switch (message.type) {
            case 'connection_init': {
              client.send(JSON.stringify({ type: 'connection_ack' }))
              break
            }

            case 'subscribe': {
              this.subscriptions.add(message.id)
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
      publish: (payload) => {
        for (const subscriptionId of this.subscriptions) {
          this.webSocketLink.broadcast(
            this.createSubscriptionMessage({
              id: subscriptionId,
              payload,
            }),
          )
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

export type GraphQLSubscriptionHandler = <
  Query extends GraphQLQuery = GraphQLQuery,
  Variables extends GraphQLVariables = GraphQLVariables,
>(
  operationName:
    | GraphQLHandlerNameSelector
    | DocumentNode
    | TypedDocumentNode<Query, Variables>,
  resolver: (info: GraphQLSubscriptionHandlerInfo<Variables>) => void,
) => WebSocketHandler

export interface GraphQLSubscriptionHandlerInfo<
  Variables extends GraphQLVariables,
> {
  operationName: string
  query: string
  variables: Variables
}

export function createGraphQLSubscriptionHandler(
  webSocketLink: WebSocketLink,
): GraphQLSubscriptionHandler {
  return (operationName, resolver) => {
    const webSocketHandler = webSocketLink.addEventListener(
      'connection',
      ({ client }) => {
        client.addEventListener('message', async (event) => {
          if (typeof event.data !== 'string') {
            return
          }

          const message = jsonParse(event.data)

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
              /**
               * @todo Add the path parameters from the pubsub URL.
               */
              resolver({
                operationName: node.operationName,
                query: message.payload.query,
                variables: message.payload.variables,
              })
            }
          }
        })
      },
    )

    return webSocketHandler
  }
}
