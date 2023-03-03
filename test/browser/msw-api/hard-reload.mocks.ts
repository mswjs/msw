import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('https://example.com/resource', () => {
    return HttpResponse.json({ mocked: true })
  }),
)

worker.start()
