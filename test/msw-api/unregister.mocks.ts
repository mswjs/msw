import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('https://api.github.com', (req, res, ctx) => {
    return res(
      ctx.json({
        mocked: true,
      }),
    )
  }),
)

// @ts-ignore
window.msw = {
  worker,
}
