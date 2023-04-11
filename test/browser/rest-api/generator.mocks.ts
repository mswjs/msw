import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get<{ maxCount: string }>('/polling/:maxCount', function* ({ params }) {
    const { maxCount } = params
    let count = 0

    while (count < Number(maxCount)) {
      count += 1

      yield HttpResponse.json({
        status: 'pending',
        count,
      })
    }

    return HttpResponse.json({
      status: 'complete',
      count,
    })
  }),

  rest.get<{ maxCount: string }>(
    '/polling/once/:maxCount',
    function* ({ params }) {
      const { maxCount } = params
      let count = 0

      while (count < Number(maxCount)) {
        count += 1

        yield HttpResponse.json({
          status: 'pending',
          count,
        })
      }

      return HttpResponse.json({
        status: 'complete',
        count,
      })
    },
    { once: true },
  ),
  rest.get('/polling/once/:maxCount', () => {
    return HttpResponse.json({ status: 'done' })
  }),
)

worker.start()
