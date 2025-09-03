import { test, expect } from '../../../playwright.extend'

test('responds with a mocked ReadableStream response', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./body-stream.mocks.ts', import.meta.url))

  const chunks = await page.evaluate(() => {
    return fetch('/stream').then(async (res) => {
      if (res.body === null) {
        return []
      }

      const decoder = new TextDecoder()
      const chunks: Array<{ text: string; timestamp: number }> = []
      const reader = res.body.getReader()

      // eslint-disable-next-line no-constant-condition
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
