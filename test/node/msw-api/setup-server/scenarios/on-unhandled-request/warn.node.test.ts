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

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
  jest.spyOn(global.console, 'warn').mockImplementation()
})

afterAll(() => {
  server.close()
  jest.restoreAllMocks()
})

test('warns on unhandled request when using the "warn" value', async () => {
  const res = await fetch('https://test.mswjs.io')

  expect(res).toHaveProperty('status', 404)
  expect(console.warn).toBeCalledWith(`\
[MSW] Warning: captured a request without a matching request handler:

  • GET https://test.mswjs.io/

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)
})
