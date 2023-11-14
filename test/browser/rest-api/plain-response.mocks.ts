import { http } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/greeting', () => {
    return new Response('Hello, world!')
  }),
)

worker.start()
