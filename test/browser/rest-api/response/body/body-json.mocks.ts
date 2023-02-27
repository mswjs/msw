import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('/json', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
  rest.get('/number', () => {
    return HttpResponse.json(123)
  }),
)

worker.start()
