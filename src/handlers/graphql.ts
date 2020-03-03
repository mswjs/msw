import { RequestHandler, MockedRequest } from './requestHandler'
import { MockedResponse, ResponseComposition } from '../response'
import { set } from '../context/set'
import { status } from '../context/status'
import { delay } from '../context/delay'
import { data, DataContext } from '../context/data'

interface GraphQLRequestHandlerSelector {
  operation: string
}

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
  data: DataContext<QueryType>
}

type GraphQLResponseResolver<QueryType, VariablesType> = (
  req: GraphQLMockedRequest<VariablesType>,
  res: ResponseComposition,
  context: GraphQLMockedContext<QueryType>,
) => MockedResponse

interface GraphQLRequestPayload<VariablesType> {
  operationName: string
  query: string
  variables?: VariablesType
}

const graphQLQueryHandler = <QueryType, VariablesType>(
  selector: GraphQLRequestHandlerSelector,
  resolver: GraphQLResponseResolver<QueryType, VariablesType>,
): RequestHandler<GraphQLMockedContext<QueryType>> => {
  return {
    predicate(req) {
      if (
        req.headers.get('Content-Type') !== 'application/json' ||
        typeof req.body === 'string'
      ) {
        return false
      }

      const { operationName, variables } = req.body as GraphQLRequestPayload<
        VariablesType
      >

      const isMatchingOperation = selector.operation === operationName

      // Set the parsed variables on the request object
      // so they could be accessed in the response resolver.
      // @ts-ignore
      req.variables = variables

      return isMatchingOperation
    },
    defineContext() {
      return {
        set,
        status,
        delay,
        data,
      }
    },
    resolver,
  }
}

export default {
  query: graphQLQueryHandler,
}
