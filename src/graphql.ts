import { parse, OperationDefinitionNode, OperationTypeNode } from 'graphql'
import { RequestHandler, MockedRequest } from './handlers/requestHandler'
import { MockedResponse, ResponseComposition } from './response'
import { set } from './context/set'
import { status } from './context/status'
import { delay } from './context/delay'
import { fetch } from './context/fetch'
import { data, DataContext } from './context/data'
import { errors } from './context/errors'

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

type GraphQLResponseResolver<QueryType, VariablesType> = (
  req: GraphQLMockedRequest<VariablesType>,
  res: ResponseComposition,
  context: GraphQLMockedContext<QueryType>,
) => MockedResponse

interface GraphQLRequestPayload<VariablesType> {
  query: string
  variables?: VariablesType
}

interface ParsedQueryPayload {
  operationName: string | undefined
}

/*#__PURE__*/
export const graphqlContext: GraphQLMockedContext<any> = {
  set,
  status,
  delay,
  fetch,
  data,
  errors,
}

/*#__PURE__*/
const parseQuery = (
  query: string,
  definitionOperation: OperationTypeNode = 'query',
): ParsedQueryPayload => {
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

/*#__PURE__*/
const createGraphQLHandler = (operationType: OperationTypeNode) => {
  return <QueryType, VariablesType = Record<string, any>>(
    expectedOperation: GraphQLRequestHandlerSelector,
    resolver: GraphQLResponseResolver<QueryType, VariablesType>,
  ): RequestHandler<
    GraphQLMockedRequest<VariablesType>,
    GraphQLMockedContext<QueryType>
  > => {
    return {
      predicate(req) {
        if (
          req.headers.get('Content-Type') !== 'application/json' ||
          typeof req.body === 'string'
        ) {
          return false
        }

        const { query, variables } = req.body as GraphQLRequestPayload<
          VariablesType
        >
        const { operationName } = parseQuery(query, operationType)

        if (!operationName) {
          return false
        }

        const isMatchingOperation =
          expectedOperation instanceof RegExp
            ? expectedOperation.test(operationName)
            : expectedOperation === operationName

        if (isMatchingOperation) {
          // Set the parsed variables on the request object
          // so they could be accessed in the response resolver.
          // @ts-ignore
          req.variables = variables || {}
        }

        return isMatchingOperation
      },
      defineContext() {
        return graphqlContext
      },
      resolver,
    }
  }
}

const graphql = {
  query: createGraphQLHandler('query'),
  mutation: createGraphQLHandler('mutation'),
}

export { graphql }
