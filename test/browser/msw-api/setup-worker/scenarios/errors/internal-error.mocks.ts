import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', () => {
    throw new Error('Custom error message')
  }),
)

worker.start()
