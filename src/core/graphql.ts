import { DocumentNode, OperationTypeNode } from 'graphql'
import {
  ResponseResolver,
  RequestHandlerOptions,
} from './handlers/RequestHandler'
import {
  GraphQLHandler,
  GraphQLVariables,
  ExpectedOperationTypeNode,
  GraphQLHandlerNameSelector,
  GraphQLResolverExtras,
  GraphQLResponseBody,
  GraphQLQuery,
} from './handlers/GraphQLHandler'
import type { Path } from './utils/matching/matchRequestUrl'
import {
  GraphQLInternalPubsub,
  createGraphQLSubscriptionHandler,
  GraphQLSubscriptionHandlerFactory,
} from './handlers/GraphQLSubscriptionHandler'

export interface TypedDocumentNode<
  Result = { [key: string]: any },
  Variables = { [key: string]: any },
> extends DocumentNode {
  __apiType?: (variables: Variables) => Result
  __resultType?: Result
  __variablesType?: Variables
}

export type GraphQLRequestHandler = <
  Query extends GraphQLQuery = GraphQLQuery,
  Variables extends GraphQLVariables = GraphQLVariables,
>(
  operationName:
    | GraphQLHandlerNameSelector
    | DocumentNode
    | TypedDocumentNode<Query, Variables>,
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
  operationType: ExpectedOperationTypeNode,
  url: Path,
): GraphQLRequestHandler {
  return (operationName, resolver, options = {}) => {
    return new GraphQLHandler(
      operationType,
      operationName,
      url,
      resolver,
      options,
    )
  }
}

export type GraphQLOperationHandler = <
  Query extends GraphQLQuery = GraphQLQuery,
  Variables extends GraphQLVariables = GraphQLVariables,
>(
  resolver: ResponseResolver<
    GraphQLResolverExtras<Variables>,
    null,
    GraphQLResponseBody<Query>
  >,
) => GraphQLHandler

function createGraphQLOperationHandler(url: Path): GraphQLOperationHandler {
  return (resolver) => {
    return new GraphQLHandler('all', new RegExp('.*'), url, resolver)
  }
}

export interface GraphQLHandlers {
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
  query: GraphQLRequestHandler

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
  mutation: GraphQLRequestHandler

  /**
   * Intercepts any GraphQL operation, regardless of its type or name.
   *
   * @example
   * graphql.operation(() => {
   *   return HttpResponse.json({ data: { name: 'John' } })
   * })
   *
   * @see {@link https://mswjs.io/docs/api/graphql#graphloperationresolver `graphql.operation()` API reference}
   */
  operation: GraphQLOperationHandler
}

const standardGraphQLHandlers: GraphQLHandlers = {
  query: createScopedGraphQLHandler(OperationTypeNode.QUERY, '*'),
  mutation: createScopedGraphQLHandler(OperationTypeNode.MUTATION, '*'),
  operation: createGraphQLOperationHandler('*'),
}

export interface GraphQLLink extends GraphQLHandlers {
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

function createGraphQLLink(url: Path): GraphQLLink {
  const internalPubSub = new GraphQLInternalPubsub(url)

  return {
    query: createScopedGraphQLHandler(OperationTypeNode.QUERY, url),
    mutation: createScopedGraphQLHandler(OperationTypeNode.MUTATION, url),
    subscription: createGraphQLSubscriptionHandler(internalPubSub),
    operation: createGraphQLOperationHandler(url),
  }
}

/**
 * A namespace to intercept and mock GraphQL operations.
 *
 * @example
 * graphql.query('GetUser', resolver)
 * graphql.mutation('DeletePost', resolver)
 *
 * @see {@link https://mswjs.io/docs/api/graphql `graphql` API reference}
 */
export const graphql = {
  ...standardGraphQLHandlers,

  /**
   * Intercepts GraphQL operations scoped by the given URL.
   *
   * @example
   * const github = graphql.link('https://api.github.com/graphql')
   * github.query('GetRepo', resolver)
   *
   * @see {@link https://mswjs.io/docs/api/graphql#graphqllinkurl `graphql.link()` API reference}
   */
  link: createGraphQLLink,
}
