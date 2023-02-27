import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', () => {
    return new Response()
  }),
)

// @ts-ignore
window.msw = {
  worker,
}
