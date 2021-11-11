import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (req, res) => {
    return res.networkError('Custom network error message')
  }),
)

worker.start()
