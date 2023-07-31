import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/greeting', async () => {
    const blob = new Blob(['hello world'], {
      type: 'text/plain',
    })

    return new HttpResponse(blob)
  }),
)

worker.start()
