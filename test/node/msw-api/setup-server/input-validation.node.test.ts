import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

test('throws an error given an Array of request handlers to setupServer', () => {
  const createServer = () => {
    // @ts-expect-error intentionally invalid parameters for setupServer to force it to throw
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
