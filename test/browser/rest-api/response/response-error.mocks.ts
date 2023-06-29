import { rest } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('/resource', () => {
    return Response.error()
  }),
)

worker.start()
