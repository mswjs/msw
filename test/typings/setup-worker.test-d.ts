import { http, HttpResponse, graphql } from 'msw'
import { setupWorker } from 'msw/browser'

it('does not produce a type error when called without arguments', () => {
  setupWorker()
})

it('accepts a single HTTP request handler', () => {
  setupWorker(
    http.get('/user', () => {
      return HttpResponse.json({ name: 'John Doe' })
    }),
  )
  setupWorker(
    http.get('/user', async () => {
      return HttpResponse.json({ name: 'John Doe' })
    }),
  )
})

it('accepts a single GraphQL request handler', () => {
  setupWorker(
    graphql.query('GetUser', () => {
      return HttpResponse.json({ data: { name: 'John Doe' } })
    }),
  )
  setupWorker(
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

  setupWorker(...handlers)
})
