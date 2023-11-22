import { http } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/user', () => {
    return new Response()
  }),
)

Object.assign(window, {
  msw: {
    worker,
  },
})
