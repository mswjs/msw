import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.all('*/api/*', () => {
    return HttpResponse.text('hello world')
  }),
  rest.all('*', () => {
    return HttpResponse.text('welcome to the jungle')
  }),
)

worker.start()
