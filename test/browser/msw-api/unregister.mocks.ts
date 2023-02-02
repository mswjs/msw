import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('*/resource', (req, res, ctx) => {
    return res(ctx.json({ mocked: true }))
  }),
)

// @ts-ignore
window.msw = {
  worker,
}
