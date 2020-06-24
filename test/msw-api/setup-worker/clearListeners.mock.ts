import { setupWorker, rest } from 'msw'

const createWorker = () =>
  setupWorker(
    rest.get('/user', (req, res, ctx) => {
      return res(ctx.status(200))
    }),
  )

// @ts-ignore
window.__MSW_CREATE_WORKER__ = createWorker
