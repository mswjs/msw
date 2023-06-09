import { rest } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('/greeting', () => {
    return new Response('Hello, world!')
  }),
)

worker.start()
