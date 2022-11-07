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

  expect(exceptions).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        '[MSW] Failed to construct "SetupWorkerApi" given an Array of request handlers. Make sure you spread the request handlers when calling the respective setup function.',
      ),
    ]),
  )
})
