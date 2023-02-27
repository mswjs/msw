import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.post('*/user', () => {
    return HttpResponse.json({ mocked: true })
  }),
)

worker.start()
