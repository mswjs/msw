import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('*/resource', () => {
    return HttpResponse.json({ mocked: true })
  }),
)

worker.start()
