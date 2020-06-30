import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('http://test.io/user', (_, res) => {
    return res.networkError('Network error')
  }),
)

worker.start()
