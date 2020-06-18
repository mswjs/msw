import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('https://test.mswjs.io/binary', (_, res, ctx) => {
    return res(ctx.body(new Uint8Array([1, 2, 3, 4, 5, 6])))
  }),
)

worker.start()
