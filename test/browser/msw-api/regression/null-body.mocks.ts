import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get<{ code: string }>('/api/:code', ({ params }) => {
    const status = parseInt(params.code)
    return new HttpResponse(null, { status })
  }),
)

worker.start()
