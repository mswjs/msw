import * as context from './context'
export { context }

export { setupWorker } from './setupWorker/setupWorker'
export { SetupWorkerApi } from './setupWorker/glossary'
export {
  response,
  defaultResponse,
  createResponseComposition,
  MockedResponse,
  ResponseTransformer,
  ResponseComposition,
  ResponseCompositionOptions,
  ResponseFunction,
} from './response'

/* Request handlers */
export {
  defaultContext,
  MockedRequest,
  RequestHandler,
  RequestParams,
  RequestQuery,
  ResponseResolver,
  ResponseResolverReturnType,
  AsyncResponseResolverReturnType,
} from './utils/handlers/requestHandler'
export { graphql } from './graphql'
export {
  GraphQLHandler,
  GraphQLContext,
  graphqlContext,
} from './utils/handlers/2.0/GraphQLHandler'
export { matchRequestUrl } from './utils/matching/matchRequestUrl'

/* Utils */
export { compose } from './utils/internal/compose'
export { DelayMode } from './context/delay'

export { RequestHandler as BaseRequestHandler } from './utils/handlers/2.0/RequestHandler'
export { rest } from './rest'
export {
  RESTMethods,
  RestContext,
  restContext,
} from './utils/handlers/2.0/RestHandler'
