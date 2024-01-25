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

beforeAll(() => {
  server.listen()
  vi.spyOn(global.console, 'error').mockImplementation(() => void 0)
  vi.spyOn(global.console, 'warn').mockImplementation(() => void 0)
})

afterEach(() => {
  vi.resetAllMocks()
})

afterAll(() => {
  server.close()
  vi.restoreAllMocks()
})

it('warns on unhandled requests by default', async () => {
  const response = await fetch('https://test.mswjs.io')

  // Request should be performed as-is
  expect(response).toHaveProperty('status', 404)

  expect(console.error).not.toBeCalled()
  expect(console.warn).toBeCalledWith(`\
[MSW] Warning: intercepted a request without a matching request handler:

  • GET https://test.mswjs.io/

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)
})

it('does not warn on unhandled "file://" requests', async () => {
  // This request is expected to fail:
  // Fetching non-existing file URL.
  await fetch('file:///file/does/not/exist').catch(() => void 0)

  expect(console.error).not.toBeCalled()
  expect(console.warn).not.toBeCalled()
})
