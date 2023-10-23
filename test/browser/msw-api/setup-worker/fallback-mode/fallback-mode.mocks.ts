import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('*/user', () => {
    return HttpResponse.json({ name: 'John Maverick' })
  }),
)

worker.start()

// @ts-ignore
window.worker = worker
