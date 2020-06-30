import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('http://test.io', (_, res) => {
    return res.networkError()
  }),
)

worker.start()
