import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('*/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

worker.start()
