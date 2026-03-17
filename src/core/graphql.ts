import { OperationTypeNode } from 'graphql'
import {
  ResponseResolver,
  RequestHandlerOptions,
} from './handlers/RequestHandler'
import {
  GraphQLHandler,
  GraphQLVariables,
  GraphQLOperationType,
  GraphQLResolverExtras,
  GraphQLResponseBody,
  GraphQLQuery,
  GraphQLPredicate,
} from './handlers/GraphQLHandler'
import type { Path } from './utils/matching/matchRequestUrl'
import {
  GraphQLInternalPubSub,
  createGraphQLSubscriptionHandler,
  GraphQLSubscriptionHandlerFactory,
} from './handlers/GraphQLSubscriptionHandler'

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

function createGraphQLOperationHandler(url: Path): GraphQLOperationHandler {
  return (resolver, options) => {
    return new GraphQLHandler('all', new RegExp('.*'), url, resolver, options)
  }
}

export interface GraphQLLinkHandlers {
  query: GraphQLRequestHandler
  mutation: GraphQLRequestHandler
  operation: GraphQLOperationHandler
  /**
   * Intercepts a GraphQL subscription by its name.
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

export const graphql = {
  query: createScopedGraphQLHandler(OperationTypeNode.QUERY, '*'),
  mutation: createScopedGraphQLHandler(OperationTypeNode.MUTATION, '*'),
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
    const internalPubSub = new GraphQLInternalPubSub(url)

    return {
      operation: createGraphQLOperationHandler(url),
      query: createScopedGraphQLHandler('query' as OperationTypeNode, url),
      mutation: createScopedGraphQLHandler(
        'mutation' as OperationTypeNode,
        url,
      ),
      subscription: createGraphQLSubscriptionHandler(internalPubSub),
    }
  },
}
