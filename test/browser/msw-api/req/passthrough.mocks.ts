import { rest, passthrough, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

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
