import { setupWorker, rest, DelayMode } from 'msw'

const worker = setupWorker(
  rest.get('/delay', (req, res, ctx) => {
    const mode = req.url.searchParams.get('mode') as DelayMode
    const duration = req.url.searchParams.get('duration')
    return res(
      ctx.delay(duration ? Number(duration) : mode || undefined),
      ctx.json({ mocked: true }),
    )
  }),
)

worker.start()
