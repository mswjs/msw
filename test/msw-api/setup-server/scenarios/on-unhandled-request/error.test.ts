/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { setupServer } from 'msw/node'
import { rest } from 'msw'

const server = setupServer(
  rest.get('https://test.mswjs.io/user', (req, res, ctx) => {
    return res(ctx.json({ mocked: true }))
  }),
)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterAll(() => {
  server.close()
})

test('errors on unhandled request when using the "error" value', async () => {
  jest.spyOn(console, 'error')

  const getResponse = () => fetch('https://test.mswjs.io')

  await getResponse()

  expect(console.error)
    .toHaveBeenCalledWith(`[MSW] Error: captured a GET https://test.mswjs.io/ request without a corresponding request handler.

  If you wish to intercept this request, consider creating a request handler for it:

  rest.get('https://test.mswjs.io/', (req, res, ctx) => {
    return res(ctx.text('body'))
  })`)
})
