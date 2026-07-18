import { TypedEvent } from 'rettime'

export interface GraphQLSubscriptionEventInit {
  operationName: string
  query: string
  variables: Record<string, unknown>
  request: Request
}

/**
 * Emitted when a GraphQL subscription is established over an
 * intercepted WebSocket connection (i.e. matched by a subscription
 * handler and resolved).
 *
 * @note The event is referenced by the WebSocket frame event map so
 * the life-cycle event emitters derived from it (e.g. `server.events`)
 * are typed correctly. It lives in its own module so the emitting
 * `msw/graphql` module doesn't pull the entire frame graph, and the
 * core stays free of the `graphql` dependency (the event carries
 * plain data only).
 */
export class GraphQLSubscriptionEvent extends TypedEvent<
  void,
  void,
  'graphql:subscription'
> {
  public readonly operationName: string
  public readonly query: string
  public readonly variables: Record<string, unknown>
  public readonly request: Request

  constructor(init: GraphQLSubscriptionEventInit) {
    super('graphql:subscription')
    this.operationName = init.operationName
    this.query = init.query
    this.variables = init.variables
    this.request = init.request
  }
}
