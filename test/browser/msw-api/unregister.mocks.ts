import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('*/resource', () => {
    return HttpResponse.json({ mocked: true })
  }),
)

// @ts-ignore
window.msw = {
  worker,
}
