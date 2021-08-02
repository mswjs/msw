import * as path from 'path'
import { pageWith } from 'page-with'

test('throws a network error', async () => {
  const { page, consoleSpy } = await pageWith({
    example: path.resolve(__dirname, 'network-error.mocks.ts'),
  })

  // Do not use `runtime.request()`, because it always awaits a response.
  // In this case we await a network error, performing a request manually.
  const requestPromise = page.evaluate(() => {
    return fetch('/user')
  })

  await expect(requestPromise).rejects.toThrow(
    // The `fetch` call itself rejects with the "Failed to fetch" error,
    // the same error that happens on a regular network error.
    'Evaluation failed: TypeError: Failed to fetch',
  )

  // Assert a network error message printed into the console
  // before `fetch` rejects.
  expect(consoleSpy.get('error')).toEqual([
    'Failed to load resource: net::ERR_FAILED',
  ])
})
