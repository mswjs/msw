import * as context from './context'

export { composeMocks } from './composeMocks/composeMocks'
export { MockedResponse, ResponseTransformer, response } from './response'
export { context }

/* Request handlers */
export {
  MockedRequest,
  RequestHandler,
  RequestParams,
  RequestQuery,
  ResponseResolver,
  defaultContext,
} from './handlers/requestHandler'
export { default as rest, restContext, RESTMethods } from './handlers/rest'
export { default as graphql, graphqlContext } from './handlers/graphql'
