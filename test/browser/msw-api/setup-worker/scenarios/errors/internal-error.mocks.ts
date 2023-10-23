import { http } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/user', () => {
    throw new Error('Custom error message')
  }),
)

worker.start()
