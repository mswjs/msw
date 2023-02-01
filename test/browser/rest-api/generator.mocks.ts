import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/polling/:maxCount', function* (req, res, ctx) {
    const { maxCount } = req.params
    let count = 0

    while (count < maxCount) {
      count += 1
      yield res(
        ctx.json({
          status: 'pending',
          count,
        }),
      )
    }

    return res(
      ctx.json({
        status: 'complete',
        count,
      }),
    )
  }),

  rest.get('/polling/once/:maxCount', function* (req, res, ctx) {
    let count = 0

    while (count < req.params.maxCount) {
      count += 1
      yield res(
        ctx.json({
          status: 'pending',
          count,
        }),
      )
    }

    return res.once(
      ctx.json({
        status: 'complete',
        count,
      }),
    )
  }),
  rest.get('/polling/once/:maxCount', (req, res, ctx) => {
    return res(ctx.json({ status: 'done' }))
  }),
)

worker.start()
