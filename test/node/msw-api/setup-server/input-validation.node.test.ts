import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

test('throws an error given an Array of request handlers to "setupServer"', () => {
  const createServer = () => {
    // @ts-expect-error intentionally invalid parameters for setupServer to force it to throw
    return setupServer([
      http.get('https://test.mswjs.io/book/:bookId', () => {
        return HttpResponse.json({ title: 'Original title' })
      }),
    ])
  }

  expect(createServer).toThrow(
    `[MSW] Failed to create a handlers controller: invalid handlers. Did you forget to spread the handlers array?`,
  )
})
