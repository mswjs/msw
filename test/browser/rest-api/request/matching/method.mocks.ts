import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.post('*/user', () => {
    return HttpResponse.json({ mocked: true })
  }),
)

worker.start()
