import { http, HttpResponse, delay } from 'msw'
import { defineNetwork, expect } from '../../../../setup/vitest-helpers'

const encoder = new TextEncoder()
const chunks = ['hello', 'streaming', 'world']

const handlers = [
  http.get('*/stream', () => {
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
]

const test = defineNetwork({ handlers })

test('responds with a mocked ReadableStream response', async ({ page }) => {
  const chunks = await page.evaluate(() => {
    return fetch('/stream').then(async (res) => {
      if (res.body === null) {
        return []
      }

      const decoder = new TextDecoder()
      const chunks: Array<{ text: string; timestamp: number }> = []
      const reader = res.body.getReader()

      while (true) {
        const { value, done } = await reader.read()

        if (done) {
          return chunks
        }

        chunks.push({
          text: decoder.decode(value),
          timestamp: performance.now(),
        })
      }
    })
  })

  // Must stream the mocked response in three chunks.
  const chunksText = chunks.map((chunk) => chunk.text)
  expect(chunksText).toEqual(['hello', 'streaming', 'world'])

  const chunkDeltas = chunks.map((chunk, index) => {
    const prevChunk = chunks[index - 1]
    return prevChunk ? chunk.timestamp - prevChunk.timestamp : 0
  })

  expect(chunkDeltas[0]).toBe(0)
  expect(chunkDeltas[1]).toBeGreaterThanOrEqual(200)
  expect(chunkDeltas[2]).toBeGreaterThanOrEqual(200)
})
