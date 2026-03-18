/**
 * @see https://github.com/mswjs/msw/discussions/498
 */
import { http, HttpResponse, type RequestHandler } from 'msw'
import { setupWorker } from 'msw/browser'
import { setupServer } from 'msw/node'

const handlers: Array<RequestHandler> = [
  http.get('/resource', () => {
    return HttpResponse.json({ data: 'abc-123' })
  }),
]

it('does not conflict when passing request handlers to `setupWorker`', () => {
  setupWorker(...handlers)
})

it('does not conflict when passing request handlers to `setupServer`', () => {
  setupServer(...handlers)
})

it('does not conflict when inferring request handlers for `setupWorker`', () => {
  const resourceHandler = http.get('/resource', () => {
    return HttpResponse.json({ data: 'abc-123' })
  })

  setupWorker(...[resourceHandler])
})
