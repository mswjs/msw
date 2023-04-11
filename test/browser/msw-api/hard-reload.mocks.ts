import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('https://example.com/resource', () => {
    return HttpResponse.json({ mocked: true })
  }),
)

worker.start()
