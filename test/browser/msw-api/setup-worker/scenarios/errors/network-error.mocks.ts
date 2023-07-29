import { http, NetworkError } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/user', () => {
    throw new NetworkError('Custom network error message')
  }),
)

worker.start()
