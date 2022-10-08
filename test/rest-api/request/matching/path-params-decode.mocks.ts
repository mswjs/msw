import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('https://test.mswjs.io/reflect-url/:url', ({ params }) => {
    const { url } = params
    return HttpResponse.json({ url })
  }),
)

worker.start()
