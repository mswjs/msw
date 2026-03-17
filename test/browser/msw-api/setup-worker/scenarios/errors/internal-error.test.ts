import { test, expect } from '../../../../playwright.extend'

test('propagates the exception originating from a handled request', async ({
  loadExample,
  spyOnConsole,
  fetch,
  waitFor,
  makeUrl,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./internal-error.mocks.ts', import.meta.url))

  const endpointUrl = makeUrl('/user')
  const res = await fetch(endpointUrl)

  // Expect the exception to be handled as a 500 error response.
  expect(res.status()).toBe(500)
  expect(res.statusText()).toBe('Request Handler Error')
  expect(await res.json()).toEqual({
    name: 'Error',
    message: 'Custom error message',
    stack: expect.stringContaining('Error: Custom error message'),
  })

  // Expect standard request failure message from the browser.
  await waitFor(() => {
    expect(consoleSpy.get('error')).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'Failed to load resource: the server responded with a status of 500',
        ),
      ]),
    )
  })

  expect(consoleSpy.get('error')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(`\
[MSW] Uncaught exception in the request handler for "GET ${endpointUrl}":

Error: Custom error message
`),
    ]),
  )
})
