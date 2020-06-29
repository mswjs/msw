import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (_, res) => {
    return res.networkError()
  }),
)

// @ts-ignore
window.__MSW_START__ = worker.start
