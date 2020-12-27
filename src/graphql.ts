import { OperationTypeNode, OperationDefinitionNode, parse } from 'graphql'
import {
  RequestHandler,
  MockedRequest,
  AsyncResponseResolverReturnType,
} from './utils/handlers/requestHandler'
import { MockedResponse, ResponseComposition } from './response'
import { Mask } from './setupWorker/glossary'
import { set } from './context/set'
import { status } from './context/status'
import { delay } from './context/delay'
import { fetch } from './context/fetch'
import { data } from './context/data'
import { errors } from './context/errors'

/* Logging */
import { prepareRequest } from './utils/logging/prepareRequest'
import { prepareResponse } from './utils/logging/prepareResponse'
import { getTimestamp } from './utils/logging/getTimestamp'
import { getStatusCodeColor } from './utils/logging/getStatusCodeColor'
import { jsonParse } from './utils/internal/jsonParse'
import { matchRequestUrl } from './utils/matching/matchRequestUrl'
import { getCallFrame } from './utils/internal/getCallFrame'

type ExpectedOperationTypeNode = OperationTypeNode | 'all'

type GraphQLRequestHandlerSelector = RegExp | string

export type GraphQLMockedRequest<VariablesType = Record<string, any>> = Omit<
  MockedRequest,
  'body'
> & {
  body: (GraphQLRequestPayload<VariablesType> & Record<string, any>) | undefined
  variables: VariablesType
}

// GraphQL related context should contain utility functions
// useful for GraphQL. Functions like `xml()` bear no value
// in the GraphQL universe.
export interface GraphQLMockedContext {
  set: typeof set
  status: typeof status
  delay: typeof delay
  fetch: typeof fetch
  data: typeof data
  errors: typeof errors
}

export const graphqlContext: GraphQLMockedContext = {
  set,
  status,
  delay,
  fetch,
  data,
  errors,
}

export type GraphQLResponseResolver<QueryType, VariablesType> = (
  req: GraphQLMockedRequest<VariablesType>,
  res: ResponseComposition<any>,
  context: GraphQLMockedContext,
) => AsyncResponseResolverReturnType<MockedResponse>

export interface GraphQLRequestPayload<VariablesType> {
  query: string
  variables?: VariablesType
}

export interface GraphQLRequestParsedResult<VariablesType> {
  operationType: OperationTypeNode
  operationName: string | undefined
  variables: VariablesType | undefined
}

interface ParsedQueryPayload {
  operationType: OperationTypeNode
  operationName: string | undefined
}

function parseQuery(
  query: string,
  definitionOperation: ExpectedOperationTypeNode = 'query',
): ParsedQueryPayload {
  const ast = parse(query)

  const operationDef = ast.definitions.find((def) => {
    return (
      def.kind === 'OperationDefinition' &&
      (definitionOperation === 'all' || def.operation === definitionOperation)
    )
  }) as OperationDefinitionNode

  return {
    operationType: operationDef?.operation,
    operationName: operationDef?.name?.value,
  }
}

function graphQLRequestHandler<QueryType, VariablesType = Record<string, any>>(
  expectedOperationType: ExpectedOperationTypeNode,
  expectedOperationName: GraphQLRequestHandlerSelector,
  mask: Mask,
  resolver: GraphQLResponseResolver<QueryType, VariablesType>,
): RequestHandler<
  GraphQLMockedRequest<VariablesType>,
  GraphQLMockedContext,
  GraphQLRequestParsedResult<VariablesType>
> {
  const callFrame = getCallFrame()

  return {
    resolver,

    parse(req) {
      // According to the GraphQL specification, a GraphQL request can be issued
      // using both "GET" and "POST" methods.
      switch (req.method) {
        case 'GET': {
          const query = req.url.searchParams.get('query')
          const variablesString = req.url.searchParams.get('variables') || ''

          if (!query) {
            return null
          }

          const variables = variablesString
            ? jsonParse<VariablesType>(variablesString)
            : ({} as VariablesType)

          const { operationType, operationName } = parseQuery(
            query,
            expectedOperationType,
          )

          return {
            operationType,
            operationName,
            variables,
          }
        }

        case 'POST': {
          if (!req.body?.query) {
            return null
          }

          const {
            query,
            variables,
          } = req.body as GraphQLRequestPayload<VariablesType>

          const { operationType, operationName } = parseQuery(
            query,
            expectedOperationType,
          )

          return {
            operationType,
            operationName,
            variables,
          }
        }

        default:
          return null
      }
    },

    getPublicRequest(req, parsed) {
      return {
        ...req,
        variables: parsed.variables || ({} as VariablesType),
      }
    },

    predicate(req, parsed) {
      if (!parsed || !parsed.operationName) {
        return false
      }

      // Match the request URL against a given mask,
      // in case of an endpoint-specific request handler.
      const hasMatchingMask = matchRequestUrl(req.url, mask)

      const isMatchingOperation =
        expectedOperationName instanceof RegExp
          ? expectedOperationName.test(parsed.operationName)
          : expectedOperationName === parsed.operationName

      return hasMatchingMask.matches && isMatchingOperation
    },

    defineContext() {
      return graphqlContext
    },

    log(req, res, handler, parsed) {
      const { operationType, operationName } = parsed
      const loggedRequest = prepareRequest(req)
      const loggedResponse = prepareResponse(res)

      console.groupCollapsed(
        '[MSW] %s %s (%c%s%c)',
        getTimestamp(),
        operationName,
        `color:${getStatusCodeColor(res.status)}`,
        res.status,
        'color:inherit',
      )
      console.log('Request:', loggedRequest)
      console.log('Handler:', {
        operationType,
        operationName: expectedOperationName,
        predicate: handler.predicate,
      })
      console.log('Response:', loggedResponse)
      console.groupEnd()
    },

    getMetaInfo() {
      const header =
        expectedOperationType === 'all'
          ? `[graphql] ${expectedOperationType} (origin: ${mask.toString()})`
          : `[graphql] ${expectedOperationType} ${expectedOperationName} (origin: ${mask.toString()})`

      return {
        type: 'graphql',
        header,
        mask,
        callFrame,
      }
    },
  }
}

const createGraphQLScopedHandler = (
  expectedOperationType: ExpectedOperationTypeNode,
  mask: Mask,
) => {
  return <QueryType, VariablesType = Record<string, any>>(
    expectedOperationName: GraphQLRequestHandlerSelector,
    resolver: GraphQLResponseResolver<QueryType, VariablesType>,
  ): RequestHandler<
    GraphQLMockedRequest<VariablesType>,
    GraphQLMockedContext,
    GraphQLRequestParsedResult<VariablesType>
  > => {
    return graphQLRequestHandler(
      expectedOperationType,
      expectedOperationName,
      mask,
      resolver,
    )
  }
}

const createGraphQLOperationHandler = (mask: Mask) => {
  return <QueryType, VariablesType = Record<string, any>>(
    resolver: GraphQLResponseResolver<QueryType, VariablesType>,
  ): RequestHandler<
    GraphQLMockedRequest<VariablesType>,
    GraphQLMockedContext,
    GraphQLRequestParsedResult<VariablesType>
  > => {
    return graphQLRequestHandler('all', new RegExp('.*'), mask, resolver)
  }
}

const graphqlStandardHandlers = {
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
  query: createGraphQLScopedHandler('query', '*'),

  /**
   * Captures a GraphQL mutation by a given name.
   * @example
   * graphql.mutation('SavePost', (req, res, ctx) => {
   *   return res(ctx.data({ post: { id: 'abc-123' } }))
   * })
   * @see {@link https://mswjs.io/docs/api/graphql/mutation `graphql.mutation()`}
   */
  mutation: createGraphQLScopedHandler('mutation', '*'),
}

/**
 * Creates a GraphQL mocking API scoped to the given endpoint.
 * @param uri Endpoint URL, or path.
 * @example
 * const api = graphql.link('https://api.site.com/graphql)
 * api.query('GetUser', resolver)
 * @see {@link https://mswjs.io/docs/api/graphql/link `graphql.link()`}
 */
function createGraphQLLink(uri: Mask): typeof graphqlStandardHandlers {
  return {
    operation: createGraphQLOperationHandler(uri),
    query: createGraphQLScopedHandler('query', uri),
    mutation: createGraphQLScopedHandler('mutation', uri),
  }
}

export const graphql = {
  ...graphqlStandardHandlers,
  link: createGraphQLLink,
}
