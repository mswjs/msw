export { composeMocks } from './composeMocks'
export { MockedResponse, ResponseTransformer, response } from './response'
export * as context from './context'

/* Request handlers */
export * from './handlers/requestHandler'
export { default as rest, restContext, RESTMethods } from './handlers/rest'
export { default as graphql, graphqlContext } from './handlers/graphql'
