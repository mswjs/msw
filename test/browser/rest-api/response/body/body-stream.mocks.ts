import { http, HttpResponse, delay } from 'msw'
import { setupWorker } from 'msw/browser'

const encoder = new TextEncoder()
const chunks = ['hello', 'streaming', 'world']

const worker = setupWorker(
  http.get('/stream', () => {
    const stream = new ReadableStream({
      async start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk))
          await delay(250)
        }

        controller.close()
      },
    })

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': chunks.join('').length.toString(),
      },
    })
  }),
)

worker.start()
