import { it } from 'vitest'
import { http, HttpRequestHandler, GraphQLRequestHandler, graphql } from 'msw'
import { setupWorker } from 'msw/browser'
import { setupServer } from 'msw/node'

const generateHttpHandler: HttpRequestHandler = (path, resolver, options) => {
  return http.get(path, resolver, options)
}

const generateGraphQLHandler: GraphQLRequestHandler = (
  operationName,
  resolver,
) => {
  return graphql.query(operationName, resolver)
}

it('accepts custom request handler (setupWorker)', () => {
  setupWorker(
    generateHttpHandler('/', () => {}),
    generateGraphQLHandler('GetResource', () => {}),
  )
})
it('accepts custom request handler (setupServer)', () => {
  setupServer(
    generateHttpHandler('/', () => {}),
    generateGraphQLHandler('GetResource', () => {}),
  )
})
