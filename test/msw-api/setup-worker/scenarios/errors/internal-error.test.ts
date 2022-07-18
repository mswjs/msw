import * as path from 'path'
import { pageWith } from 'page-with'
import { waitFor } from '../../../../support/waitFor'

test('propagates the exception originating from a handled request', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'internal-error.mocks.ts'),
  })

  const endpointUrl = runtime.makeUrl('/user')
  const res = await runtime.request(endpointUrl)

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
    expect(runtime.consoleSpy.get('error')).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'Failed to load resource: the server responded with a status of 500',
        ),
      ]),
    )
  })

  expect(runtime.consoleSpy.get('error')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(`\
[MSW] Uncaught exception in the request handler for "GET ${endpointUrl}":

Error: Custom error message
`),
    ]),
  )
})
