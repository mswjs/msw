/**
 * @vitest-environment node
 */
import https from 'https'
import { HttpResponse, http, delay } from 'msw'
import { setupServer } from 'msw/node'

const encoder = new TextEncoder()
const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

test('responds with a ReadableStream', async () => {
  server.use(
    http.get('https://api.example.com/stream', () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('hello'))
          controller.enqueue(encoder.encode('world'))
          controller.close()
        },
      })

      return new HttpResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
        },
      })
    }),
  )

  const response = await fetch('https://api.example.com/stream')

  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')
  expect(response.body).toBeInstanceOf(ReadableStream)
  expect(response.body!.locked).toBe(false)

  expect(await response.text()).toBe('helloworld')
})

test('supports delays when enqueuing chunks', async () => {
  server.use(
    http.get('https://api.example.com/stream', () => {
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode('first'))
          await delay(500)

          controller.enqueue(encoder.encode('second'))
          await delay(500)

          controller.enqueue(encoder.encode('third'))
          await delay(500)
          controller.close()
        },
      })

      return new HttpResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
        },
      })
    }),
  )

  await new Promise<void>((resolve, reject) => {
    const request = https.get('https://api.example.com/stream', (response) => {
      const chunks: Array<{ buffer: Buffer; timestamp: number }> = []

      response.on('data', (data) => {
        chunks.push({
          buffer: Buffer.from(data),
          timestamp: Date.now(),
        })
      })

      response.once('end', () => {
        const textChunks = chunks.map((chunk) => chunk.buffer.toString('utf8'))
        expect(textChunks).toEqual(['first', 'second', 'third'])

        // Ensure that the chunks were sent over time,
        // respecting the delay set in the mocked stream.
        const chunkTimings = chunks.map((chunk) => chunk.timestamp)
        expect(chunkTimings[1] - chunkTimings[0]).toBeGreaterThanOrEqual(490)
        expect(chunkTimings[2] - chunkTimings[1]).toBeGreaterThanOrEqual(490)

        resolve()
      })
    })

    request.on('error', (error) => reject(error))
  })
})
