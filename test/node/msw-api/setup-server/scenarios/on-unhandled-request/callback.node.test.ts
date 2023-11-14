/**
 * @vitest-environment node
 */
import fetch from 'node-fetch'
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'

const server = setupServer(
  http.get('https://test.mswjs.io/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

const logs: Array<string> = []

beforeAll(() =>
  server.listen({
    onUnhandledRequest(req) {
      logs.push(`${req.method} ${req.url}`)
    },
  }),
)
afterAll(() => server.close())

test('executes given callback function on un unmatched request', async () => {
  const res = await fetch('https://test.mswjs.io')

  // Request should be performed as-is, since the callback didn't throw.
  expect(res).toHaveProperty('status', 404)
  expect(logs).toEqual(['GET https://test.mswjs.io/'])
})
