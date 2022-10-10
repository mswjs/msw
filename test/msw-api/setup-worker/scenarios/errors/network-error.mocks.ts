import { setupWorker, rest, NetworkError } from 'msw'

const worker = setupWorker(
  rest.get('/user', () => {
    throw new NetworkError('Custom network error message')
  }),
)

worker.start()
