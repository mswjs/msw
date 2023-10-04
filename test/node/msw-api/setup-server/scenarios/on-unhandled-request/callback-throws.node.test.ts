/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
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
  const getResponse = () => fetch('https://example.com')

  // Request should be cancelled with a fetch error, since the callback threw.
  await expect(getResponse()).rejects.toThrow(
    'request to https://example.com/ failed, reason: Custom error for GET https://example.com/',
  )
})
