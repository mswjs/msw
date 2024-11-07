import { http } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/resource', () => {
    return new Response('hello world')
  }),
)

worker.start()
