import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('/greeting', async () => {
    const blob = new Blob(['hello world'], {
      type: 'text/plain',
    })

    return new HttpResponse(blob)
  }),
)

worker.start()
