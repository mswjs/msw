import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('https://api.github.com', () => {
    return HttpResponse.json({ mocked: true })
  }),
)

worker.start()

// @ts-ignore
window.msw = {
  worker,
}
