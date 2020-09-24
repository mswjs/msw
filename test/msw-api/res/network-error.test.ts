import * as path from 'path'
import { runBrowserWith } from '../../support/runBrowserWith'
import { captureConsole } from '../../support/captureConsole'

test('throws a network error', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'network-error.mocks.ts'),
  )
  const { messages } = captureConsole(runtime.page)

  // Do not use `runtime.request()`, because it always awaits a response.
  // In this case we await a network error, performing a request manually.
  const requestPromise = runtime.page.evaluate(() => {
    return fetch('/user')
  })

  await expect(requestPromise).rejects.toThrow(
    // The `fetch` call itself rejects with the "Failed to fetch" error,
    // the same error that happens on a regular network error.
    'Evaluation failed: TypeError: Failed to fetch',
  )

  // Assert a network error message printed into the console
  // before `fetch` rejects.
  expect(messages.error).toContain('Failed to load resource: net::ERR_FAILED')

  return runtime.cleanup()
})
