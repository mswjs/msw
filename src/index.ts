/* Types */
export * from './handlers/requestHandler'

export { composeMocks } from './composeMocks'
export { ResponseTransformer, response } from './response'
export * as context from './context'

/* Request handlers */
export { default as rest, restContext, RESTMethods } from './handlers/rest'
export { default as graphql, graphqlContext } from './handlers/graphql'
