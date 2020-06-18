import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('https://test.mswjs.io/', (req, res, ctx) => {
    return res(
      ctx.delay(2000),
      ctx.set({
        Accept: 'foo/bar',
        'Custom-Header': 'arbitrary-value',
      }),
      ctx.status(305, 'Yahoo!'),
      ctx.json({
        mocked: true,
      }),
    )
  }),
)

worker.start()
