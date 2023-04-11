import { rest } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('/user', () => {
    return new Response()
  }),
)

// @ts-ignore
window.msw = {
  worker,
}
