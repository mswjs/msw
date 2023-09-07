import { checkGlobals } from './utils/internal/checkGlobals'

export { SetupApi } from './SetupApi'

/* Request handlers */
export { RequestHandler } from './handlers/RequestHandler'
export { http } from './http'
export { HttpHandler, HttpMethods } from './handlers/HttpHandler'
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
  HttpRequestParsedResult,
} from './handlers/HttpHandler'

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
