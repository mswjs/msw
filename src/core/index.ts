import { checkGlobals } from './utils/internal/checkGlobals'

export { SetupApi } from './SetupApi'

/* Request handlers */
export { RequestHandler } from './handlers/RequestHandler'
export { rest } from './rest'
export { RestHandler, RESTMethods } from './handlers/RestHandler'
export { graphql } from './graphql'
export { GraphQLHandler } from './handlers/GraphQLHandler'

/* Utils */
export { matchRequestUrl } from './utils/matching/matchRequestUrl'
export * from './utils/handleRequest'
export { cleanUrl } from './utils/url/cleanUrl'

/**
 * Type definitions.
 */

export type { SharedOptions, LifeCycleEventsMap } from './sharedOptions'

export type {
  ResponseResolver,
  ResponseResolverReturnType,
  AsyncResponseResolverReturnType,
  DefaultBodyType,
  DefaultRequestMultipartBody,
} from './handlers/RequestHandler'

export type {
  RequestQuery,
  RestRequestParsedResult,
} from './handlers/RestHandler'

export type {
  GraphQLVariables,
  GraphQLRequestBody,
  GraphQLJsonRequestBody,
} from './handlers/GraphQLHandler'

export type { Path, PathParams, Match } from './utils/matching/matchRequestUrl'
export type { ParsedGraphQLRequest } from './utils/internal/parseGraphQLRequest'

export * from './HttpResponse'
export * from './delay'
export { bypass } from './bypass'
export { passthrough } from './passthrough'
export { NetworkError } from './NetworkError'

// Validate environmental globals before executing any code.
// This ensures that the library gives user-friendly errors
// when ran in the environments that require additional polyfills
// from the end user.
checkGlobals()
