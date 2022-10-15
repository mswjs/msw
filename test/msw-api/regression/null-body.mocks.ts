import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('/api/books', () => {
    return HttpResponse.plain(null, { status: 204 })
  }),
)

worker.start()
