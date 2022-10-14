/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { setupServer } from 'msw/node'
import { HttpResponse, rest } from 'msw'

const server = setupServer(
  rest.get('https://test.mswjs.io/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

beforeAll(() =>
  server.listen({
    onUnhandledRequest(request) {
      throw new Error(`Custom error for ${request.method} ${request.url}`)
    },
  }),
)
afterAll(() => server.close())

test('prevents a request when a custom callback throws an exception', async () => {
  const getResponse = () => fetch('https://test.mswjs.io')

  // Request should be cancelled with a fetch error, since the callback threw.
  await expect(getResponse()).rejects.toThrow(
    'request to https://test.mswjs.io/ failed, reason: Custom error for GET https://test.mswjs.io/',
  )
})
