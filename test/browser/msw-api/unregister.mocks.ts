import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('*/resource', () => {
    return HttpResponse.json({ mocked: true })
  }),
)

Object.assign(window, {
  msw: {
    worker,
  },
})
