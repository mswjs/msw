import { http, HttpHandler, GraphQLHandler, graphql } from 'msw'
import { setupWorker } from 'msw/browser'
import { setupServer } from 'msw/node'

function generateHttpHandler(): HttpHandler {
  return http.get('/user', () => {})
}

function generateGraphQLHandler(): GraphQLHandler {
  return graphql.query('GetUser', () => {})
}

setupWorker(generateHttpHandler(), generateGraphQLHandler())
setupServer(generateHttpHandler(), generateGraphQLHandler())
