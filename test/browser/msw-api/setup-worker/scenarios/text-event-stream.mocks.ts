import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (req, res) => {
    return res()
  }),
)

worker.start()
