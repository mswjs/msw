import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('/text', () => {
    return HttpResponse.text('hello world')
  }),
)

worker.start()
