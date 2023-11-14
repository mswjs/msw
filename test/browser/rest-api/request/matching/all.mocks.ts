import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.all('*/api/*', () => {
    return HttpResponse.text('hello world')
  }),
  http.all('*', () => {
    return HttpResponse.text('welcome to the jungle')
  }),
)

worker.start()
