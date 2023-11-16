/**
 * @vitest-environment node
 */
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'

const server = setupServer(
  http.get('https://test.mswjs.io/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

beforeAll(() =>
  server.listen({
    onUnhandledRequest(request) {
      /**
       * @fixme @todo For some reason, the exception from the "onUnhandledRequest"
       * callback doesn't propagate to the intercepted request but instead is thrown
       * in this test's context.
       */
      throw new Error(`Custom error for ${request.method} ${request.url}`)
    },
  }),
)

afterAll(() => {
  server.close()
})

test('prevents a request when a custom callback throws an exception', async () => {
  const makeRequest = () => {
    return fetch('https://example.com')
      .then(() => {
        throw new Error('Must not resolve')
      })
      .catch<Error>((error) => error)
  }

  const requestError = await makeRequest()

  // Request should be cancelled with a fetch error, since the callback threw.
  expect(requestError.message).toBe('Failed to fetch')
  expect(requestError.cause).toEqual(
    new Error('Custom error for GET https://example.com/'),
  )
})
