import { test, expect } from '../../../../playwright.extend'

test('propagates the exception originating from a handled request', async ({
  loadExample,
  spyOnConsole,
  fetch,
  makeUrl,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./internal-error.mocks.ts', import.meta.url))

  const endpointUrl = makeUrl('/user')
  const response = await fetch(endpointUrl)

  // Expect the exception to be handled as a 500 error response.
  expect.soft(response.status()).toBe(500)
  expect.soft(response.statusText()).toBe('Request Handler Error')
  await expect(response.json()).resolves.toEqual({
    name: 'Error',
    message: 'Custom error message',
    stack: expect.stringContaining('Error: Custom error message'),
  })

  // Expect standard request failure message from the browser.
  await expect
    .poll(() => consoleSpy.get('error'))
    .toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'Failed to load resource: the server responded with a status of 500',
        ),
      ]),
    )

  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        `This exception has been gracefully handled as a 500 response, however, it's strongly recommended to resolve this error, as it indicates a mistake in your code. If you wish to mock an error response, please see this guide: https://mswjs.io/docs/http/mocking-responses/error-responses`,
      ),
    ]),
  )
})
