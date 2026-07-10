import type { OperationTypeNode } from 'graphql'
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
  return (resolver, options) => {
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
    const subscriptionCatchAllHandler = subscriptionFactory(
      new RegExp('.*'),
      ({ operationName, subscription }) => {
        /**
         * @note Subscriptions are resolved imperatively so the resolver
         * is invoked with a reduced info object (no request to expose),
         * and its return value is ignored.
         */
        resolver({
          operationName,
          query: subscription.query,
          variables: subscription.variables,
        } as Parameters<typeof resolver>[0])
      },
    )

    return attachSiblingHandlers(handler, [subscriptionCatchAllHandler])
  }
}

export interface GraphQLLinkHandlers {
  query: GraphQLRequestHandler
  mutation: GraphQLRequestHandler
  operation: GraphQLOperationHandler
  /**
   * Intercept a GraphQL subscription.
   *
   * @example
   * graphql.subscription('OnPostAdded', ({ subscription }) => {
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
 * graphql.query('GetUser', resolver)
 * graphql.mutation('DeletePost', resolver)
 *
 * @see {@link https://mswjs.io/docs/api/graphql `graphql` API reference}
 */
export const graphql = {
  /**
   * Intercepts a GraphQL query by a given name.
   *
   * @example
   * graphql.query('GetUser', () => {
   *   return HttpResponse.json({ data: { user: { name: 'John' } } })
   * })
   *
   * @see {@link https://mswjs.io/docs/api/graphql#graphqlqueryqueryname-resolver `graphql.query()` API reference}
   */
  query: createScopedGraphQLHandler('query' as OperationTypeNode, '*'),

  /**
   * Intercepts a GraphQL mutation by its name.
   *
   * @example
   * graphql.mutation('SavePost', () => {
   *   return HttpResponse.json({ data: { post: { id: 'abc-123 } } })
   * })
   *
   * @see {@link https://mswjs.io/docs/api/graphql#graphqlmutationmutationname-resolver `graphql.query()` API reference}
   *
   */
  mutation: createScopedGraphQLHandler('mutation' as OperationTypeNode, '*'),

  /**
   * Intercepts any GraphQL operation, regardless of its type or name.
   *
   * @example
   * graphql.operation(() => {
   *   return HttpResponse.json({ data: { name: 'John' } })
   * })
   *
   * @note Unlike `graphql.link(url).operation()`, this handler does not
   * match GraphQL subscriptions: intercepting them requires claiming the
   * WebSocket connections to a concrete endpoint, and a wildcard would
   * claim every WebSocket connection on the page.
   *
   * @see {@link https://mswjs.io/docs/api/graphql#graphqloperationresolver `graphql.operation()` API reference}
   */
  operation: createGraphQLOperationHandler('*'),

  /**
   * Intercepts GraphQL operations scoped by the given URL.
   *
   * @example
   * const github = graphql.link('https://api.github.com/graphql')
   * github.query('GetRepo', resolver)
   *
   * @see {@link https://mswjs.io/docs/api/graphql#graphqllinkurl `graphql.link()` API reference}
   */
  link(url: Path): GraphQLLinkHandlers {
    /**
     * @note Create the subscription handler factory once per link so
     * the `subscription()` and `operation()` handlers share the same
     * underlying subscription transport (deduped by reference).
     */
    const subscription = createGraphQLSubscriptionHandler(url)

    return {
      operation: createGraphQLOperationHandler(url, subscription),
      query: createScopedGraphQLHandler('query' as OperationTypeNode, url),
      mutation: createScopedGraphQLHandler(
        'mutation' as OperationTypeNode,
        url,
      ),
      subscription,
    }
  },
}
