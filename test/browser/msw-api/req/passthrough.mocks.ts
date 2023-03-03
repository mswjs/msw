import { setupWorker, rest, passthrough, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.post('/', () => {
    return passthrough()
  }),
)

worker.start()

// @ts-ignore
window.msw = {
  worker,
  rest,
  passthrough,
  HttpResponse,
}
