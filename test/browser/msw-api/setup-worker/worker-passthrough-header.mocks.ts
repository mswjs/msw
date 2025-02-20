import { http, passthrough } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('*/resource', function originalResolver() {
    return passthrough()
  }),
)

worker.start()
