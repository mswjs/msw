import * as path from 'path'
import { pageWith } from 'page-with'

declare global {
  interface Window {
    makeRequest(): void
  }
}

test('handles FormData as a request body', async () => {
  const { page, makeUrl } = await pageWith({
    example: path.resolve(__dirname, 'body.mocks.ts'),
    markup: path.resolve(__dirname, 'body-form-data.page.html'),
  })

  await page.evaluate(() => window.makeRequest())

  const res = await page.waitForResponse(makeUrl('/formData'))
  const status = res.status()
  const json = await res.json()

  expect(status).toBe(200)
  expect(json).toEqual({
    name: 'Alice',
    fileText: 'hello world',
  })
})
