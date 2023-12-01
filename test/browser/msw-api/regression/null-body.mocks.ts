import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get<{ code: string }>('/api/:code', ({ params }) => {
    return new HttpResponse(null, { status: parseInt(params.code) })
  }),
)

worker.start()
