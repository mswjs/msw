import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('https://api.github.com/made-up', () => {
    return HttpResponse.json({ mocked: true })
  }),

  rest.get('https://test.mswjs.io/messages/:messageId', ({ params }) => {
    const { messageId } = params
    return HttpResponse.json({ messageId })
  }),

  rest.get('https://test.mswjs.io/messages/:messageId/items', ({ params }) => {
    const { messageId } = params
    return HttpResponse.json({ messageId })
  }),

  rest.get(/(.+?)\.google\.com\/path/, () => {
    return HttpResponse.json({ mocked: true })
  }),

  rest.get(`/resource\\('id'\\)`, () => {
    return HttpResponse.json({ mocked: true })
  }),
)

worker.start()
