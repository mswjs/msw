import { rest } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('/user', () => {
    throw new Error('Custom error message')
  }),
)

worker.start()
