import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.all('*/api/*', (req, res, ctx) => {
    return res(ctx.text('hello world'))
  }),
  rest.all('*', (req, res, ctx) => {
    return res(ctx.text('welcome to the jungle'))
  }),
)

worker.start()
