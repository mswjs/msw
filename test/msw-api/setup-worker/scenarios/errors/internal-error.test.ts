import * as path from 'path'
import { pageWith } from 'page-with'
import { waitFor } from '../../../../support/waitFor'
import { workerConsoleSpy } from '../../../../support/workerConsole'

test('propagates the exception originating from a handled request', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'internal-error.mocks.ts'),
  })

  const endpointUrl = runtime.makeUrl('/user')
  const res = await runtime.request(endpointUrl)
  const json = await res.json()

  // Expect the exception to be handled as a 500 error response.
  expect(res.status()).toEqual(500)
  expect(json).toEqual({
    errorType: 'Error',
    message: 'Custom error message',
    location: expect.stringContaining('Error: Custom error message'),
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

  //
  expect(workerConsoleSpy.get('error')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(`\
[MSW] Uncaught exception in the request handler for "GET ${endpointUrl}":

Error: Custom error message
`),
    ]),
  )
})
