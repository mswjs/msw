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

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

afterAll(() => {
  server.close()
  jest.restoreAllMocks()
})

test('warns on unhandled request when using the "warn" value', async () => {
  jest.spyOn(global.console, 'warn')

  const res = await fetch('https://test.mswjs.io')

  expect(res).toHaveProperty('status', 404)
  expect(console.warn).toBeCalledWith(`\
[MSW] Warning: captured a GET https://test.mswjs.io/ request without a corresponding request handler.

  If you wish to intercept this request, consider creating a request handler for it:

  rest.get('https://test.mswjs.io/', (req, res, ctx) => {
    return res(ctx.text('body'))
  })`)
})
