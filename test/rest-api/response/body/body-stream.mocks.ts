import { setupWorker, rest } from 'msw'

const stream = new ReadableStream({
  start(controller) {
    controller.enqueue('line1\n')

    setTimeout(() => {
      controller.enqueue('line2\n')
      controller.close()
    }, 0)
  },
})

const worker = setupWorker(
  rest.get('/sse', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.set('Content-Type', 'text/plain'),
      ctx.body(stream),
    )
  }),
)

worker.start()
