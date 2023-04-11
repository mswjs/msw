import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('/text', () => {
    return HttpResponse.text('hello world')
  }),
)

worker.start()
