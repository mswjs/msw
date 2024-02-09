import { http, HttpRequestHandler, GraphQLRequestHandler, graphql } from 'msw'
import { setupWorker } from 'msw/browser'
import { setupServer } from 'msw/node'
import { it, describe } from 'vitest'

const generateHttpHandler: HttpRequestHandler = (path, resolver, options) => {
  return http.get(path, resolver, options)
}

const generateGraphQLHandler: GraphQLRequestHandler = (
  operationName,
  resolver,
) => {
  return graphql.query(operationName, resolver)
}

describe('accepts custom handler without type errors', () => {
  it('browser', () => {
    setupWorker(
      generateHttpHandler('/', () => {}),
      generateGraphQLHandler('GetResource', () => {}),
    )
  })
  it('node', () => {
    setupServer(
      generateHttpHandler('/', () => {}),
      generateGraphQLHandler('GetResource', () => {}),
    )
  })
})
