import * as context from './context'
export { context }

export { setupWorker } from './setupWorker/setupWorker'

export { SetupApi } from './createSetupApi'

export {
  response,
  defaultResponse,
  createResponseComposition,
} from './response'

/* Request handlers */
export { RequestHandler, defaultContext } from './handlers/RequestHandler'
export { rest } from './rest'
export { RestHandler, RESTMethods, restContext } from './handlers/RestHandler'
export { graphql } from './graphql'
export { GraphQLHandler, graphqlContext } from './handlers/GraphQLHandler'

/* Utils */
export { matchRequestUrl } from './utils/matching/matchRequestUrl'
export { compose } from './utils/internal/compose'
export * from './utils/handleRequest'
export { cleanUrl } from './utils/url/cleanUrl'

/**
 * Type definitions.
 */
export type { SetupWorkerApi, StartOptions } from './setupWorker/glossary'
export type { SharedOptions } from './sharedOptions'

export * from './utils/request/MockedRequest'
export type {
  ResponseResolver,
  ResponseResolverReturnType,
  AsyncResponseResolverReturnType,
  DefaultBodyType,
  DefaultRequestMultipartBody,
} from './handlers/RequestHandler'

export type {
  MockedResponse,
  ResponseTransformer,
  ResponseComposition,
  ResponseCompositionOptions,
  ResponseFunction,
} from './response'

export type {
  RestRequest,
  RestContext,
  RequestQuery,
  ParsedRestRequest,
} from './handlers/RestHandler'

export type {
  GraphQLContext,
  GraphQLVariables,
  GraphQLRequest,
  GraphQLRequestBody,
  GraphQLJsonRequestBody,
} from './handlers/GraphQLHandler'

export type { Path, PathParams, Match } from './utils/matching/matchRequestUrl'
export type { DelayMode } from './context/delay'
export { ParsedGraphQLRequest } from './utils/internal/parseGraphQLRequest'
