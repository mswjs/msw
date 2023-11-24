import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

test('throws an error given an Array of request handlers to "setupServer"', () => {
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
    `[MSW] Failed to apply given request handlers: invalid input. Did you forget to spread the request handlers Array?`,
  )
})
