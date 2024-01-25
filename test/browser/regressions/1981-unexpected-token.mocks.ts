import { http } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/api', () => {
    return Response.json({ foo: true })
  }),
)

worker.start()
