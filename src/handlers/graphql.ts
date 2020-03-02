import { parse } from 'graphql'
import { RequestHandler, MockedRequest } from './requestHandler'
import { MockedResponse, ResponseComposition } from '../response'
import { MockedContext } from '../context'

interface GraphQLRequestHandlerSelector {
  operation: string
}

type GraphQLMockedRequest = MockedRequest & {
  variables: Record<string, any>
}

type GraphQLResponseResolver = (
  req: GraphQLMockedRequest,
  res: ResponseComposition,
  context: MockedContext,
) => MockedResponse

interface GraphQLRequestPayload {
  operationName: string
  query: string
  variables?: Record<string, any>
}

const getQueryName = (query: string) => {
  const ast = parse(query)
  console.log({ ast })

  const operationNode =
    ast.definitions[0].kind === 'OperationDefinition' && ast.definitions[0]

  return ''
}

const graphQLQueryHandler = (
  selector: GraphQLRequestHandlerSelector,
  resolver: GraphQLResponseResolver,
): RequestHandler => {
  return {
    predicate(req) {
      if (
        req.headers.get('Content-Type') !== 'application/json' ||
        typeof req.body === 'string'
      ) {
        return false
      }

      console.log('predicte', { req })

      const {
        operationName,
        query,
        variables,
      } = req.body as GraphQLRequestPayload

      console.log({ operationName, query })
      const queryName = getQueryName(query)

      const isMatchingOperation = selector.operation === operationName

      // Set the parsed variables on the request object
      // so they could be accessed in the response resolver.
      // @ts-ignore
      req.variables = variables

      return isMatchingOperation
    },
    resolver,
  }
}

const graphQLHandlers = {
  query: graphQLQueryHandler,
}

export default graphQLHandlers
