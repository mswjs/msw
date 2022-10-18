import { setupWorker, rest, HttpResponse, ReadableStream, delay } from 'msw'

const encoder = new TextEncoder()

const worker = setupWorker(
  rest.get('/video', () => {
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode('hello'))
        await delay(400)
        controller.enqueue(encoder.encode('world'))
        controller.close()
      },
    })

    return HttpResponse.plain(stream, {
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }),
)

worker.start()
