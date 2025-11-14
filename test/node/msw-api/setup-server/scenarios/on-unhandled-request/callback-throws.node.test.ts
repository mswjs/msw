// @vitest-environment node
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'

const server = setupServer(
  http.get('https://test.mswjs.io/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

beforeAll(() => {
  server.listen({
    onUnhandledRequest(request) {
      throw new Error(`Custom error for ${request.method} ${request.url}`)
    },
  })
})

afterAll(() => {
  server.close()
})

test('handles exceptions in "onUnhandledRequest" callback as 500 responses', async () => {
  const response = await fetch('https://example.com')

  expect.soft(response.status).toBe(500)
  expect.soft(response.statusText).toBe('Unhandled Exception')
  await expect.soft(response.json()).resolves.toEqual({
    name: 'Error',
    message: 'Custom error for GET https://example.com/',
    stack: expect.any(String),
  })
})
