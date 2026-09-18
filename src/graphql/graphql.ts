import type {
  ResponseResolver,
  RequestHandlerOptions,
} from '#core/handlers/RequestHandler'
import {
  GraphQLHandler,
  type GraphQLVariables,
  type GraphQLOperationType,
  type GraphQLResolverExtras,
  type GraphQLResponseBody,
  type GraphQLQuery,
  type GraphQLPredicate,
} from './graphql-handler'
import { createRequestId } from '@mswjs/interceptors'
import { getAllRequestCookies } from '#core/utils/request/getRequestCookies'
import type { Path } from '#core/utils/matching/matchRequestUrl'
import { attachSiblingHandlers } from '#core/utils/internal/attachSiblingHandlers'
import {
  createGraphQLSubscriptionHandler,
  type GraphQLSubscriptionHandlerFactory,
} from './graphql-subscription'

export type GraphQLRequestHandler = <
  Query extends GraphQLQuery = GraphQLQuery,
  Variables extends GraphQLVariables = GraphQLVariables,
>(
  predicate: GraphQLPredicate<Query, Variables>,
  resolver: GraphQLResponseResolver<
    [Query] extends [never] ? GraphQLQuery : Query,
    Variables
  >,
  options?: RequestHandlerOptions,
) => GraphQLHandler

export type GraphQLOperationHandler = <
  Query extends GraphQLQuery = GraphQLQuery,
  Variables extends GraphQLVariables = GraphQLVariables,
>(
  resolver: GraphQLResponseResolver<
    [Query] extends [never] ? GraphQLQuery : Query,
    Variables
  >,
  options?: RequestHandlerOptions,
) => GraphQLHandler

export type GraphQLResponseResolver<
  Query extends GraphQLQuery = GraphQLQuery,
  Variables extends GraphQLVariables = GraphQLVariables,
> = ResponseResolver<
  GraphQLResolverExtras<Variables>,
  null,
  GraphQLResponseBody<[Query] extends [never] ? GraphQLQuery : Query>
>

function createScopedGraphQLHandler(
  operationType: GraphQLOperationType,
  url: Path,
): GraphQLRequestHandler {
  return (predicate, resolver, options = {}) => {
    return new GraphQLHandler(operationType, predicate, url, resolver, options)
  }
}

function createGraphQLOperationHandler(
  url: Path,
  subscriptionFactory?: GraphQLSubscriptionHandlerFactory,
): GraphQLOperationHandler {
  /**
   * @note An explicitly generic function so the subscription sibling
   * can be created with the same `Query`/`Variables` types as the
   * operation resolver, without casting its resolver info.
   */
  return <
    Query extends GraphQLQuery = GraphQLQuery,
    Variables extends GraphQLVariables = GraphQLVariables,
  >(
    resolver: GraphQLResponseResolver<
      [Query] extends [never] ? GraphQLQuery : Query,
      Variables
    >,
    options?: RequestHandlerOptions,
  ): GraphQLHandler => {
    const handler = new GraphQLHandler(
      'all',
      new RegExp('.*'),
      url,
      resolver,
      options,
    )

    if (!subscriptionFactory) {
      return handler
    }

    // Attach a catch-all subscription handler as a sibling so the
    // operation handler also matches GraphQL subscriptions over WebSocket.
    // The subscription transport guarantees only actual GraphQL
    // subscriptions are dispatched to it.
    const subscriptionCatchAllHandler = subscriptionFactory<Query, Variables>(
      new RegExp('.*'),
      ({ operationName, subscription, request, finalize }) => {
        /**
         * @note Subscriptions are resolved imperatively, so the return
         * value of the resolver is ignored. The request describes the
         * WebSocket connection this subscription is multiplexed over.
         */
        resolver({
          operationName,
          query: subscription.query,
          variables: subscription.variables,
          cookies: getAllRequestCookies(request),
          request,
          requestId: createRequestId(),
          finalize,
        })
      },
      // Forward the handler options so a one-time operation handler is
      // also consumed by the first subscription it matches.
      options,
    )

    return attachSiblingHandlers(handler, [subscriptionCatchAllHandler])
  }
}

export interface GraphQLLink {
  query: GraphQLRequestHandler
  mutation: GraphQLRequestHandler
  operation: GraphQLOperationHandler
  /**
   * Intercept a GraphQL subscription.
   *
   * @example
   * const api = graphql.link('https://api.example.com/graphql')
   * api.subscription('OnPostAdded', ({ subscription }) => {
   *   subscription.publish({
   *    data: { postAdded: { id: 'abc-123' } },
   *   })
   * })
   */
  subscription: GraphQLSubscriptionHandlerFactory
}

/**
 * A namespace to intercept and mock GraphQL operations
 *
 * @example
 * const api = graphql.link('https://api.example.com/graphql')
 * api.query('GetUser', resolver)
 * api.mutation('DeletePost', resolver)
 *
 * @see {@link https://mswjs.io/docs/api/graphql `graphql` API reference}
 */
export const graphql = {
  /**
   * Intercepts GraphQL operations scoped by the given URL.
   *
   * @example
   * const github = graphql.link('https://api.github.com/graphql')
   * github.query('GetRepo', resolver)
   *
   * @see {@link https://mswjs.io/docs/api/graphql#graphqllinkurl `graphql.link()` API reference}
   */
  link(url: Path): GraphQLLink {
    /**
     * @note Create the subscription handler factory once per link so
     * the `subscription()` and `operation()` handlers share the same
     * underlying subscription transport (deduped by reference).
     */
    const subscription = createGraphQLSubscriptionHandler(url)

    return {
      operation: createGraphQLOperationHandler(url, subscription),
      query: createScopedGraphQLHandler('query', url),
      mutation: createScopedGraphQLHandler('mutation', url),
      subscription,
    }
  },
}
