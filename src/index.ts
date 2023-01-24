import * as context from './context'
import { checkGlobals } from './utils/internal/checkGlobals'
export { context }

export { setupWorker } from './setupWorker/setupWorker'

export { SetupApi } from './SetupApi'

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
export type { SetupWorker, StartOptions } from './setupWorker/glossary'
export { SetupWorkerApi } from './setupWorker/setupWorker'
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

// Validate environmental globals before executing any code.
// This ensures that the library gives user-friendly errors
// when ran in the environments that require additional polyfills
// from the end user.
checkGlobals()
