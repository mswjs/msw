/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { setupServer } from 'msw/node'
import { rest } from 'msw'

const server = setupServer(
  rest.get('https://test.mswjs.io/user', (req, res, ctx) => {
    return res(ctx.json({ firstName: 'John' }))
  }),
)

beforeAll(() =>
  server.listen({
    onUnhandledRequest(req) {
      throw new Error(`Custom error for ${req.method} ${req.url}`)
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
