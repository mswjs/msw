import { DocumentNode, OperationTypeNode } from 'graphql'
import { ResponseResolver } from './handlers/RequestHandler'
import {
  GraphQLHandler,
  GraphQLContext,
  GraphQLRequest,
  GraphQLVariables,
  ExpectedOperationTypeNode,
  GraphQLHandlerNameSelector,
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
      GraphQLRequest<Variables>,
      GraphQLContext<Query>
    >,
  ) => {
    return new GraphQLHandler<GraphQLRequest<Variables>>(
      operationType,
      operationName,
      url,
      resolver,
    )
  }
}

function createGraphQLOperationHandler(url: Path) {
  return <
    Query extends Record<string, any>,
    Variables extends GraphQLVariables = GraphQLVariables,
  >(
    resolver: ResponseResolver<
      GraphQLRequest<Variables>,
      GraphQLContext<Query>
    >,
  ) => {
    return new GraphQLHandler<GraphQLRequest<Variables>>(
      'all',
      new RegExp('.*'),
      url,
      resolver,
    )
  }
}

const standardGraphQLHandlers = {
  /**
   * Captures any GraphQL operation, regardless of its name, under the current scope.
   * @example
   * graphql.operation((req, res, ctx) => {
   *   return res(ctx.data({ name: 'John' }))
   * })
   * @see {@link https://mswjs.io/docs/api/graphql/operation `graphql.operation()`}
   */
  operation: createGraphQLOperationHandler('*'),

  /**
   * Captures a GraphQL query by a given name.
   * @example
   * graphql.query('GetUser', (req, res, ctx) => {
   *   return res(ctx.data({ user: { name: 'John' } }))
   * })
   * @see {@link https://mswjs.io/docs/api/graphql/query `graphql.query()`}
   */
  query: createScopedGraphQLHandler(OperationTypeNode.QUERY, '*'),

  /**
   * Captures a GraphQL mutation by a given name.
   * @example
   * graphql.mutation('SavePost', (req, res, ctx) => {
   *   return res(ctx.data({ post: { id: 'abc-123' } }))
   * })
   * @see {@link https://mswjs.io/docs/api/graphql/mutation `graphql.mutation()`}
   */
  mutation: createScopedGraphQLHandler(OperationTypeNode.MUTATION, '*'),
}

function createGraphQLLink(url: Path): typeof standardGraphQLHandlers {
  return {
    operation: createGraphQLOperationHandler(url),
    query: createScopedGraphQLHandler(OperationTypeNode.QUERY, url),
    mutation: createScopedGraphQLHandler(OperationTypeNode.MUTATION, url),
  }
}

export const graphql = {
  ...standardGraphQLHandlers,
  link: createGraphQLLink,
}
