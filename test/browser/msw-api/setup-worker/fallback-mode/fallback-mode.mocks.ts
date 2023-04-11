import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('*/user', () => {
    return HttpResponse.json({ name: 'John Maverick' })
  }),
)

worker.start()

// @ts-ignore
window.worker = worker
