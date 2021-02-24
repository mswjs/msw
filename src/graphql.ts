import { Mask } from './setupWorker/glossary'
import { ResponseResolver } from './handlers/RequestHandler'
import {
  GraphQLHandler,
  GraphQLContext,
  GraphQLRequest,
  GraphQLVariables,
  ExpectedOperationTypeNode,
  GraphQLHandlerNameSelector,
} from './handlers/GraphQLHandler'

function createScopedGraphQLHandler(
  operationType: ExpectedOperationTypeNode,
  url: Mask,
) {
  return <
    Query extends Record<string, any>,
    Variables extends GraphQLVariables = GraphQLVariables
  >(
    operationName: GraphQLHandlerNameSelector,
    resolver: ResponseResolver<
      GraphQLRequest<Variables>,
      GraphQLContext<Query>
    >,
  ) => {
    return new GraphQLHandler(operationType, operationName, url, resolver)
  }
}

function createGraphQLOperationHandler(url: Mask) {
  return <
    Query extends Record<string, any>,
    Variables extends GraphQLVariables = GraphQLVariables
  >(
    resolver: ResponseResolver<
      GraphQLRequest<Variables>,
      GraphQLContext<Query>
    >,
  ) => {
    return new GraphQLHandler('all', new RegExp('.*'), url, resolver)
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
  query: createScopedGraphQLHandler('query', '*'),

  /**
   * Captures a GraphQL mutation by a given name.
   * @example
   * graphql.mutation('SavePost', (req, res, ctx) => {
   *   return res(ctx.data({ post: { id: 'abc-123' } }))
   * })
   * @see {@link https://mswjs.io/docs/api/graphql/mutation `graphql.mutation()`}
   */
  mutation: createScopedGraphQLHandler('mutation', '*'),
}

function createGraphQLLink(url: Mask): typeof standardGraphQLHandlers {
  return {
    operation: createGraphQLOperationHandler(url),
    query: createScopedGraphQLHandler('query', url),
    mutation: createScopedGraphQLHandler('mutation', url),
  }
}

export const graphql = {
  ...standardGraphQLHandlers,
  link: createGraphQLLink,
}
