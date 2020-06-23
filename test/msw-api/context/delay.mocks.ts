import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (req, res, ctx) => {
    const delay = req.url.searchParams.get('delay')
    const delayMs = delay ? Number(delay) : undefined

    return res(
      ctx.delay(delayMs),
      ctx.json({
        mocked: true,
      }),
    )
  }),
)

worker.start()
