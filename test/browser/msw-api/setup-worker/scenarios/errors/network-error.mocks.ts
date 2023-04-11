import { rest, NetworkError } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('/user', () => {
    throw new NetworkError('Custom network error message')
  }),
)

worker.start()
