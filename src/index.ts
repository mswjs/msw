/* Types */
export * from './handlers/requestHandler'

export { composeMocks } from './composeMocks'
export { response } from './response'

/* Request handlers */
export { default as rest, RESTMethods } from './handlers/rest'
export { default as graphql } from './handlers/graphql'
