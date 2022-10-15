import { setupWorker, rest, passthrough } from 'msw'

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
}
