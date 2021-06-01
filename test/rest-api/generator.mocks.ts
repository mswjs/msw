import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/polling/:count', function* (req, res, ctx) {
    const { count: maxCount } = req.params
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

  rest.get('/polling/:count', (req, res, ctx) => {
    return res(
      ctx.json({
        status: 'done',
      }),
    )
  }),
)

worker.start()
