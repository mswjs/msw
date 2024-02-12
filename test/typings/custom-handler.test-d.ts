import { http, HttpRequestHandler, GraphQLRequestHandler, graphql } from 'msw'
import { setupWorker } from 'msw/browser'
import { setupServer } from 'msw/node'
import { it } from 'vitest'

const generateHttpHandler: HttpRequestHandler = (path, resolver, options) => {
  return http.get(path, resolver, options)
}

const generateGraphQLHandler: GraphQLRequestHandler = (
  operationName,
  resolver,
) => {
  return graphql.query(operationName, resolver)
}

it('worker accepts custom browser handler without type errors', () => {
  setupWorker(
    generateHttpHandler('/', () => {}),
    generateGraphQLHandler('GetResource', () => {}),
  )
})
it('worker accepts custom node handler without type errors', () => {
  setupServer(
    generateHttpHandler('/', () => {}),
    generateGraphQLHandler('GetResource', () => {}),
  )
})
