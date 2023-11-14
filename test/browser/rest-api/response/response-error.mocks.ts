import { http } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/resource', () => {
    return Response.error()
  }),
)

worker.start()
