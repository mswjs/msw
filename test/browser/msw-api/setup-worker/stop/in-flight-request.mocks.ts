import { http, HttpResponse, delay } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/resource', async () => {
    await delay(500)
    return HttpResponse.text('hello world')
  }),
)

worker.start()

window.msw = {
  // @ts-expect-error
  worker,
}
