import { setupWorker, rest } from 'msw'

const createWorker = () => {
  return setupWorker(
    rest.get('/user', (req, res, ctx) => {
      return res(ctx.status(200))
    }),
  )
}

// @ts-ignore
window.msw = {
  createWorker,
}
