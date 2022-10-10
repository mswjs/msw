import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('https://test.mswjs.io/api/books', () => {
    return HttpResponse.text(null, { status: 204 })
  }),
)

worker.start()
