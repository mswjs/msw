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

beforeAll(() => server.listen())
afterAll(() => {
  server.close()
  jest.restoreAllMocks()
})

test('bypasses unhandled requests by default', async () => {
  jest.spyOn(global.console, 'error')
  jest.spyOn(global.console, 'warn')

  const res = await fetch('https://test.mswjs.io')

  // Request should be performed as-is
  expect(res).toHaveProperty('status', 404)

  // No warnings/errors should be printed
  expect(console.error).not.toBeCalled()
  expect(console.warn).not.toBeCalled()
})
