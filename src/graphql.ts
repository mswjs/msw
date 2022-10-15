import type { DocumentNode, OperationTypeNode } from 'graphql'
import { ResponseResolver } from './handlers/RequestHandler'
import {
  GraphQLHandler,
  GraphQLContext,
  GraphQLVariables,
  ExpectedOperationTypeNode,
  GraphQLHandlerNameSelector,
  GraphQLResolverExtras,
} from './handlers/GraphQLHandler'
import { Path } from './utils/matching/matchRequestUrl'

export interface TypedDocumentNode<
  Result = { [key: string]: any },
  Variables = { [key: string]: any },
> extends DocumentNode {
  __apiType?: (variables: Variables) => Result
  __resultType?: Result
  __variablesType?: Variables
}

function createScopedGraphQLHandler(
  operationType: ExpectedOperationTypeNode,
  url: Path,
) {
  return <
    Query extends Record<string, any>,
    Variables extends GraphQLVariables = GraphQLVariables,
  >(
    operationName:
      | GraphQLHandlerNameSelector
      | DocumentNode
      | TypedDocumentNode<Query, Variables>,
    resolver: ResponseResolver<
      GraphQLContext<Query>,
      GraphQLResolverExtras<Variables>
    >,
  ) => {
    return new GraphQLHandler(operationType, operationName, url, resolver)
  }
}

function createGraphQLOperationHandler(url: Path) {
  return <
    Query extends Record<string, any>,
    // Variables extends GraphQLVariables = GraphQLVariables,
  >(
    resolver: ResponseResolver<GraphQLContext<Query>>,
  ) => {
    return new GraphQLHandler('all', new RegExp('.*'), url, resolver)
  }
}

const standardGraphQLHandlers = {
  /**
   * Captures any GraphQL operation, regardless of its name, under the current scope.
   * @example
   * graphql.operation(() => {
   *   return HttpResponse.json({ data: { name: 'John' } })
   * })
   * @see {@link https://mswjs.io/docs/api/graphql/operation `graphql.operation()`}
   */
  operation: createGraphQLOperationHandler('*'),

  /**
   * Captures a GraphQL query by a given name.
   * @example
   * graphql.query('GetUser', () => {
   *   return HttpResponse.json({ data: { user: { name: 'John' } } })
   * })
   * @see {@link https://mswjs.io/docs/api/graphql/query `graphql.query()`}
   */
  query: createScopedGraphQLHandler('query' as OperationTypeNode, '*'),

  /**
   * Captures a GraphQL mutation by a given name.
   * @example
   * graphql.mutation('SavePost', () => {
   *   return HttpResponse.json({ data: { post: { id: 'abc-123 } } })
   * })
   * @see {@link https://mswjs.io/docs/api/graphql/mutation `graphql.mutation()`}
   */
  mutation: createScopedGraphQLHandler('mutation' as OperationTypeNode, '*'),
}

function createGraphQLLink(url: Path): typeof standardGraphQLHandlers {
  return {
    operation: createGraphQLOperationHandler(url),
    query: createScopedGraphQLHandler('query' as OperationTypeNode, url),
    mutation: createScopedGraphQLHandler('mutation' as OperationTypeNode, url),
  }
}

export const graphql = {
  ...standardGraphQLHandlers,
  link: createGraphQLLink,
}
