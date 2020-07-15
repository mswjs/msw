import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (_, res) => {
    return res.networkError('Custom network error message')
  }),
)

worker.start()
