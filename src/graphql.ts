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
import { data, DataContext } from './context/data'
import { errors } from './context/errors'

/* Logging */
import { prepareRequest } from './utils/logging/prepareRequest'
import { prepareResponse } from './utils/logging/prepareResponse'
import { getTimestamp } from './utils/logging/getTimestamp'
import { getStatusCodeColor } from './utils/logging/getStatusCodeColor'
import { jsonParse } from './utils/internal/jsonParse'
import { matchRequestUrl } from './utils/matching/matchRequestUrl'

type ExpectedOperationTypeNode = OperationTypeNode | 'any'

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
export interface GraphQLMockedContext<QueryType> {
  set: typeof set
  status: typeof status
  delay: typeof delay
  fetch: typeof fetch
  data: DataContext<QueryType>
  errors: typeof errors
}

export const graphqlContext: GraphQLMockedContext<any> = {
  set,
  status,
  delay,
  fetch,
  data,
  errors,
}

export type GraphQLResponseResolver<QueryType, VariablesType> = (
  req: GraphQLMockedRequest<VariablesType>,
  res: ResponseComposition,
  context: GraphQLMockedContext<QueryType>,
) => AsyncResponseResolverReturnType<MockedResponse>

export interface GraphQLRequestPayload<VariablesType> {
  query: string
  variables?: VariablesType
}

interface GraphQLRequestParsedResult<VariablesType> {
  operationType: OperationTypeNode
  operationName: string | undefined
  variables: VariablesType | undefined
}

interface ParsedQueryPayload {
  operationName: string | undefined
}

export function parseQuery(
  query: string,
  definitionOperation: OperationTypeNode = 'query',
): ParsedQueryPayload {
  const ast = parse(query)

  const operationDef = ast.definitions.find(
    (def) =>
      def.kind === 'OperationDefinition' &&
      def.operation === definitionOperation,
  ) as OperationDefinitionNode

  return {
    operationName: operationDef?.name?.value,
  }
}

function parseQueryIndependentOfOperation<VariablesType = Record<string, any>>(
  query: string,
  definitionOperation: ExpectedOperationTypeNode = 'query',
  variables?: VariablesType,
): GraphQLRequestParsedResult<VariablesType> {
  const ast = parse(query)

  const operationDef = ast.definitions.find(
    (def) =>
      def.kind === 'OperationDefinition' &&
      (def.operation === definitionOperation || definitionOperation === 'any'),
  ) as OperationDefinitionNode

  return {
    operationType: operationDef?.operation,
    operationName: operationDef?.name?.value,
    variables: variables,
  }
}

function graphQLRequestHandler<QueryType, VariablesType = Record<string, any>>(
  expectedOperationType: ExpectedOperationTypeNode,
  expectedOperationName: GraphQLRequestHandlerSelector,
  mask: Mask,
  resolver: GraphQLResponseResolver<QueryType, VariablesType>,
): RequestHandler<
  GraphQLMockedRequest<VariablesType>,
  GraphQLMockedContext<QueryType>,
  GraphQLRequestParsedResult<VariablesType>
> {
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

          return parseQueryIndependentOfOperation(
            query,
            expectedOperationType,
            variables,
          )
        }

        case 'POST': {
          if (!req.body?.query) {
            return null
          }

          const { query, variables } = req.body as GraphQLRequestPayload<
            VariablesType
          >

          return parseQueryIndependentOfOperation(
            query,
            expectedOperationType,
            variables,
          )
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
  }
}

const createGraphQLHandler = (
  expectedOperationType: ExpectedOperationTypeNode,
  mask: Mask,
) => {
  return <QueryType, VariablesType = Record<string, any>>(
    expectedOperationName: GraphQLRequestHandlerSelector,
    resolver: GraphQLResponseResolver<QueryType, VariablesType>,
  ): RequestHandler<
    GraphQLMockedRequest<VariablesType>,
    GraphQLMockedContext<QueryType>,
    GraphQLRequestParsedResult<VariablesType>
  > =>
    graphQLRequestHandler(
      expectedOperationType,
      expectedOperationName,
      mask,
      resolver,
    )
}

const createGraphQLOperationsHandler = (mask: Mask) => {
  return <QueryType, VariablesType = Record<string, any>>(
    resolver: GraphQLResponseResolver<QueryType, VariablesType>,
  ): RequestHandler<
    GraphQLMockedRequest<VariablesType>,
    GraphQLMockedContext<QueryType>,
    GraphQLRequestParsedResult<VariablesType>
  > => graphQLRequestHandler('any', new RegExp('.*'), mask, resolver)
}

const graphqlStandardHandlers = {
  operations: createGraphQLOperationsHandler('*'),
  query: createGraphQLHandler('query', '*'),
  mutation: createGraphQLHandler('mutation', '*'),
}

function createGraphQLLink(uri: Mask): typeof graphqlStandardHandlers {
  return {
    operations: createGraphQLOperationsHandler(uri),
    query: createGraphQLHandler('query', uri),
    mutation: createGraphQLHandler('mutation', uri),
  }
}

export const graphql = {
  ...graphqlStandardHandlers,
  link: createGraphQLLink,
}
