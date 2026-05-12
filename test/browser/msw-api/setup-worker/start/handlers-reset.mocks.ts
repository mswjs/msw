import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

let callCount = 0

const worker = setupWorker(
  http.get('/resource', () => {
    callCount++
    return HttpResponse.json({ callCount })
  }),
)

worker.start()

window.msw = {
  worker,
}
