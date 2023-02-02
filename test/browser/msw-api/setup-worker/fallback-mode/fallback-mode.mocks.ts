import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('*/user', (req, res, ctx) => {
    return res(ctx.json({ name: 'John Maverick' }))
  }),
)

worker.start()

// @ts-ignore
window.worker = worker
