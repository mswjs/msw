import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('/api/books', () => {
    return HttpResponse.plain(null, { status: 204 })
  }),
)

worker.start()
