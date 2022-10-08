import { setupWorker, rest, HttpResponse } from 'msw'

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
  ),
  rest.get('/polling/once/:maxCount', () => {
    return HttpResponse.json({ status: 'done' })
  }),
)

worker.start()
