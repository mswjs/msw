import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

test('throws an error given an Array of request handlers to setupServer', () => {
  const createServer = () => {
    // The next line will be ignored because we want to test that an Error
    // should be thrown when `setupServer` parameters are not valid
    // @ts-ignore
    return setupServer([
      http.get('https://test.mswjs.io/book/:bookId', () => {
        return HttpResponse.json({ title: 'Original title' })
      }),
    ])
  }

  expect(createServer).toThrow(
    `[MSW] Failed to construct "SetupServerApi" given an Array of request handlers. Make sure you spread the request handlers when calling the respective setup function.`,
  )
})
