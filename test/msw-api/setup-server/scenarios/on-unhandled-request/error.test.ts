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
    .toHaveBeenCalledWith(`[MSW] Error: captured a request without a matching request handler:

  • GET https://test.mswjs.io/

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)
})
