/**
 * @see https://github.com/mswjs/msw/discussions/498
 */
import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

it('does not conflict when passing request handlers to `setupWorker`', () => {
  const resourceHandler = http.get('/resource', () => {
    return HttpResponse.json({ data: 'abc-123' })
  })

  const handlers = [resourceHandler]
  setupWorker(...handlers)
})
