import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.post('/', (req) => {
    return req.passthrough()
  }),
)

worker.start()

// @ts-ignore
window.msw = {
  worker,
  rest,
}
