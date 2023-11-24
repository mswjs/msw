import { http, passthrough, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.post('/', () => {
    return passthrough()
  }),
)

worker.start()

Object.assign(window, {
  msw: {
    worker,
    http,
    passthrough,
    HttpResponse,
  },
})
