import { http } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/user', () => {
    return new Response()
  }),
)

// @ts-ignore
window.msw = {
  worker,
}
