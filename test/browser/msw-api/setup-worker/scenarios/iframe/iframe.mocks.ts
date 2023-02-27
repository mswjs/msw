import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('*/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

worker.start()
