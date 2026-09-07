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

test('handles exceptions in "onUnhandledRequest" callback as 500 responses', async () => {
  const response = await fetch('https://example.com')

  expect(response.status).toBe(500)
  expect(response.statusText).toBe('Unhandled Exception')
  expect(await response.json()).toEqual({
    name: 'Error',
    message: 'Custom error for GET https://example.com/',
    stack: expect.any(String),
  })
})
