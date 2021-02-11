import * as path from 'path'
import { pageWith } from 'page-with'

test('throws an error given an Array of request handlers to "setupWorker"', async () => {
  const { page } = await pageWith({
    example: path.resolve(__dirname, 'input-validation.mocks.ts'),
  })

  const exceptions: string[] = []

  page.on('pageerror', (error) => {
    exceptions.push(error.message)
  })
  await page.reload({ waitUntil: 'networkidle' })

  const nodeMessage = exceptions.find((message) => {
    return message.startsWith(
      `[MSW] Failed to call "setupWorker" given an Array of request handlers (setupWorker([a, b])), expected to receive each handler individually: setupWorker(a, b).`,
    )
  })

  expect(nodeMessage).toBeTruthy()
})
