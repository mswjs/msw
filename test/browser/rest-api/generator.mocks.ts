import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get<{ maxCount: string }>('/polling/:maxCount', function* ({ params }) {
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

  http.get<{ maxCount: string }>(
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
  http.get('/polling/once/:maxCount', () => {
    return HttpResponse.json({ status: 'done' })
  }),
)

worker.start()
