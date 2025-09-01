import { http, HttpResponse, graphql } from 'msw'
import { setupServer } from 'msw/node'

it('does not produce a type error when called without arguments', () => {
  setupServer()
})

it('accepts a single HTTP request handler', () => {
  setupServer(
    http.get('/user', () => {
      return HttpResponse.json({ name: 'John Doe' })
    }),
  )
  setupServer(
    http.get('/user', async () => {
      return HttpResponse.json({ name: 'John Doe' })
    }),
  )
})

it('accepts a single GraphQL request handler', () => {
  setupServer(
    graphql.query('GetUser', () => {
      return HttpResponse.json({ data: { name: 'John Doe' } })
    }),
  )
  setupServer(
    graphql.query('GetUser', async () => {
      return HttpResponse.json({ data: { name: 'John Doe' } })
    }),
  )
})

it('supports a list of request handlers defined elsewhere', () => {
  const handlers = [
    http.get('/user', () => {
      return HttpResponse.json({ name: 'John Doe' })
    }),
  ]

  setupServer(...handlers)
})
