import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('https://api.github.com/made-up', () => {
    return HttpResponse.json({ mocked: true })
  }),

  http.get('https://test.mswjs.io/messages/:messageId', ({ params }) => {
    const { messageId } = params
    return HttpResponse.json({ messageId })
  }),

  http.get('https://test.mswjs.io/messages/:messageId/items', ({ params }) => {
    const { messageId } = params
    return HttpResponse.json({ messageId })
  }),

  http.get(/(.+?)\.google\.com\/path/, () => {
    return HttpResponse.json({ mocked: true })
  }),

  http.get(`/resource\\('id'\\)`, () => {
    return HttpResponse.json({ mocked: true })
  }),

  http.get('./', ({ request }) => {
    const url = new URL(request.url)

    if (url.searchParams.has('resourceId')) {
      return HttpResponse.json({ mocked: true })
    }
  }),
)

worker.start()
