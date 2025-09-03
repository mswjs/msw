import { until } from '@open-draft/until'
import { test, expect } from '../../../../playwright.extend'

test('propagates a mocked network error', async ({
  loadExample,
  spyOnConsole,
  fetch,
  page,
  makeUrl,
}) => {
  const consoleSpy = spyOnConsole()
  const { workerConsole } = await loadExample(
    new URL('./network-error.mocks.ts', import.meta.url),
  )

  const endpointUrl = makeUrl('/user')
  await until(() => page.evaluate((url) => fetch(url), endpointUrl))

  // Expect the fetch error message.
  expect(consoleSpy.get('error')).toEqual(
    expect.arrayContaining([
      expect.stringContaining('Failed to load resource: net::ERR_FAILED'),
    ]),
  )

  // The worker must not produce any errors.
  expect(workerConsole.messages.get('error')).toBeUndefined()
})

test('propagates a CORS violation error from a non-matching request', async ({
  loadExample,
  spyOnConsole,
  page,
  waitFor,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./network-error.mocks.ts', import.meta.url))

  await until(() => page.evaluate(() => fetch('/user')))

  // Must print the failed fetch error to the console.
  await waitFor(() => {
    expect(consoleSpy.get('error')).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Failed to load resource: net::ERR_FAILED'),
      ]),
    )
  })

  /**
   * @todo Ideally, assert the Chromium warning about
   * the Service Worker responding to the fetch event
   * with a network error response. For some reason,
   * it never appears in the console/worker console messages.
   */
})
