import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.post('*/user', () => {
    return HttpResponse.json({ mocked: true })
  }),
)

worker.start()
