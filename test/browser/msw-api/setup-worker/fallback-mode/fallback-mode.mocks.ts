import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('*/user', () => {
    return HttpResponse.json({ name: 'John Maverick' })
  }),
)

worker.start()

// @ts-ignore
window.worker = worker
