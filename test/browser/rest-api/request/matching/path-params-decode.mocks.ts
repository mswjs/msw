import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('https://test.mswjs.io/reflect-url/:url', ({ params }) => {
    const { url } = params
    return HttpResponse.json({ url })
  }),
)

worker.start()
