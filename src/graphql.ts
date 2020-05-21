import { OperationTypeNode, OperationDefinitionNode, parse } from 'graphql'
import { RequestHandler, MockedRequest } from './handlers/requestHandler'
import { MockedResponse, ResponseComposition } from './response'
import { set } from './context/set'
import { status } from './context/status'
import { delay } from './context/delay'
import { fetch } from './context/fetch'
import { data, DataContext } from './context/data'
import { errors } from './context/errors'

/* Logging */
import { prepareRequest } from './utils/logger/prepareRequest'
import { prepareResponse } from './utils/logger/prepareResponse'
import { getTimestamp } from './utils/logger/getTimestamp'
import { styleStatusCode } from './utils/logger/styleStatusCode'

type GraphQLRequestHandlerSelector = RegExp | string

type GraphQLMockedRequest<
  VariablesType = Record<string, any>
> = MockedRequest & {
  variables: VariablesType
}

// GraphQL related context should contain utility functions
// useful for GraphQL. Functions like `xml()` bear no value
// in the GraphQL universe.
interface GraphQLMockedContext<QueryType> {
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

type GraphQLResponseResolver<QueryType, VariablesType> = (
  req: GraphQLMockedRequest<VariablesType>,
  res: ResponseComposition,
  context: GraphQLMockedContext<QueryType>,
) => MockedResponse

interface GraphQLRequestPayload<VariablesType> {
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

const createGraphQLHandler = (operationType: OperationTypeNode) => {
  return <QueryType, VariablesType = Record<string, any>>(
    expectedOperation: GraphQLRequestHandlerSelector,
    resolver: GraphQLResponseResolver<QueryType, VariablesType>,
  ): RequestHandler<
    GraphQLMockedRequest<VariablesType>,
    GraphQLMockedContext<QueryType>,
    GraphQLRequestParsedResult<VariablesType>
  > => {
    return {
      resolver,

      parse(req) {
        if (!req.body) {
          return {} as GraphQLRequestParsedResult<VariablesType>
        }

        const { query, variables } = req.body as GraphQLRequestPayload<
          VariablesType
        >
        const { operationName } = parseQuery(query, operationType)

        return {
          operationType,
          operationName,
          variables,
        }
      },

      getPublicRequest(req, parsed) {
        return {
          ...req,
          variables: parsed.variables || ({} as VariablesType),
        }
      },

      predicate(req, parsed) {
        if (
          req.headers.get('Content-Type') !== 'application/json' ||
          typeof req.body === 'string'
        ) {
          return false
        }

        const { operationName } = parsed

        if (!operationName) {
          return false
        }

        const isMatchingOperation =
          expectedOperation instanceof RegExp
            ? expectedOperation.test(operationName)
            : expectedOperation === operationName

        return isMatchingOperation
      },

      defineContext() {
        return graphqlContext
      },

      log(req, res, handler, parsed) {
        const { operationName } = parsed
        const loggedRequest = prepareRequest(req)
        const loggedResponse = prepareResponse(res)

        console.groupCollapsed(
          '[MSW] %s %s (%c%s%c)',
          getTimestamp(),
          operationName,
          styleStatusCode(res.status),
          res.status,
          'color:inherit',
        )
        console.log('Request:', loggedRequest)
        console.log('Handler:', {
          operation: expectedOperation,
          predicate: handler.predicate,
        })
        console.log('Response:', loggedResponse)
        console.groupEnd()
      },
    }
  }
}

export const graphql = {
  query: createGraphQLHandler('query'),
  mutation: createGraphQLHandler('mutation'),
}
