/* Types */
export * from './handlers/requestHandler'

export { composeMocks } from './composeMocks'
export { response } from './response'
export { context } from './context'

/* Request handlers */
export { default as rest, RESTMethods } from './handlers/rest'
export { default as graphql } from './handlers/graphql'
